/* page 'form' (flow 2): 暱稱 + email */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
DAYOF.registerPage('form', {
  render: function (container, ctx) {
    var st = ctx.state || {};
    container.innerHTML =
      '<div class="dx-bg soft"></div><div class="dx-veil"></div>' +
      '<div class="fm-wrap"><form class="card fm-card" novalidate autocomplete="on">' +
        '<h1 class="screen-title">請輸入暱稱和 email</h1>' +
        '<label class="field"><span>暱稱</span>' +
          '<input class="input" name="nickname" type="text" maxlength="20" autocomplete="nickname" enterkeyhint="next" placeholder="大家怎麼稱呼你？" value=""></label>' +
        '<div class="field-msg" data-for="nickname" role="alert"></div>' +
        '<label class="field"><span>email</span>' +
          '<input class="input" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="name@example.com" value=""></label>' +
        '<div class="field-msg" data-for="email" role="alert"></div>' +
        '<button type="submit" class="btn">送出</button>' +
      '</form></div>';
    var form = container.querySelector('form');
    var nick = form.nickname, mail = form.email, btn = form.querySelector('.btn');
    nick.value = st.nickname || ''; mail.value = st.email || '';
    function msg(name, text) {
      var el = form.querySelector('[data-for="' + name + '"]'); el.textContent = text || '';
      form[name].classList.toggle('is-bad', !!text);
    }
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function check() {
      var n = nick.value.trim(), e = mail.value.trim(), ok = true;
      if (!n) { msg('nickname', '請留下一個稱呼，隨便什麼都可以'); ok = false; }
      else if (n.length > 20) { msg('nickname', '暱稱請在 20 個字以內'); ok = false; }
      else msg('nickname', '');
      if (!e) { msg('email', '請輸入 email'); ok = false; }
      else if (!re.test(e)) { msg('email', 'email 好像少了什麼，再看一下～'); ok = false; }
      else msg('email', '');
      return ok;
    }
    var gone = false;
    function onSubmit(ev) {
      ev.preventDefault();
      if (btn.classList.contains('is-loading')) return;
      if (!check()) { (form.querySelector('.is-bad') || nick).focus(); return; }
      var n = nick.value.trim(), e = mail.value.trim();
      btn.classList.add('is-loading'); btn.textContent = '送出中';
      function done() { if (gone) return; btn.classList.remove('is-loading'); btn.textContent = '送出'; }
      try {
        if (DAYOF.app && DAYOF.app.identify) {
          Promise.resolve(DAYOF.app.identify(n, e)).then(done, function () { done(); ctx.toast && ctx.toast('連線不太順，請再按一次送出'); });
        } else {
          ctx.state.nickname = n; ctx.state.email = e; ctx.save(); done(); ctx.next();
        }
      } catch (err) { done(); ctx.toast && ctx.toast('送出失敗，請再試一次'); }
    }
    function onInput(ev) { if (ev.target.classList.contains('is-bad')) check(); }
    form.addEventListener('submit', onSubmit); form.addEventListener('input', onInput);
    return function () { gone = true; form.removeEventListener('submit', onSubmit); form.removeEventListener('input', onInput); };
  }
});
