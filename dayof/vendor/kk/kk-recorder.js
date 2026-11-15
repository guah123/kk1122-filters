/* 錄影：把 grok/261112-proto 的錄影流程改寫成共用模組，畫面來源是 KK.Stage。
 *   const h = KK.Recorder.start(stage, { onTick(sec) {}, onSaved(result) {} });
 *   h.stop('使用者按停止')  // 請直接在「停止鈕的 click handler」裡呼叫，才保得住使用者手勢
 * 規則：MIME 依序試 mp4/avc1 → mp4 → webm vp9 → vp8 → webm；MediaRecorder 帶位元率失敗就用基本參數；start(1000)；
 * 沒有一般使用者看得到的長度上限，只有 10 分鐘的安全上限（R.limitSec，防止忘記按停止吃光記憶體，到了照常停止並存檔）；
 * 離開頁面（visibilitychange hidden / pagehide）停止並保留已錄部分；錄影中鎖住畫布尺寸（stage.lockForRecording）。
 * 停止後「立刻」（在 onstop 裡、讀回尺寸驗證之前）用 <a download> 自動存到手機（R.autoSave），不跳結果頁、不呼叫 navigator.share。
 * 備援：下載可能被擋（iOS／內建瀏覽器／手勢已過期／在背景停止）→ result.save.fallback=true，UI 顯示「儲存剛剛這段」鈕 → R.saveAgain(result)。
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
  const R = { runs: [], active: null, last: null, MIMES: MIMES, limitSec: 600 };
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
    if (R.last && R.last.blob) R.last.blob = null; // 上一段只保留到這次錄影開始，之後釋放
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
    const limitSec = R.limitSec;
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
        hasAudioTrack: c.hasAudio, audioTracks: c.audioTracks, stopReason: c.reason || '未知', stopKind: c.kind || 'user',
        filter: run.filter, n: run.n, facing: run.facing, warn: '', recErr: run.recErr || '',
      };
      result.orientation = orient(cw, ch);
      if (!blob.size) result.warn = '檔案是空的（0 bytes）';
      else if (blob.size / 1024 / Math.max(0.5, dur) < 5) result.warn = '檔案偏小（<5 KB/s），畫面可能靜止或編碼異常';
      if (avg != null && avg < 20) result.warn += (result.warn ? '；' : '') + '平均繪製幀率偏低（<20）';
      if (/離開|visibility|pagehide/.test(result.stopReason)) result.warn += (result.warn ? '；' : '') + '錄影因離開頁面被中斷，僅保留已錄部分';
      if (opts.autoSave !== false) R.autoSave(result); else result.save = { skipped: true, triggered: false, fallback: false, usedFallback: false, name: R.filename(result) };
      if (opts.onSaved) { try { opts.onSaved(result); } catch (e) { /* ignore */ } }
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

    function stop(reason, kind) {
      if (c.stopped) return done;
      c.stopped = true; c.reason = reason || '使用者按停止'; c.kind = kind || 'user';
      c.dur = (performance.now() - c.t0) / 1000;
      clearInterval(tick);
      try { if (rec.state !== 'inactive') rec.stop(); else finish(); } catch (e) { run.recErr = errStr(e); finish(); }
      return done;
    }
    function onVis() { if (document.hidden) stop('離開頁面／切換 App／鎖螢幕（visibilitychange），已保留已錄部分', 'background'); }
    function onHide() { stop('離開頁面（pagehide），已保留已錄部分', 'background'); }
    const handle = { run: run, done: done, stop: stop, elapsed: function () { return (performance.now() - c.t0) / 1000; }, limitSec: limitSec };
    try { rec.start(1000); } catch (e) { cleanup(); throw e; }
    R.active = handle;
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    tick = setInterval(function () {
      const el = handle.elapsed();
      if (opts.onTick) { try { opts.onTick(el); } catch (e) { /* ignore */ } }
      if (el >= limitSec) stop('已達 10 分鐘安全上限，自動停止並存檔', 'limit');
    }, 200);
    if (opts.onTick) opts.onTick(0);
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
      ext: R.ext(r), stopKind: R.kindLabel(r.stopKind),
      autoDownload: r.save ? (r.save.skipped ? '略過（selftest）' : r.save.triggered ? '已觸發' : r.save.pending ? '背景無法下載，待按鈕' : '未觸發' + (r.save.error ? '（' + r.save.error + '）' : '')) : '-',
      fallbackShown: !!(r.save && r.save.fallback), fallbackUsed: !!(r.save && r.save.usedFallback),
    };
  };

  R.ext = function (r) { return ((r && r.mime) || '').indexOf('mp4') >= 0 ? 'mp4' : 'webm'; };
  R.kindLabel = function (k) { return k === 'background' ? '背景' : k === 'limit' ? '10 分鐘上限' : '使用者'; };
  /* kankan-YYYYMMDD-HHMMSS.<mp4|webm> */
  R.filename = function (r) {
    const d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return 'kankan-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '.' + R.ext(r);
  };
  R.platform = function () {
    const ua = navigator.userAgent || '';
    if (/Line\/|FBAN|FBAV|Instagram|MicroMessenger|FB_IAB/i.test(ua)) return 'inapp';
    if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  };
  R.savedMsg = function (platform) {
    return platform === 'ios' ? '已存到手機（iPhone：檔案 App › 下載項目）'
      : platform === 'android' ? '已存到手機的「下載」'
      : platform === 'inapp' ? '已嘗試下載；內建瀏覽器常會擋下，沒看到請按「儲存剛剛這段」或改用 Safari／Chrome'
      : '已存到本機的「下載」資料夾';
  };
  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 60000);
  }
  function syncRun(r) {
    for (let i = R.runs.length - 1; i >= 0; i--) if (R.runs[i].n === r.n) { R.runs[i] = R.summary(r); return; }
  }
  /* 錄完自動存到手機（<a download>，不用 navigator.share）。要在 stop 這次點擊的使用者手勢仍有效時呼叫。
   * 回傳（也放在 result.save）：{ name, triggered, pending, fallback, usedFallback, platform, msg, error } */
  R.autoSave = function (r) {
    const info = { name: r ? R.filename(r) : '', triggered: false, pending: false, fallback: false, usedFallback: false, platform: R.platform(), msg: '', error: '' };
    if (r) r.save = info;
    if (!r || !r.blob || !r.blob.size) { info.msg = '沒有可儲存的影片'; return info; }
    if (document.hidden) {           // 背景頁面無法下載 → 回到前景再按鈕
      info.pending = true; info.fallback = true;
      info.msg = '剛剛的錄影已保留，還沒存到手機。請按「儲存剛剛這段」。';
      return info;
    }
    try { triggerDownload(r.blob, info.name); info.triggered = true; }
    catch (e) { info.error = errStr(e); info.fallback = true; }
    const stale = !!(navigator.userActivation && !navigator.userActivation.isActive);
    info.fallback = info.fallback || info.platform === 'ios' || info.platform === 'inapp' || stale;
    info.msg = info.triggered ? R.savedMsg(info.platform) : '自動下載失敗，請按「儲存剛剛這段」。';
    return info;
  };
  /* 備援：使用者再點一次（新的使用者手勢）重新觸發下載 */
  R.saveAgain = function (r) {
    if (!r || !r.blob || !r.blob.size) return { ok: false, msg: '這段影片已釋放，請重新錄影。' };
    const info = r.save || (r.save = { platform: R.platform() });
    info.name = info.name || R.filename(r);
    try { triggerDownload(r.blob, info.name); } catch (e) { return { ok: false, msg: '下載失敗：' + errStr(e) }; }
    info.triggered = true; info.pending = false; info.usedFallback = true; info.fallback = false;
    syncRun(r);
    return { ok: true, msg: R.savedMsg(info.platform) };
  };

  KK.Recorder = R;
})();
