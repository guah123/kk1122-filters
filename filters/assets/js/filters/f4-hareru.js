/* 4〈明日晴れるかな〉抹開烏雲：整片烏雲蓋住畫面，用手指抹開就看見太陽，抹多少自己決定。
 *
 * 分鏡（autoDemo 時間軸，14 秒）：
 *   0–1s    全滿烏雲：灰藍潮濕的柔軟雨雲緩緩飄、細斜雨絲，右上只隱約透出一團暖光（暗示太陽在那裡）。
 *   1–9s    像在起霧的窗上，一隻看不見的手指抹 4 下：斜向略帶弧度的抹痕，從太陽附近往中間、左下擴；
 *           抹開處是「被太陽照亮的畫面」：暖光＋放射光束，太陽整顆只在抹開處才出現。
 *   9–12.5s 停留：太陽光芒緩轉、閃光、低飽和彩虹浮現、小鳥飛過；左下缺口裡藏著坐著看太陽的小動物。
 *   12.5–14s 烏雲淡回全滿 → 與 0 秒相同，無縫 loop。
 *
 * 圖層（由下而上）：暖光＋光束 → 彩虹／小鳥 → 太陽（依太陽處抹開程度顯現）→ 小動物
 *   → 烏雲層（半解析度離屏 C，抹開處用遮罩 M 以 destination-out 挖掉）→ 紙張。
 * 效能：雲紋、雨絲都預畫成可無縫平鋪的 tile（雙倍寬／高），每幀只用「來源視窗平移」各一次 drawImage。
 * 無縫：雲紋每 loop 平移整數個 tile 寬；雨絲整數圈下落；太陽轉 2×(2π/12)；閃光、小鳥整數圈。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  const RAYS = 12;            // 太陽光芒數
  const CLOUD_ALPHA = 0.95;   // 雲層合成透明度（亮灰白暖雲；底層＋雲紋疊後整體約 85% 不透明，隱約透出後方）
  const M_DIV = 6;            // 遮罩解析度＝畫面 1/6
  const C_DIV = 2;            // 雲層解析度＝畫面 1/2
  const BRUSH = 0.14;         // 真實手指筆刷粗細（以 S.u 為單位）
  const TAB_DT = 0.25;        // autoDemo 估算表間隔（秒）

  /* 示範手指：4 下斜向弧形抹痕（畫面比例座標），t0–t1 為該下的起訖秒數。
   * 從太陽附近起筆，往中間、左下擴；每下之間手指離開（像在起霧的窗上抹） */
  const DEMO_STROKES = [
    { t0: 1.0, t1: 2.9, wp: [[0.96, 0.05], [0.76, 0.17], [0.50, 0.30], [0.24, 0.35], [0.06, 0.45]] },
    { t0: 3.3, t1: 5.2, wp: [[0.97, 0.30], [0.74, 0.40], [0.50, 0.53], [0.28, 0.58], [0.05, 0.69]] },
    { t0: 5.6, t1: 7.4, wp: [[0.95, 0.56], [0.72, 0.65], [0.50, 0.77], [0.28, 0.80], [0.07, 0.88]] },
    { t0: 7.8, t1: 9.0, wp: [[0.80, 0.80], [0.58, 0.90], [0.36, 0.92], [0.13, 0.96]] },
  ];

  KK.defineFilter({
    id: 'hareru',
    no: 4,
    song: '明日晴れるかな',
    title: '抹開烏雲',
    mood: '雨過天晴・自己決定・希望',
    duration: 14,
    hint: '用手指把烏雲抹開，抹多少由你決定',
    critterHint: '左下角烏雲抹開處，只有抹到那裡才淡淡浮現，仰望太陽（低對比、無光暈）',
    create() {
      const st = {
        C: null, cg: null, M: null, mg: null, sky: null, rain: null, beams: null,
        cu: 1, sun: { x: 0, y: 0, r: 0 }, strokes: null, tab: null,
        fingers: {}, cleared: 0, vis: 0, sunFrac: 0, sunV: 0, critFrac: 0, critV: 0, crit: { x: 0, y: 0 }, lastEst: -9, lastNow: 0, dirty: false, key: '',
        birds: [], sparks: [], lw: 1,
      };

      /* ---------- 雲紋：水平週期的分形雜訊 → 體積感雨雲（預畫一次） ---------- */
      function makeNoise(seed, nx, ny) {
        const r = KK.rng(seed), v = new Float32Array(nx * ny);
        for (let i = 0; i < v.length; i++) v[i] = r();
        return (x, y) => {                       // x 週期 nx，y 不週期（超出夾住）
          const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
          const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const x0 = KK.mod(xi, nx), x1 = KK.mod(xi + 1, nx);
          const y0 = Math.min(ny - 1, Math.max(0, yi)), y1 = Math.min(ny - 1, Math.max(0, yi + 1));
          const a = v[y0 * nx + x0] + (v[y0 * nx + x1] - v[y0 * nx + x0]) * sx;
          const b = v[y1 * nx + x0] + (v[y1 * nx + x1] - v[y1 * nx + x0]) * sx;
          return a + (b - a) * sy;
        };
      }
      const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

      /* 一層雲紋 tile（可水平無縫）。cells：水平基礎格數（愈小雲愈大）；cover：覆蓋門檻；
       * 回傳雙倍寬 canvas（每幀只用來源視窗平移 drawImage 一次） */
      function buildLayer(Tw, Th, seed, o) {
        const cells = o.cells, aspect = o.aspect;   // aspect：垂直格數／水平格數比（>1 = 垂直較碎＝橫向拉長的層雲）
        const ny0 = Math.max(2, Math.round(cells * aspect * (Th / Tw)));
        const octs = [];
        for (let k = 0; k < 4; k++) octs.push(makeNoise(seed + k * 17, cells * (1 << k), Math.ceil(ny0 * (1 << k)) + 2));
        const D = new Float32Array(Tw * Th);
        for (let y = 0; y < Th; y++) {
          for (let x = 0; x < Tw; x++) {
            let amp = 1, tot = 0, d = 0;
            for (let k = 0; k < 4; k++) {
              d += octs[k]((x / Tw) * cells * (1 << k), (y / Th) * ny0 * (1 << k)) * amp;
              tot += amp; amp *= 0.42;
            }
            d /= tot;
            D[y * Tw + x] = d + (0.5 - y / Th) * o.topBias;     // 上方較厚
          }
        }
        const img = new ImageData(Tw, Th), px = img.data;
        const dark = hexRGB(o.dark), mid = hexRGB(o.mid), lite = hexRGB(o.lite);
        const s = Math.max(3, Math.round(Tw / 36));              // 取亮部的位移（像素）
        for (let y = 0; y < Th; y++) {
          for (let x = 0; x < Tw; x++) {
            const i = y * Tw + x, d = D[i];
            const c = KK.smooth(o.lo, o.hi, d);
            if (c <= 0.002) continue;
            const xr = (x + s) % Tw, yu = Math.max(0, y - s);
            const dl = d - D[yu * Tw + xr];                       // 正＝朝右上的坡面（受光）
            let sh = KK.clamp(0.42 + dl * o.relief, 0, 1);        // 0 暗 … 1 亮
            sh = sh * (0.65 + 0.35 * (1 - KK.smooth(o.lo, o.hi + 0.1, d) * 0.5)); // 雲心略暗
            const col = sh < 0.5 ? [0, 1, 2].map((q) => dark[q] + (mid[q] - dark[q]) * sh * 2) : [0, 1, 2].map((q) => mid[q] + (lite[q] - mid[q]) * (sh - 0.5) * 2);
            const thick = 1 - 0.3 * (y / Th);                    // 往下略薄
            px[i * 4] = col[0]; px[i * 4 + 1] = col[1]; px[i * 4 + 2] = col[2];
            px[i * 4 + 3] = Math.round(255 * c * thick * o.alpha);
          }
        }
        const t = KK.canvas(Tw, Th), g = t.getContext('2d');
        if (o.base) {
          const gr = g.createLinearGradient(0, 0, 0, Th);
          const wl = KK.mix(P.cream, P.mist, 0.25), wd = KK.mix(P.page, P.slate, 0.35);
          gr.addColorStop(0, KK.rgba(KK.mix(wl, wd, 0.25), 0.66));
          gr.addColorStop(0.5, KK.rgba(KK.mix(wl, wd, 0.15), 0.62));
          gr.addColorStop(1, KK.rgba(KK.mix(wl, wd, 0.05), 0.6));
          g.fillStyle = gr; g.fillRect(0, 0, Tw, Th);
        }
        const tmp = KK.canvas(Tw, Th); tmp.getContext('2d').putImageData(img, 0, 0);
        g.drawImage(tmp, 0, 0);
        return t;
      }

      /* 雨絲 tile：上下左右皆可平鋪；回傳雙倍高 canvas */
      function buildRain(Tw, Th, U, seed, n, a) {
        const t = KK.canvas(Tw, Th), g = t.getContext('2d');
        const rnd = KK.rng(seed);
        g.strokeStyle = KK.rgba(KK.mix(P.mist, P.slate, 0.3), a);
        g.lineWidth = Math.max(1, U * 0.003); g.lineCap = 'round';
        const slope = 0.26;
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const x = rnd() * Tw, y = rnd() * Th, len = U * (0.04 + rnd() * 0.05);
          for (const ox of [-Tw, 0, Tw]) for (const oy of [-Th, 0, Th]) {
            g.moveTo(x + ox, y + oy); g.lineTo(x + ox - len * slope, y + oy + len);
          }
        }
        g.stroke();
        const d = KK.canvas(Tw, Th * 2), dg = d.getContext('2d');
        dg.drawImage(t, 0, 0); dg.drawImage(t, 0, Th);
        return d;
      }

      /* 太陽放射光束（預畫成一張，抹開處才看得見） */
      function buildBeams(S) {
        const B = Math.ceil((S.u * 1.5) / 2);
        const c = KK.canvas(B * 2, B * 2), g = c.getContext('2d');
        g.translate(B, B);
        const rnd = KK.rng(5);
        const angs = [92, 108, 123, 139, 155, 171, 186, 200];
        for (const deg of angs) {
          const a = (deg + (rnd() - 0.5) * 6) * Math.PI / 180, L = B * (0.7 + rnd() * 0.3), hw = 0.05 + rnd() * 0.035;
          g.save(); g.rotate(a);
          const gr = g.createLinearGradient(0, 0, L, 0);
          gr.addColorStop(0, KK.rgba(P.cream, 0.75)); gr.addColorStop(0.5, KK.rgba(P.cream, 0.28)); gr.addColorStop(1, KK.rgba(P.cream, 0));
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(0, -L * 0.012); g.lineTo(L, -L * hw); g.lineTo(L, L * hw); g.lineTo(0, L * 0.012); g.closePath(); g.fill();
          g.restore();
        }
        return c;
      }

      /* Catmull-Rom 取樣成密折線（遮罩座標）＋累積長度 */
      function samplePath(wp, S, k) {
        const W = wp.map((p) => [p[0] * S.w * k, p[1] * S.h * k]);
        const pts = [];
        for (let i = 0; i < W.length - 1; i++) {
          const p0 = W[Math.max(0, i - 1)], p1 = W[i], p2 = W[i + 1], p3 = W[Math.min(W.length - 1, i + 2)];
          for (let s = 0; s < 8; s++) {
            const u = s / 8, u2 = u * u, u3 = u2 * u;
            pts.push([
              0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
              0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
            ]);
          }
        }
        pts.push(W[W.length - 1]);
        const len = [0];
        for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        return { pts, len, total: len[len.length - 1] };
      }

      function drawDemoMask(S, t) {
        const m = st.mg;
        m.clearRect(0, 0, st.M.width, st.M.height);
        m.strokeStyle = '#fff'; m.lineCap = 'round'; m.lineJoin = 'round';
        const lw = (S.u * (S.h > S.w ? 0.2 : 0.17)) / M_DIV;
        for (let si = 0; si < st.strokes.length; si++) {
          const sd = DEMO_STROKES[si], dp = st.strokes[si];
          const k = KK.clamp((t - sd.t0) / (sd.t1 - sd.t0), 0, 1);
          if (k <= 0) continue;
          const target = (KK.lerp(k, KK.easeInOut(k), 0.6)) * dp.total;
          let i = 1;
          m.beginPath(); m.moveTo(dp.pts[0][0], dp.pts[0][1]);
          while (i < dp.pts.length && dp.len[i] <= target) { m.lineTo(dp.pts[i][0], dp.pts[i][1]); i++; }
          if (i < dp.pts.length) {
            const f = (target - dp.len[i - 1]) / Math.max(1e-6, dp.len[i] - dp.len[i - 1]);
            m.lineTo(dp.pts[i - 1][0] + (dp.pts[i][0] - dp.pts[i - 1][0]) * f, dp.pts[i - 1][1] + (dp.pts[i][1] - dp.pts[i - 1][1]) * f);
          }
          m.globalAlpha = 0.35; m.lineWidth = lw * 1.18; m.stroke(); // 柔邊暈
          m.globalAlpha = 1; m.lineWidth = lw; m.stroke();
        }
      }

      /* 讀遮罩：回傳 [整體抹開比例, 太陽附近抹開比例] */
      function estimate(S) {
        const m = st.M, W = m.width, H = m.height, d = st.mg.getImageData(0, 0, W, H).data;
        let s = 0;
        for (let i = 3; i < d.length; i += 4) s += d[i];
        const sx = Math.round(st.sun.x / M_DIV), sy = Math.round(st.sun.y / M_DIV), rr = Math.max(2, Math.round((st.sun.r * 1.5) / M_DIV));
        let a = 0, n = 0;
        for (let y = Math.max(0, sy - rr); y <= Math.min(H - 1, sy + rr); y++)
          for (let x = Math.max(0, sx - rr); x <= Math.min(W - 1, sx + rr); x++) { a += d[(y * W + x) * 4 + 3]; n++; }
        // 小動物所在處的抹開比例（可見度＝這個值）
        const cx = Math.round(st.crit.x / M_DIV), cy = Math.round(st.crit.y / M_DIV), cr = Math.max(2, Math.round((S.u * 0.05) / M_DIV));
        let ca = 0, cn = 0;
        for (let y = Math.max(0, cy - cr); y <= Math.min(H - 1, cy + cr); y++)
          for (let x = Math.max(0, cx - cr); x <= Math.min(W - 1, cx + cr); x++) { ca += d[(y * W + x) * 4 + 3]; cn++; }
        return [s / 255 / (W * H), n ? a / 255 / n : 0, cn ? ca / 255 / cn : 0];
      }

      /* ---------- 版面與預畫 ---------- */
      function resize(S) {
        const Cw = Math.max(2, Math.round(S.w / C_DIV)), Ch = Math.max(2, Math.round(S.h / C_DIV));
        st.C = KK.canvas(Cw, Ch); st.cg = st.C.getContext('2d');
        const Mw = Math.max(2, Math.round(S.w / M_DIV)), Mh = Math.max(2, Math.round(S.h / M_DIV));
        const oldM = st.M;
        st.M = KK.canvas(Mw, Mh); st.mg = st.M.getContext('2d');
        if (oldM && !S.autoDemo) st.mg.drawImage(oldM, 0, 0, Mw, Mh); // 轉向時保留已抹開的範圍
        st.fingers = {};
        const U = S.u / C_DIV;
        st.cu = U;
        const land = S.w > S.h;
        st.sun = { x: S.w * (land ? 0.82 : 0.77), y: S.h * (land ? 0.21 : 0.15), r: S.u * 0.075 };

        const lt = KK.mix(P.cream, P.mist, 0.25), dk = KK.mix(P.page, P.slate, 0.35), md = KK.mix(lt, dk, 0.45);   // 亮灰白帶暖：亮部燈下米＋霧藍、暗部舊書頁＋雨雲灰
        const far = buildLayer(Cw, Ch, 411, { cells: 3, aspect: 2.2, topBias: 0.3, lo: 0.38, hi: 0.62, alpha: 0.9, relief: 4.2, dark: dk, mid: md, lite: lt, base: true });       // 遠層：暗、碎
        const near = buildLayer(Cw, Ch, 977, { cells: 2, aspect: 2.0, topBias: 0.25, lo: 0.45, hi: 0.7, alpha: 0.8, relief: 4.6, dark: KK.mix(dk, lt, 0.35), mid: KK.mix(lt, P.cream, 0.3), lite: KK.mix(P.cream, P.apricot, 0.1), base: false }); // 近層：大朵、較亮
        st.rain = buildRain(Cw, Ch, U, 21, 11, 0.09);   // 毛毛雨：約 1/3 數量、更淡
        // 遠、近兩層預先合成一張，雙倍寬（每幀只用來源視窗平移）
        st.sky = KK.canvas(Cw * 2, Ch);
        { const sg = st.sky.getContext('2d'); for (let i = 0; i < 2; i++) { sg.drawImage(far, i * Cw, 0); sg.drawImage(near, i * Cw, 0); } }
        st.beams = buildBeams(S);

        st.birds = [
          { laps: 1, off: 0.0, y: 0.10, s: 1.0, f: 4 }, { laps: 1, off: 0.07, y: 0.135, s: 0.75, f: 5 }, { laps: 1, off: 0.14, y: 0.095, s: 0.85, f: 4 },
        ];
        // 閃光
        st.sparks = [[-1.9, -0.9, 2, 0.0], [1.7, -1.3, 3, 0.4], [2.3, 0.8, 2, 0.7], [-0.4, 2.1, 3, 0.2], [-2.4, 0.9, 2, 0.55]];

        st.crit = { x: S.w * (land ? 0.13 : 0.19), y: S.h * (land ? 0.93 : 0.945) - S.u * 0.02 };
        if (S.autoDemo) {
          // 預先算好「t → 抹開比例／太陽處抹開比例」的表，之後每幀只查表（決定性且不用每幀 getImageData）
          const k = Mw / S.w;
          st.strokes = DEMO_STROKES.map((s) => samplePath(s.wp, S, k));
          st.tab = [];
          for (let t = 0; t <= S.D + 1e-6; t += TAB_DT) { drawDemoMask(S, t); st.tab.push(estimate(S)); }
        }
        st.key = S.w + 'x' + S.h + (S.autoDemo ? 'd' : '');
        st.dirty = true;
      }

      function lookup(t, idx) {
        const f = t / TAB_DT, i = Math.min(st.tab.length - 2, Math.floor(f)), k = f - i;
        return KK.lerp(st.tab[i][idx], st.tab[i + 1][idx], k);
      }

      /* ---------- 手指 ---------- */
      function stamp(m, x, y) {
        m.fillStyle = '#fff';
        m.beginPath(); m.arc(x, y, st.lw / 2, 0, TAU); m.fill();
      }
      function pointer(S, ev) {
        if (S.autoDemo || !st.mg) return;
        const m = st.mg;
        const x = ev.x / M_DIV, y = ev.y / M_DIV;
        st.lw = (S.u * BRUSH) / M_DIV;
        if (ev.type === 'down') {
          st.fingers[ev.id] = { x, y };
          stamp(m, x, y);
          st.dirty = true;
        } else if (ev.type === 'move') {
          const f = st.fingers[ev.id];
          if (!f) { st.fingers[ev.id] = { x, y }; stamp(m, x, y); st.dirty = true; return; }
          m.strokeStyle = '#fff'; m.lineCap = 'round'; m.lineJoin = 'round';
          m.beginPath(); m.moveTo(f.x, f.y); m.lineTo(x, y);
          m.globalAlpha = 0.3; m.lineWidth = st.lw * 1.18; m.stroke(); // 柔邊暈
          m.globalAlpha = 1; m.lineWidth = st.lw; m.stroke();
          f.x = x; f.y = y;
          st.dirty = true;
        } else {
          delete st.fingers[ev.id];
        }
      }

      function reset() {
        if (st.mg) st.mg.clearRect(0, 0, st.M.width, st.M.height);
        st.fingers = {}; st.cleared = 0; st.vis = 0; st.sunFrac = 0; st.sunV = 0; st.critFrac = 0; st.critV = 0; st.lastEst = -9; st.dirty = false;
        inst.cleared = 0;
      }

      /* ---------- 太陽層 ---------- */
      function drawSun(g, S, vis, sa) {
        const { x, y, r } = st.sun, u = S.u, t = S.t;
        // 未抹開時：只透出一團淡淡的暖光暈（暗示那裡有太陽）
        if (sa <= 0.01) return;
        g.globalCompositeOperation = 'lighter';
        KK.drawSprite(g, KK.glow(P.apricot, 256), x, y, u * 1.5, 0.95 * sa);
        KK.drawSprite(g, KK.glow(P.cream, 256, 0.2), x, y, u * 0.5, 0.6 * sa);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = sa;
        // 光芒：長短相間，整個 loop 轉 2 格（保持長短相間對稱）→ 無縫
        const a0 = (S.phase * 2 * TAU) / RAYS + 0.1;
        g.fillStyle = KK.rgba(P.ochre, 0.92);
        for (let i = 0; i < RAYS; i++) {
          const a = a0 + (i / RAYS) * TAU;
          const long = i % 2 === 0;
          const l0 = r * 1.28, l1 = r * (long ? 2.15 : 1.7), hw = long ? 0.11 : 0.09;
          const ca = Math.cos(a), sa2 = Math.sin(a), cp = -sa2, sp = ca;
          const j = (n) => KK.jit(i * 13.7 + n, t, r * 0.035);
          g.beginPath();
          g.moveTo(x + ca * l0 + cp * l0 * hw + j(1), y + sa2 * l0 + sp * l0 * hw + j(2));
          g.lineTo(x + ca * l1 + j(3), y + sa2 * l1 + j(4));
          g.lineTo(x + ca * l0 - cp * l0 * hw + j(5), y + sa2 * l0 - sp * l0 * hw + j(6));
          g.closePath();
          g.fill();
        }
        // 核心：計程車黃，手繪邊
        g.fillStyle = P.ochre;
        KK.wobCircle(g, x, y, r, r * 0.025, 5, t, 18); g.fill();
        g.fillStyle = KK.rgba(P.cream, 0.55);
        KK.wobCircle(g, x - r * 0.15, y - r * 0.18, r * 0.62, r * 0.025, 9, t, 14); g.fill();
        g.strokeStyle = KK.rgba(P.brick, 0.55); g.lineWidth = Math.max(1.5, u * 0.004); g.lineCap = 'round';
        KK.wobCircle(g, x, y, r, r * 0.025, 5, t, 18); g.stroke();
        // 閃光（十字星，整數圈明滅）
        g.strokeStyle = KK.rgba(P.cream, 0.9);
        g.lineWidth = Math.max(1.2, u * 0.0035);
        for (const sp of st.sparks) {
          const tw = Math.pow(Math.max(0, Math.sin(S.phase * TAU * sp[2] + sp[3] * TAU)), 3);
          if (tw < 0.05) continue;
          const sx = x + sp[0] * r, sy = y + sp[1] * r, L = u * 0.014 * (0.5 + tw);
          g.globalAlpha = sa * tw * (0.5 + 0.5 * vis);
          g.beginPath(); g.moveTo(sx - L, sy); g.lineTo(sx + L, sy); g.moveTo(sx, sy - L * 1.3); g.lineTo(sx, sy + L * 1.3); g.stroke();
        }
        g.globalAlpha = 1;
      }

      /* ---------- 彩虹（低飽和，手繪抖動） ---------- */
      function drawRainbow(g, S, a) {
        if (a <= 0.01) return;
        const u = S.u, land = S.w > S.h;
        const R = (land ? 0.62 : 0.5) * Math.min(S.w, u * 1.1);
        const cx = S.w * (land ? 0.42 : 0.4), apex = S.h * (land ? 0.17 : 0.13);
        const cy = apex + R;
        const cols = [P.brick, P.apricot, P.ochre, P.moss, P.mist, KK.mix(P.night, P.mist, 0.45)];
        const bw = u * 0.0125;
        g.lineCap = 'round'; g.lineWidth = bw;
        for (let b = 0; b < cols.length; b++) {
          const rr = R - b * bw * 0.95;
          const pts = [];
          for (let i = 0; i <= 18; i++) {
            const ang = Math.PI * (1.17 + (i / 18) * 0.66);
            pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
          }
          g.strokeStyle = KK.rgba(cols[b], 0.62 * a);
          KK.smoothPath(g, pts, false, u * 0.0016, 31 + b * 11, S.t);
          g.stroke();
        }
      }

      function drawBirds(g, S, a) {
        if (a <= 0.01) return;
        const u = S.u;
        g.strokeStyle = KK.rgba(P.umber, 0.8 * a);
        g.lineWidth = Math.max(1.5, u * 0.0042); g.lineCap = 'round'; g.lineJoin = 'round';
        for (const b of st.birds) {
          const x = KK.cross(S.phase, b.laps, b.off, -u * 0.08, S.w + u * 0.08);
          const y = S.h * b.y + Math.sin(S.phase * TAU * 2 + b.off * 9) * u * 0.012;
          const s = u * 0.02 * b.s;
          const fl = Math.sin(S.phase * TAU * b.f * 3 + b.off * 20) * 0.5;
          g.beginPath();
          g.moveTo(x - s * 1.5, y - s * (0.2 + fl)); g.quadraticCurveTo(x - s * 0.6, y - s * (0.9 + fl), x, y);
          g.quadraticCurveTo(x + s * 0.6, y - s * (0.9 + fl), x + s * 1.5, y - s * (0.2 + fl));
          g.stroke();
        }
      }

      /* ---------- 烏雲層（半解析度；每幀 3 次 drawImage：雲紋、雨、遮罩） ---------- */
      function drawClouds(S, maskAlpha) {
        const g = st.cg, Cw = st.C.width, Ch = st.C.height, ph = S.phase;
        g.imageSmoothingEnabled = true;
        g.globalAlpha = 1;
        // 雲紋（遠近層已預合成、含雲底漸層）整張取代；來源視窗每 loop 平移 1 個 tile 寬
        g.globalCompositeOperation = 'copy';
        g.drawImage(st.sky, ph * Cw, 0, Cw, Ch, 0, 0, Cw, Ch);
        g.globalCompositeOperation = 'source-over';
        // 雨絲：每 loop 下落整數倍高度（視窗往上移＝內容往下）
        g.drawImage(st.rain, 0, Ch - KK.mod(ph * 5, 1) * Ch, Cw, Ch, 0, 0, Cw, Ch);
        // 手指抹過處挖空（M 放大，雙線性取樣讓邊緣自然變柔）
        g.globalCompositeOperation = 'destination-out';
        g.globalAlpha = maskAlpha;
        g.drawImage(st.M, 0, 0, Cw, Ch);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }

      const inst = {
        cleared: 0,
        resize,
        pointer,
        reset,
        draw(g, S) {
          if (!st.C || st.key !== S.w + 'x' + S.h + (S.autoDemo ? 'd' : '')) resize(S);
          const t = S.t, u = S.u;
          let fade = 1;
          // 1. 遮罩與抹開比例
          if (S.autoDemo) {
            drawDemoMask(S, t);
            fade = 1 - KK.smooth(12.5, 14, t);
            st.cleared = lookup(t, 0) * fade;
            st.vis = st.cleared;
            st.sunV = lookup(t, 1) * fade;
            st.critV = lookup(t, 2) * fade;
          } else {
            if (S.now - st.lastEst >= 0.5 && st.dirty) {
              const e = estimate(S); st.cleared = e[0]; st.sunFrac = e[1]; st.critFrac = e[2]; st.lastEst = S.now; st.dirty = false;
            }
            const dt = Math.min(0.25, Math.max(0, S.now - st.lastNow));
            const k = 1 - Math.exp(-dt * 4);
            st.vis += (st.cleared - st.vis) * k;
            st.sunV += (st.sunFrac - st.sunV) * k;
            st.critV += (st.critFrac - st.critV) * k;
            st.lastNow = S.now;
          }
          inst.cleared = st.cleared;
          const vis = KK.clamp(st.vis * 1.15, 0, 1);
          const sa = KK.smooth(0.03, 0.4, st.sunV); // 太陽整顆顯現的程度：看太陽處被抹開多少

          // 2. 陽光層（雲下方）：暖色 screen 光＋放射光束，只在抹開處看得到
          g.save();
          const warm = 0.1 + 0.26 * KK.smooth(0.0, 0.12, st.vis);   // 暖光罩（source-over 比 screen 便宜很多）
          g.fillStyle = KK.rgba(KK.mix(P.cream, P.apricot, 0.5), warm);
          g.fillRect(0, 0, S.w, S.h);
          g.globalCompositeOperation = 'lighter';
          if (st.vis > 0.005) {
            const bs = u * 1.5, sway = 1 + Math.sin(S.phase * TAU) * 0.05;
            g.globalAlpha = (0.32 + 0.1 * Math.sin(S.phase * TAU * 2)) * KK.smooth(0, 0.1, st.vis);
            g.drawImage(st.beams, st.sun.x - bs * sway / 2, st.sun.y - bs * sway / 2, bs * sway, bs * sway);
            g.globalAlpha = 1;
          }
          g.globalCompositeOperation = 'source-over';
          drawRainbow(g, S, KK.smooth(0.3, 0.55, st.vis));
          drawSun(g, S, vis, sa);
          drawBirds(g, S, KK.smooth(0.5, 0.62, st.vis));

          // 3. 小動物：藏在左下烏雲底下，低對比、無光暈
          const ca = KK.smooth(0.25, 0.7, st.critV); // 可見度＝牠所在處被抹開的程度，未抹開完全看不到
          if (S.critter && ca > 0.01) {
            const land = S.w > S.h;
            const cx = S.w * (land ? 0.13 : 0.19), cy = S.h * (land ? 0.93 : 0.945);
            g.globalAlpha = ca * 0.55;
            KK.Critter.draw(g, cx, cy, u * 0.03, { pose: 'lookup', facing: 1, color: KK.mix(P.umber, P.brick, 0.3), t, eyeColor: KK.mix(P.umber, P.apricot, 0.5) });
          }
          g.restore();

          // 4. 烏雲層：C 畫好後整張疊上（全畫面合成 1 次）
          drawClouds(S, fade);
          g.save();
          g.imageSmoothingEnabled = true;
          g.globalAlpha = CLOUD_ALPHA;
          g.drawImage(st.C, 0, 0, S.w, S.h);
          g.restore();

          // 穿過雲層透出來的一團暖光（暗示太陽在那裡）
          g.save();
          g.globalCompositeOperation = 'lighter';
          KK.drawSprite(g, KK.glow(P.apricot, 256), st.sun.x, st.sun.y, u * 1.0, 0.3 * (1 - sa * 0.6));
          g.restore();

          KK.paper(g, S, { grain: 0.4, vignette: 0.4 });
        },
      };
      return inst;
    },
  });
})();
