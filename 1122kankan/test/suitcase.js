// v=261116y step 11 suitcase (original room + sprites, no filter stack): layout overlap audit + CDP touch drag of all 10 items + tap-to-close (390x844 dsf2, iOS-like touch).
// node test/suitcase.js [WxH]  → prints JSON, screenshots ../verify/where/11-*.png, exit 1 on failure
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const SITE = path.join(__dirname, '..'); const OUT = path.join(SITE, '..', 'verify', 'y'); fs.mkdirSync(OUT, { recursive: true });
const [VW, VH] = (process.argv[2] || '390x844').split('x').map(Number); const TAG = VW === 390 && VH === 844 ? '' : '-' + VW + 'x' + VH;
const PORT = 8600 + Math.floor(Math.random() * 300); const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
// v=261118b scatter: separating-axis gap between convex quads (rotated pictures); < 0 means they overlap
const sat = (A, B) => { let best = -1e9; for (const P of [A, B]) for (let i = 0; i < 4; i++) { const p = P[i], q = P[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0], L = Math.hypot(nx, ny);
  const pa = A.map(v => (v[0] * nx + v[1] * ny) / L), pb = B.map(v => (v[0] * nx + v[1] * ny) / L); best = Math.max(best, Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb)); } return best; };
const quad = b => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: UA });
  // this test covers the shipped SVG fallback mode → force data/scenes/suitcase.json to enabled:false (painted mode: test/suitcase-painted.js)
  // uses the REAL data/scenes/suitcase.json (must be enabled:false → original room)
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); }); const fails = [];
  await p.goto(`http://127.0.0.1:${PORT}/?step=11&test=1`); await p.waitForSelector('.page-suitcase .sc-item'); await sleep(900);
  const R = () => p.evaluate(() => { const r = e => { const q = e.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) }; };
    const pg = document.querySelector('.page-suitcase:not(.is-out)') || document;
    const pic = e => { const q = e.getBoundingClientRect(), a = e.querySelector('.sc-art'), im = e.querySelector('img'), k = q.width / e.offsetWidth, side = a.offsetWidth * k;
      const f = Math.min(1, im.naturalWidth / im.naturalHeight) * side / 2, g = Math.min(1, im.naturalHeight / im.naturalWidth) * side / 2, t = parseFloat(getComputedStyle(a).rotate) * Math.PI / 180 || 0;
      const cx = q.x + q.width / 2, cy = q.y + q.height / 2, c = Math.cos(t), s = Math.sin(t); return { rot: Math.round(t * 180 / Math.PI), quad: [[-f, -g], [f, -g], [f, g], [-f, g]].map(([u, v]) => [cx + u * c - v * s, cy + u * s + v * c]) }; };
    return { items: [...pg.querySelectorAll('.sc-item')].map(e => ({ id: e.dataset.id, ...r(e), pic: pic(e) })), case: r(pg.querySelector('.sc-case')), title: (e => { const g = document.createRange(); g.selectNodeContents(e); const q = g.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) }; })(pg.querySelector('.sc-title')), hint: (e => { const g = document.createRange(); g.selectNodeContents(e); const q = g.getBoundingClientRect(); return { x: Math.round(q.x), y: Math.round(q.y), w: Math.round(q.width), h: Math.round(q.height) }; })(pg.querySelector('.sc-hint')),
      back: (b => b && getComputedStyle(b).visibility !== 'hidden' ? r(b) : null)(document.querySelector('.step-no')), stack: [...pg.querySelectorAll('.filter-stack .round-btn')].map(r), labels: pg.querySelectorAll('.filter-stack .fs-label').length }; });
  const L = await R();
  const others = [['case', L.case], ['title', L.title], ['hint', L.hint], ['back', L.back], ...L.stack.map((s, i) => ['stack' + i, s])].filter(x => x[1]);
  L.items.forEach((a, i) => {
    if (Math.min(a.w, a.h) < 44) fails.push(a.id + ' small hit ' + a.w + 'x' + a.h);
    // rotated picture: fully on-screen, clear of every other picture / the case / the header text / back button
    const xs = a.pic.quad.map(v => v[0]), ys = a.pic.quad.map(v => v[1]);
    if (Math.min(...xs) < 2 || Math.max(...xs) > VW - 2 || Math.min(...ys) < 2 || Math.max(...ys) > VH - 110) fails.push(a.id + ' picture off-screen');
    L.items.slice(i + 1).forEach(o => { const g = sat(a.pic.quad, o.pic.quad); if (g < 2) fails.push(a.id + ' pic × ' + o.id + ' ' + g.toFixed(1)); });
    others.forEach(([n, o]) => { if (sat(a.pic.quad, quad(o)) < 2) fails.push(a.id + ' pic × ' + n); });
    if (a.x < 16 || a.x + a.w > VW - 16) fails.push(a.id + ' edge x ' + a.x + '..' + (a.x + a.w));
    if (a.y + a.h > VH - 120) fails.push(a.id + ' too low ' + (a.y + a.h));
    L.items.slice(i + 1).forEach(o => { if (hit(a, o)) fails.push(a.id + ' × ' + o.id); });
    others.forEach(([n, o]) => { if (hit(a, o)) fails.push(a.id + ' × ' + n); });
  });
  if (L.stack.length || await p.evaluate(() => !!document.querySelector('.page-suitcase .filter-stack'))) fails.push('filter stack present on 11');
  const mode = await p.evaluate(() => ({ scene: !!document.querySelector('.sc-scene'), spr: document.querySelectorAll('.page-suitcase .sc-item img.sc-spr').length, svgItems: document.querySelectorAll('.page-suitcase .sc-item .sc-art svg').length, loaded: [...document.querySelectorAll('.page-suitcase .sc-item img.sc-spr')].every(i => i.complete && i.naturalWidth > 0), photo: (document.querySelector('.sc-item[data-id=photoframe] img') || {}).src, art: [...document.querySelectorAll('.page-suitcase .sc-item .sc-art')].map(e => Math.round(e.getBoundingClientRect().width)) }));
  if (mode.scene || mode.spr !== 10 || mode.svgItems || !mode.loaded || !/familyphoto\.png$/.test(mode.photo || '')) fails.push('mode ' + JSON.stringify(mode));
  const harden = await p.evaluate(() => [...document.querySelectorAll('.page-suitcase .sc-item')].every(e => getComputedStyle(e).touchAction === 'none' && e.getAttribute('draggable') === 'false' && e.querySelector('img').getAttribute('draggable') === 'false'));
  if (!harden) fails.push('touch hardening'); if (L.back && hit(L.back, L.title)) fails.push('back × title'); L.stack.forEach(st => { if (hit(st, L.title) || hit(st, L.hint)) fails.push('stack × header'); if (L.back && hit(st, L.back)) fails.push('stack × back'); });
  await p.screenshot({ path: path.join(OUT, '11' + TAG + '.png') });
  // CDP touch drag every item into the suitcase
  const cdp = await c.newCDPSession(p);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }] });
  for (const it of L.items) {
    const q = (await R()).items.find(x => x.id === it.id), cs = (await R()).case;
    const sx = q.x + q.w / 2, sy = q.y + q.h / 2 - 10, tx = cs.x + cs.w / 2, ty = cs.y + cs.h * 0.62;
    await touch('touchStart', sx, sy); for (let k = 1; k <= 14; k++) { await touch('touchMove', sx + (tx - sx) * k / 14, sy + (ty - sy) * k / 14); await sleep(16); }
    await touch('touchEnd'); await sleep(420);
  }
  await sleep(300);
  const packed = await p.evaluate(() => document.querySelectorAll('.page-suitcase .sc-slots .sc-packed').length);
  if (packed !== 10) fails.push('packed ' + packed + '/10');
  await p.screenshot({ path: path.join(OUT, '11-packed' + TAG + '.png') });
  // tap the open LID (upper part of the case) to close
  const cs = (await R()).case; await touch('touchStart', cs.x + cs.w / 2, cs.y + cs.h * 0.2); await sleep(60); await touch('touchEnd'); await sleep(1600);
  const st = await p.evaluate(() => DAYOF.debug.state().suitcase);
  if (!st || !st.closed || (st.packed || []).length !== 10) fails.push('state.suitcase ' + JSON.stringify(st));
  const btn = await p.evaluate(() => { const e = document.querySelector('.page-suitcase .sc-actions .btn'); return e && e.classList.contains('show') && (e.getAttribute('aria-label') || e.textContent); });
  if (btn !== '繼續看看') fails.push('continue btn ' + btn);
  await p.screenshot({ path: path.join(OUT, '11-closed' + TAG + '.png') });
  await p.evaluate(() => document.querySelector('.page-suitcase .sc-actions .btn').click()); await sleep(800);
  const step = await p.evaluate(() => DAYOF.debug.state().step);
  if (step !== 12) fails.push('after 繼續看看 step=' + step);
  // revisit step 11 → restored closed case with the 10 packed sprites
  await p.goto(`http://127.0.0.1:${PORT}/?step=11&test=1`); await p.waitForSelector('.page-suitcase .sc-item'); await sleep(900);
  const rv = await p.evaluate(() => { const pg = document.querySelector('.page-suitcase:not(.is-out)') || document; return { closed: !!pg.querySelector('.sc-case.closed'), packed: pg.querySelectorAll('.sc-slots .sc-packed img.sc-spr').length, btn: !!pg.querySelector('.sc-actions .btn.show') }; });
  if (!rv.closed || rv.packed !== 10 || !rv.btn) fails.push('revisit ' + JSON.stringify(rv));
  console.log(JSON.stringify({ viewport: VW + 'x' + VH, art: mode.art, items: L.items.map(i => i.id + '@' + i.x + ',' + i.y + ' ' + i.w + 'x' + i.h + ' r' + i.pic.rot), case: L.case, stack: L.stack.length, packed, state: st && st.packed, step, revisit: rv, fails, errs }, null, 0));
  await b.close(); srv.kill(); process.exit(fails.length || errs.length ? 1 : 0);
})();
