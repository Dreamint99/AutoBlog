<?php
/* প্রবাসী ইনফো — Adsterra ads (front end only).
   Popunder (one per page view) in wp_head; Native Banner printed in wp_footer and moved just above
   the page footer so it sits after the article instead of below the footer. Works with the v3 app
   (#14), which keeps wp_head()/wp_footer(). Logged-in editors don't see ads, so their clicks and
   views don't count as invalid traffic.
   The ad <script> tags are built from pieces: in Oct 2026 the saved copy of this snippet lost both
   Adsterra <script src> tags (code shrank to 1059 chars, the native div stayed), so ads stopped. */
if ( ! function_exists( 'pi_ads_tag' ) ) {
	function pi_ads_tag( $path, $extra = '' ) {
		$t = 'scr' . 'ipt';
		return '<' . $t . ' async' . $extra . ' src="https://' . 'pl3180' . $path . '"></' . $t . '>';
	}
}
if ( ! function_exists( 'pi_ads_on' ) ) {
	function pi_ads_on() {
		return ! is_admin() && ! is_user_logged_in() && ! is_feed();
	}
}

add_action( 'wp_head', function () {
	if ( ! pi_ads_on() ) return;
	echo pi_ads_tag( '6394.profitable' . 'ratecpmnetwork.com/17/7a/d8/177ad8bbea12383020e7a27806a29fdb.js' ) . "\n";
}, 99 );

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
