<?php
/* প্রবাসী বন্ধু Android app promo on probashiinfo.com (Code Snippets, front end).
   The app went live on Google Play on 28 Oct 2026. Works with the v3 app front end (#14), where the old
   website promo (#6) steps aside:
   1) a download card inside every post, after the 2nd paragraph (top part of the article);
   2) a popup after 10 s or 40% scroll, at most once every 3 days.
   Hidden on iPhone/iPad (Android-only app) and for logged-in editors. Colours follow the app's
   sunset theme (#E11D48 → #F97316). */
if ( ! defined( 'PBA_PLAY' ) ) define( 'PBA_PLAY', 'https://play.google.com/store/apps/details?id=com.probashibondu.probashi_bondu' );
if ( ! defined( 'PBA_ICON' ) ) define( 'PBA_ICON', 'https://play-lh.googleusercontent.com/N_cSEMyLrkO0A9HRwkJeYt5p7hjHnT9BV-r078dBAgdhtxvPbM-DQ4nsMib0B5e8zUxhe9PCQg1p_dRdsu_0Gg=s128-rw' );

if ( ! function_exists( 'pba_on' ) ) {
	function pba_on() {
		return ! is_admin() && ! is_user_logged_in() && ! is_feed();
	}
	function pba_link( $medium ) {
		return esc_url( PBA_PLAY . '&referrer=' . rawurlencode( 'utm_source=probashiinfo&utm_medium=' . $medium . '&utm_campaign=app-launch' ) );
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
.pba-pop{position:fixed;inset:0;z-index:99999;display:none;align-items:flex-end;justify-content:center;padding:16px;background:rgba(20,8,10,.55);backdrop-filter:blur(3px)}
@media(min-width:601px){.pba-pop{align-items:center}}
.pba-pop.on{display:flex;animation:pbafade .3s ease}
.pba-box{position:relative;width:100%;max-width:400px;border-radius:24px;overflow:hidden;background:#FFF8F4;color:#2a1216;text-align:center;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);animation:pbaup .35s cubic-bezier(.2,.8,.2,1)}
.pba-top{background:linear-gradient(135deg,#E11D48,#F97316);padding:26px 22px 22px;color:#fff}
.pba-top img{width:84px;height:84px;border-radius:22px;background:#fff;box-shadow:0 8px 20px rgba(0,0,0,.2)}
.pba-top h3{margin:12px 0 2px;font-size:26px;line-height:1.3;color:#fff}
.pba-top p{margin:0;font-size:16px;opacity:.95}
.pba-x{position:absolute;right:12px;top:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.22);color:#fff;font-size:20px;cursor:pointer}
.pba-feat{display:flex;justify-content:center;gap:10px;padding:18px 16px 4px;flex-wrap:wrap}
.pba-feat span{font-size:15px;background:#fff;border:1px solid #fbd5dc;border-radius:12px;padding:8px 10px}
.pba-cta{display:flex;align-items:center;justify-content:center;gap:10px;margin:14px 22px 8px;padding:14px;border-radius:14px;background:#111;color:#fff!important;font-weight:700;font-size:17px;text-decoration:none!important}
.pba-cta svg{width:22px;height:22px}
.pba-later{display:block;width:100%;margin:0 0 14px;background:none;border:0;color:#7a5a60;font-size:15px;cursor:pointer;font-family:inherit}
@keyframes pbafade{from{opacity:0}}@keyframes pbaup{from{transform:translateY(24px);opacity:0}}
</style>
<script>if(/iPhone|iPad|iPod/.test(navigator.userAgent))document.documentElement.className+=' pba-ios';</script>
<style>.pba-ios .pba-card,.pba-ios .pba-pop{display:none!important}</style>
<?php }, 20 );

// Download card after the 2nd paragraph of every post (or at the top when the post is shorter).
add_filter( 'the_content', function ( $content ) {
	if ( ! pba_on() || ! is_singular( 'post' ) || ! is_main_query() || strpos( $content, 'pba-card' ) !== false ) return $content;
	$card = '<a class="pba-card" href="' . pba_link( 'post-card' ) . '" target="_blank" rel="noopener"><img src="' . esc_url( PBA_ICON ) . '" alt="প্রবাসী বন্ধু অ্যাপ" width="60" height="60" loading="lazy"><div><b>প্রবাসী বন্ধু অ্যাপ এখন প্লে স্টোরে</b><span>নামাজ, টাকার রেট, সোনার দাম, দূতাবাস, সব এক অ্যাপে, ফ্রি</span></div><em>⬇ ডাউনলোড</em></a>';
	$parts = preg_split( '~(</p>)~i', $content, 3, PREG_SPLIT_DELIM_CAPTURE );
	if ( count( $parts ) < 5 ) return $card . $content;
	return $parts[0] . $parts[1] . $parts[2] . $parts[3] . $card . $parts[4];
}, 30 );

// Popup: after 10 s or 40% scroll, at most once every 3 days.
add_action( 'wp_footer', function () { if ( ! pba_on() ) return; ?>
<div class="pba-pop" id="pba-pop" role="dialog" aria-modal="true" aria-label="প্রবাসী বন্ধু অ্যাপ">
	<div class="pba-box">
		<div class="pba-top"><button class="pba-x" type="button" aria-label="বন্ধ করুন">×</button><img src="<?php echo esc_url( PBA_ICON ); ?>" alt="" width="84" height="84"><h3>প্রবাসী বন্ধু</h3><p>নতুন অ্যাপ · একদম ফ্রি</p></div>
		<div class="pba-feat"><span>🕌 নামাজ ও কিবলা</span><span>💱 টাকার রেট</span><span>🏛 দূতাবাস</span><span>🏅 প্রবাস কার্ড</span></div>
		<a class="pba-cta" href="<?php echo pba_link( 'popup' ); ?>" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#34A853" d="M3.6 1.8 13.4 12l-9.8 10.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1z"/><path fill="#FBBC04" d="m16.7 15.3-3.3-3.3 3.3-3.3 3.8 2.2c1 .6 1 1.6 0 2.2z"/><path fill="#EA4335" d="M16.7 15.3 13.4 12l-9.8 10.2c.4.2.9.2 1.4-.1z"/><path fill="#4285F4" d="M16.7 8.7 5 1.9c-.5-.3-1-.3-1.4-.1L13.4 12z"/></svg>Google Play থেকে নিন</a>
		<button class="pba-later" type="button">পরে</button>
	</div>
</div>
<script>(function(){try{if(/iPhone|iPad|iPod/.test(navigator.userAgent))return;var p=document.getElementById('pba-pop'),K='pba-pop-next';if(+localStorage.getItem(K)>Date.now())return;var shown=false;function show(){if(shown||document.querySelector('.pb-pop.on'))return;shown=true;p.classList.add('on');localStorage.setItem(K,Date.now()+3*864e5)}function hide(){p.classList.remove('on')}setTimeout(show,10000);addEventListener('scroll',function(){if(scrollY>(document.body.scrollHeight-innerHeight)*.4)show()},{passive:true});p.querySelector('.pba-x').onclick=hide;p.querySelector('.pba-later').onclick=hide;p.querySelector('.pba-cta').onclick=hide;p.onclick=function(e){if(e.target===p)hide()};addEventListener('keydown',function(e){if(e.key==='Escape')hide()})}catch(e){}})();</script>
<?php }, 30 );

// one LiteSpeed purge per promo version, so cached pages pick it up
add_action( 'init', function () {
	if ( get_option( 'pba_purged' ) !== '1' ) {
		update_option( 'pba_purged', '1', false );
		do_action( 'litespeed_purge_all' );
	}
} );
