// 濾鏡截圖＋互動驗證：node test/filters.js [fake-cam.mjpeg]
//   → ../verify/y/*.png（16-rain*、sun*、cam-nonumber）（390×844、deviceScaleFactor 2、?test=1）
//   檢查：console／page error、assets/filters/* 回應 200、〈太陽〉左下抹開後露出底部石板地（r8 方案 B；原本是散步兩人）、
//         〈下雨〉點雲下一陣小雨（r8 方案 C）、〈太空人〉點一下放天燈（r8 方案 D）截圖、
//         「重新佈滿烏雲」用真實觸控點擊（touchscreen.tap 走 hit-test）＋像素取樣確認烏雲回來。
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const CAM = process.argv[2]; const OUT = path.join(__dirname, '..', '..', 'verify', 'y'); fs.mkdirSync(OUT, { recursive: true });
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

  // 相機 UI 不得出現任何數字（步驟編號徽章已移除）
  const noNum = p => p.evaluate(() => { const o = document.querySelector('.cam-overlay'); const txt = [...o.querySelectorAll('*')].filter(e => e.offsetParent !== null && !e.children.length).map(e => e.textContent).join('|'); return { badge: !!o.querySelector('.cam-badge, .step-no'), digits: /[0-9０-９]/.test(txt.replace(/● 00:00/, '')), txt }; });
  for (const id of ['helmet', 'home', 'rain', 'fish']) {
    const p = await ctx.newPage(); watch(p, id); await openCam(p, id);
    const nn = await noNum(p); report.push(id + ' ui: ' + JSON.stringify(nn) + (nn.badge || nn.digits ? ' → NUMBER FOUND' : ' → no number'));
    if (id === 'rain') {
      await sleep(1500); await shot(p, '16-rain-1');
      for (const [x, y] of [[120, 320], [260, 420], [180, 560]]) { await p.touchscreen.tap(x, y); await sleep(120); } await sleep(200); await shot(p, '16-rain-2-tap');
      { const R = await box(p); await p.touchscreen.tap(R.x + R.w * 0.6, R.y + R.h * 0.08); await sleep(900); await shot(p, '16-rain-2b-cloudtap'); }   // r8：點雲 → 一陣小雨
      await sleep(3500); await shot(p, '16-rain-3');
    } else if (id === 'helmet') {
      await sleep(1500); await shot(p, 'cam-nonumber');
      const R = await box(p); for (const [fx, fy] of [[0.5, 0.6], [0.3, 0.4]]) { await p.touchscreen.tap(R.x + R.w * fx, R.y + R.h * fy); await sleep(500); }
      await sleep(800); await shot(p, 'helmet-lamps');   // r8：點一下放天燈飛向月亮
    }
    else await sleep(1500);
    report.push(id + ' ok'); await p.close();
  }

  // 〈太陽〉：抹開右上（太陽）＋左下（散步兩人）→ 截圖 → 真實觸控點「重新佈滿烏雲」→ 像素確認烏雲回來
  {
    const p = await ctx.newPage(); watch(p, 'sun'); await openCam(p, 'sun');
    const R = await box(p), k = R.w / 720;   // 畫布像素 → CSS px
    const cloudsBL = await sample(p, 60, 1100, 160, 120);
    await sleep(1500); await shot(p, 'sun-v2-1-clouds');
    const wipe = async (pts) => { await p.mouse.move(R.x + pts[0][0] * k, R.y + pts[0][1] * k); await p.mouse.down(); for (const [x, y] of pts) await p.mouse.move(R.x + x * k, R.y + y * k, { steps: 4 }); await p.mouse.up(); };
    // 橫掃上方約 35%（彩虹＋太陽）：之字形
    { const pts = []; for (let i = 0; i <= 8; i++) { const y = 40 + i * 50; pts.push(i % 2 ? [700, y] : [20, y]); } await wipe(pts); }
    await sleep(2500); await shot(p, 'sun-v2-2-wiped-top');
    await wipe([[30, 1060], [260, 1060], [260, 1150], [30, 1150], [30, 1240], [280, 1240], [280, 1000], [40, 1000]]);   // 左下
    await sleep(2500);
    const wipedBL = await sample(p, 60, 1100, 160, 120);
    await shot(p, 'sun-v2-2b-wiped-walkers');
    // 真實點擊：先確認按鈕中心點的最上層元素就是按鈕本身，再用 touchscreen.tap
    const btn = await p.evaluate(() => { const e = document.querySelector('.cam-reset'), r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, top = document.elementFromPoint(cx, cy); return { cx, cy, hidden: e.hidden, topIsBtn: top === e, top: top && top.className }; });
    await p.touchscreen.tap(btn.cx, btn.cy); await sleep(500);
    const toast = await p.evaluate(() => { const t = document.querySelector('.cam-toast'); return t.classList.contains('show') ? t.textContent : ''; });
    await sleep(600);
    const afterBL = await sample(p, 60, 1100, 160, 120);
    await shot(p, 'sun-v2-3-after-reset');
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
