import { xmlEscape as esc } from "@/lib/seo-sitemaps";
export const dynamic = "force-dynamic";
const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" };
const page = (body: string, status = 200) => new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SEO operations</title><style>body{max-width:900px;margin:40px auto;padding:20px;font:16px system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere}input,button{font:inherit;padding:10px}</style><h1>SEO operations</h1>${body}</html>`, { status, headers });
export async function GET(_req: Request, { params }: { params: Promise<{ site: string }> }) {
  if (!["ninetymins", "countly"].includes((await params).site)) return new Response("Not found", { status: 404 });
  return page('<form method="post"><label>Admin password <input type="password" name="key" required autocomplete="current-password"></label> <button>View report</button></form>');
}
export async function POST(req: Request, { params }: { params: Promise<{ site: string }> }) {
  if (!["ninetymins", "countly"].includes((await params).site)) return new Response("Not found", { status: 404 });
  // Only the same-origin form can submit a password. No query string or logs.
  if (req.headers.get("origin") !== new URL(req.url).origin) return page("Invalid origin", 403);
  const key = String((await req.formData()).get("key") || "");
  const r = await fetch("https://api.ninetymins.com/admin/seo", { headers: { "x-admin-key": key }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!r.ok) return page("Access denied or report unavailable.", r.status);
  const countly = await fetch("https://autoblog-seo-engine.iamkashimuddin.workers.dev/report", { headers: { "x-admin-key": key }, cache: "no-store", signal: AbortSignal.timeout(10000) });
  const engine = countly.ok ? await countly.json() : { status: countly.status };
  return page(`<h2>Country data engine</h2><pre>${esc(JSON.stringify(engine, null, 2))}</pre><h2>Sports report & errors</h2><pre>${esc(JSON.stringify(await r.json(), null, 2))}</pre><p><a href="/admin/seo">Sign out</a></p>`);
}
