#!/usr/bin/env node
/* walk.js — Playwright walkthrough 1→34 (owner A).
 * Usage: node test/walk.js [baseUrl]
 *   - no arg: serves out/site with `python3 -m http.server` on a free port.
 *   - screenshots → out/screens/NN.png (+ 10-cam.png, 34-coffee.png)
 * Exit code: 0 = all steps reached with no page errors; 1 otherwise. */
'use strict';
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }

const SITE = path.resolve(__dirname, '..');
const SHOTS = path.resolve(SITE, '../screens');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer(); s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
async function waitHttp(url, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.ok) return true; } catch (e) {}
    await sleep(150);
  }
  throw new Error('server not up: ' + url);
}

(async () => {
  let base = process.argv[2];
  let server = null;
  if (!base) {
    const port = await freePort();
    server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: SITE, stdio: 'ignore' });
    base = `http://127.0.0.1:${port}/`;
    await waitHttp(base + 'index.html', 8000);
  }
  if (!base.endsWith('/') && !/\.html$/.test(base)) base += '/';
  const startUrl = (/\.html$/.test(base) ? base : base + 'index.html') + '?test=1';

  const browser = await pw.chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: false, permissions: ['camera', 'microphone'], acceptDownloads: true });
  const page = await context.newPage();

  let curStep = 0;
  const errors = {};      // step -> [msgs]
  const missing = new Set();
  const log = (s, m) => { (errors[s] = errors[s] || []).push(m); };
  page.on('pageerror', (e) => log(curStep, 'pageerror: ' + (e.stack || e.message || e).toString().split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log(curStep, 'console.error: ' + m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() >= 400) missing.add(r.status() + ' ' + r.url().replace(base, '')); });
  page.on('requestfailed', (r) => { if (!/^blob:|^data:/.test(r.url())) missing.add('failed ' + r.url().replace(base, '')); });

  const stepNow = () => page.evaluate(() => (window.DAYOF && DAYOF.debug && DAYOF.debug.state) ? DAYOF.debug.state().step : 0);
  const curPage = () => page.locator('#app > .page.is-in').last();
  const dbg = (fn, arg) => page.evaluate(([f, a]) => DAYOF.debug[f](a), [fn, arg]);
  async function clickText(re, scope) {
    let loc = (scope || curPage()).locator('button, a, [role=button], .btn').filter({ hasText: re });
    if (!(await loc.count())) loc = (scope || curPage()).getByRole('button', { name: re }); // icon-only buttons (v=261116y eyes)
    const n = await loc.count();
    for (let i = n - 1; i >= 0; i--) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) { await el.click({ timeout: 3000 }).catch(() => el.click({ force: true, timeout: 2000 })); return true; }
    }
    return false;
  }
  async function advanced(from, ms = 3000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if ((await stepNow()) > from) return true; await sleep(100); }
    return false;
  }
  async function shot(name) { await page.screenshot({ path: path.join(SHOTS, name + '.png') }); }

  const results = [];
  await page.goto(startUrl, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(startUrl, { waitUntil: 'load' });
  await sleep(600);

  const flow = await page.evaluate(() => (window.DAYOF && DAYOF.FLOW) || []);
  const total = flow.length || 34;

  for (let n = 1; n <= total; n++) {
    curStep = n;
    let s = await stepNow();
    if (s !== n) { await dbg('goto', n); await sleep(500); s = await stepNow(); }
    const row = flow[n - 1] || { type: '?' };
    await sleep(row.type === 'where' ? 1800 : row.type === 'credits' ? 4500 : 700);
    const badge = await page.locator('.step-no').first().textContent().catch(() => '');
    await shot(pad(n));
    let how = 'ui';
    if (n === total) { results.push({ n, type: row.type, badge, how: '-' }); break; }

    let ok = false;
    try {
      switch (row.type) {
        case 'landing':
          ok = (await clickText(/開始/)) && (await advanced(n));
          break;
        case 'form': {
          const P = curPage();
          const email = P.locator('input[type=email], input[name*=mail i], input[placeholder*=mail i]').first();
          const nick = P.locator('input:not([type=email]):not([type=hidden]):not([type=checkbox])').first();
          if (await nick.count()) await nick.fill('走路測試');
          if (await email.count()) await email.fill('walk@example.com');
          ok = (await clickText(/送出/)) && (await advanced(n, 5000));
          if (!ok) { how = 'identify'; await page.evaluate(() => DAYOF.app.identify('走路測試', 'walk@example.com')); ok = await advanced(n); }
          break;
        }
        case 'rules':
          ok = (await clickText(/^\s*OK\s*$/i, page.locator('body'))) && (await advanced(n));
          break;
        case 'lyrics': {
          const sc = curPage().locator('.lyr-scroll');
          if (await sc.count()) {
            if (n === 10) {
              // camera overlay round trip — must land on same page + scroll
              await sc.evaluate((el) => { el.scrollTop = Math.floor(el.scrollHeight / 3); });
              await sleep(300);
              const before = await sc.evaluate((el) => el.scrollTop);
              const fb = curPage().locator('.filter-btn').first();
              if (await fb.count() && await page.evaluate(() => !!(DAYOF.Camera && DAYOF.Camera.open))) {
                // v=261118: filters now live in a collapsed stack — open it via the single top-right toggle first
                const tg = curPage().locator('.fs-toggle').first();
                if (await tg.count()) { await tg.click({ timeout: 5000 }); await sleep(350); }
                await fb.click({ force: true, timeout: 5000 });
                await sleep(3000);
                await shot('10-cam');
                const back = page.locator('.cam-overlay').locator('button, a, [role=button]').filter({ hasText: /回歌詞|返回/ }).first();
                if (await back.count()) await back.click(); else await page.keyboard.press('Escape');
                await sleep(800);
                const overlayGone = (await page.locator('.cam-overlay').count()) === 0;
                const after = await sc.evaluate((el) => el.scrollTop).catch(() => -1);
                const stillHere = (await stepNow()) === 10;
                if (!overlayGone || !stillHere || Math.abs(after - before) > 2) log(n, `camera return check failed: overlayGone=${overlayGone} step10=${stillHere} scroll ${before}->${after}`);
                else results.push({ n: '10-cam', type: 'camera', badge: '', how: `return ok (scroll ${before})` });
              } else log(n, 'note: no filter button or DAYOF.Camera — 10-cam skipped');
            }
            await sc.evaluate((el) => { el.scrollTop = el.scrollHeight; });
            await sleep(500);
            const btn = curPage().locator('.lyr-next');
            const label = ((await btn.getAttribute("aria-label")) || (await btn.textContent()) || "").trim(); // icon-only eyes button (v=261116y) keeps its name in aria-label
            if (label !== row.btn) log(n, `lyric button label "${label}" != "${row.btn}"`);
            await btn.click({ timeout: 3000 });
            ok = await advanced(n);
          }
          break;
        }
        case 'where':
          await page.evaluate(() => DAYOF.debug.solveWhere());
          how = 'solveWhere';
          await sleep(2600);
          if (await advanced(n, 200)) { ok = true; break; }
          await shot(pad(n) + '-found');
          ok = (await clickText(/看看下一首|繼續看看/, page.locator('body'))) && (await advanced(n));
          break;
        case 'qa': {
          const ta = curPage().locator('textarea, input[type=text]').first();
          if (await ta.count()) await ta.fill('這是自動測試的回答。');
          ok = (await clickText(/^\s*送出\s*$/)) && (await advanced(n, 4000));
          break;
        }
        case 'yesno':
          ok = (await clickText(/^\s*Yes\s*$/i)) && (await advanced(n, 4000));
          break;
        default:
          break; // suitcase / photo / credits → debug next
      }
    } catch (e) { log(n, 'walk action error: ' + e.message.split('\n')[0]); }
    if (!ok) {
      how = how === 'ui' ? 'debug.next' : how + '+debug.next';
      await dbg('next'); await sleep(400);
      if (!(await advanced(n, 1500))) log(n, 'could not advance');
    }
    results.push({ n, type: row.type, badge: (badge || '').trim(), how });
  }

  // egg coffee modal
  curStep = total;
  try {
    { const tg = curPage().locator('.eg-toggle').first(); if (await tg.count()) { await tg.click({ force: true }); await sleep(500); } } // v=261116x: p34 buttons are folded
    const c2 = curPage().locator('button[aria-label*="coffee" i], .eg-coffee button, .egg-coffee, [data-action=coffee]')
      .or(curPage().locator('button, a, [role=button]').filter({ hasText: /coffee|咖啡/i })).first();
    if (await c2.count()) {
      await c2.click({ force: true, timeout: 5000 }); // button pulses → never "stable"
      await sleep(900); await shot('34-coffee');
      results.push({ n: '34-coffee', type: 'modal', badge: '', how: 'ui' });
    } else log(total, 'note: no coffee button — 34-coffee skipped');
  } catch (e) { log(total, 'coffee: ' + e.message.split('\n')[0]); }

  const st = await page.evaluate(() => DAYOF.debug.state());
  await browser.close();
  if (server) server.kill();

  console.log('\n== walk 1→' + total + ' ==');
  results.forEach((r) => console.log(`${String(r.n).padEnd(9)} ${String(r.type).padEnd(9)} badge=${String(r.badge).padEnd(6)} ${r.how}`));
  console.log('final state: step=' + st.step + ' maxStep=' + st.maxStep + ' email=' + st.email + ' finish=' + JSON.stringify(st.finish) + ' answers=' + Object.keys(st.answers || {}).join(','));
  if (missing.size) { console.log('\n-- missing/failed resources (' + missing.size + ') --'); [...missing].slice(0, 60).forEach((m) => console.log('  ' + m)); }
  const errSteps = Object.keys(errors);
  let hard = 0;
  if (errSteps.length) {
    console.log('\n-- errors by step --');
    errSteps.forEach((k) => errors[k].forEach((m) => { if (!/^note:/.test(m)) hard++; console.log(`  [${k}] ${m}`); }));
  }
  const reached = st.step === total;
  console.log(`\nSUMMARY: reached ${st.step}/${total}, ${hard} error(s), ${missing.size} missing resource(s). Screens → ${SHOTS}`);
  process.exit(reached && hard === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
