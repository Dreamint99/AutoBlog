<?php
/* প্রবাসী ইনফো — Google Search Console ownership file for kingmasum538@gmail.com.
   Serves /google11d06c05ec3fb0ca.html (the HTML-file verification method). Keep it: removing the
   file un-verifies the property. */
add_action( 'init', function () {
	$path = strtok( $_SERVER['REQUEST_URI'] ?? '', '?' );
	if ( $path === '/google11d06c05ec3fb0ca.html' ) {
		header( 'Content-Type: text/html; charset=utf-8' );
		echo 'google-site-verification: google11d06c05ec3fb0ca.html';
		exit;
	}
}, 0 );
