<?php
/* প্রবাসী ইনফো — Adsterra ads (front end only).
   Popunder (one per page view) in wp_head; Native Banner printed in wp_footer and moved just above
   the page footer so it sits after the article instead of below the footer. Works with the v3 app
   (#14), which keeps wp_head()/wp_footer(). Logged-in editors don't see ads, so their clicks and
   views don't count as invalid traffic. */
if ( ! function_exists( 'pi_ads_on' ) ) {
	function pi_ads_on() {
		return ! is_admin() && ! is_user_logged_in() && ! is_feed();
	}
}

add_action( 'wp_head', function () {
	if ( ! pi_ads_on() ) return;
	echo '<script async src="https://pl31806394.profitableratecpmnetwork.com/17/7a/d8/177ad8bbea12383020e7a27806a29fdb.js"></script>' . "\n";
}, 99 );

add_action( 'wp_footer', function () {
	if ( ! pi_ads_on() ) return;
	?>
<div id="pi-ad-native" style="max-width:1100px;margin:24px auto;padding:0 16px;text-align:center;min-height:90px">
<script async data-cfasync="false" src="https://pl31806395.profitableratecpmnetwork.com/c1c642ad08e0f9533ac6bfecd28690c1/invoke.js"></script>
<div id="container-c1c642ad08e0f9533ac6bfecd28690c1"></div>
</div>
<script>(function(){var a=document.getElementById('pi-ad-native'),f=document.querySelector('footer');if(a&&f&&f.parentNode)f.parentNode.insertBefore(a,f);})();</script>
	<?php
}, 5 );
