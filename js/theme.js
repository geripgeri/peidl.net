// Blocking script in <head> so the theme lands on <html> before first paint.
// main.js cannot do this because it is deferred. The CSP set at the Cloudflare
// edge is script-src 'self', so this cannot be an inline block either.
(function () {
  var t = null;
  try { t = localStorage.getItem('peidl-theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = t;
})();
