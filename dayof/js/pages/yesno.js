window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  var Q = '如果2026/11/22的這個當下，你正在跟誰賭氣，你可以放下面子好好跟他說一句話嗎？';
  var SAYS = ['真的不要嗎？', '放下面子嘛', '手指都伸出來了', '不要跑啦（是我在跑）', '按 Yes 比較快喔', '它不想被你按'];
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  DAYOF.registerPage('yesno', {
    render: function (container, ctx) {
      var timers = [], dodges = 0, done = false, lastP = null;
      var wrap = el('div', 'yn-wrap');
      wrap.appendChild(el('div', 'qz-label', '是非題'));
      wrap.appendChild(el('div', 'qz-card', Q));
      var yes = el('button', 'yn-yes', 'Yes'), no = el('button', 'yn-no', 'No');
      yes.type = no.type = 'button';
      var say = el('div', 'yn-say'); say.style.opacity = 0;
      var doneBox = el('div', 'yn-done'); doneBox.appendChild(el('div', '', '那就去跟他說吧 ♡'));
      var cont = el('button', 'qz-btn', '繼續看看'); cont.type = 'button'; doneBox.appendChild(cont);
      container.appendChild(wrap); container.appendChild(yes); container.appendChild(no); container.appendChild(say); container.appendChild(doneBox);
      function rect(e) { var r = e.getBoundingClientRect(), c = container.getBoundingClientRect(); return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }; }
      function place(el_, x, y) { el_.style.left = x + 'px'; el_.style.top = y + 'px'; }
      function layout() {
        var c = container.getBoundingClientRect(), cw = c.width, ch = c.height, col = Math.min(cw, 480), x0 = (cw - col) / 2;
        var card = rect(wrap.children[1]), top = card.y + card.h + 60;
        place(yes, x0 + col / 2 - 150, Math.min(top, ch - 200));
        place(no, x0 + col / 2 + 30, Math.min(top, ch - 200));
      }
      layout();
      var onResize = function () { if (!dodges) layout(); };
      window.addEventListener('resize', onResize);
      function overlap(a, b, m) { return a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y; }
      function dodge(px, py) {
        if (done) return;
        var c = container.getBoundingClientRect(), W = c.width, H = c.height, nr = rect(no), yr = rect(yes);
        if (px == null) { px = nr.x + nr.w / 2; py = nr.y + nr.h / 2; } else { px -= c.left; py -= c.top; }
        var badge = { x: 0, y: 0, w: 64, h: 44 }, best = null, bd = -1, m = 10;
        for (var i = 0; i < 60; i++) {
          var x = m + Math.random() * (W - nr.w - 2 * m), y = m + Math.random() * (H - nr.h - 2 * m);
          var r = { x: x, y: y, w: nr.w, h: nr.h };
          if (overlap(r, yr, 14) || overlap(r, badge, 4)) continue;
          var d = Math.hypot(x + nr.w / 2 - px, y + nr.h / 2 - py);
          if (d > bd) { bd = d; best = r; }
          if (d > 220) break;
        }
        if (!best) best = { x: W - nr.w - m, y: H - nr.h - m };
        place(no, best.x, best.y); dodges++;
        if (dodges >= 3 && dodges % 2 === 1) {
          say.textContent = SAYS[(dodges >> 1) % SAYS.length];
          var sx = Math.max(10, Math.min(W - 150, best.x - 10)), sy = best.y > 70 ? best.y - 28 : best.y + nr.h + 8;
          place(say, sx, sy); say.style.opacity = 1;
          timers.push(setTimeout(function () { say.style.opacity = 0; }, 1400));
        }
      }
      no.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); dodge(e.clientX, e.clientY); });
      no.addEventListener('touchstart', function (e) { e.preventDefault(); var t = e.touches[0]; dodge(t && t.clientX, t && t.clientY); }, { passive: false });
      no.addEventListener('pointerenter', function (e) { dodge(e.clientX, e.clientY); });
      no.addEventListener('mousedown', function (e) { e.preventDefault(); });
      no.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); dodge(e.clientX || null, e.clientY || null); });
      no.addEventListener('focus', function () { dodge(); no.blur(); });
      no.addEventListener('keydown', function (e) { e.preventDefault(); dodge(); });
      container.addEventListener('pointermove', function (e) {
        if (done) return;
        var r = no.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (Math.hypot(e.clientX - cx, e.clientY - cy) < 90 + (e.pointerType === 'touch' ? 20 : 0)) dodge(e.clientX, e.clientY);
      });
      function go() {
        if (go.d) return; go.d = true; ctx.next();
      }
      yes.addEventListener('click', function () {
        if (done) return; done = true;
        ctx.state.yes13 = { yes: true, noDodges: dodges, at: Date.now() };
        ctx.save(); doneBox.classList.add('on');
        timers.push(setTimeout(go, 1800));
      });
      cont.addEventListener('click', go);
      return function () { timers.forEach(clearTimeout); window.removeEventListener('resize', onResize); };
    }
  });
})();
