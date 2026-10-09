<?php
/* "প্রবাসী তথ্য বাতায়ন" — probashiinfo.com portal redesign v2 (Code Snippets, front-end).
   An information-portal look (structured, green, calm) for Bangladeshi expats, built on the Swyft theme
   markup like the v1 newspaper snippet (#8). It is an INDEPENDENT site and says so; no state emblem.
   Rollout: PI_PUBLIC false = only visible with ?v2=1 (sets a cookie; ?v2=0 clears it) or to admins.
   When v2 is on for a request, v1 (#8) steps aside via pn_on() → pi_on().
   Live data (all free, keyless, fetched in the browser): open.er-api.com (exchange rates),
   api.aladhan.com (prayer times), Intl (Hijri date, world clocks). */
if ( ! defined( 'PI_PUBLIC' ) ) define( 'PI_PUBLIC', false );

function pi_on() {
	static $on = null;
	if ( $on !== null ) return $on;
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return $on = false;
	if ( isset( $_GET['v2'] ) ) {
		$want = $_GET['v2'] === '1';
		if ( ! headers_sent() ) setcookie( 'pi_v2', $want ? '1' : '', $want ? time() + 30 * DAY_IN_SECONDS : time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
		return $on = $want;
	}
	return $on = ( PI_PUBLIC || ! empty( $_COOKIE['pi_v2'] ) || current_user_can( 'manage_options' ) );
}
/* decide early (before any output) so the preview cookie can be set; preview pages must never
   enter the page cache (LiteSpeed caches for 7 days and does not vary on our cookie). */
add_action( 'template_redirect', function () {
	if ( pi_on() && ! PI_PUBLIC ) {
		if ( ! defined( 'DONOTCACHEPAGE' ) ) define( 'DONOTCACHEPAGE', true );
		do_action( 'litespeed_control_set_nocache', 'probashiinfo v2 preview' );
		if ( ! headers_sent() ) header( 'Cache-Control: no-store, private' );
	}
}, 0 );
function pi_bn( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); }
function pi_date( $ts ) {
	$m = array( 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর' );
	return pi_bn( wp_date( 'j', $ts ) ) . ' ' . $m[ (int) wp_date( 'n', $ts ) - 1 ] . ' ' . pi_bn( wp_date( 'Y', $ts ) );
}
function pi_weekday( $ts ) {
	$d = array( 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার' );
	return $d[ (int) wp_date( 'w', $ts ) ];
}
function pi_cat_name( $c ) { return trim( preg_replace( '/^[^\p{Bengali}\p{L}]+/u', '', $c->name ) ); }
function pi_card( $p, $size = 'md', $excerpt = false ) {
	$cats = get_the_category( $p->ID ); $cat = $cats ? $cats[0] : null;
	$img = has_post_thumbnail( $p ) ? get_the_post_thumbnail( $p, $size === 'lg' ? 'large' : 'medium_large', array( 'loading' => 'lazy', 'alt' => esc_attr( get_the_title( $p ) ) ) ) : '';
	$o = '<article class="pi-card pi-' . $size . '"><a class="pi-thumb' . ( $img ? '' : ' ph' ) . '" href="' . esc_url( get_permalink( $p ) ) . '" tabindex="-1" aria-hidden="true">' . ( $img ?: '<span>প্রবাসী ইনফো</span>' ) . '</a><div class="pi-text">';
	if ( $cat ) $o .= '<a class="pi-kicker" href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pi_cat_name( $cat ) ) . '</a>';
	$o .= '<h3><a href="' . esc_url( get_permalink( $p ) ) . '">' . esc_html( get_the_title( $p ) ) . '</a></h3>';
	if ( $excerpt ) $o .= '<p class="pi-ex">' . esc_html( wp_trim_words( get_the_excerpt( $p ), 26, '…' ) ) . '</p>';
	return $o . '<time datetime="' . esc_attr( get_the_date( 'c', $p ) ) . '">' . esc_html( pi_date( get_post_time( 'U', true, $p ) ) ) . '</time></div></article>';
}
/* services → a category whose name/slug matches, else a site search */
function pi_service_url( $words ) {
	foreach ( get_categories( array( 'hide_empty' => true ) ) as $c ) {
		foreach ( $words as $w ) if ( stripos( $c->name . ' ' . $c->slug, $w ) !== false ) return get_category_link( $c );
	}
	return home_url( '/?s=' . rawurlencode( $words[0] ) );
}
function pi_logo_svg() {
	return '<svg class="pi-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#006a4e"/><circle cx="24" cy="24" r="19.5" fill="none" stroke="#f4c430" stroke-width="1.4" stroke-dasharray="2.2 1.8"/>'
		. '<circle cx="24" cy="24" r="12" fill="none" stroke="#fff" stroke-width="1.8"/><ellipse cx="24" cy="24" rx="5" ry="12" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M12 24h24M14 18h20M14 30h20" stroke="#fff" stroke-width="1.2" fill="none"/>'
		. '<circle cx="35" cy="13" r="5.4" fill="#e63946"/><path d="M32.6 13.2l1.7 1.7 3.2-3.3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

/* ---------- styles + fonts ---------- */
add_action( 'wp_head', function () {
	if ( ! pi_on() ) return; ?>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<meta name="theme-color" content="#006a4e">
<style id="pi-css">
:root{--pi-g:#006a4e;--pi-g2:#00875a;--pi-gd:#00412f;--pi-red:#e63946;--pi-gold:#f4c430;--pi-ink:#14211c;--pi-ink2:#3b4a44;--pi-mut:#66756f;--pi-line:#dbe4df;--pi-soft:#eef4f1;--pi-bg:#f6f8f7;--pi-card:#fff;--pi-head:"Anek Bangla","Hind Siliguri",system-ui,sans-serif;--pi-body:"Hind Siliguri",system-ui,sans-serif;--pi-fs:18.5px}
[data-scheme="dark"]{--pi-ink:#e9f0ec;--pi-ink2:#c4d0ca;--pi-mut:#93a29b;--pi-line:#25332d;--pi-soft:#14201b;--pi-bg:#0d1612;--pi-card:#121d18}
body.pi{font-family:var(--pi-body)!important;background:var(--pi-bg)!important;color:var(--pi-ink)}
body.pi h1,body.pi h2,body.pi h3,body.pi .cs-entry__title{font-family:var(--pi-head)!important;letter-spacing:0}
.pi-w{max-width:1240px;margin:0 auto;padding:0 20px}
body.pi .cs-container{max-width:1240px}
/* utility bar */
.pi-util{background:var(--pi-gd);color:#d9efe6;font:500 13.5px/1.2 var(--pi-body)}
.pi-util .pi-w{display:flex;align-items:center;gap:16px;min-height:36px;flex-wrap:wrap}
.pi-util b{color:#fff;font-weight:600}
.pi-util .pi-ind{display:inline-flex;align-items:center;gap:6px}
.pi-util .pi-ind:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--pi-gold)}
.pi-util .pi-r{margin-left:auto;display:flex;gap:14px;align-items:center}
.pi-util a{color:#fff!important;text-decoration:none!important}
.pi-util .pi-hot{background:var(--pi-red);padding:4px 10px;border-radius:999px;font-weight:700}
@media(max-width:760px){.pi-util .pi-hide{display:none}}
/* brand row (desktop header restyle) */
body.pi .cs-header{background:var(--pi-card)!important;box-shadow:0 1px 0 var(--pi-line)!important}
body.pi .cs-header__inner-desktop{display:grid!important;grid-template-columns:auto 1fr auto;grid-template-areas:"logo date right" "nav nav nav";height:auto!important;padding:0!important}
body.pi .cs-header__inner-desktop .cs-col-left{grid-area:logo;padding:14px 0}
body.pi .cs-header__inner-desktop .cs-col-center{grid-area:nav;justify-content:flex-start!important;background:var(--pi-g);margin:0 calc(50% - 50vw);padding:0 calc(50vw - 50% + 8px)}
body.pi .cs-header__inner-desktop .cs-col-right{grid-area:right;justify-content:flex-end!important}
body.pi .cs-header__inner-desktop .cs-logo img{display:none!important}
body.pi .cs-logo-dark,body.pi .cs-footer .cs-logo{display:none!important}
body.pi .cs-logo a{display:inline-flex!important;align-items:center;gap:12px;text-decoration:none!important}
.pi-brand{display:inline-flex;align-items:center;gap:12px}
.pi-mark{width:54px;height:54px;flex:none;filter:drop-shadow(0 4px 10px rgba(0,106,78,.3))}
.pi-word b{display:block;font:800 30px/1 var(--pi-head);color:var(--pi-g);letter-spacing:-.01em}
.pi-word b span{color:var(--pi-red)}
.pi-word small{display:block;margin-top:5px;font:600 12.5px/1 var(--pi-body);color:var(--pi-mut);letter-spacing:.02em}
body.pi .pi-dates{grid-area:date;align-self:center;justify-self:center;display:flex;gap:8px;flex-wrap:wrap}
.pi-dates span{padding:6px 11px;border-radius:8px;background:var(--pi-soft);border:1px solid var(--pi-line);font:600 13.5px/1 var(--pi-body);color:var(--pi-ink2)}
body.pi .cs-header__nav-inner>li>a{font:600 16px/1 var(--pi-body)!important;color:#fff!important;padding:14px 14px!important}
body.pi .cs-header__nav-inner>li>a:hover,body.pi .cs-header__nav-inner>li.current-menu-item>a{background:rgba(0,0,0,.18)}
body.pi .cs-header__inner-desktop .cs-col-right *{color:var(--pi-ink)!important}
@media(max-width:1019px){body.pi .cs-header__inner-desktop{display:none!important}body.pi .cs-header__inner-mobile .cs-logo img{display:none!important}body.pi .pi-mark{width:38px;height:38px}body.pi .pi-word b{font-size:22px}body.pi .pi-word small{display:none}}
@media(min-width:1020px){body.pi .cs-header.cs-scroll-sticky{top:calc(var(--wp-admin--admin-bar--height,0px) - 82px)!important}}
/* hero band (home) */
.pi-hero{background:radial-gradient(900px 340px at 85% -20%,rgba(244,196,48,.22),transparent 60%),linear-gradient(120deg,#00412f,#006a4e 55%,#00875a);color:#fff;padding:34px 0 30px;position:relative;overflow:hidden}
.pi-hero:after{content:"";position:absolute;right:-80px;top:-80px;width:420px;height:420px;border-radius:50%;border:60px solid rgba(255,255,255,.05)}
.pi-hero h2{margin:0!important;font:800 clamp(28px,4vw,44px)/1.2 var(--pi-head)!important;color:#fff}
.pi-hero p{margin:8px 0 18px;color:#d4ece2;font-size:17px;max-width:62ch}
.pi-hsearch{display:flex;max-width:640px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 40px -18px rgba(0,0,0,.5)}
.pi-hsearch input{flex:1;min-width:0;border:0!important;outline:0;padding:14px 16px!important;font:500 16.5px var(--pi-body)!important;color:#14211c!important;background:#fff!important;box-shadow:none!important;height:auto!important}
.pi-hsearch button{border:0;background:var(--pi-red);color:#fff;font:700 16px var(--pi-head);padding:0 22px;cursor:pointer}
.pi-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.pi-chips a{padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);color:#fff!important;font-size:14px;text-decoration:none!important}
.pi-chips a:hover{background:rgba(255,255,255,.22)}
/* service tiles */
.pi-sec{margin:34px 0 0}
.pi-h{display:flex;align-items:center;gap:10px;margin:0 0 14px}
.pi-h h2{margin:0!important;font:800 24px/1.25 var(--pi-head)!important;color:var(--pi-ink)}
.pi-h:before{content:"";width:6px;height:26px;border-radius:3px;background:linear-gradient(var(--pi-g),var(--pi-red))}
.pi-h .more{margin-left:auto;font:600 14px var(--pi-body);color:var(--pi-g)!important;text-decoration:none!important}
.pi-services{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.pi-svc{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;padding:16px;border-radius:14px;background:var(--pi-card);border:1px solid var(--pi-line);text-decoration:none!important;transition:transform .2s,box-shadow .2s,border-color .2s}
.pi-svc:hover{transform:translateY(-3px);border-color:var(--pi-g2);box-shadow:0 14px 30px -18px rgba(0,106,78,.6)}
.pi-svc i{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;font-style:normal;font-size:24px;background:var(--pi-soft)}
.pi-svc b{display:block;font:700 16.5px/1.3 var(--pi-head);color:var(--pi-ink)}
.pi-svc small{display:block;font-size:13px;color:var(--pi-mut);line-height:1.4;margin-top:2px}
@media(max-width:960px){.pi-services{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.pi-svc{grid-template-columns:1fr;gap:8px;padding:14px}.pi-svc i{width:42px;height:42px;font-size:21px}.pi-svc b{font-size:15.5px}}
/* dashboard */
.pi-dash{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px}
@media(max-width:900px){.pi-dash{grid-template-columns:minmax(0,1fr)}}
.pi-box{background:var(--pi-card);border:1px solid var(--pi-line);border-radius:16px;padding:18px}
.pi-box-h{display:flex;align-items:center;gap:8px;margin-bottom:12px;font:700 17px/1.2 var(--pi-head);color:var(--pi-ink)}
.pi-box-h .live{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font:600 12px var(--pi-body);color:var(--pi-g)}
.pi-box-h .live:before{content:"";width:8px;height:8px;border-radius:50%;background:#16a34a;animation:piping 1.8s infinite}
@keyframes piping{0%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}70%,100%{box-shadow:0 0 0 8px rgba(22,163,74,0)}}
.pi-rates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.pi-rate{display:block!important;width:100%;height:auto!important;line-height:1.3!important;padding:10px 12px;border-radius:12px;background:var(--pi-soft);border:1px solid var(--pi-line);cursor:pointer;text-align:left;font-family:var(--pi-body)}
.pi-rate.on{border-color:var(--pi-g);background:linear-gradient(160deg,rgba(0,135,90,.14),transparent)}
.pi-rate span{display:block;font-size:12.5px;color:var(--pi-mut)}
.pi-rate b{display:block;font:800 19px/1.2 var(--pi-head);color:var(--pi-ink)}
.pi-calc{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px;padding:12px;border-radius:12px;background:linear-gradient(120deg,#00412f,#006a4e);color:#fff}
.pi-calc input{width:130px;border:0;border-radius:10px;padding:10px 12px;font:700 18px var(--pi-head)}
.pi-calc .out{font:800 24px/1.1 var(--pi-head)}
.pi-calc .out small{display:block;font:500 12.5px var(--pi-body);color:#cfe9de;margin-top:3px}
.pi-wa{margin-left:auto;display:inline-flex;align-items:center;gap:6px;background:#25d366;color:#04381b!important;border-radius:10px;padding:10px 14px;font:700 14.5px var(--pi-body);text-decoration:none!important;border:0;cursor:pointer}
.pi-note{margin:10px 0 0;font-size:12.5px;line-height:1.5;color:var(--pi-mut)}
.pi-clocks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.pi-clocks div{padding:9px 10px;border-radius:12px;background:var(--pi-soft);border:1px solid var(--pi-line)}
.pi-clocks span{display:block;font-size:12.5px;color:var(--pi-mut)}
.pi-clocks b{font:800 18px/1.2 var(--pi-head);color:var(--pi-ink);font-variant-numeric:tabular-nums}
.pi-clocks .bd{background:linear-gradient(160deg,rgba(230,57,70,.14),transparent);border-color:rgba(230,57,70,.4)}
.pi-pray{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:10px}
.pi-pray div{text-align:center;padding:8px 4px;border-radius:10px;border:1px solid var(--pi-line)}
.pi-pray span{display:block;font-size:12px;color:var(--pi-mut)}.pi-pray b{font:700 15px var(--pi-head)}
.pi-pray .on{background:var(--pi-g);border-color:var(--pi-g)}.pi-pray .on span,.pi-pray .on b{color:#fff}
.pi-box select{border:1px solid var(--pi-line);border-radius:8px;padding:6px 8px;font:600 13.5px var(--pi-body);background:var(--pi-card);color:var(--pi-ink);margin-left:auto}
/* hotlines + notice board */
.pi-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:14px}
@media(max-width:900px){.pi-two{grid-template-columns:minmax(0,1fr)}}
.pi-hl{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.pi-hl a{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--pi-soft);border:1px solid var(--pi-line);text-decoration:none!important;color:var(--pi-ink)!important}
.pi-hl i{width:42px;height:42px;border-radius:10px;display:grid;place-items:center;font-style:normal;background:var(--pi-card);font-size:20px}
.pi-hl b{font:700 15.5px/1.3 var(--pi-head)}.pi-hl small{display:block;font-size:12.5px;color:var(--pi-mut)}
.pi-hl em{font:800 17px var(--pi-head);font-style:normal;color:var(--pi-red)}
.pi-notice{list-style:none;margin:0;padding:0}
.pi-notice li{display:grid;grid-template-columns:62px 1fr;gap:12px;padding:10px 0;border-bottom:1px dashed var(--pi-line)}
.pi-notice .d{text-align:center;border-radius:10px;background:var(--pi-g);color:#fff;padding:6px 0;font:700 13px/1.15 var(--pi-head)}
.pi-notice .d b{display:block;font-size:20px}
.pi-notice a{font:600 16px/1.45 var(--pi-head);color:var(--pi-ink)!important;text-decoration:none!important}
.pi-notice a:hover{color:var(--pi-g)!important}
.pi-new{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:var(--pi-red);color:#fff;font:700 11px/1.6 var(--pi-body);vertical-align:2px}
/* category sections */
.pi-cat{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px}
@media(max-width:860px){.pi-cat{grid-template-columns:minmax(0,1fr)}}
.pi-card{background:var(--pi-card);border:1px solid var(--pi-line);border-radius:14px;overflow:hidden;transition:box-shadow .2s,transform .2s}
.pi-card:hover{box-shadow:0 14px 30px -18px rgba(0,0,0,.35);transform:translateY(-2px)}
.pi-thumb{display:block;aspect-ratio:16/9;overflow:hidden;background:var(--pi-soft)}
.pi-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.pi-thumb.ph{display:grid;place-items:center;font:700 18px var(--pi-head);color:var(--pi-g)}
.pi-text{padding:12px 14px 14px}
.pi-kicker{display:inline-block;font:700 12.5px var(--pi-body);color:var(--pi-g)!important;text-decoration:none!important;margin-bottom:4px}
.pi-card h3{margin:0 0 6px!important;font:700 17.5px/1.45 var(--pi-head)!important}
.pi-lg h3{font-size:22px!important}
.pi-card h3 a{color:var(--pi-ink)!important;text-decoration:none!important}.pi-card h3 a:hover{color:var(--pi-g)!important}
.pi-ex{margin:0 0 6px;color:var(--pi-ink2);font-size:15px;line-height:1.65}
.pi-card time{font-size:12.5px;color:var(--pi-mut)}
.pi-list{display:grid;gap:10px}
.pi-list .pi-card{display:grid;grid-template-columns:120px minmax(0,1fr)}
.pi-list .pi-thumb{aspect-ratio:auto;height:100%}
.pi-list .pi-text{padding:10px 12px}
.pi-list h3{font-size:15.5px!important}
/* theme content restyle */
body.pi .cs-meta-category a,body.pi .post-categories a{background:none!important;color:var(--pi-g)!important;padding:0!important;font:700 13.5px var(--pi-body)!important}
body.pi .cs-entry__title a:hover{color:var(--pi-g)!important}
body.pi .cs-posts-area__home article{background:var(--pi-card);border:1px solid var(--pi-line);border-radius:14px;overflow:hidden;padding-bottom:12px}
body.pi .cs-posts-area__home article .cs-entry__content,body.pi .cs-posts-area__home article .cs-entry__header{padding-left:14px;padding-right:14px}
body.pi .cs-posts-area__home article .cs-entry__title{font-size:18.5px!important;line-height:1.45!important}
body.pi .cs-hero-type-2__container .cs-entry__featured .cs-entry__title{font-size:clamp(24px,3vw,36px)!important;line-height:1.3!important}
body.pi .cs-sidebar__area .wp-block-heading{font:800 19px var(--pi-head)!important;border-left:5px solid var(--pi-g);padding-left:10px}
/* article */
body.pi.single .cs-entry__header h1.cs-entry__title{font-size:clamp(28px,4vw,44px)!important;line-height:1.3!important;font-weight:800!important}
body.pi .entry-content{font-size:var(--pi-fs)!important;line-height:1.9!important;color:var(--pi-ink)}
body.pi .entry-content h2{font:800 26px/1.4 var(--pi-head)!important;margin:1.6em 0 .6em!important;padding:10px 14px;border-radius:10px;background:var(--pi-soft);border-left:5px solid var(--pi-g)}
body.pi .entry-content h3{font:700 21px/1.45 var(--pi-head)!important;color:var(--pi-gd)}
[data-scheme="dark"] body.pi .entry-content h3{color:#8fd8b9}
body.pi .entry-content a:not([class]){color:var(--pi-g);text-decoration:underline;text-underline-offset:3px}
body.pi .entry-content table{border-collapse:collapse;width:100%;font-size:16px;display:block;overflow-x:auto}
body.pi .entry-content th,body.pi .entry-content td{border:1px solid var(--pi-line);padding:10px 12px}
body.pi .entry-content th{background:var(--pi-g);color:#fff}
body.pi .entry-content tr:nth-child(even) td{background:var(--pi-soft)}
body.pi .entry-content blockquote{border-left:5px solid var(--pi-gold)!important;background:#fff8e1;padding:12px 16px!important;border-radius:0 10px 10px 0}
[data-scheme="dark"] body.pi .entry-content blockquote{background:#2a2410}
.pi-byline{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:12px;background:var(--pi-soft);border:1px solid var(--pi-line);margin:0 0 18px;font-size:14px;color:var(--pi-mut)}
.pi-byline img{width:40px;height:40px;border-radius:50%}
.pi-byline b{color:var(--pi-ink);font-size:15px;display:block}
.pi-fsz{margin-left:auto;display:flex;gap:4px}
.pi-fsz button{width:36px;height:34px;border-radius:8px;border:1px solid var(--pi-line);background:var(--pi-card);color:var(--pi-ink);font:700 14px var(--pi-head);cursor:pointer}
.pi-sharebar{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0;padding:16px;border-radius:14px;background:linear-gradient(120deg,#00412f,#006a4e);color:#fff;align-items:center}
.pi-sharebar p{margin:0;flex:1 1 220px;font:700 16.5px/1.4 var(--pi-head)}
.pi-sharebar a,.pi-sharebar button{display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:10px;font:700 14.5px var(--pi-body);text-decoration:none!important;border:0;cursor:pointer}
.pi-sharebar .wa{background:#25d366;color:#04381b!important}.pi-sharebar .fb{background:#1877f2;color:#fff!important}.pi-sharebar .cp{background:rgba(255,255,255,.15);color:#fff}
.pi-toc{border:1px solid var(--pi-line);background:var(--pi-card);border-radius:12px;padding:14px 18px;margin:0 0 1.4em;font-size:16px}
.pi-toc b{display:block;font:800 16.5px var(--pi-head);margin-bottom:6px;color:var(--pi-g)}
.pi-toc ol{margin:0;padding-left:1.2em}.pi-toc li{margin:4px 0}
.pi-toc a{color:var(--pi-ink2)!important;text-decoration:none!important}
.pi-help{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin:20px 0;padding:14px 16px;border-radius:14px;border:1px solid rgba(230,57,70,.35);background:rgba(230,57,70,.06)}
.pi-help i{font-style:normal;font-size:26px}.pi-help b{font:700 16px var(--pi-head)}.pi-help small{display:block;color:var(--pi-mut);font-size:13px}
.pi-help a{background:var(--pi-red);color:#fff!important;padding:9px 14px;border-radius:10px;font:700 15px var(--pi-head);text-decoration:none!important;white-space:nowrap}
.pi-related{margin-top:30px}.pi-related .pi-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
@media(max-width:760px){.pi-related .pi-grid3{grid-template-columns:minmax(0,1fr)}}
.pi-progress{position:fixed;left:0;top:0;height:4px;background:linear-gradient(90deg,var(--pi-g2),var(--pi-gold));width:0;z-index:99999}
/* footer */
body.pi .cs-footer{background:var(--pi-gd)!important;color:#cfe5db!important;margin-top:56px}
body.pi .cs-footer a{color:#fff!important}body.pi .cs-footer a:hover{color:var(--pi-gold)!important}
.pi-ft{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:28px;padding:40px 0 26px;border-bottom:1px solid rgba(255,255,255,.12)}
@media(max-width:900px){.pi-ft{grid-template-columns:1fr 1fr}}@media(max-width:520px){.pi-ft{grid-template-columns:1fr}}
.pi-ft .pi-word b{color:#fff}.pi-ft .pi-word small{color:#a7cfbf}
.pi-ft p{margin:12px 0 0;line-height:1.7;color:#bcd9cc;font-size:14.5px}
.pi-ft h4{margin:0 0 12px;font:700 16px var(--pi-head);color:var(--pi-gold)}
.pi-ft ul{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:15px}
.pi-disc{font-size:13px;color:#a7cfbf;padding:14px 0 6px;line-height:1.6}
.pi-credit{font-size:13.5px;color:#a7cfbf;padding:6px 0 16px}.pi-credit b{color:#fff;font-weight:600}
/* mobile app bar */
.pi-tabs{display:none}
@media(max-width:760px){
 .pi-tabs{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:8px;right:8px;bottom:8px;z-index:9999;background:var(--pi-card);border:1px solid var(--pi-line);border-radius:18px;box-shadow:0 14px 34px rgba(0,0,0,.25);padding:5px}
 .pi-tabs a,.pi-tabs button{display:grid;justify-items:center;gap:2px;padding:7px 0;border:0;background:none;border-radius:12px;color:var(--pi-mut)!important;font:700 11.5px var(--pi-body);text-decoration:none!important;cursor:pointer}
 .pi-tabs i{font-style:normal;font-size:20px;line-height:1}
 .pi-tabs .hot{background:var(--pi-red);color:#fff!important}
 body.pi{padding-bottom:76px}
 .pi-rates{grid-template-columns:repeat(2,minmax(0,1fr))}
 .pi-clocks{grid-template-columns:repeat(2,minmax(0,1fr))}
 .pi-pray{grid-template-columns:repeat(3,minmax(0,1fr))}
 .pi-list .pi-card{grid-template-columns:100px minmax(0,1fr)}
}
.pi-card a,.pi-notice a,.pi-ft a,.pi-util a,.pi-svc{text-decoration:none!important}
</style>
<?php }, 21 );

add_filter( 'body_class', function ( $c ) { if ( pi_on() ) $c[] = 'pi'; return $c; } );

/* ---------- utility bar, dates, brand, hero/home blocks (templates moved into place by JS) ---------- */
add_action( 'wp_body_open', function () {
	if ( ! pi_on() ) return;
	$now = current_time( 'timestamp', true ); ?>
<?php if ( is_front_page() ) : ?><h1 class="screen-reader-text">প্রবাসী ইনফো: প্রবাসীদের তথ্য বাতায়ন — ভিসা, ওয়ার্ক পারমিট, রেমিট্যান্স ও বিদেশ যাওয়ার নির্ভরযোগ্য তথ্য</h1><?php endif; ?>
<div class="pi-util"><div class="pi-w">
	<span class="pi-ind"><b>স্বাধীন তথ্যসেবা</b><span class="pi-hide">&nbsp;— এটি সরকারি ওয়েবসাইট নয়</span></span>
	<span class="pi-hide"><?php echo esc_html( pi_weekday( $now ) . ', ' . pi_date( $now ) ); ?></span>
	<span class="pi-r">
		<a class="pi-hide" href="https://www.probashibondu.online/?utm_source=probashiinfo&utm_medium=util" target="_blank" rel="noopener">প্রবাসী বন্ধু</a>
		<a class="pi-hot" href="tel:16135" aria-label="প্রবাসী কল্যাণ কল সেন্টার ১৬১৩৫">☎ ১৬১৩৫</a>
	</span>
</div></div>
<template id="pi-brand"><span class="pi-brand"><?php echo pi_logo_svg(); ?><span class="pi-word"><b>প্রবাসী <span>ইনফো</span></b><small>প্রবাসীদের তথ্য বাতায়ন</small></span></span></template>
<template id="pi-dates"><div class="pi-dates"><span><?php echo esc_html( pi_date( $now ) ); ?></span><span id="pi-hijri">হিজরি</span><span id="pi-en"><?php echo esc_html( wp_date( 'j F Y', $now ) ); ?></span></div></template>
<?php if ( is_front_page() && ! is_paged() ) :
	$svc = array(
		array( '🛂', 'ভিসা চেক', 'সৌদি, দুবাই, কাতার, মালয়েশিয়া', array( 'ভিসা চেক', 'visa check', 'ভিসা' ) ),
		array( '💼', 'ওয়ার্ক পারমিট', 'ইউরোপ ও গালফে কাজের ভিসা', array( 'ওয়ার্ক', 'work', 'পারমিট' ) ),
		array( '🪪', 'বিএমইটি ও স্মার্ট কার্ড', 'রেজিস্ট্রেশন ও ক্লিয়ারেন্স', array( 'বিএমইটি', 'bmet', 'স্মার্ট কার্ড' ) ),
		array( '🤝', 'প্রবাসী কল্যাণ', 'কল্যাণ কার্ড, বীমা, সহায়তা', array( 'কল্যাণ', 'kallyan', 'welfare' ) ),
		array( '💸', 'রেমিট্যান্স', 'টাকা পাঠানো, প্রণোদনা', array( 'রেমিট্যান্স', 'remittance', 'টাকা' ) ),
		array( '📘', 'পাসপোর্ট', 'ই-পাসপোর্ট, নবায়ন', array( 'পাসপোর্ট', 'passport' ) ),
		array( '🌍', 'দেশভিত্তিক তথ্য', 'ইউরোপ, সৌদি, কাতার আরও', array( 'european', 'ইউরোপ', 'country' ) ),
		array( '🎓', 'ক্যারিয়ার গাইড', 'দক্ষতা, প্রশিক্ষণ, চাকরি', array( 'career', 'ক্যারিয়ার' ) ),
	); ?>
<template id="pi-home"><div class="pi-hero"><div class="pi-w">
	<h2>প্রবাসীদের সব তথ্য, এক জায়গায়</h2>
	<p>ভিসা চেক, ওয়ার্ক পারমিট, বিএমইটি, রেমিট্যান্স রেট, নামাজের সময় আর জরুরি হটলাইন — সহজ বাংলায়, প্রতিদিন হালনাগাদ।</p>
	<form class="pi-hsearch" action="<?php echo esc_url( home_url( '/' ) ); ?>" role="search"><input name="s" type="search" placeholder="খুঁজুন: সৌদি ভিসা চেক, রোমানিয়া ওয়ার্ক পারমিট…" aria-label="খুঁজুন"><button type="submit">খুঁজুন</button></form>
	<div class="pi-chips"><a href="<?php echo esc_url( home_url( '/?s=' . rawurlencode( 'ভিসা চেক' ) ) ); ?>">ভিসা চেক</a><a href="<?php echo esc_url( home_url( '/?s=' . rawurlencode( 'ওয়ার্ক পারমিট' ) ) ); ?>">ওয়ার্ক পারমিট</a><a href="#pi-dash">আজকের রেট</a><a href="#pi-hotline">হটলাইন</a><a href="https://www.probashibondu.online/?utm_source=probashiinfo&utm_medium=hero" target="_blank" rel="noopener">প্রবাস কার্ড বানান</a></div>
</div></div>
<div class="pi-w">
	<section class="pi-sec"><div class="pi-h"><h2>সেবা বাতায়ন</h2></div><div class="pi-services">
	<?php foreach ( $svc as $s ) echo '<a class="pi-svc" href="' . esc_url( pi_service_url( $s[3] ) ) . '"><i>' . $s[0] . '</i><span><b>' . esc_html( $s[1] ) . '</b><small>' . esc_html( $s[2] ) . '</small></span></a>'; ?>
	</div></section>
	<section class="pi-sec" id="pi-dash"><div class="pi-h"><h2>প্রবাসী ড্যাশবোর্ড</h2></div><div class="pi-dash">
		<div class="pi-box"><div class="pi-box-h">💱 আজকের রেমিট্যান্স রেট (টাকায়)<span class="live">লাইভ</span></div>
			<div class="pi-rates" id="pi-rates"></div>
			<div class="pi-calc"><input id="pi-amt" inputmode="decimal" value="1000" aria-label="পরিমাণ"><div class="out" id="pi-out">…<small>বাজার রেট অনুযায়ী আনুমানিক</small></div><button type="button" class="pi-wa" id="pi-wa">WhatsApp এ শেয়ার</button></div>
			<p class="pi-note">বাজার রেট (open.er-api.com, দিনে একবার হালনাগাদ)। ব্যাংক/এক্সচেঞ্জ হাউসের রেট কিছুটা ভিন্ন হয়। বৈধ পথে পাঠালে সরকারি প্রণোদনা পাওয়া যায় (হার পরিবর্তন হতে পারে)। হুন্ডি অবৈধ ও ঝুঁকিপূর্ণ।</p>
		</div>
		<div class="pi-box"><div class="pi-box-h">🕐 প্রবাসের ঘড়ি ও নামাজের সময়<select id="pi-city" aria-label="শহর"></select></div>
			<div class="pi-clocks" id="pi-clocks"></div>
			<div class="pi-pray" id="pi-pray"></div>
			<p class="pi-note">নামাজের সময়: AlAdhan (উম্মুল কুরা পদ্ধতি)। স্থানীয় মসজিদের সময় সামান্য ভিন্ন হতে পারে।</p>
		</div>
	</div></section>
	<section class="pi-sec" id="pi-hotline"><div class="pi-two">
		<div class="pi-box"><div class="pi-box-h">☎ জরুরি হটলাইন ও অফিসিয়াল লিংক</div><ul class="pi-hl">
			<li><a href="tel:16135"><i>📞</i><span><b>প্রবাসী কল্যাণ কল সেন্টার</b><small>প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংস্থান মন্ত্রণালয়</small></span><em>১৬১৩৫</em></a></li>
			<li><a href="tel:999"><i>🚨</i><span><b>জাতীয় জরুরি সেবা (বাংলাদেশ)</b><small>পুলিশ, ফায়ার, অ্যাম্বুলেন্স</small></span><em>৯৯৯</em></a></li>
			<li><a href="https://www.bmet.gov.bd" target="_blank" rel="noopener nofollow"><i>🏛️</i><span><b>বিএমইটি</b><small>bmet.gov.bd — রেজিস্ট্রেশন, ক্লিয়ারেন্স</small></span><em>↗</em></a></li>
			<li><a href="https://www.wewb.gov.bd" target="_blank" rel="noopener nofollow"><i>🤝</i><span><b>ওয়েজ আর্নার্স কল্যাণ বোর্ড</b><small>wewb.gov.bd — কল্যাণ ও সহায়তা</small></span><em>↗</em></a></li>
			<li><a href="https://www.epassport.gov.bd" target="_blank" rel="noopener nofollow"><i>📘</i><span><b>ই-পাসপোর্ট</b><small>epassport.gov.bd — আবেদন ও স্ট্যাটাস</small></span><em>↗</em></a></li>
		</ul><p class="pi-note">ফোন নম্বর ও লিংক অফিসিয়াল উৎস থেকে; পরিবর্তন হলে অফিসিয়াল সাইটে যাচাই করুন।</p></div>
		<div class="pi-box"><div class="pi-box-h">📌 নোটিশ বোর্ড — সর্বশেষ তথ্য<a class="more" href="<?php echo esc_url( home_url( '/' ) ); ?>" style="margin-left:auto;font-size:13px">সব →</a></div><ul class="pi-notice">
		<?php foreach ( get_posts( array( 'numberposts' => 7, 'post_status' => 'publish' ) ) as $p ) {
			$t = get_post_time( 'U', true, $p );
			$m = array( 'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে' );
			echo '<li><span class="d"><b>' . esc_html( pi_bn( wp_date( 'j', $t ) ) ) . '</b>' . esc_html( $m[ (int) wp_date( 'n', $t ) - 1 ] ) . '</span><a href="' . esc_url( get_permalink( $p ) ) . '">' . esc_html( get_the_title( $p ) ) . ( time() - $t < 3 * DAY_IN_SECONDS ? '<span class="pi-new">নতুন</span>' : '' ) . '</a></li>';
		} ?>
		</ul></div>
	</div></section>
</div></template>
<?php endif;
}, 5 );

/* ---------- home: category sections after the latest grid ---------- */
add_action( 'wp_footer', function () {
	if ( ! pi_on() || ! is_front_page() || is_paged() ) return;
	$out = ''; $used = 0;
	foreach ( get_categories( array( 'orderby' => 'count', 'order' => 'DESC', 'hide_empty' => true, 'exclude' => array( 1 ) ) ) as $cat ) {
		if ( $used >= 5 ) break;
		if ( $cat->count < 3 ) continue;
		$posts = get_posts( array( 'numberposts' => 4, 'category' => $cat->term_id ) );
		if ( count( $posts ) < 3 ) continue;
		$used++;
		$list = '';
		foreach ( array_slice( $posts, 1 ) as $p ) $list .= pi_card( $p, 'sm' );
		$out .= '<section class="pi-sec"><div class="pi-h"><h2>' . esc_html( pi_cat_name( $cat ) ) . '</h2><a class="more" href="' . esc_url( get_category_link( $cat ) ) . '">সব দেখুন →</a></div><div class="pi-cat">' . pi_card( $posts[0], 'lg', true ) . '<div class="pi-list">' . $list . '</div></div></section>';
	}
	echo '<template id="pi-sections"><div class="pi-w">' . $out . '</div></template>';
}, 5 );

/* ---------- article: byline + font size + toc on top, help + share + related at the end ---------- */
add_filter( 'the_content', function ( $content ) {
	if ( ! pi_on() || ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) return $content;
	$id = get_the_ID();
	$words = count( preg_split( '/\s+/u', wp_strip_all_tags( $content ) ) );
	$mins = max( 2, (int) round( $words / 200 ) );
	$url = get_permalink(); $title = get_the_title();
	$updated = get_the_modified_time( 'U' ) > get_the_time( 'U' ) + DAY_IN_SECONDS;
	$by = '<div class="pi-byline">' . get_avatar( get_the_author_meta( 'ID' ), 40, '', '' )
		. '<div><b>' . esc_html( get_the_author() ) . '</b>'
		. ( $updated ? 'হালনাগাদ: ' . esc_html( pi_date( get_post_modified_time( 'U', true ) ) ) : 'প্রকাশ: ' . esc_html( pi_date( get_post_time( 'U', true ) ) ) )
		. ' · পড়তে ' . pi_bn( $mins ) . ' মিনিট</div>'
		. '<div class="pi-fsz" aria-label="লেখার আকার"><button type="button" data-fs="-1" aria-label="লেখা ছোট">অ−</button><button type="button" data-fs="1" aria-label="লেখা বড়">অ+</button></div></div>';
	$toc = substr_count( $content, '<h2' ) >= 3 ? '<nav class="pi-toc" aria-label="এই লেখায়" hidden><b>এই লেখায় যা আছে</b><ol></ol></nav>' : '';
	$wa = 'https://wa.me/?text=' . rawurlencode( $title . "\n" . $url );
	$share = '<div class="pi-sharebar"><p>তথ্যটি কাজে লাগলে প্রবাসী ভাই-বোনদের পাঠিয়ে দিন — একজনের উপকার হতে পারে।</p>'
		. '<a class="wa" href="' . esc_url( $wa ) . '" target="_blank" rel="noopener">WhatsApp</a>'
		. '<a class="fb" href="' . esc_url( 'https://www.facebook.com/sharer/sharer.php?u=' . rawurlencode( $url ) ) . '" target="_blank" rel="noopener">Facebook</a>'
		. '<button type="button" class="cp pi-copy">লিংক কপি</button></div>';
	$help = '<div class="pi-help"><i>🆘</i><span><b>বিদেশে বিপদে পড়েছেন?</b><small>প্রবাসী কল্যাণ কল সেন্টারে ফোন করুন, অথবা আপনার দেশের বাংলাদেশ দূতাবাসে যোগাযোগ করুন।</small></span><a href="tel:16135">☎ ১৬১৩৫</a></div>';
	$rel = get_posts( array( 'numberposts' => 3, 'category__in' => wp_get_post_categories( $id ), 'post__not_in' => array( $id ) ) );
	$related = '';
	if ( $rel ) {
		$cards = '';
		foreach ( $rel as $p ) $cards .= pi_card( $p, 'md' );
		$related = '<section class="pi-related"><div class="pi-h"><h2>আরও পড়ুন</h2></div><div class="pi-grid3">' . $cards . '</div></section>';
	}
	return $by . $toc . $content . $share . $help . $related;
}, 31 );

/* ---------- footer, mobile tabs, behaviour ---------- */
add_action( 'wp_footer', function () {
	if ( ! pi_on() ) return;
	$cats = get_categories( array( 'orderby' => 'count', 'order' => 'DESC', 'number' => 8, 'hide_empty' => true ) );
	$c1 = $c2 = '';
	foreach ( $cats as $i => $c ) {
		$li = '<li><a href="' . esc_url( get_category_link( $c ) ) . '">' . esc_html( pi_cat_name( $c ) ) . '</a></li>';
		if ( $i < 4 ) $c1 .= $li; else $c2 .= $li;
	} ?>
<template id="pi-footer"><div class="pi-ft">
	<div><span class="pi-brand"><?php echo pi_logo_svg(); ?><span class="pi-word"><b>প্রবাসী <span>ইনফো</span></b><small>প্রবাসীদের তথ্য বাতায়ন</small></span></span><p>ভিসা, ওয়ার্ক পারমিট, রেমিট্যান্স, বিএমইটি আর প্রবাস জীবনের নির্ভরযোগ্য তথ্য — সহজ বাংলায়, প্রতিদিন।</p></div>
	<div><h4>বিষয়</h4><ul><?php echo $c1; ?></ul></div>
	<div><h4>আরও</h4><ul><?php echo $c2; ?></ul></div>
	<div><h4>প্রবাসীদের জন্য</h4><ul>
		<li><a href="https://www.probashibondu.online/?utm_source=probashiinfo&utm_medium=footer" target="_blank" rel="noopener">প্রবাসী বন্ধু: প্রবাস কার্ড</a></li>
		<li><a href="https://www.probashibondu.online/guide?utm_source=probashiinfo&utm_medium=footer" target="_blank" rel="noopener">প্রবাসে যাবেন? দেশ গাইড</a></li>
		<li><a href="https://dreamintcs.com/?utm_source=probashiinfo&utm_medium=footer" target="_blank" rel="noopener">ড্রিম ইন্টারন্যাশনাল: ওয়ার্ক পারমিট</a></li>
		<li><a href="tel:16135">প্রবাসী কল্যাণ কল সেন্টার ১৬১৩৫</a></li>
	</ul></div>
</div><p class="pi-disc">প্রবাসী ইনফো একটি স্বাধীন তথ্যভিত্তিক ওয়েবসাইট; এটি কোনো সরকারি প্রতিষ্ঠান, দূতাবাস বা রিক্রুটিং এজেন্সির ওয়েবসাইট নয়। ভিসা, ফি ও নিয়ম প্রায়ই বদলায় — আবেদন বা টাকা দেওয়ার আগে অফিসিয়াল সূত্রে যাচাই করুন।</p></template>
<nav class="pi-tabs" aria-label="দ্রুত মেনু">
	<a href="<?php echo esc_url( home_url( '/' ) ); ?>"><i>🏠</i>হোম</a>
	<a href="<?php echo esc_url( home_url( '/#pi-dash' ) ); ?>"><i>💱</i>রেট</a>
	<a class="hot" href="tel:16135"><i>☎</i>হটলাইন</a>
	<button type="button" class="pi-share-now"><i>📤</i>শেয়ার</button>
</nav>
<div class="pi-progress" id="pi-progress" hidden></div>
<script>
(function(){
	var $=function(s){return document.querySelector(s)};
	function put(id, where, how){ var t=document.getElementById(id), w=typeof where==='string'?$(where):where; if(!t||!w) return; var n=t.content.cloneNode(true); if(how==='before') w.parentNode.insertBefore(n,w); else if(how==='prepend') w.insertBefore(n,w.firstChild); else if(how==='after') w.parentNode.insertBefore(n,w.nextSibling); else w.appendChild(n); }
	var util=$('.pi-util'), page=document.getElementById('page'); if(util&&page) page.insertBefore(util,page.firstChild);
	document.querySelectorAll('.cs-header .cs-logo a.cs-logo-default').forEach(function(a){ var t=document.getElementById('pi-brand'); if(t){ a.appendChild(t.content.cloneNode(true)); } });
	put('pi-dates','.cs-header__inner-desktop','prepend');
	put('pi-home','.cs-header','after');
	var grid=$('.cs-posts-area__home'); if(grid){ put('pi-sections', grid.closest('.cs-posts-area')||grid, 'after'); }
	put('pi-footer','.cs-footer .cs-container','prepend');
	var bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})};
	try{ var h=$('#pi-hijri'); if(h) h.textContent=new Intl.DateTimeFormat('bn-BD-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).formatToParts(new Date()).filter(function(p){return p.type!=='era'}).map(function(p){return p.value}).join('').replace(/[,\s]+$/,'')+' হিজরি'; }catch(e){}
	/* toc */
	var toc=$('.pi-toc'); if(toc){ var hs=document.querySelectorAll('.entry-content h2'), ol=toc.querySelector('ol'); hs.forEach(function(x,i){ if(!x.id) x.id='pi-s'+(i+1); var li=document.createElement('li'), a=document.createElement('a'); a.href='#'+x.id; a.textContent=x.textContent; li.appendChild(a); ol.appendChild(li); }); if(hs.length>=3) toc.hidden=false; }
	/* font size, remembered */
	var fs=18.5; try{ fs=parseFloat(localStorage.getItem('pi_fs'))||18.5; }catch(e){}
	var setFs=function(v){ fs=Math.max(15,Math.min(26,v)); document.documentElement.style.setProperty('--pi-fs',fs+'px'); try{localStorage.setItem('pi_fs',fs)}catch(e){} };
	setFs(fs); document.querySelectorAll('.pi-fsz button').forEach(function(b){ b.onclick=function(){ setFs(fs+parseFloat(b.dataset.fs)*1.5); }; });
	/* share */
	var shareNow=function(){ var d={title:document.title,url:location.href.split('#')[0]}; if(navigator.share){ navigator.share(d).catch(function(){}); } else { location.href='https://wa.me/?text='+encodeURIComponent(d.title+'\n'+d.url); } };
	document.querySelectorAll('.pi-share-now').forEach(function(b){ b.onclick=shareNow; });
	document.querySelectorAll('.pi-copy').forEach(function(b){ b.onclick=function(){ try{ navigator.clipboard.writeText(location.href.split('#')[0]); b.textContent='কপি হয়েছে ✓'; }catch(e){} }; });
	var bar=$('#pi-progress'), body=$('.single .entry-content');
	if(bar&&body){ bar.hidden=false; addEventListener('scroll',function(){ var r=body.getBoundingClientRect(), p=Math.min(1,Math.max(0,(innerHeight-r.top)/(r.height))); bar.style.width=(p*100)+'%'; },{passive:true}); }
	/* dashboard */
	var C=[['SAR','সৌদি রিয়াল','Asia/Riyadh','রিয়াদ',24.71,46.68],['AED','আমিরাত দিরহাম','Asia/Dubai','দুবাই',25.2,55.27],['QAR','কাতার রিয়াল','Asia/Qatar','দোহা',25.29,51.53],['KWD','কুয়েতি দিনার','Asia/Kuwait','কুয়েত',29.38,47.98],['OMR','ওমানি রিয়াল','Asia/Muscat','মাস্কাট',23.59,58.38],['MYR','মালয়েশিয়ান রিংগিত','Asia/Kuala_Lumpur','কুয়ালালামপুর',3.14,101.69],['SGD','সিঙ্গাপুর ডলার','Asia/Singapore','সিঙ্গাপুর',1.35,103.82],['EUR','ইউরো','Europe/Rome','রোম',41.9,12.5],['GBP','ব্রিটিশ পাউন্ড','Europe/London','লন্ডন',51.51,-0.13]];
	var rates=$('#pi-rates'); if(rates){
		var sel=0, R=null, amt=$('#pi-amt'), out=$('#pi-out'), wa=$('#pi-wa');
		var paint=function(){ if(!R) return; rates.innerHTML=C.map(function(c,i){ var v=R.BDT/R[c[0]]; return '<button type="button" class="pi-rate'+(i===sel?' on':'')+'" data-i="'+i+'"><span>১ '+c[1]+'</span><b>৳ '+bn(v.toFixed(2))+'</b></button>'; }).join(''); rates.querySelectorAll('.pi-rate').forEach(function(b){ b.onclick=function(){ sel=+b.dataset.i; paint(); calc(); }; }); };
		var calc=function(){ if(!R) return; var c=C[sel], a=parseFloat(String(amt.value).replace(/[^\d.]/g,''))||0, v=a*R.BDT/R[c[0]]; out.innerHTML='৳ '+bn(Math.round(v).toLocaleString('en-IN'))+'<small>'+bn(a)+' '+c[1]+' — বাজার রেটে আনুমানিক</small>'; };
		amt.oninput=calc;
		wa.onclick=function(){ if(!R) return; var lines=C.slice(0,6).map(function(c){ return '১ '+c[1]+' = ৳'+bn((R.BDT/R[c[0]]).toFixed(2)); }).join('\n'); window.open('https://wa.me/?text='+encodeURIComponent('আজকের রেমিট্যান্স রেট ('+new Date().toLocaleDateString('bn-BD')+')\n'+lines+'\n\nলাইভ রেট দেখুন: '+location.origin+'/#pi-dash'),'_blank'); };
		var cached=null; try{ cached=JSON.parse(localStorage.getItem('pi_rates')||'null'); }catch(e){}
		if(cached&&Date.now()-cached.t<6*3600e3){ R=cached.r; paint(); calc(); }
		else fetch('https://open.er-api.com/v6/latest/USD').then(function(r){return r.json()}).then(function(j){ if(j&&j.rates){ R=j.rates; try{localStorage.setItem('pi_rates',JSON.stringify({t:Date.now(),r:R}))}catch(e){} paint(); calc(); } }).catch(function(){ rates.innerHTML='<p class="pi-note">রেট লোড হয়নি — একটু পরে আবার চেষ্টা করুন।</p>'; });
	}
	var clocks=$('#pi-clocks'), city=$('#pi-city'), pray=$('#pi-pray');
	if(clocks&&city){
		city.innerHTML=C.slice(0,6).map(function(c,i){ return '<option value="'+i+'">'+c[3]+'</option>'; }).join('');
		var tick=function(){ var now=new Date(), f=function(tz){ return bn(now.toLocaleTimeString('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit'})); };
			clocks.innerHTML='<div class="bd"><span>বাংলাদেশ</span><b>'+f('Asia/Dhaka')+'</b></div>'+[0,1,2,3,5,7].map(function(i){ return '<div><span>'+C[i][3]+'</span><b>'+f(C[i][2])+'</b></div>'; }).join(''); };
		tick(); setInterval(tick,30000);
		var names={Fajr:'ফজর',Dhuhr:'যোহর',Asr:'আসর',Maghrib:'মাগরিব',Isha:'এশা'};
		var loadPray=function(){ var c=C[+city.value]; pray.innerHTML=''; fetch('https://api.aladhan.com/v1/timings?latitude='+c[4]+'&longitude='+c[5]+'&method=4').then(function(r){return r.json()}).then(function(j){ var t=j&&j.data&&j.data.timings; if(!t) return; var local=new Date().toLocaleTimeString('en-GB',{timeZone:c[2],hour:'2-digit',minute:'2-digit'}), next=null;
			pray.innerHTML=Object.keys(names).map(function(k){ var v=String(t[k]).slice(0,5); var on=!next&&v>local; if(on) next=k; return '<div class="'+(on?'on':'')+'"><span>'+names[k]+'</span><b>'+bn(v)+'</b></div>'; }).join(''); }).catch(function(){}); };
		city.onchange=loadPray; loadPray();
	}
})();
</script>
<?php }, 99 );
