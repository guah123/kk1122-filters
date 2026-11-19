window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  var FALLBACK = {
    9: { key: 'q9', q: '如果上太空之前，\n你可以留下一段話在你的社群上給大家，\n你會留什麼？\n（請注意：太空人可能一去不返）', buttons: ['送出', '跳過'] },
    15: { key: 'q15', q: '如果今天是陳柏凱的喪禮，你想跟大家分享一件他的事，你會分享什麼？', buttons: ['送出', '跳過'], note: '（如果你有回他，他也會回你這一題）' },
    21: { key: 'q21', q: '如果世界是一片披薩，你是一種配料，你是什麼配料，為什麼？', buttons: ['送出', '蛤'] },
    31: { key: 'q31', q: '如果你只能帶著這輩子的一件記憶到下輩子，你想帶著哪一件事？', buttons: ['送出', '跳過'] }
  };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  DAYOF.registerPage('qa', {
    render: function (container, ctx) {
      var st = ctx.step || {}, fb = FALLBACK[st.n] || {};
      var key = st.key || fb.key || ('q' + st.n), q = st.q || fb.q || '',
        buttons = st.buttons || fb.buttons || ['送出', '跳過'], note = st.note || fb.note || '';
      var timers = [], done = false;
      ctx.state.answers = ctx.state.answers || {};
      var prev = ctx.state.answers[key] || {};
      var wrap = el('div', 'qz-wrap');
      wrap.appendChild(el('div', 'qz-label', '簡答題'));
      var card = el('div', 'qz-card');
      // v=261116x: break after every ，。？、； ; bracketed asides (incl. the step note) small + gray as the card's last line
      if (DAYOF.punctLines) DAYOF.punctLines(card, q, { note: note }); else card.textContent = q + (note ? '\n' + note : '');
      wrap.appendChild(card);
      var ta = el('textarea', 'qz-area'); ta.placeholder = '寫在這裡…'; ta.rows = 5;
      ta.value = prev.text != null && prev.text !== '' ? prev.text : (prev.draft || '');
      wrap.appendChild(ta);
      var gate = buttons[1] !== '蛤';   // v=261119o: step 21 (pizza, 送出／蛤) keeps its original layout
      var nudge = el('div', 'qz-nudge', gate ? '寫一點點也好～' : '寫一點點也好～或按' + buttons[1]);
      if (!gate) wrap.appendChild(nudge);
      var row = el('div', 'qz-btns'), bSend = el('button', 'qz-btn', buttons[0]), bAlt = el('button', 'qz-btn ghost', buttons[1]);
      bSend.type = bAlt.type = 'button';
      // v=261119o (Kai): 送出 centred; the second button (跳過／蛤) only appears — right below 送出 — after 送出 was tapped 3× with an empty answer
      var emptyTaps = 0; if (gate) { bAlt.classList.add('qz-alt'); container.classList.add('qz-gate'); }
      row.appendChild(bSend); row.appendChild(bAlt); wrap.appendChild(row); if (gate) wrap.appendChild(nudge);
      // optional page illustration (step 21): v=261118 centred hero between the question card and the answer box (see quiz.css);
      // the whole wrap scrolls, so with the keyboard open the hero simply scrolls away
      var art = st.art || fb.art;
      if (art) {
        var hero = el('div', 'qz-hero'); hero.setAttribute('role', 'img'); hero.setAttribute('aria-label', st.artAlt || fb.artAlt || '插圖');
        hero.style.backgroundImage = 'url("' + art + '")';
        wrap.insertBefore(hero, ta); container.classList.add('qz-has-art');   // v=261118: hero sits between question and answer
      }
      container.appendChild(wrap);
      // v=261118 (Kai, step 9): each punctuation-split line should stay on ONE row (no 「大家，」 orphan at 390px).
      // If a line would wrap, shrink the card's line font uniformly so the longest line fits — but never below 80% (16px);
      // lines that still can't fit (e.g. step 31) are left exactly as before. The small gray note keeps its own px size.
      function fitLines() {
        card.style.fontSize = '';
        var lines = card.querySelectorAll('.pl-line'), cs = getComputedStyle(card);
        var avail = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), need = 0, fs = parseFloat(cs.fontSize);
        if (!lines.length || !(avail > 0) || !fs) return;
        for (var li = 0; li < lines.length; li++) {
          var s = lines[li]; s.style.whiteSpace = 'nowrap'; s.style.display = 'inline-block';
          need = Math.max(need, s.getBoundingClientRect().width); s.style.whiteSpace = ''; s.style.display = '';
        }
        if (need <= avail) return;
        var k = avail / need; if (k < 0.8) return;
        card.style.fontSize = Math.floor(fs * k * 10 - 1) / 10 + 'px';
      }
      try { fitLines(); if (!card.clientWidth) requestAnimationFrame(fitLines); } catch (e) { }
      var onRs = function () { try { fitLines(); } catch (e) { } };
      window.addEventListener('resize', onRs);
      // v=261116y (Kai): no filter stack on qa pages (lyrics pages only)
      function autosize() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, window.innerHeight * 0.5) + 'px'; }
      ta.addEventListener('input', function () {
        autosize();
        var a = ctx.state.answers[key] = ctx.state.answers[key] || {};
        a.draft = ta.value; if (ctx.save) ctx.save();
      });
      ta.addEventListener('focus', function () { timers.push(setTimeout(function () { try { ta.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }, 300)); });
      setTimeout(autosize, 0);
      function finish(a, delay) {
        if (done) return; done = true; a.at = Date.now();
        ctx.state.answers[key] = a; ctx.save();
        timers.push(setTimeout(function () { ctx.next(); }, delay || 0));
      }
      bSend.addEventListener('click', function () {
        var t = ta.value.trim();
        if (!t) {
          if (gate && ++emptyTaps >= 3 && !bAlt.classList.contains('on')) { bAlt.classList.add('on'); nudge.textContent = '寫一點點也好～或按' + buttons[1]; }
          nudge.classList.add('on'); ta.classList.remove('qz-shake'); void ta.offsetWidth; ta.classList.add('qz-shake'); if (!gate) ta.focus(); return;   // v=261119o: no auto-focus (keyboard would get in the way of tapping 送出 3×)
        }
        finish({ text: t, skipped: false }, 0);
      });
      bAlt.addEventListener('click', function () {
        if (gate && !bAlt.classList.contains('on')) return;
        if (buttons[1] === '蛤') {
          var h = el('div', 'qz-huh', '蛤？'); container.appendChild(h);
          finish({ text: '', skipped: true, huh: true }, 800);
        } else finish({ text: '', skipped: true }, 0);
      });
      return function () { timers.forEach(clearTimeout); window.removeEventListener('resize', onRs); };
    }
  });
})();
