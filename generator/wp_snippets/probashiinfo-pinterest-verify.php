<?php
/* প্রবাসী ইনফো — Pinterest website claim (business account "Countly", one code for all network sites).
   Keep it: removing the meta tag un-claims the site on Pinterest. */
add_action( 'wp_head', function () {
	echo '<meta name="p:domain_verify" content="ad493e4495716e19ddc0fb646a135cde"/>' . "\n";
}, 1 );
