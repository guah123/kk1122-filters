/* page 'landing' (flow 1): 《看看》主頁 — background = main visual */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
DAYOF.registerPage('landing', {
  render: function (container, ctx) {
    var resume = !!(ctx.step && ctx.step.resume);
    container.innerHTML =
      '<div class="dx-bg" role="img" aria-label="《看看》主視覺：灑滿陽光的房間"></div>' +
      '<div class="dx-sun"></div>' +
      '<div class="lp-body">' +
        '<p class="lp-sub lp-in d1">Kai 的生日音樂會 <b>·</b> 2026.11.22</p>' +
        '<button type="button" class="btn lp-btn lp-in d2" data-act="start">' + (resume ? '繼續' : '開始') + '</button>' +
        (resume && ctx.step && typeof ctx.step.restart === 'function'
          ? '<button type="button" class="lp-restart lp-in d3" data-act="restart">從頭開始</button>' : '') +
      '</div>';
    var busy = false;
    function onClick(e) {
      var t = e.target.closest('[data-act]'); if (!t || busy) return;
      if (t.getAttribute('data-act') === 'start') { busy = true; ctx.next(); }
      else if (t.getAttribute('data-act') === 'restart') { ctx.step.restart(); }
    }
    container.addEventListener('click', onClick);
    return function () { container.removeEventListener('click', onClick); };
  }
});
