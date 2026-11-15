/* 舞台：把「背景（示範書牆／深色／相機）」＋「濾鏡疊加層」合成在同一張 canvas。
 * 展示頁、相機模式、selftest、MP4 渲染都用這一支，確保看到的＝錄到的。 */
(function () {
  'use strict';
  const KK = window.KK;
  const MAX_PIXELS = 1.25e6; // 約 720×1600，手機 30fps 的安全上限

  function Stage(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.S = { w: 1, h: 1, u: 1, t: 0, phase: 0, now: 0, D: 14, critter: true, fps: 0 };
    this.bgMode = opts.bg || 'books'; // 'books' | 'dark' | 'camera' | 'none'
    this.video = null;
    this.mirror = false;
    this.def = null;
    this.inst = null;
    this.running = false;
    this.t0 = 0;
    this.frames = [];
    this.maxPixels = opts.maxPixels || MAX_PIXELS;
    this.fixedSize = opts.size || null; // [w,h] 固定像素（渲染用）
    this.locked = false;                // 錄影中鎖住尺寸（同 261112-proto：錄影中不改畫布大小，避免編碼器出問題）
    this.maxFps = opts.maxFps || 0;     // 0 = 跟螢幕刷新；錄影時建議 30（同 proto 的 29ms 節流）
    this._last = 0;
    this.portrait = false;
    this.rotateVideo = 0;
    try { this.rotateVideo = +(new URLSearchParams(location.search).get('rotate') || 0) || 0; } catch (e) { /* ignore */ }
    if (opts.pointer !== false) this._bindPointer();
  }

  /* ---------- 與 grok/261112-proto 合併用的接口（本版不錄影，先備好） ----------
   * 合併方式：stage.lockForRecording(true) → const ms = stage.recordStream(30) →
   *   new MediaRecorder(ms, { mimeType: proto 的 pickMime() }) … 停止後 lockForRecording(false)。
   * 濾鏡本身不需要任何修改。 */
  /* ★ 直式輸出（Kai 要求：相機模式與錄影一律 9:16 直向）
   * 開啟後畫布固定為 720×1280（不論手機方向、桌機或手機），相機畫面「置中裁切填滿」，沒有黑邊。
   * 呼叫端（app／camera 頁）負責把 canvas 元素用 CSS 排成 9:16（例如 height:100dvh; aspect-ratio:9/16）。 */
  Stage.PORTRAIT = [720, 1280];
  Stage.prototype.setPortraitOutput = function (on, size) {
    this.portrait = !!on;
    this.fixedSize = on ? (size || Stage.PORTRAIT) : null;
    const was = this.locked; this.locked = false; this.fit(); this.locked = was;
  };
  /* 回報錄影/畫布方向（給診斷資訊） */
  Stage.prototype.outputInfo = function () {
    const w = this.canvas.width, h = this.canvas.height, v = this.video;
    return {
      canvas: w + '×' + h, orientation: h > w ? '直向' : (h === w ? '正方' : '橫向'),
      source: v && v.videoWidth ? v.videoWidth + '×' + v.videoHeight + (v.videoHeight >= v.videoWidth ? '（直）' : '（橫，已置中裁切）') : '—',
      rotate: this.rotateVideo || 0,
    };
  };

  /* 讓畫布解析度＝相機解析度（上限 1280×720、偶數），與 proto 的 setupCanvas 相同規則
   * ※ 已被直式輸出取代；保留給橫式實驗用。 */
  Stage.prototype.useVideoResolution = function (on) {
    const v = this.video;
    if (on && v && v.videoWidth) {
      const vw = v.videoWidth, vh = v.videoHeight;
      const s = Math.min(1, 1280 / Math.max(vw, vh), 720 / Math.min(vw, vh));
      this.fixedSize = [Math.max(2, Math.round(vw * s / 2) * 2), Math.max(2, Math.round(vh * s / 2) * 2)];
    } else {
      this.fixedSize = null;
    }
    this.fit();
  };
  Stage.prototype.lockForRecording = function (on) {
    this.locked = !!on;
    this.maxFps = on ? 30 : 0;
  };
  /* 合成畫面的影像軌＋相機串流裡的麥克風音軌（若有） */
  Stage.prototype.recordStream = function (fps) {
    if (!this.canvas.captureStream) throw Object.assign(new Error('此瀏覽器不支援 canvas.captureStream'), { name: 'NotSupported' });
    const cs = this.canvas.captureStream(fps || 30);
    const audio = KK.Camera.stream ? KK.Camera.stream.getAudioTracks() : [];
    return new MediaStream([...cs.getVideoTracks(), ...audio]);
  };

  Stage.prototype.setFilter = function (id) {
    this.def = KK.byId[id];
    if (!this.def) throw new Error('找不到濾鏡：' + id);
    this.inst = this.def.create();
    this.S.D = this.def.duration;
    this.t0 = performance.now();
    this.fit();
  };

  /* 依顯示尺寸決定內部解析度（限制總像素數，避免手機過熱掉幀） */
  Stage.prototype.fit = function () {
    if (this.locked) return;
    let W, H;
    if (this.fixedSize) {
      W = this.fixedSize[0]; H = this.fixedSize[1];
    } else {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(2, Math.round(r.width * dpr));
      H = Math.max(2, Math.round(r.height * dpr));
      const px = W * H;
      if (px > this.maxPixels) {
        const k = Math.sqrt(this.maxPixels / px);
        W = Math.round(W * k); H = Math.round(H * k);
      }
    }
    if (this.canvas.width !== W) this.canvas.width = W;
    if (this.canvas.height !== H) this.canvas.height = H;
    const S = this.S;
    S.w = W; S.h = H; S.u = Math.min(W, H);
    if (this.inst && this.inst.resize) this.inst.resize(S);
  };

  Stage.prototype.drawBg = function () {
    const g = this.ctx, S = this.S;
    const v = this.video;
    if (this.bgMode === 'camera' && v && v.readyState >= 2 && v.videoWidth) {
      // cover-fit：填滿畫面、置中裁切（橫向來源放進直式畫布 → 裁掉左右，不留黑邊）
      // rotateVideo = 90 / -90：僅供「影格真的側躺」的裝置使用（網址 ?rotate=90）。
      // 一般手機瀏覽器給的影格已依手機方向轉正，旋轉反而會讓畫面歪掉，所以預設 0。
      const rot = this.rotateVideo || 0;
      const vw = rot ? v.videoHeight : v.videoWidth, vh = rot ? v.videoWidth : v.videoHeight;
      const k = Math.max(S.w / vw, S.h / vh);
      const dw = vw * k, dh = vh * k;
      g.save();
      if (this.mirror) { g.translate(S.w, 0); g.scale(-1, 1); }
      if (rot) {
        g.translate(S.w / 2, S.h / 2);
        g.rotate((rot * Math.PI) / 180);
        g.drawImage(v, -dh / 2, -dw / 2, dh, dw);
      } else {
        g.drawImage(v, (S.w - dw) / 2, (S.h - dh) / 2, dw, dh);
      }
      g.restore();
    } else if (this.bgMode === 'none') {
      g.fillStyle = '#000';
      g.fillRect(0, 0, S.w, S.h);
    } else {
      g.fillStyle = '#1b1512';
      g.fillRect(0, 0, S.w, S.h);
      KK.Bg.draw(g, S, this.bgMode === 'camera' ? 'dark' : this.bgMode, S.t);
    }
  };

  /* 畫指定 loop 時間 t（秒）的一格；now = 真實經過秒數（給互動的暫時效果用） */
  Stage.prototype.renderAt = function (t, now) {
    const S = this.S;
    S.t = KK.mod(t, S.D);
    S.phase = S.t / S.D;
    S.now = now == null ? t : now;
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    this.drawBg();
    if (this.inst) {
      g.save();
      this.inst.draw(g, S);
      g.restore();
    }
  };

  Stage.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now() - (this.S.now || 0) * 1000;
    const loop = (ts) => {
      if (!this.running) return;
      if (this.maxFps && ts - this._last < 1000 / this.maxFps - 4) { this.raf = requestAnimationFrame(loop); return; }
      this._last = ts;
      const now = (ts - this.t0) / 1000;
      this.renderAt(now, now);
      // fps：最近 1 秒的幀數
      this.frames.push(ts);
      while (this.frames.length && ts - this.frames[0] > 1000) this.frames.shift();
      this.S.fps = this.frames.length;
      if (this.onFrame) this.onFrame(this.S);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  };
  Stage.prototype.stop = function () {
    this.running = false;
    cancelAnimationFrame(this.raf);
  };
  Stage.prototype.reset = function () {
    if (this.inst && this.inst.reset) this.inst.reset(this.S);
  };

  /* 手指 → 濾鏡（座標換成 canvas 像素）。type: 'down' | 'move' | 'up' */
  Stage.prototype._bindPointer = function () {
    const c = this.canvas;
    c.style.touchAction = 'none';
    const send = (type, e) => {
      if (!this.inst || !this.inst.pointer) return;
      const r = c.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * this.S.w;
      const y = ((e.clientY - r.top) / r.height) * this.S.h;
      this.inst.pointer(this.S, { type, x, y, id: e.pointerId });
    };
    const down = new Set();
    c.addEventListener('pointerdown', (e) => {
      down.add(e.pointerId);
      try { c.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      send('down', e);
    });
    c.addEventListener('pointermove', (e) => { if (down.has(e.pointerId)) send('move', e); });
    const up = (e) => { if (down.delete(e.pointerId)) send('up', e); };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
  };

  KK.Stage = Stage;

  /* ---------- 相機（後鏡頭預設、ideal 約束） ----------
   * 與 grok/261112-live-filter 評估一致：用 ideal 不用 exact；音訊關掉通話用處理。
   * 預覽不需要麥克風，所以 audio 預設不要求（網址加 ?audio=1 才會一起要）。 */
  KK.Camera = {
    constraints(facing) {
      return {
        video: {
          facingMode: { ideal: facing || 'environment' },
          width: { ideal: 720 },   // 直式，與 261112-proto 一致
          height: { ideal: 1280 },
          aspectRatio: { ideal: 9 / 16 }, // 不支援或給回橫向時，由 drawBg 置中裁切成 9:16
          frameRate: { ideal: 30 },
        },
        audio: KK.Camera.wantAudio()
          ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } }
          : false,
      };
    },
    wantAudio() {
      try { return new URLSearchParams(location.search).get('audio') === '1'; } catch (e) { return false; }
    },
    async start(facing) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const err = new Error(window.isSecureContext ? '這個瀏覽器不支援相機' : '需要 HTTPS 才能開相機');
        err.name = window.isSecureContext ? 'NotSupported' : 'InsecureContext';
        throw err;
      }
      KK.Camera.stop();
      // 與 261112-proto 相同的三段備援：完整設定 → 簡化相機設定 → 僅相機；被拒絕就不再重試
      const full = KK.Camera.constraints(facing);
      const tries = [
        full,
        { video: { facingMode: { ideal: facing || 'environment' } }, audio: full.audio },
        { video: { facingMode: { ideal: facing || 'environment' } }, audio: false },
      ];
      let stream = null, last = null;
      for (const c of tries) {
        try { stream = await navigator.mediaDevices.getUserMedia(c); break; }
        catch (e) {
          last = e;
          if (e.name === 'NotAllowedError' || e.name === 'SecurityError') throw e;
        }
      }
      if (!stream) throw last;
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.muted = true;
      v.playsInline = true;
      v.srcObject = stream;
      await v.play();
      // ★ 直式自動修正：手機直拿（視窗高>寬）但相機給回橫向影格 → 用「寬高對調」的約束重試一次
      //   （部分 iOS 版本對 width/height 的解讀與方向相反）；仍是橫向就交給 drawBg 置中裁切成 9:16。
      KK.Camera.log = KK.Camera.log || [];
      for (let k = 0; k < 50 && !v.videoWidth; k++) await new Promise((r) => setTimeout(r, 60));
      KK.Camera.log.push('第一次：' + v.videoWidth + '×' + v.videoHeight);
      const portraitDevice = window.innerHeight > window.innerWidth;
      if (portraitDevice && v.videoWidth > v.videoHeight && !KK.Camera._swapTried) {
        KK.Camera._swapTried = true;
        // iOS 同時只能有一條相機串流：先停舊的，再用對調約束重開；新串流不論直橫都採用（橫的會被裁切）
        stream.getTracks().forEach((tr) => tr.stop());
        const open = async (c) => {
          const s2 = await navigator.mediaDevices.getUserMedia(c);
          const v2 = document.createElement('video');
          v2.setAttribute('playsinline', ''); v2.setAttribute('muted', '');
          v2.muted = true; v2.playsInline = true; v2.srcObject = s2;
          await v2.play();
          for (let k = 0; k < 50 && !v2.videoWidth; k++) await new Promise((r) => setTimeout(r, 60));
          return [s2, v2];
        };
        let pair = null;
        try {
          const alt = KK.Camera.constraints(facing);
          alt.video.width = { ideal: 1280 };
          alt.video.height = { ideal: 720 };
          delete alt.video.aspectRatio;
          pair = await open(alt);
          KK.Camera.log.push('對調約束重試：' + pair[1].videoWidth + '×' + pair[1].videoHeight);
        } catch (e) {
          KK.Camera.log.push('對調重試失敗：' + (e && e.name) + '，改回原約束');
          pair = await open(tries.find(Boolean));
        }
        KK.Camera._swapTried = false;
        KK.Camera.stream = pair[0]; KK.Camera.video = pair[1]; KK.Camera.facing = facing || 'environment';
        return pair[1];
      }
      KK.Camera.stream = stream;
      KK.Camera.video = v;
      KK.Camera.facing = facing || 'environment';
      return v;
    },
    stop() {
      const s = KK.Camera.stream;
      if (s) s.getTracks().forEach((tr) => tr.stop());
      KK.Camera.stream = null;
      KK.Camera.video = null;
    },
    info() {
      const s = KK.Camera.stream;
      if (!s) return null;
      const vt = s.getVideoTracks()[0];
      return vt ? vt.getSettings() : null;
    },
  };
})();
