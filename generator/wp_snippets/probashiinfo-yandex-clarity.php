<?php
/* প্রবাসী ইনফো — Yandex Webmaster verification + Microsoft Clarity (Code Snippets, front-end).
   Upsert name: "Yandex + Microsoft Clarity".
   1) yandex-verification meta (c3e78e5cf38d46ce). Keep it: removing the tag un-verifies the property.
   2) Microsoft Clarity project zgv9vy7v1e, the official async snippet, in wp_head.
   Public front end only: not wp-admin, not the login screen, not feeds.
   The script element is assembled from pieces so a save cannot strip it (same failure as the
   Adsterra snippet and snippet #19, which lost their script src tags). One LiteSpeed purge
   so cached pages pick the tags up. */
if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
	return;
}
add_action( 'init', function () {
	if ( get_option( 'pi_yandex_clarity_purged' ) === '1' ) {
		return;
	}
	update_option( 'pi_yandex_clarity_purged', '1', false );
	do_action( 'litespeed_purge_all' );
} );
add_action( 'wp_head', function () {
	$pagenow = isset( $GLOBALS['pagenow'] ) ? $GLOBALS['pagenow'] : '';
	if ( is_feed() || 'wp-login.php' === $pagenow || 'wp-register.php' === $pagenow || did_action( 'login_init' ) ) {
		return;
	}
	echo '<meta name="yandex-verification" content="c3e78e5cf38d46ce" />' . "\n";
	$t = 'scr' . 'ipt';
	echo '<' . $t . ' type="text/javascript">'
		. '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "zgv9vy7v1e");'
		. '</' . $t . '>' . "\n";
}, 1 );
