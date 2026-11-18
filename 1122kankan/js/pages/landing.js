/* page 'landing' (flow 1): 《看看》主頁 — background = main visual */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
DAYOF.registerPage('landing', {
  render: function (container, ctx) {
    var resume = !!(ctx.step && ctx.step.resume);
    /* v=261116aa (Kai): illustrated portrait cover (assets/cover-illust.jpg) + centred airy title block (layout 3) */
    if (!document.getElementById('lp-aa-css')) {
      var st = document.createElement('style'); st.id = 'lp-aa-css';
      st.textContent = [
        '.page-landing .dx-bg{background:var(--cream,#F6EFE2) url("assets/cover-illust.jpg") center bottom/cover no-repeat}',
        '.page-landing .lp-head{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 14.5%);text-align:center;padding:0 24px;color:#3E3127}',
        '.page-landing .lp-title{font-family:var(--font-serif,serif);font-weight:700;font-size:58px;line-height:1;letter-spacing:.6em;margin:0 0 0 .6em}',
        '.page-landing .lp-tag{font-family:var(--font-serif,serif);font-size:13px;letter-spacing:.28em;color:#5a4636;margin:22px 0 0}',
        '.page-landing .lp-dot{display:block;width:4px;height:4px;border-radius:50%;background:#8A6545;margin:16px auto}',
        '.page-landing .lp-info{font-family:var(--font-serif,serif);font-size:12px;letter-spacing:.14em;line-height:1.9;color:#6b5646;margin:10px 0 0}',  /* v=261118g (Kai): dot removed, date/place moved up */
        /* short viewports (in-app browsers with tall bars): lift the title block so it stays on the wall above the curtain rod */
        '@media (max-height:700px){.page-landing .lp-head{top:calc(env(safe-area-inset-top,0px) + 9%)}.page-landing .lp-title{font-size:50px}.page-landing .lp-tag{margin-top:16px}.page-landing .lp-info{margin-top:6px;line-height:1.7}}',
        '.page-landing .lp-body{position:absolute;left:0;right:0;top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 58px);padding:0;gap:6px}',
        '.page-landing.lp-resume .lp-body{bottom:calc(env(safe-area-inset-bottom,0px) + 80px)}',
        '.page-landing .lp-btn{min-width:200px}'
      ].join('\n');
      document.head.appendChild(st);
    }
    container.classList.toggle('lp-resume', resume);
    container.innerHTML =
      '<div class="dx-bg" role="img" aria-label="《看看》插畫：坐在房間地板彈吉他，窗外城市與藍天"></div>' +
      '<div class="lp-head">' +
        '<h1 class="lp-title lp-in d1">看看</h1>' +
        '<p class="lp-tag lp-in d2">Kai 的生日音樂會</p>' +
        '<p class="lp-info lp-in d3">2026・11・22（日）14:30<br>沐月書店｜大安區泰順街24號B1</p>' +
      '</div>' +
      '<div class="lp-body">' +
        '<button type="button" class="btn lp-btn lp-in d2" data-act="start">' + (resume ? '繼續' : '開始') + '</button>' +
      '</div>' +
      (resume && ctx.step && typeof ctx.step.restart === 'function'
        ? '<button type="button" class="lp-restart lp-in d3" data-act="restart">從頭開始</button>' : '');
    function fit() {}
    var busy = false;
    function onClick(e) {
      var t = e.target.closest('[data-act]'); if (!t || busy) return;
      if (t.getAttribute('data-act') === 'start') { busy = true; ctx.next(); }
      else if (t.getAttribute('data-act') === 'restart') { ctx.step.restart(); }
    }
    container.addEventListener('click', onClick);
    return function () { container.removeEventListener('click', onClick);  };
  }
});
