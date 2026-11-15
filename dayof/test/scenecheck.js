// v7 scene check: per scene tap neutral spot (no bubble), each 不是我啦 hotspot (bubble), quokka (quiet surprise), Kai (found).
// node test/scenecheck.js → prints JSON + writes ../SCENES_V7.json
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const SITE = path.join(__dirname, '..'); const HB = JSON.parse(fs.readFileSync(path.join(SITE, 'data/scenes/hitboxes.json'), 'utf8'));
const SC = [[5, 'park', 's05-park.jpg'], [7, 'escalator', 's07-escalator.jpg'], [17, 'bridge', 's17-bridge.jpg'], [19, 'bookstore', 's19-moumoon.jpg'], [23, 'office', 's23-office.jpg'], [25, 'fireworks', 's25-fireworks.jpg'], [27, 'newyork', 's27-nyc.jpg']];
const PORT = 8500 + Math.floor(Math.random() * 400); const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad = (b, p) => { const w = b[2] - b[0], h = b[3] - b[1]; return [b[0] - w * p, b[1] - h * p, b[2] + w * p, b[3] + h * p]; };
const inside = (x, y, b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch(); const res = {};
  for (const [n, id, img] of SC) {
    const cfg = JSON.parse(fs.readFileSync(path.join(SITE, 'data/scenes', id + '.json'), 'utf8')); const hb = HB[img] || {};
    const hot = (cfg.hotspots || []).filter(h => (h.view || 'main') === 'main').map(h => [h.x, h.y, h.x + h.w, h.y + h.h]);
    const items = (cfg.bonus || []).filter(x => x.w != null && (x.view || 'main') === 'main').map(x => [x.x, x.y, x.x + x.w, x.y + x.h]);
    const avoid = [hb.kai && pad(hb.kai, 0.15), hb.quokka && pad(hb.quokka, 0.15), ...hot, ...items].filter(Boolean);
    let neutral = null; for (let yy = 0.4; yy <= 0.8 && !neutral; yy += 0.05) for (let xx = 0.3; xx <= 0.7; xx += 0.05) if (!avoid.some(a => inside(xx, yy, a))) { neutral = [xx, yy]; break; }
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/?step=${n}&test=1`); await p.waitForSelector('.where-intro-btn'); await p.click('.where-intro-btn'); await sleep(900);
    const r0 = []; const rect = () => p.evaluate(src => { const im = [...document.querySelectorAll('image')].find(i => (i.getAttribute('href') || '').endsWith(src)); const r = im.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }, img);
    const tapFrac = async (fx, fy) => { let q = await rect(); let x = q[0] + q[2] * fx, y = q[1] + q[3] * fy;
      if (x < 30 || x > 360 || y < 150 || y > 740) { const dx = 195 - x, dy = 450 - y; await p.mouse.move(195, 450); await p.mouse.down(); await p.mouse.move(195 + dx, 450 + dy, { steps: 10 }); await p.mouse.up(); await sleep(600); q = await rect(); x = q[0] + q[2] * fx; y = q[1] + q[3] * fy; }
      for (let k = 0; k < 3; k++) { // if an overlay (minimap, buttons, header) covers the spot, zoom in once and re-centre, like a player would
        const covered = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !(e && e.closest('svg')); }, [x, y]); if (!covered) break;
        await p.click('.where-zoom >> nth=0'); await sleep(700); q = await rect(); x = q[0] + q[2] * fx; y = q[1] + q[3] * fy;
        const dx = 195 - x, dy = 450 - y; await p.mouse.move(195, 450); await p.mouse.down(); await p.mouse.move(195 + dx, 450 + dy, { steps: 10 }); await p.mouse.up(); await sleep(600); q = await rect(); x = q[0] + q[2] * fx; y = q[1] + q[3] * fy; }
      r0.push([Math.round(x), Math.round(y)]);
      await p.evaluate(() => document.querySelectorAll('.where-bubble').forEach(e => e.remove())); await p.mouse.click(x, y); await sleep(450);
      const r = await p.evaluate(() => ({ bubble: [...document.querySelectorAll('.where-bubble')].map(e => e.textContent).join('|') })); await sleep(500); return r; };
    const r = { kai: hb.kai, quokka: hb.quokka || null, hotspots: (cfg.hotspots || []).map(h => [h.view || 'main', +h.x.toFixed(3), +h.y.toFixed(3), +h.w.toFixed(3), +h.h.toFixed(3)]), item: (cfg.bonus || []).filter(x => x.w != null).map(x => x.label) };
    r.neutral = neutral && { at: neutral.map(v => +v.toFixed(2)), ...(await tapFrac(...neutral)) }; r.neutralOk = !!(r.neutral && !/不是我/.test(r.neutral.bubble));
    r.hot = []; for (const h of hot) { const t = await tapFrac((h[0] + h[2]) / 2, (h[1] + h[3]) / 2); r.hot.push(/不是我啦/.test(t.bubble)); }
    if (hb.quokka) { const t = await tapFrac((hb.quokka[0] + hb.quokka[2]) / 2, (hb.quokka[1] + hb.quokka[3]) / 2); const f = await p.evaluate(n => ((DAYOF.debug.state().found || {})[n] || {}), n); r.quokkaOk = !!(f.sister || (f.bonus && f.bonus.sister)) && !/不是我/.test(t.bubble); }
    if (n === 19) { await p.click('.where-flip'); await sleep(3500); } else { await tapFrac((hb.kai[0] + hb.kai[2]) / 2, (hb.kai[1] + hb.kai[3]) / 2); await sleep(2200); }
    r.kaiFound = await p.evaluate(() => /找到凱凱/.test(document.body.innerText)); r.errors = errs;
    res[n] = r; console.log(n, id, JSON.stringify({ neutralOk: r.neutralOk, hot: r.hot, quokkaOk: r.quokkaOk, kaiFound: r.kaiFound, errs: errs.length })); await p.close();
  }
  await b.close(); srv.kill(); fs.writeFileSync(path.join(SITE, '..', 'SCENES_V7.json'), JSON.stringify(res, null, 1));
})();
