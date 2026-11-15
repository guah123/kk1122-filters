/* app.js — router / state machine / persistence / numbering (owner A). Boots last. */
window.DAYOF = window.DAYOF || {};
DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  var LS_PREFIX = 'dayof:v1:';
  var LAST_KEY = 'dayof:v1:last';
  var OFFLINE_MSG = '信件將於後台接上後寄出';
  var cfg = window.DAYOF_CONFIG || {};
  var qs = new URLSearchParams(location.search);
  var TEST = qs.get('test') === '1';

  /* ---------- structural fallback CSS (zero specificity via :where → css/base.css wins) ---------- */
  var CSS = [
    ':where(html,body){margin:0;height:100%}',
    ':where(body){background:var(--cream,#F6EFE2);color:var(--ink,#4A3C30);font-family:var(--font,-apple-system,"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif);-webkit-text-size-adjust:100%}',
    ':where(#app){position:relative;width:100%;min-height:100vh;min-height:100dvh}',
    ':where(#app > .page){position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;opacity:0;transition:opacity .28s ease}',
    ':where(#app > .page.is-in){opacity:1}',
    '#app > .page{z-index:1}',
    '#app > .page.is-out{position:absolute;top:0;left:0;right:0;z-index:0;opacity:0;pointer-events:none}',
    'body:has(.cam-overlay) #app > .step-no{visibility:hidden}',
    ':where(.step-no){position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);left:6px;z-index:10000;min-width:22px;height:22px;padding:0 7px;border-radius:11px;background:rgba(255,255,255,.78);color:var(--ink,#4A3C30);font:700 12px/22px var(--font,system-ui);text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.15);pointer-events:none;box-sizing:border-box}',
    ':where(.toast){position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 28px);transform:translateX(-50%) translateY(12px);z-index:10001;max-width:86vw;padding:10px 16px;border-radius:20px;background:rgba(74,60,48,.92);color:#fff;font-size:14px;line-height:1.4;opacity:0;transition:opacity .25s,transform .25s;text-align:center}',
    ':where(.toast.show){opacity:1;transform:translateX(-50%) translateY(0)}',
    ':where(.toast a){color:var(--sun,#F2C66D);margin-left:10px;text-decoration:underline;cursor:pointer}',
    ':where(.modal-backdrop){position:fixed;inset:0;z-index:9000;background:rgba(40,30,20,.45);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}',
    ':where(.modal-backdrop.app-modal){opacity:0;transition:opacity .22s}',
    ':where(.modal-backdrop.app-modal.show){opacity:1}',
    ':where(.modal){position:relative;background:var(--paper,#FBF7EF);border-radius:var(--radius,18px);box-shadow:var(--shadow,0 6px 20px rgba(74,60,48,.15));max-width:420px;width:100%;max-height:86vh;overflow:auto;padding:28px 20px 20px;box-sizing:border-box}',
    ':where(.modal-x){position:absolute;top:8px;right:8px;width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.7);color:var(--ink,#4A3C30);font-size:20px;line-height:36px;cursor:pointer;padding:0}',
    ':where(.btn){display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 22px;border:0;border-radius:999px;background:var(--wood,#C9A27A);color:#fff;font:600 16px/1 var(--font,system-ui);cursor:pointer;text-decoration:none}',
    ':where(.btn.ghost){background:transparent;color:var(--wood-dark,#8A6545);border:1.5px solid var(--wood,#C9A27A)}',
    ':where(.btn.small){min-height:34px;padding:0 14px;font-size:14px}',
    ':where(.btn[disabled]){opacity:.45;cursor:default}',
    ':where(.page-fallback){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;box-sizing:border-box;text-align:center;color:var(--ink-soft,#7A6A5A)}',
    ':where(.page-fallback input){width:100%;max-width:300px;height:44px;border-radius:12px;border:1px solid var(--wood,#C9A27A);padding:0 12px;font-size:16px;box-sizing:border-box}',
    ':where(.popup-bg){position:absolute;inset:0;background:url(assets/main-visual.jpg) 30% center/cover no-repeat;filter:saturate(.9)}',
    ':where(.popup-bg)::after{content:"";position:absolute;inset:0;background:rgba(40,30,20,.45)}',
    ':where(.popup-host){position:absolute;inset:0;z-index:1}',
    ':where(.restart-link){position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);z-index:60;text-align:center;font-size:13px}',
    ':where(.restart-link a){color:var(--white,#fff);opacity:.85;text-decoration:underline;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.4)}'
  ].join('\n');

  /* ---------- storage ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function normEmail(e) { return String(e || '').trim().toLowerCase(); }
  function keyFor(email) { return LS_PREFIX + normEmail(email); }
  function loadLocal(email) {
    var raw = lsGet(keyFor(email)); if (!raw) return null;
    try { var s = JSON.parse(raw); return (s && s.v === 1) ? s : null; } catch (e) { return null; }
  }
  function blankState(email, nickname) {
    var now = Date.now();
    return { v: 1, email: email ? normEmail(email) : '', nickname: nickname || '', step: 1, maxStep: 1,
      startedAt: now, updatedAt: now, answers: {}, suitcase: null, yes13: null, photo: null,
      found: {}, scroll: {}, finish: { queued: false, sent: false, at: null } };
  }
  function fixState(s) {
    s.answers = s.answers || {}; s.found = s.found || {}; s.scroll = s.scroll || {};
    s.finish = s.finish || { queued: false, sent: false, at: null };
    s.step = Math.max(1, Math.min(N(), +s.step || 1));
    s.maxStep = Math.max(s.step, +s.maxStep || 1);
    return s;
  }
  function N() { return (DAYOF.FLOW && DAYOF.FLOW.length) || 34; }
  function rowFor(n) {
    var r = DAYOF.FLOW && DAYOF.FLOW[n - 1];
    return r || { n: n, type: 'unknown' };
  }

  var state = blankState();
  var api = DAYOF.api || { enabled: false, save: function () { return Promise.resolve({ ok: false, offline: true }); },
    load: function () { return Promise.resolve(null); }, finish: function () { return Promise.resolve({ ok: false, offline: true }); },
    photo: function () { return Promise.resolve({ ok: false, offline: true }); }, flush: function () { return Promise.resolve(); },
    isTestEmail: function () { return true; } };

  function save() {
    state.updatedAt = Date.now();
    if (!state.email) return;
    lsSet(keyFor(state.email), JSON.stringify(state));
    lsSet(LAST_KEY, state.email);
    if (api.enabled && !api.isTestEmail(state.email)) {
      var email = state.email;
      api.save(state).then(function (r) {
        if (r && r.ok && r.state && typeof r.state === 'object' && normEmail(r.state.email || email) === state.email) adoptMerged(r.state);
      });
    }
  }
  // Backend save returns its merged state: fold in anything we don't have locally (never moves current step).
  function adoptMerged(m) {
    var changed = false;
    ['answers', 'found', 'scroll'].forEach(function (k) {
      var src = m[k] || {}; state[k] = state[k] || {};
      Object.keys(src).forEach(function (kk) { if (state[k][kk] == null) { state[k][kk] = src[kk]; changed = true; } });
    });
    ['suitcase', 'yes13', 'photo'].forEach(function (k) { if (!state[k] && m[k]) { state[k] = m[k]; changed = true; } });
    if ((+m.maxStep || 0) > (state.maxStep || 0)) { state.maxStep = +m.maxStep; changed = true; }
    if (m.finish && m.finish.sent && !(state.finish && state.finish.sent)) { state.finish = m.finish; changed = true; }
    if (state.photo && m.photo && m.photo.driveFileId && !state.photo.driveFileId) { state.photo.driveFileId = m.photo.driveFileId; changed = true; }
    if (changed) lsSet(keyFor(state.email), JSON.stringify(state));
  }

  /* ---------- UI helpers ---------- */
  var root, badge, cur = null, toastEl, toastTimer, modals = [];

  function toast(msg, opts) {
    opts = opts || {};
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    if (opts.action && opts.onAction) {
      var a = document.createElement('a'); a.textContent = opts.action;
      a.addEventListener('click', function () { hide(); opts.onAction(); });
      toastEl.appendChild(a);
    }
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    function hide() { toastEl.classList.remove('show'); }
    toastTimer = setTimeout(hide, opts.ms || 2600);
  }

  function modal(content, opts) {
    opts = opts || {};
    var bd = document.createElement('div'); bd.className = 'modal-backdrop app-modal' + (opts.className ? ' ' + opts.className : '');
    var box = document.createElement('div'); box.className = 'modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    if (typeof content === 'string') box.innerHTML = content; else if (content) box.appendChild(content);
    var closed = false;
    var handle = { el: box, backdrop: bd, close: close };
    function close() {
      if (closed) return; closed = true;
      bd.classList.remove('show');
      setTimeout(function () { if (bd.parentNode) bd.parentNode.removeChild(bd); }, 230);
      modals = modals.filter(function (m) { return m !== handle; });
      if (opts.onClose) { try { opts.onClose(); } catch (e) { console.error(e); } }
    }
    if (opts.closeX !== false) {
      var x = document.createElement('button'); x.type = 'button'; x.className = 'modal-x'; x.setAttribute('aria-label', '關閉');
      if (DAYOF.icons && DAYOF.icons.close && DAYOF.icon) { try { x.appendChild(DAYOF.icon('close')); } catch (e) { x.textContent = '×'; } } else x.textContent = '×';
      x.addEventListener('click', close);
      box.appendChild(x);
    }
    if (opts.backdropClose !== false) bd.addEventListener('click', function (ev) { if (ev.target === bd) close(); });
    bd.appendChild(box);
    document.body.appendChild(bd);
    requestAnimationFrame(function () { bd.classList.add('show'); });
    modals.push(handle);
    return handle;
  }

  function setBadge(txt) { if (badge) badge.textContent = String(txt); }

  function filtersAvailable(n) {
    return (DAYOF.FILTERS || []).filter(function (f) { return f.unlock <= n; }).map(function (f) { return f.id; });
  }

  function openFilter(filterId, n) {
    if (!(DAYOF.Camera && typeof DAYOF.Camera.open === 'function')) {
      toast('相機模組載入中…'); return Promise.resolve();
    }
    if (typeof DAYOF.Camera.isOpen === 'function' && DAYOF.Camera.isOpen()) return Promise.resolve();
    // overlay supplies its own back button + badge "N·濾鏡"; hide ours meanwhile
    if (badge) badge.style.visibility = 'hidden';
    var p;
    try { p = DAYOF.Camera.open({ filter: filterId, mode: 'video', stepNo: n }); }
    catch (e) { console.error(e); p = null; }
    return Promise.resolve(p).catch(function (e) { console.error(e); })
      .then(function () { if (badge) badge.style.visibility = ''; if (cur && cur.n === n) setBadge(n); });
  }

  function makeCtx(row) {
    var n = row.n;
    var ctx = {
      step: row,
      state: state,
      save: save,
      next: function () { return next(n); },
      goto: function (m) { return goto(m); },
      setAnswer: function (k, v) { state.answers[k] = v; save(); },
      config: cfg,
      api: api,
      toast: toast,
      modal: modal,
      openFilter: function (id) { return openFilter(id, n); },
      filtersAvailable: function () { return filtersAvailable(n); },
      assetUrl: function (p) { return p; },
      identify: function (nick, email) { return identify(nick, email); },
      setBadge: setBadge
    };
    return ctx;
  }

  /* ---------- fallback pages ---------- */
  function fallbackRender(container, ctx) {
    var row = ctx.step;
    container.classList.add('page-fallback');
    if (row.type === 'form') {
      var t = document.createElement('div'); t.textContent = row.title || '請輸入暱稱，和email';
      var a = document.createElement('input'); a.placeholder = '暱稱'; a.className = 'fb-nick';
      var b = document.createElement('input'); b.placeholder = 'email'; b.type = 'email'; b.className = 'fb-email';
      var s = document.createElement('button'); s.className = 'btn'; s.textContent = row.btn || '送出';
      s.addEventListener('click', function () {
        var em = normEmail(b.value);
        if (!a.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { toast('請填寫暱稱與正確的 email'); return; }
        identify(a.value.trim(), em);
      });
      [t, a, b, s].forEach(function (el) { container.appendChild(el); });
      return;
    }
    if (row.type === 'rules') {
      var h = document.createElement('div');
      h.innerHTML = '<h3>' + esc(row.title) + '</h3><ul style="text-align:left">' + (row.items || []).map(function (it, i) {
        return '<li>' + (i === row.lineItem ? '<a href="' + esc(cfg.LINE_URL) + '" target="_blank" rel="noopener">' + esc(it) + '</a>' : esc(it)) + '</li>';
      }).join('') + '</ul>';
      var ok = document.createElement('button'); ok.className = 'btn'; ok.textContent = row.btn || 'OK';
      ok.addEventListener('click', ctx.next);
      h.appendChild(ok);
      var m = document.createElement('div'); m.className = 'modal'; m.appendChild(h);
      container.appendChild(m);
      return;
    }
    var p = document.createElement('div'); p.textContent = '（#' + row.n + ' 頁面載入中…）';
    var btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = '下一步';
    btn.addEventListener('click', ctx.next);
    container.appendChild(p);
    if (row.n < N()) container.appendChild(btn);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- router ---------- */
  function render(n) {
    var row = rowFor(n);
    // cleanup previous page first
    if (cur) {
      if (typeof cur.cleanup === 'function') { try { cur.cleanup(); } catch (e) { console.error('[dayof] cleanup', e); } }
      var old = cur.el;
      old.classList.remove('is-in'); old.classList.add('is-out');
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 320);
    }
    modals.slice().forEach(function (m) { m.close(); });

    var el = document.createElement('div');
    el.className = 'page page-' + row.type;
    el.dataset.step = n;
    var host = el;
    if (row.popup) {
      // step 3: popup over the main-visual background
      var bg = document.createElement('div'); bg.className = 'popup-bg'; el.appendChild(bg);
      host = document.createElement('div'); host.className = 'popup-host page-' + row.type + '-host'; el.appendChild(host);
    }
    root.appendChild(el);
    var ctx = makeCtx(row);
    DAYOF.app.ctx = ctx;
    cur = { n: n, el: el, cleanup: null, ctx: ctx };
    setBadge(n);

    var mod = DAYOF._pages[row.type];
    var cleanup = null;
    try {
      if (mod && typeof mod.render === 'function') cleanup = mod.render(host, ctx);
      else fallbackRender(host, ctx);
    } catch (e) {
      console.error('[dayof] render step ' + n + ' (' + row.type + ') failed', e);
      host.innerHTML = '';
      fallbackRender(host, ctx);
    }
    cur.cleanup = typeof cleanup === 'function' ? cleanup : (cleanup && typeof cleanup.destroy === 'function' ? function () { cleanup.destroy(); } : null);

    if (n === 1 && hasSavedIdentity()) addRestartLink(el);

    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); });
    try {
      var sp = new URLSearchParams(location.search); sp.delete('step');
      var s = sp.toString();
      history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + '#' + n);
    } catch (e) {}
  }

  function hasSavedIdentity() { var l = lsGet(LAST_KEY); return !!(l && loadLocal(l)); }
  function addRestartLink(el) {
    var d = document.createElement('div'); d.className = 'restart-link';
    var a = document.createElement('a'); a.textContent = '從頭開始';
    a.addEventListener('click', function (ev) { ev.preventDefault(); reset(); });
    d.appendChild(a); el.appendChild(d);
  }

  function goto(n) {
    n = Math.max(1, Math.min(N(), Math.round(+n) || 1));
    state.step = n;
    state.maxStep = Math.max(state.maxStep || 1, n);
    save();
    render(n);
    return n;
  }

  function next(from) {
    var n = from != null ? from : (cur ? cur.n : state.step);
    if (n >= N()) return n;
    if (n === 32) triggerFinish();
    return goto(n + 1);
  }

  /* ---------- finish (email summary) ---------- */
  var finishing = false;
  function triggerFinish() {
    if (!state.email || (state.finish && state.finish.sent) || finishing) return;
    state.finish = state.finish || {};
    state.finish.queued = true; state.finish.at = Date.now();
    state.maxStep = Math.max(state.maxStep || 1, 32); // backend refuses finish ('not_finished') if maxStep < 32
    save();
    if (!api.enabled || api.isTestEmail(state.email)) {
      setTimeout(function () { toast(OFFLINE_MSG, { ms: 3800 }); }, 400);
      return;
    }
    sendFinish(0);
  }
  function sendFinish(attempt) {
    finishing = true;
    api.finish(state.email, state).then(function (r) {
      finishing = false;
      if (r && r.ok) {
        state.finish.sent = true; state.finish.queued = false; state.finish.at = Date.now(); save();
      } else if (r && (r.error === 'bad_email' || r.error === 'not_finished')) {
        console.warn('[dayof] finish refused:', r.error); // keep queued; retried on next boot
      } else if (attempt < 2 && !(r && r.offline)) {
        setTimeout(function () { sendFinish(attempt + 1); }, 4000 * (attempt + 1));
      } else {
        toast(OFFLINE_MSG, { ms: 3800 });
      }
    });
  }

  function retryQueued() {
    if (!api.enabled || !state.email || api.isTestEmail(state.email)) return;
    if (state.finish && state.finish.queued && !state.finish.sent) sendFinish(2);
    var done = function (r) { if (r && r.ok) save(); };
    if (DAYOF.PhotoQueue && typeof DAYOF.PhotoQueue.retry === 'function') {
      try { DAYOF.PhotoQueue.retry(state.email, api, state).then(done, function () {}); } catch (e) { console.error(e); }
    }
    var ph = api.pendingPhoto && api.pendingPhoto(state.email); // queue used by api.photo() itself
    if (ph && !(state.photo && state.photo.driveFileId)) {
      api.photo(state.email, ph).then(function (r) {
        if (r && r.ok) {
          state.photo = state.photo || { at: Date.now(), savedLocal: false };
          state.photo.driveFileId = r.fileId || r.id || 'ok';
          delete state.photo.uploadError;
          save();
        }
      });
    }
  }

  /* ---------- identity ---------- */
  function pickNewer(a, b) {
    if (!a) return b; if (!b) return a;
    if ((b.maxStep || 0) !== (a.maxStep || 0)) return (b.maxStep || 0) > (a.maxStep || 0) ? b : a;
    return (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  }
  function identify(nickname, email) {
    email = normEmail(email);
    nickname = String(nickname || '').trim();
    var local = loadLocal(email);
    var remoteP = (api.enabled && !api.isTestEmail(email)) ? api.load(email).catch(function () { return null; }) : Promise.resolve(null);
    return remoteP.then(function (remote) {
      if (remote && normEmail(remote.email || email) !== email) remote = null;
      if (remote && remote.v !== 1) remote = null;
      var s = pickNewer(local, remote);
      var isNew = !s;
      if (isNew) s = blankState(email, nickname);
      s.email = email;
      if (nickname) s.nickname = nickname;
      state = fixState(s);
      lsSet(LAST_KEY, email);
      var target = (isNew || state.step < 3) ? 3 : state.step;
      goto(target);
      if (!isNew && target > 3) toast('已接續你上次的進度（第 ' + target + ' 步）');
      retryQueued();
      return state;
    });
  }

  function reset() {
    if (state.email) lsDel(keyFor(state.email));
    lsDel(LAST_KEY);
    state = blankState();
    render(1);
  }

  /* ---------- boot ---------- */
  function boot() {
    var st = document.createElement('style'); st.id = 'app-fallback-css'; st.textContent = CSS;
    document.head.insertBefore(st, document.head.firstChild);
    root = document.getElementById('app');
    if (!root) { root = document.createElement('div'); root.id = 'app'; document.body.appendChild(root); }
    badge = document.createElement('div'); badge.className = 'step-no'; badge.setAttribute('aria-hidden', 'true');
    root.appendChild(badge);

    var stepParam = parseInt(qs.get('step'), 10);
    var last = lsGet(LAST_KEY);
    var saved = last ? loadLocal(last) : null;

    if (stepParam >= 1) {
      if (saved) state = fixState(saved);
      else { state = blankState('test@example.com', '測試'); state.step = stepParam; }
      lsSet(LAST_KEY, state.email);
      goto(stepParam);
      return;
    }
    if (saved && saved.step >= 3) {
      state = fixState(saved);
      render(state.step);
      if (state.step > 3) toast('已接續你上次的進度（第 ' + state.step + ' 步）', { ms: 4200, action: '從頭開始', onAction: reset });
      retryQueued();
      return;
    }
    render(1);
  }

  DAYOF.app = {
    identify: identify,
    goto: goto,
    next: function () { return next(); },
    get ctx() { return cur ? cur.ctx : null; },
    set ctx(v) { /* set by render */ },
    state: function () { return state; },
    toast: toast,
    modal: modal,
    reset: reset
  };

  var dbg = DAYOF.debug = DAYOF.debug || {};
  dbg.goto = function (n) { return goto(n); };
  dbg.next = function () { return next(); };
  dbg.state = function () { return state; };
  dbg.reset = function () { return reset(); };
  var engineSolve = dbg.solveWhere;
  dbg.solveWhere = function () {
    var W = DAYOF.Where || {};
    if (typeof engineSolve === 'function') return engineSolve();
    if (typeof W.solveCurrent === 'function') return W.solveCurrent();
    if (W._current && typeof W._current.solve === 'function') return W._current.solve();
    if (W.current && typeof W.current.solve === 'function') return W.current.solve();
    if (cur && rowFor(cur.n).type === 'where' && !DAYOF._pages.where) return next();
    console.warn('[dayof] solveWhere: no mounted where scene');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
