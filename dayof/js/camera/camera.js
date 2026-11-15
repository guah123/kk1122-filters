/* DAYOF.Camera：全螢幕相機覆蓋層（濾鏡錄影／魚眼拍照）。
 *   DAYOF.Camera.open({ filter:'helmet'|'rain'|'sun'|'fish'|'home', mode:'video'|'photo', stepNo, onPhoto(blob, dataUrl, info) })
 *     → Promise<{ filter, mode, recorded, photo?:{blob,dataUrl,saved}, error? }>，使用者按「← 回歌詞」／「← 返回」才 resolve。
 *   覆蓋層 <div class="cam-overlay"> 直接掛在 document.body 上，底下的頁面 DOM 不動 → 回去時捲動位置原封不動。
 *   關閉時：停止錄影（已錄部分照常存檔）、停掉所有相機／麥克風／canvas 串流軌、取消 rAF、移除覆蓋層。
 * 與 kk1122-filters v1.4 相機頁同一套：KK.Stage（setPortraitOutput → 720×1280 直式、相機置中裁切）＋ KK.Recorder
 *   （手動開始／停止、計時、停止後立刻 <a download> 自動存到手機、iOS／內建瀏覽器顯示「儲存剛剛這段」備援鈕）。
 * KK 程式（vendor/kk/）在第一次開相機時才動態載入；rain.js／fisheye.js 透過 DAYOF.kkPlugins 在載入後註冊濾鏡。 */
(function () {
  'use strict';
  window.DAYOF = window.DAYOF || {};
  var DAYOF = window.DAYOF;

  var ROOT = (document.currentScript && document.currentScript.src.replace(/js\/camera\/camera\.js.*$/, '')) || '';
  var MAP = { helmet: 'otona', rain: 'rain', sun: 'hareru', fish: 'fish', home: 'remember' };
  var LABEL = { helmet: '太空人', rain: '下雨', sun: '太陽', fish: '魚眼', home: '家' };
  var RESET_LABEL = { hareru: '重新佈滿烏雲', rain: '重新起霧' };
  var PHOTO_SIZE = [900, 1600];

  var EXPLAIN = {
    NotAllowedError: ['相機被拒絕了', '需要允許使用相機才能拍。<br>iPhone：網址列左邊「大小」→「網站設定」→ 相機改「允許」後重新整理。<br>Android：網址列左邊的圖示 →「權限」→ 相機改「允許」。'],
    SecurityError: ['瀏覽器不讓這裡用相機', '可能是在 LINE／IG 的內建瀏覽器裡。請點右上角 ⋯ 改用 Safari 或 Chrome 開啟。'],
    InsecureContext: ['需要 HTTPS 才能開相機', '請確認網址是 https:// 開頭。'],
    NotFoundError: ['找不到相機', '這台裝置偵測不到相機，或權限設定讓它看不見。'],
    NotReadableError: ['相機正在被別的 App 使用', '請關掉正在用相機的 App 或分頁，再按「再試一次」。'],
    OverconstrainedError: ['相機不支援這個設定', '請按「再試一次」。'],
    AbortError: ['相機啟動被中斷', '請按「再試一次」。'],
    NotSupported: ['這個瀏覽器不支援相機', '請改用較新版的 Safari 或 Chrome。'],
    NotSupportedError: ['這個瀏覽器不支援相機', '請改用較新版的 Safari 或 Chrome；在 LINE／IG 裡請點右上角 ⋯ 改用瀏覽器開啟。'],
    LoadError: ['濾鏡載入失敗', '網路可能不穩，請按「再試一次」。'],
  };

  function isInApp() { return /Line\/|FBAN|FBAV|Instagram|MicroMessenger|FB_IAB/i.test(navigator.userAgent || ''); }
  function platform() {
    if (window.KK && KK.Recorder) return KK.Recorder.platform();
    var ua = navigator.userAgent || '';
    if (isInApp()) return 'inapp';
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function icon(name, fallback) {
    try { if (DAYOF.icon) { var el = DAYOF.icon(name, 'cam-ico'); if (el) return el; } } catch (e) { /* ignore */ }
    return h('span', 'cam-ico cam-ico-txt', fallback);
  }
  function fmtT(s) { return ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + Math.floor(s % 60)).slice(-2); }
  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  /* ---------- KK 動態載入 ---------- */
  var kkPromise = null;
  function runPlugins() {
    (DAYOF.kkPlugins || []).forEach(function (f) { try { f(window.KK); } catch (e) { (window.KK_LOAD_ERRORS = window.KK_LOAD_ERRORS || []).push('plugin:' + e); } });
  }
  function loadKK() {
    if (kkPromise) return kkPromise;
    kkPromise = new Promise(function (resolve, reject) {
      var ok = function () {
        if (!(window.KK && KK.Stage && KK.Recorder && KK.byId)) { kkPromise = null; reject(Object.assign(new Error('KK 載入不完整'), { name: 'LoadError' })); return; }
        runPlugins(); resolve(window.KK);
      };
      if (window.KK && KK.Stage && KK.Recorder) { ok(); return; }
      if (window.KKReady) { window.KKReady(ok); return; }
      var s = document.createElement('script');
      s.src = ROOT + 'vendor/kk/kk-load.js';
      s.onload = function () { window.KKReady(ok); };
      s.onerror = function () { kkPromise = null; s.remove(); reject(Object.assign(new Error('無法載入 ' + s.src), { name: 'LoadError' })); };
      document.head.appendChild(s);
    });
    return kkPromise;
  }

  /* ---------- 照片存到手機 ---------- */
  function triggerDownload(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 60000);
  }
  /* 手機：系統分享單（iPhone 可「儲存影像」到照片）；不行就 <a download>。須在使用者點擊當下呼叫。 */
  function savePhoto(blob, name) {
    name = name || ('kankan-photo-' + stamp() + '.jpg');
    var pf = platform(), info = { name: name, method: '', platform: pf };
    try {
      var file = (typeof File === 'function') ? new File([blob], name, { type: 'image/jpeg' }) : null;
      if (file && pf !== 'desktop' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        info.method = 'share';
        info.promise = navigator.share({ files: [file], title: '看看' }).then(function () { return 'shared'; }, function (e) { return (e && e.name) || 'cancel'; });
        return info;
      }
    } catch (e) { /* 改用下載 */ }
    try { triggerDownload(blob, name); info.method = 'download'; } catch (e) { info.method = 'none'; info.error = String(e); }
    return info;
  }

  var active = null;

  function open(opts) {
    opts = opts || {};
    if (active) return active.promise;
    var filter = MAP[opts.filter] ? opts.filter : 'helmet';
    var mode = opts.mode === 'photo' ? 'photo' : 'video';
    var kkId = MAP[filter];
    var C = {
      filter: filter, mode: mode, kkId: kkId, stage: null, facing: 'environment', seq: 0, rec: null, lastResult: null,
      noMic: mode !== 'video', closed: false, running: false, wasCam: false, recorded: 0, photo: null, error: null, pv: null, closeAfterSave: false,
      captures: [],
    };
    var resolveP;
    var promise = new Promise(function (r) { resolveP = r; });
    active = { promise: promise, C: C, close: function () { close(); } };

    /* ---------- DOM ---------- */
    var ov = h('div', 'cam-overlay cam-mode-' + mode);
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', mode === 'photo' ? '魚眼相機' : LABEL[filter] + '濾鏡相機');
    var box = h('div', 'cam-stagebox');
    var frame = h('div', 'cam-frame');
    var canvas = h('canvas', 'cam-canvas');
    canvas.setAttribute('aria-label', '相機預覽（直式 9:16）');
    var timer = h('div', 'cam-timer', '● 00:00'); timer.hidden = true;
    var toastEl = h('div', 'cam-toast'); toastEl.setAttribute('role', 'status');
    var saveBtn = h('button', 'cam-save', '儲存剛剛這段'); saveBtn.type = 'button'; saveBtn.hidden = true;
    var resetBtn = h('button', 'cam-reset', RESET_LABEL[kkId] || ''); resetBtn.type = 'button'; resetBtn.hidden = true;
    var flash = h('div', 'cam-flash');
    frame.appendChild(canvas); frame.appendChild(flash); frame.appendChild(timer); frame.appendChild(resetBtn); frame.appendChild(saveBtn); frame.appendChild(toastEl);
    box.appendChild(frame);
    ov.appendChild(box);

    var badge = h('div', 'step-no cam-badge', (opts.stepNo != null ? opts.stepNo + '·' : '') + (mode === 'photo' ? '拍照' : '濾鏡'));
    var back = h('button', 'cam-back', mode === 'photo' ? '← 返回' : '← 回歌詞'); back.type = 'button';
    var tag = h('div', 'cam-tag', mode === 'photo' ? '魚眼相機' : LABEL[filter]);
    ov.appendChild(badge); ov.appendChild(back); ov.appendChild(tag);

    var inapp = h('div', 'cam-inapp', '偵測到內建瀏覽器（LINE／IG／FB…）。請點右上角 ⋯ 改用 Safari 或 Chrome 開啟，相機、麥克風與錄影才穩定。');
    inapp.hidden = !isInApp();
    ov.appendChild(inapp);

    var ctrl = h('div', 'cam-ctrl');
    var flip = h('button', 'cam-flip'); flip.type = 'button'; flip.setAttribute('aria-label', '切換前後鏡頭');
    flip.appendChild(icon('flipcam', '⟲')); var flipTxt = h('small', '', '後鏡頭'); flip.appendChild(flipTxt);
    var main = h('button', mode === 'photo' ? 'cam-shutter' : 'cam-rec', '<i></i>'); main.type = 'button';
    main.setAttribute('aria-label', mode === 'photo' ? '拍照' : '開始錄影'); main.disabled = true;
    var right = h('div', 'cam-right');
    ctrl.appendChild(flip); ctrl.appendChild(main); ctrl.appendChild(right);
    ov.appendChild(ctrl);

    var status = h('div', 'cam-status', '<div class="cam-card"><p class="cam-loading">相機啟動中…</p></div>');
    ov.appendChild(status);

    // 拍照預覽
    var pv = h('div', 'cam-preview'); pv.hidden = true;
    var pvImg = h('img', 'cam-preview-img'); pvImg.alt = '剛拍的照片';
    var pvAct = h('div', 'cam-preview-actions');
    var retake = h('button', 'cam-btn ghost', '重拍'); retake.type = 'button';
    var use = h('button', 'cam-btn', '用這張'); use.type = 'button';
    pvAct.appendChild(retake); pvAct.appendChild(use);
    pv.appendChild(pvImg); pv.appendChild(pvAct);
    ov.appendChild(pv);

    document.body.appendChild(ov);
    document.documentElement.classList.add('cam-open');

    /* ---------- 小工具 ---------- */
    var toastT = 0;
    function toast(msg, ms) {
      toastEl.textContent = msg; toastEl.classList.add('show');
      clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 3200);
    }
    function layout() {
      if (C.closed) return;
      var r = box.getBoundingClientRect();
      var w = Math.max(60, r.width), hh = Math.max(60, r.height);
      var cw = Math.floor(Math.min(w, hh * 9 / 16)), ch = Math.floor(cw * 16 / 9);
      frame.style.width = cw + 'px'; frame.style.height = ch + 'px';
    }
    var layT = 0;
    function onResize() { clearTimeout(layT); layT = setTimeout(layout, 60); layout(); }
    function showStatus(html) { status.innerHTML = '<div class="cam-card">' + html + '</div>'; status.hidden = false; }
    function showErr(e) {
      var name = (e && e.name) || '';
      C.error = name || 'Error';
      var ex = EXPLAIN[name] || ['相機打不開', '請按「再試一次」，或先回去繼續看看。'];
      showStatus('<h3>' + ex[0] + '</h3><p>' + ex[1] + '</p><p class="cam-errcode">錯誤代碼：' + String(name || '?').replace(/[<>&]/g, '') + '</p>' +
        '<div class="cam-card-actions"><button type="button" class="cam-btn" data-act="retry">再試一次</button>' +
        '<button type="button" class="cam-btn ghost" data-act="back">' + (mode === 'photo' ? '← 返回' : '← 回歌詞') + '</button></div>');
    }
    status.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-act]');
      if (!a) return;
      if (a.getAttribute('data-act') === 'retry') begin();
      else close();
    });

    /* ---------- 相機 ---------- */
    function buildStage() {
      if (C.stage) return;
      var def = KK.byId[kkId];
      if (!def) throw Object.assign(new Error('找不到濾鏡：' + kkId), { name: 'LoadError' });
      var st = new KK.Stage(canvas, { bg: def.bg || 'camera' });
      st.setPortraitOutput(true, mode === 'photo' ? PHOTO_SIZE : null);
      st.S.critter = true;
      st.S.stage = st;
      // 記住錄影用的 canvas 串流，關閉時一併停掉
      var orig = st.recordStream;
      st.recordStream = function (fps) { var ms = orig.call(st, fps); C.captures.push(ms); return ms; };
      st.setFilter(kkId);
      C.stage = st;
      resetBtn.hidden = !RESET_LABEL[kkId];
    }
    async function startCam() {
      var seq = ++C.seq;
      main.disabled = true;
      KK.Camera.wantAudio = function () { return !C.noMic; };
      var v;
      try { v = await KK.Camera.start(C.facing); }
      catch (e) {
        if (C.noMic || seq !== C.seq || C.closed) throw e;
        // 麥克風不給也沒關係：改成只開相機（影片沒有聲音）
        C.noMic = true;
        v = await KK.Camera.start(C.facing);
        toast('沒有麥克風，影片會是無聲的', 3000);
      }
      if (seq !== C.seq || C.closed) { if (KK.Camera.video === v) KK.Camera.stop(); return; }
      C.stage.video = v;
      C.stage.mirror = C.facing === 'user';
      flipTxt.textContent = C.facing === 'user' ? '前鏡頭' : '後鏡頭';
      main.disabled = false;
    }
    async function begin() {
      showStatus('<p class="cam-loading">相機啟動中…</p>');
      C.error = null;
      try {
        await loadKK();
        if (C.closed) return;
        buildStage();
        await startCam();
        if (C.closed) return;
        status.hidden = true;
        C.stage.start();
        C.running = true;
        onResize();
        if (mode === 'video') {
          if (!KK.Recorder.supported()) { main.disabled = true; toast('這個瀏覽器不能錄影（iPhone 需 iOS 14.3 以上），但可以看濾鏡', 5000); }
          else { var def = KK.byId[kkId]; toast((def && def.hint ? def.hint + '。' : '') + '按紅色圓鈕開始錄影，再按一次停止，會自動存到手機', 4200); }
        } else toast('對準你的世界，按下快門', 2600);
      } catch (e) {
        if (C.closed) return;
        try { KK.Camera.stop(); } catch (e2) { /* ignore */ }
        showErr(e);
      }
    }

    /* ---------- 錄影 ---------- */
    function setRecUi(on) {
      main.classList.toggle('on', on);
      main.setAttribute('aria-label', on ? '停止錄影' : '開始錄影');
      ov.classList.toggle('recording', on);
      timer.hidden = !on;
      if (!on) timer.textContent = '● 00:00';
    }
    function startRec() {
      if (C.rec || !C.stage || !C.stage.video) return;
      saveBtn.hidden = true;
      var hd;
      try {
        hd = KK.Recorder.start(C.stage, {
          onTick: function (el) { timer.textContent = '● ' + fmtT(el); },
          onSaved: function (r) { onSaved(hd, r); },
        });
      } catch (e) { toast('無法錄影：' + ((e && e.message) || e), 5000); return; }
      C.rec = hd;
      setRecUi(true);
    }
    function onSaved(hd, r) {
      if (C.rec === hd) C.rec = null;
      C.lastResult = r;
      C.recorded++;
      var s = r.save || {};
      var msg = s.msg || '';
      if (r.stopKind === 'limit') msg = '已達 10 分鐘，已自動停止並存檔。' + (s.triggered ? msg : '');
      if (C.closed) { floatToast(msg); return; }
      setRecUi(false);
      saveBtn.hidden = !s.fallback;
      if (C.closeAfterSave) {
        C.closeAfterSave = false;
        if (s.fallback) { toast('錄影已停止。若手機沒存到，請按「儲存剛剛這段」，再按「' + back.textContent + '」', 6000); return; }
        floatToast(msg);
        close();
        return;
      }
      toast(msg, 3200);
      if (C.running && !document.hidden && (!KK.Camera.stream || KK.Camera.stream.getTracks().some(function (t) { return t.readyState !== 'live'; }))) resumeCam();
    }
    async function resumeCam() {
      try { await startCam(); if (C.stage && !C.stage.running && !C.pv) C.stage.start(); }
      catch (e) { if (!C.closed) showErr(e); }
    }

    /* ---------- 拍照 ---------- */
    function shoot() {
      if (!C.stage || !C.stage.video || C.pv) return;
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      C.stage.renderAt((performance.now() - C.stage.t0) / 1000, (performance.now() - C.stage.t0) / 1000);
      var cv = C.stage.canvas;
      var dataUrl = cv.toDataURL('image/jpeg', 0.85);
      C.stage.stop();
      var blob = dataUrlToBlob(dataUrl);
      C.pv = { blob: blob, dataUrl: dataUrl };
      pvImg.src = dataUrl;
      pv.hidden = false;
      ctrl.classList.add('hide');
    }
    function dataUrlToBlob(u) {
      var p = u.split(','), bin = atob(p[1]), n = bin.length, a = new Uint8Array(n);
      for (var i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
      return new Blob([a], { type: 'image/jpeg' });
    }
    retake.addEventListener('click', function () {
      C.pv = null; pv.hidden = true; pvImg.removeAttribute('src'); ctrl.classList.remove('hide');
      if (C.stage && !C.stage.running) C.stage.start();
    });
    use.addEventListener('click', function () {
      if (!C.pv) return;
      var p = C.pv;
      var info = savePhoto(p.blob);           // 在點擊當下觸發分享單／下載
      p.saved = info;
      C.photo = p;
      if (opts.onPhoto) { try { opts.onPhoto(p.blob, p.dataUrl, info); } catch (e) { /* ignore */ } }
      close();
    });

    /* ---------- 事件 ---------- */
    main.addEventListener('click', function () {
      if (mode === 'photo') { shoot(); return; }
      if (C.rec) C.rec.stop('使用者按停止', 'user'); else startRec();
    });
    saveBtn.addEventListener('click', function () {
      var o = C.lastResult ? KK.Recorder.saveAgain(C.lastResult) : { ok: false, msg: '沒有可儲存的影片' };
      toast(o.msg, 3000);
      if (o.ok) saveBtn.hidden = true;
    });
    resetBtn.addEventListener('click', function () { if (C.stage) { C.stage.reset(); toast(kkId === 'rain' ? '窗戶又起霧了' : '烏雲重新佈滿了', 1500); } });
    flip.addEventListener('click', async function () {
      if (C.rec || !C.stage || C.pv) return;
      var old = C.facing;
      C.facing = old === 'user' ? 'environment' : 'user';
      flip.disabled = true;
      try { await startCam(); if (!C.closed) toast('已切換：' + (C.facing === 'user' ? '前鏡頭' : '後鏡頭'), 1600); }
      catch (e) {
        C.facing = old;
        if (!C.closed) { toast('切換失敗，還原中', 2500); try { await startCam(); } catch (e2) { showErr(e2); } }
      }
      flip.disabled = false;
    });
    back.addEventListener('click', function () {
      if (C.rec && !C.closeAfterSave) {        // 錄影中按返回：先停止並存檔（保住這次點擊的手勢），存好再回去
        C.closeAfterSave = true;
        try { C.rec.stop('使用者按返回', 'user'); } catch (e) { close(); }
        setTimeout(function () { if (!C.closed && C.closeAfterSave) close(); }, 4000);
        return;
      }
      close();
    });
    function onVis() {
      if (!C.running || C.closed) return;
      if (document.hidden) {
        if (C.stage) C.stage.stop();
        C.seq++; C.wasCam = true;
        KK.Camera.stop();
        if (C.stage) C.stage.video = null;
      } else if (C.wasCam) {
        C.wasCam = false;
        resumeCam();
        if (!saveBtn.hidden) toast('剛剛的錄影還沒存到手機，請按「儲存剛剛這段」', 4000);
      }
    }
    function onHide() { try { if (window.KK && KK.Camera) KK.Camera.stop(); } catch (e) { /* ignore */ } }
    function noMove(e) { if (!(e.target.closest && e.target.closest('.cam-status, .cam-preview'))) e.preventDefault(); }
    function onKey(e) { if (e.key === 'Escape') back.click(); }
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    ov.addEventListener('touchmove', noMove, { passive: false });
    ov.addEventListener('contextmenu', function (e) { if (!(e.target.closest && e.target.closest('.cam-preview'))) e.preventDefault(); });
    document.addEventListener('keydown', onKey);

    function stopStream(ms) { try { ms.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ignore */ } }
    function close() {
      if (C.closed) return;
      C.closed = true;
      C.seq++;
      clearTimeout(toastT); clearTimeout(layT);
      var pending = C.rec;
      if (pending) { try { pending.stop('使用者按返回', 'user'); } catch (e) { /* ignore */ } }
      if (C.stage) { C.stage.stop(); C.stage.onFrame = null; }
      try { if (window.KK && KK.Camera) { var s = KK.Camera.stream; KK.Camera.stop(); if (s) stopStream(s); } } catch (e) { /* ignore */ }
      if (C.stage) {
        C.stage.video = null;
        try { if (C.stage.inst && C.stage.inst.destroy) C.stage.inst.destroy(); } catch (e) { /* ignore */ }
      }
      var caps = C.captures.slice();
      var endCaps = function () { caps.forEach(stopStream); };
      if (pending && pending.done) pending.done.then(endCaps, endCaps); else endCaps();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      ov.remove();
      document.documentElement.classList.remove('cam-open');
      active = null;
      var res = { filter: filter, mode: mode, recorded: C.recorded };
      if (C.photo) res.photo = C.photo;
      if (C.error) res.error = C.error;
      resolveP(res);
    }

    layout();
    begin();
    return promise;
  }

  /* 覆蓋層關掉後的小提示（錄影中按返回時，存檔訊息顯示在原頁上） */
  function floatToast(msg) {
    if (!msg) return;
    if (DAYOF.toast) { try { DAYOF.toast(msg); return; } catch (e) { /* ignore */ } }
    var t = h('div', 'cam-floast', ''); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 3200);
  }

  DAYOF.Camera = {
    open: open,
    isOpen: function () { return !!active; },
    close: function () { if (active) active.close(); },
    preload: function () { return loadKK(); },
    savePhoto: savePhoto,
    FILTER_MAP: MAP,
    LABEL: LABEL,
  };
})();
