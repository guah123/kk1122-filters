// Filter screenshots: node test/filters.js [fake-cam.mjpeg] → ../screens/filters/*.png (390×844)
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const CAM = process.argv[2]; const OUT = path.join(__dirname, '..', '..', 'screens', 'filters'); fs.mkdirSync(OUT, { recursive: true });
const PORT = 8100 + Math.floor(Math.random() * 800); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  await sleep(900);
  const args = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  if (CAM) args.push('--use-file-for-fake-video-capture=' + CAM);
  const b = await chromium.launch({ args }); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera', 'microphone'] });
  const errs = [];
  const FILTERS = [['helmet', '流星太空人'], ['rain', '下雨'], ['sun', '太陽'], ['fish', '魚眼'], ['home', '家']];
  for (const [id, name] of FILTERS) {
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(id + ': ' + e.message));
    await p.goto(`http://127.0.0.1:${PORT}/?step=32&test=1`, { waitUntil: 'load' }); await sleep(800);
    await p.evaluate(f => { window.__cam = DAYOF.Camera.open({ filter: f, mode: 'video', stepNo: 32 }); }, id);
    await sleep(2500); await p.screenshot({ path: path.join(OUT, `${id}-1.png`) });
    if (id === 'rain') { // tap → ripple rings + splashes
      for (const [x, y] of [[120, 320], [260, 420], [180, 560], [300, 250]]) { await p.mouse.click(x, y); await sleep(120); }
      await sleep(250); await p.screenshot({ path: path.join(OUT, `${id}-tap.png`) });
    }
    if (id === 'sun') { // finger wipe interaction
      await p.mouse.move(110, 300); await p.mouse.down(); for (let i = 0; i <= 12; i++) await p.mouse.move(110 + i * 14, 300 + Math.sin(i / 2) * 40); await p.mouse.up();
    }
    if (id === 'helmet') { await p.mouse.move(320, 140); await p.mouse.down(); await p.mouse.move(120, 260, { steps: 8 }); await p.mouse.up(); }
    await sleep(3500); await p.screenshot({ path: path.join(OUT, `${id}-2.png`) });
    await sleep(3500); await p.screenshot({ path: path.join(OUT, `${id}-3.png`) });
    console.log(id, name, 'ok'); await p.close();
  }
  // 29 photo: fisheye photo camera
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('photo: ' + e.message));
  await p.goto(`http://127.0.0.1:${PORT}/?step=29&test=1`, { waitUntil: 'load' }); await sleep(800);
  await p.screenshot({ path: path.join(OUT, 'photo29-0-page.png') });
  const btn = await p.$('button:has-text("拍照")'); if (btn) await btn.click(); await sleep(2500);
  await p.screenshot({ path: path.join(OUT, 'photo29-1-camera.png') });
  const shutter = await p.$('.cam-overlay [aria-label="拍照"]'); if (shutter) { await shutter.click(); await sleep(1500); await p.screenshot({ path: path.join(OUT, 'photo29-2-preview.png') }); }
  console.log('photo29', shutter ? 'ok' : 'no shutter');
  await b.close(); srv.kill(); console.log(errs.length ? 'ERRORS\n' + errs.join('\n') : 'no page errors');
})();
