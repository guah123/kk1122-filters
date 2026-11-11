/* 看看 濾鏡共用核心：色盤、亂數、手繪線條、光點 sprite、紙張質感。
 * 純 Canvas 2D，不依賴任何外部資源。 */
(function () {
  'use strict';
  const KK = (window.KK = window.KK || {});

  /* ---------- 色盤（與 ART-DIRECTION.md 一致） ---------- */
  KK.PAL = {
    cream: '#F3E6CF',   // 燈下米
    page: '#E6CFA3',    // 舊書頁
    apricot: '#E3A46F', // 黃昏杏
    brick: '#C2674E',   // 磚紅
    ochre: '#D9A441',   // 計程車黃
    moss: '#8C9A6A',    // 苔綠
    mist: '#8FA3AE',    // 霧藍
    slate: '#5E6B78',   // 雨雲灰
    night: '#28324A',   // 夜墨藍
    umber: '#3A2E28',   // 炭褐
  };

  KK.TAU = Math.PI * 2;
  KK.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  KK.lerp = (a, b, k) => a + (b - a) * k;
  KK.smooth = (e0, e1, x) => {
    const k = KK.clamp((x - e0) / (e1 - e0), 0, 1);
    return k * k * (3 - 2 * k);
  };
  KK.easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  KK.mod = (a, n) => ((a % n) + n) % n;

  /* 決定性雜湊 0..1（同樣輸入永遠同樣輸出，讓 loop 可重現） */
  KK.hash = function (a, b) {
    const s = Math.sin(a * 12.9898 + (b || 0) * 78.233 + 0.123) * 43758.5453;
    return s - Math.floor(s);
  };
  KK.rng = function (seed) {
    let x = (seed * 2654435761) >>> 0 || 1;
    return function () {
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17;
      x ^= x << 5; x >>>= 0;
      return (x >>> 0) / 4294967296;
    };
  };

  /* hex → rgba 字串 */
  KK.rgba = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  KK.mix = function (h1, h2, k) {
    const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    const r = Math.round(KK.lerp((a >> 16) & 255, (b >> 16) & 255, k));
    const g = Math.round(KK.lerp((a >> 8) & 255, (b >> 8) & 255, k));
    const bl = Math.round(KK.lerp(a & 255, b & 255, k));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  };

  /* ---------- 手繪「線條呼吸」（boiling line） ----------
   * 每 1/6 秒換一組微小位移，三組循環，像逐格手繪動畫。 */
  KK.BOIL_FPS = 6;
  KK.boil = (t) => Math.floor(t * KK.BOIL_FPS) % 3;
  KK.jit = function (seed, t, amp) {
    return (KK.hash(seed, KK.boil(t) + 1) - 0.5) * 2 * amp;
  };

  /* 用手抖的折線/多邊形畫路徑（不 fill/stroke，交給呼叫者） */
  KK.wobPath = function (ctx, pts, closed, amp, seed, t) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0] + KK.jit(seed + i * 7.1, t, amp);
      const y = pts[i][1] + KK.jit(seed + i * 3.7 + 50, t, amp);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    if (closed) ctx.closePath();
  };

  /* 平滑曲線（經過中點的二次曲線），適合草坡、雲、剪影 */
  KK.smoothPath = function (ctx, pts, closed, amp, seed, t) {
    const P = pts.map((p, i) => [
      p[0] + (amp ? KK.jit(seed + i * 7.1, t, amp) : 0),
      p[1] + (amp ? KK.jit(seed + i * 3.7 + 50, t, amp) : 0),
    ]);
    const n = P.length;
    ctx.beginPath();
    if (closed) {
      const m0 = [(P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2];
      ctx.moveTo(m0[0], m0[1]);
      for (let i = 0; i < n; i++) {
        const p = P[i], q = P[(i + 1) % n];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const p = P[i], q = P[i + 1];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.lineTo(P[n - 1][0], P[n - 1][1]);
    }
  };

  /* 手抖的圓（用多邊形近似） */
  KK.wobCircle = function (ctx, x, y, r, amp, seed, t, seg) {
    seg = seg || 14;
    const pts = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * KK.TAU;
      const rr = r + KK.jit(seed + i * 5.3, t, amp);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    KK.smoothPath(ctx, pts, true, 0, 0, t);
  };

  /* ---------- 離屏 canvas 與 sprite 快取 ---------- */
  KK.canvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };

  const spriteCache = {};
  /* 柔邊光點：預先畫好，執行時只 drawImage（不即時模糊，錄影不卡） */
  KK.glow = function (hex, size, hard) {
    const key = hex + '|' + size + '|' + (hard || 0);
    if (spriteCache[key]) return spriteCache[key];
    const c = KK.canvas(size, size);
    const g = c.getContext('2d');
    const r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    const h = hard || 0;
    gr.addColorStop(0, KK.rgba(hex, 1));
    gr.addColorStop(KK.clamp(0.15 + h * 0.6, 0, 0.95), KK.rgba(hex, 0.55 + h * 0.3));
    gr.addColorStop(KK.clamp(0.45 + h * 0.45, 0, 0.98), KK.rgba(hex, 0.18));
    gr.addColorStop(1, KK.rgba(hex, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    spriteCache[key] = c;
    return c;
  };
  /* 散景光圈（亮邊、淡心），像鏡頭失焦的燈 */
  KK.bokeh = function (hex, size) {
    const key = 'bokeh|' + hex + '|' + size;
    if (spriteCache[key]) return spriteCache[key];
    const c = KK.canvas(size, size);
    const g = c.getContext('2d');
    const r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, KK.rgba(hex, 0.32));
    gr.addColorStop(0.72, KK.rgba(hex, 0.42));
    gr.addColorStop(0.86, KK.rgba(hex, 0.7));
    gr.addColorStop(0.93, KK.rgba(hex, 0.25));
    gr.addColorStop(1, KK.rgba(hex, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    spriteCache[key] = c;
    return c;
  };
  KK.drawSprite = function (ctx, spr, x, y, size, alpha) {
    if (alpha <= 0.003) return;
    ctx.globalAlpha = alpha;
    ctx.drawImage(spr, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
  };

  /* ---------- 紙張顆粒＋暗角（每個濾鏡最後一步共用） ---------- */
  let grainTile = null;
  function makeGrain() {
    const s = 192;
    const c = KK.canvas(s, s);
    const g = c.getContext('2d');
    const img = g.createImageData(s, s);
    const r = KK.rng(7);
    for (let i = 0; i < s * s; i++) {
      const v = r();
      const fiber = r() < 0.012 ? 1 : 0;
      const dark = v < 0.5;
      img.data[i * 4] = dark ? 58 : 243;
      img.data[i * 4 + 1] = dark ? 46 : 230;
      img.data[i * 4 + 2] = dark ? 40 : 207;
      img.data[i * 4 + 3] = Math.round((Math.abs(v - 0.5) * 2) * 22 + fiber * 40);
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  const vigCache = { key: '', c: null };
  KK.paper = function (ctx, S, opt) {
    opt = opt || {};
    if (!grainTile) grainTile = makeGrain();
    const grainA = opt.grain == null ? 0.5 : opt.grain;
    if (grainA > 0) {
      ctx.save();
      ctx.globalAlpha = grainA;
      const pat = ctx.createPattern(grainTile, 'repeat');
      // 顆粒跟著手繪節奏輕微跳動
      const b = KK.boil(S.t || 0);
      ctx.translate(b * 61, b * 37);
      ctx.fillStyle = pat;
      ctx.fillRect(-200, -200, S.w + 400, S.h + 400);
      ctx.restore();
    }
    const vig = opt.vignette == null ? 0.5 : opt.vignette;
    if (vig > 0) {
      const key = S.w + 'x' + S.h + 'v' + vig;
      if (vigCache.key !== key) {
        const c = KK.canvas(S.w / 4, S.h / 4);
        const g = c.getContext('2d');
        const cx = c.width / 2, cy = c.height / 2;
        const R = Math.hypot(cx, cy);
        const gr = g.createRadialGradient(cx, cy, R * 0.45, cx, cy, R * 1.02);
        gr.addColorStop(0, 'rgba(40,28,22,0)');
        gr.addColorStop(1, 'rgba(40,28,22,' + vig + ')');
        g.fillStyle = gr;
        g.fillRect(0, 0, c.width, c.height);
        vigCache.key = key; vigCache.c = c;
      }
      ctx.drawImage(vigCache.c, 0, 0, S.w, S.h);
    }
  };

  /* ---------- 濾鏡註冊 ---------- */
  KK.filters = [];
  KK.byId = {};
  KK.defineFilter = function (def) {
    KK.filters.push(def);
    KK.byId[def.id] = def;
  };

  /* 物件在 loop 中以整數圈數橫越畫面 → 天生無縫。
   * phase: 0..1 的 loop 進度；laps: 每個 loop 跑幾趟（整數）；off: 起點偏移 0..1 */
  KK.cross = function (phase, laps, off, x0, x1) {
    const k = KK.mod(phase * laps + off, 1);
    return KK.lerp(x0, x1, k);
  };
})();
