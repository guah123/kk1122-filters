// Scene screenshots: node test/scenes.js [suffix]  → ../screens/NN-scene[suffix].png
// Each 凱凱在哪裡 step, intro card dismissed, fully zoomed-out (default full view), 390×844.
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path');
const SUF = process.argv[2] || ''; const PORT = 8000 + Math.floor(Math.random() * 900);
const SHOTS = path.join(__dirname, '..', '..', 'screens');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 900));
  const b = await chromium.launch(); let bad = 0;
  for (const n of [5, 7, 17, 19, 23, 25, 27]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/?step=${n}&test=1`, { waitUntil: 'load' });
    await p.waitForSelector('.where-intro-btn', { timeout: 8000 }).catch(() => {});
    const btn = await p.$('.where-intro-btn'); if (btn) await btn.click();
    await p.waitForTimeout(1200);
    const nodes = await p.evaluate(() => document.querySelectorAll('svg *').length);
    await p.screenshot({ path: path.join(SHOTS, String(n).padStart(2, '0') + '-scene' + SUF + '.png') });
    if (n === 19) { // flip-camera view too
      const f = await p.$('.where-flip, [aria-label*="鏡頭"], button:has-text("更換前後鏡頭")'); if (f) { await f.click(); await p.waitForTimeout(1200); await p.screenshot({ path: path.join(SHOTS, '19-scene-selfie' + SUF + '.png') }); }
    }
    console.log(n, 'svgNodes', nodes, errs.length ? 'ERR ' + errs.join(' | ') : 'ok'); if (errs.length) bad++;
    await p.close();
  }
  await b.close(); srv.kill(); process.exit(bad ? 1 : 0);
})();
