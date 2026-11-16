// 濾鏡截圖＋互動驗證：node test/filters.js [fake-cam.mjpeg]
//   → ../verify/filters/*.png（390×844、deviceScaleFactor 2、?test=1）
//   檢查：console／page error、assets/filters/* 回應 200、〈太陽〉左下抹開後出現散步兩人、
//         「重新佈滿烏雲」用真實觸控點擊（touchscreen.tap 走 hit-test）＋像素取樣確認烏雲回來。
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const CAM = process.argv[2]; const OUT = path.join(__dirname, '..', '..', 'verify', 'filters'); fs.mkdirSync(OUT, { recursive: true });
const PORT = 8100 + Math.floor(Math.random() * 800); const sleep = ms => new Promise(r => setTimeout(r, ms));
// 畫布（720×1280）上某個矩形的平均 RGB
const sample = (p, x, y, w, h) => p.evaluate(([x, y, w, h]) => {
  const c = document.querySelector('.cam-canvas'), d = c.getContext('2d').getImageData(x, y, w, h).data; let r = 0, g = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}, [x, y, w, h]);
const diff = (a, b) => Math.round(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await sleep(900);
  const args = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  if (CAM) args.push('--use-file-for-fake-video-capture=' + CAM);
  const b = await chromium.launch({ args });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, permissions: ['camera', 'microphone'] });
  const errs = [], assets = {}, report = [];
  const watch = (p, id) => {
    p.on('pageerror', e => errs.push(id + ' pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(id + ' console: ' + m.text()); });
    p.on('response', r => { const u = r.url(); if (u.includes('/assets/filters/')) assets[u.split('/assets/filters/')[1].split('?')[0]] = r.status(); });
  };
  const openCam = async (p, id) => {
    await p.goto(`http://127.0.0.1:${PORT}/?step=32&test=1`, { waitUntil: 'load' }); await sleep(800);
    await p.evaluate(f => { window.__cam = DAYOF.Camera.open({ filter: f, mode: 'video', stepNo: 32 }); }, id);
    await p.waitForSelector('.cam-rec:not([disabled])', { timeout: 15000 }); await sleep(600);
  };
  const box = async p => p.evaluate(() => { const r = document.querySelector('.cam-canvas').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });

  for (const id of ['helmet', 'home', 'rain', 'fish']) {
    const p = await ctx.newPage(); watch(p, id); await openCam(p, id);
    await sleep(1500); await shot(p, `${id}-1`);
    if (id === 'rain') { for (const [x, y] of [[120, 320], [260, 420], [180, 560]]) { await p.touchscreen.tap(x, y); await sleep(120); } await sleep(200); await shot(p, `${id}-tap`); }
    await sleep(3500); await shot(p, `${id}-2`);
    await sleep(2500); await shot(p, `${id}-3`);
    report.push(id + ' ok'); await p.close();
  }

  // 〈太陽〉：抹開右上（太陽）＋左下（散步兩人）→ 截圖 → 真實觸控點「重新佈滿烏雲」→ 像素確認烏雲回來
  {
    const p = await ctx.newPage(); watch(p, 'sun'); await openCam(p, 'sun');
    const R = await box(p), k = R.w / 720;   // 畫布像素 → CSS px
    const cloudsBL = await sample(p, 60, 1100, 160, 120);
    await shot(p, 'sun-1-clouds');
    const wipe = async (pts) => { await p.mouse.move(R.x + pts[0][0] * k, R.y + pts[0][1] * k); await p.mouse.down(); for (const [x, y] of pts) await p.mouse.move(R.x + x * k, R.y + y * k, { steps: 4 }); await p.mouse.up(); };
    await wipe([[440, 90], [640, 120], [620, 260], [460, 230], [520, 160], [660, 200]]);          // 太陽附近
    await wipe([[30, 1060], [260, 1060], [260, 1150], [30, 1150], [30, 1240], [280, 1240], [280, 1000], [40, 1000]]);   // 左下
    await sleep(2500);
    const wipedBL = await sample(p, 60, 1100, 160, 120);
    await shot(p, 'sun-2-wiped');
    await sleep(1800); await shot(p, 'sun-3-wiped');
    // 真實點擊：先確認按鈕中心點的最上層元素就是按鈕本身，再用 touchscreen.tap
    const btn = await p.evaluate(() => { const e = document.querySelector('.cam-reset'), r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, top = document.elementFromPoint(cx, cy); return { cx, cy, hidden: e.hidden, topIsBtn: top === e, top: top && top.className }; });
    await p.touchscreen.tap(btn.cx, btn.cy); await sleep(500);
    const toast = await p.evaluate(() => { const t = document.querySelector('.cam-toast'); return t.classList.contains('show') ? t.textContent : ''; });
    await sleep(600);
    const afterBL = await sample(p, 60, 1100, 160, 120);
    await shot(p, 'sun-4-after-reset');
    const refilled = diff(afterBL, cloudsBL) < diff(wipedBL, cloudsBL) * 0.35;
    report.push('sun reset: btn=' + JSON.stringify(btn) + ' toast=' + JSON.stringify(toast) + ' clouds=' + cloudsBL + ' wiped=' + wipedBL + ' after=' + afterBL +
      ' Δwiped=' + diff(wipedBL, cloudsBL) + ' Δafter=' + diff(afterBL, cloudsBL) + ' → ' + (refilled ? 'REFILLED' : 'NOT REFILLED'));
    await p.close();
  }

  await b.close(); srv.kill();
  console.log(report.join('\n'));
  console.log('assets:', JSON.stringify(assets));
  const bad = Object.entries(assets).filter(([, s]) => s !== 200 && s !== 304);
  console.log(bad.length ? 'ASSET FAILURES ' + JSON.stringify(bad) : 'all filter assets 200/304');
  console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no console/page errors');
})();
