import "server-only";
import type { Metadata } from "next";
import { getSite } from "@/lib/data";
import { siteBaseUrl } from "@/lib/sites.config";
import { defaultOgImages } from "@/lib/og";
import { GULF_CURRENCIES } from "./config";
import { getRule } from "./rules";
import { gate } from "./gate";
import RuleCalcPage, { type CalcKind } from "./RuleCalcPage";
import type { OvertimeRule, LeaveRule, NoticeRule } from "./leave";
import { fmt } from "./format";

/* Shared plumbing for /overtime, /annual-leave and /notice-period: the three
 * routes differ only in which rule record they read and which field they ask for. */

export type SearchParams = Record<string, string | string[] | undefined>;

const TITLES: Record<CalcKind, (c: string, cur: string) => string> = {
  overtime: (c) => `Overtime pay calculator ${c} — hourly rate and statutory uplift`,
  "annual-leave": (c) => `Annual leave calculator ${c} — days earned and leave pay`,
  "notice-period": (c) => `Notice period calculator ${c} — how much notice and pay in lieu`,
};

export function ruleFor(kind: CalcKind, country: string): OvertimeRule | LeaveRule | NoticeRule | undefined {
  const r = getRule(country);
  if (!r) return undefined;
  if (kind === "overtime") return r.overtime;
  if (kind === "annual-leave") return r.annual_leave;
  return r.notice;
}

export function parseNums(sp: SearchParams, defaults: { wage: number; hours: number; years: number; days: number }) {
  const num = (v: string | string[] | undefined, fallback: number, max: number) => {
    const s = Array.isArray(v) ? v[0] : v;
    const n = Number(s);
    if (s == null || s === "" || !Number.isFinite(n)) return fallback;
    return Math.min(Math.max(n, 0), max);
  };
  return {
    wage: num(sp.wage, defaults.wage, 10_000_000),
    hours: num(sp.hours, defaults.hours, 500),
    years: num(sp.years, defaults.years, 50),
    days: num(sp.days, defaults.days, 400),
  };
}

export async function buildRuleMetadata(kind: CalcKind, params: Promise<{ site: string; country: string }>): Promise<Metadata> {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  if (!site || site.id !== "gccguide" || !g) return {};
  const rule = ruleFor(kind, country);
  const confirmed = Boolean(rule?.confirmed);
  return {
    title: TITLES[kind](g.short, g.code),
    description: confirmed
      ? `${g.short} ${kind.replace("-", " ")} rules applied to your wage: the article, the arithmetic and an official source. Works without JavaScript.`
      : `${g.short} ${kind.replace("-", " ")} — the rule is being verified against the labour ministry before we publish a number.`,
    metadataBase: new URL(siteBaseUrl(site)),
    alternates: { canonical: `/${kind}/${country}` },
    robots: gate.calculator(confirmed) ? { index: true, follow: true, "max-image-preview": "large" } : { index: false, follow: true },
    openGraph: { images: defaultOgImages(), title: `${g.short} ${kind.replace("-", " ")} calculator`, description: "Statutory arithmetic with a sourced rule.", type: "website", url: `/${kind}/${country}` },
  };
}

export async function RuleCalcRoute(kind: CalcKind, params: Promise<{ site: string; country: string }>, searchParams: Promise<SearchParams>) {
  const { site: id, country } = await params;
  const site = getSite(id);
  const g = GULF_CURRENCIES.find((c) => c.country === country);
  if (!site || site.id !== "gccguide" || !g) return null;
  const sp = await searchParams;
  const input = parseNums(sp, { wage: 5000, hours: 10, years: 5, days: 0 });
  return (
    <RuleCalcPage
      site={site}
      kind={kind}
      country={country}
      countryName={g.short}
      currency={g.code}
      rule={ruleFor(kind, country)}
      input={input}
    />
  );
}

void fmt;
