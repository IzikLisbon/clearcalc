/* ClearCalc affiliate / lead-gen offers.

   This is the monetization layer for the site. Each calculator declares the
   offer most relevant to its intent with a data-offer attribute, e.g.
     <div class="offer" data-offer="refinance"></div>
   and this script fills it in.

   HOW MONEY IS MADE: high-intent finance offers (refinance, auto, debt,
   investing, savings) pay a referral / lead commission. The calculator is the
   hook; the offer is the transaction. This survives "zero-click" AI answers
   because the value is the referral, not an ad impression.

   TO GO LIVE: replace each `url: '#'` below with the real affiliate / partner
   link once that account is approved, then redeploy. Until a real URL is set,
   the box is NOT rendered (no dead buttons shown to visitors). The moment a
   real https link is present, the box appears site-wide with a sponsored,
   nofollow link and an FTC disclosure. */

(function (global) {
  'use strict';

  var OFFERS = {
    mortgage:  { eyebrow: 'Sponsored', headline: 'Compare mortgage rates', sub: 'See personalized home-loan offers from multiple lenders in a few minutes.', cta: 'Compare rates', url: '#' },
    refinance: { eyebrow: 'Sponsored', headline: 'Compare refinance rates', sub: 'Lower your rate or payment by comparing refinance offers from top lenders.', cta: 'Compare rates', url: '#' },
    auto:      { eyebrow: 'Sponsored', headline: 'Refinance your car loan', sub: 'Cut your monthly car payment by comparing auto-refinance offers in minutes.', cta: 'See auto offers', url: '#' },
    debt:      { eyebrow: 'Sponsored', headline: 'Consolidate your debt', sub: 'One lower-rate personal loan can slash the interest you pay on credit cards.', cta: 'Compare loans', url: '#' },
    invest:    { eyebrow: 'Sponsored', headline: 'Put your plan to work', sub: 'Compare low-cost brokerages and robo-advisors to start investing today.', cta: 'Compare brokers', url: '#' },
    savings:   { eyebrow: 'Sponsored', headline: 'Earn more on your savings', sub: 'High-yield savings accounts pay many times the national average rate.', cta: 'Compare HYSAs', url: '#' }
  };

  var DISCLOSURE = 'Sponsored. ClearCalc may earn a commission if you take an offer, at no cost to you.';

  function isLive(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  function fill(el) {
    var key = el.getAttribute('data-offer');
    var o = OFFERS[key];
    if (!o || !isLive(o.url)) {
      el.style.display = 'none'; // no real partner link yet → show nothing
      return;
    }
    el.innerHTML =
      '<div class="eyebrow">' + o.eyebrow + '</div>' +
      '<h3>' + o.headline + '</h3>' +
      '<p>' + o.sub + '</p>' +
      '<a class="btn" href="' + o.url + '" target="_blank" rel="sponsored nofollow noopener">' + o.cta + '</a>' +
      '<div class="disc">' + DISCLOSURE + '</div>';
    el.style.display = '';
  }

  function renderAll() {
    var nodes = document.querySelectorAll('[data-offer]');
    for (var i = 0; i < nodes.length; i++) fill(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }

  global.Offers = { OFFERS: OFFERS, renderAll: renderAll };
})(window);
