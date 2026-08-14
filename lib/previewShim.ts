// The preview iframe is sandboxed with only `allow-scripts` (no
// `allow-same-origin`) so generated code can't reach the parent page's
// cookies/localStorage. That gives the srcdoc document an opaque origin,
// which makes window.localStorage/sessionStorage throw a SecurityError on
// access instead of just being empty — and AI-generated apps very often
// reach for localStorage to "persist" data. Without this, any such app
// crashes before it ever renders. This shim swaps in an in-memory
// Storage-like object (scoped to that one preview, never shared with the
// real site or across reloads) only when the real one is inaccessible, so
// generated code that calls localStorage just works instead of crashing.
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
})();
</script>`;
