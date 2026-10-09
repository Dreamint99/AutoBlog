<?php
/* বিএমইটি রিপোর্ট ড্যাশবোর্ড — probashiinfo.com/bmet-report/ (Code Snippets, everywhere).
   Data: daily country-clearance totals from the Government's Overseas Employment Platform (OEP,
   oep.gov.bd), collected each morning by AutoBlog generator/bmet_report.py and POSTed to
   /wp-json/pa/v1/bmet (admins only). Stored in the option pa_bmet. The page content is replaced
   with a server-rendered summary (for Google) plus an interactive dashboard (filters, charts). */

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
} );

/* Live count for today: the dashboard polls this; OEP is asked at most once per 3 minutes (transient). */
function pa_bmet_oep( $day, $gender = '' ) {
	$u = add_query_arg( array( 'draw' => 1, 'start' => 0, 'length' => 400, 'approval_date_from' => $day, 'approval_date_to' => $day ), 'https://www.oep.gov.bd/reports/country-clearance' );
	if ( $gender ) $u = add_query_arg( 'gender_id', $gender, $u );
	$r = wp_remote_get( $u, array( 'timeout' => 20, 'headers' => array( 'X-Requested-With' => 'XMLHttpRequest', 'Accept' => 'application/json', 'User-Agent' => 'Mozilla/5.0 (probashiinfo.com BMET report)' ) ) );
	if ( is_wp_error( $r ) || 200 !== wp_remote_retrieve_response_code( $r ) ) return null;
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	return isset( $j['payload'] ) ? $j['payload'] : null;
}
add_action( 'rest_api_init', function () {
	register_rest_route( 'pa/v1', '/bmet-live', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			do_action( 'litespeed_control_set_nocache', 'bmet live' );
			$day = wp_date( 'Y-m-d', null, new DateTimeZone( 'Asia/Dhaka' ) );
			$key = 'pa_bmet_live_' . $day;
			$c   = get_transient( $key );
			if ( false === $c ) {
				$all = pa_bmet_oep( $day );
				$fem = $all ? pa_bmet_oep( $day, 2 ) : null;
				$old = get_option( 'pa_bmet_live_last' );
				if ( $all ) {
					$cs = array();
					foreach ( (array) $all['data'] as $row ) $cs[ $row['country_name'] ] = (int) $row['total_employee'];
					arsort( $cs );
					$c = array( 'date' => $day, 't' => (int) $all['totalEmployee'], 'f' => $fem ? (int) $fem['totalEmployee'] : 0, 'c' => $cs, 'at' => time(), 'ok' => true );
					update_option( 'pa_bmet_live_last', $c, false );
				} else {
					$c = ( is_array( $old ) && $old['date'] === $day ) ? array_merge( $old, array( 'ok' => false ) ) : array( 'date' => $day, 't' => 0, 'f' => 0, 'c' => array(), 'at' => time(), 'ok' => false );
				}
				set_transient( $key, $c, $all ? 180 : 60 );
			}
			$res = new WP_REST_Response( $c );
			$res->header( 'Cache-Control', 'no-store' );
			return $res;
		},
	) );
} );

function pb_bn( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); }
function pb_num( $n ) { return pb_bn( number_format( (int) $n ) ); }
function pb_bdate( $ymd ) {
	$m = array( 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর' );
	$p = explode( '-', $ymd );
	return count( $p ) === 3 ? pb_bn( (int) $p[2] ) . ' ' . $m[ (int) $p[1] - 1 ] . ' ' . pb_bn( $p[0] ) : $ymd;
}

add_filter( 'the_content', function ( $content ) {
	if ( ! is_page( 'bmet-report' ) || ! in_the_loop() || ! is_main_query() ) return $content;
	$d = get_option( 'pa_bmet' );
	if ( empty( $d['days'] ) ) return '<p>রিপোর্ট শিগগিরই প্রকাশিত হবে।</p>';
	$days = $d['days'];
	ksort( $days );
	$last = array_key_last( $days );
	$L = $days[ $last ];
	arsort( $L['c'] );
	$top = array_slice( $L['c'], 0, 15, true );
	$rows = '';
	$i = 0;
	foreach ( $top as $c => $n ) { $i++; $rows .= '<tr><td>' . pb_bn( $i ) . '</td><td>' . esc_html( $c ) . '</td><td>' . pb_num( $n ) . '</td></tr>'; }
	$month = substr( $last, 0, 7 );
	$mt = 0;
	foreach ( $days as $k => $v ) if ( strpos( $k, $month ) === 0 ) $mt += (int) $v['t'];
	$src = 'https://www.oep.gov.bd/reports/country-clearance';
	$json = wp_json_encode( array( 'days' => $days ) );
	$ld = wp_json_encode( array(
		'@context' => 'https://schema.org', '@type' => 'Dataset',
		'name' => 'বিএমইটি দৈনিক বহির্গমন ছাড়পত্র — দেশভিত্তিক',
		'description' => 'বাংলাদেশ থেকে প্রতিদিন কতজন কর্মী কোন দেশে কাজের জন্য বহির্গমন ছাড়পত্র (স্মার্ট কার্ড) পেয়েছেন, দেশ ও মাসভিত্তিক হিসাব।',
		'url' => home_url( '/bmet-report/' ), 'isBasedOn' => $src, 'temporalCoverage' => array_key_first( $days ) . '/' . $last,
		'creator' => array( '@type' => 'Organization', 'name' => 'প্রবাসী ইনফো' ), 'dateModified' => $d['updated'] ?? $last,
	), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	ob_start(); ?>
<script type="application/ld+json"><?php echo $ld; ?></script>
<style>
.bm{--b:#0b56c4;--nv:#082a63;--g:#16a34a;--g2:#22c55e;--line:#e2e8f1;--mut:#6a7a93;--soft:#f3f6fb}
.bm-hero{border-radius:20px;padding:22px;background:radial-gradient(600px 240px at 90% 0,rgba(34,197,94,.35),transparent 60%),linear-gradient(120deg,var(--nv),var(--b));color:#fff;margin:0 0 18px}
.bm-hero small{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);padding:4px 10px;border-radius:999px;font-size:13px}
.bm-hero h2{color:#fff!important;background:none!important;border:0!important;padding:0!important;margin:10px 0 4px!important;font-size:clamp(24px,3.4vw,34px)!important}
.bm-hero p{margin:0;color:#d6e4fb}
.bm-big{font:800 clamp(44px,7vw,72px)/1 "Anek Bangla",sans-serif;margin:12px 0 2px}
.bm-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}
.bm-kpi{padding:14px;border-radius:14px;background:#fff;border:1px solid var(--line);box-shadow:0 1px 2px rgba(10,40,90,.06)}
.bm-kpi span{display:block;font-size:13px;color:var(--mut)}.bm-kpi b{display:block;font:800 26px/1.2 "Anek Bangla",sans-serif;color:#0f1f38}
.bm-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 14px}
.bm-bar button,.bm-bar select,.bm-bar input{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 12px;font:600 14.5px "Hind Siliguri",sans-serif;cursor:pointer;color:#0f1f38}
.bm-bar button.on{background:var(--b);border-color:var(--b);color:#fff}
.bm-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;margin:0 0 14px}
.bm-card h3{margin:0 0 10px!important;font-size:18px!important;color:#0f1f38!important}
.bm-trend{display:flex;align-items:flex-end;gap:3px;height:190px;padding-top:8px;overflow-x:auto}
.bm-trend div{flex:1 0 8px;min-width:8px;background:linear-gradient(180deg,var(--g2),var(--b));border-radius:4px 4px 0 0;position:relative;transition:opacity .2s}
.bm-trend div:hover{opacity:.75}
.bm-hb{display:grid;gap:8px}
.bm-hb .r{display:grid;grid-template-columns:150px 1fr 70px;gap:10px;align-items:center;font-size:15px}
.bm-hb .t{height:14px;background:var(--soft);border-radius:7px;overflow:hidden}.bm-hb .t i{display:block;height:100%;background:linear-gradient(90deg,var(--b),var(--g2));border-radius:7px;transition:width .5s}
.bm-hb b{text-align:right;font-family:"Anek Bangla",sans-serif}
.bm-two{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:14px}
.bm-src{font-size:13.5px;color:var(--mut);margin-top:10px}
.bm-wa{background:#25d366!important;border-color:#25d366!important;color:#053b1d!important}
.bm-live{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;border-radius:16px;padding:14px 16px;margin:0 0 14px;background:#fff;border:1px solid var(--line);border-left:5px solid #e11d48}
.bm-live .dot{width:11px;height:11px;border-radius:50%;background:#e11d48;animation:bmp 1.6s infinite;flex:none}
@keyframes bmp{0%{box-shadow:0 0 0 0 rgba(225,29,72,.6)}70%{box-shadow:0 0 0 12px rgba(225,29,72,0)}100%{box-shadow:0 0 0 0 rgba(225,29,72,0)}}
.bm-live b.n{font:800 34px/1 "Anek Bangla",sans-serif;color:#0b3f97;transition:color .3s}.bm-live b.n.up{color:#16a34a}.bm-live .lt{font-weight:700;color:#e11d48}
.bm-live .cc{display:flex;flex-wrap:wrap;gap:6px;width:100%}.bm-live .cc span{background:var(--soft);border-radius:999px;padding:4px 10px;font-size:13.5px}
.bm-live .cc span.new{background:#dcfce7;color:#166534;font-weight:700;animation:bmf 1.2s 3}
@keyframes bmf{50%{background:#86efac}}
.bm-live .nw{width:100%;font-size:14px;color:#166534;font-weight:600}
.bm-live small{color:var(--mut);font-size:12.5px;width:100%}
.bm-gen .gb{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.bm-gen .gb button,.bm-gen .gb input{border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 12px;font:600 14.5px "Hind Siliguri",sans-serif;cursor:pointer;color:#0f1f38}
.bm-gen .gb button.on{background:var(--nv);border-color:var(--nv);color:#fff}
.bm-gen .gw{display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:18px;align-items:start}
.bm-gen canvas{width:100%;height:auto;border-radius:14px;box-shadow:0 10px 30px rgba(8,42,99,.25);display:block}
.bm-gen .ga{display:grid;gap:10px}.bm-gen .ga button{display:block;text-align:center;border:0;border-radius:12px;padding:13px 14px;font:700 16px "Hind Siliguri",sans-serif;cursor:pointer}
.bm-dl{background:var(--g)!important;color:#fff!important}.bm-sh{background:var(--b)!important;color:#fff!important}.bm-gen .ga p{margin:0;font-size:13.5px;color:var(--mut)}
@media(max-width:760px){.bm-gen .gw{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){.bm-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.bm-two{grid-template-columns:minmax(0,1fr)}.bm-hb .r{grid-template-columns:110px 1fr 56px}}
</style>
<div class="bm" id="bm">
	<div class="bm-hero"><small>প্রতিদিন সকালে হালনাগাদ · সরকারি উৎস: OEP</small>
		<h2>আজকের বিএমইটি রিপোর্ট — <?php echo esc_html( pb_bdate( $last ) ); ?></h2>
		<div class="bm-big"><?php echo pb_num( $L['t'] ); ?> জন</div>
		<p><?php echo pb_bn( count( $L['c'] ) ); ?>টি দেশে কাজের জন্য বহির্গমন ছাড়পত্র (স্মার্ট কার্ড) · নারী কর্মী <?php echo pb_num( $L['f'] ); ?> জন · এই মাসে এখন পর্যন্ত <?php echo pb_num( $mt ); ?> জন</p></div>
	<div class="bm-live" id="bm-live" hidden><span class="dot"></span><span class="lt">লাইভ</span><span><span id="lv-d"></span> — এখন পর্যন্ত</span><b class="n" id="lv-t">—</b><span>জন · <span id="lv-c"></span>টি দেশ · নারী <span id="lv-f"></span> জন</span><div class="nw" id="lv-new" hidden></div><span class="cc" id="lv-cc"></span><small id="lv-at"></small></div>
	<div class="bm-bar" role="group" aria-label="সময়">
		<button type="button" data-r="1" class="on">সর্বশেষ দিন</button><button type="button" data-r="7">৭ দিন</button><button type="button" data-r="30">৩০ দিন</button><button type="button" data-r="m0">এই মাস</button><button type="button" data-r="m1">গত মাস</button>
		<select id="bm-month" aria-label="মাস"></select>
		<select id="bm-country" aria-label="দেশ"><option value="">সব দেশ</option></select>
		<button type="button" class="bm-wa" id="bm-share">WhatsApp এ শেয়ার</button>
	</div>
	<div class="bm-kpis"><div class="bm-kpi"><span>মোট ছাড়পত্র</span><b id="k-t">—</b></div><div class="bm-kpi"><span>নারী কর্মী</span><b id="k-f">—</b></div><div class="bm-kpi"><span>গন্তব্য দেশ</span><b id="k-c">—</b></div><div class="bm-kpi"><span>দৈনিক গড়</span><b id="k-a">—</b></div></div>
	<div class="bm-two">
		<div class="bm-card"><h3 id="bm-ttitle">দৈনিক প্রবণতা</h3><div class="bm-trend" id="bm-trend"></div><p class="bm-src" id="bm-range"></p></div>
		<div class="bm-card"><h3>শীর্ষ দেশ</h3><div class="bm-hb" id="bm-top"></div></div>
	</div>
	<div class="bm-card bm-gen" id="card"><h3>📸 রিপোর্ট কার্ড তৈরি করুন — ডাউনলোড ও শেয়ার</h3>
		<div class="gb" role="group" aria-label="কার্ডের ধরন"><button type="button" data-k="live" hidden>🔴 আজ লাইভ</button><button type="button" data-k="day" class="on">দৈনিক</button><button type="button" data-k="week">সাপ্তাহিক</button><button type="button" data-k="month">মাসিক</button><button type="button" data-k="cur">আমার ফিল্টার</button><input type="date" id="bm-cdate" aria-label="যেকোনো তারিখের কার্ড"></div>
		<div class="gw"><canvas id="bm-cv" width="1080" height="1350" aria-label="বিএমইটি রিপোর্ট কার্ড"></canvas>
		<div class="ga"><button type="button" class="bm-dl" id="bm-dl">⬇ JPEG ডাউনলোড করুন</button><button type="button" class="bm-sh" id="bm-sh">📤 ফেসবুক / হোয়াটসঅ্যাপে শেয়ার</button>
		<p>কার্ডে রিপোর্টের তারিখ, তৈরির সময়, সরকারি তথ্যসূত্র (OEP/বিএমইটি) ও আমাদের ওয়েবসাইটের লিংক থাকে — ফেসবুক, ইনস্টাগ্রাম বা হোয়াটসঅ্যাপ স্ট্যাটাসে সরাসরি পোস্ট করুন। ক্যালেন্ডার থেকে যেকোনো তারিখ বাছলে সেই দিনের কার্ড হবে; "আমার ফিল্টার" বাছলে ওপরের সময় ও দেশ অনুযায়ী।</p></div></div></div>
	<div class="bm-card"><h3>মাসভিত্তিক হিসাব</h3><div class="bm-hb" id="bm-months"></div></div>
	<h2>সর্বশেষ দিনের দেশভিত্তিক তালিকা (<?php echo esc_html( pb_bdate( $last ) ); ?>)</h2>
	<table><thead><tr><th>ক্রম</th><th>দেশ</th><th>কর্মী</th></tr></thead><tbody><?php echo $rows; ?></tbody></table>
	<p class="bm-src">তথ্যসূত্র: বাংলাদেশ সরকারের ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (OEP) — <a href="<?php echo esc_url( $src ); ?>" target="_blank" rel="noopener nofollow">oep.gov.bd কান্ট্রি ক্লিয়ারেন্স রিপোর্ট</a>। প্রতিদিন সকালে আগের দিনের তথ্য যুক্ত হয়; সরকারি তথ্যে পরে সামান্য সংশোধন হতে পারে। প্রবাসী ইনফো স্বাধীন তথ্যসেবা।</p>
</div>
<?php
	$html = ob_get_clean();
	/* Data + scripts go to the footer: ad scripts (Ezoic) inject placeholders inside post content,
	   which broke the inline JSON. */
	ob_start(); ?>
<script id="bm-data" type="application/json"><?php echo $json; ?></script>
<script>
(function(){
	var D=JSON.parse(document.getElementById('bm-data').textContent).days, keys=Object.keys(D).sort(), $=function(i){return document.getElementById(i)};
	var bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})}, num=function(n){return bn(Math.round(n).toLocaleString('en-IN'))};
	var BM=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
	var bdate=function(k){var p=k.split('-');return bn(+p[2])+' '+BM[+p[1]-1]+' '+bn(p[0]);}, mlabel=function(m){var p=m.split('-');return BM[+p[1]-1]+' '+bn(p[0]);};
	var BNC={'Saudi Arabia':'সৌদি আরব','Singapore':'সিঙ্গাপুর','Maldives':'মালদ্বীপ','Kuwait':'কুয়েত','Qatar':'কাতার','United Arab Emirates (UAE)':'আমিরাত','Jordan':'জর্ডান','Italy':'ইতালি','Lebanon':'লেবানন','Russian Federation':'রাশিয়া','Oman':'ওমান','Bahrain':'বাহরাইন','Malaysia':'মালয়েশিয়া','Japan':'জাপান','Greece':'গ্রিস','Romania':'রোমানিয়া','Croatia':'ক্রোয়েশিয়া','Poland':'পোল্যান্ড','Serbia':'সার্বিয়া','Portugal':'পর্তুগাল','United Kingdom':'যুক্তরাজ্য','Mauritius':'মরিশাস','Brunei Darussalam':'ব্রুনাই','Iraq':'ইরাক','Libya':'লিবিয়া','Cyprus':'সাইপ্রাস','Hungary':'হাঙ্গেরি','Bulgaria':'বুলগেরিয়া','Hong Kong':'হংকং','Turkey':'তুরস্ক','Albania':'আলবেনিয়া','Bosnia and Herzegovina':'বসনিয়া'};
	var cn=function(c){return BNC[c]||c};
	var months=[];keys.forEach(function(k){var m=k.slice(0,7); if(months.indexOf(m)<0) months.push(m);});
	var all={};keys.forEach(function(k){for(var c in D[k].c) all[c]=(all[c]||0)+D[k].c[c];});
	$('bm-country').innerHTML+=Object.keys(all).sort(function(a,b){return all[b]-all[a]}).map(function(c){return '<option value="'+c.replace(/"/g,'&quot;')+'">'+cn(c)+'</option>'}).join('');
	$('bm-month').innerHTML='<option value="">মাস বাছুন</option>'+months.slice().reverse().map(function(m){return '<option value="'+m+'">'+mlabel(m)+'</option>'}).join('');
	var sel=keys.slice(-1), country='';
	function val(k){ var r=D[k]; return country ? (r.c[country]||0) : r.t; }
	function render(){
		var t=0,f=0,cs={}; sel.forEach(function(k){ var r=D[k]; t+=val(k); if(!country) f+=r.f; for(var c in r.c) cs[c]=(cs[c]||0)+r.c[c]; });
		$('k-t').textContent=num(t); $('k-f').textContent=country?'—':num(f); $('k-c').textContent=country?cn(country):bn(Object.keys(cs).length); $('k-a').textContent=num(t/Math.max(1,sel.length));
		var mx=Math.max.apply(null,sel.map(val).concat([1]));
		$('bm-trend').innerHTML=sel.map(function(k){ var v=val(k); return '<div style="height:'+Math.max(2,v*100/mx)+'%" title="'+bdate(k)+': '+num(v)+' জন"></div>'; }).join('');
		$('bm-ttitle').textContent=(country?cn(country)+' — ':'')+'দৈনিক প্রবণতা';
		$('bm-range').textContent=sel.length>1?bdate(sel[0])+' থেকে '+bdate(sel[sel.length-1])+' · '+bn(sel.length)+' দিন':bdate(sel[0]);
		var top=Object.keys(cs).sort(function(a,b){return cs[b]-cs[a]}).slice(0,10), tm=cs[top[0]]||1;
		$('bm-top').innerHTML=top.map(function(c){ return '<div class="r"><span>'+cn(c)+'</span><span class="t"><i style="width:'+(cs[c]*100/tm)+'%"></i></span><b>'+num(cs[c])+'</b></div>'; }).join('');
		var mt={}; keys.forEach(function(k){ var m=k.slice(0,7); mt[m]=(mt[m]||0)+val(k); }); var mm=Math.max.apply(null,Object.values(mt).concat([1]));
		$('bm-months').innerHTML=months.slice().reverse().map(function(m){ return '<div class="r"><span>'+mlabel(m)+'</span><span class="t"><i style="width:'+(mt[m]*100/mm)+'%"></i></span><b>'+num(mt[m])+'</b></div>'; }).join('');
		if(typeof kind!=='undefined'&&kind==='cur') drawCard();
		window.__bmShare='বিএমইটি রিপোর্ট — '+$('bm-range').textContent+'\nমোট '+num(t)+' জন'+(country?' ('+cn(country)+')':'')+'\n'+top.slice(0,5).map(function(c){return cn(c)+': '+num(cs[c])}).join('\n');
	}
	document.querySelectorAll('.bm-bar [data-r]').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('.bm-bar [data-r]').forEach(function(x){x.classList.remove('on')}); b.classList.add('on'); $('bm-month').value=''; var r=b.dataset.r;
		if(r==='m0'||r==='m1'){ var m=months[months.length-(r==='m0'?1:2)]; sel=keys.filter(function(k){return k.indexOf(m)===0}); } else sel=keys.slice(-(+r)); render(); }; });
	$('bm-month').onchange=function(){ if(!this.value) return; document.querySelectorAll('.bm-bar [data-r]').forEach(function(x){x.classList.remove('on')}); var m=this.value; sel=keys.filter(function(k){return k.indexOf(m)===0}); render(); };
	$('bm-country').onchange=function(){ country=this.value; render(); };
	$('bm-share').onclick=function(){ window.open('https://wa.me/?text='+encodeURIComponent((window.__bmShare||'')+'\n\nলাইভ: '+location.href.split('#')[0]),'_blank'); };
	render();
	var LIVE=null, kind='day', cday='', CS=function(c){return cn(c).replace('সংযুক্ত আরব আমিরাত','আমিরাত')};
	function aggr(ks){ var t=0,f=0,cs={}; ks.forEach(function(k){ var r=D[k]; if(!r) return; t+=r.t; f+=r.f; for(var c in r.c) cs[c]=(cs[c]||0)+r.c[c]; }); return {t:t,f:f,cs:cs,n:ks.filter(function(k){return D[k]}).length}; }
	function topRows(cs){ return Object.keys(cs).sort(function(a,b){return cs[b]-cs[a]}).map(function(c){return [CS(c),cs[c]]}); }
	function pctTxt(a,b,w){ if(!b||a===b) return ''; var p=Math.round((a-b)*100/b); return p?w+' চেয়ে '+(p>0?'▲':'▼')+' '+bn(Math.abs(p))+'%':''; }
	function cardOpts(){
		var last=keys[keys.length-1];
		if(kind==='live'&&LIVE){ return {kind:bdate(LIVE.date)+' এর বিএমইটি রিপোর্ট',period:'লাইভ · এখন পর্যন্ত (দিন শেষে আরও বাড়বে)',t:LIVE.t,f:LIVE.f,nc:Object.keys(LIVE.c).length,rows:topRows(LIVE.c),file:'live-'+LIVE.date}; }
		if(kind==='week'){ var w=keys.slice(-7), pw=keys.slice(-14,-7), a=aggr(w), b=aggr(pw); return {kind:'সাপ্তাহিক বিএমইটি রিপোর্ট',period:bdate(w[0])+' – '+bdate(last),t:a.t,f:a.f,nc:Object.keys(a.cs).length,avg:a.t/Math.max(1,a.n),cmp:pctTxt(a.t,b.t,'আগের সপ্তাহের'),rows:topRows(a.cs),file:'weekly-'+last}; }
		if(kind==='month'){ var m=last.slice(0,7), ks=keys.filter(function(k){return k.indexOf(m)===0}), a2=aggr(ks); return {kind:mlabel(m)+' মাসের বিএমইটি রিপোর্ট',period:'১ – '+bdate(last)+' পর্যন্ত',t:a2.t,f:a2.f,nc:Object.keys(a2.cs).length,avg:a2.t/Math.max(1,a2.n),rows:topRows(a2.cs),file:'monthly-'+m}; }
		if(kind==='cur'){ var a3=aggr(sel), per=sel.length>1?bdate(sel[0])+' – '+bdate(sel[sel.length-1]):bdate(sel[0]);
			if(country){ var t=0; sel.forEach(function(k){t+=D[k].c[country]||0}); return {kind:CS(country)+' — বিএমইটি রিপোর্ট',period:per,t:t,f:0,nc:1,avg:sel.length>1?t/sel.length:0,rows:sel.slice(-7).reverse().map(function(k){return [bdate(k),D[k].c[country]||0]}),rowsTitle:'দিনভিত্তিক হিসাব',file:'country-'+sel[sel.length-1]}; }
			return {kind:'বিএমইটি রিপোর্ট',period:per,t:a3.t,f:a3.f,nc:Object.keys(a3.cs).length,avg:sel.length>1?a3.t/a3.n:0,rows:topRows(a3.cs),file:'report-'+sel[sel.length-1]}; }
		var d=(cday&&D[cday])?cday:last, i=keys.indexOf(d), a4=aggr([d]), b4=aggr(i>0?[keys[i-1]]:[]);
		return {kind:bdate(d)+' এর বিএমইটি রিপোর্ট',period:'দৈনিক বহির্গমন ছাড়পত্রের হিসাব',t:a4.t,f:a4.f,nc:Object.keys(a4.cs).length,cmp:pctTxt(a4.t,b4.t,'আগের দিনের'),rows:topRows(a4.cs),file:d};
	}
	var fontsReady=(document.fonts&&document.fonts.load)?Promise.all(['800 40px "Anek Bangla"','700 40px "Anek Bangla"','600 20px "Hind Siliguri"','500 20px "Hind Siliguri"'].map(function(f){return document.fonts.load(f,'বাংলা')})).catch(function(){}):Promise.resolve();
	function drawCard(){ fontsReady.then(function(){ bmCard($('bm-cv'),cardOpts()); }); }
	function blob(cb){ $('bm-cv').toBlob(cb,'image/jpeg',.93); }
	function pick(k){ document.querySelectorAll('.bm-gen [data-k]').forEach(function(x){x.classList.toggle('on',x.dataset.k===k)}); kind=k; drawCard(); }
	document.querySelectorAll('.bm-gen [data-k]').forEach(function(b){ b.onclick=function(){ if(b.dataset.k==='day'){cday='';$('bm-cdate').value='';} pick(b.dataset.k); }; });
	$('bm-cdate').min=keys[0]; $('bm-cdate').max=keys[keys.length-1];
	$('bm-cdate').onchange=function(){ if(!D[this.value]){ alert('এই তারিখের তথ্য নেই — '+bdate(keys[0])+' থেকে '+bdate(keys[keys.length-1])+' এর মধ্যে বাছুন।'); return; } cday=this.value; pick('day'); };
	$('bm-dl').onclick=function(){ var o=cardOpts(); blob(function(bl){ var a=document.createElement('a'); a.href=URL.createObjectURL(bl); a.download='bmet-report-'+o.file+'.jpg'; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href); a.remove();},1500); }); };
	$('bm-sh').onclick=function(){ var o=cardOpts(), txt=o.kind+': মোট '+num(o.t)+' জন। লাইভ রিপোর্ট: https://probashiinfo.com/bmet-report/';
		blob(function(bl){ var f=new File([bl],'bmet-report-'+o.file+'.jpg',{type:'image/jpeg'});
			if(navigator.canShare&&navigator.canShare({files:[f]})) navigator.share({files:[f],title:o.kind,text:txt}).catch(function(){});
			else { $('bm-dl').click(); window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent('https://probashiinfo.com/bmet-report/'),'_blank'); } }); };
	var NEWC={};
	function live(){ fetch('/wp-json/pa/v1/bmet-live?_='+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(L){
		if(!L||!L.t) return;
		var prev=LIVE, add=[];
		if(prev&&prev.date===L.date){ for(var c in L.c){ var dlt=L.c[c]-(prev.c[c]||0); if(dlt>0){ add.push([c,dlt]); NEWC[c]=1; } } }
		LIVE=L; $('bm-live').hidden=false; document.querySelector('.bm-gen [data-k=live]').hidden=false;
		$('lv-d').textContent=bdate(L.date); $('lv-t').textContent=num(L.t); $('lv-f').textContent=num(L.f); $('lv-c').textContent=bn(Object.keys(L.c).length);
		if(add.length){ $('lv-t').classList.add('up'); setTimeout(function(){$('lv-t').classList.remove('up')},4000);
			$('lv-new').hidden=false; $('lv-new').textContent='🆕 নতুন যুক্ত হয়েছে: '+add.sort(function(a,b){return b[1]-a[1]}).map(function(a){return CS(a[0])+' +'+num(a[1])+' জন'}).join(', '); }
		$('lv-cc').innerHTML=Object.keys(L.c).sort(function(a,b){return L.c[b]-L.c[a]}).slice(0,12).map(function(c){return '<span'+(NEWC[c]?' class="new"':'')+'>'+CS(c)+' '+num(L.c[c])+'</span>'}).join('');
		var d=new Date(L.at*1000); $('lv-at').textContent='সর্বশেষ চেক: '+bn(d.toLocaleTimeString('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',minute:'2-digit'}))+' · প্রতি ৩ মিনিটে সরকারি OEP থেকে নিজে হালনাগাদ হয় · দিনের শেষে সংখ্যা আরও বাড়বে';
		if(kind==='live') drawCard(); }).catch(function(){}); }
	live(); setInterval(function(){ if(!document.hidden) live(); },180000);
	document.addEventListener('visibilitychange',function(){ if(!document.hidden) live(); });
	drawCard();
})();
/*@CARD*/
function bmCard(cv, o) {
	var W = cv.width, H = cv.height, x = cv.getContext('2d'), wide = W > H;
	var bn = function (s) { return String(s).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
	var num = function (n) { return bn(Math.round(n).toLocaleString('en-IN')); };
	var HF = '"Anek Bangla","Hind Siliguri","Noto Sans Bengali",sans-serif', TF = '"Hind Siliguri","Anek Bangla","Noto Sans Bengali",sans-serif';
	function rr(X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
	function txt(s, X, Y, font, col, al) { x.font = font; x.fillStyle = col; x.textAlign = al || 'left'; x.fillText(s, X, Y); }
	function fit(s, font, max) { x.font = font; while (s.length > 3 && x.measureText(s).width > max) s = s.slice(0, -2) + '…'; return s; }
	// background
	var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#061f4d'); g.addColorStop(.55, '#0a3f97'); g.addColorStop(1, '#0b56c4');
	x.fillStyle = g; x.fillRect(0, 0, W, H);
	var rg = x.createRadialGradient(W * .92, H * .02, 0, W * .92, H * .02, W * .6); rg.addColorStop(0, 'rgba(34,197,94,.45)'); rg.addColorStop(1, 'rgba(34,197,94,0)');
	x.fillStyle = rg; x.fillRect(0, 0, W, H);
	x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 2;
	for (var i = 0; i < 9; i++) { x.beginPath(); x.arc(W * .95, H * .05, 90 + i * 70, 0, Math.PI * 2); x.stroke(); }
	x.fillStyle = '#22c55e'; x.fillRect(0, 0, W, wide ? 10 : 14);
	var P = wide ? 48 : 64, s = wide ? 1 : 1.3;
	// brand row
	x.fillStyle = '#22c55e'; x.beginPath(); x.arc(P + 14 * s, (wide ? 52 : 84), 14 * s, 0, Math.PI * 2); x.fill();
	txt('প্রবাসী ইনফো', P + 38 * s, (wide ? 62 : 97), '700 ' + Math.round(30 * s) + 'px ' + HF, '#fff');
	var pill = 'সরকারি তথ্য: OEP · BMET'; x.font = '600 ' + Math.round(19 * s) + 'px ' + TF; var pw = x.measureText(pill).width + 34 * s;
	rr(W - P - pw, (wide ? 34 : 60), pw, 38 * s, 19 * s); x.fillStyle = 'rgba(255,255,255,.13)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.5; x.stroke();
	txt(pill, W - P - pw / 2, (wide ? 34 : 60) + 26 * s, '600 ' + Math.round(19 * s) + 'px ' + TF, '#e6f0ff', 'center');
	var L = wide ? W * .5 : W - 2 * P, y = wide ? 128 : 205;
	// headline
	var hs = wide ? 40 : 66; x.font = '800 ' + hs + 'px ' + HF; while (hs > 22 && x.measureText(o.kind).width > (wide ? L : W - 2 * P)) { hs -= 2; x.font = '800 ' + hs + 'px ' + HF; }
	txt(o.kind, P, y, '800 ' + hs + 'px ' + HF, '#fff'); y += wide ? 40 : 66;
	txt(o.period, P, y, '600 ' + Math.round(wide ? 24 : 38) + 'px ' + TF, '#bcd3fb'); y += wide ? 26 : 44;
	// big number panel
	var bh = wide ? 210 : 300; rr(P, y, L, bh, 26 * s); x.fillStyle = '#fff'; x.fill();
	txt('মোট বহির্গমন ছাড়পত্র (স্মার্ট কার্ড)', P + 28 * s, y + (wide ? 42 : 62), '600 ' + Math.round(wide ? 21 : 30) + 'px ' + TF, '#4a5d7d');
	x.font = '800 ' + (wide ? 92 : 150) + 'px ' + HF; var bt = num(o.t), bw2 = x.measureText(bt).width;
	txt(bt, P + 26 * s, y + (wide ? 132 : 190), '800 ' + (wide ? 92 : 150) + 'px ' + HF, '#0b3f97');
	txt('জন', P + 40 * s + bw2, y + (wide ? 132 : 190), '700 ' + (wide ? 34 : 54) + 'px ' + HF, '#16a34a');
	var chips = [bn(o.nc) + 'টি দেশ', 'নারী ' + num(o.f) + ' জন']; if (o.avg) chips.push('দৈনিক গড় ' + num(o.avg)); if (o.cmp) chips.push(o.cmp);
	var cx = P + 26 * s, cy = y + bh - (wide ? 50 : 74), cf = '600 ' + Math.round(wide ? 17 : 26) + 'px ' + TF;
	chips.forEach(function (c, k) { x.font = cf; var w = x.measureText(c).width + 26 * s; if (cx + w > P + L - 16) return; rr(cx, cy, w, (wide ? 34 : 50), (wide ? 17 : 25)); var up = c.indexOf('▲') >= 0, dn = c.indexOf('▼') >= 0; x.fillStyle = up ? '#dcfce7' : dn ? '#fee2e2' : '#eef4ff'; x.fill(); txt(c, cx + w / 2, cy + (wide ? 23 : 34), cf, up ? '#166534' : dn ? '#991b1b' : '#0b3f97', 'center'); cx += w + 10 * s; });
	y += bh + (wide ? 0 : 34);
	// rows panel
	var RX = wide ? W * .5 + P * .9 : P, RY = wide ? 112 : y, RW = wide ? W - RX - P : L, n = wide ? 6 : 7, rh = wide ? 54 : 56;
	var RH = (wide ? 52 : 74) + n * rh + 14;
	rr(RX, RY, RW, RH, 26 * s); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.stroke();
	txt(o.rowsTitle || 'শীর্ষ গন্তব্য দেশ', RX + 24 * s, RY + (wide ? 36 : 52), '700 ' + Math.round(wide ? 22 : 34) + 'px ' + HF, '#fff');
	var rows = (o.rows || []).slice(0, n), mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
	var nameW = wide ? 128 : 230, numW = wide ? 72 : 120, barX = RX + 24 * s + (wide ? 34 : 54) + nameW, barW = RW - (barX - RX) - numW - 20 * s;
	rows.forEach(function (r, k) {
		var yy = RY + (wide ? 58 : 84) + k * rh, ff = '600 ' + Math.round(wide ? 19 : 29) + 'px ' + TF;
		x.fillStyle = k === 0 ? '#22c55e' : 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(RX + 24 * s + (wide ? 13 : 20), yy + rh / 2 - 4, wide ? 13 : 20, 0, Math.PI * 2); x.fill();
		txt(bn(k + 1), RX + 24 * s + (wide ? 13 : 20), yy + rh / 2 + (wide ? 2 : 5), '700 ' + Math.round(wide ? 15 : 22) + 'px ' + HF, '#fff', 'center');
		txt(fit(r[0], ff, nameW - 8), RX + 24 * s + (wide ? 34 : 54), yy + rh / 2 + (wide ? 2 : 5), ff, '#fff');
		rr(barX, yy + rh / 2 - (wide ? 10 : 13), barW, wide ? 14 : 20, wide ? 7 : 10); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill();
		var bg = x.createLinearGradient(barX, 0, barX + barW, 0); bg.addColorStop(0, '#60a5fa'); bg.addColorStop(1, '#22c55e');
		rr(barX, yy + rh / 2 - (wide ? 10 : 13), Math.max(wide ? 14 : 20, barW * r[1] / mx), wide ? 14 : 20, wide ? 7 : 10); x.fillStyle = bg; x.fill();
		txt(num(r[1]), RX + RW - 22 * s, yy + rh / 2 + (wide ? 2 : 5), '700 ' + Math.round(wide ? 20 : 30) + 'px ' + HF, '#fff', 'right');
	});
	// footer: source, website, generated time
	var now = new Date(), tz = { timeZone: 'Asia/Dhaka' };
	var hh = +now.toLocaleString('en-GB', Object.assign({ hour: 'numeric', hour12: false }, tz)), mm = now.toLocaleString('en-GB', Object.assign({ minute: '2-digit' }, tz));
	var BM = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
	var dd = now.toLocaleString('en-GB', Object.assign({ day: 'numeric' }, tz)), mo = +now.toLocaleString('en-GB', Object.assign({ month: 'numeric' }, tz)), yr = now.toLocaleString('en-GB', Object.assign({ year: 'numeric' }, tz));
	var part = hh < 5 ? 'রাত' : hh < 12 ? 'সকাল' : hh < 15 ? 'দুপুর' : hh < 18 ? 'বিকাল' : hh < 20 ? 'সন্ধ্যা' : 'রাত';
	var stamp = 'তৈরি: ' + bn(dd) + ' ' + BM[mo - 1] + ' ' + bn(yr) + ', ' + part + ' ' + bn(((hh + 11) % 12) + 1) + ':' + bn(('0' + mm).slice(-2));
	var fy = H - (wide ? 62 : 150), ff2 = '500 ' + Math.round(wide ? 16 : 25) + 'px ' + TF;
	x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(P, fy - (wide ? 24 : 40), W - 2 * P, 1.5);
	if (wide) {
		txt('তথ্যসূত্র: বিএমইটি / ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (oep.gov.bd)', P, fy, ff2, '#bcd3fb');
		txt(stamp, P, fy + 28, ff2, '#bcd3fb');
		txt('probashiinfo.com/bmet-report', W - P, fy + 14, '700 22px ' + HF, '#fff', 'right');
	} else {
		txt('তথ্যসূত্র: বিএমইটি / ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (oep.gov.bd)', P, fy, ff2, '#bcd3fb');
		txt(stamp + ' · রিপোর্ট তৈরি করেছে প্রবাসী ইনফো', P, fy + 38, ff2, '#bcd3fb');
		rr(P, fy + 62, W - 2 * P, 58, 29); x.fillStyle = '#22c55e'; x.fill();
		txt('🌐 লাইভ রিপোর্ট: probashiinfo.com/bmet-report', W / 2, fy + 101, '700 29px ' + HF, '#053b1d', 'center');
	}
}
/*@CARD-END*/
</script>
<?php
	$GLOBALS['pa_bm_foot'] = ob_get_clean();
	return $html;
}, 999 );
add_action( 'wp_footer', function () {
	if ( ! empty( $GLOBALS['pa_bm_foot'] ) ) echo $GLOBALS['pa_bm_foot'];
}, 5 );
