<?php
/* প্রবাসী ইনফো — Adsterra ads (front end only).
   Native Banner printed in wp_footer and moved just above the page footer so it sits after the
   article instead of below the footer. The popunder that used to load in wp_head is off: it fired
   on the first click (including app download / internal clicks) and stacked with the old full-screen
   app popup, Ezoic, and AdSense auto ads. Native Banner stays. Logged-in editors don't see ads. */
if ( ! function_exists( 'pi_ads_tag' ) ) {
	function pi_ads_tag( $path, $extra = '' ) {
		$t = 'scr' . 'ipt';
		return '<' . $t . ' async' . $extra . ' src="https://' . 'pl3180' . $path . '"></' . $t . '>';
	}
}
// one LiteSpeed purge per ad-code version, so cached pages pick the ads up (same idea as #14 / BMET)
add_action( 'init', function () {
	if ( get_option( 'pi_ads_purged' ) !== '3' ) {
		update_option( 'pi_ads_purged', '3', false );
		do_action( 'litespeed_purge_all' );
	}
} );
if ( ! function_exists( 'pi_ads_on' ) ) {
	function pi_ads_on() {
		return ! is_admin() && ! is_user_logged_in() && ! is_feed();
	}
}

add_action( 'wp_footer', function () {
	if ( ! pi_ads_on() ) return;
	?>
<div id="pi-ad-native" style="max-width:1100px;margin:24px auto;padding:0 16px;text-align:center;min-height:90px">
<?php echo pi_ads_tag( '6395.profitable' . 'ratecpmnetwork.com/c1c642ad08e0f9533ac6bfecd28690c1/invoke.js', ' data-cfasync="false"' ); ?>
<div id="container-c1c642ad08e0f9533ac6bfecd28690c1"></div>
</div>
<script>(function(){var a=document.getElementById('pi-ad-native'),f=document.querySelector('footer');if(a&&f&&f.parentNode)f.parentNode.insertBefore(a,f);})();</script>
	<?php
}, 5 );
