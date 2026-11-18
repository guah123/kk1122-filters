window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  var Q = '如果2026/11/22的這個當下，你正在跟誰賭氣，你可以放下面子好好跟他說一句話嗎？';
  var SAYS = ['真的不要嗎？', '放下面子嘛', '手指都伸出來了', '不要跑啦（是我在跑）', '按 Yes 比較快喔', '它不想被你按'];
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  DAYOF.registerPage('yesno', {
    render: function (container, ctx) {
      var st = ctx.step || {};
      var timers = [], dodges = 0, done = false;
      var wrap = el('div', 'yn-wrap');
      wrap.appendChild(el('div', 'qz-label', '是非題'));
      var card = el('div', 'qz-card');
      if (DAYOF.punctLines) DAYOF.punctLines(card, st.q || Q); else card.textContent = st.q || Q;
      wrap.appendChild(card);
      var yes = el('button', 'yn-yes', 'Yes'), no = el('button', 'yn-no', 'No');
      yes.type = no.type = 'button';
      var say = el('div', 'yn-say'); say.style.opacity = 0; say.setAttribute('aria-live', 'polite');
      var doneBox = el('div', 'yn-done'); doneBox.appendChild(el('div', '', '那就去跟他說吧 ♡'));
      var cont = el('button', 'qz-btn', '繼續看看👀'); cont.type = 'button'; doneBox.appendChild(cont);
      container.appendChild(wrap); container.appendChild(yes); container.appendChild(no); container.appendChild(say); container.appendChild(doneBox);
      var stack = null; // v=261116y (Kai): no filter stack on 13 (lyrics pages only)
      function crect(e) { var r = e.getBoundingClientRect(), c = container.getBoundingClientRect(); return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }; }
      function place(el_, x, y) { el_.style.left = x + 'px'; el_.style.top = y + 'px'; }
      var noPos = null; // logical position (the CSS transition makes live rects lag)
      function layout() {
        var c = container.getBoundingClientRect(), cw = c.width, ch = c.height, col = Math.min(cw, 480), x0 = (cw - col) / 2;
        var cr = crect(card), top = Math.min(cr.y + cr.h + 60, ch - 200);
        place(yes, x0 + col / 2 - 150, top);
        noPos = { x: x0 + col / 2 + 30, y: top };
        place(no, noPos.x, noPos.y);
      }
      layout();
      var onResize = function () { if (!dodges) layout(); };
      window.addEventListener('resize', onResize);
      function overlap(a, b, m) { return a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y; }
      // everything NO (and its speech label) must keep clear of
      function obstacles() {
        var list = [crect(card), crect(wrap.children[0]), crect(yes)];
        var bdg = document.querySelector('#app > .step-no');
        if (bdg && !bdg.hidden && bdg.getBoundingClientRect().width) list.push(crect(bdg));
        if (stack && stack.el) list.push(crect(stack.el));
        return list;
      }
      // label sits centred directly above NO (or below if there is no room above); clamped inside the page
      function labelRect(r, lw, lh, W) {
        var lx = Math.max(8, Math.min(W - lw - 8, r.x + r.w / 2 - lw / 2));
        var above = { x: lx, y: r.y - lh - 6, w: lw, h: lh }, below = { x: lx, y: r.y + r.h + 6, w: lw, h: lh };
        return [above, below];
      }
      function nextSay() { return SAYS[(dodges - 1) % SAYS.length]; }
      var lastDodge = 0;
      function dodge(px, py) {
        if (done) return;
        var tnow = Date.now(); if (tnow - lastDodge < 90) return; lastDodge = tnow; // touchstart+pointerdown of one tap = one hop
        var c = container.getBoundingClientRect(), W = c.width, H = c.height;
        var nw = no.offsetWidth, nh = no.offsetHeight, cur = noPos || crect(no);
        if (px == null) { px = cur.x + nw / 2; py = cur.y + nh / 2; } else { px -= c.left; py -= c.top; }
        dodges++;
        say.textContent = nextSay();
        var lw = say.offsetWidth, lh = say.offsetHeight;
        var obs = obstacles(), best = null, bl = null, bd = -1, m = 10;
        for (var i = 0; i < 120; i++) {
          var x = m + Math.random() * (W - nw - 2 * m), y = m + Math.random() * (H - nh - 2 * m);
          var r = { x: x, y: y, w: nw, h: nh }, bad = false, j;
          for (j = 0; j < obs.length && !bad; j++) if (overlap(r, obs[j], 12)) bad = true;
          if (bad) continue;
          var opts = labelRect(r, lw, lh, W), lab = null;
          for (var k = 0; k < opts.length && !lab; k++) {
            var L = opts[k], ok = L.y >= 6 && L.y + L.h <= H - 6;
            for (j = 0; j < obs.length && ok; j++) if (overlap(L, obs[j], 4)) ok = false;
            if (ok) lab = L;
          }
          if (!lab) continue;
          var d = Math.hypot(x + nw / 2 - px, y + nh / 2 - py);
          if (d > bd) { bd = d; best = r; bl = lab; }
          if (d > 220) break;
        }
        if (!best) { // fallback: bottom-right corner, label above it
          best = { x: W - nw - m, y: H - nh - m - 40, w: nw, h: nh };
          bl = labelRect(best, lw, lh, W)[0];
        }
        noPos = { x: best.x, y: best.y };
        place(no, best.x, best.y);
        place(say, bl.x, bl.y); say.style.opacity = 1;
        DAYOF._yn = { no: best, say: bl, dodges: dodges };
      }
      no.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); dodge(e.clientX, e.clientY); });
      no.addEventListener('touchstart', function (e) { e.preventDefault(); var t = e.touches[0]; dodge(t && t.clientX, t && t.clientY); }, { passive: false });
      no.addEventListener('pointerenter', function (e) { dodge(e.clientX, e.clientY); });
      no.addEventListener('mousedown', function (e) { e.preventDefault(); });
      no.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); dodge(e.clientX || null, e.clientY || null); });
      no.addEventListener('focus', function () { dodge(); no.blur(); });
      no.addEventListener('keydown', function (e) { e.preventDefault(); dodge(); });
      var lastMove = 0;
      container.addEventListener('pointermove', function (e) {
        if (done) return;
        var now = Date.now(); if (now - lastMove < 120) return; // one hop per approach, not a jitter storm
        var c = container.getBoundingClientRect(), p = noPos || crect(no);
        var cx = c.left + p.x + no.offsetWidth / 2, cy = c.top + p.y + no.offsetHeight / 2;
        if (Math.hypot(e.clientX - cx, e.clientY - cy) < 90 + (e.pointerType === 'touch' ? 20 : 0)) { lastMove = now; dodge(e.clientX, e.clientY); }
      });
      function go() {
        if (go.d) return; go.d = true; ctx.next();
      }
      yes.addEventListener('click', function () {
        if (done) return; done = true;
        say.style.opacity = 0;
        ctx.state.yes13 = { yes: true, noDodges: dodges, at: Date.now() };
        ctx.save(); doneBox.classList.add('on');
        timers.push(setTimeout(go, 1800));
      });
      cont.addEventListener('click', go);
      return function () { timers.forEach(clearTimeout); window.removeEventListener('resize', onResize); if (stack) stack.destroy(); };
    }
  });
})();
