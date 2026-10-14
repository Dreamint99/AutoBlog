<?php
/* প্রবাসী ইনফো — light RSS feed for Pinterest auto-publish at /pins.xml.
   The normal /feed/ carries full post HTML (~580 KB) and Pinterest refuses it ("can not be fetched").
   This one has the latest 25 posts: title, link, short excerpt and the featured image as media:content. */
add_action( 'init', function () {
	$path = strtok( $_SERVER['REQUEST_URI'] ?? '', '?' );
	if ( $path !== '/pins.xml' ) {
		return;
	}
	$posts = get_posts( array( 'numberposts' => 25, 'post_status' => 'publish' ) );
	header( 'Content-Type: application/rss+xml; charset=UTF-8' );
	header( 'Cache-Control: public, max-age=1800' );
	echo '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>';
	echo '<title>' . esc_html( get_bloginfo( 'name' ) ) . ' — Pins</title><link>' . esc_url( home_url( '/' ) ) . '</link>';
	echo '<description>' . esc_html( get_bloginfo( 'description' ) ) . '</description>';
	foreach ( $posts as $p ) {
		$img = get_the_post_thumbnail_url( $p, 'large' );
		if ( ! $img ) {
			continue;
		}
		$link = get_permalink( $p );
		$desc = wp_trim_words( wp_strip_all_tags( $p->post_excerpt ?: $p->post_content ), 40, '…' );
		echo '<item><title>' . esc_html( get_the_title( $p ) ) . '</title><link>' . esc_url( $link ) . '</link>';
		echo '<guid isPermaLink="true">' . esc_url( $link ) . '</guid><pubDate>' . esc_html( get_post_time( 'r', true, $p ) ) . '</pubDate>';
		echo '<description>' . esc_html( $desc ) . '</description>';
		echo '<media:content url="' . esc_url( $img ) . '" medium="image"/><enclosure url="' . esc_url( $img ) . '" type="image/jpeg" length="0"/></item>';
	}
	echo '</channel></rss>';
	exit;
}, 0 );
