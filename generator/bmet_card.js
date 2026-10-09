/* BMET report card — one Bengali canvas renderer shared by the probashiinfo dashboard
   (snippet #15, copied between the @CARD markers) and the article featured image
   (bmet_report.py renders it in headless Chrome). Keep both copies identical.
   o = {kind:'আজকের বিএমইটি রিপোর্ট', period:'৮ অক্টোবর ২০২৬', t, f, nc, avg?, cmp?, rows:[[name,n]], rowsTitle} */
/*@CARD*/
function bmCard(cv, o) {
	var W = cv.width, H = cv.height, x = cv.getContext('2d'), wide = W > H;
	var bn = function (s) { return String(s).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
	var num = function (n) { return bn(Math.round(n).toLocaleString('en-IN')); };
	var HF = '"Anek Bangla","Hind Siliguri","Noto Sans Bengali",sans-serif', TF = '"Hind Siliguri","Anek Bangla","Noto Sans Bengali",sans-serif';
	function rr(X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
	function txt(s, X, Y, font, col, al) { x.font = font; x.fillStyle = col; x.textAlign = al || 'left'; x.fillText(s, X, Y); }
	function fit(s, font, max) { x.font = font; while (s.length > 3 && x.measureText(s).width > max) s = s.slice(0, -2) + '…'; return s; }
	// background
	var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#061f4d'); g.addColorStop(.55, '#0a3f97'); g.addColorStop(1, '#0b56c4');
	x.fillStyle = g; x.fillRect(0, 0, W, H);
	var rg = x.createRadialGradient(W * .92, H * .02, 0, W * .92, H * .02, W * .6); rg.addColorStop(0, 'rgba(34,197,94,.45)'); rg.addColorStop(1, 'rgba(34,197,94,0)');
	x.fillStyle = rg; x.fillRect(0, 0, W, H);
	x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 2;
	for (var i = 0; i < 9; i++) { x.beginPath(); x.arc(W * .95, H * .05, 90 + i * 70, 0, Math.PI * 2); x.stroke(); }
	x.fillStyle = '#22c55e'; x.fillRect(0, 0, W, wide ? 10 : 14);
	var P = wide ? 48 : 64, s = wide ? 1 : 1.3;
	// brand row
	x.fillStyle = '#22c55e'; x.beginPath(); x.arc(P + 14 * s, (wide ? 52 : 84), 14 * s, 0, Math.PI * 2); x.fill();
	txt('প্রবাসী ইনফো', P + 38 * s, (wide ? 62 : 97), '700 ' + Math.round(30 * s) + 'px ' + HF, '#fff');
	var pill = 'তথ্যসূত্র: OEP · BMET'; x.font = '600 ' + Math.round(19 * s) + 'px ' + TF; var pw = x.measureText(pill).width + 34 * s;
	rr(W - P - pw, (wide ? 34 : 60), pw, 38 * s, 19 * s); x.fillStyle = 'rgba(255,255,255,.13)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.5; x.stroke();
	txt(pill, W - P - pw / 2, (wide ? 34 : 60) + 26 * s, '600 ' + Math.round(19 * s) + 'px ' + TF, '#e6f0ff', 'center');
	var L = wide ? W * .5 : W - 2 * P, y = wide ? 128 : 205;
	// headline
	var hs = wide ? 40 : 66; x.font = '800 ' + hs + 'px ' + HF; while (hs > 22 && x.measureText(o.kind).width > (wide ? L : W - 2 * P)) { hs -= 2; x.font = '800 ' + hs + 'px ' + HF; }
	txt(o.kind, P, y, '800 ' + hs + 'px ' + HF, '#fff'); y += wide ? 40 : 66;
	txt(o.period, P, y, '600 ' + Math.round(wide ? 24 : 38) + 'px ' + TF, '#bcd3fb'); y += wide ? 26 : 44;
	// big number panel
	var bh = wide ? 210 : 300; rr(P, y, L, bh, 26 * s); x.fillStyle = '#fff'; x.fill();
	txt('মোট বহির্গমন ছাড়পত্র (স্মার্ট কার্ড)', P + 28 * s, y + (wide ? 42 : 62), '600 ' + Math.round(wide ? 21 : 30) + 'px ' + TF, '#4a5d7d');
	x.font = '800 ' + (wide ? 92 : 150) + 'px ' + HF; var bt = num(o.t), bw2 = x.measureText(bt).width;
	txt(bt, P + 26 * s, y + (wide ? 132 : 190), '800 ' + (wide ? 92 : 150) + 'px ' + HF, '#0b3f97');
	txt('জন', P + 40 * s + bw2, y + (wide ? 132 : 190), '700 ' + (wide ? 34 : 54) + 'px ' + HF, '#16a34a');
	var chips = [bn(o.nc) + 'টি দেশ', 'নারী ' + num(o.f) + ' জন']; if (o.avg) chips.push('দৈনিক গড় ' + num(o.avg)); if (o.cmp) chips.push(o.cmp);
	var cx = P + 26 * s, cy = y + bh - (wide ? 50 : 74), cf = '600 ' + Math.round(wide ? 17 : 26) + 'px ' + TF;
	chips.forEach(function (c, k) { x.font = cf; var w = x.measureText(c).width + 26 * s; if (cx + w > P + L - 16) return; rr(cx, cy, w, (wide ? 34 : 50), (wide ? 17 : 25)); var up = c.indexOf('▲') >= 0, dn = c.indexOf('▼') >= 0; x.fillStyle = up ? '#dcfce7' : dn ? '#fee2e2' : '#eef4ff'; x.fill(); txt(c, cx + w / 2, cy + (wide ? 23 : 34), cf, up ? '#166534' : dn ? '#991b1b' : '#0b3f97', 'center'); cx += w + 10 * s; });
	y += bh + (wide ? 0 : 34);
	// rows panel
	var RX = wide ? W * .5 + P * .9 : P, RY = wide ? 112 : y, RW = wide ? W - RX - P : L, n = wide ? 6 : 7, rh = wide ? 54 : 56;
	var RH = (wide ? 52 : 74) + n * rh + 14;
	rr(RX, RY, RW, RH, 26 * s); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.stroke();
	txt(o.rowsTitle || 'শীর্ষ গন্তব্য দেশ', RX + 24 * s, RY + (wide ? 36 : 52), '700 ' + Math.round(wide ? 22 : 34) + 'px ' + HF, '#fff');
	var rows = (o.rows || []).slice(0, n), mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
	var nameW = wide ? 128 : 230, numW = wide ? 72 : 120, barX = RX + 24 * s + (wide ? 34 : 54) + nameW, barW = RW - (barX - RX) - numW - 20 * s;
	rows.forEach(function (r, k) {
		var yy = RY + (wide ? 58 : 84) + k * rh, ff = '600 ' + Math.round(wide ? 19 : 29) + 'px ' + TF;
		x.fillStyle = k === 0 ? '#22c55e' : 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(RX + 24 * s + (wide ? 13 : 20), yy + rh / 2 - 4, wide ? 13 : 20, 0, Math.PI * 2); x.fill();
		txt(bn(k + 1), RX + 24 * s + (wide ? 13 : 20), yy + rh / 2 + (wide ? 2 : 5), '700 ' + Math.round(wide ? 15 : 22) + 'px ' + HF, '#fff', 'center');
		txt(fit(r[0], ff, nameW - 8), RX + 24 * s + (wide ? 34 : 54), yy + rh / 2 + (wide ? 2 : 5), ff, '#fff');
		rr(barX, yy + rh / 2 - (wide ? 10 : 13), barW, wide ? 14 : 20, wide ? 7 : 10); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill();
		var bg = x.createLinearGradient(barX, 0, barX + barW, 0); bg.addColorStop(0, '#60a5fa'); bg.addColorStop(1, '#22c55e');
		rr(barX, yy + rh / 2 - (wide ? 10 : 13), Math.max(wide ? 14 : 20, barW * r[1] / mx), wide ? 14 : 20, wide ? 7 : 10); x.fillStyle = bg; x.fill();
		txt(num(r[1]), RX + RW - 22 * s, yy + rh / 2 + (wide ? 2 : 5), '700 ' + Math.round(wide ? 20 : 30) + 'px ' + HF, '#fff', 'right');
	});
	// footer: source, website, generated time
	var now = new Date(), tz = { timeZone: 'Asia/Dhaka' };
	var hh = +now.toLocaleString('en-GB', Object.assign({ hour: 'numeric', hour12: false }, tz)), mm = now.toLocaleString('en-GB', Object.assign({ minute: '2-digit' }, tz));
	var BM = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
	var dd = now.toLocaleString('en-GB', Object.assign({ day: 'numeric' }, tz)), mo = +now.toLocaleString('en-GB', Object.assign({ month: 'numeric' }, tz)), yr = now.toLocaleString('en-GB', Object.assign({ year: 'numeric' }, tz));
	var part = hh < 5 ? 'রাত' : hh < 12 ? 'সকাল' : hh < 15 ? 'দুপুর' : hh < 18 ? 'বিকাল' : hh < 20 ? 'সন্ধ্যা' : 'রাত';
	var stamp = 'তৈরি: ' + bn(dd) + ' ' + BM[mo - 1] + ' ' + bn(yr) + ', ' + part + ' ' + bn(((hh + 11) % 12) + 1) + ':' + bn(('0' + mm).slice(-2));
	var fy = H - (wide ? 62 : 150), ff2 = '500 ' + Math.round(wide ? 16 : 25) + 'px ' + TF;
	x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(P, fy - (wide ? 24 : 40), W - 2 * P, 1.5);
	if (wide) {
		txt('তথ্যসূত্র: বিএমইটি / ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (oep.gov.bd)', P, fy, ff2, '#bcd3fb');
		txt(stamp + ' · স্বাধীন তথ্যসেবা, সরকারি প্রকাশনা নয়', P, fy + 28, ff2, '#bcd3fb');
		txt('probashiinfo.com/bmet-report', W - P, fy + 14, '700 22px ' + HF, '#fff', 'right');
	} else {
		txt('তথ্যসূত্র: বিএমইটি / ওভারসিজ এমপ্লয়মেন্ট প্ল্যাটফর্ম (oep.gov.bd)', P, fy, ff2, '#bcd3fb');
		txt(stamp + ' · রিপোর্ট তৈরি: প্রবাসী ইনফো (স্বাধীন তথ্যসেবা)', P, fy + 38, ff2, '#bcd3fb');
		rr(P, fy + 62, W - 2 * P, 58, 29); x.fillStyle = '#22c55e'; x.fill();
		txt('🌐 লাইভ রিপোর্ট: probashiinfo.com/bmet-report', W / 2, fy + 101, '700 29px ' + HF, '#053b1d', 'center');
	}
}
/*@CARD-END*/
