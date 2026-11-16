// v=261116x step 11 painted-scene mode (data/scenes/suitcase.json): CDP touch drag of all 10 painted props into the painted
// suitcase, close, state, 繼續看看, revisit; plus fallback with enabled:false. node test/suitcase-painted.js [WxH]
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const SITE = path.join(__dirname, '..'); const OUT = path.join(SITE, '..', 'verify', 'where'); fs.mkdirSync(OUT, { recursive: true });
const CFG = JSON.parse(fs.readFileSync(path.join(SITE, 'data/scenes/suitcase.json'), 'utf8'));
const [VW, VH] = (process.argv[2] || '390x844').split('x').map(Number); const TAG = VW === 390 && VH === 844 ? '' : '-' + VW + 'x' + VH;
const PORT = 8300 + Math.floor(Math.random() * 300); const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ALIAS = { familyphoto: 'photoframe' };
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch(); const fails = [], errs = [];
  const ctxOpts = { viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: UA };
  // ---- painted mode
  const c = await b.newContext(ctxOpts); const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/?step=11&test=1`); await p.waitForSelector('.sc-scene.ready', { timeout: 8000 }); await sleep(700);
  const geo = await p.evaluate(() => { const e = document.querySelector('.sc-scene .scs-img'), s = document.querySelector('.sc-scene').getBoundingClientRect(), r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, sw: s.width }; });
  if (Math.abs(geo.w - Math.min(VW, geo.sw)) > 1 && geo.y > 140) fails.push('not width-fit ' + JSON.stringify(geo));
  if (geo.x < -1 || geo.x + geo.w > VW + 1) fails.push('plate cropped');
  const P = (u, v) => [geo.x + u * geo.w, geo.y + v * geo.h];
  await p.screenshot({ path: path.join(OUT, '11-painted-before' + TAG + '.png') });
  const cdp = await c.newCDPSession(p); const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }] });
  const z = CFG.suitcase, [tx, ty] = P((z[0] + z[2]) / 2, (z[1] + z[3]) / 2); let shot = false; const order = [];
  for (const [k, r] of Object.entries(CFG.items)) {
    const [sx, sy] = P((r[0] + r[2]) / 2, (r[1] + r[3]) / 2); const before = await p.evaluate(() => document.querySelectorAll('.sc-scene .scs-pack').length);
    await touch('touchStart', sx, sy); for (let i = 1; i <= 12; i++) { await touch('touchMove', sx + (tx - sx) * i / 12, sy + (ty - sy) * i / 12); await sleep(16); }
    if (!shot && k === 'guitar') { shot = true; const g = await p.evaluate(() => { const e = document.querySelector('.scs-ghost'); return e && { cut: e.classList.contains('cut'), img: e.style.backgroundImage }; }); if (!g || !g.cut) fails.push('ghost not cut-out ' + JSON.stringify(g)); await p.screenshot({ path: path.join(OUT, '11-painted-middrag' + TAG + '.png') }); }
    await touch('touchEnd'); await sleep(380);
    const got = await p.evaluate(() => [...document.querySelectorAll('.sc-scene .scs-pack')].map(e => e.dataset.id));
    const id = ALIAS[k] || k; if (!got.includes(id) || got.length !== before + 1) fails.push('drag ' + k + ' → ' + JSON.stringify(got)); order.push(id);
  }
  const shown = await p.evaluate(() => document.querySelectorAll('.sc-scene .scs-empty.show').length); if (shown !== 10) fails.push('empty plate patches ' + shown);
  await p.screenshot({ path: path.join(OUT, '11-painted-packed' + TAG + '.png') });
  const L = CFG.lid || z, [lx, ly] = P((L[0] + L[2]) / 2, (L[1] + L[3]) / 2);   // tap the OPEN LID to close
  await touch('touchStart', lx, ly); await sleep(60); await touch('touchEnd'); await sleep(1600);
  const st = await p.evaluate(() => DAYOF.debug.state().suitcase);
  if (!st || !st.closed || st.packed.length !== 10 || !st.packed.includes('photoframe')) fails.push('state ' + JSON.stringify(st));
  await p.screenshot({ path: path.join(OUT, '11-painted-closed' + TAG + '.png') });
  const btn = await p.evaluate(() => { const e = document.querySelector('.sc-scene .sc-actions .btn.show'); if (!e) return null; const r = e.getBoundingClientRect(); return [e.getAttribute('aria-label') || e.textContent, r.y, r.bottom]; });
  if (!btn || btn[0] !== '繼續看看') fails.push('continue ' + JSON.stringify(btn));
  await p.evaluate(() => document.querySelector('.sc-scene .sc-actions .btn').click()); await sleep(800);
  const step = await p.evaluate(() => DAYOF.debug.state().step); if (step !== 12) fails.push('step ' + step);
  await p.evaluate(() => DAYOF.debug.goto(11)); await sleep(1800);
  const rs = await p.evaluate(() => ({ scene: !!document.querySelector('.sc-scene.ready'), packs: document.querySelectorAll('.sc-scene .scs-pack').length, btn: !!document.querySelector('.sc-scene .sc-actions .btn.show'), hint: (document.querySelector('.sc-scene .sc-hint') || {}).textContent }));
  if (!rs.scene || !rs.btn || rs.packs !== 10) fails.push('revisit ' + JSON.stringify(rs));
  await p.screenshot({ path: path.join(OUT, '11-painted-revisit' + TAG + '.png') });
  await c.close();
  // ---- fallback: enabled:false → shipped SVG room
  const c2 = await b.newContext(ctxOpts); await c2.route('**/data/scenes/suitcase.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(Object.assign({}, CFG, { enabled: false })) }));
  const p2 = await c2.newPage(); p2.on('pageerror', e => errs.push('fallback: ' + e.message));
  await p2.goto(`http://127.0.0.1:${PORT}/?step=11&test=1`); await sleep(1800);
  const fb = await p2.evaluate(() => ({ items: document.querySelectorAll('.page-suitcase .sc-item').length, scene: document.querySelectorAll('.sc-scene').length }));
  if (fb.items !== 10 || fb.scene) fails.push('fallback ' + JSON.stringify(fb));
  console.log(JSON.stringify({ viewport: VW + 'x' + VH, plate: geo, packed: order.length, state: st && st.packed.length, btn, step, revisit: rs, fallback: fb, fails, errs }));
  await b.close(); srv.kill(); process.exit(fails.length || errs.length ? 1 : 0);
})();
