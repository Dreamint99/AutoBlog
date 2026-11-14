<?php
/**
 * PBD data pages — probashiinfo.com
 * Data pages (/visa-check/<country>/ …) rendered inside the site's own theme from the
 * Cloudflare Worker probashi-data (JSON, cached in transients). No rewrite rules, no flush:
 * requests are matched in do_parse_request before WordPress parses them.
 * Mode 'test' = pages only with ?pbd=<key> (or the cookie it sets), never cached, not in sitemap.
 * Rollback = deactivate this snippet (workflow probashi-snippets.yml, data_cmd=off).
 * Source: Dreamint99/AutoBlog generator/wp_snippets/pbd-data-pages.php
 */
if (!defined('ABSPATH') || defined('PBD_LOADED')) { return; }
define('PBD_LOADED', 1);
define('PBD_MODE', 'live');               // 'test' | 'live'
define('PBD_KEY', '__PBD_TEST_KEY__');
define('PBD_API', 'https://probashi-data.iamkashimuddin.workers.dev/v1/');
define('PBD_VER', '3');

function pbd_enabled() {
    if (PBD_MODE === 'live') { return true; }
    $k = isset($_GET['pbd']) ? (string) $_GET['pbd'] : (isset($_COOKIE['pbd']) ? (string) $_COOKIE['pbd'] : '');
    return $k !== '' && hash_equals(PBD_KEY, $k);
}

function pbd_data($set) {
    $t = get_transient('pbd' . PBD_VER . '_' . $set);
    if (is_array($t)) { return $t; }
    $r = wp_remote_get(PBD_API . $set, array('timeout' => 8, 'user-agent' => 'probashiinfo-pbd/' . PBD_VER));
    $d = null;
    if (!is_wp_error($r) && wp_remote_retrieve_response_code($r) === 200) {
        $d = json_decode(wp_remote_retrieve_body($r), true);
    }
    if (is_array($d)) {
        set_transient('pbd' . PBD_VER . '_' . $set, $d, 6 * HOUR_IN_SECONDS);
        update_option('pbd_stale_' . $set, $d, false);
        return $d;
    }
    $s = get_option('pbd_stale_' . $set);   // worker down: serve last good copy
    if (is_array($s)) { set_transient('pbd' . PBD_VER . '_' . $set, $s, 15 * MINUTE_IN_SECONDS); return $s; }
    return null;
}

function pbd_bn($s) {
    return strtr((string) $s, array('0' => '০', '1' => '১', '2' => '২', '3' => '৩', '4' => '৪', '5' => '৫', '6' => '৬', '7' => '৭', '8' => '৮', '9' => '৯'));
}
function pbd_date($ymd) {
    $m = array('', 'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর');
    $p = explode('-', (string) $ymd);
    if (count($p) !== 3) { return esc_html($ymd); }
    return pbd_bn((int) $p[2]) . ' ' . $m[(int) $p[1]] . ' ' . pbd_bn($p[0]);
}
function pbd_host($url) { $h = wp_parse_url($url, PHP_URL_HOST); return $h ? preg_replace('/^www\./', '', $h) : $url; }

/* ---------- routing ---------- */
function pbd_match() {
    static $m = false;
    if ($m !== false) { return $m; }
    $m = null;
    $path = rawurldecode((string) wp_parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH));
    if (PBD_MODE === 'live' && $path === '/pbd-sitemap.xml') { return $m = array('type' => 'sitemap'); }
    if (!preg_match('#^/(visa-check)(?:/([a-z0-9-]+))?/?$#', $path, $x)) { return $m; }
    if (!pbd_enabled()) { return $m; }
    $type = $x[1];
    $slug = isset($x[2]) ? $x[2] : '';
    $d = pbd_data($type);
    if (!$d) { return $m; }
    $item = null;
    if ($slug !== '') {
        foreach ($d['countries'] as $c) { if ($c['slug'] === $slug) { $item = $c; break; } }
        if (!$item) { return $m; }   // unknown slug → normal WordPress 404
    }
    $m = array('type' => $type, 'slug' => $slug, 'data' => $d, 'item' => $item, 'path' => '/' . $type . '/' . ($slug !== '' ? $slug . '/' : ''));
    if (substr($path, -1) !== '/') { $m['redirect'] = true; }
    return $m;
}

add_filter('do_parse_request', function ($do, $wp, $extra) {
    $m = pbd_match();
    if (!$m) { return $do; }
    $wp->query_vars = array();
    return false;
}, 1, 3);

add_filter('posts_pre_query', function ($posts, $q) {
    if (pbd_match() && $q->is_main_query()) { return array(); }
    return $posts;
}, 10, 2);

add_action('wp', function () {
    $m = pbd_match();
    if (!$m) { return; }
    global $wp_query;
    $wp_query->is_home = false; $wp_query->is_front_page = false; $wp_query->is_404 = false;
    $wp_query->is_archive = false; $wp_query->is_singular = false; $wp_query->is_page = false;
    status_header(200);
}, 1);

add_action('template_redirect', function () {
    $m = pbd_match();
    if (!$m) { return; }
    if ($m['type'] === 'sitemap') { pbd_sitemap(); exit; }
    if (!empty($m['redirect'])) { wp_safe_redirect(home_url($m['path']) . (PBD_MODE === 'test' ? '?pbd=' . rawurlencode(PBD_KEY) : ''), 301); exit; }
    if (PBD_MODE === 'test') {
        do_action('litespeed_control_set_nocache', 'pbd test');
        nocache_headers();
        if (isset($_GET['pbd'])) { setcookie('pbd', PBD_KEY, time() + 86400, '/', '', is_ssl(), true); }
    }
    $app = function_exists('pa_head') && function_exists('pa_foot') && function_exists('pa_app') && pa_app();
    if ($app) { pa_head(); } else { get_header(); }   // site shell (probashiinfo app snippet) or theme fallback
    echo pbd_css();
    echo pbd_render($m);
    if ($app) { pa_foot(); } else { get_footer(); }
    exit;
}, 1);

/* ---------- SEO (Rank Math + core fallbacks) ---------- */
function pbd_seo() {
    static $s = null;
    if ($s !== null) { return $s; }
    $m = pbd_match();
    if (!$m || $m['type'] === 'sitemap') { return $s = array(); }
    $s = array('canonical' => home_url($m['path']), 'index' => false, 'title' => '', 'desc' => '', 'faq' => array());
    if ($m['type'] === 'visa-check') {
        if ($m['item']) {
            $c = $m['item'];
            $s['title'] = $c['name'] . ' ভিসা চেক অনলাইন ২০২৬: সরকারি সাইটে ধাপে ধাপে';
            $s['desc'] = $c['name'] . ' ভিসা স্ট্যাটাস দেখুন শুধু সরকারি সাইট ' . pbd_host($c['url']) . '-এ। কী লাগবে: ' . implode(', ', $c['need']) . '। ধাপে ধাপে বাংলা গাইড ও ভুয়া সাইট চেনার উপায়।';
            $s['index'] = true;
            $s['faq'] = pbd_vc_faq($c);
        } else {
            $s['title'] = 'ভিসা চেক: দেশভিত্তিক সরকারি ওয়েবসাইটের তালিকা';
            $s['desc'] = 'কোন দেশের ভিসা কোথায় চেক করবেন — শুধু সরকারি পোর্টালের ঠিকানা ও ধাপে ধাপে বাংলা গাইড।';
        }
    }
    if (function_exists('mb_strlen') && mb_strlen($s['desc']) > 158) { $s['desc'] = mb_substr($s['desc'], 0, 155) . '…'; }
    return $s;
}

add_filter('rank_math/frontend/title', function ($t) { $s = pbd_seo(); return $s ? $s['title'] . ' | প্রবাসী ইনফো' : $t; }, 99);
add_filter('pre_get_document_title', function ($t) { $s = pbd_seo(); return $s ? $s['title'] . ' | প্রবাসী ইনফো' : $t; }, 99);
add_filter('rank_math/frontend/description', function ($d) { $s = pbd_seo(); return $s ? $s['desc'] : $d; }, 99);
add_filter('rank_math/frontend/canonical', function ($c) { $s = pbd_seo(); return $s ? $s['canonical'] : $c; }, 99);
add_filter('rank_math/frontend/robots', function ($r) {
    $s = pbd_seo();
    if (!$s) { return $r; }
    $r = is_array($r) ? $r : array();
    $r['index'] = (PBD_MODE === 'live' && $s['index']) ? 'index' : 'noindex';
    $r['follow'] = 'follow';
    return $r;
}, 99);
add_filter('rank_math/opengraph/facebook/og_title', function ($t) { $s = pbd_seo(); return $s ? $s['title'] : $t; }, 99);
add_filter('rank_math/opengraph/facebook/og_description', function ($t) { $s = pbd_seo(); return $s ? $s['desc'] : $t; }, 99);
add_filter('rank_math/opengraph/facebook/og_url', function ($t) { $s = pbd_seo(); return $s ? $s['canonical'] : $t; }, 99);
add_filter('rank_math/opengraph/twitter/twitter_title', function ($t) { $s = pbd_seo(); return $s ? $s['title'] : $t; }, 99);
add_filter('rank_math/opengraph/twitter/twitter_description', function ($t) { $s = pbd_seo(); return $s ? $s['desc'] : $t; }, 99);
add_filter('rank_math/json_ld', function ($data) {
    $s = pbd_seo();
    if (!$s) { return $data; }
    foreach ($data as $k => $v) {   // home-page specific nodes do not describe this page
        if (is_array($v) && isset($v['@type']) && in_array($v['@type'], array('WebPage', 'CollectionPage', 'ItemList', 'Article', 'BlogPosting', 'NewsArticle'), true)) { unset($data[$k]); }
    }
    $data['pbdWebPage'] = array('@type' => 'WebPage', '@id' => $s['canonical'] . '#webpage', 'url' => $s['canonical'], 'name' => $s['title'],
        'description' => $s['desc'], 'inLanguage' => 'bn', 'isPartOf' => array('@id' => home_url('/') . '#website'));
    if ($s['faq']) {
        $q = array();
        foreach ($s['faq'] as $f) { $q[] = array('@type' => 'Question', 'name' => $f[0], 'acceptedAnswer' => array('@type' => 'Answer', 'text' => $f[1])); }
        $data['pbdFaq'] = array('@type' => 'FAQPage', 'mainEntity' => $q);
    }
    return $data;
}, 99);
add_filter('wp_robots', function ($r) {
    $s = pbd_seo();
    if (!$s) { return $r; }
    unset($r['index']); unset($r['noindex']);
    if (PBD_MODE === 'live' && $s['index']) { $r['index'] = true; } else { $r['noindex'] = true; }
    $r['follow'] = true;
    return $r;
}, 99);
add_action('wp_head', function () {   // Rank Math prints no canonical on these virtual pages
    $s = pbd_seo();
    if ($s && !(PBD_MODE === 'live' && $s['index'])) { echo '<link rel="canonical" href="' . esc_url($s['canonical']) . '" />' . "
"; }
}, 2);
add_filter('body_class', function ($c) { if (pbd_seo()) { $c[] = 'pbd-page'; } return $c; });

/* ---------- sitemap (live only) ---------- */
add_filter('rank_math/sitemap/index', function ($xml) {
    if (PBD_MODE !== 'live') { return $xml; }
    $p = pbd_data('pages');
    $last = date('c');
    return $xml . '<sitemap><loc>' . esc_url(home_url('/pbd-sitemap.xml')) . '</loc><lastmod>' . $last . '</lastmod></sitemap>';
});
function pbd_sitemap() {
    $p = pbd_data('pages');
    status_header(200);
    header('Content-Type: application/xml; charset=UTF-8');
    header('X-Robots-Tag: noindex, follow');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    if ($p && !empty($p['pages'])) {
        foreach ($p['pages'] as $r) {
            if (empty($r['index'])) { continue; }
            echo '<url><loc>' . esc_url(home_url($r['path'])) . '</loc><lastmod>' . esc_html($r['lastmod']) . '</lastmod></url>';
        }
    }
    echo '</urlset>';
}

/* one purge after going live, so cached 404s for the new paths disappear */
add_action('init', function () {
    if (PBD_MODE !== 'live' || get_option('pbd_purged') === PBD_VER) { return; }
    update_option('pbd_purged', PBD_VER, false);
    $p = pbd_data('pages');
    if ($p && !empty($p['pages'])) { foreach ($p['pages'] as $r) { do_action('litespeed_purge_url', home_url($r['path'])); } }
    if (class_exists('\RankMath\Sitemap\Cache')) { \RankMath\Sitemap\Cache::invalidate_storage(); }  // rebuild index with our sitemap
    do_action('litespeed_purge_url', home_url('/sitemap_index.xml'));
}, 99);

/* ---------- rendering ---------- */
function pbd_css() {
    return '<style id="pbd-css">
.pbd{font-size:var(--fs,18px);color:var(--ink,#0f1f38);line-height:1.75}
.pbd .pbd-src{font-size:.85em;color:var(--mut,#6a7a93);margin:.2em 0 1.2em}
.pbd .pbd-go{display:flex;align-items:center;gap:14px;background:var(--gs,#e8f7ee);border:2px solid var(--g,#16a34a);border-radius:var(--r,16px);padding:16px 18px;margin:1em 0 1.4em;text-decoration:none;color:var(--ink,#0f1f38)}
.pbd .pbd-go b{display:block;font-size:1.15em}.pbd .pbd-go span{font-size:.9em;color:var(--ink2,#34465f);word-break:break-all}
.pbd .pbd-go i{font-style:normal;font-size:2em}
.pbd h2{font-size:1.25em;margin:1.4em 0 .6em}
.pbd .pbd-need{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:0}
.pbd .pbd-need li{background:var(--bs,#e9f1fd);border-radius:12px;padding:8px 14px;font-weight:600}
.pbd ol.pbd-steps{list-style:none;counter-reset:s;padding:0;margin:0}
.pbd ol.pbd-steps li{counter-increment:s;position:relative;padding:12px 12px 12px 58px;margin:0 0 10px;background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:14px}
.pbd ol.pbd-steps li:before{content:counter(s);position:absolute;left:12px;top:10px;width:34px;height:34px;border-radius:50%;background:var(--b,#0b56c4);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}
.pbd table{width:100%;border-collapse:collapse;font-size:.95em}.pbd td,.pbd th{border:1px solid var(--line,#e2e8f1);padding:8px 10px;text-align:left;vertical-align:top}
.pbd .pbd-warn{background:#fff4f5;border-left:5px solid var(--red,#e11d48);border-radius:12px;padding:12px 16px;margin:1.2em 0}
.pbd .pbd-warn ul{margin:.3em 0 0;padding-left:1.2em}
.pbd .pbd-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:.6em 0 1em}
.pbd .pbd-tiles a{display:block;background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:14px;padding:12px;text-decoration:none;font-weight:600;color:var(--ink,#0f1f38);min-width:0}
.pbd .pbd-tiles a small{display:block;font-weight:400;color:var(--mut,#6a7a93);font-size:.8em}
.pbd details{border:1px solid var(--line,#e2e8f1);border-radius:12px;padding:10px 14px;margin:0 0 8px;background:var(--card,#fff)}
.pbd summary{font-weight:700;cursor:pointer}
</style>';
}

function pbd_head($crumbs, $h1) {
    $o = '<div class="art-hd"><div class="w"><nav class="crumbs" aria-label="ব্রেডক্রাম্ব"><a href="' . esc_url(home_url('/')) . '">হোম</a>';
    foreach ($crumbs as $c) {
        $o .= '<span>›</span>' . ($c[1] ? '<a href="' . esc_url(home_url($c[1])) . '">' . esc_html($c[0]) . '</a>' : '<span>' . esc_html($c[0]) . '</span>');
    }
    return $o . '</nav><h1>' . esc_html($h1) . '</h1></div></div><div class="w"><div class="art" style="grid-template-columns:minmax(0,1fr)"><article class="art-main"><div class="ct pbd">';
}
function pbd_foot() { return '</div></article></div></div>'; }

function pbd_vc_faq($c) {
    $host = pbd_host($c['url']);
    return array(
        array($c['name'] . ' ভিসা কোথায় চেক করব?', 'শুধু সরকারি সাইট ' . $host . ' (' . $c['portal'] . ')-এ। অন্য কোনো "ভিসা চেক" সাইট বা এজেন্টের লিংকে পাসপোর্টের তথ্য দেবেন না।'),
        array($c['name'] . ' ভিসা চেক করতে কী কী লাগে?', implode(', ', $c['need']) . '।'),
        array('ভিসা চেক করতে কি টাকা লাগে?', 'না, সরকারি পোর্টালে স্ট্যাটাস দেখা বিনামূল্যে। কেউ চেক করে দেওয়ার নামে টাকা চাইলে সতর্ক থাকুন।'),
    );
}

function pbd_render($m) {
    if ($m['type'] === 'visa-check') { return $m['item'] ? pbd_vc_country($m['data'], $m['item']) : pbd_vc_hub($m['data']); }
    return '';
}

function pbd_vc_country($d, $c) {
    $host = pbd_host($c['url']);
    $o = pbd_head(array(array('ভিসা চেক', '/visa-check/'), array($c['name'], '')), $c['name'] . ' ভিসা চেক: সরকারি সাইটে ধাপে ধাপে');
    $o .= '<p>' . esc_html($c['note']) . '</p>';
    $o .= '<p class="pbd-src">তথ্য যাচাই: ' . pbd_date($d['updated']) . ' · সূত্র: ' . esc_html($c['portal']) . '</p>';
    $o .= '<a class="pbd-go" href="' . esc_url($c['url']) . '" target="_blank" rel="nofollow noopener"><i>🏛️</i><div><b>সরকারি সাইট খুলুন</b><span>' . esc_html($host) . '</span></div></a>';
    $o .= '<h2>যা যা লাগবে</h2><ul class="pbd-need">';
    foreach ($c['need'] as $n) { $o .= '<li>' . esc_html($n) . '</li>'; }
    $o .= '</ul><h2>ধাপে ধাপে ' . esc_html($c['name']) . ' ভিসা চেক</h2><ol class="pbd-steps">';
    foreach ($c['steps'] as $s) { $o .= '<li>' . esc_html($s) . '</li>'; }
    $o .= '</ol>';
    if (!empty($c['also'])) { $o .= '<p><b>আরও কাজে লাগবে:</b> ' . esc_html($c['also']) . '</p>'; }
    $o .= '<h2>স্ট্যাটাসে কী লেখা থাকলে কী বোঝায়</h2><table><tr><th>ইংরেজিতে যা দেখবেন</th><th>মানে</th></tr>'
        . '<tr><td>Approved / Issued / Granted</td><td>ভিসা অনুমোদিত — কপি ডাউনলোড বা প্রিন্ট করুন</td></tr>'
        . '<tr><td>Pending / In process / Under review</td><td>আবেদন প্রক্রিয়াধীন — অপেক্ষা করুন</td></tr>'
        . '<tr><td>Additional documents required</td><td>আরও কাগজ চাওয়া হয়েছে — দ্রুত জমা দিন</td></tr>'
        . '<tr><td>Refused / Rejected</td><td>আবেদন বাতিল — কারণ জেনে নতুন করে আবেদন করুন</td></tr>'
        . '<tr><td>No record found</td><td>তথ্য মেলেনি — নম্বর ও বানান আবার দেখুন; বারবার না পেলে নিয়োগকর্তা/দূতাবাসে জানুন</td></tr></table>';
    $o .= '<div class="pbd-warn"><b>⚠️ ভুয়া ভিসা থেকে সাবধান</b><ul><li>ভিসা আসল কি না দেখার একমাত্র জায়গা সরকারি সাইট (' . esc_html($host) . ')।</li>'
        . '<li>হোয়াটসঅ্যাপে পাঠানো ছবি বা PDF দেখে টাকা দেবেন না — নিজে সাইটে নম্বর দিয়ে মিলিয়ে নিন।</li>'
        . '<li>বিদেশে কাজে যেতে বিএমইটি ছাড়পত্র লাগে; শুধু সরকার অনুমোদিত রিক্রুটিং এজেন্সির মাধ্যমে যান।</li></ul></div>';
    if (!empty($c['related'])) {
        $o .= '<h2>' . esc_html($c['name']) . ' নিয়ে আরও পড়ুন</h2><ul>';
        foreach ($c['related'] as $r) { $o .= '<li><a href="' . esc_url($r['url']) . '">' . esc_html($r['title']) . '</a></li>'; }
        $o .= '</ul>';
    }
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_vc_faq($c) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o .= '<h2>অন্য দেশের ভিসা চেক</h2><div class="pbd-tiles">';
    $n = 0;
    foreach ($d['countries'] as $x) {
        if ($x['slug'] === $c['slug'] || $x['region'] !== $c['region']) { continue; }
        $o .= '<a href="' . esc_url(home_url('/visa-check/' . $x['slug'] . '/')) . '">' . esc_html($x['name']) . '<small>' . esc_html(pbd_host($x['url'])) . '</small></a>';
        if (++$n >= 6) { break; }
    }
    foreach ($d['existing'] as $x) { if ($n++ < 9) { $o .= '<a href="' . esc_url($x['url']) . '">' . esc_html($x['name']) . '<small>ভিসা চেক গাইড</small></a>'; } }
    $o .= '</div><p><a href="' . esc_url(home_url('/visa-check/')) . '">সব দেশের ভিসা চেকের তালিকা →</a></p>';
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($c['source']) . '। পোর্টালের ঠিকানা ' . pbd_date($d['verified']) . ' তারিখে যাচাই করা। নিয়ম বদলাতে পারে — সিদ্ধান্তের আগে সরকারি সাইটে মিলিয়ে নিন।</p>';
    return $o . pbd_foot();
}

function pbd_vc_hub($d) {
    $o = pbd_head(array(array('ভিসা চেক', '')), 'ভিসা চেক: কোন দেশের ভিসা কোথায় দেখবেন');
    $o .= '<p>প্রতিটি দেশের ভিসা দেখার জন্য শুধু সেই দেশের সরকারি ওয়েবসাইটের ঠিকানা আর ধাপে ধাপে বাংলা নিয়ম। কোনো তৃতীয় পক্ষের "চেকার" সাইট নয়।</p>';
    $o .= '<p class="pbd-src">তথ্য যাচাই: ' . pbd_date($d['updated']) . '</p><h2>মধ্যপ্রাচ্য ও মালয়েশিয়া</h2><div class="pbd-tiles">';
    foreach ($d['existing'] as $x) { $o .= '<a href="' . esc_url($x['url']) . '">' . esc_html($x['name']) . '<small>ভিসা চেক গাইড</small></a>'; }
    $groups = array();
    foreach ($d['countries'] as $x) { $groups[$x['region']][] = $x; }
    $label = array('Gulf' => 'মধ্যপ্রাচ্য ও মালয়েশিয়া', 'Asia' => 'এশিয়া', 'Europe' => 'ইউরোপ', 'Americas' => 'আমেরিকা', 'UK & Americas' => 'যুক্তরাজ্য, আমেরিকা, কানাডা ও অস্ট্রেলিয়া');
    if (isset($groups['Gulf'])) { foreach ($groups['Gulf'] as $x) { $o .= pbd_tile($x); } unset($groups['Gulf']); }
    $o .= '</div>';
    foreach ($groups as $g => $xs) {
        $o .= '<h2>' . esc_html(isset($label[$g]) ? $label[$g] : $g) . '</h2><div class="pbd-tiles">';
        foreach ($xs as $x) { $o .= pbd_tile($x); }
        $o .= '</div>';
    }
    return $o . pbd_foot();
}
function pbd_tile($x) {
    return '<a href="' . esc_url(home_url('/visa-check/' . $x['slug'] . '/')) . '">' . esc_html($x['name']) . '<small>' . esc_html(pbd_host($x['url'])) . '</small></a>';
}
