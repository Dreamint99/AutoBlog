export async function distribute(env) {
  // Only our configured account/channel; no mentions, replies, groups or DMs.
  const pages = (await env.DB.prepare(`SELECT 'https://countly.net/data/'||kind||'/'||slug AS url,title,created_at AS at FROM seo_pages WHERE site_id='countly'
    UNION ALL SELECT 'https://ninetymins.com'||path AS url,json_extract(ev_json,'$.home.name')||' '||json_extract(ev_json,'$.home.score')||'–'||json_extract(ev_json,'$.away.score')||' '||json_extract(ev_json,'$.away.name')||': result' AS title,result_at AS at FROM seo_matches WHERE state='post' AND result_at IS NOT NULL ORDER BY at DESC LIMIT 1000`).all()).results;
  const status = { at: new Date().toISOString(), telegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHANNEL_ID), x: !!env.X_USER_ACCESS_TOKEN, paidMonthlyCapUsd: Number(env.MONTHLY_PAID_API_CAP_USD || 0), maxPostsPerChannelPerRun: 1 };
  for (const channel of ["telegram", "x"]) {
    // Missing credentials are an explicit setup dependency, not a successful send.
    if (!status[channel]) continue;
    const prior = new Set((await env.DB.prepare("SELECT url FROM seo_social WHERE channel=?").bind(channel).all()).results.map(r => r.url));
    const jobs = pages.filter(p => !prior.has(p.url)).map(p => env.DB.prepare("INSERT OR IGNORE INTO seo_social(channel,url,updated_at) VALUES(?,?,?)").bind(channel, p.url, status.at));
    for (let i = 0; i < jobs.length; i += 100) await env.DB.batch(jobs.slice(i, i + 100));
    const row = await env.DB.prepare("SELECT url FROM seo_social WHERE channel=? AND status='pending' AND attempts<5 ORDER BY updated_at LIMIT 1").bind(channel).first();
    if (!row) continue;
    const p = pages.find(p => p.url === row.url); if (!p) continue;
    if (channel === "x") {
      const cap = Number(env.MONTHLY_PAID_API_CAP_USD || 0), cost = Number(env.X_POST_MAX_COST_USD || 0);
      // An explicit maximum per call is required; never assume X writes are free.
      if (!(cap > 0 && cost > 0)) { status.xBudget = "disabled: set a positive cap and maximum per-call cost"; continue; }
      const month = status.at.slice(0, 7);
      const [, reserved] = await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO seo_budget(month) VALUES(?)").bind(month), env.DB.prepare("UPDATE seo_budget SET reserved_usd=reserved_usd+? WHERE month=? AND reserved_usd+?<=?").bind(cost, month, cost, cap)]);
      if (!reserved.meta.changes) { status.xBudget = "monthly cap reached"; continue; }
    }
    const claim = await env.DB.prepare("UPDATE seo_social SET status='sending',attempts=attempts+1,updated_at=? WHERE channel=? AND url=? AND status='pending'").bind(status.at, channel, p.url).run();
    if (!claim.meta.changes) continue;
    const text = `${p.title.slice(0, 100)}\n${p.url}`;
    try {
      const r = channel === "telegram"
        ? await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", signal: AbortSignal.timeout(15000), headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHANNEL_ID, text, disable_web_page_preview: false }) })
        : await fetch("https://api.x.com/2/tweets", { method: "POST", signal: AbortSignal.timeout(15000), headers: { authorization: `Bearer ${env.X_USER_ACCESS_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const body = await r.json();
      const ok = r.ok && (channel !== "telegram" || body.ok === true);
      await env.DB.prepare("UPDATE seo_social SET status=?,remote_id=?,updated_at=? WHERE channel=? AND url=?").bind(ok ? "sent" : "pending", ok ? String(body.result?.message_id || body.data?.id || "") : null, status.at, channel, p.url).run();
      status[`${channel}Last`] = { http: r.status, url: p.url, sent: ok };
    } catch {
      // A timeout may occur after provider acceptance. Do not blindly duplicate it.
      await env.DB.prepare("UPDATE seo_social SET status='delivery_unknown',updated_at=? WHERE channel=? AND url=?").bind(status.at, channel, p.url).run();
      status[`${channel}Last`] = { url: p.url, status: "delivery_unknown", needsReview: true };
    }
  }
  await env.SEO_LOG.put("engine:social", JSON.stringify(status));
}
