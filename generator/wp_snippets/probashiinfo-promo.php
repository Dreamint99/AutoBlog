<?php
/* প্রবাসী বন্ধু promo on probashiinfo.com (Code Snippets, front-end).
   Top bar on every page, a card above and below each post, and a popup (max once every 3 days).
   Probashi Bondhu lives at www.probashibondu.online. */
if ( ! defined( 'PB_URL' ) ) define( 'PB_URL', 'https://www.probashibondu.online' );

function pb_link( $path, $medium ) {
	return esc_url( PB_URL . $path . '?utm_source=probashiinfo&utm_medium=' . $medium . '&utm_campaign=probashi-bondhu' );
}

add_action( 'wp_head', function () { if ( function_exists( 'pa_app' ) && pa_app() ) return; ?>
<style id="pb-promo-css">
.pb-bar{position:relative;z-index:9990;background:#0b5d45;color:#fff;font:500 15px/1.4 "Hind Siliguri","Anek Bangla",system-ui,sans-serif;text-align:center;padding:9px 44px}
.pb-bar a{color:#fff;font-weight:700;text-decoration:none;border-bottom:2px solid #f2c14e}
.pb-bar i{display:inline-block;width:9px;height:9px;border-radius:50%;background:#e03a3e;margin-right:8px;vertical-align:1px}
.pb-bar button{position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:0;color:#fff;font-size:20px;cursor:pointer;opacity:.8}
.pb-card{display:flex;gap:16px;align-items:center;margin:26px 0;padding:18px 20px;border-radius:16px;background:linear-gradient(135deg,#0d4a39,#072a20);color:#f3ebdd;text-decoration:none!important;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif;box-shadow:0 10px 30px -14px rgba(7,42,32,.6);transition:transform .2s}
.pb-card:hover{transform:translateY(-2px)}
.pb-card .pb-flag{flex:none;width:52px;height:52px;border-radius:14px;background:#0b5d45;position:relative;border:2px solid rgba(255,255,255,.15)}
.pb-card .pb-flag:after{content:"";position:absolute;width:22px;height:22px;border-radius:50%;background:#e03a3e;left:13px;top:13px}
.pb-card b{display:block;color:#fff;font-size:18px;line-height:1.35}
.pb-card span{display:block;font-size:14.5px;line-height:1.5;opacity:.85;margin-top:2px}
.pb-card em{flex:none;margin-left:auto;font-style:normal;background:#f2c14e;color:#072a20;font-weight:700;font-size:14.5px;padding:10px 16px;border-radius:10px;white-space:nowrap}
.pb-card.pb-big{flex-wrap:wrap;padding:24px}
.pb-card.pb-big .pb-links{flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.pb-card.pb-big .pb-links a{color:#fff;text-decoration:none;font-size:14px;padding:6px 12px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18)}
@media(max-width:600px){.pb-card{flex-wrap:wrap}.pb-card em{margin-left:0;width:100%;text-align:center}}
.pb-pop{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(5,15,11,.55);backdrop-filter:blur(3px)}
.pb-pop.on{display:flex;animation:pbfade .3s ease}
.pb-pop-box{position:relative;width:100%;max-width:420px;border-radius:22px;overflow:hidden;background:#fff;color:#101814;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);animation:pbup .35s cubic-bezier(.2,.8,.2,1)}
.pb-pop-top{background:radial-gradient(120% 100% at 70% 0,#136049,#072a20);color:#fff;padding:26px 24px 22px;position:relative}
.pb-pop-top small{display:inline-block;background:rgba(255,255,255,.14);padding:3px 10px;border-radius:99px;font-size:12.5px}
.pb-pop-top h3{margin:12px 0 4px;font-size:26px;line-height:1.3;color:#fff}
.pb-pop-top p{margin:0;font-size:15px;opacity:.85;line-height:1.55}
.pb-pop-x{position:absolute;right:12px;top:10px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:18px;cursor:pointer}
.pb-pop ul{list-style:none;margin:0;padding:18px 24px 6px}
.pb-pop li{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.5;margin-bottom:10px}
.pb-pop li:before{content:"";flex:none;width:8px;height:8px;margin-top:8px;border-radius:50%;background:#0b5d45}
.pb-pop-cta{display:block;margin:8px 24px 10px;padding:13px;border-radius:12px;background:#0b5d45;color:#fff!important;text-align:center;font-weight:700;font-size:16px;text-decoration:none!important}
.pb-pop-later{display:block;width:100%;margin:0 0 14px;background:none;border:0;color:#66716b;font-size:14px;cursor:pointer;font-family:inherit}
@keyframes pbfade{from{opacity:0}}@keyframes pbup{from{transform:translateY(24px);opacity:0}}
</style>
<?php } );

// Top bar on every page (dismiss remembered for 7 days).
add_action( 'wp_body_open', function () { if ( function_exists( 'pa_app' ) && pa_app() ) return; ?>
<div class="pb-bar" id="pb-bar" hidden><i></i>নতুন: <a href="<?php echo pb_link( '/', 'topbar' ); ?>" target="_blank" rel="noopener">প্রবাসী বন্ধু</a> — প্রবাসে কত দিন হলো গুনুন, নিজের ছবিসহ কার্ড বানান, ফ্রি<button type="button" aria-label="বন্ধ করুন">×</button></div>
<script>(function(){try{var b=document.getElementById('pb-bar');if(+localStorage.getItem('pb-bar-off')>Date.now())return;b.hidden=false;b.querySelector('button').onclick=function(){b.remove();localStorage.setItem('pb-bar-off',Date.now()+7*864e5)}}catch(e){}})();</script>
<?php } );

// Card above and below every single post.
add_filter( 'the_content', function ( $content ) {
	if ( function_exists( 'pa_app' ) && pa_app() ) return $content;
	if ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) return $content;
	$top = '<a class="pb-card" href="' . pb_link( '/', 'post-top' ) . '" target="_blank" rel="noopener"><span class="pb-flag"></span><div><b>আপনি কত দিন ধরে প্রবাসে?</b><span>প্রবাসী বন্ধুতে হিসাব করুন, নিজের ছবিসহ সুন্দর কার্ড বানিয়ে পরিবারকে পাঠান।</span></div><em>কার্ড বানান →</em></a>';
	$bottom = '<div class="pb-card pb-big"><span class="pb-flag"></span><div><b>প্রবাসী বন্ধু — প্রবাসীদের জন্য ফ্রি</b><span>দেশ গাইড, লাইভ সময় ও আবহাওয়া, প্রবাস কার্ড আর প্রবাসীদের সত্যি গল্প, সব এক জায়গায়।</span></div><a href="' . pb_link( '/', 'post-bottom' ) . '" target="_blank" rel="noopener" style="margin-left:auto;text-decoration:none"><em>ভিজিট করুন →</em></a><div class="pb-links"><a href="' . pb_link( '/guide', 'post-bottom' ) . '" target="_blank" rel="noopener">✈️ প্রবাসে যাবেন? দেশ গাইড</a><a href="' . pb_link( '/probashi-golpo', 'post-bottom' ) . '" target="_blank" rel="noopener">📖 প্রবাসী গল্প</a><a href="' . pb_link( '/', 'post-bottom' ) . '#make" target="_blank" rel="noopener">🖼️ প্রবাস কার্ড</a></div></div>';
	return $top . $content . $bottom;
}, 20 );

// Popup: after 12 s or half-way scroll, at most once every 3 days.
add_action( 'wp_footer', function () { if ( function_exists( 'pa_app' ) && pa_app() ) return; ?>
<div class="pb-pop" id="pb-pop" role="dialog" aria-modal="true" aria-label="প্রবাসী বন্ধু">
	<div class="pb-pop-box">
		<div class="pb-pop-top"><button class="pb-pop-x" type="button" aria-label="বন্ধ করুন">×</button><small>নতুন · ফ্রি</small><h3>প্রবাসী বন্ধু</h3><p>প্রবাসের প্রতিটা দিনের হিসাব, আর দেশে ফেরার স্বপ্ন।</p></div>
		<ul><li>প্রবাসে কত দিন হলো, এক ক্লিকে হিসাব</li><li>নিজের ছবিসহ ১০টি সুন্দর কার্ড ও ভিডিও</li><li>১৪টি দেশের গাইড, লাইভ সময় ও আবহাওয়া</li></ul>
		<a class="pb-pop-cta" href="<?php echo pb_link( '/', 'popup' ); ?>" target="_blank" rel="noopener">এখনই দেখুন →</a>
		<button class="pb-pop-later" type="button">পরে দেখব</button>
	</div>
</div>
<script>(function(){try{var p=document.getElementById('pb-pop'),K='pb-pop-next';if(+localStorage.getItem(K)>Date.now())return;var shown=false;function show(){if(shown)return;shown=true;p.classList.add('on');localStorage.setItem(K,Date.now()+3*864e5)}function hide(){p.classList.remove('on')}setTimeout(show,12000);addEventListener('scroll',function(){if(scrollY>(document.body.scrollHeight-innerHeight)*.5)show()},{passive:true});p.querySelector('.pb-pop-x').onclick=hide;p.querySelector('.pb-pop-later').onclick=hide;p.querySelector('.pb-pop-cta').onclick=hide;p.onclick=function(e){if(e.target===p)hide()};addEventListener('keydown',function(e){if(e.key==='Escape')hide()})}catch(e){}})();</script>
<?php } );
