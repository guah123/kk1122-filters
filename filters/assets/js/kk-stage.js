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
    if (opts.pointer !== false) this._bindPointer();
  }

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
      // cover-fit：填滿畫面、置中裁切
      const k = Math.max(S.w / v.videoWidth, S.h / v.videoHeight);
      const dw = v.videoWidth * k, dh = v.videoHeight * k;
      g.save();
      if (this.mirror) { g.translate(S.w, 0); g.scale(-1, 1); }
      g.drawImage(v, (S.w - dw) / 2, (S.h - dh) / 2, dw, dh);
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
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
      const stream = await navigator.mediaDevices.getUserMedia(KK.Camera.constraints(facing));
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.muted = true;
      v.playsInline = true;
      v.srcObject = stream;
      await v.play();
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
