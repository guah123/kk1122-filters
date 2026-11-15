/* page type 'where' — 「凱凱在哪裡？」 銜接頁 */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  'use strict';
  function el(tag, cls, parent, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }

  DAYOF.registerPage('where', {
    render: function (container, ctx) {
      var step = ctx.step || {};
      var state = ctx.state || {};
      var already = state.found && state.found[step.n] && state.found[step.n].sec != null ? state.found[step.n] : null;
      var sisterDone = !!(state.found && state.found[step.n] && state.found[step.n].sister);
      var handle = null, destroyed = false;

      var head = el('header', 'where-head', container);
      var row = el('div', 'row1', head);
      el('h1', null, row, step.title || '凱凱在哪裡？');
      var chip = el('button', 'where-chip', row, '<span><b>要找的凱凱</b>看衣服！</span>');
      chip.type = 'button'; chip.setAttribute('aria-label', '要找的凱凱');
      try { if (DAYOF.Chars) chip.insertBefore(DAYOF.Chars.portrait({ w: 26, h: 44, pose: 'stand' }), chip.firstChild); } catch (e) { }
      chip.addEventListener('click', function () {
        if (!ctx.modal) return;
        var box = el('div', 'where-ref-big');
        try { var p = DAYOF.Chars.portrait({ w: 150, h: 255, pose: 'wave' }); box.appendChild(p); } catch (e) { }
        el('p', null, box, '這就是凱凱（一隻老鼠）<br>今天他穿這身衣服，混在大家之間。');
        ctx.modal(box, { closeX: true });
      });

      if (step.desc) {
        var wrap = el('div', 'where-desc-wrap', head);
        var d = el('p', 'where-desc collapsed', wrap, '');
        d.textContent = step.desc;
        var tg = el('button', 'where-desc-toggle', wrap, '展開'); tg.type = 'button';
        // only show toggle when text is actually clipped
        tg.style.display = 'none';
        var applyToggle = function () { if (d.classList.contains('collapsed')) tg.style.display = d.scrollWidth > d.clientWidth + 2 ? '' : 'none'; };
        tg.addEventListener('click', function () {
          var c = d.classList.toggle('collapsed'); tg.textContent = c ? '展開' : '收合'; tg.style.display = ''; if (c) applyToggle();
        });
        setTimeout(applyToggle, 60); setTimeout(applyToggle, 400);
      }

      var area = el('div', 'where-area', container);

      function showDone(info) {
        if (destroyed || container.querySelector('.where-done')) return;
        var box = el('div', 'where-done', area);
        var secs = info && info.sec != null ? info.sec : 0;
        var meta = el('div', 'meta', box, '<b>找到凱凱了！</b>花了 ' + secs + ' 秒');
        var note = el('span', null, meta, ''); note.className = 'sis-note';
        var upd = function () { note.textContent = sisterDone ? '・姊姊也找到了' : '・姊姊還躲著～'; };
        upd(); box._upd = upd;
        var b = el('button', 'btn', box, '繼續看看'); b.type = 'button';
        b.addEventListener('click', function () { b.disabled = true; ctx.next(); });
      }
      function saveFound(patch) {
        state.found = state.found || {};
        state.found[step.n] = Object.assign({}, state.found[step.n] || {}, patch);
        try { ctx.save(); } catch (e) { }
      }
      function onFound(info) {
        if (info.sister) sisterDone = true;
        saveFound({ sec: info.sec, hints: info.hints, sister: sisterDone || undefined });
        showDone(info);
      }
      function onSister() {
        sisterDone = true; saveFound({ sister: true });
        var bar = container.querySelector('.where-done'); if (bar && bar._upd) bar._upd();
      }

      if (DAYOF.Where && DAYOF.Where.mount) {
        handle = DAYOF.Where.mount(area, step.scene, { interactive: true, onFound: onFound, onSister: onSister, intro: !already, hintAfterSec: Math.min((ctx.config && ctx.config.HINT_AFTER_SEC) || 30, 30) });
      } else {
        el('p', null, area, '場景載入中…').style.cssText = 'padding:40px;text-align:center';
      }
      // revisiting a solved step: let the player continue straight away (scene stays playable)
      if (already) showDone({ sec: already.sec, hints: already.hints });

      return function cleanup() {
        destroyed = true;
        if (handle) handle.destroy();
      };
    }
  });
})();
