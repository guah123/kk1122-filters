// v=261116x final check: 390×844 dsf2, ?test=1 — console errors, non-200 assets, back button 2–34, key screenshots → ../verify/final/
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, '..', '..', 'verify', 'y', 'final'); fs.mkdirSync(OUT, { recursive: true });
const PORT = 8600 + Math.floor(Math.random() * 300); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await c.newPage();
  const errs = [], bad = [], vers = new Set();
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  p.on('response', r => { const u = r.url(); if (!u.includes('127.0.0.1')) return; if (r.status() >= 400) bad.push(r.status() + ' ' + u.split(PORT)[1]); const m = u.match(/[?&]v=([^&]+)/); if (m) vers.add(m[1]); });
  const back = [];
  for (let n = 1; n <= 34; n++) {
    await p.goto(`http://127.0.0.1:${PORT}/?step=${n}&test=1`); await sleep(n === 33 || n === 34 ? 1500 : 700);
    if ([1, 2, 3, 8, 9, 10, 13, 15, 16, 21, 28, 29, 30, 31, 32, 34].includes(n)) await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '.png') });
    if ([5, 7, 17, 19, 23, 25, 27].includes(n)) { const bt = await p.$('.where-intro-btn'); if (bt) { await bt.click(); await sleep(700); } const ex = await p.$('text=展開'); if (ex) { await ex.click(); await sleep(400); } await p.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-story.png') }); }
    if (n === 34) { const t = await p.$('.eg-toggle'); if (t) { await t.click(); await sleep(500); await p.screenshot({ path: path.join(OUT, '34-expanded.png') }); } }
    const info = await p.evaluate(() => { const s = document.querySelector('.step-no'); if (!s) return null; const r = s.getBoundingClientRect(); return { tag: s.tagName, txt: s.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), pe: getComputedStyle(s).pointerEvents, vis: getComputedStyle(s).display !== 'none' && getComputedStyle(s).visibility !== 'hidden' }; });
    if (n >= 2 && info && info.vis) { await p.click('.step-no'); await sleep(500); const st = await p.evaluate(() => DAYOF.debug.state().step); back.push([n, st === n - 1, info.txt, info.w + 'x' + info.h]); } else back.push([n, n === 1 ? 'n/a' : false, info && info.txt, info && info.pe]);
  }
  console.log('back', JSON.stringify(back.filter(x => x[1] !== true)));
  console.log('versions', [...vers].join(','), '| bad', bad.length, bad.slice(0, 5).join(' ; '), '| console errors', errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); srv.kill();
})();
