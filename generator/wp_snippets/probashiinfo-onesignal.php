<?php
/**
 * OneSignal web push (SDK v16) for probashiinfo.com — Code Snippets, front-end.
 * Serves /push/onesignal/OneSignalSDKWorker.js under a dedicated scope so it
 * does not fight the PWA service worker at /. Custom Code init; auto slidedown
 * is off. Prompt only on the 2nd+ pageview when the app bar / PWA toast is not
 * showing. Rollback = deactivate this snippet.
 */
if ( ! defined( 'ABSPATH' ) || defined( 'PI_OS_LOADED' ) ) { return; }
define( 'PI_OS_LOADED', 1 );
define( 'PI_OS_VER', '1' );
define( 'PI_OS_APP_ID', '80b950a4-5274-4af8-9191-edf66f0a0f21' );

add_filter( 'query_vars', function ( $v ) {
	$v[] = 'pi_os';
	return $v;
} );

add_action( 'init', function () {
	add_rewrite_rule( '^push/onesignal/OneSignalSDKWorker\.js$', 'index.php?pi_os=sw', 'top' );
	if ( get_option( 'pi_os_rewrites' ) !== PI_OS_VER ) {
		flush_rewrite_rules( false );
		update_option( 'pi_os_rewrites', PI_OS_VER, false );
		do_action( 'litespeed_purge_all' );
	}
} );

add_action( 'template_redirect', function () {
	if ( get_query_var( 'pi_os' ) !== 'sw' ) { return; }
	do_action( 'litespeed_control_set_nocache', 'pi onesignal sw' );
	header( 'Content-Type: application/javascript; charset=utf-8' );
	header( 'Cache-Control: public, max-age=3600' );
	header( 'Service-Worker-Allowed: /push/onesignal/' );
	echo "importScripts(\"https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js\");\n";
	exit;
} );

add_action( 'wp_footer', function () {
	if ( is_admin() || is_user_logged_in() ) { return; }
	echo "<script>window.__ONESIGNAL_CFG__={appId:'" . esc_js( PI_OS_APP_ID ) . "',hasNativeApp:true,dismissKeys:['pba-dock-next'],serviceWorkerPath:'push/onesignal/OneSignalSDKWorker.js',serviceWorkerScope:'/push/onesignal/'};</script>\n";
	echo "<script>\n";
	echo <<<'ONESIGNAL_JS'
/* OneSignal Web SDK v16 — Custom Code init.
   Auto slidedown is off. We prompt only on the 2nd+ pageview, not on the
   same view as the app bar or PWA toast, and we respect dismiss.
   CLS 0: OneSignal slidedown is position:fixed; no in-flow nodes. */
(function (w, d) {
  var C = w.__ONESIGNAL_CFG__ || {};
  if (!C.appId) return;

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
      var g = w.gtag;
      if (typeof g === "function") g("event", name, params || {});
    } catch (e) {}
  }
  function bumpPv() {
    if (w.__RET_PV_DONE__) return parseInt(ls("ret-pv") || "0", 10) || 0;
    w.__RET_PV_DONE__ = true;
    var n = (parseInt(ls("ret-pv") || "0", 10) || 0) + 1;
    ls("ret-pv", n);
    return n;
  }
  function pv() {
    return parseInt(ls("ret-pv") || "0", 10) || 0;
  }
  function dismissed() {
    return Number(ls("ret-push-next") || 0) > Date.now();
  }
  function markDismissed() {
    ls("ret-push-next", Date.now() + 14 * 864e5);
  }
  function appBarVisible() {
    var nodes = d.querySelectorAll(
      ".nm-appbar, .pba-dock, .aiu-dock, #pba-dock, [class*='appbar-dock']"
    );
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.hidden) continue;
      var st = w.getComputedStyle ? w.getComputedStyle(el) : null;
      if (st && (st.display === "none" || st.visibility === "hidden")) continue;
      return true;
    }
    return false;
  }
  function pwaToastVisible() {
    return !!d.querySelector(".ret-toast");
  }
  function appBarMayAppear() {
    /* Sites with a native app bar: if the bar is still eligible this visit,
       it can appear after scroll / 20s — skip push on this pageview. */
    if (!C.hasNativeApp) return false;
    if (w.matchMedia && !w.matchMedia("(max-width: 900px)").matches) return false;
    var dismissKeys = C.dismissKeys || [];
    for (var i = 0; i < dismissKeys.length; i++) {
      if (Number(ls(dismissKeys[i]) || 0) > Date.now()) return false;
    }
    return true;
  }
  function conflict() {
    return appBarVisible() || pwaToastVisible() || appBarMayAppear();
  }
  function readyToPrompt() {
    if (dismissed()) return false;
    if (pv() < 2) return false;
    if (conflict()) return false;
    return true;
  }

  /* Do not even init on the first pageview so a Typical Site dashboard
     auto-prompt (1 PV / 10s) cannot fire before our rules allow it. */
  bumpPv();
  if (pv() < 2) return;

  var s = d.createElement("script");
  s.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  s.defer = true;
  s.async = true;
  d.head.appendChild(s);

  w.OneSignalDeferred = w.OneSignalDeferred || [];
  w.OneSignalDeferred.push(async function (OneSignal) {
    var initOpts = {
      appId: C.appId,
      autoResubscribe: true,
      welcomeNotification: { disable: true },
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          prompts: [{ type: "push", autoPrompt: false }],
        },
      },
    };
    if (C.serviceWorkerPath) {
      initOpts.serviceWorkerPath = C.serviceWorkerPath;
      initOpts.serviceWorkerParam = { scope: C.serviceWorkerScope || "/push/onesignal/" };
    }
    await OneSignal.init(initOpts);

    function onShown() {
      track("push_prompt_shown");
    }
    function onSubChange(ev) {
      var cur = ev && ev.current ? ev.current : ev;
      if (cur && cur.optedIn) track("push_subscribed");
    }
    try {
      OneSignal.Slidedown.addEventListener("slidedownShown", onShown);
    } catch (e) {}
    try {
      OneSignal.User.PushSubscription.addEventListener("change", onSubChange);
    } catch (e) {}
    try {
      OneSignal.Notifications.addEventListener("permissionChange", function (ok) {
        if (ok) track("push_subscribed");
      });
    } catch (e) {}

    function tryPrompt() {
      if (!readyToPrompt()) return;
      if (OneSignal.User && OneSignal.User.PushSubscription && OneSignal.User.PushSubscription.optedIn) return;
      if (OneSignal.Notifications && OneSignal.Notifications.permission === "granted") return;
      if (OneSignal.Notifications && OneSignal.Notifications.permission === "denied") {
        markDismissed();
        return;
      }
      try {
        if (OneSignal.Notifications && OneSignal.Notifications.isPushSupported && !OneSignal.Notifications.isPushSupported()) return;
      } catch (e) {}
      OneSignal.Slidedown.promptPush().then(function () {}).catch(function () {});
    }

    /* If a slidedown is closed/dismissed, remember for 14 days. */
    d.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest("#onesignal-slidedown-cancel-button, .onesignal-slidedown-button.secondary, #onesignal-slidedown-dialog button")) {
        var label = (t.textContent || "").toLowerCase();
        if (/cancel|no thanks|not now|later|বন্ধ|না/.test(label) || t.id === "onesignal-slidedown-cancel-button") {
          markDismissed();
        }
      }
    }, true);

    if (readyToPrompt()) {
      tryPrompt();
    } else if (pv() >= 2 && conflict()) {
      /* App bar / PWA may clear later on this view — do not prompt this pageview. */
    }
  });
})(window, document);

ONESIGNAL_JS;
	echo "\n</script>\n";
}, 50 );
