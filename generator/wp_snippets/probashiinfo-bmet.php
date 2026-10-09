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
@media(max-width:760px){.bm-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.bm-two{grid-template-columns:minmax(0,1fr)}.bm-hb .r{grid-template-columns:110px 1fr 56px}}
</style>
<div class="bm" id="bm">
	<div class="bm-hero"><small>প্রতিদিন সকালে হালনাগাদ · সরকারি উৎস: OEP</small>
		<h2>আজকের বিএমইটি রিপোর্ট — <?php echo esc_html( pb_bdate( $last ) ); ?></h2>
		<div class="bm-big"><?php echo pb_num( $L['t'] ); ?> জন</div>
		<p><?php echo pb_bn( count( $L['c'] ) ); ?>টি দেশে কাজের জন্য বহির্গমন ছাড়পত্র (স্মার্ট কার্ড) · নারী কর্মী <?php echo pb_num( $L['f'] ); ?> জন · এই মাসে এখন পর্যন্ত <?php echo pb_num( $mt ); ?> জন</p></div>
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
	<div class="bm-card"><h3>মাসভিত্তিক হিসাব</h3><div class="bm-hb" id="bm-months"></div></div>
	<h2>সর্বশেষ দিনের দেশভিত্তিক তালিকা (<?php echo esc_html( pb_bdate( $last ) ); ?>)</h2>
	<table><thead><tr><th>ক্রম</th><th>দেশ</th><th>কর্মী</th></tr></thead><tbody><?php echo $rows; ?></tbody></table>
	<p class="bm-src">তথ্যসূত্র: বাংলাদেশ সরকারের ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (OEP) — <a href="<?php echo esc_url( $src ); ?>" target="_blank" rel="noopener nofollow">oep.gov.bd কান্ট্রি ক্লিয়ারেন্স রিপোর্ট</a>। প্রতিদিন সকালে আগের দিনের তথ্য যুক্ত হয়; সরকারি তথ্যে পরে সামান্য সংশোধন হতে পারে। প্রবাসী ইনফো স্বাধীন তথ্যসেবা।</p>
</div>
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
		window.__bmShare='বিএমইটি রিপোর্ট — '+$('bm-range').textContent+'\nমোট '+num(t)+' জন'+(country?' ('+cn(country)+')':'')+'\n'+top.slice(0,5).map(function(c){return cn(c)+': '+num(cs[c])}).join('\n');
	}
	document.querySelectorAll('.bm-bar [data-r]').forEach(function(b){ b.onclick=function(){ document.querySelectorAll('.bm-bar [data-r]').forEach(function(x){x.classList.remove('on')}); b.classList.add('on'); $('bm-month').value=''; var r=b.dataset.r;
		if(r==='m0'||r==='m1'){ var m=months[months.length-(r==='m0'?1:2)]; sel=keys.filter(function(k){return k.indexOf(m)===0}); } else sel=keys.slice(-(+r)); render(); }; });
	$('bm-month').onchange=function(){ if(!this.value) return; document.querySelectorAll('.bm-bar [data-r]').forEach(function(x){x.classList.remove('on')}); var m=this.value; sel=keys.filter(function(k){return k.indexOf(m)===0}); render(); };
	$('bm-country').onchange=function(){ country=this.value; render(); };
	$('bm-share').onclick=function(){ window.open('https://wa.me/?text='+encodeURIComponent((window.__bmShare||'')+'\n\nলাইভ: '+location.href.split('#')[0]),'_blank'); };
	render();
})();
</script>
<?php
	return ob_get_clean();
}, 999 );
