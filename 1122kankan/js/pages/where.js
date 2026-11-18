/* page type 'where' — 「凱凱在哪裡？」 銜接頁 */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  'use strict';
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // story text: keep \n line breaks (CSS pre-line); parenthetical asides （…）/(…) become small gray notes
  function descHtml(t) { return esc(t).replace(/（[^（）\n]*）|\([^()\n]*\)/g, function (m) { return '<span class="where-note">' + m + '</span>'; }); }
  function el(tag, cls, parent, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }

  DAYOF.registerPage('where', {
    render: function (container, ctx) {
      var step = ctx.step || {};
      var state = ctx.state || {};
      var already = state.found && state.found[step.n] && state.found[step.n].sec != null ? state.found[step.n] : null;
      var sisterDone = !!(state.found && state.found[step.n] && state.found[step.n].sister);
      var bonusFound = (state.found && state.found[step.n] && state.found[step.n].bonus) || {};
      var handle = null, destroyed = false;

      var head = el('header', 'where-head', container);
      var row = el('div', 'row1', head);
      el('h1', null, row, step.title || '凱凱在哪裡？');
      var chip = el('button', 'where-chip', row, '<span><b>要找的凱凱</b>看衣服！</span>');
      chip.type = 'button'; chip.setAttribute('aria-label', '要找的凱凱');
      try { if (DAYOF.Chars) chip.insertBefore(DAYOF.Chars.portrait({ w: 26, h: 44, pose: 'stand' }), chip.firstChild); } catch (e) { }
      // raster Kai sprite (assets/scenes/kai-mouse.png) replaces the procedural portrait once it has loaded
      var kaiSprite = null;
      if (DAYOF.Where && DAYOF.Where.sprites) DAYOF.Where.sprites().then(function (u) {
        if (destroyed || !u || !u.kai) return; kaiSprite = u.kai;
        var im = document.createElement('img'); im.src = u.kai; im.alt = '';
        var old = chip.querySelector('svg'); if (old) chip.replaceChild(im, old); else chip.insertBefore(im, chip.firstChild);
      });
      chip.addEventListener('click', function () {
        if (!ctx.modal) return;
        var box = el('div', 'where-ref-big');
        if (kaiSprite) { var bi = el('img', null, box); bi.src = kaiSprite; bi.alt = '凱凱'; }
        else { try { var p = DAYOF.Chars.portrait({ w: 150, h: 255, pose: 'wave' }); box.appendChild(p); } catch (e) { } }
        el('p', null, box, '這就是凱凱（一隻老鼠）<br>今天他穿這身衣服，混在大家之間。');
        ctx.modal(box, { closeX: true });
      });

      if (step.desc) {
        var wrap = el('div', 'where-desc-wrap', head);
        var d = el('p', 'where-desc collapsed', wrap, '');
        d.innerHTML = descHtml(step.desc);
        var tg = el('button', 'where-desc-toggle', wrap, '展開'); tg.type = 'button';
        tg.setAttribute('aria-expanded', 'false');
        // only show toggle when text is actually clipped (collapsed = first 2 lines)
        tg.style.display = 'none';
        var applyToggle = function () { if (d.classList.contains('collapsed')) tg.style.display = d.scrollHeight > d.clientHeight + 2 ? '' : 'none'; };
        var setOpen = function (open) {
          d.classList.toggle('collapsed', !open); wrap.classList.toggle('open', open); head.classList.toggle('desc-open', open);
          tg.textContent = open ? '收合' : '展開'; tg.setAttribute('aria-expanded', open ? 'true' : 'false'); tg.style.display = '';
          if (!open) applyToggle();
        };
        tg.addEventListener('click', function () { setOpen(d.classList.contains('collapsed')); });
        d.addEventListener('click', function () { if (tg.style.display !== 'none') setOpen(d.classList.contains('collapsed')); });
        setTimeout(applyToggle, 60); setTimeout(applyToggle, 400);
      }

      // keep the title row clear of the global 「上一頁」 button (top-left, fixed; its width is owned by app.js)
      var fitBack = function () {
        if (destroyed) return;
        var bk = document.querySelector('#app > .step-no, .step-no'); if (!bk) return;
        var r = bk.getBoundingClientRect(), hr = head.getBoundingClientRect(), cs = getComputedStyle(bk);
        if (!r.width || cs.display === 'none' || cs.visibility === 'hidden') { head.style.setProperty('--back-off', '0px'); return; }
        head.style.setProperty('--back-off', Math.max(0, Math.ceil(r.right - hr.left - 16 + 8)) + 'px');
      };
      [0, 120, 600, 1500].forEach(function (ms) { setTimeout(fitBack, ms); });
      window.addEventListener('resize', fitBack);

      var area = el('div', 'where-area', container);

      function showDone(info) {
        if (destroyed || container.querySelector('.where-done')) return;
        var box = el('div', 'where-done', area);
        var secs = info && info.sec != null ? info.sec : 0;
        var meta = el('div', 'meta', box, '<b>找到凱凱了！</b>花了 ' + secs + ' 秒');
        var note = el('span', null, meta, ''); note.className = 'sis-note';
        var upd = function () { note.textContent = ''; }; // secrets are never advertised
        upd(); box._upd = upd;
        var b = el('button', 'btn', box, '繼續看看👀'); b.type = 'button';  // v=261118e (Kai): 👀 like the lyrics pages
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
      // optional bonus finds (image mode): state.found[n].bonus = {sister:true, pick:true, item:true}
      function onBonus(id) {
        var prev = (state.found && state.found[step.n] && state.found[step.n].bonus) || {};
        var bonus = Object.assign({}, prev); bonus[id] = true;
        saveFound({ bonus: bonus });
        var bar = container.querySelector('.where-done'); if (bar && bar._upd) bar._upd();
      }
      // skip after SKIP_AFTER_SEC (engine shows 「直接看下一首」)
      function onSkip(info) {
        if (destroyed) return;
        saveFound({ skipped: true, skipSec: info && info.sec });
        ctx.next();
      }

      if (DAYOF.Where && DAYOF.Where.mount) {
        var C = ctx.config || window.DAYOF_CONFIG || {};
        handle = DAYOF.Where.mount(area, step.scene, {
          interactive: true, onFound: onFound, onSister: onSister, onBonus: onBonus, bonusFound: bonusFound, intro: !already,
          onSkip: already ? null : onSkip,
          hintAfterSec: C.HINT_AFTER_SEC || 30, autoHintSec: C.AUTO_HINT_SEC || 45, skipAfterSec: C.SKIP_AFTER_SEC || 60
        });
      } else {
        el('p', null, area, '場景載入中…').style.cssText = 'padding:40px;text-align:center';
      }
      // v=261116y (Kai): no filter stack on find-Kai pages (lyrics pages only); the 「找到凱凱了」 bar is full width again
      // revisiting a solved step: let the player continue straight away (scene stays playable)
      if (already) showDone({ sec: already.sec, hints: already.hints });

      return function cleanup() {
        destroyed = true; window.removeEventListener('resize', fitBack);
        if (handle) handle.destroy();
      };
    }
  });
})();
