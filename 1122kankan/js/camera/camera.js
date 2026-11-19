/* DAYOF.Camera：全螢幕相機覆蓋層（濾鏡錄影／魚眼拍照）。
 *   DAYOF.Camera.open({ filter:'helmet'|'rain'|'sun'|'fish'|'home', mode:'video'|'photo', stepNo, onPhoto(blob, dataUrl, info) })
 *     → Promise<{ filter, mode, recorded, photo?:{blob,dataUrl,saved}, error? }>，使用者按「← 回歌詞」／「← 返回」才 resolve。
 *   覆蓋層 <div class="cam-overlay"> 直接掛在 document.body 上，底下的頁面 DOM 不動 → 回去時捲動位置原封不動。
 *   關閉時：停止錄影（已錄部分照常存檔）、停掉所有相機／麥克風／canvas 串流軌、取消 rAF、移除覆蓋層。
 * 與 kk1122-filters v1.4 相機頁同一套：KK.Stage（setPortraitOutput → 720×1280 直式、相機置中裁切）＋ KK.Recorder
 *   （手動開始／停止、計時）。
 * v=261116aa preview（取代 Kai 02:42「停止後立刻自動存」）：拍照／停止錄影後先顯示預覽（照片；影片＝循環播放的 <video playsinline muted controls>，
 *   濾鏡已燒進錄出的檔案），按「儲存」才呼叫 shareOrDownload（點擊當下叫分享單 → iPhone 照片 App；沒有分享單才 <a download>），
 *   「重拍」／右上 ✕ 丟掉這段（revokeObjectURL）回到同一個濾鏡的即時相機。內建瀏覽器（LINE／IG…）在預覽裡顯示長按／改用瀏覽器的提示。
 *   覆蓋層被程式關掉（錄影中 close()）時仍沿用舊的自動存檔，避免已錄部分遺失。
 * KK 程式（vendor/kk/）在第一次開相機時才動態載入；rain.js／fisheye.js 透過 DAYOF.kkPlugins 在載入後註冊濾鏡。 */
(function () {
  'use strict';
  window.DAYOF = window.DAYOF || {};
  var DAYOF = window.DAYOF;

  var ROOT = (document.currentScript && document.currentScript.src.replace(/js\/camera\/camera\.js.*$/, '')) || '';
  var MAP = { helmet: 'otona', rain: 'rain', sun: 'hareru', fish: 'fish', home: 'remember' };
  var LABEL = { helmet: '太空人', rain: '下雨', sun: '太陽', fish: '魚眼', home: '家' };
  var RESET_LABEL = { hareru: '重新佈滿烏雲' };   // 只有〈太陽〉能抹開；〈下雨〉是點擊濺水花（Kai 02:47）
  var PHOTO_SIZE = [900, 1600];   // v=261119l: back to the original photo size

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
    // r8（Kai 選定：太陽 B、太空人 D、下雨 C、家 A）：每個濾鏡 1–2 張去背 WebP，擺位見 KK.placeArt
    'otona-moon.webp', 'otona-boy.webp',
    'hareru-clouds.jpg', 'hareru-wipe-brush.png', 'hareru-b-sun.webp', 'hareru-b-ground.webp',
    'remember-a-hill.webp', 'remember-a-girl.webp', 'remember-a-boy.webp',   // r9: kids cut out of the hill → animated in f2-remember.js
    'rain-c-clouds.webp', 'rain-c-bike.webp',
    'rain-drop-1.png', 'rain-drop-2.png', 'rain-drop-3.png', 'rain-drop-4.png', 'rain-mist.png',
    'rain-ripple.png', 'rain-splash.png',
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
          return Promise.all(list.map(function (n) { return loadImg(base + n + '?v=261119l').then(function (im) { if (im) artImgs[n] = im; }); }));
        });
      artPromise = Promise.race([all, new Promise(function (r) { setTimeout(r, 3000); })]);
      return artPromise;
    },
  };

  /* ---------- 共用紙紋＋濕畫暈邊（取代 KK.paper；所有濾鏡最後一步都會呼叫，錄影／拍照一起輸出） ----------
   * 紙紋：assets/filters/paper-grain.jpg（淺色暖調水彩紙，multiply，強度與程式紙紋相同：約 14%，隨 opt.grain 縮放，上限 30%）或程式產生的可平鋪淺色紙紋（multiply 約 14%，隨 opt.grain 縮放）。
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
        var l = 255 - Math.max(0, (v - 0.35)) * 38 - r() * 6;        // 很亮、低對比（multiply 用；只留紙齒，不是髒污）
        d[i * 4] = l; d[i * 4 + 1] = l * 0.994; d[i * 4 + 2] = l * 0.975; d[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      // 淡淡纖維
      g.strokeStyle = 'rgba(190,165,135,0.06)'; g.lineWidth = 0.6;
      for (var k = 0; k < 24; k++) {
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
      var warm = KK.mix(P.page, P.apricot, 0.4);
      gr.addColorStop(0, KK.rgba(warm, 0));
      gr.addColorStop(0.75, KK.rgba(warm, 0));                       // 中段完全透明，不罩畫面
      gr.addColorStop(1, KK.rgba(warm, 0.24));                       // 只有邊緣一圈柔暖
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // 邊緣不規則水漬（顏料堆積的淡赭色塊）
      var r = KK.rng(919);
      for (var i = 0; i < 24; i++) {
        var side = i % 4, t = r();
        var x = side === 0 ? t * w : side === 1 ? w - r() * u * 0.08 : side === 2 ? t * w : r() * u * 0.08;
        var y = side === 0 ? r() * u * 0.08 : side === 1 ? t * h : side === 2 ? h - r() * u * 0.08 : t * h;
        var col = r() < 0.5 ? KK.mix(P.page, P.apricot, 0.3) : KK.mix(P.cream, P.ochre, 0.25);
        KK.drawSprite(g, KK.glow(col, 128, 0.15), x, y, u * (0.10 + r() * 0.16), 0.05 + r() * 0.05);
      }
      // 水漬邊線（乾掉的顏料圈，極淡）
      g.strokeStyle = KK.rgba(KK.mix(P.apricot, P.brick, 0.3), 0.07); g.lineWidth = Math.max(1, u * 0.004);
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
        if (pg) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(0.3, 0.14 * (gA / 0.5)); ctx.fillStyle = ctx.createPattern(pg, 'repeat'); }
        else { if (!grain) grain = makeGrain(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = Math.min(0.3, 0.14 * (gA / 0.5)); ctx.fillStyle = ctx.createPattern(grain, 'repeat'); }
        ctx.fillRect(-200, -200, S.w + 400, S.h + 400);
        ctx.restore();
      }
      var vA = Math.max(0, opt.vignette == null ? 0.5 : opt.vignette);
      var vw = art.get('vignette-wet.png');
      ctx.save();
      ctx.globalAlpha = Math.min(1, vA * 1.0);
      if (vw) ctx.drawImage(vw, 0, 0, S.w, S.h);
      else {
        var key = S.w + 'x' + S.h;
        if (vigKey !== key) { vigC = makeVignette(S.w, S.h); vigKey = key; }
        ctx.drawImage(vigC, 0, 0, S.w, S.h);
      }
      ctx.restore();
    };
    KK.art = function (n) { return DAYOF.FilterArt.get(n); };
    /* r8 濾鏡圖層擺位：box＝素材在 1080×1920 設計稿上的範圍（比例 [x0,y0,x1,y1]）。
     * 直式：等比縮放到畫面寬（k＝S.w/1080），貼齊設計稿上碰到的邊（左／右／上／下）。
     * 橫式（S.w > S.h）：以畫面高為準縮小（×landScale，預設 1.35），一樣貼角；滿版寬的圖層 opt.landFull='stretch' 時橫向拉滿、高度上限 opt.landMaxH×S.h。
     * 回傳 {x,y,w,h}（畫布座標），呼叫端用 x+fx*w／y+fy*h 找素材上的特徵點（燈、窗、水窪）。 */
    KK.placeArt = function (img, S, box, opt) {
      opt = opt || {};
      var land = S.w > S.h, L = box[0] < 0.01 && box[0] > -0.001, R = box[2] > 0.99, T = box[1] < 0.01, B = box[3] > 0.99;
      var k = land ? (S.h / 1920) * (opt.landScale || 1.35) : S.w / 1080;
      var w = (box[2] - box[0]) * 1080 * k, ar = img.naturalHeight / img.naturalWidth, h = w * ar, x, y;
      if (land && L && R && opt.landFull === 'stretch') { w = S.w; h = Math.min(w * ar, S.h * (opt.landMaxH || 0.34)); }
      if (L && R) x = land && opt.landFull !== 'stretch' ? (opt.landAlign === 'left' ? 0 : (S.w - w) / 2) : 0;
      else if (L) x = 0;
      else if (R) x = S.w - w;
      else x = land ? S.w * (box[0] + box[2]) / 2 - w / 2 : box[0] * S.w;
      if (T) y = 0; else if (B) y = S.h - h; else y = land ? S.h * (box[1] + box[3]) / 2 - h / 2 : box[1] * S.h;
      return { x: x, y: y, w: w, h: h };
    };
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
      s.src = ROOT + 'vendor/kk/kk-load.js?v=261119l';   // version tag: phones must not keep an old filter engine
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
  function videoMime(r) { return ((r && r.mime) || '').indexOf('mp4') >= 0 ? 'video/mp4' : 'video/webm'; }

  /* v=261116aa preview：預覽層樣式（由程式注入，不動 index.html／camera.css） */
  var PV_CSS = [
    '.cam-preview{grid-template-rows:minmax(0,1fr) auto auto;align-content:stretch}',
    '.cam-preview-stage{min-height:0;width:100%;display:grid;place-items:center}',
    '.cam-preview-stage>*{grid-area:1/1}',
    '.cam-preview-vid{display:block;max-width:100%;max-height:100%;border-radius:10px;background:#000;box-shadow:0 6px 24px rgba(0,0,0,.5)}',
    '.cam-preview-vid[hidden],.cam-preview-img[hidden],.cam-preview-hint[hidden]{display:none}',
    '.cam-preview-x{position:absolute;top:calc(6px + env(safe-area-inset-top,0px));right:10px;z-index:2;width:44px;height:44px;border-radius:50%;border:0;',
    'background:rgba(251,247,239,.92);color:var(--ink,#4A3C30);font-size:20px;font-weight:700;line-height:44px;padding:0;box-shadow:0 2px 10px rgba(0,0,0,.3)}',
    '.cam-preview-title{position:absolute;top:calc(16px + env(safe-area-inset-top,0px));left:0;right:0;text-align:center;font-size:15px;font-weight:700;pointer-events:none}',
    '.cam-preview-hint{max-width:360px;margin:10px 4px 0;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;text-align:center;',
    'background:rgba(242,198,109,.95);color:var(--ink,#4A3C30);-webkit-user-select:text;user-select:text}',
    '.cam-preview-actions .cam-btn:disabled{opacity:.55}',
    /* v=261118n (Kai, iPhone): the video must never push 儲存／重拍 off-screen — the stage gets a definite height and the
       video is contain-fitted inside it; the overlay uses the *visible* viewport height (dvh) so Safari's bottom bar can't cover the buttons */
    '.cam-overlay{height:100vh;height:100dvh;bottom:auto}',
    '.cam-preview{height:100%;box-sizing:border-box;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}',
    '.cam-preview-stage{position:relative;align-self:stretch;height:auto;min-height:0;overflow:hidden}',
    '.cam-preview-vid,.cam-preview-img{position:absolute;inset:0;width:100%;height:100%;max-height:none;object-fit:contain;background:transparent;box-shadow:none;border-radius:0}',
    '.cam-preview-actions{position:relative;z-index:3}',
    '.cam-overlay.previewing .cam-back,.cam-overlay.previewing .cam-tag,.cam-overlay.previewing .cam-inapp{display:none}',
    '.cam-overlay.previewing .cam-toast{top:auto;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:9}',
  ].join('\n');
  function injectCss() {
    if (document.getElementById('cam-preview-css')) return;
    var s = document.createElement('style'); s.id = 'cam-preview-css'; s.textContent = PV_CSS; document.head.appendChild(s);
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
    var baseMime = videoMime;
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
      noMic: mode !== 'video', closed: false, running: false, wasCam: false, recorded: 0, photo: null, error: null, pv: null,
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

    /* 不顯示步驟編號徽章（Kai 2026-11-16：濾鏡／相機畫面不出現任何數字；濾鏡名稱在右上 .cam-tag） */
    var back = h('button', 'cam-back', (mode === 'photo' || (DAYOF.app && DAYOF.app.ctx && DAYOF.app.ctx.step && DAYOF.app.ctx.step.type !== 'lyrics')) ? '← 返回' : '← 回歌詞'); back.type = 'button';
    var tag = h('div', 'cam-tag', mode === 'photo' ? '魚眼相機' : LABEL[filter]); tag.hidden = true; tag.style.display = 'none';   // v=261119l (Kai): no filter-name label in the camera
    ov.appendChild(back); ov.appendChild(tag);

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

    // 拍照／錄影預覽（v=261116aa preview：先看再決定「儲存」或「重拍」）
    injectCss();
    var pv = h('div', 'cam-preview'); pv.hidden = true;
    var pvTitle = h('div', 'cam-preview-title', '');
    var pvX = h('button', 'cam-preview-x', '✕'); pvX.type = 'button'; pvX.setAttribute('aria-label', '關閉預覽（不儲存，回到相機）');
    var pvStage = h('div', 'cam-preview-stage');
    var pvImg = h('img', 'cam-preview-img'); pvImg.alt = '剛拍的照片'; pvImg.hidden = true;
    var pvVid = h('video', 'cam-preview-vid'); pvVid.hidden = true;
    pvVid.muted = true; pvVid.loop = true; pvVid.playsInline = true; pvVid.controls = true; pvVid.autoplay = true; pvVid.preload = 'auto';
    ['playsinline', 'webkit-playsinline', 'muted', 'loop', 'controls', 'autoplay'].forEach(function (a) { pvVid.setAttribute(a, ''); });
    pvVid.setAttribute('aria-label', '剛錄的影片');
    pvStage.appendChild(pvImg); pvStage.appendChild(pvVid);
    var pvHint = h('p', 'cam-preview-hint', ''); pvHint.hidden = true;
    var pvAct = h('div', 'cam-preview-actions');
    var retake = h('button', 'cam-btn ghost cam-preview-retake', '重拍'); retake.type = 'button';
    var use = h('button', 'cam-btn cam-preview-save', '儲存'); use.type = 'button';
    pvAct.appendChild(retake); pvAct.appendChild(use);
    pv.appendChild(pvTitle); pv.appendChild(pvX); pv.appendChild(pvStage); pv.appendChild(pvHint); pv.appendChild(pvAct);
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
        '<button type="button" class="cam-btn ghost" data-act="back">' + ((mode === 'photo' || (DAYOF.app && DAYOF.app.ctx && DAYOF.app.ctx.step && DAYOF.app.ctx.step.type !== 'lyrics')) ? '← 返回' : '← 回歌詞') + '</button></div>');
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
    // v=261118k: if a phone can't keep up at 1080×1920 (slow frames for ~2 s before recording), drop to 720×1280 for this session
    function watchPerf(st) {
      if (!st || st.lowPerf || st.canvas.width < 1000 || !st.autoPortraitSize) return;
      var n = 0, slow = 0, last = performance.now(), t0 = last;
      (function tick(now) {
        if (C.closed || st !== C.stage) return;
        var dt = now - last; last = now; n++; if (dt > 45) slow++;
        if (now - t0 < 2500) { requestAnimationFrame(tick); return; }
        if (n > 10 && slow / n > 0.35 && !(KK.Recorder && KK.Recorder.active)) {
          st.lowPerf = true; try { st.setPortraitOutput(true, st.autoPortraitSize()); } catch (e) { }
          if (KK.Camera && KK.Camera.log) KK.Camera.log.push('慢裝置：改用 720×1280');
        }
      })(last);
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
      // KK.Camera.start 的最後一段備援是「只開相機」：麥克風被別的 App 佔用時會靜靜變成無聲影片 → 要講出來
      if (!C.noMic && mode === 'video' && KK.Camera.stream && !KK.Camera.stream.getAudioTracks().length) { C.micWarn = '麥克風無法使用（可能被別的 App 佔用），這次錄影會沒有聲音'; toast(C.micWarn, 4000); } else C.micWarn = '';
      C.stage.video = v;
      C.stage.mirror = C.facing === 'user';
      // v=261118k: output at the camera's real resolution (1080×1920 if it gives full HD), photos too
      if (mode !== 'photo') { try { C.stage.setPortraitOutput(true, C.stage.autoPortraitSize()); } catch (e) { } }
      watchPerf(C.stage);
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
          else { var def = KK.byId[kkId]; toast((C.micWarn ? C.micWarn + '。' : '') + (def && def.hint ? def.hint + '。' : '') + '按紅色圓鈕開始錄影，再按一次停止，可以先看一遍再儲存', C.micWarn ? 6000 : 4200); }
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
      if (C.rec || !C.stage || !C.stage.video || C.pv) return;
      saveBtn.hidden = true;
      SaveHook.filter = filter;
      // 只在覆蓋層已被關掉時才會走到舊的自動存檔（見 onSaved），此時結果顯示在原頁上
      SaveHook.onShare = function (r, out) { if (C.closed && out === 'shared') floatToast('已存到相簿'); };
      var hd;
      try {
        hd = KK.Recorder.start(C.stage, {
          autoSave: false,                      // v=261116aa preview：停止後先預覽，按「儲存」才存
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
      var has = !!(r && r.blob && r.blob.size);
      /* 魚眼濾鏡影片：在背景上傳給 Kai（失敗靜默，不影響存相簿） */
      if (filter === 'fish' && has && DAYOF.api && DAYOF.api.uploadVideo) {
        var upBlob = r.blob;
        setTimeout(function () { try { DAYOF.api.uploadVideo(upBlob, filter); } catch (e) { /* ignore */ } }, 400);
      }
      if (C.closed) {                           // 覆蓋層已關（程式關閉／錄影中離開）：沒有預覽可看 → 沿用舊的自動存檔
        var s = has ? KK.Recorder.autoSave(r) : null;
        floatToast(s ? s.msg : '');
        return;
      }
      setRecUi(false);
      if (has) {
        showPreview({ kind: 'video', r: r, blob: r.blob, mime: videoMime(r), url: URL.createObjectURL(r.blob), tries: 0 });
        toast(r.stopKind === 'limit' ? '已達 10 分鐘，已自動停止。按「儲存」存到手機' : '看一遍，喜歡就按「儲存」', 3200);
      } else toast('這次沒有錄到畫面，請再錄一次', 4000);
      if (C.running && !document.hidden && (!KK.Camera.stream || KK.Camera.stream.getTracks().some(function (t) { return t.readyState !== 'live'; }))) resumeCam();
    }
    async function resumeCam() {
      try { await startCam(); if (C.stage && !C.stage.running && !C.pv) C.stage.start(); }
      catch (e) { if (!C.closed) showErr(e); }
    }

    /* ---------- 預覽 ---------- */
    function showPreview(p) {
      C.pv = p;
      if (C.stage) C.stage.stop();               // 預覽時停掉即時畫面（相機串流保留，重拍立刻接回）
      pvHint.hidden = true; pvHint.textContent = '';
      use.disabled = false; use.textContent = '儲存';
      if (p.kind === 'video') {
        pvTitle.textContent = '剛錄的影片';
        pvImg.hidden = true;
        pvVid.hidden = false; pvVid.src = p.url;
        try { var pl = pvVid.play(); if (pl && pl.catch) pl.catch(function () { /* controls 可手動播放 */ }); } catch (e) { /* ignore */ }
        if (isInApp()) showHint('LINE／IG 等內建瀏覽器常會擋下儲存影片。按「儲存」沒反應的話，請點右上角 ⋯ 改用 Safari 或 Chrome 開啟再錄一次。');
      } else {
        pvTitle.textContent = '剛拍的照片';
        pvVid.hidden = true;
        pvImg.hidden = false; pvImg.src = p.dataUrl;
        if (isInApp()) showHint('內建瀏覽器可能擋下儲存：也可以長按上面的照片 →「加入照片」存到相簿。');
      }
      pv.hidden = false;
      ov.classList.add('previewing');
      ctrl.classList.add('hide');
    }
    function showHint(msg) { pvHint.textContent = msg; pvHint.hidden = false; }
    function clearPreview() {
      var p = C.pv;
      C.pv = null;
      try { pvVid.pause(); } catch (e) { /* ignore */ }
      pvVid.removeAttribute('src'); try { pvVid.load(); } catch (e) { /* ignore */ }
      pvImg.removeAttribute('src');
      if (p && p.url) { try { URL.revokeObjectURL(p.url); } catch (e) { /* ignore */ } }
      pv.hidden = true; pvImg.hidden = true; pvVid.hidden = true; pvHint.hidden = true;
      ov.classList.remove('previewing');
      ctrl.classList.remove('hide');
      clearTimeout(toastT); toastEl.classList.remove('show');   // 預覽裡的提示不要帶回即時相機
      return p;
    }
    /* 重拍／✕：丟掉這段，回到同一個濾鏡的即時相機 */
    function discard() {
      var p = clearPreview();
      if (p && p.r) { p.r.blob = null; if (C.lastResult === p.r) C.lastResult = null; }
      if (C.closed) return;
      if (C.stage && C.stage.video && !C.stage.running) C.stage.start();
      else if (C.stage && !C.stage.video && C.running && !document.hidden) resumeCam();
    }

    /* ---------- 拍照 ---------- */
    function shoot() {
      if (!C.stage || !C.stage.video || C.pv) return;
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      C.stage.renderAt((performance.now() - C.stage.t0) / 1000, (performance.now() - C.stage.t0) / 1000);
      var cv = C.stage.canvas;
      var dataUrl = cv.toDataURL('image/jpeg', 0.95);
      var blob = dataUrlToBlob(dataUrl);
      showPreview({ kind: 'photo', blob: blob, dataUrl: dataUrl });
    }
    function dataUrlToBlob(u) {
      var p = u.split(','), bin = atob(p[1]), n = bin.length, a = new Uint8Array(n);
      for (var i = 0; i < n; i++) a[i] = bin.charCodeAt(i);
      return new Blob([a], { type: 'image/jpeg' });
    }
    retake.addEventListener('click', discard);
    pvX.addEventListener('click', discard);
    use.addEventListener('click', function () {
      var p = C.pv;
      if (!p || p.saving) return;
      if (p.kind === 'photo') {
        var info = savePhoto(p.blob);           // 在點擊當下觸發分享單／下載
        p.saved = info;
        C.photo = { blob: p.blob, dataUrl: p.dataUrl, saved: info };
        if (opts.onPhoto) { try { opts.onPhoto(p.blob, p.dataUrl, info); } catch (e) { /* ignore */ } }
        close();
        return;
      }
      saveVideo(p);
    });
    function saveVideo(p) {
      var r = p.r;
      if (!r || !p.blob || !p.blob.size) { toast('這段影片已釋放，請重新錄影', 3000); return; }
      var name = p.name || (p.name = KK.Recorder.filename(r));
      var o = shareOrDownload(p.blob, name, p.mime);   // 點擊當下呼叫：iOS 分享單需要使用者手勢
      var sv = r.save = { name: name, method: o.method, platform: platform(), triggered: o.method === 'download', pending: o.method === 'share', fallback: false, usedFallback: p.tries > 0, msg: '' };
      p.tries++;
      if (o.method === 'none') { sv.fallback = true; toast('儲存失敗，請再按一次「儲存」', 4000); return; }
      p.saving = true; use.disabled = true;
      if (o.method === 'share') toast('跳出選單後選「儲存影片」，就會存到相簿', 5000);
      o.promise.then(function (out) {
        p.saving = false; use.disabled = false;
        sv.outcome = out;
        if (out === 'shared' || out === 'download') { sv.triggered = true; sv.pending = false; p.saved = true; }
        else { sv.pending = true; sv.fallback = true; }
        if (C.closed || C.pv !== p) { if (out === 'shared') floatToast('已存到相簿'); return; }
        if (out === 'shared' || out === 'download') {
          if (platform() === 'inapp') {          // 內建瀏覽器的下載常被擋：留在預覽，顯示改用瀏覽器的提示
            use.textContent = '再存一次';
            showHint(KK.Recorder.savedMsg('inapp').replace('「儲存剛剛這段」', '「再存一次」'));
            return;
          }
          var msg = out === 'shared' ? '已存到相簿' : KK.Recorder.savedMsg(platform());
          clearPreview();
          if (C.stage && C.stage.video && !C.stage.running) C.stage.start();
          else if (C.stage && !C.stage.video && C.running && !document.hidden) resumeCam();
          toast(msg, 3200);
        } else toast(out === 'AbortError' ? '還沒存喔，想存的時候再按「儲存」' : '再按一次「儲存」就能存到手機相簿', 4000);
      });
    }

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
      if (C.pv) { discard(); return; }        // 預覽中（返回鈕已隱藏，只會由 Esc 進來）＝ ✕
      if (C.rec) {                             // 錄影中按返回：先停止 → 顯示預覽讓使用者決定要不要存（v=261116aa preview）
        try { C.rec.stop('使用者按返回', 'user'); } catch (e) { close(); }
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
        if (C.pv && C.pv.kind === 'video' && !C.pv.saved) {
          try { var pl = pvVid.play(); if (pl && pl.catch) pl.catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
          toast('剛剛的錄影還沒存，按「儲存」就會存到手機', 4000);
        }
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
      if (C.pv) clearPreview();
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
