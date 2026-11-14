<?php
/**
 * PBA app bar — probashiinfo.com: প্রবাসী বন্ধু Android app download in the header and above the footer.
 *  1) "📲 অ্যাপ" button inside the header (#hdr2), always visible;
 *  2) slim sunset strip under the header with a download button (closable, back after 3 days);
 *  3) big download section above the footer (icon, features, Google Play button, QR code on desktop).
 * Works next to the existing popup/post-card snippet (probashiinfo-app-promo.php). Android-only app →
 * everything hidden on iPhone/iPad. Hidden for logged-in editors.
 * Mode 'test' = only with ?pbd=<key>. Rollback = deactivate this snippet.
 * Source: Dreamint99/AutoBlog generator/wp_snippets/pba-app-bar.php
 */
if (!defined('ABSPATH') || defined('PBB_LOADED')) { return; }
define('PBB_LOADED', 1);
define('PBB_MODE', 'live');               // 'test' | 'live'
define('PBB_KEY', '__PBD_TEST_KEY__');
define('PBB_VER', '1');
define('PBB_PLAY', 'https://play.google.com/store/apps/details?id=com.probashibondu.probashi_bondu');
define('PBB_ICON', 'https://play-lh.googleusercontent.com/N_cSEMyLrkO0A9HRwkJeYt5p7hjHnT9BV-r078dBAgdhtxvPbM-DQ4nsMib0B5e8zUxhe9PCQg1p_dRdsu_0Gg=s128-rw');

function pbb_on() {
    if (is_admin() || is_user_logged_in() || is_feed() || wp_doing_ajax() || (defined('REST_REQUEST') && REST_REQUEST)) { return false; }
    if (PBB_MODE === 'live') { return true; }
    return isset($_GET['pbd']) && hash_equals(PBB_KEY, (string) $_GET['pbd']);
}
function pbb_link($medium) {
    return esc_url(PBB_PLAY . '&referrer=' . rawurlencode('utm_source=probashiinfo&utm_medium=' . $medium . '&utm_campaign=app-bar'));
}
function pbb_play_svg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#34A853" d="M3.6 1.8 13.4 12l-9.8 10.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1z"/><path fill="#FBBC04" d="m16.7 15.3-3.3-3.3 3.3-3.3 3.8 2.2c1 .6 1 1.6 0 2.2z"/><path fill="#EA4335" d="M16.7 15.3 13.4 12l-9.8 10.2c.4.2.9.2 1.4-.1z"/><path fill="#4285F4" d="M16.7 8.7 5 1.9c-.5-.3-1-.3-1.4-.1L13.4 12z"/></svg>';
}

add_action('template_redirect', function () {
    if (PBB_MODE === 'test' && pbb_on()) { do_action('litespeed_control_set_nocache', 'pbb test'); }
}, 0);

add_action('wp_head', function () { if (!pbb_on()) { return; } ?>
<style id="pbb-css">
.pbb-hbtn{display:inline-flex;align-items:center;gap:6px;flex:none;padding:8px 12px;border-radius:12px;background:linear-gradient(135deg,#E11D48,#F97316);color:#fff!important;font:700 14px/1 "Hind Siliguri","Anek Bangla",system-ui,sans-serif;text-decoration:none!important;box-shadow:0 6px 14px -6px rgba(225,29,72,.7);white-space:nowrap}
.pbb-hbtn i{font-style:normal;font-size:16px}
@media(max-width:640px){.pbb-hbtn{padding:9px 10px}.pbb-hbtn span{display:none}}
.pbb-strip{display:flex;align-items:center;gap:10px;padding:8px 14px;background:linear-gradient(90deg,#E11D48,#F97316);color:#fff;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif}
.pbb-strip img{width:34px;height:34px;border-radius:9px;background:#fff;flex:none}
.pbb-strip p{margin:0;flex:1;min-width:0;font-size:15px;line-height:1.35}
.pbb-strip p b{display:block;font-size:15.5px}
.pbb-strip p small{opacity:.92;font-size:13px}
.pbb-strip a{flex:none;background:#fff;color:#E11D48!important;font-weight:800;font-size:14px;padding:8px 14px;border-radius:10px;text-decoration:none!important}
.pbb-strip button{flex:none;border:0;background:rgba(255,255,255,.22);color:#fff;width:30px;height:30px;border-radius:50%;font-size:17px;cursor:pointer;line-height:1}
.pbb-strip[hidden]{display:none}
@media(min-width:900px){.pbb-strip{justify-content:center}.pbb-strip p{flex:0 1 auto}}
@media(max-width:640px){.pbb-strip{padding:7px 10px;gap:8px}.pbb-strip p small{display:none}.pbb-strip p b{font-size:14.5px}.pbb-strip img{width:30px;height:30px}html.pbb-strip-on .pbb-hbtn{display:none}}
.pbb-ft{margin:34px auto 0;padding:0 16px;max-width:1180px;box-sizing:border-box}
.pbb-card{display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:center;border-radius:26px;padding:26px;background:linear-gradient(135deg,#E11D48,#F97316);color:#fff;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif;position:relative;overflow:hidden;box-shadow:0 22px 50px -24px rgba(225,29,72,.75)}
.pbb-card:after{content:"";position:absolute;right:-60px;bottom:-80px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.09)}
.pbb-card>img{width:96px;height:96px;border-radius:24px;background:#fff;box-shadow:0 10px 24px rgba(0,0,0,.2)}
.pbb-card h3{margin:0;color:#fff;font-size:26px;line-height:1.3}
.pbb-card p{margin:4px 0 12px;font-size:16px;opacity:.95}
.pbb-feat{display:flex;flex-wrap:wrap;gap:8px}
.pbb-feat span{background:rgba(255,255,255,.18);border-radius:999px;padding:6px 12px;font-size:14.5px}
.pbb-get{display:grid;gap:10px;justify-items:center;position:relative;z-index:1}
.pbb-play{display:inline-flex;align-items:center;gap:10px;background:#111;color:#fff!important;border-radius:14px;padding:12px 18px;text-decoration:none!important;line-height:1.15}
.pbb-play svg{width:28px;height:28px}
.pbb-play small{display:block;font-size:11px;opacity:.8}.pbb-play b{display:block;font-size:18px}
.pbb-qr{background:#fff;border-radius:14px;padding:8px;line-height:0}
.pbb-qr img{width:112px;height:112px}
.pbb-get em{font-style:normal;font-size:12.5px;opacity:.9}
@media(max-width:760px){.pbb-card{grid-template-columns:1fr;text-align:center;justify-items:center;padding:24px 18px}.pbb-feat{justify-content:center}.pbb-qr,.pbb-get em{display:none}.pbb-card>img{width:80px;height:80px}}
html.pbb-ios .pbb-hbtn,html.pbb-ios .pbb-strip,html.pbb-ios .pbb-ft{display:none!important}
</style>
<script>if(/iPhone|iPad|iPod/.test(navigator.userAgent))document.documentElement.className+=' pbb-ios';</script>
<?php }, 25);

add_action('wp_footer', function () {
    if (!pbb_on()) { return; }
    $qr = 'https://api.qrserver.com/v1/create-qr-code/?size=224x224&margin=0&data=' . rawurlencode(PBB_PLAY . '&referrer=utm_source%3Dprobashiinfo%26utm_medium%3Dqr');
    ?>
<template id="pbb-tpl-btn"><a class="pbb-hbtn" href="<?php echo pbb_link('header'); ?>" target="_blank" rel="noopener" aria-label="প্রবাসী বন্ধু অ্যাপ ডাউনলোড"><i>📲</i><span>অ্যাপ</span></a></template>
<template id="pbb-tpl-strip"><div class="pbb-strip" role="region" aria-label="প্রবাসী বন্ধু অ্যাপ"><img src="<?php echo esc_url(PBB_ICON); ?>" alt="" width="34" height="34"><p><b>প্রবাসী বন্ধু অ্যাপ · ফ্রি</b><small>নামাজ, টাকার রেট, দূতাবাস, প্রবাস কার্ড এক অ্যাপে</small></p><a href="<?php echo pbb_link('strip'); ?>" target="_blank" rel="noopener">ডাউনলোড</a><button type="button" aria-label="বন্ধ করুন">×</button></div></template>
<template id="pbb-tpl-ft"><section class="pbb-ft" aria-label="প্রবাসী বন্ধু অ্যাপ"><div class="pbb-card"><img src="<?php echo esc_url(PBB_ICON); ?>" alt="প্রবাসী বন্ধু অ্যাপ" width="96" height="96" loading="lazy"><div style="position:relative;z-index:1"><h3>প্রবাসী বন্ধু অ্যাপ</h3><p>প্রবাসীদের নিজের অ্যাপ — বাংলায়, একদম ফ্রি।</p><div class="pbb-feat"><span>🕌 নামাজ ও কিবলা</span><span>💱 টাকার রেট</span><span>🏛 দূতাবাস</span><span>🏅 প্রবাস কার্ড</span></div></div><div class="pbb-get"><a class="pbb-play" href="<?php echo pbb_link('footer'); ?>" target="_blank" rel="noopener"><?php echo pbb_play_svg(); ?><span><small>ডাউনলোড করুন</small><b>Google Play</b></span></a><span class="pbb-qr"><img src="<?php echo esc_url($qr); ?>" alt="প্লে স্টোরের কিউআর কোড" width="112" height="112" loading="lazy"></span><em>ফোনের ক্যামেরায় স্ক্যান করুন</em></div></div></section></template>
<script>(function(){try{
if(/iPhone|iPad|iPod/.test(navigator.userAgent))return;
function tpl(id){var t=document.getElementById(id);return t?t.content.firstElementChild.cloneNode(true):null}
var h=document.getElementById('hdr2'),b=tpl('pbb-tpl-btn');
if(h&&b){var top=h.querySelector('.top')||h,burger=document.getElementById('burger');if(burger&&burger.parentNode===top)top.insertBefore(b,burger);else top.appendChild(b);}
var K='pbb-strip-next',s=tpl('pbb-tpl-strip'),next=0;try{next=+localStorage.getItem(K)||0}catch(e){}
if(s&&next<Date.now()){document.documentElement.classList.add('pbb-strip-on');var after=h||document.querySelector('header');if(after&&after.parentNode)after.parentNode.insertBefore(s,after.nextSibling);else document.body.insertBefore(s,document.body.firstChild);
s.querySelector('button').onclick=function(){s.hidden=true;document.documentElement.classList.remove('pbb-strip-on');try{localStorage.setItem(K,Date.now()+3*864e5)}catch(e){}};}
var f=document.querySelector('footer.ft')||document.querySelector('footer'),c=tpl('pbb-tpl-ft');
if(f&&c)f.parentNode.insertBefore(c,f);
}catch(e){}})();</script>
<?php }, 25);

add_action('init', function () {   // one LiteSpeed purge per version once live, so cached pages pick it up
    if (PBB_MODE !== 'live' || get_option('pbb_purged') === PBB_VER) { return; }
    update_option('pbb_purged', PBB_VER, false);
    do_action('litespeed_purge_all');
}, 99);
