<?php
/* প্রবাসী ইনফো — Largest Contentful Paint fix (2026-11-15).
   PageSpeed mobile: LCP 4.8 s. On articles the LCP element is the featured image; its `sizes` said 1024px while the
   article column is ~763px, so browsers fetched a larger file than needed, and nothing asked for it early.
   1) Featured image: honest `sizes` (phones 94vw, desktop 763px).
   2) <link rel=preload> for the featured image with the same srcset/sizes, high priority.
   3) Noto Sans Bengali loads 400/600/700 only (500 and 800 are near-duplicates; the browser shows the closest weight).
   Undo: deactivate this snippet. */
if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
	return;
}
// one LiteSpeed purge per version, so cached pages pick the change up
add_action( 'init', function () {
	if ( get_option( 'pi_lcp_purged' ) !== '2' ) {
		update_option( 'pi_lcp_purged', '2', false );
		do_action( 'litespeed_purge_all' );
	}
} );
if ( ! function_exists( 'pi_lcp_sizes' ) ) {
	function pi_lcp_sizes() {
		return '(max-width: 820px) 94vw, 763px';
	}
}
add_filter( 'wp_get_attachment_image_attributes', function ( $attr ) {
	if ( is_singular( 'post' ) && isset( $attr['class'] ) && strpos( $attr['class'], 'wp-post-image' ) !== false ) {
		$attr['sizes']         = pi_lcp_sizes();
		$attr['fetchpriority'] = 'high';
		$attr['decoding']      = 'async';
		unset( $attr['loading'] );
	}
	return $attr;
}, 20 );
add_action( 'wp_head', function () {
	if ( ! is_singular( 'post' ) || ! has_post_thumbnail() ) {
		return;
	}
	$id     = get_post_thumbnail_id();
	$src    = wp_get_attachment_image_url( $id, 'large' );
	$srcset = wp_get_attachment_image_srcset( $id, 'large' );
	if ( ! $src ) {
		return;
	}
	echo '<link rel="preload" as="image" href="' . esc_url( $src ) . '"'
		. ( $srcset ? ' imagesrcset="' . esc_attr( $srcset ) . '" imagesizes="' . esc_attr( pi_lcp_sizes() ) . '"' : '' )
		. ' fetchpriority="high">' . "\n";
}, 1 );
add_action( 'template_redirect', function () {
	if ( is_feed() || is_preview() ) {
		return;
	}
	ob_start( function ( $html ) {
		$html = str_replace(
			array( 'Noto+Sans+Bengali:wght@400;500;600;700;800', 'Noto+Sans+Bengali:wght@400;500;600;700' ),
			'Noto+Sans+Bengali:wght@400;600;700',
			$html
		);
		// 4) Home LCP is the hero <h1> text: with display=swap it repaints when the web font lands (~4.8 s on slow
		//    mobile), and that repaint is the LCP. display=optional keeps the first paint (Android ships Noto Sans
		//    Bengali as its system Bengali font, so phones look the same); the web font is used once cached.
		return preg_replace( '~(Noto\+Sans\+Bengali:wght@[0-9;]+)&(amp;)?display=swap~', '$1&$2display=optional', $html );
	} );
}, 2 );
