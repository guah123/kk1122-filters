/* page 'rules' (flow 3): 今天的守則 — popup over a soft main-visual background */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
DAYOF.registerPage('rules', {
  render: function (container, ctx) {
    var cfg = ctx.config || window.DAYOF_CONFIG || {};
    function ic(n) { return (DAYOF.icons && DAYOF.icons[n]) ? '<span class="ico">' + DAYOF.icons[n] + '</span>' : ''; }
    var line = cfg.LINE_URL
      ? '<a class="rl-line" href="' + cfg.LINE_URL + '" target="_blank" rel="noopener noreferrer">' + ic('line') + '加入 LINE 社群</a>' +
        '<span class="rl-pw">密碼：' + (cfg.LINE_PASSWORD || '1122') + '</span>' : '';
    container.innerHTML =
      '<div class="dx-bg soft"></div><div class="dx-veil"></div>' +
      '<div class="modal-backdrop absolute"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="rl-h">' +
        '<h2 class="rl-title" id="rl-h">今天的守則</h2>' +
        '<ul class="rl-list">' +
          '<li>' + ic('cake') + '<div>可以吃蛋糕</div></li>' +
          '<li>' + ic('wine') + '<div>可以吧檯點酒</div></li>' +
          '<li>' + ic('smile') + '<div>想笑就笑，想哭就哭</div></li>' +
          '<li>' + ic('line') + '<div>可以加入這個 LINE 社群同步聊天<br>' + line + '</div></li>' +
          '<li>' + ic('steps') + '<div>請大家一步一步跟著這個網頁走</div></li>' +
        '</ul>' +
        '<button type="button" class="btn" data-act="ok">OK</button>' +
      '</div></div>';
    var done = false;
    function onClick(e) { if (e.target.closest('[data-act="ok"]') && !done) { done = true; ctx.next(); } }
    container.addEventListener('click', onClick);
    return function () { container.removeEventListener('click', onClick); };
  }
});
