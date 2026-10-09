<?php
/* নেটওয়ার্ক ড্যাশবোর্ড — probashiinfo.com/network-dashboard/ (Code Snippets). WordPress admins only.
   AutoBlog generator/network_stats.py (GitHub Actions, hourly) POSTs every site's real numbers to
   /wp-json/pa/v1/net-stats: articles (D1 / WordPress / Supabase), live uptime checks, and visitors
   from Cloudflare + Vercel analytics when those read-only tokens are configured. Nothing is estimated:
   a missing source is shown as "not connected". The page is noindex and never cached. */

add_action( 'rest_api_init', function () {
	register_rest_route( 'pa/v1', '/net-stats', array( 'methods' => 'POST', 'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback' => function ( WP_REST_Request $r ) {
			$d = $r->get_json_params();
			if ( empty( $d['sites'] ) ) return new WP_Error( 'bad', 'sites missing', array( 'status' => 400 ) );
			update_option( 'pa_net_stats', $d, false );
			$h = get_option( 'pa_net_hist' ); $h = is_array( $h ) ? $h : array();
			$row = array( 't' => time() );
			foreach ( $d['sites'] as $s ) $row[ $s['id'] ] = array( ! empty( $s['uptime']['ok'] ) ? 1 : 0, $s['uptime']['ms'] ?? null );
			$h[] = $row; $h = array_slice( $h, -24 * 14 ); // two weeks of hourly checks
			update_option( 'pa_net_hist', $h, false );
			return array( 'ok' => true, 'sites' => count( $d['sites'] ) );
		} ) );
} );

add_action( 'init', function () {
	if ( get_option( 'pa_net_page' ) ) return;
	if ( ! get_page_by_path( 'network-dashboard' ) ) {
		$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'private', 'post_name' => 'network-dashboard', 'post_title' => 'নেটওয়ার্ক ড্যাশবোর্ড', 'post_content' => '' ) );
		if ( $id && ! is_wp_error( $id ) ) update_post_meta( $id, 'rank_math_robots', array( 'noindex', 'nofollow' ) );
	}
	update_option( 'pa_net_page', 1, false );
}, 20 );

add_action( 'template_redirect', function () {
	$asked = 0 === strpos( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ), '/network-dashboard' );
	if ( $asked && ! is_user_logged_in() ) { nocache_headers(); wp_safe_redirect( wp_login_url( home_url( '/network-dashboard/' ) ) ); exit; }
	if ( ! is_page( 'network-dashboard' ) ) return;
	if ( ! defined( 'DONOTCACHEPAGE' ) ) define( 'DONOTCACHEPAGE', true );
	do_action( 'litespeed_control_set_nocache', 'private dashboard' );
	header( 'Cache-Control: no-store, private' );
	header( 'X-Robots-Tag: noindex, nofollow' );
	if ( ! current_user_can( 'manage_options' ) ) { wp_safe_redirect( wp_login_url( home_url( '/network-dashboard/' ) ) ); exit; }
	pa_net_render();
	exit;
}, 1 );

function pa_net_render() {
	$d = get_option( 'pa_net_stats' );
	$h = get_option( 'pa_net_hist' ); $h = is_array( $h ) ? $h : array();
	$bn = function ( $s ) { return strtr( (string) $s, array( '0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯' ) ); };
	?>
<!doctype html>
<html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>নেটওয়ার্ক ড্যাশবোর্ড</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap">
<style>
:root{--bg:#0b1220;--p:#111a2e;--p2:#16223b;--line:#22314f;--ink:#e6edf8;--mut:#8ea0bf;--g:#22c55e;--r:#f43f5e;--am:#f59e0b;--b:#60a5fa;--v:#a78bfa;--hf:"Anek Bangla","Hind Siliguri",system-ui,sans-serif;--tf:"Hind Siliguri",system-ui,sans-serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(900px 500px at 90% -10%,rgba(96,165,250,.14),transparent 60%),var(--bg);color:var(--ink);font:400 15px/1.55 var(--tf)}
.w{max-width:1280px;margin:0 auto;padding:18px 16px 40px}h1,h2,h3,b,.n{font-family:var(--hf)}a{color:var(--b)}
.top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}.top h1{font-size:26px;margin:0}.top .u{color:var(--mut);font-size:13.5px}.top .sp{margin-left:auto;display:flex;gap:8px}
.btn{border:1px solid var(--line);background:var(--p);color:var(--ink);border-radius:10px;padding:7px 12px;font:600 13.5px var(--tf);cursor:pointer;text-decoration:none}
.k{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}
.k div{background:linear-gradient(160deg,var(--p2),var(--p));border:1px solid var(--line);border-radius:16px;padding:14px}.k span{display:block;color:var(--mut);font-size:12.5px}.k b{display:block;font-size:28px;line-height:1.2}.k small{color:var(--mut);font-size:12px}
.note{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.35);color:#fde68a;border-radius:14px;padding:12px 14px;margin-bottom:16px;font-size:14px}.note b{color:#fff}
.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.c{background:var(--p);border:1px solid var(--line);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:10px}
.ch{display:flex;align-items:center;gap:8px}.ch h3{margin:0;font-size:17px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ch a{font-size:12.5px;color:var(--mut);text-decoration:none}
.pl{font-size:11.5px;border-radius:999px;padding:2px 8px;background:var(--p2);color:var(--mut);border:1px solid var(--line);white-space:nowrap}
.st{width:10px;height:10px;border-radius:50%;flex:none}.st.ok{background:var(--g);box-shadow:0 0 0 4px rgba(34,197,94,.15)}.st.bad{background:var(--r);box-shadow:0 0 0 4px rgba(244,63,94,.18)}
.m{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.m div{background:var(--p2);border-radius:10px;padding:7px 8px}.m span{display:block;font-size:11.5px;color:var(--mut)}.m b{font-size:18px}
.bars{display:flex;align-items:flex-end;gap:2px;height:44px}.bars i{flex:1;background:linear-gradient(180deg,var(--b),#3b82f6);border-radius:2px 2px 0 0;min-height:2px;opacity:.9}.bars.v i{background:linear-gradient(180deg,var(--v),#7c3aed)}
.sub{font-size:12px;color:var(--mut);display:flex;justify-content:space-between;gap:8px}
.up{display:flex;gap:1px;height:14px}.up i{flex:1;border-radius:2px;background:var(--g)}.up i.x{background:var(--r)}.up i.n{background:var(--line)}
.slow{color:var(--am)}.dead{color:var(--r)}
.nc{font-size:12.5px;color:var(--mut);background:var(--p2);border:1px dashed var(--line);border-radius:10px;padding:8px;text-align:center}
.big{background:var(--p);border:1px solid var(--line);border-radius:18px;padding:16px;margin-bottom:16px}.big h2{margin:0 0 10px;font-size:18px}
.lg{display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;color:var(--mut);margin-top:8px}.lg span{display:inline-flex;align-items:center;gap:5px}.lg i{width:10px;height:10px;border-radius:3px;display:inline-block}
svg{display:block;width:100%}
.ft{color:var(--mut);font-size:12.5px;margin-top:18px}
@media(max-width:1100px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.k{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:640px){.grid{grid-template-columns:minmax(0,1fr)}.k{grid-template-columns:repeat(2,minmax(0,1fr))}.top .sp{margin-left:0}}
</style></head><body><div class="w">
<?php if ( ! is_array( $d ) || empty( $d['sites'] ) ) { echo '<h1>নেটওয়ার্ক ড্যাশবোর্ড</h1><p>এখনো কোনো ডাটা আসেনি — GitHub-এ "Network dashboard stats" workflow চালান।</p></div></body></html>'; return; }
	$sites = $d['sites']; $gen = strtotime( $d['generated'] );
	$tot = 0; $w7 = 0; $d1 = 0; $up = 0; $vis7 = 0; $hasv = false;
	foreach ( $sites as $s ) {
		$a = $s['articles'] ?? null; if ( $a ) { $tot += (int) $a['total']; $w7 += (int) $a['w7']; $d1 += (int) $a['d1']; }
		if ( ! empty( $s['uptime']['ok'] ) ) $up++;
		if ( ! empty( $s['visitors']['days'] ) ) { $hasv = true; $ks = array_slice( array_keys( $s['visitors']['days'] ), -7 ); foreach ( $ks as $k ) $vis7 += (int) $s['visitors']['days'][ $k ]['uniques']; }
	}
	$pbx = null; foreach ( $sites as $s ) if ( ! empty( $s['pb'] ) ) $pbx = $s['pb'];
?>
<div class="top"><h1>📡 নেটওয়ার্ক ড্যাশবোর্ড</h1><span class="u">সর্বশেষ হালনাগাদ: <?php echo esc_html( $bn( wp_date( 'j M, g:i A', $gen, new DateTimeZone( 'Asia/Dhaka' ) ) ) ); ?> (বাংলাদেশ সময়) · প্রতি ঘণ্টায় নিজে হালনাগাদ হয়</span>
	<span class="sp"><a class="btn" href="<?php echo esc_url( admin_url() ); ?>">WP অ্যাডমিন</a><button class="btn" onclick="location.reload()">↻ রিফ্রেশ</button></span></div>

<div class="k">
	<div><span>মোট সাইট</span><b class="n"><?php echo $bn( count( $sites ) ); ?></b><small>চালু <?php echo $bn( $up ); ?> · বন্ধ <?php echo $bn( count( $sites ) - $up ); ?></small></div>
	<div><span>মোট লেখা</span><b class="n"><?php echo $bn( number_format( $tot ) ); ?></b><small>সব সাইট মিলিয়ে</small></div>
	<div><span>শেষ ২৪ ঘণ্টায় নতুন</span><b class="n"><?php echo $bn( $d1 ); ?></b><small>লেখা</small></div>
	<div><span>শেষ ৭ দিনে নতুন</span><b class="n"><?php echo $bn( $w7 ); ?></b><small>লেখা</small></div>
	<div><span>শেষ ৭ দিনে ভিজিটর</span><b class="n"><?php echo $hasv ? $bn( number_format( $vis7 ) ) : '—'; ?></b><small><?php echo $hasv ? 'ইউনিক ভিজিটর' : 'অ্যানালিটিক্স সংযুক্ত নয়'; ?></small></div>
	<div><span>প্রবাসী বন্ধু কার্ড</span><b class="n"><?php echo $pbx && null !== $pbx['cards'] ? $bn( number_format( $pbx['cards'] ) ) : '—'; ?></b><small>গল্প <?php echo $pbx ? $bn( (int) $pbx['stories'] ) : '—'; ?>টি</small></div>
</div>

<?php $vn = $d['visitors_note'] ?? array(); if ( ! empty( $vn['cloudflare'] ) || ! empty( $vn['vercel'] ) ) : ?>
<div class="note">⚠️ <b>ভিজিটরের সংখ্যা এখনো সংযুক্ত নয়</b> — <?php echo esc_html( trim( ( $vn['cloudflare'] ? 'Cloudflare: ' . $vn['cloudflare'] : '' ) . ( $vn['vercel'] ? ' · Vercel: ' . $vn['vercel'] : '' ), ' ·' ) ); ?>। GitHub (Dreamint99/AutoBlog → Settings → Secrets) এ <b>CF_ANALYTICS_TOKEN</b> ও <b>VERCEL_TOKEN</b> যোগ করলে এখানে আসল ভিজিটর দেখাবে। বাকি সব সংখ্যা আসল।</div>
<?php endif; ?>

<div class="big"><h2>📝 শেষ ৩০ দিনে প্রতিদিন নতুন লেখা</h2><div id="chart"></div><div class="lg" id="lg"></div></div>
<?php if ( $hasv ) : ?><div class="big"><h2>👥 শেষ ৩০ দিনে প্রতিদিনের ভিজিটর</h2><div id="vchart"></div><div class="lg" id="vlg"></div></div><?php endif; ?>

<div class="grid">
<?php foreach ( $sites as $s ) {
	$a = $s['articles'] ?? null; $u = $s['uptime']; $ms = $u['ms'];
	$hist = array(); foreach ( array_slice( $h, -48 ) as $row ) $hist[] = $row[ $s['id'] ][0] ?? null;
	$okc = count( array_filter( $hist, function ( $x ) { return 1 === $x; } ) ); $allc = count( array_filter( $hist, function ( $x ) { return null !== $x; } ) );
	?>
	<div class="c">
		<div class="ch"><span class="st <?php echo $u['ok'] ? 'ok' : 'bad'; ?>" title="<?php echo esc_attr( $u['code'] ); ?>"></span><h3><?php echo esc_html( $s['name'] ); ?></h3><span class="pl"><?php echo esc_html( $s['platform'] ); ?></span></div>
		<div class="sub"><a href="https://<?php echo esc_attr( $s['domain'] ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $s['domain'] ); ?> ↗</a><span class="<?php echo ! $u['ok'] ? 'dead' : ( $ms > 4000 ? 'slow' : '' ); ?>"><?php echo $u['ok'] ? ( '⚡ ' . $bn( number_format( $ms ) ) . ' ms' . ( $ms > 4000 ? ' — ধীর!' : '' ) ) : '⛔ বন্ধ (' . esc_html( $u['code'] ) . ')'; ?></span></div>
		<?php if ( $a ) { $days = $a['daily'] ?? array(); ?>
		<div class="m"><div><span>মোট লেখা</span><b class="n"><?php echo $bn( number_format( (int) $a['total'] ) ); ?></b></div><div><span>৭ দিনে</span><b class="n"><?php echo $bn( (int) $a['w7'] ); ?></b></div><div><span>৩০ দিনে</span><b class="n"><?php echo $bn( (int) $a['m30'] ); ?></b></div></div>
		<div class="bars" title="শেষ ৩০ দিনে প্রতিদিন নতুন লেখা"><?php $mx = max( 1, max( $days ?: array( 0 ) ) ); for ( $i = 29; $i >= 0; $i-- ) { $k = gmdate( 'Y-m-d', $gen - $i * DAY_IN_SECONDS ); $v = (int) ( $days[ $k ] ?? 0 ); echo '<i style="height:' . max( 4, round( $v * 100 / $mx ) ) . '%" title="' . esc_attr( $k . ': ' . $v ) . '"></i>'; } ?></div>
		<div class="sub"><span>সর্বশেষ লেখা: <?php echo $a['latest'] ? esc_html( $bn( human_time_diff( strtotime( $a['latest'] ), time() ) ) ) . ' আগে' : '—'; ?></span><?php if ( isset( $a['comments_hold'] ) ) echo '<span>💬 ' . $bn( (int) $a['comments_ok'] ) . ' · অপেক্ষমাণ ' . $bn( (int) $a['comments_hold'] ) . '</span>'; ?></div>
		<?php } elseif ( ! empty( $s['pb'] ) ) { $p = $s['pb']; ?>
		<div class="m"><div><span>কার্ড</span><b class="n"><?php echo $bn( (int) $p['cards'] ); ?></b></div><div><span>৭ দিনে কার্ড</span><b class="n"><?php echo $bn( (int) $p['cards_w7'] ); ?></b></div><div><span>গল্প</span><b class="n"><?php echo $bn( (int) $p['stories'] ); ?></b></div></div>
		<?php } else { echo '<div class="nc">এই সাইটে লেখার হিসাব নেই (স্ট্যাটিক সাইট)</div>'; } ?>
		<?php if ( ! empty( $s['visitors']['days'] ) ) { $vd = $s['visitors']['days']; $ks = array_keys( $vd ); $v7 = 0; $v30 = 0; foreach ( array_slice( $ks, -7 ) as $k ) $v7 += (int) $vd[ $k ]['uniques']; foreach ( $ks as $k ) $v30 += (int) $vd[ $k ]['uniques']; $vm = max( 1, max( array_map( function ( $x ) { return (int) $x['uniques']; }, $vd ) ) ); ?>
		<div class="m"><div><span>আজ/শেষ দিন</span><b class="n"><?php echo $bn( number_format( (int) end( $vd )['uniques'] ) ); ?></b></div><div><span>৭ দিনে ভিজিটর</span><b class="n"><?php echo $bn( number_format( $v7 ) ); ?></b></div><div><span>৩০ দিনে</span><b class="n"><?php echo $bn( number_format( $v30 ) ); ?></b></div></div>
		<div class="bars v"><?php foreach ( $vd as $k => $x ) echo '<i style="height:' . max( 4, round( (int) $x['uniques'] * 100 / $vm ) ) . '%" title="' . esc_attr( $k . ': ' . $x['uniques'] . ' visitors, ' . ( $x['pageviews'] ?? 0 ) . ' pageviews' ) . '"></i>'; ?></div>
		<?php if ( ! empty( $s['visitors']['top_countries'] ) ) echo '<div class="sub"><span>শীর্ষ দেশ: ' . esc_html( implode( ', ', array_map( function ( $c ) { return $c[0]; }, array_slice( $s['visitors']['top_countries'], 0, 4 ) ) ) ) . '</span></div>'; ?>
		<?php } elseif ( ! empty( $s['visitors']['error'] ) ) { echo '<div class="nc">ভিজিটর: ' . esc_html( $s['visitors']['error'] ) . '</div>'; } else { echo '<div class="nc">ভিজিটর: অ্যানালিটিক্স সংযুক্ত নয়</div>'; } ?>
		<div title="শেষ ৪৮ ঘণ্টার আপটাইম চেক"><div class="up"><?php foreach ( array_pad( $hist, -48, null ) as $x ) echo '<i class="' . ( null === $x ? 'n' : ( $x ? '' : 'x' ) ) . '"></i>'; ?></div><div class="sub" style="margin-top:4px"><span>আপটাইম (৪৮ ঘণ্টা)</span><span><?php echo $allc ? $bn( number_format( $okc * 100 / $allc, 1 ) ) . '%' : 'এখনো হিসাব হচ্ছে'; ?></span></div></div>
	</div>
<?php } ?>
</div>
<?php if ( ! empty( $d['inactive'] ) ) echo '<p class="ft">ডোমেইন ছাড়া পুরোনো সাইট (D1-এ লেখা আছে, লাইভ নয়): ' . esc_html( implode( ', ', array_map( function ( $k, $v ) use ( $bn ) { return $k . ' (' . $bn( $v ) . ')'; }, array_keys( $d['inactive'] ), $d['inactive'] ) ) ) . '</p>'; ?>
<p class="ft">সব সংখ্যা আসল: লেখা — Cloudflare D1, WordPress REST, Supabase; আপটাইম — প্রতি ঘণ্টায় প্রতিটি ডোমেইনে সরাসরি অনুরোধ; ভিজিটর — Cloudflare ও Vercel অ্যানালিটিক্স (টোকেন থাকলে)। এই পাতা শুধু অ্যাডমিন দেখতে পান, সার্চ ইঞ্জিনে যায় না।</p>
</div>
<script>
(function(){
	var S=<?php echo wp_json_encode( array_map( function ( $s ) { return array( 'n' => $s['name'], 'a' => $s['articles']['daily'] ?? null, 'v' => isset( $s['visitors']['days'] ) ? array_map( function ( $x ) { return (int) $x['uniques']; }, $s['visitors']['days'] ) : null ); }, $sites ), JSON_UNESCAPED_UNICODE ); ?>, gen=<?php echo (int) $gen; ?>*1000;
	var COL=['#60a5fa','#22c55e','#f59e0b','#a78bfa','#f43f5e','#2dd4bf','#e879f9','#facc15','#94a3b8'];
	var bn=function(s){return String(s).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})};
	function stacked(id,lg,key){ var days=[]; for(var i=29;i>=0;i--) days.push(new Date(gen-i*864e5).toISOString().slice(0,10));
		var ss=S.map(function(s,j){return {n:s.n,c:COL[j%COL.length],d:s[key]}}).filter(function(s){return s.d});
		var tot=days.map(function(k){ return ss.reduce(function(a,s){return a+(+s.d[k]||0)},0); }), mx=Math.max.apply(null,tot.concat([1])), W=900, H=200, bw=W/days.length;
		var g=''; days.forEach(function(k,i){ var y=H-18; ss.forEach(function(s){ var v=+s.d[k]||0; if(!v) return; var hh=v/mx*(H-30); y-=hh; g+='<rect x="'+(i*bw+2)+'" y="'+y.toFixed(1)+'" width="'+(bw-4)+'" height="'+hh.toFixed(1)+'" rx="2" fill="'+s.c+'"><title>'+s.n+' · '+k+': '+v+'</title></rect>'; });
			if(i%5===0||i===days.length-1) g+='<text x="'+(i*bw+bw/2)+'" y="'+(H-3)+'" text-anchor="middle" font-size="11" fill="#8ea0bf">'+bn(+k.slice(8))+'/'+bn(+k.slice(5,7))+'</text>'; });
		g+='<text x="4" y="12" font-size="11" fill="#8ea0bf">সর্বোচ্চ '+bn(mx)+'</text>';
		document.getElementById(id).innerHTML='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="height:220px">'+g+'</svg>';
		document.getElementById(lg).innerHTML=ss.map(function(s){return '<span><i style="background:'+s.c+'"></i>'+s.n+'</span>'}).join(''); }
	stacked('chart','lg','a'); if(document.getElementById('vchart')) stacked('vchart','vlg','v');
	setTimeout(function(){ location.reload(); },15*60*1000);
})();
</script>
</body></html>
<?php
}
