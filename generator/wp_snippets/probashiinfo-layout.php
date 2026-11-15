<?php
/* প্রবাসী ইনফো — clean layout v5 (Nov 2026). Minimal, app-like home page + calmer inner pages.
   Works with #14 (app shell: pa_head/pa_foot/pa_js, ad helpers pa_dream/pa_pb), #32 (data tiles inject
   after section.hero3) and #35 (brand skin). Header/footer/wp_head come from #14 unchanged, so Rank Math
   output, URLs and Adsterra stay identical; the in-house ad blocks keep their places (home: Dream ad +
   Probashi Bondhu card; posts: unchanged views from #14).
   Rollout: PI_LAYOUT_PUBLIC false = only with ?v5=1 (cookie; ?v5=0 clears). Rollback = deactivate. */
if ( ! defined( 'PI_LAYOUT_PUBLIC' ) ) define( 'PI_LAYOUT_PUBLIC', false );
if ( ! defined( 'PI_LAYOUT_VERSION' ) ) define( 'PI_LAYOUT_VERSION', '5.0.0' );

function pi_layout_on() {
	static $on = null;
	if ( $on !== null ) return $on;
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return $on = false;
	if ( ! function_exists( 'pa_app' ) || ! pa_app() ) return $on = false;
	if ( isset( $_GET['v5'] ) ) {
		$want = $_GET['v5'] === '1';
		if ( ! headers_sent() ) setcookie( 'pi_v5', $want ? '1' : '', $want ? time() + 30 * DAY_IN_SECONDS : time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
		return $on = $want;
	}
	return $on = ( PI_LAYOUT_PUBLIC || ! empty( $_COOKIE['pi_v5'] ) );
}

add_action( 'init', function () {
	if ( PI_LAYOUT_PUBLIC && get_option( 'pi_layout_purged' ) !== PI_LAYOUT_VERSION ) {
		update_option( 'pi_layout_purged', PI_LAYOUT_VERSION, false );
		do_action( 'litespeed_purge_all' );
	}
} );

/* home page: render before #14's router (priority 99) */
add_action( 'template_redirect', function () {
	if ( ! pi_layout_on() || ! is_front_page() || is_paged() ) return;
	if ( ! function_exists( 'pa_head' ) || ! function_exists( 'pa_foot' ) ) return;
	if ( ! PI_LAYOUT_PUBLIC ) do_action( 'litespeed_control_set_nocache', 'probashiinfo v5 preview' );
	else do_action( 'litespeed_control_set_ttl', 1800 );
	pa_head();
	pi_v5_home();
	pa_foot();
	exit;
}, 98 );

function pi_v5_home() {
	$live = function_exists( 'pa_bmet_live' ) ? pa_bmet_live() : null;
	$bm = get_option( 'pa_bmet' ); $bd = ( ! empty( $bm['days'] ) && is_array( $bm['days'] ) ) ? $bm['days'] : array(); ksort( $bd );
	$tdy = wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) );
	$bk = array_values( array_filter( array_keys( $bd ), function ( $k ) use ( $tdy ) { return $k < $tdy; } ) ); $yk = $bk ? end( $bk ) : '';
	$fx = function_exists( 'pa_fx_data' ) ? pa_fx_data() : null; $fr = $fx && ! empty( $fx['latest'] ) ? ( $fx['h'][ $fx['latest'] ] ?? array() ) : array();
	$r2 = function ( $c ) use ( $fr ) { return isset( $fr[ $c ] ) ? pa_bn( number_format( $fr[ $c ], 2 ) ) : '—'; };
	$bmN = $live && ! empty( $live['t'] ) ? (int) $live['t'] : ( $yk ? (int) $bd[ $yk ]['t'] : 0 );
	$bmL = $live && ! empty( $live['t'] ) ? 'আজ বিএমইটি ছাড়পত্র' : 'গতকাল বিএমইটি ছাড়পত্র';
	$u = function ( $p ) { return esc_url( home_url( $p ) ); };
	$latest = get_posts( array( 'numberposts' => 8 ) );
	?>
<section class="hero3 v5h"><div class="w">
	<div class="v5h-l">
		<span class="v5k"><span class="ldot"></span>প্রতিদিন হালনাগাদ · সরকারি সূত্র</span>
		<h1>প্রবাসের সব তথ্য,<br><span>এক জায়গায়।</span></h1>
		<form class="v5s" action="<?php echo esc_url( home_url( '/' ) ); ?>" role="search">
			<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
			<input name="s" type="search" placeholder="কী জানতে চান? যেমন: সৌদি ভিসা চেক" aria-label="খুঁজুন">
			<button type="submit">খুঁজুন</button>
		</form>
		<nav class="v5c" aria-label="জনপ্রিয়">
			<a href="<?php echo $u( '/visa-check/' ); ?>">ভিসা চেক</a><a href="<?php echo $u( '/remittance/' ); ?>">টাকার হিসাব</a><a href="<?php echo $u( '/agency/' ); ?>">এজেন্সি যাচাই</a><a href="<?php echo $u( '/gamca/' ); ?>">গামকা</a><a href="<?php echo $u( '/ramadan/' ); ?>">রমজান</a>
		</nav>
	</div>
	<div class="v5h-r" aria-label="আজকের হিসাব">
		<svg class="v5arc" viewBox="0 0 300 120" aria-hidden="true"><path d="M10 110 C 90 10, 210 10, 290 70" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-dasharray="3 7"/><circle cx="10" cy="110" r="5" fill="#FFC24B"/><circle cx="290" cy="70" r="4" fill="#fff"/></svg>
		<a class="v5t" href="<?php echo $u( '/bmet-report/' ); ?>"><small><?php echo esc_html( $bmL ); ?></small><b><?php echo $bmN ? pa_bn( number_format( $bmN ) ) . ' জন' : 'বিএমইটি লাইভ'; ?></b></a>
		<a class="v5t" href="<?php echo $u( '/taka-rate/' ); ?>"><small>১ সৌদি রিয়াল</small><b>৳<?php echo $r2( 'sar' ); ?></b></a>
		<a class="v5t" href="<?php echo $u( '/taka-rate/' ); ?>"><small>১ আমিরাত দিরহাম</small><b>৳<?php echo $r2( 'aed' ); ?></b></a>
		<a class="v5t" href="<?php echo $u( '/flight-tracker/' ); ?>"><small>ফ্লাইট ট্র্যাকার</small><b>লাইভ →</b></a>
	</div>
</div></section>
<div class="w v5">
	<section class="sec" id="dash"><div class="sh"><h2>আজকের রেট ও নামাজ</h2></div><div class="dash">
		<div class="box"><div class="bh">টাকার রেট<span class="live">লাইভ</span><a href="<?php echo $u( '/taka-rate/' ); ?>" class="v5more">সব রেট →</a></div><div class="rates" id="rates"></div>
			<div class="calc"><input id="amt" inputmode="decimal" value="1000" aria-label="পরিমাণ"><div class="out" id="out">…<small>বাজার রেটে আনুমানিক</small></div><button type="button" class="btn btn-wa" id="wa">WhatsApp এ শেয়ার</button></div>
			<p class="note">বাজার রেট, দিনে একবার হালনাগাদ। ব্যাংকের রেট কিছুটা ভিন্ন হয়। বৈধ পথে পাঠালে সরকারি প্রণোদনা পাওয়া যায়; হুন্ডি অবৈধ।</p></div>
		<div class="box"><div class="bh">প্রবাসের ঘড়ি ও নামাজ<select id="city" aria-label="শহর"></select></div><div class="clocks" id="clocks"></div><div class="pray" id="pray"></div>
			<p class="note">নামাজের সময়: AlAdhan। স্থানীয় মসজিদের সময় সামান্য ভিন্ন হতে পারে।</p></div>
	</div></section>
	<?php if ( $latest ) { ?>
	<section class="sec"><div class="sh"><h2>সর্বশেষ</h2><a class="more" href="<?php echo esc_url( home_url( '/page/2/' ) ); ?>">আরও →</a></div>
		<div class="v5l"><?php foreach ( $latest as $p ) echo pa_card( $p, 'h' ); ?></div></section>
	<?php } ?>
	<?php echo pa_dream( 'home', 'ইউরোপে ওয়ার্ক পারমিট — বাংলাদেশ ও কাতার থেকে' ); ?>
	<section class="sec" id="countries"><div class="sh"><h2>দেশভিত্তিক গাইড</h2></div><div class="v5ct">
	<?php $cs = array( array( 'sa', 'সৌদি আরব', array( 'সৌদি', 'saudi' ) ), array( 'ae', 'দুবাই / আমিরাত', array( 'দুবাই', 'আমিরাত', 'dubai', 'uae' ) ), array( 'qa', 'কাতার', array( 'কাতার', 'qatar' ) ), array( 'kw', 'কুয়েত', array( 'কুয়েত', 'kuwait' ) ), array( 'om', 'ওমান', array( 'ওমান', 'oman' ) ), array( 'bh', 'বাহরাইন', array( 'বাহরাইন', 'bahrain' ) ), array( 'my', 'মালয়েশিয়া', array( 'মালয়েশিয়া', 'malaysia' ) ), array( 'sg', 'সিঙ্গাপুর', array( 'সিঙ্গাপুর', 'singapore' ) ), array( 'it', 'ইতালি', array( 'ইতালি', 'italy' ) ), array( 'ro', 'রোমানিয়া', array( 'রোমানিয়া', 'romania' ) ), array( 'hr', 'ক্রোয়েশিয়া', array( 'ক্রোয়েশিয়া', 'croatia' ) ), array( 'pt', 'পর্তুগাল', array( 'পর্তুগাল', 'portugal' ) ), array( 'pl', 'পোল্যান্ড', array( 'পোল্যান্ড', 'poland' ) ), array( 'rs', 'সার্বিয়া', array( 'সার্বিয়া', 'serbia' ) ), array( 'gb', 'যুক্তরাজ্য', array( 'যুক্তরাজ্য', 'লন্ডন', 'uk' ) ), array( 'jp', 'জাপান', array( 'জাপান', 'japan' ) ) );
	foreach ( $cs as $c ) echo '<a href="' . esc_url( pa_service_url( $c[2] ) ) . '"><img src="https://flagcdn.com/w40/' . $c[0] . '.png" alt="" width="24" height="17" loading="lazy">' . esc_html( $c[1] ) . '</a>'; ?>
	</div></section>
	<section class="sec"><div class="sh"><h2>বিষয়</h2></div><div class="v5ct v5cat">
	<?php foreach ( pa_top_cats( 12 ) as $c ) echo '<a href="' . esc_url( get_category_link( $c ) ) . '">' . esc_html( pa_cat_name( $c ) ) . '<span>' . pa_bn( (int) $c->count ) . '</span></a>'; ?>
	</div></section>
	<section class="sec"><?php echo pa_pb( 'home', true ); ?></section>
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

/* styles: home + calmer header and inner pages (only when the layout is on) */
add_action( 'wp_head', function () {
	if ( ! pi_layout_on() ) return; ?>
<style id="pi-layout">
/* header: one row, few things */
body.pi-app .util{display:none}
body.pi-app .tools2 .tl:not(.live){display:none}
body.pi-app .hdr2 .top{height:68px}
body.pi-app .cat2 a{font-size:14.5px;padding:0 12px}
/* home hero: compact, search first */
body.pi-app .hero3.v5h{background:radial-gradient(640px 340px at 88% 0%,rgba(249,115,22,.32),transparent 62%),linear-gradient(135deg,#3A2150 0%,#6E1F4B 55%,#C2183F 100%)}
body.pi-app .hero3.v5h:after{display:none}
body.pi-app .hero3.v5h .w{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:40px;align-items:center;min-height:0;padding-top:44px;padding-bottom:48px}
.v5k{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#F3E6F5;background:rgba(255,255,255,.1);border-radius:999px;padding:5px 12px}
body.pi-app .v5h h1{color:#fff;font-size:clamp(32px,4.4vw,52px);font-weight:800;line-height:1.25;margin:14px 0 20px}
body.pi-app .v5h h1 span{background:linear-gradient(90deg,#FFC24B,#FB923C);-webkit-background-clip:text;background-clip:text;color:transparent;padding:.06em 0}
.v5s{display:flex;align-items:center;gap:8px;background:#fff;border-radius:18px;padding:6px 6px 6px 16px;box-shadow:0 22px 44px -22px rgba(20,0,20,.6);max-width:620px}
.v5s svg{width:20px;height:20px;flex:none;fill:none;stroke:#7A6E80;stroke-width:2;stroke-linecap:round}
.v5s input{flex:1;min-width:0;border:0;outline:0;background:transparent;padding:12px 4px;font:500 16.5px var(--body);color:var(--ink)}
.v5s button{border:0;border-radius:13px;padding:12px 20px;background:linear-gradient(120deg,var(--b),var(--g));color:#fff;font:700 15.5px var(--head);cursor:pointer}
.v5c{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.v5c a{color:#fff!important;font-size:14px;padding:6px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.28)}
.v5c a:hover{background:rgba(255,255,255,.12)}
.v5h-r{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.v5arc{position:absolute;left:-30px;right:-10px;top:-70px;width:calc(100% + 40px);height:auto;pointer-events:none}
.v5arc path{animation:v5dash 2.2s linear infinite}
@keyframes v5dash{to{stroke-dashoffset:-20}}
.v5t{position:relative;display:grid;gap:2px;background:#fff;color:var(--ink)!important;border-radius:18px;padding:14px 16px;box-shadow:0 18px 36px -24px rgba(20,0,20,.7);transition:transform .2s}
.v5t:hover{transform:translateY(-2px)}
.v5t small{font-size:12.5px;color:var(--mut)}
.v5t b{font:800 24px/1.2 var(--head);color:var(--b)}
/* sections */
.v5 .sec{margin-top:30px}
.v5more{margin-left:auto;font-size:13px;font-weight:700;color:var(--b)}
.v5l{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
body.pi-app .v5l .c-h .c-img{width:120px}
.v5ct{display:flex;flex-wrap:wrap;gap:8px}
.v5ct a{display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:8px 14px;font:600 14.5px var(--head);box-shadow:var(--sh)}
.v5ct a:hover{color:var(--b)}
.v5ct img{width:24px;height:17px;border-radius:3px;object-fit:cover}
.v5cat span{font:600 12px var(--body);color:var(--mut);background:var(--bg);border-radius:999px;padding:1px 8px}
/* inner pages: light headers, quiet article */
body.pi-app .arch-hd{background:#fff;color:var(--ink);border-bottom:1px solid var(--line);padding:26px 0}
body.pi-app .arch-hd h1{color:var(--ink)}
body.pi-app .arch-hd p{color:var(--mut)}
body.pi-app .arch-hd .crumbs,body.pi-app .arch-hd .crumbs a{color:var(--mut)!important}
body.pi-app .art-hd{background:transparent;border-bottom:0}
body.pi-app .art-hd h1{max-width:820px}
body.pi-app .art-img{border-radius:18px;max-width:820px}
body.pi-app .art{grid-template-columns:minmax(0,1fr) 300px;gap:32px}
body.pi-app .art-main{padding:30px 34px}
body.pi-app .ct{max-width:72ch}
body.pi-app .share{background:var(--bg);color:var(--ink)}
body.pi-app .share p{color:var(--ink)}
body.pi-app .share .cp{background:#fff;color:var(--ink)!important;border:1px solid var(--line)}
body.pi-app .side .box .bh{font-size:16px}
@media(max-width:1020px){body.pi-app .hero3.v5h .w{grid-template-columns:minmax(0,1fr);gap:22px}.v5arc{display:none}body.pi-app .art{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.v5l{grid-template-columns:minmax(0,1fr)}}
@media(max-width:640px){
 body.pi-app .hero3.v5h .w{padding-top:26px;padding-bottom:28px}
 .v5s{padding:5px 5px 5px 12px;border-radius:16px}.v5s input{font-size:15px}.v5s button{padding:11px 14px}
 .v5c{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-right:-14px}.v5c a{flex:none}
 .v5t{padding:12px}.v5t b{font-size:20px}
 body.pi-app .v5l .c-h .c-img{width:96px}
 .v5ct a{padding:7px 12px;font-size:13.5px}
 body.pi-app .art-main{padding:18px 16px}
}
@media(prefers-reduced-motion:reduce){.v5arc path{animation:none}}
</style>
<?php }, 101 );
