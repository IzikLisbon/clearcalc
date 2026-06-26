/* ClearCalc analytics — cookieless, first-party, no SDK, no PII.
 *
 * Sends a single page view to Application Insights (clearcalc-insights) on load,
 * and exposes window.caTrack(name, props) for custom events. When the script is
 * running inside an iframe (i.e. one of our embeddable widgets on a third-party
 * site) it sends an `embed_widget_loaded` event with the parent page instead of
 * a page view, so site traffic and embed distribution stay cleanly separated.
 *
 * No cookies are set and no personal data is collected (no user/session id),
 * so no consent banner is required. The instrumentation key below is a public
 * ingestion key by design (like a GA measurement id) and is isolated to a
 * dedicated resource, so exposing it in page source is safe.
 */
(function () {
  var IKEY = '312b7920-49d3-45b3-ae78-9d1fad91c42d';
  var TRACK = 'https://westeurope-5.in.applicationinsights.azure.com/v2/track';
  var ROLE = 'clearcalc-web';
  var NDASH = IKEY.replace(/-/g, '');

  function send(itemType, baseType, baseData) {
    try {
      var envelope = {
        name: 'Microsoft.ApplicationInsights.' + NDASH + '.' + itemType,
        time: new Date().toISOString(),
        iKey: IKEY,
        tags: {
          'ai.cloud.role': ROLE,
          'ai.operation.name': location.pathname,
          'ai.internal.sdkVersion': 'clearcalc-beacon:1.0'
        },
        data: { baseType: baseType, baseData: baseData }
      };
      var body = JSON.stringify(envelope);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(TRACK, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(TRACK, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
      }
    } catch (e) { /* analytics must never break the page */ }
  }

  window.caTrack = function (name, props) {
    send('Event', 'EventData', { ver: 2, name: String(name), properties: props || {} });
  };

  var inIframe = window.top !== window.self;
  if (inIframe) {
    var widget = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    window.caTrack('embed_widget_loaded', { widget: widget, parent: document.referrer || '(unknown)' });
  } else {
    send('Pageview', 'PageviewData', {
      ver: 2,
      name: document.title || location.pathname,
      url: location.href,
      duration: '00:00:00',
      properties: { referrer: document.referrer || '(direct)', host: location.host }
    });
  }
})();
