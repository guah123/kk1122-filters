// Tap the center of each painted Kai / quokka box (from data/scenes/hitboxes.json) in the cover view → expect found / sparkle.
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const HB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'scenes', 'hitboxes.json'), 'utf8'));
const SC = { 5: 's05-park.jpg', 7: 's07-escalator.jpg', 17: 's17-bridge.jpg', 23: 's23-office.jpg', 25: 's25-fireworks.jpg', 27: 's27-nyc.jpg' };
const PORT = 8200 + Math.floor(Math.random() * 700); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch(); let bad = 0;
  for (const [n, f] of Object.entries(SC)) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`http://127.0.0.1:${PORT}/?step=${n}&test=1`); await p.waitForSelector('.where-intro-btn'); await p.click('.where-intro-btn'); await sleep(900);
    const r = await p.evaluate(src => { const im = [...document.querySelectorAll('image')].find(i => (i.getAttribute('href') || '').includes(src)); if (!im) return null; const b = im.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }, f);
    const imgRect = () => p.evaluate(src => { const im = [...document.querySelectorAll('image')].find(i => (i.getAttribute('href') || '').includes(src)); const b = im.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }, f);
    const tap = async box => { let q = await imgRect(); let x = q[0] + q[2] * (box[0] + box[2]) / 2, y = q[1] + q[3] * (box[1] + box[3]) / 2;
      if (x < 30 || x > 360 || y < 140 || y > 760) { // pan the scene so the target is on screen
        const dx = 195 - x, dy = 450 - y; await p.mouse.move(195, 450); await p.mouse.down(); await p.mouse.move(195 + dx, 450 + dy, { steps: 12 }); await p.mouse.up(); await sleep(700);
        q = await imgRect(); x = q[0] + q[2] * (box[0] + box[2]) / 2; y = q[1] + q[3] * (box[1] + box[3]) / 2; }
      await p.mouse.click(x, y); return [x | 0, y | 0]; };
    let q = '-'; if (HB[f].quokka) { const at = await tap(HB[f].quokka); await sleep(500); q = JSON.stringify(at) + ' found=' + await p.evaluate(n => JSON.stringify((DAYOF.debug.state().found || {})[n] || {}), n); }
    const at = await tap(HB[f].kai); await sleep(2500);
    const ok = await p.evaluate(() => /找到凱凱/.test(document.body.innerText));
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'screens', String(n).padStart(2, '0') + '-found.png') });
    console.log(n, f, 'kaiTap', JSON.stringify(at), ok ? 'FOUND' : 'NOT FOUND', '| quokka', q, errs.join('|')); if (!ok) bad++; await p.close();
  }
  await b.close(); srv.kill(); process.exit(bad ? 1 : 0);
})();
