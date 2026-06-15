"""Download each candidate webfont, parse its cmap, and report which
characters from the tracker's math/Greek/symbol set it actually covers.

Output: a coverage table printed to stdout, plus a sidecar JSON dump.
"""

from __future__ import annotations

import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont

# Windows console defaults to cp1252; force utf-8 so Greek + math glyphs print.
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


HERE = Path(__file__).resolve().parent
CACHE = HERE / "_fontcache"
OUT_JSON = HERE / "font-coverage.json"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")

# (display name, Google Fonts family-string, weight to fetch)
FONTS = [
    ("Figtree",        "Figtree",         400),
    ("IBM Plex Sans",  "IBM+Plex+Sans",   400),
    ("Fira Sans",      "Fira+Sans",       400),
    ("Hanken Grotesk", "Hanken+Grotesk",  400),
    ("Karla",          "Karla",           400),
    ("Inter",          "Inter",           400),
    ("Public Sans",    "Public+Sans",     400),
    ("Source Sans 3",  "Source+Sans+3",   400),
    ("Manrope",        "Manrope",         400),
    ("Work Sans",      "Work+Sans",       400),
    ("Nunito Sans",    "Nunito+Sans",     400),
    ("Mulish",         "Mulish",          400),
    ("DM Sans",        "DM+Sans",         400),
    ("Montserrat",     "Montserrat",      400),
    ("Raleway",        "Raleway",         400),
    ("Lato",           "Lato",            400),
]

# Character buckets — match the math-block content in font-compare.html.
BUCKETS = {
    "Greek lower": list("αβγδεζηθικλμνξπρστφχψω"),
    "Greek caps":  list("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΠΡΣΤΦΧΨΩ"),
    "Subscript digits": list("₀₁₂₃₄₅₆₇₈₉"),
    "Subscript letter i (ᵢ)": ["ᵢ"],
    "Superscript digits": list("⁰¹²³⁴⁵⁶⁷⁸⁹"),
    "Superscript minus (⁻)": ["⁻"],
    "Math operators": list("≤≥≠≈±×÷∑∏∫∞√∂∇∝∈∉⊂⊆∪∩−"),
    "Vulgar fractions": list("¼½¾"),
    "Combining marks (x̄, ŷ)": ["̄", "̂"],  # macron, circumflex
    "Misc symbols": list("°µ§¶†‡•…‰′″"),
    "Smart quotes / dashes": list("‘’“”–—"),
}


def fetch_url(url: str, accept: str | None = None) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    if accept:
        req.add_header("Accept", accept)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def resolve_woff2_urls(family_qs: str) -> list[str]:
    """Hit Google Fonts CSS endpoint with a Chrome UA. Google returns
    a separate @font-face block per Unicode subset (latin, latin-ext,
    greek, cyrillic, vietnamese, ...), each scoped by unicode-range.
    Return ALL woff2 URLs so we can merge cmaps across subsets."""
    # Explicit subset list forces Google to include every subset the
    # font has — css2 alone may return only latin if the UA doesn't
    # advertise Unicode-range support.
    css_url = (
        f"https://fonts.googleapis.com/css?family={family_qs}:400"
        "&subset=latin,latin-ext,greek,greek-ext,cyrillic,cyrillic-ext,vietnamese"
        "&display=swap"
    )
    css = fetch_url(css_url, accept="text/css,*/*;q=0.1").decode("utf-8")
    urls = re.findall(r"src:\s*url\((https://[^)]+\.woff2)\)\s*format\('woff2'\)", css)
    if not urls:
        raise RuntimeError(f"no woff2 urls in CSS for {family_qs}:\n{css[:500]}")
    return urls


def font_codepoints(woff2_bytes: bytes) -> set[int]:
    f = TTFont(io.BytesIO(woff2_bytes))
    cps: set[int] = set()
    for table in f["cmap"].tables:
        cps.update(table.cmap.keys())
    return cps


def codepoints_for_family(family_qs: str, cache_prefix: Path) -> set[int]:
    """Fetch every subset's woff2 for the family and return the union
    of their cmap codepoints. Caches each subset by URL hash."""
    urls = resolve_woff2_urls(family_qs)
    all_cps: set[int] = set()
    for url in urls:
        # Cache key from the trailing filename of the URL
        fname = url.rsplit("/", 1)[-1]
        cache_file = cache_prefix.with_suffix("").parent / f"{cache_prefix.name}__{fname}"
        if not cache_file.exists():
            cache_file.write_bytes(fetch_url(url))
        all_cps.update(font_codepoints(cache_file.read_bytes()))
    return all_cps


def char_repr(c: str) -> str:
    if len(c) == 1 and 0x20 <= ord(c) <= 0x7E:
        return c
    cp = ord(c)
    name_hint = {
        0x0304: "̄ (combining macron)",
        0x0302: "̂ (combining circumflex)",
        0x2018: "‘", 0x2019: "’", 0x201C: "“", 0x201D: "”",
        0x2013: "–", 0x2014: "—",
    }.get(cp)
    if name_hint:
        return f"{name_hint} U+{cp:04X}"
    return f"{c} U+{cp:04X}"


def main() -> int:
    CACHE.mkdir(exist_ok=True)
    coverage: dict[str, dict[str, list[str]]] = {}

    print("\nFetching fonts and parsing cmaps (all subsets)...\n")
    for display, family_qs, weight in FONTS:
        cache_prefix = CACHE / family_qs.replace("+", "_")
        try:
            cps = codepoints_for_family(family_qs, cache_prefix)
            print(f"  {display:<16s}  {len(cps)} codepoints across all subsets")
        except Exception as e:
            print(f"  {display:<16s}  ERROR  {e}")
            continue
        coverage[display] = {}
        for bucket, chars in BUCKETS.items():
            missing = [c for c in chars if ord(c) not in cps]
            coverage[display][bucket] = missing

    # ---- Build the report ----
    print("\n" + "=" * 78)
    print("  GLYPH-COVERAGE REPORT — webfont cmap vs tracker math/symbol set")
    print("=" * 78)

    for display in coverage:
        print(f"\n{display}")
        any_gap = False
        for bucket, chars in BUCKETS.items():
            missing = coverage[display][bucket]
            if not missing:
                print(f"  [OK]{bucket:<28s} complete ({len(chars)}/{len(chars)})")
            else:
                any_gap = True
                hits = len(chars) - len(missing)
                ms = " ".join(char_repr(c) for c in missing)
                print(f"  [--]{bucket:<28s} {hits}/{len(chars)} — missing: {ms}")
        if not any_gap:
            print("  (no gaps)")

    # ---- Side-by-side summary ----
    print("\n" + "=" * 78)
    print("  GAP COUNTS BY BUCKET (lower is better)")
    print("=" * 78)
    bucket_names = list(BUCKETS.keys())
    name_w = max(len(b) for b in bucket_names) + 2
    font_w = 14
    header = " " * name_w + "".join(f"{d[:font_w]:>{font_w}}" for d in coverage)
    print(header)
    print(" " * name_w + "".join("-" * font_w for _ in coverage))
    for bucket in bucket_names:
        total = len(BUCKETS[bucket])
        row = f"{bucket:<{name_w}s}"
        for display in coverage:
            missing = len(coverage[display][bucket])
            cell = "OK" if missing == 0 else f"-{missing}/{total}"
            row += f"{cell:>{font_w}}"
        print(row)
    # Total missing across all buckets
    print(" " * name_w + "".join("-" * font_w for _ in coverage))
    row = f"{'TOTAL missing':<{name_w}s}"
    for display in coverage:
        total_missing = sum(len(coverage[display][b]) for b in bucket_names)
        row += f"{total_missing:>{font_w}}"
    print(row)

    OUT_JSON.write_text(json.dumps(coverage, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nJSON: {OUT_JSON}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
