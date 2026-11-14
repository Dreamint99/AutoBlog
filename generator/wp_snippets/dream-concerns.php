<?php
/* প্রবাসী ইনফো — Dream Group "Our concerns" strip (https://dreamithq.com/concerns.js).
   The same animated logo strip runs on every Dream Group site; the brand list is managed on dreamithq.com. */
add_action( 'wp_footer', function () {
	if ( is_admin() ) {
		return;
	}
	echo '<div id="dream-concerns"></div><script src="https://dreamithq.com/concerns.js" defer></script>' . "\n";
}, 98 );
