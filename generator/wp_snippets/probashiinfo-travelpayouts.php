<?php
/* প্রবাসী ইনফো — Travelpayouts Drive (affiliate offers: flights, hotels, eSIM, insurance).
   Account: Travelpayouts marker 601438, project https://probashiinfo.com. Drive reads each page
   and places matching travel offers by itself. Front end only; not for logged-in editors or feeds.
   snippet #19 once lost its <script src> tags. */
add_action( 'wp_head', function () {
	if ( is_admin() || is_feed() ) return;
	// Editors don't get it, except on Travelpayouts' own "Check Drive connection" link.
	if ( is_user_logged_in() && ! isset( $_GET['init_marker'] ) ) return;
	$t = 'scr' . 'ipt';
	echo '<' . $t . ' data-noptimize="1" data-cfasync="false" data-no-defer="1">'
		. '(function(){var s=document.createElement("' . $t . '");s.async=1;s.setAttribute("data-cmp-ab","2");'
		. 's.src="https://tp-em.com/NjAxNDM4.js?t=601438";document.head.appendChild(s);})();'
		. '</' . $t . '>' . "\n";
}, 5 );
