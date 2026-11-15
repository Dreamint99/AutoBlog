<?php
/* প্রবাসী ইনফো — clean layout v6 (Nov 2026). Minimal, professional, neutral colours with one red accent.
   Renders home, post and archive/search views before #14's router (priority 98) using #14's own shell
   (pa_head/pa_foot/pa_js) and helpers, so wp_head (Rank Math), URLs and Adsterra are unchanged.
   Ads kept, one of each, in a quiet style: Dream International (home once; post in-text for Europe topics
   + post bottom, same rule as #14), app download (#33 header button, slim bar, footer card; #14 in-text
   card on non-Europe posts), Adsterra native (#19, boxed) + popunder. Home lists have no images.
   Data pages (#32), BMET/flight/rates tools render themselves and only get the palette.
   Rollout: PI6_PUBLIC false = only with ?v6=1 (cookie; ?v6=0 clears). Rollback = deactivate. */
if ( ! defined( 'PI6_PUBLIC' ) ) define( 'PI6_PUBLIC', true );
if ( ! defined( 'PI6_VERSION' ) ) define( 'PI6_VERSION', '7.1.4' );

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
<section class="hero3 v6h v7h" aria-label="প্রবাসী ইনফো">
	<div class="w">
		<div class="v7slide" id="v7slide">
			<div class="v7imgs"><?php foreach ( pi_v7_slides() as $i => $s ) echo '<img src="' . esc_url( $s[0] ) . '" alt="' . esc_attr( $s[1] ) . '" width="1600" height="900"' . ( $i ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"' ) . ( $i ? '' : ' class="on"' ) . '>'; ?></div>
			<div class="v7in">
				<span class="v6k"><span class="ldot"></span>প্রতিদিন হালনাগাদ · সরকারি সূত্র</span>
				<h1>বিদেশে আপনি একা নন —<br><span>প্রবাসী ইনফো আছে।</span></h1>
				<form class="v6s" action="<?php echo esc_url( home_url( '/' ) ); ?>" role="search">
					<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
					<input name="s" type="search" placeholder="কী জানতে চান? যেমন: সৌদি ভিসা চেক" aria-label="খুঁজুন">
					<button type="submit">খুঁজুন</button>
				</form>
				<nav class="v7c" aria-label="জনপ্রিয়"><a href="<?php echo $u( '/visa-check/' ); ?>">ভিসা চেক</a><a href="<?php echo $u( '/remittance/' ); ?>">টাকার হিসাব</a><a href="<?php echo $u( '/agency/' ); ?>">এজেন্সি যাচাই</a><a href="<?php echo $u( '/gamca/' ); ?>">গামকা</a><a href="<?php echo $u( '/ramadan/' ); ?>">রমজান</a></nav>
			</div>
			<div class="v7bar"><div class="v7strip" id="v7strip"><?php foreach ( pi_v7_slides() as $i => $s ) echo '<button type="button" data-s="' . $i . '"' . ( $i ? '' : ' class="on"' ) . '>' . esc_html( $s[1] ) . '<i></i></button>'; ?></div><div class="v7cr" id="v7cr"><?php $s0 = pi_v7_slides(); echo esc_html( $s0[0][2] ); ?></div></div>
		</div>
		<div class="v7stats">
			<a href="<?php echo $u( '/bmet-report/' ); ?>"><small><?php echo esc_html( $bmL ); ?></small><b><?php echo $bmN ? pa_bn( number_format( $bmN ) ) . ' জন' : 'লাইভ'; ?></b></a>
			<a href="<?php echo $u( '/taka-rate/' ); ?>"><small>১ সৌদি রিয়াল</small><b>৳<?php echo $r2( 'sar' ); ?></b></a>
			<a href="<?php echo $u( '/taka-rate/' ); ?>"><small>১ আমিরাত দিরহাম</small><b>৳<?php echo $r2( 'aed' ); ?></b></a>
			<a href="<?php echo $u( '/taka-rate/' ); ?>"><small>১ মালয়েশিয়ান রিংগিত</small><b>৳<?php echo $r2( 'myr' ); ?></b></a>
		</div>
	</div>
</section>
<div class="w v6">
	<section class="sec" aria-labelledby="v7svc-h"><div class="sh"><h2 id="v7svc-h">এক ক্লিকে প্রবাসী সেবা</h2><span class="v7sub">সরকারি সূত্রের তথ্য · প্রতিদিন হালনাগাদ</span></div>
		<div class="v7svc"><?php foreach ( pi_v7_services() as $i => $s ) echo '<a href="' . $u( $s[0] ) . '" style="--i:' . $i . '"><span class="ic ' . $s[3] . '">' . pi_v7_icon( $s[4] ) . '</span><b>' . esc_html( $s[1] ) . '</b><small>' . esc_html( $s[2] ) . '</small></a>'; ?></div>
		<form class="v7ag" method="get" action="<?php echo $u( '/agency/' ); ?>"><span class="ic ac-ind"><?php echo pi_v7_icon( 'shield' ); ?></span><input name="q" type="search" placeholder="এজেন্সির নাম বা আরএল নম্বর লিখে যাচাই করুন" aria-label="এজেন্সি যাচাই"><button type="submit">যাচাই</button></form>
	</section>
</div>
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

/* v7 home: photo slider (Wikimedia Commons, credited) + service grid with drawn icons */
function pi_v7_slides() {
	$f = function ( $k ) { return home_url( '/wp-content/uploads/2026/11/pi-hero-' . $k . '.webp' ); };
	return array_values( array_filter( array(
		array( $f( 'riyadh' ), 'রিয়াদ', 'ছবি: রিয়াদ · B.alotaby, CC BY-SA 4.0, উইকিমিডিয়া কমন্স' ),
		array( $f( 'dubai' ), 'দুবাই', 'ছবি: দুবাই মেরিনা · Norlando Pobre, CC BY 2.0, উইকিমিডিয়া কমন্স' ),
		array( $f( 'doha' ), 'দোহা', 'ছবি: দোহা ওয়েস্ট বে · Nmnogueira, CC BY-SA 4.0, উইকিমিডিয়া কমন্স' ),
		array( $f( 'kl' ), 'কুয়ালালামপুর', 'ছবি: কুয়ালালামপুর · CEphoto, Uwe Aranas, CC BY-SA 3.0, উইকিমিডিয়া কমন্স' ),
		array( $f( 'dhaka' ), 'ঢাকা বিমানবন্দর', 'ছবি: শাহজালাল বিমানবন্দর · Md Shaifuzzaman Ayon, CC BY-SA 4.0, উইকিমিডিয়া কমন্স' ),
	), function ( $s ) { return $s[0] !== ''; } ) );
}
function pi_v7_services() {
	return array(
		array( '/visa-check/', 'ভিসা চেক', 'সরকারি সাইটে যাচাই', 'ac-red', 'passport' ),
		array( '/visa/', 'ভিসা ছাড়া দেশ', 'কোথায় ভিসা লাগে না', 'ac-sky', 'globe' ),
		array( '/remittance/', 'টাকার হিসাব', 'প্রণোদনাসহ কত পাবেন', 'ac-mint', 'coin' ),
		array( '/taka-rate/', 'টাকার রেট', 'আজকের লাইভ রেট', 'ac-mint', 'chart' ),
		array( '/bmet-report/', 'বিএমইটি লাইভ', 'আজ কতজন গেলেন', 'ac-red', 'users' ),
		array( '/agency/', 'এজেন্সি যাচাই', 'লাইসেন্স দেখুন', 'ac-ind', 'shield' ),
		array( '/gamca/', 'গামকা মেডিকেল', 'সেন্টার ও বুকিং', 'ac-teal', 'medical' ),
		array( '/ramadan/', 'রমজান ক্যালেন্ডার', 'সেহরি ও ইফতার', 'ac-plum', 'moon' ),
		array( '/flight-tracker/', 'ফ্লাইট ট্র্যাকার', 'বিমান এখন কোথায়', 'ac-sky', 'plane' ),
		array( '/customs/', 'কাস্টমস নিয়ম', 'কী আনা যায়', 'ac-amber', 'box' ),
		array( '/baggage/', 'লাগেজ কত কেজি', 'এয়ারলাইনের নিয়ম', 'ac-amber', 'luggage' ),
		array( '/migration-cost/', 'সরকারি খরচ', 'কোন দেশে কত', 'ac-ind', 'receipt' ),
	);
}
function pi_v7_icon( $k ) {
	$p = array(
		'passport' => '<rect x="5" y="3" width="14" height="18" rx="2.5"/><circle cx="12" cy="10" r="3"/><path d="M9 17h6"/>',
		'globe' => '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
		'coin' => '<circle cx="12" cy="12" r="9"/><path d="M8.5 8h6M8.5 11h7M10.5 8c3 0 3 5.5 0 5.5l4.5 3.5"/>',
		'chart' => '<path d="M4 19V5M4 19h16"/><path d="M7 15l4-4 3 3 5-6"/>',
		'users' => '<circle cx="9" cy="8" r="3.3"/><path d="M3 20c.5-3.4 3-5.4 6-5.4s5.5 2 6 5.4M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.6c1.8.6 3 2.4 3.3 5.4"/>',
		'shield' => '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
		'medical' => '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/>',
		'moon' => '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
		'plane' => '<path d="M21 15.5v-1.6l-7.5-4.6V4.6a1.5 1.5 0 0 0-3 0v4.7L3 13.9v1.6l7.5-2.3v4.6L8.5 19.3v1.3l3.5-1 3.5 1v-1.3l-2-1.5v-4.6z"/>',
		'box' => '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>',
		'luggage' => '<rect x="6" y="7" width="12" height="13" rx="2.5"/><path d="M9.5 7V4h5v3M10 11v5M14 11v5"/>',
		'receipt' => '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
	);
	return '<svg viewBox="0 0 24 24" aria-hidden="true">' . ( $p[ $k ] ?? '' ) . '</svg>';
}
/* slider + small motion */
add_action( 'wp_footer', function () {
	if ( ! pi6_on() || ! is_front_page() || is_paged() ) return; ?>
<script>(function(){var S=document.getElementById('v7slide');if(!S)return;var im=[].slice.call(S.querySelectorAll('.v7imgs img')),bt=[].slice.call(document.querySelectorAll('#v7strip button')),cr=document.getElementById('v7cr'),C=<?php echo wp_json_encode( array_map( function ( $s ) { return $s[2]; }, pi_v7_slides() ) ); ?>,n=0,t,rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
function go(k){n=(k+im.length)%im.length;im.forEach(function(x,i){x.classList.toggle('on',i===n)});bt.forEach(function(b,i){b.classList.remove('on');b.classList.toggle('done',i<n);void b.offsetWidth;if(i===n)b.classList.add('on')});if(cr)cr.textContent=C[n]||'';clearTimeout(t);if(!rm)t=setTimeout(function(){go(n+1)},6500)}
bt.forEach(function(b){b.addEventListener('click',function(){go(+b.getAttribute('data-s'))})});if(im.length>1)go(0);
var pb=document.getElementById('pbh');if(pb)pb.remove();})();</script>
<?php }, 50 );

/* agency search: people look for Dream International, which is a Qatar company (no Bangladesh RL number) */
add_action( 'wp_footer', function () {
	$q = isset( $_GET['q'] ) ? (string) wp_unslash( $_GET['q'] ) : '';
	$path = (string) parse_url( isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH );
	if ( $q === '' || strpos( $path, '/agency' ) !== 0 || ! preg_match( '/dream|ড্রিম/iu', $q ) ) return; ?>
<div id="pi-dream-note" style="display:flex;gap:10px;align-items:flex-start;margin:12px 0;padding:14px 16px;border-radius:14px;background:#EEF6FB;border:1px solid #CFE6F3;color:#17131B;font-size:15px;line-height:1.6"><span style="font-size:20px;line-height:1.2">ℹ️</span><span><b>ড্রিম ইন্টারন্যাশনাল</b> কাতারভিত্তিক কোম্পানি, তাই বাংলাদেশে এর আরএল (রিক্রুটিং লাইসেন্স) নম্বর নেই। এটি কাতারে নিবন্ধিত প্রতিষ্ঠান।</span></div>
<script>(function(){var n=document.getElementById('pi-dream-note'),f=document.querySelector('form.pbd-srch');if(n&&f&&f.parentNode)f.parentNode.insertBefore(n,f.nextSibling);})();</script>
<?php }, 60 );

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
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&display=swap">
<style id="pi-layout6">
/* app font (Noto Sans Bengali) everywhere */
html body.pi-app,html body.bm-app,html body.ft-app,html body.fx-app{--head:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif;--body:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif;--hf:"Noto Sans Bengali",system-ui,sans-serif;--tf:"Noto Sans Bengali",system-ui,sans-serif;font-family:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif}
html body.pi-app .ct,html body.pi-app input,html body.pi-app button,html body.pi-app select,html body.pi-app textarea{font-family:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif}
html body.pi-app h1,html body.pi-app h2,html body.pi-app h3{letter-spacing:-.005em}
/* the "Bangla Web Fonts" plugin forces SolaimanLipi on body/headings/inputs; the app font wins here */
html body.pi-app,html body.pi-app article,html body.pi-app h1,html body.pi-app h2,html body.pi-app h3,html body.pi-app h4,html body.pi-app h5,html body.pi-app h6,html body.pi-app textarea,html body.pi-app input,html body.pi-app select,
html body.bm-app,html body.bm-app h1,html body.bm-app h2,html body.bm-app h3,html body.bm-app input,html body.bm-app select,
html body.ft-app,html body.ft-app h1,html body.ft-app h2,html body.ft-app h3,html body.ft-app input,html body.ft-app select,
html body.fx-app,html body.fx-app h1,html body.fx-app h2,html body.fx-app h3,html body.fx-app input,html body.fx-app select{font-family:"Noto Sans Bengali","Hind Siliguri",system-ui,sans-serif!important}

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
body.pi-app .hero3.v6h .v6sub{margin:0 0 20px;color:var(--mut);font-size:16.5px}
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
.pbb-hbtn{background:#fff!important;color:var(--ink)!important;border:1px solid var(--line);box-shadow:none}
body.pi-app .pbb-strip{background:#fff!important;color:var(--ink)!important;border-bottom:1px solid var(--line)}
body.pi-app .pbb-strip p small{color:var(--mut)}
body.pi-app .pbb-strip a{background:var(--ink)!important;color:#fff!important}
body.pi-app .pbb-strip button{background:#F4F3F6!important;color:var(--ink)!important}
.pbb-ft .pbb-card{background:#fff!important;color:var(--ink)!important;border:1px solid var(--line);box-shadow:none!important}
/* extra app promos off: the popup (#28) and the top bar (#33); header button, footer card and in-article card stay */
#pba-pop,body.pi-app .pbb-strip{display:none!important}
body.pi-app .pba-card{background:#fff!important;color:var(--ink)!important;border:1px solid var(--line)!important;box-shadow:none!important;border-radius:14px!important}
body.pi-app .pba-card b{color:var(--ink)!important}
.pbb-card:after{display:none!important}
.pbb-card h3{color:var(--ink,#17131B)!important}
.pbb-card p{color:var(--mut,#6F6976)!important;opacity:1!important}
.pbb-feat span{background:#F4F3F6!important;color:var(--ink2,#3E3944)!important}
.pbb-card>img{box-shadow:none!important;border:1px solid var(--line,#E9E7EC)}
/* data-page tiles: name on its own line, never broken mid-word */
body.pi-app .pbd-tiles>a{flex-direction:column;align-items:flex-start;gap:2px;word-break:keep-all;overflow-wrap:normal}
body.pi-app .pbd-tiles>a small{margin:0}
#pi-ad-native{max-width:1160px!important;margin:32px auto!important;padding:12px 16px 16px!important;background:#fff;border:1px solid var(--line);border-radius:14px;box-sizing:border-box}
#pi-ad-native:before{content:"বিজ্ঞাপন";display:block;text-align:left;font:600 11px var(--body,sans-serif);letter-spacing:.06em;color:var(--mut);margin-bottom:8px}
@media(max-width:1020px){body.pi-app .hero3.v6h .w{grid-template-columns:minmax(0,1fr);gap:24px}body.pi-app .art{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.v6l{grid-template-columns:minmax(0,1fr)}.v6l li:nth-last-child(2){border-bottom:1px solid var(--line)}.v6g a{grid-template-columns:110px minmax(0,1fr);gap:12px;padding:10px}.v6g .x{display:none}.v6g b{font-size:16px}}
@media(max-width:640px){
 body.pi-app .hero3.v6h .w{padding-top:26px;padding-bottom:26px}
 body.pi-app .hero3.v6h .v6sub{font-size:15px;margin-bottom:16px}
 .v6s input{font-size:15px}.v6s button{padding:10px 14px}
 .v6t{padding:12px 14px}.v6t b{font-size:20px}
 .v6l{padding:2px 16px}
 .v6ct a{padding:7px 11px;font-size:13.5px}
 body.pi-app .art-main{padding:16px}
 #pi-ad-native{margin:24px 14px!important}
}
/* ---------- v7 home: photo slider card + stats + icon services ---------- */
body.pi-app .hero3.v7h{background:transparent;border:0;padding-top:18px}
body.pi-app .hero3.v7h .w{display:block;padding-top:0;padding-bottom:0}
.v7slide{position:relative;border-radius:24px;overflow:hidden;min-height:440px;display:flex;flex-direction:column;justify-content:space-between;background:#221B29;color:#fff;isolation:isolate}
.v7imgs{position:absolute;inset:0;z-index:-2}
.v7imgs img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;opacity:0;transform:scale(1.04);transition:opacity 1.4s ease}
.v7imgs img.on{opacity:1;animation:v7kb 8s linear forwards}
@keyframes v7kb{from{transform:scale(1.04)}to{transform:scale(1.14) translate(-1.2%,-1%)}}
.v7slide:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(23,15,28,.82) 0%,rgba(23,15,28,.55) 45%,rgba(23,15,28,.12) 100%),linear-gradient(0deg,rgba(23,15,28,.6),transparent 40%)}
.v7in{padding:42px 44px 18px;max-width:660px}
.v7in .v6k{color:#EDE6F0}
.v7in .v6k .ldot{background:#fff}
body.pi-app .v7in h1{color:#fff;font-size:clamp(32px,4.4vw,54px);font-weight:800;line-height:1.25;margin:10px 0 20px;text-shadow:0 2px 20px rgba(0,0,0,.3)}
body.pi-app .v7in h1 span{color:#FFC9D2}
.v7in .v6s{border:0;box-shadow:0 20px 40px -18px rgba(0,0,0,.6)}
.v7c{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.v7c a{color:#fff!important;font-size:14px;font-weight:600;padding:6px 13px;border-radius:999px;background:rgba(20,12,24,.42);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.v7c a:hover{background:rgba(20,12,24,.65)}
.v7bar{padding:0 44px 46px}
.v7strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.v7strip button{position:relative;background:none;border:0;color:#fff;text-align:left;padding:0 0 9px;font:600 13px var(--body);opacity:.65;cursor:pointer}
.v7strip button.on{opacity:1}
.v7strip button:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;border-radius:3px;background:rgba(255,255,255,.25)}
.v7strip button i{position:absolute;left:0;bottom:0;height:3px;border-radius:3px;background:#fff;width:0;z-index:1}
.v7strip button.on i{animation:v7fill 6.5s linear forwards}
.v7strip button.done i{width:100%}
@keyframes v7fill{to{width:100%}}
.v7cr{margin-top:8px;font-size:11px;text-align:right;opacity:.7}
.v7stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:-34px 28px 0;position:relative;z-index:2}
.v7stats a{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 18px;color:var(--ink)!important;box-shadow:0 14px 30px -22px rgba(20,16,24,.5);transition:transform .2s}
.v7stats a:hover{transform:translateY(-2px)}
.v7stats small{display:block;font-size:12.5px;color:var(--mut)}
.v7stats b{font:800 23px/1.3 var(--head);font-variant-numeric:tabular-nums}
.v7sub{margin-left:auto;font-size:13px;color:var(--mut)}
/* services: app-icon tiles */
.v7svc{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.v7svc a{display:grid;justify-items:center;text-align:center;gap:8px;padding:18px 10px 16px;background:#fff;border:1px solid var(--line);border-radius:18px;color:var(--ink)!important;transition:transform .25s cubic-bezier(.2,.8,.3,1),box-shadow .25s,border-color .25s;animation:v7pop .5s cubic-bezier(.2,1.3,.4,1) both;animation-delay:calc(var(--i)*40ms)}
.v7svc a:hover{transform:translateY(-4px);border-color:transparent;box-shadow:0 18px 34px -20px rgba(20,16,24,.45)}
@keyframes v7pop{from{transform:translateY(10px) scale(.94)}}
.v7svc b{font:700 15px/1.3 var(--head)}
.v7svc small{font-size:12px;color:var(--mut);line-height:1.35}
.ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(140deg,var(--c1),var(--c2));box-shadow:0 10px 18px -10px var(--c1),inset 0 1px 0 rgba(255,255,255,.35);transition:transform .3s}
.v7svc a:hover .ic{transform:rotate(-6deg) scale(1.06)}
.ic svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.ac-red{--c1:#E11D48;--c2:#FB7185}.ac-sky{--c1:#0284C7;--c2:#38BDF8}.ac-mint{--c1:#059669;--c2:#34D399}.ac-ind{--c1:#4338CA;--c2:#818CF8}.ac-teal{--c1:#0F766E;--c2:#2DD4BF}.ac-plum{--c1:#6D28D9;--c2:#A78BFA}.ac-amber{--c1:#D97706;--c2:#FBBF24}
.v7ag{display:flex;align-items:center;gap:10px;margin-top:12px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:8px 8px 8px 10px}
.v7ag .ic{width:38px;height:38px;border-radius:12px;flex:none}.v7ag .ic svg{width:20px;height:20px}
.v7ag input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:500 15px var(--body);color:var(--ink);padding:8px 2px}
.v7ag button{border:0;border-radius:11px;background:var(--ink);color:#fff;font:700 14.5px var(--head);padding:10px 18px;cursor:pointer}
body.home #pbh{display:none!important}
@media(max-width:1020px){.v7svc{grid-template-columns:repeat(4,minmax(0,1fr))}.v7stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){
 body.pi-app .hero3.v7h{padding-top:10px}
 .v7slide{min-height:480px;border-radius:20px}
 .v7in{padding:26px 18px 12px}
 .v7slide:before{background:linear-gradient(180deg,rgba(23,15,28,.55),rgba(23,15,28,.78))}
 .v7c{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-right:-18px}.v7c a{flex:none}
 .v7bar{padding:0 18px 36px}
 .v7strip{display:flex;overflow-x:auto;scrollbar-width:none;gap:14px}.v7strip button{flex:none;min-width:84px}
 .v7stats{margin:-26px 10px 0;gap:8px}.v7stats a{padding:11px 13px}.v7stats b{font-size:19px}
 .v7svc{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.v7svc a{padding:14px 6px 12px;border-radius:16px}
 .v7svc small{display:none}.v7svc b{font-size:13.5px}.ic{width:48px;height:48px;border-radius:15px}
 .v7sub{display:none}
}
@media(prefers-reduced-motion:reduce){.v7imgs img.on,.v7svc a,.v7strip button.on i{animation:none}.v7strip button.on i{width:100%}}
/* ---------- tool pages (BMET live, flight tracker, taka rate): same header, logo, hero and footer as the main site ---------- */
#pba-pop,.pbb-strip{display:none!important}
html body.bm-app .ah,html body.ft-app .ah,html body.fx-app .ah{background:rgba(255,255,255,.97)!important;border-bottom:1px solid var(--line);box-shadow:none}
html body.bm-app .ah .lg img,html body.ft-app .ah .lg img,html body.fx-app .ah .lg img{display:none!important}
html body.bm-app .ah .lg:before,html body.ft-app .ah .lg:before,html body.fx-app .ah .lg:before{content:"";flex:none;width:38px;height:38px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23E11D48'/%3E%3Cstop offset='1' stop-color='%23F97316'/%3E%3C/linearGradient%3E%3CclipPath id='c'%3E%3Crect width='64' height='64' rx='16'/%3E%3C/clipPath%3E%3C/defs%3E%3Cg clip-path='url(%23c)'%3E%3Crect width='64' height='64' fill='url(%23a)'/%3E%3Cpath d='M0 50c10-4 22-4 32-1s20 3 32-1v16H0z' fill='%23B3123A' opacity='.55'/%3E%3Ccircle cx='37' cy='27' r='15' fill='%23FFF7EC'/%3E%3Ccircle cx='37' cy='20' r='3.2' fill='%23E11D48'/%3E%3Crect x='34' y='25.5' width='6' height='12.5' rx='3' fill='%23E11D48'/%3E%3Cg fill='%23FFE2B8'%3E%3Ccircle cx='9' cy='47' r='2.4'/%3E%3Ccircle cx='13' cy='41.5' r='1.7'/%3E%3Ccircle cx='17.5' cy='37' r='1.5'/%3E%3Ccircle cx='22' cy='33.6' r='1.3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") center/contain no-repeat}
html body.bm-app .ah .lg b,html body.ft-app .ah .lg b,html body.fx-app .ah .lg b{color:var(--ink)!important}
html body.bm-app .ah .lg b i,html body.ft-app .ah .lg b i,html body.fx-app .ah .lg b i{color:var(--b)!important}
html body.bm-app .ah nav a,html body.ft-app .ah nav a,html body.fx-app .ah nav a{color:var(--ink2)!important}
html body.bm-app .ah nav a:hover,html body.ft-app .ah nav a:hover,html body.fx-app .ah nav a:hover,html body.bm-app .ah nav a.on,html body.ft-app .ah nav a.on,html body.fx-app .ah nav a.on{background:#F4F3F6!important;color:var(--ink)!important}
html body.bm-app .ah .home,html body.ft-app .ah .home,html body.fx-app .ah .home{color:var(--mut)!important}
html body.bm-app .hero,html body.ft-app .hero,html body.fx-app .hero{background:#221B29!important}
html body.bm-app .hero:before,html body.ft-app .hero:before,html body.fx-app .hero:before{opacity:.35}
html body.bm-app .af,html body.ft-app .af,html body.fx-app .af{background:#fff!important;color:var(--mut)!important;border-top:1px solid var(--line)}
html body.bm-app .af h4,html body.ft-app .af h4,html body.fx-app .af h4{color:var(--ink)!important}
html body.bm-app .af a,html body.ft-app .af a,html body.fx-app .af a{color:var(--ink2)!important}
html body.bm-app .af a:hover,html body.ft-app .af a:hover,html body.fx-app .af a:hover{color:var(--b)!important}
html body.bm-app .af .dl,html body.ft-app .af .dl,html body.fx-app .af .dl{color:var(--b)!important}
html body.bm-app .af img,html body.ft-app .af img,html body.fx-app .af img{display:none!important}
html body.bm-app .af .base,html body.ft-app .af .base,html body.fx-app .af .base{border-top-color:var(--line)!important}
</style>
<?php }, 101 );
