// Generated apps load React/ReactDOM/Babel/Tailwind from a CDN via
// <script src="https://...">. Without a `crossorigin` attribute, the
// browser refuses to expose any detail for errors whose call stack passes
// through a cross-origin script — window.onerror just gets "Script error."
// with no message, no stack, nothing. Since nearly everything in these
// generated apps runs through React/Babel, that muting was making the
// fatal-error overlay below useless for the crashes it exists to diagnose.
// This adds crossorigin="anonymous" to external <script src> tags so real
// error detail survives; the CDNs used here (unpkg, cdn.tailwindcss.com)
// already send Access-Control-Allow-Origin: * , so this doesn't break
// loading, it just stops the browser from hiding what went wrong.
export function addCrossOriginToExternalScripts(html: string): string {
  return html.replace(
    /<script([^>]*\ssrc=["']https?:\/\/[^"']+["'][^>]*)>/gi,
    (match, attrs: string) => (/\bcrossorigin\b/i.test(attrs) ? match : `<script${attrs} crossorigin="anonymous">`)
  );
}

// The preview iframe is sandboxed with only `allow-scripts` (no
// `allow-same-origin`) so generated code can't reach the parent page's
// cookies/localStorage. That gives the srcdoc document an opaque origin,
// which makes localStorage/sessionStorage/document.cookie/indexedDB throw
// on access instead of just being empty — and AI-generated apps very often
// reach for one of these to "persist" data. Without a shim, any such app
// crashes before it ever renders. This patches in in-memory replacements
// (scoped to that one preview, never shared with the real site or across
// reloads) only when the real API is inaccessible, so generated code that
// uses them just works instead of crashing.
//
// It also catches any *other* uncaught error during initial boot — one we
// haven't specifically shimmed — and renders it visibly instead of leaving
// a silent blank iframe, so a failure is at least diagnosable. It backs off
// once the app has visibly rendered something, so a later, unrelated error
// in a working app doesn't get papered over.
//
// Prepended only to the iframe's srcDoc, never to the code shown in the
// Code tab / Copy code — that stays exactly what the model produced.
export const PREVIEW_STORAGE_SHIM = `<script>
(function() {
  function makeMemoryStorage() {
    var store = {};
    return {
      getItem: function(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function(k, v) { store[k] = String(v); },
      removeItem: function(k) { delete store[k]; },
      clear: function() { store = {}; },
      key: function(i) { return Object.keys(store)[i] ?? null; },
      get length() { return Object.keys(store).length; },
    };
  }
  try { window.localStorage.getItem('__probe'); } catch (e) {
    Object.defineProperty(window, 'localStorage', { value: makeMemoryStorage(), configurable: true });
  }
  try { window.sessionStorage.getItem('__probe'); } catch (e) {
    Object.defineProperty(window, 'sessionStorage', { value: makeMemoryStorage(), configurable: true });
  }
  try { document.cookie; } catch (e) {
    var cookieJar = '';
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: function() { return cookieJar; },
      set: function(v) {
        var pair = String(v).split(';')[0];
        var name = pair.split('=')[0].trim();
        var rest = cookieJar.split('; ').filter(Boolean).filter(function(c) { return c.split('=')[0].trim() !== name; });
        rest.push(pair);
        cookieJar = rest.join('; ');
      },
    });
  }
  try {
    var probe = window.indexedDB.open('__probe');
    probe.onerror = function(ev) { ev.preventDefault && ev.preventDefault(); };
  } catch (e) {
    function fakeIDBRequest() {
      var req = {};
      setTimeout(function() {
        if (typeof req.onerror === 'function') req.onerror({ target: req });
      }, 0);
      return req;
    }
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: { open: fakeIDBRequest, deleteDatabase: fakeIDBRequest },
    });
  }

  function bodyHasRendered() {
    return !!(document.body && document.body.innerText && document.body.innerText.trim().length > 0);
  }
  function showFatalError(message) {
    if (bodyHasRendered() || document.getElementById('__vp_fatal_error__')) return;
    var el = document.createElement('div');
    el.id = '__vp_fatal_error__';
    el.style.cssText = 'position:fixed;inset:0;background:#0a0a0f;color:#f87171;font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.6;padding:24px;white-space:pre-wrap;overflow:auto;z-index:2147483647;';
    el.textContent = 'This app hit an error while starting up:\\n\\n' + message;
    document.documentElement.appendChild(el);
  }
  window.addEventListener('error', function(e) {
    showFatalError((e.error && (e.error.stack || e.error.message)) || e.message || String(e));
  });
  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    showFatalError('Unhandled promise rejection: ' + (reason && reason.message ? reason.message : String(reason)));
  });
})();
</script>`;
