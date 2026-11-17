<?php
/* প্রবাসী ইনফো — Dream Group "Our concerns" strip (https://dreamithq.com/concerns.js).
   The same animated logo strip runs on every Dream Group site; the brand list is managed on dreamithq.com. */
add_action( 'wp_footer', function () {
	if ( is_admin() ) {
		return;
	}
	echo '<div id="dream-concerns"></div><script src="https://dreamithq.com/concerns.js" defer></script>' . "\n";
}, 98 );

/* One-time LiteSpeed purge so cached pages pick up the strip (runs once, then never again). */
add_action( 'init', function () {
	if ( get_option( 'dream_concerns_purged_v1' ) ) {
		return;
	}
	update_option( 'dream_concerns_purged_v1', 1, false );
	do_action( 'litespeed_purge_all' );
} );
