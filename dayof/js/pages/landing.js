/* page 'landing' (flow 1): 《看看》主頁 — background = main visual */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
DAYOF.registerPage('landing', {
  render: function (container, ctx) {
    var resume = !!(ctx.step && ctx.step.resume);
    container.innerHTML =
      '<div class="dx-bg" role="img" aria-label="《看看》主視覺：魚眼視角的房間、窗外城市與書櫃"></div>' +
      '<div class="dx-sun"></div>' +
      '<div class="lp-body">' +
        '<button type="button" class="btn lp-btn lp-in d1" data-act="start">' + (resume ? '繼續' : '開始') + '</button>' +
        '<p class="lp-sub lp-in d2">Kai 的生日音樂會<b>·</b>2026.11.22</p>' +
      '</div>' +
      (resume && ctx.step && typeof ctx.step.restart === 'function'
        ? '<button type="button" class="lp-restart lp-in d3" data-act="restart">從頭開始</button>' : '');
    /* v=261116y (Kai): 開始 sits INSIDE the mint info band of the portrait key visual, and 「Kai 的生日音樂會」 sits just above the
       沐月書店 line. The band/text are baked into key-visual-portrait.jpg (1080×2340, background cover + bottom-aligned), so
       place the block from the image's own pixel rows: mint band starts at y=1781, the 沐月書店 text at y=2034, date ends 2191. */
    var body = container.querySelector('.lp-body'), rs = container.querySelector('.lp-restart');
    function fit() {
      var cw = container.clientWidth, ch = container.clientHeight;
      if (!cw || !ch || cw >= ch) { container.classList.remove('lp-fit'); body.style.top = body.style.height = ''; if (rs) rs.style.top = ''; return; }
      var s = Math.max(cw / 1080, ch / 2340), top0 = ch - 2340 * s;
      var y1 = top0 + 1781 * s + 6, y2 = top0 + 2018 * s;
      container.classList.add('lp-fit');
      body.style.top = y1 + 'px'; body.style.height = Math.max(0, y2 - y1) + 'px';
      if (rs) rs.style.top = (top0 + 2196 * s) + 'px';
    }
    fit(); window.addEventListener('resize', fit);
    var busy = false;
    function onClick(e) {
      var t = e.target.closest('[data-act]'); if (!t || busy) return;
      if (t.getAttribute('data-act') === 'start') { busy = true; ctx.next(); }
      else if (t.getAttribute('data-act') === 'restart') { ctx.step.restart(); }
    }
    container.addEventListener('click', onClick);
    return function () { container.removeEventListener('click', onClick); window.removeEventListener('resize', fit); };
  }
});
