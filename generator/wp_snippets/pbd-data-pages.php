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
define('PBD_VER', '19');

function pbd_enabled() {
    if (PBD_MODE === 'live') { return true; }
    $k = isset($_GET['pbd']) ? (string) $_GET['pbd'] : (isset($_COOKIE['pbd']) ? (string) $_COOKIE['pbd'] : '');
    return $k !== '' && hash_equals(PBD_KEY, $k);
}

function pbd_data($set) {
    $t = get_transient('pbd' . PBD_VER . '_' . $set);
    if (is_array($t)) { return $t; }
    $one = strpos($set, '/') !== false;   // single item (agency/…, ramadan/…): no long-term stale copy
    $d = null;
    if (!get_transient('pbd_down')) {      // worker failed in the last 5 min: don't wait on it again
        $r = wp_remote_get(PBD_API . $set, array('timeout' => 6, 'user-agent' => 'probashiinfo-pbd/' . PBD_VER));
        $code = is_wp_error($r) ? 0 : wp_remote_retrieve_response_code($r);
        if ($code === 200) { $d = json_decode(wp_remote_retrieve_body($r), true); }
        elseif ($code === 0 || $code >= 500) { set_transient('pbd_down', 1, 5 * MINUTE_IN_SECONDS); }
    }
    if (is_array($d)) {
        set_transient('pbd' . PBD_VER . '_' . $set, $d, (strpos($set, 'ramadan') === 0 ? 1 : ($set === 'remittance' ? 3 : 6)) * HOUR_IN_SECONDS);
        if (!$one) { update_option('pbd_stale_' . $set, $d, false); }
        return $d;
    }
    $s = $one ? null : get_option('pbd_stale_' . $set);   // worker down: serve last good copy
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
    if (!preg_match('#^/(visa-check|visa|remittance|gamca|agency|migration-cost|customs|baggage|ramadan|passport-office|embassy)(?:/([a-z0-9-]+))?/?$#', $path, $x)) { return $m; }
    if (!pbd_enabled()) { return $m; }
    $type = $x[1];
    $slug = isset($x[2]) ? $x[2] : '';
    if ($type === 'migration-cost' && $slug !== '') { return $m; }
    if ($type === 'passport-office') {   // static official data, no worker call
        $po = pbd_po_all();
        if ($slug !== '' && !isset($po[$slug])) { return $m; }
        $m = array('type' => $type, 'slug' => $slug, 'data' => array(), 'item' => $slug !== '' ? $po[$slug] : null, 'path' => '/passport-office/' . ($slug !== '' ? $slug . '/' : ''));
        if (substr($path, -1) !== '/') { $m['redirect'] = true; }
        return $m;
    }
    if ($type === 'embassy') {   // static official data, no worker call
        $em = pbd_emb_all();
        if ($slug !== '' && !isset($em[$slug])) { return $m; }
        $m = array('type' => $type, 'slug' => $slug, 'data' => array(), 'item' => $slug !== '' ? $em[$slug] : null, 'path' => '/embassy/' . ($slug !== '' ? $slug . '/' : ''));
        if (substr($path, -1) !== '/') { $m['redirect'] = true; }
        return $m;
    }
    $item = null;
    if ($type === 'ramadan' && $slug !== '') {
        $one = pbd_data('ramadan/' . $slug);
        if (!$one || empty($one['city'])) { return $m; }
        $m = array('type' => $type, 'slug' => $slug, 'data' => $one, 'item' => $one['city'], 'path' => '/ramadan/' . $slug . '/');
        if (substr($path, -1) !== '/') { $m['redirect'] = true; }
        return $m;
    }
    if ($type === 'agency' && $slug !== '') {
        $one = pbd_data('agency/' . $slug);
        if (!$one || empty($one['agency'])) { return $m; }
        $m = array('type' => $type, 'slug' => $slug, 'data' => $one, 'item' => $one['agency'], 'path' => '/agency/' . $slug . '/');
        if (substr($path, -1) !== '/') { $m['redirect'] = true; }
        return $m;
    }
    $d = pbd_data($type === 'agency' ? 'agency-index' : (($type === 'customs' || $type === 'baggage') ? 'customs' : $type));
    if (!$d) { return $m; }
    if ($slug !== '') {
        $lists = array('visa' => 'countries', 'remittance' => 'currencies', 'gamca' => 'cities', 'customs' => 'topics', 'baggage' => 'airlines');
        $list = $d[isset($lists[$type]) ? $lists[$type] : 'countries'];
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
    if ($m['type'] === 'ramadan') { do_action('litespeed_control_set_ttl', 3600); }
    if ($m['type'] === 'agency' && isset($_GET['q'])) { do_action('litespeed_control_set_nocache', 'pbd search'); }
    $app = function_exists('pa_head') && function_exists('pa_foot') && function_exists('pa_app') && pa_app();
    if ($app) { pa_head(); } else { get_header(); }   // site shell (probashiinfo app snippet) or theme fallback
    echo pbd_css();
    echo pbd_with_en(pbd_render($m));
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
            // status labels already say "লাইসেন্স" for most states ("বৈধ লাইসেন্স") — don't repeat it
            $lbl = (strpos($st[0], 'লাইসেন্স') !== false) ? $st[0] : ($a['status'] === 'Expired' ? 'লাইসেন্সের ' . $st[0] : 'লাইসেন্স: ' . $st[0]);
            $s['title'] = $a['name'] . ' (আরএল-' . pbd_bn($a['rl']) . '): ' . $lbl;
            $s['desc'] = $a['name'] . ' রিক্রুটিং এজেন্সি (আরএল-' . pbd_bn($a['rl']) . '): বিএমইটির তালিকায় ' . $lbl . '। ঠিকানা, ফোন, লাইসেন্সের মেয়াদ ও টাকা দেওয়ার আগে যাচাইয়ের নিয়ম।';
            $s['faq'] = pbd_ag_faq($d, $a);
            if (pbd_ag_v2($a)) {   // v18 template: gate flag x = noindex
                $r = pbd_ag_xi($a['rl']); $man = pbd_ag_manual($a['rl']);
                $s['index'] = $s['index'] && empty($r['x']);
                $bnm = isset($man['bn']) ? ' — ' . $man['bn'] : '';
                $s['title'] = $a['name'] . ' (RL ' . $a['rl'] . ')' . $bnm . ': ' . $lbl . ($a['status'] === 'Active' && $a['expiry'] ? ', মেয়াদ ' . pbd_date($a['expiry']) : '');
                $n = $a['expiry'] ? pbd_days_to($a['expiry']) : null;
                $s['desc'] = $a['name'] . (isset($man['bn']) ? ' (' . $man['bn'] . ')' : '') . ' — বিএমইটি RAIMS তালিকায় লাইসেন্স ' . $a['status'] . ($a['expiry'] ? ', মেয়াদ ' . pbd_date($a['expiry']) . ($n !== null && $n >= 0 ? ' (আর ' . pbd_bn($n) . ' দিন)' : '') : '') . '। ঠিকানা, ফোন, যাচাইয়ের নিয়ম। যাচাই ' . pbd_date($d['updated']) . '।';
                $s['faq'] = pbd_ag_faq2($d, $a);
                $org = array('@type' => 'Organization', '@id' => $s['canonical'] . '#org', 'name' => $a['name'], 'url' => $s['canonical'],
                    'identifier' => array('@type' => 'PropertyValue', 'propertyID' => 'BMET Recruiting Licence', 'value' => pbd_ag_rlpad($a['rl'])));
                if (isset($man['bn'])) { $org['alternateName'] = $man['bn']; }
                if ($a['address']) { $org['address'] = array('@type' => 'PostalAddress', 'streetAddress' => $a['address'], 'addressCountry' => 'BD'); }
                if ($a['phone']) { $org['telephone'] = $a['phone']; }
                $s['nodes'] = array('pbdOrg' => $org, 'pbdCrumbs' => pbd_crumbs_ld(array(array('এজেন্সি যাচাই', '/agency/'), array('RL ' . $a['rl'], $m['path']))));
            }
        } else {
            $s['index'] = !isset($_GET['q']);
            $s['title'] = 'রিক্রুটিং এজেন্সির লাইসেন্স যাচাই: নাম বা আরএল নম্বর দিয়ে খুঁজুন';
            $s['desc'] = 'বিএমইটির তালিকার ' . pbd_bn(count($d['agencies'])) . 'টি রিক্রুটিং এজেন্সি — লাইসেন্স সক্রিয়, মেয়াদোত্তীর্ণ, স্থগিত না বাতিল, নাম বা আরএল নম্বর দিয়ে দেখুন।';
            if (pbd_ag_x()) {
                $s['title'] = 'RL নম্বর চেক ২০২৬: রিক্রুটিং এজেন্সির লাইসেন্স যাচাই (আর এল নাম্বার চেক)';
                $s['desc'] = 'RL number check: নাম বা আরএল নম্বর লিখে ' . pbd_bn(count($d['agencies'])) . 'টি রিক্রুটিং এজেন্সির লাইসেন্স অবস্থা ও মেয়াদ দেখুন। সূত্র বিএমইটি RAIMS, যাচাই ' . pbd_date($d['updated']) . '।';
                $s['faq'] = pbd_ag_hub_faq();
                $s['nodes'] = array('pbdCrumbs' => pbd_crumbs_ld(array(array('এজেন্সি যাচাই', '/agency/'))));
            }
        }
    }
    if ($m['type'] === 'passport-office') {
        if ($m['item']) {
            $o = $m['item'];
            $s['index'] = $o['addr'] !== '' && $o['phone'] !== '';   // critical data present
            $s['title'] = $o['short'] . ' পাসপোর্ট অফিস (' . pbd_po_q($o) . '): ঠিকানা, ফোন, সময় 2026';
            $s['desc'] = pbd_po_desc($o);
            $s['faq'] = pbd_po_faq($o);
            $s['nodes'] = array('pbdGov' => array('@type' => 'GovernmentOffice', '@id' => $s['canonical'] . '#office', 'name' => $o['name'], 'alternateName' => pbd_po_aka($o), 'url' => $o['portal'],
                'telephone' => array($o['phone'], $o['mobile']), 'email' => $o['email'], 'address' => array('@type' => 'PostalAddress', 'streetAddress' => $o['addr'], 'addressCountry' => 'BD'),
                'parentOrganization' => array('@type' => 'GovernmentOrganization', 'name' => 'Department of Immigration and Passports', 'url' => 'https://www.dip.gov.bd/')),
                'pbdCrumbs' => pbd_crumbs_ld(array(array('পাসপোর্ট অফিস', '/passport-office/'), array($o['short'], $m['path']))));
        } else {
            $s['index'] = false;   // hub stays noindex until more offices are added
            $s['title'] = 'পাসপোর্ট অফিসের ঠিকানা ও ফোন নম্বর (Passport Office Address)';
            $s['desc'] = 'Passport office address and phone for Uttara, Comilla (Cumilla) and Sylhet — official DIP sources only. উত্তরা, কুমিল্লা ও সিলেট পাসপোর্ট অফিসের ঠিকানা ও ফোন।';
        }
    }
    if ($m['type'] === 'migration-cost') {
        $s['index'] = true;
        $s['title'] = 'সরকার নির্ধারিত অভিবাসন ব্যয়: দেশভিত্তিক সর্বোচ্চ খরচ';
        $s['desc'] = 'মালয়েশিয়া, কাতার, ওমান, কুয়েত, আমিরাত, জাপানসহ ' . pbd_bn(count($m['data']['countries'])) . 'টি দেশে কর্মী পাঠানোর সরকার নির্ধারিত সর্বোচ্চ খরচ — আদেশের তারিখ ও সূত্রসহ।';
    }
    if ($m['type'] === 'customs') {
        $s['index'] = true;
        if ($m['item']) { $t = $m['item']; $s['title'] = $t['title']; $s['desc'] = $t['desc']; $s['faq'] = pbd_cu_faq($t); }
        else { $s['title'] = 'বিদেশ থেকে কী কী আনা যায়: ব্যাগেজ রুল ২০২৫ সহজ বাংলায়'; $s['desc'] = '৬৫+৩৫ কেজি শুল্কমুক্ত, মোবাইল, স্বর্ণ, টিভি, ডলার — অপর্যটক যাত্রী ব্যাগেজ বিধিমালা ২০২৫-এর সব নিয়ম এক পাতায়, এনবিআরের সূত্রসহ।'; }
    }
    if ($m['type'] === 'baggage') {
        $s['index'] = true;
        if ($m['item']) { $a = $m['item']; $s['title'] = $a['name'] . ' লাগেজ কত কেজি ২০২৬: ইকোনমি ভাড়া অনুযায়ী (' . $a['name_en'] . ')'; $s['desc'] = $a['name'] . ' ঢাকা রুটে ইকোনমিতে চেকড লাগেজ ' . $a['fares'][0][1] . ' থেকে; হাতব্যাগ ' . preg_replace('/\s*\(.*$/u', '', $a['cabin']) . '। ভাড়ার ধরন অনুযায়ী পুরো তালিকা, এয়ারলাইনের নিজের সূত্রসহ।'; }
        else { $s['title'] = 'কোন এয়ারলাইনে কত কেজি লাগেজ: এমিরেটস, কাতার, গালফ এয়ারসহ'; $s['desc'] = 'ঢাকা থেকে মধ্যপ্রাচ্য, মালয়েশিয়া ও সিঙ্গাপুর রুটে ' . pbd_bn(count($m['data']['airlines'])) . 'টি এয়ারলাইনের ইকোনমি লাগেজ ও হাতব্যাগের নিয়ম — প্রতিটির নিজের সাইট থেকে।'; }
    }
    if ($m['type'] === 'visa') {
        $d = $m['data'];
        if ($m['item']) {
            $c = $m['item'];
            $k = pbd_vs_kind($c['code']);
            $s['index'] = !empty($c['index']) && !empty($c['release']) && $c['release'] <= gmdate('Y-m-d');
            $s['title'] = 'বাংলাদেশি পাসপোর্টে ' . $c['name'] . ' যেতে ভিসা লাগে? ' . $k[0] . ' (২০২৬)';
            $s['desc'] = 'বাংলাদেশিদের জন্য ' . $c['name'] . ': ' . $k[0] . ' — ' . $k[3] . '। ঢাকা বিমানবন্দরের নিয়ম, কাজের ভিসা, টাকা পাঠানো ও সরকারি সাইটের লিংক।';
            $s['faq'] = pbd_vs_faq($d, $c);
        } else {
            $s['index'] = true;
            $s['title'] = 'বাংলাদেশি পাসপোর্টে ভিসা ছাড়া কোন কোন দেশে যাওয়া যায় ২০২৬';
            $s['desc'] = 'বাংলাদেশি পাসপোর্টে ' . pbd_bn($d['counts']['free']) . 'টি দেশে ভিসা লাগে না, ' . pbd_bn($d['counts']['voa']) . 'টিতে অন-অ্যারাইভাল, ' . pbd_bn($d['counts']['evisa']) . 'টিতে ই-ভিসা — ' . pbd_bn(count($d['countries'])) . 'টি দেশের পুরো তালিকা।';
        }
    }
    if ($m['type'] === 'ramadan') {
        $d = $m['data'];
        $s['index'] = true;
        $yr = pbd_bn(substr($d['ramadan']['start'], 0, 4));
        if ($m['item']) {
            $c = $d['city']; $r0 = $d['rows'][0];
            $s['title'] = pbd_rz_place($c) . ' রমজান ক্যালেন্ডার ' . $yr . ': সেহরি ও ইফতারের সময়সূচি';
            $s['desc'] = $c['name'] . 'য় রমজান শুরু (সম্ভাব্য) ' . pbd_date($d['ramadan']['start']) . '। প্রথম রোজায় সেহরি ' . pbd_t($r0['sehri']) . ', ইফতার ' . pbd_t($r0['iftar']) . '। ৩০ দিনের সময়সূচি, আজকের নামাজের সময়, ছবি ডাউনলোড ও প্রিন্ট।';
            $s['faq'] = pbd_rz_faq($d);
        } else {
            $s['title'] = 'প্রবাসে রমজান ক্যালেন্ডার ' . $yr . ': দোহা, দুবাই, ইতালি, প্যারিস, আমেরিকা, কানাডা';
            $s['desc'] = pbd_bn(count($d['cities'])) . 'টি শহরের সেহরি ও ইফতারের সময়সূচি — মধ্যপ্রাচ্য, মালয়েশিয়া, ইউরোপ, আমেরিকা ও কানাডা। স্থানীয় সময়ে, ছবি ডাউনলোড ও প্রিন্টসহ।';
        }
    }
    if ($m['type'] === 'embassy') {
        if ($m['item']) {
            $o = $m['item'];
            $s['title'] = pbd_emb_title($o);
            $s['desc'] = pbd_emb_desc($o);
            $s['index'] = true;
            $s['faq'] = $o['faq'];
            $s['nodes'] = pbd_emb_nodes($o, $m['path']);
        } else {
            $s['title'] = 'Bangladesh Embassy abroad – address, phone, hotline | বিদেশে বাংলাদেশ দূতাবাস';
            $s['desc'] = 'বিদেশে বাংলাদেশের দূতাবাস, হাইকমিশন ও কনস্যুলেটের সরকারি ঠিকানা, ফোন, হটলাইন ও সেবা — সূত্রসহ, যাচাই ২৫ নভেম্বর ২০২৬।';
            $s['index'] = true;
            $s['faq'] = pbd_emb_hub_faq();
            $s['nodes'] = array('pbdCrumbs' => pbd_crumbs_ld(array(array('বিদেশে বাংলাদেশ দূতাবাস', '/embassy/'))));
        }
    }
    $en = pbd_en();   // English name next to the Bangla, for English/Banglish searchers
    if ($en['label'] !== '') {
        // English label only when the title stays short (the theme adds " | প্রবাসী ইনফো" after it);
        // long agency names pushed titles past 90 characters. The description still carries it.
        // Passport-office titles already mix in the English/Banglish search name.
        if ($m['type'] !== 'passport-office' && $m['type'] !== 'embassy') {
            if (!function_exists('mb_strlen') || mb_strlen($s['title'] . ' | ' . $en['label']) <= 62) {
                $s['title'] .= ' | ' . $en['label'];
            }
            $s['desc'] = $en['label'] . ': ' . $s['desc'];
        }
    }
    if ($en['faq']) { $s['faq'] = array_merge($s['faq'], $en['faq']); }
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
    if (!empty($s['nodes'])) { foreach ($s['nodes'] as $k => $v) { $data[$k] = $v; } }
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
            if (preg_match('#^/agency/rl-(\d+)/$#', $r['path'], $mm)) { $y = pbd_ag_xi($mm[1]); if ($y && !empty($y['v']) && !empty($y['x'])) { continue; } }
            echo '<url><loc>' . esc_url(home_url($r['path'])) . '</loc><lastmod>' . esc_html($r['lastmod']) . '</lastmod></url>';
        }
    }
    foreach (pbd_po_all() as $k => $o) { if ($o['addr'] !== '' && $o['phone'] !== '') { echo '<url><loc>' . esc_url(home_url('/passport-office/' . $k . '/')) . '</loc><lastmod>2026-11-25</lastmod></url>'; } }
    echo '<url><loc>' . esc_url(home_url('/embassy/')) . '</loc><lastmod>2026-11-25</lastmod></url>';
    foreach (pbd_emb_all() as $k => $o) { echo '<url><loc>' . esc_url(home_url('/embassy/' . $k . '/')) . '</loc><lastmod>2026-11-25</lastmod></url>'; }
    echo '</urlset>';
}

/* one purge after going live, so cached 404s for the new paths disappear */
add_action('init', function () {
    if (PBD_MODE !== 'live' || get_option('pbd_purged') === PBD_VER) { return; }
    update_option('pbd_purged', PBD_VER, false);
    if (class_exists('\RankMath\Sitemap\Cache')) { \RankMath\Sitemap\Cache::invalidate_storage(); }  // rebuild index with our sitemap
    do_action('litespeed_purge_all');   // new version: homepage tiles + every data page
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
function pbd_head($crumbs, $h1, $sub = '') {
    $o = '<div class="art-hd"><div class="w"><nav class="crumbs" aria-label="ব্রেডক্রাম্ব"><a href="' . esc_url(home_url('/')) . '">হোম</a>';
    foreach ($crumbs as $c) {
        $o .= '<span>›</span>' . ($c[1] ? '<a href="' . esc_url(home_url($c[1])) . '">' . esc_html($c[0]) . '</a>' : '<span>' . esc_html($c[0]) . '</span>');
    }
    $o .= '</nav><h1>' . esc_html($h1) . '</h1>';
    if ($sub !== '') { $o .= '<p class="pbd-en" lang="en">' . esc_html($sub) . '</p>'; }
    return $o . '</div></div><div class="w"><div class="art" style="grid-template-columns:minmax(0,1fr)"><article class="art-main"><div class="ct pbd">';
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
    if ($m['type'] === 'ramadan') { return pbd_gm_css() . pbd_rz_css() . ($m['item'] ? pbd_rz_city($m['data']) : pbd_rz_hub($m['data'])); }
    if ($m['type'] === 'visa') { return pbd_gm_css() . pbd_ag_css() . ($m['item'] ? pbd_vs_one($m['data'], $m['item']) : pbd_vs_hub($m['data'])); }
    if ($m['type'] === 'customs') { return pbd_rm_css() . ($m['item'] ? pbd_cu_topic($m['data'], $m['item']) : pbd_cu_hub($m['data'])); }
    if ($m['type'] === 'baggage') { return $m['item'] ? pbd_bg_one($m['data'], $m['item']) : pbd_bg_hub($m['data']); }
    if ($m['type'] === 'agency') { return pbd_ag_css() . pbd_v18_css() . ($m['item'] ? (pbd_ag_v2($m['item']) ? pbd_ag_one2($m['data'], $m['item']) : pbd_ag_one($m['data'], $m['item'])) : pbd_ag_hub2($m['data'])); }
    if ($m['type'] === 'passport-office') { return pbd_ag_css() . pbd_v18_css() . ($m['item'] ? pbd_po_one($m['slug'], $m['item']) : pbd_po_hub()); }
    if ($m['type'] === 'embassy') { return pbd_ag_css() . pbd_v18_css() . ($m['item'] ? pbd_emb_one($m['slug'], $m['item']) : pbd_emb_hub()); }
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
        $qq = strtolower(preg_replace('/^(?:r\.?\s*l\.?|আর\s*এল|আরএল)[-\s.:]*/iu', '', strtr($q, array('০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4', '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9'))));
        $hits = array();
        if (ctype_digit($qq)) { $qq = ltrim($qq, '0'); }   // RL0746 / 0746 → 746
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

/* ---------- customs (NBR baggage rules) + airline baggage ---------- */
function pbd_cu_rows($rows) {
    $o = '<div class="pbd-st">';
    foreach ($rows as $r) { $o .= '<div><i>' . esc_html($r[0]) . '</i><span><b>' . esc_html($r[1]) . '</b>' . esc_html($r[2]) . '</span></div>'; }
    return $o . '</div>';
}
function pbd_cu_faq($t) { return isset($t['faq']) ? $t['faq'] : array(); }
function pbd_cu_topic($d, $t) {
    $o = pbd_head(array(array('কাস্টমস ও ব্যাগেজ', '/customs/'), array($t['name'], '')), $t['h1']);
    $o .= '<div class="pbd-hero"><small>' . esc_html($t['icon']) . ' ব্যাগেজ বিধিমালা ২০২৫</small><div class="big" style="font-size:1.6em">' . esc_html($t['big']) . '</div>'
        . '<span class="pbd-chip">🏛️ সরকারি নিয়ম</span><span class="pbd-chip">📅 যাচাই ' . pbd_date($d['updated']) . '</span></div>';
    $o .= pbd_cu_rows($t['rows']);
    if (!empty($t['table'])) {
        $o .= '<h2>শুল্কের তালিকা (প্রতিটি ১টি)</h2><div class="pbd-tw"><table><tr><th>পণ্য</th><th>শুল্ক (টাকা)</th></tr>';
        foreach ($t['table'] as $r) { $o .= '<tr><td>' . esc_html($r[0]) . '</td><td><b>৳' . esc_html($r[1]) . '</b></td></tr>'; }
        $o .= '</table></div>';
    }
    if (!empty($t['calc'])) {
        $c = $t['calc'];
        $o .= '<h2>স্বর্ণের বারে কত শুল্ক — হিসাব করুন</h2><div class="pbd-calc"><label>বারের ওজন (গ্রাম)<input id="pbdG" type="number" min="0" max="' . (int) $c['max_g'] . '" value="' . (int) $c['max_g'] . '"></label>'
            . '<div class="pbd-tot"><small>শুল্ক দিতে হবে (প্রায়)</small><b id="pbdGD">—</b><p id="pbdGN"></p></div></div>'
            . '<script>(function(){var g=document.getElementById("pbdG");function bn(s){return String(s).replace(/\d/g,function(d){return "০১২৩৪৫৬৭৮৯"[d]})}function r(){var v=parseFloat(g.value)||0,t=v/' . (float) $c['per_g'] . ';document.getElementById("pbdGD").textContent="৳ "+bn(Math.round(t*' . (int) $c['duty'] . ').toLocaleString("en-IN"));document.getElementById("pbdGN").textContent=v>' . (int) $c['max_g'] . '?"⚠️ ' . pbd_bn($c['max_g']) . ' গ্রামের বেশি আনা যায় না — বাজেয়াপ্ত হবে":"প্রায় "+bn(t.toFixed(2))+" ভরি × ৳৫,০০০";}g.oninput=r;r();})();</script>';
    }
    if (!empty($t['note'])) { $o .= '<div class="pbd-warn"><b>ℹ️ জেনে রাখুন</b><ul><li>' . esc_html($t['note']) . '</li></ul></div>'; }
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_cu_faq($t) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o .= pbd_cu_more($d, $t['slug']);
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html(implode('; ', $t['src'])) . '। <a href="' . esc_url($d['sro_url']) . '" target="_blank" rel="nofollow noopener">বিধিমালার পিডিএফ (nbr.gov.bd)</a>। যাচাই ' . pbd_date($d['updated']) . '।</p>';
    return $o . pbd_foot();
}
function pbd_cu_more($d, $skip) {
    $o = '<h2>আরও নিয়ম</h2><div class="pbd-tiles">';
    foreach ($d['topics'] as $x) { if ($x['slug'] !== $skip) { $o .= '<a href="' . esc_url(home_url('/customs/' . $x['slug'] . '/')) . '"><span style="font-size:1.4em">' . esc_html($x['icon']) . '</span><span>' . esc_html($x['name']) . '</span></a>'; } }
    if ($skip !== '') { $o .= '<a href="' . esc_url(home_url('/customs/')) . '"><span style="font-size:1.4em">🧳</span><span>সব কাস্টমস নিয়ম</span></a>'; }
    $o .= '<a href="' . esc_url(home_url('/baggage/')) . '"><span style="font-size:1.4em">✈️</span><span>এয়ারলাইনের লাগেজ</span></a></div>';
    return $o;
}
function pbd_cu_hub($d) {
    $h = $d['hub'];
    $o = pbd_head(array(array('কাস্টমস ও ব্যাগেজ', '')), 'বিদেশ থেকে কী কী আনা যায়: ব্যাগেজ রুল ২০২৫');
    $o .= '<div class="pbd-hero"><small>🧳 অপর্যটক যাত্রী ব্যাগেজ বিধিমালা ২০২৫</small><div class="big" style="font-size:1.6em">৬৫ কেজি + ৩৫ কেজি ফ্রি</div>'
        . '<span class="pbd-chip">🏛️ এনবিআর</span><span class="pbd-chip">📅 যাচাই ' . pbd_date($d['updated']) . '</span></div>';
    $o .= pbd_cu_more($d, '') . '<h2>মূল নিয়ম এক নজরে</h2>' . pbd_cu_rows($h['rows']);
    $o .= '<h2>যা শুল্কমুক্ত আনা যায় (প্রতিটি ১টি)</h2><ul class="pbd-need">';
    foreach ($h['free'] as $x) { $o .= '<li>' . esc_html($x) . '</li>'; }
    $o .= '</ul><div class="pbd-warn"><b>⛔ নিষিদ্ধ ও ঘোষণা দিতে হবে</b><ul><li>' . esc_html($h['banned']) . '</li></ul></div>';
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($d['sro']) . '; ' . esc_html($d['bb']) . '। <a href="' . esc_url($d['sro_url']) . '" target="_blank" rel="nofollow noopener">বিধিমালার পিডিএফ</a></p>';
    return $o . pbd_foot();
}
function pbd_bg_one($d, $a) {
    $o = pbd_head(array(array('এয়ারলাইনের লাগেজ', '/baggage/'), array($a['name'], '')), $a['name'] . ' লাগেজ কত কেজি: ইকোনমি ভাড়া অনুযায়ী');
    $o .= '<div class="pbd-hero"><small>' . pbd_flag($a['flag']) . ' ' . esc_html($a['name_en']) . '</small><div class="big" style="font-size:1.6em">চেকড লাগেজ</div>'
        . '<span class="pbd-chip">✔️ এয়ারলাইনের নিজের সাইট</span><span class="pbd-chip">📅 ' . pbd_date($a['accessed']) . '</span></div>';
    $o .= '<div class="pbd-tw"><table><tr><th>ভাড়ার ধরন (ইকোনমি)</th><th>চেকড লাগেজ</th></tr>';
    foreach ($a['fares'] as $f) { $o .= '<tr><td>' . esc_html($f[0]) . '</td><td><b>' . esc_html($f[1]) . '</b></td></tr>'; }
    $o .= '</table></div>' . pbd_cu_rows(array(array('🎒', 'হাতব্যাগ (কেবিন)', $a['cabin']), array('ℹ️', 'আরও', $a['note']),
        array('🎟️', 'আপনার টিকিটে কত', 'টিকিট বা ই-টিকিটের "Baggage" ঘরে আপনার ভাড়ার আসল ওজন লেখা থাকে — সেটাই চূড়ান্ত।')));
    $o .= '<div class="pbd-warn"><b>দেশে নামার পর কাস্টমস</b><ul><li>এয়ারলাইন যত কেজিই দিক, শুল্কমুক্ত সীমা ৬৫ + ৩৫ কেজি — <a href="' . esc_url(home_url('/customs/')) . '">ব্যাগেজ রুল ২০২৫</a>।</li></ul></div>';
    $o .= '<h2>অন্য এয়ারলাইন</h2><div class="pbd-tiles">';
    foreach ($d['airlines'] as $x) { if ($x['slug'] !== $a['slug']) { $o .= pbd_bg_tile($x); } }
    $o .= '</div><p class="pbd-src">সূত্র: <a href="' . esc_url($a['source']) . '" target="_blank" rel="nofollow noopener">' . esc_html(pbd_host($a['source'])) . '</a>, দেখা হয়েছে ' . pbd_date($a['accessed']) . '। এয়ারলাইন নিয়ম বদলাতে পারে — টিকিট কাটার সময় মিলিয়ে নিন।</p>';
    return $o . pbd_foot();
}
function pbd_bg_hub($d) {
    $o = pbd_head(array(array('এয়ারলাইনের লাগেজ', '')), 'কোন এয়ারলাইনে কত কেজি লাগেজ: ঢাকা রুট');
    $o .= '<div class="pbd-hero"><small>✈️ ইকোনমি ক্লাস</small><div class="big" style="font-size:1.6em">' . pbd_bn(count($d['airlines'])) . 'টি এয়ারলাইন</div><span class="pbd-chip">✔️ প্রতিটির নিজের সাইট থেকে</span><span class="pbd-chip">📅 ' . pbd_date($d['updated']) . '</span></div>';
    $o .= '<div class="pbd-tw"><table><tr><th>এয়ারলাইন</th><th>সবচেয়ে সস্তা ভাড়ায়</th><th>হাতব্যাগ</th></tr>';
    foreach ($d['airlines'] as $a) { $o .= '<tr><td><a href="' . esc_url(home_url('/baggage/' . $a['slug'] . '/')) . '">' . esc_html($a['name']) . '</a></td><td>' . esc_html($a['fares'][0][1]) . '</td><td>' . esc_html(preg_replace('/\s*\(.*$/u', '', $a['cabin'])) . '</td></tr>'; }
    $o .= '</table></div><p>বিমান বাংলাদেশ, ইউএস-বাংলা, সৌদিয়া ও টার্কিশের ঢাকা রুটের লাগেজ তাদের সাইটে এখন পড়া যাচ্ছে না — যাচাই করা গেলে যোগ হবে।</p>';
    $o .= pbd_cu_more($d, '') . '<p class="pbd-src">প্রতিটি এয়ারলাইনের সূত্র তার নিজের পাতায় দেওয়া আছে।</p>';
    return $o . pbd_foot();
}
function pbd_bg_tile($x) {
    return '<a href="' . esc_url(home_url('/baggage/' . $x['slug'] . '/')) . '">' . pbd_flag($x['flag']) . '<span>' . esc_html($x['name']) . '<small>' . esc_html($x['fares'][0][1]) . ' থেকে</small></span></a>';
}

/* ---------- visa rules for the Bangladeshi passport ---------- */
function pbd_vs_kind($code) {
    $k = substr((string) $code, 0, 1);
    $days = preg_replace('/\D/', '', (string) $code);
    $map = array(
        'F' => array('ভিসা লাগে না', 'up', '✅', $days ? pbd_bn($days) . ' দিন পর্যন্ত ভিসা ছাড়া থাকা যায়' : 'আগে থেকে ভিসা ছাড়াই যাওয়া যায়'),
        'A' => array('অন-অ্যারাইভাল ভিসা', 'up', '🛬', 'পৌঁছে বিমানবন্দর/সীমান্তে ভিসা নেওয়া যায়'),
        'T' => array('ইটিএ (অনলাইন অনুমতি)', 'warn', '📝', 'যাওয়ার আগে অনলাইনে ইলেকট্রনিক ট্রাভেল অথরাইজেশন নিতে হয়'),
        'E' => array('ই-ভিসা', 'warn', '💻', 'যাওয়ার আগে অনলাইনে ই-ভিসা আবেদন করতে হয়'),
        'V' => array('ভিসা লাগবে', 'dn', '🏛️', 'যাওয়ার আগে দূতাবাস বা তাদের ভিসা সেন্টারে আবেদন করতে হয়'),
        'X' => array('প্রবেশ নিষেধ', 'dn', '⛔', 'বাংলাদেশি পাসপোর্টে এই দেশে প্রবেশের অনুমতি নেই'),
    );
    return isset($map[$k]) ? $map[$k] + array(4 => $k) : array('তথ্য নেই', 'warn', 'ℹ️', '', $k);
}
function pbd_vs_faq($d, $c) {
    $k = pbd_vs_kind($c['code']);
    $q = array(array('বাংলাদেশি পাসপোর্টে ' . $c['name'] . ' যেতে কি ভিসা লাগে?', $k[0] . ' — ' . $k[3] . ' (' . pbd_date($d['updated']) . ' পর্যন্ত তথ্য অনুযায়ী)।'));
    $q[] = array($c['name'] . ' কাজের জন্য গেলে কী লাগবে?', 'ভ্রমণ ভিসায় কাজ করা যায় না। কাজের জন্য সেই দেশের ওয়ার্ক ভিসা/পারমিট, আর বাংলাদেশ থেকে বিএমইটি ছাড়পত্র (স্মার্ট কার্ড) লাগবে।');
    if (!empty($c['portal'])) { $q[] = array($c['name'] . 'র ভিসা কোথায় চেক করব?', 'সরকারি সাইট ' . pbd_host($c['portal']['url']) . '-এ।'); }
    return $q;
}
function pbd_vs_one($d, $c) {
    $k = pbd_vs_kind($c['code']);
    $o = pbd_head(array(array('দেশভিত্তিক ভিসা', '/visa/'), array($c['name'], '')), 'বাংলাদেশি পাসপোর্টে ' . $c['name'] . ': ' . $k[0]);
    $o .= '<div class="pbd-hero"><small>' . pbd_flag($c['iso2']) . ' ' . esc_html($c['name_en']) . ' · বাংলাদেশি পাসপোর্ট</small><div class="big">' . $k[2] . ' ' . esc_html($k[0]) . '</div>'
        . '<span class="pbd-chip ' . $k[1] . '">' . esc_html($k[3]) . '</span><span class="pbd-chip">📅 ' . pbd_date($d['updated']) . '</span>';
    if (!empty($c['portal'])) { $o .= '<a class="pbd-go" href="' . esc_url($c['portal']['url']) . '" target="_blank" rel="nofollow noopener"><i>🏛️</i><div><b>সরকারি ভিসা সাইট</b><span>' . esc_html(pbd_host($c['portal']['url'])) . '</span></div><em>➜</em></a>'; }
    $o .= '</div>';
    if (!empty($c['owned'])) { $o .= '<p>📖 ' . esc_html($c['name']) . ' ভিসার কাগজপত্র ও আবেদনের বিস্তারিত: <a href="' . esc_url($c['owned']['url']) . '">' . esc_html($c['owned']['title']) . '</a></p>'; }
    $rows = array();
    if ($k[4] === 'F') { $rows[] = array('🛂', 'ভিসা ছাড়া মানে', 'আগে আবেদন লাগে না, তবে ইমিগ্রেশন অফিসার প্রবেশ দেবেন কি না তা তাঁর সিদ্ধান্ত। ফিরতি টিকিট, থাকার ঠিকানা আর খরচের টাকা দেখাতে প্রস্তুত থাকুন।'); }
    if ($k[4] === 'A') { $rows[] = array('🛬', 'অন-অ্যারাইভাল মানে', 'পৌঁছানোর পর ভিসা ফি দিয়ে ভিসা নিতে হয়। ফিরতি টিকিট, হোটেল বুকিং ও পর্যাপ্ত টাকা সাথে রাখুন।'); }
    if ($k[4] === 'E' || $k[4] === 'T') { $rows[] = array('💻', 'অনলাইনে আবেদন', 'শুধু দেশটির সরকারি সাইট থেকে আবেদন করুন — একই রকম দেখতে অনেক ভুয়া সাইট বাড়তি টাকা নেয়।' . (!empty($c['portal']) ? ' সরকারি সাইট: ' . pbd_host($c['portal']['url']) . '।' : '')); }
    if ($k[4] === 'V') { $rows[] = array('🏛️', 'কোথায় আবেদন', 'ঢাকায় দেশটির দূতাবাস বা তাদের নিয়োজিত ভিসা সেন্টারে (যেমন ভিএফএস)। দূতাবাস না থাকলে পাশের দেশের (প্রায়ই দিল্লি) দূতাবাস দায়িত্বে থাকে।'); }
    $rows[] = array('🛫', 'ঢাকা বিমানবন্দরে', 'পাসপোর্টের মেয়াদ অন্তত ৬ মাস রাখুন। কাজের উদ্দেশ্যে গেলে বিএমইটি ছাড়পত্র ছাড়া ইমিগ্রেশন পার হওয়া যায় না।');
    $o .= '<h2>বাংলাদেশিদের জন্য যা জানা দরকার</h2>' . pbd_cu_rows($rows);
    $links = array();
    if (!empty($c['portal'])) { $links[] = array('🔎', 'ভিসা চেক', home_url($c['portal']['check'])); }
    if (!empty($c['currency'])) { $links[] = array('💱', 'টাকা পাঠানোর হিসাব', home_url('/remittance/' . $c['currency'] . '/')); }
    if (!empty($c['gcc'])) { $links[] = array('🩺', 'গামকা মেডিকেল', home_url('/gamca/')); }
    if (!empty($c['cost'])) { $links[] = array('🧾', 'সরকারি খরচ ৳' . pbd_num($c['cost']['bdt']), home_url('/migration-cost/')); }
    $links[] = array('🏢', 'এজেন্সি যাচাই', home_url('/agency/'));
    $links[] = array('🧳', 'ফেরার সময় কাস্টমস', home_url('/customs/'));
    $o .= '<h2>' . esc_html($c['name']) . ' যাওয়ার আগে কাজে লাগবে</h2><div class="pbd-tiles">';
    foreach ($links as $l) { $o .= '<a href="' . esc_url($l[2]) . '"><span style="font-size:1.4em">' . $l[0] . '</span><span>' . esc_html($l[1]) . '</span></a>'; }
    $o .= '</div>';
    if (!empty($c['rel'])) {
        $o .= '<h2>' . esc_html($c['name']) . ' নিয়ে আরও পড়ুন</h2><ul class="pbd-rel">';
        foreach ($c['rel'] as $r) { $o .= '<li><a href="' . esc_url($r['url']) . '">' . esc_html($r['title']) . '</a></li>'; }
        $o .= '</ul>';
    }
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_vs_faq($d, $c) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o .= '<p><a href="' . esc_url(home_url('/visa/')) . '">সব দেশের তালিকা →</a></p>';
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($d['source']) . ', হালনাগাদ ' . pbd_date($d['updated']) . '। এটি সরকারি তালিকা নয় — নিয়ম হঠাৎ বদলাতে পারে, টিকিট কাটার আগে দূতাবাস বা এয়ারলাইনে নিশ্চিত হোন।</p>';
    return $o . pbd_foot();
}
function pbd_vs_hub($d) {
    $o = pbd_head(array(array('দেশভিত্তিক ভিসা', '')), 'বাংলাদেশি পাসপোর্টে কোন দেশে ভিসা লাগে, কোথায় লাগে না');
    $n = $d['counts'];
    $o .= '<div class="pbd-hero"><small>🛂 বাংলাদেশি পাসপোর্ট</small><div class="big">' . pbd_bn($n['free'] + $n['voa'] + $n['eta']) . 'টি দেশে আগে ভিসা লাগে না</div>'
        . '<span class="pbd-chip up">✅ ভিসা ছাড়া ' . pbd_bn($n['free']) . '</span><span class="pbd-chip up">🛬 অন-অ্যারাইভাল ' . pbd_bn($n['voa']) . '</span><span class="pbd-chip">💻 ই-ভিসা ' . pbd_bn($n['evisa']) . '</span><span class="pbd-chip">📅 ' . pbd_date($d['updated']) . '</span></div>';
    $o .= '<input class="pbd-find" type="search" placeholder="🔍 দেশের নাম লিখুন" oninput="var q=this.value.toLowerCase();document.querySelectorAll(\'.pbd-vs a\').forEach(function(e){e.style.display=e.textContent.toLowerCase().indexOf(q)>-1?\'\':\'none\'})">';
    $groups = array('F' => array(), 'A' => array(), 'T' => array(), 'E' => array(), 'V' => array(), 'X' => array());
    foreach ($d['countries'] as $c) { $g = substr($c['code'], 0, 1); if (isset($groups[$g])) { $groups[$g][] = $c; } }
    foreach ($groups as $g => $cs) {
        if (!$cs) { continue; }
        $k = pbd_vs_kind($g);
        usort($cs, function ($a, $b) { return strcmp($a['name'], $b['name']); });
        $o .= '<h2>' . $k[2] . ' ' . esc_html($k[0]) . ' (' . pbd_bn(count($cs)) . ')</h2><div class="pbd-tiles pbd-vs">';
        foreach ($cs as $c) {
            $days = preg_replace('/\D/', '', $c['code']);
            $o .= '<a href="' . esc_url(home_url('/visa/' . $c['slug'] . '/')) . '">' . pbd_flag($c['iso2']) . '<span>' . esc_html($c['name']) . ($days ? '<small>' . pbd_bn($days) . ' দিন</small>' : '') . '</span></a>';
        }
        $o .= '</div>';
    }
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($d['source']) . ', হালনাগাদ ' . pbd_date($d['updated']) . '। সরকারি তালিকা নয় — ভ্রমণের আগে দূতাবাসে নিশ্চিত হোন।</p>';
    return $o . pbd_foot();
}

/* ---------- Ramadan calendars for expat cities ---------- */
function pbd_t($min) {   // minutes after midnight → ৫:২৪ (12-hour, the way Bangladeshi calendars print it)
    $min = (($min % 1440) + 1440) % 1440;
    $h = intdiv($min, 60) % 12; if ($h === 0) { $h = 12; }
    return pbd_bn($h . ':' . str_pad((string) ($min % 60), 2, '0', STR_PAD_LEFT));
}
function pbd_wd($i) { $w = array('রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'); return $w[(int) $i]; }
function pbd_rz_year($d) { return pbd_bn(substr($d['ramadan']['start'], 0, 4)); }
function pbd_rz_place($c) { return $c['name'] === $c['country'] ? $c['name'] : $c['name'] . ' (' . $c['country'] . ')'; }
function pbd_rz_days_left($start) {
    $n = (int) floor((strtotime($start . ' 00:00:00 UTC') - time()) / 86400);
    return $n;
}
function pbd_rz_faq($d) {
    $c = $d['city']; $r0 = $d['rows'][0]; $place = pbd_rz_place($c);
    return array(
        array($place . ' রমজান কবে শুরু হবে?', 'সম্ভাব্য ' . pbd_date($d['ramadan']['start']) . ' (' . pbd_wd($r0['wd']) . ')। চাঁদ দেখার ওপর নির্ভর করে এক দিন আগে-পরে হতে পারে — স্থানীয় মসজিদের ঘোষণা দেখুন।'),
        array($c['name'] . 'য় প্রথম রোজার সেহরি ও ইফতার কখন?', 'সেহরির শেষ সময় ভোর ' . pbd_t($r0['sehri']) . ', ইফতার সন্ধ্যা ' . pbd_t($r0['iftar']) . ' (স্থানীয় সময়)।'),
        array('এই সময়সূচি কোন নিয়মে হিসাব করা?', $c['methodName'] . ' পদ্ধতিতে, ' . $c['name'] . 'র স্থানাঙ্ক ও স্থানীয় সময় অঞ্চল (ডেলাইট সেভিংসহ) ধরে। আসর হানাফি মতে।'),
    );
}
function pbd_rz_city($d) {
    $c = $d['city']; $rows = $d['rows']; $place = pbd_rz_place($c); $yr = pbd_rz_year($d);
    $left = pbd_rz_days_left($d['ramadan']['start']);
    $o = pbd_head(array(array('রমজান ক্যালেন্ডার', '/ramadan/'), array($c['name'], '')), $place . ' রমজান ক্যালেন্ডার ' . $yr . ': সেহরি ও ইফতারের সময়');
    $o .= '<div class="pbd-hero"><small>' . pbd_flag($c['iso2']) . ' ' . esc_html($place) . ' · স্থানীয় সময়</small>'
        . '<div class="big" style="font-size:1.45em">রমজান শুরু (সম্ভাব্য) ' . pbd_date($d['ramadan']['start']) . '</div>'
        . ($left > 0 ? '<span class="pbd-chip up">⏳ আর ' . pbd_bn($left) . ' দিন</span>' : '<span class="pbd-chip up">🌙 রমজান চলছে</span>')
        . '<span class="pbd-chip">🌅 প্রথম সেহরি ' . pbd_t($rows[0]['sehri']) . '</span><span class="pbd-chip">🌇 প্রথম ইফতার ' . pbd_t($rows[0]['iftar']) . '</span></div>';
    $o .= '<div class="pbd-rz-act"><button type="button" data-rz="download">📥 ছবি ডাউনলোড</button><button type="button" data-rz="share">📤 শেয়ার করুন</button><button type="button" onclick="window.print()">🖨️ প্রিন্ট</button></div>';
    $today = gmdate('Y-m-d');
    $o .= '<div class="pbd-rz"><div class="pbd-rz-ttl">' . esc_html($place) . ' — রমজান ' . pbd_bn($d['ramadan']['hijriYear']) . ' হিজরি / ' . $yr . '</div><div class="pbd-tw"><table class="pbd-rzt"><tr><th>রোজা</th><th>তারিখ</th><th>বার</th><th>সেহরি শেষ</th><th>ইফতার</th></tr>';
    $img = array();
    foreach ($rows as $r) {
        $cls = $r['date'] === $today ? ' class="now"' : (($r['day'] === 10 || $r['day'] === 20) ? ' class="mark"' : '');
        $dt = pbd_date($r['date']);
        $dt = preg_replace('/\s\S+$/u', '', $dt); // drop the year in the table
        $o .= '<tr' . $cls . '><td>' . pbd_bn($r['day']) . '</td><td>' . $dt . '</td><td>' . pbd_wd($r['wd']) . '</td><td><b class="s">' . pbd_t($r['sehri']) . '</b></td><td><b class="i">' . pbd_t($r['iftar']) . '</b></td></tr>';
        $img[] = array(pbd_bn($r['day']), $dt, pbd_wd($r['wd']), pbd_t($r['sehri']), pbd_t($r['iftar']));
    }
    $o .= '</table></div><p class="pbd-rz-note">চাঁদ দেখা সাপেক্ষে তারিখ এক দিন এদিক-ওদিক হতে পারে · সতর্কতার জন্য সেহরি ২–৩ মিনিট আগে শেষ করুন · probashiinfo.com</p></div>';
    $t = $d['todayTimes'];
    $o .= '<h2>আজ ' . esc_html($c['name']) . 'য় নামাজের সময় (' . pbd_date($d['localDate']) . ')</h2><div class="pbd-pt">';
    foreach (array(array('ফজর', 'fajr', '🌄'), array('সূর্যোদয়', 'sunrise', '☀️'), array('যোহর', 'dhuhr', '🕛'), array('আসর (হানাফি)', 'asr', '🌤️'), array('মাগরিব', 'maghrib', '🌇'), array('এশা', 'isha', '🌙')) as $p) {
        $o .= '<div><i>' . $p[2] . '</i><span>' . $p[0] . '</span><b>' . pbd_t($t[$p[1]]) . '</b></div>';
    }
    $o .= '</div>';
    $o .= '<div class="pbd-warn"><b>ℹ️ জেনে রাখুন</b><ul><li>সময় ' . esc_html($c['methodName']) . ' পদ্ধতিতে হিসাব করা — আপনার এলাকার মসজিদের সময়সূচির সাথে ১–৫ মিনিট পার্থক্য হতে পারে, মসজিদের সময়ই মেনে চলুন।</li><li>রমজান শুরুর তারিখ উম্মুল কুরা (সৌদি) ক্যালেন্ডার অনুযায়ী; স্থানীয় চাঁদ দেখা কমিটি ভিন্ন দিন ঘোষণা করতে পারে।</li></ul></div>';
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_rz_faq($d) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    if (!empty($d['others'])) {
        $o .= '<h2>আশপাশের শহর</h2><div class="pbd-tiles">';
        foreach ($d['others'] as $x) { $o .= '<a href="' . esc_url(home_url('/ramadan/' . $x['slug'] . '/')) . '">' . pbd_flag($x['iso2']) . '<span>' . esc_html($x['name']) . '<small>' . esc_html($x['country']) . '</small></span></a>'; }
        $o .= '</div>';
    }
    $o .= '<p><a href="' . esc_url(home_url('/ramadan/')) . '">সব শহরের রমজান ক্যালেন্ডার →</a></p>';
    $o .= '<p class="pbd-src">হিসাব: জ্যোতির্বিজ্ঞানের প্রচলিত পদ্ধতি (PrayTimes), ' . esc_html($c['methodName']) . ', স্থানাঙ্ক ' . pbd_bn(round($c['lat'], 2)) . ', ' . pbd_bn(round($c['lon'], 2)) . ', সময় অঞ্চল ' . esc_html($c['zone']) . '।</p>';
    $data = array('title' => $c['name'] . ' রমজান ক্যালেন্ডার ' . $yr, 'sub' => $c['country'] . ' · রমজান ' . pbd_bn($d['ramadan']['hijriYear']) . ' হিজরি · স্থানীয় সময়', 'rows' => $img, 'slug' => $c['slug']);
    $o .= '<script type="application/json" id="rzData">' . wp_json_encode($data, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) . '</script>' . pbd_rz_js();
    return $o . pbd_foot();
}
function pbd_rz_hub($d) {
    $yr = pbd_rz_year($d); $left = pbd_rz_days_left($d['ramadan']['start']);
    $o = pbd_head(array(array('রমজান ক্যালেন্ডার', '')), 'প্রবাসে রমজান ক্যালেন্ডার ' . $yr . ': শহরভিত্তিক সেহরি ও ইফতার');
    $o .= '<div class="pbd-hero"><small>🌙 রমজান ' . pbd_bn($d['ramadan']['hijriYear']) . ' হিজরি</small><div class="big" style="font-size:1.45em">শুরু (সম্ভাব্য) ' . pbd_date($d['ramadan']['start']) . '</div>'
        . ($left > 0 ? '<span class="pbd-chip up">⏳ আর ' . pbd_bn($left) . ' দিন</span>' : '<span class="pbd-chip up">🌙 রমজান চলছে</span>')
        . '<span class="pbd-chip">' . pbd_bn(count($d['cities'])) . 'টি শহর</span><span class="pbd-chip">📥 ছবি · 🖨️ প্রিন্ট</span></div>';
    $o .= '<p>মধ্যপ্রাচ্য, মালয়েশিয়া, ইউরোপ, আমেরিকা, কানাডা — যে শহরে আছেন সেটি বেছে নিন। প্রতিটি পাতায় ৩০ দিনের সেহরি-ইফতারের সময়, আজকের নামাজের সময়, আর ছবি ডাউনলোড ও প্রিন্টের সুবিধা।</p>';
    $o .= '<input class="pbd-find" type="search" placeholder="🔍 শহর বা দেশের নাম লিখুন" oninput="var q=this.value.toLowerCase();document.querySelectorAll(\'.pbd-rzh a\').forEach(function(e){e.style.display=e.textContent.toLowerCase().indexOf(q)>-1?\'\':\'none\'})">';
    $lab = array('gulf' => 'মধ্যপ্রাচ্য', 'asia' => 'এশিয়া', 'europe' => 'ইউরোপ', 'americas' => 'আমেরিকা ও কানাডা', 'oceania' => 'অস্ট্রেলিয়া', 'africa' => 'আফ্রিকা');
    $g = array();
    foreach ($d['cities'] as $c) { $g[$c['region']][] = $c; }
    foreach ($lab as $k => $name) {
        if (empty($g[$k])) { continue; }
        $o .= '<h2>' . esc_html($name) . '</h2><div class="pbd-tiles pbd-rzh">';
        foreach ($g[$k] as $c) { $o .= '<a href="' . esc_url(home_url('/ramadan/' . $c['slug'] . '/')) . '">' . pbd_flag($c['iso2']) . '<span>' . esc_html($c['name']) . '<small>' . esc_html($c['country']) . ' · ইফতার ' . pbd_t($c['first']['iftar']) . '</small></span></a>'; }
        $o .= '</div>';
    }
    $o .= '<p class="pbd-src">প্রথম রোজার ইফতারের সময় দেখানো হয়েছে (স্থানীয় সময়)। তারিখ উম্মুল কুরা ক্যালেন্ডার অনুযায়ী সম্ভাব্য।</p>';
    return $o . pbd_foot();
}
function pbd_rz_css() {
    return '<style>.pbd .pbd-rz-act{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.pbd .pbd-rz-act button{flex:1 1 140px;border:0;border-radius:14px;padding:12px 10px;font-weight:700;font-size:1em;font-family:inherit;cursor:pointer;background:var(--bs,#e9f1fd);color:var(--b2,#0a3f96)}
.pbd .pbd-rz-act button:first-child{background:var(--g,#16a34a);color:#fff}
.pbd .pbd-rz-ttl{display:none;font-weight:800;font-size:1.3em;margin:0 0 8px}
.pbd .pbd-rzt td,.pbd .pbd-rzt th{text-align:center;padding:7px 6px}.pbd .pbd-rzt b.s{color:var(--g,#16a34a)}.pbd .pbd-rzt b.i{color:#c2410c}
.pbd .pbd-rzt tr.mark td{background:#fff7df}.pbd .pbd-rzt tr.now td{background:#dcfce7;font-weight:800}
.pbd .pbd-rz-note{font-size:.82em;color:var(--mut,#6a7a93);margin:.5em 0 0}
.pbd .pbd-pt{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pbd .pbd-pt div{background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);border-radius:14px;padding:10px;text-align:center;min-width:0}
.pbd .pbd-pt i{font-style:normal;font-size:1.3em;display:block}.pbd .pbd-pt span{display:block;font-size:.85em;color:var(--mut,#6a7a93)}.pbd .pbd-pt b{font-size:1.25em}
@media(max-width:420px){.pbd .pbd-rzt{font-size:.85em}.pbd .pbd-rzt td,.pbd .pbd-rzt th{padding:6px 3px}}
@media print{body *{visibility:hidden!important}.pbd-rz,.pbd-rz *{visibility:visible!important}.pbd-rz{position:absolute;left:0;top:0;width:100%}.pbd .pbd-rz-ttl{display:block}.pbd .pbd-tw{border:0;overflow:visible}.pbd .pbd-rzt{font-size:12pt}.pbd .pbd-rzt td,.pbd .pbd-rzt th{padding:4px;border:1px solid #999}}</style>';
}
function pbd_rz_js() {
    $logo = 'https://probashiinfo.com/wp-content/uploads/2026/10/probashiinfo-wordmark.webp';
    return '<script>(function(){var el=document.getElementById("rzData");if(!el)return;var D=JSON.parse(el.textContent);var W=1080,H=1600,B="#0b56c4",NV="#082a63",SUN="#f5b301";'
        . 'function img(s){return new Promise(function(ok){var i=new Image();i.onload=function(){ok(i)};i.onerror=function(){ok(null)};i.src=s})}'
        . 'function draw(){var f=document.fonts?Promise.all([\'700 40px "Hind Siliguri"\',\'800 56px "Anek Bangla"\'].map(function(x){return document.fonts.load(x,"রমজান ০১২৩")})).catch(function(){}):Promise.resolve();'
        . 'return f.then(function(){return img(' . wp_json_encode($logo) . ')}).then(function(logo){var c=document.createElement("canvas");c.width=W;c.height=H;var x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,W,H);'
        . 'if(logo){var lw=300,lh=lw*logo.height/logo.width;x.drawImage(logo,50,30,lw,lh)}x.textAlign="right";x.fillStyle=NV;x.font=\'700 26px "Hind Siliguri",sans-serif\';x.fillText("probashiinfo.com",W-50,72);'
        . 'var g=x.createLinearGradient(0,130,W,330);g.addColorStop(0,B);g.addColorStop(1,NV);x.fillStyle=g;x.fillRect(0,130,W,200);x.fillStyle=SUN;x.fillRect(0,330,W,8);'
        . 'x.textAlign="left";x.fillStyle="#fff";x.font=\'800 56px "Anek Bangla","Hind Siliguri",sans-serif\';x.fillText(D.title,50,222);x.font=\'500 30px "Hind Siliguri",sans-serif\';x.fillStyle="#dbe8fb";x.fillText(D.sub,50,284);'
        . 'x.textAlign="right";x.fillStyle=SUN;x.font=\'700 80px "Hind Siliguri",sans-serif\';x.fillText("☪",W-50,262);'
        . 'var top=370,rh=36,cols=[100,270,470,720,945],hd=["রোজা","তারিখ","বার","সেহরি শেষ","ইফতার"];x.fillStyle=NV;x.fillRect(30,top,W-60,52);x.fillStyle="#fff";x.font=\'700 28px "Hind Siliguri",sans-serif\';x.textAlign="center";hd.forEach(function(h,i){x.fillText(h,cols[i],top+36)});'
        . 'D.rows.forEach(function(r,i){var y=top+52+i*rh;x.fillStyle=i%2?"#f1f6fd":"#fff";if(i===9||i===19)x.fillStyle="#fff7df";x.fillRect(30,y,W-60,rh);x.fillStyle="#1d2a3a";x.font=\'500 25px "Hind Siliguri",sans-serif\';x.fillText(r[0],cols[0],y+26);x.fillText(r[1],cols[1],y+26);x.fillText(r[2],cols[2],y+26);x.font=\'700 27px "Hind Siliguri",sans-serif\';x.fillStyle="#15803d";x.fillText(r[3],cols[3],y+26);x.fillStyle="#c2410c";x.fillText(r[4],cols[4],y+26)});'
        . 'var end=top+52+D.rows.length*rh;x.strokeStyle="#d6e2f3";x.lineWidth=2;x.strokeRect(30,top,W-60,end-top);x.fillStyle="#5f6b7a";x.font=\'500 22px "Hind Siliguri",sans-serif\';x.fillText("চাঁদ দেখা সাপেক্ষে তারিখ এক দিন এদিক-ওদিক হতে পারে · সতর্কতার জন্য সেহরি ২–৩ মিনিট আগে শেষ করুন",W/2,end+40);'
        . 'var g2=x.createLinearGradient(0,H-80,W,H);g2.addColorStop(0,"#E11D48");g2.addColorStop(1,"#F97316");x.fillStyle=g2;x.fillRect(0,H-80,W,80);x.fillStyle="#fff";x.font=\'700 28px "Hind Siliguri",sans-serif\';x.fillText("প্রবাসী ইনফো · probashiinfo.com/ramadan",W/2,H-30);return c})}'
        . 'function blob(){return draw().then(function(c){return new Promise(function(ok){c.toBlob(ok,"image/png")})})}var name="ramadan-calendar-"+D.slug+".png";'
        . 'function dl(b){var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500)}'
        . 'document.querySelectorAll("[data-rz]").forEach(function(btn){btn.addEventListener("click",function(){var k=btn.getAttribute("data-rz"),t=btn.textContent;btn.textContent="তৈরি হচ্ছে…";blob().then(function(b){btn.textContent=t;if(k==="share"){var f=new File([b],name,{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:D.title,text:D.title+" — "+location.href}).catch(function(){});if(navigator.share)return navigator.share({title:D.title,url:location.href}).catch(function(){});window.open("https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(location.href),"_blank");return}dl(b)})})})})();</script>';
}

/* ---------- homepage: "এক ক্লিকে প্রবাসী সেবা" (data tools) under the hero ---------- */
add_action('wp_footer', function () {
    if (!is_front_page() || is_paged() || is_admin()) { return; }
    $rm = pbd_data('remittance'); $vs = pbd_data('visa'); $rz = pbd_data('ramadan'); $ag = pbd_data('agency-index');
    $gm = pbd_data('gamca'); $vc = pbd_data('visa-check'); $cu = pbd_data('customs'); $mc = pbd_data('migration-cost');
    $sar = null;
    if ($rm) { foreach ($rm['currencies'] as $c) { if ($c['code'] === 'sar') { $sar = $c; break; } } }
    $vfree = $vs ? $vs['counts']['free'] + $vs['counts']['voa'] + $vs['counts']['eta'] : 0;
    $gmn = $gm ? array_sum(array_column($gm['cities'], 'count')) : 0;
    $tiles = array(
        array('/ramadan/', '🌙', 'রমজান ক্যালেন্ডার', $rz ? 'শুরু ' . preg_replace('/\s\S+$/u', '', pbd_date($rz['ramadan']['start'])) . ' · ' . pbd_bn(count($rz['cities'])) . ' শহর' : 'প্রবাসের শহরে', '#7c3aed'),
        array('/remittance/', '💱', 'টাকার হিসাব', $sar ? '১ রিয়াল = ৳' . pbd_num($sar['rate'], 2) . ' + ২.৫%' : 'প্রণোদনাসহ', '#16a34a'),
        array('/visa-check/', '🛂', 'ভিসা চেক', $vc ? pbd_bn(count($vc['countries']) + count($vc['existing'])) . ' দেশ · সরকারি সাইট' : 'সরকারি সাইট', '#0b56c4'),
        array('/visa/', '🌍', 'কোথায় ভিসা লাগে না', $vfree ? pbd_bn($vfree) . 'টি দেশে আগে ভিসা ছাড়া' : 'বাংলাদেশি পাসপোর্ট', '#0891b2'),
        array('/agency/', '🏢', 'এজেন্সি যাচাই', $ag ? pbd_num(count($ag['agencies'])) . ' লাইসেন্স' : 'বিএমইটি তালিকা', '#e11d48'),
        array('/gamca/', '🩺', 'গামকা মেডিকেল', $gmn ? pbd_bn($gmn) . 'টি সেন্টার' : 'সেন্টার তালিকা', '#db2777'),
        array('/customs/', '🧳', 'কাস্টমস নিয়ম', '৬৫+৩৫ কেজি ফ্রি · স্বর্ণ · মোবাইল', '#d97706'),
        array('/baggage/', '✈️', 'লাগেজ কত কেজি', $cu ? pbd_bn(count($cu['airlines'])) . 'টি এয়ারলাইন' : 'এয়ারলাইন', '#0284c7'),
        array('/migration-cost/', '🧾', 'সরকারি খরচ', $mc ? pbd_bn(count($mc['countries'])) . ' দেশে সর্বোচ্চ কত' : 'অভিবাসন ব্যয়', '#475569'),
    );
    ?>
<section class="pbh" id="pbh" aria-label="এক ক্লিকে প্রবাসী সেবা"><div class="w">
  <div class="pbh-hd"><h2>এক ক্লিকে প্রবাসী সেবা</h2><span>সরকারি সূত্রের তথ্য · প্রতিদিন হালনাগাদ</span></div>
  <div class="pbh-g">
<?php foreach ($tiles as $t) { ?>
    <a class="pbh-t" href="<?php echo esc_url(home_url($t[0])); ?>" style="--c:<?php echo esc_attr($t[4]); ?>"><i><?php echo $t[1]; ?></i><b><?php echo esc_html($t[2]); ?></b><small><?php echo esc_html($t[3]); ?></small></a>
<?php } ?>
  </div>
  <form class="pbh-s" method="get" action="<?php echo esc_url(home_url('/agency/')); ?>"><span>🏢</span><input name="q" type="search" placeholder="এজেন্সির নাম বা আরএল নম্বর লিখে যাচাই করুন" aria-label="এজেন্সি যাচাই"><button type="submit">যাচাই</button></form>
</div></section>
<style>
.pbh{padding:26px 0 8px}.pbh .w{box-sizing:border-box}
.pbh-hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 14px}
.pbh-hd h2{margin:0;font-size:24px}.pbh-hd span{font-size:14px;color:var(--mut,#6a7a93)}
.pbh-g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.pbh-t{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:12px;align-items:center;padding:14px;border-radius:18px;background:var(--card,#fff);border:1px solid var(--line,#e2e8f1);text-decoration:none!important;color:var(--ink,#0f1f38)!important;min-width:0;overflow:hidden;transition:transform .15s,box-shadow .15s}
.pbh-t:before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:var(--c)}
.pbh-t:hover{transform:translateY(-2px);box-shadow:0 10px 22px -12px var(--c)}
.pbh-t i{grid-row:1/3;font-style:normal;font-size:26px;width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--c) 14%,#fff)}
.pbh-t b{font-size:17px;line-height:1.3;min-width:0}.pbh-t small{font-size:13.5px;color:var(--c);font-weight:700;line-height:1.35;min-width:0;overflow-wrap:anywhere}
.pbh-s{display:flex;align-items:center;gap:8px;margin:14px 0 0;padding:8px 8px 8px 14px;border-radius:16px;background:var(--bs,#e9f1fd)}
.pbh-s span{font-size:20px}.pbh-s input{flex:1;min-width:0;border:0;background:transparent;font-size:16px;padding:8px 0;outline:0}
.pbh-s button{border:0;background:var(--b,#0b56c4);color:#fff;font-weight:700;border-radius:12px;padding:10px 18px;font-size:15px;cursor:pointer}
@media(max-width:820px){.pbh-g{grid-template-columns:repeat(2,1fr)}.pbh-t:last-child:nth-child(odd){grid-column:1/-1}}
@media(max-width:420px){.pbh-g{gap:8px}.pbh-t{padding:11px;column-gap:9px}.pbh-t i{width:42px;height:42px;font-size:22px;border-radius:13px}.pbh-t b{font-size:15px}.pbh-t small{font-size:12px}.pbh-hd h2{font-size:20px}}
</style>
<script>(function(){var s=document.getElementById('pbh'),h=document.querySelector('section.hero3');if(s&&h&&h.parentNode){h.parentNode.insertBefore(s,h.nextSibling);}})();</script>
<?php
}, 5);

/* ---------- English + Banglish: titles, one English + one Banglish FAQ per page, site search ---------- */
// many expats type English ("oman visa check") or Banglish ("doha iftar time koto") — visible text only, no hidden keywords
function pbd_slug_en($slug) {
    $fix = array('uk' => 'UK', 'usa' => 'USA', 'uae' => 'UAE', 'schengen-vfs' => 'Schengen (VFS)', 'coxs-bazar' => "Cox's Bazar",
        'kuwait-city' => 'Kuwait City', 'makkah' => 'Makkah', 'madinah' => 'Madinah', 'new-york' => 'New York', 'los-angeles' => 'Los Angeles',
        'abu-dhabi' => 'Abu Dhabi', 'kuala-lumpur' => 'Kuala Lumpur', 'czech-republic' => 'Czech Republic', 'north-macedonia' => 'North Macedonia',
        'new-zealand' => 'New Zealand', 'south-korea' => 'South Korea', 'sri-lanka' => 'Sri Lanka', 'tv-fridge-ac' => 'TV, fridge, AC',
        'gold-silver' => 'gold and silver', 'mobile-phone' => 'mobile phone', 'money' => 'money and dollars');
    return isset($fix[$slug]) ? $fix[$slug] : ucwords(str_replace('-', ' ', $slug));
}
function pbd_latin($s) {   // Bangla digits → 0-9 for English sentences
    return strtr((string) $s, array('০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4', '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9', 'কেজি' => 'kg', ' টি' => '', 'টি' => ''));
}
function pbd_t_en($min) {
    $min = (($min % 1440) + 1440) % 1440;
    $h = intdiv($min, 60); $ap = $h >= 12 ? 'PM' : 'AM'; $h = $h % 12; if ($h === 0) { $h = 12; }
    return $h . ':' . str_pad((string) ($min % 60), 2, '0', STR_PAD_LEFT) . ' ' . $ap;
}
function pbd_date_en($ymd) { $t = strtotime($ymd . ' 12:00:00 UTC'); return $t ? gmdate('j F Y', $t) : $ymd; }

/** English label (title/description) + one English and one Banglish FAQ for the current data page. */
function pbd_en() {
    static $e = null;
    if ($e !== null) { return $e; }
    $e = array('label' => '', 'faq' => array());
    $m = pbd_match();
    if (!$m || $m['type'] === 'sitemap') { return $e; }
    $d = $m['data']; $it = $m['item']; $t = $m['type'];
    if ($t === 'visa-check') {
        if ($it) {
            $en = pbd_slug_en($it['slug']); $host = pbd_host($it['url']);
            $e['label'] = $en . ' visa check online';
            $e['faq'][] = array('How to check ' . $en . ' visa status online?', 'Only on the official government site ' . $host . ' (' . $it['portal'] . '). Checking is free — do not pay an agent or a look-alike website.');
            $e['faq'][] = array($en . ' visa check kivabe korbo?', 'Shudhu sorkari site ' . $host . '-e giye passport number ar application/reference number diye check korun. Kono taka lage na.');
        } else { $e['label'] = 'Visa check by country — official sites'; }
    } elseif ($t === 'visa') {
        if ($it) {
            $en = $it['name_en']; $k = substr($it['code'], 0, 1); $days = preg_replace('/\D/', '', $it['code']);
            $map = array('F' => 'Visa-free' . ($days ? ' (up to ' . $days . ' days)' : ''), 'A' => 'Visa on arrival', 'T' => 'eTA (online travel authorisation) before travel',
                'E' => 'e-Visa (apply online before travel)', 'V' => 'Visa required (apply at the embassy or its visa centre)', 'X' => 'Entry not allowed');
            $kind = isset($map[$k]) ? $map[$k] : 'Unknown';
            $e['label'] = $en . ' visa for Bangladeshi passport';
            $e['faq'][] = array('Do Bangladeshi passport holders need a visa for ' . $en . '?', $kind . '. Rules change — confirm with the embassy or airline before booking.');
            $bl = array('F' => 'na, visa lagbe na', 'A' => 'airport-e pouchhe visa nite hobe (on arrival)', 'T' => 'jawar age online-e eTA nite hobe', 'E' => 'jawar age online-e e-visa korte hobe', 'V' => 'haan, embassy theke visa lagbe', 'X' => 'Bangladeshi passport-e probesh nishedh');
            $e['faq'][] = array('Bangladeshi passport e ' . $en . ' jete visa lagbe?', isset($bl[$k]) ? ucfirst($bl[$k]) . '.' : '');
        } else { $e['label'] = 'Visa-free countries for Bangladeshi passport'; }
    } elseif ($t === 'remittance') {
        if ($it) {
            $en = pbd_slug_en($it['slug']); $r = number_format($it['rate'], 2);
            $e['label'] = $en . ' to BDT rate today';
            $e['faq'][] = array('1 ' . $en . ' = how many Bangladeshi taka today?', 'About ' . $r . ' taka (mid-market rate, ' . pbd_date_en($d['updated']) . '). With the 2.5% government incentive, 1,000 ' . $en . ' gives about ' . number_format(1000 * $it['rate'] * 1.025) . ' taka.');
            $e['faq'][] = array('1 ' . $en . ' koto taka?', 'Aj prai ' . $r . ' taka. Boidho pothe pathale 2.5% pronodona (incentive) pabe.');
        } else { $e['label'] = 'Remittance calculator — taka rate with 2.5% incentive'; }
    } elseif ($t === 'gamca') {
        if ($it) {
            $en = pbd_slug_en($it['slug']);
            $e['label'] = $en . ' GAMCA medical center list';
            $e['faq'][] = array('How many GAMCA (Wafid) medical centers are in ' . $en . '?', $it['count'] . ' GCC-approved centers on the official Wafid list (' . pbd_date_en($d['updated']) . '). Book at wafid.com; the report is valid for 2 months.');
            $e['faq'][] = array($en . ' e GAMCA medical kothay korbo?', 'Ei page-e ' . $en . '-er sob onumodito center-er thikana ar phone ache. Appointment nite hobe wafid.com theke.');
        } else { $e['label'] = 'GAMCA medical center list Bangladesh'; }
    } elseif ($t === 'passport-office') {
        if ($it) {
            $q = pbd_po_q($it);
            $city = !empty($it['city_en']) ? $it['city_en'] : $q;
            $e['label'] = $q;
            $hours_en = $it['hours'] !== '' ? 'Office time: ' . pbd_latin($it['hours']) . '.' : 'Office time (somoy) is not listed on the official portal — call ' . pbd_latin($it['mobile']) . ' before you go.';
            $e['faq'][] = array('What is the address and phone number of ' . $q . '?',
                'Official name: ' . $it['en'] . '. Address (official portal): ' . pbd_latin($it['addr']) . '. Phone ' . pbd_latin($it['phone']) . ', mobile ' . pbd_latin($it['mobile']) . ', email ' . $it['email'] . '. Passport helpline 16445.');
            $e['faq'][] = array($city . ' passport office kothay? Phone number koto?',
                'Thikana (sorkari portal): ' . pbd_latin($it['addr']) . '. Office phone ' . pbd_latin($it['phone']) . ', mobile ' . pbd_latin($it['mobile']) . '. ' . $hours_en . ' Helpline 16445.');
        } else { $e['label'] = 'Passport office address and phone'; }
    } elseif ($t === 'agency') {
        if ($it) {
            $e['label'] = 'RL ' . $it['rl'] . ' license check';
            $e['faq'][] = array('Is ' . $it['name'] . ' (RL ' . $it['rl'] . ') a licensed recruiting agency?', 'BMET list: license status "' . $it['status'] . '"' . ($it['expiry'] ? ', valid until ' . pbd_date_en($it['expiry']) : '') . '. Verify on raims.oep.gov.bd before paying.');
            $e['faq'][] = array('RL ' . $it['rl'] . ' agency license valid ki?', 'BMET-er talika onujayi license: ' . $it['status'] . '. Taka deyar age raims.oep.gov.bd-e mile nin.');
        } else { $e['label'] = 'Recruiting agency license check (BMET RL number)'; }
    } elseif ($t === 'migration-cost') {
        $e['label'] = 'Government migration cost by country';
        $e['faq'][] = array('What is the government-fixed migration cost for Malaysia?', 'Tk 78,990 per worker (office order of 5 July 2022). The table above lists every country with its order date.');
    } elseif ($t === 'customs') {
        $lab = array('mobile-phone' => 'How many mobile phones can I bring to Bangladesh', 'gold-silver' => 'Gold allowance Bangladesh customs (100g)', 'tv-fridge-ac' => 'TV, fridge, AC customs duty Bangladesh', 'money' => 'How much money / dollars can I bring to Bangladesh');
        $faq = array(
            'mobile-phone' => array(array('How many mobile phones can I bring to Bangladesh duty-free?', '2 used phones and 1 new phone per year (Baggage Rules 2025).'), array('Bidesh theke koyta mobile ana jay?', '2ta puraton ar bochore 1ta notun mobile free.')),
            'gold-silver' => array(array('How much gold can I bring to Bangladesh?', '100 g of gold jewellery a year duty-free. A gold bar up to 117 g (10 tola) once a year at Tk 5,000 per tola.'), array('Bidesh theke koto gram sona ana jay?', '100 gram gohona free. Sonar bar 117 gram porjonto, protiti bhori 5,000 taka shulko.')),
            'tv-fridge-ac' => array(array('What is the customs duty on a TV in Bangladesh?', 'TV up to 29 inch is duty-free; 30–36 inch Tk 10,000, up to Tk 90,000 for 66 inch and above.'), array('TV anle koto tax?', '29 inch porjonto free, 30-36 inch e 10,000 taka.')),
            'money' => array(array('How many dollars can I bring to Bangladesh?', 'Any amount, but declare above USD 10,000 on the FMJ form. Bangladeshi taka: up to Tk 10,000.'), array('Koto dollar ana jay?', 'Jotokhushi, tobe 10,000 dollar-er beshi hole FMJ form-e declare korte hobe.')),
        );
        if ($it) { $e['label'] = isset($lab[$it['slug']]) ? $lab[$it['slug']] : 'Bangladesh baggage rules'; $e['faq'] = isset($faq[$it['slug']]) ? $faq[$it['slug']] : array(); }
        else { $e['label'] = 'Bangladesh baggage rules 2025 (customs)'; $e['faq'][] = array('How much baggage is duty-free in Bangladesh?', '65 kg plus 35 kg of clothes and personal items for passengers aged 12 and over (Baggage Rules 2025).'); }
    } elseif ($t === 'baggage') {
        if ($it) {
            $e['label'] = $it['name_en'] . ' baggage allowance from Dhaka';
            $f = array(); foreach ($it['fares'] as $x) { $f[] = $x[0] . ': ' . pbd_latin($x[1]); }
            $e['faq'][] = array('What is the ' . $it['name_en'] . ' economy baggage allowance from Dhaka?', 'Checked baggage by fare (names in Bangla on this page): ' . implode('; ', array_slice($f, 0, 4)) . '. Your e-ticket shows the final figure.');
            $e['faq'][] = array($it['name_en'] . ' e koto kg luggage newa jay?', 'Sobcheye kom bharay ' . pbd_latin($it['fares'][0][1]) . '. Ticket-er "Baggage" ghore asol ojon lekha thake.');
        } else { $e['label'] = 'Airline baggage allowance from Dhaka'; }
    } elseif ($t === 'ramadan') {
        $yr = substr($d['ramadan']['start'], 0, 4);
        if ($it) {
            $en = pbd_slug_en($it['slug']); $r0 = $d['rows'][0];
            $e['label'] = $en . ' Ramadan calendar ' . $yr . ' — sehri & iftar time';
            $e['faq'][] = array('What time is iftar in ' . $en . ' on the first day of Ramadan ' . $yr . '?', 'Iftar about ' . pbd_t_en($r0['iftar']) . ', sehri ends ' . pbd_t_en($r0['sehri']) . ' (local time). Ramadan is expected to start on ' . pbd_date_en($d['ramadan']['start']) . '.');
            $e['faq'][] = array($en . ' e iftar er somoy koto?', 'Prothom rojay iftar ' . pbd_t_en($r0['iftar']) . ', sehri sesh ' . pbd_t_en($r0['sehri']) . ' (sthaniyo somoy).');
        } else { $e['label'] = 'Ramadan calendar ' . $yr . ' for expats — iftar time by city'; }
    }
    return $e;
}
function pbd_en_faq() { $e = pbd_en(); return $e['faq']; }

/* site search: put matching data pages on top of the results (Bangla, Banglish or English queries) */
add_action('wp_footer', function () {
    if (!is_search()) { return; }
    $q = strtolower(trim(get_search_query()));
    if (mb_strlen($q) < 2) { return; }
    // whole-word match for Latin words ("rate" must not hit "emirates"), substring for Bangla
    $hit = function ($w) use ($q) {
        if ($w === '') { return false; }
        if (preg_match('/^[a-z0-9 \-]+$/', $w)) { return (bool) preg_match('/(?<![a-z])' . preg_quote(trim($w), '/') . '(?![a-z])/', $q); }
        return mb_strpos($q, $w) !== false;
    };
    $has = function ($words) use ($hit) { foreach ((array) $words as $w) { if ($hit($w)) { return true; } } return false; };
    $iso_en = array();   // country English names (from the passport data) so "italy ramadan" finds Rome/Milan/Venice
    $vsd = pbd_data('visa');
    if ($vsd) { foreach ($vsd['countries'] as $c) { $iso_en[strtolower($c['iso2'])] = strtolower($c['name_en']); } }
    $kind = array(
        'ramadan' => array('ramadan', 'ramzan', 'romjan', 'iftar', 'ifter', 'sehri', 'sehri', 'seheri', 'sahri', 'roja', 'রমজান', 'ইফতার', 'সেহরি', 'রোজা'),
        'visa-check' => array('visa check', 'visa status', 'visa cek', 'ভিসা চেক', 'ভিসা যাচাই'),
        'visa' => array('visa free', 'on arrival', 'visa lagbe', 'visa lage', 'ভিসা লাগে', 'ভিসা ছাড়া'),
        'remittance' => array('rate', 'taka', 'bdt', 'remittance', 'remitance', 'রেট', 'টাকা', 'রেমিট্যান্স'),
        'gamca' => array('gamca', 'wafid', 'medical', 'গামকা', 'মেডিকেল'),
        'agency' => array('agency', 'agenci', 'license', 'licence', 'rl ', 'rl-', 'এজেন্সি', 'লাইসেন্স'),
        'customs' => array('custom', 'gold', 'sona', 'mobile', 'phone', 'dollar', 'কাস্টমস', 'স্বর্ণ', 'মোবাইল'),
        'baggage' => array('baggage', 'luggage', 'lagej', 'kg', 'লাগেজ', 'ব্যাগেজ'),
        'passport-office' => array('passport office', 'passport ofice', 'পাসপোর্ট অফিস', 'e-passport office', 'epassport office', 'regional passport office', 'divisional passport office'),
    );
    $want = array(); foreach ($kind as $k => $w) { if ($has($w)) { $want[$k] = 1; } }
    $hits = array();
    $add = function ($url, $title, $sub) use (&$hits) { if (count($hits) < 8 && !isset($hits[$url])) { $hits[$url] = array($title, $sub); } };
    $sets = array('ramadan' => array('ramadan', 'cities'), 'visa-check' => array('visa-check', 'countries'), 'visa' => array('visa', 'countries'),
        'remittance' => array('remittance', 'currencies'), 'gamca' => array('gamca', 'cities'), 'baggage' => array('customs', 'airlines'));
    foreach ($sets as $type => $src) {
        $d = pbd_data($src[0]); if (!$d || empty($d[$src[1]])) { continue; }
        foreach ($d[$src[1]] as $x) {
            $en = strtolower(isset($x['name_en']) ? $x['name_en'] : pbd_slug_en($x['slug']));
            $bn = isset($x['name']) ? $x['name'] : '';
            $alias = array($en, str_replace('-', ' ', $x['slug']), $bn);
            if (isset($x['country'])) { $alias[] = $x['country']; }
            if (isset($x['iso2'], $iso_en[strtolower($x['iso2'])])) { $alias[] = $iso_en[strtolower($x['iso2'])]; }
            if (isset($x['flag'], $iso_en[$x['flag']])) { $alias[] = $iso_en[$x['flag']]; }
            $match = false;
            foreach ($alias as $a) { if ($a !== '' && mb_strlen($a) > 2 && $hit(mb_strtolower($a))) { $match = true; break; } }
            if (!$match || ($want && empty($want[$type]))) { continue; }
            $lab = array('ramadan' => 'রমজান ক্যালেন্ডার', 'visa-check' => 'ভিসা চেক', 'visa' => 'ভিসা লাগে কি না', 'remittance' => 'টাকার রেট', 'gamca' => 'গামকা মেডিকেল', 'baggage' => 'লাগেজ');
            $add(home_url('/' . $type . '/' . $x['slug'] . '/'), $bn . ' — ' . $lab[$type], ucwords($en));
        }
    }
    if (preg_match('/(?:rl[\s-]*)?(\d{2,4})/i', $q, $mm) && (isset($want['agency']) || preg_match('/^\s*(rl[\s-]*)?\d{2,4}\s*$/i', $q))) {
        $add(home_url('/agency/rl-' . (int) $mm[1] . '/'), 'আরএল-' . pbd_bn((int) $mm[1]) . ' এজেন্সির লাইসেন্স', 'RL ' . (int) $mm[1] . ' license check');
    }
    foreach (pbd_po_all() as $k => $o) {
        $alias = array($k, isset($o['short']) ? $o['short'] : '', isset($o['en']) ? strtolower($o['en']) : '', isset($o['en_q']) ? strtolower($o['en_q']) : '', isset($o['city_en']) ? strtolower($o['city_en']) : '');
        if (!empty($o['aliases'])) { foreach ($o['aliases'] as $a) { $alias[] = strtolower($a); } }
        $match = false;
        foreach ($alias as $a) { if ($a !== '' && mb_strlen($a) > 2 && $hit(mb_strtolower($a))) { $match = true; break; } }
        if ($match && (isset($want['passport-office']) || $has(array('passport', 'পাসপোর্ট')))) {
            $add(home_url('/passport-office/' . $k . '/'), $o['short'] . ' পাসপোর্ট অফিস', pbd_po_q($o));
        }
    }
    $hubs = array('ramadan' => array('/ramadan/', 'প্রবাসে রমজান ক্যালেন্ডার', 'Ramadan calendar'), 'visa-check' => array('/visa-check/', 'দেশভিত্তিক ভিসা চেক', 'Visa check'),
        'visa' => array('/visa/', 'কোন দেশে ভিসা লাগে', 'Visa-free countries'), 'remittance' => array('/remittance/', 'রেমিট্যান্স ক্যালকুলেটর', 'Taka rate'),
        'gamca' => array('/gamca/', 'গামকা মেডিকেল সেন্টার', 'GAMCA centers'), 'agency' => array('/agency/?q=' . rawurlencode(get_search_query()), 'এজেন্সি লাইসেন্স যাচাই', 'Agency license'),
        'customs' => array('/customs/', 'কাস্টমস নিয়ম', 'Baggage rules'), 'baggage' => array('/baggage/', 'এয়ারলাইনের লাগেজ', 'Airline baggage'),
        'passport-office' => array('/passport-office/', 'পাসপোর্ট অফিসের ঠিকানা', 'Passport office address'));
    foreach ($want as $k => $_) { if (isset($hubs[$k])) { $add(home_url($hubs[$k][0]), $hubs[$k][1], $hubs[$k][2]); } }
    if (!$hits) { return; }
    echo '<section class="pbs" id="pbs"><div class="w"><h2>সরাসরি তথ্য</h2><div class="pbs-g">';
    foreach ($hits as $url => $h) { echo '<a href="' . esc_url($url) . '"><b>' . esc_html($h[0]) . '</b><small>' . esc_html($h[1]) . '</small></a>'; }
    echo '</div></div></section><style>.pbs{padding:16px 0 4px}.pbs h2{font-size:20px;margin:0 0 10px}.pbs-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.pbs-g a{display:block;padding:12px 14px;border-radius:14px;background:var(--bs,#e9f1fd);border:1px solid var(--line,#e2e8f1);text-decoration:none!important;color:var(--ink,#0f1f38)!important;min-width:0}.pbs-g b{display:block;font-size:16px}.pbs-g small{color:var(--b,#0b56c4);font-weight:600}</style>';
    echo '<script>(function(){var s=document.getElementById("pbs"),h=document.querySelector("section.arch-hd")||document.querySelector("main");if(s&&h){if(h.tagName==="MAIN")h.insertBefore(s,h.firstChild);else h.parentNode.insertBefore(s,h.nextSibling);}})();</script>';
}, 6);

/* visible English + Banglish questions: on top of the page's FAQ, or as a small block at the end */
function pbd_with_en($html) {
    $f = pbd_en_faq();
    if (!$f) { return $html; }
    $x = '';
    foreach ($f as $q) { $x .= '<details lang="en"><summary>' . esc_html($q[0]) . '</summary><p>' . esc_html($q[1]) . '</p></details>'; }
    $h = '<h2>প্রশ্ন ও উত্তর</h2>';
    if (strpos($html, $h) !== false) { return preg_replace('/' . preg_quote($h, '/') . '/u', $h . $x, $html, 1); }
    $end = strrpos($html, '</div></article></div></div>');
    return $end === false ? $html . $x : substr($html, 0, $end) . '<h2>In English</h2>' . $x . substr($html, $end);
}

/* ---------- v18: agency page v2 (area, nearby, BAIRA, gate) + passport offices ---------- */
/* Data: option pbd_ag_extra, uploaded by AutoBlog wp_probashi_data.py (extra …) from the BMET RAIMS list and the
   BAIRA member list. Row: n name, t thana, s status, e expiry, b BAIRA member (RL + name match), tt/ta agencies/active
   in the thana, l active agencies expiring later, nb nearby active RLs, x gate noindex, v template v2 on. */
function pbd_ag_x() {
    static $x = null;
    if ($x === null) { $x = get_option('pbd_ag_extra'); if (!is_array($x) || empty($x['a'])) { $x = array(); } }
    return $x;
}
function pbd_ag_xi($rl) { $x = pbd_ag_x(); $k = (string) (int) $rl; return ($x && isset($x['a'][$k])) ? $x['a'][$k] : null; }
function pbd_ag_v2($a) { $r = pbd_ag_xi($a['rl']); return $r && !empty($r['v']); }
function pbd_days_to($ymd) {
    $t = strtotime($ymd . ' 00:00:00 UTC');
    return $t ? (int) floor(($t - strtotime(gmdate('Y-m-d') . ' 00:00:00 UTC')) / 86400) : null;
}
function pbd_ag_rlpad($rl) { return 'RL' . str_pad((string) (int) $rl, 4, '0', STR_PAD_LEFT); }
/* hand-checked extras only (Bangla name, BAIRA address differing from RAIMS) — nothing auto-generated */
function pbd_ag_manual($rl) {
    $m = array(
        1398 => array('bn' => 'খান জাহান আলী ওভারসিজ', 'baira_addr' => 'Tower-A, 4th Floor, Plot No.-13, Road No.-17, Banani Commercial Area, Banani, Dhaka-1213.'),
        746 => array('bn' => 'নেইবার অ্যাসোসিয়েটস লিমিটেড'),
        320 => array('bn' => 'জেনারেল ট্রেডিং কোম্পানি'),
    );
    return isset($m[(int) $rl]) ? $m[(int) $rl] : array();
}
function pbd_ag_computed($d, $a) {
    $r = pbd_ag_xi($a['rl']); $x = pbd_ag_x(); $o = array();
    if (!empty($a['expiry'])) {
        $n = pbd_days_to($a['expiry']);
        if ($n !== null && $n >= 0) { $o[] = 'মেয়াদ শেষ হতে বাকি ' . pbd_bn($n) . ' দিন (প্রায় ' . pbd_bn((int) round($n / 30.44)) . ' মাস)।'; }
        elseif ($n !== null) { $o[] = 'সরকারি তালিকার মেয়াদের তারিখ (' . pbd_date($a['expiry']) . ') পেরিয়ে গেছে ' . pbd_bn(-$n) . ' দিন আগে।'; }
    }
    if ($r) {
        $tail = ($r['l'] >= 0) ? '; এদের মধ্যে ' . pbd_bn($r['l']) . 'টির মেয়াদ এই এজেন্সির চেয়ে পরে শেষ হবে।' : '।';
        if (!empty($r['t']) && $r['tt'] > 1) { $o[] = 'সরকারি তালিকায় ' . $r['t'] . ' থানার ঠিকানায় মোট ' . pbd_bn($r['tt']) . 'টি এজেন্সি আছে, যার মধ্যে সক্রিয় ' . pbd_bn($r['ta']) . 'টি' . $tail; }
        else { $o[] = 'সরকারি তালিকার ' . pbd_bn($x['total']) . 'টি এজেন্সির মধ্যে সক্রিয় ' . pbd_bn($x['active']) . 'টি' . $tail; }
    }
    return $o;
}
function pbd_ag_faq2($d, $a) {
    $r = pbd_ag_xi($a['rl']); $x = pbd_ag_x(); $st = pbd_ag_status($a['status']); $f = array();
    $f[] = array('RL ' . $a['rl'] . ' কোন এজেন্সির লাইসেন্স নম্বর?', pbd_ag_rlpad($a['rl']) . ' — ' . $a['name'] . ' (' . $st[0] . ', বিএমইটি RAIMS)।');
    if (!empty($a['expiry'])) {
        $f[] = array($a['name'] . '-এর লাইসেন্স কবে পর্যন্ত বৈধ?', $a['status'] === 'Active'
            ? pbd_date($a['expiry']) . ' পর্যন্ত।'
            : 'অবস্থা ' . $st[0] . '; তালিকায় মেয়াদের তারিখ ' . pbd_date($a['expiry']) . '। এই অবস্থায় কর্মী পাঠানো বৈধ নয়।');
    }
    if (!empty($a['address'])) { $f[] = array($a['name'] . '-এর অফিস কোথায়?', $a['address'] . ($r && !empty($r['t']) ? ' (' . $r['t'] . ' থানা)' : '') . '।'); }
    if (!empty($a['phone'])) { $f[] = array($a['name'] . '-এর ফোন নম্বর কত?', $a['phone'] . ' (সরকারি তালিকার অফিস নম্বর)।'); }
    if ($r && !empty($r['b'])) { $f[] = array($a['name'] . ' কি BAIRA-র সদস্য?', 'হ্যাঁ, BAIRA সদস্য তালিকায় RL ' . $a['rl'] . ' নম্বরে আছে।'); }
    return $f;
}
function pbd_ag_one2($d, $a) {
    $st = pbd_ag_status($a['status']); $r = pbd_ag_xi($a['rl']); $x = pbd_ag_x(); $man = pbd_ag_manual($a['rl']);
    $bn = isset($man['bn']) ? ' — ' . $man['bn'] : '';
    $o = pbd_head(array(array('এজেন্সি যাচাই', '/agency/'), array('আরএল-' . pbd_bn($a['rl']), '')), $a['name'] . ' (RL ' . $a['rl'] . ')' . $bn . ': লাইসেন্স যাচাই');
    $o .= '<!--pbd-u--><div class="pbd-hero"><small>🏢 রিক্রুটিং এজেন্সি · আরএল-' . pbd_bn($a['rl']) . ' · ' . pbd_ag_rlpad($a['rl']) . '</small><div class="big" style="font-size:1.4em">' . esc_html($a['name']) . '</div>'
        . '<span class="pbd-chip ' . $st[1] . '">' . $st[2] . ' ' . esc_html($st[0]) . '</span>'
        . ($a['expiry'] ? '<span class="pbd-chip">⏳ মেয়াদ ' . pbd_date($a['expiry']) . '</span>' : '')
        . '</div>';
    $c = pbd_ag_computed($d, $a);
    if ($c) { $o .= '<p class="pbd-calc">' . esc_html(implode(' ', $c)) . '</p>'; }
    $src = '<a href="' . esc_url($d['source_url']) . '" target="_blank" rel="nofollow noopener">RAIMS</a>';
    $rows = array(array('লাইসেন্স নম্বর', pbd_ag_rlpad($a['rl']), $src), array('নাম (সরকারি তালিকায়)', $a['name'], $src), array('অবস্থা', $st[0] . ' (' . $a['status'] . ')', $src));
    if ($a['expiry']) { $rows[] = array('লাইসেন্সের মেয়াদ', pbd_date($a['expiry']), $src); }
    if ($a['address']) { $rows[] = array('ঠিকানা', $a['address'], $src); }
    if ($a['phone']) { $rows[] = array('অফিসের ফোন', $a['phone'], $src); }
    if ($r && !empty($r['b'])) { $rows[] = array('BAIRA সদস্য', 'হ্যাঁ (RL ' . $a['rl'] . ')', '<a href="' . esc_url('https://www.baira.org.bd/dir/agency-information/' . (int) $a['rl']) . '" target="_blank" rel="nofollow noopener">BAIRA</a>'); }
    $o .= '<div class="pbd-tw"><table>';
    foreach ($rows as $w) { $o .= '<tr><th>' . esc_html($w[0]) . '</th><td>' . esc_html($w[1]) . '</td><td>' . $w[2] . '</td></tr>'; }
    $o .= '</table></div>';
    if (!empty($man['baira_addr']) && $a['address']) {
        $o .= '<div class="pbd-warn"><b>⚠️ ঠিকানা দুই সূত্রে আলাদা</b><p>সরকারি তালিকায় (RAIMS): “' . esc_html($a['address']) . '”। BAIRA সদস্য তালিকায়: “' . esc_html($man['baira_addr']) . '”। অফিস বদল হয়ে থাকতে পারে — যাওয়ার আগে সরকারি তালিকার অফিস ফোনে' . ($a['phone'] ? ' (' . esc_html($a['phone']) . ')' : '') . ' ফোন করে বর্তমান ঠিকানা নিশ্চিত হোন। এটি কোনো অভিযোগ নয়, শুধু দুই তালিকার পার্থক্য।</p></div>';
    }
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_ag_faq2($d, $a) as $f) { $o .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o .= '<!--/pbd-u-->';
    $o .= '<p class="pbd-src">📅 সরকারি তালিকা যাচাই: ' . pbd_date($d['updated']) . ' (আজ ' . pbd_date(gmdate('Y-m-d')) . ')।</p>';
    $o .= '<details><summary>অবস্থা বা ঠিকানা কি বদলাতে পারে?</summary><p>হ্যাঁ। তালিকা বিএমইটি হালনাগাদ করে; টাকা দেওয়ার আগে oep.gov.bd/agencies-এ আবার দেখুন, আর অন্য কোনো নম্বর (যেমন WhatsApp) থেকে যোগাযোগ করলে সরকারি তালিকার অফিস ফোনে নিশ্চিত হোন। BAIRA ব্যবসায়ীদের সংগঠন — লাইসেন্স দেয় বিএমইটি।</p></details>';
    $o .= '<div class="pbd-st"><div><i>' . $st[2] . '</i><span><b>' . esc_html($st[0]) . ' মানে</b>' . esc_html($st[3]) . '</span></div></div>';
    if ($r && !empty($r['nb'])) {
        $o .= '<h2>' . (!empty($r['t']) ? esc_html($r['t']) . ' এলাকার' : 'কাছাকাছি নম্বরের') . ' আরও সক্রিয় এজেন্সি</h2><ul class="pbd-nb">';
        foreach ($r['nb'] as $n) {
            $y = isset($x['a'][(string) $n]) ? $x['a'][(string) $n] : null; if (!$y) { continue; }
            $o .= '<li><a href="' . esc_url(home_url('/agency/rl-' . (int) $n . '/')) . '">' . esc_html($y['n']) . ' (RL ' . (int) $n . ')</a>' . ($y['e'] ? ' — মেয়াদ ' . pbd_date($y['e']) : '') . '</li>';
        }
        $o .= '</ul><p class="pbd-src">এলাকার হিসাব: সরকারি তালিকা, ' . pbd_date($x['upd']) . '।</p>';
    }
    $o .= '<details><summary>লাইসেন্স বাতিল বা স্থগিত এজেন্সিকে টাকা দিয়ে ফেললে কী করব?</summary><p>টাকা দেওয়ার রসিদ ও কাগজ নিয়ে বিএমইটি বা জেলা কর্মসংস্থান ও জনশক্তি অফিসে লিখিত অভিযোগ দিন।</p></details>';
    $o .= '<h2>টাকা দেওয়ার আগে ৫টি যাচাই</h2><ol class="pbd-steps">'
        . '<li>এজেন্সির লাইসেন্স সক্রিয় কি না সরকারি তালিকায় দেখুন: <a href="https://oep.gov.bd/agencies" target="_blank" rel="nofollow noopener">oep.gov.bd/agencies</a> (পুরোনো ঠিকানা raims.oep.gov.bd/agencies)।</li>'
        . '<li>ভিসা আসল কি না সেই দেশের সরকারি সাইটে মিলিয়ে নিন — <a href="' . esc_url(home_url('/visa-check/')) . '">দেশভিত্তিক ভিসা চেক</a>।</li>'
        . '<li>সরকার নির্ধারিত খরচের চেয়ে বেশি চাইলে লিখিত হিসাব চান — <a href="' . esc_url(home_url('/migration-cost/')) . '">সরকার নির্ধারিত অভিবাসন ব্যয়</a>।</li>'
        . '<li>প্রতিটি টাকার রসিদ নিন, এজেন্সির নাম ও আরএল নম্বরসহ।</li>'
        . '<li>বিএমইটি ছাড়পত্র (স্মার্ট কার্ড) ছাড়া কাজের ভিসায় বিদেশ যাবেন না।</li></ol>';
    $o .= '<h2>নিজে কীভাবে যাচাই করবেন</h2><ol class="pbd-steps"><li>oep.gov.bd/agencies খুলে Search বক্সে RL নম্বর (চার অঙ্কে, যেমন ' . pbd_ag_rlpad($a['rl']) . ') বা নাম লিখুন।</li><li>“License Status” কলামে Active আর “License validity date” ভবিষ্যতের তারিখ কি না দেখুন।</li><li>যে অফিসে আপনাকে ডাকা হচ্ছে তার ঠিকানা ও ফোন সরকারি তালিকার সাথে মিলিয়ে নিন। না মিললে টাকা দেবেন না।</li></ol>';
    $o .= '<div class="pbd-warn"><b>⚠️ সতর্কতা</b><p>প্রতারকরা অনেক সময় বৈধ এজেন্সির নাম ও RL নম্বর ব্যবহার করে অন্য ঠিকানা, WhatsApp নম্বর বা ওয়েবসাইট দিয়ে যোগাযোগ করে। লাইসেন্স বৈধ হলেই যোগাযোগকারী ব্যক্তি সেই এজেন্সির লোক — এমন নয়।</p></div>';
    $o .= '<p><a href="' . esc_url(home_url('/agency/')) . '">অন্য এজেন্সি খুঁজুন →</a></p>';
    $o .= '<p class="pbd-src">সূত্র: ' . esc_html($d['source']) . ', ' . pbd_date($d['updated']) . ' তারিখের তালিকা' . ($r && !empty($r['b']) ? '; BAIRA সদস্য তালিকা (baira.org.bd), ' . pbd_date($x['baira_upd']) : '') . '। BAIRA তালিকার ব্যক্তিগত তথ্য (মালিকের নাম, ব্যক্তিগত মোবাইল, ইমেইল) এখানে দেখানো হয় না। অবস্থা বদলাতে পারে — চূড়ান্ত যাচাই সরকারি সাইটে করুন। ভুল দেখলে মন্তব্যে জানান।</p>';
    return $o . pbd_foot();
}
function pbd_ag_hub2($d) {
    $x = pbd_ag_x(); $h = pbd_ag_hub($d);
    if (!$x || isset($_GET['q'])) { return $h; }
    $soon = 0; $areas = array(); $act = 0;
    foreach ($d['agencies'] as $y) { $act += ($y['status'] === 'Active'); }
    foreach ($x['a'] as $y) {
        if ($y['s'] !== 'Active') { continue; }
        if ($y['e']) { $n = pbd_days_to($y['e']); if ($n !== null && $n >= 0 && $n <= 90) { $soon++; } }
        if (!empty($y['t'])) { $areas[$y['t']] = (isset($areas[$y['t']]) ? $areas[$y['t']] : 0) + 1; }
    }
    arsort($areas); $areas = array_slice($areas, 0, 6, true);
    $tot = count($d['agencies']);
    $add = '<h2>আর এল নাম্বার চেক: এক নজরে</h2><p class="pbd-calc">' . pbd_date($d['updated']) . ' তারিখের সরকারি তালিকার ' . pbd_bn($tot) . 'টি এজেন্সির মধ্যে ' . pbd_bn($act) . 'টি (' . pbd_bn((int) round($act * 100 / max(1, $tot))) . '%) সক্রিয়; বাকি ' . pbd_bn($tot - $act) . 'টি দিয়ে এখন বৈধভাবে কর্মী পাঠানো যায় না। সক্রিয়দের মধ্যে ' . pbd_bn($soon) . 'টির মেয়াদ আগামী ৯০ দিনের মধ্যে শেষ হবে — এদের সাথে লেনদেনের আগে নবায়ন হয়েছে কি না দেখুন।</p>';
    $add .= '<p>RL নম্বর দিয়ে খুঁজতে উপরের বক্সে লিখুন — “1398”, “RL1398”, “আর এল ১৩৯৮” সব লেখাই চলে।</p>';
    if ($areas) { $add .= '<h2>যেসব থানায় সবচেয়ে বেশি সক্রিয় এজেন্সি</h2><ul>'; foreach ($areas as $t => $n) { $add .= '<li>' . esc_html($t) . ' — ' . pbd_bn($n) . 'টি</li>'; } $add .= '</ul><p class="pbd-src">মেয়াদ ও থানার হিসাব: সরকারি তালিকা, ' . pbd_date($x['upd']) . '।</p>'; }
    $add .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_ag_hub_faq() as $f) { $add .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $mark = '<h2>লাইসেন্সের অবস্থার মানে</h2>';
    $h = (strpos($h, $mark) !== false) ? str_replace($mark, $add . $mark, $h) : $h;
    return str_replace('</p>' . pbd_foot(), ' সদস্যপদ: <a href="https://www.baira.org.bd/dir/all-member-list/sorting/rl" target="_blank" rel="nofollow noopener">BAIRA সদস্য তালিকা</a>; সরকারি খোঁজ: <a href="https://oep.gov.bd/agencies" target="_blank" rel="nofollow noopener">oep.gov.bd/agencies</a>।</p>' . pbd_foot(), $h);
}
function pbd_ag_hub_faq() {
    return array(
        array('RL নম্বর কী, কোথায় পাব?', 'RL (Recruiting Licence) নম্বর বিএমইটির দেওয়া লাইসেন্স নম্বর; সরকারি তালিকায় চার অঙ্কে লেখা থাকে (যেমন RL0746)। বৈধ এজেন্সি অফিসে ও রসিদে এটি লেখে।'),
        array('সরকারি সাইটে আর এল নাম্বার চেক কীভাবে করব?', 'oep.gov.bd/agencies (পুরোনো ঠিকানা raims.oep.gov.bd/agencies) খুলে Search বক্সে নম্বর বা নাম লিখুন। লগইন লাগে না, ফ্রি।'),
        array('এই পাতার তথ্য কত দিন পর পর হালনাগাদ হয়?', 'প্রতি সপ্তাহে সরকারি তালিকা মিলিয়ে দেখা হয়; যে এজেন্সির অবস্থা বদলায় তার পাতায় নতুন অবস্থা ও তারিখ দেখায়।'),
        array('BAIRA সদস্য হলেই কি এজেন্সি বৈধ?', 'না। BAIRA ব্যবসায়ীদের সংগঠন। লাইসেন্সের চূড়ান্ত সূত্র বিএমইটির সরকারি তালিকা।'),
    );
}

/* ---------- passport offices (official DIP / office portal data only; missing field = "সরকারি তালিকায় নেই") ---------- */
function pbd_po_q($o) {
    return !empty($o['en_q']) ? $o['en_q'] : $o['en'];
}
function pbd_po_aka($o) {
    $a = array($o['en'], pbd_po_q($o));
    if (!empty($o['aliases']) && is_array($o['aliases'])) { $a = array_merge($a, $o['aliases']); }
    $out = array(); $seen = array();
    foreach ($a as $x) {
        $k = strtolower(trim($x));
        if ($k === '' || isset($seen[$k])) { continue; }
        $seen[$k] = 1; $out[] = $x;
    }
    return $out;
}
function pbd_po_sub($o) {
    $aka = array();
    foreach (pbd_po_aka($o) as $x) { if (strcasecmp($x, $o['en']) !== 0) { $aka[] = $x; } }
    $s = 'English: ' . $o['en'];
    if ($aka) { $s .= ' — also searched as ' . implode(', ', array_slice($aka, 0, 3)); }
    return $s;
}
function pbd_po_desc($o) {
    $q = pbd_po_q($o);
    $alt = (stripos($q, 'Comilla') !== false && stripos($q, 'Cumilla') === false) ? ' (Cumilla)' : '';
    return $q . $alt . ' — সরকারি সূত্রে ঠিকানা ' . $o['addr'] . ', ফোন ' . $o['phone'] . ', মোবাইল ' . $o['mobile'] . '। যাচাই ২৫ নভেম্বর ২০২৬।';
}
function pbd_po_all() {
    $fee = array('নিয়মিত ফি, ৪৮ পৃষ্ঠা', '৫ বছর ৪,০২৫ টাকা / ১০ বছর ৫,৭৫০ টাকা (১৫% ভ্যাটসহ)', 'সিটিজেন চার্টার (সিলেট ও উত্তরা অফিস)');
    $del = array('নিয়মিত ডেলিভারি', '১৫ কর্মদিবস (পুলিশ ক্লিয়ারেন্স ও তথ্য সঠিক থাকা সাপেক্ষে)', 'সিটিজেন চার্টার');
    return array(
        'uttara' => array('name' => 'আঞ্চলিক পাসপোর্ট অফিস, উত্তরা, ঢাকা', 'short' => 'উত্তরা', 'en' => 'Regional Passport Office, Uttara, Dhaka', 'en_q' => 'Regional Passport Office Uttara', 'city_en' => 'Uttara', 'aliases' => array('Passport Office Uttara', 'Uttara Passport Office'), 'portal' => 'https://diputtara.dhaka.gov.bd/',
            'addr' => 'প্লট নং-০৫, রোড নং-৩/বি, ব্লক-এইচ, সেক্টর-১৫, উত্তরা, ঢাকা', 'phone' => '০২-৫৫০৮৭০২০', 'mobile' => '০১৭৩৩৩৯৩৩২৮', 'email' => 'rpouttara@passport.gov.bd',
            'src' => 'https://diputtara.dhaka.gov.bd/pages/static-pages/6995df8235ce18e1c07b05ce', 'src_label' => 'অফিসের পোর্টাল — যোগাযোগ (হালনাগাদ ২৩ মার্চ ২০২৪)', 'page_upd' => '2024-03-23',
            'hours' => '', 'area' => '', 'admin' => 'ঢাকা বিভাগের আঞ্চলিক অফিস', 'note' => '', 'fee' => $fee, 'del' => $del),
        'comilla' => array('name' => 'আঞ্চলিক পাসপোর্ট অফিস, কুমিল্লা', 'short' => 'কুমিল্লা', 'en' => 'Regional Passport Office, Cumilla', 'en_q' => 'Passport Office Comilla', 'city_en' => 'Comilla', 'aliases' => array('Comilla Passport Office', 'Passport Office Cumilla', 'Cumilla Passport Office', 'Regional Passport Office Cumilla', 'Regional Passport Office Comilla'), 'portal' => 'https://passport.comilla.gov.bd/',
            'addr' => 'নোয়াপাড়া, ডাকঘর: হালিমানগর, থানা: কোতয়ালী, জেলা: কুমিল্লা', 'phone' => '০৮১-৬৫৭৮৫', 'mobile' => '০১৭৩৩৩৯৩৩৫২', 'email' => 'rpocomilla@passport.gov.bd',
            'src' => 'https://passport.comilla.gov.bd/pages/static-pages/6990e67b35ce18e1c0727f4a', 'src_label' => 'অফিসের পোর্টাল — যোগাযোগ (হালনাগাদ ৭ জুন ২০২১)', 'page_upd' => '2021-06-07',
            'hours' => '', 'area' => '', 'admin' => 'চট্টগ্রাম বিভাগীয় পাসপোর্ট ও ভিসা অফিসের আওতাধীন আঞ্চলিক অফিস (চট্টগ্রাম বিভাগীয় অফিসের সিটিজেন চার্টার)', 'note' => '', 'fee' => $fee, 'del' => $del),
        'sylhet' => array('name' => 'বিভাগীয় পাসপোর্ট ও ভিসা অফিস, সিলেট', 'short' => 'সিলেট', 'en' => 'Divisional Passport and Visa Office, Sylhet', 'en_q' => 'Passport Office Sylhet', 'city_en' => 'Sylhet', 'aliases' => array('Sylhet Passport Office', 'Divisional Passport Office Sylhet', 'Divisional Passport and Visa Office Sylhet'), 'portal' => 'https://passport.sylhetdiv.gov.bd/',
            'addr' => 'আলমপুর, সিলেট', 'phone' => '০২-৯৯৭৭০৪০০৫', 'mobile' => '০১৭৩৩৩৯৩৩৬১', 'email' => 'rpo.sylhet@passport.gov.bd',
            'src' => 'https://passport.sylhetdiv.gov.bd/pages/static-pages/696cb57cc4774958d7ba617b', 'src_label' => 'অফিসের পোর্টাল — যোগাযোগ (হালনাগাদ ১১ অক্টোবর ২০২৬)', 'page_upd' => '2026-10-11',
            'hours' => 'আবেদন জমা নেওয়া হয় সকাল ৯টা থেকে দুপুর ২টা পর্যন্ত (অফিসের নোটিশ, ২ জুন ২০২৬)', 'area' => 'সিলেট জেলা (ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তরের তালিকা)',
            'admin' => 'সিলেট বিভাগের বিভাগীয় অফিস; আওতাধীন আঞ্চলিক অফিস: মৌলভীবাজার, হবিগঞ্জ, সুনামগঞ্জ', 'note' => 'অফিসের যোগাযোগ পাতায় দুটি ইমেইল লেখা: rposylhet@passport.gov.bd ও rpo.sylhet@passport.gov.bd।', 'fee' => $fee, 'del' => $del),
    );
}
function pbd_po_faq($o) {
    $s = $o['short'];
    return array(
        array($o['name'] . '-এর ঠিকানা কোথায়?', 'সরকারি পোর্টাল অনুযায়ী: ' . $o['addr'] . '।'),
        array($s . ' পাসপোর্ট অফিসের ফোন নম্বর কত?', 'অফিস ফোন ' . $o['phone'] . ', মোবাইল ' . $o['mobile'] . ', ইমেইল ' . $o['email'] . ' (সরকারি সূত্র)।'),
        array($s . ' পাসপোর্ট অফিস কখন খোলা থাকে?', $o['hours'] !== '' ? $o['hours'] . '।' : 'অফিস সময় সরকারি তালিকায় লেখা নেই। যাওয়ার আগে ' . $o['mobile'] . ' নম্বরে ফোন করে জেনে নিন।'),
        array($s . ' অফিসে কোন এলাকার মানুষ আবেদন করবেন?', $o['area'] !== '' ? 'আওতা: ' . $o['area'] . '। নিয়ম হলো বর্তমান ঠিকানা যে অফিসের আওতায়, সেখানে আবেদন।' : 'এই অফিসের আওতাধীন এলাকার তালিকা সরকারি সূত্রে পাওয়া যায়নি। নিয়ম হলো বর্তমান ঠিকানা যে অফিসের আওতায়, সেখানে আবেদন — নিশ্চিত হতে অফিসে ফোন করুন।'),
    );
}
function pbd_po_one($k, $o) {
    $age = -pbd_days_to($o['page_upd']);
    $o2 = pbd_head(array(array('পাসপোর্ট অফিস', '/passport-office/'), array($o['short'], '')), $o['short'] . ' পাসপোর্ট অফিস (' . pbd_po_q($o) . '): ঠিকানা, ফোন ও সেবা', pbd_po_sub($o));
    $o2 .= '<!--pbd-u--><div class="pbd-hero"><small>🛂 ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তর</small><div class="big" style="font-size:1.35em">' . esc_html($o['name']) . '</div><span class="pbd-chip">📅 সরকারি সূত্র যাচাই ২৫ নভেম্বর ২০২৬</span></div>';
    $o2 .= '<p class="pbd-calc">১০ বছরের পাসপোর্টে বছরপ্রতি খরচ পড়ে প্রায় ৫৭৫ টাকা, ৫ বছরেরটায় ৮০৫ টাকা — অর্থাৎ ১০ বছরেরটা বছরপ্রতি প্রায় ২৯% সস্তা। ' . esc_html($o['short']) . ' অফিসের যে সরকারি পাতা থেকে যোগাযোগের তথ্য নেওয়া হয়েছে, সেটি শেষ হালনাগাদ হয়েছে ' . pbd_date($o['page_upd']) . ' — আজ থেকে ' . pbd_bn($age) . ' দিন আগে' . ($age > 180 ? '; তাই যাওয়ার আগে ফোন করে নিশ্চিত হোন।' : '।') . '</p>';
    $na = 'সরকারি তালিকায় নেই';
    $rows = array(array('ঠিকানা', $o['addr'], $o['src_label']), array('অফিস ফোন', $o['phone'], $o['src_label']), array('মোবাইল', $o['mobile'], 'ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তর / অফিসের পোর্টাল'),
        array('ইমেইল', $o['email'], 'ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তর / অফিসের পোর্টাল'), array('আবেদন জমার সময়', $o['hours'] !== '' ? $o['hours'] : $na, $o['hours'] !== '' ? 'অফিসের পোর্টাল' : '—'),
        array('সেবা এলাকা (আওতা)', $o['area'] !== '' ? $o['area'] : $na, $o['area'] !== '' ? 'dip.gov.bd' : '—'), array('প্রশাসনিক অবস্থান', $o['admin'], 'সরকারি পোর্টাল / সিটিজেন চার্টার'), $o['fee'], $o['del']);
    $o2 .= '<div class="pbd-tw"><table><caption>সরকারি তথ্য, প্রতিটির সূত্রসহ</caption>';
    foreach ($rows as $w) { $o2 .= '<tr><th>' . esc_html($w[0]) . '</th><td>' . esc_html($w[1]) . '</td><td>' . esc_html($w[2]) . '</td></tr>'; }
    $o2 .= '</table></div><p class="pbd-src"><a href="' . esc_url($o['src']) . '" target="_blank" rel="nofollow noopener">সরকারি যোগাযোগ পাতা</a> · <a href="' . esc_url($o['portal']) . '" target="_blank" rel="nofollow noopener">অফিসের পোর্টাল</a></p>';
    if ($o['note'] !== '') { $o2 .= '<div class="pbd-warn"><b>⚠️ জেনে রাখুন</b><p>' . esc_html($o['note']) . '</p></div>'; }
    $o2 .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_po_faq($o) as $f) { $o2 .= '<details><summary>' . esc_html($f[0]) . '</summary><p>' . esc_html($f[1]) . '</p></details>'; }
    $o2 .= '<!--/pbd-u-->';
    $o2 .= '<h2>ই-পাসপোর্ট স্ট্যাটাস চেক করার ধাপ</h2><ol class="pbd-steps"><li><a href="https://www.epassport.gov.bd/" target="_blank" rel="nofollow noopener">epassport.gov.bd</a> খুলে “Check Status” অংশে যান।</li><li>ডেলিভারি স্লিপে থাকা Online Registration ID বা Application ID লিখুন।</li><li>আবেদনে দেওয়া জন্মতারিখ হুবহু লিখে ক্যাপচা পূরণ করে Check চাপুন।</li><li>অনলাইনে না পারলে পাসপোর্ট হেল্পলাইন: দেশে ১৬৪৪৫, বিদেশ থেকে ০৯৬৬৬৭১৬৪৪৫।</li></ol>';
    $o2 .= '<p>আবেদন জমা দিতে হয় বর্তমান ঠিকানা যে অফিসের আওতায়, সেখানে (সূত্র: পাসপোর্ট অফিসের সিটিজেন চার্টার)।</p>';
    $o2 .= '<p><a href="' . esc_url(home_url('/passport-office/')) . '">← সব পাসপোর্ট অফিস</a></p>';
    $o2 .= '<p class="pbd-src">সূত্র: ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তর (dip.gov.bd) ও অফিসের সরকারি পোর্টাল, যাচাই ২৫ নভেম্বর ২০২৬। সরকারি সূত্রে না থাকা তথ্য এখানে বসানো হয়নি।</p>';
    return $o2 . pbd_foot();
}
function pbd_po_hub() {
    $o = pbd_head(array(array('পাসপোর্ট অফিস', '')), 'পাসপোর্ট অফিস: ঠিকানা, ফোন ও সেবা (Passport Office Address)', 'Official addresses and phone numbers — Uttara, Comilla (Cumilla) and Sylhet.');
    $o .= '<p>যেসব অফিসের তথ্য সরকারি সূত্রে যাচাই করা হয়েছে:</p><ul class="pbd-nb">';
    foreach (pbd_po_all() as $k => $x) { $o .= '<li><a href="' . esc_url(home_url('/passport-office/' . $k . '/')) . '">' . esc_html($x['name']) . '</a> <span lang="en">(' . esc_html(pbd_po_q($x)) . ')</span></li>'; }
    return $o . '</ul><p class="pbd-src">আরও অফিস যোগ হচ্ছে — শুধু সরকারি সূত্রে তথ্য পাওয়া গেলে।</p>' . pbd_foot();
}

/* admin-only: AutoBlog uploads the agency extra data (never public input) */
add_action('rest_api_init', function () {
    register_rest_route('pbd-data/v1', '/agency-extra', array(
        'methods' => array('GET', 'POST'),
        'permission_callback' => function () { return current_user_can('manage_options'); },
        'callback' => function ($req) {
            if ($req->get_method() === 'POST') {
                $d = $req->get_json_params();
                $d = is_array($d) && isset($d['data']) ? $d['data'] : null;
                if (!is_array($d) || empty($d['a']) || !is_array($d['a']) || empty($d['upd'])) { return new WP_Error('bad', 'bad data', array('status' => 400)); }
                $old = get_option('pbd_ag_extra');
                update_option('pbd_ag_extra', $d, false);
                $purged = 0;
                foreach ($d['a'] as $rl => $y) {   // purge pages whose template/gate flag changed
                    $o = (is_array($old) && isset($old['a'][$rl])) ? $old['a'][$rl] : array();
                    if (!isset($o['v']) || $o['v'] !== $y['v'] || !isset($o['x']) || $o['x'] !== $y['x']) { do_action('litespeed_purge_url', home_url('/agency/rl-' . (int) $rl . '/')); $purged++; }
                }
                do_action('litespeed_purge_url', home_url('/agency/'));
                do_action('litespeed_purge_url', home_url('/pbd-sitemap.xml'));
                return array('ok' => 1, 'n' => count($d['a']), 'purged' => $purged);
            }
            $x = get_option('pbd_ag_extra'); $v = 0; $nx = 0;
            if (is_array($x) && !empty($x['a'])) { foreach ($x['a'] as $y) { $v += !empty($y['v']); $nx += !empty($y['x']); } }
            return array('upd' => is_array($x) ? $x['upd'] : null, 'n' => is_array($x) && !empty($x['a']) ? count($x['a']) : 0, 'v2' => $v, 'noindex' => $nx, 'ver' => PBD_VER);
        },
    ));
});

function pbd_crumbs_ld($c) {
    $l = array(array('@type' => 'ListItem', 'position' => 1, 'name' => 'হোম', 'item' => home_url('/')));
    foreach ($c as $i => $x) { $l[] = array('@type' => 'ListItem', 'position' => $i + 2, 'name' => $x[0], 'item' => home_url($x[1])); }
    return array('@type' => 'BreadcrumbList', '@id' => home_url($c[count($c) - 1][1]) . '#crumbs', 'itemListElement' => $l);
}
function pbd_v18_css() {
    return '<style>.pbd .pbd-calc{background:var(--bs,#e9f1fd);border-left:4px solid var(--b,#0b56c4);padding:10px 14px;border-radius:10px}.pbd .pbd-tw{overflow-x:auto}.pbd .pbd-tw caption{text-align:left;font-weight:700;padding:4px 0}.pbd .pbd-tw th{white-space:nowrap}.pbd .pbd-tw td:last-child{font-size:.85em}.pbd ul.pbd-nb li{margin:.25em 0}.art-hd .pbd-en{margin:6px 0 0;font-size:.95em;color:var(--b,#0b56c4);font-weight:600}</style>';
}

/* ---------- embassy / high commission / consulate (v19) ---------- */
function pbd_emb_all() {
    static $d = null;
    if ($d !== null) { return $d; }
    $d = json_decode(<<<'JSON'
{"qatar-doha":{"slug":"qatar-doha","typ":"embassy","typBn":"দূতাবাস","typEn":"Embassy","countryEn":"Qatar","countryBn":"কাতার","countryLoc":"কাতারে","cityEn":"Doha","cityBn":"দোহা","cityGen":"দোহার","cityLoc":"দোহায়","utc":3,"nameEn":"Embassy of the People's Republic of Bangladesh, Doha","nameBn":"দোহায় বাংলাদেশ দূতাবাস","website":"https://doha.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Bldg-153, St-820, Zone-43, New Al-Hilal; PO Box 2080, Doha, Qatar","src":"https://doha.mofa.gov.bd/pages/static-pages/6952667335ce18e1c05a9345","srcName":"দূতাবাসের ওয়েবসাইট – Location (হালনাগাদ ১৩ এপ্রিল ২০২৬)"},{"k":"phone","bn":"ফোন","v":"+974 4467 1927, +974 4467 1557","src":"https://doha.mofa.gov.bd/pages/static-pages/6952669135ce18e1c05aa177","srcName":"দূতাবাসের ওয়েবসাইট – Telephone Number"},{"k":"hotline","bn":"হটলাইন","v":"+974 3366 2000","src":"https://doha.mofa.gov.bd/pages/static-pages/6952669135ce18e1c05aa177","srcName":"দূতাবাসের ওয়েবসাইট – Telephone Number"},{"k":"email","bn":"ইমেইল","v":"mission.doha@mofa.gov.bd","src":"https://doha.mofa.gov.bd/pages/static-pages/6952669135ce18e1c05aa177","srcName":"দূতাবাসের ওয়েবসাইট – Telephone Number"},{"k":"fax","bn":"ফ্যাক্স","v":"+974 4467 1190","src":"https://doha.mofa.gov.bd/pages/static-pages/6952667335ce18e1c05a9345","srcName":"দূতাবাসের ওয়েবসাইট – Location"},{"k":"hours","bn":"অফিস সময়","v":"রবি–বৃহস্পতি সকাল ৮:৩০ – বিকাল ৪:৩০ (দুপুর ১:০০–১:৩০ নামাজের বিরতি)। আবেদন জমা: ৮:৩০–১:০০ ও ১:৩০–৩:৩০। ডেলিভারি: ৮:৩০–১:০০ ও ১:৩০–৪:৩০। শুক্র–শনি বন্ধ।","src":"https://doha.mofa.gov.bd/pages/static-pages/6952667e35ce18e1c05a989e","srcName":"দূতাবাসের ওয়েবসাইট – Office Hours (হালনাগাদ ৩০ মার্চ ২০২৬)","open":[8.5,16.5],"brk":0.5,"days":5},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): +974 4037 4725 (অফিস), counselordoha@probashi.gov.bd; ফার্স্ট সেক্রেটারি (শ্রম): +974 4467 1499 (অফিস), fsdoha@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"},{"k":"housemaid","bn":"হাউসমেইড ভিসা সত্যায়ন ফি","v":"প্রতিটি QR 50; তালিকাভুক্ত এজেন্টের মাধ্যমে জমা, রবি–বৃহস্পতি সকাল ৭:৩০ – দুপুর ২:০০, ৩ কর্মদিবস পরে ডেলিভারি","src":"https://doha.mofa.gov.bd/pages/static-pages/695266ab35ce18e1c05aaaed","srcName":"দূতাবাসের ওয়েবসাইট – Visa Attestation"}],"services":[["ই-পাসপোর্ট আবেদন","https://doha.mofa.gov.bd/pages/static-pages/695266af35ce18e1c05aac74"],["জাতীয় পরিচয়পত্র (NID)","https://doha.mofa.gov.bd/pages/static-pages/695266ae35ce18e1c05aabf8"],["পাওয়ার অব অ্যাটর্নি","https://doha.mofa.gov.bd/pages/static-pages/6952667a35ce18e1c05a96ac"],["কাগজপত্র সত্যায়ন","https://doha.mofa.gov.bd/pages/static-pages/6952667735ce18e1c05a9540"],["ডিমান্ড লেটার সত্যায়ন","https://doha.mofa.gov.bd/pages/static-pages/6952668435ce18e1c05a9bbf"]],"missing":[],"alts":[],"facebook":"","related":[["কাতার ভিসা চেক","/ktr-bhisaa-cek-2026-3-aphisiyaal-upaay-phi-qar-800-paaspeaartt-diye-ya/"]],"faq":[["কাতারে বাংলাদেশ দূতাবাসের হটলাইন নম্বর কত?","দূতাবাসের ওয়েবসাইটে দেওয়া হটলাইন +974 3366 2000। সাধারণ ফোন +974 4467 1927। শ্রমিক-সংক্রান্ত সমস্যায় শ্রম উইংয়ের কাউন্সেলরের অফিস নম্বর +974 4037 4725।"],["দোহা দূতাবাসে কাগজ জমা দেওয়ার শেষ সময় কখন?","রবি থেকে বৃহস্পতিবার বিকাল ৩:৩০ পর্যন্ত আবেদন নেওয়া হয়, তবে দুপুর ১:০০–১:৩০ বিরতি। তাই বিকাল ৩টার আগে লাইনে থাকা নিরাপদ।"],["কাতারে হাউসমেইড ভিসা সত্যায়নে কত খরচ?","দূতাবাসের দেওয়া তথ্য অনুযায়ী প্রতিটি ভিসা সত্যায়ন QR 50, তালিকাভুক্ত এজেন্টের মাধ্যমে জমা দিতে হয় এবং ৩ কর্মদিবস পরে ফেরত দেওয়া হয়।"],["Where is the Bangladesh Embassy in Doha?","Building 153, Street 820, Zone 43, New Al-Hilal, Doha (PO Box 2080). Phone +974 4467 1927, hotline +974 3366 2000."]]},"saudi-arabia-riyadh":{"slug":"saudi-arabia-riyadh","typ":"embassy","typBn":"দূতাবাস","typEn":"Embassy","countryEn":"Saudi Arabia","countryBn":"সৌদি আরব","countryLoc":"সৌদি আরবে","cityEn":"Riyadh","cityBn":"রিয়াদ","cityGen":"রিয়াদের","cityLoc":"রিয়াদে","utc":3,"nameEn":"Embassy of the People's Republic of Bangladesh, Riyadh","nameBn":"রিয়াদে বাংলাদেশ দূতাবাস","website":"https://riyadh.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"8039 Dareen Street, Diplomatic Quarter, Riyadh, Saudi Arabia","src":"https://www.bangladeshembassy.org.sa/contact.html","srcName":"দূতাবাসের নিজস্ব ওয়েবসাইট – Contact"},{"k":"phone","bn":"ফোন","v":"011 419 5300 (সৌদির বাইরে থেকে +966 11 419 5300)","src":"https://www.bangladeshembassy.org.sa/contact.html","srcName":"দূতাবাসের নিজস্ব ওয়েবসাইট – Contact"},{"k":"tollfree","bn":"টোল-ফ্রি (সৌদির ভেতর)","v":"ডিপ্লোম্যাটিক উইং 800 100 0124; পাসপোর্ট ও ভিসা উইং 800 100 0126; শ্রম কল্যাণ উইং 800 100 0125","src":"https://www.bangladeshembassy.org.sa/contact.html","srcName":"দূতাবাসের নিজস্ব ওয়েবসাইট – Contact"},{"k":"email","bn":"ইমেইল","v":"mission.riyadh@mofa.gov.bd","src":"https://www.bangladeshembassy.org.sa/contact.html","srcName":"দূতাবাসের নিজস্ব ওয়েবসাইট – Contact"},{"k":"passport_ext","bn":"পাসপোর্ট উইং এক্সটেনশন","v":"011 419 5300, Ext. 302","src":"https://www.bangladeshembassy.org.sa/contact.html","srcName":"দূতাবাসের নিজস্ব ওয়েবসাইট – Contact"},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): 011 455 0406 (অফিস), counselorriyadh@probashi.gov.bd; ফার্স্ট সেক্রেটারি: +966 11 419 3944 (অফিস), fsriyadh@probashi.gov.bd; এক্সটেনশন 401–403","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["ই-পাসপোর্ট তথ্য","https://www.bangladeshembassy.org.sa/epassport.html"],["অনলাইন অ্যাপয়েন্টমেন্ট","https://passportriyadh.com/appointment/"],["MoFA-র নতুন মিশন সাইট","https://riyadh.mofa.gov.bd/"]],"missing":["অফিস সময় — MoFA সাইটের ‘Office Hour’ পাতা এখন ‘not found’ দেখাচ্ছে; দূতাবাসের পুরোনো সাইটেও সময়সূচি লেখা নেই।"],"alts":["নিশ্চিত করতে দূতাবাসের টোল-ফ্রি পাসপোর্ট লাইন 800 100 0126 (সৌদির ভেতর) বা +966 11 419 5300-এ ফোন করুন, ইমেইল করুন mission.riyadh@mofa.gov.bd, অথবা riyadh.mofa.gov.bd ও bangladeshembassy.org.sa দেখুন।","মক্কা–মদিনা–জেদ্দা এলাকায় থাকলে জেদ্দা কনস্যুলেটের সরকারি ইমেইল consular.jeddah@mofa.gov.bd বা হেড অব চ্যান্সেরির নম্বর +966 12 688 1740ও ব্যবহার করা যায়।","শ্রমিক সমস্যায় প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে টোল-ফ্রি ১৬১৩৫; বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০ (২৪ ঘণ্টা)।"],"facebook":"","related":[["সৌদি ভিসা চেক","/se-di-aarb-bhisaa-cek-2026-3-dhaape-paaspeaartt-nmbr-diye-sttyaattaas/"],["জেদ্দায় বাংলাদেশ কনস্যুলেট","/embassy/saudi-arabia-jeddah/"]],"faq":[["রিয়াদে বাংলাদেশ দূতাবাসের টোল-ফ্রি নম্বর কোনগুলো?","দূতাবাসের ওয়েবসাইট অনুযায়ী পাসপোর্ট ও ভিসার জন্য 800 100 0126, শ্রমিক-সংক্রান্ত সমস্যায় 800 100 0125, আর ডিপ্লোম্যাটিক উইং 800 100 0124। এগুলো সৌদি আরবের ভেতর থেকে ফ্রি।"],["রিয়াদ দূতাবাসের ঠিকানা কি 88 Dareen Street?","না। দূতাবাসের নিজস্ব ওয়েবসাইটে ঠিকানা 8039 Dareen Street, Diplomatic Quarter, Riyadh। কিছু সাইটে ভুল নম্বর দেখা যায়।"],["সৌদিতে শ্রমিকের অভিযোগ কোথায় জানাব?","রিয়াদ দূতাবাসের শ্রম কল্যাণ উইংয়ে। টোল-ফ্রি 800 100 0125, অথবা 011 419 5300 নম্বরে এক্সটেনশন 401–403। জেদ্দা, মক্কা বা মদিনা এলাকায় থাকলে জেদ্দা কনস্যুলেটের শ্রম উইং কাছে পড়ে।"],["What is the phone number of the Bangladesh Embassy in Riyadh?","Main line +966 11 419 5300. Toll-free inside Saudi Arabia: passport and visa 800 100 0126, labour welfare 800 100 0125."]]},"saudi-arabia-jeddah":{"slug":"saudi-arabia-jeddah","typ":"consulate","typBn":"কনস্যুলেট জেনারেল","typEn":"Consulate General","countryEn":"Saudi Arabia","countryBn":"সৌদি আরব","countryLoc":"সৌদি আরবে","cityEn":"Jeddah","cityBn":"জেদ্দা","cityGen":"জেদ্দার","cityLoc":"জেদ্দায়","utc":3,"nameEn":"Consulate General of the People's Republic of Bangladesh, Jeddah","nameBn":"জেদ্দায় বাংলাদেশ কনস্যুলেট জেনারেল","website":"https://jeddah.mofa.gov.bd/","facts":[{"k":"hours","bn":"অফিস সময়","v":"রবি–বৃহস্পতি সকাল ৮:০০ – বিকাল ৪:০০; শুক্র ও শনি বন্ধ","src":"https://jeddah.mofa.gov.bd/pages/static-pages/695266a635ce18e1c05aa917","srcName":"কনস্যুলেটের ওয়েবসাইট – Office Hour (হালনাগাদ ২৮ নভেম্বর ২০২৩)","open":[8,16],"brk":0,"days":5},{"k":"phone","bn":"ফোন (হেড অব চ্যান্সেরি)","v":"+966 12 688 1740","src":"https://jeddah.mofa.gov.bd/pages/officers-profile","srcName":"কনস্যুলেটের ওয়েবসাইট – Officers Profile"},{"k":"consular","bn":"কনস্যুলার উইং ইমেইল","v":"consular.jeddah@mofa.gov.bd","src":"https://jeddah.mofa.gov.bd/pages/officers-profile","srcName":"কনস্যুলেটের ওয়েবসাইট – Officers Profile"},{"k":"hoc","bn":"হেড অব চ্যান্সেরি ইমেইল","v":"hoc.jeddah@mofa.gov.bd","src":"https://jeddah.mofa.gov.bd/pages/officers-profile","srcName":"কনস্যুলেটের ওয়েবসাইট – Officers Profile"},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): +966 12 689 6276 এক্স. 131, counselorjeddah@probashi.gov.bd; ফার্স্ট সেক্রেটারি: fsjeddah@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"},{"k":"facebook","bn":"সরকারি ফেসবুক পেজ","v":"https://www.facebook.com/bcgjksa/","src":"https://jeddah.mofa.gov.bd/","srcName":"কনস্যুলেটের ওয়েবসাইট – Official Facebook Page লিংক"}],"services":[["ই-পাসপোর্ট আবেদনের নির্দেশিকা","https://jeddah.mofa.gov.bd/pages/static-pages/6952667335ce18e1c05a92d7"],["নবজাতকের ই-পাসপোর্ট","https://jeddah.mofa.gov.bd/pages/static-pages/6952669f35ce18e1c05aa690"],["সিটিজেন চার্টার","https://jeddah.mofa.gov.bd/pages/static-pages/6952667435ce18e1c05a9382"]],"missing":["ঠিকানা — কনস্যুলেটের ‘Address and Phone Number’ পাতা এখন ‘not found’ দেখাচ্ছে। অন্য ওয়েবসাইটে একেক রকম ঠিকানা দেখা যায়, তাই এখানে কোনো ঠিকানা বসানো হয়নি।"],"alts":["যাওয়ার আগে ঠিকানা নিশ্চিত করুন: সরকারি সাইট jeddah.mofa.gov.bd, সরকারি ফেসবুক https://www.facebook.com/bcgjksa/ (কনস্যুলেটের সাইট থেকে লিংক করা), ইমেইল consular.jeddah@mofa.gov.bd, অথবা হেড অব চ্যান্সেরির অফিস নম্বর +966 12 688 1740।","রাজধানীর দূতাবাস (রিয়াদ): 8039 Dareen Street, Diplomatic Quarter; ফোন +966 11 419 5300; ইমেইল mission.riyadh@mofa.gov.bd। বিস্তারিত: /embassy/saudi-arabia-riyadh/","প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে টোল-ফ্রি ১৬১৩৫; বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০ (২৪ ঘণ্টা)।"],"facebook":"https://www.facebook.com/bcgjksa/","related":[["রিয়াদে বাংলাদেশ দূতাবাস","/embassy/saudi-arabia-riyadh/"],["সৌদি ভিসা চেক","/se-di-aarb-bhisaa-cek-2026-3-dhaape-paaspeaartt-nmbr-diye-sttyaattaas/"]],"faq":[["জেদ্দা কনস্যুলেট কবে খোলা থাকে?","কনস্যুলেটের ওয়েবসাইট অনুযায়ী রবি থেকে বৃহস্পতিবার সকাল ৮টা থেকে বিকাল ৪টা। শুক্র ও শনিবার বন্ধ।"],["জেদ্দায় পাসপোর্ট-সংক্রান্ত প্রশ্ন কোথায় ইমেইল করব?","কনস্যুলার উইংয়ের সরকারি ইমেইল consular.jeddah@mofa.gov.bd।"],["জেদ্দা কনস্যুলেটের সরকারি ঠিকানা কী?","কনস্যুলেটের সরকারি ‘Address and Phone Number’ পাতা এখন খুলছে না, তাই এখানে কোনো ঠিকানা লেখা হয়নি। যাওয়ার আগে jeddah.mofa.gov.bd, সরকারি ফেসবুক পেজ, অথবা +966 12 688 1740 নম্বরে ফোন করে নিশ্চিত করুন।"],["জেদ্দা কনস্যুলেটের শ্রম উইংয়ের নম্বর কত?","প্রবাসী কল্যাণ মন্ত্রণালয়ের তালিকায় কাউন্সেলরের অফিস নম্বর +966 12 689 6276 (এক্সটেনশন 131), ইমেইল counselorjeddah@probashi.gov.bd।"]]},"malaysia-kuala-lumpur":{"slug":"malaysia-kuala-lumpur","typ":"high_commission","typBn":"হাইকমিশন","typEn":"High Commission","countryEn":"Malaysia","countryBn":"মালয়েশিয়া","countryLoc":"মালয়েশিয়ায়","cityEn":"Kuala Lumpur","cityBn":"কুয়ালালামপুর","cityGen":"কুয়ালালামপুরের","cityLoc":"কুয়ালালামপুরে","utc":8,"nameEn":"High Commission for the People's Republic of Bangladesh, Kuala Lumpur","nameBn":"কুয়ালালামপুরে বাংলাদেশ হাইকমিশন","website":"https://kualalumpur.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা (প্রধান কার্যালয়)","v":"No 8, Lorong Yap Kwan Seng, 50450 Kuala Lumpur, Malaysia","src":"https://kualalumpur.mofa.gov.bd/pages/static-pages/6952669a35ce18e1c05aa49d","srcName":"হাইকমিশনের ওয়েবসাইট – Our address and Location (হালনাগাদ ৪ এপ্রিল ২০২৫)"},{"k":"psc","bn":"পাসপোর্ট সার্ভিস সেন্টার","v":"30, Jalan Ampang, City Centre, 50250 Kuala Lumpur; ফোন +60 10 430 3020","src":"https://kualalumpur.mofa.gov.bd/pages/static-pages/6952669a35ce18e1c05aa49d","srcName":"হাইকমিশনের ওয়েবসাইট – Our address and Location"},{"k":"phone","bn":"ফোন (PABX)","v":"+60 3 2604 0946 / 48 / 49","src":"https://kualalumpur.mofa.gov.bd/pages/static-pages/6952669a35ce18e1c05aa49d","srcName":"হাইকমিশনের ওয়েবসাইট – Our address and Location"},{"k":"consular","bn":"কনস্যুলার সার্ভিস","v":"+60 3 2604 0949","src":"https://kualalumpur.mofa.gov.bd/pages/static-pages/6952669a35ce18e1c05aa49d","srcName":"হাইকমিশনের ওয়েবসাইট – Our address and Location"},{"k":"email","bn":"ইমেইল","v":"mission.kualalumpur@mofa.gov.bd","src":"https://kualalumpur.mofa.gov.bd/pages/static-pages/6952669a35ce18e1c05aa49d","srcName":"হাইকমিশনের ওয়েবসাইট – Our address and Location"},{"k":"fax","bn":"ফ্যাক্স","v":"+60 3 2604 0934, +60 3 2604 0935","src":"https://kualalumpur.mofa.gov.bd/pages/static-pages/6952669a35ce18e1c05aa49d","srcName":"হাইকমিশনের ওয়েবসাইট – Our address and Location"},{"k":"appointment","bn":"পাসপোর্ট সংগ্রহের অ্যাপয়েন্টমেন্ট","v":"appointment.bdhckl.gov.bd — ডেলিভারি স্লিপ নম্বর দিয়ে, POS Malaysia পোস্ট অফিস বেছে নিতে হয়; জরুরি প্রয়োজনে WhatsApp (শুধু মেসেজ) +60 10 430 3020","src":"https://appointment.bdhckl.gov.bd/","srcName":"হাইকমিশনের অ্যাপয়েন্টমেন্ট পোর্টাল"},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): +60 3 4021 2504 (অফিস), counselorkl@probashi.gov.bd; ফার্স্ট সেক্রেটারি: +60 3 4021 2524 (অফিস), fskl@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["কনস্যুলার সেবা ও ফি","https://kualalumpur.mofa.gov.bd/pages/static-pages/695266a235ce18e1c05aa7d5"],["ই-পাসপোর্ট তথ্য","https://kualalumpur.mofa.gov.bd/pages/static-pages/6952667a35ce18e1c05a96a3"],["পাসপোর্ট আবেদন ফর্ম","https://kualalumpur.mofa.gov.bd/pages/static-pages/6952668335ce18e1c05a9b0d"],["রি-ইস্যুর ডেলিভারি স্লিপ খোঁজা","https://appointment.bdhckl.gov.bd/reissue"],["পাসপোর্ট সংগ্রহের অ্যাপয়েন্টমেন্ট","https://appointment.bdhckl.gov.bd/"]],"missing":["অফিস সময় — হাইকমিশনের ওয়েবসাইটে আলাদা পাতা পাইনি।"],"alts":["যাওয়ার আগে কনস্যুলার নম্বর +60 3 2604 0949, PABX +60 3 2604 0946, ইমেইল mission.kualalumpur@mofa.gov.bd, অথবা kualalumpur.mofa.gov.bd-এ ফোন বা ইমেইল করে সময় নিশ্চিত করুন।","পাসপোর্ট সংগ্রহের সময় অ্যাপয়েন্টমেন্ট পোর্টাল appointment.bdhckl.gov.bd-এ দেখা যায়। জরুরি প্রয়োজনে WhatsApp-এ শুধু মেসেজ: +60 10 430 3020।","প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে টোল-ফ্রি ১৬১৩৫; বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০ (২৪ ঘণ্টা)।"],"facebook":"","related":[["মালয়েশিয়া ভিসা চেক","/maalyeshiyaa-bhisaa-cek-2026-paaspeaartt-naambaar-diye-shj-upaay/"]],"faq":[["মালয়েশিয়ায় পাসপোর্ট সংগ্রহের অ্যাপয়েন্টমেন্ট কীভাবে নেব?","appointment.bdhckl.gov.bd সাইটে ডেলিভারি স্লিপ নম্বর লিখে সার্চ করুন। নাম এলে বুঝবেন পাসপোর্ট এসেছে। তারপর POS Malaysia-র পোস্ট অফিস বেছে জমা দিন।"],["রি-ইস্যুর ডেলিভারি স্লিপ নম্বর হারিয়ে গেলে?","appointment.bdhckl.gov.bd/reissue পাতায় বর্তমান পাসপোর্ট নম্বর দিয়ে সার্চ করলে স্লিপ নম্বর দেখা যায়।"],["হাইকমিশন আর পাসপোর্ট সার্ভিস সেন্টার কি একই জায়গায়?","না। প্রধান কার্যালয় No 8, Lorong Yap Kwan Seng-এ; পাসপোর্ট সার্ভিস সেন্টার 30, Jalan Ampang, City Centre-এ।"],["What is the Bangladesh High Commission Kuala Lumpur phone number?","PABX +60 3 2604 0946/48/49, consular +60 3 2604 0949, passport service centre +60 10 430 3020."]]},"kuwait-kuwait-city":{"slug":"kuwait-kuwait-city","typ":"embassy","typBn":"দূতাবাস","typEn":"Embassy","countryEn":"Kuwait","countryBn":"কুয়েত","countryLoc":"কুয়েতে","cityEn":"Kuwait City","cityBn":"কুয়েত সিটি","cityGen":"কুয়েত সিটির","cityLoc":"কুয়েত সিটিতে","utc":3,"nameEn":"Embassy of the People's Republic of Bangladesh, Kuwait","nameBn":"কুয়েতে বাংলাদেশ দূতাবাস","website":"https://kuwait.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Messila, Block-7, Street-16, House-91 & House-93, State of Kuwait, P.O. Box 22344 Safat, Code 13084","src":"https://kuwait.mofa.gov.bd/pages/static-pages/6952667b35ce18e1c05a9765","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number (হালনাগাদ ১৩ আগস্ট ২০২৫)"},{"k":"phone","bn":"ফোন","v":"+965 2390 0913","src":"https://kuwait.mofa.gov.bd/pages/static-pages/6952667b35ce18e1c05a9765","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number"},{"k":"email","bn":"ইমেইল","v":"mission.kuwait@mofa.gov.bd","src":"https://kuwait.mofa.gov.bd/pages/static-pages/6952667b35ce18e1c05a9765","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number"},{"k":"hours","bn":"অফিস সময়","v":"রবি–বৃহস্পতি সকাল ৮:০০ – বিকাল ৪:০০; শুক্র ও শনি বন্ধ","src":"https://kuwait.mofa.gov.bd/pages/static-pages/6952669135ce18e1c05aa1a2","srcName":"দূতাবাসের ওয়েবসাইট – Office Hour (হালনাগাদ ১৯ জুলাই ২০২২)","open":[8,16],"brk":0,"days":5},{"k":"diplo","bn":"ডিপ্লোম্যাটিক উইং","v":"+965 2390 1009, +965 2390 0913","src":"https://kuwait.mofa.gov.bd/pages/static-pages/695266a835ce18e1c05aa9c1","srcName":"দূতাবাসের ওয়েবসাইট – Wing-wise Contact (হালনাগাদ ৯ ডিসেম্বর ২০২৫)"},{"k":"passport_w","bn":"পাসপোর্ট ও ভিসা উইং","v":"+965 2390 1007","src":"https://kuwait.mofa.gov.bd/pages/static-pages/695266a835ce18e1c05aa9c1","srcName":"দূতাবাসের ওয়েবসাইট – Wing-wise Contact"},{"k":"labour_ph","bn":"শ্রম উইং (অফিস ফোন)","v":"+965 2391 0920","src":"https://kuwait.mofa.gov.bd/pages/static-pages/695266a835ce18e1c05aa9c1","srcName":"দূতাবাসের ওয়েবসাইট – Wing-wise Contact"},{"k":"labour","bn":"শ্রম কল্যাণ উইং (মন্ত্রণালয়ের তালিকা)","v":"কাউন্সেলর (শ্রম): +965 2491 3220 (অফিস), counselorkuwit@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["পাওয়ার অব অ্যাটর্নি","https://kuwait.mofa.gov.bd/pages/static-pages/6952668435ce18e1c05a9be6"],["সনদ সত্যায়ন","https://kuwait.mofa.gov.bd/pages/static-pages/6952669935ce18e1c05aa442"],["ডিমান্ড লেটার সত্যায়ন","https://kuwait.mofa.gov.bd/pages/static-pages/6952669b35ce18e1c05aa4e7"],["ভিসা সত্যায়ন (১৮/২০/২২)","https://kuwait.mofa.gov.bd/pages/static-pages/6952669935ce18e1c05aa475"]],"missing":[],"alts":[],"facebook":"","related":[],"faq":[["কুয়েতে বাংলাদেশ দূতাবাসের ঠিকানা ও ফোন কী?","মেসিলা, ব্লক-৭, স্ট্রিট-১৬, হাউস ৯১ ও ৯৩; ফোন +965 2390 0913; ইমেইল mission.kuwait@mofa.gov.bd। সূত্র: দূতাবাসের Address and Phone Number পাতা (১৩ আগস্ট ২০২৫)।"],["কুয়েত দূতাবাস কবে খোলা থাকে?","সরকারি Office Hour পাতায় রবি থেকে বৃহস্পতিবার সকাল ৮টা থেকে বিকাল ৪টা, শুক্র ও শনি বন্ধ। এই পাতাটি শেষ হালনাগাদ হয়েছিল ১৯ জুলাই ২০২২, তাই যাওয়ার আগে ফোন করে নিশ্চিত করুন।"],["পাসপোর্ট বা শ্রমিক সমস্যায় কোন নম্বরে ফোন করব?","পাসপোর্ট ও ভিসা উইং +965 2390 1007; শ্রম উইংয়ের অফিস ফোন +965 2391 0920। মন্ত্রণালয়ের তালিকায় শ্রম কাউন্সেলরের অফিস নম্বর +965 2491 3220, ইমেইল counselorkuwit@probashi.gov.bd।"],["What is the Bangladesh Embassy in Kuwait phone number?","Main line +965 2390 0913, email mission.kuwait@mofa.gov.bd. Passport and visa wing +965 2390 1007. Address: Messila, Block-7, Street-16, House 91 and 93."]]},"italy-rome":{"slug":"italy-rome","typ":"embassy","typBn":"দূতাবাস","typEn":"Embassy","countryEn":"Italy","countryBn":"ইতালি","countryLoc":"ইতালিতে","cityEn":"Rome","cityBn":"রোম","cityGen":"রোমের","cityLoc":"রোমে","utc":1,"nameEn":"Embassy of the People's Republic of Bangladesh, Rome","nameBn":"রোমে বাংলাদেশ দূতাবাস","website":"https://rome.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Via Dell'Antartide 5-7, 00144 Rome, Italy","src":"https://rome.mofa.gov.bd/pages/static-pages/695266a235ce18e1c05aa7e0","srcName":"দূতাবাসের ওয়েবসাইট – Location (হালনাগাদ ৪ ডিসেম্বর ২০২৫)"},{"k":"phone","bn":"ফোন","v":"+39 06 808 3595","src":"https://rome.mofa.gov.bd/pages/static-pages/695266a235ce18e1c05aa7e0","srcName":"দূতাবাসের ওয়েবসাইট – Location"},{"k":"emergency","bn":"জরুরি নম্বর","v":"+39 351 176 6537","src":"https://rome.mofa.gov.bd/pages/static-pages/695266a235ce18e1c05aa7e0","srcName":"দূতাবাসের ওয়েবসাইট – Location"},{"k":"email","bn":"ইমেইল","v":"mission.rome@mofa.gov.bd","src":"https://rome.mofa.gov.bd/pages/static-pages/695266a235ce18e1c05aa7e0","srcName":"দূতাবাসের ওয়েবসাইট – Location"},{"k":"facebook","bn":"সরকারি ফেসবুক পেজ","v":"https://www.facebook.com/bdemrome","src":"https://rome.mofa.gov.bd/pages/static-pages/695266a235ce18e1c05aa7e0","srcName":"দূতাবাসের ওয়েবসাইট – Location (Verified Facebook page)"},{"k":"hours","bn":"অফিস সময়","v":"সোম–বৃহস্পতি: সকাল ৯:০০–দুপুর ১:০০ ও দুপুর ২:০০–বিকাল ৫:০০; শুক্র: সকাল ৯:০০–দুপুর ১:০০ ও বিকাল ৩:০০–৫:০০। কনস্যুলার: সোম–বৃহস্পতি ৯:৩০–১২:৩০ ও ২:০০–৪:৩০; শুক্র ৯:৩০–১:০০ ও ৩:০০–৪:৩০।","src":"https://rome.mofa.gov.bd/pages/static-pages/6952667b35ce18e1c05a9768","srcName":"দূতাবাসের ওয়েবসাইট – Office Hour (হালনাগাদ ২০ সেপ্টেম্বর ২০২২)","open":[9,17],"brk":1,"days":5,"weekly":34},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"ফার্স্ট সেক্রেটারি (শ্রম): +39 06 8069 0919 (অফিস), fsrome@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["কনস্যুলার ফি","https://rome.mofa.gov.bd/pages/static-pages/695266b535ce18e1c05aae37"],["ই-পাসপোর্ট","https://rome.mofa.gov.bd/pages/static-pages/6952667235ce18e1c05a92be"],["NID-এর জন্য কাগজপত্র","https://rome.mofa.gov.bd/pages/static-pages/695266a135ce18e1c05aa740"]],"missing":[],"alts":[],"facebook":"https://www.facebook.com/bdemrome","related":[["ইতালি ওয়ার্ক ভিসা","/itaali-oyaark-bhisaa-2026-khrc-betn-o-aabedner-shj-gaaidd/"],["মিলানে বাংলাদেশ কনস্যুলেট","/embassy/italy-milan/"]],"faq":[["রোমে বাংলাদেশ দূতাবাসের ঠিকানা ও ফোন কী?","Via Dell'Antartide 5-7, 00144 Rome। ফোন +39 06 808 3595, ইমেইল mission.rome@mofa.gov.bd। জরুরি নম্বর +39 351 176 6537, সূত্র: দূতাবাসের Location পাতা (৪ ডিসেম্বর ২০২৫)।"],["রোম দূতাবাসে কনস্যুলার সেবা কখন পাওয়া যায়?","সরকারি সময়সূচি অনুযায়ী সোম–বৃহস্পতি সকাল ৯:৩০–দুপুর ১২:৩০ ও দুপুর ২:০০–বিকাল ৪:৩০; শুক্রবার সকাল ৯:৩০–দুপুর ১:০০ ও বিকাল ৩:০০–৪:৩০। এই পাতাটি ২০ সেপ্টেম্বর ২০২২-এ হালনাগাদ, যাওয়ার আগে ফোন করে নিশ্চিত করুন।"],["দূতাবাসের সরকারি ফেসবুক পেজ কোনটি?","দূতাবাসের Location পাতায় যাচাই করা পেজ হিসেবে দেওয়া আছে https://www.facebook.com/bdemrome ।"],["Where is the Bangladesh Embassy in Rome?","Via Dell'Antartide 5-7, 00144 Rome, Italy. Phone +39 06 808 3595, official email mission.rome@mofa.gov.bd, emergency +39 351 176 6537."]]},"italy-milan":{"slug":"italy-milan","typ":"consulate","typBn":"কনস্যুলেট জেনারেল","typEn":"Consulate General","countryEn":"Italy","countryBn":"ইতালি","countryLoc":"ইতালিতে","cityEn":"Milan","cityBn":"মিলান","cityGen":"মিলানের","cityLoc":"মিলানে","utc":1,"nameEn":"Consulate General of the People's Republic of Bangladesh, Milan","nameBn":"মিলানে বাংলাদেশ কনস্যুলেট জেনারেল","website":"https://milan.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Via Giambellino 7, 20146 Milano, Italy","src":"https://milan.mofa.gov.bd/pages/static-pages/695266b235ce18e1c05aad4f","srcName":"কনস্যুলেটের ওয়েবসাইট – Address (হালনাগাদ ১৮ জুলাই ২০২৩)"},{"k":"phone","bn":"ফোন (কনসাল জেনারেল)","v":"+39 02 8706 8581","src":"https://milan.mofa.gov.bd/pages/officers-profile","srcName":"কনস্যুলেটের ওয়েবসাইট – Officers Profile"},{"k":"phone2","bn":"ফোন (কনসাল)","v":"+39 02 8706 8580","src":"https://milan.mofa.gov.bd/pages/officers-profile","srcName":"কনস্যুলেটের ওয়েবসাইট – Officers Profile"},{"k":"email","bn":"ইমেইল","v":"mission.milan@mofa.gov.bd","src":"https://milan.mofa.gov.bd/pages/officers-profile","srcName":"কনস্যুলেটের ওয়েবসাইট – Officers Profile"},{"k":"fax","bn":"ফ্যাক্স","v":"+39 02 4895 0035","src":"https://milan.mofa.gov.bd/pages/officers-profile","srcName":"কনস্যুলেটের ওয়েবসাইট – Officers Profile"},{"k":"hours","bn":"অফিস সময়","v":"সোম–শুক্র সকাল ৯:০০ – বিকাল ৫:০০ (সরকারি ছুটি ছাড়া)। আবেদন জমা: ৯:৩০–১২:৫০; ডেলিভারি: ২:৩০–৪:৫০। হেল্পডেস্ক: সকাল ১১:৩০–১২:৩০ ও বিকাল ৪:০০–৫:০০।","src":"https://milan.mofa.gov.bd/","srcName":"কনস্যুলেটের ওয়েবসাইট হোমপেজ – Office Hours (যাচাই ২৫ নভেম্বর ২০২৬)","open":[9,17],"brk":0,"days":5},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"ফার্স্ট সেক্রেটারি (শ্রম): +39 02 8707 8545 (অফিস), fsmilan@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["কনস্যুলার সেবার তথ্য","https://milan.mofa.gov.bd/pages/static-pages/695266b935ce18e1c05aaf97"],["ওয়েজ আর্নার্স কল্যাণ কার্ড","https://portal.wewb.gov.bd/register"]],"missing":[],"alts":[],"facebook":"","related":[["রোমে বাংলাদেশ দূতাবাস","/embassy/italy-rome/"],["ইতালি ওয়ার্ক ভিসা","/itaali-oyaark-bhisaa-2026-khrc-betn-o-aabedner-shj-gaaidd/"]],"faq":[["মিলানে বাংলাদেশ কনস্যুলেটের ঠিকানা কী?","Via Giambellino 7, 20146 Milano। সূত্র: কনস্যুলেটের Address পাতা (১৮ জুলাই ২০২৩)।"],["মিলান কনস্যুলেটে কখন কাগজ জমা দেওয়া যায়?","হোমপেজ অনুযায়ী আবেদন জমা সকাল ৯:৩০ থেকে দুপুর ১২:৫০, ডেলিভারি দুপুর ২:৩০ থেকে বিকাল ৪:৫০; অফিস সোম–শুক্র সকাল ৯টা থেকে বিকাল ৫টা। যাওয়ার আগে milan.mofa.gov.bd-এ দেখে নিন।"],["মিলান কনস্যুলেটের ফোন ও ইমেইল কী?","কনসাল জেনারেলের অফিস নম্বর +39 02 8706 8581, ইমেইল mission.milan@mofa.gov.bd। শ্রম বিষয়ে অফিস নম্বর +39 02 8707 8545, fsmilan@probashi.gov.bd।"],["Where is the Bangladesh Consulate in Milan?","Via Giambellino 7, 20146 Milan. Consul General +39 02 8706 8581, official email mission.milan@mofa.gov.bd. Office hours Monday–Friday 09:00–17:00."]]},"uae-abu-dhabi":{"slug":"uae-abu-dhabi","typ":"embassy","typBn":"দূতাবাস","typEn":"Embassy","countryEn":"United Arab Emirates","countryBn":"সংযুক্ত আরব আমিরাত","countryLoc":"আমিরাতে","cityEn":"Abu Dhabi","cityBn":"আবুধাবি","cityGen":"আবুধাবির","cityLoc":"আবুধাবিতে","utc":4,"nameEn":"Embassy of the People's Republic of Bangladesh, Abu Dhabi","nameBn":"আবুধাবিতে বাংলাদেশ দূতাবাস","website":"https://abudhabi.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Villa No. 46, 48, Sector-19, Zone-W31, Al Jawwalah Street, Al Saadah Area, P.O. Box 2504, Abu Dhabi, UAE","src":"https://abudhabi.mofa.gov.bd/pages/static-pages/6952668235ce18e1c05a9ab3","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number (হালনাগাদ ১৬ মার্চ ২০২৬)"},{"k":"phone","bn":"ফোন","v":"+971 2 446 5100","src":"https://abudhabi.mofa.gov.bd/pages/static-pages/6952668235ce18e1c05a9ab3","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number"},{"k":"email","bn":"ইমেইল","v":"mission.abudhabi@mofa.gov.bd","src":"https://abudhabi.mofa.gov.bd/pages/static-pages/6952668235ce18e1c05a9ab3","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number"},{"k":"facebook","bn":"সরকারি ফেসবুক পেজ","v":"https://www.facebook.com/BangladeshEmbassyAbuDhabi","src":"https://abudhabi.mofa.gov.bd/pages/static-pages/6952668235ce18e1c05a9ab3","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number"},{"k":"hours","bn":"কনস্যুলার ও কল্যাণ সেবার সময়","v":"সোম–বৃহস্পতি: আবেদন জমা ৯:০০–৩:০০, ডেলিভারি ৯:৩০–৩:৩০ (নামাজ ও দুপুরের বিরতি ১:০০–২:০০)। শুক্র: জমা ৮:৩০–১১:০০, ডেলিভারি ৮:৩০–১২:০০। শনি–রবি বন্ধ।","src":"https://abudhabi.mofa.gov.bd/pages/static-pages/6952667d35ce18e1c05a9809","srcName":"দূতাবাসের ওয়েবসাইট – Consular Service Hour (হালনাগাদ ১৬ মার্চ ২০২৬)"},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): +971 2 446 2745 (অফিস), counselorabudhabi@probashi.gov.bd; ফার্স্ট সেক্রেটারি: +971 2 445 2216 (অফিস), fsabudhabi@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["কনস্যুলার সেবা ও ফি","https://abudhabi.mofa.gov.bd/pages/static-pages/6952667735ce18e1c05a9548"],["পাসপোর্ট আবেদন","https://abudhabi.mofa.gov.bd/pages/static-pages/6952668935ce18e1c05a9e2e"]],"missing":["সাধারণ অফিস সময়ের পাতায় পূর্ণ সময়সূচি পাওয়া যায়নি; নিচে শুধু কনস্যুলার ও কল্যাণ সেবার সরকারি সময় দেওয়া হলো।"],"alts":["সাধারণ অফিস সময় নিশ্চিত করতে ফোন করুন +971 2 446 5100, ইমেইল করুন mission.abudhabi@mofa.gov.bd, অথবা abudhabi.mofa.gov.bd ও সরকারি ফেসবুক পেজ দেখুন।","দুবাই, শারজাহ বা উত্তরাঞ্চলে থাকলে দুবাই কনস্যুলেটও কাজে আসতে পারে: /embassy/uae-dubai/ ।","প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে টোল-ফ্রি ১৬১৩৫; বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০ (২৪ ঘণ্টা)।"],"facebook":"https://www.facebook.com/BangladeshEmbassyAbuDhabi","related":[["দুবাইয়ে বাংলাদেশ কনস্যুলেট","/embassy/uae-dubai/"],["আমিরাত ভিসা চেক","/dubaai-bhisaa-cek-2026-paaspeaartte-3-dhaape-yaacaai/"]],"faq":[["আবুধাবিতে বাংলাদেশ দূতাবাসের ঠিকানা ও ফোন কী?","আল সাদাহ এলাকা, আল জাওয়ালাহ স্ট্রিট, ভিলা ৪৬ ও ৪৮, সেক্টর-১৯, জোন-W31; ফোন +971 2 446 5100; ইমেইল mission.abudhabi@mofa.gov.bd। সূত্র: Address and Phone Number পাতা (১৬ মার্চ ২০২৬)।"],["আবুধাবি দূতাবাসে কখন কাগজ জমা দেওয়া যায়?","কনস্যুলার পাতায় সোম–বৃহস্পতি সকাল ৯টা থেকে বিকাল ৩টা (দুপুর ১টা–২টা বিরতি), শুক্রবার সকাল ৮:৩০–১১:০০। শনি ও রবি বন্ধ।"],["শ্রমিক সমস্যায় আবুধাবিতে কার কাছে যাব?","শ্রম কল্যাণ উইং: কাউন্সেলর +971 2 446 2745, counselorabudhabi@probashi.gov.bd। দুবাই এলাকায় থাকলে দুবাই কনস্যুলেটের শ্রম উইংও আছে।"],["Where is the Bangladesh Embassy in Abu Dhabi?","Villa 46 and 48, Sector-19, Zone-W31, Al Jawwalah Street, Al Saadah Area, Abu Dhabi. Phone +971 2 446 5100, email mission.abudhabi@mofa.gov.bd."]]},"uae-dubai":{"slug":"uae-dubai","typ":"consulate","typBn":"কনস্যুলেট জেনারেল","typEn":"Consulate General","countryEn":"United Arab Emirates","countryBn":"সংযুক্ত আরব আমিরাত","countryLoc":"আমিরাতে","cityEn":"Dubai","cityBn":"দুবাই","cityGen":"দুবাইয়ের","cityLoc":"দুবাইয়ে","utc":4,"nameEn":"Consulate General of the People's Republic of Bangladesh, Dubai","nameBn":"দুবাইয়ে বাংলাদেশ কনস্যুলেট জেনারেল","website":"https://dubai.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Villa No. 36 & 145, Abdulla Hussain Al Malik Villa, 123/3 Street, Abu Hail Road, Al Wuheida, Deira, Dubai, UAE, P.O. Box 4336","src":"https://dubai.mofa.gov.bd/pages/static-pages/6952669935ce18e1c05aa471","srcName":"কনস্যুলেটের ওয়েবসাইট – Contact Us (হালনাগাদ ৬ এপ্রিল ২০২৫)"},{"k":"phone","bn":"ফোন (রিসেপশন)","v":"+971 4 238 8199, +971 4 265 1116","src":"https://dubai.mofa.gov.bd/pages/static-pages/6952669935ce18e1c05aa471","srcName":"কনস্যুলেটের ওয়েবসাইট – Contact Us"},{"k":"email","bn":"ইমেইল","v":"mission.dubai@mofa.gov.bd","src":"https://dubai.mofa.gov.bd/pages/static-pages/6952669935ce18e1c05aa471","srcName":"কনস্যুলেটের ওয়েবসাইট – Contact Us"},{"k":"whatsapp","bn":"হেল্পলাইন (WhatsApp, শুধু টেক্সট)","v":"কনস্যুলার/পাসপোর্ট/ভিসা: +971 50 505 5834; শ্রম কল্যাণ: +971 50 816 8253, +971 50 816 8363","src":"https://dubai.mofa.gov.bd/pages/static-pages/6952669935ce18e1c05aa471","srcName":"কনস্যুলেটের ওয়েবসাইট – Contact Us"},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): +971 4 269 0764 (অফিস), counselordubai@probashi.gov.bd; ফার্স্ট সেক্রেটারি: +971 4 238 8202 (অফিস), fsdubai@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["কনস্যুলার উইংয়ের সেবা","https://dubai.mofa.gov.bd/pages/static-pages/6952668535ce18e1c05a9c14"],["শ্রম কল্যাণ উইংয়ের সেবা","https://dubai.mofa.gov.bd/pages/static-pages/695266a835ce18e1c05aa9c6"],["পাসপোর্ট ও ভিসা উইং","https://dubai.mofa.gov.bd/pages/static-pages/6952669a35ce18e1c05aa47b"]],"missing":["অফিস সময় — সরকারি ‘Office Hour’ পাতা ২৬ অক্টোবর ২০২৬-এ হালনাগাদ, কিন্তু সময়সূচি খালি। কনস্যুলার সার্ভিস আওয়ার পাতাও ‘not found’।"],"alts":["সময় নিশ্চিত করতে রিসেপশনে ফোন করুন +971 4 238 8199 বা +971 4 265 1116, ইমেইল করুন mission.dubai@mofa.gov.bd, অথবা dubai.mofa.gov.bd দেখুন।","কনস্যুলার/শ্রম/পাসপোর্ট উইংয়ের পুরোনো পাতায় (২০২১) কর্মদিবসে সকাল ৯টা থেকে বিকাল ৫টা লেখা আছে — এটা বর্তমান কি না ফোন করে জেনে নিন।","আবুধাবির দূতাবাস: ভিলা ৪৬ ও ৪৮, আল সাদাহ; ফোন +971 2 446 5100; /embassy/uae-abu-dhabi/ ।","প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে টোল-ফ্রি ১৬১৩৫; বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০ (২৪ ঘণ্টা)।"],"facebook":"","related":[["আবুধাবিতে বাংলাদেশ দূতাবাস","/embassy/uae-abu-dhabi/"],["দুবাই ভিসা চেক","/dubaai-bhisaa-cek-2026-paaspeaartte-3-dhaape-yaacaai/"]],"faq":[["দুবাইয়ে বাংলাদেশ কনস্যুলেটের ঠিকানা কী?","আল উহাইদা, দেইরা: ভিলা ৩৬ ও ১৪৫, আবু হাইল রোড, ১২৩/৩ স্ট্রিট, পোস্ট বক্স ৪৩৩৬। সূত্র: Contact Us পাতা (৬ এপ্রিল ২০২৫)।"],["দুবাই কনস্যুলেটে ফোন না লাগলে কী করব?","রিসেপশন +971 4 238 8199 বা +971 4 265 1116। WhatsApp-এ শুধু টেক্সট: কনস্যুলার/পাসপোর্ট +971 50 505 5834, শ্রম কল্যাণ +971 50 816 8253।"],["দুবাই কনস্যুলেট কবে খোলা?","সরকারি অফিস সময়ের পাতায় এখন সময়সূচি নেই। যাওয়ার আগে ফোন বা ইমেইল করে নিশ্চিত করুন। আবুধাবি দূতাবাসের কনস্যুলার সময় আলাদা পাতায় দেওয়া আছে।"],["Where is the Bangladesh Consulate in Dubai?","Villa 36 and 145, Abdulla Hussain Al Malik Villa, 123/3 Street, Abu Hail Road, Al Wuheida, Deira, Dubai. Reception +971 4 238 8199, email mission.dubai@mofa.gov.bd."]]},"oman-muscat":{"slug":"oman-muscat","typ":"embassy","typBn":"দূতাবাস","typEn":"Embassy","countryEn":"Oman","countryBn":"ওমান","countryLoc":"ওমানে","cityEn":"Muscat","cityBn":"মাস্কাট","cityGen":"মাস্কাটের","cityLoc":"মাস্কাটে","utc":4,"nameEn":"Embassy of the People's Republic of Bangladesh, Muscat","nameBn":"মাস্কাটে বাংলাদেশ দূতাবাস","website":"https://muscat.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Building No. 4207, Way No. 3052, Shatti Al Qurum, Muscat, Oman","src":"https://muscat.mofa.gov.bd/pages/static-pages/695266a335ce18e1c05aa7e2","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number (হালনাগাদ ১১ মে ২০২৩)"},{"k":"phone","bn":"ফোন","v":"+968 2469 8336, +968 2469 8098, +968 2463 4798","src":"https://muscat.mofa.gov.bd/pages/static-pages/695266a335ce18e1c05aa7e2","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number"},{"k":"email","bn":"ইমেইল","v":"mission.muscat@mofa.gov.bd","src":"https://muscat.mofa.gov.bd/pages/static-pages/695266a335ce18e1c05aa7e2","srcName":"দূতাবাসের ওয়েবসাইট – Address and Phone Number"},{"k":"hours","bn":"অফিস সময়","v":"রবি–বৃহস্পতি সকাল ৮:০০ – বিকাল ৪:০০ (হোমপেজে লেখা; আলাদা Office Hour পাতা ৭ সেপ্টেম্বর ২০২৬-এ হালনাগাদ কিন্তু খালি)","src":"https://muscat.mofa.gov.bd/","srcName":"দূতাবাসের ওয়েবসাইট হোমপেজ (যাচাই ২৫ নভেম্বর ২০২৬)","open":[8,16],"brk":0,"days":5},{"k":"workers","bn":"শ্রমিক বিষয় (দূতাবাসের উইং-ওয়াইজ তালিকা)","v":"+968 2460 3514","src":"https://muscat.mofa.gov.bd/pages/static-pages/6952669435ce18e1c05aa2ae","srcName":"দূতাবাসের ওয়েবসাইট – Wing-wise Contact (হালনাগাদ ২২ ডিসেম্বর ২০২৫)"},{"k":"passport_w","bn":"পাসপোর্ট ও ভিসা","v":"ফোন +968 2469 8098","src":"https://muscat.mofa.gov.bd/pages/static-pages/6952669435ce18e1c05aa2ae","srcName":"দূতাবাসের ওয়েবসাইট – Wing-wise Contact"},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): +968 2469 8440 (অফিস), counselormuscat@probashi.gov.bd; সেকেন্ড সেক্রেটারি: +968 2469 4798 (অফিস), fsmuscat@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["কনস্যুলার সেবা","https://muscat.mofa.gov.bd/pages/static-pages/6952667135ce18e1c05a91f2"],["পাসপোর্ট ও কনস্যুলার ফি","https://muscat.mofa.gov.bd/pages/static-pages/consular-fee-e055bb-6952668435ce18e1c05a9b82"],["ই-পাসপোর্ট আবেদন","https://muscat.mofa.gov.bd/pages/static-pages/ই-পাসপোর্টের-জন্য-কীভাবে-আবেদন-করবেন-c7e8jt-6a4b4186fd9fe28515964537"]],"missing":[],"alts":[],"facebook":"","related":[["ওমান ভিসা","/omaaner-bhisaa-kbe-khulbe-2026-phi-o-aabedner-niym/"]],"faq":[["মাস্কাটে বাংলাদেশ দূতাবাসের ঠিকানা ও ফোন কী?","শাত্তি আল কুরুম, বিল্ডিং ৪২০৭, ওয়ে ৩০৫২। ফোন +968 2469 8336, +968 2469 8098 ও +968 2463 4798; ইমেইল mission.muscat@mofa.gov.bd।"],["মাস্কাট দূতাবাস কবে খোলা থাকে?","দূতাবাসের হোমপেজে লেখা আছে রবি থেকে বৃহস্পতিবার সকাল ৮টা থেকে বিকাল ৪টা। যাওয়ার আগে ফোন করে নিশ্চিত করুন।"],["শ্রমিক সমস্যায় কোন নম্বরে ফোন করব?","দূতাবাসের উইং-ওয়াইজ তালিকায় শ্রমিক বিষয় +968 2460 3514। মন্ত্রণালয়ের তালিকায় শ্রম কাউন্সেলরের অফিস নম্বর +968 2469 8440, counselormuscat@probashi.gov.bd।"],["Where is the Bangladesh Embassy in Muscat?","Building 4207, Way 3052, Shatti Al Qurum, Muscat. Phones +968 2469 8336, +968 2469 8098 and +968 2463 4798. Email mission.muscat@mofa.gov.bd. Hours: Sunday–Thursday 08:00–16:00."]]},"singapore":{"slug":"singapore","typ":"high_commission","typBn":"হাইকমিশন","typEn":"High Commission","countryEn":"Singapore","countryBn":"সিঙ্গাপুর","countryLoc":"সিঙ্গাপুরে","cityEn":"Singapore","cityBn":"সিঙ্গাপুর","cityGen":"সিঙ্গাপুরের","cityLoc":"সিঙ্গাপুরে","utc":8,"nameEn":"High Commission for the People's Republic of Bangladesh, Singapore","nameBn":"সিঙ্গাপুরে বাংলাদেশ হাইকমিশন","website":"https://singapore.mofa.gov.bd/","facts":[{"k":"address","bn":"ঠিকানা","v":"Jit Poh Building #04-00 & #10-00, 19 Keppel Road, Singapore 089058","src":"https://singapore.mofa.gov.bd/pages/static-pages/6952669735ce18e1c05aa370","srcName":"হাইকমিশনের ওয়েবসাইট – Address and Phone Number (হালনাগাদ ২৮ জুলাই ২০২২)"},{"k":"phone","bn":"ফোন","v":"+65 6255 0075","src":"https://singapore.mofa.gov.bd/pages/static-pages/6952669735ce18e1c05aa370","srcName":"হাইকমিশনের ওয়েবসাইট – Address and Phone Number"},{"k":"fax","bn":"ফ্যাক্স","v":"+65 6255 1824","src":"https://singapore.mofa.gov.bd/pages/static-pages/6952669735ce18e1c05aa370","srcName":"হাইকমিশনের ওয়েবসাইট – Address and Phone Number"},{"k":"email","bn":"ইমেইল","v":"mission.singapore@mofa.gov.bd","src":"https://singapore.mofa.gov.bd/pages/static-pages/6952669735ce18e1c05aa370","srcName":"হাইকমিশনের ওয়েবসাইট – Address and Phone Number"},{"k":"facebook","bn":"সরকারি ফেসবুক পেজ","v":"https://www.facebook.com/bdhc.sg","src":"https://singapore.mofa.gov.bd/pages/static-pages/6952669735ce18e1c05aa370","srcName":"হাইকমিশনের ওয়েবসাইট – Address and Phone Number"},{"k":"labour","bn":"শ্রম কল্যাণ উইং","v":"কাউন্সেলর (শ্রম): +65 6661 0298 (অফিস), counselorsg@probashi.gov.bd; ফার্স্ট সেক্রেটারি: +65 6255 1579 (অফিস), fssg@probashi.gov.bd","src":"https://probashi.gov.bd/site/page/ca356285-7198-442f-85a3-0309d52362fc/List-of-Labor-Wing","srcName":"প্রবাসী কল্যাণ মন্ত্রণালয় – শ্রম উইং তালিকা (হালনাগাদ ১ মে ২০২৫)"}],"services":[["ই-পাসপোর্ট","https://singapore.mofa.gov.bd/pages/static-pages/6952669135ce18e1c05aa199"],["পাসপোর্ট ফি","https://singapore.mofa.gov.bd/pages/static-pages/6952667135ce18e1c05a9219"],["নতুন পাসপোর্ট ফর্ম","https://singapore.mofa.gov.bd/pages/static-pages/6952669335ce18e1c05aa26d"]],"missing":["অফিস সময় — হাইকমিশনের ওয়েবসাইটে আলাদা সময়সূচি পাইনি।"],"alts":["যাওয়ার আগে ফোন করুন +65 6255 0075, ইমেইল করুন mission.singapore@mofa.gov.bd, অথবা singapore.mofa.gov.bd ও সরকারি ফেসবুক https://www.facebook.com/bdhc.sg দেখুন।","শ্রম বিষয়ে অফিস নম্বর +65 6661 0298, counselorsg@probashi.gov.bd।","প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে টোল-ফ্রি ১৬১৩৫; বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০ (২৪ ঘণ্টা)।"],"facebook":"https://www.facebook.com/bdhc.sg","related":[["সিঙ্গাপুর ওয়ার্ক ভিসা","/singgaapur-oyaark-bhisaa-2026-ntun-niym-betn-o-aabedn/"]],"faq":[["সিঙ্গাপুরে বাংলাদেশ হাইকমিশনের ঠিকানা ও ফোন কী?","Jit Poh Building, ১৯ Keppel Road, #04-00 ও #10-00, সিঙ্গাপুর ০৮৯০৫৮। ফোন +65 6255 0075, ইমেইল mission.singapore@mofa.gov.bd। সূত্র: Address and Phone Number পাতা (২৮ জুলাই ২০২২)।"],["হাইকমিশন কবে খোলা থাকে?","সরকারি সাইটে আলাদা অফিস সময়ের পাতা পাইনি। যাওয়ার আগে +65 6255 0075-এ ফোন বা সরকারি ফেসবুক পেজ দেখে নিশ্চিত করুন।"],["শ্রমিক সমস্যায় সিঙ্গাপুরে কার নম্বরে ফোন করব?","শ্রম কাউন্সেলরের অফিস নম্বর +65 6661 0298, ইমেইল counselorsg@probashi.gov.bd। ফার্স্ট সেক্রেটারির অফিস নম্বর +65 6255 1579।"],["Where is the Bangladesh High Commission in Singapore?","Jit Poh Building #04-00 and #10-00, 19 Keppel Road, Singapore 089058. Phone +65 6255 0075, email mission.singapore@mofa.gov.bd."]]}}
JSON
    , true);
    return is_array($d) ? $d : array();
}
function pbd_emb_get($slug) {
    $all = pbd_emb_all();
    return isset($all[$slug]) ? $all[$slug] : null;
}

function pbd_emb_bn_time($x) {
    $hh = (int) $x; $mm = (int) round(($x - $hh) * 60);
    if ($hh < 12) { $suf = 'সকাল'; }
    elseif ($hh < 15) { $suf = 'দুপুর'; }
    elseif ($hh < 18) { $suf = 'বিকাল'; }
    else { $suf = 'সন্ধ্যা'; }
    $h12 = $hh > 12 ? $hh - 12 : ($hh === 0 ? 12 : $hh);
    return $mm ? ($suf . ' ' . pbd_bn($h12) . ':' . pbd_bn(sprintf('%02d', $mm))) : ($suf . ' ' . pbd_bn($h12) . 'টা');
}
function pbd_emb_computed($o) {
    $out = array();
    $diff = 6 - (int) $o['utc'];
    if ($diff > 0) {
        $out[] = $o['cityGen'] . ' সময় বাংলাদেশের চেয়ে ' . pbd_bn($diff) . ' ঘণ্টা পিছিয়ে। তাই ' . $o['cityLoc'] . ' সকাল ৯টা মানে বাংলাদেশে ' . pbd_emb_bn_time(9 + $diff) . ' — দেশে পরিবারকে ফোন বা টাকা পাঠানোর সময় এটা মাথায় রাখুন।';
    } elseif ($diff < 0) {
        $out[] = $o['cityGen'] . ' সময় বাংলাদেশের চেয়ে ' . pbd_bn(-$diff) . ' ঘণ্টা এগিয়ে। তাই ' . $o['cityLoc'] . ' সকাল ১০টা মানে বাংলাদেশে ' . pbd_emb_bn_time(10 + $diff) . '।';
    }
    $hf = null;
    foreach ($o['facts'] as $f) { if ($f['k'] === 'hours') { $hf = $f; break; } }
    if ($hf && isset($hf['open'])) {
        $per = $hf['open'][1] - $hf['open'][0] - (isset($hf['brk']) ? $hf['brk'] : 0);
        $days = isset($hf['days']) ? $hf['days'] : 5;
        $wk = isset($hf['weekly']) ? $hf['weekly'] : ($per * $days);
        $out[] = 'সরকারি সময়সূচি অনুযায়ী অফিস দিনে প্রায় ' . pbd_bn($per) . ' ঘণ্টা আর সপ্তাহে ' . pbd_bn($days) . ' দিন, মোট প্রায় ' . pbd_bn($wk) . ' ঘণ্টা খোলা; ছুটির দিন কোনো কাউন্টার খোলা থাকে না।';
        $out[] = 'বাংলাদেশ থেকে ফোন করতে চাইলে বাংলাদেশ সময় ' . pbd_emb_bn_time($hf['open'][0] + $diff) . ' থেকে ' . pbd_emb_bn_time($hf['open'][1] + $diff) . ' পর্যন্ত চেষ্টা করুন।';
    }
    $nums = array();
    foreach ($o['facts'] as $f) {
        if (preg_match_all('/\+?\d[\d ]{6,}\d/', $f['v'], $mm)) { foreach ($mm[0] as $n) { $nums[$n] = 1; } }
    }
    $out[] = 'এই পাতায় সরকারি সূত্র থেকে নেওয়া মোট ' . pbd_bn(count($nums)) . 'টা যোগাযোগ নম্বর আর ' . pbd_bn(count($o['facts'])) . 'টা তথ্য আছে, প্রতিটার পাশে সূত্র দেওয়া।';
    return $out;
}
function pbd_emb_fact($o, $k) {
    foreach ($o['facts'] as $f) { if ($f['k'] === $k) { return $f['v']; } }
    return '';
}
function pbd_emb_title($o) {
    $extra = 'হটলাইন';
    $has = false;
    foreach ($o['facts'] as $f) { if (in_array($f['k'], array('hotline','tollfree','emergency'), true)) { $has = true; } }
    if (!$has) { $extra = 'পাসপোর্ট'; }
    return 'Bangladesh ' . $o['typEn'] . ' ' . $o['cityEn'] . ' (' . $o['countryEn'] . ') – ঠিকানা, ফোন, ' . $extra . ' | ' . $o['nameBn'];
}
function pbd_emb_desc($o) {
    $phone = pbd_emb_fact($o, 'phone');
    if ($phone === '') { $phone = pbd_emb_fact($o, 'consular'); }
    $addr = pbd_emb_fact($o, 'address');
    $d = $o['nameBn'] . ': ';
    $d .= $addr !== '' ? ('ঠিকানা ' . $addr . '। ') : 'সরকারি ঠিকানা পাতায় পাওয়া যায়নি, যাওয়ার আগে ফোন বা ওয়েবসাইটে নিশ্চিত করুন। ';
    $d .= $phone !== '' ? ('ফোন ' . $phone . '। ') : '';
    $d .= 'সরকারি সূত্র, যাচাই ২৫ নভেম্বর ২০২৬।';
    return $d;
}
function pbd_emb_one($slug, $o) {
    $sub = $o['nameEn'] . ' — official address, phone and services, checked 25 Nov 2026.';
    $h1 = $o['nameBn'] . ' (Bangladesh ' . $o['typEn'] . ' ' . $o['cityEn'] . ') – ঠিকানা, ফোন ও সেবা';
    $html = pbd_head(array(array('বিদেশে বাংলাদেশ দূতাবাস', '/embassy/'), array($o['nameBn'], '')), $h1, $sub);
    $html .= '<p>' . esc_html($o['countryLoc']) . ' থাকা বাংলাদেশিদের জন্য ' . esc_html($o['nameBn']) . 'ের সব তথ্য এক জায়গায়। প্রতিটি নম্বর ও ঠিকানা সরকারি ওয়েবসাইট থেকে নেওয়া, শেষ যাচাই ২৫ নভেম্বর ২০২৬।</p>';
    $addr = pbd_emb_fact($o, 'address');
    $phone = pbd_emb_fact($o, 'phone');
    $email = pbd_emb_fact($o, 'email'); if ($email === '') { $email = pbd_emb_fact($o, 'consular'); }
    $html .= '<section class="pbd-calc" lang="en"><h2>Bangladesh ' . esc_html($o['typEn']) . ' in ' . esc_html($o['cityEn']) . ', ' . esc_html($o['countryEn']) . ' – quick facts</h2><ul class="pbd-nb">';
    $html .= '<li><b>Address:</b> ' . esc_html($addr !== '' ? $addr : 'Not listed on the official website (checked 2026-11-25)') . '</li>';
    $html .= '<li><b>Phone:</b> ' . esc_html($phone !== '' ? $phone : 'See the table below') . '</li>';
    $html .= '<li><b>Email:</b> ' . esc_html($email !== '' ? $email : '—') . '</li>';
    $html .= '<li><b>Official website:</b> <a href="' . esc_url($o['website']) . '" rel="nofollow noopener" target="_blank">' . esc_html(preg_replace('#^https?://#', '', rtrim($o['website'], '/'))) . '</a>. Checked 2026-11-25.</li></ul></section>';
    $html .= '<h2>যোগাযোগের তথ্য (সূত্রসহ)</h2><div class="pbd-tw"><table><caption>' . esc_html($o['nameBn']) . '</caption><thead><tr><th>বিষয়</th><th>তথ্য</th><th>সূত্র</th></tr></thead><tbody>';
    foreach ($o['facts'] as $f) {
        $html .= '<tr><th>' . esc_html($f['bn']) . '</th><td>' . esc_html($f['v']) . '</td><td><a href="' . esc_url($f['src']) . '" rel="nofollow noopener" target="_blank">' . esc_html($f['srcName']) . '</a></td></tr>';
    }
    $html .= '</tbody></table></div>';
    if (!empty($o['missing']) || !empty($o['alts'])) {
        $html .= '<h2>যে তথ্য সরকারি সূত্রে পাওয়া যায়নি</h2><ul class="pbd-nb">';
        foreach ($o['missing'] as $x) { $html .= '<li>' . esc_html($x) . ' — <strong>সরকারি তালিকায় নেই</strong></li>'; }
        $html .= '</ul>';
        if (!empty($o['alts'])) {
            $html .= '<p><strong>যাচাই করা বিকল্প যোগাযোগ (এগুলো ঠিকানার বদলি নয়):</strong></p><ul class="pbd-nb">';
            foreach ($o['alts'] as $x) {
                $x = esc_html($x);
                $x = preg_replace_callback('#(/embassy/[a-z0-9-]+/)#', function ($m) {
                    return '<a href="' . esc_url(home_url($m[1])) . '">' . $m[1] . '</a>';
                }, $x);
                $html .= '<li>' . $x . '</li>';
            }
            $html .= '</ul>';
        }
    }
    $html .= '<h2>সময় ও হিসাব</h2>';
    foreach (pbd_emb_computed($o) as $c) { $html .= '<p class="pbd-calc">' . esc_html($c) . '</p>'; }
    if (!empty($o['services'])) {
        $html .= '<h2>' . esc_html($o['typBn']) . 'ের সেবা (সরকারি পাতার লিংক)</h2><ul class="pbd-nb">';
        foreach ($o['services'] as $sv) { $html .= '<li><a href="' . esc_url($sv[1]) . '" rel="nofollow noopener" target="_blank">' . esc_html($sv[0]) . '</a></li>'; }
        $html .= '</ul>';
    }
    $html .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach ($o['faq'] as $q) { $html .= '<details><summary>' . esc_html($q[0]) . '</summary><p>' . esc_html($q[1]) . '</p></details>'; }
    if (!empty($o['related'])) {
        $html .= ' <h2>আরও পড়ুন</h2><ul class="pbd-nb">';
        foreach ($o['related'] as $r) { $html .= '<li><a href="' . esc_url(home_url($r[1])) . '">' . esc_html($r[0]) . '</a></li>'; }
        $html .= '</ul>';
    }
    $html .= '<p class="pbd-src">তথ্য ভুল বা বদলে গেলে আমাদের জানান। জরুরি অবস্থায় সবসময় মিশনের সরকারি নম্বরে সরাসরি যোগাযোগ করুন। প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে ১৬১৩৫, বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০। সরকারি তথ্য সেবা ৩৩৩।</p>';
    $html .= '<p><a href="' . esc_url(home_url('/embassy/')) . '">← সব দূতাবাস, হাইকমিশন ও কনস্যুলেট</a></p>';
    return $html . pbd_foot();
}
function pbd_emb_hub() {
    $o = pbd_head(array(array('বিদেশে বাংলাদেশ দূতাবাস', '')), 'বিদেশে বাংলাদেশ দূতাবাস, হাইকমিশন ও কনস্যুলেট: ঠিকানা, ফোন, হটলাইন', 'Bangladesh Embassy, High Commission and Consulate directory — official contacts, checked 25 Nov 2026.');
    $o .= '<p>প্রতিটা পাতায় সরকারি ওয়েবসাইট ও প্রবাসী কল্যাণ মন্ত্রণালয়ের শ্রম উইং তালিকা থেকে নেওয়া ঠিকানা, ফোন, ইমেইল ও সেবার লিংক আছে, সূত্র ও যাচাইয়ের তারিখসহ। যে তথ্য সরকারি সূত্রে নেই, সেখানে অনুমান করা হয়নি — পরিষ্কার করে লেখা হয়েছে এবং যাচাই করা বিকল্প যোগাযোগ দেওয়া হয়েছে। শেষ যাচাই ২৫ নভেম্বর ২০২৬।</p>';
    $o .= '<div class="pbd-calc"><p>জরুরি সাহায্য: প্রবাসবন্ধু কল সেন্টার — বাংলাদেশ থেকে টোল-ফ্রি <strong>১৬১৩৫</strong>, বিদেশ থেকে <strong>+৮৮০ ৯৬১০ ১০২ ০৩০</strong> (২৪ ঘণ্টা)। সূত্র: <a href="https://probashi.gov.bd/site/page/b1cfb44f-b40c-45c8-9a85-ce6858939fcd/" rel="nofollow noopener" target="_blank">প্রবাসী কল্যাণ মন্ত্রণালয়</a> (হালনাগাদ ১ মে ২০২৫)। সরকারি তথ্য সেবা <strong>৩৩৩</strong> (<a href="https://mofa.gov.bd/" rel="nofollow noopener" target="_blank">mofa.gov.bd</a>)।</p></div>';
    $groups = array();
    foreach (pbd_emb_all() as $k => $x) {
        $groups[$x['countryBn']][] = $k;
    }
    foreach ($groups as $c => $slugs) {
        $o .= '<h2>' . esc_html($c) . '</h2><ul class="pbd-nb">';
        foreach ($slugs as $k) {
            $x = pbd_emb_all()[$k];
            $o .= '<li><a href="' . esc_url(home_url('/embassy/' . $k . '/')) . '">' . esc_html($x['nameBn']) . '</a> <small lang="en">(' . esc_html($x['typEn'] . ' · ' . $x['cityEn']) . ')</small></li>';
        }
        $o .= '</ul>';
    }
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_emb_hub_faq() as $q) { $o .= '<details><summary>' . esc_html($q[0]) . '</summary><p>' . esc_html($q[1]) . '</p></details>'; }
    $o .= '<p class="pbd-src">আরও মিশন যোগ হচ্ছে — শুধু সরকারি সূত্রে তথ্য মিললে।</p>';
    return $o . pbd_foot();
}
function pbd_emb_hub_faq() {
    return array(
        array('বিদেশে বাংলাদেশ দূতাবাসের তথ্য আপনারা কোথা থেকে নেন?', 'প্রতিটা পাতার তথ্য সংশ্লিষ্ট মিশনের সরকারি ওয়েবসাইট (যেমন doha.mofa.gov.bd) এবং প্রবাসী কল্যাণ মন্ত্রণালয়ের শ্রম উইং তালিকা থেকে নেওয়া। প্রতিটি তথ্যের পাশে সূত্রের লিংক ও হালনাগাদের তারিখ আছে।'),
        array('সরকারি ঠিকানা না পেলে কী করব?', 'আমরা অনুমান করে ঠিকানা লিখি না। সেই পাতায় সরকারি ফোন, ইমেইল, মিশনের ওয়েবসাইট, থাকলে সরকারি ফেসবুক, রাজধানীর দূতাবাস এবং প্রবাসবন্ধু কল সেন্টার (১৬১৩৫ / +৮৮০ ৯৬১০ ১০২ ০৩০) দেওয়া থাকে — যাওয়ার আগে সেখানে নিশ্চিত করুন।'),
        array('How do I find the Bangladesh Embassy in my country?', 'Open the country heading on this page and pick the embassy, high commission or consulate. Each page lists the official address and phone with a source link, last checked 25 November 2026.'),
    );
}
function pbd_emb_nodes($o, $path) {
    $addr = pbd_emb_fact($o, 'address');
    $phone = pbd_emb_fact($o, 'phone');
    $org = array('@type' => 'GovernmentOffice', 'additionalType' => 'https://schema.org/Embassy', 'name' => $o['nameEn'], 'alternateName' => $o['nameBn'],
        'url' => home_url($path), 'parentOrganization' => array('@type' => 'GovernmentOrganization', 'name' => 'Ministry of Foreign Affairs, Bangladesh', 'url' => 'https://mofa.gov.bd/'));
    if ($addr !== '') { $org['address'] = array('@type' => 'PostalAddress', 'streetAddress' => $addr, 'addressLocality' => $o['cityEn'], 'addressCountry' => $o['countryEn']); }
    if ($phone !== '') { $org['telephone'] = preg_replace('/,.*/', '', $phone); }
    $email = pbd_emb_fact($o, 'email'); if ($email !== '') { $org['email'] = $email; }
    return array(
        'pbdOrg' => $org,
        'pbdCrumbs' => pbd_crumbs_ld(array(array('বিদেশে বাংলাদেশ দূতাবাস', '/embassy/'), array($o['nameBn'], $path))),
    );
}

