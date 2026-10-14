<?php
/* প্রবাসী ইনফো — page speed (owner's goal: 90+ on mobile and desktop).
   Mobile Lighthouse was 38: ad / analytics scripts (Ezoic + its consent popup, AdSense, Adsterra, Google Tag Manager,
   Site Kit) and the social-button JS ran during first paint, and four font stylesheets blocked rendering.
   1) Those scripts are parked as type="text/plain" and started on the visitor's first scroll / touch / key / mouse move,
      or after 6 s at the latest. Ads still show, a moment later (the "delay JS" approach of WP Rocket and others).
   2) Font stylesheets load without blocking the first paint (media="print" swap), with display=swap.
   Logged-in users and admin / feed / REST requests are untouched. */
if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
	return;
}
add_action( 'template_redirect', function () {
	if ( is_user_logged_in() || is_feed() || is_preview() ) {
		return;
	}
	ob_start( 'pi_speed_rewrite' );
}, 1 );

function pi_speed_rewrite( $html ) {
	if ( stripos( $html, '<html' ) === false ) {
		return $html;
	}
	// scripts to delay: matched against the src (external) or the code (inline)
	$delay = '~(googletagmanager\.com|gtag\(|googlesitekit|ezojs\.com|ezoic|ezstandalone|gatekeeperconsent|adsbygoogle|googlesyndication|profitableratecpmnetwork|effectivegatecpm|simple-social-buttons|connect\.facebook\.net)~i';
	$html = preg_replace_callback( '~<script\b([^>]*)>(.*?)</script>~is', function ( $m ) use ( $delay ) {
		$attrs = $m[1];
		$code  = $m[2];
		if ( preg_match( '~type=["\'](application/ld\+json|text/template|text/x-template)["\']~i', $attrs ) ) {
			return $m[0];
		}
		$src = preg_match( '~\ssrc=["\']([^"\']+)["\']~i', $attrs, $s ) ? $s[1] : '';
		if ( ! preg_match( $delay, $src . ' ' . $code ) ) {
			return $m[0];
		}
		$attrs = preg_replace( '~\stype=["\'][^"\']*["\']~i', '', $attrs );
		if ( $src ) {
			$attrs = preg_replace( '~\ssrc=~i', ' data-pi-src=', $attrs );
		}
		return '<script type="text/plain" data-pi-delay' . $attrs . '>' . $code . '</script>';
	}, $html );
	// non-blocking font stylesheets
	$html = preg_replace_callback( '~<link\b[^>]*rel=["\']stylesheet["\'][^>]*>~i', function ( $m ) {
		$tag = $m[0];
		if ( ! preg_match( '~fonts\.googleapis\.com|bangla-web-fonts~i', $tag ) || stripos( $tag, 'onload=' ) !== false ) {
			return $tag;
		}
		if ( stripos( $tag, 'display=' ) === false ) {
			$tag = preg_replace( '~(fonts\.googleapis\.com/css2?\?[^"\']*)~i', '$1&display=swap', $tag );
		}
		$tag = preg_replace( '~\smedia=["\'][^"\']*["\']~i', '', $tag );
		return str_replace( '<link', '<link media="print" onload="this.media=\'all\'"', $tag ) . '<noscript>' . $m[0] . '</noscript>';
	}, $html );
	$loader = <<<'JS'
<script>(function(){var done=false;function run(){if(done)return;done=true;
var list=[].slice.call(document.querySelectorAll('script[data-pi-delay]'));
(function next(){var o=list.shift();if(!o)return;var s=document.createElement('script');
for(var i=0;i<o.attributes.length;i++){var a=o.attributes[i];if(a.name==='type'||a.name==='data-pi-delay')continue;
s.setAttribute(a.name==='data-pi-src'?'src':a.name,a.value);}
if(s.src){var sync=!o.hasAttribute('async');s.async=false;if(sync){s.onload=s.onerror=next;}else{next();}}else{s.text=o.text;}
o.parentNode.replaceChild(s,o);if(!s.src)next();})();}
['scroll','touchstart','mousemove','keydown','click'].forEach(function(e){addEventListener(e,run,{once:true,passive:true});});
setTimeout(run,6000);})();</script>
JS;
	return preg_replace( '~</body>~i', $loader . '</body>', $html, 1 );
}
