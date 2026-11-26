<?php
/**
 * Probashiinfo share SVG fix (2026-11-26)
 *
 * Root cause: Ezoic in-content placeholders were injected into Simple Social
 * Buttons inline SVG path attributes (usually the after-content share block).
 * The broken SVG spilled raw path text ("…12.6L2.8… fill="#fff"/>Post") and
 * left the WhatsApp icon at its native 512px width, filling the column.
 *
 * This snippet does not edit post/page content, slugs, titles or meta.
 * Stored ssb_inline option is not changed. Deactivate this snippet and purge
 * LiteSpeed to roll back.
 */
if ( ! defined( 'ABSPATH' ) ) {
	return;
}

add_action( 'init', 'pi_share_fix_purge_once', 20 );
function pi_share_fix_purge_once() {
	if ( get_option( 'pi_share_fix_purged' ) !== '1' ) {
		update_option( 'pi_share_fix_purged', '1', false );
		do_action( 'litespeed_purge_all' );
	}
}

add_action( 'wp_head', 'pi_share_fix_css', 99 );
function pi_share_fix_css() {
	echo '<style id="pi-share-fix">'
		. '.simplesocialbuttons svg,.simplesocialbuttons .icon svg{width:16px!important;height:16px!important;max-width:18px!important;max-height:18px!important;overflow:hidden;display:inline-block;vertical-align:middle}'
		. '.simplesocialbuttons button.ssb_whatsapp-icon .icon{width:16px;height:16px;overflow:hidden}'
		. '</style>' . "\n";
}

// Theme already prints a Facebook / WhatsApp / copy block after the article.
// Keep only the above-content Simple Social Buttons so leftover Ezoic
// in-content slots cannot land inside a bottom-of-content SVG.
add_filter( 'option_ssb_inline', 'pi_share_fix_ssb_above_only' );
function pi_share_fix_ssb_above_only( $value ) {
	if ( is_array( $value ) && isset( $value['location'] ) && $value['location'] === 'above_below' ) {
		$value['location'] = 'above';
	}
	return $value;
}

add_action( 'template_redirect', 'pi_share_fix_buffer', 0 );
function pi_share_fix_buffer() {
	if ( is_admin() || is_feed() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}
	if ( function_exists( 'wp_doing_ajax' ) && wp_doing_ajax() ) {
		return;
	}
	ob_start( 'pi_share_fix_relocate_ezoic' );
}

function pi_share_fix_relocate_ezoic( $html ) {
	if ( ! is_string( $html ) || $html === '' || strpos( $html, '<!-- Ezoic' ) === false ) {
		return $html;
	}
	if ( ! preg_match_all( '/<!-- Ezoic\b.*?<!-- End Ezoic[^>]*-->/s', $html, $m, PREG_OFFSET_CAPTURE ) ) {
		return $html;
	}
	$orig   = $html;
	$blocks = $m[0];
	for ( $i = count( $blocks ) - 1; $i >= 0; $i-- ) {
		$block = $blocks[ $i ][0];
		$pos   = $blocks[ $i ][1];
		$end   = $pos + strlen( $block );
		if ( ! pi_share_fix_inside_svg_or_tag( $html, $pos ) ) {
			continue;
		}
		$html = substr( $html, 0, $pos ) . substr( $html, $end );
		$spot = pi_share_fix_safe_spot( $html, $pos );
		$html = substr( $html, 0, $spot ) . $block . substr( $html, $spot );
	}
	if ( ! is_string( $html ) || strlen( $html ) < ( strlen( $orig ) * 0.9 ) ) {
		return $orig;
	}
	return $html;
}

function pi_share_fix_inside_svg_or_tag( $html, $pos ) {
	$before = substr( $html, 0, $pos );
	$lt_svg = strrpos( $before, '<svg' );
	$gt_svg = strrpos( $before, '</svg>' );
	if ( false !== $lt_svg && ( false === $gt_svg || $lt_svg > $gt_svg ) ) {
		return true;
	}
	$lt = strrpos( $before, '<' );
	$gt = strrpos( $before, '>' );
	if ( false !== $lt && ( false === $gt || $lt > $gt ) ) {
		return true;
	}
	return false;
}

function pi_share_fix_safe_spot( $html, $pos ) {
	$before = substr( $html, 0, $pos );
	$lt_svg = strrpos( $before, '<svg' );
	$gt_svg = strrpos( $before, '</svg>' );
	if ( false !== $lt_svg && ( false === $gt_svg || $lt_svg > $gt_svg ) ) {
		$end = strpos( $html, '</svg>', $pos );
		if ( false !== $end ) {
			return $end + 6;
		}
	}
	$lt = strrpos( $before, '<' );
	$gt = strrpos( $before, '>' );
	if ( false !== $lt && ( false === $gt || $lt > $gt ) ) {
		$gt2 = strpos( $html, '>', $pos );
		if ( false !== $gt2 ) {
			$probe   = $gt2 + 1;
			$before2 = substr( $html, 0, $probe );
			$ls      = strrpos( $before2, '<svg' );
			$es      = strrpos( $before2, '</svg>' );
			if ( false !== $ls && ( false === $es || $ls > $es ) ) {
				$end = strpos( $html, '</svg>', $probe );
				if ( false !== $end ) {
					return $end + 6;
				}
			}
			return $probe;
		}
	}
	return $pos;
}
