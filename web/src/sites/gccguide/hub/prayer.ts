import "server-only";
import { Coordinates, CalculationMethod, PrayerTimes, Qibla, Madhab, type CalculationParameters } from "adhan";
import citiesData from "./data/cities.json";
import { INDEX } from "./config";

/* Prayer times for Gulf cities.
 *
 * Coordinates and populations come from GeoNames (CC BY 4.0) — see the
 * attribution line printed on every prayer page. Times come from the `adhan`
 * library (MIT), which implements the standard astronomical algorithms, so the
 * page needs no external API and works offline.
 *
 * Method: each Gulf state has an official convention, and they differ by a
 * couple of minutes. We use the method that matches the country where the
 * library has one (Umm al-Qura for Saudi Arabia, Dubai for the UAE, Qatar,
 * Kuwait) and say plainly where it does not (Oman, Bahrain) instead of
 * pretending. The visitor can switch method with a link.
 */

export type City = {
  country: string;
  name: string;
  ascii: string;
  lat: number;
  lng: number;
  pop: number;
  tz: string;
  slug: string;
  feature: string;
};

const CITIES = (citiesData as unknown as { cities: City[] }).cities;
export const CITY_COUNT = CITIES.length;

export function citiesOf(country: string): City[] {
  return CITIES.filter((c) => c.country === country);
}

export function findCity(country: string, slug: string): City | undefined {
  return CITIES.find((c) => c.country === country && c.slug === slug.toLowerCase());
}

export function allCities(): City[] {
  return CITIES;
}

/** Cities big enough to be indexed at launch (population threshold in config). */
export function indexedCities(): City[] {
  return CITIES.filter((c) => c.pop >= INDEX.prayerMinPopulation);
}

export const PRAYER_METHODS = [
  { key: "local", label: "Local official method" },
  { key: "umm-al-qura", label: "Umm al-Qura (Makkah)" },
  { key: "mwl", label: "Muslim World League (18°/17°)" },
  { key: "karachi", label: "University of Islamic Sciences, Karachi" },
  { key: "egyptian", label: "Egyptian General Authority" },
  { key: "dubai", label: "Dubai (UAE official)" },
] as const;

export type MethodKey = (typeof PRAYER_METHODS)[number]["key"];

/** The method a country actually uses, and whether that is the library's own
 *  country-specific method or the closest general one. */
export function countryMethod(country: string): { key: MethodKey; note: string } {
  switch (country) {
    case "saudi-arabia":
      return { key: "umm-al-qura", note: "Umm al-Qura, the calendar used by the Kingdom's official Umm al-Qura authority." };
    case "uae":
      return { key: "dubai", note: "The Dubai method, which is the convention used in the Emirates." };
    case "qatar":
      return { key: "local", note: "Qatar's own convention (18° Fajr / 18° Isha)." };
    case "kuwait":
      return { key: "local", note: "Kuwait's own convention (18° / 17.5°)." };
    case "oman":
      return { key: "mwl", note: "Oman has no dedicated method in the library; the Muslim World League convention (18° / 17°) is used. Compare with the local mosque calendar." };
    case "bahrain":
      return { key: "mwl", note: "Bahrain has no dedicated method in the library; the Muslim World League convention (18° / 17°) is used. Compare with the local mosque calendar." };
    default:
      return { key: "mwl", note: "Muslim World League convention." };
  }
}

function paramsFor(country: string, method: MethodKey): { params: CalculationParameters; label: string } {
  const key = method === "local" ? countryMethod(country).key : method;
  switch (key) {
    case "umm-al-qura":
      return { params: CalculationMethod.UmmAlQura(), label: "Umm al-Qura (Makkah)" };
    case "dubai":
      return { params: CalculationMethod.Dubai(), label: "Dubai (UAE official)" };
    case "mwl":
      return { params: CalculationMethod.MuslimWorldLeague(), label: "Muslim World League (18°/17°)" };
    case "karachi":
      return { params: CalculationMethod.Karachi(), label: "University of Islamic Sciences, Karachi" };
    case "egyptian":
      return { params: CalculationMethod.Egyptian(), label: "Egyptian General Authority" };
    default:
      // Qatar / Kuwait have their own presets; ask adhan for them by name.
      if (country === "qatar") return { params: CalculationMethod.Qatar(), label: "Qatar (18°/18°)" };
      if (country === "kuwait") return { params: CalculationMethod.Kuwait(), label: "Kuwait (18°/17.5°)" };
      return { params: CalculationMethod.MuslimWorldLeague(), label: "Muslim World League (18°/17°)" };
  }
}

export type DayTimes = {
  date: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

const PRAYERS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

/** Format an instant in the city's own time zone, 24h, e.g. "05:12". */
export function localTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function timesFor(city: City, date: Date, params: CalculationParameters): DayTimes {
  const pt = new PrayerTimes(new Coordinates(city.lat, city.lng), date, params);
  const iso = date.toISOString().slice(0, 10);
  return {
    date: iso,
    fajr: localTime(pt.fajr, city.tz),
    sunrise: localTime(pt.sunrise, city.tz),
    dhuhr: localTime(pt.dhuhr, city.tz),
    asr: localTime(pt.asr, city.tz),
    maghrib: localTime(pt.maghrib, city.tz),
    isha: localTime(pt.isha, city.tz),
  };
}

export type PrayerView = {
  city: City;
  method: MethodKey;
  methodLabel: string;
  methodNote: string;
  today: DayTimes;
  lastThirdStart: string;
  month: DayTimes[];
  next: { name: string; at: string; minutes: number } | null;
  qibla: number;
  hijri: string;
  ramadan: DayTimes[];
  ramadanRange: string;
  series: number[];
};

/** Ramadan 2027 is expected to begin around 8 February 2027 (1448 AH). The exact
 *  first day depends on the local moon sighting; the page labels it as expected. */
export const RAMADAN_2027_START = "2027-02-08";
export const RAMADAN_2027_DAYS = 30;

export function buildPrayerView(city: City, method: MethodKey = "local"): PrayerView {
  const { params, label } = paramsFor(city.country, method);
  params.madhab = Madhab.Shafi;

  const now = new Date();
  const today = timesFor(city, now, params);

  // Month table: the current calendar month in the city's own time zone.
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: city.tz, year: "numeric", month: "2-digit" }).format(now);
  const [y, m] = parts.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const month: DayTimes[] = [];
  for (let d = 1; d <= daysInMonth; d++) month.push(timesFor(city, new Date(Date.UTC(y, m - 1, d, 12)), params));

  // Next prayer today (or Fajr tomorrow).
  const pt = new PrayerTimes(new Coordinates(city.lat, city.lng), now, params);
  const upcoming: { name: string; at: Date }[] = PRAYERS.filter((p) => p !== "sunrise").map((p) => ({ name: p, at: pt[p] as Date }));
  const nextOne = upcoming.find((u) => u.at > now) ?? { name: "fajr", at: pt.fajr };

  // Sunnah: the last third of the night begins between Maghrib and Fajr.
  const nightMs = pt.fajr.getTime() - pt.maghrib.getTime();
  const lastThird = new Date(pt.fajr.getTime() - nightMs / 3);

  // Ramadan table (Suhoor = Fajr, Iftar = Maghrib), labelled as expected dates.
  const ramadan: DayTimes[] = [];
  const start = new Date(`${RAMADAN_2027_START}T12:00:00Z`);
  for (let i = 0; i < RAMADAN_2027_DAYS; i++) ramadan.push(timesFor(city, new Date(start.getTime() + i * 864e5), params));

  return {
    city,
    method,
    methodLabel: label,
    methodNote: countryMethod(city.country).note,
    today,
    lastThirdStart: localTime(lastThird, city.tz),
    month,
    next: nextOne ? { name: nextOne.name, at: localTime(nextOne.at, city.tz), minutes: Math.max(0, Math.round((nextOne.at.getTime() - now.getTime()) / 60000)) } : null,
    qibla: Math.round(Qibla(new Coordinates(city.lat, city.lng)) * 10) / 10,
    hijri: hijriDate(now, city.tz),
    ramadan,
    ramadanRange: `${RAMADAN_2027_START} to about 9 March 2027`,
    series: month.map((d) => Number(d.dhuhr.replace(":", ""))),
  };
}

/** Hijri date via ICU's Umm al-Qura calendar, with a tabular fallback. Islamic
 *  dates depend on moon sighting, so the page marks them as approximate. */
export function hijriDate(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return tabularHijri(d);
  }
}

/** Kuwaiti/tabular Islamic calendar (arithmetic, no table). Accurate to ±1 day. */
export function tabularHijri(d: Date): string {
  const jd = Math.floor(d.getTime() / 86400000) + 2440588;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  let ll = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) + Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  ll = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * ll) / 709);
  const day = ll - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return `${day} ${monName(month)} ${year} AH`;
}

function monName(m: number): string {
  return ["Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhul Qadah", "Dhul Hijjah"][m - 1] ?? "";
}

export function prayerLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}
