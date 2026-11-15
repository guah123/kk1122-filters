/* lyrics.js — lyric page type `lyrics` (owner A). Data: data/lyrics.json (owner J). */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  var CSS = [
    '.page-lyrics{display:flex;flex-direction:column;background:var(--cream,#F6EFE2);',
    '  background-image:radial-gradient(ellipse at 20% 0%,rgba(255,255,255,.7),transparent 60%),radial-gradient(ellipse at 100% 100%,rgba(201,162,122,.12),transparent 55%);}',
    '.page-lyrics .lyr-head{flex:0 0 auto;padding:calc(env(safe-area-inset-top,0px) + 40px) 72px 10px 24px;}',
    '.page-lyrics .lyr-kicker{font:600 11px/1.2 var(--font,system-ui);letter-spacing:.24em;color:var(--wood-dark,#8A6545);opacity:.8;margin:0 0 6px}',
    '.page-lyrics .lyr-title{font-family:var(--font-serif,serif);font-weight:700;font-size:26px;line-height:1.25;color:var(--ink,#4A3C30);margin:0;word-break:break-word}',
    '.page-lyrics .lyr-rule{width:40px;height:2px;border-radius:2px;background:var(--wood,#C9A27A);margin-top:12px;opacity:.7}',
    '.page-lyrics .lyr-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:8px 18px calc(env(safe-area-inset-bottom,0px) + 28px)}',
    '.page-lyrics .lyr-paper{background:var(--paper,#FBF7EF);border-radius:var(--radius,18px);box-shadow:0 2px 14px rgba(74,60,48,.08);padding:22px 20px 18px;',
    '  background-image:repeating-linear-gradient(0deg,transparent 0 33px,rgba(157,191,216,.13) 33px 34px);}',
    '.page-lyrics .lyr-text{white-space:pre-line;font-family:var(--font-serif,serif);font-size:17px;line-height:2;color:var(--ink,#4A3C30);letter-spacing:.02em;margin:0;word-break:break-word}',
    '.page-lyrics .lyr-trans{white-space:pre-line;font-family:var(--font,system-ui);font-size:14px;line-height:1.9;color:var(--ink-soft,#7A6A5A);margin:22px 0 0;padding-top:16px;border-top:1px dashed rgba(138,101,69,.3)}',
    '.page-lyrics .lyr-empty{font-family:var(--font-serif,serif);font-size:18px;color:var(--ink-soft,#7A6A5A);text-align:center;padding:48px 0}',
    '.page-lyrics .lyr-loading{color:var(--ink-soft,#7A6A5A);text-align:center;padding:40px 0;font-size:14px}',
    '.page-lyrics .lyr-foot{display:flex;justify-content:flex-end;align-items:center;margin-top:18px;min-height:52px}',
    '.page-lyrics .lyr-next{transition:opacity .35s ease,transform .35s ease}',
    '.page-lyrics .lyr-next.locked{opacity:0;transform:translateY(8px);pointer-events:none}',
    '.page-lyrics .lyr-scrollhint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);transform:translateX(-50%);font-size:12px;color:var(--ink-soft,#7A6A5A);background:rgba(251,247,239,.85);padding:4px 12px;border-radius:12px;pointer-events:none;transition:opacity .3s}',
    '.page-lyrics .lyr-scrollhint.gone{opacity:0}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById('lyrics-css')) return;
    var s = document.createElement('style'); s.id = 'lyrics-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  var dataP = null;
  function loadData() {
    if (!dataP) {
      dataP = fetch('data/lyrics.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .catch(function (e) { console.warn('[lyrics] load failed', e); dataP = null; return { songs: [] }; });
    }
    return dataP;
  }
  function findSong(data, row) {
    var songs = (data && data.songs) || [];
    for (var i = 0; i < songs.length; i++) if (+songs[i].n === row.n) return songs[i];
    for (i = 0; i < songs.length; i++) if (songs[i].title === row.song) return songs[i];
    return null;
  }

  DAYOF.registerPage('lyrics', {
    render: function (container, ctx) {
      injectCss();
      var row = ctx.step, n = row.n, st = ctx.state;
      st.scroll = st.scroll || {};
      var alive = true;

      var head = document.createElement('div'); head.className = 'lyr-head';
      head.innerHTML = '<p class="lyr-kicker">LYRICS</p><h1 class="lyr-title screen-title"></h1><div class="lyr-rule"></div>';
      head.querySelector('.lyr-title').textContent = row.song || '';
      var scroll = document.createElement('div'); scroll.className = 'lyr-scroll';
      var paper = document.createElement('div'); paper.className = 'lyr-paper paper-bg';
      paper.innerHTML = '<div class="lyr-loading">載入中…</div>';
      var foot = document.createElement('div'); foot.className = 'lyr-foot';
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn lyr-next locked';
      btn.textContent = row.btn || '繼續看看'; btn.disabled = true;
      foot.appendChild(btn);
      scroll.appendChild(paper); scroll.appendChild(foot);
      var hint = document.createElement('div'); hint.className = 'lyr-scrollhint gone'; hint.textContent = '往下捲動 ↓';
      container.appendChild(head); container.appendChild(scroll); container.appendChild(hint);

      var stack = null;
      if (n >= 10 && DAYOF.FilterStack) {
        try { stack = DAYOF.FilterStack.mount(container, ctx); } catch (e) { console.error(e); }
      }

      var unlocked = false;
      function unlock() {
        if (unlocked) return; unlocked = true;
        btn.disabled = false; btn.classList.remove('locked'); hint.classList.add('gone');
      }
      function atBottom() { return scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 24; }
      var saveT = null;
      function onScroll() {
        if (atBottom()) unlock();
        if (scroll.scrollTop > 10) hint.classList.add('gone');
        clearTimeout(saveT);
        saveT = setTimeout(function () {
          if (!alive) return;
          st.scroll[n] = Math.round(scroll.scrollTop); ctx.save();
        }, 400);
      }
      scroll.addEventListener('scroll', onScroll, { passive: true });
      function onResize() { if (atBottom()) unlock(); }
      window.addEventListener('resize', onResize);

      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        st.scroll[n] = Math.round(scroll.scrollTop);
        ctx.next();
      });

      loadData().then(function (data) {
        if (!alive) return;
        var song = findSong(data, row);
        var lyr = song && typeof song.lyrics === 'string' ? song.lyrics.trim() : '';
        var tr = song && typeof song.translation === 'string' ? song.translation.trim() : '';
        paper.innerHTML = '';
        if (lyr) {
          var p = document.createElement('p'); p.className = 'lyr-text'; p.textContent = lyr; paper.appendChild(p);
        } else {
          var e = document.createElement('div'); e.className = 'lyr-empty'; e.textContent = '（歌詞待補）'; paper.appendChild(e);
        }
        if (tr) { var t = document.createElement('p'); t.className = 'lyr-trans'; t.textContent = tr; paper.appendChild(t); }
        requestAnimationFrame(function () {
          if (!alive) return;
          var y = +st.scroll[n] || 0;
          if (y > 0) scroll.scrollTop = y;
          if (atBottom()) unlock(); else if (scroll.scrollTop < 10) hint.classList.remove('gone');
        });
      });

      return function cleanup() {
        alive = false;
        clearTimeout(saveT);
        scroll.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        if (stack) stack.destroy();
      };
    }
  });
})();
