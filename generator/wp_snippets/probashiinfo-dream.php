<?php
/* Dream International (dreamintcs.com) ad on probashiinfo.com (Code Snippets, front-end).
   Card below every post; on Europe / work-permit posts also a card after the first paragraph.
   Facts from dreamintcs.com only: Sylhet + Doha offices and six European routes. */
function di_url( $medium ) {
	return esc_url( 'https://dreamintcs.com/?utm_source=probashiinfo&utm_medium=' . $medium . '&utm_campaign=dream-international' );
}
function di_wa() {
	return esc_url( 'https://wa.me/97471382220?text=' . rawurlencode( 'আসসালামু আলাইকুম, প্রবাসী ইনফো থেকে এসেছি। ইউরোপের ওয়ার্ক পারমিট নিয়ে জানতে চাই।' ) );
}

add_action( 'wp_head', function () { if ( function_exists( 'pa_app' ) && pa_app() ) return; ?>
<style id="di-ad-css">
.di-card{margin:28px 0;border-radius:18px;overflow:hidden;background:radial-gradient(120% 140% at 100% 0,#3a0d10 0,#16090a 60%,#0d0708 100%);color:#f6eeee;font-family:"Hind Siliguri","Anek Bangla",system-ui,sans-serif}
.di-card .di-w{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center;padding:20px 22px}
.di-card .di-l{background:#fff;border-radius:12px;padding:10px 12px;line-height:0}
.di-card .di-l img{width:150px;height:auto;margin:0!important}
.di-card .di-k{display:block;font-size:12.5px;color:#f3a9ab;font-weight:600;margin-bottom:4px}
.di-card b.di-t{display:block;color:#fff;font-size:19px;line-height:1.35}
.di-card .di-p{display:block;font-size:14.5px;line-height:1.6;opacity:.85;margin-top:6px}
.di-card .di-c{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.di-card .di-c span{font-size:12.5px;padding:3px 10px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}
.di-card .di-a{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.di-card .di-a a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:10px;font-weight:700;font-size:14.5px;text-decoration:none!important}
.di-card .di-a a.p{background:#e31e24;color:#fff!important}
.di-card .di-a a.w{background:rgba(255,255,255,.08);color:#fff!important;border:1px solid rgba(255,255,255,.22)}
.di-card .di-a em{font-style:normal;font-size:13px;opacity:.8;margin-left:auto;border:1px dashed rgba(243,169,171,.55);padding:6px 10px;border-radius:10px}
@media(max-width:600px){.di-card .di-w{grid-template-columns:1fr}.di-card .di-a a{flex:1}.di-card .di-a em{margin-left:0;width:100%;text-align:center}}
</style>
<?php } );

function di_card( $medium, $title ) {
	$countries = array( 'সার্বিয়া', 'বসনিয়া', 'গ্রিস', 'পর্তুগাল', 'মলদোভা', 'বুলগেরিয়া' );
	$chips = '';
	foreach ( $countries as $c ) $chips .= '<span>' . $c . '</span>';
	return '<div class="di-card"><div class="di-w">'
		. '<a class="di-l" href="' . di_url( $medium ) . '" target="_blank" rel="noopener sponsored"><img src="https://www.probashibondu.online/dream-logo.png" alt="Dream International" width="150" height="39" loading="lazy"></a>'
		. '<div><span class="di-k">ড্রিম ইন্টারন্যাশনাল · ওয়ার্ক পারমিট ও ভিসা সহায়তা</span><b class="di-t">' . $title . '</b>'
		. '<span class="di-p">ইউরোপের ওয়ার্ক পারমিট, ফাইল হয় সিলেট (বাংলাদেশ) আর দোহা (কাতার) অফিস থেকে। পুরো প্রক্রিয়া বৈধ ও স্বচ্ছ।</span>'
		. '<span class="di-c">' . $chips . '</span></div>'
		. '<div class="di-a"><a class="p" href="' . di_url( $medium ) . '" target="_blank" rel="noopener sponsored">বিস্তারিত দেখুন →</a><a class="w" href="' . di_wa() . '" target="_blank" rel="noopener sponsored">WhatsApp: +974 7138 2220</a></div>'
		. '</div></div>';
}

add_filter( 'the_content', function ( $content ) {
	if ( function_exists( 'pa_app' ) && pa_app() ) return $content;
	if ( ! is_singular( 'post' ) || ! in_the_loop() || ! is_main_query() ) return $content;
	// Europe / work-permit posts: card after the first paragraph, where intent is highest.
	$hay = get_the_title() . ' ' . wp_strip_all_tags( substr( $content, 0, 3000 ) );
	if ( preg_match( '/সার্বিয়া|বসনিয়া|গ্রিস|পর্তুগাল|মলদোভা|বুলগেরিয়া|ইউরোপ|ওয়ার্ক পারমিট|work permit/iu', $hay ) ) {
		$pos = strpos( $content, '</p>' );
		if ( false !== $pos ) {
			$content = substr( $content, 0, $pos + 4 ) . di_card( 'post-intext', 'ইউরোপে বৈধভাবে কাজ করতে চান?' ) . substr( $content, $pos + 4 );
		}
	}
	return $content . di_card( 'post-bottom', 'ইউরোপে ওয়ার্ক পারমিট, বাংলাদেশ ও কাতার থেকে' );
}, 15 );
