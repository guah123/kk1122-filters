/* Page type 'suitcase' (step 11): 上太空的行李箱你要帶什麼去？ — fully pictorial drag-to-pack game */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };

(function () {
  'use strict';
  var INK = '#4A3C30';
  var ST = 'stroke="' + INK + '" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"';
  // Jimmy-Liao-style item sprites (RGBA, trimmed). Internal ids unchanged: 'photoframe' → familyphoto.png.
  // (the former inline-SVG drawings were replaced in v=261116y)
  var SPRITE = { switch: 'switch', headphones: 'headphones', book: 'book', monstera: 'monstera', guitar: 'guitar', chips: 'chips',
    football: 'football', photoframe: 'familyphoto', cigarettes: 'cigarettes', dress: 'dress' };
  var ART = {};
  Object.keys(SPRITE).forEach(function (id) {
    ART[id] = '<img class="sc-spr" src="assets/suitcase/' + SPRITE[id] + '.png" alt="" draggable="false" decoding="async">';
  });

  var ITEMS = [
    { id: 'switch', label: 'Switch' }, { id: 'headphones', label: '全罩耳機' }, { id: 'book', label: '咖啡色書皮的書' },
    { id: 'monstera', label: '龜背芋盆栽' }, { id: 'guitar', label: '一把吉他' }, { id: 'chips', label: '一包洋芋片' },
    { id: 'football', label: '一顆足球' }, { id: 'photoframe', label: '一個全家福相框' }, { id: 'cigarettes', label: '一包菸' },
    { id: 'dress', label: '一套洋裝（和帽子一起）' }
  ];
  // scattered layout (design px on a 390×844 screen; JS maps them onto the real stage). [cx, cy, rotate°, size]
  // bands: header ≤130 · top scatter 132–340 · suitcase 350–494 (sides x≤100 / ≥290) · message ~510 · bottom scatter 536–716
  // v=261118 (Kai): pictures ~1.6–1.75x wider (≈2.6–3x area), no text captions.
  // v=261118b (Kai: "too neat"): casual floor scatter, staggered, ±7…16° tilt. v=261118c: sizes follow real-world size
  // (guitar 2.06 > monstera 1.9 > dress 1.69 > photo 1.6 > book/chips/headphones ~1.43 > football 1.35 > switch 1.2 >
  // cigarettes 0.9). Fixed hand-tuned table (seeded search, then rounded) → same layout every load. Only the picture
  // rotates; the hit box is the un-rotated picture rect (min 52px). test/suitcase.js checks rotated pictures never overlap
  // each other / the case / header / back button and stay on-screen at 390×844, 360×780, 430×932.
  // v=261118d (Kai: follow the Gemini layout painting in/suitcase-v2/layout/ref2.jpg): items fill the upper floor in a loose
  // scatter, the open case sits lower-middle, photo frame + football on its left, cigarettes on its right.
  // v=261118e (Kai: positions / sizes / angles follow ref2.jpg exactly): measured from the painting (ref px → design px:
  // x·390/768, y = 138 + (y−65)·0.505), size = multiplier of the 66px square art box (contain-fit). The whole .sc-item now
  // rotates, so the drag hit area is the ROTATED picture rect. Guitar sprite is a straightened head-up cut (aspect .425);
  // in the painting its body is cut by the right edge — here the whole guitar stays on-screen (shifted left / slightly smaller).
  // measured ref values (for later tuning): switch [75,190,-18,1.57] dress [201,208,-3,2.82] guitar ≈[312,313,-162,4.17] (body cut
  // by the right edge) headphones [62,318,0,1.30] monstera [226,300,0,1.86] book [154,383,14,1.74] chips [331,437,18,1.96]
  // photoframe [66,550,-6,1.39] football [69,716,0,1.25] cigarettes [333,714,-10,1.01]. The painting's items overlap as RECTS
  // (dress / monstera / guitar interleave), so to keep every rotated hit rect + picture apart at 360×780…430×932 the table
  // below is the least-squares nudge of those values: centres within ~20px, angles kept (guitar −170 so it fits on-screen),
  // most items ~80–90% size, guitar ~73% (whole guitar on-screen).
  // v=261118c (owner: "物件尺寸可以再放更大一些些", picked +25%): every item +20…25% vs the table above
  // (was switch 1.4 dress 2.32 guitar 3.05 headphones 1.3 monstera 1.58 book 1.4 chips 1.65 photo 1.2 football 1.24 cig 1.01).
  // To fit, the header moved up 24px (css), the case shrank 255→228 and moved down, the dress drops below the switch (as in
  // the painting), monstera/book/chips shift down, guitar stands upright (−180). Neighbouring pictures may now overlap a little
  // (≤10px, smaller item on top — see ZORD) — test/suitcase.js allows that, still no overlap with header/back, all on-screen.
  var POS = {
    switch: [81, 162, -10, 1.75], dress: [202, 265, 0, 2.79], guitar: [336.5, 250, -180, 3.66],
    headphones: [67.5, 303, 0, 1.56], monstera: [197, 396, 3, 1.96], book: [81, 410, 8, 1.75], chips: [311.5, 447, 11, 2.05],
    photoframe: [64.5, 544, -3, 1.5], football: [69.5, 740.5, 2, 1.55], cigarettes: [332.5, 714, -10, 1.26]
  };
  // sprite picture aspect inside the square art box (contain-fit; from the trimmed PNGs) → item hit box = this rect
  var AR = { switch: [1, .76], headphones: [1, .89], book: [1, .89], monstera: [.79, 1], guitar: [.425, 1], chips: [.95, 1],
    football: [1, 1], photoframe: [.92, 1], cigarettes: [.92, 1], dress: [1, .79] };
  var DESIGN = { W: 390, H: 844, TOP: 130, BOTTOM: 124, CASE_X: 205, CASE_Y: 609, CASE_W: 228 };
  // stacking: smaller picture on top, so where two pictures touch the smaller one stays grabbable
  var ZORD = {}; Object.keys(POS).sort(function (a, b) { return POS[b][3] * POS[b][3] * AR[b][0] * AR[b][1] - POS[a][3] * POS[a][3] * AR[a][0] * AR[a][1]; })
    .forEach(function (id, i) { ZORD[id] = 2 + i; });
  var LABEL = {}; ITEMS.forEach(function (i) { LABEL[i.id] = i.label; });

  // slot centres inside the suitcase interior (viewBox 260x200)
  // v=261118d (Kai): painted suitcase = Veo clip keyed into a sprite sheet (frame 0 open … last closed). Slots are
  // fractions of that picture, on the open case's inner floor (back row first, front row last → front overlaps back).
  var SLOTS = [[.258, .533], [.378, .563], [.498, .593], [.618, .623], [.738, .653], [.195, .605], [.315, .635], [.435, .665], [.555, .695], [.675, .725]];
  var SHEET = { src: 'assets/suitcase/case-sheet.webp?v=261119b', n: 39, cols: 8, rows: 5, land: 25 };
  function sheetPos(k) { var c = k % SHEET.cols, r = Math.floor(k / SHEET.cols); return (c / (SHEET.cols - 1) * 100).toFixed(3) + '% ' + (r / (SHEET.rows - 1) * 100).toFixed(3) + '%'; }
  var ROT = [-7, 4, -3, 8, -5, 5, -8, 3, 7, -4];

  var DEFS = '<svg class="sc-defs" aria-hidden="true"><defs>' +
    '<filter id="sc-rough" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2"/></filter>' +
    '<pattern id="sc-hatch" patternUnits="userSpaceOnUse" width="3.2" height="3.2" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="' + INK + '" stroke-width=".7" opacity=".16"/></pattern>' +
    '</defs></svg>';

  var CS = 'stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
  var BACK = '<svg class="lay back" viewBox="0 0 260 200" aria-hidden="true"><g filter="url(#sc-rough)">' +
    '<path d="M22 86 H238 L252 152 H8z" fill="#E2CBA2" ' + CS + '/><path d="M22 86 H238 L241 104 H19z" fill="#B9996A" opacity=".55"/>' +
    '<path d="M22 86 H238 L252 152 H8z" fill="url(#sc-hatch)"/></g></svg>';
  function strap(x, extra) {
    return '<rect x="' + x + '" y="' + extra[0] + '" width="18" height="' + extra[1] + '" fill="#6F4A30" ' + CS + ' stroke-width="1.8"/>';
  }
  function buckle(x, y) {
    return '<g class="latch"><rect x="' + (x - 3) + '" y="' + y + '" width="24" height="15" rx="3.5" fill="#E5B94F" ' + CS + ' stroke-width="1.8"/><rect x="' + (x + 5) + '" y="' + (y + 4) + '" width="8" height="7" rx="1.5" fill="#6F4A30"/></g>';
  }
  var FRONT = '<svg class="lay front" viewBox="0 0 260 200" aria-hidden="true"><g filter="url(#sc-rough)">' +
    '<rect x="22" y="192" width="24" height="6" rx="3" fill="#6F4A30"/><rect x="214" y="192" width="24" height="6" rx="3" fill="#6F4A30"/>' +
    '<path d="M6 146 H254 L252 188 Q252 194 246 194 H14 Q8 194 8 188z" fill="#A9744A" ' + CS + '/>' +
    '<path d="M6 146 H254 L252 188 Q252 194 246 194 H14 Q8 194 8 188z" fill="url(#sc-hatch)"/>' +
    '<rect x="4" y="144" width="252" height="9" rx="4" fill="#7A5236" ' + CS + ' stroke-width="1.8"/>' +
    '<path d="M16 183 H244" stroke="#F0DDB8" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>' +
    '<path d="M20 160 Q130 154 240 160" stroke="#C99668" stroke-width="2" opacity=".6" fill="none"/>' +
    strap(58, [153, 41]) + strap(184, [153, 41]) + buckle(55, 164) + buckle(181, 164) +
    '<path d="M6 190 L6 178 L18 190z M254 190 L254 178 L242 190z" fill="#E5B94F" stroke="' + INK + '" stroke-width="1.6"/></g></svg>';
  // Lid: one quad hinged at the BACK edge of the body (y=86). phi = opening angle (100 open .. 0 closed).
  function lidSvg(phi, final) {
    var rad = phi * Math.PI / 180;
    var fy = 86 + 64 * Math.cos(rad) - 68 * Math.sin(rad);
    var hw = 98 + 24 * (100 - phi) / 100;
    function B(u, v) { var bx = 22 + 216 * u, fx = 130 - hw + 2 * hw * u; return [bx + (fx - bx) * v, 86 + (fy - 86) * v]; }
    function Q(u0, v0, u1, v1) { return [B(u0, v0), B(u1, v0), B(u1, v1), B(u0, v1)].map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
    function poly(pts, fill, sw, stroke, extra) { return '<polygon points="' + pts + '" fill="' + fill + '" stroke="' + (stroke || INK) + '" stroke-width="' + sw + '" stroke-linejoin="round" ' + (extra || '') + '/>'; }
    function ln(u0, v0, u1, v1, col, w, extra) { var a = B(u0, v0), b = B(u1, v1); return '<path d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" fill="none" ' + (extra || '') + '/>'; }
    var o = '';
    if (final) o += '<path d="M100 88 Q100 56 130 56 Q160 56 160 88" fill="none" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/><path d="M100 88 Q100 56 130 56 Q160 56 160 88" fill="none" stroke="#6F4A30" stroke-width="5" stroke-linecap="round"/>';
    if (phi > 55) { // inside face (lining) visible
      o += poly(Q(0, 0, 1, 1), '#8F5E3C', 2.2) + poly(Q(.06, .07, .94, .92), '#EFDDBC', 1.5);
      [.2, .35, .5, .65, .8].forEach(function (u) { o += ln(u, .1, u, .9, '#DDC498', 3, 'opacity=".6"'); });
      o += ln(.08, .6, .92, .6, '#8A6545', 5) + ln(.08, .6, .92, .6, '#C99668', 2, 'stroke-dasharray="6 5"');
      o += poly(Q(.4, .15, .6, .38), '#F6EFE2', 1.3);
      o += poly(Q(0, 0, 1, 1), 'url(#sc-hatch)', 0, 'none');
    } else {       // outside face (leather, straps, buckles)
      o += poly(Q(0, 0, 1, 1), '#A9744A', 2.2) + poly(Q(0, 0, 1, 1), 'url(#sc-hatch)', 0, 'none');
      o += poly(Q(.07, .1, .93, .9), 'none', 1.6, '#F0DDB8', 'stroke-dasharray="5 4"');
      o += poly(Q(.205, 0, .279, 1), '#6F4A30', 1.8) + poly(Q(.721, 0, .795, 1), '#6F4A30', 1.8);
      [.2325, .7585].forEach(function (uc) {
        o += '<g class="latch">' + poly(Q(uc - .06, .62, uc + .06, .88), '#E5B94F', 1.8) + poly(Q(uc - .02, .68, uc + .02, .8), '#6F4A30', 0) + '</g>';
      });
    }
    return '<g filter="url(#sc-rough)">' + o + '</g>';
  }

  var ROCKET = '<svg class="sc-rocket" viewBox="0 0 34 46"><g ' + ST + '><path d="M17 2 Q27 12 25 30 H9 Q7 12 17 2z" fill="#FBF7EF"/><circle cx="17" cy="16" r="4" fill="#9DBFD8"/><path d="M9 24 L2 34 L9 32z M25 24 L32 34 L25 32z" fill="#C65D4C"/><path d="M12 30 Q17 44 22 30z" fill="#F2C66D"/></g></svg>';
  var STAR = '<svg class="sc-star" viewBox="0 0 24 24"><path d="M12 1 L15 9 L23 9.5 L17 14.5 L19 23 L12 18 L5 23 L7 14.5 L1 9.5 L9 9z" fill="#F2C66D" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  function renderDefault(container, ctx) {
      var state = ctx.state;
      var saved = state.suitcase && state.suitcase.closed ? state.suitcase : null;
      var slotOf = {};               // id -> slot index (packed)
      var closed = false, closing = false, zeroAsked = false, dragging = null, lastDragEnd = 0;
      var timers = [], ghosts = [], raf = 0;
      function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

      // ---- DOM
      var stage = document.createElement('div'); stage.className = 'sc-stage';
      var html = DEFS +
        '<div class="sc-head"><h2 class="sc-title">上太空的行李箱你要帶什麼去？</h2><p class="sc-hint">把想帶的東西拖進行李箱，<br>拖完點一下行李箱，把它關起來</p></div>';
      html += ITEMS.map(function (it) {
        var q = POS[it.id], t = -q[2] * Math.PI / 180;   // ground shadow stays down-right although the item box is rotated
        var shx = (2 * Math.cos(t) - 6 * Math.sin(t)).toFixed(1), shy = (2 * Math.sin(t) + 6 * Math.cos(t)).toFixed(1);
        // v=261118: no visible caption; the name stays available to screen readers
        return '<div class="sc-item" data-id="' + it.id + '" role="img" aria-label="' + LABEL[it.id].replace(/"/g, '&quot;') + '" title="' + LABEL[it.id].replace(/"/g, '&quot;') + '" style="z-index:' + ZORD[it.id] + ';--r:' + q[2] + 'deg;--shx:' + shx + 'px;--shy:' + shy + 'px;--z:' + q[3] + ';--aw:' + AR[it.id][0] + ';--ah:' + AR[it.id][1] + '"><div class="sc-art">' + ART[it.id] + '</div></div>';
      }).join('');
      html += '<div class="sc-case" role="button" aria-label="行李箱"><div class="shadow"></div><div class="lay back sc-pic"></div><div class="sc-slots"></div><div class="lay front sc-pic"></div></div>';
      html += '<div class="sc-under"><div class="sc-msg"></div><div class="sc-actions"><button class="btn sc-fallbackbtn" type="button">繼續看看👀</button></div></div>';
      stage.innerHTML = html;
      container.appendChild(stage);

      var $case = stage.querySelector('.sc-case'), $slots = stage.querySelector('.sc-slots');
      var $msg = stage.querySelector('.sc-msg'), $hint = stage.querySelector('.sc-hint'), $btn = stage.querySelector('.sc-actions .btn');
      var $under = stage.querySelector('.sc-under');
      var $pics = stage.querySelectorAll('.sc-case .sc-pic'), $front = stage.querySelector('.sc-case .lay.front');
      [].forEach.call($pics, function (e) { e.style.backgroundImage = 'url("' + SHEET.src + '")'; e.style.backgroundSize = (SHEET.cols * 100) + '% ' + (SHEET.rows * 100) + '%'; });
      function frame(k) { var bp = sheetPos(k); [].forEach.call($pics, function (e) { e.style.backgroundPosition = bp; }); }
      frame(0);
      var trayEl = {}; [].forEach.call(stage.querySelectorAll('.sc-item'), function (el) { trayEl[el.getAttribute('data-id')] = el; });

      function layout() {
        var W = stage.clientWidth, Hh = stage.clientHeight; if (!W || !Hh) return;
        var sx = Math.min(1.15, W / DESIGN.W), sy = Math.max(0.6, (Hh - DESIGN.TOP - DESIGN.BOTTOM) / (DESIGN.H - DESIGN.TOP - DESIGN.BOTTOM));
        var k = Math.min(1, sx, sy);
        stage.style.setProperty('--s', k.toFixed(3));
        var X = function (cx) { return W / 2 + (cx - DESIGN.W / 2) * sx; }, Y = function (cy) { return DESIGN.TOP + (cy - DESIGN.TOP) * sy; };
        ITEMS.forEach(function (it) { var q = POS[it.id], e = trayEl[it.id]; e.style.left = X(q[0]).toFixed(1) + 'px'; e.style.top = Y(q[1]).toFixed(1) + 'px'; });
        $case.style.left = X(DESIGN.CASE_X).toFixed(1) + 'px'; $case.style.top = Y(DESIGN.CASE_Y).toFixed(1) + 'px'; $case.style.width = (DESIGN.CASE_W * Math.min(1.1, sx, sy)).toFixed(1) + 'px';
        var s = stage.getBoundingClientRect(), c = $case.getBoundingClientRect();
        if (c.height) $under.style.top = (c.bottom - s.top + 12) + 'px';
      }
      window.addEventListener('resize', layout);
      layout(); later(layout, 60);

      // ---- packed items inside the suitcase
      function slotCss(i) { return { l: SLOTS[i][0] * 100, t: SLOTS[i][1] * 100 }; }
      function addPacked(id, i) {
        var el = document.createElement('div');
        el.className = 'sc-packed'; el.setAttribute('data-id', id);
        var p = slotCss(i);
        el.style.left = p.l + '%'; el.style.top = p.t + '%'; el.style.zIndex = i + 1;
        el.style.rotate = ROT[i] + 'deg';
        el.innerHTML = ART[id]; el.setAttribute('draggable', 'false');
        el.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        el.addEventListener('pointerdown', function (e) { startDrag(e, id, true, el); });
        $slots.appendChild(el);
        return el;
      }
      function packedEl(id) { return $slots.querySelector('[data-id="' + id + '"]'); }
      function freeSlot() { var used = {}; Object.keys(slotOf).forEach(function (k) { used[slotOf[k]] = 1; }); for (var i = 0; i < SLOTS.length; i++) if (!used[i]) return i; return SLOTS.length - 1; }
      function packedIds() { return ITEMS.map(function (i) { return i.id; }).filter(function (id) { return id in slotOf; }); }

      // ---- drag
      function overCase(x, y) {
        var r = $case.getBoundingClientRect(), m = 10;
        return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
      }
      var LIFT = 30;
      function ghostPlace(g, x, y, s) { g.style.transform = 'translate(' + (x - 38) + 'px,' + (y - 38 - LIFT) + 'px) scale(' + s + ')'; }
      function artPx(id) { // on-screen side of the (rotated) square art box, measured un-rotated
        var a = trayEl[id] && trayEl[id].querySelector('.sc-art'); return a ? a.offsetWidth * (parseFloat(stage.style.getPropertyValue('--s')) || 1) : 0;
      }
      function dragScale(id, fromPacked) { // v=261118: ghost ≈ the (now big) picture you picked up, slightly lifted (upright while dragging)
        var w = fromPacked ? 0 : artPx(id);
        return w ? Math.max(1.18, w / 76 * 1.05) : 1.18;
      }
      var capture = null; // tap tracker for the suitcase
      function abortDrag() {
        var d = dragging; if (!d) return;
        dragging = null; $case.classList.remove('over');
        if (d.cleanup) d.cleanup();
        if (d.ghost) { if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost); }
        if (d.fromPacked) { var pe = packedEl(d.id); if (pe) pe.style.opacity = ''; } else if (trayEl[d.id]) trayEl[d.id].classList.remove('gone');
      }
      function startDrag(e, id, fromPacked, src) {
        if (closed || closing) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (dragging) abortDrag();   // stale drag (lost pointerup on iOS) must never block new drags
        e.preventDefault();
        var d = dragging = { id: id, fromPacked: fromPacked, pid: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, src: src, done: false };
        try { src.setPointerCapture(e.pointerId); } catch (err) { }
        function mv(ev) {
          if (ev.pointerId !== d.pid || d.done) return;
          var x = ev.clientX, y = ev.clientY;
          if (!d.moved) {
            if (Math.abs(x - d.sx) + Math.abs(y - d.sy) < 7) return;
            d.moved = true; if (capture) capture.blocked = true;
            var g = document.createElement('div'); g.className = 'sc-ghost'; g.innerHTML = ART[id];
            document.body.appendChild(g); ghosts.push(g); d.ghost = g; d.gs = dragScale(id, fromPacked);
            if (fromPacked) src.style.opacity = '0'; else trayEl[id].classList.add('gone');
          }
          ghostPlace(d.ghost, x, y, d.gs || 1.18);
          $case.classList.toggle('over', overCase(x, y) || overCase(x, y - LIFT));
        }
        function up(ev) {
          if (ev.pointerId !== d.pid || d.done) return;
          d.done = true; d.cleanup();
          dragging = null; $case.classList.remove('over');
          if (!d.moved) { if (!fromPacked) { trayEl[id].classList.add('wiggle'); later(function () { trayEl[id].classList.remove('wiggle'); }, 500); } return; }
          var x = ev.clientX, y = ev.clientY, ok = ev.type !== 'pointercancel' && (overCase(x, y) || overCase(x, y - LIFT));
          if (ok) dropIn(d, x, y); else dropOut(d);
        }
        d.cleanup = function () {
          src.removeEventListener('pointermove', mv); src.removeEventListener('pointerup', up); src.removeEventListener('pointercancel', up);
          window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          try { src.releasePointerCapture(d.pid); } catch (err) { }
        };
        src.addEventListener('pointermove', mv); src.addEventListener('pointerup', up); src.addEventListener('pointercancel', up);
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      }
      function endGhost(g) { later(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 300); }
      function dropIn(d, x, y) {
        var id = d.id, g = d.ghost, i;
        if (d.fromPacked) { i = slotOf[id]; } else { i = freeSlot(); slotOf[id] = i; zeroAsked = false; }
        var r = $case.getBoundingClientRect(), tx = r.left + SLOTS[i][0] * r.width, ty = r.top + SLOTS[i][1] * r.height;
        var s = (0.15 * r.width) / 76;
        g.classList.add('anim'); g.style.transform = 'translate(' + (tx - 38) + 'px,' + (ty - 38) + 'px) scale(' + s + ')';
        later(function () {
          if (d.fromPacked) { var pe = packedEl(id); if (pe) pe.style.opacity = ''; } else { addPacked(id, i); }
          if (g.parentNode) g.parentNode.removeChild(g);
        }, 270);
        updateMsg();
      }
      function dropOut(d) {
        var id = d.id, g = d.ghost, t = trayEl[id].getBoundingClientRect();
        if (d.fromPacked) { var pe = packedEl(id); if (pe) pe.parentNode.removeChild(pe); delete slotOf[id]; }
        var s = (artPx(id) || t.width) / 76;   // fly back and settle into the item's tossed angle
        g.classList.add('anim'); g.style.transform = 'translate(' + (t.left + t.width / 2 - 38) + 'px,' + (t.top + t.height / 2 - 38) + 'px) rotate(' + POS[id][2] + 'deg) scale(' + s + ')';
        later(function () { trayEl[id].classList.remove('gone'); }, 240);
        endGhost(g); updateMsg();
      }
      ITEMS.forEach(function (it) {
        var el = trayEl[it.id];
        el.addEventListener('pointerdown', function (e) { startDrag(e, it.id, false, el); });
        el.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
        el.setAttribute('draggable', 'false');
        [].forEach.call(el.querySelectorAll('svg, img'), function (v) { v.setAttribute('draggable', 'false'); v.setAttribute('focusable', 'false'); });
        el.addEventListener('dragstart', function (e) { e.preventDefault(); });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
      // block page scroll / rubber-band while this step is mounted (iOS)
      function stopTouch(e) { if (e.cancelable) e.preventDefault(); }
      stage.addEventListener('touchmove', stopTouch, { passive: false });
      container.addEventListener('touchmove', stopTouch, { passive: false });
      container.style.touchAction = 'none';
      var prevOB = [document.documentElement.style.overscrollBehavior, document.body.style.overscrollBehavior];
      document.documentElement.style.overscrollBehavior = 'none'; document.body.style.overscrollBehavior = 'none';

      function updateMsg() { if (!closed && !closing) $msg.textContent = ''; }

      // ---- closing
      function onCaseTap() {
        if (closed || closing) return;
        var n = packedIds().length;
        if (n === 0 && !zeroAsked) { zeroAsked = true; $msg.textContent = '什麼都不帶嗎？再點一次就關上囉'; return; }
        closeCase(true);
      }
      var lastTap = 0, lastPD = 0;
      $case.addEventListener('pointerdown', function (e) { lastPD = Date.now(); capture = { x: e.clientX, y: e.clientY, t: Date.now(), blocked: false, pid: e.pointerId }; });
      $case.addEventListener('pointerup', function (e) {
        var c = capture; capture = null;
        if (!c || c.blocked || c.pid !== e.pointerId) return;
        if (Math.abs(e.clientX - c.x) + Math.abs(e.clientY - c.y) > 14 || Date.now() - c.t > 900) return;
        lastTap = Date.now(); onCaseTap();
      });
      $case.addEventListener('pointercancel', function () { capture = null; });
      $case.addEventListener('click', function () { if (Date.now() - lastPD < 1500) return; if (Date.now() - lastTap > 700) { lastTap = Date.now(); onCaseTap(); } });

      function puff() {
        var box = document.createElement('div'); box.className = 'sc-puff'; $case.parentNode.appendChild(box);
        var r = $case.getBoundingClientRect(), s = stage.getBoundingClientRect();
        box.style.left = (r.left - s.left + r.width / 2) + 'px'; box.style.top = (r.top - s.top + r.height * 0.3) + 'px';
        for (var k = 0; k < 9; k++) {
          var w = document.createElement('div'); w.innerHTML = STAR; var st = w.firstChild;
          var a = (-90 + (k - 4) * 22) * Math.PI / 180, dist = 70 + (k % 3) * 28;
          st.style.setProperty('--dx', Math.cos(a) * dist + 'px'); st.style.setProperty('--dy', Math.sin(a) * dist + 'px');
          st.style.animationDelay = (k % 3) * 60 + 'ms'; box.appendChild(st);
        }
        var rk = document.createElement('div'); rk.innerHTML = ROCKET; box.appendChild(rk.firstChild);
        later(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
      }

      function finishClosed(animated) {
        closed = true; closing = false;
        var n = packedIds().length;
        Object.keys(trayEl).forEach(function (id) { trayEl[id].classList.add('away'); });
        $hint.textContent = n ? '行李箱關好了，準備出發！' : '輕輕的，什麼都不帶也很好。';
        $msg.textContent = n ? '帶了 ' + n + ' 樣東西' : '';
        later(function () { $btn.classList.add('show'); }, animated ? 250 : 0);
      }

      function closeCase(animated) {
        if (closed || closing) return;
        closing = true; $msg.textContent = '';
        var ids = packedIds();
        state.suitcase = { packed: ids, closed: true, at: Date.now() };
        try { ctx.save(); } catch (e) { }
        if (!animated) { $case.classList.add('closed'); frame(SHEET.n - 1); $slots.style.opacity = '0'; finishClosed(false); return; }
        // lid falls (frames 0…land, gravity ease) → lands: bounce + stars → clasps snap (land…last)
        var t0 = null, FALL = 640, CLASP = 400, landed = false;
        $slots.style.transition = 'opacity .15s'; $front.style.opacity = '0';
        function step(ts) {
          if (t0 === null) t0 = ts;
          var el = ts - t0, k;
          if (el < FALL) { var t = el / FALL, e = t * t * (1.6 - 0.6 * t); k = Math.round(e * SHEET.land); if (t > 0.72) $slots.style.opacity = '0'; }
          else { if (!landed) { landed = true; $slots.style.opacity = '0'; $case.classList.add('bounce'); puff(); }
            k = SHEET.land + Math.round(Math.min(1, (el - FALL) / CLASP) * (SHEET.n - 1 - SHEET.land)); }
          frame(k);
          if (el < FALL + CLASP) { raf = requestAnimationFrame(step); return; }
          frame(SHEET.n - 1); $case.classList.add('closed');
          later(function () { finishClosed(true); }, 60);
        }
        raf = requestAnimationFrame(step);
      }

      $btn.addEventListener('click', function () { if (closed) ctx.next(); });

      // (v=261116y) no filter stack on step 11 — Kai: filter buttons only on lyrics pages
      var stack = null;

      // ---- restore
      if (saved) {
        (saved.packed || []).forEach(function (id) { if (ART[id] && !(id in slotOf)) { var i = freeSlot(); slotOf[id] = i; addPacked(id, i); trayEl[id].classList.add('gone'); } });
        closing = false; $case.classList.add('closed'); frame(SHEET.n - 1); $slots.style.opacity = '0';
        finishClosed(false);
      }

      return function cleanup() {
        window.removeEventListener('resize', layout); if (dragging && dragging.cleanup) dragging.cleanup();
        if (stack && stack.destroy) stack.destroy();
        timers.forEach(clearTimeout);
        ghosts.forEach(function (g) { if (g.parentNode) g.parentNode.removeChild(g); });
        dragging = null; cancelAnimationFrame(raf);
        document.documentElement.style.overscrollBehavior = prevOB[0]; document.body.style.overscrollBehavior = prevOB[1];
      };
    }

  /* ======================================================================================================
   * Painted-scene mode (OFF by default). Turned on only when data/scenes/suitcase.json exists (or, for tests,
   * ?suitcaseCfg=<relative .json path>). Format: data/scenes/suitcase.schema.md. The 10 props are painted INTO the
   * background; invisible hit regions sit over them, a drag lifts a crop of the painting (and reveals the optional
   * 'empty' painting underneath), dropping into the suitcase zone packs it, tapping the zone closes the case.
   * ====================================================================================================== */
  var ALIAS = { familyphoto: 'photoframe' };
  function validRect(r) {
    return Array.isArray(r) && r.length === 4 && r.every(function (v) { return typeof v === 'number' && v >= 0 && v <= 1; }) && r[2] > r[0] && r[3] > r[1];
  }
  function normCfg(c) {
    if (!c || typeof c !== 'object' || c.enabled === false || typeof c.bg !== 'string' || !validRect(c.suitcase) || !c.items) return null;
    var items = {}, n = 0;
    Object.keys(c.items).forEach(function (k) { var id = ALIAS[k] || k; if (LABEL[id] && validRect(c.items[k])) { items[id] = c.items[k]; n++; } });
    if (!n) return null;
    var cut = {}; if (c.cutouts && typeof c.cutouts === 'object') Object.keys(c.cutouts).forEach(function (k) { var id = ALIAS[k] || k; if (items[id] && typeof c.cutouts[k] === 'string') cut[id] = c.cutouts[k]; });
    return { bg: c.bg, empty: typeof c.empty === 'string' ? c.empty : null, closed: typeof c.closed === 'string' ? c.closed : null, items: items, suitcase: c.suitcase, lid: validRect(c.lid) ? c.lid : null, cutouts: cut };
  }
  function loadSceneCfg() {
    if (!window.fetch) return Promise.resolve(null);
    var url = 'data/scenes/suitcase.json';
    try {
      var q = new URLSearchParams(location.search).get('suitcaseCfg');   // debug/test only: relative same-origin .json
      if (q && /^[\w\-./]+\.json$/.test(q) && q.indexOf('..') < 0 && q.charAt(0) !== '/') url = q;
    } catch (e) { }
    return fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) { return c && c.enabled === false ? null : normCfg(c); }, function () { return null; });
  }
  function loadImg(src) { return new Promise(function (res) { if (!src) return res(null); var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }

  function renderScene(container, ctx, cfg, bgImg) {
    var state = ctx.state;
    var saved = state.suitcase && state.suitcase.closed ? state.suitcase : null;
    var IW = bgImg.naturalWidth, IH = bgImg.naturalHeight;
    var ids = ITEMS.map(function (i) { return i.id; }).filter(function (id) { return cfg.items[id]; });
    var packed = {}, order = [];      // id -> true, packing order
    var closed = false, closing = false, zeroAsked = false, dragging = null;
    var timers = [], ghosts = [], raf = 0, geo = null;
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function E(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

    var stage = E('div', 'sc-stage sc-scene', container);
    stage.innerHTML = DEFS + '<div class="scs-bg"></div><div class="scs-img"></div><div class="scs-layer"></div>' +
      '<div class="sc-head"><h2 class="sc-title">上太空的行李箱你要帶什麼去？</h2><p class="sc-hint">把想帶的東西拖進行李箱，<br>拖完點一下行李箱，把它關起來</p></div>' +
      '<div class="sc-under"><div class="sc-msg"></div><div class="sc-actions"><button class="btn sc-fallbackbtn" type="button">繼續看看👀</button></div></div>';
    var $bg = stage.querySelector('.scs-bg'), $layer = stage.querySelector('.scs-layer');
    var $hint = stage.querySelector('.sc-hint'), $msg = stage.querySelector('.sc-msg'), $btn = stage.querySelector('.sc-actions .btn'), $under = stage.querySelector('.sc-under');
    var $img = stage.querySelector('.scs-img');
    $bg.style.backgroundImage = 'url("' + (cfg.empty || cfg.bg) + '")';   // blurred backdrop fills the bands around the width-fit painting
    $img.style.backgroundImage = 'url("' + cfg.bg + '")';
    var emptyEl = {}, hitEl = {};
    ids.forEach(function (id) {
      if (cfg.empty) { var p = E('div', 'scs-empty', $layer); p.style.backgroundImage = 'url("' + cfg.empty + '")'; emptyEl[id] = p; }
      var h = E('div', 'scs-hit', $layer); h.setAttribute('data-id', id); h.setAttribute('role', 'button'); h.setAttribute('aria-label', LABEL[id]); hitEl[id] = h;
    });
    var $zone = E('div', 'scs-zone', $layer); $zone.setAttribute('role', 'button'); $zone.setAttribute('aria-label', '行李箱');
    var $closedImg = null; if (cfg.closed) { $closedImg = E('div', 'scs-closedimg', $layer); $closedImg.style.backgroundImage = 'url("' + cfg.closed + '")'; }
    var $packs = E('div', 'scs-packs', $zone);
    // when there is no painted 'closed' plate: the painted open lid is softened (blurred crop of the plate) while the SVG lid closes
    var $veil = E('div', 'scs-veil', $layer); $veil.style.backgroundImage = 'url("' + (cfg.empty || cfg.bg) + '")';
    var $lidZone = E('div', 'scs-zone scs-lidzone', $layer); if (!cfg.lid) $lidZone.style.display = 'none';   // open lid is tappable too
    var $lid = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); $lid.setAttribute('class', 'scs-lid'); $lid.setAttribute('viewBox', '0 0 260 200'); $lid.setAttribute('preserveAspectRatio', 'none'); $layer.appendChild($lid);
    var packEl = {};

    // ---- geometry: cover transform of the painting onto the stage
    function crop(el, r) {   // show painting region r (fractions) inside el, which is sized/positioned to r
      el.style.backgroundSize = geo.iw + 'px ' + geo.ih + 'px';
      el.style.backgroundPosition = (-r[0] * geo.iw) + 'px ' + (-r[1] * geo.ih) + 'px';
    }
    var MINHIT = 48;
    function padBox(b) { var w = Math.max(b.w, MINHIT), h = Math.max(b.h, MINHIT); return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w: w, h: h }; }
    function inB(x, y, b) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
    // overlapping props: the smallest box that CONTAINS the point wins, else the nearest centre among padded boxes
    function pick(x, y) {
      var best = null, bestA = 1e12, near = null, nearD = 1e12;
      ids.forEach(function (id) {
        if (packed[id]) return; var b = R(cfg.items[id]);
        if (inB(x, y, b)) { var a = b.w * b.h; if (a < bestA) { bestA = a; best = id; } }
        else if (inB(x, y, padBox(b))) { var d = Math.hypot(x - b.x - b.w / 2, y - b.y - b.h / 2); if (d < nearD) { nearD = d; near = id; } }
      });
      return best || near;
    }
    function R(r) { return { x: geo.ox + r[0] * geo.iw, y: geo.oy + r[1] * geo.ih, w: (r[2] - r[0]) * geo.iw, h: (r[3] - r[1]) * geo.ih }; }
    function place(el, b) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; el.style.width = b.w + 'px'; el.style.height = b.h + 'px'; }
    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
      // WIDTH-FIT (every painted prop reachable): image width = stage width, vertically centred between the header and
      // the bottom restart-link strip; if that is too short, fit the height instead (bands left/right)
      var HEAD = 136, FOOT = 56, k = Math.min(W / IW, (H - HEAD - FOOT) / IH);
      geo = { k: k, iw: IW * k, ih: IH * k, W: W, H: H }; geo.ox = (W - geo.iw) / 2; geo.oy = HEAD + Math.max(0, (H - HEAD - FOOT - geo.ih) / 2);
      place($img, { x: geo.ox, y: geo.oy, w: geo.iw, h: geo.ih });
      ids.forEach(function (id) {
        var b = R(cfg.items[id]);
        if (emptyEl[id]) { place(emptyEl[id], b); crop(emptyEl[id], cfg.items[id]); }
        place(hitEl[id], padBox(b));   // marker only (pointer-events:none); touches are resolved by pick()
      });
      var z = R(cfg.suitcase); place($zone, z);
      if ($closedImg) { place($closedImg, z); crop($closedImg, cfg.suitcase); }
      // SVG lid fallback: map the lid art's body (viewBox x 6..254, y 86..194) onto the zone
      var lw = z.w * 260 / 248, lh = z.h * 200 / 108;
      place($lid, { x: z.x - 6 / 248 * z.w, y: z.y - 86 / 108 * z.h, w: lw, h: lh });
      order.forEach(function (id, i) { slotPlace(packEl[id], i); });
      if (cfg.lid) { var lb = R(cfg.lid); place($lidZone, lb); place($veil, lb); crop($veil, cfg.lid); }
      // message + 繼續看看 float over the empty wall in the upper part of the painting
      $under.style.bottom = 'auto'; $under.style.top = Math.max(HEAD + 4, geo.oy + geo.ih * 0.13) + 'px';
    }
    // packed minis: 5×2 grid over the lower part of the zone
    function slotPlace(el, i) {
      if (!el) return; var z = R(cfg.suitcase), id = el.getAttribute('data-id'), b = R(cfg.items[id]);
      // two loose rows on the case's open interior (upper ~60% of the body box), slightly overlapping like a real pile
      var cw = z.w / 5, chh = z.h * 0.3, s = Math.min(cw * 1.3 / b.w, chh * 1.25 / b.h, 1);
      var cx = (i % 5 + 0.5) * cw + (Math.floor(i / 5) ? cw * 0.25 : 0), cy = z.h * 0.16 + (Math.floor(i / 5) + 0.5) * chh;
      el.style.width = b.w + 'px'; el.style.height = b.h + 'px'; lifted(el, id);
      el.style.left = (cx - b.w / 2) + 'px'; el.style.top = (cy - b.h / 2) + 'px';
      el.style.transform = 'scale(' + s.toFixed(3) + ') rotate(' + ROT[i % ROT.length] + 'deg)';
    }
    function lifted(el, id) {
      if (cfg.cutouts[id]) { el.style.backgroundImage = 'url("' + cfg.cutouts[id] + '")'; el.style.backgroundSize = '100% 100%'; el.style.backgroundPosition = '0 0'; el.classList.add('cut'); }
      else { el.style.backgroundImage = 'url("' + cfg.bg + '")'; crop(el, cfg.items[id]); }
    }
    function setRemoved(id, on) { if (emptyEl[id]) emptyEl[id].classList.toggle('show', !!on); }
    function addPacked(id) {
      if (packed[id]) return; packed[id] = true; order.push(id);
      var el = E('div', 'scs-pack', $packs); el.setAttribute('data-id', id);
      packEl[id] = el; slotPlace(el, order.length - 1); setRemoved(id, true); hitEl[id].classList.add('gone');
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); startDrag(e, id, true, el); });
    }
    function removePacked(id) {
      if (!packed[id]) return; delete packed[id]; order.splice(order.indexOf(id), 1);
      var el = packEl[id]; if (el && el.parentNode) el.parentNode.removeChild(el); delete packEl[id];
      order.forEach(function (oid, i) { slotPlace(packEl[oid], i); });
      setRemoved(id, false); hitEl[id].classList.remove('gone');
    }

    // ---- drag (pointer events + capture; stale drags aborted; iOS scroll blocked below)
    var LIFT = 30, capture = null;
    function overZone(x, y) {
      return [$zone, cfg.lid ? $lidZone : null].some(function (el) { if (!el) return false; var r = el.getBoundingClientRect(), m = 12; return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m; });
    }
    function ghostAt(g, x, y, s) { g.style.transform = 'translate(' + (x - g._w * s / 2) + 'px,' + (y - g._h * s / 2 - LIFT) + 'px) scale(' + s + ')'; }   // transform-origin 0 0
    function abortDrag() { var d = dragging; if (!d) return; dragging = null; $zone.classList.remove('over'); d.cleanup(); if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost); if (d.fromPacked) packEl[d.id] && (packEl[d.id].style.opacity = ''); else setRemoved(d.id, false); }
    function startDrag(e, id, fromPacked, src) {
      if (closed || closing) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (dragging) abortDrag();
      e.preventDefault();
      var d = dragging = { id: id, fromPacked: fromPacked, pid: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, done: false };
      try { src.setPointerCapture(e.pointerId); } catch (er) { }
      function mv(ev) {
        if (ev.pointerId !== d.pid || d.done) return;
        if (!d.moved) {
          if (Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) < 7) return;
          d.moved = true; if (capture) capture.blocked = true;
          var b = R(cfg.items[id]), g = E('div', 'scs-ghost', document.body); g._w = b.w; g._h = b.h;
          g.style.width = b.w + 'px'; g.style.height = b.h + 'px'; lifted(g, id);
          ghosts.push(g); d.ghost = g;
          if (fromPacked) packEl[id].style.opacity = '0'; else setRemoved(id, true);
        }
        ghostAt(d.ghost, ev.clientX, ev.clientY, 1.12);
        $zone.classList.toggle('over', overZone(ev.clientX, ev.clientY) || overZone(ev.clientX, ev.clientY - LIFT));
      }
      function up(ev) {
        if (ev.pointerId !== d.pid || d.done) return;
        d.done = true; d.cleanup(); dragging = null; $zone.classList.remove('over');
        if (!d.moved) { if (!fromPacked && hitEl[id]) { hitEl[id].classList.add('wiggle'); later(function () { hitEl[id].classList.remove('wiggle'); }, 500); } return; }
        var x = ev.clientX, y = ev.clientY, ok = ev.type !== 'pointercancel' && (overZone(x, y) || overZone(x, y - LIFT));
        var g = d.ghost; g.classList.add('anim');
        if (ok) {
          if (!fromPacked) { zeroAsked = false; addPacked(id); packEl[id].style.opacity = '0'; }
          var pr = packEl[id].getBoundingClientRect();
          var ps = Math.min(pr.width / g._w, pr.height / g._h); g.style.transform = 'translate(' + (pr.left + pr.width / 2 - g._w * ps / 2) + 'px,' + (pr.top + pr.height / 2 - g._h * ps / 2) + 'px) scale(' + ps.toFixed(3) + ')';
          later(function () { if (packEl[id]) packEl[id].style.opacity = ''; if (g.parentNode) g.parentNode.removeChild(g); }, 270);
        } else {
          var b = R(cfg.items[id]), sr = stage.getBoundingClientRect();
          if (fromPacked) removePacked(id); else setRemoved(id, true);
          g.style.transform = 'translate(' + (sr.left + b.x) + 'px,' + (sr.top + b.y) + 'px) scale(1)';
          later(function () { setRemoved(id, false); if (g.parentNode) g.parentNode.removeChild(g); }, 270);
        }
        $msg.textContent = '';
      }
      d.cleanup = function () {
        ['pointermove', 'pointerup', 'pointercancel'].forEach(function (t, i) { var f = i ? up : mv; src.removeEventListener(t, f); window.removeEventListener(t, f); });
        try { src.releasePointerCapture(d.pid); } catch (er) { }
      };
      ['pointermove', 'pointerup', 'pointercancel'].forEach(function (t, i) { var f = i ? up : mv; src.addEventListener(t, f); window.addEventListener(t, f); });
    }
    $layer.addEventListener('pointerdown', function (e) {
      if (closed || closing || (e.target.closest && e.target.closest('.scs-pack'))) return;   // packed minis handle themselves
      var sr = stage.getBoundingClientRect(), id = pick(e.clientX - sr.left, e.clientY - sr.top);
      if (!id) return;                                         // not on a prop → the suitcase zones get the event
      e.stopPropagation(); startDrag(e, id, false, $layer);
    }, true);
    $layer.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    $layer.addEventListener('dragstart', function (e) { e.preventDefault(); });
    $layer.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    function stopTouch(e) { if (e.cancelable) e.preventDefault(); }
    stage.addEventListener('touchmove', stopTouch, { passive: false });
    container.addEventListener('touchmove', stopTouch, { passive: false });
    container.style.touchAction = 'none';
    var prevOB = [document.documentElement.style.overscrollBehavior, document.body.style.overscrollBehavior];
    document.documentElement.style.overscrollBehavior = 'none'; document.body.style.overscrollBehavior = 'none';

    // ---- close (tap the zone)
    var lastPD = 0, lastTap = 0;
    [$zone, $lidZone].forEach(function ($z) {
    $z.addEventListener('pointerdown', function (e) { lastPD = Date.now(); capture = { x: e.clientX, y: e.clientY, t: Date.now(), blocked: false, pid: e.pointerId }; });
    $z.addEventListener('pointerup', function (e) {
      var c = capture; capture = null;
      if (!c || c.blocked || c.pid !== e.pointerId) return;
      if (Math.abs(e.clientX - c.x) + Math.abs(e.clientY - c.y) > 14 || Date.now() - c.t > 900) return;
      lastTap = Date.now(); onTap();
    });
    $z.addEventListener('pointercancel', function () { capture = null; });
    $z.addEventListener('click', function () { if (Date.now() - lastPD < 1500) return; if (Date.now() - lastTap > 700) { lastTap = Date.now(); onTap(); } });
    });
    function onTap() {
      if (closed || closing) return;
      if (!order.length && !zeroAsked) { zeroAsked = true; $msg.textContent = '什麼都不帶嗎？再點一次就關上囉'; return; }
      closeCase(true);
    }
    function finishClosed(animated) {
      closed = true; closing = false;
      ids.forEach(function (id) { hitEl[id].classList.add('away'); });
      $hint.textContent = order.length ? '行李箱關好了，準備出發！' : '輕輕的，什麼都不帶也很好。';
      $msg.textContent = order.length ? '帶了 ' + order.length + ' 樣東西' : '';
      later(function () { $btn.classList.add('show'); }, animated ? 250 : 0);
    }
    function drawLid(phi, fin) { $lid.innerHTML = lidSvg(phi, fin); }
    function closeCase(animated) {
      if (closed || closing) return;
      closing = true; $msg.textContent = '';
      state.suitcase = { packed: ITEMS.map(function (i) { return i.id; }).filter(function (id) { return packed[id]; }), closed: true, at: Date.now() };
      try { ctx.save(); } catch (e) { }
      $zone.classList.add('closing');
      if ($closedImg) {   // painted closed suitcase: cross-fade
        $closedImg.classList.add('show'); later(function () { $packs.style.opacity = '0'; }, animated ? 200 : 0);
        if (!animated) return finishClosed(false);
        later(function () { puffAt(); finishClosed(true); }, 520); return;
      }
      $lid.classList.add('show');
      if (!animated) { drawLid(0, true); $lid.style.opacity = '1'; if (cfg.lid) $veil.style.opacity = '1'; $packs.style.opacity = '0'; return finishClosed(false); }
      var t0 = null, DUR = 560;
      (function step(ts) {
        if (!ts) { raf = requestAnimationFrame(step); return; }
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / DUR), e = t * t * (1.6 - 0.6 * t), phi = 70 * (1 - e);
        $lid.style.opacity = Math.min(1, t * 3).toFixed(2); drawLid(phi, false); if (cfg.lid) $veil.style.opacity = Math.min(1, t * 1.6).toFixed(2);
        if (phi < 30) $packs.style.opacity = '0';
        if (t < 1) { raf = requestAnimationFrame(step); return; }
        drawLid(0, true); puffAt(); later(function () { finishClosed(true); }, 330);
      })();
    }
    function puffAt() {
      var box = E('div', 'sc-puff', stage), z = $zone.getBoundingClientRect(), s = stage.getBoundingClientRect();
      box.style.left = (z.left - s.left + z.width / 2) + 'px'; box.style.top = (z.top - s.top + z.height * 0.3) + 'px';
      for (var k = 0; k < 9; k++) {
        var w = document.createElement('div'); w.innerHTML = STAR; var st = w.firstChild, a = (-90 + (k - 4) * 22) * Math.PI / 180, dist = 70 + (k % 3) * 28;
        st.style.setProperty('--dx', Math.cos(a) * dist + 'px'); st.style.setProperty('--dy', Math.sin(a) * dist + 'px'); st.style.animationDelay = (k % 3) * 60 + 'ms'; box.appendChild(st);
      }
      var rk = document.createElement('div'); rk.innerHTML = ROCKET; box.appendChild(rk.firstChild);
      later(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
    }
    $btn.addEventListener('click', function () { if (closed) ctx.next(); });

    var stack = null;   // (v=261116y) no filter stack on step 11

    window.addEventListener('resize', layout); layout(); later(layout, 60);
    if (saved) { (saved.packed || []).forEach(function (id) { if (cfg.items[id]) addPacked(id); }); closeCase(false); }
    requestAnimationFrame(function () { stage.classList.add('ready'); });

    return function cleanup() {
      window.removeEventListener('resize', layout); if (dragging && dragging.cleanup) dragging.cleanup();
      timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      ghosts.forEach(function (g) { if (g.parentNode) g.parentNode.removeChild(g); });
      if (stack && stack.destroy) stack.destroy();
      document.documentElement.style.overscrollBehavior = prevOB[0]; document.body.style.overscrollBehavior = prevOB[1];
      if (stage.parentNode) stage.parentNode.removeChild(stage);
    };
  }

  // default = shipped scattered-SVG room; the painted-scene mode replaces it only if its config + painting load
  DAYOF.registerPage('suitcase', {
    render: function (container, ctx) {
      var cur = renderDefault(container, ctx), dead = false;
      loadSceneCfg().then(function (cfg) {
        if (dead || !cfg) return null;
        return loadImg(cfg.bg).then(function (im) {
          if (dead || !im || !im.naturalWidth) return;
          try { cur(); } catch (e) { }
          [].forEach.call(container.querySelectorAll('.sc-stage'), function (s) { s.parentNode.removeChild(s); });
          cur = renderScene(container, ctx, cfg, im);
        });
      }).catch(function (e) { console.error(e); });
      return function () { dead = true; if (cur) cur(); };
    }
  });
})();
