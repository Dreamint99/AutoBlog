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
define('PBD_VER', '20');

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
            $s['title'] = 'Bangladesh Embassy list – every country, address, phone | বিদেশে বাংলাদেশ দূতাবাস';
            $s['desc'] = 'সব দেশে বাংলাদেশের দূতাবাস, হাইকমিশন ও কনস্যুলেটের সরকারি ঠিকানা, ফোন, হটলাইন; যে দেশে মিশন নেই সেখানে দায়িত্বপ্রাপ্ত মিশন — সূত্রসহ, যাচাই ২৫ নভেম্বর ২০২৬।';
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
/* one-shot: drop LiteSpeed cache of passport office pages after the English/Banglish title update */
add_action('init', function () {
    if (get_option('pbd_poen_purged') === '18en') { return; }
    foreach (array('/passport-office/', '/passport-office/uttara/', '/passport-office/comilla/', '/passport-office/sylhet/') as $p) {
        do_action('litespeed_purge_url', home_url($p));
    }
    update_option('pbd_poen_purged', '18en', false);
}, 20);

function pbd_v18_css() {
    return '<style>.pbd .pbd-calc{background:var(--bs,#e9f1fd);border-left:4px solid var(--b,#0b56c4);padding:10px 14px;border-radius:10px}.pbd .pbd-tw{overflow-x:auto}.pbd .pbd-tw caption{text-align:left;font-weight:700;padding:4px 0}.pbd .pbd-tw th{white-space:nowrap}.pbd .pbd-tw td:last-child{font-size:.85em}.pbd ul.pbd-nb li{margin:.25em 0}.art-hd .pbd-en{margin:6px 0 0;font-size:.95em;color:var(--b,#0b56c4);font-weight:600}</style>';
}
/* ---------- embassy / high commission / consulate + countries without a mission (v20) ---------- */
/* Data: every Bangladesh mission on the MOFA region lists + every UN member without one (kind=country).
   generator/embassy_refresh.py rewrites the JSON below weekly: when MOFA lists a new mission in a
   country, that record turns into kind=mission under the SAME slug. */
function pbd_emb_all() {
    static $d = null;
    if ($d !== null) { return $d; }
    // gzcompress(JSON) as base64 — keeps the snippet small; generator/embassy_refresh.py reads and writes this block
    $raw = function_exists('gzuncompress') ? @gzuncompress(base64_decode(<<<'B64'
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
B64
    )) : false;
    $d = $raw !== false ? json_decode($raw, true) : null;
    return is_array($d) ? $d : array();
}
function pbd_emb_get($slug) {
    $all = pbd_emb_all();
    return isset($all[$slug]) ? $all[$slug] : null;
}
function pbd_emb_bn_time($x) {
    $day = '';
    if ($x >= 24) { $x -= 24; $day = ' (পরের দিন)'; }
    if ($x < 0) { $x += 24; $day = ' (আগের দিন)'; }
    $hh = (int) floor($x); $mm = (int) round(($x - $hh) * 60);
    if ($mm === 60) { $hh++; $mm = 0; }
    if ($hh < 4) { $suf = 'রাত'; }
    elseif ($hh < 12) { $suf = 'সকাল'; }
    elseif ($hh < 15) { $suf = 'দুপুর'; }
    elseif ($hh < 18) { $suf = 'বিকাল'; }
    elseif ($hh < 20) { $suf = 'সন্ধ্যা'; }
    else { $suf = 'রাত'; }
    $h12 = $hh > 12 ? $hh - 12 : ($hh === 0 ? 12 : $hh);
    return ($mm ? ($suf . ' ' . pbd_bn($h12) . ':' . pbd_bn(sprintf('%02d', $mm))) : ($suf . ' ' . pbd_bn($h12) . 'টা')) . $day;
}
function pbd_emb_hm($h) {
    $h = abs($h); $hh = (int) floor($h); $mm = (int) round(($h - $hh) * 60);
    return ($hh ? pbd_bn($hh) . ' ঘণ্টা' : '') . ($mm ? ($hh ? ' ' : '') . pbd_bn($mm) . ' মিনিট' : '');
}
function pbd_emb_tdiff($gen, $locp, $utc, $dst) {
    $diff = 6 - (float) $utc;
    if (abs($diff) < 0.01) { $s = $gen . ' সময় আর বাংলাদেশের সময় একই।'; }
    elseif ($diff > 0) { $s = $gen . ' সময় বাংলাদেশের চেয়ে ' . pbd_emb_hm($diff) . ' পিছিয়ে। ' . $locp . ' সকাল ৯টা মানে বাংলাদেশে ' . pbd_emb_bn_time(9 + $diff) . '।'; }
    else { $s = $gen . ' সময় বাংলাদেশের চেয়ে ' . pbd_emb_hm($diff) . ' এগিয়ে। ' . $locp . ' সকাল ১০টা মানে বাংলাদেশে ' . pbd_emb_bn_time(10 + $diff) . '।'; }
    if (!empty($dst)) { $s .= ' হিসাবটা নভেম্বর ২০২৬-এর; গ্রীষ্মকালীন সময় (DST) চালু হলে পার্থক্য ১ ঘণ্টা বদলায়।'; }
    return $s;
}
function pbd_emb_computed($o) {
    $out = array();
    $diff = 6 - (float) $o['utc'];
    $out[] = pbd_emb_tdiff($o['cityGen'], $o['cityLoc'], $o['utc'], !empty($o['dst']));
    $hf = null;
    foreach ($o['facts'] as $f) { if ($f['k'] === 'hours') { $hf = $f; break; } }
    if ($hf && isset($hf['open'])) {
        $per = $hf['open'][1] - $hf['open'][0] - (isset($hf['brk']) ? $hf['brk'] : 0);
        $days = isset($hf['days']) ? $hf['days'] : 5;
        $wk = isset($hf['weekly']) ? $hf['weekly'] : ($per * $days);
        $out[] = 'সরকারি সময়সূচি অনুযায়ী অফিস দিনে প্রায় ' . pbd_bn($per) . ' ঘণ্টা আর সপ্তাহে ' . pbd_bn($days) . ' দিন, মোট প্রায় ' . pbd_bn($wk) . ' ঘণ্টা খোলা; ছুটির দিন কোনো কাউন্টার খোলা থাকে না।';
        $out[] = 'বাংলাদেশ থেকে ফোন করতে চাইলে বাংলাদেশ সময় ' . pbd_emb_bn_time($hf['open'][0] + $diff) . ' থেকে ' . pbd_emb_bn_time($hf['open'][1] + $diff) . ' পর্যন্ত চেষ্টা করুন।';
    }
    if (!empty($o['dhakaKm'])) { $out[] = $o['cityGen'] . ' সঙ্গে ঢাকার সরলরেখা দূরত্ব প্রায় ' . pbd_bn(number_format($o['dhakaKm'])) . ' কিলোমিটার।'; }
    $nums = array();
    foreach ($o['facts'] as $f) {
        if (preg_match_all('/\+?\d[\d \-]{6,}\d/', $f['v'], $mm)) { foreach ($mm[0] as $n) { $nums[$n] = 1; } }
    }
    $out[] = 'এই পাতায় সরকারি সূত্র থেকে নেওয়া মোট ' . pbd_bn(count($nums)) . 'টা যোগাযোগ নম্বর আর ' . pbd_bn(count($o['facts'])) . 'টা তথ্য আছে, প্রতিটার পাশে সূত্র দেওয়া।';
    return $out;
}
function pbd_emb_fact($o, $k) {
    if (empty($o['facts'])) { return ''; }
    foreach ($o['facts'] as $f) { if ($f['k'] === $k) { return $f['v']; } }
    return '';
}
function pbd_emb_is_country($o) { return isset($o['kind']) && $o['kind'] === 'country'; }
function pbd_emb_title($o) {
    if (pbd_emb_is_country($o)) {
        return 'Bangladesh Embassy in ' . $o['countryEn'] . '? দায়িত্বপ্রাপ্ত মিশন ও যোগাযোগ | ' . $o['countryLoc'] . ' বাংলাদেশ দূতাবাস';
    }
    if (!empty($o['titleEn'])) { return $o['titleEn']; }
    $extra = 'হটলাইন';
    $has = false;
    foreach ($o['facts'] as $f) { if (in_array($f['k'], array('hotline','tollfree','emergency'), true)) { $has = true; } }
    if (!$has) { $extra = 'পাসপোর্ট'; }
    return 'Bangladesh ' . $o['typEn'] . ' ' . $o['cityEn'] . ' (' . $o['countryEn'] . ') – ঠিকানা, ফোন, ' . $extra . ' | ' . $o['nameBn'];
}
function pbd_emb_desc($o) {
    if (pbd_emb_is_country($o)) {
        $d = $o['countryLoc'] . ' বাংলাদেশের আবাসিক দূতাবাস নেই। ';
        if (!empty($o['acc'])) { $d .= 'দায়িত্বে ' . $o['acc']['nameBn'] . ' (' . $o['acc']['phone'] . ')। '; }
        else { $d .= 'নিকটতম মিশন ' . $o['near'][0]['nameBn'] . '। '; }
        return $d . 'পাসপোর্ট, ভিসা ও জরুরি যোগাযোগ, সরকারি সূত্রে যাচাই ২৫ নভেম্বর ২০২৬।';
    }
    $phone = pbd_emb_fact($o, 'phone');
    if ($phone === '') { $phone = pbd_emb_fact($o, 'hotline'); }
    if ($phone === '') { $phone = pbd_emb_fact($o, 'consular'); }
    $addr = pbd_emb_fact($o, 'address');
    $d = $o['nameBn'] . ': ';
    $d .= $addr !== '' ? ('ঠিকানা ' . $addr . '। ') : 'সরকারি ঠিকানা পাতায় পাওয়া যায়নি, যাওয়ার আগে ফোন বা ইমেইলে নিশ্চিত করুন। ';
    $d .= $phone !== '' ? ('ফোন ' . $phone . '। ') : '';
    $d .= 'সরকারি সূত্র, যাচাই ২৫ নভেম্বর ২০২৬।';
    return $d;
}
function pbd_emb_link_alts($x) {
    $x = esc_html($x);
    return preg_replace_callback('#(/embassy/[a-z0-9-]+/)#', function ($m) {
        return '<a href="' . esc_url(home_url($m[1])) . '">' . $m[1] . '</a>';
    }, $x);
}
function pbd_emb_ext($u, $t) { return '<a href="' . esc_url($u) . '" rel="nofollow noopener" target="_blank">' . esc_html($t) . '</a>'; }
function pbd_emb_int($p, $t) { return '<a href="' . esc_url(home_url($p)) . '">' . esc_html($t) . '</a>'; }
function pbd_emb_help() {
    return '<p class="pbd-src">তথ্য ভুল বা বদলে গেলে আমাদের জানান। জরুরি অবস্থায় সবসময় মিশনের সরকারি নম্বরে সরাসরি যোগাযোগ করুন। প্রবাসবন্ধু কল সেন্টার (প্রবাসী কল্যাণ মন্ত্রণালয়): বাংলাদেশ থেকে ১৬১৩৫, বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০। পররাষ্ট্র মন্ত্রণালয়, ঢাকা: +880 2 2233 82862, dirwelfare@mofa.gov.bd। সরকারি তথ্য সেবা ৩৩৩।</p>';
}
function pbd_emb_one($slug, $o) {
    if (pbd_emb_is_country($o)) { return pbd_emb_none($slug, $o); }
    $chk = !empty($o['auto']) ? $o['auto'] : '2026-11-25';
    $chkBn = !empty($o['auto']) ? pbd_bn($o['auto']) : '২৫ নভেম্বর ২০২৬';
    $sub = $o['nameEn'] . ' — official address, phone and services, checked ' . $chk . '.';
    $h1 = $o['nameBn'] . ' (Bangladesh ' . $o['typEn'] . ' ' . $o['cityEn'] . ') – ঠিকানা, ফোন ও সেবা';
    $html = pbd_head(array(array('বিদেশে বাংলাদেশ দূতাবাস', '/embassy/'), array($o['nameBn'], '')), $h1, $sub);
    $html .= '<p>' . esc_html($o['countryLoc']) . ' থাকা বাংলাদেশিদের জন্য ' . esc_html($o['nameBn']) . 'ের সব তথ্য এক জায়গায়। প্রতিটি নম্বর ও ঠিকানা সরকারি ওয়েবসাইট থেকে নেওয়া, শেষ যাচাই ' . $chkBn . '।</p>';
    if (!empty($o['intro'])) { $html .= '<p>' . esc_html($o['intro']) . '</p>'; }
    $addr = pbd_emb_fact($o, 'address');
    $phone = pbd_emb_fact($o, 'phone'); if ($phone === '') { $phone = pbd_emb_fact($o, 'hotline'); }
    $email = pbd_emb_fact($o, 'email'); if ($email === '') { $email = pbd_emb_fact($o, 'consular'); }
    $html .= '<section class="pbd-calc" lang="en"><h2>Bangladesh ' . esc_html($o['typEn']) . ' in ' . esc_html($o['cityEn']) . ', ' . esc_html($o['countryEn']) . ' – quick facts</h2><ul class="pbd-nb">';
    $html .= '<li><b>Address:</b> ' . esc_html($addr !== '' ? $addr : 'Not listed on the official website (checked ' . $chk . ')') . '</li>';
    $html .= '<li><b>Phone:</b> ' . esc_html($phone !== '' ? $phone : 'Not listed on the official website') . '</li>';
    $html .= '<li><b>Email:</b> ' . esc_html($email !== '' ? $email : '—') . '</li>';
    $html .= '<li><b>Official website:</b> <a href="' . esc_url($o['website']) . '" rel="nofollow noopener" target="_blank">' . esc_html(preg_replace('#^https?://#', '', rtrim($o['website'], '/'))) . '</a>. Checked ' . $chk . '.</li></ul></section>';
    if (!empty($o['facts'])) {
        $html .= '<h2>যোগাযোগের তথ্য (সূত্রসহ)</h2><div class="pbd-tw"><table><caption>' . esc_html($o['nameBn']) . '</caption><thead><tr><th>বিষয়</th><th>তথ্য</th><th>সূত্র</th></tr></thead><tbody>';
        foreach ($o['facts'] as $f) {
            $html .= '<tr><th>' . esc_html($f['bn']) . '</th><td>' . esc_html($f['v']) . '</td><td>' . pbd_emb_ext($f['src'], $f['srcName']) . '</td></tr>';
        }
        $html .= '</tbody></table></div>';
    }
    if (!empty($o['missing']) || !empty($o['alts'])) {
        $html .= '<h2>যে তথ্য সরকারি সূত্রে পাওয়া যায়নি</h2><ul class="pbd-nb">';
        foreach ($o['missing'] as $x) { $html .= '<li>' . esc_html($x) . ' — <strong>সরকারি তালিকায় নেই</strong></li>'; }
        $html .= '</ul>';
        if (!empty($o['alts'])) {
            $html .= '<p><strong>যাচাই করা বিকল্প যোগাযোগ (এগুলো ঠিকানার বদলি নয়):</strong></p><ul class="pbd-nb">';
            foreach ($o['alts'] as $x) { $html .= '<li>' . pbd_emb_link_alts($x) . '</li>'; }
            $html .= '</ul>';
        }
    }
    if (!empty($o['covers'])) {
        $html .= '<h2>' . esc_html($o['nameBn']) . ' আর যেসব দেশের দায়িত্বে</h2><p>যেসব দেশে বাংলাদেশের নিজস্ব দূতাবাস নেই, তার কয়েকটির দায়িত্বও এই মিশনের (সূত্র: সংশ্লিষ্ট দেশের পাতায়)। সেসব দেশের বাংলাদেশিরা পাসপোর্ট, ভিসা ও অন্যান্য কনস্যুলার সেবার জন্য এখানে যোগাযোগ করবেন।</p><ul class="pbd-nb">';
        foreach ($o['covers'] as $c) { $html .= '<li>' . pbd_emb_int('/embassy/' . $c[1] . '/', $c[0]) . ' <small lang="en">(' . esc_html($c[2]) . ')</small></li>'; }
        $html .= '</ul>';
    }
    if (!empty($o['siblings'])) {
        $html .= '<h2>' . esc_html($o['countryLoc']) . ' বাংলাদেশের অন্য মিশন</h2><ul class="pbd-nb">';
        foreach ($o['siblings'] as $c) { $html .= '<li>' . pbd_emb_int('/embassy/' . $c[1] . '/', $c[0]) . '</li>'; }
        $html .= '</ul>';
    }
    $html .= '<h2>সময় ও হিসাব</h2>';
    foreach (pbd_emb_computed($o) as $c) { $html .= '<p class="pbd-calc">' . esc_html($c) . '</p>'; }
    if (!empty($o['services'])) {
        $html .= '<h2>' . esc_html($o['typBn']) . 'ের সেবা (সরকারি পাতার লিংক)</h2><ul class="pbd-nb">';
        foreach ($o['services'] as $sv) { $html .= '<li>' . pbd_emb_ext($sv[1], $sv[0]) . '</li>'; }
        $html .= '</ul>';
    }
    $html .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach ($o['faq'] as $q) { $html .= '<details><summary>' . esc_html($q[0]) . '</summary><p>' . esc_html($q[1]) . '</p></details>'; }
    if (!empty($o['related'])) {
        $html .= ' <h2>আরও পড়ুন</h2><ul class="pbd-nb">';
        foreach ($o['related'] as $r) { $html .= '<li>' . pbd_emb_int($r[1], $r[0]) . '</li>'; }
        $html .= '</ul>';
    }
    $html .= pbd_emb_help();
    $html .= '<p><a href="' . esc_url(home_url('/embassy/')) . '">← সব দূতাবাস, হাইকমিশন ও কনস্যুলেট</a></p>';
    return $html . pbd_foot();
}
function pbd_emb_contact_list($x) {
    $h = '<ul class="pbd-nb">';
    foreach ($x['facts'] as $f) { $h .= '<li><b>' . esc_html($f['bn']) . ':</b> ' . esc_html($f['v']) . ' <small>(' . pbd_emb_ext($f['src'], $f['srcName']) . ')</small></li>'; }
    $h .= '<li><b>ওয়েবসাইট:</b> ' . pbd_emb_ext($x['website'], preg_replace('#^https?://#', '', rtrim($x['website'], '/'))) . '</li></ul>';
    return $h;
}
function pbd_emb_none($slug, $o) {
    $h1 = $o['countryLoc'] . ' কি বাংলাদেশ দূতাবাস আছে? দায়িত্বপ্রাপ্ত মিশন, পাসপোর্ট ও জরুরি যোগাযোগ';
    $sub = 'Bangladesh Embassy in ' . $o['countryEn'] . ': no resident mission — which Bangladesh mission covers ' . $o['countryEn'] . ', checked 25 Nov 2026.';
    $html = pbd_head(array(array('বিদেশে বাংলাদেশ দূতাবাস', '/embassy/'), array($o['countryBn'], '')), $h1, $sub);
    $html .= '<div class="pbd-calc"><p><strong>সংক্ষেপে:</strong> পররাষ্ট্র মন্ত্রণালয়ের ' . pbd_emb_ext($o['mofaSrc'], 'অঞ্চলভিত্তিক মিশন তালিকা (' . $o['regionBn'] . ')') . ' অনুযায়ী ' . esc_html($o['countryLoc']) . ' বাংলাদেশের কোনো আবাসিক দূতাবাস, হাইকমিশন বা কনস্যুলেট নেই (যাচাই ২৫ নভেম্বর ২০২৬)। ';
    if (!empty($o['acc'])) {
        $html .= esc_html($o['countryGen']) . ' দায়িত্বে আছে ' . pbd_emb_int('/embassy/' . $o['acc']['slug'] . '/', $o['acc']['nameBn']) . ' (' . esc_html($o['acc']['cityBn'] . ', ' . $o['acc']['countryBn']) . ')।</p></div>';
    } else {
        $html .= 'কোন বাংলাদেশ মিশন ' . esc_html($o['countryGen']) . ' দায়িত্বে (concurrent accreditation), তা সরকারি সূত্রে যাচাই করা যায়নি। নিচে সবচেয়ে কাছের বাংলাদেশ মিশন আর পররাষ্ট্র মন্ত্রণালয়ের যোগাযোগ দেওয়া হলো।</p></div>';
    }
    if (!empty($o['intro'])) { $html .= '<p>' . esc_html($o['intro']) . '</p>'; }
    $html .= '<section class="pbd-calc" lang="en"><h2>Bangladesh Embassy in ' . esc_html($o['countryEn']) . ' – quick answer</h2><p>' . esc_html($o['enAnswer']) . '</p></section>';
    if (!empty($o['acc'])) {
        $a = $o['acc'];
        $html .= '<h2>দায়িত্বপ্রাপ্ত মিশন: ' . esc_html($a['nameBn']) . '</h2>';
        $html .= '<p>' . esc_html($a['evidence']) . ' সূত্র: ' . pbd_emb_ext($a['src'], $a['srcName']) . '।</p>';
        $html .= pbd_emb_contact_list($a);
        if (!empty($a['missing'])) { $html .= '<p><small>এই মিশনের ' . esc_html(implode(', ', $a['missing'])) . ' সরকারি ওয়েবসাইটে পাওয়া যায়নি — ইমেইলে যোগাযোগ করুন।</small></p>'; }
        $html .= '<p>পূর্ণ তথ্য, অফিস সময় ও সেবার লিংক: ' . pbd_emb_int('/embassy/' . $a['slug'] . '/', $a['nameBn']) . '।</p>';
    }
    if (!empty($o['near'])) {
        $html .= '<h2>' . esc_html($o['capitalLoc']) . ' থেকে সবচেয়ে কাছের বাংলাদেশ মিশন</h2><p>' . esc_html($o['capitalEn']) . ' থেকে সরলরেখা দূরত্ব (রাস্তার দূরত্ব বেশি হবে):</p><ol class="pbd-nb">';
        foreach ($o['near'] as $n) {
            $html .= '<li>' . pbd_emb_int('/embassy/' . $n['slug'] . '/', $n['nameBn']) . ' — প্রায় ' . esc_html(pbd_bn(number_format($n['km']))) . ' কিমি' . ($n['contact'] !== '' ? '; ' . esc_html($n['contact']) : '') . '</li>';
        }
        $html .= '</ol>';
    }
    $html .= '<h2>' . esc_html($o['countryBn']) . ' থেকে পাসপোর্ট, ভিসা ও কনস্যুলার সেবা কীভাবে পাবেন</h2><ol class="pbd-nb">';
    foreach ($o['howto'] as $x) { $html .= '<li>' . pbd_emb_link_alts($x) . '</li>'; }
    $html .= '</ol>';
    $html .= '<h2>বিপদে পড়লে জরুরি যোগাযোগ</h2><ul class="pbd-nb">';
    foreach ($o['emergency'] as $e) { $html .= '<li>' . esc_html($e[0]) . ' — ' . pbd_emb_ext($e[1], $e[2]) . '</li>'; }
    $html .= '</ul>';
    $html .= '<h2>' . esc_html($o['countryBn']) . ': সময়, ফোন কোড ও দূরত্ব</h2>';
    foreach ($o['computed'] as $c) { $html .= '<p class="pbd-calc">' . esc_html($c) . '</p>'; }
    if (!empty($o['neighbors'])) {
        $html .= '<h2>প্রতিবেশী দেশে বাংলাদেশ মিশন</h2><ul class="pbd-nb">';
        foreach ($o['neighbors'] as $c) { $html .= '<li>' . pbd_emb_int('/embassy/' . $c[1] . '/', $c[0]) . '</li>'; }
        $html .= '</ul>';
    }
    $html .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach ($o['faq'] as $q) { $html .= '<details><summary>' . esc_html($q[0]) . '</summary><p>' . esc_html($q[1]) . '</p></details>'; }
    if (!empty($o['related'])) {
        $html .= ' <h2>আরও পড়ুন</h2><ul class="pbd-nb">';
        foreach ($o['related'] as $r) { $html .= '<li>' . pbd_emb_int($r[1], $r[0]) . '</li>'; }
        $html .= '</ul>';
    }
    $html .= '<p class="pbd-src">নতুন মিশন খুললে পররাষ্ট্র মন্ত্রণালয়ের তালিকা থেকে এই পাতা স্বয়ংক্রিয়ভাবে হালনাগাদ হয় (সাপ্তাহিক যাচাই)।</p>';
    $html .= pbd_emb_help();
    $html .= '<p><a href="' . esc_url(home_url('/embassy/')) . '">← সব দূতাবাস, হাইকমিশন ও কনস্যুলেট</a></p>';
    return $html . pbd_foot();
}
function pbd_emb_regions() {
    return array('southasia' => 'দক্ষিণ এশিয়া', 'seasia' => 'দক্ষিণ-পূর্ব এশিয়া', 'eastasia' => 'পূর্ব এশিয়া ও প্রশান্ত মহাসাগরীয় অঞ্চল', 'westasia' => 'মধ্যপ্রাচ্য ও পশ্চিম এশিয়া',
        'weurope' => 'পশ্চিম ইউরোপ', 'eeurope' => 'পূর্ব ইউরোপ ও মধ্য এশিয়া', 'africa' => 'আফ্রিকা', 'americas' => 'আমেরিকা ও ক্যারিবীয় অঞ্চল');
}
function pbd_emb_counts() {
    $n = array('mission' => 0, 'country' => 0);
    foreach (pbd_emb_all() as $x) { $n[pbd_emb_is_country($x) ? 'country' : 'mission']++; }
    return $n;
}
function pbd_emb_hub() {
    $n = pbd_emb_counts();
    $o = pbd_head(array(array('বিদেশে বাংলাদেশ দূতাবাস', '')), 'বিদেশে বাংলাদেশ দূতাবাস, হাইকমিশন ও কনস্যুলেট: দেশভিত্তিক তালিকা, ঠিকানা, ফোন, হটলাইন', 'Bangladesh Embassy, High Commission and Consulate directory for every country — official contacts, checked 25 Nov 2026.');
    $o .= '<p>পররাষ্ট্র মন্ত্রণালয়ের মিশন তালিকা অনুযায়ী বিদেশে বাংলাদেশের ' . pbd_bn($n['mission']) . 'টি দূতাবাস, হাইকমিশন ও কনস্যুলেটের পাতা এখানে আছে। আর যে ' . pbd_bn($n['country']) . 'টি দেশে বাংলাদেশের নিজস্ব মিশন নেই, সেখানে কোন মিশন দায়িত্বে বা সবচেয়ে কাছে — তারও আলাদা পাতা আছে। প্রতিটা তথ্য সরকারি ওয়েবসাইট ও প্রবাসী কল্যাণ মন্ত্রণালয় থেকে নেওয়া, সূত্র ও তারিখসহ। যে তথ্য সরকারি সূত্রে নেই, সেখানে অনুমান করা হয়নি। শেষ যাচাই ২৫ নভেম্বর ২০২৬।</p>';
    $o .= '<div class="pbd-calc"><p>জরুরি সাহায্য: প্রবাসবন্ধু কল সেন্টার — বাংলাদেশ থেকে টোল-ফ্রি <strong>১৬১৩৫</strong>, বিদেশ থেকে <strong>+৮৮০ ৯৬১০ ১০২ ০৩০</strong> (২৪ ঘণ্টা)। সূত্র: <a href="https://probashi.gov.bd/site/page/b1cfb44f-b40c-45c8-9a85-ce6858939fcd/" rel="nofollow noopener" target="_blank">প্রবাসী কল্যাণ মন্ত্রণালয়</a> (হালনাগাদ ১ মে ২০২৫)। সরকারি তথ্য সেবা <strong>৩৩৩</strong> (<a href="https://mofa.gov.bd/" rel="nofollow noopener" target="_blank">mofa.gov.bd</a>)।</p></div>';
    $reg = pbd_emb_regions();
    $groups = array();
    foreach (pbd_emb_all() as $k => $x) {
        $r = isset($reg[$x['region']]) ? $x['region'] : 'weurope';
        $groups[$r][$x['countryBn']][] = $k;
    }
    $o .= '<p><strong>অঞ্চল:</strong> ';
    $nav = array();
    foreach ($reg as $rk => $rn) { if (!empty($groups[$rk])) { $nav[] = '<a href="#emb-' . $rk . '">' . esc_html($rn) . '</a>'; } }
    $o .= implode(' · ', $nav) . '</p>';
    $all = pbd_emb_all();
    foreach ($reg as $rk => $rn) {
        if (empty($groups[$rk])) { continue; }
        $o .= '<h2 id="emb-' . $rk . '">' . esc_html($rn) . '</h2>';
        $cs = $groups[$rk];
        if (class_exists('Collator')) { $col = new Collator('bn_BD'); uksort($cs, array($col, 'compare')); } else { ksort($cs); }
        $o .= '<ul class="pbd-nb">';
        foreach ($cs as $c => $slugs) {
            $items = array();
            foreach ($slugs as $k) {
                $x = $all[$k];
                if (pbd_emb_is_country($x)) {
                    $items[] = pbd_emb_int('/embassy/' . $k . '/', 'দূতাবাস নেই — ' . (!empty($x['acc']) ? 'দায়িত্বে ' . $x['acc']['cityBn'] : 'নিকটতম মিশন দেখুন'));
                } else {
                    $items[] = pbd_emb_int('/embassy/' . $k . '/', $x['nameBn']) . ' <small lang="en">(' . esc_html($x['typEn'] . ' · ' . $x['cityEn']) . ')</small>';
                }
            }
            $o .= '<li><strong>' . esc_html($c) . '</strong> <small lang="en">' . esc_html($all[$slugs[0]]['countryEn']) . '</small>: ' . implode('; ', $items) . '</li>';
        }
        $o .= '</ul>';
    }
    $o .= '<h2>প্রশ্ন ও উত্তর</h2>';
    foreach (pbd_emb_hub_faq() as $q) { $o .= '<details><summary>' . esc_html($q[0]) . '</summary><p>' . esc_html($q[1]) . '</p></details>'; }
    $o .= '<p class="pbd-src">মিশনের তালিকা প্রতি সপ্তাহে পররাষ্ট্র মন্ত্রণালয়ের ওয়েবসাইটের সঙ্গে মিলিয়ে দেখা হয়।</p>';
    return $o . pbd_foot();
}
function pbd_emb_hub_faq() {
    $n = pbd_emb_counts();
    return array(
        array('বিদেশে বাংলাদেশের কয়টি দূতাবাস ও কনস্যুলেট আছে?', 'পররাষ্ট্র মন্ত্রণালয়ের অঞ্চলভিত্তিক তালিকা থেকে এই পাতায় ' . pbd_bn($n['mission']) . 'টি মিশনের (দূতাবাস, হাইকমিশন, কনস্যুলেট ও কনস্যুলার অফিস) পাতা আছে। জাতিসংঘ (নিউইয়র্ক) ও ওআইসি (জেদ্দা)-তে বাংলাদেশের স্থায়ী মিশনের আলাদা পাতা নেই; ওই শহরের কনস্যুলেট জেনারেলের পাতা দেখুন।'),
        array('যে দেশে বাংলাদেশ দূতাবাস নেই, সেখানে পাসপোর্ট বা ভিসার কাজ কোথায় করব?', 'সেই দেশের পাতায় দায়িত্বপ্রাপ্ত (concurrently accredited) বাংলাদেশ মিশনের নাম, ঠিকানা ও ফোন সূত্রসহ দেওয়া আছে। সরকারি সূত্রে দায়িত্বপ্রাপ্ত মিশন নিশ্চিত না হলে সবচেয়ে কাছের মিশন আর পররাষ্ট্র মন্ত্রণালয়ের যোগাযোগ দেওয়া আছে।'),
        array('বিদেশে বাংলাদেশ দূতাবাসের তথ্য আপনারা কোথা থেকে নেন?', 'প্রতিটা পাতার তথ্য সংশ্লিষ্ট মিশনের সরকারি ওয়েবসাইট (যেমন doha.mofa.gov.bd), পররাষ্ট্র মন্ত্রণালয় (mofa.gov.bd) এবং প্রবাসী কল্যাণ মন্ত্রণালয়ের শ্রম উইং তালিকা থেকে নেওয়া। প্রতিটি তথ্যের পাশে সূত্রের লিংক ও হালনাগাদের তারিখ আছে।'),
        array('সরকারি ঠিকানা না পেলে কী করব?', 'আমরা অনুমান করে ঠিকানা লিখি না। সেই পাতায় সরকারি ফোন, ইমেইল, মিশনের ওয়েবসাইট, থাকলে সরকারি ফেসবুক, রাজধানীর দূতাবাস এবং প্রবাসবন্ধু কল সেন্টার (১৬১৩৫ / +৮৮০ ৯৬১০ ১০২ ০৩০) দেওয়া থাকে — যাওয়ার আগে সেখানে নিশ্চিত করুন।'),
        array('How do I find the Bangladesh Embassy in my country?', 'Open your region on this page and pick your country. Each mission page lists the official address and phone with a source link; countries without a Bangladesh mission show which mission covers them. Last checked 25 November 2026.'),
    );
}
function pbd_emb_nodes($o, $path) {
    if (pbd_emb_is_country($o)) {
        return array('pbdCrumbs' => pbd_crumbs_ld(array(array('বিদেশে বাংলাদেশ দূতাবাস', '/embassy/'), array($o['countryBn'], $path))));
    }
    $addr = pbd_emb_fact($o, 'address');
    $phone = pbd_emb_fact($o, 'phone'); if ($phone === '') { $phone = pbd_emb_fact($o, 'hotline'); }
    $org = array('@type' => 'GovernmentOffice', 'additionalType' => 'https://schema.org/Embassy', 'name' => $o['nameEn'], 'alternateName' => $o['nameBn'],
        'url' => home_url($path), 'sameAs' => $o['website'], 'parentOrganization' => array('@type' => 'GovernmentOrganization', 'name' => 'Ministry of Foreign Affairs, Bangladesh', 'url' => 'https://mofa.gov.bd/'));
    if ($addr !== '') { $org['address'] = array('@type' => 'PostalAddress', 'streetAddress' => $addr, 'addressLocality' => $o['cityEn'], 'addressCountry' => $o['countryEn']); }
    if ($phone !== '') { $org['telephone'] = trim(preg_replace('/[,;(].*/', '', $phone)); }
    $email = pbd_emb_fact($o, 'email'); if ($email !== '') { $org['email'] = trim(preg_replace('/[,;\s].*/', '', $email)); }
    return array(
        'pbdOrg' => $org,
        'pbdCrumbs' => pbd_crumbs_ld(array(array('বিদেশে বাংলাদেশ দূতাবাস', '/embassy/'), array($o['nameBn'], $path))),
    );
}
