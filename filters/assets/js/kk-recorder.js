/* 錄影：把 grok/261112-proto 的錄影流程改寫成共用模組，畫面來源是 KK.Stage。
 *   const h = KK.Recorder.start(stage, { maxSec: 30, onTick(sec) {} });
 *   const result = await h.done;      // 或 await h.stop('手動停止')
 *   KK.Recorder.save(result);         // 分享（iOS「儲存影片」）或 <a download>
 * 規則（同 proto）：MIME 依序試 mp4/avc1 → mp4 → webm vp9 → vp8 → webm；MediaRecorder 帶位元率失敗就用基本參數；
 * start(1000)；30 秒自動停；離開頁面（visibilitychange hidden / pagehide）停止並保留已錄部分；錄影中鎖住畫布尺寸（stage.lockForRecording）。
 * 停止後會用離屏 <video> 讀回錄出檔案的 videoWidth/videoHeight，驗證真的是直向。 */
(function () {
  'use strict';
  const KK = window.KK;
  const MIMES = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  const R = { runs: [], active: null, last: null, MIMES: MIMES };
  let seq = 0;

  const errStr = (e) => (e && (e.name ? e.name + ': ' : '') + (e.message || '')) || String(e);
  const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : (b / 1024).toFixed(0) + ' KB');
  const orient = (w, h) => (!w || !h ? '未知' : h > w ? '直向' : h === w ? '正方' : '橫向');
  R.fmtSize = fmtSize;
  R.orient = orient;

  R.supported = function () {
    return typeof window.MediaRecorder !== 'undefined' && !!(window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream);
  };
  R.pickMime = function () {
    for (let i = 0; i < MIMES.length; i++) {
      try { if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(MIMES[i])) return MIMES[i]; } catch (e) { /* ignore */ }
    }
    return '';
  };

  /* 用離屏 <video> 讀回錄出檔案的實際解析度（驗證直向） */
  R.verify = function (blob) {
    return new Promise(function (resolve) {
      if (!blob || !blob.size) { resolve({ error: '檔案是空的' }); return; }
      let url = '', done = false;
      const v = document.createElement('video');
      v.muted = true; v.preload = 'metadata'; v.playsInline = true;
      v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      const fin = function (o) {
        if (done) return; done = true;
        clearTimeout(tm);
        try { v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ }
        try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
        resolve(o);
      };
      const ok = function () {
        if (v.videoWidth) fin({ videoWidth: v.videoWidth, videoHeight: v.videoHeight, orientation: orient(v.videoWidth, v.videoHeight) });
      };
      const tm = setTimeout(function () { fin({ error: '8 秒內讀不到影片尺寸' }); }, 8000);
      v.onloadedmetadata = ok;
      v.onloadeddata = ok;
      v.onerror = function () { fin({ error: '瀏覽器無法載入錄出的影片（' + ((v.error && v.error.code) || '?') + '）' }); };
      try { url = URL.createObjectURL(blob); v.src = url; } catch (e) { fin({ error: errStr(e) }); }
    });
  };

  /* 開始錄影。回傳 { run, done:Promise<result>, stop(reason), elapsed() }；無法錄影時丟例外（錄影狀態已還原）。 */
  R.start = function (stage, opts) {
    opts = opts || {};
    if (R.active) throw new Error('已經在錄影中');
    if (!R.supported()) throw Object.assign(new Error('此瀏覽器不支援 MediaRecorder／canvas.captureStream'), { name: 'NotSupported' });
    const maxSec = opts.maxSec || 30;
    const run = { n: ++seq, filter: stage.def ? stage.def.id : 'none', mime: R.pickMime(), facing: KK.Camera && KK.Camera.facing };
    stage.lockForRecording(true);
    const unlock = function () { stage.lockForRecording(false); };
    let ms;
    try { ms = stage.recordStream(30); } catch (e) { unlock(); throw e; }
    const base = run.mime ? { mimeType: run.mime } : {};
    let rec;
    try { rec = new MediaRecorder(ms, Object.assign({}, base, { videoBitsPerSecond: 3500000, audioBitsPerSecond: 128000 })); }
    catch (e) {
      try { rec = new MediaRecorder(ms, base); }
      catch (e2) { unlock(); throw e2; }
    }
    const cw = stage.canvas.width, ch = stage.canvas.height;
    const chunks = [];
    const c = { t0: performance.now(), frames: 0, n: 0, bt: performance.now(), samples: [], reason: '', stopped: false };
    c.audioTracks = ms.getAudioTracks().map(function (t) { return t.readyState + (t.muted ? '/muted' : '') + (t.enabled ? '' : '/disabled'); }).join(',') || '無音軌';
    c.hasAudio = ms.getAudioTracks().length > 0;
    const prevOnFrame = stage.onFrame;
    const onFrame = function (S) {
      const now = performance.now();
      c.frames++; c.n++;
      if (now - c.bt >= 1000) { c.samples.push(c.n * 1000 / (now - c.bt)); c.n = 0; c.bt = now; }
      if (prevOnFrame) prevOnFrame(S);
    };
    stage.onFrame = onFrame;

    let resolveDone, tick = 0, finished = false;
    const done = new Promise(function (r) { resolveDone = r; });
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = function (e) { run.recErr = errStr(e.error || e); };

    function cleanup() {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      if (stage.onFrame === onFrame) stage.onFrame = prevOnFrame;
      unlock();
      if (R.active === handle) R.active = null;
    }
    async function finish() {
      if (finished) return; finished = true;
      cleanup();
      const type = (rec.mimeType || run.mime || 'video/webm');
      const blob = new Blob(chunks, { type: type });
      const dur = c.dur != null ? c.dur : (performance.now() - c.t0) / 1000;
      const avg = dur > 0 ? c.frames / dur : null;
      const result = {
        blob: blob, mime: type, size: blob.size, durationSec: dur, width: cw, height: ch,
        fpsAvg: avg, fpsMin: c.samples.length ? Math.min.apply(null, c.samples) : avg,
        hasAudioTrack: c.hasAudio, audioTracks: c.audioTracks, stopReason: c.reason || '未知',
        filter: run.filter, n: run.n, facing: run.facing, warn: '', recErr: run.recErr || '',
      };
      result.orientation = orient(cw, ch);
      if (!blob.size) result.warn = '檔案是空的（0 bytes）';
      else if (blob.size / 1024 / Math.max(0.5, dur) < 5) result.warn = '檔案偏小（<5 KB/s），畫面可能靜止或編碼異常';
      if (avg != null && avg < 20) result.warn += (result.warn ? '；' : '') + '平均繪製幀率偏低（<20）';
      if (/離開|visibility|pagehide/.test(result.stopReason)) result.warn += (result.warn ? '；' : '') + '錄影因離開頁面被中斷，僅保留已錄部分';
      result.verified = await R.verify(blob);
      if (result.verified.orientation) result.orientation = result.verified.orientation;
      if (result.verified.error) result.warn += (result.warn ? '；' : '') + '驗證：' + result.verified.error;
      else if (result.verified.orientation !== '直向') result.warn += (result.warn ? '；' : '') + '錄出的影片不是直向！';
      R.last = result;
      R.runs.push(R.summary(result));
      if (opts.onStop) { try { opts.onStop(result); } catch (e) { /* ignore */ } }
      resolveDone(result);
    }
    rec.onstop = finish;

    function stop(reason) {
      if (c.stopped) return done;
      c.stopped = true; c.reason = reason || '手動停止';
      c.dur = (performance.now() - c.t0) / 1000;
      clearInterval(tick);
      try { if (rec.state !== 'inactive') rec.stop(); else finish(); } catch (e) { run.recErr = errStr(e); finish(); }
      return done;
    }
    function onVis() { if (document.hidden) stop('離開頁面／切換 App／鎖螢幕（visibilitychange），已保留已錄部分'); }
    function onHide() { stop('離開頁面（pagehide），已保留已錄部分'); }
    const handle = { run: run, done: done, stop: stop, elapsed: function () { return (performance.now() - c.t0) / 1000; }, maxSec: maxSec };
    try { rec.start(1000); } catch (e) { cleanup(); throw e; }
    R.active = handle;
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    tick = setInterval(function () {
      const el = handle.elapsed();
      if (opts.onTick) { try { opts.onTick(el, maxSec); } catch (e) { /* ignore */ } }
      if (el >= maxSec) stop(maxSec + ' 秒上限自動停止');
    }, 200);
    if (opts.onTick) opts.onTick(0, maxSec);
    return handle;
  };

  /* 不含 blob 的摘要（給診斷資訊用） */
  R.summary = function (r) {
    const v = r.verified || {};
    return {
      n: r.n, filter: r.filter, facing: r.facing || null, mime: r.mime, canvas: r.width + '×' + r.height,
      file: v.videoWidth ? v.videoWidth + '×' + v.videoHeight : '未驗證' + (v.error ? '（' + v.error + '）' : ''),
      orientation: r.orientation, durationSec: r.durationSec == null ? null : Math.round(r.durationSec * 10) / 10,
      sizeBytes: r.size, fpsAvg: r.fpsAvg == null ? null : Math.round(r.fpsAvg * 10) / 10,
      fpsMin: r.fpsMin == null ? null : Math.round(r.fpsMin * 10) / 10,
      hasAudioTrack: r.hasAudioTrack, audioTracks: r.audioTracks, stopReason: r.stopReason, warn: r.warn || '', recErr: r.recErr || '',
    };
  };

  /* 結果面板用的幾行文字 */
  R.describe = function (r) {
    const v = r.verified || {};
    const f = (x, d) => (x == null ? '-' : x.toFixed(d));
    const L = [
      '格式：' + r.mime,
      '畫布：' + r.width + '×' + r.height + '　影片檔：' + (v.videoWidth ? v.videoWidth + '×' + v.videoHeight : '未驗證') + '　方向：' + r.orientation + (r.orientation === '直向' ? ' ✓' : ' ✗'),
      '時長：' + f(r.durationSec, 1) + ' 秒　大小：' + fmtSize(r.size),
      '幀率：平均 ' + f(r.fpsAvg, 1) + '，最低 ' + f(r.fpsMin, 0),
      '麥克風音軌：' + (r.hasAudioTrack ? '有（' + r.audioTracks + '）' : '沒有（網址加 ?audio=1 才會收音）'),
      '停止原因：' + r.stopReason,
    ];
    if (r.warn) L.push('⚠ ' + r.warn);
    return L;
  };

  R.fileName = function (r) {
    const ext = (r.mime || '').indexOf('mp4') >= 0 ? 'mp4' : 'webm';
    const d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'kankan-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.' + ext;
  };

  /* 存到相簿：能分享檔案就 share（iOS 會有「儲存影片」），否則 <a download>。回傳 { method, name, msg } */
  R.save = async function (r) {
    if (!r || !r.blob || !r.blob.size) return { method: 'none', msg: '沒有可儲存的影片' };
    const base = (r.mime || 'video/webm').split(';')[0];
    const name = R.fileName(r);
    let file = null;
    try { file = new File([r.blob], name, { type: base }); } catch (e) { /* ignore */ }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: '看看｜錄影' });
        return { method: 'share', name: name, msg: '已開啟分享選單。iPhone 請選「儲存影片」；Android 請選相簿／相片。' };
      } catch (e) {
        if (e && e.name === 'AbortError') return { method: 'cancel', name: name, msg: '你取消了分享。' };
        /* 分享失敗 → 改用下載 */
      }
    }
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    return { method: 'download', name: name, msg: '已觸發下載（' + name + '）。iPhone 會存到「檔案」App、不是相簿；Android 請看「下載」。' };
  };

  KK.Recorder = R;
})();
