/* egg.js — step 34: looping 「凱凱在哪裡」 backgrounds, Kai+姊姊 walk right->left, LINE + Buy Kai a Coffee. */
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
    var zoom = el('a', 'cm-zoom', '放大 QR code'); zoom.href = '#'; zoom.setAttribute('role', 'button');
    zoom.addEventListener('click', function (e) { e.preventDefault(); openLightbox(); });
    box.appendChild(zoom);
    box.appendChild(el('div', 'cm-acct', cfg.CTBC_ACCOUNT || ''));
    box.appendChild(el('p', 'cm-hint', '長按圖片可以下載／點圖片直接打開中信轉帳'));
    var act = el('div', 'cm-actions');
    var go = el('button', 'cm-btn', '打開中信轉帳'); go.type = 'button';
    go.addEventListener('click', function () { openUrl(link()); });
    var dl = el('a', 'cm-dl', '下載付款碼'); dl.href = 'assets/ctbc-qr-crop.png'; dl.setAttribute('download', 'kai-coffee-ctbc-qr.png');
    act.appendChild(go); act.appendChild(dl); box.appendChild(act);

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
        try { handle = DAYOF.Where.mount(layer, id, { interactive: false, fit: 'cover' }); ok = !!handle || layer.childNodes.length > 0; } catch (e) { handle = null; ok = layer.childNodes.length > 0; }
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
    lineBox.appendChild(lineBtn); lineBox.appendChild(el('span', 'eg-cap', 'LINE 社群'));
    lineBox.appendChild(el('div', 'eg-bubble', '密碼：' + (cfg.LINE_PASSWORD || '1122')));
    var cofBox = el('div', 'eg-pop eg-coffee');
    var cofBtn = el('button', 'eg-bigbtn'); cofBtn.type = 'button'; cofBtn.setAttribute('aria-label', 'Buy Kai a Coffee');
    cofBtn.appendChild(iconNode('coffee', SVG_COFFEE));
    var modalH = null;
    cofBtn.addEventListener('click', function () { try { if (modalH && modalH.close) modalH.close(); } catch (e) {} modalH = openCoffeeModal(ctx); });
    cofBox.appendChild(cofBtn);
    var cap = el('span', 'eg-cap'); cap.innerHTML = 'Buy Kai<br>a Coffee'; cofBox.appendChild(cap);

    var SVG_RESTART = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 24a12 12 0 1 0 4-9"/><path d="M11 8v8h8"/></svg>';
    var rsBox = el('div', 'eg-pop eg-restart');
    var rsBtn = el('button', 'eg-bigbtn'); rsBtn.type = 'button'; rsBtn.setAttribute('aria-label', '從頭開始');
    rsBtn.appendChild(iconNode('restart', SVG_RESTART));
    rsBtn.addEventListener('click', function () {
      if (DAYOF.app && DAYOF.app.restartKeepProgress) DAYOF.app.restartKeepProgress(); else if (ctx.goto) ctx.goto(1);
    });
    rsBox.appendChild(rsBtn); rsBox.appendChild(el('span', 'eg-cap', '從頭開始'));

    var stack = null;
    if (DAYOF.FilterStack && DAYOF.FilterStack.mount) {
      try { stack = DAYOF.FilterStack.mount(page, ctx, { extra: [lineBox, cofBox, rsBox] }); } catch (e) { stack = null; }
    }
    if (!stack) {
      var own = el('div', 'filter-stack');
      own.style.cssText = 'position:absolute;top:12px;right:12px;z-index:50;display:flex;flex-direction:column;align-items:center;gap:12px';
      own.appendChild(lineBox); own.appendChild(cofBox); own.appendChild(rsBox); page.appendChild(own); stack = { el: own };
    }
    // the stack sits above the walker/bg
    if (stack.el) stack.el.style.zIndex = '50';

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
