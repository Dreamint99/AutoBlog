"""probashiinfo ops (approved by Ahmed 2026-11-24): (1) flush stale Rank Math sitemap cache,
(2) host the repo IndexNow key at /<key>.txt via a Code Snippet, then ping IndexNow.
  python wp_pseo_ops.py --inspect   # read-only report
  python wp_pseo_ops.py --apply     # install/update snippet, flush, verify, ping
The key value is never printed."""
import re, sys, time, requests
import wp_seo_t124 as t
from config.settings import INDEXNOW_KEY
from modules import indexnow

SITE = "https://probashiinfo.com"
SN_NAME = "AutoBlog IndexNow key + sitemap ops"
API = "code-snippets/v1/snippets"
URLS = [f"{SITE}/{c}-minimum-wage-2026/" for c in ["italy", "serbia", "romania", "australia", "poland", "south-korea", "croatia"]] + [
    f"{SITE}/gris-oyaark-bhisaa-2026-khrc-betn-o-shj-gaaidd/", f"{SITE}/bulgeriyaa-srbnimn-betn-2026-780-iureaa-o-shrt/"]
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/131"}

PHP = r"""/* AutoBlog: IndexNow key file + admin-only sitemap cache ops (managed by generator/wp_pseo_ops.py). */
add_action( 'init', function () {
	$p = parse_url( isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH );
	if ( $p === '/__KEY__.txt' ) {
		if ( function_exists( 'do_action' ) ) { do_action( 'litespeed_control_set_nocache', 'indexnow key' ); }
		status_header( 200 ); header( 'Content-Type: text/plain; charset=utf-8' );
		echo '__KEY__'; exit;
	}
}, 0 );
add_action( 'rest_api_init', function () {
	register_rest_route( 'pbd-ops/v1', '/indexnow', array(
		'methods' => 'POST',
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback' => function ( $req ) {
			$o = get_option( 'rank-math-options-instant-indexing' );
			$key = is_array( $o ) && ! empty( $o['indexnow_api_key'] ) ? $o['indexnow_api_key'] : '';
			$out = array( 'rm_key_set' => $key !== '', 'opt_keys' => is_array( $o ) ? array_keys( $o ) : null );
			if ( $key === '' ) { return $out; }
			$loc = home_url( '/' . $key . '.txt' );
			$k = wp_remote_get( $loc, array( 'timeout' => 20 ) );
			$out['rm_keyfile_code'] = wp_remote_retrieve_response_code( $k );
			$out['rm_keyfile_match'] = trim( wp_remote_retrieve_body( $k ) ) === $key;
			$urls = (array) $req->get_param( 'urls' );
			$body = wp_json_encode( array( 'host' => wp_parse_url( home_url(), PHP_URL_HOST ), 'key' => $key, 'keyLocation' => $loc, 'urlList' => array_values( $urls ) ) );
			foreach ( array( 'https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow' ) as $ep ) {
				$r = wp_remote_post( $ep, array( 'timeout' => 30, 'headers' => array( 'Content-Type' => 'application/json; charset=utf-8' ), 'body' => $body ) );
				$out['ping'][ $ep ] = is_wp_error( $r ) ? $r->get_error_message() : wp_remote_retrieve_response_code( $r ) . ' ' . substr( str_replace( $key, '***', wp_remote_retrieve_body( $r ) ), 0, 160 );
			}
			return $out;
		},
	) );
	register_rest_route( 'pbd-ops/v1', '/sitemap', array(
		'methods' => array( 'GET', 'POST' ),
		'permission_callback' => function () { return current_user_can( 'manage_options' ); },
		'callback' => function ( $req ) {
			global $wpdb;
			$out = array();
			$like = '%rank_math%sitemap%';
			$out['options_before'] = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s LIMIT 50", $like ) );
			$sm = get_option( 'rank-math-options-sitemap' );
			$out['items_per_page'] = is_array( $sm ) && isset( $sm['items_per_page'] ) ? $sm['items_per_page'] : null;
			$out['modules'] = get_option( 'rank_math_modules' );
			$out['cache_class'] = class_exists( '\RankMath\Sitemap\Cache' );
			$up = wp_upload_dir();
			$dirs = array( WP_CONTENT_DIR . '/uploads/rank-math', $up['basedir'] . '/rank-math', WP_CONTENT_DIR . '/cache/rank-math' );
			$files = array();
			foreach ( array_unique( $dirs ) as $d ) { if ( is_dir( $d ) ) { foreach ( (array) glob( $d . '/*' ) as $f ) { $files[] = str_replace( WP_CONTENT_DIR, '', $f ) . ' ' . gmdate( 'c', filemtime( $f ) ); } } }
			$out['cache_files'] = array_slice( $files, 0, 40 );
			$out['cache_files_n'] = count( $files );
			$out['filters'] = array();
			foreach ( array( 'rank_math/sitemap/enable_caching', 'rank_math/sitemap/index', 'rank_math/sitemap/entries_per_page', 'rank_math/sitemap/exclude_post_type' ) as $h ) { $out['filters'][ $h ] = has_filter( $h ) ? 1 : 0; }
			if ( $req->get_method() === 'POST' && $req->get_param( 'flush' ) ) {
				if ( class_exists( '\RankMath\Sitemap\Cache' ) && method_exists( '\RankMath\Sitemap\Cache', 'invalidate_storage' ) ) { \RankMath\Sitemap\Cache::invalidate_storage(); $out['invalidate_storage'] = 1; }
				$n = $wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s", '_transient_%rank_math%sitemap%', '_transient_timeout_%rank_math%sitemap%' ) );
				$out['transients_deleted'] = $n;
				$del = 0;
				foreach ( array_unique( $dirs ) as $d ) { if ( is_dir( $d ) ) { foreach ( (array) glob( $d . '/*sitemap*' ) as $f ) { if ( is_file( $f ) && @unlink( $f ) ) { $del++; } } } }
				$out['files_deleted'] = $del;
				wp_cache_flush();
				foreach ( array( 'sitemap_index.xml', 'post-sitemap1.xml', 'post-sitemap2.xml', 'post-sitemap3.xml', 'category-sitemap.xml' ) as $s ) { do_action( 'litespeed_purge_url', home_url( '/' . $s ) ); }
				$out['flushed'] = 1;
			}
			return $out;
		},
	) );
} );
"""

def wp(m, p, **kw):
    for i in range(3):
        r = t.wp(m, p, **kw)
        if r.status_code < 500: return r
        time.sleep(3 * (i + 1))
    return r

def snippets():
    r = wp("GET", API)
    print("snippets", r.status_code)
    return r.json() if r.ok else []

def inspect():
    for s in snippets():
        code = s.get("code") or ""
        hits = [l.strip()[:140] for l in code.splitlines() if re.search(r"sitemap|transient|indexnow|\.txt", l, re.I)]
        print(f"- #{s.get('id')} active={s.get('active')} {s.get('name')} hits={len(hits)}")
        for h in hits[:12]: print("    ", h)
    r = wp("GET", "pbd-ops/v1/sitemap")
    print("ops GET", r.status_code, r.text[:1500])

def live_sitemap():
    ix = requests.get(f"{SITE}/sitemap_index.xml?nc={time.time()}", headers=UA, timeout=60).text
    locs = re.findall(r"<loc>(.*?)</loc>", ix)
    print("index:", [l.rsplit('/', 1)[-1] for l in locs])
    print("index lastmods:", re.findall(r"<lastmod>(.*?)</lastmod>", ix)[:3])
    found = set()
    for l in locs:
        if "post-sitemap" in l:
            x = requests.get(l + f"?nc={time.time()}", headers=UA, timeout=60).text
            f = set(re.findall(r"https://probashiinfo\.com/[a-z-]+-minimum-wage-2026/", x))
            print(" ", l.rsplit('/', 1)[-1], "locs", x.count("<loc>"), "mw", len(f))
            found |= f
    print("minimum-wage URLs in sitemaps:", len(found), "/ 7")
    return len(found)

def apply():
    code = PHP.replace("__KEY__", INDEXNOW_KEY)
    ex = next((s for s in snippets() if s.get("name") == SN_NAME), None)
    r = wp("POST", f"{API}/{ex['id']}" if ex else API, json={"name": SN_NAME, "code": code, "scope": "global", "active": True})
    print("snippet write", r.status_code, "" if r.ok else r.text[:300])
    if not r.ok: sys.exit(1)
    sid = r.json().get("id")
    a = wp("POST", f"{API}/{sid}/activate"); print("snippet activate", sid, a.status_code)
    r = wp("POST", "pbd-ops/v1/sitemap", params={"flush": 1})
    print("flush", r.status_code, r.text[:1500])
    time.sleep(5)
    n = live_sitemap()
    k = requests.get(f"{SITE}/{INDEXNOW_KEY}.txt?nc={time.time()}", headers=UA, timeout=60)
    ok = k.status_code == 200 and k.text.strip() == INDEXNOW_KEY
    print("key file", k.status_code, "matches", ok, "ctype", k.headers.get("content-type"))
    if ok:
        indexnow.submit_urls("probashiinfo.com", URLS, log=print)
    return n


def ping():
    ku = f"{SITE}/{INDEXNOW_KEY}.txt"
    for name, h in [("bingbot", {"User-Agent": "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"}), ("none", {"User-Agent": ""}), ("python", {})]:
        try:
            k = requests.get(ku, headers=h, timeout=30, allow_redirects=False)
            print("keyfile", name, k.status_code, "match", k.text.strip() == INDEXNOW_KEY, k.headers.get("server"), k.headers.get("cf-mitigated"))
        except Exception as e: print("keyfile", name, "ERR", e)
    body = {"host": "probashiinfo.com", "key": INDEXNOW_KEY, "keyLocation": ku, "urlList": URLS}
    for ep in ["https://api.indexnow.org/indexnow", "https://www.bing.com/indexnow", "https://yandex.com/indexnow"]:
        try:
            r = requests.post(ep, json=body, timeout=30, headers={"Content-Type": "application/json; charset=utf-8"})
            print("ping", ep, r.status_code, r.text[:160].replace(INDEXNOW_KEY, "***"))
        except Exception as e: print("ping", ep, "ERR", e)

def rmping():
    code = PHP.replace("__KEY__", INDEXNOW_KEY)
    ex = next((s for s in snippets() if s.get("name") == SN_NAME), None)
    if not ex:
        g = wp("GET", f"{API}/44"); ex = g.json() if g.ok and g.json().get("name") == SN_NAME else None
    if not ex: print("snippet not found"); sys.exit(1)
    r = wp("POST", f"{API}/{ex['id']}", json={"name": SN_NAME, "code": code, "scope": "global", "active": True})
    print("snippet update", r.status_code, "" if r.ok else r.text[:300])
    r = wp("POST", "pbd-ops/v1/indexnow", json={"urls": URLS})
    print("rm indexnow", r.status_code, r.text[:900])

def bing():
    import os
    key = os.environ.get("BING_WEBMASTER_API_KEY", "")
    if not key: print("bing: no key in env"); return
    api = "https://ssl.bing.com/webmaster/api.svc/json/"
    site = "https://probashiinfo.com/"
    def feeds(tag):
        r = requests.get(api + "GetFeeds", params={"siteUrl": site, "apikey": key}, timeout=60)
        print("bing GetFeeds", tag, r.status_code)
        if r.ok:
            for f in (r.json().get("d") or []):
                print("  ", f.get("Url"), "status", f.get("Status"), "urls", f.get("UrlCount"), "lastCrawled", f.get("LastCrawled"), "submitted", f.get("Submitted"))
        else: print("  ", r.text[:200].replace(key, "***"))
    feeds("before")
    r = requests.post(api + "SubmitFeed", params={"apikey": key}, json={"siteUrl": site, "feedUrl": site + "sitemap_index.xml"}, timeout=60)
    print("bing SubmitFeed sitemap_index", r.status_code, r.text[:200].replace(key, "***"))
    feeds("after")
if "--bing" in sys.argv: bing()
elif "--rmping" in sys.argv: rmping()
elif "--ping" in sys.argv: ping()
elif "--apply" in sys.argv: apply()
else: inspect(); live_sitemap()
