// test/wall-reply-shot.js — screenshot the first note that carries a reply from Kai. node test/wall-reply-shot.js <dir>
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const port = 8700 + Math.floor(Math.random() * 200);
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto('http://127.0.0.1:' + port + '/wall.html');
  await p.fill('.wl-pin', '1126'); await p.click('.wl-gate .btn'); await p.waitForSelector('.wl-hero');
  const n = await p.locator('.wl-replied').count();
  console.log('replies on page', n);
  if (n) {
    await p.locator('.wl-replied').first().evaluate(e => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(600);
    await p.screenshot({ path: out + '/reply-wall.png' });
    await p.locator('.wl-replied').first().click(); await p.waitForTimeout(600);
    await p.screenshot({ path: out + '/reply-big.png' });
  }
  await b.close(); server.kill();
})();
