/* lyricwrap.js — detect orphan/short-wrap lines on lyric pages.
   usage: node test/lyricwrap.js [baseUrl] [--shots dir]   (default http://localhost:8765)
   Reports every .lyr-line/.lyr-tl whose last visual line has <=3 chars (and the element wrapped). */
const { createRequire } = require('module');
const req = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = req('playwright');
const base = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'http://localhost:8765';
const si = process.argv.indexOf('--shots'); const shots = si > 0 ? process.argv[si + 1] : null;
const STEPS = [4,6,8,10,12,14,16,18,20,22,24,26,28,30,32], WIDTHS = [360,375,390,430], MAXTAIL = 3;
function probe(maxTail) {
  const out = [];
  document.querySelectorAll('.lyr-line,.lyr-tl').forEach(el => {
    if (!el.offsetParent) return;
    const r = document.createRange(), tops = [], t = el.textContent;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let tn; (tn = w.nextNode());) {
      const s = tn.textContent;
      for (let i = 0; i < s.length; i++) {
        if (/[\s\u2060]/.test(s[i])) continue;
        r.setStart(tn, i); r.setEnd(tn, i + 1);
        const rc = r.getClientRects()[0]; if (!rc) continue;
        const y = Math.round(rc.top);
        let ln = tops.find(L => Math.abs(L.y - y) < 6); if (!ln) { ln = { y, n: 0 }; tops.push(ln); }
        ln.n++;
      }
    }
    tops.sort((a, b) => a.y - b.y);
    if (tops.length > 1 && tops[tops.length - 1].n <= maxTail) out.push({ text: t, tail: tops[tops.length - 1].n, lines: tops.length });
  });
  return out;
}
(async () => {
  const b = await chromium.launch(); let total = 0; const per = {};
  for (const w of WIDTHS) {
    const c = await b.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2 });
    const p = await c.newPage(); per[w] = 0;
    for (const n of STEPS) {
      await p.goto(`${base}/index.html?step=${n}&test=1`);
      await p.waitForSelector('.lyr-line,.lyr-empty', { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(300);
      const hasTr = await p.evaluate(() => { const b = document.querySelector('.lyr-tbtn'); return !!b && !b.hidden; });
      for (const tr of hasTr ? [false, true] : [false]) {
        if (tr) await p.click('.lyr-tbtn');
        await p.waitForTimeout(150);
        const bad = await p.evaluate(probe, MAXTAIL);
        bad.forEach(x => console.log(`w${w} step${n}${tr ? '-tr' : ''} tail=${x.tail} lines=${x.lines} | ${x.text}`));
        per[w] += bad.length; total += bad.length;
        if (shots && w === 390) {
          const f = `${shots}/${String(n).padStart(2, '0')}${tr ? '-tr' : ''}.png`;
          await p.evaluate(() => { const s = document.querySelector('.lyr-scroll'); s.dataset.h = s.style.cssText; });
          const full = await p.evaluate(() => document.querySelector('.lyr-scroll').scrollHeight);
          await p.setViewportSize({ width: w, height: Math.min(full + 300, 9000) });
          await p.waitForTimeout(200);
          await p.screenshot({ path: f });
          await p.setViewportSize({ width: w, height: 844 });
        }
        if (tr) await p.click('.lyr-tbtn');
      }
    }
    await c.close();
  }
  console.log('SHORT WRAPS per width:', JSON.stringify(per), 'total', total);
  await b.close(); process.exit(total ? 1 : 0);
})();
