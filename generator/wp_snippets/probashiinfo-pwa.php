<?php
/**
 * PWA + retention on probashiinfo.com (Code Snippets, front-end).
 * Serves /manifest.webmanifest, /sw.js, /offline.html, /pwa-icon-512.png
 * and a non-blocking prompt script (Android A2HS after 2nd pageview if the
 * native app bar was not shown/dismissed; desktop bookmark nudge on 2nd visit,
 * once per 30 days). GA4: pwa_prompt_shown, pwa_installed, bookmark_nudge_shown.
 * Rollback = deactivate this snippet (rewrites stay harmless).
 */
if ( ! defined( 'ABSPATH' ) || defined( 'PI_PWA_LOADED' ) ) { return; }
define( 'PI_PWA_LOADED', 1 );
define( 'PI_PWA_VER', '1' );
define( 'PI_PWA_THEME', '#E11D48' );
define( 'PI_PWA_ICON192', 'https://probashiinfo.com/wp-content/uploads/2026/11/pi-favicon-192.png' );
define( 'PI_PWA_ICON512_B64', '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' );
define( 'PI_PWA_ICON180', 'https://probashiinfo.com/wp-content/uploads/2026/11/pi-favicon-180.png' );

add_filter( 'query_vars', function ( $v ) {
	$v[] = 'pi_pwa';
	return $v;
} );

add_action( 'init', function () {
	add_rewrite_rule( '^manifest\.webmanifest$', 'index.php?pi_pwa=manifest', 'top' );
	add_rewrite_rule( '^sw\.js$', 'index.php?pi_pwa=sw', 'top' );
	add_rewrite_rule( '^offline\.html$', 'index.php?pi_pwa=offline', 'top' );
	add_rewrite_rule( '^pwa-icon-512\.png$', 'index.php?pi_pwa=icon512', 'top' );
	if ( get_option( 'pi_pwa_rewrites' ) !== PI_PWA_VER ) {
		flush_rewrite_rules( false );
		update_option( 'pi_pwa_rewrites', PI_PWA_VER, false );
		do_action( 'litespeed_purge_all' );
	}
} );

add_action( 'template_redirect', function () {
	$t = get_query_var( 'pi_pwa' );
	if ( ! $t ) { return; }
	do_action( 'litespeed_control_set_nocache', 'pi pwa asset' );
	if ( $t === 'manifest' ) {
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		header( 'Cache-Control: public, max-age=86400' );
		echo wp_json_encode( array(
			'id' => '/',
			'name' => 'Probashi Info',
			'short_name' => 'Probashi Info',
			'description' => 'প্রবাসী ইনফো',
			'start_url' => '/',
			'scope' => '/',
			'display' => 'standalone',
			'lang' => 'bn',
			'theme_color' => PI_PWA_THEME,
			'background_color' => '#ffffff',
			'icons' => array(
				array( 'src' => PI_PWA_ICON192, 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any' ),
				array( 'src' => home_url( '/pwa-icon-512.png' ), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any' ),
				array( 'src' => PI_PWA_ICON192, 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'maskable' ),
				array( 'src' => home_url( '/pwa-icon-512.png' ), 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable' ),
			),
		), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
		exit;
	}
	if ( $t === 'sw' ) {
		header( 'Content-Type: application/javascript; charset=utf-8' );
		header( 'Cache-Control: public, max-age=3600' );
		header( 'Service-Worker-Allowed: /' );
		echo <<<'JS'
const SHELL = "ret-shell-v1";
const OFFLINE = "/offline.html";
const BLOCK = /googletagmanager|google-analytics|gtag\/js|doubleclick|googlesyndication|googleadservices|adsense|adsterra|profitableratecpm|facebook\.net|connect\.facebook|clarity\.ms|ahrefs|hotjar|scorecardresearch|amazon-adsystem|ezoic/i;
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll([OFFLINE])).then(() => self.skipWaiting()).catch(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (BLOCK.test(url.href) || url.origin !== self.location.origin) return;
  if (/\b(api\/|wp-admin|wp-json|cdn-cgi)\b/.test(url.href)) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
  }
});
JS;
		exit;
	}
	if ( $t === 'offline' ) {
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'Cache-Control: public, max-age=86400' );
		echo '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>অফলাইন</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font:16px/1.5 "Hind Siliguri",system-ui,sans-serif;background:#f5f5f5;color:#111;padding:24px;text-align:center}main{max-width:24rem}h1{font-size:1.25rem;margin:0 0 8px}p{margin:0;color:#444}</style></head><body><main><h1>আপনি অফলাইন</h1><p>ইন্টারনেট সংযোগ দিয়ে আবার চেষ্টা করুন।</p></main></body></html>';
		exit;
	}
	if ( $t === 'icon512' ) {
		$b64 = PI_PWA_ICON512_B64;
		if ( $b64 ) {
			header( 'Content-Type: image/png' );
			header( 'Cache-Control: public, max-age=2592000' );
			echo base64_decode( $b64 );
			exit;
		}
		wp_redirect( PI_PWA_ICON192, 302 );
		exit;
	}
} );

add_action( 'wp_head', function () {
	if ( is_admin() ) { return; }
	echo '<link rel="manifest" href="' . esc_url( home_url( '/manifest.webmanifest' ) ) . '">' . "\n";
}, 8 );

add_action( 'wp_footer', function () {
	if ( is_admin() || is_user_logged_in() ) { return; }
	echo "<script>window.__RETENTION__={hasNativeApp:true,seenKeys:['pba-dock-seen'],dismissKeys:['pba-dock-next'],sw:'/sw.js',pwaTitle:'হোম স্ক্রিনে যোগ করুন',pwaBody:'প্রবাসী ইনফো এক ট্যাপে খুলুন — অ্যাপ না থাকলেও।',installLabel:'যোগ করুন',laterLabel:'এখন নয়',bookmarkText:'পরে দেখতে বুকমার্ক করুন · Ctrl+D / ⌘+D'};</script>\n";
	echo "<script>\n";
	echo <<<'RETENTION_JS'
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

  var pv = parseInt(ls("ret-pv") || "0", 10) || 0;
  if (!w.__RET_PV_DONE__) {
    w.__RET_PV_DONE__ = true;
    pv += 1;
    ls("ret-pv", pv);
  }
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

RETENTION_JS;
	echo "\n</script>\n";
}, 40 );
