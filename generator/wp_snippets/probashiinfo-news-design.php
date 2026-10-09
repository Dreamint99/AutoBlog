<?php
/* "Probashi News" newspaper redesign on top of the Swyft theme (Code Snippets, front-end).
   PN_PUBLIC false = only logged-in admins see it (safe preview); true = everyone.
   Adds: top date strip, newspaper masthead + nav bar, breaking ticker, serif headlines, BBC-style home
   (lead story, latest grid, category sections, most-read), article byline + reading time + ToC + share +
   related posts, and a newspaper footer. Theme markup is restyled, not replaced, so Ezoic/Rank Math keep working. */
if ( ! defined( 'PN_PUBLIC' ) ) define( 'PN_PUBLIC', true );

function pn_on() { if ( ( function_exists( 'pa_app' ) && pa_app() ) || ( function_exists( 'pi_on' ) && pi_on() ) ) return false;
	if ( is_admin() ) return false;
	return PN_PUBLIC || current_user_can( 'manage_options' );
}
function pn_bn( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); }
function pn_date( $ts ) {
	$m = array( 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর' );
	return pn_bn( wp_date( 'j', $ts ) ) . ' ' . $m[ (int) wp_date( 'n', $ts ) - 1 ] . ' ' . pn_bn( wp_date( 'Y', $ts ) );
}
function pn_weekday( $ts ) {
	$d = array( 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার' );
	return $d[ (int) wp_date( 'w', $ts ) ];
}
function pn_cat_name( $c ) { return trim( preg_replace( '/^[^\p{Bengali}\p{L}]+/u', '', $c->name ) ); } // drop leading emoji
function pn_card( $p, $size = 'md', $thumb = true, $excerpt = false ) {
	$cats = get_the_category( $p->ID ); $cat = $cats ? $cats[0] : null;
	$img = $thumb && has_post_thumbnail( $p ) ? get_the_post_thumbnail( $p, $size === 'xl' ? 'large' : 'medium_large', array( 'loading' => 'lazy', 'alt' => esc_attr( get_the_title( $p ) ) ) ) : '';
	$h = array( 'xl' => 'h-xl', 'lg' => 'h-lg', 'md' => 'h-md', 'sm' => 'h-sm' )[ $size ];
	$tag = $size === 'xl' ? 'h2' : 'h3';
	$o = '<article class="pn-card pn-' . $size . '">';
	if ( $thumb ) $o .= '<a class="pn-thumb' . ( $img ? '' : ' ph' ) . '" href="' . esc_url( get_permalink( $p ) ) . '" tabindex="-1" aria-hidden="true">' . ( $img ?: 'প্রবাসী ইনফো' ) . '</a>';
	$o .= '<div class="pn-text">';
	if ( $cat ) $o .= '<a class="pn-kicker" href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pn_cat_name( $cat ) ) . '</a>';
	$o .= '<' . $tag . ' class="' . $h . '"><a href="' . esc_url( get_permalink( $p ) ) . '">' . esc_html( get_the_title( $p ) ) . '</a></' . $tag . '>';
	if ( $excerpt ) $o .= '<p class="pn-excerpt">' . esc_html( wp_trim_words( get_the_excerpt( $p ), 28, '…' ) ) . '</p>';
	$o .= '<div class="pn-meta"><time datetime="' . esc_attr( get_the_date( 'c', $p ) ) . '">' . esc_html( pn_date( get_post_time( 'U', true, $p ) ) ) . '</time></div>';
	return $o . '</div></article>';
}

/* ---------- styles + fonts ---------- */
add_action( 'wp_head', function () {
	if ( ! pn_on() ) return; ?>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<style id="pn-css">
:root{--pn-ink:#121212;--pn-ink2:#3a3a3a;--pn-muted:#6b6b6b;--pn-line:#e3e3e0;--pn-soft:#f4f4f2;--pn-paper:#fff;--pn-accent:#b80000;--pn-gold:#f2c14e;--pn-head:"Noto Serif Bengali","Hind Siliguri",Georgia,serif;--pn-body:"Hind Siliguri",system-ui,sans-serif}
[data-scheme="dark"]{--pn-ink:#f1f1ef;--pn-ink2:#d4d4d1;--pn-muted:#9a9a96;--pn-line:#2a2d2f;--pn-soft:#17191a;--pn-paper:#111314;--pn-accent:#ff5a5a}
body.pn{font-family:var(--pn-body)!important;background:var(--pn-paper)!important;color:var(--pn-ink)}
body.pn .cs-container{max-width:1240px}
/* top strip */
.pn-top{background:#121212;color:#e9e9e6;font:500 13.5px/1 var(--pn-body)}
.pn-top .pn-w{display:flex;align-items:center;gap:18px;min-height:36px}
.pn-top a{color:#e9e9e6!important}.pn-top a:hover{color:var(--pn-gold)!important}
.pn-top .pn-links{margin-left:auto;display:flex;gap:16px}
@media(max-width:700px){.pn-top .pn-links a:not(.keep){display:none}}
.pn-w{max-width:1240px;margin:0 auto;padding:0 20px}
/* masthead: logo centred on its own row, menu bar under it */
body.pn .cs-header{background:var(--pn-paper)!important;box-shadow:none!important;border-bottom:3px solid var(--pn-ink)}
body.pn .cs-header__inner-desktop{display:grid!important;grid-template-columns:1fr auto 1fr;grid-template-areas:"date logo right" "nav nav nav";height:auto!important;padding:0!important}
body.pn .cs-header__inner-desktop .cs-col-left{grid-area:logo;justify-content:center!important;padding:20px 0 16px}
body.pn .cs-header__inner-desktop .cs-col-center{grid-area:nav;justify-content:center!important;border-top:1px solid var(--pn-line)}
body.pn .cs-header__inner-desktop .cs-col-right{grid-area:right;justify-content:flex-end!important}
body.pn .pn-mh-date{grid-area:date;align-self:center;font-size:14px;color:var(--pn-muted);line-height:1.45}
body.pn .pn-mh-date b{display:block;color:var(--pn-ink);font-weight:600}
body.pn .cs-header__inner-desktop .cs-logo img{max-height:70px!important;width:auto}
body.pn .cs-header__nav-inner>li>a{font:600 16px/1 var(--pn-body)!important;color:var(--pn-ink)!important;padding:15px 13px!important;border-bottom:3px solid transparent;margin-bottom:-3px}
body.pn .cs-header__nav-inner>li>a:hover,body.pn .cs-header__nav-inner>li.current-menu-item>a{border-bottom-color:var(--pn-accent);color:var(--pn-accent)!important}
@media(max-width:1019px){body.pn .cs-header{border-bottom-width:2px}}
/* ticker */
.pn-ticker{border-bottom:1px solid var(--pn-line);background:var(--pn-paper)}
.pn-ticker .pn-w{display:flex;align-items:center;gap:14px;min-height:44px;overflow:hidden}
.pn-ticker .lbl{flex:none;background:var(--pn-accent);color:#fff;font-weight:700;font-size:14px;padding:5px 12px;line-height:1}
.pn-ticker .trk{flex:1;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent);mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)}
.pn-ticker .its{display:flex;gap:42px;width:max-content;animation:pntick 70s linear infinite}
.pn-ticker .its:hover{animation-play-state:paused}
.pn-ticker .its a{white-space:nowrap;font-size:15px;color:var(--pn-ink)!important}
.pn-ticker .its a:before{content:"●";color:var(--pn-accent);font-size:9px;margin-right:10px;vertical-align:2px}
@keyframes pntick{to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.pn-ticker .its{animation:none}}
/* serif headlines everywhere */
body.pn h1,body.pn h2,body.pn h3,body.pn .cs-entry__title{font-family:var(--pn-head)!important;letter-spacing:-.005em}
body.pn .cs-entry__title a:hover{color:var(--pn-accent)!important}
body.pn .cs-meta-category a,body.pn .post-categories a{background:none!important;color:var(--pn-accent)!important;padding:0!important;font:700 13.5px var(--pn-body)!important}
/* home hero: image on top, headline under it (no dark overlay) */
body.pn .cs-home-hero{padding-top:26px!important;margin-bottom:0!important}
body.pn .cs-hero-type-2__container{gap:28px!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__outer{display:flex!important;flex-direction:column;background:none!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__thumbnail{position:relative!important;aspect-ratio:16/9;height:auto!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-overlay-content{position:static!important;padding:14px 0 0!important;color:var(--pn-ink)!important;background:none!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-overlay-background:after,body.pn .cs-hero-type-2__container .cs-entry__featured .cs-overlay-background:before{display:none!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__title{font-size:clamp(26px,3.2vw,40px)!important;line-height:1.28!important;color:var(--pn-ink)!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__title a{color:var(--pn-ink)!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__subtitle{color:var(--pn-ink2)!important;font-size:17px;line-height:1.7}
body.pn .cs-hero-type-2__container .cs-entry__list{border-bottom:1px solid var(--pn-line);padding-bottom:16px}
body.pn .cs-hero-type-2__container .cs-entry__list .cs-entry__title{font-size:18px!important;line-height:1.45!important}
/* latest grid */
body.pn .cs-posts-area__home{gap:26px!important}
body.pn .cs-posts-area__home article .cs-entry__title{font-size:19px!important;line-height:1.45!important}
body.pn .cs-posts-area__home article .cs-entry__excerpt{font-size:15.5px;color:var(--pn-ink2)}
body.pn .cs-posts-area__home article img{transition:transform .5s}
body.pn .cs-posts-area__home article:hover img{transform:scale(1.035)}
/* section heads */
.pn-sec-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;border-top:3px solid var(--pn-ink);padding-top:10px;margin:42px 0 18px}
.pn-sec-head h2{margin:0!important;font:700 24px/1.3 var(--pn-head)!important}
.pn-sec-head h2 a{color:var(--pn-ink)!important}.pn-sec-head h2 a:hover{color:var(--pn-accent)!important}
.pn-sec-head .more{font-size:14px;font-weight:600;color:var(--pn-muted)!important;white-space:nowrap}
body.pn .cs-posts-area__home:before{content:"সর্বশেষ";display:block;grid-column:1/-1;font:700 24px/1.3 var(--pn-head);border-top:3px solid var(--pn-ink);padding-top:10px}
/* our cards (category sections) */
.pn-sections{padding-bottom:10px}
.pn-cat{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:26px}
@media(max-width:860px){.pn-cat{grid-template-columns:minmax(0,1fr)}}
.pn-card .pn-thumb{display:block;position:relative;overflow:hidden;background:var(--pn-soft);aspect-ratio:16/9}
.pn-card .pn-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .5s}
.pn-card:hover .pn-thumb img{transform:scale(1.035)}
.pn-card .pn-thumb.ph{display:grid;place-items:center;color:var(--pn-muted);font:700 20px var(--pn-head)}
.pn-card .pn-text{padding-top:10px}
.pn-kicker{display:inline-block;color:var(--pn-accent)!important;font-weight:700;font-size:13.5px;margin-bottom:4px}
.pn-card .h-xl,.pn-card .h-lg,.pn-card .h-md,.pn-card .h-sm{font-family:var(--pn-head)!important;font-weight:700;margin:0;color:var(--pn-ink)}
.pn-card .h-xl{font-size:clamp(24px,2.6vw,32px);line-height:1.3}.pn-card .h-lg{font-size:22px;line-height:1.38}.pn-card .h-md{font-size:18.5px;line-height:1.45}.pn-card .h-sm{font-size:16px;line-height:1.5}
.pn-card h2 a,.pn-card h3 a{color:var(--pn-ink)!important}.pn-card h2 a:hover,.pn-card h3 a:hover{color:var(--pn-accent)!important}
.pn-excerpt{color:var(--pn-ink2);font-size:15.5px;line-height:1.7;margin:8px 0 0}
.pn-meta{color:var(--pn-muted);font-size:13px;margin-top:6px}
.pn-list{list-style:none;margin:0;padding:0}
.pn-list li{border-bottom:1px solid var(--pn-line);padding:12px 0}.pn-list li:first-child{padding-top:0}
.pn-list .pn-card{display:grid;grid-template-columns:110px minmax(0,1fr);gap:14px}
.pn-list .pn-card .pn-thumb{aspect-ratio:4/3}.pn-list .pn-card .pn-text{padding-top:0}
.pn-grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px}
@media(max-width:1000px){.pn-grid4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.pn-grid4{grid-template-columns:minmax(0,1fr)}}
.pn-dark{background:#121212;color:#eee;padding:6px 0 38px;margin-top:46px}
.pn-dark .pn-sec-head{border-top-color:var(--pn-gold)}.pn-dark .pn-sec-head h2 a,.pn-dark .pn-card h3 a{color:#fff!important}
.pn-dark .pn-kicker{color:var(--pn-gold)!important}.pn-dark .pn-meta{color:#a6a6a2}
.pn-most{list-style:none;margin:0;padding:0;counter-reset:pnm}
.pn-most li{counter-increment:pnm;display:grid;grid-template-columns:38px minmax(0,1fr);gap:10px;padding:12px 0;border-bottom:1px solid var(--pn-line)}
.pn-most li:before{content:counter(pnm);font:800 30px/1 var(--pn-head);color:var(--pn-accent)}
.pn-most a{font:700 16px/1.5 var(--pn-head);color:var(--pn-ink)!important}.pn-most a:hover{color:var(--pn-accent)!important}
.pn-box{border-top:3px solid var(--pn-ink);padding-top:10px;margin-bottom:28px}
.pn-box h3{margin:0 0 10px!important;font:700 20px var(--pn-head)!important}
/* sidebar tidy */
body.pn .cs-sidebar__area .wp-block-heading{font:700 20px var(--pn-head)!important;border-top:3px solid var(--pn-ink);padding-top:10px}
/* article: headline above image, newspaper typography */
body.pn.single .cs-entry__header .cs-entry__outer{display:flex!important;flex-direction:column-reverse;background:none!important;min-height:0!important}
body.pn.single .cs-entry__header .cs-overlay-content{position:static!important;padding:18px 0 16px!important;background:none!important;color:var(--pn-ink)!important;max-width:900px}
body.pn.single .cs-entry__header .cs-overlay-background:before,body.pn.single .cs-entry__header .cs-overlay-background:after{display:none!important}
body.pn.single .cs-entry__header .cs-entry__thumbnail{position:relative!important;aspect-ratio:16/9;height:auto!important}
body.pn.single .cs-entry__header h1.cs-entry__title{font-size:clamp(28px,4vw,46px)!important;line-height:1.28!important;color:var(--pn-ink)!important;font-weight:800!important}
body.pn.single .cs-entry__header .cs-entry__subtitle{color:var(--pn-ink2)!important;font-size:19px;line-height:1.65}
body.pn .entry-content{font-size:18.5px!important;line-height:1.9!important;color:var(--pn-ink)}
body.pn .entry-content h2{font:700 27px/1.4 var(--pn-head)!important;margin:1.7em 0 .6em!important;padding-top:.45em;border-top:1px solid var(--pn-line)}
body.pn .entry-content h3{font:700 22px/1.45 var(--pn-head)!important}
body.pn .entry-content a:not(.pb-card):not(.di-l):not([class]){color:var(--pn-accent);text-decoration:underline;text-underline-offset:3px}
body.pn .entry-content blockquote{border-left:4px solid var(--pn-accent)!important;font:400 21px/1.7 var(--pn-head)}
body.pn .entry-content table{border-collapse:collapse;width:100%;font-size:16px}
body.pn .entry-content th,body.pn .entry-content td{border:1px solid var(--pn-line);padding:10px 12px}
body.pn .entry-content th{background:var(--pn-soft)}
.pn-byline{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--pn-line);border-bottom:1px solid var(--pn-line);margin:0 0 22px;font-size:14px;color:var(--pn-muted)}
.pn-byline img{width:40px;height:40px;border-radius:50%}
.pn-byline b{color:var(--pn-ink);font-size:15px;display:block}
.pn-share{display:flex;gap:6px;margin-left:auto}
.pn-share a,.pn-share button{width:36px;height:36px;border-radius:50%;display:inline-grid;place-items:center;border:1px solid var(--pn-line);background:transparent;color:var(--pn-ink)!important;cursor:pointer;text-decoration:none!important}
.pn-share a:hover,.pn-share button:hover{background:var(--pn-ink);color:var(--pn-paper)!important}
.pn-share svg{width:16px;height:16px}
.pn-toc{border:1px solid var(--pn-line);background:var(--pn-soft);padding:16px 20px;margin:0 0 1.6em;font-size:16px}
.pn-toc b{display:block;font:700 17px var(--pn-head);margin-bottom:6px}
.pn-toc ol{margin:0;padding-left:1.2em}.pn-toc li{margin:4px 0}
.pn-toc a{color:var(--pn-ink2)!important;text-decoration:none!important}.pn-toc a:hover{color:var(--pn-accent)!important}
.pn-related{margin-top:34px}
.pn-related .pn-grid4{grid-template-columns:repeat(3,minmax(0,1fr))}
@media(max-width:700px){.pn-related .pn-grid4{grid-template-columns:minmax(0,1fr)}}
.pn-progress{position:fixed;left:0;top:0;height:3px;background:var(--pn-accent);width:0;z-index:99999}
/* footer */
body.pn .cs-footer{background:#121212!important;color:#cfcfcb!important;margin-top:56px}
body.pn .cs-footer a{color:#e9e9e6!important}body.pn .cs-footer a:hover{color:var(--pn-gold)!important}
.pn-ft{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:32px;padding:44px 0 30px;border-bottom:1px solid #2a2a2a}
@media(max-width:900px){.pn-ft{grid-template-columns:1fr 1fr}}@media(max-width:520px){.pn-ft{grid-template-columns:1fr}}
.pn-ft .wm{font:800 30px/1.1 var(--pn-head);color:#fff}.pn-ft .wm span{color:#ff5a5a}
.pn-ft p{margin:12px 0 0;line-height:1.7;color:#b5b5b1;font-size:15px}
.pn-ft h4{margin:0 0 12px;font:700 16px var(--pn-head);color:#fff;padding-bottom:8px;border-bottom:1px solid #2c2c2c}
.pn-ft ul{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:15px}
.pn-credit{font-size:13.5px;color:#9a9a96;padding:14px 0}.pn-credit b{color:#e9e9e6;font-weight:600}
/* lead story: real image block + compact text (Swyft overlay styles undone) */
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__outer{align-items:stretch!important;min-height:0!important;height:auto!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__outer:before{display:none!important;padding:0!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-entry__thumbnail{width:100%!important;flex:none!important;overflow:hidden}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-overlay-background{position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-overlay-background img{display:block!important;position:absolute;inset:0;width:100%!important;height:100%!important;object-fit:cover}
body.pn .cs-hero-type-2__container .cs-entry__featured .cs-overlay-content{min-height:0!important;height:auto!important;display:block!important}
body.pn.single .cs-entry__header .cs-entry__outer:before{display:none!important}
body.pn.single .cs-entry__header .cs-entry__thumbnail{width:100%!important;flex:none!important;overflow:hidden}
body.pn.single .cs-entry__header .cs-overlay-background{position:absolute!important;inset:0!important}
body.pn.single .cs-entry__header .cs-overlay-background img{display:block!important;position:absolute;inset:0;width:100%!important;height:100%!important;object-fit:cover}
body.pn.single .cs-entry__header .cs-overlay-content{min-height:0!important;height:auto!important}
.pn-top .pn-today{display:none}
/* sticky: only the menu row stays on screen; the logo row scrolls away */
@media(min-width:1020px){body.pn .cs-header.cs-scroll-sticky{top:calc(var(--wp-admin--admin-bar--height,0px) - 107px)!important}}
.pn-card a,.pn-most a,.pn-sec-head a,.pn-ticker a,.pn-top a,.pn-ft a{text-decoration:none!important}
.pn-toc a,.pn-byline a{text-decoration:none!important}
@media(max-width:1019px){body.pn .cs-header__inner-desktop{display:none!important}}
</style>
<?php }, 20 );

add_filter( 'body_class', function ( $c ) { if ( pn_on() ) $c[] = 'pn'; return $c; } );

/* ---------- top strip + ticker + masthead date (moved into place by JS) ---------- */
add_action( 'wp_body_open', function () {
	if ( ! pn_on() ) return;
	$now = current_time( 'timestamp', true ); ?>
<?php if ( is_front_page() ) : ?><h1 class="screen-reader-text">প্রবাসী ইনফো: প্রবাসীদের ভিসা, ওয়ার্ক পারমিট ও বিদেশ যাওয়ার নির্ভরযোগ্য তথ্য</h1><?php endif; ?><div class="pn-top"><div class="pn-w">
	<span class="pn-today"><?php echo esc_html( pn_weekday( $now ) . ', ' . pn_date( $now ) ); ?></span><span>প্রবাসীদের নির্ভরযোগ্য তথ্য, বাংলায়</span>
	<nav class="pn-links" aria-label="দ্রুত লিংক">
		<a class="keep" href="https://www.probashibondu.online/?utm_source=probashiinfo&utm_medium=topstrip" target="_blank" rel="noopener">প্রবাসী বন্ধু</a>
		<a href="https://www.probashibondu.online/guide?utm_source=probashiinfo&utm_medium=topstrip" target="_blank" rel="noopener">দেশ গাইড</a>
		<a href="https://dreamintcs.com/?utm_source=probashiinfo&utm_medium=topstrip" target="_blank" rel="noopener">ওয়ার্ক পারমিট</a>
	</nav>
</div></div>
<template id="pn-mh-date"><div class="pn-mh-date"><b><?php echo esc_html( pn_weekday( $now ) ); ?></b><?php echo esc_html( pn_date( $now ) ); ?></div></template>
<?php
	$latest = get_posts( array( 'numberposts' => 8, 'post_status' => 'publish', 'suppress_filters' => false ) );
	if ( $latest ) {
		$items = '';
		foreach ( $latest as $p ) $items .= '<a href="' . esc_url( get_permalink( $p ) ) . '">' . esc_html( get_the_title( $p ) ) . '</a>';
		echo '<template id="pn-ticker"><div class="pn-ticker"><div class="pn-w"><span class="lbl">সর্বশেষ</span><div class="trk"><div class="its">' . $items . $items . '</div></div></div></div></template>';
	}
}, 5 );

/* ---------- home: category sections + most read, inserted after the latest grid ---------- */
add_action( 'wp_footer', function () {
	if ( ! pn_on() || ! is_front_page() || is_paged() ) return;
	$out = '';
	$used = array();
	foreach ( get_categories( array( 'orderby' => 'count', 'order' => 'DESC', 'hide_empty' => true, 'exclude' => array( 1 ) ) ) as $cat ) {
		if ( count( $used ) >= 4 ) break;
		if ( $cat->count < 3 ) continue;
		$posts = get_posts( array( 'numberposts' => 5, 'category' => $cat->term_id ) );
		if ( count( $posts ) < 3 ) continue;
		$used[] = $cat->term_id;
		$list = '';
		foreach ( array_slice( $posts, 1 ) as $p ) $list .= '<li>' . pn_card( $p, 'sm' ) . '</li>';
		$out .= '<section><div class="pn-sec-head"><h2><a href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pn_cat_name( $cat ) ) . '</a></h2><a class="more" href="' . esc_url( get_category_link( $cat ) ) . '">সব দেখুন →</a></div>'
			. '<div class="pn-cat">' . pn_card( $posts[0], 'lg', true, true ) . '<ul class="pn-list">' . $list . '</ul></div></section>';
	}
	$special = get_posts( array( 'numberposts' => 4, 'category' => 1, 'offset' => 10 ) );
	$dark = '';
	if ( $special ) {
		$cards = '';
		foreach ( $special as $p ) $cards .= pn_card( $p, 'md' );
		$dark = '<div class="pn-dark"><div class="pn-w"><div class="pn-sec-head"><h2><a href="' . esc_url( get_category_link( 1 ) ) . '">স্পেশাল</a></h2><a class="more" href="' . esc_url( get_category_link( 1 ) ) . '" style="color:#bbb!important">সব দেখুন →</a></div><div class="pn-grid4">' . $cards . '</div></div></div>';
	}
	echo '<template id="pn-sections"><div class="pn-sections">' . $out . '</div></template><template id="pn-dark">' . $dark . '</template>';
}, 5 );

/* most read (by comment count, a proxy that needs no tracking) in the sidebar on every page */
add_action( 'wp_footer', function () {
	if ( ! pn_on() ) return;
	$pop = get_posts( array( 'numberposts' => 5, 'orderby' => 'comment_count', 'order' => 'DESC', 'date_query' => array( array( 'after' => '6 months ago' ) ) ) );
	if ( ! $pop ) return;
	$li = '';
	foreach ( $pop as $p ) $li .= '<li><a href="' . esc_url( get_permalink( $p ) ) . '">' . esc_html( get_the_title( $p ) ) . '</a></li>';
	echo '<template id="pn-most"><div class="pn-box"><h3>সবচেয়ে আলোচিত</h3><ol class="pn-most">' . $li . '</ol></div></template>';
}, 6 );

/* ---------- article: byline + share + ToC on top, related posts at the end ---------- */
add_filter( 'the_content', function ( $content ) {
	if ( ! pn_on() || ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) return $content;
	$id = get_the_ID();
	$words = count( preg_split( '/\s+/u', wp_strip_all_tags( $content ) ) );
	$mins = max( 2, (int) round( $words / 200 ) );
	$url = rawurlencode( get_permalink() ); $title = rawurlencode( get_the_title() );
	$updated = get_the_modified_time( 'U' ) > get_the_time( 'U' ) + DAY_IN_SECONDS;
	$by = '<div class="pn-byline">' . get_avatar( get_the_author_meta( 'ID' ), 40, '', '' )
		. '<div><b>' . esc_html( get_the_author() ) . '</b>'
		. ( $updated ? 'আপডেট: <time datetime="' . esc_attr( get_the_modified_date( 'c' ) ) . '">' . esc_html( pn_date( get_post_modified_time( 'U', true ) ) ) . '</time>' : 'প্রকাশ: <time datetime="' . esc_attr( get_the_date( 'c' ) ) . '">' . esc_html( pn_date( get_post_time( 'U', true ) ) ) . '</time>' )
		. ' · পড়তে ' . pn_bn( $mins ) . ' মিনিট</div>'
		. '<div class="pn-share" aria-label="শেয়ার করুন">'
		. '<a href="https://www.facebook.com/sharer/sharer.php?u=' . $url . '" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8V6c0-.9.6-1 1-1h3V1h-4c-4 0-5 3-5 5v2H6v4h3v11h5V12h3.6l.4-4z"/></svg></a>'
		. '<a href="https://wa.me/?text=' . $title . '%20' . $url . '" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.2z"/></svg></a>'
		. '<button type="button" class="pn-copy" aria-label="লিংক কপি করুন"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg></button>'
		. '</div></div>';
	$toc = substr_count( $content, '<h2' ) >= 3 ? '<nav class="pn-toc" aria-label="এই লেখায়" hidden><b>এই লেখায় যা আছে</b><ol></ol></nav>' : '';

	$cats = wp_get_post_categories( $id );
	$rel = get_posts( array( 'numberposts' => 3, 'category__in' => $cats, 'post__not_in' => array( $id ), 'orderby' => 'date' ) );
	$related = '';
	if ( $rel ) {
		$cards = '';
		foreach ( $rel as $p ) $cards .= pn_card( $p, 'md' );
		$related = '<section class="pn-related"><div class="pn-sec-head"><h2>আরও পড়ুন</h2></div><div class="pn-grid4">' . $cards . '</div></section>';
	}
	return $by . $toc . $content . $related;
}, 30 );

/* ---------- footer columns ---------- */
add_action( 'wp_footer', function () {
	if ( ! pn_on() ) return;
	$cats = get_categories( array( 'orderby' => 'count', 'order' => 'DESC', 'number' => 8, 'hide_empty' => true ) );
	$c1 = $c2 = '';
	foreach ( $cats as $i => $c ) {
		$li = '<li><a href="' . esc_url( get_category_link( $c ) ) . '">' . esc_html( pn_cat_name( $c ) ) . '</a></li>';
		if ( $i < 4 ) $c1 .= $li; else $c2 .= $li;
	}
	$desc = get_bloginfo( 'description' ); ?>
<template id="pn-footer"><div class="pn-ft">
	<div><div class="wm">প্রবাসী <span>ইনফো</span></div><p><?php echo esc_html( $desc ); ?> ভিসা, ওয়ার্ক পারমিট, ক্যারিয়ার আর প্রবাস জীবনের নির্ভরযোগ্য তথ্য, বাংলায়।</p></div>
	<div><h4>বিষয়</h4><ul><?php echo $c1; ?></ul></div>
	<div><h4>আরও</h4><ul><?php echo $c2; ?></ul></div>
	<div><h4>প্রবাসীদের জন্য</h4><ul>
		<li><a href="https://www.probashibondu.online/?utm_source=probashiinfo&utm_medium=footer" target="_blank" rel="noopener">প্রবাসী বন্ধু: প্রবাস কার্ড</a></li>
		<li><a href="https://www.probashibondu.online/guide?utm_source=probashiinfo&utm_medium=footer" target="_blank" rel="noopener">প্রবাসে যাবেন? দেশ গাইড</a></li>
		<li><a href="https://dreamintcs.com/?utm_source=probashiinfo&utm_medium=footer" target="_blank" rel="noopener">ড্রিম ইন্টারন্যাশনাল: ওয়ার্ক পারমিট</a></li>
	</ul></div>
</div></template>
<div class="pn-progress" id="pn-progress" hidden></div>
<script>
(function(){
	function put(id, where, how){ var t=document.getElementById(id), w=typeof where==='string'?document.querySelector(where):where; if(!t||!w) return; var n=t.content.cloneNode(true); if(how==='before') w.parentNode.insertBefore(n,w); else if(how==='prepend') w.insertBefore(n,w.firstChild); else if(how==='after') w.parentNode.insertBefore(n,w.nextSibling); else w.appendChild(n); }
	var top=document.querySelector('.pn-top'), page=document.getElementById('page'); if(top&&page) page.insertBefore(top,page.firstChild);
	put('pn-mh-date','.cs-header__inner-desktop','prepend');
	put('pn-ticker','.cs-header','after');
	var grid=document.querySelector('.cs-posts-area__home'); if(grid){ put('pn-sections', grid.closest('.cs-posts-area')||grid, 'after'); }
	put('pn-dark','.cs-site-content','after');
	put('pn-most','.cs-sidebar__inner','prepend');
	put('pn-footer','.cs-footer .cs-container','prepend');
	var toc=document.querySelector('.pn-toc');
	if(toc){ var hs=document.querySelectorAll('.entry-content h2'), ol=toc.querySelector('ol'); hs.forEach(function(h,i){ if(!h.id) h.id='pn-s'+(i+1); var li=document.createElement('li'), a=document.createElement('a'); a.href='#'+h.id; a.textContent=h.textContent; li.appendChild(a); ol.appendChild(li); }); if(hs.length>=3) toc.hidden=false; }
	var cp=document.querySelector('.pn-copy'); if(cp) cp.onclick=function(){ try{ navigator.clipboard.writeText(location.href.split('#')[0]); cp.style.background='#0b5d45'; cp.style.color='#fff'; }catch(e){} };
	var bar=document.getElementById('pn-progress'), body=document.querySelector('.single .entry-content');
	if(bar&&body){ bar.hidden=false; addEventListener('scroll',function(){ var r=body.getBoundingClientRect(), p=Math.min(1,Math.max(0,(innerHeight-r.top)/(r.height))); bar.style.width=(p*100)+'%'; },{passive:true}); }
})();
</script>
<?php }, 99 );
