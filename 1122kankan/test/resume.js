// Touch test: reach step 8, reload, tap 從頭開始 in the resume bubble → step 1, finish flags kept.
const { chromium, devices } = require('playwright'); const { spawn } = require('child_process'); const path = require('path');
const PORT = 8300 + Math.floor(Math.random() * 600); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/?step=8&test=1`); await sleep(1200);
  await p.evaluate(() => { const s = DAYOF.debug.state(); s.finish = { sent: true, at: 1 }; DAYOF.app.ctx && DAYOF.app.ctx.save && DAYOF.app.ctx.save(); });
  await sleep(500); await p.goto(`http://127.0.0.1:${PORT}/`); await sleep(1500);
  const btn = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find(x => /從頭開始/.test(x.textContent) && x.offsetParent));
  const r = await btn.evaluate(e => { const b = e.getBoundingClientRect(); const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, h: b.height, hitIsBtn: hit === e || e.contains(hit) }; });
  await p.touchscreen.tap(r.x, r.y); await sleep(1000);
  const st = await p.evaluate(() => { const s = DAYOF.debug.state(); return { step: s.step, maxStep: s.maxStep, finish: s.finish }; });
  console.log(JSON.stringify(r), JSON.stringify(st)); await b.close(); srv.kill();
  process.exit(st.step === 1 && r.hitIsBtn && r.w >= 44 && r.h >= 44 ? 0 : 1);
})();
