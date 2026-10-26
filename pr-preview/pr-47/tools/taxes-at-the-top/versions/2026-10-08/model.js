// tools/taxes-at-the-top/model.js
//
// Pure port of the atlas2 surrogate evaluator (mirrors fit_surrogate.py —
// keep in lockstep). Transcribed verbatim from the de-minified app source;
// see task-2-brief.md for the exact line citations. No DOM, no engine, no
// module-level UI state: dec/incdef are always arguments.
export function createModel(DATA) {
  const LEVERS = DATA.meta.levers;                 // canonical order
  const BYKEY = {}; LEVERS.forEach(function (l) { BYKEY[l.key] = l; });
  const SUR = DATA.surrogate, MQ = DATA.meta.surrogate.m;
  const HEADS_ORDER = DATA.meta.surrogate.heads_order;
  const DECADES = DATA.meta.decades, GDPD = DATA.meta.gdp_fy_decades;
  const PCTS_ALL = DATA.meta.etr_groups;
  const PCTS = PCTS_ALL.filter(function (g) { return g !== 'Negative income'; });
  const NDEC = DECADES.length;

  // ---- evaluator (mirrors fit_surrogate.py — keep in lockstep) ------------- //
  // Knot-verbatim rule: input exactly on a knot returns the stored row with
  // no interpolation arithmetic (rows[i].slice()).
  function locate(knots, x, scale) {
    var k = knots, i;
    if (scale === 'log') { k = knots.map(function (v) { return Math.log(v); }); x = Math.log(Math.max(x, 1e-12)); }
    if (x <= k[0]) return [0, 0];
    if (x >= k[k.length - 1]) return [k.length - 1, 0];
    for (i = 0; i < k.length - 1; i++) {
      if (x === k[i]) return [i, 0];
      if (x < k[i + 1]) return [i, (x - k[i]) / (k[i + 1] - k[i])];
    }
    return [k.length - 1, 0];
  }
  function evalGrid(lv, rows, vals) {
    // A param the state omits sits at its off value — states that predate a
    // sub-axis (e.g. a `deemed` state with no exclusion) evaluate as exclusion 0.
    var axes = lv.params;
    function vOf(p) { return vals[p.key] !== undefined ? vals[p.key] : p.off; }
    // Axis location, discrete or continuous. A `scale: 'pos'` axis carries
    // string knots (the ladder's positions), so it is an exact index lookup —
    // never handed to locate, which compares numerically.
    function loc(p) {
      return p.scale === 'pos' ? [p.knots.indexOf(vOf(p)), 0] : locate(p.knots, vOf(p), p.scale);
    }
    if (axes.length === 1) {
      var p = axes[0];
      if (p.scale === 'pos') { return rows[p.knots.indexOf(vOf(p))].slice(); }
      var it = loc(p), i = it[0], t = it[1];
      if (t === 0) return rows[i].slice();
      return rows[i].map(function (a, z) { return (1 - t) * a + t * rows[i + 1][z]; });
    }
    // Two axes: rows are first-axis-major (index = i1 * n2 + i2). The
    // `deemed` ladder_x grid is 3 positions x 3 exclusion knots = 9 rows.
    var p1 = axes[0], p2 = axes[1], n2 = p2.knots.length;
    var l1 = loc(p1), i1 = l1[0], t1 = l1[1];
    var l2 = loc(p2), i2 = l2[0], t2 = l2[1];
    function row(a, b) { return rows[a * n2 + b]; }
    if (t1 === 0 && t2 === 0) return row(i1, i2).slice();
    var j1 = Math.min(i1 + 1, p1.knots.length - 1), j2 = Math.min(i2 + 1, n2 - 1);
    var r00 = row(i1, i2), r01 = row(i1, j2), r10 = row(j1, i2), r11 = row(j1, j2);
    return r00.map(function (_, z) {
      return (1 - t1) * ((1 - t2) * r00[z] + t2 * r01[z]) + t1 * ((1 - t2) * r10[z] + t2 * r11[z]);
    });
  }
  function gOf(key, vals) {
    return evalGrid(BYKEY[key], SUR.g[key], vals);   // per-decade dial-strength vector
  }
  // Element index -> decade index per quantity (decade-major money vectors;
  // etr/etrc and their dollar twins tax/taxc are decade-1 impact-year slices
  // in the same group x component layout). Mirrors fit_surrogate.dec_of.
  var SLICE_Q = { etr: 1, etrc: 1, tax: 1, taxc: 1 };
  var DECI = {};
  Object.keys(MQ).forEach(function (qid) {
    var m = MQ[qid], out = [], x;
    if (SLICE_Q[qid] || NDEC < 2) { for (x = 0; x < m; x++) out.push(0); }
    else { var per = m / NDEC; for (var dd = 0; dd < NDEC; dd++) for (x = 0; x < per; x++) out.push(dd); }
    DECI[qid] = out;
  });
  // Within-position exclusion ratio g_deemed(pos, exem) / g_deemed(pos, 0), per
  // decade. The byPos interaction vectors were measured at exclusion 0, so a
  // nonzero exclusion scales them by how much weaker the lever itself became.
  // 1 everywhere at exclusion 0. Mirrors fit_surrogate._ladder_ratio.
  function ladderRatio(s) {
    var vals = s.deemed, v0 = {}, k;
    for (k in vals) v0[k] = vals[k];
    v0.exem = 0;
    var gx = gOf('deemed', vals), g0 = gOf('deemed', v0);
    return gx.map(function (a, z) { return Math.abs(g0[z]) > 1e-9 ? a / g0[z] : 0; });
  }
  // Interpolate a pair vector linearly in the exclusion between measured
  // anchors: exclusion 0 (the byPos vector) and the byExem anchors ($1M, $5M in
  // this vintage). Clamps above the top anchor; anchors missing this qid count
  // as zero vectors. Mirrors fit_surrogate._exem_interp.
  function exemInterp(byExem, vec0, qid, exem) {
    var knots = [[0, vec0 || null]], e;
    for (e in byExem) knots.push([parseFloat(e), byExem[e][qid] || null]);
    knots.sort(function (x, y) { return x[0] - y[0]; });
    var m = null;
    knots.forEach(function (kk) { if (kk[1] && m === null) m = kk[1].length; });
    if (m === null) return null;
    var vecs = knots.map(function (kk) {
      if (kk[1]) return kk[1];
      var z = []; for (var i = 0; i < m; i++) z.push(0); return z;
    });
    var xs = knots.map(function (kk) { return kk[0]; });
    if (exem >= xs[xs.length - 1]) return vecs[vecs.length - 1];
    var i = 0; for (var j = 0; j < xs.length; j++) if (xs[j] <= exem) i = j;
    var t = (exem - xs[i]) / (xs[i + 1] - xs[i]);
    return vecs[i].map(function (a, z) { return (1 - t) * a + t * vecs[i + 1][z]; });
  }
  // Pair term honoring per-position vectors (the discrete-lever escape hatch):
  // when the pair carries byPos and one lever is the ladder (deemed), use the
  // position-specific vector scaled by the OTHER lever's g. At a nonzero
  // exclusion a measured byExem vector interpolated in the exclusion replaces
  // the within-position ratio scaling; the ratio remains the fallback for
  // positions with no measured anchors. Weights are per-decade vectors —
  // element x uses the weight of its own decade.
  function pairTerm(a, b, qid, s, g) {
    var pe = SUR.pairs[a + '|' + b];
    if (!pe) return null;
    var ladder = (a === 'deemed' || b === 'deemed') ? 'deemed' : null;
    if (pe.byPos && ladder) {
      var pos = s[ladder].pos;
      if (pe.byPos[pos]) {
        var other = (a === ladder) ? b : a;
        var exem = +(s[ladder].exem || 0);
        var bx = (pe.byExem || {})[pos];
        if (bx && exem > 0) {
          var vx = exemInterp(bx, pe.byPos[pos][qid], qid, exem);
          return vx ? { vec: vx, w: g[other].slice() } : null;
        }
        var v = pe.byPos[pos][qid];
        var r = ladderRatio(s);
        return v ? { vec: v, w: g[other].map(function (x, z) { return x * r[z]; }) } : null;
      }
    }
    return pe[qid] ? { vec: pe[qid], w: g[a].map(function (x, z) { return x * g[b][z]; }) } : null;
  }
  // Triple term with the same per-position rule: byPos + deemed member ->
  // position vector scaled by the product of the other two levers' g times the
  // within-position exclusion ratio. No triple carries byExem in this vintage,
  // so the ratio is the only exclusion path here.
  function tripleTerm(entry, ks, qid, s, g) {
    var w = [], z; for (z = 0; z < NDEC; z++) w.push(1);
    if (entry.byPos && ks.indexOf('deemed') >= 0) {
      var pos = s.deemed.pos;
      if (entry.byPos[pos]) {
        w = ladderRatio(s);
        ks.forEach(function (k) { if (k !== 'deemed') for (z = 0; z < NDEC; z++) w[z] *= g[k][z]; });
        var v = entry.byPos[pos][qid];
        return v ? { vec: v, w: w } : null;
      }
    }
    if (!entry[qid]) return null;
    ks.forEach(function (k) { for (z = 0; z < NDEC; z++) w[z] *= g[k][z]; });
    return { vec: entry[qid], w: w };
  }
  function evalQ(qid, s) {
    var m = MQ[qid], deci = DECI[qid], tot = [], i, j, x;
    for (x = 0; x < m; x++) tot.push(0);
    var on = []; LEVERS.forEach(function (l) { if (s[l.key]) on.push(l.key); });
    var g = {};
    on.forEach(function (k) {
      var f = SUR.solo[k][qid];
      if (f) { var v = evalGrid(BYKEY[k], f, s[k]); for (x = 0; x < m; x++) tot[x] += v[x]; }
      g[k] = gOf(k, s[k]);
    });
    for (i = 0; i < on.length; i++) for (j = i + 1; j < on.length; j++) {
      var pt = pairTerm(on[i], on[j], qid, s, g);
      if (pt) { for (x = 0; x < m; x++) tot[x] += pt.vec[x] * pt.w[deci[x]]; }
    }
    Object.keys(SUR.triples).forEach(function (tk) {
      var ks = tk.split('|');
      if (ks.every(function (k) { return g[k] !== undefined; })) {
        var tt = tripleTerm(SUR.triples[tk], ks, qid, s, g);
        if (tt) { for (x = 0; x < m; x++) tot[x] += tt.vec[x] * tt.w[deci[x]]; }
      }
    });
    return tot;
  }
  // Closed-form Shapley of a predicted decade-d total for quantity `qid`:
  // phi_i = f_i + 1/2 sum_j I_ij g_i g_j + 1/3 sum T g g g
  // Defaults to 'ct' (behavioral/converged); pass 'st' to get the same
  // exact-sum-to-total identity for the STATIC total (evalQ('st', s)[d]),
  // which is what layoutStack (render/stack.js) uses so the static side of
  // the stack view reconciles to results.comboStatic the same way the
  // behavioral side reconciles to results.actual.
  function shapley(s, dArg, qid) {
    var d = dArg, qk = qid || 'ct';
    var on = []; LEVERS.forEach(function (l) { if (s[l.key]) on.push(l.key); });
    var g = {}, phi = {}, i, j;
    on.forEach(function (k) {
      g[k] = gOf(k, s[k]);
      var f = SUR.solo[k][qk];
      phi[k] = f ? evalGrid(BYKEY[k], f, s[k])[d] : 0;
    });
    for (i = 0; i < on.length; i++) for (j = i + 1; j < on.length; j++) {
      var pt = pairTerm(on[i], on[j], qk, s, g);
      if (pt) {
        var half = 0.5 * pt.vec[d] * pt.w[d];
        phi[on[i]] += half; phi[on[j]] += half;
      }
    }
    Object.keys(SUR.triples).forEach(function (tk) {
      var ks = tk.split('|');
      if (ks.every(function (k) { return g[k] !== undefined; })) {
        var tt = tripleTerm(SUR.triples[tk], ks, qk, s, g);
        if (tt) {
          var third = tt.vec[d] * tt.w[d] / 3;
          ks.forEach(function (k) { phi[k] += third; });
        }
      }
    });
    return phi;
  }

  // ---- "how policies stack": order-dependent per-head marginal waterfall --- //
  // Restores the prototype's renderMarginals semantics (Task 17 regression
  // fix; see scratchpad/handoff/simulator.html:1098-1170, ported verbatim).
  // Each active lever's row is its MARGINAL contribution given the levers
  // above it in `order`: the running by-head package total (evalQ over the
  // surrogate state of the first i+1 levers) minus the running total for the
  // levers above it, on each of the three rungs — first-order ('sh'),
  // mechanical ('mh') and behavioral/collected ('ch'). This is deliberately ORDER-DEPENDENT
  // (unlike shapley above, an order-independent fair-division rule) — a
  // pair/triple interaction gets attributed to whichever row's prefix first
  // "picks it up," so dragging a row changes which row shows the
  // interaction. The rows always telescope to the same `pkg` total for ANY
  // order, since the last prefix is the full state regardless of ordering.
  // `s` is the surrogate state (same shape passed to computeResults/evalQ,
  // e.g. results.s); `order` is the active levers in the caller's chosen
  // sequence; `dec` is the decade index. 'ch'/'sh' are the surrogate's
  // by-head quantities (collected/static), distinct from the aggregate
  // 'ct'/'st' computeResults uses — each is a decade-major vector of
  // NDEC*NHEAD elements, so element `dec*NHEAD + z` is head z of decade dec
  // (mirrors DECI's decade-major layout above).
  function stackMarginals(s, order, dec) {
    var NHEAD = HEADS_ORDER.length;
    function zeroHeads() { var o = {}; HEADS_ORDER.forEach(function (hk) { o[hk] = 0; }); return o; }
    function hv(qid, keys) {
      var st = {};
      keys.forEach(function (k) { st[k] = s[k]; });
      var v = evalQ(qid, st), o = {};
      HEADS_ORDER.forEach(function (hk, z) { o[hk] = v[dec * NHEAD + z]; });
      return o;
    }
    function sub(a, b) {
      var o = {};
      HEADS_ORDER.forEach(function (hk) { o[hk] = (a[hk] || 0) - (b[hk] || 0); });
      return o;
    }
    var rows = [], prevC = zeroHeads(), prevM = zeroHeads(), prevS = zeroHeads();
    order.forEach(function (k, i) {
      var pref = order.slice(0, i + 1);
      var curC = hv('ch', pref), curM = hv('mh', pref), curS = hv('sh', pref);
      rows.push({ key: k, conv: sub(curC, prevC), mech: sub(curM, prevM), stat: sub(curS, prevS) });
      prevC = curC; prevM = curM; prevS = curS;
    });
    return { rows: rows, pkg: { conv: prevC, mech: prevM, stat: prevS } };
  }

  // ---- ETR machinery --------------------------------------------------------- //
  var CI = {}; DATA.meta.etr_comps.forEach(function (c, i) { CI[c] = i; });
  var NC = DATA.meta.etr_comps.length;
  var ETRYEAR = String(DATA.meta.dist_years[0]);
  function etrStack(row) {
    return {
      iit: row[CI.income_tax], pay: row[CI.payroll], est: row[CI.estate] + row[CI.deemed],
      wealth: row[CI.wealth], corp: row[CI.corp]
    };
  }
  function etrRowAt(deltaVec, idf, grp) {
    // reform row = baseline + delta, floored at 0 per component
    var di = DATA.meta.etr_income_defs.indexOf(idf), gi = PCTS_ALL.indexOf(grp);
    var base = (DATA.etr_base[idf] || {})[ETRYEAR];
    var brow = base && base[grp] ? base[grp] : null;
    if (!brow) return null;
    var out = [];
    for (var c = 0; c < NC; c++) {
      var d = deltaVec ? deltaVec[(di * PCTS_ALL.length + gi) * NC + c] : 0;
      out.push(Math.max(0, brow[c] + d));
    }
    return out;
  }
  function etrSeries(deltaVec, idf) {
    var out = { iit: [], pay: [], est: [], wealth: [], corp: [] };
    PCTS.forEach(function (g) {
      var row = etrRowAt(deltaVec, idf, g);
      var st = row ? etrStack(row) : { iit: 0, pay: 0, est: 0, wealth: 0, corp: 0 };
      Object.keys(out).forEach(function (k) { out[k].push(st[k]); });
    });
    return out;
  }
  function etrBaseSeries(idf) { return etrSeries(null, idf); }

  // Top-0.1% realized-ETR slice of an etrc vector: accrual (HS) definition,
  // summed across tax components — the headline tiles' distributional figure.
  var EDI = DATA.meta.etr_income_defs.indexOf('hs'),
    EGI = DATA.meta.etr_groups.indexOf('Top 0.1%'),
    NGRP = DATA.meta.etr_groups.length, NCMP = DATA.meta.etr_comps.length;
  function etrcTopSum(vec) {
    if (!vec) return 0;
    var off = (EDI * NGRP + EGI) * NCMP, s = 0;
    for (var c = 0; c < NCMP; c++) s += vec[off + c];
    return s;
  }

  // ---- compute -------------------------------------------------------------- //
  function computeResults(s, dec, incdef) {
    var keys = Object.keys(s);
    var ordKeys = LEVERS.map(function (l) { return l.key; }).filter(function (k) { return s[k]; });
    var actual = keys.length ? evalQ('ct', s)[dec] : 0;
    var comboStatic = keys.length ? evalQ('st', s)[dec] : 0;
    var parts = [], staticParts = 0, convParts = 0;
    ordKeys.forEach(function (k) {
      var solo = {}; solo[k] = s[k];
      var c1 = evalQ('ct', solo)[dec], s1 = evalQ('st', solo)[dec];
      parts.push({ key: k, s: s1, c: c1 }); staticParts += s1; convParts += c1;
    });
    var phi = keys.length ? shapley(s, dec) : {};
    var phiStatic = keys.length ? shapley(s, dec, 'st') : {};
    var etrDelta = keys.length ? evalQ('etr', s) : null;
    var etrcDelta = keys.length ? evalQ('etrc', s) : null;
    var etr = {
      baseline: etrBaseSeries(incdef), static: etrSeries(etrDelta, incdef),
      conv: etrSeries(etrcDelta, incdef)
    };
    var etrMax = 0;
    DATA.meta.etr_income_defs.forEach(function (idf) {
      [etrBaseSeries(idf), etrSeries(etrDelta, idf), etrSeries(etrcDelta, idf)].forEach(function (ser) {
        for (var i = 0; i < PCTS.length; i++) {
          var t = 0; Object.keys(ser).forEach(function (k) { t += Math.max(0, ser[k][i]); });
          if (t > etrMax) etrMax = t;
        }
      });
    });
    var iTop = PCTS.indexOf('Top 0.1%'); if (iTop < 0) iTop = PCTS.length - 1;
    var totTop = { baseline: 0, static: 0, conv: 0 };
    Object.keys(etr.baseline).forEach(function (k) {
      totTop.baseline += etr.baseline[k][iTop]; totTop.static += etr.static[k][iTop];
      totTop.conv += etr.conv[k][iTop];
    });
    return {
      s: s, keys: ordKeys, actual: actual, comboStatic: comboStatic, parts: parts,
      staticParts: staticParts, convParts: convParts, phi: phi, phiStatic: phiStatic,
      etr: etr, etrMax: etrMax, totTop: totTop, etrTop: etrcDelta ? etrcTopSum(etrcDelta) : 0
    };
  }

  // ---- distribution: per-group dollar composition + rate triple ------------- //
  // Same story as combinedDist/combinedEtr in the source (app.code.js:419-517),
  // in numbers instead of SVG: income kept, current-law tax, the reform's new
  // taxes split into collected vs. lost-to-behavior, and the three summed ETRs
  // (current law / static / collected) behind the dumbbell.
  //
  // The new-tax DOLLARS come from the 'tax'/'taxc' quantities (static /
  // conventional change in $B, same group x component layout as 'etr'), NOT
  // from rate x income. Each world's rate is divided by that world's own income,
  // so on cash income — where behavior moves realizations and with them the
  // denominator — multiplying a reform rate by current-law income misstates the
  // dollars (by $126B for a 40% capital gains rate in the 2026-09-28 vintage).
  // Current-law tax is still rate x income: that is the current-law world.
  var NGA = PCTS_ALL.length;
  function newTaxAt(vec, idf, grp) {
    if (!vec) return 0;
    var off = (DATA.meta.etr_income_defs.indexOf(idf) * NGA + PCTS_ALL.indexOf(grp)) * NC, t = 0;
    for (var c = 0; c < NC; c++) t += vec[off + c];
    return t;
  }
  function computeDistribution(s, dec, incdef) {
    // `dec` is unused: etr/etrc/tax/taxc are decade-0 impact-year slices (see
    // DECI above — they always map to decade index 0), not decade-major
    // vectors, so there's nothing here for it to index into.
    var keys = Object.keys(s);
    var etrDelta = keys.length ? evalQ('etr', s) : null;
    var etrcDelta = keys.length ? evalQ('etrc', s) : null;
    var taxDelta = keys.length ? evalQ('tax', s) : null;
    var taxcDelta = keys.length ? evalQ('taxc', s) : null;
    var etr = {
      baseline: etrBaseSeries(incdef), static: etrSeries(etrDelta, incdef),
      conv: etrSeries(etrcDelta, incdef)
    };
    var inc = (DATA.income_levels && DATA.income_levels[incdef]) || {};
    var tot = function (ser, i) { var t = 0; Object.keys(ser).forEach(function (k) { t += ser[k][i]; }); return t; };
    var out = {};
    PCTS.forEach(function (g, i) {
      var I = inc[g] || 0;
      var rateCurrentLaw = tot(etr.baseline, i), rateStatic = tot(etr.static, i), rateCollected = tot(etr.conv, i);
      var currentLawTax = rateCurrentLaw / 100 * I;
      var staticNew = newTaxAt(taxDelta, incdef, g);
      var collectedNew = newTaxAt(taxcDelta, incdef, g);
      var lostToBehavior = staticNew - collectedNew;
      var afterTaxIncome = I - currentLawTax - staticNew;
      out[g] = {
        income: I, currentLawTax: currentLawTax, staticNew: staticNew, collectedNew: collectedNew,
        lostToBehavior: lostToBehavior, afterTaxIncome: afterTaxIncome,
        rateCurrentLaw: rateCurrentLaw, rateStatic: rateStatic, rateCollected: rateCollected
      };
    });
    return out;
  }

  return {
    evalQ: evalQ, shapley: shapley, computeResults: computeResults, stackMarginals: stackMarginals,
    etrBaseSeries: etrBaseSeries, etrSeries: etrSeries, computeDistribution: computeDistribution,
    // gOf is the dial-strength evaluator behind ladderRatio; exposed because the
    // exclusion tests assert on it directly. etrcTopSum backs headline tile 4.
    gOf: gOf, etrcTopSum: etrcTopSum, ladderRatio: ladderRatio, evalGrid: evalGrid,
    meta: {
      LEVERS: LEVERS, BYKEY: BYKEY, HEADS_ORDER: HEADS_ORDER, DECADES: DECADES, GDPD: GDPD, PCTS: PCTS, MQ: MQ,
      // Same array etrRowAt's indexOf(idf) reads above — exposed so app.js's
      // income-def toggle is built from it instead of a hardcoded list that
      // could silently desync from it.
      INCOME_DEFS: DATA.meta.etr_income_defs
    }
  };
}
