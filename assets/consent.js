/* ClearCalc cookie consent — lightweight, no dependencies, accessible.
 *
 * Works with Google Consent Mode v2: every page sets consent DEFAULT to denied
 * (in the <head>), so ads/analytics storage is off until the visitor accepts.
 * This banner records the choice in localStorage (not a cookie) and, on accept,
 * calls gtag('consent','update', ...granted). Our first-party analytics is
 * cookieless and runs regardless (legitimate interest, no cookies).
 *
 * The footer "Cookie settings" link (id="cookie-settings") re-opens the banner.
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

  function injectStyles() {
    if (document.getElementById('cc-style')) return;
    var css =
      '#cc-banner{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#0f1b2d;color:#eaf2fb;box-shadow:0 -2px 16px rgba(0,0,0,.25)}' +
      '#cc-banner .cc-inner{max-width:1100px;margin:0 auto;padding:14px 18px;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}' +
      '#cc-banner .cc-text{margin:0;font-size:13.5px;line-height:1.5;flex:1 1 320px}' +
      '#cc-banner .cc-text a{color:#7fd4b8;text-decoration:underline}' +
      '#cc-banner .cc-btns{display:flex;gap:10px;flex:0 0 auto}' +
      '#cc-banner .cc-btn{border:0;border-radius:8px;padding:9px 18px;font-size:14px;font-weight:700;cursor:pointer}' +
      '#cc-banner .cc-accept{background:#0b7a5b;color:#fff}' +
      '#cc-banner .cc-accept:hover{background:#0a6b50}' +
      '#cc-banner .cc-reject{background:transparent;color:#cdd9e6;border:1px solid #3a4a5f}' +
      '#cc-banner .cc-reject:hover{background:rgba(255,255,255,.06)}';
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
        '<p class="cc-text">We use privacy-friendly, cookieless analytics, and (with your consent) advertising cookies to keep ClearCalc free. ' +
        'See our <a href="privacy.html">Privacy Policy</a>.</p>' +
        '<div class="cc-btns">' +
          '<button type="button" class="cc-btn cc-reject" id="cc-reject">Reject</button>' +
          '<button type="button" class="cc-btn cc-accept" id="cc-accept">Accept</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);
    document.getElementById('cc-accept').addEventListener('click', function () { choose('granted'); });
    document.getElementById('cc-reject').addEventListener('click', function () { choose('denied'); });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  // Re-apply a prior choice; otherwise prompt.
  var stored = get();
  if (stored === 'granted' || stored === 'denied') { apply(stored); }
  else { ready(showBanner); }

  // Footer "Cookie settings" link re-opens the banner; expose a programmatic hook.
  ready(function () {
    var link = document.getElementById('cookie-settings');
    if (link) link.addEventListener('click', function (e) { e.preventDefault(); showBanner(); });
  });
  window.openCookieSettings = showBanner;
})();
