/* api.js — backend client for the Apps Script web app (owner A). Never throws. */
window.DAYOF = window.DAYOF || {};
(function () {
  var cfg = window.DAYOF_CONFIG || {};
  var url = String(cfg.BACKEND_URL || '').trim();
  var testMode = /[?&]test=1\b/.test(location.search);
  var TIMEOUT = 15000, DEBOUNCE = 1500;
  var PHOTO_KEY = 'dayof:v1:photo:';

  function isTestEmail(email) { return !email || /@example\.com$/i.test(String(email)); }

  function post(action, payload) {
    if (!api.enabled) return Promise.resolve({ ok: false, offline: true });
    var body = Object.assign({ action: action }, payload || {});
    if (isTestEmail(body.email)) return Promise.resolve({ ok: false, offline: true, test: true });
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
    var p;
    try {
      p = fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow',
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) { return r.text(); }).then(function (t) {
        try { var j = JSON.parse(t); return (j && typeof j === 'object') ? j : { ok: false, error: 'bad_json' }; }
        catch (e) { return { ok: false, error: 'bad_json' }; }
      });
    } catch (e) { p = Promise.reject(e); }
    return p.catch(function (e) {
      return { ok: false, error: (e && e.name === 'AbortError') ? 'timeout' : String((e && e.message) || e) };
    }).then(function (r) { clearTimeout(timer); return r; });
  }

  var pending = null, pendingTimer = null, pendingWaiters = [];
  function flush() {
    clearTimeout(pendingTimer); pendingTimer = null;
    if (!pending) return Promise.resolve({ ok: true, nothing: true });
    var st = pending, waiters = pendingWaiters;
    pending = null; pendingWaiters = [];
    return post('save', { email: st.email, nickname: st.nickname, state: st }).then(function (r) {
      waiters.forEach(function (w) { w(r); });
      return r;
    });
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  var api = {
    enabled: !!url && !testMode,
    url: url,
    post: post,
    isTestEmail: isTestEmail,
    save: function (state) {
      if (!api.enabled || !state || isTestEmail(state.email)) return Promise.resolve({ ok: false, offline: true });
      try { pending = JSON.parse(JSON.stringify(state)); } catch (e) { pending = state; }
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(flush, DEBOUNCE);
      return new Promise(function (res) { pendingWaiters.push(res); });
    },
    flush: flush,
    load: function (email) {
      if (!api.enabled) return Promise.resolve(null);
      return post('load', { email: String(email || '').trim().toLowerCase() }).then(function (r) {
        if (!r || !r.ok) return null;
        var s = r.state || r.data || null;
        if (typeof s === 'string') { try { s = JSON.parse(s); } catch (e) { s = null; } }
        return (s && typeof s === 'object') ? s : null;
      });
    },
    finish: function (email, state) {
      if (!api.enabled) return Promise.resolve({ ok: false, offline: true, queued: true });
      return flush().then(function () {
        return post('finish', { email: String(email || '').trim().toLowerCase(), nickname: state && state.nickname, state: state });
      });
    },
    photo: function (email, dataUrl) {
      email = String(email || '').trim().toLowerCase();
      var stash = function () { lsSet(PHOTO_KEY + email, dataUrl); };
      if (!api.enabled) { stash(); return Promise.resolve({ ok: false, offline: true, queued: true }); }
      return post('photo', { email: email, dataUrl: dataUrl }).then(function (r) {
        if (r && r.ok) lsDel(PHOTO_KEY + email); else if (!(r && r.test)) stash();
        return r;
      });
    },
    /* 魚眼濾鏡影片：背景上傳到後台（action 'video'）。只在分享單已叫出之後呼叫；永不 throw、不提示使用者。
     * > VIDEO_MAX_BYTES 直接略過；舊版後台回 bad_action → 靜默放棄；其他失敗只重試一次。 */
    VIDEO_MAX_BYTES: 10 * 1024 * 1024,
    uploadVideo: function (blob, filter, email) {
      var dbg = function (m) { try { console.debug('[dayof] video upload: ' + m); } catch (e) {} };
      try {
        if (!email && DAYOF.app && DAYOF.app.state) { var st = DAYOF.app.state(); email = st && st.email; }
        email = String(email || '').trim().toLowerCase();
        if (!api.enabled || isTestEmail(email)) return Promise.resolve({ ok: false, skipped: 'offline' });
        if (!blob || !blob.size) return Promise.resolve({ ok: false, skipped: 'empty' });
        if (blob.size > api.VIDEO_MAX_BYTES) { dbg('skip, ' + blob.size + ' bytes > cap'); return Promise.resolve({ ok: false, skipped: 'too_large' }); }
      } catch (e) { return Promise.resolve({ ok: false, skipped: 'error' }); }
      var mime = String(blob.type || '').indexOf('mp4') >= 0 ? 'video/mp4' : 'video/webm';
      var read = new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () { res(String(fr.result || '').replace(/^data:[^,]*,/, 'data:' + mime + ';base64,')); };
        fr.onerror = function () { rej(fr.error); };
        fr.readAsDataURL(blob);
      });
      var send = function (dataUrl, attempt) {
        return post('video', { email: email, dataUrl: dataUrl, filter: String(filter || 'fish') }).then(function (r) {
          if (r && r.ok) { dbg('ok'); return r; }
          var err = (r && r.error) || 'unknown';
          if (attempt < 1 && !/^(bad_action|bad_video|video_too_large|body_too_large|video_limit|bad_email)$/.test(err)) {
            return new Promise(function (res) { setTimeout(res, 20000); }).then(function () { return send(dataUrl, attempt + 1); });
          }
          dbg('gave up: ' + err);
          return r;
        });
      };
      return read.then(function (d) { return send(d, 0); }).catch(function (e) { dbg('failed: ' + ((e && e.message) || e)); return { ok: false, error: 'read_failed' }; });
    },
    pendingPhoto: function (email) { return lsGet(PHOTO_KEY + String(email || '').toLowerCase()); },
    clearPendingPhoto: function (email) { lsDel(PHOTO_KEY + String(email || '').toLowerCase()); }
  };

  // Best effort: don't lose a debounced save when the tab is hidden/closed.
  function beacon() {
    if (!pending || !api.enabled || !navigator.sendBeacon) return;
    try {
      var st = pending; pending = null; clearTimeout(pendingTimer);
      var blob = new Blob([JSON.stringify({ action: 'save', email: st.email, nickname: st.nickname, state: st })], { type: 'text/plain;charset=utf-8' });
      navigator.sendBeacon(url, blob);
      pendingWaiters.forEach(function (w) { w({ ok: true, beacon: true }); }); pendingWaiters = [];
    } catch (e) {}
  }
  window.addEventListener('pagehide', beacon);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') beacon(); });

  DAYOF.api = api;
})();
