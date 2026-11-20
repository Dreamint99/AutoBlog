/* Retention: Android A2HS soft prompt + desktop bookmark nudge + GA4 events.
   Fixed toasts only (no in-flow nodes, CLS 0). Non-blocking. */
(function (w, d) {
  var C = w.__RETENTION__ || {};
  function ls(k, v) {
    try {
      if (arguments.length > 1) localStorage.setItem(k, String(v));
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function track(name, params) {
    try {
      if (typeof w.gtag === "function") w.gtag("event", name, params || {});
    } catch (e) {}
  }
  function isAndroid() {
    return /Android/i.test(navigator.userAgent) && !/iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  function isDesktop() {
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return false;
    return !w.matchMedia || w.matchMedia("(min-width: 901px)").matches;
  }
  function standalone() {
    return (w.matchMedia && w.matchMedia("(display-mode: standalone)").matches) || !!navigator.standalone;
  }
  function preferNativeApp() {
    if (!C.hasNativeApp) return false;
    var seen = C.seenKeys || [];
    for (var i = 0; i < seen.length; i++) if (ls(seen[i])) return true;
    var dismiss = C.dismissKeys || [];
    for (var j = 0; j < dismiss.length; j++) {
      var until = Number(ls(dismiss[j]) || 0);
      if (until && until > Date.now()) return true;
    }
    /* App bar is the primary CTA on mobile Android when a native app exists. */
    if (isAndroid() && w.matchMedia && w.matchMedia("(max-width: 900px)").matches) return true;
    return false;
  }
  function ensureCss() {
    if (d.getElementById("ret-css")) return;
    var s = d.createElement("style");
    s.id = "ret-css";
    s.textContent =
      ".ret-toast{position:fixed;z-index:9998;right:16px;bottom:16px;max-width:min(360px,calc(100vw - 32px));" +
      "background:#111318;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 10px 28px rgba(0,0,0,.28);" +
      "font:14px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;gap:10px;align-items:flex-start;" +
      "pointer-events:auto}" +
      ".ret-toast[hidden]{display:none!important}" +
      ".ret-toast b{display:block;font-size:14.5px;margin:0 0 2px}" +
      ".ret-toast span{display:block;opacity:.9;font-size:13px}" +
      ".ret-toast .ret-actions{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}" +
      ".ret-toast button,.ret-toast .ret-go{border:0;border-radius:10px;padding:7px 12px;font:700 13px/1 inherit;cursor:pointer}" +
      ".ret-toast .ret-go{background:#fff;color:#111}" +
      ".ret-toast .ret-later{background:rgba(255,255,255,.16);color:#fff}" +
      ".ret-toast .ret-x{position:absolute;top:6px;right:8px;background:none;color:#fff;opacity:.7;padding:4px 6px;font-weight:500}";
    d.head.appendChild(s);
  }
  function toast(html, onReady) {
    ensureCss();
    var el = d.createElement("div");
    el.className = "ret-toast";
    el.setAttribute("role", "dialog");
    el.innerHTML = html;
    d.body.appendChild(el);
    if (onReady) onReady(el);
    return el;
  }

  var deferred = null;
  var pwaShown = false;
  function maybePwa() {
    if (pwaShown || !deferred || standalone()) return;
    if (!isAndroid()) return;
    if ((parseInt(ls("ret-pv") || "0", 10) || 0) < 2) return;
    if (Number(ls("ret-pwa-next") || 0) > Date.now()) return;
    if (preferNativeApp()) return;
    pwaShown = true;
    var title = C.pwaTitle || "Add to Home screen";
    var body = C.pwaBody || "Open this site faster, even when you're offline.";
    var add = C.installLabel || "Add";
    var later = C.laterLabel || "Not now";
    var el = toast(
      "<div><b></b><span></span><div class='ret-actions'><button type='button' class='ret-go'></button><button type='button' class='ret-later'></button></div></div><button type='button' class='ret-x' aria-label='Close'>×</button>",
      function (node) {
        node.querySelector("b").textContent = title;
        node.querySelector("span").textContent = body;
        node.querySelector(".ret-go").textContent = add;
        node.querySelector(".ret-later").textContent = later;
      }
    );
    function dismiss() {
      ls("ret-pwa-next", Date.now() + 14 * 864e5);
      el.remove();
    }
    el.querySelector(".ret-later").onclick = dismiss;
    el.querySelector(".ret-x").onclick = dismiss;
    el.querySelector(".ret-go").onclick = function () {
      var ev = deferred;
      deferred = null;
      el.remove();
      if (!ev || !ev.prompt) return;
      ev.prompt();
      if (ev.userChoice) ev.userChoice.then(function () {}).catch(function () {});
    };
    track("pwa_prompt_shown");
  }

  w.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    maybePwa();
  });
  w.addEventListener("appinstalled", function () {
    track("pwa_installed");
    ls("ret-pwa-next", Date.now() + 400 * 864e5);
    pwaShown = true;
    var t = d.querySelector(".ret-toast");
    if (t) t.remove();
  });

  if ("serviceWorker" in navigator) {
    w.addEventListener("load", function () {
      navigator.serviceWorker.register(C.sw || "/sw.js").catch(function () {});
    });
  }

  var pv = (parseInt(ls("ret-pv") || "0", 10) || 0) + 1;
  ls("ret-pv", pv);
  var visits = parseInt(ls("ret-visits") || "0", 10) || 0;
  try {
    if (!sessionStorage.getItem("ret-visit-sess")) {
      sessionStorage.setItem("ret-visit-sess", "1");
      visits += 1;
      ls("ret-visits", visits);
    }
  } catch (e) {
    if (!visits) {
      visits = 1;
      ls("ret-visits", visits);
    }
  }

  if (pv >= 2) maybePwa();

  if (
    isDesktop() &&
    visits >= 2 &&
    !standalone() &&
    !(Number(ls("ret-bm-next") || 0) > Date.now())
  ) {
    var bm = C.bookmarkText || "Bookmark this page for later · Ctrl+D / ⌘+D";
    var el = toast(
      "<div><b></b></div><button type='button' class='ret-x' aria-label='Close'>×</button>",
      function (node) {
        node.querySelector("b").textContent = bm;
      }
    );
    function closeBm() { el.remove(); }
    el.querySelector(".ret-x").onclick = closeBm;
    setTimeout(closeBm, 12000);
    ls("ret-bm-next", Date.now() + 30 * 864e5);
    track("bookmark_nudge_shown");
  }
})(window, document);
