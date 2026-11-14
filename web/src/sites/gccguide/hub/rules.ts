import "server-only";
import rulesFile from "./data/labour-rules.json";
import type { GratuityRule } from "./gratuity";

/* Loads the verified labour-law rules. Kept separate from the engine so a rule
 * can be corrected without touching arithmetic, and so the page can tell the
 * difference between "the law says zero" and "we have not verified the law". */

type Rule = {
  country: string;
  gratuity: GratuityRule;
  overtime?: { confirmed: boolean; article: string; source_url: string; uplift_percent: number | null; night_uplift_percent: number | null; rest_day_note: string; hourly_divisor: number | null; notes: string };
  annual_leave?: { confirmed: boolean; article: string; source_url: string; tiers: { minServiceYears: number; days: number }[]; day_type: string; notes: string };
  notice?: { confirmed: boolean; article: string; source_url: string; tiers: { minServiceYears: number; days: number }[]; payment_in_lieu: boolean; notes: string };
};

const RULES = (rulesFile as unknown as { rules: Rule[] }).rules;

export function getRule(country: string): Rule | undefined {
  return RULES.find((r) => r.country === country);
}

export function allRules(): Rule[] {
  return RULES;
}

export type { Rule };
