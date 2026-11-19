/* egg.js — step 34: looping 「凱凱在哪裡」 backgrounds, Kai+姊姊 walk right->left; ⋯ fold = all filters + LINE + Buy Kai a Coffee + 從頭開始. */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  var NATURAL_FACING = 'left';   // kai-sister.png faces/walks LEFT
  var IMG = 'assets/kai-sister.png';
  var FALLBACK_SCENES = ['park', 'escalator', 'bridge', 'bookstore', 'office', 'fireworks', 'newyork'];
  var CROSS_SEC = 11;            // seconds for one right->left crossing (width independent)

  // soft watercolor placeholders (used only when DAYOF.Where is missing)
  var PH = {
    park:      'radial-gradient(ellipse at 20% 15%, #CFE3F0 0, rgba(207,227,240,0) 55%), radial-gradient(ellipse at 80% 85%, #B9CFA0 0, rgba(185,207,160,0) 60%), radial-gradient(ellipse at 40% 70%, #E9E3C4 0, rgba(233,227,196,0) 60%), #EFE9D6',
    escalator: 'radial-gradient(ellipse at 70% 20%, #E8DCCB 0, rgba(232,220,203,0) 55%), radial-gradient(ellipse at 25% 80%, #C8CDD3 0, rgba(200,205,211,0) 60%), #EDE6DA',
    bridge:    'radial-gradient(ellipse at 50% 10%, #A9C8DE 0, rgba(169,200,222,0) 60%), radial-gradient(ellipse at 30% 90%, #F1D2B4 0, rgba(241,210,180,0) 60%), #DDE6EA',
    bookstore: 'radial-gradient(ellipse at 30% 25%, #E9C99B 0, rgba(233,201,155,0) 55%), radial-gradient(ellipse at 80% 80%, #C99A6E 0, rgba(201,154,110,0) 60%), #F0E2C8',
    office:    'radial-gradient(ellipse at 20% 20%, #D5E1EB 0, rgba(213,225,235,0) 55%), radial-gradient(ellipse at 80% 80%, #BFC7CF 0, rgba(191,199,207,0) 60%), #E8ECEE',
    fireworks: 'radial-gradient(circle at 30% 30%, #D9A6C8 0, rgba(217,166,200,0) 28%), radial-gradient(circle at 72% 22%, #F2C66D 0, rgba(242,198,109,0) 24%), radial-gradient(ellipse at 50% 100%, #5B6FA3 0, rgba(91,111,163,0) 70%), #2F3B63',
    newyork:   'radial-gradient(ellipse at 50% 15%, #F2C8A0 0, rgba(242,200,160,0) 60%), radial-gradient(ellipse at 20% 85%, #8DA0B8 0, rgba(141,160,184,0) 60%), #D9CFC4'
  };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function sxFor(dir) { return ((NATURAL_FACING === 'left') === (dir < 0)) ? 1 : -1; }
  function iconNode(name, fallbackSvg) {
    try { if (DAYOF.icon && DAYOF.icons && DAYOF.icons[name]) return DAYOF.icon(name, 'eg-ico'); } catch (e) {}
    var s = el('span', 'ico eg-ico'); s.innerHTML = fallbackSvg; return s;
  }
  var SVG_LINE = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8c-9 0-16 5.6-16 12.6 0 6.2 5.6 11.4 13.2 12.4l-1 5.2 7-5.4C33.4 32 40 27 40 20.6 40 13.6 33 8 24 8z"/><path d="M16 18v6h4M25 18v6M29 24v-6l5 6v-6"/></svg>';
  var SVG_COFFEE = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h24v9c0 6-4.5 10-12 10S9 33 9 27z"/><path d="M33 20h3.5a4.5 4.5 0 0 1 0 9H32"/><path d="M15 8c-1.5 2 1.5 3 0 5M22 8c-1.5 2 1.5 3 0 5M29 8c-1.5 2 1.5 3 0 5"/></svg>';

  function openUrl(u) { if (!u) return; try { window.open(u, '_blank', 'noopener'); } catch (e) { location.href = u; } }

  function openCoffeeModal(ctx) {
    var cfg = ctx.config || window.DAYOF_CONFIG || {};
    var lb = null;
    function closeLightbox() { if (lb && lb.parentNode) lb.parentNode.removeChild(lb); lb = null; }
    function openLightbox() {
      closeLightbox();
      lb = el('div', 'cm-lightbox');
      var big = new Image(); big.src = 'assets/ctbc-qr-crop.png'; big.alt = '中信付款碼（放大）'; big.className = 'cm-big'; big.draggable = false;
      var x = el('button', 'cm-lbx', '\u00d7'); x.type = 'button'; x.setAttribute('aria-label', '關閉');
      x.addEventListener('click', function (e) { e.stopPropagation(); closeLightbox(); });
      lb.addEventListener('click', function (e) { if (e.target !== big) closeLightbox(); });
      lb.appendChild(x); lb.appendChild(big); lb.appendChild(el('div', 'cm-lbhint', '長按儲存 QR code，用銀行 App 掃描'));
      document.body.appendChild(lb);
    }
    var box = el('div', 'coffee-modal');
    box.appendChild(el('h3', null, 'Buy Kai a Coffee'));
    var img = new Image(); img.src = 'assets/ctbc-qr-crop.png'; img.alt = '中信付款碼'; img.className = 'cm-qr'; img.draggable = false;
    var link = function () { return cfg.COFFEE_LINK || cfg.CTBC_URL || ''; };
    // plain <img> + click handler (no <a> wrapper, no touch/contextmenu hijack) so iOS long-press save still works
    img.addEventListener('click', function () { if (cfg.COFFEE_LINK) openUrl(cfg.COFFEE_LINK); else openLightbox(); });
    box.appendChild(img);
    // v=261116y (Kai): no 「放大 QR code」 / 「下載付款碼」 links; account line without the bank branch name
    box.appendChild(el('div', 'cm-acct', String(cfg.CTBC_ACCOUNT || '').replace(/\s*中國信託.*$/, '').trim()));
    box.appendChild(el('p', 'cm-hint', '長按圖片可以下載／點圖片直接打開中信轉帳'));
    var act = el('div', 'cm-actions');
    var go = el('button', 'cm-btn', '打開中信轉帳'); go.type = 'button';
    go.addEventListener('click', function () { openUrl(link()); });
    act.appendChild(go); box.appendChild(act);

    if (ctx.modal) { try { return ctx.modal(box, { closeX: true }); } catch (e) {} }
    var bd = el('div', 'fn-backdrop'), md = el('div', 'fn-modal'), x = el('button', 'fn-x', '×'); x.type = 'button'; x.setAttribute('aria-label', '關閉');
    var close = function () { if (bd.parentNode) bd.parentNode.removeChild(bd); };
    x.addEventListener('click', close); bd.addEventListener('click', function (e) { if (e.target === bd) close(); });
    md.appendChild(x); md.appendChild(box); bd.appendChild(md); document.body.appendChild(bd);
    return { close: close };
  }

  function render(container, ctx) {
    var cfg = ctx.config || window.DAYOF_CONFIG || {};
    var page = container; page.classList.add('page-egg');
    var bg = el('div', 'eg-bg'), actor = el('div', 'eg-actor');
        page.appendChild(bg); page.appendChild(el('div', 'eg-vignette')); page.appendChild(actor);

    var cleaned = false, rafId = 0, timers = [], layers = [];
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

    // ---- scene cycling ----
    var scenes = (DAYOF.Where && DAYOF.Where.SCENES && DAYOF.Where.SCENES.length) ? DAYOF.Where.SCENES.slice() : FALLBACK_SCENES.slice();
    var idx = -1;
    function mountScene(id, first) {
      var layer = el('div', 'eg-layer' + (first ? ' first' : '')), handle = null;
      bg.appendChild(layer);
      var ok = false;
      if (DAYOF.Where && DAYOF.Where.mount) {
        try { handle = DAYOF.Where.mount(layer, id, { interactive: false, fit: 'cover', drift: false }); /* v=261116x: centred cover, no pan */ ok = !!handle || layer.childNodes.length > 0; } catch (e) { handle = null; ok = layer.childNodes.length > 0; }
      }
      if (!ok) { var ph = el('div', 'eg-ph'); ph.style.background = PH[id] || PH.park; layer.appendChild(ph); }
      return { el: layer, handle: handle, id: id };
    }
    function nextScene() {
      idx = (idx + 1) % scenes.length;
      var first = idx === 0 && layers.length === 0;
      var L = mountScene(scenes[idx], first);
      if (!first) { void L.el.offsetWidth; L.el.classList.add('on'); }
      var old = layers.slice(); layers.push(L);
      if (old.length) later(function () { old.forEach(dispose); layers = layers.filter(function (x) { return old.indexOf(x) < 0; }); }, 1500);
      DAYOF._finale = DAYOF._finale || {}; DAYOF._finale.eggScene = scenes[idx];
    }
    function dispose(L) { try { if (L.handle && L.handle.destroy) L.handle.destroy(); } catch (e) {} if (L.el.parentNode) L.el.parentNode.removeChild(L.el); }
    nextScene();

    // ---- walker (always moves LEFT; flip only if the art's natural facing is not left) ----
    var wrap = el('div', 'fn-walker'), bob = el('div', 'fn-bob'), img = new Image();
    img.src = IMG; img.alt = '凱凱和姊姊'; img.draggable = false;
    bob.appendChild(el('div', 'fn-shadow')); bob.appendChild(img); wrap.appendChild(bob); actor.appendChild(wrap);
    var W = 390, H = 844, wW = 150, hH = 124, x = 0, t = 0;
    function measure() {
      W = page.clientWidth || 390; H = page.clientHeight || 844;
      hH = Math.max(100, Math.min(190, H * .17));
      wrap.style.setProperty('--fn-h', hH + 'px');
      wW = hH * (img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.21);
    }
    measure(); img.addEventListener('load', measure);
    var onResize = function () { measure(); }; window.addEventListener('resize', onResize);
    var DIR = -1, SX = sxFor(DIR);
    x = W + 10;
    var last = 0;
    function frame(now) {
      if (cleaned) return;
      rafId = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.06, (now - last) / 1000) : 0.016; last = now; t += dt;
      var speed = (W + wW) / CROSS_SEC;
      x += DIR * speed * dt;
      if (x < -wW - 6) { nextScene(); x = W + 6; }   // exited left edge -> next scene, re-enter from the right
      var by = -Math.abs(Math.sin(t * 7.5)) * 6, tilt = Math.sin(t * 7.5) * 2;
      var gy = H - hH - Math.max(34, H * .08);
      wrap.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + (gy + by).toFixed(1) + 'px,0)';
      img.style.transform = 'scaleX(' + SX + ') rotate(' + (tilt * SX).toFixed(1) + 'deg)';
      DAYOF._finale = DAYOF._finale || {}; DAYOF._finale.egg = { x: x, dir: DIR, sx: SX, vx: DIR * speed };
    }
    rafId = requestAnimationFrame(frame);

    // ---- top-right: filters + 2 standout buttons ----
    var lineBox = el('div', 'eg-pop eg-line');
    var lineBtn = el('button', 'eg-bigbtn'); lineBtn.type = 'button'; lineBtn.setAttribute('aria-label', '加入 LINE 社群');
    lineBtn.appendChild(iconNode('line', SVG_LINE));
    lineBtn.addEventListener('click', function () { openUrl(cfg.LINE_URL); });
    lineBox.appendChild(lineBtn);   // v=261118e (Kai): no 「LINE 社群」 caption, the 密碼 bubble is enough
    lineBox.appendChild(el('div', 'eg-bubble', '密碼：' + (cfg.LINE_PASSWORD || '1122')));
    var cofBox = el('div', 'eg-pop eg-coffee');
    var cofBtn = el('button', 'eg-bigbtn'); cofBtn.type = 'button'; cofBtn.setAttribute('aria-label', 'Buy Kai a Coffee');
    cofBtn.appendChild(iconNode('coffee', SVG_COFFEE));
    var modalH = null;
    cofBtn.addEventListener('click', function () { try { if (modalH && modalH.close) modalH.close(); } catch (e) {} modalH = openCoffeeModal(ctx); });
    cofBox.appendChild(cofBtn);
    cofBox.appendChild(el('div', 'eg-bubble', 'Buy Kai a Coffee'));   // v=261118e (Kai): same bubble as 密碼

    var SVG_RESTART = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 24a12 12 0 1 0 4-9"/><path d="M11 8v8h8"/></svg>';
    var rsBox = el('div', 'eg-pop eg-restart');
    var rsBtn = el('button', 'eg-bigbtn'); rsBtn.type = 'button'; rsBtn.setAttribute('aria-label', '從頭開始');
    rsBtn.appendChild(iconNode('restart', SVG_RESTART));
    rsBtn.addEventListener('click', function () {
      if (DAYOF.app && DAYOF.app.restartKeepProgress) DAYOF.app.restartKeepProgress(); else if (ctx.goto) ctx.goto(1);
    });
    rsBox.appendChild(rsBtn); rsBox.appendChild(el('div', 'eg-bubble', '從頭開始'));   // v=261118e (Kai): bubble like 密碼

    // v=261119o (Kai): one button to save every illustration of the evening (cover, lyrics pages, question pages, find-Kai scenes).
    // Phones: Web Share with files → the system sheet offers 「儲存 N 張影像」 (needs a fresh tap, so the files are fetched
    // first and the tap that finds them ready shares at once). No file-share support → one zip download (store-only, built here).
    // v=261119o (Kai): a PHOTO icon (picture with sun and hills), not a download arrow
    var SVG_DL = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="11" width="32" height="26" rx="4"/><circle cx="17.5" cy="20" r="3"/><path d="M9 33l9-8 6 5 7-8 8 9"/></svg>';
    var DL_LIST = [['00-看看', 'assets/cover-illust.jpg']];
    [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32].forEach(function (n) { DL_LIST.push([(n < 10 ? '0' : '') + n + '-歌詞', 'assets/lyrics-bg/' + (n < 10 ? '0' : '') + n + '.jpg']); });
    [9, 13, 15, 21, 29, 31].forEach(function (n) { DL_LIST.push([(n < 10 ? '0' : '') + n + '-問答', 'assets/page-bg/' + (n < 10 ? '0' : '') + n + '.jpg']); });
    [[5, 's05-park'], [7, 's07-escalator'], [17, 's17-bridge'], [19, 's19-moumoon'], [23, 's23-office'], [25, 's25-fireworks'], [27, 's27-nyc']].forEach(function (x) { DL_LIST.push([(x[0] < 10 ? '0' : '') + x[0] + '-凱凱在哪裡', 'assets/scenes/' + x[1] + '.jpg']); });
    DL_LIST.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    var dlFiles = null, dlBusy = false;
    function dlFetch() {
      if (dlFiles || dlBusy) return Promise.resolve(dlFiles);
      dlBusy = true;
      return Promise.all(DL_LIST.map(function (it) {
        return fetch(it[1]).then(function (r) { if (!r.ok) throw new Error(it[1]); return r.blob(); }).then(function (b) { return { name: '看看-' + it[0] + '.jpg', blob: b }; });
      })).then(function (fs) { dlFiles = fs; dlBusy = false; return fs; }, function (e) { dlBusy = false; throw e; });
    }
    function crcTable() { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
    function zipStore(files) {   // files: [{name, bytes:Uint8Array}] → Blob (no compression; JPEGs don't shrink anyway)
      var T = crcTable(), enc = new TextEncoder(), parts = [], cen = [], off = 0;
      files.forEach(function (f) {
        var nm = enc.encode(f.name), d = f.bytes, c = 0xFFFFFFFF, i; for (i = 0; i < d.length; i++) c = T[(c ^ d[i]) & 255] ^ (c >>> 8); c = (c ^ 0xFFFFFFFF) >>> 0;
        var h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, nm.length, true);
        var e = new DataView(new ArrayBuffer(46)); e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint32(16, c, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, nm.length, true); e.setUint32(42, off, true);
        parts.push(h.buffer, nm, d); cen.push(e.buffer, nm); off += 30 + nm.length + d.length;
      });
      var cs = 0; cen.forEach(function (x) { cs += x.byteLength; });
      var z = new DataView(new ArrayBuffer(22)); z.setUint32(0, 0x06054b50, true); z.setUint16(8, files.length, true); z.setUint16(10, files.length, true); z.setUint32(12, cs, true); z.setUint32(16, off, true);
      return new Blob(parts.concat(cen, [z.buffer]), { type: 'application/zip' });
    }
    function dlZip(fs) {
      return Promise.all(fs.map(function (f) { return f.blob.arrayBuffer().then(function (ab) { return { name: f.name, bytes: new Uint8Array(ab) }; }); })).then(function (list) {
        var url = URL.createObjectURL(zipStore(list)), a = document.createElement('a'); a.href = url; a.download = '看看-插畫.zip'; document.body.appendChild(a); a.click();
        later(function () { if (a.parentNode) a.parentNode.removeChild(a); URL.revokeObjectURL(url); }, 4000);
      });
    }
    // v=261119o (Kai): today's set list on YouTube
    var SVG_MUSIC = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 34V12l18-4v22"/><ellipse cx="14" cy="34" rx="5" ry="4"/><ellipse cx="32" cy="30" rx="5" ry="4"/></svg>';
    var plBox = el('div', 'eg-pop eg-playlist');
    var plBtn = el('button', 'eg-bigbtn'); plBtn.type = 'button'; plBtn.setAttribute('aria-label', '本日歌單（YouTube）');
    plBtn.appendChild(iconNode('music', SVG_MUSIC));
    plBtn.addEventListener('click', function () { openUrl(cfg.PLAYLIST_URL || 'https://youtube.com/playlist?list=PLSYxzFWN7gR8&si=jkl7Pm1J-VsRj6sR'); });
    plBox.appendChild(plBtn); plBox.appendChild(el('div', 'eg-bubble', '本日歌單'));
    // v=261119o (Kai): 延伸閱聽 → podcast episode
    var SVG_POD = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="7" width="12" height="20" rx="6"/><path d="M11 22a13 13 0 0 0 26 0"/><path d="M24 35v6"/><path d="M17 41h14"/></svg>';
    var pcBox = el('div', 'eg-pop eg-playlist eg-podcast');
    var pcBtn = el('button', 'eg-bigbtn'); pcBtn.type = 'button'; pcBtn.setAttribute('aria-label', '延伸閱聽（Podcast）');
    pcBtn.appendChild(iconNode('podcast', SVG_POD));
    pcBtn.addEventListener('click', function () { openUrl(cfg.PODCAST_URL || 'https://open.firstory.fm/story/cmq50b0nv002m01zlfkhc0a1j'); });
    pcBox.appendChild(pcBtn); pcBox.appendChild(el('div', 'eg-bubble', '延伸閱聽'));
    var dlBox = el('div', 'eg-pop eg-dl');
    var dlBtn = el('button', 'eg-bigbtn'); dlBtn.type = 'button'; dlBtn.setAttribute('aria-label', '下載圖片');
    dlBtn.appendChild(iconNode('download', SVG_DL));
    var dlBubble = el('div', 'eg-bubble', '點我下載圖片');
    function dlSay(t) { dlBubble.textContent = t; }
    dlBtn.addEventListener('click', function () {
      if (dlBusy) return;
      if (!dlFiles) {   // not fetched yet: fetch now; sharing needs a fresh tap afterwards
        dlSay('準備中…');
        dlFetch().then(function () { if (!cleaned) dlSay('好了，再點一次'); }, function () { if (!cleaned) { dlSay('點我下載圖片'); if (ctx.toast) ctx.toast('圖片載入失敗，請再試一次'); } });
        return;
      }
      var files = []; try { files = dlFiles.map(function (f) { return new File([f.blob], f.name, { type: 'image/jpeg' }); }); } catch (e) { files = []; }
      if (files.length && navigator.canShare && navigator.share && navigator.canShare({ files: files })) {
        navigator.share({ files: files }).then(function () { if (!cleaned) dlSay('點我下載圖片'); }, function (e) {
          if (cleaned) return; dlSay('點我下載圖片');
          if (!e || e.name !== 'AbortError') dlZip(dlFiles).catch(function () { if (ctx.toast) ctx.toast('下載失敗，請再試一次'); });
        });
      } else {
        dlZip(dlFiles).then(function () { if (!cleaned) { dlSay('點我下載圖片'); if (ctx.toast) ctx.toast('已下載「看看-插畫.zip」'); } }, function () { if (ctx.toast) ctx.toast('下載失敗，請再試一次'); });
      }
    });
    dlBox.appendChild(dlBtn); dlBox.appendChild(dlBubble);

    // v=261116aa (Kai): the ⋯ fold holds ALL unlocked filters again (same DAYOF.FilterStack as the lyrics pages, so the
    // camera opens exactly the same way) + LINE / Coffee / 從頭開始 in a row underneath. Filters mount lazily on first expand.
    var own = el('div', 'eg-stack');
    var fold = el('div', 'eg-fold');
    var fsHost = el('div', 'eg-filters');
    var ex = el('div', 'eg-extra'); // v=261119o (Kai): bubbles from shortest to longest, 從頭開始 last
    ex.appendChild(plBox); ex.appendChild(pcBox); ex.appendChild(lineBox); ex.appendChild(dlBox); ex.appendChild(cofBox); ex.appendChild(rsBox);
    fold.appendChild(fsHost); fold.appendChild(ex); own.appendChild(fold);
    page.appendChild(own);
    var fstack = null;
    function mountFilters() {
      if (fstack || !DAYOF.FilterStack || !DAYOF.FilterStack.mount) return;
      try { fstack = DAYOF.FilterStack.mount(fsHost, ctx, { className: 'eg-fs', inline: true }); } catch (e) { console.error(e); fstack = null; }
    }
    var stack = { el: own, destroy: function () {
      try { if (fstack && fstack.destroy) fstack.destroy(); } catch (e) {} fstack = null;
      if (own.parentNode) own.parentNode.removeChild(own);
    } };
    // v=261116x (Kai): every button folds into ONE toggle top-right; starts collapsed, tap to expand/collapse
    var SVG_MORE = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="24" r="2.6" fill="currentColor"/><circle cx="24" cy="24" r="2.6" fill="currentColor"/><circle cx="35" cy="24" r="2.6" fill="currentColor"/></svg>';
    var SVG_X = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M15 15l18 18M33 15L15 33"/></svg>';
    var LBL_OPEN = '展開按鈕（濾鏡、LINE 社群、Buy Kai a Coffee、從頭開始）';
    var tog = el('button', 'round-btn eg-toggle'); tog.type = 'button';
    tog.setAttribute('aria-label', LBL_OPEN);
    tog.setAttribute('aria-expanded', 'false');
    var togIco = el('span', 'ico'); tog.appendChild(togIco);
    function setOpen(on) {
      if (on) mountFilters();
      stack.el.classList.toggle('eg-collapsed', !on);
      tog.setAttribute('aria-expanded', on ? 'true' : 'false');
      tog.setAttribute('aria-label', on ? '收起按鈕' : LBL_OPEN);
      togIco.innerHTML = on ? SVG_X : SVG_MORE;
    }
    // v=261116aa (Kai): make the toggle noticeable — pulse ring (same language as the filter 「NEW」 pulse) + a hint
    // bubble after 1.5 s; both stop for good once the toggle is tapped (state.eggToggleSeen, saved).
    var st = ctx.state || null, hint = null;
    function dropAttn() {
      tog.classList.remove('eg-attn');
      if (hint) { var h = hint; hint = null; h.classList.remove('show'); later(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 320); }
    }
    if (!(st && st.eggToggleSeen)) {
      tog.classList.add('eg-attn');
      later(function () {
        if (cleaned || !tog.classList.contains('eg-attn')) return;
        hint = el('div', 'eg-hint'); hint.setAttribute('role', 'status');
        // v=261118e (Kai): the bubble is just 👉 (full text kept for screen readers)
        hint.classList.add('eg-hint-point'); hint.setAttribute('aria-label', '還有更多：濾鏡、LINE 社群都在這');
        var ar = el('span', 'eg-hint-arrow', '👉'); ar.setAttribute('aria-hidden', 'true'); hint.appendChild(ar);
        page.appendChild(hint);   // outside the stack so the collapsed-fold rule doesn't hide it
        requestAnimationFrame(function () { if (hint) hint.classList.add('show'); });
      }, 1500);
    }
    tog.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (tog.classList.contains('eg-attn') || hint) {
        dropAttn();
        if (st) { st.eggToggleSeen = true; try { ctx.save(); } catch (er) {} }
      }
      setOpen(stack.el.classList.contains('eg-collapsed'));
      dlFetch().catch(function () {});   // warm the pictures while the fold is open so one tap can share them
    });
    stack.el.insertBefore(tog, stack.el.firstChild);
    setOpen(false);
    // the stack sits above the walker/bg
    if (stack.el) stack.el.style.zIndex = '150';

    return function cleanup() {
      cleaned = true; cancelAnimationFrame(rafId); timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
      layers.forEach(dispose); layers = [];
      try { if (modalH && modalH.close) modalH.close(); } catch (e) {}
      try { if (stack && stack.destroy) stack.destroy(); } catch (e) {}
      page.classList.remove('page-egg');
    };
  }

  DAYOF.registerPage('egg', { render: render });
})();
