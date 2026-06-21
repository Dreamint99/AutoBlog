// Generate page: bulk (N per site) + manual (your titles), shared progress polling.
function initGenerate() {
  const $ = (id) => document.getElementById(id);
  const logEl = $("log"), fill = $("progFill"), label = $("progLabel"), results = $("results");
  const esc = (s) => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };
  const addLog = (line, head) => {
    const d = document.createElement("div"); d.className = "l";
    d.innerHTML = head ? "<b>" + esc(line) + "</b>" : esc(line);
    logEl.appendChild(d); logEl.scrollTop = logEl.scrollHeight;
  };

  let seen, shown;
  function poll(jobId, btn) {
    seen = 0; shown = new Set();
    const iv = setInterval(async () => {
      let j; try { j = await (await fetch("/api/job/" + jobId)).json(); } catch { return; }
      (j.logs || []).slice(seen).forEach(l => addLog(l.m, l.m.startsWith("──") || l.m.startsWith("═")));
      seen = (j.logs || []).length;
      const pct = j.total ? Math.round((j.done / j.total) * 100) : 0;
      fill.style.width = pct + "%";
      label.textContent = `${j.done}/${j.total} · ${j.status}`;
      (j.articles || []).forEach(a => {
        if (shown.has(a.id)) return; shown.add(a.id);
        const el = document.createElement("div"); el.className = "res";
        el.innerHTML = `<img src="${a.image}" alt=""><div><a href="/preview/${a.id}" target="_blank">${esc(a.title)}</a>
          <div class="muted" style="font-size:12px">${a.site ? a.site + " · " : ""}${a.words} words</div></div>`;
        results.appendChild(el);
      });
      if (j.status === "completed" || j.status === "failed") { clearInterval(iv); if (btn) btn.disabled = false; }
    }, 1000);
  }

  async function start(endpoint, payload, btn) {
    logEl.innerHTML = ""; results.innerHTML = ""; fill.style.width = "0%"; label.textContent = "starting…";
    if (btn) btn.disabled = true;
    const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json();
    if (d.error) { alert(d.error); if (btn) btn.disabled = false; return; }
    poll(d.job_id, btn);
  }

  // Bulk: N per selected site
  $("bulkBtn").onclick = () => {
    const ids = [...document.querySelectorAll(".bsite:checked")].map(c => c.value);
    if (!ids.length) { alert("Pick at least one website."); return; }
    start("/api/bulk-generate", { site_ids: ids, count: +$("bcount").value || 5, seed: $("bseed").value }, $("bulkBtn"));
  };

  // Manual: your titles, one site
  $("goBtn").onclick = () => {
    const titles = $("titles").value.split("\n").map(s => s.trim()).filter(Boolean);
    if (!titles.length) { alert("Enter at least one title (or use Bulk)."); return; }
    start("/api/generate", { site_id: $("site").value, titles }, $("goBtn"));
  };

  // Suggest titles
  $("planBtn").onclick = async () => {
    const btn = $("planBtn"); btn.disabled = true; btn.textContent = "…thinking";
    try {
      const d = await (await fetch("/api/suggest-titles", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: $("site").value, count: 8 }) })).json();
      if (d.titles) $("titles").value = d.titles.join("\n");
    } catch (e) { alert("Failed: " + e); }
    btn.disabled = false; btn.textContent = "✨ Suggest titles";
  };
}
