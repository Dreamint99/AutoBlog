<?php
/* Probashi Info Android app promo on probashiinfo.com (Code Snippets, front end).
   1) a download card inside every post, after the 2nd paragraph;
   2) a small dismissible bottom install bar on mobile only — after scroll or 20s,
      at most once per 7 days, never on the first screen of the first visit.
   The old full-screen pba-pop interstitial is gone (it stacked with AdSense / Ezoic
   and the Adsterra popunder and blocked first-screen content).
   Hidden on iPhone/iPad (Android-only app) and for logged-in editors. */
if ( ! defined( 'PBA_PLAY' ) ) define( 'PBA_PLAY', 'https://play.google.com/store/apps/details?id=com.probashibondu.probashi_bondu' );
if ( ! defined( 'PBA_ICON' ) ) define( 'PBA_ICON', 'https://play-lh.googleusercontent.com/N_cSEMyLrkO0A9HRwkJeYt5p7hjHnT9BV-r078dBAgdhtxvPbM-DQ4nsMib0B5e8zUxhe9PCQg1p_dRdsu_0Gg=s128-rw' );

if ( ! function_exists( 'pba_on' ) ) {
	function pba_on() {
		return ! is_admin() && ! is_user_logged_in() && ! is_feed();
	}
	function pba_link( $medium ) {
		return esc_url( PBA_PLAY . '&referrer=' . rawurlencode( 'utm_source=probashiinfo&utm_medium=' . $medium . '&utm_campaign=web_to_app' ) );
	}
}

add_action( 'wp_head', function () { if ( ! pba_on() ) return; ?>
<style id="pba-css">
.pba-card{display:flex;gap:14px;align-items:center;margin:22px 0;padding:16px 18px;border-radius:18px;background:linear-gradient(135deg,#E11D48,#F97316);color:#fff;text-decoration:none!important;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif;box-shadow:0 12px 28px -14px rgba(225,29,72,.7);transition:transform .2s}
.pba-card:hover{transform:translateY(-2px)}
.pba-card img{flex:none;width:60px;height:60px;border-radius:15px;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.18)}
.pba-card b{display:block;font-size:19px;line-height:1.35;color:#fff}
.pba-card span{display:block;font-size:15px;line-height:1.5;opacity:.92}
.pba-card em{flex:none;margin-left:auto;font-style:normal;background:#fff;color:#E11D48;font-weight:700;font-size:16px;padding:11px 18px;border-radius:12px;white-space:nowrap}
@media(max-width:600px){.pba-card{flex-wrap:wrap}.pba-card em{margin-left:0;width:100%;text-align:center}}
.pba-dock{display:none}
@media(max-width:900px){
.pba-dock{position:fixed;left:0;right:0;bottom:0;z-index:9990;display:flex;align-items:center;gap:10px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));background:linear-gradient(90deg,#E11D48,#F97316);color:#fff;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif;box-shadow:0 -8px 24px rgba(0,0,0,.2)}
.pba-dock[hidden]{display:none!important}
.pba-dock img{width:36px;height:36px;border-radius:9px;background:#fff;flex:none}
.pba-dock p{margin:0;flex:1;min-width:0;font-size:14.5px;line-height:1.3}
.pba-dock p b{display:block;font-size:15px}
.pba-dock p small{opacity:.92;font-size:12.5px}
.pba-dock a{flex:none;background:#fff;color:#E11D48!important;font-weight:800;font-size:14px;padding:8px 14px;border-radius:10px;text-decoration:none!important}
.pba-dock button{flex:none;border:0;background:rgba(255,255,255,.22);color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;line-height:1}
}
@media(min-width:901px){.pba-dock{display:none!important}}
.pba-ios .pba-card,.pba-ios .pba-dock{display:none!important}
</style>
<script>if(/iPhone|iPad|iPod/.test(navigator.userAgent))document.documentElement.className+=' pba-ios';</script>
<?php }, 20 );

add_filter( 'the_content', function ( $content ) {
	if ( ! pba_on() || ! is_singular( 'post' ) || ! is_main_query() || strpos( $content, 'pba-card' ) !== false ) return $content;
	$card = '<a class="pba-card" href="' . pba_link( 'post-card' ) . '" target="_blank" rel="noopener" data-google-vignette="false" data-placement="post-card" data-store="play"><img src="' . esc_url( PBA_ICON ) . '" alt="Probashi Info অ্যাপ" width="60" height="60" loading="lazy"><div><b>আরও আপডেট অ্যাপে</b><span>নামাজ, টাকার রেট, ভিসা চেক, বিএমইটি — এক অ্যাপে, ফ্রি</span></div><em>⬇ ডাউনলোড</em></a>';
	$parts = preg_split( '~(</p>)~i', $content, 3, PREG_SPLIT_DELIM_CAPTURE );
	if ( count( $parts ) < 5 ) return $card . $content;
	return $parts[0] . $parts[1] . $parts[2] . $parts[3] . $card . $parts[4];
}, 30 );

add_action( 'wp_footer', function () { if ( ! pba_on() ) return; ?>
<aside class="pba-dock" id="pba-dock" hidden role="region" aria-label="Probashi Info অ্যাপ">
	<button class="pba-dock-x" type="button" aria-label="বন্ধ করুন">×</button>
	<img src="<?php echo esc_url( PBA_ICON ); ?>" alt="" width="36" height="36">
	<p><b>আরও আপডেট অ্যাপে</b><small>নামাজ, টাকার রেট, ভিসা চেক — ফ্রি</small></p>
	<a href="<?php echo pba_link( 'sticky_bar' ); ?>" target="_blank" rel="noopener" data-google-vignette="false" data-placement="sticky_bar" data-store="play">ডাউনলোড</a>
</aside>
<script>(function(){try{
if(/iPhone|iPad|iPod/.test(navigator.userAgent))return;
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a[href*="play.google.com"]');
  if(!a)return;
  var place=a.getAttribute('data-placement')||'link', store=a.getAttribute('data-store')||'play';
  try{if(typeof gtag==='function')gtag('event','app_download_click',{placement:place,store:store});}catch(err){}
},true);
var bar=document.getElementById('pba-dock'); if(!bar)return;
var K='pba-dock-next';
try{if(+localStorage.getItem(K)>Date.now())return;}catch(e){}
var first=false; try{first=!localStorage.getItem('pba-dock-seen')}catch(e){}
var shown=false;
function pastFold(){return scrollY>Math.min(innerHeight*0.6,400)}
function show(){
  if(shown)return;
  if(first&&!pastFold())return;
  shown=true; bar.hidden=false;
  try{localStorage.setItem('pba-dock-seen','1')}catch(e){}
}
addEventListener('scroll',function(){if(pastFold())show()},{passive:true});
setTimeout(function(){if(!first||pastFold())show()},20000);
bar.querySelector('.pba-dock-x').onclick=function(){bar.hidden=true;try{localStorage.setItem(K,Date.now()+7*864e5)}catch(e){}};
}catch(e){}})();</script>
<?php }, 30 );

add_action( 'init', function () {
	if ( get_option( 'pba_purged' ) !== '2' ) {
		update_option( 'pba_purged', '2', false );
		do_action( 'litespeed_purge_all' );
	}
} );
