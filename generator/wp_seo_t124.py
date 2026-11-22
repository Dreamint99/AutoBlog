"""Apply FAQ blocks, FAQPage JSON-LD and internal links on high-opportunity
probashiinfo.com posts. Idempotent: marked with <!-- pbd-seo-t124 -->.

    python wp_seo_t124.py          # dry run
    python wp_seo_t124.py --apply  # write to WordPress
"""
import base64, html, json, os, re, sys, urllib.parse
import requests

APPLY = "--apply" in sys.argv
BASE = os.environ["PROBASHIINFO_WP_URL"].rstrip("/")
AUTH = base64.b64encode(
    f"{os.environ['PROBASHIINFO_WP_USER']}:{os.environ['PROBASHIINFO_WP_APP_PASSWORD']}".encode()
).decode()
H = {"Authorization": f"Basic {AUTH}", "User-Agent": "AutoBlog/1.0"}
MARKER = "<!-- pbd-seo-t124 -->"

# Questions follow real Search Console queries. Answers use only facts already
# published on these pages (or the linked companion page).
PAGES = [
    {
        "url": "https://probashiinfo.com/ফিনল্যান্ড-যেতে-কত-টাকা-ল/",
        "faqs": [
            ("ফিনল্যান্ড যেতে কত টাকা লাগে?",
             "টুরিস্ট ভিসায় ঢাকা থেকে হেলসিংকি রিটার্ন ফ্লাইট সাধারণত ১,৩০,০০০–১,৬০,০০০ টাকা, আর ব্যাংক ব্যালেন্স দেখাতে ৩–৫ লাখ টাকা লাগে। একমুখী টিকিট প্রায় ৭০,০০০–১,১০,০০০ টাকা।"),
            ("ফিনল্যান্ড স্টুডেন্ট ভিসায় কত টাকা লাগে?",
             "স্টুডেন্ট ভিসায় এক বছরের খরচ হিসেবে প্রায় ৭,০০০ ইউরো, যা প্রায় ৯ লাখ টাকা, ব্যাংক ব্যালেন্স হিসেবে দেখাতে হয়।"),
            ("ফিনল্যান্ড ওয়ার্ক ভিসায় কি কম ব্যালেন্সে চলে?",
             "অফার লেটার ও কোম্পানির স্পনসর থাকলে ওয়ার্ক ভিসায় সাধারণত কম ব্যালেন্সেও আবেদন করা যায়। ভিসার ধরন অনুযায়ী খরচের তালিকা এই পেজে আছে।"),
        ],
        "links": [
            ("ইউরোপ ওয়ার্ক পারমিট ভিসা ২০২৬", "https://probashiinfo.com/iureaap-oyaark-bhisaa-2026-baanlaadeshiider-jny-5tti-shj-desher-gaaidd/"),
            ("ইউরোপের সেনজেন ভুক্ত দেশের তালিকা ২০২৬", "https://probashiinfo.com/list-of-schengen-countries-in-europe-2026/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/gris-oyaark-bhisaa-2026-khrc-betn-o-shj-gaaidd/",
        "faqs": [
            ("গ্রিস যেতে কত টাকা লাগে ২০২৬?",
             "গ্রিস ওয়ার্ক পারমিট ভিসায় ভিসা ফি প্রায় €৯০, ন্যূনতম বেতন মাসে €৮৮০, আর আবেদনে সাধারণত ২–৪ মাস লাগে। স্পনসর ও কাগজপত্রের তালিকা এই গাইডে আছে।"),
            ("গ্রিসে বাংলাদেশি কর্মীর ন্যূনতম বেতন কত?",
             "এই গাইড অনুযায়ী ন্যূনতম বেতন মাসে €৮৮০। কাজ ও চুক্তি অনুযায়ী প্রকৃত বেতন আলাদা হতে পারে।"),
        ],
        "links": [
            ("ইউরোপ ওয়ার্ক পারমিট ভিসা ২০২৬", "https://probashiinfo.com/iureaap-oyaark-bhisaa-2026-baanlaadeshiider-jny-5tti-shj-desher-gaaidd/"),
            ("ইউরোপের সেনজেন ভুক্ত দেশের তালিকা ২০২৬", "https://probashiinfo.com/list-of-schengen-countries-in-europe-2026/"),
            ("সাইপ্রাস ভিসা", "https://probashiinfo.com/সাইপ্রাস-ভিসা/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/maalyeshiyaa-oyaark-bhisaa-2026-khrc-betn-o-aabedn/",
        "faqs": [
            ("মালয়েশিয়া যেতে কত টাকা লাগে ২০২৬?",
             "মালয়েশিয়া কাজের ভিসায় যেতে ২০২৬ সালে মোট খরচ সাধারণত ১.৫–২.৫ লাখ টাকা, ন্যূনতম মজুরি RM ১,৭০০ (প্রায় ৪৫,০০০ টাকা), প্রসেসিং ৪–৮ সপ্তাহ।"),
            ("মালয়েশিয়া যেতে কত টাকা লাগে কাজের ভিসা?",
             "কাজের ভিসায় মোট খরচ ১.৫–২.৫ লাখ টাকার মধ্যে থাকে। দালাল এড়ানো ও ধাপে ধাপে আবেদনের হিসাব এই পেজে আছে।"),
        ],
        "links": [
            ("মালয়েশিয়া কাজের ভিসার খরচ ২০২৬", "https://probashiinfo.com/malaysia-kazer-visa-khoroch-2026/"),
            ("মালয়েশিয়া থেকে ইউরোপ যাওয়ার উপায়", "https://probashiinfo.com/malaysia-to-europe/"),
            ("সিঙ্গাপুর ওয়ার্ক ভিসা ২০২৬", "https://probashiinfo.com/singgaapur-oyaark-bhisaa-2026-ntun-niym-betn-o-aabedn/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/malaysia-kazer-visa-khoroch-2026/",
        "faqs": [
            ("মালয়েশিয়া কাজের ভিসায় যেতে কত টাকা লাগে ২০২৬?",
             "এই পেজে কাজের ভিসার খরচের হিসাব আছে। পূর্ণ গাইডে ২০২৬ সালের মোট খরচ, বেতন ও আবেদন প্রক্রিয়া একসাথে পাবেন।"),
        ],
        "links": [
            ("মালয়েশিয়া যেতে কত টাকা লাগে ২০২৬ — পূর্ণ গাইড", "https://probashiinfo.com/maalyeshiyaa-oyaark-bhisaa-2026-khrc-betn-o-aabedn/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/list-of-schengen-countries-in-europe-2026/",
        "faqs": [
            ("ইউরোপের সেনজেন ভুক্ত দেশের তালিকা ২০২৬-এ কয়টি দেশ?",
             "সেনজেন অঞ্চলে এখন ২৯টি দেশ। ১ জানুয়ারি ২০২৫ থেকে রোমানিয়া ও বুলগেরিয়া স্থলসীমান্তসহ পূর্ণ সদস্য।"),
            ("সার্বিয়া কি সেনজেন ভুক্ত দেশ?",
             "সার্বিয়া সেনজেন ভুক্ত দেশ নয়। সেনজেনভুক্ত দেশের পূর্ণ তালিকা এই পেজে আছে।"),
        ],
        "links": [
            ("ইউরোপ ওয়ার্ক পারমিট ভিসা ২০২৬", "https://probashiinfo.com/iureaap-oyaark-bhisaa-2026-baanlaadeshiider-jny-5tti-shj-desher-gaaidd/"),
            ("সার্বিয়া থেকে কোন কোন দেশে যাওয়া যায়", "https://probashiinfo.com/সার্বিয়া-থেকে-কোন-কোন-দে/"),
            ("রোমানিয়া ওয়ার্ক ভিসা ২০২৬", "https://probashiinfo.com/reaamaaniyaa-oyaark-bhisaa-2026-betn-khrc-o-shj-gaaidd/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/reaamaaniyaa-oyaark-bhisaa-2026-betn-khrc-o-shj-gaaidd/",
        "faqs": [
            ("রোমানিয়া যেতে কত টাকা লাগে?",
             "রোমানিয়া ওয়ার্ক পারমিট ভিসায় যেতে মোট খরচ সাধারণত ৪–৭ লাখ টাকা, অফিসিয়াল ফি ২২০ ইউরো, প্রসেসিং ৩০–৬০ দিন। ন্যূনতম বেতন ৩,৭০০ লেই (প্রায় ৮৮,০০০ টাকা)।"),
            ("বাংলাদেশ থেকে রোমানিয়া যেতে কত টাকা লাগে?",
             "বাংলাদেশ থেকে ওয়ার্ক ভিসায় যেতে মোট খরচ ৪–৭ লাখ টাকার মধ্যে থাকে। ভিসার খরচের আলাদা হিসাবও দেখুন।"),
        ],
        "links": [
            ("রোমানিয়া যেতে কত টাকা লাগে — খরচের হিসাব", "https://probashiinfo.com/রোমানিয়া-যেতে-কত-টাকা-লা/"),
            ("ইউরোপের সেনজেন ভুক্ত দেশের তালিকা ২০২৬", "https://probashiinfo.com/list-of-schengen-countries-in-europe-2026/"),
            ("ইউরোপ ওয়ার্ক পারমিট ভিসা ২০২৬", "https://probashiinfo.com/iureaap-oyaark-bhisaa-2026-baanlaadeshiider-jny-5tti-shj-desher-gaaidd/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/রোমানিয়া-যেতে-কত-টাকা-লা/",
        "faqs": [
            ("রোমানিয়া যেতে কত টাকা লাগে ২০২৬?",
             "এই পেজে রোমানিয়া ভিসার খরচের হিসাব আছে। ওয়ার্ক পারমিটে যেতে মোট খরচ, বেতন ও আবেদন প্রক্রিয়ার পূর্ণ গাইড আলাদা পেজে দেখুন।"),
        ],
        "links": [
            ("রোমানিয়া ওয়ার্ক ভিসা ২০২৬: খরচ ৪–৭ লাখ, বেতন ও আবেদন", "https://probashiinfo.com/reaamaaniyaa-oyaark-bhisaa-2026-betn-khrc-o-shj-gaaidd/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/mauritius-work-permit-2026/",
        "faqs": [
            ("মরিশাস ওয়ার্ক পারমিট ভিসা বেতন কত?",
             "এই গাইড অনুযায়ী মরিশাসে গড় মাসিক বেতন US$2,200, যা প্রায় ২,০০,০০০ টাকা। আবেদন ফি US$150 (প্রায় ১৩,৫০০ টাকা)।"),
        ],
        "links": [
            ("মালদ্বীপ ওয়ার্ক পারমিট ভিসা", "https://probashiinfo.com/maaldbiip-oyaark-bhisaa-2026-betn-khrc-o-aabedner-shj-gaaidd/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/maaldbiip-oyaark-bhisaa-2026-betn-khrc-o-aabedner-shj-gaaidd/",
        "faqs": [
            ("মালদ্বীপ ওয়ার্ক পারমিট ভিসা কত টাকা লাগে?",
             "এই গাইডে মালদ্বীপ কাজের ভিসার খরচ, বেতন (রুফিয়া ও টাকায়), কোটা ও কাগজপত্রের তালিকা আছে।"),
        ],
        "links": [
            ("মরিশাস ওয়ার্ক পারমিট ভিসা ২০২৬", "https://probashiinfo.com/mauritius-work-permit-2026/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/iureaap-oyaark-bhisaa-2026-baanlaadeshiider-jny-5tti-shj-desher-gaaidd/",
        "faqs": [
            ("ইউরোপ ওয়ার্ক পারমিট ভিসা ২০২৬-এ কোন দেশ চালু?",
             "এই গাইডে বাংলাদেশিদের জন্য জার্মানি, পর্তুগাল, নেদারল্যান্ডস, সুইডেন ও আয়ারল্যান্ডসহ ইউরোপের ওয়ার্ক ভিসার খরচ, বেতন ও ভাষার শর্ত আছে।"),
        ],
        "links": [
            ("ইউরোপের সেনজেন ভুক্ত দেশের তালিকা ২০২৬", "https://probashiinfo.com/list-of-schengen-countries-in-europe-2026/"),
            ("গ্রিস ওয়ার্ক ভিসা ২০২৬", "https://probashiinfo.com/gris-oyaark-bhisaa-2026-khrc-betn-o-shj-gaaidd/"),
            ("রোমানিয়া ওয়ার্ক ভিসা ২০২৬", "https://probashiinfo.com/reaamaaniyaa-oyaark-bhisaa-2026-betn-khrc-o-shj-gaaidd/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/saudi-arabia-to-europe/",
        "faqs": [
            ("সৌদি আরব থেকে ইউরোপ যাওয়ার উপায় কী?",
             "সৌদি আরব থেকে ইউরোপে যেতে সাধারণত সেনজেন ভিসা বা কাজের ভিসা লাগে। খরচ ও কাগজপত্রের হিসাব এই গাইডে আছে।"),
            ("সৌদি আরব থেকে ইউরোপ যেতে সেনজেন ভিসা কি লাগে?",
             "ইউরোপের সেনজেনভুক্ত দেশে যেতে সাধারণত সেনজেন ভিসা লাগে। ২০২৬ সালে সেনজেনে ২৯টি দেশ আছে, তালিকা আলাদা পেজে দেখুন।"),
        ],
        "links": [
            ("ইউরোপের সেনজেন ভুক্ত দেশের তালিকা ২০২৬", "https://probashiinfo.com/list-of-schengen-countries-in-europe-2026/"),
            ("মালয়েশিয়া থেকে ইউরোপ যাওয়ার উপায়", "https://probashiinfo.com/malaysia-to-europe/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/serbia-to-italy/",
        "faqs": [
            ("সার্বিয়া থেকে ইতালি কত কিলোমিটার?",
             "সার্বিয়া থেকে ইতালি প্রায় ১,৪২৫ কিলোমিটার। যাওয়ার উপায় এই পেজে আছে।"),
        ],
        "links": [
            ("সার্বিয়া থেকে কোন কোন দেশে যাওয়া যায়", "https://probashiinfo.com/সার্বিয়া-থেকে-কোন-কোন-দে/"),
            ("বসনিয়া থেকে ইতালি", "https://probashiinfo.com/bosnia-to-italy/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/biemitti-rejisttreshn-2026-ntun-niym-o-smpuurnn-prkriyaa/",
        "faqs": [
            ("বিএমইটি রেজিস্ট্রেশন করতে কি কি লাগে?",
             "এই গাইডে বিএমইটি রেজিস্ট্রেশনের কাগজপত্র, ফি ৪২০ টাকা, মেয়াদ ও ধাপে ধাপে প্রক্রিয়া আছে।"),
            ("বিএমইটি রেজিস্ট্রেশন ফি কত?",
             "ফি ৪২০ টাকা। মেয়াদ ও নতুন নিয়ম এই পেজে দেখুন।"),
        ],
        "links": [
            ("বিএমইটি স্মার্ট কার্ড ২০২৬: নিয়ম, ফি ও আবেদন", "https://probashiinfo.com/biemitti-smaartt-kaardd-2026-niym-phi-o-aabedn-pddhti/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/biemitti-smaartt-kaardd-2026-niym-phi-o-aabedn-pddhti/",
        "faqs": [
            ("বিএমইটি স্মার্ট কার্ড করতে কি কি লাগে?",
             "এই গাইডে স্মার্ট কার্ডের নিয়ম, ফি ও আবেদন পদ্ধতি আছে। রেজিস্ট্রেশন আলাদা পেজে দেখুন।"),
        ],
        "links": [
            ("বিএমইটি রেজিস্ট্রেশন ২০২৬: কি কি লাগে, ফি ৪২০ টাকা", "https://probashiinfo.com/biemitti-rejisttreshn-2026-ntun-niym-o-smpuurnn-prkriyaa/"),
        ],
    },
    {
        "url": "https://probashiinfo.com/সাইপ্রাস-ভিসা/",
        "faqs": [],
        "links": [
            ("গ্রিস ওয়ার্ক ভিসা ২০২৬", "https://probashiinfo.com/gris-oyaark-bhisaa-2026-khrc-betn-o-shj-gaaidd/"),
            ("ইউরোপ ওয়ার্ক পারমিট ভিসা ২০২৬", "https://probashiinfo.com/iureaap-oyaark-bhisaa-2026-baanlaadeshiider-jny-5tti-shj-desher-gaaidd/"),
        ],
    },
]


def wp(method, path, **kw):
    r = requests.request(method, f"{BASE}/wp-json/{path}", headers=H, timeout=60, **kw)
    return r


def find_post(url):
    slug = urllib.parse.unquote(urllib.parse.urlparse(url).path.strip("/").split("/")[-1])
    r = wp("GET", "wp/v2/posts", params={"slug": slug, "context": "edit", "status": "publish"})
    rows = r.json() if r.ok else []
    return rows[0] if rows else None


def faq_html(faqs):
    if not faqs:
        return ""
    parts = [MARKER, '<section class="pbd-seo-faq" id="pbd-faq-t124">', "<h2>প্রবাসীদের সাধারণ প্রশ্ন</h2>"]
    entities = []
    for q, a in faqs:
        parts.append(f"<h3>{html.escape(q)}</h3>")
        parts.append(f"<p>{html.escape(a)}</p>")
        entities.append({
            "@type": "Question",
            "name": q,
            "acceptedAnswer": {"@type": "Answer", "text": a},
        })
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities}
    parts.append(
        f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>'
    )
    parts.append("</section>")
    return "\n".join(parts)


def links_html(links):
    if not links:
        return ""
    items = "\n".join(
        f'<li><a href="{html.escape(u, quote=True)}">{html.escape(t)}</a></li>' for t, u in links
    )
    return (
        f'{MARKER}\n<section class="pbd-seo-related" id="pbd-related-t124">\n'
        f"<h2>সম্পর্কিত গাইড</h2>\n<ul>\n{items}\n</ul>\n</section>"
    )


def main():
    changed = 0
    for page in PAGES:
        post = find_post(page["url"])
        if not post:
            print("  - no post", page["url"])
            continue
        raw = post["content"]["raw"]
        if MARKER in raw:
            print(f"  = already applied #{post['id']} {page['url']}")
            continue
        add = []
        # Skip JSON-LD if the post already has a FAQPage block, to avoid duplicate schema
        faqs = page["faqs"]
        block_faq = faq_html(faqs)
        if faqs and "FAQPage" in raw:
            # visible FAQ + links only (no extra JSON-LD)
            block_faq = re.sub(
                r'<script type="application/ld\+json">[\s\S]*?</script>\s*', "", block_faq
            )
        if faqs:
            add.append(block_faq)
        if page["links"]:
            add.append(links_html(page["links"]))
        if not add:
            print(f"  = nothing to add #{post['id']}")
            continue
        new = raw.rstrip() + "\n\n" + "\n\n".join(add) + "\n"
        print(f"  + #{post['id']} faqs={len(faqs)} links={len(page['links'])} {page['url']}")
        if not APPLY:
            continue
        r = wp("POST", f"wp/v2/posts/{post['id']}", json={"content": new})
        print(f"    write {r.status_code}")
        if r.ok:
            changed += 1
    print("done", "APPLY" if APPLY else "dry-run", "changed", changed)


if __name__ == "__main__":
    main()
