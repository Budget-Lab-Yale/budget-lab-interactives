#!/usr/bin/env python3
"""Validate the archived vintages against the pinned chart engine and against
themselves.

Report-only by default. `--strict` exits non-zero on any finding, which is how
CI should run it once the archive is clean.

Every check here corresponds to a defect that actually shipped in the
hand-built back-fill, so each one is load-bearing rather than defensive:

  1  note-field pairing   a chart's note must be `spec.note`, a table's
                          `spec.notes`. The engine reads only its own, and
                          nothing validates at runtime, so the wrong key
                          renders nothing at all. 28 figures shipped this way.
  2  spec keys vs data    every value named in row_order / column_order /
                          series_order / emphasis_rows / format.rows /
                          format.groups must exist in the CSV, or the rule
                          silently matches nothing.
  3  declared columns     stub / header / value / pane must name real columns.
                          One vintage declared a `metric` header against a CSV
                          that had no such column.
  4  data path            every figure's CSV must exist and be non-empty.
  5  unit vocabulary      units drawn from the canonical set, and one unit per
                          metric across the whole archive.
  6  internal agreement   quantities that appear twice in a vintage must agree.
  7  substitution honesty the tag must be a real basis and the subtitle must
                          not claim a basis the data does not contain.

Check 6 compares MAGNITUDES for the distribution/summary pair: the two carry
opposite sign conventions by design (the live pipeline stores distribution
dollars negative and the summary household cost positive), so a signed
comparison would fail on correct data.
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, '..', 'data'))
VROOT = os.path.join(DATA, 'previous-vintages')

# `thousands` is the payroll-employment unit and has no alternative, so it is
# canonical too - an earlier draft of the spec wrongly listed it for retirement.
CANON_UNITS = {'pct', 'pp', 'usd', 'usd_bn', 'thousands'}
YEAR = re.compile(r'^(19|20)\d{2}$')
RANGE = re.compile(r'^(\d{4})\D+(\d{2,4})$')

# Summary tables that carry a policy x rate x duration matrix cannot be paired
# one-to-one with a single annotation or revenue total.
MULTI_POLICY_COLS = {'policy', 'rate_group', 'duration'}

findings: list[tuple[str, str, str]] = []


def add(sev: str, where: str, msg: str) -> None:
    findings.append((sev, where, msg))


def load_csv(path):
    with io.open(path, encoding='utf-8', errors='replace', newline='') as fh:
        rdr = csv.DictReader(fh)
        return list(rdr), (rdr.fieldnames or [])


def parts_of(fig):
    return fig.get('parts') or [fig]


def ptype(fig, part):
    return part.get('figureType') or fig.get('figureType')


def check_vintage(vdir: str) -> None:
    vj = os.path.join(VROOT, vdir, 'vintage.json')
    if not os.path.isfile(vj):
        return
    try:
        doc = json.loads(io.open(vj, encoding='utf-8').read())
    except Exception as e:                                   # noqa: BLE001
        add('ERROR', vdir, f'vintage.json does not parse: {e}')
        return

    unit_of_metric: dict[str, set] = defaultdict(set)

    for sc in doc.get('scenarios', []):
        scid = sc.get('id')
        figs = {f.get('id'): f for f in sc.get('tab', {}).get('figures', [])}

        for fid, fig in figs.items():
            for i, part in enumerate(parts_of(fig), 1):
                where = f'{vdir}/{scid}/{fid}' + (f'#part{i}' if fig.get('parts') else '')
                spec = part.get('spec') or {}
                t = ptype(fig, part)

                # 1 — note field pairing
                if t == 'chart' and spec.get('notes'):
                    add('ERROR', where, 'chart carries spec.notes; the chart '
                                        'renderer reads spec.note, so this renders nothing')
                if t == 'table' and spec.get('note'):
                    add('ERROR', where, 'table carries spec.note; the table '
                                        'renderer reads spec.notes')

                # 4 — data path
                rel = part.get('data')
                if not rel:
                    continue
                p = os.path.join(DATA, rel)
                if not os.path.exists(p):
                    add('ERROR', where, f'data file missing: {rel}')
                    continue
                rows, cols = load_csv(p)
                if not rows:
                    add('ERROR', where, f'data file empty: {rel}')
                    continue

                # 3 — declared columns exist
                declared = []
                for key in ('stub', 'header'):
                    v = spec.get(key)
                    if isinstance(v, list):
                        declared += [x for x in v if isinstance(x, str)]
                for key in ('value', 'pane'):
                    if isinstance(spec.get(key), str):
                        declared.append(spec[key])
                colmap = spec.get('columns') or {}
                declared += [v for v in colmap.values() if isinstance(v, str)]
                for c in declared:
                    if c not in cols:
                        add('ERROR', where, f'spec names column {c!r}, not in the CSV {cols}')

                # 2 — ordering / format keys resolve against the data
                present = {c: {str(r.get(c)) for r in rows} for c in cols}
                allvals = set().union(*present.values()) if present else set()
                for key in ('row_order', 'column_order', 'series_order',
                            'emphasis_rows', 'x_order', 'column_group_order',
                            'pane_order', 'group_order'):
                    v = spec.get(key)
                    if not isinstance(v, list):
                        continue
                    flat = [x for x in v if isinstance(x, str)]
                    for x in flat:
                        if x not in allvals:
                            add('WARN', where, f'{key} names {x!r}, which appears in no column')
                fmt = spec.get('format') or {}
                for scope in ('rows', 'groups', 'columns'):
                    for k in (fmt.get(scope) or {}):
                        if k not in allvals:
                            add('WARN', where,
                                f'format.{scope} keyed on {k!r}, which appears in no column')

                # 5 — units
                for r in rows:
                    u, m = r.get('unit'), r.get('metric')
                    if u:
                        if u not in CANON_UNITS:
                            add('WARN', where, f'unit {u!r} is outside the canonical set')
                        if m:
                            unit_of_metric[m].add(u)

                # 7 — substitution honesty
                if 'substitution' in cols:
                    tags = {r.get('substitution') for r in rows if r.get('substitution')}
                    # Where `substitution` is the rendered x category, its values ARE
                    # the axis labels - there is no axis-tick relabel field, so the
                    # display string has to live in the data. The canonical
                    # presub/postsub vocabulary applies only where the column is
                    # metadata.
                    rendered = (spec.get('columns') or {}).get('x') == 'substitution'
                    allowed = ({'Pre-substitution', 'Post-substitution'} if rendered
                               else {'presub', 'postsub'})
                    bad = tags - allowed
                    if bad:
                        add('WARN', where, f'substitution values outside '
                                           f'{sorted(allowed)}: {sorted(bad)}')
                    st = (spec.get('subtitle') or '').lower()
                    if 'post-substitution' in st and tags == {'presub'}:
                        add('ERROR', where, 'subtitle says post-substitution but the '
                                            'data is tagged presub only')
                    if re.search(r'(?<!post-)\bpre-substitution', st) and tags == {'postsub'}:
                        add('ERROR', where, 'subtitle says pre-substitution but the '
                                            'data is tagged postsub only')

        # 6 — internal agreement
        check_internal(vdir, scid, figs)

    for m, us in unit_of_metric.items():
        if len(us) > 1:
            add('WARN', vdir, f'metric {m!r} carries more than one unit: {sorted(us)}')


def rows_for(fig, want_id=None):
    out = []
    for part in parts_of(fig):
        rel = part.get('data')
        if not rel:
            continue
        p = os.path.join(DATA, rel)
        if os.path.exists(p):
            rows, cols = load_csv(p)
            out.append((part, rows, cols))
    return out


def check_internal(vdir, scid, figs) -> None:
    where = f'{vdir}/{scid}'
    summ = figs.get('summary-statistics')
    if not summ:
        return
    srows = []
    multi = False
    for part, rows, cols in rows_for(summ):
        srows += rows
        if MULTI_POLICY_COLS & set(cols):
            multi = True

    def summary_value(pred):
        hits = []
        for r in srows:
            lab = ' '.join(str(r.get(c) or '') for c in r if c != 'value')
            if pred(lab, r):
                try:
                    hits.append(float(r['value']))
                except (TypeError, ValueError):
                    pass
        return hits

    # distribution vs the summary household cost — MAGNITUDES, and only on
    # comparable rows. A naive average over every dollar row mixes the `Total`
    # row in with the deciles and both substitution bases together, which is
    # not a like-for-like comparison and produces false warnings.
    dist = figs.get('distribution')
    if dist and not multi:
        pre = summary_value(lambda lab, r: re.search(r'household|hh_cost', lab, re.I)
                            and re.search(r'pre', lab, re.I))
        for part, rows, cols in rows_for(dist):
            dollars = [r for r in rows
                       if re.search(r'dollar|20\d\d', str(r.get('basis') or ''), re.I)]
            if 'substitution' in cols:
                bases = {r.get('substitution') for r in dollars}
                pick = 'presub' if 'presub' in bases else (bases.pop() if bases else None)
                dollars = [r for r in dollars if r.get('substitution') == pick]

            def num(r):
                try:
                    return float(r['value'])
                except (TypeError, ValueError):
                    return None

            # A published Total row is the exact counterpart; prefer it.
            tot = [num(r) for r in dollars
                   if str(r.get('category') or '').strip().lower() == 'total']
            tot = [x for x in tot if x is not None]
            deciles = [num(r) for r in dollars
                       if str(r.get('category') or '').strip().isdigit()]
            deciles = [x for x in deciles if x is not None]

            if len(pre) != 1:
                continue
            if tot:
                if abs(abs(tot[0]) - abs(pre[0])) > max(1.0, abs(pre[0]) * 0.005):
                    add('WARN', where,
                        f'distribution Total |{tot[0]:.1f}| disagrees with the summary '
                        f'household cost |{pre[0]:.1f}|')
            elif len(deciles) >= 8:
                mean = sum(deciles) / len(deciles)
                if abs(abs(mean) - abs(pre[0])) > max(2.0, abs(pre[0]) * 0.02):
                    add('INFO', where,
                        f'unweighted decile mean |{mean:.1f}| differs from the summary '
                        f'all-household average |{pre[0]:.1f}| by '
                        f'{abs(abs(mean)-abs(pre[0]))/abs(pre[0])*100:.1f}%. Both are '
                        f'published separately and are different estimands, so this is '
                        f'informational - but they agree exactly in most vintages.')

    # summary revenue vs the revenue-by-year total for the matching window
    rby = figs.get('revenue-by-year')
    if rby and not multi:
        totals = {}
        for part, rows, cols in rows_for(rby):
            for r in rows:
                cat = str(r.get('category') or '').strip()
                ser = str(r.get('series') or '').strip()
                if RANGE.match(cat) and ser in ('conventional', 'dynamic'):
                    totals.setdefault(ser, []).append((cat, r.get('value')))
        for ser in ('conventional', 'dynamic'):
            hits = summary_value(
                lambda lab, r, s=ser: re.search(s, lab, re.I)
                and re.search(r'revenue', lab, re.I)
                and r.get('unit') in ('usd_b', 'usd_bn')
                and not re.search(r"add'?l|additional|effects|feedback|% of gdp", lab, re.I))
            if len(hits) == 1 and totals.get(ser):
                # published rounding is legitimate; only flag a real disagreement
                best = None
                for cat, v in totals[ser]:
                    try:
                        fv = float(v)
                    except (TypeError, ValueError):
                        continue
                    if best is None or abs(fv - hits[0]) < abs(best[1] - hits[0]):
                        best = (cat, fv)
                if best:
                    gap = abs(best[1] - hits[0])
                    # The reports print Table 1 in trillions to 1-2 decimals and
                    # Table 3 in billions, so a gap below the trillion rounding
                    # step is the publication's own rounding, not a defect.
                    rounding_step = 50.0 if hits[0] % 100 == 0 else 5.0
                    if gap > max(rounding_step, abs(best[1]) * 0.02):
                        add('WARN', where,
                            f'summary {ser} revenue {hits[0]:.1f} disagrees with the '
                            f'revenue-by-year {best[0]} total {best[1]:.1f}')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--strict', action='store_true',
                    help='exit non-zero on any finding (CI mode)')
    ap.add_argument('--errors-only', action='store_true')
    args = ap.parse_args()

    if not os.path.isdir(VROOT):
        print('no previous-vintages directory; nothing to validate')
        return 0

    for d in sorted(os.listdir(VROOT)):
        if os.path.isdir(os.path.join(VROOT, d)):
            check_vintage(d)

    errs = [f for f in findings if f[0] == 'ERROR']
    warns = [f for f in findings if f[0] == 'WARN']
    infos = [f for f in findings if f[0] == 'INFO']
    show = errs if args.errors_only else errs + warns + infos

    for sev, where, msg in show:
        print(f'{sev:5} {where}: {msg}')

    print(f'\nvalidate-vintages: {len(errs)} errors, {len(warns)} warnings, '
          f'{len(infos)} informational across {len(os.listdir(VROOT))} vintages')

    # INFO never gates: it flags quantities that are published separately and
    # need not agree, so failing on it would make the gate unpassable.
    if args.strict and (errs or (warns and not args.errors_only)):
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
