// Canvas helpers shared by the site (paper cut, news card), admin (watermark, text thumbnail) and the seed script.
(function () {
  const CAT_COLORS = { জাতীয়: ["#7a0c1c", "#c8102e"], রাজনীতি: ["#3b0d4f", "#8e24aa"], সারাদেশ: ["#0b3d2e", "#0f8a5f"], আন্তর্জাতিক: ["#0b2a5b", "#1f6feb"], অর্থনীতি: ["#3d2a00", "#c9a227"], খেলা: ["#063d1c", "#11a34a"], বিনোদন: ["#4a0c35", "#e0457b"], প্রবাস: ["#06323d", "#0aa2b8"], প্রযুক্তি: ["#101a3d", "#4f6bff"], জীবনযাপন: ["#3d1f06", "#e07a2a"], মতামত: ["#222", "#666"] };
  const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const fonts = () => Promise.all(["900 40px 'Noto Serif Bengali'", "800 40px 'Noto Serif Bengali'", "700 30px 'Hind Siliguri'", "500 30px 'Hind Siliguri'"].map((f) => document.fonts.load(f, "বাংলা"))).catch(() => {});
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/), lines = [];
    let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  function cover(ctx, im, x, y, w, h) {
    const s = Math.max(w / im.width, h / im.height), sw = w / s, sh = h / s;
    ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h);
  }
  async function watermark(ctx, W, H) {
    const logo = await loadImg("/img/logo.png");
    const lw = W * 0.17, lh = lw * logo.height / logo.width;
    ctx.save(); ctx.globalAlpha = 0.92; ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = W * 0.01;
    ctx.drawImage(logo, W - lw - W * 0.02, H - lh - H * 0.03, lw, lh); ctx.restore();
    ctx.save(); ctx.font = `600 ${Math.round(W * 0.013)}px 'Hind Siliguri'`; ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.textAlign = "right"; ctx.shadowColor = "#000"; ctx.shadowBlur = 6;
    ctx.fillText("banglatimeline.com", W - W * 0.02, H - H * 0.012); ctx.restore();
  }
  // resize + watermark an uploaded image → Blob (webp)
  async function watermarkFile(file, maxW = 1600) {
    await fonts();
    const im = await loadImg(URL.createObjectURL(file));
    const W = Math.min(maxW, im.width), H = Math.round(im.height * W / im.width);
    const c = Object.assign(document.createElement("canvas"), { width: W, height: H }), ctx = c.getContext("2d");
    ctx.drawImage(im, 0, 0, W, H);
    await watermark(ctx, W, H);
    return new Promise((ok) => c.toBlob(ok, "image/webp", 0.86));
  }
  // text-based thumbnail (1600×900) for news without a photo
  async function textThumb(title, cat, date) {
    await fonts();
    const W = 1600, H = 900, c = Object.assign(document.createElement("canvas"), { width: W, height: H }), ctx = c.getContext("2d");
    const [a, b] = CAT_COLORS[cat] || ["#14161b", "#c8102e"];
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, a); g.addColorStop(1, "#08090c"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.07; ctx.fillStyle = "#fff";
    for (let x = -H; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.lineTo(x + H + 14, H); ctx.lineTo(x + 14, 0); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = b; ctx.fillRect(0, 0, 22, H);
    ctx.font = "800 120px 'Noto Serif Bengali'"; ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillText("সংবাদ", W - 520, 200);
    ctx.fillStyle = b; ctx.fillRect(110, 140, ctx.measureText ? 0 : 0, 0);
    ctx.font = "700 44px 'Hind Siliguri'"; const cw = ctx.measureText(cat).width + 60;
    ctx.fillStyle = b; ctx.fillRect(110, 130, cw, 74); ctx.fillStyle = "#fff"; ctx.fillText(cat, 140, 182);
    let size = 96, lines;
    do { ctx.font = `900 ${size}px 'Noto Serif Bengali'`; lines = wrap(ctx, title, W - 260); size -= 6; } while (lines.length > 4 && size > 50);
    const lh = size * 1.42, top = 290 + Math.max(0, (4 - lines.length) * lh * 0.35);
    ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.4)"; ctx.shadowBlur = 20;
    lines.forEach((l, i) => ctx.fillText(l, 110, top + i * lh));
    ctx.shadowBlur = 0; ctx.font = "500 36px 'Hind Siliguri'"; ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillText(date || "", 110, H - 70);
    await watermark(ctx, W, H);
    return new Promise((ok) => c.toBlob(ok, "image/webp", 0.9));
  }
  window.BTL = { loadImg, fonts, wrap, cover, watermark, watermarkFile, textThumb, CAT_COLORS };
})();
