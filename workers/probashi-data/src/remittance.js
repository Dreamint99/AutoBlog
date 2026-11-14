// Remittance: mid-market BDT rates (fawazahmed0 currency-api, CC0 — same source as probashiinfo's daily
// "টাকার রেট" posts) for today, 7 and 30 days ago, plus the government's 2.5% remittance incentive.
export const CURRENCIES = [
  ["sar", "saudi-riyal", "সৌদি রিয়াল", "রিয়াল", "সৌদি আরব"],
  ["aed", "uae-dirham", "আমিরাত দিরহাম", "দিরহাম", "দুবাই / আমিরাত"],
  ["qar", "qatari-riyal", "কাতারি রিয়াল", "রিয়াল", "কাতার"],
  ["kwd", "kuwaiti-dinar", "কুয়েতি দিনার", "দিনার", "কুয়েত"],
  ["omr", "omani-rial", "ওমানি রিয়াল", "রিয়াল", "ওমান"],
  ["bhd", "bahraini-dinar", "বাহরাইনি দিনার", "দিনার", "বাহরাইন"],
  ["myr", "malaysian-ringgit", "মালয়েশিয়ান রিংগিত", "রিংগিত", "মালয়েশিয়া"],
  ["sgd", "singapore-dollar", "সিঙ্গাপুর ডলার", "ডলার", "সিঙ্গাপুর"],
  ["eur", "euro", "ইউরো", "ইউরো", "ইউরোপ"],
  ["gbp", "british-pound", "ব্রিটিশ পাউন্ড", "পাউন্ড", "যুক্তরাজ্য"],
  ["usd", "us-dollar", "মার্কিন ডলার", "ডলার", "আমেরিকা"],
  ["jod", "jordanian-dinar", "জর্ডানি দিনার", "দিনার", "জর্ডান"],
  ["mvr", "maldivian-rufiyaa", "মালদ্বীপ রুফিয়া", "রুফিয়া", "মালদ্বীপ"],
  ["krw", "korean-won", "দক্ষিণ কোরিয়ান উয়ন", "উয়ন", "দক্ষিণ কোরিয়া"],
  ["jpy", "japanese-yen", "জাপানি ইয়েন", "ইয়েন", "জাপান"],
  ["ron", "romanian-leu", "রোমানিয়ান লেউ", "লেউ", "রোমানিয়া"],
  ["rsd", "serbian-dinar", "সার্বিয়ান দিনার", "দিনার", "সার্বিয়া"],
  ["pln", "polish-zloty", "পোলিশ জ্লোটি", "জ্লোটি", "পোল্যান্ড"],
  ["cad", "canadian-dollar", "কানাডিয়ান ডলার", "ডলার", "কানাডা"],
  ["aud", "australian-dollar", "অস্ট্রেলিয়ান ডলার", "ডলার", "অস্ট্রেলিয়া"],
  ["lbp", "lebanese-pound", "লেবানিজ পাউন্ড", "পাউন্ড", "লেবানন"],
  ["bnd", "brunei-dollar", "ব্রুনাই ডলার", "ডলার", "ব্রুনাই"],
  ["mur", "mauritian-rupee", "মরিশাস রুপি", "রুপি", "মরিশাস"],
];
export const INCENTIVE = {
  pct: 2.5,
  note: "বৈধ পথে (ব্যাংক, এক্সচেঞ্জ হাউস, অনুমোদিত মোবাইল ব্যাংকিং) পাঠানো রেমিট্যান্সে সরকারের ২.৫% নগদ প্রণোদনা; ২০২৬-২৭ অর্থবছরের বাজেটে এটি বহাল রাখার ঘোষণা দেওয়া হয়েছে।",
  source: "বাংলাদেশ ব্যাংক (এফই সার্কুলার) ও অর্থ মন্ত্রণালয় — বাজেট বক্তৃতা ২০২৬-২৭",
  url: "https://www.bb.org.bd/en/index.php/mediaroom/circular",
};
const SRC = "fawazahmed0/exchange-api (CC0) — বাজারের মধ্য-রেট";
const day = (d) => d.toISOString().slice(0, 10);

async function bdt(date) {
  for (const u of [`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/bdt.json`,
                   `https://${date}.currency-api.pages.dev/v1/currencies/bdt.json`]) {
    try {
      const r = await fetch(u, { cf: { cacheTtl: 3600 } });
      if (r.ok) { const j = await r.json(); if (j && j.bdt) return j; }
    } catch (e) {}
  }
  return null;
}

export async function remittance() {
  const now = await bdt("latest");
  if (!now) return null;
  const t = new Date(now.date + "T00:00:00Z");
  const back = (n) => day(new Date(t.getTime() - n * 864e5));
  const [w, m] = await Promise.all([bdt(back(7)), bdt(back(30))]);
  const per = (j, c) => (j && j.bdt[c] ? 1 / j.bdt[c] : null);
  return {
    updated: now.date, source: SRC, incentive: INCENTIVE, routing_url: null,
    currencies: CURRENCIES.map(([code, slug, name, unit, country]) => ({
      code, slug, name, unit, country,
      rate: per(now, code), rate7: per(w, code), rate30: per(m, code),
    })).filter((c) => c.rate),
  };
}
