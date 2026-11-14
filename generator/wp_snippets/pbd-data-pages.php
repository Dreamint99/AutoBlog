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
define('PBD_VER', '7');

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
        set_transient('pbd' . PBD_VER . '_' . $set, $d, ($set === 'remittance' ? 3 : 6) * HOUR_IN_SECONDS);
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
    if (!preg_match('#^/(visa-check|remittance|gamca|agency|migration-cost)(?:/([a-z0-9-]+))?/?$#', $path, $x)) { return $m; }
    if (!pbd_enabled()) { return $m; }
    $type = $x[1];
    $slug = isset($x[2]) ? $x[2] : '';
    if ($type === 'migration-cost' && $slug !== '') { return $m; }
    $item = null;
    if ($type === 'agency' && $slug !== '') {
        $one = pbd_data('agency/' . $slug);
        if (!$one || empty($one['agency'])) { return $m; }
        $m = array('type' => $type, 'slug' => $slug, 'data' => $one, 'item' => $one['agency'], 'path' => '/agency/' . $slug . '/');
        if (substr($path, -1) !== '/') { $m['redirect'] = true; }
        return $m;
    }
    $d = pbd_data($type === 'agency' ? 'agency-index' : $type);
    if (!$d) { return $m; }
    if ($slug !== '') {
        $list = $type === 'remittance' ? $d['currencies'] : ($type === 'gamca' ? $d['cities'] : $d['countries']);
        foreach ($list as $c) { if ($c['slug'] === $slug) { $item = $c; break; } }
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
    if ($m['type'] === 'remittance') { do_action('litespeed_control_set_ttl', 3 * 3600); }
    if ($m['type'] === 'agency' && isset($_GET['q'])) { do_action('litespeed_control_set_nocache', 'pbd search'); }
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
    if ($m['type'] === 'remittance') {
        $d = $m['data'];
        $s['index'] = true;
        if ($m['item']) {
            $c = $m['item'];
            $s['title'] = $c['name'] . ' থেকে টাকা: আজকের রেট ও ২.৫% প্রণোদনাসহ হিসাব';
            $s['desc'] = '১ ' . $c['name'] . ' = ৳' . pbd_num($c['rate'], 2) . ' (' . pbd_date($d['updated']) . ')। যত ' . $c['unit'] . ' পাঠাবেন, ২.৫% সরকারি প্রণোদনাসহ পরিবার কত টাকা পাবে — সাথে সাথে হিসাব করুন।';
            $s['faq'] = pbd_rm_faq($d, $c);
        } else {
            $s['title'] = 'রেমিট্যান্স ক্যালকুলেটর: ২.৫% প্রণোদনাসহ কত টাকা পাবেন';
            $s['desc'] = 'রিয়াল, দিরহাম, রিংগিত, দিনার, ইউরোসহ ' . pbd_bn(count($d['currencies'])) . 'টি মুদ্রায় পাঠানো টাকার হিসাব — আজকের রেট ও ২.৫% সরকারি প্রণোদনা যোগ করে।';
        }
    }
    if ($m['type'] === 'gamca') {
        $d = $m['data'];
        $s['faq'] = pbd_gm_faq($d, $m['item']);
        if ($m['item']) {
            $c = $m['item'];
            $s['index'] = !empty($c['index']);
            $s['title'] = $c['name'] . 'র গামকা মেডিকেল সেন্টার তালিকা ২০২৬ (' . pbd_bn($c['count']) . 'টি, Wafid অনুমোদিত)';
            $s['desc'] = $c['name'] . 'য় জিসিসি অনুমোদিত ' . pbd_bn($c['count']) . 'টি মেডিকেল সেন্টারের ঠিকানা ও ফোন নম্বর, Wafid অ্যাপয়েন্টমেন্ট, রিপোর্ট দেখার নিয়ম ও মেয়াদ।';
        } else {
            $s['index'] = true;
            $s['title'] = 'গামকা মেডিকেল সেন্টার তালিকা ২০২৬: শহরভিত্তিক, বুকিং ও রিপোর্ট';
            $s['desc'] = 'বাংলাদেশের সব জিসিসি (গামকা/Wafid) অনুমোদিত মেডিকেল সেন্টার — শহর অনুযায়ী তালিকা, অ্যাপয়েন্টমেন্টের ধাপ, ফি, রিপোর্ট ও মেয়াদ।';
        }
    }
    if ($m['type'] === 'agency') {
        $d = $m['data'];
        if ($m['item']) {
            $a = $m['item'];
            $st = pbd_ag_status($a['status']);
            $s['index'] = $a['release'] <= gmdate('Y-m-d');
            $s['title'] = $a['name'] . ' (আরএল-' . pbd_bn($a['rl']) . '): লাইসেন্স ' . $st[0];
            $s['desc'] = $a['name'] . ' রিক্রুটিং এজেন্সির লাইসেন্স (আরএল-' . pbd_bn($a['rl']) . ') বিএমইটির তালিকায় ' . $st[0] . '। ঠিকানা, ফোন, লাইসেন্সের মেয়াদ ও টাকা দেওয়ার আগে যাচাইয়ের নিয়ম।';
            $s['faq'] = pbd_ag_faq($d, $a);
        } else {
            $s['index'] = !isset($_GET['q']);
            $s['title'] = 'রিক্রুটিং এজেন্সির লাইসেন্স যাচাই: নাম বা আরএল নম্বর দিয়ে খুঁজুন';
            $s['desc'] = 'বিএমইটির তালিকার ' . pbd_bn(count($d['agencies'])) . 'টি রিক্রুটিং এজেন্সি — লাইসেন্স সক্রিয়, মেয়াদোত্তীর্ণ, স্থগিত না বাতিল, নাম বা আরএল নম্বর দিয়ে দেখুন।';
        }
    }
    if ($m['type'] === 'migration-cost') {
        $s['index'] = true;
        $s['title'] = 'সরকার নির্ধারিত অভিবাসন ব্যয়: দেশভিত্তিক সর্বোচ্চ খরচ';
        $s['desc'] = 'মালয়েশিয়া, কাতার, ওমান, কুয়েত, আমিরাত, জাপানসহ ' . pbd_bn(count($m['data']['countries'])) . 'টি দেশে কর্মী পাঠানোর সরকার নির্ধারিত সর্বোচ্চ খরচ — আদেশের তারিখ ও সূত্রসহ।';
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
.pbd *{box-sizing:border-box}
.pbd .pbd-src{font-size:.82em;color:var(--mut,#6a7a93);margin:1.4em 0 .4em}
.pbd .pbd-hero{position:relative;overflow:hidden;border-radius:22px;padding:22px 20px;margin:.4em 0 1.2em;color:#fff;background:linear-gradient(135deg,var(--b,#0b56c4),var(--nv,#082a63))}
.pbd .pbd-hero:after{content:"";position:absolute;right:-40px;top:-40px;width:170px;height:170px;border-radius:50%;background:rgba(255,255,255,.08)}
.pbd .pbd-hero .fl{width:44px;height:30px;border-radius:6px;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,.25);vertical-align:middle}
.pbd .pbd-hero small{display:block;opacity:.85;font-size:.85em}
.pbd .pbd-hero .big{font-size:2.1em;font-weight:800;line-height:1.2;margin:.15em 0;overflow-wrap:anywhere}
.pbd .pbd-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.16);border-radius:999px;padding:3px 12px;font-size:.82em;margin:6px 6px 0 0}
.pbd .pbd-chip.up{background:#16a34a}.pbd .pbd-chip.dn{background:#e11d48}
.pbd .pbd-go{display:flex;align-items:center;gap:14px;background:#fff;color:var(--ink,#0f1f38)!important;border-radius:16px;padding:14px 16px;margin-top:14px;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.18);position:relative;z-index:1}
.pbd .pbd-go b{display:block;font-size:1.1em}.pbd .pbd-go span{font-size:.85em;color:var(--mut,#6a7a93);word-break:break-all}
.pbd .pbd-go i{font-style:normal;font-size:1.7em;background:var(--gs,#e8f7ee);border-radius:12px;width:48px;height:48px;display:flex;align-items:center;justify-content:center;flex:none}
.pbd .pbd-go em{margin-left:auto;font-style:normal;font-size:1.4em;color:var(--g,#16a34a)}
.pbd h2{font-size:1.2em;margin:1.6em 0 .6em}
.pbd .pbd-need{display:flex;flex-wrap:wrap;gap:10px;list-style:none;padding:0;margin:0}
.pbd .pbd-need li{background:var(--bs,#e9f1fd);color:var(--b2,#0a3f96);border-radius:12px;padding:8px 14px;font-weight:700}
.pbd .pbd-need li:before{content:"✓ ";color:var(--g,#16a34a)}
.pbd ol.pbd-steps{list-style:none;counter-reset:s;padding:0;margin:0;position:relative}
.pbd ol.pbd-steps li{counter-increment:s;position:relative;padding:12px 14px 12px 60px;margin:0 0 10px;background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:16px}
.pbd ol.pbd-steps li:before{content:counter(s);position:absolute;left:12px;top:11px;width:36px;height:36px;border-radius:12px;background:var(--b,#0b56c4);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center}
.pbd .pbd-tw{overflow-x:auto;border-radius:16px;border:1px solid var(--line,#e2e8f1);margin:.4em 0}
.pbd table{width:100%;border-collapse:collapse;font-size:.92em;margin:0}
.pbd th{background:var(--bs,#e9f1fd);color:var(--b2,#0a3f96);font-weight:700}
.pbd td,.pbd th{border:0;border-bottom:1px solid var(--line,#e2e8f1);padding:9px 10px;text-align:left;vertical-align:top}
.pbd tr:last-child td{border-bottom:0}.pbd tr:nth-child(even) td{background:#f8fafd}
.pbd .pbd-st{display:grid;gap:8px}.pbd .pbd-st div{display:flex;gap:12px;align-items:center;background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:14px;padding:10px 12px}
.pbd .pbd-st i{font-style:normal;font-size:1.4em;flex:none}.pbd .pbd-st b{display:block;font-size:.85em;color:var(--mut,#6a7a93);font-weight:600}
.pbd .pbd-warn{background:#fff4f5;border:1px solid #fecdd3;border-radius:16px;padding:12px 16px;margin:1.4em 0}
.pbd .pbd-warn ul{margin:.3em 0 0;padding-left:1.2em}
.pbd .pbd-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:.6em 0 1em}
.pbd .pbd-tiles a{display:flex;align-items:center;gap:10px;background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:14px;padding:10px 12px;text-decoration:none;font-weight:700;color:var(--ink,#0f1f38);min-width:0;line-height:1.35;transition:transform .15s,box-shadow .15s}
.pbd .pbd-tiles a:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(11,86,196,.12)}
.pbd .pbd-tiles img{width:30px;height:21px;border-radius:4px;object-fit:cover;flex:none}
.pbd .pbd-tiles small{display:block;font-weight:500;color:var(--mut,#6a7a93);font-size:.78em;overflow-wrap:anywhere}
.pbd .pbd-tiles span{min-width:0}
.pbd details{border:1px solid var(--line,#e2e8f1);border-radius:14px;padding:10px 14px;margin:0 0 8px;background:var(--card,#fff)}
.pbd summary{font-weight:700;cursor:pointer}
.pbd ul.pbd-rel{list-style:none;padding:0}.pbd ul.pbd-rel li{margin:0 0 8px}.pbd ul.pbd-rel a{display:block;background:var(--gs,#e8f7ee);border-radius:12px;padding:10px 14px;font-weight:600;text-decoration:none;color:var(--ink,#0f1f38)}
.pbd ul.pbd-rel a:before{content:"📖 "}
@media(max-width:560px){.pbd .pbd-hero .big{font-size:1.7em}}
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
    if ($m['type'] === 'gamca') { $h = $m['item'] ? pbd_gm_city($m['data'], $m['item']) : pbd_gm_hub($m['data']); $f = ''; foreach (pbd_gm_faq($m['data'], $m['item']) as $q) { $f .= '<details><summary>' . esc_html($q[0]) . '</summary><p>' . esc_html($q[1]) . '</p></details>'; } return pbd_gm_css() . str_replace('<h2>প্রশ্ন ও উত্তর</h2>', '<h2>প্রশ্ন ও উত্তর</h2>' . $f, $h); }
    if ($m['type'] === 'agency') { return pbd_ag_css() . ($m['item'] ? pbd_ag_one($m['data'], $m['item']) : pbd_ag_hub($m['data'])); }
    if ($m['type'] === 'migration-cost') { return pbd_ag_css() . pbd_mc_page($m['data']); }
    if ($m['type'] === 'remittance') { return $m['item'] ? pbd_rm_one($m['data'], $m['item']) : pbd_rm_hub($m['data']); }
    return '';
}

function pbd_vc_country($d, $c) {
    $host = pbd_host($c['url']);
    $o = pbd_head(array(array('ভিসা চেক', '/visa-check/'), array($c['name'], '')), $c['name'] . ' ভিসা চেক: সরকারি সাইটে ধাপে ধাপে');
    $o .= '<div class="pbd-hero"><small>' . pbd_flag($c['iso2']) . ' ' . esc_html($c['name']) . ' · সরকারি পোর্টাল</small><div class="big" style="font-size:1.35em">' . esc_html($c['portal']) . '</div>'
        . '<span class="pbd-chip">✔️ শুধু সরকারি সাইট</span><span class="pbd-chip">📅 যাচাই ' . pbd_date($d['updated']) . '</span>'
        . '<a class="pbd-go" href="' . esc_url($c['url']) . '" target="_blank" rel="nofollow noopener"><i>🏛️</i><div><b>সরকারি সাইট খুলুন</b><span>' . esc_html($host) . '</span></div><em>➜</em></a></div>';
    $o .= '<p>' . esc_html($c['note']) . '</p>';
    $o .= '<h2>যা যা লাগবে</h2><ul class="pbd-need">';
    foreach ($c['need'] as $n) { $o .= '<li>' . esc_html($n) . '</li>'; }
    $o .= '</ul><h2>ধাপে ধাপে ' . esc_html($c['name']) . ' ভিসা চেক</h2><ol class="pbd-steps">';
    foreach ($c['steps'] as $s) { $o .= '<li>' . esc_html($s) . '</li>'; }
    $o .= '</ol>';
    if (!empty($c['also'])) { $o .= '<p><b>আরও কাজে লাগবে:</b> ' . esc_html($c['also']) . '</p>'; }
    $o .= '<h2>স্ট্যাটাসে কী লেখা থাকলে কী বোঝায়</h2><div class="pbd-st">'
        . '<div><i>✅</i><span><b>Approved / Issued / Granted</b>ভিসা অনুমোদিত — কপি ডাউনলোড বা প্রিন্ট করুন</span></div>'
        . '<div><i>⏳</i><span><b>Pending / In process / Under review</b>প্রক্রিয়াধীন — অপেক্ষা করুন</span></div>'
        . '<div><i>📄</i><span><b>Additional documents required</b>আরও কাগজ চেয়েছে — দ্রুত জমা দিন</span></div>'
        . '<div><i>❌</i><span><b>Refused / Rejected</b>বাতিল — কারণ জেনে নতুন করে আবেদন করুন</span></div>'
        . '<div><i>🔍</i><span><b>No record found</b>তথ্য মেলেনি — নম্বর ও বানান আবার দেখুন</span></div></div>';
    $o .= '<div class="pbd-warn"><b>⚠️ ভুয়া ভিসা থেকে সাবধান</b><ul><li>ভিসা আসল কি না দেখার একমাত্র জায়গা সরকারি সাইট (' . esc_html($host) . ')।</li>'
        . '<li>হোয়াটসঅ্যাপে পাঠানো ছবি বা PDF দেখে টাকা দেবেন না — নিজে সাইটে নম্বর দিয়ে মিলিয়ে নিন।</li>'
        . '<li>বিদেশে কাজে যেতে বিএমইটি ছাড়পত্র লাগে; শুধু সরকার অনুমোদিত রিক্রুটিং এজেন্সির মাধ্যমে যান।</li></ul></div>';
    if (!empty($c['related'])) {
        $o .= '<h2>' . esc_html($c['name']) . ' নিয়ে আরও পড়ুন</h2><ul class="pbd-rel">';
        foreach ($c['related'] as $r) { $o .= '<li><a href="' . esc_url($r['url']) . '">' . esc_html($r['title']) . '</a></li>'; }
        $o .= '</ul>';
    }
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_vc_faq($c) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o .= '<h2>অন্য দেশের ভিসা চেক</h2><div class="pbd-tiles">';
    $n = 0;
    foreach ($d['countries'] as $x) {
        if ($x['slug'] === $c['slug'] || $x['region'] !== $c['region']) { continue; }
        $o .= pbd_tile($x);
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
    return '<a href="' . esc_url(home_url('/visa-check/' . $x['slug'] . '/')) . '">' . pbd_flag($x['iso2']) . '<span>' . esc_html($x['name']) . '<small>' . esc_html(pbd_host($x['url'])) . '</small></span></a>';
}
function pbd_flag($iso) {
    $iso = strtolower(preg_replace('/[^a-z]/i', '', (string) $iso));
    return $iso ? '<img class="fl" src="https://flagcdn.com/w80/' . $iso . '.png" alt="" width="30" height="21" loading="lazy">' : '';
}
function pbd_num($n, $dec = 0) {   // Indian grouping (১২,৩৪,৫৬৭.৮৯) in Bangla digits
    $neg = $n < 0; $n = abs((float) $n);
    $f = number_format($n, $dec, '.', '');
    $p = explode('.', $f); $i = $p[0];
    if (strlen($i) > 3) { $last = substr($i, -3); $rest = substr($i, 0, -3); $rest = preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest); $i = $rest . ',' . $last; }
    return ($neg ? '-' : '') . pbd_bn($i . (isset($p[1]) ? '.' . $p[1] : ''));
}
function pbd_rm_faq($d, $c) {
    $one = $c['rate']; $pct = $d['incentive']['pct'];
    return array(
        array('১ ' . $c['name'] . ' সমান কত টাকা?', pbd_date($d['updated']) . ' তারিখের বাজার রেটে ১ ' . $c['name'] . ' = প্রায় ৳' . pbd_num($one, 2) . '। ব্যাংক বা এক্সচেঞ্জ হাউসের রেট এর চেয়ে কিছুটা কম-বেশি হতে পারে।'),
        array('১০০০ ' . $c['unit'] . ' পাঠালে প্রণোদনাসহ কত টাকা পাবে?', 'প্রায় ৳' . pbd_num(1000 * $one, 0) . ' + ' . pbd_bn($pct) . '% প্রণোদনা ৳' . pbd_num(1000 * $one * $pct / 100, 0) . ' = মোট প্রায় ৳' . pbd_num(1000 * $one * (1 + $pct / 100), 0) . '।'),
        array('২.৫% প্রণোদনা কীভাবে পাওয়া যায়?', 'বৈধ পথে — ব্যাংক, এক্সচেঞ্জ হাউস বা অনুমোদিত মোবাইল ব্যাংকিং — টাকা পাঠালে প্রাপকের হিসাবে ব্যাংক নিজেই প্রণোদনা যোগ করে। হুন্ডিতে কোনো প্রণোদনা নেই, আর তা আইনত অপরাধ।'),
    );
}
function pbd_rm_calc($d, $c) {
    $pct = (float) $d['incentive']['pct'];
    $opts = '';
    foreach ($d['currencies'] as $x) { $opts .= '<option value="' . esc_attr($x['rate']) . '" data-u="' . esc_attr($x['unit']) . '"' . ($c && $x['code'] === $c['code'] ? ' selected' : '') . '>' . esc_html($x['name']) . '</option>'; }
    return '<div class="pbd-calc"><div class="row"><label>কত পাঠাবেন?<input id="pbdAmt" type="number" inputmode="decimal" min="0" value="1000"></label>'
        . '<label>মুদ্রা<select id="pbdCur">' . $opts . '</select></label></div>'
        . '<div class="pbd-q"><button type="button" data-v="500">৫০০</button><button type="button" data-v="1000">১,০০০</button><button type="button" data-v="2000">২,০০০</button><button type="button" data-v="5000">৫,০০০</button></div>'
        . '<div class="pbd-tot"><small>পরিবার পাবে (প্রায়)</small><b id="pbdS">—</b><p id="pbdB"></p></div></div>'
        . '<script>(function(){var a=document.getElementById("pbdAmt"),c=document.getElementById("pbdCur"),P=' . $pct . ';function bn(s){return String(s).replace(/\d/g,function(d){return "০১২৩৪৫৬৭৮৯"[d]})}function f(n){return "৳ "+bn(Math.round(n).toLocaleString("en-IN"))}function r(){var v=parseFloat(a.value)||0,t=v*parseFloat(c.value);document.getElementById("pbdS").textContent=f(t*(1+P/100));document.getElementById("pbdB").textContent="টাকায় "+f(t)+"  +  "+bn(P)+"% প্রণোদনা "+f(t*P/100);}a.oninput=r;c.onchange=r;document.querySelectorAll(".pbd-q button").forEach(function(b){b.onclick=function(){a.value=b.dataset.v;r();}});r();})();</script>';
}
function pbd_rm_css() {
    return '<style>.pbd .pbd-calc{background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:20px;padding:16px;margin:0 0 1em;box-shadow:0 4px 16px rgba(15,31,56,.06)}
.pbd .pbd-calc .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pbd .pbd-calc label{display:grid;gap:4px;font-weight:700;font-size:.9em;min-width:0}
.pbd .pbd-calc input,.pbd .pbd-calc select{font-size:1.2em;font-weight:700;padding:10px 12px;border:2px solid var(--line,#e2e8f1);border-radius:12px;width:100%;background:#fff;color:var(--ink,#0f1f38)}
.pbd .pbd-calc input:focus,.pbd .pbd-calc select:focus{border-color:var(--b,#0b56c4);outline:0}
.pbd .pbd-q{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.pbd .pbd-q button{border:0;background:var(--bs,#e9f1fd);color:var(--b2,#0a3f96);font-weight:700;border-radius:999px;padding:6px 14px;font-size:.9em;cursor:pointer}
.pbd .pbd-tot{background:linear-gradient(135deg,var(--g,#16a34a),#15803d);color:#fff;border-radius:16px;padding:14px 16px;margin-top:6px}
.pbd .pbd-tot small{display:block;opacity:.9;font-size:.85em}.pbd .pbd-tot b{display:block;font-size:2em;line-height:1.2;overflow-wrap:anywhere}
.pbd .pbd-tot p{margin:.3em 0 0;font-size:.85em;opacity:.95}
@media(max-width:560px){.pbd .pbd-calc .row{grid-template-columns:1fr}}</style>';
}
function pbd_rm_one($d, $c) {
    $pct = $d['incentive']['pct'];
    $o = pbd_head(array(array('রেমিট্যান্স', '/remittance/'), array($c['name'], '')), $c['name'] . ' থেকে টাকা: আজকের রেট ও প্রণোদনাসহ হিসাব') . pbd_rm_css();
    $chg = '';
    if (!empty($c['rate7'])) {
        $dlt = $c['rate'] - $c['rate7'];
        $chg = '<span class="pbd-chip ' . ($dlt >= 0 ? 'up' : 'dn') . '">' . ($dlt >= 0 ? '▲' : '▼') . ' ৭ দিনে ৳' . pbd_num(abs($dlt), 2) . '</span>';
    }
    $o .= '<div class="pbd-hero"><small>' . pbd_flag($c['flag'] ?? '') . ' আজকের রেট</small><div class="big">১ ' . esc_html($c['unit']) . ' = ৳' . pbd_num($c['rate'], 2) . '</div>'
        . '<span class="pbd-chip">📅 ' . pbd_date($d['updated']) . '</span>' . $chg . '<span class="pbd-chip">🎁 +' . pbd_bn($d['incentive']['pct']) . '% প্রণোদনা</span></div>';
    $o .= pbd_rm_calc($d, $c);
    $o .= '<h2>' . esc_html($c['country']) . ' থেকে পাঠালে পরিবার কত পাবে</h2><div class="pbd-tw"><table><tr><th>' . esc_html($c['unit']) . '</th><th>টাকায়</th><th>+ ' . pbd_bn($pct) . '% প্রণোদনা</th><th>মোট</th></tr>';
    $amts = $c['rate'] > 100 ? array(10, 50, 100, 200, 500, 1000) : ($c['rate'] < 1 ? array(10000, 50000, 100000, 500000, 1000000) : array(100, 500, 1000, 1500, 2000, 5000));
    foreach ($amts as $a) { $t = $a * $c['rate']; $o .= '<tr><td>' . pbd_num($a) . '</td><td>৳' . pbd_num($t) . '</td><td>৳' . pbd_num($t * $pct / 100) . '</td><td><b>৳' . pbd_num($t * (1 + $pct / 100)) . '</b></td></tr>'; }
    $o .= '</table></div>';
    if (!empty($c['rate7']) || !empty($c['rate30'])) {
        $o .= '<h2>রেট কেমন যাচ্ছে</h2><div class="pbd-tw"><table><tr><th>সময়</th><th>১ ' . esc_html($c['unit']) . '</th></tr><tr><td>আজ</td><td>৳' . pbd_num($c['rate'], 2) . '</td></tr>';
        if (!empty($c['rate7'])) { $o .= '<tr><td>৭ দিন আগে</td><td>৳' . pbd_num($c['rate7'], 2) . '</td></tr>'; }
        if (!empty($c['rate30'])) { $o .= '<tr><td>৩০ দিন আগে</td><td>৳' . pbd_num($c['rate30'], 2) . '</td></tr>'; }
        $o .= '</table></div>';
    }
    $o .= '<div class="pbd-warn"><b>⚠️ হুন্ডি নয়, বৈধ পথে পাঠান</b><ul><li>' . esc_html($d['incentive']['note']) . '</li><li>হুন্ডিতে প্রণোদনা নেই, টাকা হারানোর ঝুঁকি আর আইনি শাস্তি আছে।</li></ul></div>';
    $o .= '<p>সব মুদ্রার আজকের রেট একসাথে: <a href="' . esc_url(home_url('/taka-rate/')) . '">আজকের টাকার রেট লাইভ</a> · কোন পথে পাঠাবেন: <a href="' . esc_url(home_url('/remittance-channels-2026-safe-ways-fees-bonus/')) . '">রেমিট্যান্স চ্যানেল গাইড</a>';
    if (!empty($d['routing_url'])) { $o .= ' · <a href="' . esc_url($d['routing_url']) . '">ব্যাংকের রাউটিং নম্বর</a>'; }
    $o .= '</p><h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_rm_faq($d, $c) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o .= '<h2>অন্য মুদ্রা</h2><div class="pbd-tiles">';
    foreach ($d['currencies'] as $x) { if ($x['code'] !== $c['code']) { $o .= '<a href="' . esc_url(home_url('/remittance/' . $x['slug'] . '/')) . '">' . pbd_flag($x['flag'] ?? '') . '<span>' . esc_html($x['name']) . '<small>১ = ৳' . pbd_num($x['rate'], 2) . '</small></span></a>'; } }
    $o .= '</div><p class="pbd-src">রেট: ' . esc_html($d['source']) . ', ' . pbd_date($d['updated']) . '। প্রণোদনা: ' . esc_html($d['incentive']['source']) . '। এটি আনুমানিক হিসাব; চূড়ান্ত অঙ্ক আপনার ব্যাংক/এক্সচেঞ্জ হাউস বলবে।</p>';
    return $o . pbd_foot();
}
function pbd_rm_hub($d) {
    $o = pbd_head(array(array('রেমিট্যান্স', '')), 'রেমিট্যান্স ক্যালকুলেটর: প্রণোদনাসহ কত টাকা পাবেন') . pbd_rm_css();
    $o .= '<p>বিদেশ থেকে যত টাকা পাঠাবেন, আজকের রেটে তা কত টাকা হয় আর ২.৫% সরকারি প্রণোদনা যোগ করে পরিবার মোট কত পাবে — নিচে মুদ্রা বেছে হিসাব করুন।</p>';
    $o .= '<p class="pbd-src">' . pbd_date($d['updated']) . ' তারিখের বাজার রেট · সূত্র: ' . esc_html($d['source']) . '</p>';
    $o .= pbd_rm_calc($d, $d['currencies'][0]) . '<h2>মুদ্রা অনুযায়ী হিসাব</h2><div class="pbd-tiles">';
    foreach ($d['currencies'] as $x) { $o .= '<a href="' . esc_url(home_url('/remittance/' . $x['slug'] . '/')) . '">' . pbd_flag($x['flag'] ?? '') . '<span>' . esc_html($x['name']) . '<small>১ = ৳' . pbd_num($x['rate'], 2) . '</small></span></a>'; }
    $o .= '</div><div class="pbd-warn"><b>প্রণোদনা</b><ul><li>' . esc_html($d['incentive']['note']) . '</li></ul></div>';
    $o .= '<p class="pbd-src">প্রণোদনার সূত্র: ' . esc_html($d['incentive']['source']) . '। রেট আনুমানিক; চূড়ান্ত অঙ্ক ব্যাংক/এক্সচেঞ্জ হাউস বলবে।</p>';
    return $o . pbd_foot();
}

/* ---------- GAMCA / Wafid medical centres ---------- */
function pbd_gm_faq($d, $c) {
    $n = $c ? $c['name'] : 'বাংলাদেশ';
    return array(
        array($n . 'য় কয়টি গামকা (Wafid) মেডিকেল সেন্টার আছে?', $c ? $c['name'] . 'য় Wafid তালিকায় ' . pbd_bn($c['count']) . 'টি অনুমোদিত সেন্টার আছে (' . pbd_date($d['updated']) . ' অনুযায়ী)।' : 'Wafid তালিকায় বাংলাদেশে মোট ' . pbd_bn(array_sum(array_column($d['cities'], 'count'))) . 'টি অনুমোদিত সেন্টার আছে।'),
        array('গামকা মেডিকেলের রিপোর্ট কীভাবে দেখব?', 'wafid.com-এর Medical Status Search পেজে পাসপোর্ট নম্বর ও জাতীয়তা দিয়ে, অথবা স্লিপ নম্বর দিয়ে। Wafid বলছে ফল ' . pbd_bn($d['result_days']) . ' দিনের মধ্যে আসে।'),
        array('গামকা মেডিকেল কতদিন বৈধ থাকে?', $d['validity']),
        array('অ্যাপয়েন্টমেন্টের ফি কত?', $d['fee'] . '। ' . $d['exam_fee_note']),
    );
}
function pbd_gm_city($d, $c) {
    $o = pbd_head(array(array('গামকা মেডিকেল', '/gamca/'), array($c['name'], '')), $c['name'] . 'র গামকা (Wafid) মেডিকেল সেন্টার তালিকা');
    $o .= '<div class="pbd-hero"><small>🩺 জিসিসি অনুমোদিত মেডিকেল সেন্টার</small><div class="big">' . esc_html($c['name']) . ': ' . pbd_bn($c['count']) . 'টি সেন্টার</div>'
        . '<span class="pbd-chip">✔️ সূত্র: Wafid</span><span class="pbd-chip">📅 ' . pbd_date($d['updated']) . '</span>'
        . '<a class="pbd-go" href="' . esc_url($d['booking_url']) . '" target="_blank" rel="nofollow noopener"><i>📅</i><div><b>Wafid-এ অ্যাপয়েন্টমেন্ট নিন</b><span>wafid.com</span></div><em>➜</em></a></div>';
    $o .= '<p>সৌদি আরব, কাতার, কুয়েত, ওমান, বাহরাইন ও আমিরাতে কাজের ভিসার জন্য জিসিসি অনুমোদিত (গামকা/Wafid) সেন্টারে মেডিকেল করতে হয়। নিচে ' . esc_html($c['name']) . 'র সব অনুমোদিত সেন্টারের ঠিকানা ও ফোন নম্বর — Wafid-এর সরকারি তালিকা থেকে।</p>';
    if ($c['count'] > 8) { $o .= '<input class="pbd-find" type="search" placeholder="🔍 সেন্টারের নাম বা এলাকা লিখুন" oninput="var q=this.value.toLowerCase();document.querySelectorAll(\'.pbd-mc\').forEach(function(e){e.style.display=e.textContent.toLowerCase().indexOf(q)>-1?\'\':\'none\'})">'; }
    $o .= '<div class="pbd-mcs">';
    foreach ($c['centres'] as $x) {
        $o .= '<div class="pbd-mc"><b>' . esc_html($x['name']) . '</b><span>📍 ' . esc_html($x['address']) . '</span>';
        if ($x['phone']) { $o .= '<a href="tel:' . esc_attr(preg_replace('/[^0-9+]/', '', $x['phone'])) . '">📞 ' . esc_html($x['phone']) . '</a>'; }
        $o .= '</div>';
    }
    $o .= '</div>' . pbd_gm_common($d);
    $o .= '<h2>অন্য শহর</h2><div class="pbd-tiles">';
    foreach ($d['cities'] as $x) { if ($x['slug'] !== $c['slug']) { $o .= pbd_gm_tile($x); } }
    $o .= '</div><p class="pbd-src">সূত্র: ' . esc_html($d['source']) . ' — ' . esc_html($d['source_url']) . ', ' . pbd_date($d['updated']) . '। তালিকায় থাকা মানেই সেন্টার এখন অ্যাপয়েন্টমেন্ট নিচ্ছে এমন নয় — Wafid-এ বুক করার সময় দেখে নিন।</p>';
    return $o . pbd_foot();
}
function pbd_gm_hub($d) {
    $tot = array_sum(array_column($d['cities'], 'count'));
    $o = pbd_head(array(array('গামকা মেডিকেল', '')), 'গামকা (Wafid) মেডিকেল: সেন্টার তালিকা, বুকিং ও রিপোর্ট');
    $o .= '<div class="pbd-hero"><small>🩺 জিসিসি অনুমোদিত মেডিকেল</small><div class="big">বাংলাদেশে ' . pbd_bn($tot) . 'টি সেন্টার</div>'
        . '<span class="pbd-chip">' . pbd_bn(count($d['cities'])) . 'টি শহর</span><span class="pbd-chip">📅 ' . pbd_date($d['updated']) . '</span>'
        . '<a class="pbd-go" href="' . esc_url($d['booking_url']) . '" target="_blank" rel="nofollow noopener"><i>📅</i><div><b>Wafid-এ অ্যাপয়েন্টমেন্ট নিন</b><span>wafid.com</span></div><em>➜</em></a></div>';
    $o .= '<h2>আপনার শহর বাছুন</h2><div class="pbd-tiles">';
    foreach ($d['cities'] as $x) { $o .= pbd_gm_tile($x); }
    $o .= '</div>' . pbd_gm_common($d);
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($d['source']) . ', ' . pbd_date($d['updated']) . '।</p>';
    return $o . pbd_foot();
}
function pbd_gm_tile($x) {
    return '<a href="' . esc_url(home_url('/gamca/' . $x['slug'] . '/')) . '"><span style="font-size:1.4em">🏥</span><span>' . esc_html($x['name']) . '<small>' . pbd_bn($x['count']) . 'টি সেন্টার</small></span></a>';
}
function pbd_gm_common($d) {
    $o = '<h2>ধাপে ধাপে অ্যাপয়েন্টমেন্ট</h2><ol class="pbd-steps">';
    foreach ($d['steps'] as $s) { $o .= '<li>' . esc_html($s) . '</li>'; }
    $o .= '</ol><div class="pbd-st">'
        . '<div><i>🔎</i><span><b>রিপোর্ট দেখুন</b><a href="' . esc_url($d['status_url']) . '" target="_blank" rel="nofollow noopener">wafid.com — Medical Status Search</a> · ফল আসে ' . pbd_bn($d['result_days']) . ' দিনের মধ্যে</span></div>'
        . '<div><i>🧾</i><span><b>স্লিপ হারিয়ে গেলে</b><a href="' . esc_url($d['slip_url']) . '" target="_blank" rel="nofollow noopener">wafid.com — Search Slip</a> (পাসপোর্ট নম্বর দিয়ে)</span></div>'
        . '<div><i>⏱️</i><span><b>মেয়াদ</b>' . esc_html($d['validity']) . '</span></div>'
        . '<div><i>💵</i><span><b>ফি</b>' . esc_html($d['fee']) . '। ' . esc_html($d['exam_fee_note']) . '</span></div></div>';
    $o .= '<h2>জেনে রাখুন</h2><ul>';
    foreach ($d['points'] as $p) { $o .= '<li>' . esc_html($p) . '</li>'; }
    $o .= '</ul><h2>যেসব কারণে "আনফিট" হতে পারেন</h2>';
    foreach ($d['unfit'] as $g => $xs) { $o .= '<p><b>' . esc_html($g) . ':</b> ' . esc_html(implode(', ', $xs)) . '।</p>'; }
    $o .= '<p class="pbd-src">তালিকা: জিসিসি "প্রবাসীদের মেডিকেল পরীক্ষার নিয়মাবলি" (৬ষ্ঠ সংস্করণ ২০২১)।</p>';
    $o .= '<div class="pbd-warn"><b>⚠️ সাবধান</b><ul><li>"ফিট করে দেব" বলে কেউ টাকা চাইলে তা প্রতারণা — রিপোর্ট সরাসরি Wafid সিস্টেমে যায়।</li><li>মেডিকেল রিপোর্টের অবস্থা দেখার বিস্তারিত গাইড: <a href="' . esc_url($d['status_post']) . '">মিডিগ্লাস/Wafid ভিসা চেক</a></li></ul></div>';
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    return $o;
}
function pbd_gm_css() {
    return '<style>.pbd .pbd-find{width:100%;font-size:1.05em;padding:12px 14px;border:2px solid var(--line,#e2e8f1);border-radius:14px;margin:.4em 0 .8em}
.pbd .pbd-mcs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.pbd .pbd-mc{background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:14px;padding:12px 14px;display:grid;gap:4px;min-width:0;line-height:1.45}
.pbd .pbd-mc span{font-size:.88em;color:var(--ink2,#34465f);overflow-wrap:anywhere}.pbd .pbd-mc a{font-weight:700;color:var(--b,#0b56c4);text-decoration:none}</style>';
}

/* ---------- recruiting agency licence + government migration cost ---------- */
function pbd_ag_status($s) {
    $m = array(
        'Active' => array('বৈধ লাইসেন্স', 'up', '✅', 'বিএমইটির তালিকায় এই এজেন্সির লাইসেন্স এখন সক্রিয়। তবুও টাকা দেওয়ার আগে রসিদ নিন এবং ভিসা/চাকরির কাগজ সরকারি সাইটে মিলিয়ে নিন।'),
        'Expired' => array('মেয়াদ শেষ', 'warn', '⚠️', 'লাইসেন্সের মেয়াদ শেষ — নবায়ন না হওয়া পর্যন্ত এই এজেন্সি বৈধভাবে কর্মী পাঠাতে পারে না। নতুন করে কোনো টাকা দেবেন না।'),
        'Cancelled' => array('লাইসেন্স বাতিল', 'dn', '⛔', 'সরকার এই এজেন্সির লাইসেন্স বাতিল করেছে। এর মাধ্যমে বিদেশে যাওয়া বৈধ নয় — কোনো টাকা দেবেন না।'),
        'Suspended' => array('লাইসেন্স স্থগিত', 'dn', '⛔', 'এই এজেন্সির লাইসেন্স স্থগিত আছে। স্থগিত থাকা অবস্থায় কর্মী পাঠানো যায় না — টাকা দেবেন না।'),
        'Server Locked' => array('সার্ভার লক', 'warn', '🔒', 'বিএমইটির সিস্টেমে এই এজেন্সির অ্যাকাউন্ট লক করা — আপাতত কোনো কাজ করতে পারবে না। বিএমইটিতে খোঁজ নিন।'),
    );
    return isset($m[$s]) ? $m[$s] : array($s, 'warn', 'ℹ️', '');
}
function pbd_ag_faq($d, $a) {
    $st = pbd_ag_status($a['status']);
    return array(
        array($a['name'] . ' কি সরকার অনুমোদিত এজেন্সি?', 'বিএমইটির তালিকায় এর রিক্রুটিং লাইসেন্স নম্বর আরএল-' . pbd_bn($a['rl']) . ', বর্তমান অবস্থা: ' . $st[0] . ' (' . pbd_date($d['updated']) . ' অনুযায়ী)।'),
        array('এজেন্সির লাইসেন্স নিজে কীভাবে যাচাই করব?', 'বিএমইটির সরকারি সিস্টেম raims.oep.gov.bd/agencies-এ আরএল নম্বর বা নাম লিখে খুঁজুন।'),
        array('লাইসেন্স বাতিল বা স্থগিত এজেন্সিকে টাকা দিয়ে ফেললে কী করব?', 'টাকা দেওয়ার রসিদ ও কাগজ নিয়ে বিএমইটি বা জেলা কর্মসংস্থান ও জনশক্তি অফিসে লিখিত অভিযোগ দিন।'),
    );
}
function pbd_ag_one($d, $a) {
    $st = pbd_ag_status($a['status']);
    $o = pbd_head(array(array('এজেন্সি যাচাই', '/agency/'), array('আরএল-' . pbd_bn($a['rl']), '')), $a['name'] . ': লাইসেন্স যাচাই (আরএল-' . pbd_bn($a['rl']) . ')');
    $o .= '<div class="pbd-hero"><small>🏢 রিক্রুটিং এজেন্সি · আরএল-' . pbd_bn($a['rl']) . '</small><div class="big" style="font-size:1.4em">' . esc_html($a['name']) . '</div>'
        . '<span class="pbd-chip ' . $st[1] . '">' . $st[2] . ' ' . esc_html($st[0]) . '</span>'
        . ($a['expiry'] ? '<span class="pbd-chip">⏳ মেয়াদ ' . pbd_date($a['expiry']) . '</span>' : '')
        . '<span class="pbd-chip">📅 যাচাই ' . pbd_date($d['updated']) . '</span></div>';
    $o .= '<div class="pbd-st"><div><i>' . $st[2] . '</i><span><b>এর মানে</b>' . esc_html($st[3]) . '</span></div>'
        . '<div><i>📍</i><span><b>ঠিকানা</b>' . esc_html($a['address']) . '</span></div>'
        . ($a['phone'] ? '<div><i>📞</i><span><b>অফিসের ফোন</b><a href="tel:' . esc_attr(preg_replace('/[^0-9+]/', '', $a['phone'])) . '">' . esc_html($a['phone']) . '</a></span></div>' : '')
        . '<div><i>🏛️</i><span><b>সরকারি সূত্র</b><a href="' . esc_url($d['source_url']) . '" target="_blank" rel="nofollow noopener">raims.oep.gov.bd — বিএমইটি এজেন্সি তালিকা</a></span></div></div>';
    $o .= '<h2>টাকা দেওয়ার আগে ৫টি যাচাই</h2><ol class="pbd-steps">'
        . '<li>এজেন্সির লাইসেন্স সক্রিয় কি না দেখুন (এই পাতা বা raims.oep.gov.bd)।</li>'
        . '<li>ভিসা আসল কি না সেই দেশের সরকারি সাইটে মিলিয়ে নিন — <a href="' . esc_url(home_url('/visa-check/')) . '">দেশভিত্তিক ভিসা চেক</a>।</li>'
        . '<li>সরকার নির্ধারিত খরচের চেয়ে বেশি চাইলে লিখিত হিসাব চান — <a href="' . esc_url(home_url('/migration-cost/')) . '">সরকার নির্ধারিত অভিবাসন ব্যয়</a>।</li>'
        . '<li>প্রতিটি টাকার রসিদ নিন, এজেন্সির নাম ও আরএল নম্বরসহ।</li>'
        . '<li>বিএমইটি ছাড়পত্র (স্মার্ট কার্ড) ছাড়া কাজের ভিসায় বিদেশ যাবেন না।</li></ol>';
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_ag_faq($d, $a) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o .= '<p><a href="' . esc_url(home_url('/agency/')) . '">অন্য এজেন্সি খুঁজুন →</a></p>';
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($d['source']) . ', ' . pbd_date($d['updated']) . ' তারিখের তালিকা। অবস্থা বদলাতে পারে — চূড়ান্ত যাচাই বিএমইটির সাইটে করুন। ভুল দেখলে মন্তব্যে জানান।</p>';
    return $o . pbd_foot();
}
function pbd_ag_hub($d) {
    $q = isset($_GET['q']) ? trim(wp_unslash((string) $_GET['q'])) : '';
    $cnt = array();
    foreach ($d['agencies'] as $a) { $cnt[$a['status']] = (isset($cnt[$a['status']]) ? $cnt[$a['status']] : 0) + 1; }
    $o = pbd_head(array(array('এজেন্সি যাচাই', '')), 'রিক্রুটিং এজেন্সির লাইসেন্স যাচাই');
    $o .= '<div class="pbd-hero"><small>🏢 বিএমইটি তালিকা</small><div class="big">' . pbd_bn(count($d['agencies'])) . 'টি এজেন্সি</div>'
        . '<span class="pbd-chip up">✅ সক্রিয় ' . pbd_bn(isset($cnt['Active']) ? $cnt['Active'] : 0) . '</span>'
        . '<span class="pbd-chip dn">⛔ বাতিল/স্থগিত ' . pbd_bn((isset($cnt['Cancelled']) ? $cnt['Cancelled'] : 0) + (isset($cnt['Suspended']) ? $cnt['Suspended'] : 0)) . '</span>'
        . '<span class="pbd-chip">📅 ' . pbd_date($d['updated']) . '</span></div>';
    $o .= '<form class="pbd-srch" method="get" action="' . esc_url(home_url('/agency/')) . '"><input name="q" type="search" value="' . esc_attr($q) . '" placeholder="এজেন্সির নাম বা আরএল নম্বর (যেমন 1857)" aria-label="এজেন্সি খুঁজুন"><button type="submit">খুঁজুন</button></form>';
    if ($q !== '') {
        $qq = strtolower(preg_replace('/^rl[-\s]*/i', '', strtr($q, array('০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4', '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9'))));
        $hits = array();
        foreach ($d['agencies'] as $a) {
            if ((ctype_digit($qq) && (string) $a['rl'] === $qq) || (!ctype_digit($qq) && strlen($qq) > 1 && strpos(strtolower($a['name']), $qq) !== false)) { $hits[] = $a; }
            if (count($hits) >= 60) { break; }
        }
        $o .= '<h2>ফলাফল: ' . pbd_bn(count($hits)) . 'টি</h2>';
        $o .= $hits ? '<div class="pbd-tiles">' . implode('', array_map('pbd_ag_tile', $hits)) . '</div>' : '<p>এই নামে বা নম্বরে কোনো এজেন্সি পাওয়া যায়নি। বানান বদলে চেষ্টা করুন — তালিকায় না থাকলে সেই "এজেন্সি" সরকার অনুমোদিত নয়।</p>';
    }
    $o .= '<h2>লাইসেন্সের অবস্থার মানে</h2><div class="pbd-st">';
    foreach (array('Active', 'Expired', 'Suspended', 'Cancelled') as $s) { $st = pbd_ag_status($s); $o .= '<div><i>' . $st[2] . '</i><span><b>' . esc_html($st[0]) . ' (' . pbd_bn(isset($cnt[$s]) ? $cnt[$s] : 0) . 'টি)</b>' . esc_html($st[3]) . '</span></div>'; }
    $o .= '</div><p>বিদেশে যাওয়ার খরচ কত হওয়া উচিত: <a href="' . esc_url(home_url('/migration-cost/')) . '">সরকার নির্ধারিত অভিবাসন ব্যয়</a></p>';
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($d['source']) . ', ' . pbd_date($d['updated']) . '।</p>';
    return $o . pbd_foot();
}
function pbd_ag_tile($a) {
    $st = pbd_ag_status($a['status']);
    return '<a href="' . esc_url(home_url('/agency/' . $a['slug'] . '/')) . '"><span style="font-size:1.3em">' . $st[2] . '</span><span>' . esc_html($a['name']) . '<small>আরএল-' . pbd_bn($a['rl']) . ' · ' . esc_html($st[0]) . '</small></span></a>';
}
function pbd_mc_page($d) {
    $o = pbd_head(array(array('সরকার নির্ধারিত অভিবাসন ব্যয়', '')), 'সরকার নির্ধারিত অভিবাসন ব্যয়: কোন দেশে যেতে সর্বোচ্চ কত');
    $o .= '<div class="pbd-hero"><small>🏛️ প্রবাসী কল্যাণ মন্ত্রণালয়ের আদেশ</small><div class="big" style="font-size:1.45em">এজেন্সি এর বেশি নিতে পারবে না</div><span class="pbd-chip">' . pbd_bn(count($d['countries'])) . 'টি দেশ</span><span class="pbd-chip">📅 যাচাই ' . pbd_date($d['updated']) . '</span></div>';
    $o .= '<p>সরকার প্রতিটি দেশের জন্য একজন কর্মীর সর্বোচ্চ অভিবাসন ব্যয় নির্ধারণ করে দেয়। নিচের অঙ্কগুলো শুধু সরকারি আদেশ থেকে নেওয়া — কোন তারিখের আদেশ, তা প্রতিটি সারিতে লেখা আছে।</p>';
    $o .= '<div class="pbd-tw"><table><tr><th>দেশ</th><th>সর্বোচ্চ খরচ</th><th>আদেশের তারিখ</th></tr>';
    foreach ($d['countries'] as $c) {
        $o .= '<tr><td>' . pbd_flag($c['iso2']) . ' ' . esc_html($c['country']) . '</td><td><b>৳' . pbd_num($c['bdt']) . '</b></td><td>' . pbd_date($c['date']) . '</td></tr>';
    }
    $o .= '</table></div><h2>কোন খরচে কী থাকে</h2><div class="pbd-st">';
    $seen = array();
    foreach ($d['countries'] as $c) {
        if (isset($seen[$c['includes']])) { $seen[$c['includes']][] = $c['country']; continue; }
        $seen[$c['includes']] = array($c['country']);
    }
    foreach ($seen as $inc => $cs) { $o .= '<div><i>🧾</i><span><b>' . esc_html(implode(', ', $cs)) . '</b>' . esc_html($inc) . '</span></div>'; }
    $o .= '</div><div class="pbd-warn"><b>⚠️ জেনে রাখুন</b><ul><li>বেশিরভাগ দেশের অঙ্ক ২০১৭ সালের আদেশের — এরপর নতুন দেশভিত্তিক আদেশ সরকারি সাইটে পাওয়া যায়নি। মালয়েশিয়া (২০২২) ও জাপান (২০২৩) নতুন আদেশ।</li><li>এর বেশি টাকা চাইলে লিখিত হিসাব ও রসিদ চান; প্রয়োজনে বিএমইটিতে অভিযোগ করুন।</li><li>এজেন্সির লাইসেন্স আগে যাচাই করুন: <a href="' . esc_url(home_url('/agency/')) . '">এজেন্সি লাইসেন্স যাচাই</a>।</li></ul></div>';
    $o .= '<h2>দেশভিত্তিক বিস্তারিত খরচ ও বেতন</h2><ul class="pbd-rel">';
    foreach ($d['countries'] as $c) { if (!empty($c['post'])) { $o .= '<li><a href="' . esc_url($c['post']) . '">' . esc_html($c['country']) . ' যেতে কত টাকা লাগে — বিস্তারিত</a></li>'; } }
    $o .= '</ul><p class="pbd-src">সূত্র: প্রবাসী কল্যাণ ও বৈদেশিক কর্মসংস্থান মন্ত্রণালয় / বিএমইটি অফিস আদেশ: ';
    $src = array();
    foreach ($d['countries'] as $c) { $src[$c['source']] = 1; }
    foreach (array_keys($src) as $u) { $o .= '<a href="' . esc_url($u) . '" target="_blank" rel="nofollow noopener">' . esc_html(pbd_host($u)) . '</a> '; }
    return $o . '</p>' . pbd_foot();
}
function pbd_ag_css() {
    return '<style>.pbd .pbd-chip.warn{background:#d97706}.pbd .pbd-srch{display:flex;gap:8px;margin:.4em 0 1em}.pbd .pbd-srch input{flex:1;min-width:0;font-size:1.05em;padding:12px 14px;border:2px solid var(--line,#e2e8f1);border-radius:14px}.pbd .pbd-srch button{border:0;background:var(--b,#0b56c4);color:#fff;font-weight:700;border-radius:14px;padding:0 18px;font-size:1em}.pbd td img.fl{width:24px;height:17px;border-radius:3px;vertical-align:-3px}</style>';
}
