/* 看看｜手機相機＋錄影測試頁（直式 9:16）。
 * 與播放頁相機模式是同一套：KK.Stage（setPortraitOutput）＋ KK.Recorder。 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var FILTERS = [
    { id: 'none', label: '無濾鏡' },
    { id: 'delilah', label: 'Delilah' },
    { id: 'remember', label: '我記得' },
    { id: 'otona', label: '大人中' },
    { id: 'hareru', label: '明日晴れ' },
    { id: 'onlyyou', label: '我只在乎你' },
  ];
  var MORE = [
    { id: 'together', label: '安可 0 ★' },
    { id: 'curtaincall', label: '安可 1' },
    { id: 'keyhole', label: '安可 2' },
    { id: 'reveal', label: '安可 3' },
    { id: 'colophon', label: '版權頁' },
  ];
  var C = {
    stage: null, facing: 'environment', seq: 0, rec: null, lastResult: null, resultUrl: '', filter: 'none',
    noMic: false, actx: null, analyser: null, abuf: null, asrc: null, meterT: 0, running: false, wasCam: false, moreOpen: false,
  };
  window.KK_CAMPAGE = C;

  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function fmtT(s) { return Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2); }
  function isTouch() {
    try { return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window || (window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  }

  /* ---------- 提示 ---------- */
  var toastT = 0;
  function toast(msg, ms) {
    var el = $('c-toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove('show'); }, ms || 3500);
  }

  /* ---------- 版面：把 9:16 的框放進可用空間（contain） ---------- */
  function layout() {
    var r = $('stagebox').getBoundingClientRect();
    var w = Math.max(60, r.width), hh = Math.max(60, r.height);
    var cw = Math.floor(Math.min(w, hh * 9 / 16)), ch = Math.floor(cw * 16 / 9);
    $('frame').style.width = cw + 'px';
    $('frame').style.height = ch + 'px';
    updateOrient();
  }
  function updateOrient() {
    $('rotate').hidden = !(isTouch() && window.innerWidth > window.innerHeight);
  }
  var layT = 0;
  function scheduleLayout() { clearTimeout(layT); layT = setTimeout(layout, 60); layout(); }

  /* ---------- 相機錯誤說明 ---------- */
  var HELP = '<ol><li><b>iPhone（Safari）</b>：網址列左邊「AA」→「網站設定」→ 相機、麥克風都改「允許」→ 重新整理。</li>' +
    '<li><b>Android（Chrome）</b>：網址列左邊的鎖頭／調整圖示 →「權限」→ 相機、麥克風都改「允許」→ 重新整理。</li>' +
    '<li>如果是在 LINE／IG／FB 裡開的，請先改用 Safari 或 Chrome。</li></ol>';
  var EXPLAIN = {
    NotAllowedError: ['相機或麥克風被拒絕', '你（或系統）拒絕了權限，請重新允許：' + HELP],
    SecurityError: ['安全性限制', '瀏覽器因安全性限制不給用相機（可能不是 HTTPS，或被內建瀏覽器擋下）。' + HELP],
    InsecureContext: ['需要 HTTPS', '請確認網址以 https:// 開頭（file:// 或 http:// 不能開相機）。'],
    NotFoundError: ['找不到相機或麥克風', '裝置上偵測不到相機／麥克風，或權限設定讓它看不見。' + HELP],
    NotReadableError: ['相機無法讀取（可能被其他 App 佔用）', '請關閉正在使用相機的 App（視訊會議、其他分頁），再按一次「開始」。'],
    OverconstrainedError: ['相機不支援要求的設定', '請按「測試資訊」複製回報。'],
    AbortError: ['相機啟動被中斷', '請再按一次「開始」。'],
    NoVideoError: ['相機沒有畫面', '相機有開啟但一直沒有影像，請關掉其他使用相機的 App 後再試。'],
    NotSupported: ['這個瀏覽器不支援相機', '請改用較新版 Safari（iOS 14.3+）或 Chrome。'],
  };
  function showErr(e) {
    var ex = EXPLAIN[(e && e.name) || ''] || ['無法啟動相機', '未知錯誤，請按「測試資訊」複製回報。'];
    var b = $('errbox');
    b.hidden = false;
    b.innerHTML = '<h3>⚠ ' + ex[0] + '</h3><div>' + ex[1] + '</div><small>錯誤代碼：' + esc((e && e.name) || '?') + ' — ' + esc((e && e.message) || '') + '</small>' +
      '<button type="button" class="btn small" id="c-nomic">不要麥克風，只開相機</button>';
    $('c-nomic').onclick = function () { C.noMic = true; begin(); };
    b.scrollIntoView({ block: 'center' });
  }

  /* ---------- 麥克風音量條（AnalyserNode，不接 destination 避免回授） ---------- */
  function ensureAudioCtx() { // 必須在使用者點擊的同一個事件內建立（iOS）
    var AC = window.AudioContext || window.webkitAudioContext;
    try { if (AC && !C.actx) C.actx = new AC(); if (C.actx && C.actx.state !== 'running') C.actx.resume().catch(function () {}); } catch (e) { /* ignore */ }
  }
  document.addEventListener('pointerdown', function () { if (C.actx && C.actx.state !== 'running') C.actx.resume().catch(function () {}); }, true);
  function connectMeter() {
    if (C.asrc) { try { C.asrc.disconnect(); } catch (e) { /* ignore */ } C.asrc = null; }
    C.analyser = null;
    var s = KK.Camera.stream, at = s && s.getAudioTracks()[0];
    if (at && C.actx) {
      try {
        C.asrc = C.actx.createMediaStreamSource(new MediaStream([at]));
        C.analyser = C.actx.createAnalyser();
        C.analyser.fftSize = 1024;
        C.abuf = new Uint8Array(C.analyser.fftSize);
        C.asrc.connect(C.analyser);
      } catch (e) { C.analyser = null; }
    }
    clearInterval(C.meterT);
    C.meterT = setInterval(meter, 80);
    clearInterval(C.infoT);
    C.infoT = setInterval(infoBar, 500);
  }
  /* 資訊列：預覽 9:16 · 錄影 720×1280 · 相機 W×H（直/橫，已裁切）· fps */
  function infoBar() {
    if (!C.stage) return;
    var o = C.stage.outputInfo();
    $('infobar').textContent = '預覽 9:16 · 錄影 ' + o.canvas.replace('×', '×') + ' · 相機 ' + o.source.replace('（橫，已置中裁切）', '(橫,已裁切)').replace('（直）', '(直)') + ' · ' + (C.stage.S.fps || 0) + 'fps' + (o.rotate ? ' · rotate=' + o.rotate : '');
  }
  function meter() {
    var bar = $('meterBar'), txt = $('meterTxt');
    if (!C.analyser) { bar.style.width = '0'; txt.textContent = C.noMic || !KK.Camera.stream || !KK.Camera.stream.getAudioTracks().length ? '🎤 無麥克風' : '🎤 —'; return; }
    C.analyser.getByteTimeDomainData(C.abuf);
    var s = 0, i;
    for (i = 0; i < C.abuf.length; i++) { var x = (C.abuf[i] - 128) / 128; s += x * x; }
    var rms = Math.sqrt(s / C.abuf.length), db = rms > 1e-5 ? 20 * Math.log10(rms) : -100;
    bar.style.width = Math.max(0, Math.min(100, (db + 60) / 60 * 100)) + '%';
    txt.textContent = C.actx && C.actx.state !== 'running' ? '🎤 點一下畫面啟動' : '🎤 ' + (db > -99 ? db.toFixed(0) + ' dB' : '靜音');
  }

  /* ---------- 濾鏡 ---------- */
  function buildChips() {
    var box = $('chips');
    box.textContent = '';
    var list = FILTERS.concat(C.moreOpen ? MORE : []);
    list.forEach(function (f) {
      var b = h('button', 'chip' + (f.id === C.filter ? ' on' : ''), f.label);
      b.type = 'button';
      b.setAttribute('data-f', f.id);
      b.addEventListener('click', function () { setFilter(f.id); });
      box.appendChild(b);
    });
    var m = h('button', 'chip more', C.moreOpen ? '收起' : '更多…');
    m.type = 'button';
    m.id = 'c-more';
    m.addEventListener('click', function () { C.moreOpen = !C.moreOpen; buildChips(); });
    box.appendChild(m);
  }
  function setFilter(id) {
    C.filter = id;
    var st = C.stage;
    if (id === 'none') { st.inst = null; st.def = null; }
    else if (!KK.byId[id]) { toast('這個濾鏡製作中', 2500); st.inst = null; st.def = null; C.filter = id; }
    else {
      try { st.setFilter(id); }
      catch (e) { toast('這個濾鏡載入失敗：' + ((e && e.message) || e), 4000); st.inst = null; st.def = null; C.filter = 'none'; }
    }
    $('c-reset').hidden = C.filter !== 'hareru';
    var bs = document.querySelectorAll('.chip[data-f]');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-f') === C.filter);
    var def = KK.byId[C.filter];
    if (def && def.hint) toast(def.hint, 3500);
  }

  /* ---------- 相機 ---------- */
  async function startCam() {
    var seq = ++C.seq;
    $('c-rec').disabled = true;
    var v = await KK.Camera.start(C.facing);
    if (seq !== C.seq) { KK.Camera.stop(); return; }
    C.stage.video = v;
    C.stage.mirror = C.facing === 'user';
    $('c-flip').querySelector('small').textContent = C.facing === 'user' ? '前鏡頭' : '後鏡頭';
    connectMeter();
    $('c-rec').disabled = false;
  }
  function buildStage() {
    if (C.stage) return;
    var st = new KK.Stage($('stage'), { bg: 'camera' });
    st.setPortraitOutput(true);   // 一律 720×1280 直式，相機畫面置中裁切
    st.S.critter = true;
    C.stage = st;
    window.KK_ACTIVE_STAGE = st;
  }
  async function begin() {
    var b = $('c-start');
    $('errbox').hidden = true;
    b.disabled = true; b.textContent = '啟動中…';
    try {
      buildStage();
      await startCam();
      $('start').hidden = true;
      C.stage.start();
      C.running = true;
      scheduleLayout();
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(function () {}); } catch (e) { /* ignore */ }
    } catch (e) {
      showErr(e);
      KK.Camera.stop();
    }
    b.disabled = false; b.textContent = '開始';
  }

  /* ---------- 錄影 ---------- */
  function setRecUi(on) {
    $('c-rec').classList.toggle('on', on);
    $('c-rec').setAttribute('aria-label', on ? '停止錄影' : '開始錄影');
    $('cam-root').classList.toggle('recording', on);
    $('timer').hidden = !on;
    var bs = document.querySelectorAll('.chip');
    if (!on) $('timer').textContent = '● 0:00 / 0:30';
    for (var i = 0; i < bs.length; i++) bs[i].disabled = false; // 錄影中可以切濾鏡
  }
  function startRec() {
    if (C.rec || !C.stage || !C.stage.video) return;
    closeResult();
    var hd;
    try { hd = KK.Recorder.start(C.stage, { maxSec: 30, onTick: function (el, max) { $('timer').textContent = '● ' + fmtT(el) + ' / ' + fmtT(max); } }); }
    catch (e) { toast('無法錄影：' + ((e && e.message) || e) + '（' + ((e && e.name) || '') + '）', 6000); return; }
    C.rec = hd;
    setRecUi(true);
    hd.done.then(function (r) {
      if (C.rec !== hd) return;
      C.rec = null;
      setRecUi(false);
      showResult(r);
    });
  }
  function showResult(r) {
    C.lastResult = r;
    closeResult();
    var v = $('rv');
    try { C.resultUrl = URL.createObjectURL(r.blob); v.src = C.resultUrl; v.load(); } catch (e) { /* ignore */ }
    $('rinfo').textContent = KK.Recorder.describe(r).join('\n');
    $('rmsg').textContent = '';
    $('rsave').disabled = !r.size;
    $('result').hidden = false;
  }
  function closeResult() {
    $('result').hidden = true;
    var v = $('rv');
    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ }
    if (C.resultUrl) { try { URL.revokeObjectURL(C.resultUrl); } catch (e) { /* ignore */ } C.resultUrl = ''; }
    // 錄影被「離開頁面」中斷時，相機可能已被停掉：回來後補開
    if (C.running && !document.hidden && (!KK.Camera.stream || KK.Camera.stream.getTracks().some(function (t) { return t.readyState !== 'live'; }))) resumeCam();
  }
  async function resumeCam() {
    try { await startCam(); if (!C.stage.running) C.stage.start(); }
    catch (e) { toast('相機被系統中斷，請重新整理頁面：' + ((e && e.name) || ''), 6000); }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    var inapp = KK_Diag.isInApp();
    $('inapp').hidden = !inapp;
    // 相容性檢查
    var p = [];
    if (!window.isSecureContext) p.push('此頁面不是 HTTPS 安全環境，瀏覽器會禁止使用相機。請確認網址以 https:// 開頭。');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) p.push('這個瀏覽器不支援 getUserMedia（無法使用相機）。');
    if (!KK.Recorder.supported()) p.push('這個瀏覽器不支援 MediaRecorder 或 canvas.captureStream（無法錄影）。iPhone 需 iOS 14.3 以上。');
    if (p.length) { var cp = $('compat'); cp.hidden = false; cp.innerHTML = '<h3>⚠ 相容性問題</h3><ul>' + p.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
    if (window.KK_LOAD_ERRORS && KK_LOAD_ERRORS.length) { var c2 = $('compat'); c2.hidden = false; c2.innerHTML += '<p>有 ' + KK_LOAD_ERRORS.length + ' 個檔案載入失敗（見測試資訊）</p>'; }

    buildChips();
    var sb = $('c-start');
    sb.disabled = false; sb.textContent = '開始';
    sb.addEventListener('click', function () {
      ensureAudioCtx();                                   // 使用者手勢內建立 AudioContext
      KK.Camera.wantAudio = function () { return !C.noMic; }; // 本頁一律要麥克風
      begin();
    });
    $('c-info').addEventListener('click', function () { if (!C.rec) KK_Diag.show(); });
    $('c-info0').addEventListener('click', function () { KK_Diag.show(); });
    $('c-reset').addEventListener('click', function () { if (C.stage) { C.stage.reset(); toast('烏雲重新佈滿了', 1500); } });
    $('c-flip').addEventListener('click', async function () {
      if (C.rec || !C.stage) return;
      var old = C.facing;
      C.facing = old === 'user' ? 'environment' : 'user';
      $('c-flip').disabled = true;
      try { await startCam(); toast('已切換：' + (C.facing === 'user' ? '前鏡頭' : '後鏡頭'), 1800); }
      catch (e) {
        C.facing = old;
        toast('切換失敗：' + ((e && e.name) || '') + '，還原中', 3000);
        try { await startCam(); } catch (e2) { toast('還原鏡頭失敗：' + ((e2 && e2.name) || ''), 5000); }
      }
      $('c-flip').disabled = false;
    });
    $('c-rec').addEventListener('click', function () { if (C.rec) C.rec.stop('手動停止'); else startRec(); });
    $('rsave').addEventListener('click', function () {
      if (!C.lastResult) return;
      var b = $('rsave'); b.disabled = true;
      KK.Recorder.save(C.lastResult).then(function (o) { $('rmsg').textContent = o.msg; b.disabled = false; },
        function (e) { $('rmsg').textContent = '儲存失敗：' + ((e && e.message) || e); b.disabled = false; });
    });
    $('ragain').addEventListener('click', closeResult);
    $('rcopy').addEventListener('click', function () {
      KK_Diag.copy(KK_Diag.collect().text, null).then(function (ok) { $('rmsg').textContent = ok ? '已複製測試資訊，請貼回 LINE／訊息。' : '複製失敗，請按右下「測試資訊」手動複製。'; });
    });

    window.addEventListener('resize', scheduleLayout);
    window.addEventListener('orientationchange', scheduleLayout);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleLayout);
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { document.addEventListener(n, function (e) { e.preventDefault(); }); });
    $('frame').addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) { if (e.target.closest && !e.target.closest('.chips, .startscreen, .resultpanel, .modal-card')) e.preventDefault(); }, { passive: false });

    // 切到背景：停畫面與相機（錄影由 KK.Recorder 自己停止並保留）；回來自動重開
    document.addEventListener('visibilitychange', function () {
      if (!C.running) return;
      if (document.hidden) {
        if (C.stage) C.stage.stop();
        C.seq++; C.wasCam = true;
        KK.Camera.stop();
        if (C.stage) C.stage.video = null;
      } else if (C.wasCam) {
        C.wasCam = false;
        if ($('result').hidden) resumeCam();
      }
    });
    window.addEventListener('pagehide', function () { try { KK.Camera.stop(); } catch (e) { /* ignore */ } });

    scheduleLayout();
    window.KK_CAMPAGE_READY = true;
  }

  KKReady(init);
})();
