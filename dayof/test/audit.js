// AUDIT 03:05 evidence collector → prints JSON lines per check. node test/audit.js
const { chromium, devices } = require('playwright'); const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
const PORT = 8400 + Math.floor(Math.random() * 500); const U = p => `http://127.0.0.1:${PORT}/${p}`; const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = {}; const log = (k, v) => { out[k] = v; console.log(k, JSON.stringify(v)); };
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: path.join(__dirname, '..'), stdio: 'ignore' }); await sleep(900);
  const b = await chromium.launch();
  const page = async (opts = {}) => { const c = await b.newContext({ viewport: { width: 390, height: 844 }, ...opts }); const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p; };
  // 1/2 lyrics
  { const p = await page(); const r = {};
    for (const n of [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]) { await p.goto(U(`?step=${n}&test=1`)); await sleep(700);
      r[n] = await p.evaluate(() => { const t = document.querySelector('.lyr-tbtn'); const st = [...document.querySelectorAll('.lyr-line')]; const cs = st[0] && getComputedStyle(st[0]);
        return { toggle: !!(t && !t.hidden), stanzas: document.querySelectorAll('.lyr-stanza').length, font: cs && cs.fontSize, lh: cs && cs.lineHeight, placeholder: /歌詞待補/.test(document.body.innerText), dividers: st.some(l => getComputedStyle(l).borderBottomStyle !== 'none'), btn: (document.querySelector('.lyr-next') || {}).textContent }; }); }
    log('lyrics', r); }
  // 3 hint timeline (fake clock)
  { const p = await page(); await p.clock.install(); await p.goto(U('?step=5&test=1')); await p.clock.runFor(1500); await p.click('.where-intro-btn'); const t = {};
    for (const s of [29, 31, 46, 61]) { await p.clock.runFor((s - (t.last || 0)) * 1000); t.last = s;
      t[s] = await p.evaluate(() => { const h = document.querySelector('.where-hint'), k = document.querySelector('.where-skip'); const svg = [...document.querySelectorAll('svg [class]')].map(e => e.getAttribute('class')).filter(c => /hint|quad|pulse/i.test(c)); return { hintShown: !!(h && h.classList.contains('show')), skipShown: !!(k && k.classList.contains('show')), hintFx: [...new Set(svg)] }; }); }
    delete t.last; log('hintTimeline', t); }
  // 4/5/6/8 scenes
  { const p = await page(); const r = {};
    for (const n of [5, 7, 17, 19, 23, 25, 27]) { await p.goto(U(`?step=${n}&test=1`)); await p.waitForSelector('.where-intro-btn'); await p.click('.where-intro-btn'); await sleep(900);
      r[n] = await p.evaluate(() => { const im = [...document.querySelectorAll('svg image')].filter(i => /assets\/scenes\/s\d/.test(i.getAttribute('href') || '')); const vb = im[0] && im[0].getBoundingClientRect(); const host = document.querySelector('.where-root, .page-where'); const hb = host.getBoundingClientRect();
        const sprites = [...document.querySelectorAll('svg image')].filter(i => /kai-mouse|wombat|quokka|pick\.png/.test(i.getAttribute('href') || '')).length;
        const txt = document.body.innerText; return { coverW: vb && Math.round(vb.width) >= 390, coverH: vb && Math.round(vb.bottom) >= Math.round(hb.bottom) - 1, sprites, has彩蛋: /彩蛋/.test(txt), minimap: !!document.querySelector('[class*=minimap]'), zoom: document.querySelectorAll('.where-zoom').length, sky: !!document.querySelector('.amb-sky'), flipText: ((document.querySelector('.where-flip') || {}).textContent || '').trim(), flipAria: (document.querySelector('.where-flip') || { getAttribute: () => null }).getAttribute('aria-label') }; }); }
    log('scenes', r);
    await p.goto(U('?step=19&test=1')); await p.waitForSelector('.where-intro-btn'); await p.click('.where-intro-btn'); await sleep(700); await p.click('.where-flip'); await sleep(3500);
    log('bookstoreFlipFound', await p.evaluate(() => /找到凱凱/.test(document.body.innerText) && (/繼續看看/.test(document.body.innerText) || !!document.querySelector('[aria-label="繼續看看"]')))); }
  // 11 new-filter pulse
  { const p = await page(); await p.goto(U('?step=16&test=1')); await sleep(900);
    log('pulse16', await p.evaluate(() => [...document.querySelectorAll('.round-btn')].map(b => (b.getAttribute('aria-label') || b.textContent).trim() + ':' + b.classList.contains('is-new')))); }
  // 14/15/16 end screen
  { const p = await page(); await p.goto(U('?step=34&test=1')); await sleep(2000);
    log('egg', await p.evaluate(() => { const rb = [...document.querySelectorAll('.page-egg button, .page-egg a')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 14) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' @' + Math.round(r.y); });
      const w = document.querySelector('.eg-actor'), fs = document.querySelector('.filter-stack, .fstack, [class*=filterstack]'); return { buttons: rb, walkerZ: w && getComputedStyle(w).zIndex, stackZ: fs && getComputedStyle(fs).zIndex, has彩蛋: /彩蛋/.test(document.body.innerText) }; }));
    const coffee = await p.$('[aria-label*="Coffee"], [aria-label*="coffee"]') || await p.$('button:has-text("Coffee")'); if (coffee) await coffee.click({ force: true }); await sleep(700);
    const pop = p.context().waitForEvent('page', { timeout: 3000 }).catch(() => null);
    const qr = await p.evaluate(() => { const i = [...document.querySelectorAll('img')].find(x => /ctbc-qr/.test(x.src)); return i && { src: i.src.split('/').pop(), callout: getComputedStyle(i).webkitTouchCallout || 'default', inA: !!i.closest('a'), x: !!document.querySelector('.fn-backdrop [aria-label*="關"], .fn-backdrop .modal-x, .fn-backdrop button[class*=x]') }; });
    await p.screenshot({ path: path.join(__dirname, '..', '..', 'screens', '34-coffee.png') });
    if (qr) await p.click('img[src*="ctbc-qr"]'); const np = await pop; log('coffee', { ...qr, opens: np && np.url() }); }
  // 18 config + key visual
  { const cfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8'); const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'base.css'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'app.js'), 'utf8');
    log('config', { backend: /BACKEND_URL: 'https:\/\/script\.google\.com\/macros\/s\/[^']+\/exec'/.test(cfg), coffeeLink: /COFFEE_LINK: 'https:\/\/www\.ctbcbank\.com/.test(cfg), mainVisualRefs: (css.match(/main-visual\.jpg|main-visual-portrait/g) || []).length, keyVisualRefs: (css.match(/key-visual/g) || []).length }); }
  // 13 save via share (code evidence)
  { const cam = fs.readFileSync(path.join(__dirname, '..', 'js', 'camera', 'camera.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'js', 'pages', 'photo.js'), 'utf8');
    log('share', { canShare: /navigator\.canShare/.test(cam), share: /navigator\.share\(/.test(cam), mp4: /video\/mp4/.test(cam), retry: /存到相簿/.test(cam), name: /kanKan-1122/.test(cam) }); }
  // 9 rain code evidence
  { const rain = fs.readFileSync(path.join(__dirname, '..', 'js', 'camera', 'rain.js'), 'utf8'); log('rain', { wipeButton: /重新起霧/.test(rain), tapHint: /點一下畫面/.test(rain), umbrella: /umbrella/i.test(rain) }); }
  await b.close(); srv.kill(); fs.writeFileSync(path.join(__dirname, '..', '..', 'screens', 'audit-0305.json'), JSON.stringify(out, null, 1));
})();
