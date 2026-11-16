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
    '.page-lyrics .lyr-paper{background:var(--paper,#FBF7EF);border-radius:var(--radius,18px);box-shadow:0 2px 14px rgba(74,60,48,.08);padding:22px 20px 18px;}',
    '.page-lyrics.has-stack .lyr-scroll{padding-right:66px}',
    '.page-lyrics.has-stack .lyr-head{padding-right:66px}',
    '.page-lyrics .lyr-titlerow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
    '.page-lyrics .lyr-artist{font:400 13px/1.4 var(--font,system-ui);color:var(--ink-soft,#7A6A5A);margin:6px 0 0}',
    '.page-lyrics .lyr-tbtn{font:600 12px/1 var(--font,system-ui);color:var(--sky-deep,#5E86A8);background:rgba(255,255,255,.7);border:1.5px solid var(--sky,#9DBFD8);border-radius:999px;padding:7px 12px;cursor:pointer;white-space:nowrap}',
    '.page-lyrics .lyr-tbtn[aria-pressed="true"]{background:var(--sky-deep,#5E86A8);border-color:var(--sky-deep,#5E86A8);color:#fff}',
    '.page-lyrics .lyr-text{font-family:var(--font-serif,serif);font-size:17px;line-height:1.9;color:var(--ink,#4A3C30);letter-spacing:.02em;margin:0;text-align:left;word-break:break-word}',
    '.page-lyrics .lyr-stanza{margin:0 0 1.4em}',
    '.page-lyrics .lyr-stanza:last-child{margin-bottom:0}',
    '.page-lyrics .lyr-line{margin:0 0 .4em;line-height:1.55;padding-left:1.2em;text-indent:-1.2em}',
    '.page-lyrics .lyr-tl{display:none;font-family:var(--font,system-ui);font-size:14px;line-height:1.6;color:var(--sky-deep,#5E86A8);margin:-.1em 0 .7em;padding-left:1.2em;letter-spacing:.01em}',
    '.page-lyrics.show-tr .lyr-tl{display:block}',
    '.page-lyrics .lyr-trans{white-space:pre-line;font-family:var(--font,system-ui);font-size:14px;line-height:1.9;color:var(--ink-soft,#7A6A5A);margin:22px 0 0;padding-top:16px;border-top:1px dashed rgba(138,101,69,.3);display:none}',
    '.page-lyrics.show-tr .lyr-trans{display:block}',
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
      dataP = fetch('data/lyrics.json?v=' + Date.now(), { cache: 'no-store' })
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

  /* 統一清理：同一套規則套到每首歌（防止 Kai 之後貼進來的歌詞帶雜訊） */
  var LABEL_RE = /^\s*[\[（(【]?\s*(主歌|副歌|導歌|橋段|間奏|前奏|尾奏|verse|chorus|pre-?chorus|bridge|intro|outro|hook|refrain)\s*\d*\s*[\]）)】]?\s*[:：]?\s*$/i;
  var SECTION_RE = /^\s*[\[（(【]?\s*(間奏|前奏|尾奏|intro|outro)\b[^\n]*$/i;   // 前/間/尾奏 + 任何括號註記整行丟掉
  var VOCABLE_RE = /^[\s嘩搭啦哼喔噢ㄟaAoO~～、,，.。×xX0-9()（）]*$/;
  function isVocable(l) {
    if (/^\s*o{2,}[o\s]*$/i.test(l)) return true;
    return /(嘩啦|搭啦|啦啦)/.test(l) && VOCABLE_RE.test(l.replace(/啦|嘩|搭/g, '')) && !/[\u4e00-\u9fffA-Za-z]{4,}/.test(l.replace(/嘩啦|搭啦|啦|搭|嘩|×\d*/g, ''));
  }
  function cleanText(s) {
    if (typeof s !== 'string') return '';
    s = s.replace(/\r\n?/g, '\n')
      .replace(/\{#[^}]*\}/g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\\([\\`*_{}\[\]()#+\-.!~"'])/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[　\t]+/g, ' ')
      .replace(/[（(]\s*(升\s*key|轉調)\s*[）)]/gi, '');
    var lines = s.split('\n').map(function (l) { return l.replace(/ {2,}/g, ' ').trim(); }).filter(function (l) {
      if (/蘭多/.test(l)) return false;
      if (LABEL_RE.test(l) || SECTION_RE.test(l)) return false;
      if (/^[（(]\s*(升\s*key|轉調)\s*[）)]$/i.test(l) || /^[（(]?(升\s*key|轉調)[）)]?$/i.test(l)) return false;
      if (isVocable(l)) return false;
      if (/^[★☆*#=\-_~·•]{3,}$/.test(l)) return false;          // 裝飾線
      if (/^\[?\d{1,2}:\d{2}(\.\d+)?\]?$/.test(l)) return false;  // 時間戳
      return true;
    });
    lines = lines.join('\n').replace(/\n[ \t]+\n/g, '\n\n').split('\n');
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  function stanzas(s) { return s ? s.split(/\n\n/).map(function (b) { return b.split('\n'); }) : []; }
  function sameShape(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i].length !== b[i].length) return false;
    return true;
  }

  DAYOF.registerPage('lyrics', {
    render: function (container, ctx) {
      injectCss();
      var row = ctx.step, n = row.n, st = ctx.state;
      st.scroll = st.scroll || {};
      var alive = true;

      var head = document.createElement('div'); head.className = 'lyr-head';
      head.innerHTML = '<p class="lyr-kicker">LYRICS</p><div class="lyr-titlerow"><h1 class="lyr-title screen-title"></h1></div><p class="lyr-artist" hidden></p><div class="lyr-rule"></div>';
      head.querySelector('.lyr-title').textContent = row.song || '';
      var tbtn = document.createElement('button'); tbtn.type = 'button'; tbtn.className = 'lyr-tbtn';
      tbtn.textContent = '翻譯中文'; tbtn.setAttribute('aria-pressed', 'false'); tbtn.hidden = true;
      head.querySelector('.lyr-titlerow').appendChild(tbtn);
      st.lyrTr = st.lyrTr || {};
      function setTr(on) {
        container.classList.toggle('show-tr', !!on);
        tbtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        tbtn.textContent = on ? '看原文' : '翻譯中文';
      }
      tbtn.addEventListener('click', function () {
        var on = !container.classList.contains('show-tr');
        setTr(on); st.lyrTr[n] = on; ctx.save();
        if (atBottom()) unlock();
      });
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
        try { stack = DAYOF.FilterStack.mount(container, ctx); container.classList.add('has-stack'); } catch (e) { console.error(e); }
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
        var lyr = cleanText(song && song.lyrics);
        if (/[\u3040-\u30ff]/.test(lyr)) lyr = lyr.split('\n').filter(function (l) { return !/^[a-z][a-z \-,.'?!~…()]*$/.test(l); }).join('\n').replace(/\n{3,}/g, '\n\n');
        var tr = cleanText(song && song.translation);
        var artist = song && song.artist && song.artist.trim() ? String(song.artist) : '';
        if (artist) { var ar = head.querySelector('.lyr-artist'); ar.textContent = '原唱：' + artist; ar.hidden = false; }
        paper.innerHTML = '';
        if (lyr) {
          var S = stanzas(lyr), T = stanzas(tr), aligned = !!tr && sameShape(S, T);
          var box = document.createElement('div'); box.className = 'lyr-text';
          S.forEach(function (lines, i) {
            var sd = document.createElement('div'); sd.className = 'lyr-stanza';
            lines.forEach(function (l, j) {
              var ld = document.createElement('p'); ld.className = 'lyr-line'; ld.textContent = l; sd.appendChild(ld);
              if (aligned && T[i][j]) { var td = document.createElement('p'); td.className = 'lyr-tl'; td.textContent = T[i][j]; sd.appendChild(td); }
            });
            box.appendChild(sd);
          });
          paper.appendChild(box);
          if (tr && !aligned) { // 行數對不上時：翻譯整段放在原文下方（仍由按鈕切換）
            console.warn('[lyrics] translation not line-aligned for', row.song);
            var t = document.createElement('p'); t.className = 'lyr-trans'; t.textContent = tr; paper.appendChild(t);
          }
          var foreign = song && song.lang ? !/^(zh|tw)/i.test(song.lang) : !/[\u4e00-\u9fff]/.test(lyr.replace(/[\u3040-\u30ff]/g, '') ) || /[\u3040-\u30ff]/.test(lyr);
          if (tr && foreign) { tbtn.hidden = false; setTr(!!st.lyrTr[n]); } else { setTr(false); }
        } else {
          var e = document.createElement('div'); e.className = 'lyr-empty'; e.textContent = '（歌詞待補）'; paper.appendChild(e);
        }
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
