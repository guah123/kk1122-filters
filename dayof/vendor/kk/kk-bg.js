/* 示範背景：模擬「Kai 坐在彩色書牆前、暖色暗燈」的舞台。
 * 全部用程式畫（不使用照片），低解析度畫完再放大 → 便宜的模糊景深。 */
(function () {
  'use strict';
  const KK = window.KK;
  const SPINES = ['#8a4b3b', '#b07a3c', '#4f6b5a', '#6d5a7a', '#a8573f', '#c9a35a', '#3f5a73',
    '#7a8a4a', '#9c6b5a', '#d0b48a', '#5b4a3e', '#b58f7a', '#6f7f86', '#a3463d', '#e0c79a'];

  function books(W, H, seed) {
    const c = KK.canvas(W, H);
    const g = c.getContext('2d');
    const r = KK.rng(seed);
    g.fillStyle = '#2a1f1a';
    g.fillRect(0, 0, W, H);
    const u = Math.min(W, H);
    let y = -r() * u * 0.1;
    while (y < H) {
      const sh = u * (0.17 + r() * 0.05);
      let x = -r() * 10;
      while (x < W) {
        const bw = u * (0.022 + r() * 0.04);
        const bh = sh * (0.68 + r() * 0.27);
        const col = SPINES[Math.floor(r() * SPINES.length)];
        const lean = r() < 0.08 ? (r() - 0.5) * 0.25 : 0;
        g.save();
        g.translate(x + bw / 2, y + sh);
        g.rotate(lean);
        g.fillStyle = col;
        g.fillRect(-bw / 2, -bh, bw * 0.94, bh);
        // 書背上的小色帶
        if (r() < 0.6) {
          g.fillStyle = 'rgba(243,230,207,' + (0.15 + r() * 0.25) + ')';
          g.fillRect(-bw / 2, -bh * (0.2 + r() * 0.5), bw * 0.94, bh * 0.05);
        }
        g.restore();
        x += bw;
        if (r() < 0.04) x += u * 0.05; // 偶爾一點空隙
      }
      // 層板
      g.fillStyle = '#3b2a20';
      g.fillRect(0, y + sh, W, u * 0.02);
      y += sh + u * 0.02;
    }
    return c;
  }

  function performer(W, H) {
    // 很糊的人形＋吉他，只是暗示「台上有人」
    const c = KK.canvas(W, H);
    const g = c.getContext('2d');
    const u = Math.min(W, H);
    const cx = W * 0.5, base = H;
    g.fillStyle = '#5a3f33';
    g.beginPath();
    g.ellipse(cx, base - u * 0.62, u * 0.085, u * 0.105, 0, 0, KK.TAU); // 頭
    g.fill();
    g.beginPath();
    g.moveTo(cx - u * 0.26, base);
    g.quadraticCurveTo(cx - u * 0.24, base - u * 0.46, cx, base - u * 0.5);
    g.quadraticCurveTo(cx + u * 0.24, base - u * 0.46, cx + u * 0.26, base);
    g.fill();
    // 吉他
    g.fillStyle = '#8a5a34';
    g.beginPath();
    g.ellipse(cx - u * 0.05, base - u * 0.17, u * 0.15, u * 0.11, -0.35, 0, KK.TAU);
    g.fill();
    g.strokeStyle = '#6b4428';
    g.lineWidth = u * 0.03;
    g.beginPath();
    g.moveTo(cx + u * 0.05, base - u * 0.22);
    g.lineTo(cx + u * 0.3, base - u * 0.36);
    g.stroke();
    // 臉部受光
    g.fillStyle = 'rgba(227,164,111,0.55)';
    g.beginPath();
    g.ellipse(cx + u * 0.015, base - u * 0.63, u * 0.06, u * 0.08, 0, 0, KK.TAU);
    g.fill();
    return c;
  }

  /* 一次性的 box blur（只在換尺寸時跑，用小圖，不影響每幀效能；不依賴 ctx.filter，iOS 也一致） */
  function blur(c, r, passes) {
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    const img = g.getImageData(0, 0, W, H);
    const d = img.data, tmp = new Float32Array(W * H * 4);
    for (let p = 0; p < passes; p++) {
      for (let pass = 0; pass < 2; pass++) {
        const horiz = pass === 0;
        const L = horiz ? W : H, M = horiz ? H : W;
        for (let m = 0; m < M; m++) {
          for (let ch = 0; ch < 4; ch++) {
            let acc = 0;
            const at = (i) => { const k = KK.clamp(i, 0, L - 1); return ((horiz ? m * W + k : k * W + m) * 4) + ch; };
            for (let i = -r; i <= r; i++) acc += d[at(i)];
            for (let i = 0; i < L; i++) {
              tmp[at(i)] = acc / (2 * r + 1);
              acc += d[at(i + r + 1)] - d[at(i - r)];
            }
          }
        }
        for (let i = 0; i < d.length; i++) d[i] = tmp[i];
      }
    }
    g.putImageData(img, 0, 0);
  }

  const cache = { key: '', c: null };
  KK.Bg = {
    /* 取得（快取）低解析度背景 */
    get(w, h, mode) {
      const key = w + 'x' + h + mode;
      if (cache.key === key) return cache.c;
      const W = Math.ceil(w / 4), H = Math.ceil(h / 4);
      const c = KK.canvas(W, H);
      const g = c.getContext('2d');
      if (mode === 'dark') {
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, '#1d1a22');
        gr.addColorStop(0.6, '#2c2220');
        gr.addColorStop(1, '#3a2a22');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        const sp = g.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.max(W, H) * 0.6);
        sp.addColorStop(0, 'rgba(227,164,111,0.35)');
        sp.addColorStop(1, 'rgba(227,164,111,0)');
        g.fillStyle = sp;
        g.fillRect(0, 0, W, H);
      } else {
        // 先畫更小的書牆再放大（＝景深模糊）
        const bk = books(W, H, 11);
        g.imageSmoothingEnabled = true;
        g.drawImage(bk, 0, 0, W, H);
        // 暖燈：整體壓暗、偏暖；上方與下方更暗
        g.fillStyle = 'rgba(52,30,18,0.42)';
        g.fillRect(0, 0, W, H);
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, 'rgba(26,16,12,0.45)');
        gr.addColorStop(0.45, 'rgba(40,24,16,0.12)');
        gr.addColorStop(1, 'rgba(18,11,9,0.7)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'screen';
        const sp = g.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.55);
        sp.addColorStop(0, 'rgba(227,164,111,0.38)');
        sp.addColorStop(1, 'rgba(227,164,111,0)');
        g.fillStyle = sp;
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
      }
      // 台上的人
      const pf = performer(W, H);
      g.globalAlpha = mode === 'dark' ? 0.85 : 0.95;
      g.drawImage(pf, 0, 0, W, H);
      g.globalAlpha = 1;
      blur(c, Math.max(1, Math.round(Math.min(W, H) / 70)), 2);
      cache.key = key; cache.c = c;
      return c;
    },
    /* 每幀畫背景；加一點點「手持手機」的晃動 */
    draw(ctx, S, mode, t) {
      const c = KK.Bg.get(S.w, S.h, mode);
      const sway = S.u * 0.008;
      // 晃動也跟著 loop 週期走，錄成 MP4 時才會無縫
      const p = (S.phase || 0) * KK.TAU;
      const dx = Math.sin(p) * sway + Math.sin(p * 3) * sway * 0.3;
      const dy = Math.cos(p * 2) * sway * 0.6;
      const sc = 1.05;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(c, -S.w * (sc - 1) / 2 + dx, -S.h * (sc - 1) / 2 + dy, S.w * sc, S.h * sc);
    },
  };
})();
