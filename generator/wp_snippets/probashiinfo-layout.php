<?php
/* প্রবাসী ইনফো — clean layout v6 (Nov 2026). Minimal, professional, neutral colours with one red accent.
   Renders home, post and archive/search views before #14's router (priority 98) using #14's own shell
   (pa_head/pa_foot/pa_js) and helpers, so wp_head (Rank Math), URLs and Adsterra are unchanged.
   Ads kept, one of each, in a quiet style: Dream International (home once; post in-text for Europe topics
   + post bottom, same rule as #14), app download (#33 header button, slim bar, footer card; #14 in-text
   card on non-Europe posts), Adsterra native (#19, boxed) + popunder. Home lists have no images.
   Data pages (#32), BMET/flight/rates tools render themselves and only get the palette.
   Rollout: PI6_PUBLIC false = only with ?v6=1 (cookie; ?v6=0 clears). Rollback = deactivate. */
if ( ! defined( 'PI6_PUBLIC' ) ) define( 'PI6_PUBLIC', false );
if ( ! defined( 'PI6_VERSION' ) ) define( 'PI6_VERSION', '6.0.0' );

function pi6_on() {
	static $on = null;
	if ( $on !== null ) return $on;
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return $on = false;
	if ( ! function_exists( 'pa_app' ) || ! pa_app() ) return $on = false;
	if ( isset( $_GET['v6'] ) ) {
		$want = $_GET['v6'] === '1';
		if ( ! headers_sent() ) setcookie( 'pi_v6', $want ? '1' : '', $want ? time() + 30 * DAY_IN_SECONDS : time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
		return $on = $want;
	}
	return $on = ( PI6_PUBLIC || ! empty( $_COOKIE['pi_v6'] ) );
}

add_action( 'init', function () {
	if ( PI6_PUBLIC && get_option( 'pi6_purged' ) !== PI6_VERSION ) {
		update_option( 'pi6_purged', PI6_VERSION, false );
		do_action( 'litespeed_purge_all' );
	}
} );

add_action( 'template_redirect', function () {
	if ( ! pi6_on() || ! function_exists( 'pa_head' ) || ! function_exists( 'pa_foot' ) ) return;
	if ( is_feed() || is_embed() || is_trackback() || is_robots() || is_attachment() || is_preview() ) return;
	$home = is_front_page() && ! is_paged();
	$single = is_singular( 'post' );
	$list = ! $home && ( is_home() || is_archive() || is_search() );
	if ( ! $home && ! $single && ! $list ) return;
	if ( ! PI6_PUBLIC ) do_action( 'litespeed_control_set_nocache', 'probashiinfo v6 preview' );
	elseif ( $home ) do_action( 'litespeed_control_set_ttl', 1800 );
	pa_head();
	if ( $home ) pi_v6_home(); elseif ( $single ) pi_v6_single(); else pi_v6_list();
	pa_foot();
	exit;
}, 97 );

/* one text row: date · category · title (no image) */
function pi_v6_row( $p ) {
	$cats = get_the_category( $p->ID ); $cat = $cats ? $cats[0] : null;
	$t = get_post_time( 'U', true, $p );
	return '<li><a href="' . esc_url( get_permalink( $p ) ) . '"><span class="m">' . esc_html( pa_date( $t ) ) . ( $cat ? ' · <em>' . esc_html( pa_cat_name( $cat ) ) . '</em>' : '' ) . '</span><b>' . esc_html( get_the_title( $p ) ) . '</b></a></li>';
}

function pi_v6_home() {
	$live = function_exists( 'pa_bmet_live' ) ? pa_bmet_live() : null;
	$bm = get_option( 'pa_bmet' ); $bd = ( ! empty( $bm['days'] ) && is_array( $bm['days'] ) ) ? $bm['days'] : array(); ksort( $bd );
	$tdy = wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) );
	$bk = array_values( array_filter( array_keys( $bd ), function ( $k ) use ( $tdy ) { return $k < $tdy; } ) ); $yk = $bk ? end( $bk ) : '';
	$fx = function_exists( 'pa_fx_data' ) ? pa_fx_data() : null; $fr = $fx && ! empty( $fx['latest'] ) ? ( $fx['h'][ $fx['latest'] ] ?? array() ) : array();
	$r2 = function ( $c ) use ( $fr ) { return isset( $fr[ $c ] ) ? pa_bn( number_format( $fr[ $c ], 2 ) ) : '—'; };
	$bmN = $live && ! empty( $live['t'] ) ? (int) $live['t'] : ( $yk ? (int) $bd[ $yk ]['t'] : 0 );
	$bmL = $live && ! empty( $live['t'] ) ? 'আজ বিএমইটি ছাড়পত্র' : 'গতকাল বিএমইটি ছাড়পত্র';
	$u = function ( $p ) { return esc_url( home_url( $p ) ); };
	$latest = get_posts( array( 'numberposts' => 12 ) );
	?>
<section class="hero3 v6h"><div class="w">
	<div class="v6h-l">
		<span class="v6k"><span class="ldot"></span>প্রতিদিন হালনাগাদ · সরকারি সূত্র</span>
		<h1>প্রবাসের পথে,<br><span>পাশে আছি।</span></h1>
		<p class="v6sub">ভিসা, টাকার রেট, এজেন্সি, বিএমইটি — প্রবাসের দরকারি তথ্য এক জায়গায়।</p>
		<form class="v6s" action="<?php echo esc_url( home_url( '/' ) ); ?>" role="search">
			<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
			<input name="s" type="search" placeholder="কী জানতে চান? যেমন: সৌদি ভিসা চেক" aria-label="খুঁজুন">
			<button type="submit">খুঁজুন</button>
		</form>
		<nav class="v6c" aria-label="জনপ্রিয়"><span>জনপ্রিয়:</span>
			<a href="<?php echo $u( '/visa-check/' ); ?>">ভিসা চেক</a><a href="<?php echo $u( '/remittance/' ); ?>">টাকার হিসাব</a><a href="<?php echo $u( '/agency/' ); ?>">এজেন্সি যাচাই</a><a href="<?php echo $u( '/gamca/' ); ?>">গামকা</a><a href="<?php echo $u( '/ramadan/' ); ?>">রমজান</a>
		</nav>
	</div>
	<div class="v6h-r" aria-label="আজকের হিসাব">
		<a class="v6t" href="<?php echo $u( '/bmet-report/' ); ?>"><small><?php echo esc_html( $bmL ); ?></small><b><?php echo $bmN ? pa_bn( number_format( $bmN ) ) . ' জন' : 'লাইভ'; ?></b></a>
		<a class="v6t" href="<?php echo $u( '/taka-rate/' ); ?>"><small>১ সৌদি রিয়াল</small><b>৳<?php echo $r2( 'sar' ); ?></b></a>
		<a class="v6t" href="<?php echo $u( '/taka-rate/' ); ?>"><small>১ আমিরাত দিরহাম</small><b>৳<?php echo $r2( 'aed' ); ?></b></a>
		<a class="v6t" href="<?php echo $u( '/flight-tracker/' ); ?>"><small>ফ্লাইট ট্র্যাকার</small><b>লাইভ দেখুন</b></a>
	</div>
</div></section>
<div class="w v6">
	<section class="sec" id="dash"><div class="sh"><h2>আজকের রেট ও নামাজ</h2></div><div class="dash">
		<div class="box"><div class="bh">টাকার রেট<span class="live">লাইভ</span><a href="<?php echo $u( '/taka-rate/' ); ?>" class="v6more">সব রেট →</a></div><div class="rates" id="rates"></div>
			<div class="calc"><input id="amt" inputmode="decimal" value="1000" aria-label="পরিমাণ"><div class="out" id="out">…<small>বাজার রেটে আনুমানিক</small></div><button type="button" class="btn btn-wa" id="wa">WhatsApp এ শেয়ার</button></div>
			<p class="note">বাজার রেট, দিনে একবার হালনাগাদ। ব্যাংকের রেট কিছুটা ভিন্ন হয়। বৈধ পথে পাঠালে সরকারি প্রণোদনা পাওয়া যায়; হুন্ডি অবৈধ।</p></div>
		<div class="box"><div class="bh">প্রবাসের ঘড়ি ও নামাজ<select id="city" aria-label="শহর"></select></div><div class="clocks" id="clocks"></div><div class="pray" id="pray"></div>
			<p class="note">নামাজের সময়: AlAdhan। স্থানীয় মসজিদের সময় সামান্য ভিন্ন হতে পারে।</p></div>
	</div></section>
	<?php if ( $latest ) { ?>
	<section class="sec"><div class="sh"><h2>সর্বশেষ</h2><a class="more" href="<?php echo $u( '/page/2/' ); ?>">আরও →</a></div>
		<ul class="v6l"><?php foreach ( $latest as $p ) echo pi_v6_row( $p ); ?></ul></section>
	<?php } ?>
	<?php echo pa_dream( 'home', 'ইউরোপে ওয়ার্ক পারমিট — বাংলাদেশ ও কাতার থেকে' ); ?>
	<section class="sec" id="countries"><div class="sh"><h2>দেশভিত্তিক গাইড</h2></div><div class="v6ct">
	<?php $cs = array( array( 'sa', 'সৌদি আরব', array( 'সৌদি', 'saudi' ) ), array( 'ae', 'দুবাই / আমিরাত', array( 'দুবাই', 'আমিরাত', 'dubai', 'uae' ) ), array( 'qa', 'কাতার', array( 'কাতার', 'qatar' ) ), array( 'kw', 'কুয়েত', array( 'কুয়েত', 'kuwait' ) ), array( 'om', 'ওমান', array( 'ওমান', 'oman' ) ), array( 'bh', 'বাহরাইন', array( 'বাহরাইন', 'bahrain' ) ), array( 'my', 'মালয়েশিয়া', array( 'মালয়েশিয়া', 'malaysia' ) ), array( 'sg', 'সিঙ্গাপুর', array( 'সিঙ্গাপুর', 'singapore' ) ), array( 'it', 'ইতালি', array( 'ইতালি', 'italy' ) ), array( 'ro', 'রোমানিয়া', array( 'রোমানিয়া', 'romania' ) ), array( 'hr', 'ক্রোয়েশিয়া', array( 'ক্রোয়েশিয়া', 'croatia' ) ), array( 'pt', 'পর্তুগাল', array( 'পর্তুগাল', 'portugal' ) ), array( 'pl', 'পোল্যান্ড', array( 'পোল্যান্ড', 'poland' ) ), array( 'rs', 'সার্বিয়া', array( 'সার্বিয়া', 'serbia' ) ), array( 'gb', 'যুক্তরাজ্য', array( 'যুক্তরাজ্য', 'লন্ডন', 'uk' ) ), array( 'jp', 'জাপান', array( 'জাপান', 'japan' ) ) );
	foreach ( $cs as $c ) echo '<a href="' . esc_url( pa_service_url( $c[2] ) ) . '"><img src="https://flagcdn.com/w40/' . $c[0] . '.png" alt="" width="22" height="16" loading="lazy">' . esc_html( $c[1] ) . '</a>'; ?>
	</div></section>
	<section class="sec"><div class="sh"><h2>বিষয়</h2></div><div class="v6ct v6cat">
	<?php foreach ( pa_top_cats( 12 ) as $c ) echo '<a href="' . esc_url( get_category_link( $c ) ) . '">' . esc_html( pa_cat_name( $c ) ) . '<span>' . pa_bn( (int) $c->count ) . '</span></a>'; ?>
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

/* article: same content and ad rule as #14, cleaner frame, featured image inside the reading column */
function pi_v6_single() {
	while ( have_posts() ) {
		the_post();
		$id = get_the_ID();
		$cats = get_the_category( $id ); $cat = $cats ? $cats[0] : null;
		$content = apply_filters( 'the_content', get_the_content() );
		$hay = get_the_title() . ' ' . wp_strip_all_tags( substr( $content, 0, 3000 ) );
		$europe = (bool) preg_match( '/সার্বিয়া|বসনিয়া|গ্রিস|পর্তুগাল|মলদোভা|বুলগেরিয়া|ইউরোপ|ওয়ার্ক পারমিট|work permit/iu', $hay );
		$content = pa_after_p( $content, 2, $europe ? pa_dream( 'post-intext' ) : pa_pb( 'post-intext' ) );
		$updated = get_the_modified_time( 'U' ) > get_the_time( 'U' ) + DAY_IN_SECONDS;
		$url = get_permalink(); $title = get_the_title();
		?>
<div class="w v6a">
	<div class="v6a-hd">
		<nav class="crumbs" aria-label="ব্রেডক্রাম্ব"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a><span>›</span><?php if ( $cat ) echo '<a href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pa_cat_name( $cat ) ) . '</a><span>›</span>'; ?><span>এই লেখা</span></nav>
		<?php if ( $cat ) echo '<a class="v6tag" href="' . esc_url( get_category_link( $cat ) ) . '">' . esc_html( pa_cat_name( $cat ) ) . '</a>'; ?>
		<h1><?php the_title(); ?></h1>
		<div class="art-meta"><span><?php echo $updated ? 'হালনাগাদ: ' . esc_html( pa_date( get_post_modified_time( 'U', true ) ) ) : 'প্রকাশ: ' . esc_html( pa_date( get_post_time( 'U', true ) ) ); ?></span><span>·</span><span>পড়তে <?php echo pa_bn( pa_mins( $id ) ); ?> মিনিট</span>
			<span class="fsz" aria-label="লেখার আকার"><button type="button" data-fs="-1" aria-label="লেখা ছোট">অ−</button><button type="button" data-fs="1" aria-label="লেখা বড়">অ+</button></span></div>
	</div>
	<div class="art">
		<article class="art-main">
			<?php if ( has_post_thumbnail() ) echo '<figure class="v6img">' . get_the_post_thumbnail( null, 'large', array( 'alt' => esc_attr( $title ) ) ) . '</figure>'; ?>
			<?php if ( substr_count( $content, '<h2' ) >= 3 ) echo '<nav class="toc" aria-label="এই লেখায়" hidden><b>এই লেখায় যা আছে</b><ol></ol></nav>'; ?>
			<div class="ct" id="ct"><?php echo $content; ?></div>
			<div class="share"><p>তথ্যটি কাজে লাগলে প্রবাসী ভাই-বোনদের পাঠিয়ে দিন।</p>
				<a class="btn btn-wa" href="<?php echo esc_url( 'https://wa.me/?text=' . rawurlencode( $title . "\n" . $url ) ); ?>" target="_blank" rel="noopener">WhatsApp</a>
				<a class="btn fb" href="<?php echo esc_url( 'https://www.facebook.com/sharer/sharer.php?u=' . rawurlencode( $url ) ); ?>" target="_blank" rel="noopener">Facebook</a>
				<button type="button" class="btn cp copy">লিংক কপি</button></div>
			<?php if ( ! $europe ) echo pa_dream( 'post-bottom', 'ইউরোপে ওয়ার্ক পারমিট — বাংলাদেশ ও কাতার থেকে' ); ?>
			<?php pa_comments( $id ); ?>
		</article>
		<aside class="side">
			<div class="box"><div class="bh">আজকের রেট<span class="live">লাইভ</span></div><div class="mrates" id="mrates"><div><span>লোড হচ্ছে…</span></div></div><a class="v6more" style="display:block;margin-top:10px" href="<?php echo esc_url( home_url( '/remittance/' ) ); ?>">ক্যালকুলেটর →</a></div>
			<div class="box"><div class="bh">সর্বশেষ</div><ul class="v6l v6l-s"><?php foreach ( get_posts( array( 'numberposts' => 6, 'post__not_in' => array( $id ) ) ) as $p ) echo pi_v6_row( $p ); ?></ul></div>
		</aside>
	</div>
	<?php
		$rel = get_posts( array( 'numberposts' => 6, 'category__in' => wp_get_post_categories( $id ), 'post__not_in' => array( $id ) ) );
		if ( $rel ) { echo '<section class="sec"><div class="sh"><h2>আরও পড়ুন</h2></div><ul class="v6l">'; foreach ( $rel as $p ) echo pi_v6_row( $p ); echo '</ul></section>'; }
	?>
</div>
<?php
	}
}

/* category / tag / search / older posts: light header, clean rows with a small image */
function pi_v6_list() {
	$o = get_queried_object();
	if ( is_search() ) { $h = 'খোঁজ: “' . get_search_query() . '”'; $d = pa_bn( (int) $GLOBALS['wp_query']->found_posts ) . 'টি লেখা পাওয়া গেছে'; }
	elseif ( is_category() || is_tag() || is_tax() ) { $h = pa_cat_name( $o ); $d = wp_strip_all_tags( term_description() ); }
	elseif ( is_home() ) { $h = 'সব লেখা'; $d = ''; }
	else { $h = wp_strip_all_tags( get_the_archive_title() ); $d = ''; }
	echo '<section class="arch-hd"><div class="w"><nav class="crumbs" aria-label="ব্রেডক্রাম্ব"><a href="' . esc_url( home_url( '/' ) ) . '">হোম</a><span>›</span><span>' . esc_html( $h ) . '</span></nav><h1>' . esc_html( $h ) . '</h1>' . ( $d ? '<p>' . esc_html( $d ) . '</p>' : '' ) . '</div></section><div class="w v6">';
	if ( have_posts() ) {
		echo '<section class="sec"><ul class="v6g">';
		while ( have_posts() ) {
			the_post(); $p = get_post();
			$img = has_post_thumbnail( $p ) ? get_the_post_thumbnail( $p, 'medium', array( 'loading' => 'lazy', 'alt' => '' ) ) : '';
			echo '<li><a href="' . esc_url( get_permalink( $p ) ) . '">' . ( $img ? '<span class="i">' . $img . '</span>' : '' ) . '<span class="t"><span class="m">' . esc_html( pa_date( get_post_time( 'U', true, $p ) ) ) . ' · ' . pa_bn( pa_mins( $p ) ) . ' মিনিট</span><b>' . esc_html( get_the_title( $p ) ) . '</b><span class="x">' . esc_html( wp_trim_words( get_the_excerpt( $p ), 22, '…' ) ) . '</span></span></a></li>';
		}
		echo '</ul></section>';
		$links = paginate_links( array( 'type' => 'list', 'prev_text' => '‹', 'next_text' => '›' ) );
		if ( $links ) echo '<nav class="pager" aria-label="পাতা">' . $links . '</nav>';
	} else {
		echo '<div class="empty"><p>কোনো লেখা পাওয়া যায়নি। অন্য শব্দে খুঁজে দেখুন।</p><form class="v6s" style="margin:14px auto" action="' . esc_url( home_url( '/' ) ) . '" role="search"><input name="s" type="search" placeholder="খুঁজুন…" aria-label="খুঁজুন"><button type="submit">খুঁজুন</button></form></div>';
	}
	echo '</div>';
}

/* styles */
add_action( 'wp_head', function () {
	if ( ! pi6_on() ) return; ?>
<style id="pi-layout6">
/* neutral professional palette, one accent (beats #35's tokens) */
html body.pi-app,html body.bm-app,html body.ft-app,html body.fx-app{--b:#D61F45;--b2:#B0173A;--nv:#221B29;--nv2:#221B29;--g:#D61F45;--g2:#D61F45;--gs:#F4F3F6;--bs:#F4F3F6;--red:#D61F45;--gold:#D61F45;--soft:#F4F3F6;--sky:#D61F45;
 --ink:#17131B;--ink2:#3E3944;--mut:#6F6976;--line:#E9E7EC;--bg:#F7F7F8;--card:#fff;--r:14px;--sh:0 1px 2px rgba(20,16,24,.04),0 4px 14px -10px rgba(20,16,24,.16)}
/* header: quiet */
body.pi-app .util{display:none}
body.pi-app .tools2 .tl:not(.live){display:none}
body.pi-app .hdr2{box-shadow:0 1px 0 var(--line)}
body.pi-app .hdr2 .top{height:66px}
body.pi-app .srch2{background:#F4F3F6;border-color:transparent}
body.pi-app .srch2 button,body.pi-app .tl.live{background:var(--ink);color:#fff!important}
body.pi-app .cat2 a{font-size:14.5px;padding:0 12px}
body.pi-app .cat2 a:hover,body.pi-app .cat2 a.on{color:var(--ink)!important;border-bottom-color:var(--b)}
/* emoji icons in grey so the page is not a rainbow */
body.pi-app .pbh-t i,body.pi-app .svc i,body.pi-app .tabs i,body.pi-app .drw-t i,body.pi-app .hl i,body.pi-app .pbb-hbtn i{filter:grayscale(1);opacity:.85}
body.pi-app .pbh-t i,body.pi-app .svc i{background:#F4F3F6!important}
body.pi-app .pbh-t small{color:var(--mut)!important;font-weight:600}
/* home hero: white, text-first */
body.pi-app .hero3.v6h{background:#fff;color:var(--ink);border-bottom:1px solid var(--line)}
body.pi-app .hero3.v6h:before,body.pi-app .hero3.v6h:after{display:none}
body.pi-app .hero3.v6h .w{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:48px;align-items:center;min-height:0;padding-top:46px;padding-bottom:46px}
.v6k{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--mut)}
.v6k .ldot{background:var(--b)}
body.pi-app .v6h h1{color:var(--ink);font-size:clamp(32px,4.2vw,50px);font-weight:800;line-height:1.25;margin:10px 0 8px}
body.pi-app .v6h h1 span{color:var(--b)}
.v6sub{margin:0 0 20px;color:var(--mut);font-size:16.5px}
.v6s{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:5px 5px 5px 14px;max-width:600px;transition:border-color .2s,box-shadow .2s}
.v6s:focus-within{border-color:var(--ink);box-shadow:0 0 0 4px rgba(23,19,27,.06)}
.v6s svg{width:19px;height:19px;flex:none;fill:none;stroke:var(--mut);stroke-width:2;stroke-linecap:round}
.v6s input{flex:1;min-width:0;border:0;outline:0;background:transparent;padding:11px 4px;font:500 16px var(--body);color:var(--ink)}
.v6s button{border:0;border-radius:10px;padding:11px 20px;background:var(--b);color:#fff;font:700 15px var(--head);cursor:pointer}
.v6s button:hover{background:var(--b2)}
.v6c{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:14px;font-size:14px;color:var(--mut)}
.v6c a{color:var(--ink2)!important;border-bottom:1px solid var(--line)}
.v6c a:hover{color:var(--b)!important;border-color:var(--b)}
.v6h-r{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.v6t{display:grid;gap:2px;background:#fff;color:var(--ink)!important;padding:16px 18px}
.v6t:hover{background:#FAFAFB}
.v6t small{font-size:12.5px;color:var(--mut)}
.v6t b{font:800 24px/1.25 var(--head);color:var(--ink);font-variant-numeric:tabular-nums}
/* sections */
.v6 .sec,.v6a .sec{margin-top:32px}
body.pi-app .sh:before{width:4px;height:20px;background:var(--b)}
body.pi-app .sh h2{font-size:22px}
.v6more{margin-left:auto;font-size:13px;font-weight:700;color:var(--b)!important}
body.pi-app .bh .live{color:var(--mut)}
body.pi-app .bh .live:before{background:var(--b)}
body.pi-app .calc{background:#F4F3F6;color:var(--ink)}
body.pi-app .calc .out small{color:var(--mut)}
body.pi-app .calc input{border:1px solid var(--line)}
body.pi-app .rate.on{border-color:var(--ink);background:#fff}
body.pi-app .pray .on{background:var(--ink);border-color:var(--ink)}
body.pi-app .clocks .bd{background:#fff;border-color:var(--ink)}
/* text lists (no images) */
.v6l{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 28px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:4px 20px}
.v6l li{border-bottom:1px solid var(--line)}
.v6l li:nth-last-child(-n+2){border-bottom:0}
.v6l a{display:grid;gap:3px;padding:14px 0}
.v6l .m{font-size:12.5px;color:var(--mut)}
.v6l .m em{font-style:normal;color:var(--b);font-weight:600}
.v6l b{font:600 16px/1.5 var(--head);color:var(--ink)}
.v6l a:hover b{color:var(--b)}
.v6l-s{grid-template-columns:minmax(0,1fr);border:0;padding:0;border-radius:0}
.v6l-s li:nth-last-child(-n+2){border-bottom:1px solid var(--line)}.v6l-s li:last-child{border-bottom:0}
.v6l-s a{padding:10px 0}.v6l-s b{font-size:14.5px}
/* chips */
.v6ct{display:flex;flex-wrap:wrap;gap:8px}
.v6ct a{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 13px;font:600 14.5px var(--head);color:var(--ink)!important}
.v6ct a:hover{border-color:var(--ink)}
.v6ct img{width:22px;height:16px;border-radius:3px;object-fit:cover}
.v6cat span{font:600 12px var(--body);color:var(--mut)}
/* cards everywhere: flat, thin border */
body.pi-app .box,body.pi-app .faq details,body.pi-app .pbh-t,body.pi-app .art-main,body.pi-app .cms{box-shadow:none!important;border:1px solid var(--line)!important}
body.pi-app .pbh-t:hover{border-color:var(--ink)!important;transform:none}
body.pi-app .faq summary:before{background:#F4F3F6;color:var(--ink)}
body.pi-app .faq details[open] summary:before{background:var(--ink)}
/* article */
.v6a-hd{max-width:820px;padding:26px 0 6px}
.v6tag{display:inline-block;margin:10px 0 0;font:700 13px var(--head);color:var(--b)!important}
.v6a-hd h1{font-size:clamp(27px,3.6vw,40px);font-weight:800;line-height:1.3;margin:6px 0 10px}
body.pi-app .art{grid-template-columns:minmax(0,1fr) 300px;gap:32px;margin-top:14px}
body.pi-app .art-main{padding:28px 34px}
.v6img{margin:0 0 22px;border-radius:12px;overflow:hidden;aspect-ratio:16/9;background:#F4F3F6}
.v6img img{width:100%;height:100%;object-fit:cover;display:block}
body.pi-app .ct{max-width:70ch}
body.pi-app .ct h2{background:none;border-left:0;padding:0;border-radius:0;font-size:24px}
body.pi-app .ct h3{color:var(--ink)}
body.pi-app .ct th{background:#F4F3F6;color:var(--ink)}
body.pi-app .ct blockquote{background:#F7F7F8;border-left-color:var(--b)}
body.pi-app .toc{background:#F7F7F8;border:0}
body.pi-app .toc b{color:var(--ink)}
body.pi-app .toc li:before{background:var(--b)}
body.pi-app .share{background:#F7F7F8;color:var(--ink)}
body.pi-app .share p{color:var(--ink)}
body.pi-app .share .cp{background:#fff;color:var(--ink)!important;border:1px solid var(--line)}
body.pi-app .art-meta .pill{display:none}
/* archive */
body.pi-app .arch-hd{background:#fff;color:var(--ink);border-bottom:1px solid var(--line);padding:28px 0}
body.pi-app .arch-hd h1{color:var(--ink)}
body.pi-app .arch-hd p{color:var(--mut)}
body.pi-app .arch-hd .crumbs,body.pi-app .arch-hd .crumbs a{color:var(--mut)!important}
.v6g{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.v6g a{display:grid;grid-template-columns:200px minmax(0,1fr);gap:18px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px}
.v6g a:hover{border-color:var(--ink)}
.v6g a>.t:only-child{grid-column:1/-1}
.v6g .i{display:block;aspect-ratio:16/10;border-radius:10px;overflow:hidden;background:#F4F3F6}
.v6g .i img{width:100%;height:100%;object-fit:cover;display:block}
.v6g .t{display:grid;gap:4px;min-width:0}
.v6g .m{font-size:12.5px;color:var(--mut)}
.v6g b{font:700 18px/1.45 var(--head);color:var(--ink)}
.v6g .x{font-size:14.5px;color:var(--ink2);line-height:1.6}
body.pi-app .pager .current{background:var(--ink);border-color:var(--ink)}
/* dark heroes on data pages and tools: one solid ink colour */
body.pi-app .pbd .pbd-hero{background:var(--nv)}
body.bm-app .ah,body.ft-app .ah,body.fx-app .ah{background:#221B29}
body.bm-app .hero,body.ft-app .hero,body.fx-app .hero{background:#221B29}
/* footer */
body.pi-app .ft{background:#fff}
body.pi-app .tabs .hot{background:var(--ink)}
/* ads: same ads, quiet style */
body.pi-app .ad-dream{border:1px solid var(--line);border-left:1px solid var(--line);box-shadow:none;border-radius:14px;background:#fff}
body.pi-app .ad-dream-txt b{font-size:17px}
body.pi-app .ad-chips span{background:#F4F3F6;color:var(--ink2)}
body.pi-app .ad-dream .btn-g{background:var(--ink)}
body.pi-app .ad-tag{background:transparent;border:0;padding:0;color:var(--mut)}
body.pi-app .ad-pb-big{background:#fff;color:var(--ink);border:1px solid var(--line)}
body.pi-app .ad-pb-big h3{color:var(--ink)}body.pi-app .ad-pb-big p{color:var(--mut)}
body.pi-app .ad-pb-links a{background:#F4F3F6;border-color:transparent;color:var(--ink)}
body.pi-app .ad-pb-big .btn-w{background:var(--ink);color:#fff!important}
body.pi-app .pbb-hbtn{background:#fff!important;color:var(--ink)!important;border:1px solid var(--line);box-shadow:none}
body.pi-app .pbb-strip{background:#fff!important;color:var(--ink)!important;border-bottom:1px solid var(--line)}
body.pi-app .pbb-strip p small{color:var(--mut)}
body.pi-app .pbb-strip a{background:var(--ink)!important;color:#fff!important}
body.pi-app .pbb-strip button{background:#F4F3F6!important;color:var(--ink)!important}
body.pi-app .pbb-ft .pbb-card{background:#fff!important;color:var(--ink)!important;border:1px solid var(--line);box-shadow:none!important}
/* extra app promos off: the popup (#28) and the top bar (#33); header button, footer card and in-article card stay */
#pba-pop,body.pi-app .pbb-strip{display:none!important}
body.pi-app .pba-card{background:#fff!important;color:var(--ink)!important;border:1px solid var(--line)!important;box-shadow:none!important;border-radius:14px!important}
body.pi-app .pba-card b{color:var(--ink)!important}
#pi-ad-native{max-width:1160px!important;margin:32px auto!important;padding:12px 16px 16px!important;background:#fff;border:1px solid var(--line);border-radius:14px;box-sizing:border-box}
#pi-ad-native:before{content:"বিজ্ঞাপন";display:block;text-align:left;font:600 11px var(--body,sans-serif);letter-spacing:.06em;color:var(--mut);margin-bottom:8px}
@media(max-width:1020px){body.pi-app .hero3.v6h .w{grid-template-columns:minmax(0,1fr);gap:24px}body.pi-app .art{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.v6l{grid-template-columns:minmax(0,1fr)}.v6l li:nth-last-child(2){border-bottom:1px solid var(--line)}.v6g a{grid-template-columns:110px minmax(0,1fr);gap:12px;padding:10px}.v6g .x{display:none}.v6g b{font-size:16px}}
@media(max-width:640px){
 body.pi-app .hero3.v6h .w{padding-top:26px;padding-bottom:26px}
 .v6sub{font-size:15px;margin-bottom:16px}
 .v6s input{font-size:15px}.v6s button{padding:10px 14px}
 .v6t{padding:12px 14px}.v6t b{font-size:20px}
 .v6l{padding:2px 16px}
 .v6ct a{padding:7px 11px;font-size:13.5px}
 body.pi-app .art-main{padding:16px}
 #pi-ad-native{margin:24px 14px!important}
}
</style>
<?php }, 101 );
