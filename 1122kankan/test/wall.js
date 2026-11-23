// test/wall.js — smoke test + screenshots for wall.html.
// Run: node test/wall.js <screenshot-dir>   (serves out/site itself, like walk.js)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const port = 8700 + Math.floor(Math.random() * 200);
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:' + port + '/wall.html');
  await p.fill('.wl-pin', '0000');
  await p.click('.wl-gate .btn');
  await p.waitForFunction(() => document.querySelector('.wl-msg').textContent.length > 0);
  console.log('wrong-pin message:', await p.textContent('.wl-msg'));
  await p.screenshot({ path: out + '/gate.png' });
  await p.fill('.wl-pin', '1126');
  await p.click('.wl-gate .btn');
  await p.waitForSelector('.wl-hero');
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 700) { await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(120); }
  await p.waitForTimeout(1200);
  console.log('height', H, 'notes', await p.locator('.wl-note').count(), 'photos', await p.locator('.wl-ph').count(),
    'overflowX', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await p.screenshot({ path: out + '/full.png', fullPage: true });
  await p.locator('.wl-ph.is-video').first().click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out + '/video.png' });
  await p.keyboard.press('Escape');
  await p.locator('.wl-draw').first().click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: out + '/draw.png' });
  console.log(errs.length + ' error(s)', errs);
  await b.close();
  server.kill();
  process.exit(errs.length ? 1 : 0);
})();
