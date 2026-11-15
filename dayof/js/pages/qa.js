window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  var FALLBACK = {
    9: { key: 'q9', q: '如果上太空之前，你可以留下一段話在你的社群上給大家，你會留什麼？（請注意：太空人可能一去不返）', buttons: ['送出', '跳過'] },
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
      wrap.appendChild(el('div', 'qz-card', q));
      var ta = el('textarea', 'qz-area'); ta.placeholder = '寫在這裡…'; ta.rows = 5;
      ta.value = prev.text != null && prev.text !== '' ? prev.text : (prev.draft || '');
      wrap.appendChild(ta);
      var nudge = el('div', 'qz-nudge', '寫一點點也好～或按' + buttons[1]);
      wrap.appendChild(nudge);
      var row = el('div', 'qz-btns'), bSend = el('button', 'qz-btn', buttons[0]), bAlt = el('button', 'qz-btn ghost', buttons[1]);
      bSend.type = bAlt.type = 'button';
      row.appendChild(bSend); row.appendChild(bAlt); wrap.appendChild(row);
      if (note) wrap.appendChild(el('div', 'qz-note', note));
      container.appendChild(wrap);
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
          nudge.classList.add('on'); ta.classList.remove('qz-shake'); void ta.offsetWidth; ta.classList.add('qz-shake'); ta.focus(); return;
        }
        finish({ text: t, skipped: false }, 0);
      });
      bAlt.addEventListener('click', function () {
        if (buttons[1] === '蛤') {
          var h = el('div', 'qz-huh', '蛤？'); container.appendChild(h);
          finish({ text: '', skipped: true, huh: true }, 800);
        } else finish({ text: '', skipped: true }, 0);
      });
      return function () { timers.forEach(clearTimeout); };
    }
  });
})();
