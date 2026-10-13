"""Install the "AutoBlog smart 404" Code Snippet on probashiinfo.com.

A request that would 404 is matched against published post slugs: when one post shares at
least 60% of the requested URL's meaningful words (and at least two of them), the visitor
gets a 301 to it. Otherwise WordPress shows its normal 404, so a weak guess never
replaces an honest "not found". Search Console lists 56 such URLs (old or mistyped links).

    python wp_smart404.py            # print the snippet
    python wp_smart404.py --apply    # create/update it on the site
"""
import base64
import os
import sys

import requests

SNIPPET_NAME = "AutoBlog smart 404"
CODE = r"""/* Old or mistyped URLs → 301 to the clearly matching post (managed by AutoBlog generator/wp_smart404.py). */
add_action( 'template_redirect', function () {
	if ( ! is_404() ) { return; }
	$path = trim( urldecode( (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH ) ), '/' );
	if ( $path === '' || strlen( $path ) > 300 ) { return; }
	$stop = array( 'bn', 'en', 'the', 'and', 'of', 'to', 'in', 'for', 'a', 'o', 'ও', '2024', '2025', '2026', '২০২৪', '২০২৫', '২০২৬', 'guide', 'gaaidd', 'smpuurnn' );
	$want = array_values( array_diff( array_filter( preg_split( '/[-_\/\s]+/u', mb_strtolower( $path ) ) ), $stop ) );
	if ( count( $want ) < 2 ) { return; }
	$key = 'ab404_' . md5( $path );
	$to = get_transient( $key );
	if ( $to === false ) {
		$to = '';
		$best = 0;
		$q = new WP_Query( array( 'post_type' => 'post', 'post_status' => 'publish', 's' => implode( ' ', array_slice( $want, 0, 6 ) ), 'posts_per_page' => 20, 'fields' => 'ids', 'no_found_rows' => true ) );
		$ids = $q->posts;
		if ( ! $ids ) { // WP search is AND-based; fall back to the two most distinctive words
			$q = new WP_Query( array( 'post_type' => 'post', 'post_status' => 'publish', 's' => implode( ' ', array_slice( $want, 0, 2 ) ), 'posts_per_page' => 20, 'fields' => 'ids', 'no_found_rows' => true ) );
			$ids = $q->posts;
		}
		foreach ( $ids as $id ) {
			$have = preg_split( '/[-_\s]+/u', mb_strtolower( urldecode( get_post_field( 'post_name', $id ) ) ) );
			$hit = count( array_intersect( $want, $have ) );
			$score = $hit / count( $want );
			if ( $hit >= 2 && $score >= 0.6 && $score > $best ) { $best = $score; $to = get_permalink( $id ); }
		}
		set_transient( $key, $to, DAY_IN_SECONDS );
	}
	if ( $to ) { wp_redirect( $to, 301 ); exit; }
}, 5 );
"""


def main():
    if "--apply" not in sys.argv:
        print(CODE)
        return
    base = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
    auth = base64.b64encode(f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()).decode()
    h = {"Authorization": f"Basic {auth}", "User-Agent": "AutoBlog/1.0"}
    api = f"{base}/wp-json/code-snippets/v1/snippets"
    existing = next((s for s in requests.get(api, headers=h, timeout=60).json() if s.get("name") == SNIPPET_NAME), None)
    body = {"name": SNIPPET_NAME, "code": CODE, "scope": "front-end", "active": True}
    r = requests.post(f"{api}/{existing['id']}" if existing else api, headers=h, json=body, timeout=60)
    print("snippet", r.status_code, r.text[:200] if not r.ok else r.json().get("id"))
    r.raise_for_status()
    if not existing:
        requests.post(f"{api}/{r.json()['id']}/activate", headers=h, timeout=60)


if __name__ == "__main__":
    main()
