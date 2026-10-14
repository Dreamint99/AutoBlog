<?php
/* প্রবাসী ইনফো — Pulse beacon (pulse.countly.net): visitors, pageviews and live users for the owner's dashboard.
   probashiinfo is not on Cloudflare, so Pulse counts it from this beacon (anonymous: a random per-tab id, no cookies). */
add_action( 'wp_footer', function () {
	if ( is_user_logged_in() ) {
		return;
	}
	echo '<script src="https://pulse.countly.net/b.js" data-site="probashiinfo" defer></script>' . "\n";
}, 99 );
