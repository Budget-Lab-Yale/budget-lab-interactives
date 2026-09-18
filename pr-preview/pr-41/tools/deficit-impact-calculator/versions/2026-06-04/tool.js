(function () {

  var _script = document.currentScript;

  var SCENARIOS = {
    since2015: {
      central: 97.059490333353,
      low: 72.7946177500148,
      high: 145.58923550003
    },
    since2022: {
      central: 18.1060907514364,
      low: 13.5795680635773,
      high: 27.1591361271546
    }
  };

  var LOANS = {
    mortgage: {
      term: 360,
      observedRate: 6.30,
      passthrough: 1.00,
      defaultPrincipal: 341440
    },
    auto: {
      term: 69,
      observedRate: 6.56,
      passthrough: 0.50,
      defaultPrincipal: 42332
    },
    business: {
      term: 120,
      observedRate: 10.25,
      passthrough: 0.25,
      defaultPrincipal: 477571
    }
  };

  var ELASTICITY_CENTRAL = 2.0;
  var K      = 0.0813;
  var RAVG_0 = 3.3235;
  var R10      = [4.098, 4.234, 4.294, 4.324, 4.340, 4.349, 4.357, 4.365, 4.372, 4.380];
  var GDP_PATH = [31902.0, 33315.2, 34665.8, 36010.0, 37390.7, 38812.8, 40276.5, 41795.9, 43373.3, 45011.5];

  function monthlyPayment(principal, annualRatePct, termMonths) {
    if (annualRatePct <= 0) return principal / termMonths;
    var r = annualRatePct / 100 / 12;
    var n = termMonths;
    var factor = Math.pow(1 + r, n);
    return principal * r * factor / (factor - 1);
  }

  function computeLoanImpact(principal, observedRatePct, passthrough, scenarioDeltaBp, termMonths) {
    var loanEffectPp = (scenarioDeltaBp * passthrough) / 100;
    var counterfactualRatePct = observedRatePct - loanEffectPp;
    var obsMonthly = monthlyPayment(principal, observedRatePct, termMonths);
    var cfMonthly  = monthlyPayment(principal, counterfactualRatePct, termMonths);
    var diff = obsMonthly - cfMonthly;
    return {
      annualImpact:      Math.round(diff * 12),
      lifetimeImpact:    Math.round(diff * termMonths),
      lifetimeImpactPct: parseFloat(((diff * termMonths) / principal * 100).toFixed(1))
    };
  }

  function computeDebtIncreaseEffect(principal, observedRatePct, passthrough, termMonths, debtIncreaseBn) {
    var ravg = RAVG_0;
    var extraDebt = 0;
    var interestCost = 0;
    var debtGdpSum = 0;
    for (var t = 0; t < 10; t++) {
      ravg = ravg + K * (R10[t] - ravg);
      var primary = (t === 0) ? debtIncreaseBn : 0;
      extraDebt = extraDebt + primary + interestCost;
      interestCost = (ravg / 100) * extraDebt;
      debtGdpSum += (extraDebt / GDP_PATH[t]) * 100;
    }
    var avgDebtGdpPp    = debtGdpSum / 10;
    var treasuryDeltaBp = avgDebtGdpPp * ELASTICITY_CENTRAL;
    var loanRateEffectBp = treasuryDeltaBp * passthrough;
    var loanRateEffectPp = loanRateEffectBp / 100;
    var obsMonthly  = monthlyPayment(principal, observedRatePct, termMonths);
    var postMonthly = monthlyPayment(principal, observedRatePct + loanRateEffectPp, termMonths);
    var diff = postMonthly - obsMonthly;
    return {
      loanRateEffectBp: loanRateEffectBp,
      annualImpact:     Math.round(diff * 12),
      lifetimeImpact:   Math.round(diff * termMonths)
    };
  }

  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }
  function fmtBill(bn) {
    if (bn >= 1000) {
      var t = bn / 1000;
      return '$' + (t % 1 === 0 ? t : t.toFixed(1)) + ' trillion';
    }
    return '$' + bn + ' billion';
  }
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // Colors and fonts per Budget-Lab-Yale/Style-Guide.
  var THEME = {
    fontFamily:     "'Mallory', 'Figtree', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
    titleSize:      '18px',
    bodySize:       '13px',
    axisSize:       '11px',
    annotationSize: '12px',
    titleText:      '#1A1A2E',
    borderRadius:   '8px',
    maxWidth:       '900px',
    colorAuto:      '#0072B2',
    colorMortgage:  '#E69F00',
    colorBiz:       '#8856BF',
    calcBg:         '#D9EAFF',
    calcBtnBg:      '#101F5B',
  };

  function buildCSS(uid, theme) {
    var u = '#' + uid;
    return [
      u + ' * { margin: 0; padding: 0; box-sizing: border-box; }',
      u + ' { width: 100%; max-width: ' + theme.maxWidth + '; margin: 0 auto; overflow-x: auto; font-family: ' + theme.fontFamily + '; }',

      u + ' .calculator { border: 1px solid rgba(128,128,128,0.2); border-radius: ' + theme.borderRadius + '; padding: 24px; margin-top: 8px; background: ' + theme.calcBg + '; color: ' + theme.titleText + '; }',
      u + ' .calc-body { display: flex; gap: 0; align-items: stretch; }',
      u + ' .calc-inputs { flex: 1; padding-right: 24px; }',
      u + ' .calc-divider { width: 1px; background: rgba(0,0,0,0.15); flex-shrink: 0; }',
      // padding-top reserves vertical space for the logo overlay so results
      // never render under it. Calc padding stays symmetric (so the divider
      // sits equally close to top and bottom borders); only the right column
      // gets the logo-clearance offset.
      u + ' .calc-output { flex: 1; padding-left: 24px; padding-top: 24px; display: flex; align-items: center; }',
      u + ' .calc-field { margin-bottom: 16px; }',
      u + ' .calc-field > label, ' + u + ' .calc-label { display: block; font-size: ' + theme.annotationSize + '; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-bottom: 8px; }',
      u + ' .amount-input-wrap { position: relative; }',
      u + ' .amount-prefix { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 16px; color: ' + theme.titleText + '; pointer-events: none; user-select: none; }',
      u + ' .amount-suffix { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 16px; color: ' + theme.titleText + '; opacity: 0.45; pointer-events: none; user-select: none; }',
      u + ' .calculator input[type="text"] { width: 100%; padding: 10px 12px 10px 24px; border: 1px solid rgba(0,0,0,0.2); border-radius: ' + theme.borderRadius + '; font-size: 16px; background: rgba(255,255,255,0.6); color: ' + theme.titleText + '; outline: none; transition: border-color 0.2s; font-family: inherit; }',
      u + ' .calculator input[type="text"]:focus { border-color: rgba(0,0,0,0.4); }',
      u + ' .loan-type-btns { display: flex; gap: 8px; flex-wrap: wrap; }',
      u + ' .loan-btn { flex: 1; padding: 7px 14px; text-align: center; border: 1.5px solid rgba(0,0,0,0.2); border-radius: ' + theme.borderRadius + '; background: rgba(255,255,255,0.5); color: ' + theme.titleText + '; font-size: ' + theme.bodySize + '; font-weight: 700; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s; font-family: inherit; }',
      u + ' .loan-btn:hover { border-color: rgba(0,0,0,0.4); background: rgba(255,255,255,0.8); }',
      u + ' .loan-btn.active[data-value="auto"]     { background: ' + hexToRgba(theme.colorAuto,     0.4) + '; border-color: ' + theme.colorAuto +     '; color: ' + theme.titleText + '; }',
      u + ' .loan-btn.active[data-value="mortgage"] { background: ' + hexToRgba(theme.colorMortgage, 0.4) + '; border-color: ' + theme.colorMortgage + '; color: ' + theme.titleText + '; }',
      u + ' .loan-btn.active[data-value="business"] { background: ' + hexToRgba(theme.colorBiz,      0.4) + '; border-color: ' + theme.colorBiz +      '; color: ' + theme.titleText + '; }',
      u + ' .calc-pill-wrap { display: flex; background: rgba(0,0,0,0.08); border-radius: 6px; padding: 3px; gap: 2px; }',
      u + ' .calc-pill { flex: 1; padding: 6px 10px; text-align: center; background: transparent; border: none; border-radius: 4px; font-size: ' + theme.bodySize + '; font-weight: 700; cursor: pointer; color: ' + theme.titleText + '; transition: background 0.15s, box-shadow 0.15s; font-family: inherit; }',
      u + ' .calc-pill.active { background: rgba(255,255,255,0.9); box-shadow: 0 1px 3px rgba(0,0,0,0.12); }',
      u + ' .calc-pill:hover:not(.active) { background: rgba(255,255,255,0.4); }',
      u + ' .calc-helper { font-size: ' + theme.axisSize + '; opacity: 0.5; margin-top: 4px; }',
      u + ' .calc-footnote { font-size: ' + theme.axisSize + '; font-style: italic; opacity: 0.45; margin-top: 8px; line-height: 1.5; }',
      u + ' .calc-explain-btn { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(26,26,46,0.35); background: transparent; color: ' + theme.titleText + '; font-size: 11px; font-weight: 800; cursor: pointer; padding: 0; display: inline-flex; align-items: center; justify-content: center; opacity: 0.45; transition: opacity 0.15s; font-family: inherit; }',
      u + ' .calc-explain-btn:hover { opacity: 0.85; }',
      u + ' .calc-explain { display: none; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.1); font-size: ' + theme.axisSize + '; line-height: 1.6; opacity: 0.65; }',
      u + ' .calc-explain.open { display: block; }',
      u + ' .calc-explain-head { font-weight: 800; font-style: normal; margin-bottom: 6px; opacity: 1; }',
      u + ' .calculator input.bill-input { padding: 10px 72px 10px 24px; }',
      u + ' .calc-submit-btn { padding: 10px 24px; width: calc(66.667% + 5.333px); background: ' + theme.calcBtnBg + '; color: #fff; border: none; border-radius: ' + theme.borderRadius + '; font-size: ' + theme.bodySize + '; font-weight: 800; cursor: pointer; transition: opacity 0.2s; display: block; margin: 4px auto 0; text-align: center; font-family: inherit; }',
      u + ' .calc-submit-btn:hover { opacity: 0.85; }',
      u + ' .calc-result { font-size: ' + theme.bodySize + '; line-height: 1.9; width: 100%; }',
      u + ' .result-amount { font-size: clamp(20px, 3vw, 26px); font-weight: 900; color: ' + theme.titleText + '; }',
      u + ' .calc-result strong { font-weight: 800; }',
      u + ' .calc-error { color: #c0392b; font-size: ' + theme.bodySize + '; }',
      u + ' .calc-placeholder { opacity: 0.35; font-size: ' + theme.bodySize + '; font-style: italic; }',

      '@media (max-width: 600px) {',
      '  ' + u + ' .calc-body { flex-direction: column; }',
      '  ' + u + ' .calc-inputs { padding-right: 0; padding-bottom: 20px; }',
      '  ' + u + ' .calc-divider { width: 100%; height: 1px; }',
      '  ' + u + ' .calc-output { padding-left: 0; padding-top: 20px; }',
      '  ' + u + ' .calc-submit-btn { width: 100%; }',
      '}'
    ].join('\n');
  }

  function buildHTML(uid) {
    return (
      '<div class="calculator" data-iframe-height>' +
        '<div class="calc-body">' +
          '<div class="calc-inputs">' +
            '<div class="calc-field">' +
              '<label for="' + uid + '-loanAmount">Enter your loan amount</label>' +
              '<div class="amount-input-wrap">' +
                '<span class="amount-prefix">$</span>' +
                '<input type="text" inputmode="numeric" id="' + uid + '-loanAmount" placeholder="250,000, e.g." />' +
              '</div>' +
            '</div>' +
            '<div class="calc-field">' +
              '<span class="calc-label">Type of loan</span>' +
              '<div class="loan-type-btns">' +
                '<button class="loan-btn" data-value="auto">Auto</button>' +
                '<button class="loan-btn" data-value="mortgage">Mortgage</button>' +
                '<button class="loan-btn" data-value="business">Small Business</button>' +
              '</div>' +
            '</div>' +
            '<div class="calc-field">' +
              '<span class="calc-label">Calculate</span>' +
              '<div class="calc-pill-wrap">' +
                '<button class="calc-pill active" data-mode="historical">Historical Deficits</button>' +
                '<button class="calc-pill" data-mode="debt-increase">One-Time Debt Increase</button>' +
              '</div>' +
            '</div>' +
            '<div class="calc-field" id="' + uid + '-billField" style="display:none">' +
              '<label for="' + uid + '-billAmount">One-time debt increase</label>' +
              '<div class="amount-input-wrap">' +
                '<span class="amount-prefix">$</span>' +
                '<input type="text" inputmode="numeric" id="' + uid + '-billAmount" class="bill-input" placeholder="1,000" />' +
                '<span class="amount-suffix">billion</span>' +
              '</div>' +
              '<div class="calc-helper">Enter a one-time debt increase from 0 to 2,000 billion.</div>' +
            '</div>' +
            '<button class="calc-submit-btn" id="' + uid + '-calcBtn">Calculate</button>' +
          '</div>' +
          '<div class="calc-divider"></div>' +
          '<div class="calc-output">' +
            '<div id="' + uid + '-calcResult" class="calc-result"><span class="calc-placeholder">Your results will appear here.</span></div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function initInteractivity(uid) {
    var loanInput  = document.getElementById(uid + '-loanAmount');
    var billField  = document.getElementById(uid + '-billField');
    var billInput  = document.getElementById(uid + '-billAmount');
    var calcResult = document.getElementById(uid + '-calcResult');

    loanInput.addEventListener('input', function() {
      var digits = this.value.replace(/[^0-9]/g, '');
      if (!digits) { this.value = ''; return; }
      this.value = Math.min(parseInt(digits, 10), 999999999).toLocaleString();
    });

    document.querySelectorAll('#' + uid + ' .loan-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#' + uid + ' .loan-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('#' + uid + ' .calc-pill').forEach(function(pill) {
      pill.addEventListener('click', function() {
        document.querySelectorAll('#' + uid + ' .calc-pill').forEach(function(p) { p.classList.remove('active'); });
        pill.classList.add('active');
        billField.style.display = pill.dataset.mode === 'debt-increase' ? 'block' : 'none';
      });
    });

    calcResult.addEventListener('click', function(e) {
      if (e.target.classList.contains('calc-explain-btn')) {
        e.stopPropagation();
        var panel = document.getElementById(uid + '-explainPanel');
        if (panel) panel.classList.toggle('open');
      }
    });

    document.addEventListener('click', function(e) {
      var panel = document.getElementById(uid + '-explainPanel');
      if (panel && panel.classList.contains('open') && !panel.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    billInput.addEventListener('input', function() {
      var digits = this.value.replace(/[^0-9]/g, '');
      if (!digits) { this.value = ''; return; }
      this.value = Math.min(parseInt(digits, 10), 2000).toLocaleString();
    });

    document.getElementById(uid + '-calcBtn').addEventListener('click', function() {
      var amount = parseFloat(loanInput.value.replace(/,/g, ''));
      var typeEl = document.querySelector('#' + uid + ' .loan-btn.active');
      var modeEl = document.querySelector('#' + uid + ' .calc-pill.active');
      var mode   = modeEl ? modeEl.dataset.mode : 'historical';

      if (!amount || amount <= 0) { calcResult.innerHTML = '<span class="calc-error">Please enter a valid loan amount.</span>'; return; }
      if (!typeEl)                 { calcResult.innerHTML = '<span class="calc-error">Please select a loan type.</span>';        return; }

      var type      = typeEl.dataset.value;
      var typeLabel = type === 'auto' ? 'auto loan' : type === 'mortgage' ? 'mortgage' : 'small business loan';
      var loan      = LOANS[type];

      if (mode === 'historical') {
        var impact = computeLoanImpact(amount, loan.observedRate, loan.passthrough, SCENARIOS.since2015.central, loan.term);
        calcResult.innerHTML =
          '<div>Federal legislation since 2015 has raised borrowing costs on a <strong>$' + amount.toLocaleString() + ' ' + typeLabel + '</strong> by:</div>' +
          '<div style="margin-top:12px;"><span class="result-amount">$' + impact.annualImpact.toLocaleString()  + '</span> annually</div>' +
          '<div><span class="result-amount">$'                          + impact.lifetimeImpact.toLocaleString() + '</span> over the life of your loan</div>';
      } else {
        var billRaw = billInput.value.trim();
        if (!billRaw) {
          calcResult.innerHTML = '<span class="calc-error">Enter a one-time debt increase in billions to calculate this scenario.</span>';
          return;
        }
        var debtBn = parseInt(billRaw.replace(/,/g, ''), 10);
        if (isNaN(debtBn) || debtBn <= 0 || debtBn > 2000) {
          calcResult.innerHTML = '<span class="calc-error">Enter a whole number from 1 to 2,000 billion.</span>';
          return;
        }
        var effect     = computeDebtIncreaseEffect(amount, loan.observedRate, loan.passthrough, loan.term, debtBn);
        var histImpact = computeLoanImpact(amount, loan.observedRate, loan.passthrough, SCENARIOS.since2015.central, loan.term);
        var bpDisplay  = effect.loanRateEffectBp < 10
          ? effect.loanRateEffectBp.toFixed(2)
          : Math.round(effect.loanRateEffectBp);

        calcResult.innerHTML =
          '<div>A <strong>' + fmtBill(debtBn) + '</strong> increase in federal debt would raise borrowing costs on a <strong>$' + amount.toLocaleString() + ' ' + typeLabel + '</strong> by:</div>' +
          '<div style="margin-top:12px;"><span class="result-amount">$' + effect.annualImpact.toLocaleString()   + '</span> annually</div>' +
          '<div><span class="result-amount">$'                          + effect.lifetimeImpact.toLocaleString() + '</span> over the life of your loan</div>' +
          '<div style="margin-top:8px;">Equivalent to +' + bpDisplay + ' bp on this loan\'s borrowing rate.</div>' +
          '<div style="margin-top:8px;">For context, past legislation since 2015 already adds <strong>$' + histImpact.annualImpact.toLocaleString() + '</strong> annually.</div>' +
          '<div class="calc-footnote">This estimate models the effects of a one-time increase in federal debt (realized in a single year), including the cost of servicing that additional debt over a 10-year budget window.</div>' +
          '<div class="calc-footnote">This estimate uses a constant debt-to-rate sensitivity drawn from the empirical literature. For very large fiscal changes, the actual effect on rates could be larger.</div>' +
          '<div style="display:flex;justify-content:flex-end;margin-top:10px;">' +
            '<button class="calc-explain-btn" title="How this estimate works">?</button>' +
          '</div>' +
          '<div class="calc-explain" id="' + uid + '-explainPanel">' +
            '<div class="calc-explain-head">How this estimate works</div>' +
            'This tool estimates how a one-time increase in federal debt (within a single year) would affect household borrowing costs. The calculation works in three steps. First, we model how the additional debt grows over a 10-year budget window: the government pays interest on the new borrowing, and that interest is itself financed by further borrowing, so the extra debt compounds over time. We calibrate the government\'s effective borrowing rate using CBO\'s baseline projections, reflecting the fact that federal borrowing costs adjust gradually as existing debt matures and is refinanced at current market rates. Second, we convert the average additional debt-to-GDP ratio over the window into an effect on 10-year Treasury yields using an elasticity of 2 basis points per percentage point of debt/GDP. Third, we translate the Treasury rate increase into higher consumer borrowing rates and compute the resulting change in monthly payments. These last two steps parallel the approach outlined in the companion post to this calculator. Our approach captures the direct effect of increased debt on Treasury rates, but does not model any rise in GDP from the spending itself nor broader macroeconomic feedback from inflation or monetary policy responses.' +
          '</div>';
      }
    });
  }

  function initChart(placeholder) {
    var uid   = 'tbl-calc-' + Math.random().toString(36).slice(2, 8);
    var theme = THEME;
    placeholder.id = uid;
    var style = document.createElement('style');
    style.textContent = buildCSS(uid, theme);
    document.head.appendChild(style);
    placeholder.innerHTML = buildHTML(uid);
    initInteractivity(uid);
  }

  var placeholder = document.createElement('div');
  if (_script && _script.parentNode) {
    _script.parentNode.insertBefore(placeholder, _script);
  } else {
    document.body.appendChild(placeholder);
  }
  initChart(placeholder);

}());
