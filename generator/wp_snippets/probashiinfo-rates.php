<?php
/* আজকের টাকার রেট লাইভ — probashiinfo.com/taka-rate/ (Code Snippets, everywhere). Snippet "টাকার রেট লাইভ".
   Standalone web app (own header/footer), rendered at template_redirect like the BMET and flight pages.
   Data: the free, open currency-api by fawazahmed0 (CC0; jsDelivr + Cloudflare Pages mirrors) — daily
   mid-market rates with history. An hourly WP-cron job stores today's rates and back-fills up to 120
   days (option pa_fx). These are market (mid) rates; bank / exchange-house rates differ a little, and
   the government's 2.5% remittance incentive is shown separately. The trend box describes past
   movement only — it is not a forecast or financial advice. */

function pa_fx_codes() {
	return array( // code => [বাংলা নাম, দেশ, flag iso]
		'sar' => array( 'সৌদি রিয়াল', 'সৌদি আরব', 'sa' ), 'aed' => array( 'আমিরাত দিরহাম', 'আমিরাত', 'ae' ), 'qar' => array( 'কাতারি রিয়াল', 'কাতার', 'qa' ),
		'kwd' => array( 'কুয়েতি দিনার', 'কুয়েত', 'kw' ), 'omr' => array( 'ওমানি রিয়াল', 'ওমান', 'om' ), 'bhd' => array( 'বাহরাইনি দিনার', 'বাহরাইন', 'bh' ),
		'myr' => array( 'মালয়েশিয়ান রিংগিত', 'মালয়েশিয়া', 'my' ), 'sgd' => array( 'সিঙ্গাপুর ডলার', 'সিঙ্গাপুর', 'sg' ), 'usd' => array( 'মার্কিন ডলার', 'যুক্তরাষ্ট্র', 'us' ),
		'eur' => array( 'ইউরো', 'ইউরোপ (ইতালি, গ্রিস, পর্তুগাল…)', 'eu' ), 'gbp' => array( 'ব্রিটিশ পাউন্ড', 'যুক্তরাজ্য', 'gb' ), 'jod' => array( 'জর্ডানি দিনার', 'জর্ডান', 'jo' ),
		'mvr' => array( 'মালদ্বীপ রুফিয়া', 'মালদ্বীপ', 'mv' ), 'krw' => array( 'দক্ষিণ কোরিয়ান উয়ন', 'দক্ষিণ কোরিয়া', 'kr' ), 'jpy' => array( 'জাপানি ইয়েন', 'জাপান', 'jp' ),
		'ron' => array( 'রোমানিয়ান লেউ', 'রোমানিয়া', 'ro' ), 'rsd' => array( 'সার্বিয়ান দিনার', 'সার্বিয়া', 'rs' ), 'mdl' => array( 'মলদোভান লেউ', 'মলদোভা', 'md' ),
		'mkd' => array( 'মেসিডোনিয়ান দিনার', 'উত্তর মেসিডোনিয়া', 'mk' ), 'pln' => array( 'পোলিশ জ্লোটি', 'পোল্যান্ড', 'pl' ), 'hrk' => null,
		'cad' => array( 'কানাডিয়ান ডলার', 'কানাডা', 'ca' ), 'aud' => array( 'অস্ট্রেলিয়ান ডলার', 'অস্ট্রেলিয়া', 'au' ), 'inr' => array( 'ভারতীয় রুপি', 'ভারত', 'in' ),
		'cny' => array( 'চীনা ইউয়ান', 'চীন', 'cn' ), 'try' => array( 'তুর্কি লিরা', 'তুরস্ক', 'tr' ), 'rub' => array( 'রুশ রুবল', 'রাশিয়া', 'ru' ),
	);
}

function pa_fx_fetch( $day ) { // $day = 'latest' or Y-m-d → array(code => taka per 1 unit) or null
	$urls = array( "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@$day/v1/currencies/bdt.json", "https://$day.currency-api.pages.dev/v1/currencies/bdt.json" );
	if ( 'latest' === $day ) $urls[1] = 'https://latest.currency-api.pages.dev/v1/currencies/bdt.json';
	foreach ( $urls as $u ) {
		$r = wp_remote_get( $u, array( 'timeout' => 15 ) );
		if ( is_wp_error( $r ) || 200 !== wp_remote_retrieve_response_code( $r ) ) continue;
		$j = json_decode( wp_remote_retrieve_body( $r ), true );
		if ( empty( $j['bdt'] ) ) continue;
		$out = array();
		foreach ( pa_fx_codes() as $c => $m ) if ( $m && ! empty( $j['bdt'][ $c ] ) ) $out[ $c ] = round( 1 / (float) $j['bdt'][ $c ], 6 );
		return array( 'date' => $j['date'] ?? $day, 'r' => $out );
	}
	return null;
}

function pa_fx_update( $max_fill = 25 ) {
	$d = get_option( 'pa_fx' );
	$d = is_array( $d ) ? $d : array( 'h' => array() );
	$l = pa_fx_fetch( 'latest' );
	if ( $l ) { $d['h'][ $l['date'] ] = $l['r']; $d['latest'] = $l['date']; $d['at'] = time(); }
	$tz = new DateTimeZone( 'Asia/Dhaka' ); $n = 0;
	for ( $i = 1; $i <= 120 && $n < $max_fill; $i++ ) {
		$day = wp_date( 'Y-m-d', time() - $i * DAY_IN_SECONDS, $tz );
		if ( isset( $d['h'][ $day ] ) ) continue;
		$n++;
		$x = pa_fx_fetch( $day );
		$d['h'][ $day ] = $x ? $x['r'] : array(); // empty = no data that day (kept so we do not retry forever)
	}
	krsort( $d['h'] );
	$d['h'] = array_slice( $d['h'], 0, 130, true );
	update_option( 'pa_fx', $d, false );
	do_action( 'litespeed_purge_url', home_url( '/taka-rate/' ) );
	return $d;
}

add_action( 'pa_fx_cron', function () { pa_fx_update(); } );
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'pa_fx_cron' ) ) wp_schedule_event( time() + 60, 'hourly', 'pa_fx_cron' );
	if ( ! get_option( 'pa_fx_page' ) ) {
		if ( ! get_page_by_path( 'taka-rate' ) ) {
			$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => 'taka-rate', 'post_title' => 'আজকের টাকার রেট লাইভ — রিয়াল, দিরহাম, রিংগিত, ডলার',
				'post_content' => '<p>আজকের টাকার রেট: সৌদি রিয়াল, আমিরাত দিরহাম, কাতারি রিয়াল, কুয়েতি দিনার, ওমানি রিয়াল, মালয়েশিয়ান রিংগিত, সিঙ্গাপুর ডলার, ইউরো, ডলার।</p>' ) );
			if ( $id && ! is_wp_error( $id ) ) update_post_meta( $id, 'rank_math_focus_keyword', 'আজকের টাকার রেট' );
		}
		update_option( 'pa_fx_page', 1, false );
	}
}, 20 );

function pa_fx_data() {
	$d = get_option( 'pa_fx' );
	if ( ! is_array( $d ) || empty( $d['latest'] ) || time() - (int) ( $d['at'] ?? 0 ) > 4 * HOUR_IN_SECONDS ) {
		if ( ! get_transient( 'pa_fx_lock' ) ) { set_transient( 'pa_fx_lock', 1, 300 ); $d = pa_fx_update( is_array( $d ) && ! empty( $d['latest'] ) ? 10 : 40 ); }
	}
	return is_array( $d ) ? $d : array( 'h' => array() );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'pa/v1', '/fx', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function () {
		ini_set( 'serialize_precision', '-1' );
		$d = pa_fx_data();
		$res = new WP_REST_Response( array( 'latest' => $d['latest'] ?? '', 'at' => $d['at'] ?? 0, 'h' => array_filter( $d['h'] ) ) );
		$res->header( 'Cache-Control', 'public, max-age=600' );
		return $res;
	} ) );
} );

add_filter( 'rank_math/frontend/title', function ( $t ) { return is_page( 'taka-rate' ) ? 'আজকের টাকার রেট ' . pa_fx_bdate( wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) ) ) . ' — সৌদি রিয়াল, দিরহাম, রিংগিত, ডলার রেট লাইভ | প্রবাসী ইনফো' : $t; } );
add_filter( 'rank_math/frontend/description', function ( $t ) {
	if ( ! is_page( 'taka-rate' ) ) return $t;
	$d = pa_fx_data(); $r = $d['h'][ $d['latest'] ?? '' ] ?? array();
	$f = function ( $c ) use ( $r ) { return isset( $r[ $c ] ) ? pa_fx_bn( number_format( $r[ $c ], 2 ) ) : '—'; };
	return 'আজকের টাকার রেট লাইভ: ১ সৌদি রিয়াল = ' . $f( 'sar' ) . ' টাকা, ১ দিরহাম = ' . $f( 'aed' ) . ' টাকা, ১ কাতারি রিয়াল = ' . $f( 'qar' ) . ' টাকা, ১ রিংগিত = ' . $f( 'myr' ) . ' টাকা। কত পাঠালে কত টাকা পাবেন, ২.৫% প্রণোদনাসহ হিসাব, গত মাসের তুলনা ও চার্ট।';
} );

function pa_fx_bn( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); }
function pa_fx_bdate( $ymd ) { $m = array( 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর' ); $p = explode( '-', (string) $ymd ); return count( $p ) === 3 ? pa_fx_bn( (int) $p[2] ) . ' ' . $m[ (int) $p[1] - 1 ] . ' ' . pa_fx_bn( $p[0] ) : ''; }

add_action( 'template_redirect', function () {
	if ( ! is_page( 'taka-rate' ) || is_feed() || is_preview() ) return;
	do_action( 'litespeed_control_set_ttl', 1800 );
	pa_fx_render();
	exit;
}, 98 );

function pa_fx_render() {
	$d = pa_fx_data();
	$h = array_filter( $d['h'] ?? array() );
	krsort( $h );
	$latest = $d['latest'] ?? ( $h ? array_key_first( $h ) : '' );
	$R = $h[ $latest ] ?? array();
	$dates = array_keys( $h );
	$prev = $dates[1] ?? '';
	$m1 = ''; foreach ( $dates as $k ) if ( $latest && strtotime( $k ) >= strtotime( $latest ) - 30 * DAY_IN_SECONDS ) $m1 = $k; // oldest day inside the same 30-day window the chart uses
	$codes = array_filter( pa_fx_codes() );
	$url = home_url( '/taka-rate/' );
	$logo = defined( 'PA_LOGO' ) ? PA_LOGO : '';
	$fmt = function ( $v ) { return pa_fx_bn( number_format( $v, $v >= 100 ? 2 : ( $v >= 1 ? 2 : 4 ) ) ); };
	$pct = function ( $a, $b ) { if ( ! $a || ! $b ) return ''; $p = ( $a - $b ) * 100 / $b; if ( abs( $p ) < 0.005 ) return '<em class="z">স্থির</em>'; return '<em class="' . ( $p > 0 ? 'up' : 'dn' ) . '">' . ( $p > 0 ? '▲' : '▼' ) . ' ' . pa_fx_bn( number_format( abs( $p ), 2 ) ) . '%</em>'; };
	$faq = array(
		array( 'আজ ১ সৌদি রিয়াল সমান কত টাকা?', isset( $R['sar'] ) ? 'আজ (' . pa_fx_bdate( $latest ) . ') বাজার রেটে ১ সৌদি রিয়াল = প্রায় ' . $fmt( $R['sar'] ) . ' টাকা। ব্যাংক বা এক্সচেঞ্জ হাউসের রেট এর চেয়ে সামান্য কম-বেশি হতে পারে, আর বৈধ পথে পাঠালে সরকারের ২.৫% প্রণোদনা আলাদা যোগ হয়।' : 'ওপরের বোর্ডে আজকের রেট দেখুন।' ),
		array( 'এই রেট কি ব্যাংকের রেটের সমান?', 'না। এখানে আন্তর্জাতিক বাজারের মধ্যম (মিড-মার্কেট) রেট দেখানো হয়। ব্যাংক, এক্সচেঞ্জ হাউস বা মোবাইল ব্যাংকিং সার্ভিস নিজেদের রেট ও ফি ঠিক করে, তাই হাতে পাওয়া টাকা সামান্য কম-বেশি হতে পারে। পাঠানোর আগে সেই প্রতিষ্ঠানের আজকের রেট দেখে নিন।' ),
		array( '২.৫% প্রণোদনা কী?', 'বৈধ পথে (ব্যাংক বা অনুমোদিত মাধ্যমে) দেশে টাকা পাঠালে সরকার পাঠানো অর্থের ওপর ২.৫% নগদ প্রণোদনা দেয়, যা প্রাপকের অ্যাকাউন্টে যোগ হয়। হুন্ডিতে এই সুবিধা নেই এবং তা অবৈধ। নিয়ম বদলাতে পারে — বাংলাদেশ ব্যাংকের সর্বশেষ নির্দেশনা দেখুন।' ),
		array( 'রেট কখন হালনাগাদ হয়?', 'প্রতিদিনের বাজার রেট দিনে কয়েকবার হালনাগাদ হয়; এই পাতা প্রতি ঘণ্টায় নতুন রেট দেখে নেয়, আর খোলা থাকলে নিজে থেকেই হালনাগাদ হয়।' ),
		array( 'রেট আরও বাড়বে কিনা বোঝা যায়?', 'কেউ নিশ্চিতভাবে বলতে পারে না। এখানে শুধু গত কয়েক সপ্তাহের প্রবণতা দেখানো হয় — রেট বাড়তির দিকে, কমতির দিকে নাকি স্থির। এটি ভবিষ্যদ্বাণী বা আর্থিক পরামর্শ নয়।' ),
	);
	$ld = array( '@context' => 'https://schema.org', '@graph' => array(
		array( '@type' => 'WebApplication', 'name' => 'আজকের টাকার রেট লাইভ', 'url' => $url, 'applicationCategory' => 'FinanceApplication', 'operatingSystem' => 'Web', 'inLanguage' => 'bn', 'isAccessibleForFree' => true, 'offers' => array( '@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'BDT' ) ),
		array( '@type' => 'BreadcrumbList', 'itemListElement' => array( array( '@type' => 'ListItem', 'position' => 1, 'name' => 'হোম', 'item' => home_url( '/' ) ), array( '@type' => 'ListItem', 'position' => 2, 'name' => 'টাকার রেট', 'item' => $url ) ) ),
		array( '@type' => 'FAQPage', 'mainEntity' => array_map( function ( $q ) { return array( '@type' => 'Question', 'name' => $q[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $q[1] ) ); }, $faq ) ),
	) );
	$series = array(); foreach ( array_reverse( $h, true ) as $k => $v ) $series[ $k ] = $v;
	?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#064e3b">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<?php wp_head(); ?>
<script type="application/ld+json"><?php echo wp_json_encode( $ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?></script>
<style id="fx-css">
:root{--nv:#052e2b;--nv2:#065f46;--g:#16a34a;--g2:#22c55e;--b:#0b56c4;--am:#f59e0b;--red:#dc2626;--ink:#0f1f38;--ink2:#34465f;--mut:#6a7a93;--line:#e2e8f1;--bg:#f1f7f4;--soft:#eef6f2;--hf:"Anek Bangla","Hind Siliguri",system-ui,sans-serif;--tf:"Hind Siliguri",system-ui,sans-serif;--sh:0 1px 2px rgba(6,60,40,.06),0 12px 30px -18px rgba(6,60,40,.4)}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:70px}
body.fx-app{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.65 var(--tf);-webkit-font-smoothing:antialiased;overflow-x:hidden}
html body.fx-app,html body.fx-app *{font-family:var(--tf)!important}
html body.fx-app h1,html body.fx-app h2,html body.fx-app h3,html body.fx-app b,html body.fx-app .num,html body.fx-app summary,html body.fx-app td.n{font-family:var(--hf)!important}
.fx-app a{color:var(--nv2)}.w{max-width:1200px;margin:0 auto;padding:0 16px}.fx-app h1,.fx-app h2,.fx-app h3{line-height:1.25;margin:0}
.ah{position:sticky;top:0;z-index:100;background:rgba(5,46,43,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.ah .w{display:flex;align-items:center;gap:14px;height:60px}.ah .lg{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;flex:none}.ah .lg img{height:32px;width:auto;background:#fff;border-radius:8px;padding:3px 6px}
.ah .lg b{font-size:18px;color:#fff}.ah .lg b i{font-style:normal;color:#fde68a}
.ah nav{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}.ah nav::-webkit-scrollbar{display:none}.ah nav a{color:#d1fae5;text-decoration:none;font-weight:600;font-size:14.5px;padding:7px 11px;border-radius:999px;white-space:nowrap}.ah nav a:hover{background:rgba(255,255,255,.12);color:#fff}
.ah .home{color:#d1fae5;text-decoration:none;font-size:14px;white-space:nowrap}
.dot{width:9px;height:9px;border-radius:50%;background:#fde68a;display:inline-block;animation:p 1.6s infinite}@keyframes p{0%{box-shadow:0 0 0 0 rgba(253,230,138,.7)}70%{box-shadow:0 0 0 10px rgba(253,230,138,0)}100%{box-shadow:0 0 0 0 rgba(253,230,138,0)}}
.hero{position:relative;color:#fff;background:radial-gradient(800px 380px at 88% -20%,rgba(253,230,138,.28),transparent 60%),linear-gradient(140deg,#052e2b,#065f46 60%,#047857);overflow:hidden}
.hero:before{content:"৳";position:absolute;right:-20px;top:-40px;font-size:360px;font-weight:800;opacity:.06;line-height:1}
.hero .w{position:relative;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:24px;padding-top:22px;padding-bottom:64px}
.crumb{font-size:13.5px;color:#a7f3d0}.crumb a{color:#d1fae5!important;text-decoration:none}
.hero h1{font-size:clamp(28px,4.4vw,46px);font-weight:800;margin:8px 0 6px;color:#fff}.hero p{color:#d1fae5;margin:0 0 14px}
.live{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:5px 12px;font-size:13.5px;font-weight:600}
.cv{background:#fff;color:var(--ink);border-radius:22px;padding:18px;box-shadow:0 30px 60px -30px rgba(0,0,0,.55);align-self:start}
.cv h2{font-size:19px;margin-bottom:10px}
.cvr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:8px}.cvr input,.cvr select{width:100%;border:2px solid var(--line);border-radius:14px;padding:12px;font-size:18px;font-weight:700;color:var(--ink);background:#fff;outline:none}.cvr input:focus,.cvr select:focus{border-color:var(--g)}
.sw{display:flex;justify-content:center;margin:8px 0}.sw button{border:0;background:var(--soft);border-radius:999px;padding:6px 14px;font-weight:700;cursor:pointer;color:var(--nv2)}
.out{background:linear-gradient(135deg,#ecfdf5,#f0fdf4);border:1px solid #bbf7d0;border-radius:16px;padding:12px 14px}.out .big{font-size:clamp(28px,5vw,40px);font-weight:800;color:var(--nv2);line-height:1.15}.out small{color:var(--ink2);font-size:14px}
.inc{margin-top:8px;display:flex;justify-content:space-between;gap:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:8px 12px;font-size:14.5px}.inc b{color:#92400e}
.qa{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.qa button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:4px 10px;font-size:13.5px;cursor:pointer}
.main{margin-top:-36px;position:relative;z-index:2}
.card{background:#fff;border:1px solid var(--line);border-radius:20px;box-shadow:var(--sh);padding:16px}
.bh{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}.bh h2{font-size:clamp(20px,2.6vw,26px)}
.amt{display:flex;gap:6px;flex-wrap:wrap}.amt button{border:1px solid var(--line);background:#fff;border-radius:10px;padding:6px 11px;font-weight:700;font-size:14px;cursor:pointer}.amt button.on{background:var(--nv2);color:#fff;border-color:var(--nv2)}
.tw{overflow:auto;border-radius:14px;border:1px solid var(--line)}
.tb{width:100%;border-collapse:collapse;font-size:15px;min-width:760px}.tb th,.tb td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}.tb th{background:var(--soft);font-size:13px;color:var(--mut);position:sticky;top:0}
.tb td.n,.tb th.n{text-align:right}.tb tr{cursor:pointer}.tb tr:hover td{background:#f6fdf9}.tb tr.on td{background:#ecfdf5}
.tb .cur{display:flex;align-items:center;gap:10px}.tb .cur img{width:28px;height:20px;border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,.08);object-fit:cover}.tb .cur b{display:block;font-size:15.5px}.tb .cur small{color:var(--mut);font-size:12.5px}
.tb .rt{font-size:19px;font-weight:800;color:var(--nv2)}
em.up,em.dn,em.z{font-style:normal;font-weight:700;font-size:13px;padding:2px 8px;border-radius:999px}em.up{background:#dcfce7;color:#166534}em.dn{background:#fee2e2;color:#991b1b}em.z{background:#f1f5f9;color:#475569}
.spk{width:110px;height:30px}.tr{font-size:12.5px;font-weight:700;border-radius:999px;padding:2px 8px}.tr.u{background:#dcfce7;color:#166534}.tr.d{background:#fee2e2;color:#991b1b}.tr.s{background:#f1f5f9;color:#475569}
.two{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;margin-top:16px}
.ch{position:relative}.ch svg{width:100%;height:260px;display:block}.chl{display:flex;gap:6px;margin:6px 0 10px;flex-wrap:wrap}.chl button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:4px 11px;font-size:13.5px;font-weight:600;cursor:pointer}.chl button.on{background:var(--nv2);color:#fff;border-color:var(--nv2)}
.tip{position:absolute;pointer-events:none;background:var(--nv);color:#fff;border-radius:8px;padding:4px 8px;font-size:12.5px;transform:translate(-50%,-120%);white-space:nowrap}
.st3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.st3 div{background:var(--soft);border-radius:12px;padding:8px 10px}.st3 span{display:block;font-size:12.5px;color:var(--mut)}.st3 b{font-size:17px}
.trend{border-radius:16px;padding:14px;margin-bottom:12px}.trend.u{background:#ecfdf5;border:1px solid #bbf7d0}.trend.d{background:#fef2f2;border:1px solid #fecaca}.trend.s{background:#f8fafc;border:1px solid var(--line)}
.trend b{display:block;font-size:20px}.trend p{margin:6px 0 0;font-size:14.5px;color:var(--ink2)}.trend small{display:block;margin-top:6px;color:var(--mut);font-size:12.5px}
.calc{width:100%;border-collapse:collapse;font-size:15px}.calc td,.calc th{padding:8px 10px;border-bottom:1px solid var(--line)}.calc th{background:var(--soft);font-size:13px;color:var(--mut);text-align:left}.calc td.n{text-align:right;font-weight:700}
.sec{margin:34px 0 0}.sec>h2{font-size:clamp(22px,2.8vw,28px);margin:0 0 6px}.sec>p{color:var(--ink2);margin:0 0 14px}
.faq details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:0 0 8px}.faq summary{cursor:pointer;font-weight:700;font-size:16.5px;list-style:none}.faq summary::-webkit-details-marker{display:none}.faq p{margin:8px 0 0;color:var(--ink2)}
.src{background:#fff;border:1px solid var(--line);border-left:5px solid var(--am);border-radius:16px;padding:14px 16px;margin:30px 0 0;font-size:14px;color:var(--ink2)}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.acts button{border:0;border-radius:12px;padding:9px 12px;font-weight:700;font-size:14px;cursor:pointer}.a1{background:var(--g);color:#fff}.a2{background:#25d366;color:#053b1d}.a3{background:var(--soft);color:var(--ink2)}
.af{background:var(--nv);color:#a7f3d0;margin-top:40px;padding:28px 0 18px;font-size:14.5px}.af .g{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:22px}.af h4{color:#fff;font-size:16px;margin:0 0 8px}.af a{color:#d1fae5!important;text-decoration:none;display:block;margin:4px 0}
.af .base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;border-top:1px solid rgba(255,255,255,.1);margin-top:20px;padding-top:14px;font-size:13px}.af .dl{display:inline;color:#fbbf24!important;font-weight:700}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--nv);color:#fff;border-radius:12px;padding:10px 16px;z-index:2000;font-weight:600}
@media(max-width:960px){.hero .w,.two{grid-template-columns:minmax(0,1fr)}.af .g{grid-template-columns:minmax(0,1fr)}}
@media(max-width:700px){.ah nav,.ah .home{display:none}.ah .w{justify-content:space-between}.cvr{grid-template-columns:minmax(0,1fr)}.st3{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
</head>
<body <?php body_class( 'fx-app' ); ?>>
<?php wp_body_open(); ?>
<header class="ah"><div class="w">
	<a class="lg" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="প্রবাসী ইনফো — হোম"><?php if ( $logo ) echo '<img src="' . esc_url( $logo ) . '" alt="প্রবাসী ইনফো" width="120" height="32">'; ?><b>টাকার রেট <i>লাইভ</i></b></a>
	<nav aria-label="টাকার রেট"><a href="#conv">ক্যালকুলেটর</a><a href="#board">রেট বোর্ড</a><a href="#chart">চার্ট ও প্রবণতা</a><a href="#faq">প্রশ্নোত্তর</a><a href="<?php echo esc_url( home_url( '/bmet-report/' ) ); ?>">বিএমইটি লাইভ</a><a href="<?php echo esc_url( home_url( '/flight-tracker/' ) ); ?>">ফ্লাইট ট্র্যাকার</a></nav>
	<a class="home" href="<?php echo esc_url( home_url( '/' ) ); ?>">← প্রবাসী ইনফো</a>
</div></header>

<section class="hero" id="conv"><div class="w">
	<div>
		<nav class="crumb" aria-label="ব্রেডক্রাম্ব"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a> › টাকার রেট</nav>
		<h1>আজকের টাকার রেট লাইভ</h1>
		<p><?php echo esc_html( pa_fx_bdate( $latest ) ); ?> · সৌদি রিয়াল, আমিরাত দিরহাম, কাতারি রিয়াল, কুয়েতি দিনার, মালয়েশিয়ান রিংগিত, ইউরোসহ <?php echo pa_fx_bn( count( $R ) ); ?>টি মুদ্রার বাজার রেট — কত পাঠালে দেশে কত টাকা যাবে, গত মাস থেকে কত বদলেছে।</p>
		<span class="live"><span class="dot"></span>লাইভ · সর্বশেষ হালনাগাদ <span id="upd"><?php echo esc_html( pa_fx_bn( wp_date( 'H:i', (int) ( $d['at'] ?? time() ), new DateTimeZone( 'Asia/Dhaka' ) ) ) ); ?></span></span>
		<?php if ( isset( $R['sar'], $R['aed'], $R['qar'], $R['myr'] ) ) : ?>
		<p style="margin-top:14px;font-size:17px;color:#fff">১ সৌদি রিয়াল = <b><?php echo $fmt( $R['sar'] ); ?></b> টাকা · ১ দিরহাম = <b><?php echo $fmt( $R['aed'] ); ?></b> · ১ কাতারি রিয়াল = <b><?php echo $fmt( $R['qar'] ); ?></b> · ১ রিংগিত = <b><?php echo $fmt( $R['myr'] ); ?></b></p>
		<?php endif; ?>
	</div>
	<div class="cv">
		<h2>💱 কত পাঠালে কত টাকা পাবে?</h2>
		<div class="cvr"><input id="amt" type="number" inputmode="decimal" min="0" value="1000" aria-label="পরিমাণ"><select id="cur" aria-label="মুদ্রা"></select></div>
		<div class="sw"><button type="button" id="swap">⇅ উল্টো হিসাব (টাকা → বিদেশি মুদ্রা)</button></div>
		<div class="out"><div class="big num" id="res">—</div><small id="resl"></small></div>
		<div class="inc" id="incb"><span>🎁 বৈধ পথে পাঠালে ২.৫% সরকারি প্রণোদনাসহ</span><b class="num" id="inc">—</b></div>
		<div class="qa" id="qa"></div>
		<div class="acts"><button type="button" class="a2" id="wa">💬 WhatsApp এ পাঠান</button><button type="button" class="a3" id="cp">📋 কপি</button></div>
	</div>
</div></section>

<main class="w main">
	<section class="card" id="board">
		<div class="bh"><h2>📊 আজকের রেট বোর্ড</h2><div class="amt" role="group" aria-label="পরিমাণ"><span style="font-size:13px;color:var(--mut);align-self:center">পাঠালে:</span><button type="button" data-a="1" class="on">১</button><button type="button" data-a="100">১০০</button><button type="button" data-a="500">৫০০</button><button type="button" data-a="1000">১,০০০</button><button type="button" data-a="5000">৫,০০০</button></div></div>
		<div class="tw"><table class="tb"><thead><tr><th>মুদ্রা</th><th class="n" id="th-amt">১ ইউনিট = টাকা</th><th class="n">১ টাকা =</th><th>গতকালের চেয়ে</th><th>গত মাসের চেয়ে</th><th>৩০ দিনের ধারা</th><th>প্রবণতা</th></tr></thead><tbody id="tb">
		<?php foreach ( $codes as $c => $m ) { if ( empty( $R[ $c ] ) ) continue; $v = $R[ $c ]; ?>
			<tr data-c="<?php echo esc_attr( $c ); ?>"><td><span class="cur"><img src="https://flagcdn.com/w40/<?php echo esc_attr( $m[2] ); ?>.png" alt="" width="28" height="20" loading="lazy"><span><b><?php echo esc_html( $m[0] ); ?> (<?php echo strtoupper( $c ); ?>)</b><small><?php echo esc_html( $m[1] ); ?></small></span></span></td>
			<td class="n"><span class="rt num"><?php echo $fmt( $v ); ?></span> ৳</td><td class="n num"><?php echo pa_fx_bn( number_format( 1 / $v, 4 ) ); ?></td>
			<td><?php echo $prev ? $pct( $v, $h[ $prev ][ $c ] ?? 0 ) : ''; ?></td><td><?php echo $m1 ? $pct( $v, $h[ $m1 ][ $c ] ?? 0 ) : ''; ?></td><td class="sp"></td><td class="tt"></td></tr>
		<?php } ?>
		</tbody></table></div>
		<p style="font-size:13px;color:var(--mut);margin:8px 0 0">সারিতে চাপ দিলে নিচে সেই মুদ্রার চার্ট দেখাবে · বাজার (মিড-মার্কেট) রেট — ব্যাংক বা এক্সচেঞ্জ হাউসের রেট সামান্য কম-বেশি হয়।</p>
	</section>

	<section class="two" id="chart">
		<div class="card"><div class="bh"><h2 id="chT">চার্ট</h2></div><div class="chl" id="chl"><button type="button" data-d="7">৭ দিন</button><button type="button" data-d="30" class="on">৩০ দিন</button><button type="button" data-d="90">৯০ দিন</button></div>
			<div class="ch"><svg id="svg" viewBox="0 0 640 260" preserveAspectRatio="none" aria-label="রেটের চার্ট"></svg><div class="tip" id="tip" hidden></div></div>
			<div class="st3" id="st3"></div></div>
		<div class="card"><div class="trend s" id="trend"><b>প্রবণতা</b><p>হিসাব হচ্ছে…</p></div>
			<h3 style="font-size:17px;margin:4px 0 8px" id="calT">পাঠানোর হিসাব</h3><table class="calc" id="calc"></table></div>
	</section>

	<section class="sec faq" id="faq"><h2>প্রশ্নোত্তর</h2>
		<?php foreach ( $faq as $k => $q ) echo '<details' . ( $k === 0 ? ' open' : '' ) . '><summary>' . esc_html( $q[0] ) . '</summary><p>' . esc_html( $q[1] ) . '</p></details>'; ?>
	</section>
	<div class="src">⚠️ <b>দায়মুক্তি:</b> রেট আন্তর্জাতিক বাজারের মধ্যম রেট, উন্মুক্ত <a href="https://github.com/fawazahmed0/exchange-api" target="_blank" rel="noopener nofollow">currency-api</a> (CC0) থেকে নেওয়া। ব্যাংক, এক্সচেঞ্জ হাউস বা মোবাইল ব্যাংকিংয়ের রেট ও ফি আলাদা — পাঠানোর আগে তাদের আজকের রেট দেখে নিন। "প্রবণতা" শুধু অতীতের ওঠানামার বর্ণনা, ভবিষ্যদ্বাণী বা আর্থিক পরামর্শ নয়। সবসময় বৈধ পথে টাকা পাঠান — হুন্ডি অবৈধ ও ঝুঁকিপূর্ণ।</div>
</main>

<footer class="af"><div class="w">
	<div class="g">
		<div><b style="color:#fff;font-size:18px">💱 টাকার রেট লাইভ</b><p>প্রবাসীদের জন্য আজকের রিয়াল, দিরহাম, রিংগিত, ডলার রেট আর পাঠানোর হিসাব — সহজ বাংলায়।</p></div>
		<div><h4>প্রবাসী ইনফো</h4><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a><a href="<?php echo esc_url( home_url( '/bmet-report/' ) ); ?>">বিএমইটি রিপোর্ট লাইভ</a><a href="<?php echo esc_url( home_url( '/flight-tracker/' ) ); ?>">ফ্লাইট ট্র্যাকার লাইভ</a></div>
		<div><h4>সহযোগী</h4><a href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=rates" target="_blank" rel="noopener sponsored">✈️ ড্রিম ইন্টারন্যাশনাল</a><a href="https://www.probashibondu.online/?utm_source=probashiinfo&amp;utm_medium=rates" target="_blank" rel="noopener">🌍 প্রবাসী বন্ধু</a></div>
	</div>
	<div class="base"><span>© <?php echo pa_fx_bn( wp_date( 'Y' ) ); ?> প্রবাসী ইনফো · স্বাধীন তথ্যসেবা</span><span>সার্বিক সহযোগিতায় <a class="dl" href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=rates-footer" target="_blank" rel="noopener sponsored">ড্রিম ইন্টারন্যাশনাল</a></span></div>
</div></footer>

<script id="fx-data" type="application/json"><?php ini_set( 'serialize_precision', '-1' ); echo wp_json_encode( array( 'h' => $series, 'latest' => $latest, 'at' => (int) ( $d['at'] ?? 0 ), 'codes' => $codes ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?></script>
<script>
(function(){
	var J=JSON.parse(document.getElementById('fx-data').textContent), $=function(i){return document.getElementById(i)}, C=J.codes;
	var bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})};
	function f(v,dp){ if(v==null||isNaN(v)) return '—'; if(dp==null) dp=v>=100?2:v>=1?2:4; return bn(v.toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp})); }
	var BM=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
	function bd(k){ var p=k.split('-'); return bn(+p[2])+' '+BM[+p[1]-1]; }
	var H, dates, L, sel=(function(){try{return localStorage.getItem('fx_cur')}catch(e){return null}})()||'sar', rev=false, amtB=1, days=30;
	function load(j){ H=j.h; dates=Object.keys(H).sort(); L=H[j.latest]||H[dates[dates.length-1]]; }
	load(J);
	/* last n calendar days ending on the latest date (same window everywhere on the page) */
	function ser(c,n){ var end=Date.parse(dates[dates.length-1]), from=end-n*864e5; return dates.filter(function(k){ return Date.parse(k)>=from; }).map(function(k){return [k,H[k][c]]}).filter(function(x){return x[1]}); }
	function trendOf(c){ var s=ser(c,30).map(function(x){return x[1]}); if(s.length<8) return {k:'s',t:'স্থির',d:0};
		var n=Math.min(14,s.length), y=s.slice(-n), mx=(n-1)/2, my=y.reduce(function(a,b){return a+b},0)/n, num=0, den=0; y.forEach(function(v,i){ num+=(i-mx)*(v-my); den+=(i-mx)*(i-mx); });
		var slope=num/den/my*100; /* % per day */ var ma7=s.slice(-7).reduce(function(a,b){return a+b},0)/7, ma30=s.reduce(function(a,b){return a+b},0)/s.length, gap=(ma7-ma30)/ma30*100;
		if(slope>0.03&&gap>0.05) return {k:'u',t:'বাড়তির দিকে',d:slope,g:gap}; if(slope<-0.03&&gap<-0.05) return {k:'d',t:'কমতির দিকে',d:slope,g:gap}; return {k:'s',t:'স্থির',d:slope,g:gap}; }
	function spark(c){ var s=ser(c,30).map(function(x){return x[1]}); if(s.length<2) return ''; var mn=Math.min.apply(null,s), mx=Math.max.apply(null,s), r=mx-mn||1, up=s[s.length-1]>=s[0];
		return '<svg class="spk" viewBox="0 0 110 30" preserveAspectRatio="none"><polyline fill="none" stroke="'+(up?'#16a34a':'#dc2626')+'" stroke-width="2" points="'+s.map(function(v,i){return (i*110/(s.length-1)).toFixed(1)+','+(28-(v-mn)/r*26).toFixed(1)}).join(' ')+'"/></svg>'; }
	/* board */
	function board(){ $('th-amt').textContent=(amtB===1?'১ ইউনিট':f(amtB,0)+' পাঠালে')+' = টাকা';
		document.querySelectorAll('#tb tr').forEach(function(tr){ var c=tr.dataset.c, v=L[c]; if(!v) return; tr.querySelector('.rt').textContent=f(v*amtB,amtB===1?null:0); tr.querySelector('.sp').innerHTML=spark(c); var t=trendOf(c); tr.querySelector('.tt').innerHTML='<span class="tr '+t.k+'">'+(t.k==='u'?'↗ ':t.k==='d'?'↘ ':'→ ')+t.t+'</span>'; tr.classList.toggle('on',c===sel);
			tr.onclick=function(){ pick(c); document.getElementById('chart').scrollIntoView({behavior:'smooth',block:'start'}); }; }); }
	document.querySelectorAll('.amt [data-a]').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('.amt [data-a]').forEach(function(x){x.classList.toggle('on',x===b)}); amtB=+b.dataset.a; board(); }; });
	/* converter */
	$('cur').innerHTML=Object.keys(C).filter(function(c){return L[c]}).map(function(c){ return '<option value="'+c+'">'+C[c][0]+' ('+c.toUpperCase()+')</option>'; }).join('');
	$('cur').value=L[sel]?sel:'sar';
	function conv(){ var a=+$('amt').value||0, c=$('cur').value, v=L[c], nm=C[c][0];
		if(!rev){ var t=a*v; $('res').textContent=f(t,2)+' টাকা'; $('resl').textContent=f(a,a%1?2:0)+' '+nm+' = '+f(t,2)+' টাকা (বাজার রেট ১ = '+f(v)+' ৳)'; $('inc').textContent=f(t*1.025,2)+' টাকা'; $('incb').hidden=false; }
		else { var u=a/v; $('res').textContent=f(u,2)+' '+nm; $('resl').textContent=f(a,0)+' টাকা = '+f(u,2)+' '+nm; $('incb').hidden=true; }
		$('qa').innerHTML=(rev?[1000,5000,10000,50000,100000]:[100,500,1000,2000,5000]).map(function(x){ return '<button type="button" data-v="'+x+'">'+f(x,0)+'</button>'; }).join('');
		$('qa').querySelectorAll('button').forEach(function(b){ b.onclick=function(){ $('amt').value=b.dataset.v; conv(); }; }); }
	function capText(){ return '💱 আজকের রেট ('+bd(J.latest)+'): '+$('resl').textContent+(rev?'':'\n🎁 ২.৫% প্রণোদনাসহ: '+$('inc').textContent)+'\n👉 সব মুদ্রার লাইভ রেট: '+location.origin+location.pathname; }
	$('amt').oninput=conv; $('cur').onchange=function(){ pick($('cur').value); };
	$('swap').onclick=function(){ rev=!rev; $('swap').textContent=rev?'⇅ বিদেশি মুদ্রা → টাকা':'⇅ উল্টো হিসাব (টাকা → বিদেশি মুদ্রা)'; $('amt').value=rev?10000:1000; conv(); };
	$('wa').onclick=function(){ window.open('https://wa.me/?text='+encodeURIComponent(capText()),'_blank'); };
	$('cp').onclick=function(){ var t=capText(); (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){ var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }).then(function(){ var d=document.createElement('div'); d.className='toast'; d.textContent='✅ কপি হয়েছে'; document.body.appendChild(d); setTimeout(function(){d.remove()},2000); }); };
	/* chart + trend + calc */
	function chart(){ var c=sel, s=ser(c,days), svg=$('svg'); $('chT').textContent='📈 '+C[c][0]+' — '+bn(days)+' দিনের চার্ট';
		if(s.length<2){ svg.innerHTML='<text x="20" y="40" fill="#6a7a93">পর্যাপ্ত তথ্য নেই</text>'; return; }
		var vs=s.map(function(x){return x[1]}), mn=Math.min.apply(null,vs), mx=Math.max.apply(null,vs), pad=(mx-mn)*.15||mx*.002, lo=mn-pad, hi=mx+pad, W=640, Hh=260, X=function(i){return 8+i*(W-16)/(s.length-1)}, Y=function(v){return Hh-24-(v-lo)/(hi-lo)*(Hh-44)};
		var pts=s.map(function(x,i){return X(i).toFixed(1)+','+Y(x[1]).toFixed(1)}).join(' '), up=vs[vs.length-1]>=vs[0], col=up?'#16a34a':'#dc2626';
		var g=''; for(var k=0;k<4;k++){ var v=lo+(hi-lo)*k/3, y=Y(v); g+='<line x1="0" x2="640" y1="'+y+'" y2="'+y+'" stroke="#e2e8f1"/><text x="636" y="'+(y-4)+'" text-anchor="end" font-size="12" fill="#6a7a93">'+f(v)+'</text>'; }
		g+='<text x="8" y="254" font-size="12" fill="#6a7a93">'+bd(s[0][0])+'</text><text x="632" y="254" text-anchor="end" font-size="12" fill="#6a7a93">'+bd(s[s.length-1][0])+'</text>';
		svg.innerHTML=g+'<defs><linearGradient id="fxg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="'+col+'" stop-opacity=".28"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></linearGradient></defs><polygon fill="url(#fxg)" points="'+X(0)+','+(Hh-24)+' '+pts+' '+X(s.length-1)+','+(Hh-24)+'"/><polyline fill="none" stroke="'+col+'" stroke-width="3" stroke-linejoin="round" points="'+pts+'"/><circle id="cdot" r="5" fill="'+col+'" stroke="#fff" stroke-width="2" cx="'+X(s.length-1)+'" cy="'+Y(vs[vs.length-1])+'"/>';
		svg.onmousemove=svg.ontouchmove=function(e){ var r=svg.getBoundingClientRect(), cx=((e.touches?e.touches[0].clientX:e.clientX)-r.left)/r.width*W, i=Math.max(0,Math.min(s.length-1,Math.round((cx-8)/(W-16)*(s.length-1)))), d=$('cdot'); d.setAttribute('cx',X(i)); d.setAttribute('cy',Y(s[i][1]));
			var t=$('tip'); t.hidden=false; t.style.left=(X(i)/W*100)+'%'; t.style.top=(Y(s[i][1])/Hh*100)+'%'; t.textContent=bd(s[i][0])+': '+f(s[i][1])+' ৳'; };
		svg.onmouseleave=function(){ $('tip').hidden=true; };
		var first=vs[0], last=vs[vs.length-1], ch=(last-first)/first*100;
		$('st3').innerHTML='<div><span>সর্বোচ্চ</span><b class="num">'+f(mx)+' ৳</b></div><div><span>সর্বনিম্ন</span><b class="num">'+f(mn)+' ৳</b></div><div><span>'+bn(days)+' দিনে পরিবর্তন</span><b class="num" style="color:'+(ch>=0?'#166534':'#991b1b')+'">'+(ch>=0?'▲ ':'▼ ')+f(Math.abs(ch),2)+'%</b></div>';
		var t=trendOf(c), m=ser(c,30), m0=m.length?m[0][1]:last, diffM=last-m0, tb=$('trend'); tb.className='trend '+t.k;
		tb.innerHTML='<b>'+(t.k==='u'?'↗️ ':t.k==='d'?'↘️ ':'➡️ ')+C[c][0]+' — '+t.t+'</b><p>গত মাসে ১ '+C[c][0]+' ছিল '+f(m0)+' টাকা, এখন '+f(last)+' টাকা — '+(Math.abs(diffM)<0.0005?'প্রায় একই আছে।':(diffM>0?'বেড়েছে '+f(diffM)+' টাকা':'কমেছে '+f(-diffM)+' টাকা')+' ('+f(Math.abs(diffM/m0*100),2)+'%)।')+' '
			+(t.k==='u'?'গত দুই সপ্তাহে দাম ধীরে ধীরে বাড়ছে; এই ধারা চললে সামনে আরও কিছুটা বাড়ার সম্ভাবনা আছে, তবে হঠাৎ উল্টেও যেতে পারে।':t.k==='d'?'গত দুই সপ্তাহে দাম কিছুটা কমছে; ধারা চললে আরও কমতে পারে, তবে নিশ্চিত নয়।':'গত দুই সপ্তাহে বড় কোনো ওঠানামা নেই — দাম মোটামুটি স্থির।')+'</p><small>⚠️ এটি শুধু অতীতের প্রবণতা, ভবিষ্যদ্বাণী বা আর্থিক পরামর্শ নয়।</small>';
		var v=L[c]; $('calT').textContent='🧮 '+C[c][0]+' পাঠানোর হিসাব';
		$('calc').innerHTML='<tr><th>পাঠালে</th><th style="text-align:right">টাকা</th><th style="text-align:right">২.৫% প্রণোদনাসহ</th></tr>'+[100,200,500,1000,1500,2000,3000,5000,10000].map(function(a){ return '<tr><td>'+f(a,0)+' '+c.toUpperCase()+'</td><td class="n">'+f(a*v,0)+' ৳</td><td class="n" style="color:#92400e">'+f(a*v*1.025,0)+' ৳</td></tr>'; }).join(''); }
	document.querySelectorAll('#chl [data-d]').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('#chl [data-d]').forEach(function(x){x.classList.toggle('on',x===b)}); days=+b.dataset.d; chart(); }; });
	function pick(c){ if(!L[c]) return; sel=c; try{localStorage.setItem('fx_cur',c)}catch(e){} $('cur').value=c; conv(); chart(); board(); }
	pick(L[sel]?sel:'sar');
	/* keep fresh: re-check every 10 minutes while open */
	setInterval(function(){ if(document.hidden) return; fetch('/wp-json/pa/v1/fx',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){ if(!j||!j.h) return; load(j); J.latest=j.latest; var d=new Date((j.at||0)*1000); $('upd').textContent=bn(d.toLocaleTimeString('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit'})); pick(sel); }).catch(function(){}); },600000);
})();
</script>
<?php wp_footer(); ?>
</body>
</html>
<?php
}
