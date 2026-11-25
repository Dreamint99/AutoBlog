"""Weekly check of the MOFA mission list against the /embassy/ pages in wp_snippets/pbd-data-pages.php.

The embassy data lives in that snippet as a gzcompressed, base64 JSON blob (between <<<'B64' and B64).
Every record is keyed by its URL slug:
  kind=mission  -> a Bangladesh embassy / high commission / consulate page
  kind=country  -> a country with no resident Bangladesh mission (shows the accredited / nearest mission)

When a MOFA region page lists a new mission subdomain (https://<sub>.mofa.gov.bd) whose country has
only a kind=country record, that record is switched to kind=mission under the SAME slug. Only facts that
can be read from the mission's official site are filled in (mofa.gov.bd e-mail); everything else is
marked as missing with the verified fallbacks (website, Probashi Bondhu 16135, MOFA welfare desk).
New missions in a country that already has a page are only reported (they need a new slug and a review).

Usage (from generator/):
  python embassy_refresh.py            # check + rewrite the snippet when something changed
  python embassy_refresh.py --dry-run  # only report
Writes wp_snippets/embassy-changed.txt with the URLs to resubmit (empty when nothing changed).
Exit code 0 always unless MOFA could not be read at all.
"""
import base64, json, re, sys, zlib, textwrap, html, datetime, pathlib
import requests

SNIP = pathlib.Path(__file__).parent / 'wp_snippets' / 'pbd-data-pages.php'
OUT = pathlib.Path(__file__).parent / 'wp_snippets' / 'embassy-changed.txt'
SITE = 'https://probashiinfo.com'
REGIONS = {'africa': '694032d335ce18e1c0563050', 'americas': '694032aa35ce18e1c05602c1', 'eastasia': '694032b535ce18e1c0560f97',
           'eeurope': '694032da35ce18e1c0563708', 'southasia': '694032af35ce18e1c056083b', 'seasia': '6940329835ce18e1c055f0f8',
           'westasia': '694032bc35ce18e1c05617e8', 'weurope': '6940329a35ce18e1c055f343'}
MOFA_PAGE = 'https://mofa.gov.bd/pages/static-pages/'
IGNORE = {'nypm', 'oicpm', 'www', 'mofa'}
UA = {'User-Agent': 'probashiinfo-embassy-refresh/1.0 (+https://probashiinfo.com/embassy/)'}
TYP = [('deputy high commission', 'deputy_hc', 'ডেপুটি হাইকমিশন', 'Deputy High Commission'),
       ('assistant high commission', 'assistant_hc', 'সহকারী হাইকমিশন', 'Assistant High Commission'),
       ('high commission', 'high_commission', 'হাইকমিশন', 'High Commission'),
       ('consulate general', 'consulate', 'কনস্যুলেট জেনারেল', 'Consulate General'),
       ('consulate', 'consulate_only', 'কনস্যুলেট', 'Consulate'),
       ('embassy', 'embassy', 'দূতাবাস', 'Embassy')]
PB = 'প্রবাসবন্ধু কল সেন্টার: বাংলাদেশ থেকে ১৬১৩৫, বিদেশ থেকে +৮৮০ ৯৬১০ ১০২ ০৩০ (২৪ ঘণ্টা)'
MOFA_ALT = 'পররাষ্ট্র মন্ত্রণালয়, ঢাকা (প্রবাসী কল্যাণ শাখা): +880 2 2233 82862, dirwelfare@mofa.gov.bd'
BLOB = re.compile(r"(<<<'B64'\r?\n)(.*?)(\r?\nB64)", re.S)


def load(text):
    m = BLOB.search(text)
    if not m:
        raise SystemExit('embassy data block not found in snippet')
    return json.loads(zlib.decompress(base64.b64decode(re.sub(r'\s+', '', m.group(2)))).decode('utf-8')), m


def dump(text, m, data):
    js = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    nl = '\r\n' if '\r\n' in m.group(1) else '\n'
    b64 = nl.join(textwrap.wrap(base64.b64encode(zlib.compress(js, 9)).decode(), 120))
    return text[:m.start(2)] + b64 + text[m.end(2):]


def get(url):
    try:
        r = requests.get(url, headers=UA, timeout=40, verify=False)
        return r.text if r.status_code == 200 else ''
    except requests.RequestException:
        return ''


def plain(t):
    t = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', t, flags=re.S)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t))).strip()


def mofa_subs():
    subs, ok = {}, 0
    for reg, pid in REGIONS.items():
        t = get(MOFA_PAGE + pid)
        if not t:
            print('WARN: could not read MOFA region page', reg)
            continue
        ok += 1
        for s in re.findall(r'https?://([a-z0-9]+)\.mofa\.gov\.bd', t):
            if s not in IGNORE:
                subs.setdefault(s, reg)
    if ok < len(REGIONS) // 2:
        raise SystemExit('MOFA region pages unreadable; nothing changed')
    return subs


def switch(rec, sub, home):
    """Turn a kind=country record into a minimal, honest kind=mission record (same slug)."""
    title = re.search(r'<title>(.*?)</title>', home, re.S)
    title = plain(title.group(1)) if title else ''
    low = title.lower()
    typ = next((t for t in TYP if t[0] in low), TYP[-1])
    city = ''
    m = re.search(r'(?:Embassy|Commission|Consulate(?: General)?)\s*,\s*([^,|]+)', title)
    if m:
        city = m.group(1).strip()
    txt = plain(home)
    emails = sorted(set(e for e in re.findall(r'[\w.\-]+@mofa\.gov\.bd', txt)))
    web = f'https://{sub}.mofa.gov.bd/'
    today = datetime.date.today().isoformat()
    facts = []
    if emails:
        facts.append({'k': 'email', 'bn': 'ইমেইল', 'v': ', '.join(emails[:3]), 'src': web, 'srcName': f"{typ[2]}ের ওয়েবসাইট – হোমপেজ (স্বয়ংক্রিয় যাচাই {today})"})
    nameBn = f"{rec['countryLoc']} বাংলাদেশ {typ[2]}"
    out = {
        'slug': rec['slug'], 'kind': 'mission', 'auto': today, 'sub': sub, 'cc': rec['cc'], 'typ': typ[1], 'typBn': typ[2], 'typEn': typ[3],
        'countryEn': rec['countryEn'], 'countryBn': rec['countryBn'], 'countryLoc': rec['countryLoc'],
        'cityEn': city or rec.get('capitalEn', ''), 'cityBn': city or rec.get('capitalEn', ''),
        'cityGen': rec['countryGen'], 'cityLoc': rec['countryLoc'], 'utc': rec['utc'], 'dst': rec.get('dst', False),
        'nameEn': title.split('|')[-1].strip() or f"{typ[3]} of Bangladesh, {rec['countryEn']}", 'nameBn': nameBn, 'website': web,
        'facts': facts, 'services': [],
        'missing': ['ঠিকানা — নতুন মিশন; সরকারি ওয়েবসাইট থেকে এখনো যাচাই করা হয়নি।', 'ফোন নম্বর — নতুন মিশন; সরকারি ওয়েবসাইট থেকে এখনো যাচাই করা হয়নি।', 'অফিস সময় — নতুন মিশন; সরকারি ওয়েবসাইটে দেখে নিন।'],
        'alts': [f'মিশনের সরকারি ওয়েবসাইট: {web}', PB, MOFA_ALT], 'facebook': '', 'covers': [], 'siblings': [],
        'related': rec.get('related', []), 'region': rec.get('region', 'weurope'), 'dhakaKm': 0,
        'faq': [
            [f"{rec['countryLoc']} কি বাংলাদেশ দূতাবাস আছে?", f"হ্যাঁ। পররাষ্ট্র মন্ত্রণালয়ের মিশন তালিকায় এখন {nameBn} আছে ({web}), যাচাই {today}।"],
            [f"{nameBn}ের ঠিকানা ও ফোন কী?", f"নতুন মিশনের ঠিকানা ও ফোন এখনো সরকারি সূত্রে যাচাই হয়নি। ওয়েবসাইট {web} দেখুন, অথবা {PB}।"],
            [f"Is there a Bangladesh Embassy in {rec['countryEn']}?", f"Yes. The Bangladesh foreign ministry now lists a {typ[3]} for {rec['countryEn']} ({web}), checked {today}."],
        ],
    }
    if emails:
        out['faq'][1][1] = f"সরকারি ওয়েবসাইটে ইমেইল: {', '.join(emails[:3])}। ঠিকানা ও ফোন এখনো যাচাই হয়নি — ওয়েবসাইট {web} দেখুন।"
    return out


def main():
    dry = '--dry-run' in sys.argv
    requests.packages.urllib3.disable_warnings()
    text = SNIP.read_text(encoding='utf-8')
    data, m = load(text)
    known = {r['sub'] for r in data.values() if r.get('kind') == 'mission' and r.get('sub')}
    by_country = {}
    for slug, r in data.items():
        by_country.setdefault(r['countryEn'].lower(), []).append(slug)
    subs = mofa_subs()
    new = sorted(s for s in subs if s not in known)
    changed, report = [], []
    for sub in new:
        home = get(f'https://{sub}.mofa.gov.bd/')
        title = re.search(r'<title>(.*?)</title>', home or '', re.S)
        title = plain(title.group(1)) if title else ''
        hit = None
        for slug, r in data.items():
            if r.get('kind') == 'country' and re.search(r'\b' + re.escape(r['countryEn'].lower()) + r'\b', title.lower()):
                hit = slug
                break
        if hit:
            report.append(f'SWITCH {hit}: new MOFA mission {sub} ({title})')
            data[hit] = switch(data[hit], sub, home)
            changed.append(f'{SITE}/embassy/{hit}/')
        else:
            report.append(f'REVIEW {sub}: listed by MOFA but no country page to switch ({title or "homepage unreadable"})')
    gone = sorted(s for s in known if s not in subs)
    for s in gone:
        report.append(f'NOTE {s}: page exists but MOFA region pages no longer list it (not changed)')
    print('\n'.join(report) or 'embassy list unchanged')
    if changed and not dry:
        SNIP.write_text(dump(text, m, data), encoding='utf-8')
        changed.append(f'{SITE}/embassy/')
    if not dry:
        OUT.write_text('\n'.join(changed) + ('\n' if changed else ''), encoding='utf-8')


if __name__ == '__main__':
    main()
