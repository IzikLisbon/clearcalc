/* Shared finance math for ClearCalc. Pure functions, no dependencies.
   All rates are entered as annual percentages (e.g. 6.5 for 6.5%). */

(function (global) {
  'use strict';

  function parseNum(v, fallback) {
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }

  function fmtMoney(n, opts) {
    opts = opts || {};
    var cur = opts.currency || '$';
    if (!isFinite(n)) return cur + '0';
    var neg = n < 0;
    n = Math.abs(n);
    var s = n.toLocaleString('en-US', { minimumFractionDigits: opts.cents === false ? 0 : 2, maximumFractionDigits: 2 });
    return (neg ? '-' : '') + cur + s;
  }

  // Monthly payment on an amortizing loan.
  function monthlyPayment(principal, annualRatePct, years) {
    var i = annualRatePct / 100 / 12;
    var n = Math.round(years * 12);
    if (n <= 0) return 0;
    if (i === 0) return principal / n;
    return principal * i / (1 - Math.pow(1 + i, -n));
  }

  // Full amortizing-loan summary.
  function loanSummary(principal, annualRatePct, years) {
    var n = Math.round(years * 12);
    var pmt = monthlyPayment(principal, annualRatePct, years);
    var total = pmt * n;
    return {
      monthly: pmt,
      months: n,
      totalPaid: total,
      totalInterest: total - principal
    };
  }

  // Future value with an initial deposit + recurring monthly contributions.
  // Monthly compounding; contributions made at month end.
  function compound(principal, annualRatePct, years, monthlyContribution) {
    var i = annualRatePct / 100 / 12;
    var n = Math.round(years * 12);
    var pmt = monthlyContribution || 0;
    var fv;
    if (i === 0) {
      fv = principal + pmt * n;
    } else {
      var growth = Math.pow(1 + i, n);
      fv = principal * growth + pmt * ((growth - 1) / i);
    }
    var contributed = principal + pmt * n;
    return {
      futureValue: fv,
      totalContributions: contributed,
      totalInterest: fv - contributed,
      months: n
    };
  }

  // Monthly contribution needed to hit a savings target.
  function savingsGoalMonthly(target, startingAmount, annualRatePct, years) {
    var i = annualRatePct / 100 / 12;
    var n = Math.round(years * 12);
    if (n <= 0) return 0;
    var start = startingAmount || 0;
    if (i === 0) return Math.max(0, (target - start) / n);
    var growth = Math.pow(1 + i, n);
    var needed = (target - start * growth) / ((growth - 1) / i);
    return Math.max(0, needed);
  }

  // Months to pay off a balance given a fixed monthly payment.
  // Returns neverPaysOff:true when the payment can't cover the monthly interest.
  function payoffMonths(balance, annualRatePct, monthlyPayment) {
    var i = annualRatePct / 100 / 12;
    var B = balance, P = monthlyPayment;
    if (P <= 0) return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity, neverPaysOff: true };
    if (i === 0) {
      var n0 = Math.ceil(B / P);
      return { months: n0, totalPaid: B, totalInterest: 0, neverPaysOff: false };
    }
    if (P <= B * i) return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity, neverPaysOff: true };
    var n = -Math.log(1 - (i * B) / P) / Math.log(1 + i);
    var totalPaid = P * n; // fractional n keeps total accurate (final payment is smaller)
    return {
      months: Math.ceil(n),
      totalPaid: totalPaid,
      totalInterest: totalPaid - B,
      neverPaysOff: false
    };
  }

  // Compare keeping a loan vs refinancing the remaining balance at a new rate/term.
  function refinanceCompare(balance, currentRatePct, currentRemainingYears, newRatePct, newYears) {
    var cur = loanSummary(balance, currentRatePct, currentRemainingYears);
    var neu = loanSummary(balance, newRatePct, newYears);
    return {
      currentMonthly: cur.monthly,
      newMonthly: neu.monthly,
      monthlySavings: cur.monthly - neu.monthly,
      currentTotalInterest: cur.totalInterest,
      newTotalInterest: neu.totalInterest,
      interestSavings: cur.totalInterest - neu.totalInterest
    };
  }

  global.Finance = {
    parseNum: parseNum,
    fmtMoney: fmtMoney,
    monthlyPayment: monthlyPayment,
    loanSummary: loanSummary,
    compound: compound,
    savingsGoalMonthly: savingsGoalMonthly,
    payoffMonths: payoffMonths,
    refinanceCompare: refinanceCompare
  };
})(window);
