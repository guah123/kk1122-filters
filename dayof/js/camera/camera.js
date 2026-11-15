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
  var RESET_LABEL = { hareru: '重新佈滿烏雲' };   // 只有〈太陽〉能抹開；〈下雨〉是點擊濺水花（Kai 02:47）
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

  /* ---------- 濾鏡水彩點陣素材（美術畫好丟進 assets/filters/ 就生效，不用改程式） ----------
   * DAYOF.FilterArt.get(name) → 已載入的 HTMLImageElement，或 null（檔案不存在／尚未載入 → 濾鏡用原本的向量畫法）。
   * 若有 assets/filters/manifest.json（["otona-sky.png", ...] 或 {files:[...]}），只載入清單內的檔，避免逐一試抓產生 404；
   * 沒有清單就逐一試抓（失敗靜默）。除錯：網址加 ?filterArtBase=<資料夾網址/> 改從別處讀。 */
  var ART_FILES = [
    'paper-grain.jpg', 'vignette-wet.png',
    'otona-sky.png', 'otona-stars.png', 'otona-meteor.png', 'otona-rooftop.png', 'otona-critters.png',
    'hareru-clouds.jpg', 'hareru-wipe-brush.png', 'hareru-sunlight.png', 'hareru-sun.png',
    'remember-hill.png', 'remember-house.png', 'remember-smoke.png', 'remember-runner-a.png', 'remember-runner-b.png',
    'rain-strokes.png', 'rain-drop-1.png', 'rain-drop-2.png', 'rain-drop-3.png', 'rain-drop-4.png', 'rain-mist.png', 'rain-puddle.png', 'rain-umbrella-walkers.png',
    'fisheye-frame.png', 'fisheye-bubble.png',
  ];
  var artImgs = {}, artPromise = null;
  function artBase() {
    try { var q = new URLSearchParams(location.search).get('filterArtBase'); if (q) return q.replace(/\/?$/, '/'); } catch (e) { /* ignore */ }
    return ROOT + 'assets/filters/';
  }
  function loadImg(url) {
    return new Promise(function (res) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { res(im.naturalWidth ? im : null); };
      im.onerror = function () { res(null); };
      im.src = url;
    });
  }
  DAYOF.FilterArt = {
    FILES: ART_FILES,
    get: function (name) { return artImgs[name] || null; },
    has: function (name) { return !!artImgs[name]; },
    /* 第一次開相機時呼叫；最多等 3 秒（慢網路時先用向量版，之後載到的圖在濾鏡下次 resize／取用時生效） */
    preload: function () {
      if (artPromise) return artPromise;
      var base = artBase();
      var all = fetch(base + 'manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
        .then(function (m) {
          var list = m ? (Array.isArray(m) ? m : (m.files || [])) : ART_FILES;
          list = list.filter(function (n) { return ART_FILES.indexOf(n) >= 0; });
          return Promise.all(list.map(function (n) { return loadImg(base + n).then(function (im) { if (im) artImgs[n] = im; }); }));
        });
      artPromise = Promise.race([all, new Promise(function (r) { setTimeout(r, 3000); })]);
      return artPromise;
    },
  };

  /* ---------- 共用紙紋＋濕畫暈邊（取代 KK.paper；所有濾鏡最後一步都會呼叫，錄影／拍照一起輸出） ----------
   * 紙紋：assets/filters/paper-grain.jpg（soft-light）或程式產生的可平鋪紙紋（multiply 約 14%）。
   * 暈邊：assets/filters/vignette-wet.png 或程式產生的暖色不規則水漬暈邊（預畫一次，每幀只 drawImage）。 */
  function installPaper(KK) {
    if (KK._dayofPaper) return;
    KK._dayofPaper = true;
    var P = KK.PAL;
    var grain = null, vigKey = '', vigC = null;
    function periodicNoise(n, cells, seed) {
      var r = KK.rng(seed), v = new Float32Array(cells * cells), out = new Float32Array(n * n), i, x, y;
      for (i = 0; i < v.length; i++) v[i] = r();
      for (y = 0; y < n; y++) for (x = 0; x < n; x++) {
        var fx = x / n * cells, fy = y / n * cells, xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var x0 = xi % cells, x1 = (xi + 1) % cells, y0 = yi % cells, y1 = (yi + 1) % cells;
        var a = v[y0 * cells + x0] + (v[y0 * cells + x1] - v[y0 * cells + x0]) * tx;
        var b = v[y1 * cells + x0] + (v[y1 * cells + x1] - v[y1 * cells + x0]) * tx;
        out[y * n + x] = a + (b - a) * ty;
      }
      return out;
    }
    function makeGrain() {
      var n = 256, c = KK.canvas(n, n), g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
      var o1 = periodicNoise(n, 8, 11), o2 = periodicNoise(n, 32, 23), o3 = periodicNoise(n, 128, 37), r = KK.rng(5);
      for (var i = 0; i < n * n; i++) {
        var v = o1[i] * 0.25 + o2[i] * 0.35 + o3[i] * 0.4;          // 冷壓紙的起伏
        var l = 255 - Math.max(0, (v - 0.35)) * 120 - r() * 18;      // 偏亮（multiply 用）
        d[i * 4] = l; d[i * 4 + 1] = l * 0.985; d[i * 4 + 2] = l * 0.95; d[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      // 淡淡纖維
      g.strokeStyle = 'rgba(150,120,90,0.18)'; g.lineWidth = 0.7;
      for (var k = 0; k < 40; k++) {
        var x = r() * n, y = r() * n, a = r() * Math.PI, L = 6 + r() * 18;
        for (var ox = -n; ox <= n; ox += n) for (var oy = -n; oy <= n; oy += n) {
          g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + Math.cos(a) * L * 0.5 + 2, y + oy + Math.sin(a) * L * 0.5, x + ox + Math.cos(a) * L, y + oy + Math.sin(a) * L); g.stroke();
        }
      }
      return c;
    }
    function makeVignette(W, H) {
      var w = Math.max(2, Math.round(W / 3)), h = Math.max(2, Math.round(H / 3)), c = KK.canvas(w, h), g = c.getContext('2d');
      var cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy), u = Math.min(w, h);
      var gr = g.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.02);
      gr.addColorStop(0, KK.rgba(P.cream, 0));
      gr.addColorStop(0.6, KK.rgba(KK.mix(P.cream, P.apricot, 0.35), 0.22));
      gr.addColorStop(1, KK.rgba(KK.mix(P.page, P.apricot, 0.4), 0.55));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // 邊緣不規則水漬（顏料堆積的淡赭色塊）
      var r = KK.rng(919);
      for (var i = 0; i < 70; i++) {
        var side = i % 4, t = r();
        var x = side === 0 ? t * w : side === 1 ? w - r() * u * 0.08 : side === 2 ? t * w : r() * u * 0.08;
        var y = side === 0 ? r() * u * 0.08 : side === 1 ? t * h : side === 2 ? h - r() * u * 0.08 : t * h;
        var col = r() < 0.5 ? KK.mix(P.page, P.apricot, 0.3) : KK.mix(P.cream, P.ochre, 0.25);
        KK.drawSprite(g, KK.glow(col, 128, 0.15), x, y, u * (0.12 + r() * 0.22), 0.16 + r() * 0.16);
      }
      // 水漬邊線（乾掉的顏料圈，極淡）
      g.strokeStyle = KK.rgba(KK.mix(P.apricot, P.brick, 0.3), 0.14); g.lineWidth = Math.max(1, u * 0.004);
      var pts = [], N = 48, m = u * 0.055;
      for (var j = 0; j < N; j++) {
        var a = j / N * KK.TAU, ca = Math.cos(a), sa = Math.sin(a);
        var k = Math.min((w / 2 - m) / Math.abs(ca || 1e-6), (h / 2 - m) / Math.abs(sa || 1e-6));
        k *= 1 - 0.03 * r();
        pts.push([cx + ca * k, cy + sa * k]);
      }
      KK.smoothPath(g, pts, true, 0, 0, 0); g.stroke();
      return c;
    }
    KK.paper = function (ctx, S, opt) {
      opt = opt || {};
      var art = DAYOF.FilterArt;
      var pg = art.get('paper-grain.jpg');
      var gA = opt.grain == null ? 0.5 : opt.grain;
      if (gA > 0) {
        ctx.save();
        var b = KK.boil(S.t || 0);
        ctx.translate(b * 61, b * 37);                      // 跟著手繪節奏輕微跳動
        if (pg) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = 0.55; ctx.fillStyle = ctx.createPattern(pg, 'repeat'); }
        else { if (!grain) grain = makeGrain(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.65; ctx.fillStyle = ctx.createPattern(grain, 'repeat'); }
        ctx.fillRect(-200, -200, S.w + 400, S.h + 400);
        ctx.restore();
      }
      var vA = Math.max(0.3, opt.vignette == null ? 0.5 : opt.vignette);
      var vw = art.get('vignette-wet.png');
      ctx.save();
      ctx.globalAlpha = Math.min(1, vA * 1.6);
      if (vw) ctx.drawImage(vw, 0, 0, S.w, S.h);
      else {
        var key = S.w + 'x' + S.h;
        if (vigKey !== key) { vigC = makeVignette(S.w, S.h); vigKey = key; }
        ctx.drawImage(vigC, 0, 0, S.w, S.h);
      }
      ctx.restore();
    };
    KK.art = function (n) { return DAYOF.FilterArt.get(n); };
  }

  /* ---------- KK 動態載入 ---------- */
  var kkPromise = null;
  function runPlugins() {
    try { installSave(window.KK); } catch (e) { /* ignore */ }
    try { installPaper(window.KK); } catch (e) { /* ignore */ }
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
  /* ---------- 存到相簿（Kai 02:42）：手機用系統分享單（iPhone「儲存影片／儲存影像」→ 照片 App），沒有分享單才 <a download> ----------
   * shareOrDownload(blob, name, mime) → info { name, method:'share'|'download'|'none', promise: Promise<'shared'|'AbortError'|'NotAllowedError'|'download'|...> }
   *   AbortError（使用者取消）／NotAllowedError（點擊手勢已過期，iOS 錄影收尾後常見）→ 不下載，呼叫端顯示「存到相簿」鈕讓使用者一鍵重試；
   *   其他錯誤 → 改用下載。桌機一律下載（桌機的分享單不能存到相簿）。須盡量在使用者點擊當下呼叫。 */
  function hhmmss() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()); }
  function canShareFile(file) {
    try { return !!(file && platform() !== 'desktop' && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { return false; }
  }
  function shareOrDownload(blob, name, mime) {
    var info = { name: name, method: '', platform: platform() };
    var file = null;
    try { file = new File([blob], name, { type: mime }); } catch (e) { file = null; }
    if (canShareFile(file)) {
      info.method = 'share';
      info.promise = navigator.share({ files: [file] }).then(function () { return 'shared'; }, function (e) {
        var n = (e && e.name) || 'Error';
        if (n === 'AbortError' || n === 'NotAllowedError') return n;
        try { triggerDownload(blob, name); return 'download'; } catch (e2) { return n; }
      });
      return info;
    }
    try { triggerDownload(blob, name); info.method = 'download'; } catch (e) { info.method = 'none'; info.error = String(e); }
    info.promise = Promise.resolve(info.method);
    return info;
  }
  function savePhoto(blob, name) {
    return shareOrDownload(blob, name || ('kanKan-1122-fisheye-' + hhmmss() + '.jpg'), 'image/jpeg');
  }

  /* KK.Recorder 改用「存到相簿」流程：檔名 kanKan-1122-<濾鏡>-<HHMMSS>.mp4/.webm；MIME 優先 mp4（iOS Safari）。
   * autoSave 在 MediaRecorder onstop 當下（停止鈕點擊後幾十毫秒內）就呼叫分享單；結果透過 SaveHook.onShare(r, outcome) 通知相機畫面。 */
  var SaveHook = { filter: '', onShare: null };
  function installSave(KK) {
    var R = KK.Recorder;
    if (!R || R._dayofSave) return;
    R._dayofSave = true;
    R.MIMES.splice(0, R.MIMES.length, 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm');
    R.filename = function (r) { return 'kanKan-1122-' + (SaveHook.filter || (r && r.filter) || 'video') + '-' + hhmmss() + '.' + R.ext(r); };
    var baseMime = function (r) { return ((r && r.mime) || '').indexOf('mp4') >= 0 ? 'video/mp4' : 'video/webm'; };
    function track(r, info) {
      info.promise.then(function (out) {
        var sv = r.save || {};
        if (out === 'shared' || out === 'download') { sv.triggered = true; sv.fallback = false; sv.pending = false; }
        else { sv.fallback = true; sv.pending = true; }
        sv.outcome = out;
        if (SaveHook.onShare) { try { SaveHook.onShare(r, out); } catch (e) { /* ignore */ } }
      });
    }
    R.autoSave = function (r) {
      var info = { name: r ? R.filename(r) : '', triggered: false, pending: false, fallback: false, usedFallback: false, platform: R.platform(), msg: '', error: '' };
      if (r) r.save = info;
      if (!r || !r.blob || !r.blob.size) { info.msg = '沒有可儲存的影片'; return info; }
      if (document.hidden) { info.pending = true; info.fallback = true; info.msg = '剛剛的錄影已保留，還沒存到手機。請按「存到相簿」。'; return info; }
      var o = shareOrDownload(r.blob, info.name, baseMime(r));
      info.method = o.method;
      if (o.method === 'share') { info.pending = true; info.msg = '跳出選單後選「儲存影片」，就會存到相簿'; }
      else if (o.method === 'download') { info.triggered = true; info.fallback = info.platform === 'inapp'; info.msg = R.savedMsg(info.platform); }
      else { info.fallback = true; info.msg = '自動儲存失敗，請按「存到相簿」。'; }
      if (o.promise) track(r, o);
      return info;
    };
    R.saveAgain = function (r) {
      if (!r || !r.blob || !r.blob.size) return { ok: false, msg: '這段影片已釋放，請重新錄影。' };
      var info = r.save || (r.save = { platform: R.platform() });
      info.name = info.name || R.filename(r);
      var o = shareOrDownload(r.blob, info.name, baseMime(r));
      info.usedFallback = true;
      if (o.method === 'none') return { ok: false, msg: '儲存失敗：' + (o.error || '') };
      track(r, o);
      return { ok: true, pending: o.method === 'share', msg: o.method === 'share' ? '選「儲存影片」就會存到相簿' : R.savedMsg(info.platform) };
    };
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
    var saveBtn = h('button', 'cam-save', '存到相簿'); saveBtn.type = 'button'; saveBtn.hidden = true;
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
        await Promise.all([loadKK(), DAYOF.FilterArt.preload()]);
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
      SaveHook.filter = filter;
      SaveHook.onShare = function (r, out) {
        if (C.closed) { if (out === 'shared') floatToast('已存到相簿'); return; }
        if (r !== C.lastResult && C.lastResult) return;
        if (C.closeOnShared) { C.closeOnShared = false; if (out === 'shared' || out === 'download') { floatToast(out === 'shared' ? '已存到相簿' : KK.Recorder.savedMsg(platform())); close(); return; } }
        if (out === 'shared') { saveBtn.hidden = true; toast('已存好了', 2000); }
        else if (out === 'download') { saveBtn.hidden = true; toast(KK.Recorder.savedMsg(platform()), 3000); }
        else { saveBtn.hidden = false; toast(out === 'AbortError' ? '還沒存喔，想存的時候按「存到相簿」' : '按「存到相簿」就能存到手機相簿', 4000); }
      };
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
      /* 魚眼濾鏡影片：分享單已在 autoSave 叫出後，才在背景上傳給 Kai（失敗靜默，不影響存相簿） */
      if (filter === 'fish' && r && r.blob && r.blob.size && DAYOF.api && DAYOF.api.uploadVideo) {
        var upBlob = r.blob;
        setTimeout(function () { try { DAYOF.api.uploadVideo(upBlob, filter); } catch (e) { /* ignore */ } }, 400);
      }
      var s = r.save || {};
      var msg = s.msg || '';
      if (r.stopKind === 'limit') msg = '已達 10 分鐘，已自動停止並存檔。' + (s.triggered ? msg : '');
      if (C.closed) { floatToast(msg); return; }
      setRecUi(false);
      saveBtn.hidden = !s.fallback;
      if (C.closeAfterSave) {
        C.closeAfterSave = false;
        if (s.method === 'share' && s.pending) { C.closeOnShared = true; toast(msg, 4000); return; }   // 等分享單結果：存好才回去，取消就留著「存到相簿」
        if (s.fallback) { toast('錄影已停止。請按「存到相簿」，再按「' + back.textContent + '」', 6000); return; }
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
      if (o.ok && !o.pending) saveBtn.hidden = true;
    });
    resetBtn.addEventListener('click', function () { if (C.stage) { C.stage.reset(); toast('烏雲重新佈滿了', 1500); } });
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
        if (!saveBtn.hidden) toast('剛剛的錄影還沒存到手機，請按「存到相簿」', 4000);
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
