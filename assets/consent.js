/* ClearCalc cookie consent — minimal + region-aware.
 *
 * Google Consent Mode v2: every page sets consent DEFAULT to denied (in <head>),
 * so no ad/analytics cookies fire until there is a choice. This script decides
 * whether a prompt is even needed:
 *   - Opt-in regions (EEA / UK / Switzerland, detected by timezone): show a small,
 *     unobtrusive corner prompt; consent stays denied until the visitor accepts.
 *   - Everywhere else (e.g. the US, an opt-out regime): no prompt; consent is
 *     granted by default and can be changed via the footer "Cookie settings" link.
 * Our first-party analytics is cookieless and runs regardless. The choice (when
 * made) is stored in localStorage, not a cookie.
 */
(function () {
  var KEY = 'cc-consent';
  var GRANT = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };

  function gtag() {
    if (typeof window.gtag === 'function') { window.gtag.apply(null, arguments); }
    else { (window.dataLayer = window.dataLayer || []).push(arguments); }
  }
  function apply(choice) { if (choice === 'granted') gtag('consent', 'update', GRANT); }
  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // Opt-in consent is required in the EEA, the UK and Switzerland. Approximated
  // from the browser timezone (Europe/*) so no network call or backend is needed;
  // if detection fails we err on the safe side and ask for consent.
  function consentRequired() {
    try {
      var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
      return /^Europe\//.test(tz);
    } catch (e) { return true; }
  }

  function injectStyles() {
    if (document.getElementById('cc-style')) return;
    var css =
      '#cc-banner{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:330px;background:#fff;color:#0f1b2d;' +
      'border:1px solid #e6ecf3;border-radius:12px;box-shadow:0 8px 28px rgba(15,27,45,.16);' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'font-size:12.5px;line-height:1.5;animation:ccin .22s ease}' +
      '@keyframes ccin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '#cc-banner .cc-inner{padding:11px 13px}' +
      '#cc-banner .cc-text{margin:0 0 8px;color:#3a4a5f}' +
      '#cc-banner .cc-text a{color:#0a6bd1;text-decoration:underline}' +
      '#cc-banner .cc-btns{display:flex;gap:6px;align-items:center}' +
      '#cc-banner .cc-btn{border:0;border-radius:7px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer}' +
      '#cc-banner .cc-accept{background:#0b7a5b;color:#fff}' +
      '#cc-banner .cc-accept:hover{background:#0a6b50}' +
      '#cc-banner .cc-decline{background:transparent;color:#7a8aa0;text-decoration:underline;padding:6px 6px}' +
      '@media(max-width:420px){#cc-banner{left:10px;right:10px;max-width:none}}';
    var s = document.createElement('style');
    s.id = 'cc-style';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function removeBanner() { var b = document.getElementById('cc-banner'); if (b && b.parentNode) b.parentNode.removeChild(b); }
  function choose(v) { set(v); apply(v); removeBanner(); }

  function showBanner() {
    if (document.getElementById('cc-banner') || !document.body) return;
    injectStyles();
    var d = document.createElement('div');
    d.id = 'cc-banner';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Cookie consent');
    d.innerHTML =
      '<div class="cc-inner">' +
        '<p class="cc-text">We use cookies for ads, plus cookieless analytics. <a href="privacy.html">Learn more</a>.</p>' +
        '<div class="cc-btns">' +
          '<button type="button" class="cc-btn cc-accept" id="cc-accept">Accept</button>' +
          '<button type="button" class="cc-btn cc-decline" id="cc-decline">Decline</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    document.getElementById('cc-accept').addEventListener('click', function () { choose('granted'); });
    document.getElementById('cc-decline').addEventListener('click', function () { choose('denied'); });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // Decide what to do on this load.
  var stored = get();
  if (stored === 'granted' || stored === 'denied') {
    apply(stored);                 // honor a prior explicit choice
  } else if (consentRequired()) {
    ready(showBanner);             // opt-in region: ask (default stays denied)
  } else {
    apply('granted');              // opt-out region: allow silently, no prompt
  }

  // Footer "Cookie settings" link re-opens the banner; expose a programmatic hook.
  ready(function () {
    var link = document.getElementById('cookie-settings');
    if (link) link.addEventListener('click', function (e) { e.preventDefault(); showBanner(); });
  });
  window.openCookieSettings = showBanner;
})();
