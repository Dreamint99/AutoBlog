<?php
/* প্রবাসী ইনফো — brand skin v4 (Nov 2026). LOOK ONLY: colours, logo, cards, header, footer.
   Sits on top of the app shell (#14 probashiinfo-app.php) and the data pages (#32), which use the same
   CSS variables. It prints one <style> after wp_head and touches NO markup, so Rank Math titles/meta/FAQ
   schema, URLs, Adsterra code and the in-house ad blocks (.ad-*) stay exactly as they are.
   Brand = the Probashi app: sunset red→orange (#E11D48→#F97316), plum ink (#3A2150), calm white cards.
   Rollout: PI_SKIN_PUBLIC false = only with ?v4=1 (cookie; ?v4=0 clears). Rollback = deactivate snippet. */
if ( ! defined( 'PI_SKIN_PUBLIC' ) ) define( 'PI_SKIN_PUBLIC', false );
if ( ! defined( 'PI_SKIN_VERSION' ) ) define( 'PI_SKIN_VERSION', '4.0.0' );

function pi_skin_on() {
	static $on = null;
	if ( $on !== null ) return $on;
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return $on = false;
	if ( isset( $_GET['v4'] ) ) {
		$want = $_GET['v4'] === '1';
		if ( ! headers_sent() ) setcookie( 'pi_v4', $want ? '1' : '', $want ? time() + 30 * DAY_IN_SECONDS : time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN, is_ssl(), true );
		return $on = $want;
	}
	return $on = ( PI_SKIN_PUBLIC || ! empty( $_COOKIE['pi_v4'] ) );
}

add_action( 'init', function () {
	if ( PI_SKIN_PUBLIC && get_option( 'pi_skin_purged' ) !== PI_SKIN_VERSION ) {
		update_option( 'pi_skin_purged', PI_SKIN_VERSION, false );
		do_action( 'litespeed_purge_all' );
	}
} );

add_action( 'wp_head', function () {
	if ( ! pi_skin_on() ) return;
	$mark = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23E11D48'/%3E%3Cstop offset='1' stop-color='%23F97316'/%3E%3C/linearGradient%3E%3CclipPath id='c'%3E%3Crect width='64' height='64' rx='16'/%3E%3C/clipPath%3E%3C/defs%3E%3Cg clip-path='url(%23c)'%3E%3Crect width='64' height='64' fill='url(%23a)'/%3E%3Cpath d='M0 50c10-4 22-4 32-1s20 3 32-1v16H0z' fill='%23B3123A' opacity='.55'/%3E%3Ccircle cx='37' cy='27' r='15' fill='%23FFF7EC'/%3E%3Ccircle cx='37' cy='20' r='3.2' fill='%23E11D48'/%3E%3Crect x='34' y='25.5' width='6' height='12.5' rx='3' fill='%23E11D48'/%3E%3Cg fill='%23FFE2B8'%3E%3Ccircle cx='9' cy='47' r='2.4'/%3E%3Ccircle cx='13' cy='41.5' r='1.7'/%3E%3Ccircle cx='17.5' cy='37' r='1.5'/%3E%3Ccircle cx='22' cy='33.6' r='1.3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";
	?>
<meta name="theme-color" content="#E11D48">
<style id="pi-skin">
/* tokens: one brand everywhere (app shell + data pages read these variables) */
body.pi-app{--b:#E11D48;--b2:#BE123C;--nv:#3A2150;--g:#F97316;--g2:#FB923C;--gs:#FFF1E6;--bs:#FFEEF1;--red:#E11D48;--gold:#FFC24B;
 --ink:#24162F;--ink2:#4B3D57;--mut:#7A6E80;--line:#EEE8F0;--bg:#F7F5F8;--card:#fff;--r:18px;
 --sh:0 1px 2px rgba(58,33,80,.05),0 10px 28px -18px rgba(58,33,80,.30)}
body.pi-app ::selection{background:#FFE1E7}

/* logo: CSS-drawn mark + Bangla wordmark (crisp at any size, no extra request) */
body.pi-app .logo2,body.pi-app .ft .flogo{display:inline-flex;align-items:center;gap:10px;background:none;padding:0;border-radius:0}
body.pi-app .logo2 img,body.pi-app .ft .flogo img,body.pi-app .drw-h img{display:none}
body.pi-app .logo2:before,body.pi-app .ft .flogo:before,body.pi-app .drw-h:before{content:"";flex:none;width:46px;height:46px;background:url("<?php echo $mark; ?>") center/contain no-repeat;transition:width .25s,height .25s}
body.pi-app .logo2:after,body.pi-app .ft .flogo:after{content:"প্রবাসী ইনফো";font:800 26px/1.3 var(--head);color:var(--nv);white-space:nowrap;padding-top:.1em}
body.pi-app .hdr2.sm .logo2:before{width:38px;height:38px}
body.pi-app .hdr2.sm .logo2:after{font-size:22px}
body.pi-app .drw-h:before{width:40px;height:40px;margin-right:auto}

/* header: white, calm, one accent */
body.pi-app .util{background:var(--nv);color:#E7D9EF}
body.pi-app .util .dot{background:var(--gold)}
body.pi-app .hdr2{background:rgba(255,255,255,.96);box-shadow:0 1px 0 var(--line)}
body.pi-app .hdr2 .top{height:74px}
body.pi-app .hdr2.sm .top{height:62px}
body.pi-app .srch2{background:var(--bg);border:1.5px solid var(--line)}
body.pi-app .srch2:focus-within{border-color:var(--b);box-shadow:0 0 0 4px rgba(225,29,72,.10)}
body.pi-app .srch2 button{background:linear-gradient(120deg,var(--b),var(--g))}
body.pi-app .tl{border-color:var(--line)}
body.pi-app .cat2{background:#fff;border-top:1px solid var(--line)}
body.pi-app .cat2 .w{height:44px}
body.pi-app .cat2 a{color:var(--ink2)!important;font-weight:600}
body.pi-app .cat2 a:hover,body.pi-app .cat2 a.on{color:var(--b)!important;border-bottom-color:var(--b);background:transparent}
body.pi-app .more>button{color:var(--ink2)}
body.pi-app .more:hover>button,body.pi-app .more.open>button{color:var(--b);background:transparent}
body.pi-app .burger span{background:var(--nv)}

/* home hero: route map from Dhaka, recoloured to the sunset brand */
body.pi-app .hero3{background:radial-gradient(700px 380px at 82% 10%,rgba(249,115,22,.30),transparent 62%),linear-gradient(135deg,#2B1640 0%,#3A2150 42%,#7C1D4B 78%,#C2183F 100%)}
body.pi-app .hero3:after{background:linear-gradient(180deg,transparent,rgba(43,22,64,.35))}
body.pi-app .h3k{background:rgba(255,194,75,.14);border-color:rgba(255,194,75,.45);color:#FFE3A3}
body.pi-app .hero3 h1 span{background:linear-gradient(90deg,#FFC24B,#FB923C);-webkit-background-clip:text;background-clip:text;color:transparent;padding:.08em 0}
body.pi-app .hero3 h1{line-height:1.22}
body.pi-app .hero3 p,body.pi-app .hb small{color:#EBDDF0}
body.pi-app .hb{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.18)}
body.pi-app .hb-r{background:linear-gradient(135deg,#E11D48,#F97316)}
body.pi-app #h3g stop{stop-color:#FB923C}
body.pi-app #h3a stop:first-child{stop-color:#FFC24B}
body.pi-app #h3a stop:last-child{stop-color:#FB7185}
body.pi-app .hero3 circle[fill="#22c55e"]{fill:#FFC24B}
body.pi-app .hero3 .h3ring.big{stroke:#FFC24B}
body.pi-app .h3t{fill:#F3E6F5;stroke:#3A2150}
body.pi-app .h3pl path{filter:drop-shadow(0 0 3px rgba(251,146,60,.9))}
body.pi-app .h3c{color:var(--nv)!important}
body.pi-app .hero,body.pi-app .hero2{background:linear-gradient(135deg,#3A2150,#7C1D4B 60%,#C2183F)}
body.pi-app .hero p,body.pi-app .hero2 p{color:#EBDDF0}

/* BMET live strip */
body.pi-app .bml-in{background:linear-gradient(120deg,#3A2150,#6B1E4A 60%,#B3123A);box-shadow:0 20px 40px -24px rgba(58,33,80,.7)}
body.pi-app .bml p,body.pi-app .bml-n small{color:#EBDDF0}
body.pi-app .bml-top b{color:#FFC24B}
body.pi-app .bml-cta{background:#FFC24B;color:#3A1206}

/* calm white cards, no hard borders */
body.pi-app .c,body.pi-app .box,body.pi-app .svc,body.pi-app .ct-tile,body.pi-app .faq details,body.pi-app .art-main,body.pi-app .cms{border-color:transparent;box-shadow:var(--sh)}
body.pi-app .c:hover{box-shadow:0 18px 36px -20px rgba(58,33,80,.38)}
body.pi-app .svc:hover,body.pi-app .ct-tile:hover{border-color:transparent;box-shadow:0 16px 32px -18px rgba(225,29,72,.35)}
body.pi-app .svc i{background:linear-gradient(150deg,#FFF1E6,#FFE4E9)}
body.pi-app .c-img{background:linear-gradient(135deg,#FFEEF1,#FFF1E6)}
body.pi-app .sh h2{line-height:1.35}
body.pi-app .clocks .bd{border-color:#FFD9C2}
body.pi-app .chips a.chip-fl{background:var(--g);border-color:var(--g)}
body.pi-app .box select,body.pi-app .rate,body.pi-app .clocks div,body.pi-app .pray div{border-color:var(--line)}

/* home data tiles (#32): one brand colour instead of a rainbow */
body.pi-app .pbh-t{--c:#E11D48!important;border-color:transparent;box-shadow:var(--sh)}
body.pi-app .pbh-t:before{display:none}
body.pi-app .pbh-t i{background:linear-gradient(150deg,#FFF1E6,#FFE4E9)}
body.pi-app .pbh-t small{color:var(--b2)}
body.pi-app .pbh-t:hover{box-shadow:0 16px 32px -18px rgba(225,29,72,.35)}

/* article: quiet headings, readable table */
body.pi-app .art-hd{border-bottom-color:var(--line)}
body.pi-app .ct h2{background:none;border-left:4px solid var(--b);border-radius:0;padding:2px 0 2px 14px}
body.pi-app .ct h3{color:var(--nv)}
body.pi-app .ct th{background:var(--nv)}
body.pi-app .toc{background:#fff;border-color:var(--line)}
body.pi-app .toc b{color:var(--nv)}

/* light, minimal footer */
body.pi-app .ft{background:#fff;color:var(--ink2);border-top:1px solid var(--line);margin-top:48px}
body.pi-app .ft p,body.pi-app .ft-disc,body.pi-app .ft-base{color:var(--mut)}
body.pi-app .ft h4{color:var(--ink)}
body.pi-app .ft ul a:hover{color:var(--b)}
body.pi-app .ft-disc{border-top-color:var(--line)}
body.pi-app .ft .flogo:after{font-size:24px}

/* phone tab bar */
body.pi-app .tabs{border-color:var(--line);box-shadow:0 14px 34px rgba(58,33,80,.22)}
body.pi-app .tabs .hot{background:linear-gradient(135deg,var(--b),var(--g))}

@media(max-width:640px){
 body.pi-app .hdr2 .top{height:62px}
 body.pi-app .logo2{gap:8px}
 body.pi-app .logo2:before{width:36px;height:36px}
 body.pi-app .logo2:after{font-size:20px}
 body.pi-app .hdr2.sm .logo2:before{width:32px;height:32px}
 body.pi-app .hdr2.sm .logo2:after{font-size:18px}
}
@media(max-width:400px){body.pi-app .logo2:after{display:none}}
</style>
	<?php
}, 100 );
