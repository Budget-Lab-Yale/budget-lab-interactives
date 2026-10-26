// tools/taxes-at-the-top/render/stack-copy.js
//
// The stack view's mechanism copy: why a given tax base sits where it does
// against its first-order estimate, on the rung the reader is hovering.
//
// The tables below are the reviewers' editorial copy from the August 2026
// round, carried across VERBATIM — economic substance, not design, so it is not
// reworded here. Only the selector at the bottom is ours, and it is pure so the
// branch logic is testable without a DOM.
//
// The `tag` field on SPILL_DESC / SPILL_BYBASE is NOT read by anything. It
// predates the current card and was never shown to reviewers, so several tags
// no longer match the text beside them — 'Lock-in' on cg|iit is now plainly
// wrong. Treat a tag as stale until it is either wired up or deleted.
import { pgs } from './shared.js';

// The base(s) each policy is aimed at — its "own" base, as against the ones it
// only moves as a side effect.
export var SPILL_OWN = {
  ord: ['iit'], cg: ['cg'], corp: ['corp'], wealth: ['wealth'],
  deemed: ['cg', 'iit'], estate: ['est'], qbi: ['iit'], taxmax: ['pay']
};

// What causes each cross-base effect, keyed policy|base.
//
// corp|iit, corp|cg and corp|est are UNREACHABLE — MECH_PAIRS nulls `cross` for
// them, so whyCopy never reads these three. They were excluded from review for
// that reason and are dead weight.
export var SPILL_DESC = {
  'ord|corp': { tag: 'Entity shifting', t: 'Higher taxes on ordinary income make it more attractive, all else equal, to organize business activity under C-corporate form rather than pass-through form, causing some business income to reclassify from the latter to the former.' },
  'ord|cg': { tag: 'Recharacterization', t: 'Higher taxes on ordinary income make it more attractive, all else equal, to organize business activity under C-corporate form rather than pass-through form, causing some business income to reclassify from the latter to the former. Some of this income eventually shows up as capital gains and dividends when returned to shareholders. Additionally, higher taxes on ordinary income make it more attractive, all else equal, to structure labor compensation in the form of capital gains.' },
  'ord|pay': { tag: 'Wage base', t: 'Compensation that shifts out of salary into non-wage forms slightly decreases the payroll tax base.' },
  'cg|iit': { tag: 'Lock-in', t: 'Higher taxes on capital gains and dividends make it more attractive, all else equal, to organize business activity under pass-through form rather than C-corporate form, causing some business income to reclassify from the latter to the former. Additionally, these higher rates discourage structuring labor compensation in the form of capital gains. Both of these dynamics cause inflows into the ordinary income tax base.' },
  'cg|corp': { tag: 'Form advantage', t: 'Higher taxes on capital gains and dividends make it more attractive, all else equal, to organize business activity under pass-through form rather than C-corporate form, causing some business income to reclassify from the latter to the former.' },
  'corp|iit': { tag: 'Incidence on flows', t: 'A higher corporate rate leaves firms less after-tax cash to pay out. The dividends, interest, and rent reaching households shrink, and with them the individual income tax on that capital income.' },
  'corp|cg': { tag: 'Equity markdown', t: 'Heavier corporate taxation lowers the value of corporate equity. With share prices marked down, the gains later realized on those shares are smaller — so capital-gains receipts fall.' },
  'corp|est': { tag: 'Markdown to estates', t: 'The same equity markdown shrinks the value of corporate stock sitting in taxable estates.' },
  'wealth|iit': { tag: 'Base erosion', t: 'Underreporting of asset values due to the wealth tax also reduces the associated reported income flows.' },
  'wealth|cg': { tag: 'Base erosion', t: 'Underreporting of asset values due to the wealth tax also reduces the associated reported income flows.' },
  'wealth|est': { tag: 'Drains to estate', t: 'Underreporting of asset values due to the wealth tax also reduces reported assets for estate tax purposes.' },
  'deemed|corp': { tag: 'Shifting incentives', t: 'Limiting the benefit of deferring realized gains until death makes it more attractive, all else equal, to organize business activity under pass-through form rather than C-corporate form, causing some business income to reclassify from the latter to the former.' },
  'qbi|corp': { tag: 'Entity shifting', t: 'Repealing the pass-through deduction makes it more attractive, all else equal, to organize business activity under C-corporate form rather than pass-through form, causing some business income to reclassify from the latter to the former.' },
  'qbi|cg': { tag: 'Recharacterization', t: 'Repealing the pass-through deduction makes it more attractive, all else equal, to organize business activity under C-corporate form rather than pass-through form, causing some business income to reclassify from the latter to the former. Some of this income eventually shows up as capital gains and dividends when returned to shareholders.' }
};

// A first-order effect on a base the policy does not target, where the data
// puts it on the top rung rather than the mechanical one. Keyed policy|base.
export var STEP_FIRST = {
  'deemed|est': 'The income tax triggered by the deemed realization is deductible against the taxable estate.'
};

// Why a base sits below its first-order estimate before anyone changes
// behavior. Everything not named here is the saving channel: a during-life tax
// paid partly out of saving leaves a smaller stock in later years. That
// fallback is keyed on the BASE (MECH_BYBASE), whichever policy moved it.
export var STEP_MECH = {
  'corp|iit': 'A higher corporate rate reduces the after-tax rate of return in the corporate sector, causing capital to migrate into other sectors and compete down the rate of return, reducing taxable returns for pass-through, rental, and interest income.',
  'corp|cg': 'A higher corporate tax rate is partially capitalized into equity prices, reducing capital gains.',
  'corp|est': 'A higher corporate tax rate is partially capitalized into equity prices, reducing taxable estate.',
  'corp|wealth': 'A higher corporate tax rate is partially capitalized into equity prices, reducing taxable net worth.',
  'taxmax|iit': 'A higher employer-side tax results in lower wages, reducing taxable wages under the income tax.',
  'taxmax|pay': 'A higher employer-side tax results in lower wages, reducing taxable wages under the payroll tax.'
};

var MECH_BYBASE = {
  wealth: 'Higher taxes are partially financed out of savings, reducing taxable wealth in the future.',
  est: 'Higher taxes are partially financed out of savings, reducing the size of taxable estates at death.'
};
var MECH_SAVING = 'Higher taxes are partially financed out of savings, reducing taxable investment flows in the future.';

// Pairs whose cross-base story is the mechanical one, so the same sentence must
// not be reused for the behavioral step.
export var MECH_PAIRS = { 'corp|iit': 1, 'corp|cg': 1, 'corp|est': 1, 'corp|wealth': 1 };

export var STEP_BEHAV = {
  'corp|iit': 'A higher corporate tax rate makes it more attractive, all else equal, to organize business activity under pass-through form rather than C-corporate form, causing some business income to reclassify from the latter to the former.',
  'corp|cg': 'A higher corporate tax rate makes it more attractive, all else equal, to organize business activity under pass-through form rather than C-corporate form, causing some business income to reclassify from the latter to the former. This shifting leads to lower shareholder payments taking the form of capital gains and dividends.'
};

// Why the base moves again once taxpayers respond, on its own base.
export var STEP_BEHAV_OWN = {
  ord: 'A higher top rate on ordinary income makes it more attractive, all else equal, to organize business activity under C-corporate form rather than pass-through form, causing some business income to reclassify from the latter to the former. It also encourages illegal underreporting, restructuring of labor income to qualify for preferred rates, and more giving to charitable causes.',
  cg: 'A higher capital gains tax rate encourages deferring asset sales.',
  corp: 'A higher corporate tax rate makes it more attractive, all else equal, to organize business activity under pass-through form rather than C-corporate form, causing some business income to reclassify from the latter to the former. Firms also have a greater incentive to illegally underreport taxable income when the corporate rate is higher.',
  wealth: 'A higher tax on net worth encourages shifting into hard-to-value nonmarketable assets and illegal underreporting.',
  estate: 'Higher estate taxes encourage shifting into hard-to-value nonmarketable assets and illegal underreporting.',
  qbi: 'Repealing the QBI deduction makes it more attractive, all else equal, to organize business activity under C-corporate form rather than pass-through form, causing some business income to reclassify from the latter to the former.',
  deemed: 'When gains are no longer erased at death, there is less reason to defer asset sales, and taxable realizations rise.'
};

// Behavioral steps the card prints as a number with no sentence. The taxable
// max moves these bases in the model, but only through responses that price
// the income tax alone (Tax-Simulator MODEL_FIXES_TODO row 65), so there is no
// mechanism to name. Mirrors atlas2.html's NO_BEHAV_TEXT. Every policy's own
// base must be covered either here or by STEP_BEHAV_OWN.
export var NO_BEHAV_TEXT = { 'taxmax|iit': 1, 'taxmax|corp': 1, 'taxmax|cg': 1, 'taxmax|pay': 1 };

// Fallbacks for a pair with no named mechanism, where the story is the same
// whichever policy moved the base. The August 2026 review deliberately stripped
// every diminutive ("a little", "slightly", "small") from these, so they are
// magnitude-neutral: they read correctly over a $4B sliver and over a $60B
// movement alike. Do not reintroduce a size word here.
export var SPILL_BYBASE = {
  pay: { tag: 'Wage base', t: 'Behavioral responses can shift compensation between wage and non-wage forms, changing the payroll tax base.' },
  est: { tag: 'Drains to estate', t: 'Behavioral responses can change the amount of wealth ultimately reported in taxable estates.' },
  corp: { tag: 'Form advantage', t: 'Behavioral responses can shift business income between C-corporate and pass-through forms, changing the corporate tax base.' },
  cg: { tag: 'Realization timing', t: 'Behavioral responses can change when appreciated assets are sold, changing taxable capital gains.' },
  iit: { tag: 'Composition', t: 'Behavioral responses can change how much income is reported in forms subject to income taxes.' },
  wealth: { tag: 'Reported net worth', t: 'Behavioral responses can change the amount of net worth reported for wealth tax purposes.' }
};

// The review returned these split between "Direct impacts from" (the four rate
// levers) and "Direct revenues from" (the four structural ones). Left as
// returned rather than normalised to one verb — it is a 4-4 editorial split, not
// a defect.
export var SPILL_OWNDESC = {
  ord: 'Direct impacts from the higher statutory rate on top ordinary income.',
  cg: 'Direct impacts from the higher statutory rate on realized gains and qualified dividends.',
  corp: 'Direct impacts from the higher corporate rate.',
  wealth: 'Direct impacts from the new annual tax on net worth.',
  deemed: 'Direct revenues from the change in the tax treatment of gains at death.',
  estate: 'Direct revenues from the higher estate tax rate and/or lower exemption.',
  qbi: 'Direct revenues from removing the 20% deduction.',
  taxmax: 'Direct revenues from applying Social Security tax above the old wage cap.'
};

var PACKAGE_COPY = 'The total effect of the package as a whole. This base moves for several '
  + 'reasons. Hover over the rows above to see how each policy contributes to this effect.';

// A step is "material" when it rounds to at least the 0.01% of GDP the row
// prints. Below that the card must not narrate a movement the numbers beside it
// show as zero.
export function isMaterial(x, gdpDecade) {
  return Math.abs(x) / gdpDecade * 100 >= 0.005;
}

// Why this base sits where it does against its first-order estimate. The two
// steps have different causes, so the rung being described picks the answer. The
// package row mixes every policy's mechanisms, so it gets none.
//
// `row` is a stack row: {key, isTotal, stat, mech, conv} with per-head dollars.
// `rung` is 'stat' | 'mech' | 'conv'. Returns an HTML string.
export function whyCopy(row, head, rung, gdpDecade) {
  if (row.isTotal) return PACKAGE_COPY;

  var own = (SPILL_OWN[row.key] || []).indexOf(head) >= 0;
  var vs = row.stat[head] || 0, vm = row.mech[head] || 0, vc = row.conv[head] || 0;
  var dm = vm - vs, dc = vc - vm, net = vc - vs;
  var big = function (x) { return isMaterial(x, gdpDecade); };
  var sgnp = function (x) { return (x > 0 ? '+' : '') + pgs(x, gdpDecade); };

  var pk = row.key + '|' + head;
  if (rung === 'stat') {
    return own ? SPILL_OWNDESC[row.key]
      : (STEP_FIRST[pk] || 'The first-order impact on this base before any feedback.');
  }

  var mech = STEP_MECH[pk] || MECH_BYBASE[head] || MECH_SAVING;
  var cross = MECH_PAIRS[pk] ? null : (SPILL_DESC[pk] || SPILL_BYBASE[head]);
  var behav = NO_BEHAV_TEXT[pk] ? ''
    : own ? STEP_BEHAV_OWN[row.key]
    : (STEP_BEHAV[pk] || (cross ? cross.t : 'Behavioral responses cause this tax base to change.'));

  if (rung === 'mech') {
    return big(dm) ? ('<b>' + sgnp(dm) + ' against first order.</b> ' + mech)
      : 'Unchanged from first order: mechanical interactions have no material effect on this tax base.';
  }
  if (!big(dm) && !big(dc)) {
    return 'Less than 0.01% of GDP relative to the first-order estimate.';
  }
  var parts = ['<b>' + sgnp(net) + ' against first order.</b>'];
  if (big(dm)) parts.push(mech);
  if (big(dc) && behav) parts.push(behav);
  return parts.join(' ');
}
