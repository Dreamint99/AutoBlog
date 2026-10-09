/* BMET report card — one Bengali canvas renderer shared by the probashiinfo dashboard
   (snippet #15, copied between the @CARD markers) and the article featured image
   (bmet_report.py renders it in headless Chrome). Keep both copies identical.
   o = {kind:'৮ অক্টোবর ২০২৬ এর বিএমইটি রিপোর্ট', period:'…', t, f, nc, avg?, cmp?, rows:[[name,n]], rowsTitle}
   Sizes: 1200×630 (wide, featured image) or 1080 wide × 1080 / 1350 / 1920 (social). The canvas size is
   fixed by the caller; every country is fitted in (top 5–7 as bars, the rest in a dense grid, and a
   "+ আরও X দেশ" cell only when even that is full — the caption always has the full list). */
/*@CARD*/
/* Height of the "full" card (1080 wide): tall enough that every country is listed at full size. */
function bmCardH(o) { var rest = Math.max(0, (o.rows || []).length - 7); return Math.max(1350, 878 + (rest ? 44 + Math.ceil(rest / 3) * 46 + 10 + 14 : 0) + 140); }
function bmCard(cv, o) {
	var W = cv.width, H = cv.height, x = cv.getContext('2d'), wide = W > H;
	var bn = function (s) { return String(s).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
	var num = function (n) { return bn(Math.round(n).toLocaleString('en-IN')); };
	var HF = '"Anek Bangla","Hind Siliguri","Noto Sans Bengali",sans-serif', TF = '"Hind Siliguri","Anek Bangla","Noto Sans Bengali",sans-serif';
	function rr(X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
	function txt(s, X, Y, font, col, al) { x.font = font; x.fillStyle = col; x.textAlign = al || 'left'; x.fillText(s, X, Y); }
	function fit(s, font, max) { x.font = font; while (s.length > 3 && x.measureText(s).width > max) s = s.slice(0, -2) + '…'; return s; }
	/* QR code for https://probashiinfo.com/bmet-report/ (29×29, level M), pre-computed: hex of row-major bits */
	var QRN = 29, QRH = 'feb47bfc14a1106e8788bb75d385dba4792ec1355907faaaafe017ee00b7364258cfc7bc46faa86da88e5c132505067a6aeb1edd2b4ef69ca762ca28add3c9aa4ba684618873d1e24568cefe0067547ffa91eb5059351bba5bcfa5d43fe66eb48e4b040f5dafec11d50';
	function qr(X, Y, S) {
		rr(X, Y, S, S, S * .1); x.fillStyle = '#fff'; x.fill();
		var m = S / (QRN + 6), pad = m * 3; x.fillStyle = '#061f4d';
		for (var i = 0; i < QRN * QRN; i++) { if ((parseInt(QRH[i >> 2], 16) >> (3 - (i & 3))) & 1) x.fillRect(X + pad + (i % QRN) * m, Y + pad + Math.floor(i / QRN) * m, m + .6, m + .6); }
	}
	function brand(X, cy, hgt) { // logo on a white pill; falls back to text while the image is not ready
		var im = o.logo;
		if (im && im.complete && im.naturalWidth) {
			var lh = hgt - 14, lw = im.naturalWidth * lh / im.naturalHeight;
			rr(X, cy - hgt / 2, lw + 28, hgt, hgt / 2); x.fillStyle = '#fff'; x.fill();
			x.drawImage(im, X + 14, cy - lh / 2, lw, lh); return;
		}
		x.fillStyle = '#22c55e'; x.beginPath(); x.arc(X + hgt * .3, cy, hgt * .3, 0, Math.PI * 2); x.fill();
		txt('প্রবাসী ইনফো', X + hgt * .75, cy + hgt * .22, '700 ' + Math.round(hgt * .62) + 'px ' + HF, '#fff');
	}
	function chipCol(c) { var up = c.indexOf('▲') >= 0, dn = c.indexOf('▼') >= 0; return up ? ['#dcfce7', '#166534'] : dn ? ['#fee2e2', '#991b1b'] : ['#eef4ff', '#0b3f97']; }
	function bars(rows, RX, RY, RW, rh, head, fs, nameW, numW, title) {
		var RH = head + rows.length * rh + 12, mx = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
		rr(RX, RY, RW, RH, 24); x.fillStyle = 'rgba(255,255,255,.1)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1.5; x.stroke();
		txt(title, RX + 22, RY + head * .68, '700 ' + Math.round(fs * 1.1) + 'px ' + HF, '#fff');
		var cr = Math.round(fs * .62), barX = RX + 22 + cr * 2 + 12 + nameW, barW = RW - (barX - RX) - numW - 22;
		rows.forEach(function (r, k) {
			var cy = RY + head + k * rh + rh / 2, ff = '600 ' + fs + 'px ' + TF;
			x.fillStyle = k === 0 ? '#22c55e' : 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(RX + 22 + cr, cy, cr, 0, Math.PI * 2); x.fill();
			txt(bn(k + 1), RX + 22 + cr, cy + fs * .28, '700 ' + Math.round(fs * .72) + 'px ' + HF, '#fff', 'center');
			txt(fit(r[0], ff, nameW - 8), RX + 22 + cr * 2 + 12, cy + fs * .33, ff, '#fff');
			var bh2 = Math.round(fs * .62); rr(barX, cy - bh2 / 2, barW, bh2, bh2 / 2); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill();
			var bg = x.createLinearGradient(barX, 0, barX + barW, 0); bg.addColorStop(0, '#60a5fa'); bg.addColorStop(1, '#22c55e');
			rr(barX, cy - bh2 / 2, Math.max(bh2, barW * r[1] / mx), bh2, bh2 / 2); x.fillStyle = bg; x.fill();
			txt(num(r[1]), RX + RW - 22, cy + fs * .33, '700 ' + Math.round(fs * 1.04) + 'px ' + HF, '#fff', 'right');
		});
		return RH;
	}
	// background
	var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#061f4d'); g.addColorStop(.55, '#0a3f97'); g.addColorStop(1, '#0b56c4');
	x.fillStyle = g; x.fillRect(0, 0, W, H);
	var rg = x.createRadialGradient(W * .92, H * .02, 0, W * .92, H * .02, W * .6); rg.addColorStop(0, 'rgba(34,197,94,.45)'); rg.addColorStop(1, 'rgba(34,197,94,0)');
	x.fillStyle = rg; x.fillRect(0, 0, W, H);
	x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 2;
	for (var i = 0; i < 9; i++) { x.beginPath(); x.arc(W * .95, H * .05, 90 + i * 70, 0, Math.PI * 2); x.stroke(); }
	x.fillStyle = '#22c55e'; x.fillRect(0, 0, W, wide ? 10 : 12);
	var P = wide ? 48 : 56, rows = o.rows || [], pill = 'তথ্যসূত্র: OEP · BMET';
	// brand row
	var by = wide ? 52 : 66, bs = wide ? 1 : 1.12;
	brand(P, by, wide ? 50 : 58);
	x.font = '600 ' + Math.round(19 * bs) + 'px ' + TF; var pw = x.measureText(pill).width + 34 * bs;
	rr(W - P - pw, by - 19 * bs, pw, 38 * bs, 19 * bs); x.fillStyle = 'rgba(255,255,255,.13)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.5; x.stroke();
	txt(pill, W - P - pw / 2, by + 7 * bs, '600 ' + Math.round(19 * bs) + 'px ' + TF, '#e6f0ff', 'center');
	var chips = [bn(o.nc) + 'টি দেশ', 'নারী ' + num(o.f) + ' জন']; if (o.avg) chips.push('দৈনিক গড় ' + num(o.avg)); if (o.cmp) chips.push(o.cmp);

	if (wide) {
		var L = W * .5, y = 128;
		var hs = 40; x.font = '800 ' + hs + 'px ' + HF; while (hs > 22 && x.measureText(o.kind).width > L) { hs -= 2; x.font = '800 ' + hs + 'px ' + HF; }
		txt(o.kind, P, y, '800 ' + hs + 'px ' + HF, '#fff'); y += 40;
		txt(o.period, P, y, '600 24px ' + TF, '#bcd3fb'); y += 26;
		rr(P, y, L, 210, 26); x.fillStyle = '#fff'; x.fill();
		txt('মোট বহির্গমন ছাড়পত্র (স্মার্ট কার্ড)', P + 28, y + 42, '600 21px ' + TF, '#4a5d7d');
		x.font = '800 92px ' + HF; var bt = num(o.t), bw2 = x.measureText(bt).width;
		txt(bt, P + 26, y + 132, '800 92px ' + HF, '#0b3f97'); txt('জন', P + 40 + bw2, y + 132, '700 34px ' + HF, '#16a34a');
		var cx = P + 26, cy = y + 160, cf = '600 17px ' + TF;
		chips.forEach(function (c) { x.font = cf; var w = x.measureText(c).width + 26; if (cx + w > P + L - 16) return; var cc = chipCol(c); rr(cx, cy, w, 34, 17); x.fillStyle = cc[0]; x.fill(); txt(c, cx + w / 2, cy + 23, cf, cc[1], 'center'); cx += w + 10; });
		var RX = W * .5 + P * .9, RW = W - RX - P, top = rows.slice(0, 6);
		var RH = bars(top, RX, 112, RW, 54, 58, 19, 128, 72, o.rowsTitle || 'শীর্ষ গন্তব্য দেশ');
		if (rows.length > 6) txt('+ আরও ' + bn(rows.length - 6) + 'টি দেশ — পূর্ণ তালিকা ওয়েবসাইটে', RX + RW / 2, 112 + RH + 26, '600 17px ' + TF, '#d6e4fb', 'center');
	} else {
		var L2 = W - 2 * P, y2 = 150, big = H >= 1300;
		var hs2 = big ? 58 : 52; x.font = '800 ' + hs2 + 'px ' + HF; while (hs2 > 26 && x.measureText(o.kind).width > L2) { hs2 -= 2; x.font = '800 ' + hs2 + 'px ' + HF; }
		txt(o.kind, P, y2, '800 ' + hs2 + 'px ' + HF, '#fff'); y2 += big ? 50 : 44;
		txt(fit(o.period, '600 27px ' + TF, L2), P, y2, '600 ' + (big ? 30 : 27) + 'px ' + TF, '#bcd3fb'); y2 += big ? 30 : 22;
		// number panel: big number on the left, chips stacked on the right
		var ph = big ? 200 : 170; rr(P, y2, L2, ph, 26); x.fillStyle = '#fff'; x.fill();
		txt('মোট বহির্গমন ছাড়পত্র (স্মার্ট কার্ড)', P + 26, y2 + 40, '600 ' + (big ? 25 : 23) + 'px ' + TF, '#4a5d7d');
		var nf = big ? 118 : 100; x.font = '800 ' + nf + 'px ' + HF; var bt2 = num(o.t), bw3 = x.measureText(bt2).width;
		txt(bt2, P + 24, y2 + ph - (big ? 34 : 30), '800 ' + nf + 'px ' + HF, '#0b3f97');
		txt('জন', P + 38 + bw3, y2 + ph - (big ? 34 : 30), '700 ' + Math.round(nf * .4) + 'px ' + HF, '#16a34a');
		var cf2 = '600 ' + (big ? 22 : 20) + 'px ' + TF, chh = big ? 40 : 36, cyy = y2 + (ph - chips.length * (chh + 8) + 8) / 2;
		chips.forEach(function (c) { x.font = cf2; var w = x.measureText(c).width + 28, cc = chipCol(c); rr(P + L2 - 24 - w, cyy, w, chh, chh / 2); x.fillStyle = cc[0]; x.fill(); txt(c, P + L2 - 24 - w / 2, cyy + chh * .67, cf2, cc[1], 'center'); cyy += chh + 8; });
		y2 += ph + 16;
		// top countries as bars
		var nb = Math.min(rows.length, big ? 7 : 5), rh2 = big ? 50 : 42, LY = H - 140;
		var RH2 = bars(rows.slice(0, nb), P, y2, L2, rh2, big ? 56 : 50, big ? 26 : 23, big ? 240 : 210, big ? 110 : 96, o.rowsTitle || 'শীর্ষ গন্তব্য দেশ');
		y2 += RH2 + 14;
		// every other country in a dense grid
		var rest = rows.slice(nb);
		if (rest.length) {
			var cols = H > 1100 ? 3 : 4, avail = LY - 14 - y2, head = 44, need = Math.ceil(rest.length / cols);
			var maxRows = Math.max(0, Math.floor((avail - head - 10) / 26)), use = Math.min(need, maxRows);
			if (use > 0) {
				var rowH = Math.min(46, (avail - head - 10) / use), cap = use * cols, items = rest.length > cap ? rest.slice(0, cap - 1) : rest;
				var GH = head + use * rowH + 10, cw = (L2 - 40) / cols, nfs = Math.round(Math.min(22, rowH * .58)), more = rest.length - items.length;
				rr(P, y2, L2, GH, 22); x.fillStyle = 'rgba(255,255,255,.08)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.16)'; x.lineWidth = 1.5; x.stroke();
				txt('অন্যান্য দেশ (' + bn(rest.length) + 'টি)', P + 22, y2 + 31, '700 24px ' + HF, '#fff');
				items.forEach(function (r, k) {
					var col = k % cols, row = Math.floor(k / cols), cx2 = P + 20 + col * cw, yy2 = y2 + head + row * rowH + rowH * .62, ff3 = '500 ' + nfs + 'px ' + TF;
					if (col) { x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(cx2 - 6, yy2 - nfs, 1.5, nfs * 1.3); }
					txt(bn(nb + k + 1) + '. ' + fit(r[0], ff3, cw - nfs * 3.4), cx2 + 4, yy2, ff3, '#e6f0ff');
					txt(num(r[1]), cx2 + cw - 14, yy2, '700 ' + (nfs + 1) + 'px ' + HF, '#86efac', 'right');
				});
				if (more > 0) { var k2 = items.length, cx3 = P + 20 + (k2 % cols) * cw, yy3 = y2 + head + Math.floor(k2 / cols) * rowH + rowH * .62; txt('+ আরও ' + bn(more) + 'টি দেশ', cx3 + 4, yy3, '700 ' + nfs + 'px ' + TF, '#fde68a'); }
			}
		}
	}
	// footer: source, generated time, website
	var pt = {}; try { new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (q) { pt[q.type] = q.value; }); } catch (e) {}
	if (!pt.hour) { var d0 = new Date(Date.now() + 6 * 36e5); pt = { year: d0.getUTCFullYear(), month: d0.getUTCMonth() + 1, day: d0.getUTCDate(), hour: d0.getUTCHours(), minute: ('0' + d0.getUTCMinutes()).slice(-2) }; } // Asia/Dhaka = UTC+6
	var hh = (+pt.hour) % 24, mm = ('0' + (+pt.minute)).slice(-2);
	var BM = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
	var part = hh < 5 ? 'রাত' : hh < 12 ? 'সকাল' : hh < 15 ? 'দুপুর' : hh < 18 ? 'বিকাল' : hh < 20 ? 'সন্ধ্যা' : 'রাত';
	var stamp = 'তৈরি: ' + bn(+pt.day) + ' ' + BM[(+pt.month) - 1] + ' ' + bn(pt.year) + ', ' + part + ' ' + bn(((hh + 11) % 12) + 1) + ':' + bn(mm);
	function line(t, X, Y, size, maxW, col, w8) { var f = size; x.font = (w8 || '500') + ' ' + f + 'px ' + TF; while (f > 12 && x.measureText(t).width > maxW) { f -= 1; x.font = (w8 || '500') + ' ' + f + 'px ' + TF; } txt(t, X, Y, (w8 || '500') + ' ' + f + 'px ' + TF, col); }
	if (wide) {
		var fy = H - 62, qs = 92, tw = W - 2 * P - qs - 300;
		x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(P, fy - 24, W - 2 * P, 1.5);
		line('তথ্যসূত্র: oep.gov.bd/reports/country-clearance · যাচাই করে নিন', P, fy, 16, tw, '#bcd3fb');
		line(stamp + ' · স্বাধীন তথ্যসেবা, সরকারি প্রকাশনা নয়', P, fy + 28, 16, tw, '#bcd3fb');
		txt('probashiinfo.com/bmet-report', W - P - qs - 14, fy + 8, '700 21px ' + HF, '#fff', 'right');
		txt('স্ক্যান করে লাইভ রিপোর্ট দেখুন →', W - P - qs - 14, fy + 32, '500 14px ' + TF, '#bcd3fb', 'right');
		qr(W - P - qs, H - qs - 10, qs);
	} else {
		var LY2 = H - 140, qs2 = 124, tw2 = W - 2 * P - qs2 - 20;
		x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(P, LY2, W - 2 * P, 1.5);
		line('তথ্যসূত্র: oep.gov.bd/reports/country-clearance · যাচাই করে নিন', P, LY2 + 30, 21, tw2, '#bcd3fb');
		line(stamp + ' · রিপোর্ট তৈরি: প্রবাসী ইনফো (স্বাধীন তথ্যসেবা)', P, LY2 + 58, 21, tw2, '#bcd3fb');
		rr(P, LY2 + 72, tw2, 50, 25); x.fillStyle = '#22c55e'; x.fill();
		var pf = 25; x.font = '700 ' + pf + 'px ' + HF; while (pf > 14 && x.measureText('🌐 লাইভ রিপোর্ট: probashiinfo.com/bmet-report').width > tw2 - 30) { pf--; x.font = '700 ' + pf + 'px ' + HF; }
		txt('🌐 লাইভ রিপোর্ট: probashiinfo.com/bmet-report', P + tw2 / 2, LY2 + 97 + pf * .35, '700 ' + pf + 'px ' + HF, '#053b1d', 'center');
		qr(W - P - qs2, LY2 + 8, qs2);
	}
}
/*@CARD-END*/
