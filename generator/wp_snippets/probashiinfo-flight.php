<?php
/* ফ্লাইট ট্র্যাকার লাইভ — probashiinfo.com/flight-tracker/ (Code Snippets, everywhere). Snippet "ফ্লাইট ট্র্যাকার লাইভ".
   A standalone web app (own header/footer), rendered at template_redirect like the BMET page.
   Data (all free and openly licensed — no scraping of Flightradar24 / FlightStats):
   - Live aircraft positions: adsb.lol (ODbL), fetched through /wp-json/pa/v1/ft-live and ft-near
     (adsb.lol sends no CORS headers) with short caches and a site-wide rate cap.
   - Routes, airlines, airports: VRS standing-data (CC0). Bangladesh routes + hubs are built by
     AutoBlog generator/flight_data.py and POSTed to /wp-json/pa/v1/ft-data (option pa_ft_data);
     any other callsign's route is read in the browser from vrs-standing-data.adsb.lol (CORS *).
   Landing times are estimates from distance and ground speed, and are labelled as such. */

add_action( 'init', function () {
	if ( get_option( 'pa_ft_page' ) ) return;
	$p = get_page_by_path( 'flight-tracker' );
	if ( ! $p ) {
		$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => 'flight-tracker',
			'post_title' => 'ফ্লাইট ট্র্যাকার লাইভ — বিমান এখন কোথায়?', 'post_content' => '<p>লাইভ ফ্লাইট ট্র্যাকার: ফ্লাইট নম্বর বা এয়ারপোর্ট দিয়ে বিমান এখন কোথায়, কখন অবতরণ করবে দেখুন।</p>' ) );
		if ( $id && ! is_wp_error( $id ) ) update_post_meta( $id, 'rank_math_focus_keyword', 'ফ্লাইট ট্র্যাকার' );
	}
	update_option( 'pa_ft_page', 1, false );
}, 20 );

/* adsb.lol through a cache: the same query within ttl seconds is answered locally; at most ~240
   upstream calls a minute for the whole site. */
function pa_ft_get( $path, $ttl ) {
	$key = 'pa_ft_' . md5( $path );
	$c = get_transient( $key );
	if ( false !== $c ) return $c;
	$n = (int) get_transient( 'pa_ft_rate' );
	if ( $n > 240 ) return null;
	set_transient( 'pa_ft_rate', $n + 1, 60 );
	$r = wp_remote_get( 'https://api.adsb.lol' . $path, array( 'timeout' => 12, 'headers' => array( 'Accept' => 'application/json', 'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' ) ) );
	if ( is_wp_error( $r ) || 200 !== wp_remote_retrieve_response_code( $r ) ) return null;
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	if ( ! is_array( $j ) ) return null;
	$ac = array();
	foreach ( (array) ( $j['ac'] ?? array() ) as $a ) {
		if ( ! isset( $a['lat'], $a['lon'] ) ) continue;
		$ac[] = array(
			'hex' => (string) ( $a['hex'] ?? '' ), 'cs' => trim( (string) ( $a['flight'] ?? '' ) ), 'r' => (string) ( $a['r'] ?? '' ), 't' => (string) ( $a['t'] ?? '' ),
			'lat' => round( (float) $a['lat'], 4 ), 'lon' => round( (float) $a['lon'], 4 ), 'alt' => $a['alt_baro'] ?? null,
			'gs' => isset( $a['gs'] ) ? round( (float) $a['gs'] ) : null,
			'trk' => isset( $a['track'] ) ? round( (float) $a['track'] ) : ( isset( $a['true_heading'] ) ? round( (float) $a['true_heading'] ) : null ),
			'vr' => $a['baro_rate'] ?? ( $a['geom_rate'] ?? null ), 'sq' => (string) ( $a['squawk'] ?? '' ), 'seen' => $a['seen_pos'] ?? ( $a['seen'] ?? null ),
		);
	}
	$c = array( 'ac' => $ac, 'now' => time() );
	set_transient( $key, $c, $ttl );
	return $c;
}

add_action( 'rest_api_init', function () {
	$nocache = function ( $data ) { ini_set( 'serialize_precision', '-1' ); do_action( 'litespeed_control_set_nocache', 'flight live' ); $res = new WP_REST_Response( $data ); $res->header( 'Cache-Control', 'no-store' ); return $res; };
	register_rest_route( 'pa/v1', '/ft-live', array( 'methods' => 'GET', 'permission_callback' => '__return_true',
		'callback' => function ( WP_REST_Request $r ) use ( $nocache ) {
			$out = array();
			foreach ( array_slice( array_unique( array_filter( explode( ',', strtoupper( (string) $r->get_param( 'cs' ) ) ) ) ), 0, 12 ) as $cs ) {
				if ( ! preg_match( '/^[A-Z0-9]{3,8}$/', $cs ) ) continue;
				$c = pa_ft_get( '/v2/callsign/' . $cs, 10 );
				$out[ $cs ] = $c && $c['ac'] ? $c['ac'][0] : ( $c ? false : null );
			}
			return $nocache( array( 'f' => $out, 'now' => time() ) );
		} ) );
	register_rest_route( 'pa/v1', '/ft-near', array( 'methods' => 'GET', 'permission_callback' => '__return_true',
		'callback' => function ( WP_REST_Request $r ) use ( $nocache ) {
			$lat = round( max( -85, min( 85, (float) $r->get_param( 'lat' ) ) ) * 2 ) / 2;
			$lon = round( max( -180, min( 180, (float) $r->get_param( 'lon' ) ) ) * 2 ) / 2;
			$rad = (int) max( 20, min( 250, (int) $r->get_param( 'r' ) ?: 150 ) );
			$c = pa_ft_get( "/v2/point/$lat/$lon/$rad", 20 );
			if ( ! $c ) return new WP_Error( 'busy', 'লাইভ ডাটা এখন পাওয়া যাচ্ছে না', array( 'status' => 502 ) );
			$c['ac'] = array_values( array_filter( $c['ac'], function ( $a ) { return '' !== $a['cs']; } ) );
			return $nocache( $c );
		} ) );
	register_rest_route( 'pa/v1', '/ft-data', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback' => function ( WP_REST_Request $r ) {
			$d = $r->get_json_params();
			if ( empty( $d['rt'] ) || empty( $d['ap'] ) ) return new WP_Error( 'bad', 'rt/ap missing', array( 'status' => 400 ) );
			$d['updated'] = gmdate( 'c' );
			update_option( 'pa_ft_data', $d, false );
			do_action( 'litespeed_purge_url', home_url( '/flight-tracker/' ) );
			return array( 'ok' => true, 'routes' => count( $d['rt'] ), 'airports' => count( $d['ap'] ) );
		} ) );
} );

add_filter( 'rank_math/frontend/title', function ( $t ) { return is_page( 'flight-tracker' ) ? 'ফ্লাইট ট্র্যাকার লাইভ — বিমান এখন কোথায়, কখন অবতরণ করবে (বাংলায়) | প্রবাসী ইনফো' : $t; } );
add_filter( 'rank_math/frontend/description', function ( $t ) { return is_page( 'flight-tracker' ) ? 'ফ্লাইট নম্বর (যেমন BG147, EK582, QR638) বা এয়ারপোর্ট দিয়ে লাইভ ফ্লাইট ট্র্যাক করুন — বিমান এখন কোথায়, কত উঁচুতে, কখন ঢাকায় অবতরণ করবে, ম্যাপসহ বাংলায়। ঢাকা, চট্টগ্রাম, সিলেট ও মধ্যপ্রাচ্যের ফ্লাইট।' : $t; } );

add_action( 'template_redirect', function () {
	if ( ! is_page( 'flight-tracker' ) || is_feed() || is_preview() ) return;
	do_action( 'litespeed_control_set_ttl', 3600 );
	pa_ft_render();
	exit;
}, 98 );

function pa_ft_render() {
	$d = get_option( 'pa_ft_data' );
	$d = is_array( $d ) ? $d : array( 'ap' => array(), 'al' => array(), 'iata' => array(), 'rt' => array() );
	$url = home_url( '/flight-tracker/' );
	$logo = defined( 'PA_LOGO' ) ? PA_LOGO : '';
	$bn = function ( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); };
	$apbn = array( 'DAC' => 'ঢাকা', 'CGP' => 'চট্টগ্রাম', 'ZYL' => 'সিলেট', 'CXB' => 'কক্সবাজার', 'JSR' => 'যশোর', 'RJH' => 'রাজশাহী', 'SPD' => 'সৈয়দপুর', 'BZL' => 'বরিশাল', 'DXB' => 'দুবাই', 'AUH' => 'আবুধাবি', 'SHJ' => 'শারজাহ', 'DOH' => 'দোহা', 'RUH' => 'রিয়াদ', 'JED' => 'জেদ্দা', 'DMM' => 'দাম্মাম', 'MED' => 'মদিনা', 'KWI' => 'কুয়েত', 'MCT' => 'মাস্কাট', 'BAH' => 'বাহরাইন', 'KUL' => 'কুয়ালালামপুর', 'SIN' => 'সিঙ্গাপুর', 'BKK' => 'ব্যাংকক', 'CCU' => 'কলকাতা', 'DEL' => 'দিল্লি', 'IST' => 'ইস্তাম্বুল', 'LHR' => 'লন্ডন', 'MLE' => 'মালে', 'KTM' => 'কাঠমান্ডু', 'CAN' => 'গুয়াংজু', 'HKG' => 'হংকং' );
	$albn = array( 'BBC' => 'বিমান বাংলাদেশ', 'UBG' => 'ইউএস-বাংলা', 'AWA' => 'এয়ার অ্যাস্ট্রা', 'QTR' => 'কাতার এয়ারওয়েজ', 'UAE' => 'এমিরেটস', 'FDB' => 'ফ্লাইদুবাই', 'ABY' => 'এয়ার অ্যারাবিয়া', 'SVA' => 'সৌদিয়া', 'ETD' => 'ইতিহাদ', 'OMS' => 'সালাম এয়ার', 'OMA' => 'ওমান এয়ার', 'GFA' => 'গালফ এয়ার', 'KAC' => 'কুয়েত এয়ারওয়েজ', 'JZR' => 'জাজিরা এয়ারওয়েজ', 'THY' => 'টার্কিশ এয়ারলাইন্স', 'SIA' => 'সিঙ্গাপুর এয়ারলাইন্স', 'MAS' => 'মালয়েশিয়া এয়ারলাইন্স', 'MXD' => 'বাটিক এয়ার', 'AXM' => 'এয়ারএশিয়া', 'IGO' => 'ইন্ডিগো', 'AIC' => 'এয়ার ইন্ডিয়া', 'THA' => 'থাই এয়ারওয়েজ', 'CPA' => 'ক্যাথে প্যাসিফিক', 'CSN' => 'চায়না সাউদার্ন', 'CES' => 'চায়না ইস্টার্ন', 'ALK' => 'শ্রীলঙ্কান', 'MSR' => 'ইজিপ্টএয়ার', 'ETH' => 'ইথিওপিয়ান', 'FAD' => 'ফ্লাইঅ্যাডিল', 'DLH' => 'লুফথানসা' );
	/* popular passenger routes touching Bangladesh — server-rendered for search engines */
	$pop = array();
	$pass = array( 'BBC', 'UBG', 'AWA', 'QTR', 'UAE', 'FDB', 'ABY', 'SVA', 'ETD', 'OMS', 'OMA', 'GFA', 'KAC', 'JZR', 'THY', 'SIA', 'MAS', 'MXD', 'AXM', 'IGO', 'THA', 'CSN', 'ALK', 'DRK', 'DQA' );
	foreach ( (array) $d['rt'] as $r ) {
		$a = substr( $r[0], 0, 3 );
		if ( ! in_array( $a, $pass, true ) ) continue;
		$codes = explode( '-', $r[1] );
		$ia = array_map( function ( $c ) use ( $d ) { return $d['ap'][ $c ][0] ?? $c; }, $codes );
		$num = preg_replace( '/^[A-Z]{3}/', '', $r[0] );
		$iata = ( $d['al'][ $a ][0] ?? '' ) ?: $a;
		$pop[] = array( $iata . $num, $albn[ $a ] ?? ( $d['al'][ $a ][1] ?? $a ), implode( ' → ', array_map( function ( $c ) use ( $apbn ) { return ( $apbn[ $c ] ?? $c ) . ' (' . $c . ')'; }, $ia ) ), $a, (int) $num );
	}
	usort( $pop, function ( $x, $y ) use ( $pass ) { return array( array_search( $x[3], $pass, true ), $x[4] ) <=> array( array_search( $y[3], $pass, true ), $y[4] ); } );
	$faq = array(
		array( 'ফ্লাইট নম্বর দিয়ে বিমান এখন কোথায় আছে কীভাবে দেখব?', 'ওপরের বক্সে ফ্লাইট নম্বর লিখুন — যেমন BG147, EK582 বা QR638 — তারপর "খুঁজুন" চাপুন। বিমানটি আকাশে থাকলে ম্যাপে তার অবস্থান, উচ্চতা, গতি, কোন শহরের কাছে আছে আর আনুমানিক কখন অবতরণ করবে তা বাংলায় দেখাবে; প্রতি ১৫ সেকেন্ডে নিজে থেকে হালনাগাদ হয়।' ),
		array( 'অবতরণের সময় কতটা সঠিক?', 'অবতরণের সময় বিমানের বর্তমান অবস্থান থেকে গন্তব্যের দূরত্ব আর বর্তমান গতি দিয়ে হিসাব করা একটি আনুমানিক সময়। আবহাওয়া, রানওয়ে বা এয়ার ট্রাফিকের কারণে আসল সময় কিছুটা আলাদা হতে পারে — চূড়ান্ত সময়ের জন্য এয়ারলাইন বা এয়ারপোর্টের অফিসিয়াল তথ্য দেখুন।' ),
		array( 'ফ্লাইট খুঁজে পাচ্ছি না কেন?', 'বিমান এখনো উড্ডয়ন না করলে, অবতরণ করে ফেললে বা কোনো এলাকায় রিসিভার কভারেজ না থাকলে লাইভ অবস্থান দেখা যায় না। তখন ফ্লাইটের রুট দেখানো হবে; উড্ডয়নের পর আবার চেষ্টা করুন।' ),
		array( 'এয়ারপোর্ট দিয়ে কীভাবে দেখব কোন বিমান আসছে?', '"এয়ারপোর্ট" ট্যাবে ঢাকা, চট্টগ্রাম, সিলেট বা দুবাই, দোহা, রিয়াদের মতো এয়ারপোর্ট বাছুন — আশপাশের আকাশে এখন যত বিমান আছে, কোনটি আসছে, কোনটি ছেড়ে গেছে আর কতক্ষণে নামবে তা তালিকা ও ম্যাপে দেখাবে।' ),
		array( 'এই তথ্য কোথা থেকে আসে?', 'বিমানের লাইভ অবস্থান আসে adsb.lol থেকে — সারা বিশ্বের স্বেচ্ছাসেবী রিসিভারের খোলা ডাটা (ODbL)। রুট, এয়ারলাইন ও এয়ারপোর্টের তথ্য Virtual Radar Server standing data (CC0) থেকে। প্রবাসী ইনফো কোনো এয়ারলাইন বা এয়ারপোর্টের অফিসিয়াল সেবা নয়।' ),
	);
	$ld = array( '@context' => 'https://schema.org', '@graph' => array(
		array( '@type' => 'WebApplication', 'name' => 'ফ্লাইট ট্র্যাকার লাইভ', 'url' => $url, 'applicationCategory' => 'TravelApplication', 'operatingSystem' => 'Web', 'inLanguage' => 'bn', 'isAccessibleForFree' => true, 'offers' => array( '@type' => 'Offer', 'price' => '0', 'priceCurrency' => 'BDT' ) ),
		array( '@type' => 'BreadcrumbList', 'itemListElement' => array( array( '@type' => 'ListItem', 'position' => 1, 'name' => 'হোম', 'item' => home_url( '/' ) ), array( '@type' => 'ListItem', 'position' => 2, 'name' => 'ফ্লাইট ট্র্যাকার', 'item' => $url ) ) ),
		array( '@type' => 'FAQPage', 'mainEntity' => array_map( function ( $q ) { return array( '@type' => 'Question', 'name' => $q[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $q[1] ) ); }, $faq ) ),
	) );
	?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#071a3a">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css">
<?php wp_head(); ?>
<script type="application/ld+json"><?php echo wp_json_encode( $ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?></script>
<style id="ft-css">
:root{--nv:#071a3a;--nv2:#0b2f6b;--b:#0b56c4;--sky:#38bdf8;--g:#16a34a;--g2:#22c55e;--am:#f59e0b;--red:#e11d48;--ink:#0f1f38;--ink2:#34465f;--mut:#6a7a93;--line:#e2e8f1;--bg:#eef3fa;--soft:#eef3fb;--hf:"Anek Bangla","Hind Siliguri",system-ui,sans-serif;--tf:"Hind Siliguri",system-ui,sans-serif;--sh:0 1px 2px rgba(10,40,90,.06),0 12px 30px -18px rgba(10,40,90,.4)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
html{scroll-behavior:smooth;scroll-padding-top:70px}
body.ft-app{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.65 var(--tf);-webkit-font-smoothing:antialiased;overflow-x:hidden}
html body.ft-app,html body.ft-app *{font-family:var(--tf)!important}
html body.ft-app h1,html body.ft-app h2,html body.ft-app h3,html body.ft-app b,html body.ft-app .num,html body.ft-app summary,html body.ft-app .hf{font-family:var(--hf)!important}
.ft-app a{color:var(--b)}.w{max-width:1200px;margin:0 auto;padding:0 16px}
.ft-app h1,.ft-app h2,.ft-app h3{line-height:1.25;margin:0}
.ah{position:sticky;top:0;z-index:1200;background:rgba(7,26,58,.94);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.08)}
.ah .w{display:flex;align-items:center;gap:14px;height:60px}
.ah .lg{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;flex:none}.ah .lg img{height:32px;width:auto;background:#fff;border-radius:8px;padding:3px 6px}
.ah .lg b{font-size:18px;color:#fff}.ah .lg b i{font-style:normal;color:var(--sky)}
.ah nav{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}.ah nav::-webkit-scrollbar{display:none}
.ah nav a{color:#cfe0ff;text-decoration:none;font-weight:600;font-size:14.5px;padding:7px 11px;border-radius:999px;white-space:nowrap}.ah nav a:hover{background:rgba(255,255,255,.12);color:#fff}
.ah .home{color:#cfe0ff;text-decoration:none;font-size:14px;white-space:nowrap}
.dot{width:9px;height:9px;border-radius:50%;background:var(--g2);display:inline-block;animation:p 1.6s infinite;flex:none}
@keyframes p{0%{box-shadow:0 0 0 0 rgba(34,197,94,.6)}70%{box-shadow:0 0 0 10px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
.hero{position:relative;color:#fff;background:radial-gradient(900px 400px at 85% -20%,rgba(56,189,248,.35),transparent 60%),linear-gradient(140deg,#071a3a,#0b2f6b 60%,#0b56c4);overflow:hidden}
.hero:before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.18) 1px,transparent 1.2px);background-size:26px 26px;-webkit-mask-image:linear-gradient(180deg,#000,transparent 80%);mask-image:linear-gradient(180deg,#000,transparent 80%)}
.hero .plane-bg{position:absolute;right:-40px;top:20px;font-size:220px;opacity:.07;transform:rotate(-20deg);pointer-events:none}
.hero .w{position:relative;padding-top:22px;padding-bottom:70px}
.crumb{font-size:13.5px;color:#a9c4f5}.crumb a{color:#d6e4fb!important;text-decoration:none}
.hero h1{font-size:clamp(28px,4.4vw,46px);font-weight:800;margin:8px 0 6px;color:#fff}
.hero p.lead{color:#cfe0ff;margin:0 0 18px;max-width:70ch}
.sc{background:#fff;color:var(--ink);border-radius:22px;padding:16px;box-shadow:0 30px 60px -30px rgba(0,0,0,.55);max-width:880px}
.tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.tabs button{border:0;background:var(--soft);color:var(--ink2);border-radius:12px;padding:9px 14px;font-weight:700;font-size:15px;cursor:pointer}
.tabs button.on{background:var(--nv2);color:#fff}
.row{display:flex;gap:8px;flex-wrap:wrap}.row[hidden]{display:none!important}.row input,.row select{flex:1;min-width:150px;border:2px solid var(--line);border-radius:14px;padding:13px 14px;font-size:17px;font-weight:600;color:var(--ink);background:#fff;outline:none}
.row input:focus,.row select:focus{border-color:var(--b)}
.row button.go{border:0;background:linear-gradient(135deg,var(--b),#0a3f97);color:#fff;border-radius:14px;padding:0 22px;font-weight:800;font-size:17px;cursor:pointer;min-height:52px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.chips button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 11px;font-size:13.5px;cursor:pointer;color:var(--ink2)}.chips button:hover{border-color:var(--b);color:var(--b)}
.chips span{font-size:13px;color:var(--mut);align-self:center}
.main{margin-top:-46px;position:relative;z-index:2}
.grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:16px;align-items:start}
.mapc{background:#fff;border-radius:22px;overflow:hidden;box-shadow:var(--sh);border:1px solid var(--line);position:relative}
#map{height:560px;background:#0b1e3f}
.mapbar{position:absolute;left:12px;top:12px;z-index:500;display:flex;gap:8px;align-items:center;background:rgba(7,26,58,.86);color:#fff;border-radius:999px;padding:6px 12px;font-size:13.5px;font-weight:600}
.panel{background:#fff;border-radius:22px;box-shadow:var(--sh);border:1px solid var(--line);padding:16px;min-height:200px}
.panel h2{font-size:20px;margin-bottom:8px}
.empty{color:var(--mut);font-size:15px}
.fh{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.fh .al{font-size:14px;color:var(--mut)}.fh .fn{font-size:28px;font-weight:800}
.st{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 11px;font-size:13.5px;font-weight:700}
.st.air{background:#dcfce7;color:#166534}.st.gnd{background:#fef9c3;color:#854d0e}.st.off{background:#f1f5f9;color:#475569}.st.emg{background:#fee2e2;color:#991b1b}
.route{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin:14px 0 6px}
.route .ap b{display:block;font-size:26px;line-height:1}.route .ap span{font-size:13.5px;color:var(--ink2)}.route .ap.r{text-align:right}
.track{position:relative;height:8px;background:var(--soft);border-radius:4px}.track i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,var(--g2),var(--b));border-radius:4px}
.track em{position:absolute;top:-13px;font-style:normal;font-size:22px;transform:translateX(-50%) rotate(45deg);transition:left .8s}
.legs{font-size:13px;color:var(--mut);margin-bottom:8px}
.say{background:linear-gradient(135deg,#eff6ff,#ecfdf5);border:1px solid #dbeafe;border-radius:16px;padding:12px 14px;font-size:16px;line-height:1.75;margin:10px 0}
.kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kv div{background:var(--soft);border-radius:12px;padding:8px 10px}.kv span{display:block;font-size:12.5px;color:var(--mut)}.kv b{font-size:18px}
.eta{background:var(--nv);color:#fff;border-radius:16px;padding:12px 14px;margin:10px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.eta b{font-size:24px;color:#fde68a}.eta small{color:#cfe0ff}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.acts button{border:0;border-radius:12px;padding:10px 12px;font-weight:700;font-size:14.5px;cursor:pointer}
.b1{background:var(--g);color:#fff}.b2{background:#25d366;color:#053b1d}.b3{background:var(--soft);color:var(--ink2)}
.list{display:grid;gap:6px;max-height:520px;overflow:auto}.it{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid var(--line);border-radius:12px;cursor:pointer;background:#fff}
.it:hover{border-color:var(--b);background:#f8fbff}.it .ic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--soft);font-size:17px}
.it b{font-size:15.5px}.it small{display:block;color:var(--mut);font-size:12.5px}.it .rt{text-align:right;font-size:13px;color:var(--ink2)}
.it.arr .ic{background:#dcfce7}.it.dep .ic{background:#dbeafe}
.lh{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}.lh button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px;font-size:13.5px;font-weight:600;cursor:pointer}.lh button.on{background:var(--nv2);color:#fff;border-color:var(--nv2)}
.sec{margin:34px 0 0}.sec>h2{font-size:clamp(22px,2.8vw,28px);margin:0 0 6px}.sec>p{color:var(--ink2);margin:0 0 14px}
.how{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.how div{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:var(--sh)}.how b{display:block;font-size:17px;margin:6px 0 4px}.how i{font-style:normal;font-size:28px}
.pt{width:100%;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden;font-size:15px}.pt th,.pt td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left}.pt th{background:var(--soft);font-size:13px;color:var(--mut)}
.pt td a{font-weight:700;text-decoration:none}.ptw{max-height:520px;overflow:auto;border:1px solid var(--line);border-radius:16px}
.faq details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:0 0 8px}.faq summary{cursor:pointer;font-weight:700;font-size:16.5px;list-style:none}.faq summary::-webkit-details-marker{display:none}.faq p{margin:8px 0 0;color:var(--ink2)}
.src{background:#fff;border:1px solid var(--line);border-left:5px solid var(--am);border-radius:16px;padding:14px 16px;margin:30px 0 0;font-size:14px;color:var(--ink2)}
.af{background:var(--nv);color:#bcd3fb;margin-top:40px;padding:28px 0 18px;font-size:14.5px}.af .g{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:22px}
.af h4{color:#fff;font-size:16px;margin:0 0 8px}.af a{color:#d6e4fb!important;text-decoration:none;display:block;margin:4px 0}.af .base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;border-top:1px solid rgba(255,255,255,.1);margin-top:20px;padding-top:14px;font-size:13px}
.af .dl{display:inline;color:#fbbf24!important;font-weight:700}
.plane-ic{filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));transition:transform .6s}
.ap-lbl{background:#071a3a;color:#fff;border:0;border-radius:8px;padding:2px 7px;font-weight:700;font-size:12px;box-shadow:none}.ap-lbl:before{display:none}
.leaflet-tooltip.pl{background:#fff;border:0;border-radius:8px;font-weight:700;font-size:12.5px;padding:2px 7px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--nv);color:#fff;border-radius:12px;padding:10px 16px;z-index:2000;font-weight:600}
@media(max-width:960px){.grid{grid-template-columns:minmax(0,1fr)}#map{height:420px}.how{grid-template-columns:minmax(0,1fr)}.af .g{grid-template-columns:minmax(0,1fr)}}
@media(max-width:700px){.ah nav,.ah .home{display:none}.ah .w{justify-content:space-between}#map{height:360px}.route .ap b{font-size:21px}.fh .fn{font-size:24px}.row button.go{width:100%}}
@media(prefers-reduced-motion:reduce){.dot{animation:none}}
/* iPhone / Safari: no automatic text inflation, long text wraps inside its box */
.sc,.panel,.how div,.say,.kv div,.eta,.it>span{min-width:0;overflow-wrap:anywhere}
.row input,.row select{-webkit-appearance:none;appearance:none}
</style>
</head>
<body <?php body_class( 'ft-app' ); ?>>
<?php wp_body_open(); ?>
<header class="ah"><div class="w">
	<a class="lg" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="প্রবাসী ইনফো — হোম"><?php if ( $logo ) echo '<img src="' . esc_url( $logo ) . '" alt="প্রবাসী ইনফো" width="120" height="32">'; ?><b>ফ্লাইট <i>ট্র্যাকার</i></b></a>
	<nav aria-label="ফ্লাইট ট্র্যাকার"><a href="#track">খুঁজুন</a><a href="#map-sec">লাইভ ম্যাপ</a><a href="#routes">বাংলাদেশের ফ্লাইট</a><a href="#faq">প্রশ্নোত্তর</a><a href="<?php echo esc_url( home_url( '/bmet-report/' ) ); ?>">বিএমইটি লাইভ</a></nav>
	<a class="home" href="<?php echo esc_url( home_url( '/' ) ); ?>">← প্রবাসী ইনফো</a>
</div></header>

<section class="hero" id="track"><span class="plane-bg" aria-hidden="true">✈</span><div class="w">
	<nav class="crumb" aria-label="ব্রেডক্রাম্ব"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a> › ফ্লাইট ট্র্যাকার</nav>
	<h1>ফ্লাইট ট্র্যাকার লাইভ — বিমান এখন কোথায়?</h1>
	<p class="lead">ফ্লাইট নম্বর বা এয়ারপোর্ট দিন — বিমান এখন কোন দেশের আকাশে, কত উঁচুতে, কত গতিতে আর কখন অবতরণ করতে পারে, ম্যাপসহ বাংলায় দেখুন। প্রিয়জনকে এয়ারপোর্ট থেকে আনতে যাওয়ার আগে একবার দেখে নিন।</p>
	<div class="sc">
		<div class="tabs" role="tablist"><button type="button" data-m="f" class="on">✈️ ফ্লাইট নম্বর</button><button type="button" data-m="a">🛬 এয়ারপোর্ট</button><button type="button" data-m="r">🧭 কোথা থেকে কোথায়</button></div>
		<form class="row" id="f-f" autocomplete="off"><input id="q" placeholder="ফ্লাইট নম্বর, যেমন BG147 / EK582 / QR638" aria-label="ফ্লাইট নম্বর" inputmode="text" autocapitalize="characters"><button class="go" type="submit">খুঁজুন</button></form>
		<form class="row" id="f-a" hidden><select id="ap" aria-label="এয়ারপোর্ট"></select><button class="go" type="submit">দেখুন</button></form>
		<form class="row" id="f-r" hidden><select id="ra" aria-label="কোথা থেকে"></select><select id="rb" aria-label="কোথায়"></select><button class="go" type="submit">ফ্লাইট দেখুন</button></form>
		<div class="chips" id="chips"></div>
	</div>
</div></section>

<main class="w main" id="map-sec">
	<div class="grid">
		<div class="mapc"><div class="mapbar"><span class="dot"></span><span id="mb">লাইভ ম্যাপ লোড হচ্ছে…</span></div><div id="map" role="region" aria-label="লাইভ ফ্লাইট ম্যাপ"></div></div>
		<aside class="panel" id="res" aria-live="polite"><h2>ঢাকার আকাশে এখন</h2><p class="empty">লাইভ ডাটা আনা হচ্ছে…</p></aside>
	</div>

	<section class="sec"><h2>কীভাবে ব্যবহার করবেন</h2><div class="how">
		<div><i>✈️</i><b>ফ্লাইট নম্বর দিয়ে</b>টিকিটে লেখা ফ্লাইট নম্বর (যেমন BG147, EK582) লিখুন — বিমান কোথায় আছে, কখন নামবে দেখাবে।</div>
		<div><i>🛬</i><b>এয়ারপোর্ট দিয়ে</b>ঢাকা, চট্টগ্রাম, সিলেট বা দুবাই, দোহা — কোন বিমান আসছে, কোনটি এইমাত্র ছেড়েছে।</div>
		<div><i>🧭</i><b>রুট দিয়ে</b>"ঢাকা → দুবাই" বাছুন — এই রুটের সব ফ্লাইট আর কোনটি এখন আকাশে।</div>
	</div></section>

	<?php if ( $pop ) : ?>
	<section class="sec" id="routes"><h2>বাংলাদেশের জনপ্রিয় ফ্লাইট — লাইভ স্ট্যাটাস</h2><p>ফ্লাইট নম্বরে চাপুন — সঙ্গে সঙ্গে লাইভ অবস্থান দেখাবে। রুটের তথ্য উন্মুক্ত ডাটাবেস থেকে; এয়ারলাইন সময়সূচি বদলালে কিছু রুট পুরোনো হতে পারে।</p>
		<div class="ptw"><table class="pt"><thead><tr><th>ফ্লাইট</th><th>এয়ারলাইন</th><th>রুট</th></tr></thead><tbody>
		<?php foreach ( array_slice( $pop, 0, 220 ) as $p ) echo '<tr><td><a href="' . esc_url( add_query_arg( 'f', $p[0], $url ) ) . '" data-f="' . esc_attr( $p[0] ) . '">' . esc_html( $p[0] ) . '</a></td><td>' . esc_html( $p[1] ) . '</td><td>' . esc_html( $p[2] ) . '</td></tr>'; ?>
		</tbody></table></div>
	</section>
	<?php endif; ?>

	<section class="sec faq" id="faq"><h2>প্রশ্নোত্তর</h2>
		<?php foreach ( $faq as $k => $q ) echo '<details' . ( $k === 0 ? ' open' : '' ) . '><summary>' . esc_html( $q[0] ) . '</summary><p>' . esc_html( $q[1] ) . '</p></details>'; ?>
	</section>
	<div class="src">⚠️ <b>দায়মুক্তি:</b> বিমানের লাইভ অবস্থান <a href="https://adsb.lol" target="_blank" rel="noopener nofollow">adsb.lol</a> (ODbL) এবং রুটের তথ্য <a href="https://github.com/vradarserver/standing-data" target="_blank" rel="noopener nofollow">VRS standing data</a> (CC0) থেকে নেওয়া উন্মুক্ত ডাটা; অবতরণের সময় দূরত্ব ও গতি থেকে হিসাব করা আনুমানিক সময়। প্রবাসী ইনফো কোনো এয়ারলাইন বা এয়ারপোর্টের অফিসিয়াল সেবা নয় — চূড়ান্ত সময়ের জন্য এয়ারলাইন বা এয়ারপোর্টের অফিসিয়াল তথ্য দেখুন। ম্যাপ © OpenFreeMap, © OpenStreetMap contributors।</div>
</main>

<footer class="af"><div class="w">
	<div class="g">
		<div><b style="color:#fff;font-size:18px">✈️ ফ্লাইট ট্র্যাকার লাইভ</b><p>প্রবাসী ও তাদের পরিবারের জন্য — প্রিয়জনের বিমান এখন কোথায়, কখন নামবে, সহজ বাংলায়।</p></div>
		<div><h4>প্রবাসী ইনফো</h4><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a><a href="<?php echo esc_url( home_url( '/bmet-report/' ) ); ?>">আজকের বিএমইটি রিপোর্ট (লাইভ)</a><a href="<?php echo esc_url( home_url( '/#dash' ) ); ?>">আজকের রেট</a></div>
		<div><h4>সহযোগী</h4><a href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=flight" target="_blank" rel="noopener sponsored">✈️ ড্রিম ইন্টারন্যাশনাল</a><a href="https://www.probashibondu.online/?utm_source=probashiinfo&amp;utm_medium=flight" target="_blank" rel="noopener">🌍 প্রবাসী বন্ধু</a></div>
	</div>
	<div class="base"><span>© <?php echo $bn( wp_date( 'Y' ) ); ?> প্রবাসী ইনফো · স্বাধীন তথ্যসেবা</span><span>সার্বিক সহযোগিতায় <a class="dl" href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=flight-footer" target="_blank" rel="noopener sponsored">ড্রিম ইন্টারন্যাশনাল</a></span></div>
</div></footer>

<script id="ft-data" type="application/json"><?php echo wp_json_encode( array( 'ap' => $d['ap'], 'al' => $d['al'], 'iata' => $d['iata'] ?? array(), 'rt' => $d['rt'] ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js"></script>
<script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js"></script>
<script>
(function(){
	var J=JSON.parse(document.getElementById('ft-data').textContent), AP=J.ap||{}, AL=J.al||{}, IATA=J.iata||{}, RT={}, $=function(i){return document.getElementById(i)};
	(J.rt||[]).forEach(function(r){ RT[r[0]]=r[1]; });
	var BYIATA={}; for(var k in AP) BYIATA[AP[k][0]]=k;
	var bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})}, num=function(n){return bn(Math.round(n).toLocaleString('en-US'))};
	var APBN=<?php echo wp_json_encode( $apbn, JSON_UNESCAPED_UNICODE ); ?>, ALBN=<?php echo wp_json_encode( $albn, JSON_UNESCAPED_UNICODE ); ?>;
	Object.assign(APBN,{CLA:'কুমিল্লা',RKT:'রাস আল খাইমাহ',DWC:'দুবাই আল মাকতুম',DMK:'ব্যাংকক (ডন মুয়াং)',BOM:'মুম্বাই',MAA:'চেন্নাই',BLR:'বেঙ্গালুরু',HYD:'হায়দ্রাবাদ',PBH:'পারো',CMB:'কলম্বো',LGW:'লন্ডন গ্যাটউইক',MAN:'ম্যানচেস্টার',CDG:'প্যারিস',FCO:'রোম',MXP:'মিলান',ATH:'এথেন্স',OTP:'বুখারেস্ট',BEG:'বেলগ্রেড',SKP:'স্কোপিয়ে',RMO:'কিশিনাউ',KMG:'কুনমিং',NRT:'টোকিও',ICN:'সিউল',JFK:'নিউইয়র্ক',YYZ:'টরন্টো',SYD:'সিডনি',CAI:'কায়রো',ADD:'আদ্দিস আবাবা',KHI:'করাচি',LHE:'লাহোর',ISB:'ইসলামাবাদ',AMM:'আম্মান',RGN:'ইয়াঙ্গুন',MNL:'ম্যানিলা',CGK:'জাকার্তা',SGN:'হো চি মিন সিটি',HAN:'হ্যানয়',PEK:'বেইজিং',PVG:'সাংহাই',FRA:'ফ্রাঙ্কফুর্ট',AMS:'আমস্টারডাম',MAD:'মাদ্রিদ',LIS:'লিসবন',VIE:'ভিয়েনা',WAW:'ওয়ারশ',PRG:'প্রাগ',BUD:'বুদাপেস্ট',SOF:'সোফিয়া',SVO:'মস্কো',GYD:'বাকু',CTU:'চেংদু',SZX:'শেনজেন',ISL:'ইস্তাম্বুল',KTM:'কাঠমান্ডু'});
	Object.assign(ALBN,{ADY:'এয়ার অ্যারাবিয়া আবুধাবি',AXB:'এয়ার ইন্ডিয়া এক্সপ্রেস',SEJ:'স্পাইসজেট',RGE:'রিজেন্ট এয়ারওয়েজ',TGW:'স্কুট',DRK:'ড্রুক এয়ার',HIM:'হিমালয় এয়ারলাইন্স',DQA:'মালদিভিয়ান',AIQ:'থাই এয়ারএশিয়া',TLM:'থাই লায়ন এয়ার',CCA:'এয়ার চায়না',BKP:'ব্যাংকক এয়ারওয়েজ'});
	var CCBN={BD:'বাংলাদেশ',IN:'ভারত',AE:'আমিরাত',QA:'কাতার',SA:'সৌদি আরব',KW:'কুয়েত',OM:'ওমান',BH:'বাহরাইন',MY:'মালয়েশিয়া',SG:'সিঙ্গাপুর',TH:'থাইল্যান্ড',NP:'নেপাল',BT:'ভুটান',MV:'মালদ্বীপ',LK:'শ্রীলঙ্কা',PK:'পাকিস্তান',MM:'মিয়ানমার',CN:'চীন',HK:'হংকং',TR:'তুরস্ক',GB:'যুক্তরাজ্য',FR:'ফ্রান্স',IT:'ইতালি',DE:'জার্মানি',NL:'নেদারল্যান্ডস',ES:'স্পেন',PT:'পর্তুগাল',GR:'গ্রিস',RO:'রোমানিয়া',RS:'সার্বিয়া',MK:'উত্তর মেসিডোনিয়া',MD:'মলদোভা',HU:'হাঙ্গেরি',CZ:'চেকিয়া',AT:'অস্ট্রিয়া',PL:'পোল্যান্ড',BG:'বুলগেরিয়া',RU:'রাশিয়া',AZ:'আজারবাইজান',JP:'জাপান',KR:'দক্ষিণ কোরিয়া',PH:'ফিলিপাইন',ID:'ইন্দোনেশিয়া',VN:'ভিয়েতনাম',EG:'মিশর',ET:'ইথিওপিয়া',JO:'জর্ডান',AU:'অস্ট্রেলিয়া',US:'যুক্তরাষ্ট্র',CA:'কানাডা',BE:'বেলজিয়াম',KZ:'কাজাখস্তান'};
	var TZ={BD:'Asia/Dhaka',IN:'Asia/Kolkata',AE:'Asia/Dubai',QA:'Asia/Qatar',SA:'Asia/Riyadh',KW:'Asia/Kuwait',OM:'Asia/Muscat',BH:'Asia/Bahrain',MY:'Asia/Kuala_Lumpur',SG:'Asia/Singapore',TH:'Asia/Bangkok',NP:'Asia/Kathmandu',BT:'Asia/Thimphu',MV:'Indian/Maldives',LK:'Asia/Colombo',PK:'Asia/Karachi',MM:'Asia/Yangon',CN:'Asia/Shanghai',HK:'Asia/Hong_Kong',TR:'Europe/Istanbul',GB:'Europe/London',FR:'Europe/Paris',IT:'Europe/Rome',DE:'Europe/Berlin',NL:'Europe/Amsterdam',ES:'Europe/Madrid',PT:'Europe/Lisbon',GR:'Europe/Athens',RO:'Europe/Bucharest',RS:'Europe/Belgrade',MK:'Europe/Skopje',MD:'Europe/Chisinau',HU:'Europe/Budapest',CZ:'Europe/Prague',AT:'Europe/Vienna',PL:'Europe/Warsaw',BG:'Europe/Sofia',RU:'Europe/Moscow',AZ:'Asia/Baku',JP:'Asia/Tokyo',KR:'Asia/Seoul',PH:'Asia/Manila',ID:'Asia/Jakarta',VN:'Asia/Ho_Chi_Minh',EG:'Africa/Cairo',ET:'Africa/Addis_Ababa',JO:'Asia/Amman',AU:'Australia/Sydney',US:'America/New_York',CA:'America/Toronto',BE:'Europe/Brussels',KZ:'Asia/Almaty'};
	var TYPES={B77W:'বোয়িং ৭৭৭-৩০০ইআর',B772:'বোয়িং ৭৭৭-২০০',B788:'বোয়িং ৭৮৭-৮ ড্রিমলাইনার',B789:'বোয়িং ৭৮৭-৯ ড্রিমলাইনার',B78X:'বোয়িং ৭৮৭-১০',B738:'বোয়িং ৭৩৭-৮০০',B38M:'বোয়িং ৭৩৭ ম্যাক্স ৮',B39M:'বোয়িং ৭৩৭ ম্যাক্স ৯',B744:'বোয়িং ৭৪৭-৪০০',B748:'বোয়িং ৭৪৭-৮',B763:'বোয়িং ৭৬৭-৩০০',A320:'এয়ারবাস এ৩২০',A20N:'এয়ারবাস এ৩২০নিও',A321:'এয়ারবাস এ৩২১',A21N:'এয়ারবাস এ৩২১নিও',A319:'এয়ারবাস এ৩১৯',A332:'এয়ারবাস এ৩৩০-২০০',A333:'এয়ারবাস এ৩৩০-৩০০',A339:'এয়ারবাস এ৩৩০নিও',A359:'এয়ারবাস এ৩৫০-৯০০',A35K:'এয়ারবাস এ৩৫০-১০০০',A388:'এয়ারবাস এ৩৮০',AT76:'এটিআর ৭২-৬০০',AT75:'এটিআর ৭২-৫০০',DH8D:'ড্যাশ ৮-কিউ৪০০',E190:'এমব্রেয়ার ই১৯০',E195:'এমব্রেয়ার ই১৯৫',B737:'বোয়িং ৭৩৭-৭০০',B77L:'বোয়িং ৭৭৭-২০০এলআর'};
	var PAGE=location.origin+location.pathname;
	/* ---------- geo ---------- */
	var R=6371, rad=Math.PI/180;
	function hav(a,b){ var dl=(b[0]-a[0])*rad, dn=(b[1]-a[1])*rad, x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dn/2)*Math.sin(dn/2); return 2*R*Math.asin(Math.min(1,Math.sqrt(x))); }
	function gc(a,b,n){ var p1=a[0]*rad,l1=a[1]*rad,p2=b[0]*rad,l2=b[1]*rad, d=hav(a,b)/R, out=[]; if(d<1e-6) return [a,b]; n=n||64;
		for(var i=0;i<=n;i++){ var f=i/n, A=Math.sin((1-f)*d)/Math.sin(d), B=Math.sin(f*d)/Math.sin(d), x=A*Math.cos(p1)*Math.cos(l1)+B*Math.cos(p2)*Math.cos(l2), y=A*Math.cos(p1)*Math.sin(l1)+B*Math.cos(p2)*Math.sin(l2), z=A*Math.sin(p1)+B*Math.sin(p2);
			out.push([Math.atan2(z,Math.sqrt(x*x+y*y))/rad, Math.atan2(y,x)/rad]); }
		for(var j=1;j<out.length;j++){ while(out[j][1]-out[j-1][1]>180) out[j][1]-=360; while(out[j][1]-out[j-1][1]<-180) out[j][1]+=360; } return out; }
	function nearest(p){ var best=null,bd=1e9; for(var k in AP){ var a=AP[k], dd=hav(p,[a[4],a[5]]); if(dd<bd){bd=dd;best=a;} } return best?{a:best,d:bd}:null; }
	function apName(ia){ return APBN[ia]||((AP[BYIATA[ia]]||[])[2])||ia; }
	function apOf(icao){ var a=AP[icao]; return a?{ia:a[0],name:a[1],city:a[2],cc:a[3],ll:[a[4],a[5]],bn:APBN[a[0]]||a[2]}:null; }
	/* ---------- time ---------- */
	function tfmt(ts,tz){ try{ var p={}; new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'numeric',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ts)).forEach(function(q){p[q.type]=q.value}); var h=+p.hour, part=h<5?'রাত':h<12?'সকাল':h<15?'দুপুর':h<18?'বিকাল':h<20?'সন্ধ্যা':'রাত'; return part+' '+bn(((h+11)%12)+1)+':'+bn(p.minute); }catch(e){ return ''; } }
	function dur(min){ min=Math.max(1,Math.round(min)); var h=Math.floor(min/60), m=min%60; return (h?bn(h)+' ঘণ্টা ':'')+(m?bn(m)+' মিনিট':''); }
	/* ---------- flight number -> callsigns ---------- */
	function parseQ(q){ q=(q||'').toUpperCase().replace(/[\s\-_.]/g,''); var m=q.match(/^([A-Z]{3})(\d{1,4}[A-Z]?)$/), out=[];
		if(m&&(AL[m[1]]||!/^\d/.test(m[2]))) out.push(m[1]+m[2].replace(/^0+(?=\d)/,''));
		var n=q.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/); if(n&&IATA[n[1]]) IATA[n[1]].forEach(function(ic){ out.push(ic+n[2].replace(/^0+(?=\d)/,'')); });
		if(!out.length&&/^[A-Z0-9]{3,8}$/.test(q)) out.push(q); return out.filter(function(v,i,a){return a.indexOf(v)===i}).slice(0,8); }
	function iataFn(cs){ var a=cs.slice(0,3), al=AL[a]; return al&&al[0]?al[0]+' '+cs.slice(3):cs; }
	function alName(cs){ var a=cs.slice(0,3); return ALBN[a]||(AL[a]&&AL[a][1])||''; }
	var RC={};
	function route(cs){ if(RT[cs]) return Promise.resolve(RT[cs].split('-')); if(cs in RC) return Promise.resolve(RC[cs]);
		return fetch('https://vrs-standing-data.adsb.lol/routes/'+cs.slice(0,2)+'/'+cs+'.json').then(function(r){return r.ok?r.json():null}).then(function(j){
			if(!j||!j.airport_codes){ RC[cs]=null; return null; } (j._airports||[]).forEach(function(a){ if(a.icao&&!AP[a.icao]) { AP[a.icao]=[a.iata||a.icao,a.name||'',a.location||'',a.countryiso2||'',+a.lat,+a.lon]; BYIATA[a.iata||a.icao]=a.icao; } });
			RC[cs]=j.airport_codes.split('-'); return RC[cs]; }).catch(function(){ RC[cs]=null; return null; }); }
	function live(list){ return fetch('/wp-json/pa/v1/ft-live?cs='+encodeURIComponent(list.join(','))+'&_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){return (j&&j.f)||{}}); }
	function near(ll,r){ return fetch('/wp-json/pa/v1/ft-near?lat='+ll[0]+'&lon='+ll[1]+'&r='+(r||150)+'&_='+Date.now(),{cache:'no-store'}).then(function(x){return x.ok?x.json():{ac:[]}}).then(function(j){return j.ac||[]}); }
	/* ---------- map ---------- */
	var map=L.map('map',{zoomControl:true,worldCopyJump:true,attributionControl:true}).setView([23.84,90.4],6);
	/* base map: OpenFreeMap vector tiles (free, no key) via MapLibre; plain OSM tiles if WebGL is missing */
	var attr='© <a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © OpenStreetMap contributors · লাইভ: adsb.lol';
	try{ if(L.maplibreGL&&window.maplibregl&&maplibregl.supported&&maplibregl.supported()) L.maplibreGL({style:'https://tiles.openfreemap.org/styles/liberty',attribution:attr}).addTo(map); else throw 0; }
	catch(e){ L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:12,attribution:'© OpenStreetMap contributors · লাইভ: adsb.lol'}).addTo(map); }
	var lay=L.layerGroup().addTo(map), sel=L.layerGroup().addTo(map);
	function planeIcon(trk,col,big){ var s=big?40:26; return L.divIcon({className:'',iconSize:[s,s],iconAnchor:[s/2,s/2],html:'<svg class="plane-ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" style="transform:rotate('+((trk||0))+'deg)"><path fill="'+col+'" stroke="#fff" stroke-width=".8" d="M12 2c.7 0 1.2.6 1.2 1.4v6.1l7.6 4.4v2l-7.6-2.3v4.7l2.2 1.7V22L12 21l-3.4 1v-2l2.2-1.7v-4.7l-7.6 2.3v-2l7.6-4.4V3.4C10.8 2.6 11.3 2 12 2z"/></svg>'}); }
	function apMarker(a,g){ L.circleMarker(a.ll,{radius:6,color:'#fff',weight:2,fillColor:'#0b56c4',fillOpacity:1}).addTo(g).bindTooltip(a.bn+' ('+a.ia+')',{permanent:true,direction:'top',className:'ap-lbl',offset:[0,-6]}); }
	/* ---------- result panel helpers ---------- */
	function toast(t){ var d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(function(){d.remove()},2600); }
	function copy(t){ (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast('✅ কপি হয়েছে')},function(){ var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast('✅ কপি হয়েছে'); }); }
	function altTxt(a){ return a==='ground'?'মাটিতে':a==null?'—':num(a)+' ফুট'; }
	function status(ac,leg){ if(!ac) return ['off','⏸ এখন আকাশে নেই']; if(ac.sq==='7700'||ac.sq==='7600'||ac.sq==='7500') return ['emg','🚨 জরুরি সংকেত ('+bn(ac.sq)+')'];
		if(ac.alt==='ground'||(ac.gs!=null&&ac.gs<60)) return ['gnd','🛬 মাটিতে আছে'];
		if(leg&&leg.rem<220&&ac.vr<-300) return ['air','🛬 অবতরণের জন্য নামছে']; if(leg&&leg.done<220&&ac.vr>300) return ['air','🛫 উড্ডয়ন করে উঠছে']; return ['air','✈️ আকাশে উড়ছে']; }
	function pickLeg(codes,p){ var best=null; for(var i=0;i<codes.length-1;i++){ var A=apOf(codes[i]), B=apOf(codes[i+1]); if(!A||!B) continue; var da=hav(A.ll,p), db=hav(p,B.ll), dab=hav(A.ll,B.ll), off=da+db-dab; if(!best||off<best.off) best={A:A,B:B,i:i,off:off,done:da,rem:db,tot:dab}; } return best; }
	/* ---------- flight view ---------- */
	var cur=null, timer=0, trail=[];
	function showFlight(q,silent){
		var cands=parseQ(q); if(!cands.length){ toast('সঠিক ফ্লাইট নম্বর লিখুন, যেমন BG147'); return; }
		clearInterval(timer); mode='f'; if(!silent){ $('res').innerHTML='<h2>'+q.toUpperCase()+'</h2><p class="empty">⏳ লাইভ অবস্থান খোঁজা হচ্ছে…</p>'; trail=[]; }
		history.replaceState(null,'','?f='+encodeURIComponent(q.toUpperCase().replace(/\s/g,'')));
		live(cands).then(function(f){
			var cs=cands.filter(function(c){return f[c]})[0]||cands.filter(function(c){return RT[c]})[0]||cands[0], ac=f[cs]||null;
			return route(cs).then(function(codes){ cur={q:q,cs:cs,ac:ac,codes:codes}; renderFlight(); timer=setInterval(function(){ refreshFlight(); },15000); });
		}).catch(function(){ $('res').innerHTML='<h2>'+q+'</h2><p class="empty">লাইভ ডাটা এখন পাওয়া যাচ্ছে না — একটু পরে আবার চেষ্টা করুন।</p>'; });
	}
	function refreshFlight(){ if(!cur||document.hidden) return; live([cur.cs]).then(function(f){ cur.ac=f[cur.cs]||null; renderFlight(true); }); }
	function renderFlight(upd){
		var c=cur, ac=c.ac, codes=c.codes, p=ac?[ac.lat,ac.lon]:null, leg=null, A=null, B=null;
		if(codes&&codes.length>1){ if(p) leg=pickLeg(codes,p); A=leg?leg.A:apOf(codes[0]); B=leg?leg.B:apOf(codes[codes.length-1]); }
		var st=status(ac,leg), fn=iataFn(c.cs), al=alName(c.cs), h='';
		h+='<div class="fh"><span class="fn num">'+fn+'</span><span class="st '+st[0]+'">'+st[1]+'</span></div><div class="fh"><span class="al">'+(al||'')+(al?' · ':'')+'কলসাইন '+c.cs+'</span></div>';
		if(A&&B){ var pct=leg&&ac?Math.max(0,Math.min(100,leg.done*100/(leg.done+leg.rem))):(ac?0:0);
			h+='<div class="route"><div class="ap"><b class="num">'+A.ia+'</b><span>'+A.bn+'</span></div><div class="track"><i style="width:'+pct+'%"></i>'+(ac?'<em style="left:'+pct+'%">✈</em>':'')+'</div><div class="ap r"><b class="num">'+B.ia+'</b><span>'+B.bn+'</span></div></div>';
			if(codes.length>2) h+='<div class="legs">পুরো রুট: '+codes.map(function(x){var a=apOf(x);return a?a.bn+' ('+a.ia+')':x}).join(' → ')+'</div>'; }
		var say='', share='';
		if(ac){
			var nr=nearest(p), place=nr?(nr.d<40?(nr.a[3]==='BD'?'':'')+(APBN[nr.a[0]]||nr.a[2])+(nr.a[3]&&CCBN[nr.a[3]]?' ('+CCBN[nr.a[3]]+')':'')+'-এর ঠিক ওপরে/কাছে':(CCBN[nr.a[3]]?CCBN[nr.a[3]]+'-এর ':'')+(APBN[nr.a[0]]||nr.a[2])+' থেকে প্রায় '+num(nr.d)+' কিমি দূরে'):'আকাশপথে';
			var kmh=ac.gs?ac.gs*1.852:0;
			if(st[0]==='gnd') say='বিমানটি এখন <b>'+place+'</b> মাটিতে আছে'+(B&&leg&&leg.rem<30?' — <b>'+B.bn+'</b>-এ অবতরণ করেছে।':'।');
			else say='বিমানটি এখন <b>'+place+'</b>, <b>'+altTxt(ac.alt)+'</b> উচ্চতায় ঘণ্টায় <b>'+num(kmh)+' কিমি</b> গতিতে '+(ac.vr<-300?'নিচে নামছে':ac.vr>300?'ওপরে উঠছে':'উড়ছে')+'।';
			if(leg&&B&&st[0]!=='gnd'&&kmh>150){ var mins=leg.rem/kmh*60+(leg.rem>150?12:4), at=Date.now()+mins*6e4, bdT=tfmt(at,'Asia/Dhaka'), lc=TZ[B.cc], loT=lc&&lc!=='Asia/Dhaka'?tfmt(at,lc):'';
				say+=' <b>'+B.bn+'</b> পৌঁছাতে আর প্রায় <b>'+num(leg.rem)+' কিমি</b> বাকি — আনুমানিক <b>'+dur(mins)+'</b> পরে, বাংলাদেশ সময় <b>'+bdT+'</b>'+(loT?' ('+B.bn+'র স্থানীয় সময় '+loT+')':'')+' নাগাদ অবতরণ করতে পারে।';
				h+='<div class="eta"><span>🛬 আনুমানিক অবতরণ</span><b>'+bdT+'</b><small>বাংলাদেশ সময়'+(loT?' · '+B.bn+': '+loT:'')+' · প্রায় '+dur(mins)+' পরে</small></div>';
				share=fn+' ('+A.bn+' → '+B.bn+') এখন '+place.replace(/<[^>]+>/g,'')+', '+altTxt(ac.alt)+' উচ্চতায়। আনুমানিক অবতরণ: বাংলাদেশ সময় '+bdT+' (প্রায় '+dur(mins)+' পরে)।'; }
			if(!share) share=fn+(A&&B?' ('+A.bn+' → '+B.bn+')':'')+': '+say.replace(/<[^>]+>/g,'');
			h+='<div class="say">'+say+'</div>';
			h+='<div class="kv"><div><span>উচ্চতা</span><b class="num">'+altTxt(ac.alt)+'</b></div><div><span>গতি</span><b class="num">'+(kmh?num(kmh)+' কিমি/ঘ':'—')+'</b></div>'
				+'<div><span>বিমান</span><b>'+(TYPES[ac.t]||ac.t||'—')+'</b></div><div><span>রেজিস্ট্রেশন</span><b class="num">'+(ac.r||'—')+'</b></div>'
				+(leg?'<div><span>পাড়ি দিয়েছে</span><b class="num">'+num(leg.done)+' কিমি</b></div><div><span>বাকি</span><b class="num">'+num(leg.rem)+' কিমি</b></div>':'')
				+'<div><span>দিক</span><b class="num">'+(ac.trk!=null?bn(ac.trk)+'°':'—')+'</b></div><div><span>উঠা/নামা</span><b class="num">'+(ac.vr!=null?(ac.vr>0?'↑ ':ac.vr<0?'↓ ':'')+num(Math.abs(ac.vr))+' ফুট/মি':'—')+'</b></div></div>';
		} else {
			h+='<div class="say">'+(A&&B?'<b>'+fn+'</b> সাধারণত <b>'+A.bn+'</b> থেকে <b>'+B.bn+'</b> যায়। ':'')+'এই মুহূর্তে বিমানটির লাইভ অবস্থান পাওয়া যাচ্ছে না — সম্ভবত এখনো উড্ডয়ন করেনি, ইতিমধ্যে অবতরণ করেছে, অথবা ওই এলাকায় রিসিভার কভারেজ নেই। পাতাটি খোলা রাখুন, আকাশে উঠলেই নিজে থেকে দেখাবে।</div>';
			share=fn+(A&&B?' ('+A.bn+' → '+B.bn+')':'')+' — লাইভ ট্র্যাক করুন';
		}
		h+='<div class="acts"><button type="button" class="b1" id="sh1">📤 শেয়ার</button><button type="button" class="b2" id="sh2">💬 WhatsApp</button><button type="button" class="b3" id="sh3">🔗 লিংক কপি</button></div><p class="empty" style="font-size:12.5px;margin-top:8px">প্রতি ১৫ সেকেন্ডে নিজে হালনাগাদ হয় · অবতরণের সময় আনুমানিক</p>';
		$('res').innerHTML=h;
		var link=PAGE+'?f='+encodeURIComponent(fn.replace(/\s/g,'')), txt='✈️ '+share+'\n👉 লাইভ দেখুন: '+link;
		$('sh1').onclick=function(){ if(navigator.share) navigator.share({title:fn+' ফ্লাইট ট্র্যাকার',text:'✈️ '+share,url:link}).catch(function(){}); else copy(txt); };
		$('sh2').onclick=function(){ window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank'); };
		$('sh3').onclick=function(){ copy(link); };
		/* map */
		sel.clearLayers(); lay.clearLayers(); $('mb').textContent=fn+' — লাইভ';
		var pts=[];
		if(codes) codes.forEach(function(x){ var a=apOf(x); if(a){ apMarker(a,sel); pts.push(a.ll); } });
		if(A&&B){ if(p){ L.polyline(gc(A.ll,p),{color:'#16a34a',weight:4}).addTo(sel); L.polyline(gc(p,B.ll),{color:'#0b56c4',weight:3,dashArray:'8 8'}).addTo(sel); } else L.polyline(gc(A.ll,B.ll),{color:'#0b56c4',weight:3,dashArray:'8 8'}).addTo(sel); }
		if(p){ trail.push(p); if(trail.length>1) L.polyline(trail,{color:'#f59e0b',weight:3}).addTo(sel); L.marker(p,{icon:planeIcon(ac.trk,'#e11d48',true),zIndexOffset:1000}).addTo(sel).bindTooltip(fn,{direction:'top',className:'pl'}); pts.push(p); }
		if(!upd&&pts.length) map.fitBounds(L.latLngBounds(pts).pad(.25),{maxZoom:7}); else if(upd&&p&&!map.getBounds().contains(p)) map.panTo(p);
	}
	/* ---------- airport view ---------- */
	var mode='a';
	function showAirport(icao,silent){
		var A=apOf(icao); if(!A) return; clearInterval(timer); mode='a'; cur=null;
		if(!silent){ $('res').innerHTML='<h2>'+A.bn+' ('+A.ia+')</h2><p class="empty">⏳ আশপাশের আকাশ দেখা হচ্ছে…</p>'; history.replaceState(null,'','?ap='+A.ia); }
		near(A.ll,180).then(function(list){
			return Promise.all(list.slice(0,60).map(function(ac){ return route(ac.cs).then(function(codes){ ac.codes=codes; return ac; }); }));
		}).then(function(list){
			var items=list.map(function(ac){ var p=[ac.lat,ac.lon], d=hav(p,A.ll), kind='ovr', other=null, codes=ac.codes, i=codes?codes.indexOf(icao):-1;
				if(i===0){ kind='dep'; other=apOf(codes[1]); }
				else if(i>0&&i===codes.length-1){ kind='arr'; other=apOf(codes[i-1]); }
				else if(i>0){ var pv=apOf(codes[i-1]), nx=apOf(codes[i+1]); if(pv&&hav(pv.ll,p)<hav(pv.ll,A.ll)){ kind='arr'; other=pv; } else { kind='dep'; other=nx; } }
				if(ac.alt==='ground'||(ac.gs!=null&&ac.gs<60)) kind='gnd';
				var kmh=ac.gs?ac.gs*1.852:0, eta=kind==='arr'&&kmh>150?d/kmh*60+8:null;
				return {ac:ac,d:d,kind:kind,other:other,eta:eta}; });
			var arr=items.filter(function(x){return x.kind==='arr'}).sort(function(a,b){return (a.eta||1e9)-(b.eta||1e9)}), dep=items.filter(function(x){return x.kind==='dep'}).sort(function(a,b){return a.d-b.d}), rest=items.filter(function(x){return x.kind==='ovr'||x.kind==='gnd'});
			var tab=window.__apTab||'arr';
			function row(x){ var ac=x.ac, fn=iataFn(ac.cs), o=x.other;
				return '<div class="it '+x.kind+'" data-f="'+fn.replace(/\s/g,'')+'"><span class="ic">'+(x.kind==='arr'?'🛬':x.kind==='dep'?'🛫':x.kind==='gnd'?'🅿️':'✈️')+'</span><span><b class="num">'+fn+'</b> <small>'+(alName(ac.cs)||'')+(o?(x.kind==='arr'?' · '+o.bn+' থেকে':' · '+o.bn+' যাচ্ছে'):'')+'</small></span><span class="rt">'
					+(x.eta?'প্রায় '+dur(x.eta)+'<br><small>'+tfmt(Date.now()+x.eta*6e4,'Asia/Dhaka')+'</small>':num(x.d)+' কিমি<br><small>'+altTxt(ac.alt)+'</small>')+'</span></div>'; }
			function paint(){ var L2=tab==='arr'?arr:tab==='dep'?dep:rest;
				$('res').innerHTML='<h2>'+A.bn+' ('+A.ia+') — আশপাশের আকাশে এখন '+bn(items.length)+'টি বিমান</h2><div class="lh"><button type="button" data-t="arr"'+(tab==='arr'?' class="on"':'')+'>🛬 আসছে ('+bn(arr.length)+')</button><button type="button" data-t="dep"'+(tab==='dep'?' class="on"':'')+'>🛫 ছেড়ে গেছে ('+bn(dep.length)+')</button><button type="button" data-t="ovr"'+(tab==='ovr'?' class="on"':'')+'>✈️ অন্যান্য ('+bn(rest.length)+')</button></div>'
					+'<div class="list">'+(L2.length?L2.map(row).join(''):'<p class="empty">এই মুহূর্তে কিছু নেই।</p>')+'</div><p class="empty" style="font-size:12.5px;margin-top:8px">'+A.bn+'র ১৮০ নটিক্যাল মাইলের মধ্যে · প্রতি ৩০ সেকেন্ডে হালনাগাদ · সময় আনুমানিক</p>';
				$('res').querySelectorAll('[data-t]').forEach(function(b){ b.onclick=function(){ window.__apTab=tab=b.dataset.t; paint(); }; });
				$('res').querySelectorAll('.it[data-f]').forEach(function(b){ b.onclick=function(){ $('q').value=b.dataset.f; setMode('f'); showFlight(b.dataset.f); }; }); }
			paint();
			lay.clearLayers(); sel.clearLayers(); apMarker(A,sel); $('mb').textContent=A.bn+'র আকাশে '+bn(items.length)+'টি বিমান';
			items.forEach(function(x){ var ac=x.ac, col=x.kind==='arr'?'#16a34a':x.kind==='dep'?'#0b56c4':'#64748b';
				L.marker([ac.lat,ac.lon],{icon:planeIcon(ac.trk,col)}).addTo(lay).bindTooltip(iataFn(ac.cs)+(x.other?' · '+x.other.bn:''),{direction:'top',className:'pl'}).on('click',function(){ $('q').value=iataFn(ac.cs).replace(/\s/g,''); setMode('f'); showFlight($('q').value); }); });
			if(!silent) map.setView(A.ll,7);
		}).catch(function(){ $('res').innerHTML='<h2>'+A.bn+'</h2><p class="empty">লাইভ ডাটা এখন পাওয়া যাচ্ছে না — একটু পরে আবার চেষ্টা করুন।</p>'; });
		timer=setInterval(function(){ if(!document.hidden) showAirport(icao,true); },30000);
	}
	/* ---------- route view ---------- */
	function showRoute(a,b){
		var A=apOf(a), B=apOf(b); if(!A||!B||a===b) return; clearInterval(timer); mode='r'; cur=null; history.replaceState(null,'','?from='+A.ia+'&to='+B.ia);
		var list=Object.keys(RT).filter(function(cs){ var c=RT[cs].split('-'), i=c.indexOf(a), j=c.indexOf(b); return i>=0&&j>i; }).sort();
		var km=hav(A.ll,B.ll), mins=km/820*60+25;
		var h='<h2>'+A.bn+' → '+B.bn+'</h2><p class="empty">সরাসরি দূরত্ব প্রায় '+num(km)+' কিমি · সাধারণত '+dur(mins)+' এর মতো লাগে</p>';
		if(!list.length){ $('res').innerHTML=h+'<p class="empty">এই রুটের ফ্লাইট তালিকা আমাদের কাছে নেই (শুধু বাংলাদেশের রুট রাখা আছে)। ফ্লাইট নম্বর দিয়ে খুঁজে দেখুন।</p>'; drawRoute(A,B); return; }
		$('res').innerHTML=h+'<p class="empty">⏳ '+bn(list.length)+'টি ফ্লাইটের লাইভ অবস্থা দেখা হচ্ছে…</p>'; drawRoute(A,B);
		var chunks=[]; for(var i=0;i<Math.min(list.length,36);i+=12) chunks.push(list.slice(i,i+12));
		Promise.all(chunks.map(live)).then(function(rs){ var f={}; rs.forEach(function(x){ Object.assign(f,x); });
			var rows=list.map(function(cs){ var ac=f[cs], fn=iataFn(cs); return {cs:cs,fn:fn,ac:ac}; }).sort(function(x,y){ return (y.ac?1:0)-(x.ac?1:0); });
			var up=rows.filter(function(x){return x.ac}).length;
			$('res').innerHTML=h+'<p><b>'+bn(rows.length)+'টি ফ্লাইট</b> · এখন আকাশে <b>'+bn(up)+'টি</b></p><div class="list">'+rows.map(function(x){ var ac=x.ac;
				return '<div class="it '+(ac?'arr':'')+'" data-f="'+x.fn.replace(/\s/g,'')+'"><span class="ic">'+(ac?'✈️':'⏸')+'</span><span><b class="num">'+x.fn+'</b> <small>'+(alName(x.cs)||'')+'</small></span><span class="rt">'+(ac?(ac.alt==='ground'?'মাটিতে':altTxt(ac.alt)):'আকাশে নেই')+'</span></div>'; }).join('')+'</div>';
			$('res').querySelectorAll('.it[data-f]').forEach(function(el){ el.onclick=function(){ $('q').value=el.dataset.f; setMode('f'); showFlight(el.dataset.f); }; });
			rows.forEach(function(x){ if(x.ac) L.marker([x.ac.lat,x.ac.lon],{icon:planeIcon(x.ac.trk,'#16a34a')}).addTo(lay).bindTooltip(x.fn,{direction:'top',className:'pl'}); });
		});
	}
	function drawRoute(A,B){ lay.clearLayers(); sel.clearLayers(); apMarker(A,sel); apMarker(B,sel); L.polyline(gc(A.ll,B.ll),{color:'#0b56c4',weight:3,dashArray:'8 8'}).addTo(sel); map.fitBounds(L.latLngBounds([A.ll,B.ll]).pad(.3)); $('mb').textContent=A.bn+' → '+B.bn; }
	/* ---------- UI ---------- */
	function setMode(m){ document.querySelectorAll('.tabs [data-m]').forEach(function(b){ b.classList.toggle('on',b.dataset.m===m); }); ['f','a','r'].forEach(function(x){ $('f-'+x).hidden=x!==m; }); chips(m); }
	document.querySelectorAll('.tabs [data-m]').forEach(function(b){ b.onclick=function(){ setMode(b.dataset.m); }; });
	var opts=Object.keys(AP).map(function(k){ return [k,AP[k]]; }).sort(function(x,y){ var bx=x[1][3]==='BD'?0:1, by=y[1][3]==='BD'?0:1; return bx-by||(apName(x[1][0])).localeCompare(apName(y[1][0]),'bn'); })
		.map(function(x){ return '<option value="'+x[0]+'">'+apName(x[1][0])+' ('+x[1][0]+')'+(x[1][3]&&CCBN[x[1][3]]&&x[1][3]!=='BD'?' — '+CCBN[x[1][3]]:'')+'</option>'; }).join('');
	$('ap').innerHTML=opts; $('ra').innerHTML=opts; $('rb').innerHTML=opts; $('ap').value='VGHS'; $('ra').value='VGHS'; $('rb').value='OMDB';
	$('f-f').onsubmit=function(e){ e.preventDefault(); showFlight($('q').value); };
	$('f-a').onsubmit=function(e){ e.preventDefault(); showAirport($('ap').value); };
	$('f-r').onsubmit=function(e){ e.preventDefault(); showRoute($('ra').value,$('rb').value); };
	function chips(m){ var c=$('chips'), h='';
		if(m==='f'){ h='<span>জনপ্রিয়:</span>'; ['BBC147','QTR638','UAE582','SVA805','FDB584','UBG201','ABY565','ETD263','GFA249','KAC283','OMA381','MAS197'].filter(function(cs){return RT[cs]}).slice(0,8).forEach(function(cs){ var r=RT[cs].split('-'); h+='<button type="button" data-q="'+iataFn(cs).replace(/\s/g,'')+'">'+iataFn(cs)+' · '+apName(AP[r[0]][0])+'→'+apName(AP[r[r.length-1]][0])+'</button>'; }); }
		else if(m==='a'){ h='<span>দ্রুত:</span>'; ['VGHS','VGEG','VGSY','OMDB','OTHH','OERK','OEJN','OKKK','OOMS','WMKK','WSSS'].filter(function(k){return AP[k]}).forEach(function(k){ h+='<button type="button" data-ap="'+k+'">'+apName(AP[k][0])+'</button>'; }); }
		else { h='<span>জনপ্রিয় রুট:</span>'; [['VGHS','OMDB'],['VGHS','OTHH'],['VGHS','OERK'],['VGHS','OEJN'],['VGHS','OKKK'],['VGHS','OOMS'],['VGHS','WMKK'],['OMDB','VGHS'],['OTHH','VGHS'],['VGEG','OMDB']].filter(function(x){return AP[x[0]]&&AP[x[1]]}).forEach(function(x){ h+='<button type="button" data-ra="'+x[0]+'" data-rb="'+x[1]+'">'+apName(AP[x[0]][0])+' → '+apName(AP[x[1]][0])+'</button>'; }); }
		c.innerHTML=h;
		c.querySelectorAll('[data-q]').forEach(function(b){ b.onclick=function(){ $('q').value=b.dataset.q; showFlight(b.dataset.q); }; });
		c.querySelectorAll('[data-ap]').forEach(function(b){ b.onclick=function(){ $('ap').value=b.dataset.ap; showAirport(b.dataset.ap); }; });
		c.querySelectorAll('[data-ra]').forEach(function(b){ b.onclick=function(){ $('ra').value=b.dataset.ra; $('rb').value=b.dataset.rb; showRoute(b.dataset.ra,b.dataset.rb); }; }); }
	document.querySelectorAll('.pt a[data-f]').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); $('q').value=a.dataset.f; setMode('f'); showFlight(a.dataset.f); document.getElementById('track').scrollIntoView({behavior:'smooth'}); }; });
	document.addEventListener('visibilitychange',function(){ if(!document.hidden&&cur) refreshFlight(); });
	/* deep links: ?f=BG147 · ?ap=DXB · ?from=DAC&to=DXB — default: Dhaka's sky */
	var u=new URLSearchParams(location.search), fq=u.get('f'), aq=u.get('ap'), fr=u.get('from'), to=u.get('to');
	if(fq){ setMode('f'); $('q').value=fq; showFlight(fq); }
	else if(aq&&BYIATA[aq.toUpperCase()]){ setMode('a'); $('ap').value=BYIATA[aq.toUpperCase()]; showAirport(BYIATA[aq.toUpperCase()]); }
	else if(fr&&to&&BYIATA[fr.toUpperCase()]&&BYIATA[to.toUpperCase()]){ setMode('r'); $('ra').value=BYIATA[fr.toUpperCase()]; $('rb').value=BYIATA[to.toUpperCase()]; showRoute($('ra').value,$('rb').value); }
	else { setMode('f'); showAirport('VGHS',true); history.replaceState(null,'',location.pathname); $('res').querySelector('h2'); }
})();
</script>
<?php wp_footer(); ?>
</body>
</html>
<?php
}
