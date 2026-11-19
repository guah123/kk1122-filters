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

  /* v=261116y (Kai): every 「繼續看看」 button is icon-only — a watercolor pair of eyes (assets/ui/btn-continue-eyes.png).
     DAYOF.eyesButton(btn): keeps the accessible name (aria-label/title), swaps the visible label for the image, class 'btn-eyes'.
     Styling lives in css/base.css. Idempotent; returns the button. */
  DAYOF.eyesButton = function (btn, label) {
    if (!btn || btn.nodeType !== 1) return btn;
    label = label || (btn.getAttribute('aria-label') || btn.textContent || '').trim() || '繼續看看';
    btn.setAttribute('aria-label', label); btn.title = label;
    btn.classList.add('btn-eyes');
    if (!btn.querySelector('img.btn-eyes-img')) {
      btn.textContent = '';
      var img = document.createElement('img');
      img.className = 'btn-eyes-img'; img.src = 'assets/ui/btn-continue-eyes.png'; img.alt = ''; img.draggable = false;
      img.setAttribute('aria-hidden', 'true');
      btn.appendChild(img);
    }
    return btn;
  };

  /* ---------- structural fallback CSS (zero specificity via :where → css/base.css wins) ---------- */
  var CSS = [
    ':where(html,body){margin:0;height:100%}',
    ':where(body){background:var(--cream,#F6EFE2);color:var(--ink,#4A3C30);font-family:var(--font,-apple-system,"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif);-webkit-text-size-adjust:100%}',
    ':where(#app){position:relative;width:100%;min-height:100vh;min-height:100dvh}',
    ':where(#app > .page){position:relative;width:100%;height:100vh;height:100dvh;max-width:480px;margin:0 auto;overflow:hidden;opacity:0;transition:opacity .28s ease}',  /* v=261118g (Kai): fades are back, at the normal short length */
    '#app > .page.bg-reveal > :not(.lyr-veil):not(.popup-bg){transition:opacity .28s ease !important}',
    /* v=261118e (Kai): page fades 2.5x slower (.28s → .7s); a page with a background picture waits for it, fades in, THEN its components fade in */
    '#app > .page.bg-wait > :not(.lyr-veil):not(.popup-bg){opacity:0 !important}',
    ':where(#app > .page.is-in){opacity:1}',
    '#app > .page{z-index:1}',
    '#app > .page.is-out{position:absolute;top:0;left:0;right:0;z-index:0;opacity:0;pointer-events:none}',
    'body:has(.cam-overlay) #app > .step-no{visibility:hidden}',
    ':where(.step-no){position:fixed;top:calc(env(safe-area-inset-top,0px) + 6px);left:6px;z-index:10000;min-width:22px;height:22px;padding:0 7px;border-radius:11px;background:rgba(255,255,255,.78);color:var(--ink,#4A3C30);font:700 12px/22px var(--font,system-ui);text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.15);pointer-events:none;box-sizing:border-box}',
    /* 上一頁 (v=261116x): the step badge is a back button on steps 2–34; hidden on 1 and while the camera is open */
    ':where(#app > .step-back){width:46px;height:46px;min-width:46px;padding:0;border-radius:50%;border:0;display:inline-flex;align-items:center;justify-content:center;pointer-events:auto;cursor:pointer}',
    '#app > .step-back[hidden]{display:none}',
    /* shared punctuation-break text: one block per clause, bracketed asides small + gray */
    ':where(.pl-line){display:block}',
    ':where(.pl-note){display:block;font-size:.72em;line-height:1.6;color:var(--ink-soft,#7A6A5A);margin-top:.35em;font-family:var(--font,system-ui)}',
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
    ':where(.popup-bg){position:absolute;inset:0;background:url(assets/cover-illust.jpg) center bottom/cover no-repeat;filter:saturate(.9)}',
    ':where(.popup-bg)::after{content:"";position:absolute;inset:0;background:rgba(40,30,20,.45)}',
    ':where(.popup-host){position:absolute;inset:0;z-index:1}',
    '#app > .page > .restart-link{position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 4px);z-index:60;display:flex;justify-content:center;pointer-events:none}',
    '#app > .page > .restart-link a{pointer-events:auto;display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;padding:0 14px;font-size:13px;color:var(--white,#fff);opacity:.9;text-decoration:underline;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.45)}',
    /* top-level layer above every page / lyric scroll / filter stack / badge; only its children take taps */
    '#dayof-top{position:fixed;inset:0;z-index:100001;pointer-events:none}',
    '#dayof-top > .toast{z-index:1}',
    '#dayof-top > .toast.has-action{pointer-events:auto}',
    '#dayof-top > .resume-bubble{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);transform:translateX(-50%);z-index:2;pointer-events:auto;box-sizing:border-box;width:max-content;max-width:calc(100vw - 32px);padding:12px 14px 10px;border-radius:20px;background:rgba(74,60,48,.94);color:#fff;box-shadow:0 8px 28px rgba(40,30,20,.35);text-align:center;font:500 14px/1.45 var(--font,system-ui);transition:opacity .25s,transform .25s}',
    '#dayof-top > .resume-bubble.gone{opacity:0;transform:translate(-50%,12px);pointer-events:none}',
    '#dayof-top > .resume-bubble .rb-actions{display:flex;justify-content:center;gap:10px;margin-top:8px}',
    '#dayof-top > .resume-bubble button{min-height:44px;min-width:44px;padding:0 18px;border-radius:999px;font:600 15px/1 var(--font,system-ui);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}',
    '#dayof-top > .resume-bubble .rb-continue{border:0;background:var(--cream,#F6EFE2);color:var(--ink,#4A3C30)}',
    '#dayof-top > .resume-bubble .rb-restart{border:1.5px solid rgba(255,255,255,.7);background:transparent;color:#fff}'
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

  /* DAYOF.punctLines(el, text): break after every ，。？、；！ (outside brackets); 「（…）」 asides → small gray .pl-note.
   * Returns el. Used by qa / yesno / photo / where-style texts. */
  DAYOF.punctLines = function (el, text, opts) {
    opts = opts || {};
    el.textContent = '';
    var src = String(text == null ? '' : text), parts = [], buf = '', depth = 0, i, ch;
    for (i = 0; i < src.length; i++) {
      ch = src[i];
      if (ch === '\n') { if (depth) { buf += ch; continue; } if (buf) parts.push(buf); buf = ''; continue; }
      if (ch === '（' || ch === '(') {
        if (!depth && buf.trim()) { parts.push(buf); buf = ''; }
        depth++; buf += ch; continue;
      }
      buf += ch;
      if ((ch === '）' || ch === ')') && depth) { depth--; if (!depth) { parts.push(buf); buf = ''; } continue; }
      if (!depth && '，。？、；！?!;'.indexOf(ch) >= 0) { parts.push(buf); buf = ''; }
    }
    if (buf.trim()) parts.push(buf);
    if (opts.note) parts.push(opts.note);
    parts.forEach(function (t) {
      t = t.trim(); if (!t) return;
      var isNote = /^[（(].*[）)]$/.test(t);
      var sp = document.createElement('span'); sp.className = isNote ? 'pl-note' : 'pl-line'; sp.textContent = t;
      el.appendChild(sp);
    });
    return el;
  };

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
    if (state.resetAt && !((+m.resetAt || 0) >= state.resetAt)) {
      // server copy predates our 「從頭開始」: only take its finish flag (never un-send)
      if (m.finish && m.finish.sent && !(state.finish && state.finish.sent)) { state.finish = m.finish; lsSet(keyFor(state.email), JSON.stringify(state)); }
      return;
    }
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

  var topLayer = null;
  function top() {
    if (!topLayer || !topLayer.parentNode) {
      topLayer = document.getElementById('dayof-top');
      if (!topLayer) { topLayer = document.createElement('div'); topLayer.id = 'dayof-top'; document.body.appendChild(topLayer); }
    }
    return topLayer;
  }
  function toast(msg, opts) {
    opts = opts || {};
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); top().appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.toggle('has-action', !!(opts.action && opts.onAction));
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

  // resume bubble: 「恢復進度」 (keep going) / 「從頭開始」 (clear local progress, keep finish flags)
  var bubbleEl = null, bubbleTimer = null;
  function hideBubble() {
    clearTimeout(bubbleTimer);
    if (!bubbleEl) return;
    var b = bubbleEl; bubbleEl = null;
    b.classList.add('gone');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 300);
  }
  function showResumeBubble(n) {
    hideBubble();
    var b = document.createElement('div'); b.className = 'resume-bubble'; b.setAttribute('role', 'status');
    var t = document.createElement('div'); t.className = 'rb-text'; t.textContent = '已接續你上次的進度（第 ' + n + ' 步）';
    var acts = document.createElement('div'); acts.className = 'rb-actions';
    var c = document.createElement('button'); c.type = 'button'; c.className = 'rb-continue'; c.textContent = '恢復進度';
    var r = document.createElement('button'); r.type = 'button'; r.className = 'rb-restart'; r.textContent = '從頭開始';
    c.addEventListener('click', function (ev) { ev.stopPropagation(); hideBubble(); });
    r.addEventListener('click', function (ev) { ev.stopPropagation(); hideBubble(); resetProgress(); });
    acts.appendChild(c); acts.appendChild(r); b.appendChild(t); b.appendChild(acts);
    top().appendChild(b);
    bubbleEl = b;
    bubbleTimer = setTimeout(hideBubble, 12000);
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

  // v=261116y (Kai): the badge is an icon-only back chevron on 2–34 (no text; aria-label/title 上一頁; step number in data-step); hidden on step 1
  function setBadge(txt) {
    if (!badge) return;
    var n = parseInt(txt, 10);
    if (!(n >= 1)) { badge.lastChild.textContent = ''; return; }
    badge.dataset.step = n;
    badge.hidden = n <= 1;
    badge.setAttribute('aria-label', '上一頁'); badge.title = '上一頁';
    badge.lastChild.textContent = '';
  }
  var lastPrev = 0;
  function prev() {
    var n = cur ? cur.n : state.step;
    if (n <= 1) return n;
    if (DAYOF.Camera && typeof DAYOF.Camera.isOpen === 'function' && DAYOF.Camera.isOpen()) return n;
    var now = Date.now(); if (now - lastPrev < 350) return n; lastPrev = now; // no double-tap skipping
    return goto(n - 1);
  }

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
      prev: function () { return prev(); },
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
  // v=261118e (Kai): background picture first, components after. Collect url(...) backgrounds on the page and its direct
  // children (lyrics / page-bg / scene pages), preload them (max 3s), fade the page in, then fade its components in.
  function bgUrls(el) {
    var out = [], nodes = [el].concat([].slice.call(el.children));
    nodes.forEach(function (n) {
      var b = n.style.backgroundImage || ''; try { b += ' ' + getComputedStyle(n).backgroundImage; } catch (e) { }
      b.replace(/url\(["']?([^"')]+)["']?\)/g, function (m, u) { if (!/^data:/.test(u) && /\.(jpe?g|png|webp)(\?|$)/i.test(u) && out.indexOf(u) < 0) out.push(u); return m; });
    });
    return out;
  }
  function revealWhenBgReady(el) {
    var urls = bgUrls(el);
    function show() { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); }); }
    if (!urls.length) { show(); return; }
    el.classList.add('bg-wait');
    var left = urls.length, done = false;
    function ready() {
      if (done) return; done = true; show();
      setTimeout(function () { el.classList.add('bg-reveal'); el.classList.remove('bg-wait'); setTimeout(function () { el.classList.remove('bg-reveal'); }, 360); }, 300);   // background first, then the components fade in
    }
    urls.forEach(function (u) { var im = new Image(); im.onload = im.onerror = function () { if (--left <= 0) ready(); }; im.src = u; });
    setTimeout(ready, 3000);
  }
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
    if (bubbleEl && cur && cur.n !== n) hideBubble();

    var el = document.createElement('div');
    el.className = 'page page-' + row.type;
    el.dataset.step = n;
    // v=261116aa: picture-book backgrounds for non-lyrics pages (assets/page-bg/NN.jpg) under a cream veil
    if ({ 9: 1, 13: 1, 15: 1, 21: 1, 29: 1, 31: 1 }[n]) {
      el.classList.add('has-pbg');
      // v=261119j (Kai): step 29 (photo page) shows its picture at full strength — no cream veil
      var veil = n === 29 ? 'linear-gradient(rgba(246,239,226,0),rgba(246,239,226,0))' : 'linear-gradient(180deg,rgba(246,239,226,.5) 0%,rgba(246,239,226,.32) 50%,rgba(246,239,226,.1) 100%)';
      el.style.backgroundImage = veil + ',url("assets/page-bg/' + (n < 10 ? '0' : '') + n + '.jpg")';
      el.style.backgroundSize = 'cover,cover'; el.style.backgroundRepeat = 'no-repeat'; el.style.backgroundPosition = 'center,center bottom';
    }
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

    revealWhenBgReady(el);
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
    a.addEventListener('click', function (ev) { ev.preventDefault(); resetProgress(); });
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
      return;   // v=261119j (Kai): never show the 「信件將於後台接上後寄出」 toast to guests — stays queued and is retried silently
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
        console.warn('[dayof] finish queued (offline) — will retry on next load');   // silent for guests
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
      var s;
      if (local && local.resetAt && remote && !((+remote.resetAt || 0) >= local.resetAt)) {
        // user tapped 「從頭開始」 after the server copy was written → local wins, but keep a sent finish
        if (remote.finish && remote.finish.sent && !(local.finish && local.finish.sent)) local.finish = remote.finish;
        s = local;
      } else s = pickNewer(local, remote);
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

  // debug-only full wipe (also forgets finish flags)
  function reset() {
    hideBubble();
    if (state.email) lsDel(keyFor(state.email));
    lsDel(LAST_KEY);
    state = blankState();
    render(1);
  }

  // 「從頭開始」 (resume bubble / landing link): clear this user's LOCAL progress, keep identity + finish flags
  // so the finish email can never be re-sent. Not pushed to the backend here.
  function resetProgress() {
    hideBubble();
    var email = state.email || lsGet(LAST_KEY) || '';
    var old = state.email ? state : (email ? loadLocal(email) : null);
    var fresh = blankState(email, old && old.nickname);
    if (old && old.finish) fresh.finish = JSON.parse(JSON.stringify(old.finish));
    if (old && old.filterSeen) fresh.filterSeen = old.filterSeen;
    if (old && old.filterTipShown) fresh.filterTipShown = old.filterTipShown; // 新濾鏡 popup (step 10) only once
    if (old && old.filterHi) fresh.filterHi = old.filterHi;                   // NEW highlight only on first appearance
    fresh.resetAt = Date.now();
    state = fresh;
    if (email) { lsSet(keyFor(email), JSON.stringify(state)); lsSet(LAST_KEY, email); }
    render(1);
  }

  // egg page 「從頭開始」: back to landing WITHOUT clearing progress (answers, maxStep, finish untouched)
  function restartKeepProgress() {
    hideBubble();
    state.step = 1;
    save();
    render(1);
  }

  /* ---------- boot ---------- */
  function boot() {
    var st = document.createElement('style'); st.id = 'app-fallback-css'; st.textContent = CSS;
    document.head.insertBefore(st, document.head.firstChild);
    root = document.getElementById('app');
    if (!root) { root = document.createElement('div'); root.id = 'app'; document.body.appendChild(root); }
    badge = document.createElement('button'); badge.type = 'button'; badge.className = 'step-no step-back'; badge.hidden = true;
    var chev = document.createElement('span'); chev.className = 'sb-chev'; chev.setAttribute('aria-hidden', 'true');
    chev.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M14.8 5.2c-1.9 1.7-4.3 4.2-6.3 6.6.1.4 4.1 4.6 6.4 7"/></svg>';
    badge.setAttribute('aria-label', '上一頁'); badge.title = '上一頁';
    badge.appendChild(chev); badge.appendChild(document.createElement('span'));
    badge.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); prev(); });
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
      if (state.step > 3) showResumeBubble(state.step);
      retryQueued();
      return;
    }
    if (saved) { state = fixState(saved); state.step = Math.min(state.step, 2); } // keep identity + finish flags in memory
    render(state.step === 2 ? 2 : 1);
  }

  DAYOF.app = {
    identify: identify,
    goto: goto,
    next: function () { return next(); },
    prev: function () { return prev(); },
    get ctx() { return cur ? cur.ctx : null; },
    set ctx(v) { /* set by render */ },
    state: function () { return state; },
    toast: toast,
    modal: modal,
    reset: reset,
    resetProgress: resetProgress,
    restartKeepProgress: restartKeepProgress
  };

  var dbg = DAYOF.debug = DAYOF.debug || {};
  dbg.goto = function (n) { return goto(n); };
  dbg.next = function () { return next(); };
  dbg.prev = function () { return prev(); };
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
