/* End-of-service gratuity engine.
 *
 * The formula is DATA (hub/data/labour-rules.json, verified against each
 * country's labour law by a cited official source), the arithmetic is here, and
 * the tests in gratuity.test.ts pin both. A country whose rule is not verified
 * has `confirmed: false` and the page then refuses to compute — it shows the
 * official portal instead of a number nobody can stand behind.
 *
 * Units: tiers are "days of wage per year of service"; daily wage = monthly wage
 * / daily_divisor (30 for a 30-day month, 26 where the law says so).
 */

export type Tier = { upToYears: number | null; daysPerYear: number };
export type ResignFactor = { minYears: number; factor: number };

export type GratuityRule = {
  confirmed: boolean;
  article: string;
  source_url: string;
  wage_base: "basic" | "full";
  min_service_years: number;
  daily_divisor: number;
  tiers: Tier[];
  cap_months: number | null;
  resignation_factors: ResignFactor[];
  plain_english: string;
  notes: string;
};

export type Reason = "resignation" | "termination";

export type GratuityInput = { monthlyWage: number; years: number; reason: Reason };

export type GratuityResult = {
  eligible: boolean;
  /** days of wage earned before the resignation factor */
  days: number;
  /** the wage actually used (basic vs full is the caller's choice, see wage_base) */
  monthlyWage: number;
  dailyWage: number;
  /** gross before the resignation factor and before the cap */
  gross: number;
  /** the fraction applied for a resignation (1 for termination) */
  factor: number;
  /** months of wage the cap allows, if any */
  capMonths: number | null;
  capAmount: number | null;
  capped: boolean;
  /** the amount payable */
  amount: number;
  minServiceYears: number;
};

/** Days of wage earned for `years` of service, walked band by band so that
 *  fractional years and multi-tier laws are both exact. */
export function gratuityDays(tiers: Tier[], years: number): number {
  if (!Number.isFinite(years) || years <= 0) return 0;
  let left = years;
  let prev = 0;
  let days = 0;
  for (const t of tiers) {
    const limit = t.upToYears ?? Infinity;
    const span = Math.min(left, limit - prev);
    if (span > 0) {
      days += span * t.daysPerYear;
      left -= span;
    }
    prev = limit;
    if (left <= 0) break;
  }
  return days;
}

export function resignationFactor(factors: ResignFactor[], years: number, reason: Reason): number {
  if (reason === "termination") return 1;
  let f = factors.length ? factors[0].factor : 1;
  for (const r of factors) if (years >= r.minYears) f = r.factor;
  return f;
}

export function computeGratuity(rule: GratuityRule, input: GratuityInput): GratuityResult {
  const years = Math.max(0, Number(input.years) || 0);
  const monthlyWage = Math.max(0, Number(input.monthlyWage) || 0);
  const divisor = rule.daily_divisor > 0 ? rule.daily_divisor : 30;
  const dailyWage = monthlyWage / divisor;

  if (years < rule.min_service_years || monthlyWage <= 0) {
    return {
      eligible: false,
      days: 0,
      monthlyWage,
      dailyWage,
      gross: 0,
      factor: 0,
      capMonths: rule.cap_months,
      capAmount: rule.cap_months ? rule.cap_months * monthlyWage : null,
      capped: false,
      amount: 0,
      minServiceYears: rule.min_service_years,
    };
  }

  const days = gratuityDays(rule.tiers, years);
  const gross = days * dailyWage;
  const factor = resignationFactor(rule.resignation_factors, years, input.reason);
  const capAmount = rule.cap_months ? rule.cap_months * monthlyWage : null;
  const afterFactor = gross * factor;
  const capped = capAmount != null && afterFactor > capAmount;
  const amount = capped ? capAmount! : afterFactor;

  return {
    eligible: true,
    days,
    monthlyWage,
    dailyWage,
    gross,
    factor,
    capMonths: rule.cap_months,
    capAmount,
    capped,
    amount: Math.round(amount * 100) / 100,
    minServiceYears: rule.min_service_years,
  };
}

/** URL for the calculator with a prefilled scenario, e.g. ?wage=5000&years=7&reason=resignation */
export function calcHref(country: string, input: Partial<GratuityInput> & { wageCurrency?: string }): string {
  const p = new URLSearchParams();
  if (input.monthlyWage != null) p.set("wage", String(input.monthlyWage));
  if (input.years != null) p.set("years", String(input.years));
  if (input.reason) p.set("reason", input.reason);
  return `/gratuity/${country}?${p.toString()}`;
}

/** "basic-5000-aed-7-years" — the pre-computed example pages. */
export function exampleSlug(wage: number, currency: string, years: number): string {
  return `basic-${wage}-${currency.toLowerCase()}-${years}-years`;
}

export function parseExampleSlug(slug: string): { wage: number; currency: string; years: number } | null {
  const m = /^basic-(\d{2,7})-([a-z]{3})-(\d{1,2})-years?$/.exec(slug.toLowerCase());
  if (!m) return null;
  const wage = Number(m[1]);
  const years = Number(m[3]);
  if (!Number.isFinite(wage) || !Number.isFinite(years) || years < 1 || years > 40) return null;
  return { wage, currency: m[2].toUpperCase(), years };
}
