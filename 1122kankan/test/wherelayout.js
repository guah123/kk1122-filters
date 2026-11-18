// v=261116x where layout check: 7 scenes at 390x844 dsf2 — desc collapsed/expanded screenshots, filter stack vs HUD/header/done-bar overlap.
// node test/wherelayout.js → screenshots in ../verify/where/, prints per-scene JSON, exit 1 on overlap
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const SITE = path.join(__dirname, '..'); const OUT = path.join(SITE, '..', 'verify', 'where'); fs.mkdirSync(OUT, { recursive: true });
const SC = [[5, 'park'], [7, 'escalator'], [17, 'bridge'], [19, 'bookstore'], [23, 'office'], [25, 'fireworks'], [27, 'newyork']];
const PORT = 8100 + Math.floor(Math.random() * 90); const sleep = ms => new Promise(r => setTimeout(r, ms));
const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch(); let bad = 0;
  for (const [n, id] of SC) {
    for (const done of [false, true]) {
      const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto(`http://127.0.0.1:${PORT}/?step=${n}&test=1`); await sleep(600);
      if (done) { await p.evaluate(n => { const s = DAYOF.debug.state(); s.found = s.found || {}; s.found[n] = { sec: 12, hints: 0 }; DAYOF.debug.goto(n === 5 ? 6 : 5); }, n); await sleep(400); await p.evaluate(n => DAYOF.debug.goto(n), n); await sleep(1400); }
      else { await p.waitForSelector('.where-intro-btn'); await p.click('.where-intro-btn'); await sleep(1100); }
      const rects = await p.evaluate(() => {
        const R = s => [...document.querySelectorAll(s)].filter(e => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; }).map(e => { const r = e.getBoundingClientRect(); return { s: e.className.baseVal != null ? e.className.baseVal : e.className, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(r => r.w && r.h);
        return { head: R('.page-where.is-in .where-head, .page-where:not(.is-out) .where-head')[0], h1: R('.page-where .where-head h1')[0], chip: R('.page-where .where-chip')[0], desc: R('.page-where .where-desc')[0], toggle: R('.page-where .where-desc-toggle')[0],
          stack: R('.page-where .filter-stack')[0], fbtn: R('.page-where .filter-stack .round-btn'), hud: R('.page-where .where-hud-r .where-btn, .page-where .where-map, .page-where .where-hint.show, .page-where .where-skip.show'), doneBar: R('.page-where .where-done')[0], back: R('.step-no')[0],
          labels: R('.page-where .filter-stack .fs-label').length };
      });
      const issues = [];
      for (const f of rects.fbtn || []) { for (const h of rects.hud) if (hit(f, h)) issues.push('btn×' + h.s); if (hit(f, rects.doneBar)) issues.push('btn×done'); if (hit(f, rects.head)) issues.push('btn×head'); if (f.x + f.w > 390 || f.x < 0) issues.push('btn offscreen'); }
      if (rects.back) for (const k of ['h1', 'chip', 'desc', 'toggle']) if (hit(rects.back, rects[k])) issues.push('back×' + k);
      const tag = String(n).padStart(2, '0') + '-' + id + (done ? '-done' : '');
      await p.screenshot({ path: path.join(OUT, tag + '.png') });
      let expanded = null;
      if (!done) { const t = await p.$('.page-where .where-desc-toggle'); if (t && await t.isVisible()) { await t.click(); await sleep(350); await p.screenshot({ path: path.join(OUT, tag + '-desc.png') }); expanded = await p.evaluate(() => { const d = document.querySelector('.page-where .where-desc'); const r = d.getBoundingClientRect(); return { h: Math.round(r.height), bottom: Math.round(r.bottom), clipped: d.scrollHeight > d.clientHeight + 2 }; }); await t.click(); await sleep(200); } }
      const res = { n, id, done, stackBtns: (rects.fbtn || []).length, labels: rects.labels, head: rects.head && rects.head.h, collapsedDescH: rects.desc && rects.desc.h, toggle: !!rects.toggle, expanded, issues, errs };
      console.log(JSON.stringify(res)); if (issues.length || errs.length) bad++;
      await c.close();
    }
  }
  await b.close(); srv.kill(); process.exit(bad ? 1 : 0);
})();
