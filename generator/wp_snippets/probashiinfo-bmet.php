<?php
/* বিএমইটি লাইভ রিপোর্ট — probashiinfo.com/bmet-report/ (Code Snippets, everywhere). Snippet #15.
   A standalone web app with its own header and footer, rendered at template_redirect (before the v3 app).
   Data:
   - History: daily country-clearance totals from the Government's Overseas Employment Platform (OEP,
     oep.gov.bd), collected by AutoBlog generator/bmet_report.py (00:20 and 09:15 BST) and POSTed to
     /wp-json/pa/v1/bmet (admins only), stored in the option pa_bmet.
   - Live: today's running count, fetched from OEP by /wp-json/pa/v1/bmet-live at most once per 5 minutes.
   Numbers are shown exactly as OEP returns them; nothing is estimated.
   The card renderer between the @CARD markers is copied from AutoBlog generator/bmet_card.js
   (python generator/sync_bmet_card.py). */

add_action( 'rest_api_init', function () {
	register_rest_route( 'pa/v1', '/bmet', array(
		'methods'             => 'POST',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function ( WP_REST_Request $r ) {
			$d = $r->get_json_params();
			if ( empty( $d['days'] ) || ! is_array( $d['days'] ) ) return new WP_Error( 'bad', 'days missing', array( 'status' => 400 ) );
			update_option( 'pa_bmet', $d, false );
			do_action( 'litespeed_purge_url', home_url( '/bmet-report/' ) );
			do_action( 'litespeed_purge_all' );
			return array( 'ok' => true, 'days' => count( $d['days'] ) );
		},
	) );
	register_rest_route( 'pa/v1', '/bmet-live', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			do_action( 'litespeed_control_set_nocache', 'bmet live' );
			$res = new WP_REST_Response( pa_bmet_live() );
			$res->header( 'Cache-Control', 'no-store' );
			return $res;
		},
	) );
} );

function pa_bmet_oep( $day, $gender = '' ) {
	$u = add_query_arg( array( 'draw' => 1, 'start' => 0, 'length' => 400, 'approval_date_from' => $day, 'approval_date_to' => $day ), 'https://www.oep.gov.bd/reports/country-clearance' );
	if ( $gender ) $u = add_query_arg( 'gender_id', $gender, $u );
	$r = wp_remote_get( $u, array( 'timeout' => 20, 'headers' => array( 'X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json', 'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' ) ) );
	if ( is_wp_error( $r ) || 200 !== wp_remote_retrieve_response_code( $r ) ) return null;
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	return ( ! empty( $j['success'] ) && isset( $j['payload'] ) ) ? $j['payload'] : null;
}

/* Today's running count (Asia/Dhaka), cached 5 minutes; on an OEP error the last good value is kept. */
function pa_bmet_live() {
	$day = wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) );
	$key = 'pa_bmet_live_' . $day;
	$c   = get_transient( $key );
	if ( false !== $c ) return $c;
	$all = pa_bmet_oep( $day );
	$fem = $all ? pa_bmet_oep( $day, 2 ) : null;
	if ( $all ) {
		$cs = array();
		foreach ( (array) $all['data'] as $row ) if ( (int) $row['total_employee'] > 0 ) $cs[ $row['country_name'] ] = (int) $row['total_employee'];
		arsort( $cs );
		$c = array( 'date' => $day, 't' => (int) $all['totalEmployee'], 'f' => $fem ? (int) $fem['totalEmployee'] : 0, 'c' => $cs, 'at' => time(), 'ok' => true );
		update_option( 'pa_bmet_live_last', $c, false );
	} else {
		$old = get_option( 'pa_bmet_live_last' );
		$c   = ( is_array( $old ) && $old['date'] === $day ) ? array_merge( $old, array( 'ok' => false ) ) : array( 'date' => $day, 't' => 0, 'f' => 0, 'c' => array(), 'at' => time(), 'ok' => false );
	}
	set_transient( $key, $c, $all ? 300 : 120 ); // OEP is asked at most once per 5 minutes
	return $c;
}

/* Any date range, straight from OEP (what a visitor would get by filtering on oep.gov.bd).
   Past ranges are cached a day, ranges that include today 5 minutes; at most 40 fresh OEP
   lookups per 10 minutes site-wide. */
function pa_bmet_range( $from, $to ) {
	$tz = new DateTimeZone( 'Asia/Dhaka' );
	$today = wp_date( 'Y-m-d', null, $tz );
	if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $from ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $to ) || $from > $to || $to > $today || $from < '2018-01-01' ) return new WP_Error( 'bad', 'তারিখ ঠিক নেই', array( 'status' => 400 ) );
	if ( ( strtotime( $to ) - strtotime( $from ) ) / DAY_IN_SECONDS > 400 ) return new WP_Error( 'bad', 'সর্বোচ্চ ৪০০ দিনের হিসাব একবারে দেখা যায়', array( 'status' => 400 ) );
	$key = 'pa_bmet_q_' . md5( $from . $to );
	$c = get_transient( $key );
	if ( false !== $c ) return $c;
	$n = (int) get_transient( 'pa_bmet_q_rate' );
	if ( $n >= 40 ) return new WP_Error( 'busy', 'অনেকে একসাথে দেখছেন — একটু পরে আবার চেষ্টা করুন', array( 'status' => 429 ) );
	set_transient( 'pa_bmet_q_rate', $n + 1, 600 );
	$all = pa_bmet_oep_range( $from, $to );
	if ( ! $all ) { usleep( 800000 ); $all = pa_bmet_oep_range( $from, $to ); }
	if ( ! $all ) return new WP_Error( 'oep', 'সরকারি সার্ভারে এখন সংযোগ পাওয়া যাচ্ছে না', array( 'status' => 502 ) );
	$fem = pa_bmet_oep_range( $from, $to, 2 );
	$cs = array();
	foreach ( (array) $all['data'] as $row ) if ( (int) $row['total_employee'] > 0 ) $cs[ $row['country_name'] ] = (int) $row['total_employee'];
	arsort( $cs );
	$c = array( 'from' => $from, 'to' => $to, 't' => (int) $all['totalEmployee'], 'f' => $fem ? (int) $fem['totalEmployee'] : null, 'c' => $cs, 'at' => time() );
	set_transient( $key, $c, $to >= $today ? 300 : DAY_IN_SECONDS );
	return $c;
}
function pa_bmet_oep_range( $from, $to, $gender = '' ) {
	$u = add_query_arg( array( 'draw' => 1, 'start' => 0, 'length' => 400, 'approval_date_from' => $from, 'approval_date_to' => $to ), 'https://www.oep.gov.bd/reports/country-clearance' );
	if ( $gender ) $u = add_query_arg( 'gender_id', $gender, $u );
	$r = wp_remote_get( $u, array( 'timeout' => 25, 'headers' => array( 'X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json', 'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36' ) ) );
	if ( is_wp_error( $r ) || 200 !== wp_remote_retrieve_response_code( $r ) ) return null;
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	return ( ! empty( $j['success'] ) && isset( $j['payload'] ) ) ? $j['payload'] : null;
}

/* ---------- Web Push (VAPID keys live only in this site's database) ---------- */
function pa_push_keys() {
	$k = get_option( 'pa_push_vapid' );
	if ( ! empty( $k['pem'] ) && ! empty( $k['pub'] ) ) return $k;
	if ( ! function_exists( 'openssl_pkey_new' ) ) return null;
	$res = openssl_pkey_new( array( 'curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC ) );
	if ( ! $res ) return null;
	openssl_pkey_export( $res, $pem );
	$d = openssl_pkey_get_details( $res );
	$raw = "\x04" . str_pad( $d['ec']['x'], 32, "\0", STR_PAD_LEFT ) . str_pad( $d['ec']['y'], 32, "\0", STR_PAD_LEFT );
	$k = array( 'pem' => $pem, 'pub' => rtrim( strtr( base64_encode( $raw ), '+/', '-_' ), '=' ) );
	update_option( 'pa_push_vapid', $k, false );
	return $k;
}
function pa_push_ok_endpoint( $e ) {
	$h = wp_parse_url( $e, PHP_URL_HOST );
	return is_string( $e ) && strlen( $e ) < 1000 && 0 === strpos( $e, 'https://' ) && $h && preg_match( '/(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com|googleapis\.com)$/', $h );
}
add_action( 'rest_api_init', function () {
	register_rest_route( 'pa/v1', '/bmet-query', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $r ) {
			do_action( 'litespeed_control_set_nocache', 'bmet query' );
			$c = pa_bmet_range( (string) $r->get_param( 'from' ), (string) $r->get_param( 'to' ) );
			if ( is_wp_error( $c ) ) return $c;
			$res = new WP_REST_Response( $c );
			$res->header( 'Cache-Control', 'no-store' );
			return $res;
		},
	) );
	register_rest_route( 'pa/v1', '/push-sub', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $r ) {
			$j = $r->get_json_params();
			$e = isset( $j['endpoint'] ) ? (string) $j['endpoint'] : '';
			if ( ! pa_push_ok_endpoint( $e ) ) return new WP_Error( 'bad', 'bad endpoint', array( 'status' => 400 ) );
			$subs = get_option( 'pa_push_subs', array() );
			$h = md5( $e );
			if ( ! empty( $j['remove'] ) ) { unset( $subs[ $h ] ); update_option( 'pa_push_subs', $subs, false ); return array( 'ok' => true ); }
			$p = isset( $j['keys']['p256dh'] ) ? preg_replace( '/[^A-Za-z0-9_\-=]/', '', $j['keys']['p256dh'] ) : '';
			$a = isset( $j['keys']['auth'] ) ? preg_replace( '/[^A-Za-z0-9_\-=]/', '', $j['keys']['auth'] ) : '';
			if ( strlen( $p ) < 40 || strlen( $p ) > 120 || strlen( $a ) < 10 || strlen( $a ) > 40 ) return new WP_Error( 'bad', 'bad keys', array( 'status' => 400 ) );
			if ( count( $subs ) >= 50000 && ! isset( $subs[ $h ] ) ) return new WP_Error( 'full', 'full', array( 'status' => 503 ) );
			$subs[ $h ] = array( 'endpoint' => $e, 'keys' => array( 'p256dh' => $p, 'auth' => $a ), 't' => time() );
			update_option( 'pa_push_subs', $subs, false );
			return array( 'ok' => true, 'n' => count( $subs ) );
		},
	) );
	/* For the AutoBlog job that sends the nightly notification (WordPress admin login required). */
	register_rest_route( 'pa/v1', '/push-admin', array(
		'methods'             => array( 'GET', 'POST' ),
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback'            => function ( WP_REST_Request $r ) {
			$subs = get_option( 'pa_push_subs', array() );
			if ( 'POST' === $r->get_method() ) {
				$j = $r->get_json_params();
				foreach ( (array) ( $j['remove'] ?? array() ) as $h ) unset( $subs[ $h ] );
				update_option( 'pa_push_subs', $subs, false );
				if ( ! empty( $j['sent'] ) && is_array( $j['sent'] ) ) update_option( 'pa_push_sent', array_merge( (array) get_option( 'pa_push_sent', array() ), array_map( 'sanitize_text_field', $j['sent'] ) ), false );
				return array( 'ok' => true, 'n' => count( $subs ) );
			}
			$k = pa_push_keys();
			return array( 'pem' => $k ? $k['pem'] : '', 'pub' => $k ? $k['pub'] : '', 'subs' => $subs, 'sent' => (array) get_option( 'pa_push_sent', array() ) );
		},
	) );
} );

/* ---------- PWA: manifest + service worker served from the site root ---------- */
add_action( 'init', function () {
	if ( empty( $_GET['pa_pwa'] ) ) return;
	$w = $_GET['pa_pwa'];
	if ( ! defined( 'DONOTCACHEPAGE' ) ) define( 'DONOTCACHEPAGE', true );
	do_action( 'litespeed_control_set_nocache', 'pwa' );
	if ( 'manifest' === $w ) {
		$i192 = get_site_icon_url( 192 ); $i512 = get_site_icon_url( 512 );
		$icons = array();
		if ( $i192 ) $icons[] = array( 'src' => $i192, 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any' );
		if ( $i512 ) { $icons[] = array( 'src' => $i512, 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any' ); $icons[] = array( 'src' => $i512, 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable' ); }
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		header( 'Cache-Control: public, max-age=3600' );
		echo wp_json_encode( array(
			'name' => 'বিএমইটি লাইভ — প্রবাসী ইনফো', 'short_name' => 'বিএমইটি লাইভ', 'lang' => 'bn', 'dir' => 'ltr',
			'description' => 'আজকের বিএমইটি রিপোর্ট লাইভ — দেশভিত্তিক বহির্গমন ছাড়পত্রের হিসাব, দৈনিক রিপোর্ট ও নোটিফিকেশন।',
			'id' => '/bmet-report/', 'start_url' => '/bmet-report/?src=pwa', 'scope' => '/', 'display' => 'standalone',
			'background_color' => '#061f4d', 'theme_color' => '#061f4d', 'icons' => $icons,
			'related_applications' => array( array( 'platform' => 'webapp', 'url' => home_url( '/?pa_pwa=manifest' ) ) ),
			'shortcuts' => array( array( 'name' => 'আজকের লাইভ', 'url' => '/bmet-report/#live' ), array( 'name' => 'রিপোর্ট কার্ড', 'url' => '/bmet-report/#card' ) ),
		), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		exit;
	}
	if ( 'sw' === $w ) {
		header( 'Content-Type: application/javascript; charset=utf-8' );
		header( 'Cache-Control: no-cache' );
		header( 'Service-Worker-Allowed: /' );
		$icon = get_site_icon_url( 192 ); ?>
/* প্রবাসী ইনফো — বিএমইটি লাইভ service worker: push notifications + offline copy of the BMET page only. */
var C='pa-bmet-v1', ICON=<?php echo wp_json_encode( $icon ?: '' ); ?>;
self.addEventListener('install',function(e){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==C&&k.indexOf('pa-bmet')===0}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));});
self.addEventListener('fetch',function(e){var r=e.request,u=new URL(r.url);
	if(r.method!=='GET'||u.origin!==location.origin||u.pathname.indexOf('/bmet-report')!==0||r.mode!=='navigate') return;
	e.respondWith(fetch(r).then(function(res){var cp=res.clone();caches.open(C).then(function(c){c.put('/bmet-report/',cp)});return res;}).catch(function(){return caches.match('/bmet-report/')}));});
self.addEventListener('push',function(e){var d={};try{d=e.data?e.data.json():{}}catch(x){d={body:e.data?e.data.text():''}}
	e.waitUntil(self.registration.showNotification(d.title||'আজকের বিএমইটি রিপোর্ট',{body:d.body||'',icon:d.icon||ICON,badge:ICON,image:d.image||undefined,tag:d.tag||'bmet-daily',renotify:true,lang:'bn',data:{url:d.url||'/bmet-report/'}}));});
self.addEventListener('notificationclick',function(e){e.notification.close();var u=(e.notification.data&&e.notification.data.url)||'/bmet-report/';
	e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(cs){for(var i=0;i<cs.length;i++){if(cs[i].url.indexOf(u)>=0&&'focus' in cs[i]) return cs[i].focus();} return clients.openWindow(u);}));});
<?php
		exit;
	}
}, 1 );

/* ---------- helpers ---------- */
function pb_bn( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); }
function pb_num( $n ) { return pb_bn( number_format( (int) round( $n ) ) ); }
function pb_months() { return array( 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর' ); }
function pb_bdate( $ymd ) {
	$p = explode( '-', (string) $ymd );
	return count( $p ) === 3 ? pb_bn( (int) $p[2] ) . ' ' . pb_months()[ (int) $p[1] - 1 ] . ' ' . pb_bn( $p[0] ) : (string) $ymd;
}
function pb_bmonth( $ym ) { $p = explode( '-', $ym ); return pb_months()[ (int) $p[1] - 1 ] . ' ' . pb_bn( $p[0] ); }
function pb_wday( $ymd ) { $w = array( 'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার' ); return $w[ (int) gmdate( 'w', strtotime( $ymd . ' 12:00:00 UTC' ) ) ]; }
function pb_clean( $c ) { return trim( preg_replace( '/\s*\(formerly[^)]*\)/i', '', str_replace( "\xc2\xa0", ' ', $c ) ) ); }
function pb_cmap() {
	return array(
		'Saudi Arabia' => array( 'সৌদি আরব', 'sa' ), 'Singapore' => array( 'সিঙ্গাপুর', 'sg' ), 'Qatar' => array( 'কাতার', 'qa' ), 'Maldives' => array( 'মালদ্বীপ', 'mv' ),
		'United Arab Emirates (UAE)' => array( 'আমিরাত', 'ae' ), 'Kuwait' => array( 'কুয়েত', 'kw' ), 'Jordan' => array( 'জর্ডান', 'jo' ), 'Italy' => array( 'ইতালি', 'it' ),
		'Portugal' => array( 'পর্তুগাল', 'pt' ), 'Laos' => array( 'লাওস', 'la' ), 'Belarus' => array( 'বেলারুশ', 'by' ), 'Lebanon' => array( 'লেবানন', 'lb' ),
		'Mauritius' => array( 'মরিশাস', 'mu' ), 'Fiji' => array( 'ফিজি', 'fj' ), 'Mongolia' => array( 'মঙ্গোলিয়া', 'mn' ), 'Vietnam' => array( 'ভিয়েতনাম', 'vn' ),
		'Greece' => array( 'গ্রিস', 'gr' ), 'Russian Federation' => array( 'রাশিয়া', 'ru' ), 'Cyprus' => array( 'সাইপ্রাস', 'cy' ), 'Serbia' => array( 'সার্বিয়া', 'rs' ),
		'Malaysia' => array( 'মালয়েশিয়া', 'my' ), 'North Macedonia' => array( 'উত্তর মেসিডোনিয়া', 'mk' ), 'Brunei' => array( 'ব্রুনাই', 'bn' ), 'Brunei Darussalam' => array( 'ব্রুনাই', 'bn' ),
		'Japan' => array( 'জাপান', 'jp' ), 'South Korea' => array( 'দক্ষিণ কোরিয়া', 'kr' ), 'Seychelles' => array( 'সেশেলস', 'sc' ), 'Moldova' => array( 'মলদোভা', 'md' ),
		'Congo' => array( 'কঙ্গো', 'cg' ), 'Malta' => array( 'মাল্টা', 'mt' ), 'Romania' => array( 'রোমানিয়া', 'ro' ), 'Iraq' => array( 'ইরাক', 'iq' ), 'Oman' => array( 'ওমান', 'om' ),
		'Algeria' => array( 'আলজেরিয়া', 'dz' ), 'Slovenia' => array( 'স্লোভেনিয়া', 'si' ), 'Hong Kong' => array( 'হংকং', 'hk' ), 'Sri Lanka' => array( 'শ্রীলঙ্কা', 'lk' ),
		'Bulgaria' => array( 'বুলগেরিয়া', 'bg' ), 'Hungary' => array( 'হাঙ্গেরি', 'hu' ), 'Azerbaijan' => array( 'আজারবাইজান', 'az' ), 'China' => array( 'চীন', 'cn' ),
		'Bosnia and Herzegovina' => array( 'বসনিয়া ও হার্জেগোভিনা', 'ba' ), 'Poland' => array( 'পোল্যান্ড', 'pl' ), 'Ivory Coast' => array( 'আইভরি কোস্ট', 'ci' ),
		'Somalia' => array( 'সোমালিয়া', 'so' ), 'Samoa' => array( 'সামোয়া', 'ws' ), 'Sudan' => array( 'সুদান', 'sd' ), 'Mozambique' => array( 'মোজাম্বিক', 'mz' ),
		'Cambodia' => array( 'কম্বোডিয়া', 'kh' ), 'Finland' => array( 'ফিনল্যান্ড', 'fi' ), 'New Zealand' => array( 'নিউজিল্যান্ড', 'nz' ), 'South Africa' => array( 'দক্ষিণ আফ্রিকা', 'za' ),
		'Brazil' => array( 'ব্রাজিল', 'br' ), 'Canada' => array( 'কানাডা', 'ca' ), 'Czechia' => array( 'চেকিয়া', 'cz' ), 'Micronesia' => array( 'মাইক্রোনেশিয়া', 'fm' ),
		'Ireland' => array( 'আয়ারল্যান্ড', 'ie' ), 'Equatorial Guinea' => array( 'বিষুবীয় গিনি', 'gq' ), 'Djibouti' => array( 'জিবুতি', 'dj' ), 'Libya' => array( 'লিবিয়া', 'ly' ),
		'South Sudan' => array( 'দক্ষিণ সুদান', 'ss' ), 'Slovakia' => array( 'স্লোভাকিয়া', 'sk' ), 'Tajikistan' => array( 'তাজিকিস্তান', 'tj' ), 'Sierra Leone' => array( 'সিয়েরা লিওন', 'sl' ),
		'United Kingdom (UK)' => array( 'যুক্তরাজ্য', 'gb' ), 'United Kingdom' => array( 'যুক্তরাজ্য', 'gb' ), 'Macau' => array( 'ম্যাকাও', 'mo' ), 'Ethiopia' => array( 'ইথিওপিয়া', 'et' ),
		'Germany' => array( 'জার্মানি', 'de' ), 'Tanzania' => array( 'তানজানিয়া', 'tz' ), 'Cameroon' => array( 'ক্যামেরুন', 'cm' ), 'France' => array( 'ফ্রান্স', 'fr' ),
		'Nigeria' => array( 'নাইজেরিয়া', 'ng' ), 'Madagascar' => array( 'মাদাগাস্কার', 'mg' ), 'Bahrain' => array( 'বাহরাইন', 'bh' ), 'Pakistan' => array( 'পাকিস্তান', 'pk' ),
		'Eswatini' => array( 'এসওয়াতিনি', 'sz' ), 'Armenia' => array( 'আর্মেনিয়া', 'am' ), 'Bahamas' => array( 'বাহামা', 'bs' ), 'Botswana' => array( 'বতসোয়ানা', 'bw' ),
		'Indonesia' => array( 'ইন্দোনেশিয়া', 'id' ), 'Andorra' => array( 'অ্যান্ডোরা', 'ad' ), 'Sweden' => array( 'সুইডেন', 'se' ), 'Zambia' => array( 'জাম্বিয়া', 'zm' ),
		'Guyana' => array( 'গায়ানা', 'gy' ), 'Montenegro' => array( 'মন্টেনিগ্রো', 'me' ), 'Austria' => array( 'অস্ট্রিয়া', 'at' ), 'Kenya' => array( 'কেনিয়া', 'ke' ),
		'Denmark' => array( 'ডেনমার্ক', 'dk' ), 'Yemen' => array( 'ইয়েমেন', 'ye' ), 'Kazakhstan' => array( 'কাজাখস্তান', 'kz' ), 'Spain' => array( 'স্পেন', 'es' ),
		'Australia' => array( 'অস্ট্রেলিয়া', 'au' ), 'Ecuador' => array( 'ইকুয়েডর', 'ec' ), 'Estonia' => array( 'এস্তোনিয়া', 'ee' ), 'Thailand' => array( 'থাইল্যান্ড', 'th' ),
		'Norway' => array( 'নরওয়ে', 'no' ), 'Croatia' => array( 'ক্রোয়েশিয়া', 'hr' ), 'Turkey' => array( 'তুরস্ক', 'tr' ), 'Albania' => array( 'আলবেনিয়া', 'al' ),
		'Egypt' => array( 'মিশর', 'eg' ), 'Georgia' => array( 'জর্জিয়া', 'ge' ), 'Lithuania' => array( 'লিথুয়ানিয়া', 'lt' ), 'Uzbekistan' => array( 'উজবেকিস্তান', 'uz' ),
		'United States of America' => array( 'যুক্তরাষ্ট্র', 'us' ), 'Netherlands' => array( 'নেদারল্যান্ডস', 'nl' ), 'Belgium' => array( 'বেলজিয়াম', 'be' ), 'Latvia' => array( 'লাটভিয়া', 'lv' ),
	);
}
function pb_cn( $c ) { $m = pb_cmap(); $k = pb_clean( $c ); return isset( $m[ $c ] ) ? $m[ $c ][0] : ( isset( $m[ $k ] ) ? $m[ $k ][0] : $k ); }
function pb_iso( $c ) { $m = pb_cmap(); $k = pb_clean( $c ); return isset( $m[ $c ] ) ? $m[ $c ][1] : ( isset( $m[ $k ] ) ? $m[ $k ][1] : '' ); }
function pb_flag( $c ) { $i = pb_iso( $c ); return $i ? '<img class="fl" src="https://flagcdn.com/w40/' . $i . '.png" alt="" width="22" height="16" loading="lazy">' : '<span class="fl fl0"></span>'; }
function pb_sum( $days, $keys ) {
	$t = 0; $f = 0; $cs = array();
	foreach ( $keys as $k ) { if ( empty( $days[ $k ] ) ) continue; $t += (int) $days[ $k ]['t']; $f += (int) $days[ $k ]['f']; foreach ( $days[ $k ]['c'] as $c => $n ) $cs[ $c ] = ( $cs[ $c ] ?? 0 ) + (int) $n; }
	arsort( $cs );
	return array( 't' => $t, 'f' => $f, 'c' => $cs );
}
function pb_pct( $a, $b ) {
	if ( ! $b || $a === $b ) return '';
	$p = (int) round( ( $a - $b ) * 100 / $b );
	return $p ? '<em class="' . ( $p > 0 ? 'up' : 'dn' ) . '">' . ( $p > 0 ? '▲' : '▼' ) . ' ' . pb_bn( abs( $p ) ) . '%</em>' : '';
}

/* Shared state for the page (built once per request). */
function pb_state() {
	static $S = null;
	if ( $S !== null ) return $S;
	$d = get_option( 'pa_bmet' );
	$days = ( ! empty( $d['days'] ) && is_array( $d['days'] ) ) ? $d['days'] : array();
	ksort( $days );
	$today = wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) );
	$keys  = array_values( array_filter( array_keys( $days ), function ( $k ) use ( $today ) { return $k < $today; } ) ); // completed days only
	$last  = $keys ? end( $keys ) : '';
	$live  = pa_bmet_live();
	return $S = compact( 'd', 'days', 'keys', 'today', 'last', 'live' );
}

/* ---------- SEO: dynamic title/description for Rank Math ---------- */
add_filter( 'rank_math/frontend/title', function ( $t ) {
	if ( ! is_page( 'bmet-report' ) ) return $t;
	$S = pb_state();
	return 'আজকের বিএমইটি রিপোর্ট ' . pb_bdate( $S['today'] ) . ' (লাইভ) — দেশভিত্তিক বহির্গমন ছাড়পত্রের হিসাব | প্রবাসী ইনফো';
} );
/* Link previews (Facebook / WhatsApp) show the latest report card. */
function pb_og_image() {
	static $u = null;
	if ( $u !== null ) return $u;
	$cat = get_category_by_slug( 'bmet-report-news' );
	$p = $cat ? get_posts( array( 'category' => $cat->term_id, 'numberposts' => 1 ) ) : array();
	return $u = ( $p && has_post_thumbnail( $p[0] ) ) ? (string) get_the_post_thumbnail_url( $p[0], 'full' ) : '';
}
add_filter( 'rank_math/opengraph/facebook/image', function ( $i ) { return ( is_page( 'bmet-report' ) && pb_og_image() ) ? pb_og_image() : $i; } );
add_filter( 'rank_math/opengraph/twitter/image', function ( $i ) { return ( is_page( 'bmet-report' ) && pb_og_image() ) ? pb_og_image() : $i; } );
add_filter( 'rank_math/frontend/description', function ( $t ) {
	if ( ! is_page( 'bmet-report' ) ) return $t;
	$S = pb_state();
	if ( ! $S['last'] ) return $t;
	$L = $S['days'][ $S['last'] ]; arsort( $L['c'] ); $top = array_slice( array_keys( $L['c'] ), 0, 3 );
	return 'আজকের বিএমইটি রিপোর্ট লাইভ: ' . pb_bdate( $S['last'] ) . ' তারিখে ' . pb_num( $L['t'] ) . ' জন কর্মী ' . pb_bn( count( $L['c'] ) ) . 'টি দেশে যাওয়ার বহির্গমন ছাড়পত্র পেয়েছেন; শীর্ষে ' . implode( ', ', array_map( 'pb_cn', $top ) ) . '। দৈনিক, সাপ্তাহিক, মাসিক ও দেশভিত্তিক হিসাব, চার্ট ও ডাউনলোডযোগ্য কার্ড — তথ্যসূত্র OEP।';
} );

/* ---------- the web app ---------- */
add_action( 'template_redirect', function () {
	if ( ! is_page( 'bmet-report' ) || is_feed() || is_preview() ) return;
	do_action( 'litespeed_control_set_ttl', 300 ); // the live count in the HTML stays fresh
	pb_render();
	exit;
}, 98 );

function pb_render() {
	$S = pb_state();
	$days = $S['days']; $keys = $S['keys']; $last = $S['last']; $live = $S['live']; $today = $S['today'];
	$src  = 'https://www.oep.gov.bd/reports/country-clearance';
	$url  = home_url( '/bmet-report/' );
	$logo = defined( 'PA_LOGO' ) ? PA_LOGO : '';
	$L = $last ? $days[ $last ] : array( 't' => 0, 'f' => 0, 'c' => array() );
	arsort( $L['c'] );
	$prevk = count( $keys ) > 1 ? $keys[ count( $keys ) - 2 ] : '';
	$w  = pb_sum( $days, array_slice( $keys, -7 ) );
	$pw = pb_sum( $days, array_slice( $keys, -14, 7 ) );
	$m0 = substr( $last, 0, 7 );
	$mk = array_values( array_filter( $keys, function ( $k ) use ( $m0 ) { return $m0 && strpos( $k, $m0 ) === 0; } ) );
	$mt = pb_sum( $days, $mk );
	$months = array();
	foreach ( $keys as $k ) { $mm = substr( $k, 0, 7 ); $months[ $mm ] = ( $months[ $mm ] ?? 0 ) + (int) $days[ $k ]['t']; }
	$mkeys = array_keys( $months );
	$m1 = count( $mkeys ) > 1 ? $mkeys[ count( $mkeys ) - 2 ] : '';
	$c30 = pb_sum( $days, array_slice( $keys, -30 ) )['c'];
	$art = function ( $slug ) { $p = get_posts( array( 'name' => $slug, 'post_type' => 'post', 'numberposts' => 1 ) ); return $p ? get_permalink( $p[0] ) : ''; };
	$last_url = $last ? $art( 'bmet-report-' . $last ) : '';
	$cat = get_category_by_slug( 'bmet-report-news' );
	$reports = $cat ? get_posts( array( 'category' => $cat->term_id, 'numberposts' => 9 ) ) : array();
	$lc = $live['c']; arsort( $lc );
	$yday = wp_date( 'Y-m-d', time() - DAY_IN_SECONDS, new DateTimeZone( 'Asia/Dhaka' ) );
	$sd = function ( $k ) { $p = explode( '-', $k ); return count( $p ) === 3 ? pb_bn( (int) $p[2] ) . ' ' . pb_months()[ (int) $p[1] - 1 ] : ''; };
	$lastlbl = ( $last === $yday ? 'গতকাল' : 'সর্বশেষ দিন' ) . ' (' . $sd( $last ) . ')';
	$faq = array(
		array( 'আজকের বিএমইটি রিপোর্ট কোথায় দেখব?', 'এই পাতার ওপরে আজকের সংখ্যা লাইভ দেখানো হয় — সরকারি ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (OEP) থেকে প্রতি ৫ মিনিটে নিজে থেকে হালনাগাদ হয়। দিনের শেষে, রাত ১২টার পর, পূর্ণ দিনের রিপোর্ট আলাদা লেখা হিসেবেও প্রকাশ হয়।' ),
		array( 'বিএমইটি বহির্গমন ছাড়পত্র বা স্মার্ট কার্ড কী?', 'কাজের জন্য বিদেশে যাওয়ার আগে জনশক্তি, কর্মসংস্থান ও প্রশিক্ষণ ব্যুরো (বিএমইটি) থেকে যে বহির্গমন ছাড়পত্র নিতে হয়, সেটিই স্মার্ট কার্ড আকারে দেওয়া হয়। এই রিপোর্টের সংখ্যা হলো নির্দিষ্ট দিনে কতজন কর্মী এই ছাড়পত্র পেয়েছেন।' ),
		array( 'এই সংখ্যা কি সেদিন বিদেশে চলে যাওয়া কর্মীর সংখ্যা?', 'না। এটি সেদিন বহির্গমন ছাড়পত্র পাওয়া কর্মীর সংখ্যা। ছাড়পত্র পাওয়ার পর কর্মী সাধারণত পরের কোনো দিন ফ্লাইটে যান, তাই এটিকে সেদিনের ফ্লাইটের যাত্রীসংখ্যা ভাববেন না।' ),
		array( 'তথ্য কখন হালনাগাদ হয়?', 'আজকের সংখ্যা দিনের মধ্যে প্রতি ৫ মিনিটে হালনাগাদ হয় এবং দিনের শেষ পর্যন্ত বাড়তে থাকে। রাত ১২টার পর আগের দিনের পূর্ণ হিসাব যুক্ত হয়, আর সকালে আবার মিলিয়ে দেখা হয় — দেরিতে আসা সরকারি এন্ট্রি থাকলে সংখ্যা সামান্য বদলাতে পারে।' ),
		array( 'নিজের স্মার্ট কার্ড বা ছাড়পত্র কীভাবে যাচাই করব?', 'ব্যক্তিগত ছাড়পত্র যাচাই করতে হয় সরকারি OEP/বিএমইটি পোর্টাল বা বিএমইটি অফিসে। প্রবাসী ইনফো কারও ব্যক্তিগত তথ্য দেখায় না বা সংগ্রহ করে না; এখানে শুধু দেশভিত্তিক মোট সংখ্যা দেখানো হয়।' ),
		array( 'সার্বিয়া, মলদোভা ও উত্তর মেসিডোনিয়ায় কতজন যাচ্ছেন দেখব কীভাবে?', 'এই পাতার "নজরে" অংশে তিন দেশের আজকের লাইভ সংখ্যা, গতকাল, শেষ ৭ ও ৩০ দিন আর চলতি মাসের হিসাব দেখানো হয়। দেশের নামে চাপলে দিনভিত্তিক চার্ট খুলবে, আর সংখ্যা সরকারি OEP সার্ভারের সাথে মিলিয়ে দেখানো হয়।' ),
		array( 'অ্যাপ হিসেবে ইনস্টল করে নোটিফিকেশন পাওয়া যাবে?', 'হ্যাঁ। "অ্যাপ ইনস্টল করুন" চাপলে ফোনের হোম স্ক্রিনে "বিএমইটি লাইভ" অ্যাপ যুক্ত হবে, আর "নোটিফিকেশন চালু করুন" চাপলে প্রতিদিন রাতে রিপোর্ট প্রকাশ হলেই নোটিফিকেশন পাবেন। আইফোনে আগে শেয়ার → Add to Home Screen করে অ্যাপটি খুলতে হয়।' ),
		array( 'রিপোর্ট কার্ড ডাউনলোড করে শেয়ার করা যাবে?', 'হ্যাঁ। "রিপোর্ট কার্ড" অংশ থেকে দৈনিক, সাপ্তাহিক, মাসিক বা যেকোনো তারিখের কার্ড JPEG হিসেবে নামিয়ে ফেসবুক, হোয়াটসঅ্যাপ বা ইনস্টাগ্রামে দিতে পারবেন। কার্ডে তারিখ, তৈরির সময় ও তথ্যসূত্র লেখা থাকে।' ),
	);
	$ld = array(
		'@context' => 'https://schema.org',
		'@graph'   => array(
			array( '@type' => 'Dataset', 'name' => 'বিএমইটি দৈনিক বহির্গমন ছাড়পত্র — দেশভিত্তিক', 'description' => 'বাংলাদেশ থেকে প্রতিদিন কতজন কর্মী কোন দেশে কাজের জন্য বহির্গমন ছাড়পত্র (স্মার্ট কার্ড) পেয়েছেন — দৈনিক, মাসিক ও দেশভিত্তিক হিসাব।',
				'url' => $url, 'isBasedOn' => $src, 'temporalCoverage' => ( $keys ? $keys[0] : $today ) . '/' . $today, 'inLanguage' => 'bn', 'isAccessibleForFree' => true,
				'creator' => array( '@type' => 'Organization', 'name' => 'প্রবাসী ইনফো', 'url' => home_url( '/' ) ), 'dateModified' => wp_date( 'c', $live['at'] ?? time() ) ),
			array( '@type' => 'BreadcrumbList', 'itemListElement' => array(
				array( '@type' => 'ListItem', 'position' => 1, 'name' => 'হোম', 'item' => home_url( '/' ) ),
				array( '@type' => 'ListItem', 'position' => 2, 'name' => 'বিএমইটি রিপোর্ট', 'item' => $url ) ) ),
			array( '@type' => 'FAQPage', 'mainEntity' => array_map( function ( $q ) { return array( '@type' => 'Question', 'name' => $q[0], 'acceptedAnswer' => array( '@type' => 'Answer', 'text' => $q[1] ) ); }, $faq ) ),
		),
	);
	?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#061f4d">
<link rel="manifest" href="<?php echo esc_url( home_url( '/?pa_pwa=manifest' ) ); ?>">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="বিএমইটি লাইভ"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<?php $ico = get_site_icon_url( 180 ); if ( $ico ) echo '<link rel="apple-touch-icon" href="' . esc_url( $ico ) . '">'; ?>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<?php wp_head(); ?>
<script type="application/ld+json"><?php echo wp_json_encode( $ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?></script>
<style id="bm-css">
:root{--nv:#061f4d;--nv2:#0a3f97;--b:#0b56c4;--g:#16a34a;--g2:#22c55e;--red:#e11d48;--ink:#0f1f38;--ink2:#34465f;--mut:#6a7a93;--line:#e2e8f1;--bg:#f2f5fb;--soft:#eef3fb;--hf:"Anek Bangla","Hind Siliguri",system-ui,sans-serif;--tf:"Hind Siliguri",system-ui,sans-serif;--sh:0 1px 2px rgba(10,40,90,.06),0 10px 30px -18px rgba(10,40,90,.35)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
html{scroll-behavior:smooth;scroll-padding-top:76px}
body.bm-app{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.65 var(--tf);-webkit-font-smoothing:antialiased;overflow-x:hidden}
.bm-app a{color:var(--b)}.w{max-width:1180px;margin:0 auto;padding:0 16px}
.bm-app h1,.bm-app h2,.bm-app h3{font-family:var(--hf);line-height:1.25;margin:0}
.ah{position:sticky;top:0;z-index:50;background:rgba(6,31,77,.94);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid rgba(255,255,255,.08)}
.ah .w{display:flex;align-items:center;gap:14px;height:62px}
.ah .lg{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;flex:none}
.ah .lg img{height:34px;width:auto;background:#fff;border-radius:8px;padding:3px 6px}
.ah .lg b{font:800 18px var(--hf);color:#fff}.ah .lg b i{font-style:normal;color:var(--g2)}
.ah nav{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0}.ah nav::-webkit-scrollbar{display:none}
.ah nav a{color:#cfe0ff;text-decoration:none;font:600 14.5px var(--tf);padding:7px 11px;border-radius:999px;white-space:nowrap}
.ah nav a:hover,.ah nav a.on{background:rgba(255,255,255,.12);color:#fff}
.ah .lv{display:inline-flex;align-items:center;gap:7px;background:var(--red);color:#fff;font:700 13.5px var(--tf);padding:6px 12px;border-radius:999px;text-decoration:none;flex:none}
.ah .home{color:#cfe0ff;text-decoration:none;font-size:14px;white-space:nowrap;flex:none}
.dot{width:9px;height:9px;border-radius:50%;background:#fff;animation:bmp 1.6s infinite;flex:none;display:inline-block}
@keyframes bmp{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7)}70%{box-shadow:0 0 0 10px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}
.dot.r{background:var(--red);animation-name:bmr}@keyframes bmr{0%{box-shadow:0 0 0 0 rgba(225,29,72,.6)}70%{box-shadow:0 0 0 10px rgba(225,29,72,0)}100%{box-shadow:0 0 0 0 rgba(225,29,72,0)}}
.hero{position:relative;overflow:hidden;color:#fff;background:radial-gradient(800px 380px at 88% -10%,rgba(34,197,94,.35),transparent 60%),radial-gradient(700px 400px at -10% 120%,rgba(96,165,250,.35),transparent 60%),linear-gradient(135deg,#061f4d,#0a3f97 60%,#0b56c4)}
.hero:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:44px 44px;-webkit-mask-image:linear-gradient(180deg,#000,transparent 85%);mask-image:linear-gradient(180deg,#000,transparent 85%);pointer-events:none}
.hero .w{position:relative;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px;padding-top:24px;padding-bottom:46px}
.crumb{font-size:13.5px;color:#a9c4f5}.crumb a{color:#d6e4fb!important;text-decoration:none}
.hero h1{font-size:clamp(30px,4.6vw,48px);font-weight:800;margin:8px 0 4px;color:#fff}
.hero .dt{color:#bcd3fb;font-size:16px;margin:0 0 16px}
.lbox{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:22px;padding:18px 20px}
.lbox .tg{display:inline-flex;align-items:center;gap:8px;background:var(--red);border-radius:999px;padding:4px 12px;font:700 13.5px var(--tf)}
.lbox .lbl{display:block;color:#d6e4fb;margin:10px 0 0;font-size:15px}
.big{font:800 clamp(58px,9vw,96px)/1 var(--hf);margin:6px 0 4px;display:flex;align-items:baseline;gap:10px}
.big small{font-size:.36em;color:var(--g2);font-weight:700}
.lbox .sub{color:#d6e4fb;font-size:15px}.lbox .sub b{color:#fff}
.lbox .at{display:block;color:#9fbbea;font-size:12.5px;margin-top:6px}
.ybox{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin-top:14px;background:#fff;color:var(--ink);border-radius:16px;padding:12px 16px}
.ybox b{font:800 22px var(--hf);color:var(--nv2)}.ybox a{font-weight:700;text-decoration:none;margin-left:auto}
.hb{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:12px;padding:11px 16px;font:700 15px var(--tf);cursor:pointer;text-decoration:none}
.btn-g{background:var(--g2);color:#053b1d!important}.btn-w{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25)}
.rc{display:grid;gap:14px;align-self:start}
.dis{position:fixed;right:14px;bottom:14px;z-index:66;width:min(290px,calc(100vw - 28px));background:rgba(8,32,80,.97);border:1px solid rgba(255,255,255,.22);border-left:5px solid #fbbf24;border-radius:16px;padding:9px 12px;color:#e6f0ff;box-shadow:0 14px 36px -12px rgba(0,0,0,.5);animation:disin .35s ease-out;opacity:.96}
@keyframes disin{from{opacity:0;transform:translateY(16px)}}
.dis-h{display:flex;align-items:center;justify-content:space-between;gap:8px}.dis-x{border:0;background:rgba(255,255,255,.14);color:#fff;width:24px;height:24px;font-size:12px!important;border-radius:50%;cursor:pointer;font-size:14px;flex:none}.dis-x:hover{background:rgba(255,255,255,.25)}
.dis-ic{position:fixed;right:14px;bottom:14px;z-index:66;width:40px;height:40px;border-radius:50%;border:0;background:#fbbf24;font-size:19px;cursor:pointer;box-shadow:0 10px 30px -6px rgba(0,0,0,.45);animation:disp 2.4s infinite}
@keyframes disp{0%{box-shadow:0 0 0 0 rgba(251,191,36,.6)}70%{box-shadow:0 0 0 12px rgba(251,191,36,0)}100%{box-shadow:0 0 0 0 rgba(251,191,36,0)}}
.dis[hidden],.dis-ic[hidden]{display:none!important}
@media(max-width:700px){.dis,.dis-ic{right:10px;bottom:calc(76px + env(safe-area-inset-bottom))}.dis{width:min(240px,calc(100vw - 20px))}}
.dis b{color:#fde68a;font-size:13px}.dis p{margin:3px 0 0;font-size:12px;line-height:1.5}.dis a{color:#fde68a!important;word-break:break-all}.dis strong{color:#fff}
.lp{background:#fff;color:var(--ink);border-radius:22px;padding:18px;box-shadow:0 30px 60px -30px rgba(0,0,0,.5)}
.lp h2{font-size:19px;display:flex;align-items:center;gap:10px;margin-bottom:8px}
.lrow{display:grid;grid-template-columns:24px minmax(0,1fr) 92px 52px;gap:10px;align-items:center;padding:7px 4px;border-bottom:1px dashed var(--line);font-size:15px;border-radius:8px}
.lrow:last-child{border-bottom:0}.lrow .t{height:9px;background:var(--soft);border-radius:5px;overflow:hidden}.lrow .t i{display:block;height:100%;background:linear-gradient(90deg,#60a5fa,var(--g2));border-radius:5px;transition:width .6s}
.lrow b{text-align:right;font-family:var(--hf)}.lrow.new{animation:bmf 1.4s 3}@keyframes bmf{50%{background:#dcfce7}}
.fl{width:22px;height:16px;border-radius:3px;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.08);display:inline-block;vertical-align:middle}.fl0{background:var(--soft)}
.feed{margin-top:12px;background:var(--soft);border-radius:14px;padding:10px 12px;font-size:14px;max-height:150px;overflow:auto}
.feed h3{font-size:14.5px;margin:0 0 6px}.feed p{margin:3px 0;color:var(--ink2)}.feed p b{color:var(--g)}
.empty{color:var(--mut);font-size:14.5px;padding:8px 0;margin:0}
.ks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:-24px 0 0;position:relative;z-index:2}
.k{background:#fff;border-radius:18px;padding:14px 16px;box-shadow:var(--sh);border:1px solid var(--line)}
.k span{display:block;color:var(--mut);font-size:13.5px}.k b{display:block;font:800 clamp(22px,3vw,30px)/1.25 var(--hf);color:var(--ink)}.k small{color:var(--mut);font-size:12.5px}
em.up,em.dn{font-style:normal;font-weight:700;font-size:13px;padding:1px 8px;border-radius:999px;white-space:nowrap}em.up{background:#dcfce7;color:#166534}em.dn{background:#fee2e2;color:#991b1b}
.sec{margin:38px 0 0}.sec>h2{font-size:clamp(22px,2.8vw,28px);margin:0 0 6px;color:var(--ink)}.sec>.lead{color:var(--ink2);margin:0 0 14px}
.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:var(--sh)}
.bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.bar button,.bar select,.bar input,.gb button,.gb input{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 12px;font:600 14.5px var(--tf);cursor:pointer;color:var(--ink);max-width:100%}
.bar button.on{background:var(--nv2);border-color:var(--nv2);color:#fff}.gb button.on{background:var(--nv);border-color:var(--nv);color:#fff}
.gsz{align-items:center;margin-top:-4px}.gsz span{font-size:14px;color:var(--mut);font-weight:600}.gsz button.on{background:var(--g)!important;border-color:var(--g)!important}
.kp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px}
.kp div{background:var(--soft);border-radius:14px;padding:12px}.kp span{display:block;font-size:13px;color:var(--mut)}.kp b{font:800 24px/1.2 var(--hf)}
.two{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px}
.two h3{font-size:17px;margin:0 0 10px}
.tr{display:flex;align-items:flex-end;gap:3px;height:220px;padding-top:6px;border-bottom:2px solid var(--line)}
.tr div{flex:1 1 0;min-width:2px;background:linear-gradient(180deg,var(--g2),var(--b));border-radius:4px 4px 0 0;cursor:pointer;transition:opacity .2s}
.tr div:hover,.tr div.on{opacity:.6}
.tip{font-size:13.5px;color:var(--ink2);min-height:22px;margin-top:6px}
.hb2{display:grid;gap:9px}.hb2 .r{display:grid;grid-template-columns:22px minmax(0,130px) 1fr 66px;gap:10px;align-items:center;font-size:15px}
.hb2 .t{height:12px;background:var(--soft);border-radius:6px;overflow:hidden}.hb2 .t i{display:block;height:100%;background:linear-gradient(90deg,var(--b),var(--g2));border-radius:6px;transition:width .5s}
.hb2 b{text-align:right;font-family:var(--hf)}.hb2 .r>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tw{max-height:560px;overflow:auto;border:1px solid var(--line);border-radius:14px;background:#fff}
.tbl{width:100%;border-collapse:collapse;font-size:15px}.tbl th,.tbl td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left}
.tbl th{font-size:13px;color:var(--mut);font-weight:600;background:var(--soft);position:sticky;top:0}
.tbl td.n,.tbl th.n{text-align:right}.tbl td.n{font-family:var(--hf);font-weight:700}.tbl tr:hover td{background:#f8fbff}
.tbl .pc{display:inline-block;height:6px;background:var(--g2);border-radius:3px;vertical-align:middle;margin-right:6px}
.mo{display:grid;gap:9px}.mo .r{display:grid;grid-template-columns:120px 1fr 90px;gap:10px;align-items:center}
.mo .t{height:26px;background:var(--soft);border-radius:8px;overflow:hidden}.mo .t i{display:block;height:100%;background:linear-gradient(90deg,var(--nv2),var(--g2));border-radius:8px}
.mo b{text-align:right;font-family:var(--hf)}
.gb{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.gw{display:grid;grid-template-columns:minmax(0,400px) minmax(0,1fr);gap:22px;align-items:start}
.gw canvas{width:100%;height:auto;border-radius:16px;box-shadow:0 20px 40px -20px rgba(8,42,99,.55);display:block}
.ga{display:grid;gap:10px}.ga button{border:0;border-radius:12px;padding:13px 14px;font:700 16px var(--tf);cursor:pointer}
.cap{background:var(--soft);border-radius:14px;padding:10px}.cap-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}.cap-h button{border:0;background:var(--nv2);color:#fff;border-radius:10px;padding:8px 12px;font:700 14px var(--tf);cursor:pointer}.cap-h button.ok{background:var(--g)}
.cap textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px;font:400 14px/1.6 var(--tf);color:var(--ink);background:#fff;resize:vertical}
.bdl{background:var(--g);color:#fff}.bsh{background:var(--b);color:#fff}.ga ul{margin:4px 0 0;padding-left:18px;color:var(--ink2);font-size:14.5px}
.rp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.rp a{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:16px;padding:10px;text-decoration:none;color:var(--ink);box-shadow:var(--sh)}
.rp img{width:96px;height:52px;object-fit:cover;border-radius:10px;flex:none;background:var(--soft)}.rp span{font:600 14.5px/1.45 var(--tf)}
.rp small{display:block;color:var(--mut);font-size:12.5px}
.faq details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:0 0 8px}
.faq summary{cursor:pointer;font:700 16.5px var(--hf);list-style:none;color:var(--ink)}.faq summary::-webkit-details-marker{display:none}.faq summary:after{content:"+";float:right;color:var(--b)}
.faq details[open] summary:after{content:"−"}.faq p{margin:8px 0 0;color:var(--ink2)}
.src{display:flex;gap:14px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-left:5px solid var(--g);border-radius:16px;padding:16px;margin:34px 0 0}
.src p{margin:0;font-size:14.5px;color:var(--ink2)}
.af{background:var(--nv);color:#bcd3fb;margin-top:44px;padding:30px 0 18px;font-size:14.5px}
.af .g{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:22px}.af h4{color:#fff;font:700 16px var(--hf);margin:0 0 8px}
.af a{color:#d6e4fb!important;text-decoration:none;display:block;margin:4px 0}.af a:hover{color:#fff!important}
.af .base{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;border-top:1px solid rgba(255,255,255,.1);margin-top:20px;padding-top:14px;font-size:13px}
.af img{height:38px;width:auto;background:#fff;border-radius:8px;padding:4px 8px}
.tabs{position:fixed;left:0;right:0;bottom:0;z-index:60;display:none;grid-template-columns:repeat(4,1fr);background:#fff;border-top:1px solid var(--line);padding:6px 6px calc(6px + env(safe-area-inset-bottom));box-shadow:0 -6px 20px rgba(10,40,90,.08)}
.tabs a{display:flex;flex-direction:column;align-items:center;gap:1px;font:600 12.5px var(--tf);color:var(--ink2)!important;text-decoration:none;padding:4px}.tabs a i{font-style:normal;font-size:18px}
.tabs a.hot{color:var(--red)!important}
@media(max-width:900px){.hero .w{grid-template-columns:minmax(0,1fr)}.ks{grid-template-columns:repeat(2,minmax(0,1fr))}.two,.gw,.rp,.af .g{grid-template-columns:minmax(0,1fr)}.kp{grid-template-columns:repeat(2,minmax(0,1fr))}.gw canvas{max-width:420px}}
@media(max-width:700px){body.bm-app{padding-bottom:70px}.ah .home,.ah nav{display:none}.ah .w{justify-content:space-between}.tabs{display:grid}.hb2 .r{grid-template-columns:22px minmax(0,100px) 1fr 54px;font-size:14px}.mo .r{grid-template-columns:96px 1fr 72px}.lrow{grid-template-columns:22px minmax(0,1fr) 60px 46px}.ybox a{margin-left:0}.tbl{font-size:14px}.tbl th,.tbl td{padding:8px 6px}}
.wl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.wc{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px;box-shadow:var(--sh);border-top:4px solid var(--b)}
.wc header{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.wc header .fl{width:30px;height:21px}.wc h3{font-size:18px;flex:1;min-width:0}
.wt{font-size:13px;font-weight:700;border-radius:999px;padding:3px 10px;background:var(--soft);color:var(--mut)}.wt.on{background:#dcfce7;color:#166534}
.wg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.wg div{background:var(--soft);border-radius:12px;padding:8px 10px}.wg span{display:block;font-size:12.5px;color:var(--mut)}.wg b{font:800 22px/1.2 var(--hf)}
.sp{display:flex;align-items:flex-end;gap:2px;height:46px;border-bottom:1px solid var(--line)}.sp i{flex:1;background:linear-gradient(180deg,var(--g2),var(--b));border-radius:2px 2px 0 0}.sp i.z{background:var(--line)}
.wl-l{font-size:13.5px;color:var(--ink2);margin:8px 0}.wb{border:0;background:var(--nv2);color:#fff;border-radius:10px;padding:9px 12px;font:700 14px var(--tf);cursor:pointer;width:100%}
.wq{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap}.wq b{color:#f59e0b}.wq button.on{background:#f59e0b!important;border-color:#f59e0b!important;color:#fff!important}
@media(max-width:900px){.wl{grid-template-columns:minmax(0,1fr)}}
.rg{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--soft);border-radius:12px;padding:4px 6px}.rg label{font-size:13.5px;color:var(--ink2);display:inline-flex;gap:4px;align-items:center}
.rg button{background:var(--g)!important;border-color:var(--g)!important;color:#fff!important}
.vfo{margin:-6px 0 12px;font-size:13px;color:var(--mut)}
.vf{font-size:14px;border-radius:12px;padding:8px 12px;margin:0 0 12px;background:var(--soft);color:var(--ink2)}.vf.ok{background:#dcfce7;color:#166534}.vf.warn{background:#fef9c3;color:#854d0e}.vf.err{background:#fee2e2;color:#991b1b}
.ptn{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:40px}
.pt{display:flex;gap:14px;align-items:center;border-radius:20px;padding:18px;text-decoration:none;color:#fff!important;box-shadow:0 20px 40px -24px rgba(8,42,99,.6);transition:transform .2s}
.pt:hover{transform:translateY(-2px)}.pt-d{background:linear-gradient(120deg,#7c2d12,#ea580c 55%,#f59e0b)}.pt-p{background:linear-gradient(120deg,#064e3b,#0b5d45 55%,#16a34a)}
.pt-i{font-size:34px;flex:none;width:58px;height:58px;display:grid;place-items:center;background:rgba(255,255,255,.16);border-radius:16px}
.pt small{display:block;font-size:12.5px;opacity:.85}.pt b{display:block;font:800 22px var(--hf)}.pt em{display:block;font-style:normal;font-size:14px;opacity:.92}
.pt-go{margin-left:auto;flex:none;background:#fff;color:var(--ink);border-radius:10px;padding:8px 12px;font-weight:700;font-size:14px}
.pt-d .pt-go{color:#9a3412}.pt-p .pt-go{color:#065f46}
.af a.dl{display:inline;color:#fbbf24!important;font-weight:700}
.pws{position:fixed;inset:auto 0 0 0;z-index:80;display:flex;justify-content:center;padding:12px;padding-bottom:calc(12px + env(safe-area-inset-bottom));background:linear-gradient(transparent,rgba(6,31,77,.35))}
.pws.pws-block{inset:0;align-items:center;background:rgba(6,31,77,.82);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.pws-in{width:min(440px,100%);background:#fff;color:var(--ink);border-radius:22px;padding:20px;box-shadow:0 30px 60px -20px rgba(0,0,0,.5);text-align:center;animation:disin .3s ease-out}
.pws-ic{font-size:40px;line-height:1}.pws-t{display:block;font:800 21px var(--hf);margin:6px 0}.pws p{margin:0 0 10px;font-size:14.5px;color:var(--ink2)}
.pws ol{text-align:left;margin:6px 0 12px;padding-left:22px;font-size:14.5px;color:var(--ink2)}
.pws-y,.pws-c,.pws-n{display:block;width:100%;border:0;border-radius:12px;padding:12px;font:700 16px var(--tf);cursor:pointer;margin-top:8px;text-decoration:none}
.pws-y{background:var(--g);color:#fff!important}.pws-c{background:var(--nv2);color:#fff}.pws-n{background:var(--soft);color:var(--ink2);font-weight:600;font-size:14.5px}
.shs{text-align:left}.shs .pws-t{text-align:center}.shs-p{white-space:pre-wrap;font:400 13.5px/1.55 var(--tf);background:var(--soft);border-radius:12px;padding:10px 12px;margin:8px 0 12px;max-height:190px;overflow:auto;color:var(--ink)}
.shs-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.shs-g button{border:1px solid var(--line);background:#fff;border-radius:12px;padding:11px 8px;font:700 14.5px var(--tf);cursor:pointer;color:var(--ink)}
.shs-g [data-a=img]{background:var(--g);border-color:var(--g);color:#fff}.shs-g [data-a=wa]{background:#25d366;border-color:#25d366;color:#053b1d}.shs-g [data-a=fb]{background:#1877f2;border-color:#1877f2;color:#fff}
.pwb{position:fixed;left:12px;right:12px;bottom:calc(80px + env(safe-area-inset-bottom));z-index:70;max-width:460px;margin:0 auto;background:#fff;color:var(--ink);border-radius:18px;padding:14px 16px;box-shadow:0 20px 50px -10px rgba(8,42,99,.45);border:1px solid var(--line);display:flex;gap:12px;align-items:center}
@media(min-width:701px){.pwb{right:auto;left:16px;bottom:16px;margin:0}}
.pwb b{display:block;font:800 16px var(--hf)}.pwb span{font-size:13.5px;color:var(--ink2)}.pwb button{border:0;border-radius:10px;padding:9px 12px;font:700 14px var(--tf);cursor:pointer}
.pwb .y{background:var(--g);color:#fff}.pwb .n{background:var(--soft);color:var(--ink2)}
@media(max-width:900px){.ptn{grid-template-columns:minmax(0,1fr)}.af .g{grid-template-columns:minmax(0,1fr)}}
@media(max-width:560px){.pt{flex-wrap:wrap}.pt-go{margin-left:72px}}
/* the bangla-web-fonts plugin forces SolaimanLipi with !important; win it back on this page */
html body.bm-app,html body.bm-app *{font-family:var(--tf)!important}
html body.bm-app h1,html body.bm-app h2,html body.bm-app h3,html body.bm-app h4,html body.bm-app .big,html body.bm-app .big *,html body.bm-app b,html body.bm-app summary,html body.bm-app td.n,html body.bm-app .lg b *{font-family:var(--hf)!important}
@media(prefers-reduced-motion:reduce){.dot,.lrow.new{animation:none}html{scroll-behavior:auto}}
/* iPhone / Safari: no automatic text inflation, long text wraps inside its box */
.lbox,.ybox,.lp,.k,.card,.wc,.dis,.kp div,.wg div,.m div,.src p,.sec>.lead,.ga ul{min-width:0;overflow-wrap:anywhere;word-break:normal}
.lrow>span,.hb2 .r>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar input[type=date],.gb input[type=date],.rg input[type=date]{-webkit-appearance:none;appearance:none;min-width:0;max-width:100%;min-height:40px;background:#fff}
.big{flex-wrap:wrap}.ybox>*{min-width:0}
@media(max-width:420px){.big{font-size:52px}.k b{font-size:21px}.kp b{font-size:20px}.wg b{font-size:19px}.lrow{grid-template-columns:22px minmax(0,1fr) 50px 42px;font-size:14px}.rg{width:100%}.rg label{flex:1 1 45%}.rg input{width:100%}.bar select,.bar button{font-size:14px;padding:8px 10px}}
</style>
</head>
<body <?php body_class( 'bm-app' ); ?>>
<?php wp_body_open(); ?>
<header class="ah"><div class="w">
	<a class="lg" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="প্রবাসী ইনফো — হোম"><?php if ( $logo ) echo '<img src="' . esc_url( $logo ) . '" alt="প্রবাসী ইনফো" width="120" height="34">'; ?><b>বিএমইটি <i>লাইভ</i></b></a>
	<nav aria-label="বিএমইটি রিপোর্ট"><a href="#live">আজ</a><a href="#watch">⭐ সার্বিয়া·মলদোভা·মেসিডোনিয়া</a><a href="#explore">হিসাব ও চার্ট</a><a href="#countries">দেশভিত্তিক</a><a href="#months">মাসিক</a><a href="#card">রিপোর্ট কার্ড</a><a href="#reports">দৈনিক রিপোর্ট</a><a href="#faq">প্রশ্নোত্তর</a></nav>
	<a class="lv" href="#live"><span class="dot"></span>লাইভ</a>
	<a class="home" href="<?php echo esc_url( home_url( '/' ) ); ?>">← প্রবাসী ইনফো</a>
</div></header>

<section class="hero" id="live"><div class="w">
	<div>
		<nav class="crumb" aria-label="ব্রেডক্রাম্ব"><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a> › বিএমইটি রিপোর্ট</nav>
		<h1>আজকের বিএমইটি রিপোর্ট</h1>
		<p class="dt"><?php echo esc_html( pb_wday( $today ) . ', ' . pb_bdate( $today ) ); ?> · দেশভিত্তিক বহির্গমন ছাড়পত্রের লাইভ হিসাব</p>
		<div class="lbox">
			<span class="tg"><span class="dot"></span>লাইভ · আজ <?php echo esc_html( pb_bdate( $today ) ); ?></span>
			<span class="lbl">আজ এখন পর্যন্ত বহির্গমন ছাড়পত্র (স্মার্ট কার্ড)</span>
			<div class="big"><span id="lv-t" data-v="<?php echo (int) $live['t']; ?>"><?php echo pb_num( $live['t'] ); ?></span><small>জন</small></div>
			<div class="sub"><b id="lv-c"><?php echo pb_bn( count( $live['c'] ) ); ?></b>টি দেশ · নারী <b id="lv-f"><?php echo pb_num( $live['f'] ); ?></b> জন</div>
			<span class="at" id="lv-at">সর্বশেষ চেক: <?php echo esc_html( pb_bn( wp_date( 'H:i', $live['at'], new DateTimeZone( 'Asia/Dhaka' ) ) ) ); ?> · প্রতি ৫ মিনিটে নিজে হালনাগাদ হয় · দিনের শেষ পর্যন্ত সংখ্যা বাড়তে থাকে</span>
		</div>
		<?php if ( $last ) : ?>
		<div class="ybox"><span><?php echo esc_html( ( $last === $yday ? 'গতকাল, ' : '' ) . pb_bdate( $last ) ); ?> (পূর্ণ দিন)</span><b><?php echo pb_num( $L['t'] ); ?> জন</b><span><?php echo pb_bn( count( $L['c'] ) ); ?>টি দেশ · নারী <?php echo pb_num( $L['f'] ); ?></span><?php echo $prevk ? pb_pct( (int) $L['t'], (int) $days[ $prevk ]['t'] ) : ''; ?><?php if ( $last_url ) echo '<a href="' . esc_url( $last_url ) . '">পুরো রিপোর্ট →</a>'; ?></div>
		<?php endif; ?>
		<div class="hb"><a class="btn btn-g" href="#card">📸 রিপোর্ট কার্ড ডাউনলোড</a><button type="button" class="btn btn-w" id="bm-share">📤 শেয়ার করুন</button><button type="button" class="btn btn-w" id="pw-notify" hidden>🔔 রিপোর্ট নোটিফিকেশন চালু করুন</button><button type="button" class="btn btn-w" id="pw-install" hidden>📲 অ্যাপ ইনস্টল করুন</button></div>
	</div>
	<div class="rc"><aside class="lp" aria-labelledby="lp-h">
		<h2 id="lp-h"><span class="dot r"></span>আজ কোন দেশে কতজন</h2>
		<div id="lv-list"><?php
		if ( $lc ) { $mx = max( $lc ); foreach ( array_slice( $lc, 0, 8, true ) as $c => $n ) echo '<div class="lrow">' . pb_flag( $c ) . '<span>' . esc_html( pb_cn( $c ) ) . '</span><span class="t"><i style="width:' . round( $n * 100 / $mx ) . '%"></i></span><b>' . pb_num( $n ) . '</b></div>'; }
		else echo '<p class="empty">আজকের এন্ট্রি এখনো সরকারি পোর্টালে আসেনি। এলেই এখানে নিজে থেকে দেখা যাবে।</p>';
		?></div>
		<div class="feed" id="lv-feed"><h3>🆕 নতুন যুক্ত হচ্ছে</h3><p id="lv-feed0">পাতাটি খোলা থাকলে নতুন এন্ট্রি এলেই এখানে দেখাবে — কোন দেশে কতজন।</p></div>
	</aside>
		<div class="dis" id="bm-dis" role="note"><div class="dis-h"><b>⚠️ দায়মুক্তি</b><button type="button" class="dis-x" id="bm-disx" aria-label="দায়মুক্তি লুকান">✕</button></div><p>এই পাতার সব সংখ্যা সরকারি ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (OEP) — <a href="https://www.oep.gov.bd/reports/country-clearance" target="_blank" rel="noopener nofollow">oep.gov.bd/reports/country-clearance</a> — থেকে হুবহু দেখানো হচ্ছে। <strong>আমরা নিজেরা কোনো তথ্য প্রদান করি না।</strong> যেকোনো সিদ্ধান্তের আগে মূল সরকারি সূত্রে ডাবল চেক করে যাচাই করার অনুরোধ রইল।</p></div><button type="button" class="dis-ic" id="bm-disic" aria-label="দায়মুক্তি দেখুন" title="দায়মুক্তি" hidden>⚠️</button></div>
</div></section>

<div class="w"><div class="ks">
	<div class="k"><span><?php echo esc_html( $lastlbl ); ?></span><b><?php echo pb_num( $L['t'] ); ?></b><small>পূর্ণ দিনের হিসাব</small></div>
	<div class="k"><span>শেষ ৭ দিনে</span><b><?php echo pb_num( $w['t'] ); ?></b><small>আগের ৭ দিনের চেয়ে <?php echo pb_pct( $w['t'], $pw['t'] ) ?: '—'; ?></small></div>
	<div class="k"><span><?php echo $m0 ? esc_html( pb_bmonth( $m0 ) ) : 'এই মাস'; ?> (এখন পর্যন্ত)</span><b><?php echo pb_num( $mt['t'] ); ?></b><small><?php echo pb_bn( count( $mk ) ); ?> দিনের হিসাব</small></div>
	<div class="k"><span><?php echo $m1 ? esc_html( pb_bmonth( $m1 ) ) : 'গত মাস'; ?></span><b><?php echo $m1 ? pb_num( $months[ $m1 ] ) : '—'; ?></b><small>পূর্ণ মাস</small></div>
</div></div>

<main class="w" id="main">
	<?php
	/* Europe watch-list: Serbia, Moldova, North Macedonia — per-country running numbers. */
	$watch = array( 'Serbia', 'Moldova', 'North Macedonia' );
	$wsum = function ( $c, $ks ) use ( $days ) { $n = 0; foreach ( $ks as $k ) { if ( empty( $days[ $k ] ) ) continue; foreach ( $days[ $k ]['c'] as $cc => $v ) if ( pb_clean( $cc ) === $c ) $n += (int) $v; } return $n; };
	$k30 = array_slice( $keys, -30 ); $k7 = array_slice( $keys, -7 );
	?>
	<section class="sec" id="watch">
		<h2>⭐ নজরে: সার্বিয়া, মলদোভা ও উত্তর মেসিডোনিয়া</h2>
		<p class="lead">ইউরোপের এই তিন দেশে প্রতিদিন কতজন বাংলাদেশি কর্মী বিএমইটি ছাড়পত্র পাচ্ছেন — আজ লাইভ, গতকাল, ৭ দিন, ৩০ দিন ও এই মাসের হিসাব। কোনো দিনে ছাড়পত্র না হলে সেটাও এখানে দেখা যাবে।</p>
		<div class="wl">
		<?php foreach ( $watch as $wc ) {
			$today_n = 0; foreach ( $live['c'] as $cc => $v ) if ( pb_clean( $cc ) === $wc ) $today_n += (int) $v;
			$yn = $last ? $wsum( $wc, array( $last ) ) : 0;
			$series = array(); foreach ( $k30 as $k ) $series[ $k ] = $wsum( $wc, array( $k ) );
			$lastd = ''; $lastn = 0; for ( $i = count( $keys ) - 1; $i >= 0; $i-- ) { $v = $wsum( $wc, array( $keys[ $i ] ) ); if ( $v ) { $lastd = $keys[ $i ]; $lastn = $v; break; } }
			$all = $wsum( $wc, $keys ); $smx = max( 1, max( $series ?: array( 0 ) ) );
			$raw = ''; foreach ( $days as $dk ) foreach ( $dk['c'] as $cc => $v ) if ( pb_clean( $cc ) === $wc ) { $raw = $cc; break 2; }
			?>
			<article class="wc">
				<header><?php echo pb_flag( $wc ); ?><h3><?php echo esc_html( pb_cn( $wc ) ); ?> বিএমইটি রিপোর্ট</h3><span class="wt <?php echo $today_n ? 'on' : ''; ?>"><?php echo $today_n ? '🟢 আজ ' . pb_num( $today_n ) . ' জন' : 'আজ এখনো নেই'; ?></span></header>
				<div class="wg">
					<div><span><?php echo esc_html( $lastlbl ); ?></span><b><?php echo pb_num( $yn ); ?></b></div>
					<div><span>শেষ ৭ দিন</span><b><?php echo pb_num( $wsum( $wc, $k7 ) ); ?></b></div>
					<div><span>শেষ ৩০ দিন</span><b><?php echo pb_num( $wsum( $wc, $k30 ) ); ?></b></div>
					<div><span><?php echo esc_html( $m0 ? pb_bmonth( $m0 ) : 'এই মাস' ); ?></span><b><?php echo pb_num( $wsum( $wc, $mk ) ); ?></b></div>
				</div>
				<div class="sp" aria-label="শেষ ৩০ দিনের দৈনিক হিসাব"><?php foreach ( $series as $k => $v ) echo '<i style="height:' . ( $v ? max( 8, round( $v * 100 / $smx ) ) : 3 ) . '%"' . ( $v ? '' : ' class="z"' ) . ' title="' . esc_attr( pb_bdate( $k ) . ': ' . pb_num( $v ) . ' জন' ) . '"></i>'; ?></div>
				<p class="wl-l"><?php echo $lastd ? 'সর্বশেষ ছাড়পত্র: <b>' . esc_html( pb_bdate( $lastd ) ) . '</b> — ' . pb_num( $lastn ) . ' জন' : 'সংরক্ষিত সময়ে কোনো ছাড়পত্র হয়নি'; ?> · মোট <?php echo pb_num( $all ); ?> জন (<?php echo $keys ? esc_html( pb_bdate( $keys[0] ) ) : ''; ?> থেকে)</p>
				<?php if ( $raw ) : ?><button type="button" class="wb" data-c="<?php echo esc_attr( $raw ); ?>">📊 দিনভিত্তিক চার্ট ও যাচাই →</button><?php endif; ?>
			</article>
		<?php } ?>
		</div>
	</section>
	<section class="sec" id="explore">
		<h2>সময় ও দেশ বেছে নিয়ে হিসাব দেখুন</h2>
		<p class="lead">দিন, সপ্তাহ, মাস, নির্দিষ্ট তারিখ বা দেশ বাছুন — চার্ট ও তালিকা সঙ্গে সঙ্গে বদলে যাবে।</p>
		<div class="card">
			<div class="bar" role="group" aria-label="সময়">
				<button type="button" data-r="today" id="bm-today">🔴 আজ (<?php echo esc_html( $sd( $today ) ); ?> · এখন পর্যন্ত <span id="bm-tnow"><?php echo esc_html( pb_bn( wp_date( 'H:i', $live['at'], new DateTimeZone( 'Asia/Dhaka' ) ) ) ); ?></span>)</button><button type="button" data-r="1"><?php echo esc_html( $lastlbl ); ?></button><button type="button" data-r="7">৭ দিন</button><button type="button" data-r="30" class="on">৩০ দিন</button><button type="button" data-r="m0">এই মাস</button><button type="button" data-r="m1">গত মাস</button><button type="button" data-r="all">সব</button>
				<select id="bm-month" aria-label="মাস"></select>
				<input type="date" id="bm-day" aria-label="নির্দিষ্ট তারিখ">
				<span class="rg"><label>থেকে <input type="date" id="bm-from"></label><label>পর্যন্ত <input type="date" id="bm-to"></label><button type="button" id="bm-go">🔎 দেখুন</button></span>
				<select id="bm-country" aria-label="দেশ"><option value="">সব দেশ</option></select>
				<span class="wq" role="group" aria-label="নজরের দেশ"><b>⭐</b><button type="button" data-wc="Serbia">সার্বিয়া</button><button type="button" data-wc="Moldova">মলদোভা</button><button type="button" data-wc="North Macedonia">উত্তর মেসিডোনিয়া</button></span>
			</div>
			<div class="vf" id="bm-vf" aria-live="polite">সরকারি সার্ভারে যাচাই হচ্ছে…</div>
			<p class="vfo">নিজে মিলিয়ে দেখতে চাইলে: <a href="https://www.oep.gov.bd/reports/country-clearance" target="_blank" rel="noopener nofollow">OEP কান্ট্রি ক্লিয়ারেন্স রিপোর্ট খুলুন ↗</a> — একই তারিখ দিয়ে filter করলে একই সংখ্যা পাবেন।</p>
			<div class="kp"><div><span>মোট ছাড়পত্র</span><b id="k-t">—</b></div><div><span>নারী কর্মী</span><b id="k-f">—</b></div><div><span id="k-cl">গন্তব্য দেশ</span><b id="k-c">—</b></div><div><span>দৈনিক গড়</span><b id="k-a">—</b></div></div>
			<div class="two">
				<div><h3 id="bm-ttitle">দৈনিক প্রবণতা</h3><div class="tr" id="bm-trend" aria-label="দৈনিক চার্ট"></div><div class="tip" id="bm-tip"></div></div>
				<div><h3>শীর্ষ দেশ</h3><div class="hb2" id="bm-top"></div></div>
			</div>
		</div>
	</section>

	<?php if ( $last ) : ?>
	<section class="sec" id="countries">
		<h2>দেশভিত্তিক পূর্ণ তালিকা — <?php echo esc_html( pb_bdate( $last ) ); ?></h2>
		<p class="lead"><?php echo esc_html( pb_bdate( $last ) ); ?> তারিখে <?php echo pb_num( $L['t'] ); ?> জন কর্মী <?php echo pb_bn( count( $L['c'] ) ); ?>টি দেশে কাজের জন্য বহির্গমন ছাড়পত্র পেয়েছেন। পাশে শেষ ৩০ দিনের মোট হিসাবও দেওয়া হলো।</p>
		<div class="tw"><table class="tbl"><thead><tr><th>ক্রম</th><th>দেশ</th><th class="n">কর্মী</th><th>শতাংশ</th><th class="n">শেষ ৩০ দিন</th></tr></thead><tbody>
		<?php $i = 0; foreach ( $L['c'] as $c => $n ) { $i++; $p = $L['t'] ? $n * 100 / $L['t'] : 0; echo '<tr><td>' . pb_bn( $i ) . '</td><td>' . pb_flag( $c ) . ' ' . esc_html( pb_cn( $c ) ) . '</td><td class="n">' . pb_num( $n ) . '</td><td><span class="pc" style="width:' . max( 2, round( $p * 1.2 ) ) . 'px"></span>' . pb_bn( number_format( $p, 1 ) ) . '%</td><td class="n">' . pb_num( $c30[ $c ] ?? 0 ) . '</td></tr>'; } ?>
		</tbody></table></div>
	</section>
	<?php endif; ?>

	<section class="sec" id="months">
		<h2>মাসভিত্তিক বিএমইটি রিপোর্ট</h2>
		<p class="lead">প্রতি মাসে কতজন কর্মী বহির্গমন ছাড়পত্র পেয়েছেন (চলতি মাস এখন পর্যন্ত)।</p>
		<div class="card mo"><?php $mm = $months ? max( $months ) : 1; foreach ( array_reverse( $months, true ) as $m => $n ) echo '<div class="r"><span>' . esc_html( pb_bmonth( $m ) ) . '</span><span class="t"><i style="width:' . round( $n * 100 / $mm ) . '%"></i></span><b>' . pb_num( $n ) . '</b></div>'; ?></div>
	</section>

	<section class="sec" id="card">
		<h2>📸 রিপোর্ট কার্ড তৈরি করুন</h2>
		<p class="lead">দৈনিক, সাপ্তাহিক, মাসিক বা যেকোনো তারিখের কার্ড বানিয়ে JPEG ডাউনলোড করুন — ফেসবুক, হোয়াটসঅ্যাপ, ইনস্টাগ্রামে সরাসরি পোস্ট করুন।</p>
		<div class="card">
			<div class="gb" role="group" aria-label="কার্ডের ধরন"><button type="button" data-k="live"<?php echo $live['t'] ? '' : ' hidden'; ?>>🔴 আজ (<?php echo esc_html( $sd( $today ) ); ?> · লাইভ)</button><button type="button" data-k="day" class="on"><?php echo esc_html( $lastlbl ); ?></button><button type="button" data-k="week">সাপ্তাহিক (শেষ ৭ দিন)</button><button type="button" data-k="month">মাসিক (<?php echo esc_html( $m0 ? pb_bmonth( $m0 ) : '' ); ?>)</button><button type="button" data-k="cur">ওপরের ফিল্টার</button><input type="date" id="bm-cdate" aria-label="যেকোনো তারিখের কার্ড"></div>
			<div class="gb gsz" role="group" aria-label="কার্ডের আকার"><span>আকার:</span><button type="button" data-sz="full" class="on">📄 পূর্ণ (সব দেশ)</button><button type="button" data-sz="sq">◻️ বর্গ ১০৮০×১০৮০ (ফেসবুক/ইনস্টাগ্রাম)</button></div>
			<div class="gw"><canvas id="bm-cv" width="1080" height="1350" aria-label="বিএমইটি রিপোর্ট কার্ড"></canvas>
			<div class="ga"><button type="button" class="bdl" id="bm-dl">⬇ JPEG ডাউনলোড করুন</button><button type="button" class="bsh" id="bm-sh">📤 ফেসবুক / হোয়াটসঅ্যাপে শেয়ার</button>
				<div class="cap"><div class="cap-h"><b>📝 পোস্টের ক্যাপশন</b><button type="button" id="bm-copy">📋 ক্যাপশন কপি করুন</button></div><textarea id="bm-cap" rows="9" readonly aria-label="রিপোর্টের ক্যাপশন"></textarea></div>
				<ul><li>কার্ডে রিপোর্টের তারিখ ও তৈরির সময় থাকে</li><li>তথ্যসূত্র: বিএমইটি / OEP (oep.gov.bd) লেখা থাকে</li><li>নিচে আমাদের লাইভ রিপোর্টের লিংক থাকে</li><li>ক্যালেন্ডার থেকে যেকোনো তারিখ বাছলে সেই দিনের কার্ড হবে</li></ul></div></div>
		</div>
	</section>

	<?php if ( $reports ) : ?>
	<section class="sec" id="reports">
		<h2>সর্বশেষ বিএমইটি রিপোর্ট</h2>
		<p class="lead">প্রতিদিন রাত ১২টার পর আগের দিনের পূর্ণ রিপোর্ট, প্রতি শনিবার সাপ্তাহিক আর মাসের ১ তারিখে মাসিক রিপোর্ট প্রকাশ হয়।</p>
		<div class="rp"><?php foreach ( $reports as $p ) { $th = get_the_post_thumbnail_url( $p, 'medium' ); echo '<a href="' . esc_url( get_permalink( $p ) ) . '">' . ( $th ? '<img src="' . esc_url( $th ) . '" alt="" loading="lazy" width="96" height="52">' : '' ) . '<span>' . esc_html( get_the_title( $p ) ) . '<small>' . esc_html( pb_bdate( get_the_date( 'Y-m-d', $p ) ) ) . '</small></span></a>'; } ?></div>
	</section>
	<?php endif; ?>

	<section class="sec faq" id="faq">
		<h2>প্রশ্নোত্তর</h2>
		<?php foreach ( $faq as $k => $q ) echo '<details' . ( $k === 0 ? ' open' : '' ) . '><summary>' . esc_html( $q[0] ) . '</summary><p>' . esc_html( $q[1] ) . '</p></details>'; ?>
	</section>

	<div class="src"><span style="font-size:26px" aria-hidden="true">🏛️</span><p><b>তথ্যসূত্র ও দায়মুক্তি:</b> আমরা নিজেরা কোনো তথ্য প্রদান করি না — সব তথ্য বাংলাদেশ সরকারের ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (OEP) — <a href="<?php echo esc_url( $src ); ?>" target="_blank" rel="noopener nofollow">oep.gov.bd কান্ট্রি ক্লিয়ারেন্স রিপোর্ট</a>। সংখ্যাগুলো সরকারি পোর্টাল থেকে হুবহু নেওয়া — কোনো অনুমান বা পরিবর্তন নয়। আজকের লাইভ সংখ্যা দিনের মধ্যে বাড়তে থাকে; রাত ১২টার পর আগের দিনের পূর্ণ হিসাব যুক্ত হয় এবং দেরিতে আসা সরকারি এন্ট্রি অনুযায়ী পরে সামান্য সংশোধন হতে পারে। প্রবাসী ইনফো একটি স্বাধীন তথ্যসেবা; বিএমইটি বা কোনো সরকারি প্রতিষ্ঠানের অংশ নয়।</p></div>
</main>

<section class="w ptn" aria-label="সহযোগী">
	<a class="pt pt-d" href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=bmet" target="_blank" rel="noopener sponsored"><span class="pt-i">✈️</span><span><small>সার্বিক সহযোগিতায়</small><b>ড্রিম ইন্টারন্যাশনাল</b><em>ইউরোপ ও গালফে বৈধ পথে কাজের ভিসা — প্রসেস, কাগজপত্র ও পরামর্শ</em></span><span class="pt-go">dreamintcs.com →</span></a>
	<a class="pt pt-p" href="https://www.probashibondu.online/?utm_source=probashiinfo&amp;utm_medium=bmet" target="_blank" rel="noopener"><span class="pt-i">🌍</span><span><small>প্রবাসীদের নিজের অ্যাপ</small><b>প্রবাসী বন্ধু</b><em>প্রবাস দিনের কার্ড, দেশ গাইড ও প্রবাসী গল্প — একদম ফ্রি</em></span><span class="pt-go">probashibondu.online →</span></a>
</section>
<footer class="af"><div class="w">
	<div class="g">
		<div><?php if ( $logo ) echo '<img src="' . esc_url( $logo ) . '" alt="প্রবাসী ইনফো" width="140" height="38" loading="lazy">'; ?><p>বিএমইটি লাইভ রিপোর্ট — বাংলাদেশ থেকে প্রতিদিন কতজন কর্মী কোন দেশে যাওয়ার ছাড়পত্র পাচ্ছেন, সরকারি তথ্য থেকে সহজ বাংলায়।</p></div>
		<div><h4>এই রিপোর্টে</h4><a href="#live">আজকের লাইভ সংখ্যা</a><a href="#explore">দৈনিক ও সাপ্তাহিক হিসাব</a><a href="#countries">দেশভিত্তিক তালিকা</a><a href="#months">মাসিক রিপোর্ট</a><a href="#card">রিপোর্ট কার্ড ডাউনলোড</a></div>
		<div><h4>সহযোগী</h4><a href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=bmet-footer" target="_blank" rel="noopener sponsored">✈️ ড্রিম ইন্টারন্যাশনাল</a><a href="https://www.probashibondu.online/?utm_source=probashiinfo&amp;utm_medium=bmet-footer" target="_blank" rel="noopener">🌍 প্রবাসী বন্ধু</a><a href="https://www.probashibondu.online/guide?utm_source=probashiinfo&amp;utm_medium=bmet-footer" target="_blank" rel="noopener">দেশ গাইড</a></div>
		<div><h4>প্রবাসী ইনফো</h4><a href="<?php echo esc_url( home_url( '/' ) ); ?>">হোম</a><?php if ( $cat ) echo '<a href="' . esc_url( get_category_link( $cat ) ) . '">সব বিএমইটি রিপোর্ট</a>'; ?><a href="<?php echo esc_url( home_url( '/#dash' ) ); ?>">আজকের রেট</a><a href="https://www.probashibondu.online/?utm_source=probashiinfo&utm_medium=bmet" target="_blank" rel="noopener">প্রবাসী বন্ধু</a></div>
	</div>
	<div class="base"><span>© <?php echo pb_bn( wp_date( 'Y' ) ); ?> প্রবাসী ইনফো · স্বাধীন তথ্যসেবা, সরকারি ওয়েবসাইট নয়</span><span>সার্বিক সহযোগিতায় <a class="dl" href="https://dreamintcs.com/?utm_source=probashiinfo&amp;utm_medium=bmet-footer" target="_blank" rel="noopener sponsored">ড্রিম ইন্টারন্যাশনাল</a> · <a class="dl" href="https://www.probashibondu.online/?utm_source=probashiinfo&amp;utm_medium=bmet-footer" target="_blank" rel="noopener">প্রবাসী বন্ধু</a></span></div>
</div></footer>
<nav class="tabs" aria-label="দ্রুত মেনু"><a href="#live" class="hot"><i>🔴</i>লাইভ</a><a href="#explore"><i>📊</i>হিসাব</a><a href="#card"><i>📸</i>কার্ড</a><a href="<?php echo esc_url( home_url( '/' ) ); ?>"><i>🏠</i>হোম</a></nav>

<script id="bm-data" type="application/json"><?php echo wp_json_encode( array( 'days' => array_intersect_key( $days, array_flip( $keys ) ), 'live' => $live, 'cmap' => pb_cmap() ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?></script>
<script>
/*@CARD*/
/* Height of the "full" card (1080 wide): tall enough that every country is listed at full size. */
function bmCardH(o) { var rest = Math.max(0, (o.rows || []).length - 7); return Math.max(1350, 878 + (rest ? 44 + Math.ceil(rest / 3) * 46 + 10 + 14 : 0) + 140); }
function bmCard(cv, o) {
	var W = cv.width, H = cv.height, x = cv.getContext('2d'), wide = W > H;
	var bn = function (s) { return String(s).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
	var num = function (n) { return bn(Math.round(n).toLocaleString('en-IN')); };
	var HF = '"Anek Bangla","Hind Siliguri","Noto Sans Bengali",sans-serif', TF = '"Hind Siliguri","Anek Bangla","Noto Sans Bengali",sans-serif';
	function rr(X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
	function txt(s, X, Y, font, col, al) { x.font = font; x.fillStyle = col; x.textAlign = al || 'left'; x.fillText(s, X, Y); }
	function fit(s, font, max) { x.font = font; while (s.length > 3 && x.measureText(s).width > max) s = s.slice(0, -2) + '…'; return s; }
	/* QR code for https://probashiinfo.com/bmet-report/ (29×29, level M), pre-computed: hex of row-major bits */
	var QRN = 29, QRH = 'feb47bfc14a1106e8788bb75d385dba4792ec1355907faaaafe017ee00b7364258cfc7bc46faa86da88e5c132505067a6aeb1edd2b4ef69ca762ca28add3c9aa4ba684618873d1e24568cefe0067547ffa91eb5059351bba5bcfa5d43fe66eb48e4b040f5dafec11d50';
	function qr(X, Y, S) {
		rr(X, Y, S, S, S * .1); x.fillStyle = '#fff'; x.fill();
		var m = S / (QRN + 6), pad = m * 3; x.fillStyle = '#061f4d';
		for (var i = 0; i < QRN * QRN; i++) { if ((parseInt(QRH[i >> 2], 16) >> (3 - (i & 3))) & 1) x.fillRect(X + pad + (i % QRN) * m, Y + pad + Math.floor(i / QRN) * m, m + .6, m + .6); }
	}
	function brand(X, cy, hgt) { // text wordmark on a white pill: globe dot + "প্রবাসী" (blue) "ইনফো" (green)
		var fs = Math.round(hgt * .5), f1 = '800 ' + fs + 'px ' + HF; x.font = f1;
		var w1 = x.measureText('প্রবাসী ').width, w2 = x.measureText('ইনফো').width, d = hgt * .42, w = d + 12 + w1 + w2 + 34;
		rr(X, cy - hgt / 2, w, hgt, hgt / 2); x.fillStyle = '#fff'; x.fill();
		var gx = X + 16 + d / 2, gr = x.createLinearGradient(gx - d / 2, cy - d / 2, gx + d / 2, cy + d / 2); gr.addColorStop(0, '#0b56c4'); gr.addColorStop(1, '#22c55e');
		x.fillStyle = gr; x.beginPath(); x.arc(gx, cy, d / 2, 0, Math.PI * 2); x.fill();
		x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 1.6; x.beginPath(); x.ellipse(gx, cy, d * .2, d / 2 - 1, 0, 0, Math.PI * 2); x.moveTo(gx - d / 2 + 1, cy); x.lineTo(gx + d / 2 - 1, cy); x.stroke();
		txt('প্রবাসী ', X + 16 + d + 10, cy + fs * .36, f1, '#0b3f97'); txt('ইনফো', X + 16 + d + 10 + w1, cy + fs * .36, f1, '#16a34a');
	}
	function chipCol(c) { var up = c.indexOf('▲') >= 0, dn = c.indexOf('▼') >= 0; return up ? ['#dcfce7', '#166534'] : dn ? ['#fee2e2', '#991b1b'] : ['#eef4ff', '#0b3f97']; }
	function bars(rows, RX, RY, RW, rh, head, fs, nameW, numW, title) {
		var RH = head + rows.length * rh + 12, mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
		rr(RX, RY, RW, RH, 24); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1.5; x.stroke();
		txt(fit(title, '700 ' + Math.round(fs * 1.1) + 'px ' + HF, RW - 44), RX + 22, RY + head * .68, '700 ' + Math.round(fs * 1.1) + 'px ' + HF, '#fff');
		var cr = Math.round(fs * .62), barX = RX + 22 + cr * 2 + 12 + nameW, barW = RW - (barX - RX) - numW - 22;
		rows.forEach(function (r, k) {
			var cy = RY + head + k * rh + rh / 2, ff = '600 ' + fs + 'px ' + TF;
			x.fillStyle = k === 0 ? '#22c55e' : 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(RX + 22 + cr, cy, cr, 0, Math.PI * 2); x.fill();
			txt(bn(k + 1), RX + 22 + cr, cy + fs * .28, '700 ' + Math.round(fs * .72) + 'px ' + HF, '#fff', 'center');
			txt(fit(r[0], ff, nameW - 8), RX + 22 + cr * 2 + 12, cy + fs * .33, ff, '#fff');
			var bh2 = Math.round(fs * .62); rr(barX, cy - bh2 / 2, barW, bh2, bh2 / 2); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill();
			var bg = x.createLinearGradient(barX, 0, barX + barW, 0); bg.addColorStop(0, '#60a5fa'); bg.addColorStop(1, '#22c55e');
			rr(barX, cy - bh2 / 2, Math.max(bh2, barW * r[1] / mx), bh2, bh2 / 2); x.fillStyle = bg; x.fill();
			txt(num(r[1]), RX + RW - 22, cy + fs * .33, '700 ' + Math.round(fs * 1.04) + 'px ' + HF, '#fff', 'right');
		});
		return RH;
	}
	// background
	var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#061f4d'); g.addColorStop(.55, '#0a3f97'); g.addColorStop(1, '#0b56c4');
	x.fillStyle = g; x.fillRect(0, 0, W, H);
	var rg = x.createRadialGradient(W * .92, H * .02, 0, W * .92, H * .02, W * .6); rg.addColorStop(0, 'rgba(34,197,94,.45)'); rg.addColorStop(1, 'rgba(34,197,94,0)');
	x.fillStyle = rg; x.fillRect(0, 0, W, H);
	x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 2;
	for (var i = 0; i < 9; i++) { x.beginPath(); x.arc(W * .95, H * .05, 90 + i * 70, 0, Math.PI * 2); x.stroke(); }
	x.fillStyle = '#22c55e'; x.fillRect(0, 0, W, wide ? 10 : 12);
	var P = wide ? 48 : 56, rows = o.rows || [], pill = 'তথ্যসূত্র: OEP · BMET';
	// brand row
	var by = wide ? 52 : 66, bs = wide ? 1 : 1.12;
	brand(P, by, wide ? 50 : 58);
	x.font = '600 ' + Math.round(19 * bs) + 'px ' + TF; var pw = x.measureText(pill).width + 34 * bs;
	rr(W - P - pw, by - 19 * bs, pw, 38 * bs, 19 * bs); x.fillStyle = 'rgba(255,255,255,.13)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.5; x.stroke();
	txt(pill, W - P - pw / 2, by + 7 * bs, '600 ' + Math.round(19 * bs) + 'px ' + TF, '#e6f0ff', 'center');
	var chips = [bn(o.nc) + 'টি দেশ', 'নারী ' + num(o.f) + ' জন']; if (o.avg) chips.push('দৈনিক গড় ' + num(o.avg)); if (o.cmp) chips.push(o.cmp);

	if (wide) {
		var L = W * .5, y = 128;
		var hs = 40; x.font = '800 ' + hs + 'px ' + HF; while (hs > 22 && x.measureText(o.kind).width > L) { hs -= 2; x.font = '800 ' + hs + 'px ' + HF; }
		txt(o.kind, P, y, '800 ' + hs + 'px ' + HF, '#fff'); y += 40;
		txt(fit(o.period, '600 24px ' + TF, L), P, y, '600 24px ' + TF, '#bcd3fb'); y += 26;
		rr(P, y, L, 210, 26); x.fillStyle = '#fff'; x.fill();
		txt(fit('মোট বহির্গমন ছাড়পত্র (স্মার্ট কার্ড)', '600 21px ' + TF, L - 56), P + 28, y + 42, '600 21px ' + TF, '#4a5d7d');
		var wf = 92, bt = num(o.t), bw2; do { x.font = '800 ' + wf + 'px ' + HF; bw2 = x.measureText(bt).width; if (bw2 + 70 <= L - 50) break; wf -= 4; } while (wf > 40);
		txt(bt, P + 26, y + 132, '800 ' + wf + 'px ' + HF, '#0b3f97'); txt('জন', P + 40 + bw2, y + 132, '700 34px ' + HF, '#16a34a');
		var cx = P + 26, cy = y + 160, cf = '600 17px ' + TF;
		chips.forEach(function (c) { x.font = cf; var w = x.measureText(c).width + 26; if (cx + w > P + L - 16) return; var cc = chipCol(c); rr(cx, cy, w, 34, 17); x.fillStyle = cc[0]; x.fill(); txt(c, cx + w / 2, cy + 23, cf, cc[1], 'center'); cx += w + 10; });
		var RX = W * .5 + P * .9, RW = W - RX - P, top = rows.slice(0, 6);
		var RH = bars(top, RX, 112, RW, 54, 58, 19, 128, 72, o.rowsTitle || 'শীর্ষ গন্তব্য দেশ');
		if (rows.length > 6) txt(fit('+ আরও ' + bn(rows.length - 6) + 'টি দেশ — পূর্ণ তালিকা ওয়েবসাইটে', '600 16px ' + TF, RW - 120), RX + 4, 112 + RH + 24, '600 16px ' + TF, '#d6e4fb');
	} else {
		var L2 = W - 2 * P, y2 = 150, big = H >= 1300;
		var hs2 = big ? 58 : 52; x.font = '800 ' + hs2 + 'px ' + HF; while (hs2 > 26 && x.measureText(o.kind).width > L2) { hs2 -= 2; x.font = '800 ' + hs2 + 'px ' + HF; }
		txt(o.kind, P, y2, '800 ' + hs2 + 'px ' + HF, '#fff'); y2 += big ? 50 : 44;
		txt(fit(o.period, '600 27px ' + TF, L2), P, y2, '600 ' + (big ? 30 : 27) + 'px ' + TF, '#bcd3fb'); y2 += big ? 30 : 22;
		// number panel: big number on the left, chips stacked on the right
		var ph = big ? 200 : 170; rr(P, y2, L2, ph, 26); x.fillStyle = '#fff'; x.fill();
		// every size is measured: a wider fallback font (e.g. iPhone's own Bengali font) shrinks to fit instead of overlapping
		var cfs = big ? 22 : 20, chh = big ? 40 : 36, cwMax = 0;
		while (cfs > 13 && chips.length * (chh + 8) - 8 > ph - 20) { cfs -= 1; chh -= 2; }
		x.font = '600 ' + cfs + 'px ' + TF; chips.forEach(function (c) { cwMax = Math.max(cwMax, x.measureText(c).width + 28); });
		cwMax = Math.min(cwMax, L2 * .45);
		var lbl = fit('মোট বহির্গমন ছাড়পত্র (স্মার্ট কার্ড)', '600 ' + (big ? 25 : 23) + 'px ' + TF, L2 - cwMax - 70);
		txt(lbl, P + 26, y2 + 40, '600 ' + (big ? 25 : 23) + 'px ' + TF, '#4a5d7d');
		var nf = big ? 118 : 100, bt2 = num(o.t), bw3, jw, room = L2 - cwMax - 24 - 24 - 30;
		do { x.font = '800 ' + nf + 'px ' + HF; bw3 = x.measureText(bt2).width; x.font = '700 ' + Math.round(nf * .4) + 'px ' + HF; jw = x.measureText('জন').width; if (bw3 + 14 + jw <= room) break; nf -= 4; } while (nf > 40);
		txt(bt2, P + 24, y2 + ph - (big ? 34 : 30), '800 ' + nf + 'px ' + HF, '#0b3f97');
		txt('জন', P + 38 + bw3, y2 + ph - (big ? 34 : 30), '700 ' + Math.round(nf * .4) + 'px ' + HF, '#16a34a');
		var cf2 = '600 ' + cfs + 'px ' + TF, cyy = y2 + (ph - chips.length * (chh + 8) + 8) / 2;
		chips.forEach(function (c) { c = fit(c, cf2, cwMax - 28); x.font = cf2; var w = x.measureText(c).width + 28, cc = chipCol(c); rr(P + L2 - 24 - w, cyy, w, chh, chh / 2); x.fillStyle = cc[0]; x.fill(); txt(c, P + L2 - 24 - w / 2, cyy + chh * .67, cf2, cc[1], 'center'); cyy += chh + 8; });
		y2 += ph + 16;
		// top countries as bars
		var nb = Math.min(rows.length, big ? 7 : 5), rh2 = big ? 50 : 42, LY = H - 140;
		var RH2 = bars(rows.slice(0, nb), P, y2, L2, rh2, big ? 56 : 50, big ? 26 : 23, big ? 240 : 210, big ? 110 : 96, o.rowsTitle || 'শীর্ষ গন্তব্য দেশ');
		y2 += RH2 + 14;
		// every other country in a dense grid
		var rest = rows.slice(nb);
		if (rest.length) {
			var cols = H > 1100 ? 3 : 4, avail = LY - 14 - y2, head = 44, need = Math.ceil(rest.length / cols);
			var maxRows = Math.max(0, Math.floor((avail - head - 10) / 26)), use = Math.min(need, maxRows);
			if (use > 0) {
				var rowH = Math.min(46, (avail - head - 10) / use), cap = use * cols, items = rest.length > cap ? rest.slice(0, cap - 1) : rest;
				var GH = head + use * rowH + 10, cw = (L2 - 40) / cols, nfs = Math.round(Math.min(22, rowH * .58)), more = rest.length - items.length;
				rr(P, y2, L2, GH, 22); x.fillStyle = 'rgba(255,255,255,.08)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 1.5; x.stroke();
				txt('অন্যান্য দেশ (' + bn(rest.length) + 'টি)', P + 22, y2 + 31, '700 24px ' + HF, '#fff');
				items.forEach(function (r, k) {
					var col = k % cols, row = Math.floor(k / cols), cx2 = P + 20 + col * cw, yy2 = y2 + head + row * rowH + rowH * .62, ff3 = '500 ' + nfs + 'px ' + TF;
					if (col) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(cx2 - 6, yy2 - nfs, 1.5, nfs * 1.3); }
					txt(bn(nb + k + 1) + '. ' + fit(r[0], ff3, cw - nfs * 3.4), cx2 + 4, yy2, ff3, '#e6f0ff');
					txt(num(r[1]), cx2 + cw - 14, yy2, '700 ' + (nfs + 1) + 'px ' + HF, '#86efac', 'right');
				});
				if (more > 0) { var k2 = items.length, cx3 = P + 20 + (k2 % cols) * cw, yy3 = y2 + head + Math.floor(k2 / cols) * rowH + rowH * .62; txt('+ আরও ' + bn(more) + 'টি দেশ', cx3 + 4, yy3, '700 ' + nfs + 'px ' + TF, '#fde68a'); }
			}
		}
	}
	// footer: source, generated time, website
	var pt = {}; try { new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (q) { pt[q.type] = q.value; }); } catch (e) {}
	if (!pt.hour) { var d0 = new Date(Date.now() + 6 * 36e5); pt = { year: d0.getUTCFullYear(), month: d0.getUTCMonth() + 1, day: d0.getUTCDate(), hour: d0.getUTCHours(), minute: ('0' + d0.getUTCMinutes()).slice(-2) }; } // Asia/Dhaka = UTC+6
	var hh = (+pt.hour) % 24, mm = ('0' + (+pt.minute)).slice(-2);
	var BM = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
	var part = hh < 5 ? 'রাত' : hh < 12 ? 'সকাল' : hh < 15 ? 'দুপুর' : hh < 18 ? 'বিকাল' : hh < 20 ? 'সন্ধ্যা' : 'রাত';
	var stamp = 'তৈরি: ' + bn(+pt.day) + ' ' + BM[(+pt.month) - 1] + ' ' + bn(pt.year) + ', ' + part + ' ' + bn(((hh + 11) % 12) + 1) + ':' + bn(mm);
	function line(t, X, Y, size, maxW, col, w8, fam) { var F = fam || TF, f = size; x.font = (w8 || '500') + ' ' + f + 'px ' + F; while (f > 12 && x.measureText(t).width > maxW) { f -= 1; x.font = (w8 || '500') + ' ' + f + 'px ' + F; } txt(t, X, Y, (w8 || '500') + ' ' + f + 'px ' + F, col); }
	if (wide) {
		var fy = H - 62, qs = 92, tw = W - 2 * P - qs - 300;
		x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(P, fy - 24, W - 2 * P, 1.5);
		line('তথ্যসূত্র: oep.gov.bd/reports/country-clearance · যাচাই করে নিন', P, fy, 16, tw, '#bcd3fb');
		line(stamp + ' · স্বাধীন তথ্যসেবা, সরকারি প্রকাশনা নয়', P, fy + 28, 17, tw, '#e6f0ff', '600', HF);
		txt('probashiinfo.com/bmet-report', W - P - qs - 14, fy + 8, '700 21px ' + HF, '#fff', 'right');
		txt('স্ক্যান করে লাইভ রিপোর্ট দেখুন →', W - P - qs - 14, fy + 32, '500 14px ' + TF, '#bcd3fb', 'right');
		qr(W - P - qs, H - qs - 10, qs);
	} else {
		var LY2 = H - 140, qs2 = 124, tw2 = W - 2 * P - qs2 - 20;
		x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(P, LY2, W - 2 * P, 1.5);
		line('তথ্যসূত্র: oep.gov.bd/reports/country-clearance · যাচাই করে নিন', P, LY2 + 30, 21, tw2, '#bcd3fb');
		line(stamp + ' · রিপোর্ট তৈরি: প্রবাসী ইনফো (স্বাধীন তথ্যসেবা)', P, LY2 + 60, 22, tw2, '#e6f0ff', '600', HF);
		rr(P, LY2 + 72, tw2, 50, 25); x.fillStyle = '#22c55e'; x.fill();
		var pf = 25; x.font = '700 ' + pf + 'px ' + HF; while (pf > 14 && x.measureText('🌐 লাইভ রিপোর্ট: probashiinfo.com/bmet-report').width > tw2 - 30) { pf--; x.font = '700 ' + pf + 'px ' + HF; }
		txt('🌐 লাইভ রিপোর্ট: probashiinfo.com/bmet-report', P + tw2 / 2, LY2 + 97 + pf * .35, '700 ' + pf + 'px ' + HF, '#053b1d', 'center');
		qr(W - P - qs2, LY2 + 8, qs2);
	}
}
/*@CARD-END*/
</script>
<script>
(function(){
	var J=JSON.parse(document.getElementById('bm-data').textContent), D=J.days, keys=Object.keys(D).sort(), CM=J.cmap, $=function(i){return document.getElementById(i)};
	if(!keys.length) return;
	var bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})}, num=function(n){return bn(Math.round(n).toLocaleString('en-US'))};
	var BM=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
	var bdate=function(k){var p=k.split('-');return bn(+p[2])+' '+BM[+p[1]-1]+' '+bn(p[0]);}, mlabel=function(m){var p=m.split('-');return BM[+p[1]-1]+' '+bn(p[0]);};
	var clean=function(c){return c.replace(/ /g,' ').replace(/\s*\(formerly[^)]*\)/i,'').trim()};
	var cm=function(c){return CM[c]||CM[clean(c)]||null}, cn=function(c){var m=cm(c);return m?m[0]:clean(c)}, CS=cn;
	var flag=function(c){var m=cm(c);return m?'<img class="fl" src="https://flagcdn.com/w40/'+m[1]+'.png" alt="" width="22" height="16" loading="lazy">':'<span class="fl fl0"></span>'};
	function hm(ts){ return bn(new Date(ts*1000).toLocaleTimeString('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit'})); }
	var months=[];keys.forEach(function(k){var m=k.slice(0,7); if(months.indexOf(m)<0) months.push(m);});
	var all={};keys.forEach(function(k){for(var c in D[k].c) all[c]=(all[c]||0)+D[k].c[c];});
	$('bm-country').innerHTML+=Object.keys(all).sort(function(a,b){return all[b]-all[a]}).map(function(c){return '<option value="'+c.replace(/"/g,'&quot;')+'">'+cn(c)+'</option>'}).join('');
	$('bm-month').innerHTML='<option value="">মাস বাছুন</option>'+months.slice().reverse().map(function(m){return '<option value="'+m+'">'+mlabel(m)+'</option>'}).join('');
	$('bm-day').min=keys[0]; $('bm-day').max=keys[keys.length-1];
	var sel=keys.slice(-30), country='', LIVE=J.live&&J.live.t?J.live:null, kind='day', cday='';
	function val(k){ var r=D[k]; return country ? (r.c[country]||0) : r.t; }
	var rng=null;
	function render(){
		if(!sel.length&&rng){ $('bm-trend').innerHTML='<p class="empty">'+(rng[0]===J.live.date?'আজকের দিন এখনো চলছে — সংখ্যা সরাসরি সরকারি সার্ভার থেকে আসছে, দিন শেষে আরও বাড়বে। দৈনিক চার্টে আজকের দিন যুক্ত হবে রাত ১২টার পর।':'এই সময়ের সংরক্ষিত দৈনিক চার্ট নেই — মোট হিসাব সরকারি সার্ভার থেকে আসছে।')+'</p>'; $('bm-top').innerHTML=''; ['k-t','k-f','k-c','k-a'].forEach(function(i){$(i).textContent='…'}); if(LIVE&&rng[0]===LIVE.date&&rng[1]===LIVE.date){ var lt=country?(LIVE.c[country]||0):LIVE.t; $('k-t').textContent=num(lt); $('k-a').textContent=num(lt); if(!country){ $('k-f').textContent=num(LIVE.f); $('k-c').textContent=bn(Object.keys(LIVE.c).length); var tp=Object.keys(LIVE.c).sort(function(p,q){return LIVE.c[q]-LIVE.c[p]}).slice(0,10), tq=LIVE.c[tp[0]]||1; $('bm-top').innerHTML=tp.map(function(c){ return '<div class="r">'+flag(c)+'<span>'+cn(c)+'</span><span class="t"><i style="width:'+(LIVE.c[c]*100/tq)+'%"></i></span><b>'+num(LIVE.c[c])+'</b></div>'; }).join(''); } } $('bm-tip').textContent=bdate(rng[0])+' – '+bdate(rng[1]); verify(); return; }
		var t=0,f=0,cs={}; sel.forEach(function(k){ var r=D[k]; t+=val(k); if(!country) f+=r.f; for(var c in r.c) cs[c]=(cs[c]||0)+r.c[c]; });
		$('k-t').textContent=num(t); $('k-f').textContent=country?'—':num(f); $('k-cl').textContent=country?'দেশ':'গন্তব্য দেশ'; $('k-c').textContent=country?cn(country):bn(Object.keys(cs).length); $('k-a').textContent=num(t/Math.max(1,sel.length));
		var mx=Math.max.apply(null,sel.map(val).concat([1]));
		$('bm-trend').innerHTML=sel.map(function(k){ var v=val(k); return '<div data-k="'+k+'" style="height:'+Math.max(1.5,v*100/mx)+'%" title="'+bdate(k)+': '+num(v)+' জন"></div>'; }).join('');
		$('bm-ttitle').textContent=(country?cn(country)+' — ':'')+'দৈনিক প্রবণতা';
		var range=sel.length>1?bdate(sel[0])+' থেকে '+bdate(sel[sel.length-1])+' · '+bn(sel.length)+' দিন':bdate(sel[0]);
		$('bm-tip').textContent=range+(sel.length>1?' · কোনো দিনের বারে চাপ দিন':'');
		var top=Object.keys(cs).sort(function(a,b){return cs[b]-cs[a]}).slice(0,10), tm=cs[top[0]]||1;
		$('bm-top').innerHTML=top.map(function(c){ return '<div class="r">'+flag(c)+'<span>'+cn(c)+'</span><span class="t"><i style="width:'+(cs[c]*100/tm)+'%"></i></span><b>'+num(cs[c])+'</b></div>'; }).join('');
		if(kind==='cur') drawCard();
		verify();
	}
	$('bm-trend').addEventListener('click',function(e){ var k=e.target.dataset&&e.target.dataset.k; if(!k) return; document.querySelectorAll('#bm-trend .on').forEach(function(x){x.classList.remove('on')}); e.target.classList.add('on'); $('bm-tip').textContent=bdate(k)+': '+num(val(k))+' জন'+(country?' ('+cn(country)+')':' · নারী '+num(D[k].f)); });
	function clr(){ document.querySelectorAll('.bar [data-r]').forEach(function(x){x.classList.remove('on')}); }
	document.querySelectorAll('.bar [data-r]').forEach(function(b){ b.onclick=function(){ clr(); b.classList.add('on'); $('bm-month').value=''; $('bm-day').value=''; rng=null; var r=b.dataset.r;
		if(r==='today'){ var td=(LIVE&&LIVE.date)||J.live.date; sel=[]; rng=[td,td]; render(); return; }
		if(r==='m0'||r==='m1'){ var m=months[months.length-(r==='m0'?1:2)]; sel=keys.filter(function(k){return k.indexOf(m)===0}); } else if(r==='all') sel=keys.slice(); else sel=keys.slice(-(+r)); render(); }; });
	$('bm-month').onchange=function(){ if(!this.value) return; clr(); $('bm-day').value=''; var m=this.value; rng=null; sel=keys.filter(function(k){return k.indexOf(m)===0}); render(); };
	$('bm-day').onchange=function(){ if(!this.value) return; clr(); $('bm-month').value=''; sel=keys.filter(function(k){return k===$('bm-day').value}); rng=[this.value,this.value]; render(); };
	$('bm-from').max=$('bm-to').max=keys[keys.length-1]; $('bm-from').min=$('bm-to').min='2018-01-01';
	$('bm-go').onclick=function(){ var a=$('bm-from').value, b=$('bm-to').value||a; if(!a){ $('bm-from').focus(); return; } if(a>b){ var x=a; a=b; b=x; } clr(); $('bm-month').value=''; $('bm-day').value=''; sel=keys.filter(function(k){return k>=a&&k<=b}); rng=[a,b]; render(); };
	$('bm-country').onchange=function(){ country=this.value; document.querySelectorAll('[data-wc]').forEach(function(x){ x.classList.toggle('on',!!country&&clean(country)===x.dataset.wc); }); render(); };
	function pickCountry(name){ var o=[].slice.call($('bm-country').options).filter(function(op){ return op.value&&clean(op.value)===name; })[0]; if(!o) return; $('bm-country').value=o.value; $('bm-country').onchange(); }
	document.querySelectorAll('[data-wc]').forEach(function(b){ b.onclick=function(){ if(b.classList.contains('on')){ $('bm-country').value=''; $('bm-country').onchange(); } else pickCountry(b.dataset.wc); }; });
	document.querySelectorAll('.wb[data-c]').forEach(function(b){ b.onclick=function(){ pickCountry(clean(b.dataset.c)); clr(); document.querySelector('.bar [data-r="30"]').classList.add('on'); rng=null; sel=keys.slice(-30); render(); document.getElementById('explore').scrollIntoView({behavior:'smooth'}); }; });
	/* every filter is re-checked against the government's own server (OEP) */
	var OEP=null, vtimer=0;
	var vtry=0;
	function verify(again){ clearTimeout(vtimer); if(!again) vtry=0; var a=rng?rng[0]:sel[0], b=rng?rng[1]:sel[sel.length-1]; if(!a) return; var my=a+b; OEP=null;
		$('bm-vf').className='vf'; $('bm-vf').textContent='⏳ সরকারি OEP সার্ভার থেকে '+(a===b?bdate(a):bdate(a)+' – '+bdate(b))+' এর হিসাব যাচাই হচ্ছে…';
		vtimer=setTimeout(function(){ fetch('/wp-json/pa/v1/bmet-query?from='+a+'&to='+b).then(function(r){return r.json().then(function(j){return [r.ok,j]})}).then(function(x){
			if(my!==(rng?rng[0]+rng[1]:sel[0]+sel[sel.length-1])) return;
			var ok=x[0], R=x[1]; if(!ok&&vtry<1&&(!R||R.code!=='bad')){ vtry++; $('bm-vf').textContent='⏳ সরকারি সার্ভার ধীরে সাড়া দিচ্ছে — আবার চেষ্টা করা হচ্ছে…'; setTimeout(function(){verify(true)},2500); return; } if(!ok){ $('bm-vf').className='vf err'; $('bm-vf').textContent='⚠️ '+(R&&R.message?R.message:'সরকারি সার্ভারে যাচাই করা যায়নি')+' — নিচের হিসাব আমাদের সংরক্ষিত সরকারি তথ্য থেকে।'; return; }
			OEP=R; var t=country?(R.c[country]||0):R.t, mine=0; sel.forEach(function(k){mine+=val(k)});
			$('k-t').textContent=num(t); if(!country&&R.f!==null) $('k-f').textContent=num(R.f); if(!country) $('k-c').textContent=bn(Object.keys(R.c).length);
			var nd=Math.round((Date.parse(b)-Date.parse(a))/864e5)+1; $('k-a').textContent=num(t/nd);
			if(!country){ var top=Object.keys(R.c).sort(function(p,q){return R.c[q]-R.c[p]}).slice(0,10), tm=R.c[top[0]]||1;
				$('bm-top').innerHTML=top.map(function(c){ return '<div class="r">'+flag(c)+'<span>'+cn(c)+'</span><span class="t"><i style="width:'+(R.c[c]*100/tm)+'%"></i></span><b>'+num(R.c[c])+'</b></div>'; }).join(''); }
			var full=sel.length===nd, diff=t-mine;
			if(!full){ $('bm-vf').className='vf ok'; $('bm-vf').textContent='✅ সরাসরি সরকারি OEP সার্ভার থেকে আনা হিসাব: '+num(t)+' জন'+(country?' ('+cn(country)+')':'')+' · '+hm(R.at); }
			else if(!diff){ $('bm-vf').className='vf ok'; $('bm-vf').textContent='✅ সরকারি OEP সার্ভারের সাথে মিলিয়ে দেখা হয়েছে — হুবহু মিলেছে ('+num(t)+' জন) · '+hm(R.at); }
			else { $('bm-vf').className='vf warn'; $('bm-vf').textContent='🔄 সরকারি সার্ভারে এখন '+num(t)+' জন — দেরিতে আসা এন্ট্রির কারণে আমাদের সংরক্ষিত হিসাবের চেয়ে '+(diff>0?'+':'')+num(diff)+'। ওপরের সংখ্যা সরকারি সার্ভারের সর্বশেষটা। · '+hm(R.at); }
			if(kind==='cur') drawCard();
		}).catch(function(){ $('bm-vf').className='vf err'; $('bm-vf').textContent='⚠️ সংযোগ সমস্যা — নিচের হিসাব আমাদের সংরক্ষিত সরকারি তথ্য থেকে।'; }); },500); }

	/* report card */
	function aggr(ks){ var t=0,f=0,cs={}; ks.forEach(function(k){ var r=D[k]; if(!r) return; t+=r.t; f+=r.f; for(var c in r.c) cs[c]=(cs[c]||0)+r.c[c]; }); return {t:t,f:f,cs:cs,n:ks.filter(function(k){return D[k]}).length}; }
	function topRows(cs){ return Object.keys(cs).sort(function(a,b){return cs[b]-cs[a]}).map(function(c){return [CS(c),cs[c]]}); }
	function pctTxt(a,b,w){ if(!b||a===b) return ''; var p=Math.round((a-b)*100/b); return p?w+' চেয়ে '+(p>0?'▲':'▼')+' '+bn(Math.abs(p))+'%':''; }
	function cardOpts(){
		var last=keys[keys.length-1];
		if(kind==='live'&&LIVE){ return {kind:bdate(LIVE.date)+' এর বিএমইটি রিপোর্ট',period:'লাইভ · '+hm(LIVE.at)+' পর্যন্ত (দিন শেষে আরও বাড়বে)',t:LIVE.t,f:LIVE.f,nc:Object.keys(LIVE.c).length,rows:topRows(LIVE.c),file:'live-'+LIVE.date}; }
		if(kind==='week'){ var w=keys.slice(-7), pw=keys.slice(-14,-7), a=aggr(w), b=aggr(pw); return {kind:'সাপ্তাহিক বিএমইটি রিপোর্ট',period:bdate(w[0])+' – '+bdate(last),t:a.t,f:a.f,nc:Object.keys(a.cs).length,avg:a.t/Math.max(1,a.n),cmp:pctTxt(a.t,b.t,'আগের সপ্তাহের'),rows:topRows(a.cs),file:'weekly-'+last}; }
		if(kind==='month'){ var m=last.slice(0,7), ks=keys.filter(function(k){return k.indexOf(m)===0}), a2=aggr(ks); return {kind:mlabel(m)+' মাসের বিএমইটি রিপোর্ট',period:bdate(ks[0])+' – '+bdate(last),t:a2.t,f:a2.f,nc:Object.keys(a2.cs).length,avg:a2.t/Math.max(1,a2.n),rows:topRows(a2.cs),file:'monthly-'+m}; }
		if(kind==='cur'&&OEP&&!country){ var po=OEP.from===OEP.to?bdate(OEP.from):bdate(OEP.from)+' – '+bdate(OEP.to); return {kind:'বিএমইটি রিপোর্ট',period:po,t:OEP.t,f:OEP.f||0,nc:Object.keys(OEP.c).length,rows:topRows(OEP.c),file:'report-'+OEP.from+'_'+OEP.to}; }
		if(kind==='cur'&&!sel.length) return {kind:'বিএমইটি রিপোর্ট',period:'…',t:0,f:0,nc:0,rows:[],file:'report'};
		if(kind==='cur'){ var a3=aggr(sel), per=sel.length>1?bdate(sel[0])+' – '+bdate(sel[sel.length-1]):bdate(sel[0]);
			if(country){ var t=0; sel.forEach(function(k){t+=D[k].c[country]||0}); return {kind:CS(country)+' — বিএমইটি রিপোর্ট',period:per,t:t,f:0,nc:1,avg:sel.length>1?t/sel.length:0,rows:sel.slice(-7).reverse().map(function(k){return [bdate(k),D[k].c[country]||0]}),rowsTitle:'দিনভিত্তিক হিসাব',file:'country-'+sel[sel.length-1]}; }
			return {kind:'বিএমইটি রিপোর্ট',period:per,t:a3.t,f:a3.f,nc:Object.keys(a3.cs).length,avg:sel.length>1?a3.t/a3.n:0,rows:topRows(a3.cs),file:'report-'+sel[sel.length-1]}; }
		var d=(cday&&D[cday])?cday:last, i=keys.indexOf(d), a4=aggr([d]), b4=aggr(i>0?[keys[i-1]]:[]);
		return {kind:bdate(d)+' এর বিএমইটি রিপোর্ট',period:'দৈনিক বহির্গমন ছাড়পত্রের হিসাব',t:a4.t,f:a4.f,nc:Object.keys(a4.cs).length,cmp:pctTxt(a4.t,b4.t,'আগের দিনের'),rows:topRows(a4.cs),file:d};
	}
	var LOGO=new Image(), logoP=new Promise(function(r){ LOGO.onload=LOGO.onerror=function(){r()}; LOGO.src=<?php echo wp_json_encode( $logo ); ?>; setTimeout(r,4000); });
	var fontsReady0=Promise.all([logoP,(document.fonts&&document.fonts.load)?Promise.all(['800 40px "Anek Bangla"','700 40px "Anek Bangla"','600 20px "Hind Siliguri"','500 20px "Hind Siliguri"'].map(function(f){return document.fonts.load(f,'বাংলা')})).catch(function(){}):null]);
	function caption(o){
		var L=['📊 '+o.kind,'📅 '+o.period,'','✅ মোট বহির্গমন ছাড়পত্র (স্মার্ট কার্ড): '+num(o.t)+' জন'];
		if(o.nc>1) L.push('🌍 গন্তব্য দেশ: '+bn(o.nc)+'টি'); if(o.f) L.push('👩 নারী কর্মী: '+num(o.f)+' জন'); if(o.avg) L.push('📈 দৈনিক গড়: '+num(o.avg)+' জন'); if(o.cmp) L.push('↕️ '+o.cmp);
		if(o.rows&&o.rows.length){ L.push('',(o.rowsTitle||'দেশভিত্তিক হিসাব')+':'); o.rows.forEach(function(r,i){ L.push(bn(i+1)+'. '+r[0]+' — '+num(r[1])+' জন'); }); }
		L.push('','📌 তথ্যসূত্র: বাংলাদেশ সরকারের ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (OEP) — https://www.oep.gov.bd/reports/country-clearance','(সরকারি তথ্য হুবহু দেখানো হয়েছে; সিদ্ধান্তের আগে মূল সূত্রে যাচাই করে নিন)','','🤝 রিপোর্ট তৈরিতে সহযোগিতায়: প্রবাসী ইনফো — https://probashiinfo.com/bmet-report/','লাইভ আপডেট ও যেকোনো তারিখের রিপোর্ট দেখুন 👆','','#BMET #বিএমইটি_রিপোর্ট #প্রবাসী #ProbashiInfo');
		return L.join('\n');
	}
	var csize='full';
	/* Safari can report a web font as loaded a frame before canvas can use it: wait for fonts.ready + two frames */
	var fontsReady=fontsReady0.then(function(){ return document.fonts&&document.fonts.ready; }).then(function(){ return new Promise(function(r){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ r(); }); }); }); }).catch(function(){});
	function paint(o){ o.logo=LOGO; var cv=$('bm-cv'), h=csize==='sq'?1080:bmCardH(o); if(cv.height!==h) cv.height=h; bmCard(cv,o); $('bm-cap').value=caption(o); }
	function drawCard(){ fontsReady.then(function(){ paint(cardOpts()); setTimeout(function(){ paint(cardOpts()); },450); }); }
	document.querySelectorAll('.gsz [data-sz]').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('.gsz [data-sz]').forEach(function(x){x.classList.toggle('on',x===b)}); csize=b.dataset.sz; drawCard(); }; });
	$('bm-copy').onclick=function(){ var t=$('bm-cap').value, b=this, done=function(){ b.textContent='✅ কপি হয়েছে'; b.classList.add('ok'); setTimeout(function(){ b.textContent='📋 ক্যাপশন কপি করুন'; b.classList.remove('ok'); },2200); };
		if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done,function(){ $('bm-cap').select(); document.execCommand('copy'); done(); }); else { $('bm-cap').select(); document.execCommand('copy'); done(); } };
	function blob(cb){ fontsReady.then(function(){ paint(cardOpts()); $('bm-cv').toBlob(cb,'image/jpeg',.93); }); }
	setInterval(function(){ if(!document.hidden) drawCard(); },60000);
	function pick(k){ document.querySelectorAll('.gb [data-k]').forEach(function(x){x.classList.toggle('on',x.dataset.k===k)}); kind=k; drawCard(); }
	document.querySelectorAll('.gb [data-k]').forEach(function(b){ b.onclick=function(){ if(b.dataset.k==='day'){cday='';$('bm-cdate').value='';} pick(b.dataset.k); }; });
	$('bm-cdate').min=keys[0]; $('bm-cdate').max=keys[keys.length-1];
	$('bm-cdate').onchange=function(){ if(!D[this.value]){ alert('এই তারিখের তথ্য নেই — '+bdate(keys[0])+' থেকে '+bdate(keys[keys.length-1])+' এর মধ্যে বাছুন।'); return; } cday=this.value; pick('day'); };
	$('bm-dl').onclick=function(){ var o=cardOpts(); blob(function(bl){ var a=document.createElement('a'); a.href=URL.createObjectURL(bl); a.download='bmet-report-'+o.file+(csize==='sq'?'-square':'')+'.jpg'; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href); a.remove();},1500); }); };
	$('bm-sh').onclick=function(){ var o=cardOpts(), txt=caption(o);
		blob(function(bl){ var f=new File([bl],'bmet-report-'+o.file+'.jpg',{type:'image/jpeg'});
			if(navigator.canShare&&navigator.canShare({files:[f]})) navigator.share({files:[f],title:o.kind,text:txt}).catch(function(){});
			else { $('bm-dl').click(); window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent('https://probashiinfo.com/bmet-report/'),'_blank'); } }); };
	/* hero share: one sheet — with image, Facebook, WhatsApp, copy text, copy link (the link appears once) */
	var PAGE='https://probashiinfo.com/bmet-report/';
	function shareText(){
		var last=keys[keys.length-1], Y=D[last], top=Object.keys(Y.c).sort(function(a,b){return Y.c[b]-Y.c[a]}).slice(0,3).map(function(c){return cn(c)+' '+num(Y.c[c])}).join(', ');
		var L=['📊 আজকের বিএমইটি রিপোর্ট (লাইভ)'];
		if(LIVE&&LIVE.t) L.push('🔴 আজ '+bdate(LIVE.date)+' — '+hm(LIVE.at)+' পর্যন্ত '+num(LIVE.t)+' জন ('+bn(Object.keys(LIVE.c).length)+'টি দেশ)');
		L.push('✅ '+(last===J.live.date?'':'গতকাল ')+bdate(last)+': '+num(Y.t)+' জন · '+bn(Object.keys(Y.c).length)+'টি দেশ · নারী '+num(Y.f)+' জন','🔝 শীর্ষে: '+top,'','📌 তথ্যসূত্র: OEP (oep.gov.bd) — সরকারি তথ্য, যাচাই করে নিন','👉 লাইভ রিপোর্ট, দেশভিত্তিক হিসাব ও কার্ড:');
		return L.join('\n');
	}
	function optsFor(k){ var k0=kind; kind=k; var o=cardOpts(); kind=k0; o.logo=LOGO; return o; }
	function heroImage(cb){ fontsReady.then(function(){ var c=document.createElement('canvas'); c.width=1080; c.height=1080; bmCard(c,optsFor(LIVE&&LIVE.t?'live':'day')); c.toBlob(cb,'image/jpeg',.92); }); }
	function copyTxt(t,btn,ok){ var done=function(){ var o=btn.textContent; btn.textContent=ok; setTimeout(function(){btn.textContent=o},2000); };
		(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(done,function(){ var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); done(); }); }
	$('bm-share').onclick=function(){
		var t=shareText(), full=t+'\n'+PAGE;
		var d=document.createElement('div'); d.className='pws'; d.setAttribute('role','dialog');
		d.innerHTML='<div class="pws-in shs"><b class="pws-t">📤 রিপোর্ট শেয়ার করুন</b><pre class="shs-p"></pre>'
			+'<div class="shs-g"><button type="button" data-a="img">🖼️ ছবিসহ শেয়ার</button><button type="button" data-a="wa">💬 WhatsApp</button><button type="button" data-a="fb">📘 Facebook</button><button type="button" data-a="txt">📋 লেখা কপি</button><button type="button" data-a="lnk">🔗 লিংক কপি</button><button type="button" data-a="dl">⬇ ছবি ডাউনলোড</button></div>'
			+'<button type="button" class="pws-n">বন্ধ করুন</button></div>';
		d.querySelector('.shs-p').textContent=full; document.body.appendChild(d);
		d.onclick=function(e){ if(e.target===d) d.remove(); };
		d.querySelector('.pws-n').onclick=function(){ d.remove(); };
		d.querySelectorAll('[data-a]').forEach(function(b){ b.onclick=function(){ var a=b.dataset.a;
			if(a==='wa') window.open('https://wa.me/?text='+encodeURIComponent(full),'_blank');
			else if(a==='fb') { copyTxt(full,b,'✅ লেখা কপি হয়েছে — পোস্টে পেস্ট করুন'); window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(PAGE),'_blank'); }
			else if(a==='txt') copyTxt(full,b,'✅ কপি হয়েছে');
			else if(a==='lnk') copyTxt(PAGE,b,'✅ লিংক কপি হয়েছে');
			else heroImage(function(bl){ var f=new File([bl],'bmet-report-'+(LIVE&&LIVE.t?'live-'+LIVE.date:keys[keys.length-1])+'.jpg',{type:'image/jpeg'});
				if(a==='img'&&navigator.canShare&&navigator.canShare({files:[f]})) navigator.share({files:[f],text:full}).catch(function(){});
				else { var u=URL.createObjectURL(bl), l=document.createElement('a'); l.href=u; l.download=f.name; document.body.appendChild(l); l.click(); setTimeout(function(){URL.revokeObjectURL(u); l.remove();},1500); if(a==='img') copyTxt(full,b,'✅ ছবি নেমেছে, লেখা কপি হয়েছে'); } });
		}; });
	};

	/* live */
	function countTo(el,to){ var from=+el.dataset.v||0; el.dataset.v=to; if(from===to){ el.textContent=num(to); return; } var t0=performance.now(); (function step(t){ var p=Math.min(1,(t-t0)/900); el.textContent=num(from+(to-from)*p); if(p<1) requestAnimationFrame(step); })(t0); }
	var NEWC={};
	function paintLive(L,add){
		countTo($('lv-t'),L.t); $('lv-f').textContent=num(L.f); $('lv-c').textContent=bn(Object.keys(L.c).length);
		var ks=Object.keys(L.c).sort(function(a,b){return L.c[b]-L.c[a]}).slice(0,8), mx=L.c[ks[0]]||1;
		if(ks.length) $('lv-list').innerHTML=ks.map(function(c){return '<div class="lrow'+(NEWC[c]?' new':'')+'">'+flag(c)+'<span>'+cn(c)+'</span><span class="t"><i style="width:'+(L.c[c]*100/mx)+'%"></i></span><b>'+num(L.c[c])+'</b></div>'}).join('');
		$('lv-at').textContent='সর্বশেষ চেক: '+hm(L.at)+' · প্রতি ৫ মিনিটে নিজে হালনাগাদ হয় · দিনের শেষ পর্যন্ত সংখ্যা বাড়তে থাকে';
		if(add.length){ if($('lv-feed0')) $('lv-feed0').remove();
			$('lv-feed').querySelector('h3').insertAdjacentHTML('afterend',add.map(function(a){return '<p>'+hm(L.at)+' — '+cn(a[0])+' <b>+'+num(a[1])+' জন</b></p>'}).join('')); }
	}
	function live(){ fetch('/wp-json/pa/v1/bmet-live?_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(L){
		if(!L||!L.date) return;
		if(LIVE&&LIVE.date!==L.date){ location.reload(); return; }
		if(!L.t) return;
		var add=[]; if(LIVE){ for(var c in L.c){ var dl=L.c[c]-(LIVE.c[c]||0); if(dl>0){ add.push([c,dl]); NEWC[c]=1; } } }
		LIVE=L; if($('bm-tnow')) $('bm-tnow').textContent=hm(L.at); document.querySelector('.gb [data-k=live]').hidden=false; paintLive(L,add.sort(function(a,b){return b[1]-a[1]}));
		if(kind==='live') drawCard(); }).catch(function(){}); }
	setTimeout(live,3000); setInterval(function(){ if(!document.hidden) live(); },120000);
	document.addEventListener('visibilitychange',function(){ if(!document.hidden) live(); });
	(function(){ var d=$('bm-dis'), ic=$('bm-disic'), K='pa_dis_hide', get=function(){try{return localStorage.getItem(K)}catch(e){return null}}, set=function(v){try{v?localStorage.setItem(K,'1'):localStorage.removeItem(K)}catch(e){}};
		function show(o){ d.hidden=!o; ic.hidden=o; set(!o); }
		$('bm-disx').onclick=function(){ show(false); }; ic.onclick=function(){ show(true); };
		if(get()) { d.hidden=true; ic.hidden=false; } else setTimeout(function(){ if(!d.hidden&&!d.matches(':hover')){ d.hidden=true; ic.hidden=false; } },8000); })();
	render(); drawCard();
	var links=[].slice.call(document.querySelectorAll('.ah nav a')), secs=links.map(function(a){return document.querySelector(a.getAttribute('href'))});
	if('IntersectionObserver' in window){ var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var i=secs.indexOf(e.target); links.forEach(function(a,j){a.classList.toggle('on',j===i)}); } }); },{rootMargin:'-40% 0px -55% 0px'}); secs.forEach(function(s){ if(s) io.observe(s); }); }
})();
</script>
<script>
(function(){
	var PUB=<?php $pk = pa_push_keys(); echo wp_json_encode( $pk ? $pk['pub'] : '' ); ?>, $=function(i){return document.getElementById(i)}, LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
	var ua=navigator.userAgent||'', ios=/iphone|ipad|ipod/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1), android=/android/i.test(ua);
	var standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
	var app=/FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|musical_ly|BytedanceWebview|TikTok|Snapchat|Twitter|WhatsApp/i.exec(ua);
	var url=location.href.split('#')[0];
	function sheet(html,cls){ var d=document.createElement('div'); d.className='pws '+(cls||''); d.setAttribute('role','dialog'); d.innerHTML='<div class="pws-in">'+html+'</div>'; document.body.appendChild(d); return d; }

	/* 1. Opened inside Facebook / Instagram / Messenger etc.: send people to Chrome (Android) or Safari (iPhone).
	   In-app browsers cannot install apps or get notifications, and they break downloads. */
	if(app&&!standalone){
		var name=/Instagram/i.test(app[0])?'Instagram':/Messenger/i.test(app[0])?'Messenger':/FB/i.test(app[0])?'Facebook':/WhatsApp/i.test(app[0])?'WhatsApp':/musical_ly|Bytedance|TikTok/i.test(app[0])?'TikTok':app[0];
		var brw=android?'Chrome':ios?'Safari':'আপনার ব্রাউজার';
		var intent='intent://'+location.host+location.pathname+location.search+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(url)+';end';
		var steps=ios?'<ol><li>ওপরে/নিচে <b>•••</b> বা <b>⋯</b> বাটনে চাপুন</li><li><b>"Open in Safari"</b> / <b>"Open in browser"</b> বাছুন</li></ol>':'<ol><li>ওপরে ডানে <b>⋮</b> বাটনে চাপুন</li><li><b>"Open in Chrome"</b> / <b>"Open in browser"</b> বাছুন</li></ol>';
		var d=sheet('<div class="pws-ic">🌐</div><b class="pws-t">'+brw+'-এ খুলুন</b><p>আপনি পেজটি <b>'+name+'</b>-এর ভেতরের ব্রাউজারে খুলেছেন। এখানে রিপোর্ট কার্ড ডাউনলোড, অ্যাপ ইনস্টল আর নোটিফিকেশন ঠিকমতো কাজ করে না। সঠিকভাবে দেখতে <b>'+brw+'</b> দিয়ে খুলুন।</p>'
			+(android?'<a class="pws-y" href="'+intent+'">Chrome-এ খুলুন →</a>':'')+steps
			+'<button type="button" class="pws-c">🔗 লিংক কপি করুন</button><button type="button" class="pws-n">এখানেই দেখব</button>','pws-block');
		d.querySelector('.pws-c').onclick=function(){ var b=this; (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).catch(function(){ var t=document.createElement('textarea'); t.value=url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }).then(function(){ b.textContent='✅ কপি হয়েছে — '+brw+'-এ পেস্ট করুন'; }); };
		d.querySelector('.pws-n').onclick=function(){ d.remove(); };
		if(android&&!sessionStorage.getItem('pa_iab')){ try{ sessionStorage.setItem('pa_iab','1'); }catch(e){} setTimeout(function(){ location.href=intent; },1200); }
		return; // no install / push prompts inside in-app browsers
	}

	if(!('serviceWorker' in navigator)) return;
	var regP=navigator.serviceWorker.register('/?pa_pwa=sw',{scope:'/'}).catch(function(){return null});
	function toast(t){ var d=document.createElement('div'); d.className='pwb'; d.innerHTML='<span>'+t+'</span>'; document.body.appendChild(d); setTimeout(function(){d.remove()},4500); }

	/* 2. Install the app — only for people who do not have it yet */
	var deferred=null, installed=standalone||LS.get('pa_installed')==='1';
	var later=+LS.get('pa_inst_later')||0, snooze=Date.now()-later<3*864e5, shown=false;
	function installSheet(){
		if(installed||snooze||shown) return; shown=true;
		var d=sheet('<div class="pws-ic">📲</div><b class="pws-t">"বিএমইটি লাইভ" অ্যাপ ডাউনলোড করুন</b><p>ফোনের হোম স্ক্রিন থেকে এক চাপে আজকের বিএমইটি রিপোর্ট দেখুন, আর প্রতিদিন রাতে রিপোর্ট প্রকাশ হলেই নোটিফিকেশন পান। একদম ফ্রি, প্লে স্টোর লাগবে না।</p>'
			+(ios?'<ol><li>নিচের <b>শেয়ার</b> বাটন (⬆️) চাপুন</li><li><b>"Add to Home Screen"</b> বাছুন → <b>Add</b></li></ol><button type="button" class="pws-n">ঠিক আছে</button>':'<button type="button" class="pws-y">⬇ এখনই ইনস্টল করুন</button><button type="button" class="pws-n">পরে</button>'));
		var y=d.querySelector('.pws-y'); if(y) y.onclick=function(){ d.remove(); if(deferred){ deferred.prompt(); deferred.userChoice.then(function(c){ if(c&&c.outcome==='accepted'){ LS.set('pa_installed','1'); installed=true; } deferred=null; $('pw-install').hidden=true; setTimeout(notifySheet,1500); }); } };
		d.querySelector('.pws-n').onclick=function(){ LS.set('pa_inst_later',String(Date.now())); d.remove(); setTimeout(notifySheet,1500); };
	}
	/* Chrome only fires this when the app is NOT installed yet — the reliable "not installed" signal */
	addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); deferred=e; installed=false; $('pw-install').hidden=false; setTimeout(installSheet,4000); });
	addEventListener('appinstalled',function(){ LS.set('pa_installed','1'); installed=true; $('pw-install').hidden=true; document.querySelectorAll('.pws').forEach(function(x){x.remove()}); });
	if(navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then(function(a){ if(a&&a.length){ installed=true; LS.set('pa_installed','1'); $('pw-install').hidden=true; } }).catch(function(){});
	if(ios&&!standalone){ $('pw-install').hidden=false; if(/Safari/.test(ua)&&!/CriOS|FxiOS|EdgiOS/.test(ua)) setTimeout(installSheet,4000); }
	if(standalone){ LS.set('pa_installed','1'); $('pw-install').hidden=true; }
	$('pw-install').onclick=function(){ shown=false; snooze=false; if(deferred){ deferred.prompt(); deferred.userChoice.then(function(c){ if(c&&c.outcome==='accepted') LS.set('pa_installed','1'); deferred=null; $('pw-install').hidden=true; }); } else installSheet(); };

	/* 3. Notifications */
	var canPush=PUB&&('PushManager' in window)&&('Notification' in window);
	function b64(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; var r=atob(s), a=new Uint8Array(r.length); for(var i=0;i<r.length;i++) a[i]=r.charCodeAt(i); return a; }
	function save(sub){ return fetch('/wp-json/pa/v1/push-sub',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub)}); }
	function subscribe(){ return regP.then(function(reg){ if(!reg) throw 0; return navigator.serviceWorker.ready; }).then(function(reg){ return reg.pushManager.getSubscription().then(function(s){ return s||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(PUB)}); }); }).then(function(s){ return save(s.toJSON()); }); }
	function setBtn(){ var p=Notification.permission; if(p==='granted'){ $('pw-notify').hidden=false; $('pw-notify').textContent='🔔 নোটিফিকেশন চালু আছে'; $('pw-notify').disabled=true; } else if(p==='denied'){ $('pw-notify').hidden=true; } else $('pw-notify').hidden=false; }
	function ask(){ Notification.requestPermission().then(function(p){ if(p==='granted') subscribe().then(function(){ setBtn(); toast('✅ ঠিক আছে! প্রতিদিন রাতে রিপোর্ট প্রকাশ হলেই নোটিফিকেশন পাবেন।'); }).catch(function(){ toast('নোটিফিকেশন চালু করা যায়নি — পরে আবার চেষ্টা করুন।'); }); setBtn(); }); }
	var nshown=false;
	function notifySheet(){
		if(!canPush||nshown||Notification.permission!=='default'||Date.now()-(+LS.get('pa_np')||0)<864e5||document.querySelector('.pws')) return; nshown=true; // once a day until allowed
		var d=document.createElement('div'); d.className='pwb'; d.setAttribute('role','dialog');
		d.innerHTML='<div style="font-size:28px">🔔</div><div style="flex:1"><b>প্রতিদিনের বিএমইটি রিপোর্ট নোটিফিকেশনে পাবেন?</b><span>প্রতিদিন রাত ১২টার পর রিপোর্ট প্রকাশ হলেই জানিয়ে দেব।</span></div><button class="y">চালু করুন</button><button class="n">পরে</button>';
		document.body.appendChild(d); d.querySelector('.y').onclick=function(){ LS.set('pa_np',String(Date.now())); d.remove(); ask(); }; d.querySelector('.n').onclick=function(){ LS.set('pa_np',String(Date.now())); d.remove(); };
	}
	if(canPush&&!(ios&&!standalone)){
		setBtn(); $('pw-notify').onclick=ask;
		if(Notification.permission==='granted') subscribe().catch(function(){});
		else setTimeout(notifySheet,12000); // waits if the install sheet is open
	}
})();
</script>
<?php wp_footer(); ?>
</body>
</html>
<?php
}
