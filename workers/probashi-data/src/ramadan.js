// Ramadan calendars + daily prayer times for cities where Bangladeshi expats live (probashiinfo /ramadan/<city>/).
// Computed (no data source): the standard astronomical method used by PrayTimes.org, ported from Colours of
// Bangladesh src/prayer.ts, with the calculation method each country's Muslims commonly follow and the city's
// real time zone (IANA, daylight saving included). Asr is Hanafi (most Bangladeshis follow it).
// Ramadan start: Umm al-Qura 1 Ramadan (Saudi date — used by most Gulf, European and American communities);
// local moon-sighting can differ by a day, so pages say "সম্ভাব্য".

const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

function sun(jd) {
  const D = jd - 2451545.0, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360), e = 23.439 - 0.00000036 * D;
  const RA = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24);
  return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - RA };
}
const julian = (y, m, d) => {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
};

// methods: fajr angle, isha angle or minutes after maghrib
export const METHODS = {
  uqa: { name: "উম্মুল কুরা (সৌদি আরব)", fajr: 18.5, ishaMin: 90 },
  qatar: { name: "কাতার (আওকাফ)", fajr: 18, ishaMin: 90 },
  uae: { name: "আমিরাত (আওকাফ)", fajr: 18.2, isha: 18.2 },
  kuwait: { name: "কুয়েত", fajr: 18, isha: 17.5 },
  gulf: { name: "গালফ অঞ্চল", fajr: 19.5, ishaMin: 90 },
  jakim: { name: "জাকিম (মালয়েশিয়া)", fajr: 20, isha: 18 },
  muis: { name: "মুইস (সিঙ্গাপুর)", fajr: 20, isha: 18 },
  karachi: { name: "করাচি (১৮°)", fajr: 18, isha: 18 },
  mwl: { name: "মুসলিম ওয়ার্ল্ড লিগ", fajr: 18, isha: 17 },
  uoif: { name: "ইউওআইএফ (ফ্রান্স)", fajr: 12, isha: 12 },
  isna: { name: "ইসনা (উত্তর আমেরিকা)", fajr: 15, isha: 15 },
};

// slug, Bangla name, Bangla country, iso2, lat, lon, IANA zone, method, region
export const CITIES = [
  ["doha", "দোহা", "কাতার", "qa", 25.2854, 51.531, "Asia/Qatar", "qatar", "gulf"],
  ["dubai", "দুবাই", "সংযুক্ত আরব আমিরাত", "ae", 25.2048, 55.2708, "Asia/Dubai", "uae", "gulf"],
  ["abu-dhabi", "আবুধাবি", "সংযুক্ত আরব আমিরাত", "ae", 24.4539, 54.3773, "Asia/Dubai", "uae", "gulf"],
  ["sharjah", "শারজাহ", "সংযুক্ত আরব আমিরাত", "ae", 25.3463, 55.4209, "Asia/Dubai", "uae", "gulf"],
  ["riyadh", "রিয়াদ", "সৌদি আরব", "sa", 24.7136, 46.6753, "Asia/Riyadh", "uqa", "gulf"],
  ["jeddah", "জেদ্দা", "সৌদি আরব", "sa", 21.4858, 39.1925, "Asia/Riyadh", "uqa", "gulf"],
  ["makkah", "মক্কা", "সৌদি আরব", "sa", 21.3891, 39.8579, "Asia/Riyadh", "uqa", "gulf"],
  ["madinah", "মদিনা", "সৌদি আরব", "sa", 24.5247, 39.5692, "Asia/Riyadh", "uqa", "gulf"],
  ["dammam", "দাম্মাম", "সৌদি আরব", "sa", 26.4207, 50.0888, "Asia/Riyadh", "uqa", "gulf"],
  ["kuwait-city", "কুয়েত সিটি", "কুয়েত", "kw", 29.3759, 47.9774, "Asia/Kuwait", "kuwait", "gulf"],
  ["muscat", "মাস্কাট", "ওমান", "om", 23.588, 58.3829, "Asia/Muscat", "gulf", "gulf"],
  ["manama", "মানামা", "বাহরাইন", "bh", 26.2285, 50.586, "Asia/Bahrain", "uqa", "gulf"],
  ["kuala-lumpur", "কুয়ালালামপুর", "মালয়েশিয়া", "my", 3.139, 101.6869, "Asia/Kuala_Lumpur", "jakim", "asia"],
  ["singapore", "সিঙ্গাপুর", "সিঙ্গাপুর", "sg", 1.3521, 103.8198, "Asia/Singapore", "muis", "asia"],
  ["male", "মালে", "মালদ্বীপ", "mv", 4.1755, 73.5093, "Indian/Maldives", "karachi", "asia"],
  ["amman", "আম্মান", "জর্ডান", "jo", 31.9454, 35.9284, "Asia/Amman", "mwl", "asia"],
  ["beirut", "বৈরুত", "লেবানন", "lb", 33.8938, 35.5018, "Asia/Beirut", "mwl", "asia"],
  ["tokyo", "টোকিও", "জাপান", "jp", 35.6762, 139.6503, "Asia/Tokyo", "mwl", "asia"],
  ["seoul", "সিউল", "দক্ষিণ কোরিয়া", "kr", 37.5665, 126.978, "Asia/Seoul", "mwl", "asia"],
  ["london", "লন্ডন", "যুক্তরাজ্য", "gb", 51.5072, -0.1276, "Europe/London", "mwl", "europe"],
  ["birmingham", "বার্মিংহাম", "যুক্তরাজ্য", "gb", 52.4862, -1.8904, "Europe/London", "mwl", "europe"],
  ["manchester", "ম্যানচেস্টার", "যুক্তরাজ্য", "gb", 53.4808, -2.2426, "Europe/London", "mwl", "europe"],
  ["paris", "প্যারিস", "ফ্রান্স", "fr", 48.8566, 2.3522, "Europe/Paris", "uoif", "europe"],
  ["rome", "রোম", "ইতালি", "it", 41.9028, 12.4964, "Europe/Rome", "mwl", "europe"],
  ["milan", "মিলান", "ইতালি", "it", 45.4642, 9.19, "Europe/Rome", "mwl", "europe"],
  ["venice", "ভেনিস", "ইতালি", "it", 45.4408, 12.3155, "Europe/Rome", "mwl", "europe"],
  ["lisbon", "লিসবন", "পর্তুগাল", "pt", 38.7223, -9.1393, "Europe/Lisbon", "mwl", "europe"],
  ["madrid", "মাদ্রিদ", "স্পেন", "es", 40.4168, -3.7038, "Europe/Madrid", "mwl", "europe"],
  ["barcelona", "বার্সেলোনা", "স্পেন", "es", 41.3874, 2.1686, "Europe/Madrid", "mwl", "europe"],
  ["athens", "এথেন্স", "গ্রিস", "gr", 37.9838, 23.7275, "Europe/Athens", "mwl", "europe"],
  ["belgrade", "বেলগ্রেড", "সার্বিয়া", "rs", 44.7866, 20.4489, "Europe/Belgrade", "mwl", "europe"],
  ["bucharest", "বুখারেস্ট", "রোমানিয়া", "ro", 44.4268, 26.1025, "Europe/Bucharest", "mwl", "europe"],
  ["zagreb", "জাগরেব", "ক্রোয়েশিয়া", "hr", 45.815, 15.9819, "Europe/Zagreb", "mwl", "europe"],
  ["warsaw", "ওয়ারশ", "পোল্যান্ড", "pl", 52.2297, 21.0122, "Europe/Warsaw", "mwl", "europe"],
  ["berlin", "বার্লিন", "জার্মানি", "de", 52.52, 13.405, "Europe/Berlin", "mwl", "europe"],
  ["valletta", "ভালেটা", "মাল্টা", "mt", 35.8989, 14.5146, "Europe/Malta", "mwl", "europe"],
  ["new-york", "নিউ ইয়র্ক", "যুক্তরাষ্ট্র", "us", 40.7128, -74.006, "America/New_York", "isna", "americas"],
  ["detroit", "ডেট্রয়েট", "যুক্তরাষ্ট্র", "us", 42.3314, -83.0458, "America/Detroit", "isna", "americas"],
  ["los-angeles", "লস অ্যাঞ্জেলেস", "যুক্তরাষ্ট্র", "us", 34.0522, -118.2437, "America/Los_Angeles", "isna", "americas"],
  ["toronto", "টরন্টো", "কানাডা", "ca", 43.6532, -79.3832, "America/Toronto", "isna", "americas"],
  ["montreal", "মন্ট্রিয়ল", "কানাডা", "ca", 45.5019, -73.5674, "America/Toronto", "isna", "americas"],
  ["sydney", "সিডনি", "অস্ট্রেলিয়া", "au", -33.8688, 151.2093, "Australia/Sydney", "mwl", "oceania"],
  ["melbourne", "মেলবোর্ন", "অস্ট্রেলিয়া", "au", -37.8136, 144.9631, "Australia/Melbourne", "mwl", "oceania"],
  ["johannesburg", "জোহানেসবার্গ", "দক্ষিণ আফ্রিকা", "za", -26.2041, 28.0473, "Africa/Johannesburg", "mwl", "africa"],
];

// UTC offset (hours) of an IANA zone at local noon of a date — handles daylight saving
function offset(zone, y, m, d) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" });
  const p = f.formatToParts(new Date(Date.UTC(y, m - 1, d, 12))).find((x) => x.type === "timeZoneName").value; // "GMT+03:00"
  const mm = p.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  return mm ? (mm[1] === "-" ? -1 : 1) * (+mm[2] + (+mm[3] || 0) / 60) : 0;
}

export function prayerTimes(y, m, d, lat, lon, zone, method) {
  const M = METHODS[method], tz = offset(zone, y, m, d);
  const jd = julian(y, m, d) - lon / (15 * 24);
  const mid = (t) => fix(12 - sun(jd + t).eqt, 24);
  const angleTime = (angle, t, ccw) => {
    const s = sun(jd + t), z = mid(t);
    const v = deg(Math.acos((-Math.sin(rad(angle)) - Math.sin(rad(s.decl)) * Math.sin(rad(lat))) / (Math.cos(rad(s.decl)) * Math.cos(rad(lat))))) / 15;
    return z + (ccw ? -v : v);
  };
  const asrTime = (factor, t) => {
    const s = sun(jd + t), a = -deg(Math.atan(1 / (factor + Math.tan(rad(Math.abs(lat - s.decl))))));
    return angleTime(a, t, false);
  };
  let T = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
  for (let i = 0; i < 2; i++) {
    const p = (h) => h / 24;
    T = {
      fajr: angleTime(M.fajr, p(T.fajr), true), sunrise: angleTime(0.833, p(T.sunrise), true), dhuhr: mid(p(T.dhuhr)),
      asr: asrTime(2, p(T.asr)), maghrib: angleTime(0.833, p(T.maghrib), false),
      isha: M.isha ? angleTime(M.isha, p(T.isha), false) : NaN,
    };
  }
  // high latitudes (summer): angle never reached → "angle-based" rule (portion of the night = angle/60)
  const night = 24 - (T.maghrib - T.sunrise);
  if (!isFinite(T.fajr) || T.sunrise - T.fajr > night * (M.fajr / 60)) T.fajr = T.sunrise - night * (M.fajr / 60);
  if (M.isha && (!isFinite(T.isha) || T.isha - T.maghrib > night * (M.isha / 60))) T.isha = T.maghrib + night * (M.isha / 60);
  const loc = (h) => Math.round((h + tz - lon / 15) * 60);
  const t = { fajr: loc(T.fajr), sunrise: loc(T.sunrise) - 1, dhuhr: loc(T.dhuhr) + 1, asr: loc(T.asr) + 1, maghrib: loc(T.maghrib) + 1 };
  t.isha = M.isha ? loc(T.isha) + 1 : t.maghrib + M.ishaMin;
  t.sehri = t.fajr;      // sehri ends at Fajr
  t.iftar = t.maghrib;   // iftar at Maghrib (sunset + 1 min)
  return t;
}

const hijri = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
const hParts = (t) => { const p = Object.fromEntries(hijri.formatToParts(new Date(t)).map((x) => [x.type, x.value])); return { y: +String(p.year).replace(/\D/g, ""), m: +p.month, d: +p.day }; };

// first day of the Ramadan running now or coming next (Saudi / Umm al-Qura date), and its length
export function ramadanStart(today) {
  let t = Date.parse(today + "T12:00:00Z") - 40 * 86400e3;
  for (let i = 0; i < 420; i++, t += 86400e3) {
    const h = hParts(t);
    if (h.m === 9 && h.d === 1) {
      let n = 29; if (hParts(t + 29 * 86400e3).m === 9) n = 30;
      const start = new Date(t).toISOString().slice(0, 10);
      if (Date.parse(start) + n * 86400e3 > Date.parse(today + "T00:00:00Z")) return { start, days: n, hijriYear: h.y };
    }
  }
  return null;
}

const cityRow = (c) => ({ slug: c[0], name: c[1], country: c[2], iso2: c[3], lat: c[4], lon: c[5], zone: c[6], method: c[7], methodName: METHODS[c[7]].name, region: c[8] });

export function ramadanIndex(today) {
  const r = ramadanStart(today);
  return { updated: today, ramadan: r, cities: CITIES.map((c) => {
    const x = cityRow(c), [y, m, d] = r.start.split("-").map(Number), t = prayerTimes(y, m, d, x.lat, x.lon, x.zone, x.method);
    return { ...x, first: { sehri: t.sehri, iftar: t.iftar } };
  }) };
}

export function ramadanCity(slug, today) {
  const c = CITIES.find((x) => x[0] === slug);
  if (!c) return null;
  const x = cityRow(c), r = ramadanStart(today);
  const rows = [];
  for (let i = 0; i < r.days; i++) {
    const dt = new Date(Date.parse(r.start + "T12:00:00Z") + i * 86400e3);
    const t = prayerTimes(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), x.lat, x.lon, x.zone, x.method);
    rows.push({ day: i + 1, date: dt.toISOString().slice(0, 10), wd: dt.getUTCDay(), sehri: t.sehri, iftar: t.iftar });
  }
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: x.zone }).format(new Date()); // city's own date
  const [y, m, d] = local.split("-").map(Number);
  return { updated: today, localDate: local, ramadan: r, city: x, rows, todayTimes: prayerTimes(y, m, d, x.lat, x.lon, x.zone, x.method),
    others: CITIES.filter((o) => o[0] !== slug && (o[3] === x.iso2 || o[8] === x.region)).slice(0, 8).map((o) => ({ slug: o[0], name: o[1], country: o[2], iso2: o[3] })) };
}
