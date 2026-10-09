<?php
/* প্রবাসী ইনফো — custom web-app front end (v3), replacing the Swyft theme's rendering completely.
   Every front-end view (home, post, category/tag/archive, search, page, 404) is rendered here at
   template_redirect and the request ends; the theme's CSS/JS are dequeued. wp_head()/wp_footer() are
   kept, so Rank Math SEO, analytics and ad scripts keep working. Palette from the logo (blue + green).
   Rollout: PA_APP_PUBLIC false = preview with ?app=1 (cookie; ?app=0 clears) or for admins.
   Snippets #6, #7, #8 and #11 (v2) step aside when pa_app() is on;
   their ads are redrawn here in the same design language. Writer names are not shown. */
if ( ! defined( 'PA_APP_PUBLIC' ) ) define( 'PA_APP_PUBLIC', true );
if ( ! defined( 'PA_APP_VERSION' ) ) define( 'PA_APP_VERSION', '3.5.1' );
define( 'PA_LOGO', 'https://probashiinfo.com/wp-content/uploads/2026/10/probashiinfo-wordmark.webp' );
define( 'PA_ICON', 'https://probashiinfo.com/wp-content/uploads/2026/10/probashiinfo-icon.png' );
define( 'PA_PB', 'https://www.probashibondu.online' );
define( 'PA_DREAM_LOGO', 'https://www.probashibondu.online/dream-logo.png' );

function pa_app() {
	static $on = null;
	if ( $on !== null ) return $on;
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || is_customize_preview() ) return $on = false;
	if ( isset( $_GET['app'] ) ) {
		$want = $_GET['app'] === '1';
		if ( ! headers_sent() ) setcookie( 'pi_app', $want ? '1' : '', $want ? time() + 30 * DAY_IN_SECONDS : time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
		return $on = $want;
	}
	return $on = ( PA_APP_PUBLIC || ! empty( $_COOKIE['pi_app'] ) );
}

add_action( 'init', function () {
	if ( PA_APP_PUBLIC && get_option( 'pa_app_purged' ) !== PA_APP_VERSION ) {
		update_option( 'pa_app_purged', PA_APP_VERSION, false );
		do_action( 'litespeed_purge_all' );
	}
} );

/* ---------- helpers ---------- */
function pa_bn( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); }
function pa_date( $ts, $tz = null ) {
	$m = array( 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর' );
	return pa_bn( wp_date( 'j', $ts, $tz ) ) . ' ' . $m[ (int) wp_date( 'n', $ts, $tz ) - 1 ] . ' ' . pa_bn( wp_date( 'Y', $ts, $tz ) );
}
function pa_weekday( $ts, $tz = null ) {
	$d = array( 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার' );
	return $d[ (int) wp_date( 'w', $ts, $tz ) ];
}
function pa_cat_name( $c ) { return trim( preg_replace( '/^[^\p{Bengali}\p{L}]+/u', '', $c->name ) ); }
function pa_top_cats( $n = 7 ) {
	return get_categories( array( 'orderby' => 'count', 'order' => 'DESC', 'hide_empty' => true, 'number' => $n ) );
}
function pa_thumb( $p, $size = 'medium_large' ) {
	if ( has_post_thumbnail( $p ) ) return get_the_post_thumbnail( $p, $size, array( 'loading' => 'lazy', 'alt' => esc_attr( get_the_title( $p ) ) ) );
	return '<span class="ph">' . pa_mark_svg() . '</span>';
}
function pa_mark_svg() {
	return '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#0b56c4"/><path d="M8 30c8-10 20-14 32-12" stroke="#22c55e" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M30 12l8 2-6 5" fill="#fff"/></svg>';
}
function pa_mins( $p ) { return max( 2, (int) round( count( preg_split( '/\s+/u', wp_strip_all_tags( get_post_field( 'post_content', $p ) ) ) ) / 200 ) ); }
function pa_card( $p, $kind = 'v' ) {
	$cats = get_the_category( $p->ID ); $cat = $cats ? $cats[0] : null;
	$u = esc_url( get_permalink( $p ) );
	$o = '<article class="c c-' . $kind . '"><a class="c-img" href="' . $u . '" tabindex="-1" aria-hidden="true">' . pa_thumb( $p, $kind === 'xl' ? 'large' : 'medium_large' ) . '</a><div class="c-body">';
	if ( $cat ) $o .= '<a class="c-cat" href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pa_cat_name( $cat ) ) . '</a>';
	$o .= '<h3><a href="' . $u . '">' . esc_html( get_the_title( $p ) ) . '</a></h3>';
	if ( $kind === 'xl' ) $o .= '<p>' . esc_html( wp_trim_words( get_the_excerpt( $p ), 30, '…' ) ) . '</p>';
	$o .= '<span class="c-meta">' . esc_html( pa_date( get_post_time( 'U', true, $p ) ) ) . ' · ' . pa_bn( pa_mins( $p ) ) . ' মিনিট</span>';
	return $o . '</div></article>';
}
function pa_search_url( $q ) { return home_url( '/?s=' . rawurlencode( $q ) ); }
function pa_service_url( $words ) {
	foreach ( get_categories( array( 'hide_empty' => true ) ) as $c ) {
		foreach ( $words as $w ) if ( stripos( $c->name . ' ' . $c->slug, $w ) !== false ) return get_category_link( $c );
	}
	return pa_search_url( $words[0] );
}
function pa_after_p( $html, $n, $block ) {
	$pos = -1;
	for ( $i = 0; $i < $n; $i++ ) { $pos = strpos( $html, '</p>', $pos + 1 ); if ( $pos === false ) return $html . $block; }
	return substr( $html, 0, $pos + 4 ) . $block . substr( $html, $pos + 4 );
}

/* ---------- ads in the app's design language ---------- */
function pa_dream( $medium, $title = 'ইউরোপে বৈধভাবে কাজ করতে চান?' ) {
	$u = esc_url( 'https://dreamintcs.com/?utm_source=probashiinfo&utm_medium=' . $medium . '&utm_campaign=dream-international' );
	$wa = esc_url( 'https://wa.me/97471382220?text=' . rawurlencode( 'আসসালামু আলাইকুম, প্রবাসী ইনফো থেকে এসেছি। ইউরোপের ওয়ার্ক পারমিট নিয়ে জানতে চাই।' ) );
	$chips = '';
	foreach ( array( 'সার্বিয়া', 'বসনিয়া', 'গ্রিস', 'পর্তুগাল', 'মলদোভা', 'বুলগেরিয়া' ) as $c ) $chips .= '<span>' . $c . '</span>';
	return '<aside class="ad-dream" aria-label="বিজ্ঞাপন: ড্রিম ইন্টারন্যাশনাল"><span class="ad-tag">স্পন্সরড</span><div class="ad-dream-in">'
		. '<a class="ad-dream-logo" href="' . $u . '" target="_blank" rel="noopener sponsored"><img src="' . esc_url( PA_DREAM_LOGO ) . '" alt="Dream International" width="150" height="39" loading="lazy"></a>'
		. '<div class="ad-dream-txt"><b>' . esc_html( $title ) . '</b><span>ইউরোপের ওয়ার্ক পারমিট — ফাইল হয় সিলেট (বাংলাদেশ) ও দোহা (কাতার) অফিস থেকে, বৈধ ও স্বচ্ছ প্রক্রিয়ায়।</span><div class="ad-chips">' . $chips . '</div></div>'
		. '<div class="ad-dream-cta"><a class="btn btn-g" href="' . $u . '" target="_blank" rel="noopener sponsored">বিস্তারিত দেখুন →</a><a class="btn btn-wa" href="' . $wa . '" target="_blank" rel="noopener sponsored">WhatsApp</a></div>'
		. '</div></aside>';
}
function pa_pb( $medium, $big = false ) {
	$u = esc_url( PA_PB . '/?utm_source=probashiinfo&utm_medium=' . $medium . '&utm_campaign=probashi-bondhu' );
	if ( ! $big ) {
		return '<a class="ad-pb" href="' . $u . '" target="_blank" rel="noopener"><span class="ad-pb-ic">📅</span><span><b>আপনি কত দিন ধরে প্রবাসে?</b><small>প্রবাসী বন্ধুতে হিসাব করুন, নিজের ছবিসহ কার্ড বানিয়ে পরিবারকে পাঠান — ফ্রি</small></span><em>কার্ড বানান →</em></a>';
	}
	$g = esc_url( PA_PB . '/guide?utm_source=probashiinfo&utm_medium=' . $medium );
	$s = esc_url( PA_PB . '/probashi-golpo?utm_source=probashiinfo&utm_medium=' . $medium );
	return '<section class="ad-pb-big"><div><span class="ad-tag light">প্রবাসীদের জন্য ফ্রি</span><h3>প্রবাসী বন্ধু</h3><p>প্রবাস কার্ড, ১৪টি দেশের গাইড, লাইভ সময় ও আবহাওয়া আর প্রবাসীদের সত্যি গল্প — সব এক জায়গায়।</p>'
		. '<div class="ad-pb-links"><a href="' . $u . '" target="_blank" rel="noopener">🖼️ প্রবাস কার্ড</a><a href="' . $g . '" target="_blank" rel="noopener">✈️ দেশ গাইড</a><a href="' . $s . '" target="_blank" rel="noopener">📖 প্রবাসী গল্প</a></div></div>'
		. '<a class="btn btn-w" href="' . $u . '" target="_blank" rel="noopener">ভিজিট করুন →</a></section>';
}

/* ---------- strip the theme ---------- */
add_action( 'wp_enqueue_scripts', function () {
	if ( ! pa_app() ) return;
	foreach ( array( 'styles' => wp_styles(), 'scripts' => wp_scripts() ) as $kind => $reg ) {
		foreach ( (array) $reg->queue as $h ) {
			$src = isset( $reg->registered[ $h ] ) ? (string) $reg->registered[ $h ]->src : '';
			if ( strpos( $src, '/wp-content/themes/' ) !== false ) {
				if ( $kind === 'styles' ) wp_dequeue_style( $h ); else wp_dequeue_script( $h );
			}
		}
	}
}, 999 );

/* ---------- styles ---------- */
function pa_css() { ?>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<meta name="theme-color" content="#0b56c4">
<style id="pi-app-css">
:root{--b:#0b56c4;--b2:#0a3f96;--nv:#082a63;--g:#16a34a;--g2:#22c55e;--gs:#e8f7ee;--bs:#e9f1fd;--red:#e11d48;--gold:#f5b301;--ink:#0f1f38;--ink2:#34465f;--mut:#6a7a93;--line:#e2e8f1;--bg:#f3f6fb;--card:#fff;--head:"Anek Bangla","Hind Siliguri",system-ui,sans-serif;--body:"Hind Siliguri",system-ui,sans-serif;--fs:18.5px;--r:16px;--sh:0 1px 2px rgba(10,40,90,.06),0 8px 24px -16px rgba(10,40,90,.25)}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body.pi-app{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.65 var(--body);-webkit-font-smoothing:antialiased}
.pi-app a{color:inherit;text-decoration:none}.pi-app img{max-width:100%;height:auto}
.pi-app h1,.pi-app h2,.pi-app h3,.pi-app h4{font-family:var(--head);color:var(--ink);margin:0;line-height:1.3}
.w{max-width:1200px;margin:0 auto;padding:0 18px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 18px;border-radius:12px;font:700 15px/1 var(--head);border:0;cursor:pointer;white-space:nowrap}
.btn-g{background:var(--g);color:#fff!important}.btn-g:hover{background:#12873d}
.btn-b{background:var(--b);color:#fff!important}.btn-w{background:#fff;color:var(--nv)!important}
.btn-wa{background:#25d366;color:#053b1d!important}
/* top utility + header */
.util{background:var(--nv);color:#cfe0fb;font-size:13.5px}
.util .w{display:flex;align-items:center;gap:14px;min-height:34px}
.util b{color:#fff;font-weight:600}.util .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--g2);margin-right:6px}
.util .r{margin-left:auto;display:flex;gap:12px;align-items:center}
.util .hot{background:var(--g);color:#fff;padding:3px 10px;border-radius:999px;font-weight:700}
.hdr{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.6) blur(14px);border-bottom:1px solid var(--line)}
.hdr .w{display:flex;align-items:center;gap:18px;height:70px}
.logo img{height:48px;width:auto;display:block}
.nav{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;flex:1}
.nav::-webkit-scrollbar{display:none}
.nav a{flex:none;padding:9px 12px;border-radius:10px;font:600 15.5px/1 var(--head);color:var(--ink2)}
.nav a:hover,.nav a.on{background:var(--bs);color:var(--b)}
.hsrch{display:flex;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:12px;overflow:hidden;width:240px}
.hsrch input{flex:1;min-width:0;border:0;outline:0;background:transparent;padding:10px 12px;font:500 14.5px var(--body);color:var(--ink)}
.hsrch button{border:0;background:transparent;width:40px;height:40px;cursor:pointer;color:var(--mut);font-size:18px}
.datebar{background:#fff;border-bottom:1px solid var(--line)}
.datebar .w{display:flex;gap:8px;align-items:center;min-height:40px;overflow-x:auto;scrollbar-width:none;font-size:13.5px;color:var(--ink2)}
.datebar span{flex:none;padding:4px 10px;border-radius:8px;background:var(--bg);border:1px solid var(--line)}
.datebar .tick{flex:1;min-width:200px;overflow:hidden;white-space:nowrap;-webkit-mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent);mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)}
.datebar .tick div{display:inline-flex;gap:28px;animation:tick 60s linear infinite}
.datebar .tick a{color:var(--ink)}.datebar .tick a:before{content:"●";color:var(--g);font-size:8px;margin-right:8px;vertical-align:2px}
@keyframes tick{to{transform:translateX(-50%)}}
/* sections */
.sec{margin:34px 0 0}
.sh{display:flex;align-items:center;gap:10px;margin:0 0 14px}
.sh h2{font-size:24px;font-weight:800}
.sh:before{content:"";width:6px;height:26px;border-radius:3px;background:linear-gradient(var(--b),var(--g))}
.sh .more{margin-left:auto;font:700 14px var(--head);color:var(--b)}
.box{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px;box-shadow:var(--sh)}
.bh{display:flex;align-items:center;gap:8px;margin-bottom:12px;font:700 17px/1.2 var(--head);color:var(--ink)}
.bh .live{margin-left:auto;display:inline-flex;align-items:center;gap:6px;font:600 12px var(--body);color:var(--g)}
.bh .live:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--g2);animation:ping 1.8s infinite}
@keyframes ping{0%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}70%,100%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}
.note{margin:10px 0 0;font-size:12.5px;line-height:1.5;color:var(--mut)}
/* hero */
.hero{position:relative;overflow:hidden;background:radial-gradient(800px 360px at 90% -10%,rgba(34,197,94,.35),transparent 60%),linear-gradient(120deg,var(--nv),var(--b2) 55%,var(--b));color:#fff;padding:38px 0 34px}
.hero:after{content:"";position:absolute;right:-90px;bottom:-140px;width:460px;height:460px;border-radius:50%;border:70px solid rgba(255,255,255,.05)}
.hero .w{position:relative;z-index:1}
.hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.12) 1.2px,transparent 1.3px);background-size:22px 22px;-webkit-mask-image:radial-gradient(ellipse at 75% 40%,#000 25%,transparent 70%);mask-image:radial-gradient(ellipse at 75% 40%,#000 25%,transparent 70%)}
.hstats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:22px;max-width:760px}
.hstats div{padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(6px)}
.hstats b{display:block;font:800 22px/1.15 var(--head);color:#fff}.hstats span{font-size:13px;color:#cfe0fb}
.ctry{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px}
.ct-tile{display:grid;justify-items:center;gap:8px;padding:14px 8px;border-radius:var(--r);background:var(--card);border:1px solid var(--line);box-shadow:var(--sh);text-align:center;transition:transform .2s,border-color .2s}
.ct-tile:hover{transform:translateY(-3px);border-color:var(--g)}
.ct-tile img{border-radius:5px;box-shadow:0 3px 8px rgba(10,40,90,.2);object-fit:cover}
.ct-tile b{font:700 14.5px/1.3 var(--head)}
.faq{display:grid;gap:10px}
.faq details{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--sh);padding:0 18px}
.faq summary{cursor:pointer;list-style:none;padding:15px 0;font:700 16.5px/1.4 var(--head);display:flex;gap:10px;align-items:center}
.faq summary::-webkit-details-marker{display:none}
.faq summary:before{content:"+";flex:none;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:var(--bs);color:var(--b);font-weight:800}
.faq details[open] summary:before{content:"−";background:var(--g);color:#fff}
.faq p{margin:0 0 15px 38px;color:var(--ink2)}
.hero h1{color:#fff;font-size:clamp(28px,4.4vw,48px);font-weight:800}
.hero p{margin:8px 0 18px;color:#d6e4fb;font-size:17px;max-width:62ch}
.hs{display:flex;max-width:660px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 18px 40px -18px rgba(0,0,0,.45)}
.hs input{flex:1;min-width:0;border:0;outline:0;padding:15px 16px;font:500 16.5px var(--body);color:var(--ink)}
.hs button{border:0;background:var(--g);color:#fff;font:700 16px var(--head);padding:0 22px;cursor:pointer}
.ldot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fff;vertical-align:middle;animation:ldp 1.6s infinite}
@keyframes ldp{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7)}70%{box-shadow:0 0 0 8px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}
.nav a.nav-live{background:var(--red);color:#fff;display:inline-flex;align-items:center;gap:6px}.nav a.nav-live:hover{background:#be123c;color:#fff}
.util .hot-live{background:var(--red)!important;margin-right:6px}
.nav a.nav-fl{background:var(--bs);color:var(--b)}.chips a.chip-fl{background:#0ea5e9;border-color:#0ea5e9;font-weight:700}
.chips a.chip-live{background:var(--red);border-color:var(--red);font-weight:700}
.tabs a.tab-live{color:var(--red)}
.bml{margin:-18px 0 0;position:relative;z-index:2}
.bml-in{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:18px;align-items:center;background:linear-gradient(120deg,#061f4d,#0a3f97);color:#fff;border-radius:20px;padding:18px 22px;box-shadow:0 20px 40px -24px rgba(8,42,99,.7);border:1px solid rgba(255,255,255,.12);text-decoration:none}
.bml-in:hover{transform:translateY(-1px)}
.bml-tag{display:inline-flex;align-items:center;gap:7px;background:var(--red);border-radius:999px;padding:3px 11px;font:700 13px var(--body)}
.bml h2{color:#fff;font-size:22px;margin:8px 0 0}.bml p{margin:2px 0;color:#bcd3fb;font-size:14.5px}
.bml-n,.bml-n b{font:800 44px/1.1 var(--head);color:#fff!important}.bml-n small{font-size:15px;color:#bcd3fb;font-weight:600;margin-left:6px}
.bml-top{display:flex;flex-wrap:wrap;gap:8px}.bml-top span{color:#fff!important;display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:5px 11px;font-size:14px}
.bml-top img{width:20px;height:14px;border-radius:2px;object-fit:cover}.bml-top b{color:#86efac}
.bml-y{margin:10px 0 4px!important}.bml-y b{color:#fff}
.bml-cta{display:inline-block;margin-top:6px;background:var(--g2);color:#053b1d;font-weight:700;border-radius:10px;padding:8px 12px;font-size:14.5px}
@media(max-width:760px){.bml-in{grid-template-columns:minmax(0,1fr)}.bml-n{font-size:38px}}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.chips a{padding:7px 13px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.24);color:#fff;font-size:14px}
.chips a:hover{background:rgba(255,255,255,.22)}
/* services */
.svcs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.svc{display:grid;grid-template-columns:50px 1fr;gap:12px;align-items:center;padding:16px;border-radius:var(--r);background:var(--card);border:1px solid var(--line);box-shadow:var(--sh);transition:transform .2s,border-color .2s}
.svc:hover{transform:translateY(-3px);border-color:var(--b)}
.svc i{width:50px;height:50px;border-radius:14px;display:grid;place-items:center;font-style:normal;font-size:24px;background:linear-gradient(150deg,var(--bs),var(--gs))}
.svc b{display:block;font:700 16.5px/1.3 var(--head)}.svc small{display:block;font-size:13px;color:var(--mut);line-height:1.4}
/* dashboard */
.dash{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px}
.rates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rate{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:12px;background:var(--bg);border:1px solid var(--line);cursor:pointer;font-family:var(--body)}
.rate.on{border-color:var(--b);background:var(--bs)}
.rate span{display:block;font-size:12.5px;color:var(--mut)}.rate b{display:block;font:800 19px/1.25 var(--head);color:var(--ink)}
.calc{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px;padding:12px;border-radius:12px;background:linear-gradient(120deg,var(--nv),var(--b));color:#fff}
.calc input{width:130px;border:0;border-radius:10px;padding:11px 12px;font:700 18px var(--head);color:var(--ink)}
.calc .out{font:800 24px/1.1 var(--head)}.calc .out small{display:block;font:500 12.5px var(--body);color:#cfe0fb;margin-top:3px}
.calc .btn{margin-left:auto}
.clocks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.clocks div{padding:9px 10px;border-radius:12px;background:var(--bg);border:1px solid var(--line)}
.clocks span{display:block;font-size:12.5px;color:var(--mut)}.clocks b{font:800 18px/1.2 var(--head);font-variant-numeric:tabular-nums}
.clocks .bd{background:var(--gs);border-color:#bfe8cd}
.pray{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:10px}
.pray div{text-align:center;padding:8px 4px;border-radius:10px;border:1px solid var(--line);background:#fff}
.pray span{display:block;font-size:12px;color:var(--mut)}.pray b{font:700 15px var(--head)}
.pray .on{background:var(--g);border-color:var(--g)}.pray .on span,.pray .on b{color:#fff}
.box select{margin-left:auto;border:1px solid var(--line);border-radius:8px;padding:6px 8px;font:600 13.5px var(--body);background:#fff;color:var(--ink)}
/* cards */
.c{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column}
.c:hover{transform:translateY(-3px);box-shadow:0 18px 36px -20px rgba(10,40,90,.35)}
.c-img{display:block;aspect-ratio:16/9;overflow:hidden;background:linear-gradient(135deg,var(--bs),var(--gs))}
.c-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s}
.c:hover .c-img img{transform:scale(1.05)}
.c-img .ph{display:grid;place-items:center;width:100%;height:100%}.c-img .ph svg{width:56px;height:56px;opacity:.6}
.c-body{padding:13px 15px 15px;display:flex;flex-direction:column;gap:6px;flex:1}
.c-cat{align-self:flex-start;font:700 12.5px/1 var(--head);color:var(--b);background:var(--bs);padding:5px 9px;border-radius:999px}
.c h3{font-size:17.5px;font-weight:700;line-height:1.45}.c h3 a:hover{color:var(--b)}
.c p{margin:0;color:var(--ink2);font-size:15px;line-height:1.65}
.c-meta{margin-top:auto;font-size:12.5px;color:var(--mut)}
.c-xl h3{font-size:clamp(22px,2.6vw,30px);line-height:1.35}
.c-h{flex-direction:row}.c-h .c-img{flex:none;width:130px;aspect-ratio:auto}.c-h .c-body{padding:10px 12px}.c-h h3{font-size:15.5px}
.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.lead{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:14px}
.lead .list{display:grid;gap:10px}
.rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,1fr);gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px;scrollbar-width:thin}
.rail .c{scroll-snap-align:start}
/* notice + hotline */
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:14px}
.hl{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.hl a{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--bg);border:1px solid var(--line)}
.hl i{width:42px;height:42px;border-radius:10px;display:grid;place-items:center;font-style:normal;background:#fff;font-size:20px}
.hl b{font:700 15.5px/1.3 var(--head)}.hl small{display:block;font-size:12.5px;color:var(--mut)}
.hl em{font:800 17px var(--head);font-style:normal;color:var(--red)}
.ntc{list-style:none;margin:0;padding:0}
.ntc li{display:grid;grid-template-columns:60px 1fr;gap:12px;padding:10px 0;border-bottom:1px dashed var(--line)}
.ntc .d{text-align:center;border-radius:10px;background:var(--b);color:#fff;padding:6px 0;font:700 13px/1.15 var(--head)}
.ntc .d b{display:block;font-size:20px}
.ntc a{font:600 16px/1.45 var(--head)}.ntc a:hover{color:var(--b)}
.new{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:var(--g);color:#fff;font:700 11px/1.6 var(--body);vertical-align:2px}
/* ads */
.ad-tag{display:inline-block;font:700 11px/1 var(--body);letter-spacing:.06em;color:var(--mut);background:var(--bg);border:1px solid var(--line);padding:4px 8px;border-radius:999px;margin-bottom:10px}
.ad-tag.light{color:#d6f5e1;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2)}
.ad-dream{margin:26px 0;padding:18px;border-radius:var(--r);background:#fff;border:1px solid var(--line);border-left:6px solid #e31e24;box-shadow:var(--sh)}
.ad-dream-in{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:18px;align-items:center}
.ad-dream-logo{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px 12px;line-height:0}
.ad-dream-logo img{width:140px}
.ad-dream-txt b{display:block;font:800 19px/1.35 var(--head);color:var(--ink)}
.ad-dream-txt span{display:block;font-size:14.5px;color:var(--ink2);margin-top:4px}
.ad-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ad-chips span{font-size:12.5px;padding:3px 10px;border-radius:999px;background:#fdecec;color:#9b1c1f;margin:0}
.ad-dream-cta{display:grid;gap:8px}
.ad-pb{display:flex;gap:14px;align-items:center;margin:24px 0;padding:16px 18px;border-radius:var(--r);background:linear-gradient(120deg,#e9f1fd,#e8f7ee);border:1px solid #cfe0f6}
.ad-pb-ic{flex:none;width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:#fff}
.ad-pb b{display:block;font:800 17px/1.35 var(--head);color:var(--nv)}.ad-pb small{display:block;color:var(--ink2);font-size:14px}
.ad-pb em{flex:none;margin-left:auto;font-style:normal;background:var(--g);color:#fff;font:700 14.5px var(--head);padding:11px 15px;border-radius:12px}
.ad-pb-big{display:flex;gap:18px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:24px;border-radius:20px;background:radial-gradient(600px 220px at 90% 0,rgba(34,197,94,.35),transparent 60%),linear-gradient(120deg,var(--nv),var(--b2));color:#fff}
.ad-pb-big h3{color:#fff;font-size:28px;font-weight:800}.ad-pb-big p{margin:6px 0 12px;color:#d6e4fb;max-width:60ch}
.ad-pb-links{display:flex;flex-wrap:wrap;gap:8px}.ad-pb-links a{padding:8px 13px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);color:#fff;font-size:14px}
/* article */
.art-hd{background:#fff;border-bottom:1px solid var(--line);padding:22px 0 0}
.crumbs{display:flex;flex-wrap:wrap;gap:6px;font-size:13.5px;color:var(--mut);margin-bottom:12px}.crumbs a{color:var(--b)}
.art-hd h1{font-size:clamp(28px,4.2vw,44px);font-weight:800;line-height:1.3;max-width:920px}
.art-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 18px;font-size:14px;color:var(--mut)}
.art-meta .pill{padding:5px 10px;border-radius:999px;background:var(--bs);color:var(--b);font-weight:700}
.fsz{margin-left:auto;display:flex;gap:4px}.fsz button{width:38px;height:34px;border-radius:9px;border:1px solid var(--line);background:#fff;color:var(--ink);font:700 14px var(--head);cursor:pointer}
.art-img{margin:0;border-radius:18px 18px 0 0;overflow:hidden;max-width:920px;aspect-ratio:16/9;background:var(--bs)}
.art-img img{width:100%;height:100%;object-fit:cover;display:block}
.art{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:28px;align-items:start;margin-top:22px}
.art-main{min-width:0;background:#fff;border:1px solid var(--line);border-radius:var(--r);padding:26px 28px;box-shadow:var(--sh)}
.toc{border:1px solid var(--line);background:var(--bg);border-radius:12px;padding:14px 18px;margin:0 0 1.4em}
.toc b{display:block;font:800 16.5px var(--head);margin-bottom:6px;color:var(--b)}
.toc ol{margin:0;padding:0;list-style:none;display:grid;gap:4px}.toc li{margin:0;padding-left:16px;position:relative}.toc li:before{content:"";position:absolute;left:0;top:.75em;width:7px;height:7px;border-radius:50%;background:var(--g)}.toc a{color:var(--ink2)}.toc a:hover{color:var(--b)}
.ct{font-size:var(--fs);line-height:1.9;color:var(--ink);overflow-wrap:anywhere}
.ct p{margin:0 0 1.05em}
.ct h2{font-size:26px;font-weight:800;margin:1.6em 0 .6em;padding:10px 14px;border-radius:12px;background:var(--bs);border-left:5px solid var(--b);line-height:1.4}
.ct h3{font-size:21px;font-weight:700;margin:1.4em 0 .5em;color:var(--b2)}
.ct a:not([class]){color:var(--b);text-decoration:underline;text-underline-offset:3px}
.ct img{border-radius:12px;margin:10px 0}
.ct ul,.ct ol{padding-left:1.4em}.ct li{margin:.3em 0}
.ct table{border-collapse:collapse;width:100%;font-size:16px;display:block;overflow-x:auto;margin:1em 0}
.ct th,.ct td{border:1px solid var(--line);padding:10px 12px;text-align:left}
.ct th{background:var(--b);color:#fff}.ct tr:nth-child(even) td{background:var(--bg)}
.ct blockquote{margin:1.2em 0;padding:12px 16px;border-left:5px solid var(--g);background:var(--gs);border-radius:0 12px 12px 0}
.ct figure{margin:1em 0}.ct figcaption{font-size:13.5px;color:var(--mut);text-align:center}
.share{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:26px 0 0;padding:16px;border-radius:14px;background:linear-gradient(120deg,var(--nv),var(--b));color:#fff}
.share p{margin:0;flex:1 1 230px;font:700 16.5px/1.45 var(--head);color:#fff}
.share .btn{min-height:42px;padding:0 14px}.share .fb{background:#1877f2;color:#fff!important}.share .cp{background:rgba(255,255,255,.16);color:#fff!important}
.help{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin:18px 0 0;padding:14px 16px;border-radius:14px;border:1px solid #f6c3cf;background:#fff1f4}
.help i{font-style:normal;font-size:26px}.help b{font:700 16px var(--head)}.help small{display:block;color:var(--mut);font-size:13px}
.help a{background:var(--red);color:#fff;padding:10px 14px;border-radius:10px;font:700 15px var(--head);white-space:nowrap}
.side{display:grid;gap:14px;position:sticky;top:86px}
.mini li{list-style:none}.mini{margin:0;padding:0;display:grid;gap:10px}
.mini a{display:grid;grid-template-columns:30px 1fr;gap:10px;font:600 15px/1.45 var(--head)}
.mini a:hover{color:var(--b)}
.mini .n{font:800 22px/1 var(--head);color:var(--g)}
.mrates{display:grid;gap:6px}.mrates div{display:flex;justify-content:space-between;padding:8px 10px;border-radius:10px;background:var(--bg);font-size:14.5px}.mrates b{font-family:var(--head)}
.progress{position:fixed;left:0;top:0;height:4px;width:0;background:linear-gradient(90deg,var(--b),var(--g2));z-index:100}
/* archive */
.arch-hd{background:linear-gradient(120deg,var(--nv),var(--b2));color:#fff;padding:30px 0}
.arch-hd h1{color:#fff;font-size:clamp(26px,3.6vw,40px);font-weight:800}.arch-hd p{color:#d6e4fb;margin:6px 0 0;max-width:70ch}
.pager{display:flex;justify-content:center;margin:28px 0 0}
.pager ul{list-style:none;display:flex;gap:6px;flex-wrap:wrap;margin:0;padding:0}
.pager a,.pager span{display:grid;place-items:center;min-width:42px;height:42px;padding:0 12px;border-radius:12px;background:#fff;border:1px solid var(--line);font:700 15px var(--head)}
.pager .current{background:var(--b);color:#fff;border-color:var(--b)}
.empty{padding:40px 20px;text-align:center;color:var(--mut)}
/* footer */
.ft{margin-top:56px;background:var(--nv);color:#c6d6f0;padding:40px 0 26px}
.ft-g{display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:26px}
.ft .flogo{display:inline-block;background:#fff;border-radius:14px;padding:8px 12px}.ft .flogo img{height:46px;display:block}
.ft p{color:#b5c8e8;font-size:14.5px;line-height:1.7;margin:12px 0 0}
.ft h4{color:var(--g2);font-size:16px;margin:0 0 12px}
.ft ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:15px}.ft ul a:hover{color:#fff}
.ft-disc{margin:26px 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,.12);font-size:13px;color:#9fb5d9;line-height:1.6}
.ft-base{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:10px;font-size:13px;color:#9fb5d9}
.ft-base a{margin-right:14px}
/* mobile tabs */
.tabs{display:none}
@media(max-width:1020px){.nav{display:none}.hsrch{margin-left:auto}.art{grid-template-columns:minmax(0,1fr)}.side{position:static}.grid4{grid-template-columns:repeat(2,minmax(0,1fr))}.svcs{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1020px){.ctry{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:860px){.dash,.two,.lead{grid-template-columns:minmax(0,1fr)}.grid3{grid-template-columns:repeat(2,minmax(0,1fr))}.ft-g{grid-template-columns:1fr 1fr}.ad-dream-in{grid-template-columns:1fr}.ad-dream-cta{grid-auto-flow:column}}
@media(max-width:640px){
 .w{padding:0 14px}.hdr .w{height:60px;gap:10px}.logo img{height:38px}.hsrch{width:auto;flex:1;max-width:190px}
 .util .hide{display:none}.grid3,.grid4{grid-template-columns:minmax(0,1fr)}.rates{grid-template-columns:repeat(2,minmax(0,1fr))}.clocks{grid-template-columns:repeat(2,minmax(0,1fr))}.pray{grid-template-columns:repeat(3,minmax(0,1fr))}
 .svc{grid-template-columns:1fr;gap:8px}.hstats{grid-template-columns:repeat(2,minmax(0,1fr))}.ctry{grid-template-columns:repeat(3,minmax(0,1fr))}.svc i{width:44px;height:44px}.ft-g{grid-template-columns:1fr}
 .art-main{padding:18px 16px;border-radius:0;margin:0 -14px;border-left:0;border-right:0}.art-img{border-radius:0;margin:0 -14px}
 .ad-pb{flex-wrap:wrap}.ad-pb em{margin-left:0;width:100%;text-align:center}
 .tabs{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:8px;right:8px;bottom:8px;z-index:60;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 14px 34px rgba(10,40,90,.25);padding:5px}
 .tabs a,.tabs button{display:grid;justify-items:center;gap:2px;padding:7px 0;border:0;background:none;border-radius:12px;color:var(--mut);font:700 11.5px var(--body);cursor:pointer}
 .tabs i{font-style:normal;font-size:20px;line-height:1}.tabs .hot{background:var(--b);color:#fff}
 body.pi-app{padding-bottom:78px}
}
@media(prefers-reduced-motion:reduce){.datebar .tick div{animation:none}}


/* ---------- home hero v2 ---------- */
.hero2{position:relative;overflow:hidden;color:#fff;background:radial-gradient(900px 420px at 92% -10%,rgba(34,197,94,.30),transparent 60%),radial-gradient(700px 400px at -10% 110%,rgba(56,189,248,.25),transparent 60%),linear-gradient(135deg,var(--nv),var(--b2) 60%,var(--b))}
.hero2 .w{position:relative;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr);gap:28px;padding-top:34px;padding-bottom:40px;align-items:center}
.h2k{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 12px;font-size:13.5px;font-weight:600}
.hero2 h1{color:#fff;font-size:clamp(30px,4.6vw,50px);font-weight:800;margin:12px 0 8px;line-height:1.15}
.hero2 p{margin:0 0 18px;color:#d6e4fb;font-size:17px;max-width:58ch}
.h2t{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.ht{display:flex;flex-direction:column;gap:6px;position:relative;padding:14px;border-radius:18px;text-decoration:none;color:#fff!important;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.18);transition:transform .15s,background .15s}
.ht:hover{transform:translateY(-2px);background:rgba(255,255,255,.16)}
.ht-r{background:linear-gradient(140deg,rgba(225,29,72,.95),rgba(190,18,60,.95));border-color:transparent}
.ht-i{font-size:26px;line-height:1}.ht-b{display:flex;flex-direction:column}.ht-b small{font-size:12.5px;opacity:.85;display:flex;align-items:center;gap:6px}
.ht-b b{font:800 21px/1.2 var(--head);margin:2px 0}.ht-b em{font-style:normal;font-size:13px;opacity:.85}
.ht-go{position:absolute;right:12px;top:12px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font-weight:800}
.h2p{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:14px}.h2p span{font-size:13.5px;color:#bcd3fb}
.h2p a{padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);color:#fff!important;font-size:14px;text-decoration:none}.h2p a:hover{background:rgba(255,255,255,.18)}
.h2r{background:#fff;color:var(--ink);border-radius:22px;padding:16px;box-shadow:0 30px 60px -30px rgba(0,0,0,.55)}
.gl-h{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:6px}.gl-h b{font:800 18px var(--head);width:100%}.gl-h span{font-size:13px;color:var(--mut)}
.gl-r a{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:center;padding:8px 4px;border-bottom:1px dashed var(--line);color:var(--ink)!important;text-decoration:none;font-size:15px}
.gl-r a:hover{background:var(--bg)}.gl-r img{width:24px;height:17px;border-radius:3px;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.08)}.gl-r b{font:800 17px var(--head);color:var(--b2)}
.gl-b{display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin-top:10px;padding:10px 12px;border-radius:14px;background:#fff1f2;border:1px solid #fecdd3;color:var(--ink)!important;text-decoration:none}
.gl-b span{font-size:13px;color:#9f1239;font-weight:700}.gl-b b{grid-row:1/3;grid-column:2;align-self:center;font:800 22px var(--head);color:#be123c}.gl-b small{font-size:12.5px;color:var(--mut)}
.gl-all{display:block;text-align:center;margin-top:10px;font-weight:700;font-size:14px}
.srch2 button{white-space:nowrap;flex:none;width:auto!important;height:auto!important;color:#fff!important}
@media(max-width:1020px){.hero2 .w{grid-template-columns:minmax(0,1fr)}}
@media(max-width:640px){.h2t{grid-template-columns:minmax(0,1fr)}.ht{flex-direction:row;align-items:center;gap:12px;padding:12px 44px 12px 12px}.ht-go{top:50%;transform:translateY(-50%)}.hero2 .w{padding-top:22px}}
/* ---------- header v2: logo + search + tools, category bar, mobile drawer ---------- */
.hdr2{position:sticky;top:0;z-index:60;background:rgba(255,255,255,.97);backdrop-filter:saturate(1.6) blur(14px);-webkit-backdrop-filter:saturate(1.6) blur(14px);box-shadow:0 1px 0 var(--line),0 8px 24px -20px rgba(10,40,90,.35)}
.hdr2 .top{display:flex;align-items:center;gap:18px;height:84px;transition:height .25s}
.hdr2.sm .top{height:64px}
.logo2{flex:none;display:block}.logo2 img{height:60px;width:auto;display:block;transition:height .25s}.hdr2.sm .logo2 img{height:44px}
.srch2{flex:1;max-width:540px;display:flex;align-items:center;gap:6px;background:var(--bg);border:2px solid var(--line);border-radius:999px;padding:4px 4px 4px 14px;transition:border-color .2s,box-shadow .2s}
.srch2:focus-within{border-color:var(--b);box-shadow:0 0 0 4px rgba(11,86,196,.12);background:#fff}
.srch2 span{font-size:16px;opacity:.6}.srch2 input{flex:1;min-width:0;border:0;outline:0;background:transparent;padding:9px 4px;font:500 15px var(--body);color:var(--ink)}
.srch2 button{border:0;background:linear-gradient(135deg,var(--b),var(--b2));color:#fff;border-radius:999px;padding:9px 18px;font:700 14.5px var(--body);cursor:pointer}
.tools2{display:flex;gap:8px;margin-left:auto;flex:none}
.tl{display:grid;grid-template-columns:auto auto;grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:7px 13px;border-radius:14px;border:1px solid var(--line);background:#fff;color:var(--ink)!important;text-decoration:none;transition:transform .15s,box-shadow .15s}
.tl:hover{transform:translateY(-1px);box-shadow:0 8px 20px -12px rgba(10,40,90,.5)}
.tl i,.tl .ldot{grid-row:1/3;font-style:normal;font-size:21px;line-height:1}.tl .ldot{width:10px;height:10px;margin:0 4px}
.tl b{font:700 14.5px/1.15 var(--head)}.tl small{font-size:11.5px;color:var(--mut);line-height:1.2}
.tl.live{background:linear-gradient(135deg,#e11d48,#be123c);color:#fff!important;border-color:transparent}.tl.live small{color:#ffe4e6}
.cat2{background:linear-gradient(90deg,var(--nv),var(--b2) 70%,var(--b))}
.cat2 .w{display:flex;align-items:stretch;gap:2px;height:46px}
.cat2 a{color:#dbe7ff!important;padding:0 14px;display:flex;align-items:center;font:600 15px var(--head);border-bottom:3px solid transparent;white-space:nowrap;text-decoration:none}
.cat2 a:hover,.cat2 a.on{color:#fff!important;border-bottom-color:var(--g2);background:rgba(255,255,255,.07)}
.more{position:relative;margin-left:auto;display:flex}.more>button{border:0;background:transparent;color:#dbe7ff;font:600 15px var(--head);padding:0 14px;cursor:pointer}
.more:hover>button,.more.open>button{color:#fff;background:rgba(255,255,255,.07)}
.more .dd{position:absolute;right:0;top:100%;z-index:70;background:#fff;border-radius:0 0 16px 16px;box-shadow:0 20px 40px -14px rgba(10,40,90,.45);padding:8px;min-width:240px;display:none;grid-template-columns:1fr 1fr;gap:2px}
.more:hover .dd,.more.open .dd{display:grid}.more .dd a{color:var(--ink)!important;border:0;padding:9px 12px;border-radius:10px;font-size:14.5px}.more .dd a:hover{background:var(--bs);color:var(--b)!important}
.burger{display:none;flex:none;width:44px;height:44px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer;padding:12px 11px;flex-direction:column;justify-content:space-between}
.burger span{display:block;height:2.5px;border-radius:2px;background:var(--nv)}
.drw[hidden]{display:none}.drw{position:fixed;inset:0;z-index:2000}.drw-bg{position:absolute;inset:0;background:rgba(7,26,58,.55);backdrop-filter:blur(3px)}
.drw-in{position:absolute;top:0;right:0;bottom:0;width:min(360px,88vw);background:#fff;overflow:auto;padding:16px;animation:drwin .25s ease-out;box-shadow:-20px 0 40px -20px rgba(0,0,0,.4)}
@keyframes drwin{from{transform:translateX(100%)}}
.drw-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.drw-h img{height:44px;width:auto}
.drw-x{border:0;background:var(--bg);width:40px;height:40px;border-radius:50%;font-size:16px;cursor:pointer}
.drw-t{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.drw-t a{display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 6px;border-radius:14px;background:var(--bg);color:var(--ink)!important;text-decoration:none;text-align:center}
.drw-t a.live{background:linear-gradient(135deg,#e11d48,#be123c);color:#fff!important}.drw-t i{font-style:normal;font-size:24px}.drw-t b{font:700 14px var(--head)}.drw-t small{font-size:11px;opacity:.8}
.drw-in h4{margin:18px 0 6px;font:700 13px var(--body);color:var(--mut);letter-spacing:.3px}
.drw-c{display:grid;gap:2px}.drw-c a{display:flex;gap:8px;align-items:center;padding:11px 12px;border-radius:12px;color:var(--ink)!important;font:600 15.5px var(--head);text-decoration:none}.drw-c a:hover,.drw-c a.on{background:var(--bs);color:var(--b)!important}
.drw-c span{margin-left:auto;font-size:12px;color:var(--mut);background:var(--bg);border-radius:999px;padding:1px 8px}
.drw-p{display:grid;gap:8px;margin-top:16px}.drw-p a{display:block;padding:11px 12px;border-radius:12px;background:var(--gs);color:var(--g)!important;font-weight:700;text-decoration:none}.drw-p a+a{background:#fff7ed;color:#c2410c!important}
@media(max-width:1180px){.tl small{display:none}.tl{padding:8px 11px}}
@media(max-width:1020px){.tools2,.cat2{display:none}.burger{display:flex}.srch2{max-width:none}}
@media(max-width:640px){.util{display:none}.hdr2 .top{height:64px;gap:10px}.logo2 img{height:40px}.hdr2.sm .logo2 img{height:36px}.srch2{padding:3px 3px 3px 10px}.srch2 button{padding:8px 12px;font-size:0}.srch2 button:after{content:"🔍";font-size:15px}.srch2 span{display:none}.srch2 input{font-size:14px}}
</style>
<?php }

/* ---------- shell ---------- */
function pa_head() {
	$now = current_time( 'timestamp', true ); ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<?php pa_css(); wp_head(); ?>
</head>
<body <?php body_class( 'pi-app' ); ?>>
<?php wp_body_open(); ?>
<div class="util"><div class="w"><span><span class="dot"></span><b>স্বাধীন তথ্যসেবা</b><span class="hide"> — এটি সরকারি ওয়েবসাইট নয়</span></span><span class="r"><a class="hide" href="<?php echo esc_url( PA_PB . '/?utm_source=probashiinfo&utm_medium=util' ); ?>" target="_blank" rel="noopener">🌍 প্রবাসী বন্ধু</a><a class="hide" href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=util" target="_blank" rel="noopener sponsored">✈️ ড্রিম ইন্টারন্যাশনাল</a></span></div></div>
<?php $cats = pa_top_cats( 14 ); $cur = is_category() ? get_queried_object_id() : 0; $mainc = array_slice( $cats, 0, 6 ); $morec = array_slice( $cats, 6 );
$tools = array( array( '/bmet-report/', '🔴', 'বিএমইটি', 'লাইভ রিপোর্ট', 'live' ), array( '/flight-tracker/', '✈️', 'ফ্লাইট', 'ট্র্যাকার লাইভ', '' ), array( '/taka-rate/', '💱', 'টাকার রেট', 'আজকের রেট', '' ) ); ?>
<header class="hdr2" id="hdr2">
	<div class="w top">
		<a class="logo2" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="প্রবাসী ইনফো — হোম"><img src="<?php echo esc_url( PA_LOGO ); ?>" alt="প্রবাসী ইনফো" width="220" height="60"></a>
		<form class="srch2 hsrch" action="<?php echo esc_url( home_url( '/' ) ); ?>" role="search"><span aria-hidden="true">🔍</span><input name="s" type="search" placeholder="ভিসা, বিএমইটি, রেট, দেশ — কী খুঁজছেন?" aria-label="খুঁজুন" value="<?php echo esc_attr( get_search_query() ); ?>"><button type="submit">খুঁজুন</button></form>
		<div class="tools2"><?php foreach ( $tools as $t ) echo '<a class="tl ' . $t[4] . '" href="' . esc_url( home_url( $t[0] ) ) . '">' . ( 'live' === $t[4] ? '<span class="ldot"></span>' : '<i>' . $t[1] . '</i>' ) . '<b>' . esc_html( $t[2] ) . '</b><small>' . esc_html( $t[3] ) . '</small></a>'; ?></div>
		<button type="button" class="burger" id="burger" aria-label="মেনু খুলুন" aria-expanded="false"><span></span><span></span><span></span></button>
	</div>
	<nav class="cat2" aria-label="বিষয়"><div class="w">
		<a href="<?php echo esc_url( home_url( '/' ) ); ?>"<?php echo is_front_page() ? ' class="on"' : ''; ?>>🏠 হোম</a>
		<?php foreach ( $mainc as $c ) echo '<a href="' . esc_url( get_category_link( $c ) ) . '"' . ( $cur === $c->term_id ? ' class="on"' : '' ) . '>' . esc_html( pa_cat_name( $c ) ) . '</a>'; ?>
		<?php if ( $morec ) { ?><div class="more" id="more"><button type="button" aria-haspopup="true" aria-expanded="false">আরও বিষয় ▾</button><div class="dd"><?php foreach ( $morec as $c ) echo '<a href="' . esc_url( get_category_link( $c ) ) . '">' . esc_html( pa_cat_name( $c ) ) . '</a>'; ?></div></div><?php } ?>
	</div></nav>
</header>
<div class="drw" id="drw" hidden><div class="drw-bg" data-close></div><aside class="drw-in" role="dialog" aria-label="মেনু">
	<div class="drw-h"><img src="<?php echo esc_url( PA_LOGO ); ?>" alt="প্রবাসী ইনফো" width="160" height="44"><button type="button" class="drw-x" data-close aria-label="বন্ধ করুন">✕</button></div>
	<div class="drw-t"><?php foreach ( $tools as $t ) echo '<a class="' . $t[4] . '" href="' . esc_url( home_url( $t[0] ) ) . '"><i>' . $t[1] . '</i><b>' . esc_html( $t[2] ) . '</b><small>' . esc_html( $t[3] ) . '</small></a>'; ?></div>
	<h4>বিষয়</h4>
	<nav class="drw-c"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">🏠 হোম</a><?php foreach ( $cats as $c ) echo '<a href="' . esc_url( get_category_link( $c ) ) . '"' . ( $cur === $c->term_id ? ' class="on"' : '' ) . '>' . esc_html( pa_cat_name( $c ) ) . '<span>' . pa_bn( (int) $c->count ) . '</span></a>'; ?></nav>
	<div class="drw-p"><a href="<?php echo esc_url( PA_PB . '/?utm_source=probashiinfo&utm_medium=menu' ); ?>" target="_blank" rel="noopener">🌍 প্রবাসী বন্ধু</a><a href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=menu" target="_blank" rel="noopener sponsored">✈️ ড্রিম ইন্টারন্যাশনাল</a></div>
</aside></div>
<main id="main">
<?php }

function pa_foot() {
	$cats = pa_top_cats( 8 ); $c1 = $c2 = '';
	foreach ( $cats as $i => $c ) { $li = '<li><a href="' . esc_url( get_category_link( $c ) ) . '">' . esc_html( pa_cat_name( $c ) ) . '</a></li>'; if ( $i < 4 ) $c1 .= $li; else $c2 .= $li; }
	$priv = get_privacy_policy_url(); ?>
</main>
<footer class="ft"><div class="w">
	<div class="ft-g">
		<div><a class="flogo" href="<?php echo esc_url( home_url( '/' ) ); ?>"><img src="<?php echo esc_url( PA_LOGO ); ?>" alt="প্রবাসী ইনফো" width="170" height="46" loading="lazy"></a><p>ভিসা, ওয়ার্ক পারমিট, রেমিট্যান্স, বিএমইটি আর প্রবাস জীবনের নির্ভরযোগ্য তথ্য — সহজ বাংলায়, প্রতিদিন।</p></div>
		<div><h4>বিষয়</h4><ul><?php echo $c1; ?></ul></div>
		<div><h4>আরও</h4><ul><?php echo $c2; ?></ul></div>
		<div><h4>প্রবাসীদের জন্য</h4><ul>
			<li><a href="<?php echo esc_url( PA_PB . '/?utm_source=probashiinfo&utm_medium=footer' ); ?>" target="_blank" rel="noopener">প্রবাসী বন্ধু: প্রবাস কার্ড</a></li>
			<li><a href="<?php echo esc_url( PA_PB . '/guide?utm_source=probashiinfo&utm_medium=footer' ); ?>" target="_blank" rel="noopener">প্রবাসে যাবেন? দেশ গাইড</a></li>
			<li><a href="https://dreamintcs.com/?utm_source=probashiinfo&utm_medium=footer" target="_blank" rel="noopener sponsored">ড্রিম ইন্টারন্যাশনাল: ওয়ার্ক পারমিট</a></li>
		</ul></div>
	</div>
	<p class="ft-disc">প্রবাসী ইনফো একটি স্বাধীন তথ্যভিত্তিক ওয়েবসাইট; এটি কোনো সরকারি প্রতিষ্ঠান, দূতাবাস বা রিক্রুটিং এজেন্সির ওয়েবসাইট নয়। ভিসা, ফি ও নিয়ম প্রায়ই বদলায় — আবেদন বা টাকা দেওয়ার আগে অফিসিয়াল সূত্রে যাচাই করুন।</p>
	<div class="ft-base"><span><?php if ( $priv ) echo '<a href="' . esc_url( $priv ) . '">প্রাইভেসি পলিসি</a>'; ?><a href="<?php echo esc_url( home_url( '/sitemap_index.xml' ) ); ?>">সাইটম্যাপ</a></span><span>© <?php echo pa_bn( wp_date( 'Y' ) ); ?> প্রবাসী ইনফো · সার্বিক সহযোগিতায় ড্রিম ইন্টারন্যাশনাল</span></div>
</div></footer>
<nav class="tabs" aria-label="দ্রুত মেনু"><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><i>🏠</i>হোম</a><a class="tab-live" href="<?php echo esc_url( home_url( '/bmet-report/' ) ); ?>"><i>🔴</i>বিএমইটি লাইভ</a><button type="button" class="hot find-now"><i>🔍</i>খুঁজুন</button><button type="button" class="share-now"><i>📤</i>শেয়ার</button></nav>
<div class="progress" id="progress" hidden></div>
<?php pa_js(); wp_footer(); ?>
</body>
</html>
<?php }

/* ---------- views ---------- */
/* BMET live highlight on the home page (data + live endpoint come from snippet #15). */
function pa_bmet_banner() {
	if ( ! function_exists( 'pa_bmet_live' ) ) return;
	$u = home_url( '/bmet-report/' );
	$live = pa_bmet_live();
	$d = get_option( 'pa_bmet' );
	$days = ( ! empty( $d['days'] ) && is_array( $d['days'] ) ) ? $d['days'] : array();
	ksort( $days );
	$today = wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) );
	$keys = array_values( array_filter( array_keys( $days ), function ( $k ) use ( $today ) { return $k < $today; } ) );
	$last = $keys ? end( $keys ) : '';
	$L = $last ? $days[ $last ] : null;
	$lc = $live['c']; arsort( $lc );
	$top = '';
	foreach ( array_slice( $lc, 0, 4, true ) as $c => $n ) $top .= '<span>' . pb_flag( $c ) . esc_html( pb_cn( $c ) ) . ' <b>' . pb_num( $n ) . '</b></span>';
	?>
<section class="bml"><div class="w"><a class="bml-in" href="<?php echo esc_url( $u ); ?>">
	<div class="bml-a"><span class="bml-tag"><span class="ldot"></span>লাইভ · আজ <?php echo esc_html( pb_bdate( $today ) ); ?></span>
		<h2>আজকের বিএমইটি রিপোর্ট</h2>
		<p>আজ এখন পর্যন্ত বহির্গমন ছাড়পত্র</p>
		<div class="bml-n"><b id="bml-t"><?php echo pb_num( $live['t'] ); ?></b> জন <small><span id="bml-c"><?php echo pb_bn( count( $live['c'] ) ); ?></span>টি দেশ</small></div></div>
	<div class="bml-b"><div class="bml-top" id="bml-top"><?php echo $top ?: '<span>আজকের এন্ট্রি এলেই এখানে দেখা যাবে</span>'; ?></div>
		<?php if ( $L ) echo '<p class="bml-y">' . esc_html( pb_bdate( $last ) ) . ' পূর্ণ দিন: <b>' . pb_num( $L['t'] ) . ' জন</b> · ' . pb_bn( count( $L['c'] ) ) . 'টি দেশ</p>'; ?>
		<span class="bml-cta">লাইভ ড্যাশবোর্ড, দেশভিত্তিক হিসাব ও রিপোর্ট কার্ড →</span></div>
</a></div></section>
<script>(function(){var bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})};fetch('/wp-json/pa/v1/bmet-live?_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(L){if(!L||!L.t)return;document.getElementById('bml-t').textContent=bn(L.t.toLocaleString('en-US'));document.getElementById('bml-c').textContent=bn(Object.keys(L.c).length);}).catch(function(){});})();</script>
<?php }

function pa_view_home() {
	$svc = array(
		array( '🛂', 'ভিসা চেক', 'সৌদি, দুবাই, কাতার, মালয়েশিয়া', array( 'ভিসা চেক', 'visa check', 'ভিসা' ) ),
		array( '💼', 'ওয়ার্ক পারমিট', 'ইউরোপ ও গালফে কাজের ভিসা', array( 'ওয়ার্ক', 'work', 'পারমিট' ) ),
		array( '🪪', 'বিএমইটি ও স্মার্ট কার্ড', 'রেজিস্ট্রেশন ও ক্লিয়ারেন্স', array( 'বিএমইটি', 'bmet', 'স্মার্ট কার্ড' ) ),
		array( '🤝', 'প্রবাসী কল্যাণ', 'কল্যাণ কার্ড, বীমা, সহায়তা', array( 'কল্যাণ', 'kallyan', 'welfare' ) ),
		array( '💸', 'রেমিট্যান্স', 'টাকা পাঠানো, প্রণোদনা', array( 'রেমিট্যান্স', 'remittance' ) ),
		array( '📘', 'পাসপোর্ট', 'ই-পাসপোর্ট, নবায়ন', array( 'পাসপোর্ট', 'passport' ) ),
		array( '🌍', 'দেশভিত্তিক তথ্য', 'ইউরোপ, সৌদি, কাতার আরও', array( 'european', 'ইউরোপ', 'দেশ' ) ),
		array( '🎓', 'ক্যারিয়ার গাইড', 'দক্ষতা, প্রশিক্ষণ, চাকরি', array( 'career', 'ক্যারিয়ার' ) ),
	);
	$latest = get_posts( array( 'numberposts' => 13 ) );
	?>
<?php
	$now = current_time( 'timestamp', true );
	$live = function_exists( 'pa_bmet_live' ) ? pa_bmet_live() : null;
	$fx = function_exists( 'pa_fx_data' ) ? pa_fx_data() : null; $fr = $fx && ! empty( $fx['latest'] ) ? ( $fx['h'][ $fx['latest'] ] ?? array() ) : array();
	$bm = get_option( 'pa_bmet' ); $bd = ( ! empty( $bm['days'] ) && is_array( $bm['days'] ) ) ? $bm['days'] : array(); ksort( $bd );
	$tdy = wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) ); $bk = array_values( array_filter( array_keys( $bd ), function ( $k ) use ( $tdy ) { return $k < $tdy; } ) ); $yk = $bk ? end( $bk ) : '';
	$r2 = function ( $c ) use ( $fr ) { return isset( $fr[ $c ] ) ? pa_bn( number_format( $fr[ $c ], 2 ) ) : '—'; };
?>
<section class="hero2"><div class="w">
	<div class="h2l">
		<span class="h2k"><span class="ldot"></span> প্রবাসীদের নির্ভরযোগ্য তথ্যসেবা</span>
		<h1>প্রবাসীদের সব তথ্য, এক জায়গায়</h1>
		<p>ভিসা, ওয়ার্ক পারমিট, বিএমইটি, টাকার রেট আর ফ্লাইটের খবর — সহজ বাংলায়, প্রতিদিন হালনাগাদ।</p>
		<div class="h2t">
			<a class="ht ht-r" href="<?php echo esc_url( home_url( '/bmet-report/' ) ); ?>"><span class="ht-i">📊</span><span class="ht-b"><small><span class="ldot"></span> লাইভ · আজ</small><b><?php echo $live && $live['t'] ? pa_bn( number_format( (int) $live['t'] ) ) . ' জন' : 'বিএমইটি রিপোর্ট'; ?></b><em>আজকের বিএমইটি রিপোর্ট</em></span><span class="ht-go">→</span></a>
			<a class="ht ht-f" href="<?php echo esc_url( home_url( '/flight-tracker/' ) ); ?>"><span class="ht-i">✈️</span><span class="ht-b"><small>লাইভ ম্যাপ</small><b>ফ্লাইট ট্র্যাকার</b><em>বিমান এখন কোথায়, কখন নামবে</em></span><span class="ht-go">→</span></a>
			<a class="ht ht-m" href="<?php echo esc_url( home_url( '/taka-rate/' ) ); ?>"><span class="ht-i">💱</span><span class="ht-b"><small>আজকের রেট</small><b>১ রিয়াল = <?php echo $r2( 'sar' ); ?> ৳</b><em>সব মুদ্রা, চার্ট ও ক্যালকুলেটর</em></span><span class="ht-go">→</span></a>
		</div>
		<div class="h2p"><span>জনপ্রিয়:</span><a href="<?php echo esc_url( pa_search_url( 'ভিসা চেক' ) ); ?>">ভিসা চেক</a><a href="<?php echo esc_url( pa_search_url( 'ওয়ার্ক পারমিট' ) ); ?>">ওয়ার্ক পারমিট</a><a href="#countries">দেশ গাইড</a><a href="<?php echo esc_url( PA_PB . '/?utm_source=probashiinfo&utm_medium=hero' ); ?>" target="_blank" rel="noopener">প্রবাস কার্ড</a></div>
	</div>
	<aside class="h2r" aria-label="আজ এক নজরে">
		<div class="gl-h"><b>আজ এক নজরে</b><span id="bddate"><?php $dz = new DateTimeZone( 'Asia/Dhaka' ); echo esc_html( pa_weekday( $now, $dz ) . ', ' . pa_date( $now, $dz ) ); ?></span><span id="hijri">হিজরি</span></div>
		<div class="gl-r">
			<?php foreach ( array( array( 'sar', 'sa', 'সৌদি রিয়াল' ), array( 'aed', 'ae', 'আমিরাত দিরহাম' ), array( 'qar', 'qa', 'কাতারি রিয়াল' ), array( 'kwd', 'kw', 'কুয়েতি দিনার' ), array( 'myr', 'my', 'মালয়েশিয়ান রিংগিত' ) ) as $c ) echo '<a href="' . esc_url( home_url( '/taka-rate/' ) ) . '"><img src="https://flagcdn.com/w40/' . $c[1] . '.png" alt="" width="24" height="17" loading="lazy"><span>' . $c[2] . '</span><b>' . $r2( $c[0] ) . ' ৳</b></a>'; ?>
		</div>
		<?php if ( $yk ) echo '<a class="gl-b" href="' . esc_url( home_url( '/bmet-report/' ) ) . '"><span>বিএমইটি · গতকাল</span><b>' . pa_bn( number_format( (int) $bd[ $yk ]['t'] ) ) . ' জন</b><small>' . pa_bn( count( $bd[ $yk ]['c'] ) ) . 'টি দেশে বহির্গমন ছাড়পত্র</small></a>'; ?>
		<a class="gl-all" href="<?php echo esc_url( home_url( '/taka-rate/' ) ); ?>">সব রেট দেখুন →</a>
	</aside>
</div></section>
<div class="w">
	<section class="sec"><div class="sh"><h2>সেবা বাতায়ন</h2></div><div class="svcs">
	<?php foreach ( $svc as $s ) echo '<a class="svc" href="' . esc_url( pa_service_url( $s[3] ) ) . '"><i>' . $s[0] . '</i><span><b>' . esc_html( $s[1] ) . '</b><small>' . esc_html( $s[2] ) . '</small></span></a>'; ?>
	</div></section>
	<?php if ( $latest ) { $lead = array_shift( $latest ); ?>
	<section class="sec"><div class="sh"><h2>সর্বশেষ</h2></div><div class="lead"><?php echo pa_card( $lead, 'xl' ); ?><div class="list"><?php foreach ( array_slice( $latest, 0, 4 ) as $p ) echo pa_card( $p, 'h' ); ?></div></div>
	<div class="grid4" style="margin-top:14px"><?php foreach ( array_slice( $latest, 4, 8 ) as $p ) echo pa_card( $p ); ?></div></section>
	<?php } ?>
	<section class="sec" id="dash"><div class="sh"><h2>প্রবাসী ড্যাশবোর্ড</h2></div><div class="dash">
		<div class="box"><div class="bh">💱 আজকের রেমিট্যান্স রেট (টাকায়)<span class="live">লাইভ</span><a href="<?php echo esc_url( home_url( '/taka-rate/' ) ); ?>" style="margin-left:auto;font-size:13px;font-weight:700">সব রেট ও চার্ট →</a></div><div class="rates" id="rates"></div>
			<div class="calc"><input id="amt" inputmode="decimal" value="1000" aria-label="পরিমাণ"><div class="out" id="out">…<small>বাজার রেটে আনুমানিক</small></div><button type="button" class="btn btn-wa" id="wa">WhatsApp এ শেয়ার</button></div>
			<p class="note">বাজার রেট (open.er-api.com, দিনে একবার হালনাগাদ)। ব্যাংক/এক্সচেঞ্জ হাউসের রেট কিছুটা ভিন্ন হয়। বৈধ পথে পাঠালে সরকারি প্রণোদনা পাওয়া যায় (হার পরিবর্তন হতে পারে); হুন্ডি অবৈধ ও ঝুঁকিপূর্ণ।</p></div>
		<div class="box"><div class="bh">🕐 প্রবাসের ঘড়ি ও নামাজের সময়<select id="city" aria-label="শহর"></select></div><div class="clocks" id="clocks"></div><div class="pray" id="pray"></div>
			<p class="note">নামাজের সময়: AlAdhan (উম্মুল কুরা পদ্ধতি)। স্থানীয় মসজিদের সময় সামান্য ভিন্ন হতে পারে।</p></div>
	</div></section>
	<section class="sec"><?php echo pa_pb( 'home', true ); ?></section>
	<?php
	$n = 0;
	foreach ( pa_top_cats( 8 ) as $cat ) {
		if ( $n >= 4 ) break;
		$ps = get_posts( array( 'numberposts' => 8, 'category' => $cat->term_id ) );
		if ( count( $ps ) < 3 ) continue;
		$n++;
		echo '<section class="sec"><div class="sh"><h2>' . esc_html( pa_cat_name( $cat ) ) . '</h2><a class="more" href="' . esc_url( get_category_link( $cat ) ) . '">সব দেখুন →</a></div><div class="rail">';
		foreach ( $ps as $p ) echo pa_card( $p );
		echo '</div></section>';
		if ( $n === 2 ) echo pa_dream( 'home', 'ইউরোপে ওয়ার্ক পারমিট — বাংলাদেশ ও কাতার থেকে' );
	}
	?>
	<section class="sec" id="countries"><div class="sh"><h2>দেশভিত্তিক গাইড</h2></div><div class="ctry">
	<?php $cs = array( array( 'sa', 'সৌদি আরব', array( 'সৌদি', 'saudi' ) ), array( 'ae', 'দুবাই / আমিরাত', array( 'দুবাই', 'আমিরাত', 'dubai', 'uae' ) ), array( 'qa', 'কাতার', array( 'কাতার', 'qatar' ) ), array( 'kw', 'কুয়েত', array( 'কুয়েত', 'kuwait' ) ), array( 'om', 'ওমান', array( 'ওমান', 'oman' ) ), array( 'bh', 'বাহরাইন', array( 'বাহরাইন', 'bahrain' ) ), array( 'my', 'মালয়েশিয়া', array( 'মালয়েশিয়া', 'malaysia' ) ), array( 'sg', 'সিঙ্গাপুর', array( 'সিঙ্গাপুর', 'singapore' ) ), array( 'it', 'ইতালি', array( 'ইতালি', 'italy' ) ), array( 'ro', 'রোমানিয়া', array( 'রোমানিয়া', 'romania' ) ), array( 'hr', 'ক্রোয়েশিয়া', array( 'ক্রোয়েশিয়া', 'croatia' ) ), array( 'pt', 'পর্তুগাল', array( 'পর্তুগাল', 'portugal' ) ), array( 'pl', 'পোল্যান্ড', array( 'পোল্যান্ড', 'poland' ) ), array( 'rs', 'সার্বিয়া', array( 'সার্বিয়া', 'serbia' ) ), array( 'gb', 'যুক্তরাজ্য', array( 'যুক্তরাজ্য', 'লন্ডন', 'uk' ) ), array( 'jp', 'জাপান', array( 'জাপান', 'japan' ) ) );
	foreach ( $cs as $c ) echo '<a class="ct-tile" href="' . esc_url( pa_service_url( $c[2] ) ) . '"><img src="https://flagcdn.com/w80/' . $c[0] . '.png" alt="" width="44" height="30" loading="lazy"><b>' . esc_html( $c[1] ) . '</b></a>'; ?>
	</div></section>
	<section class="sec"><div class="two">
		<div class="box"><div class="bh">🔥 সবচেয়ে বেশি পড়া</div><ol class="mini">
		<?php $i = 0; foreach ( get_posts( array( 'numberposts' => 6, 'orderby' => 'comment_count', 'order' => 'DESC' ) ) as $p ) { $i++; echo '<li><a href="' . esc_url( get_permalink( $p ) ) . '"><span class="n">' . pa_bn( $i ) . '</span><span>' . esc_html( get_the_title( $p ) ) . '</span></a></li>'; } ?>
		</ol></div>
		<div class="box"><div class="bh">📌 নোটিশ বোর্ড — সর্বশেষ তথ্য</div><ul class="ntc">
		<?php $m = array( 'জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে' );
		foreach ( get_posts( array( 'numberposts' => 7 ) ) as $p ) { $t = get_post_time( 'U', true, $p );
			echo '<li><span class="d"><b>' . esc_html( pa_bn( wp_date( 'j', $t ) ) ) . '</b>' . esc_html( $m[ (int) wp_date( 'n', $t ) - 1 ] ) . '</span><a href="' . esc_url( get_permalink( $p ) ) . '">' . esc_html( get_the_title( $p ) ) . ( time() - $t < 3 * DAY_IN_SECONDS ? '<span class="new">নতুন</span>' : '' ) . '</a></li>'; } ?>
		</ul></div>
	</div></section>
	<section class="sec"><div class="sh"><h2>প্রবাসীদের সাধারণ প্রশ্ন</h2></div><div class="faq">
	<?php $faq = array(
		array( 'বিদেশে যাওয়ার আগে কোন কাগজগুলো লাগে?', 'সাধারণত বৈধ পাসপোর্ট, ভিসা বা ওয়ার্ক পারমিট, নিয়োগপত্র, মেডিকেল রিপোর্ট আর বিএমইটি ক্লিয়ারেন্স (স্মার্ট কার্ড) লাগে। দেশ ও কাজের ধরন অনুযায়ী তালিকা আলাদা হয়, তাই সংশ্লিষ্ট দেশের গাইড দেখুন।' ),
		array( 'ভিসা আসল কিনা কীভাবে বুঝব?', 'যে দেশের ভিসা, সেই দেশের সরকারি ওয়েবসাইট বা অ্যাপে পাসপোর্ট নম্বর দিয়ে যাচাই করুন। এজেন্টের দেওয়া স্ক্রিনশট বা লিংকে ভরসা না করে নিজে অফিসিয়াল পোর্টালে চেক করুন।' ),
		array( 'দেশে টাকা পাঠানোর নিরাপদ উপায় কী?', 'ব্যাংক, অনুমোদিত এক্সচেঞ্জ হাউস বা স্বীকৃত মোবাইল ফিনান্সিয়াল সেবার মাধ্যমে পাঠান। বৈধ পথে পাঠালে সরকারি প্রণোদনা পাওয়া যায়; হুন্ডি অবৈধ এবং টাকা হারানোর ঝুঁকি থাকে।' ),
		array( 'দালাল বা ভুয়া এজেন্সি চিনব কীভাবে?', 'বিএমইটি অনুমোদিত রিক্রুটিং এজেন্সি কিনা যাচাই করুন, লিখিত চুক্তি ছাড়া টাকা দেবেন না, আর অস্বাভাবিক কম খরচ বা "নিশ্চিত ভিসা" প্রতিশ্রুতি দেখলে সতর্ক হোন।' ),
		array( 'বিদেশে থেকে পাসপোর্ট নবায়ন করা যায়?', 'হ্যাঁ, সাধারণত সংশ্লিষ্ট দেশের বাংলাদেশ দূতাবাস বা কনস্যুলেটের মাধ্যমে ই-পাসপোর্টের আবেদন করা যায়। ফি ও প্রক্রিয়া দূতাবাসের ওয়েবসাইটে দেখে নিন।' ),
	);
	foreach ( $faq as $f ) echo '<details><summary>' . esc_html( $f[0] ) . '</summary><p>' . esc_html( $f[1] ) . '</p></details>'; ?>
	</div><p class="note">সাধারণ তথ্য; নিয়ম পরিবর্তন হতে পারে — আবেদন বা টাকা দেওয়ার আগে অফিসিয়াল সূত্রে যাচাই করুন।</p></section>
</div>
<?php }

function pa_view_single() {
	while ( have_posts() ) {
		the_post();
		$id = get_the_ID();
		$cats = get_the_category( $id ); $cat = $cats ? $cats[0] : null;
		$content = apply_filters( 'the_content', get_the_content() );
		$hay = get_the_title() . ' ' . wp_strip_all_tags( substr( $content, 0, 3000 ) );
		$europe = (bool) preg_match( '/সার্বিয়া|বসনিয়া|গ্রিস|পর্তুগাল|মলদোভা|বুলগেরিয়া|ইউরোপ|ওয়ার্ক পারমিট|work permit/iu', $hay );
		$content = pa_after_p( $content, 2, $europe ? pa_dream( 'post-intext' ) : pa_pb( 'post-intext' ) );
		if ( $europe ) $content = pa_after_p( $content, 9, pa_pb( 'post-mid' ) );
		$updated = get_the_modified_time( 'U' ) > get_the_time( 'U' ) + DAY_IN_SECONDS;
		$url = get_permalink(); $title = get_the_title();
		?>
<div class="art-hd"><div class="w">
	<nav class="crumbs" aria-label="ব্রেডক্রাম্ব"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a><span>›</span><?php if ( $cat ) echo '<a href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pa_cat_name( $cat ) ) . '</a><span>›</span>'; ?><span>এই লেখা</span></nav>
	<h1><?php the_title(); ?></h1>
	<div class="art-meta"><?php if ( $cat ) echo '<a class="pill" href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pa_cat_name( $cat ) ) . '</a>'; ?>
		<span><?php echo $updated ? 'হালনাগাদ: ' . esc_html( pa_date( get_post_modified_time( 'U', true ) ) ) : 'প্রকাশ: ' . esc_html( pa_date( get_post_time( 'U', true ) ) ); ?></span><span>·</span><span>পড়তে <?php echo pa_bn( pa_mins( $id ) ); ?> মিনিট</span>
		<span class="fsz" aria-label="লেখার আকার"><button type="button" data-fs="-1" aria-label="লেখা ছোট">অ−</button><button type="button" data-fs="1" aria-label="লেখা বড়">অ+</button></span></div>
	<?php if ( has_post_thumbnail() ) echo '<figure class="art-img">' . get_the_post_thumbnail( null, 'large', array( 'alt' => esc_attr( $title ) ) ) . '</figure>'; ?>
</div></div>
<div class="w"><div class="art">
	<article class="art-main">
		<?php if ( substr_count( $content, '<h2' ) >= 3 ) echo '<nav class="toc" aria-label="এই লেখায়" hidden><b>এই লেখায় যা আছে</b><ol></ol></nav>'; ?>
		<div class="ct" id="ct"><?php echo $content; ?></div>
		<div class="share"><p>তথ্যটি কাজে লাগলে প্রবাসী ভাই-বোনদের পাঠিয়ে দিন — একজনের উপকার হতে পারে।</p>
			<a class="btn btn-wa" href="<?php echo esc_url( 'https://wa.me/?text=' . rawurlencode( $title . "\n" . $url ) ); ?>" target="_blank" rel="noopener">WhatsApp</a>
			<a class="btn fb" href="<?php echo esc_url( 'https://www.facebook.com/sharer/sharer.php?u=' . rawurlencode( $url ) ); ?>" target="_blank" rel="noopener">Facebook</a>
			<button type="button" class="btn cp copy">লিংক কপি</button></div>
		<?php echo pa_dream( 'post-bottom', 'ইউরোপে ওয়ার্ক পারমিট — বাংলাদেশ ও কাতার থেকে' ); ?>
	</article>
	<aside class="side">
		<div class="box"><div class="bh">💱 আজকের রেট<span class="live">লাইভ</span></div><div class="mrates" id="mrates"><div><span>লোড হচ্ছে…</span></div></div><a class="btn btn-b" style="width:100%;margin-top:10px" href="<?php echo esc_url( home_url( '/#dash' ) ); ?>">ক্যালকুলেটর →</a></div>
		<div class="box"><div class="bh">📰 সর্বশেষ</div><ol class="mini"><?php $i = 0; foreach ( get_posts( array( 'numberposts' => 6, 'post__not_in' => array( $id ) ) ) as $p ) { $i++; echo '<li><a href="' . esc_url( get_permalink( $p ) ) . '"><span class="n">' . pa_bn( $i ) . '</span><span>' . esc_html( get_the_title( $p ) ) . '</span></a></li>'; } ?></ol></div>
		<?php echo pa_pb( 'sidebar' ); ?>
	</aside>
</div>
<?php
		$rel = get_posts( array( 'numberposts' => 6, 'category__in' => wp_get_post_categories( $id ), 'post__not_in' => array( $id ) ) );
		if ( $rel ) { echo '<section class="sec"><div class="sh"><h2>আরও পড়ুন</h2></div><div class="grid3">'; foreach ( $rel as $p ) echo pa_card( $p ); echo '</div></section>'; }
		echo '</div>';
	}
}

function pa_view_list() {
	$o = get_queried_object();
	if ( is_search() ) { $h = 'খোঁজ: “' . get_search_query() . '”'; $d = pa_bn( (int) $GLOBALS['wp_query']->found_posts ) . 'টি লেখা পাওয়া গেছে'; }
	elseif ( is_category() || is_tag() || is_tax() ) { $h = pa_cat_name( $o ); $d = wp_strip_all_tags( term_description() ); }
	else { $h = wp_strip_all_tags( get_the_archive_title() ); $d = ''; }
	echo '<section class="arch-hd"><div class="w"><nav class="crumbs" aria-label="ব্রেডক্রাম্ব" style="color:#cfe0fb"><a href="' . esc_url( home_url( '/' ) ) . '" style="color:#fff">হোম</a><span>›</span><span>' . esc_html( $h ) . '</span></nav><h1>' . esc_html( $h ) . '</h1>' . ( $d ? '<p>' . esc_html( $d ) . '</p>' : '' ) . '</div></section><div class="w">';
	if ( have_posts() ) {
		echo '<section class="sec"><div class="grid3">';
		$i = 0;
		while ( have_posts() ) { the_post(); $i++; echo pa_card( get_post() ); if ( $i === 6 ) echo '</div>' . pa_pb( 'archive' ) . '<div class="grid3">'; }
		echo '</div></section>';
		$links = paginate_links( array( 'type' => 'list', 'prev_text' => '‹', 'next_text' => '›' ) );
		if ( $links ) echo '<nav class="pager" aria-label="পাতা">' . $links . '</nav>';
	} else {
		echo '<div class="empty"><p>কোনো লেখা পাওয়া যায়নি। অন্য শব্দে খুঁজে দেখুন।</p><form class="hs" style="margin:14px auto" action="' . esc_url( home_url( '/' ) ) . '" role="search"><input name="s" type="search" placeholder="খুঁজুন…" aria-label="খুঁজুন"><button type="submit">খুঁজুন</button></form></div>';
	}
	echo '</div>';
}

function pa_view_page() {
	while ( have_posts() ) {
		the_post();
		echo '<div class="art-hd"><div class="w"><nav class="crumbs"><a href="' . esc_url( home_url( '/' ) ) . '">হোম</a><span>›</span><span>' . esc_html( get_the_title() ) . '</span></nav><h1>' . esc_html( get_the_title() ) . '</h1><div class="art-meta"></div></div></div>';
		echo '<div class="w"><div class="art" style="grid-template-columns:minmax(0,1fr)"><article class="art-main"><div class="ct">' . apply_filters( 'the_content', get_the_content() ) . '</div></article></div></div>';
	}
}

function pa_view_404() {
	echo '<section class="arch-hd"><div class="w"><h1>পাতাটি পাওয়া যায়নি</h1><p>লিংকটি ভুল অথবা লেখাটি সরানো হয়েছে। নিচে খুঁজুন বা সর্বশেষ লেখা দেখুন।</p></div></section><div class="w"><form class="hs" style="margin:22px 0" action="' . esc_url( home_url( '/' ) ) . '" role="search"><input name="s" type="search" placeholder="খুঁজুন…" aria-label="খুঁজুন"><button type="submit">খুঁজুন</button></form><section class="sec"><div class="grid3">';
	foreach ( get_posts( array( 'numberposts' => 6 ) ) as $p ) echo pa_card( $p );
	echo '</div></section></div>';
}

/* ---------- router ---------- */
add_action( 'template_redirect', function () {
	if ( ! pa_app() ) return;
	if ( is_feed() || is_embed() || is_trackback() || is_robots() || is_attachment() || is_preview() ) return;
	if ( ! PA_APP_PUBLIC ) {
		if ( ! defined( 'DONOTCACHEPAGE' ) ) define( 'DONOTCACHEPAGE', true );
		do_action( 'litespeed_control_set_nocache', 'probashiinfo app preview' );
		if ( ! headers_sent() ) header( 'Cache-Control: no-store, private' );
	}
	if ( is_front_page() ) do_action( 'litespeed_control_set_ttl', 1800 );
	pa_head();
	if ( is_front_page() && ! is_paged() ) pa_view_home();
	elseif ( is_singular( 'post' ) ) pa_view_single();
	elseif ( is_page() ) pa_view_page();
	elseif ( is_404() ) pa_view_404();
	else pa_view_list();
	pa_foot();
	exit;
}, 99 );

/* ---------- behaviour ---------- */
function pa_js() { ?>
<script>
(function(){
	var $=function(s){return document.querySelector(s)}, bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})};
	try{ var bdd=$('#bddate'); if(bdd) bdd.textContent=new Intl.DateTimeFormat('bn-BD',{timeZone:'Asia/Dhaka',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()).replace(/,(?=[^,]*$)/,''); }catch(e){}
	try{ var h=$('#hijri'); if(h) h.textContent=new Intl.DateTimeFormat('bn-BD-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).formatToParts(new Date()).filter(function(p){return p.type!=='era'}).map(function(p){return p.value}).join('').replace(/[,\s]+$/,'')+' হিজরি'; }catch(e){}
	var toc=$('.toc'); if(toc){ var hs=document.querySelectorAll('#ct h2'), ol=toc.querySelector('ol'); hs.forEach(function(x,i){ if(!x.id) x.id='s'+(i+1); var li=document.createElement('li'), a=document.createElement('a'); a.href='#'+x.id; a.textContent=x.textContent; li.appendChild(a); ol.appendChild(li); }); if(hs.length>=3) toc.hidden=false; }
	var fs=18.5; try{ fs=parseFloat(localStorage.getItem('pi_fs'))||18.5; }catch(e){}
	var setFs=function(v){ fs=Math.max(15,Math.min(26,v)); document.documentElement.style.setProperty('--fs',fs+'px'); try{localStorage.setItem('pi_fs',fs)}catch(e){} };
	setFs(fs); document.querySelectorAll('.fsz button').forEach(function(b){ b.onclick=function(){ setFs(fs+parseFloat(b.dataset.fs)*1.5); }; });
	document.querySelectorAll('.share-now').forEach(function(b){ b.onclick=function(){ var d={title:document.title,url:location.href.split('#')[0]}; if(navigator.share){ navigator.share(d).catch(function(){}); } else { location.href='https://wa.me/?text='+encodeURIComponent(d.title+'\n'+d.url); } }; });

	/* header v2: shrink on scroll, mobile drawer, "more" dropdown on touch */
	(function(){ var h=document.getElementById('hdr2'), d=document.getElementById('drw'), b=document.getElementById('burger'), m=document.getElementById('more');
		if(h){ var t=0; addEventListener('scroll',function(){ if(t) return; t=requestAnimationFrame(function(){ h.classList.toggle('sm',scrollY>80); t=0; }); },{passive:true}); }
		function open(o){ if(!d) return; d.hidden=!o; document.documentElement.style.overflow=o?'hidden':''; if(b) b.setAttribute('aria-expanded',o?'true':'false'); }
		if(b) b.onclick=function(){ open(true); };
		if(d) d.querySelectorAll('[data-close]').forEach(function(x){ x.onclick=function(){ open(false); }; });
		addEventListener('keydown',function(e){ if(e.key==='Escape') open(false); });
		if(m){ var mb=m.querySelector('button'); mb.onclick=function(e){ e.stopPropagation(); var o=!m.classList.contains('open'); m.classList.toggle('open',o); mb.setAttribute('aria-expanded',o?'true':'false'); }; document.addEventListener('click',function(){ m.classList.remove('open'); }); }
	})();
	document.querySelectorAll('.find-now').forEach(function(b){ b.onclick=function(){ var i=document.querySelector('.srch2 input')||document.querySelector('.hsrch input'); if(i){ scrollTo({top:0,behavior:'smooth'}); setTimeout(function(){ i.focus(); },300); } }; });
	document.querySelectorAll('.copy').forEach(function(b){ b.onclick=function(){ try{ navigator.clipboard.writeText(location.href.split('#')[0]); b.textContent='কপি হয়েছে ✓'; }catch(e){} }; });
	var bar=$('#progress'), body=$('#ct'); if(bar&&body){ bar.hidden=false; addEventListener('scroll',function(){ var r=body.getBoundingClientRect(), p=Math.min(1,Math.max(0,(innerHeight-r.top)/r.height)); bar.style.width=(p*100)+'%'; },{passive:true}); }
	var C=[['SAR','সৌদি রিয়াল','Asia/Riyadh','রিয়াদ',24.71,46.68],['AED','আমিরাত দিরহাম','Asia/Dubai','দুবাই',25.2,55.27],['QAR','কাতার রিয়াল','Asia/Qatar','দোহা',25.29,51.53],['KWD','কুয়েতি দিনার','Asia/Kuwait','কুয়েত',29.38,47.98],['OMR','ওমানি রিয়াল','Asia/Muscat','মাস্কাট',23.59,58.38],['MYR','মালয়েশিয়ান রিংগিত','Asia/Kuala_Lumpur','কুয়ালালামপুর',3.14,101.69],['SGD','সিঙ্গাপুর ডলার','Asia/Singapore','সিঙ্গাপুর',1.35,103.82],['EUR','ইউরো','Europe/Rome','রোম',41.9,12.5],['GBP','ব্রিটিশ পাউন্ড','Europe/London','লন্ডন',51.51,-0.13]];
	var withRates=function(cb){ var c=null; try{ c=JSON.parse(localStorage.getItem('pi_rates')||'null'); }catch(e){} if(c&&Date.now()-c.t<6*3600e3) return cb(c.r);
		fetch('https://open.er-api.com/v6/latest/USD').then(function(r){return r.json()}).then(function(j){ if(j&&j.rates){ try{localStorage.setItem('pi_rates',JSON.stringify({t:Date.now(),r:j.rates}))}catch(e){} cb(j.rates); } }).catch(function(){}); };
	var mr=$('#mrates'); if(mr) withRates(function(R){ mr.innerHTML=C.slice(0,6).map(function(c){ return '<div><span>১ '+c[1]+'</span><b>৳ '+bn((R.BDT/R[c[0]]).toFixed(2))+'</b></div>'; }).join(''); });
	var rates=$('#rates'); if(rates){
		var sel=0, R=null, amt=$('#amt'), out=$('#out');
		var calc=function(){ if(!R) return; var c=C[sel], a=parseFloat(String(amt.value).replace(/[^\d.]/g,''))||0; out.innerHTML='৳ '+bn(Math.round(a*R.BDT/R[c[0]]).toLocaleString('en-IN'))+'<small>'+bn(a)+' '+c[1]+' — বাজার রেটে আনুমানিক</small>'; };
		var paint=function(){ rates.innerHTML=C.map(function(c,i){ return '<button type="button" class="rate'+(i===sel?' on':'')+'" data-i="'+i+'"><span>১ '+c[1]+'</span><b>৳ '+bn((R.BDT/R[c[0]]).toFixed(2))+'</b></button>'; }).join(''); rates.querySelectorAll('.rate').forEach(function(b){ b.onclick=function(){ sel=+b.dataset.i; paint(); calc(); }; }); };
		amt.oninput=calc;
		$('#wa').onclick=function(){ if(!R) return; var lines=C.slice(0,6).map(function(c){ return '১ '+c[1]+' = ৳'+bn((R.BDT/R[c[0]]).toFixed(2)); }).join('\n'); window.open('https://wa.me/?text='+encodeURIComponent('আজকের রেমিট্যান্স রেট ('+new Date().toLocaleDateString('bn-BD')+')\n'+lines+'\n\nলাইভ রেট: '+location.origin+'/#dash'),'_blank'); };
		withRates(function(r){ R=r; paint(); calc(); });
	}
	var clocks=$('#clocks'), city=$('#city'), pray=$('#pray');
	if(clocks&&city){
		city.innerHTML=C.slice(0,6).map(function(c,i){ return '<option value="'+i+'">'+c[3]+'</option>'; }).join('');
		var tick=function(){ var now=new Date(), f=function(tz){ return bn(now.toLocaleTimeString('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit'})); }; clocks.innerHTML='<div class="bd"><span>বাংলাদেশ</span><b>'+f('Asia/Dhaka')+'</b></div>'+[0,1,2,3,5,7].map(function(i){ return '<div><span>'+C[i][3]+'</span><b>'+f(C[i][2])+'</b></div>'; }).join(''); };
		tick(); setInterval(tick,30000);
		var names={Fajr:'ফজর',Dhuhr:'যোহর',Asr:'আসর',Maghrib:'মাগরিব',Isha:'এশা'};
		var load=function(){ var c=C[+city.value]; pray.innerHTML=''; fetch('https://api.aladhan.com/v1/timings?latitude='+c[4]+'&longitude='+c[5]+'&method=4').then(function(r){return r.json()}).then(function(j){ var t=j&&j.data&&j.data.timings; if(!t) return; var local=new Date().toLocaleTimeString('en-GB',{timeZone:c[2],hour:'2-digit',minute:'2-digit'}), next=null; pray.innerHTML=Object.keys(names).map(function(k){ var v=String(t[k]).slice(0,5), on=!next&&v>local; if(on) next=k; return '<div class="'+(on?'on':'')+'"><span>'+names[k]+'</span><b>'+bn(v)+'</b></div>'; }).join(''); }).catch(function(){}); };
		city.onchange=load; load();
	}
})();
</script>
<?php }
