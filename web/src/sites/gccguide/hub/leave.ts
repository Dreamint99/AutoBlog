/* Overtime, annual leave and notice-period arithmetic.
 *
 * Same shape as gratuity.ts: the numbers come from hub/data/labour-rules.json,
 * this file only does the maths, and every function is pure so it can be tested.
 * Monthly wage is the wage the country's law says to use (basic or full) — the
 * page labels it, this module does not care.
 */

export type OvertimeRule = {
  confirmed: boolean;
  article: string;
  source_url: string;
  /** % above the normal hourly wage, e.g. 25 for "125% of normal" */
  uplift_percent: number | null;
  night_uplift_percent: number | null;
  rest_day_note: string;
  /** hours a monthly wage is divided by: 240 = 30 days × 8 h, 208 = 26 × 8 */
  hourly_divisor: number | null;
  notes: string;
};

export type LeaveRule = {
  confirmed: boolean;
  article: string;
  source_url: string;
  tiers: { minServiceYears: number; days: number }[];
  day_type: string;
  notes: string;
};

export type NoticeRule = {
  confirmed: boolean;
  article: string;
  source_url: string;
  tiers: { minServiceYears: number; days: number }[];
  payment_in_lieu: boolean;
  notes: string;
};

/** Hourly wage from a monthly wage. Default divisor 240 = 30 × 8, the convention
 *  used by Gulf labour ministries for monthly-paid staff. */
export function hourlyWage(monthlyWage: number, divisor: number | null): number {
  const d = divisor && divisor > 0 ? divisor : 240;
  return Math.max(0, monthlyWage) / d;
}

/** Pay for `hours` of overtime at the statutory uplift (25% → 1.25 × hourly). */
export function overtimePay(monthlyWage: number, hours: number, upliftPercent: number | null, divisor: number | null): number {
  const up = upliftPercent == null ? 0 : upliftPercent;
  const h = Math.max(0, hours);
  return hourlyWage(monthlyWage, divisor) * h * (1 + up / 100);
}

/** Entitlement for a given length of service: the highest tier whose threshold
 *  has been reached. */
export function tierDays(tiers: { minServiceYears: number; days: number }[], years: number): number | null {
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => a.minServiceYears - b.minServiceYears);
  let days: number | null = null;
  for (const t of sorted) if (years >= t.minServiceYears) days = t.days;
  return days;
}

/** Daily wage for leave/notice purposes: monthly / 30. */
export function dailyWage(monthlyWage: number): number {
  return Math.max(0, monthlyWage) / 30;
}

/** Pay for `days` of leave (or notice in lieu) at the monthly wage / 30. */
export function daysPay(monthlyWage: number, days: number): number {
  return dailyWage(monthlyWage) * Math.max(0, days);
}
