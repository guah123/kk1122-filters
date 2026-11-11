/* 3〈大人中〉流星：上半部疊一層淡淡夜空，星星眨眼，一段「零星 → 期待 → 流星雨 → 餘韻」的流星節奏（右上→左下）；
 * 下緣是台灣老公寓頂樓剪影（女兒牆、水塔、晾衣架、天線），小動物（Kai 牽著小袋熊）站在頂樓邊緣抬頭許願。
 * 手指一劃放一顆流星，消失處閃一下小星光（手指流星不受中央限制）。
 *
 * 分鏡（loop 12 秒，流星只由 S.t 決定 → 無縫）：
 *   0.7 / 2.4 / 4.2s   零星：三顆一般流星（期待）
 *   5.6–7.2s           流星雨高潮：6.0 / 6.25 / 6.5s 三顆大流星幾乎同時、略錯開（頭大、尾長尾亮），約 1–1.5s 內劃過
 *   9.4 / 10.7s        餘韻：兩顆小流星
 *
 * 避開中央規則（排程流星一律適用）：
 *   禁區 = 畫面中央 50% 寬 × 中間 45% 高 的矩形（x 25%–75%、y 27.5%–72.5%），外擴 0.03×S.u 緩衝。
 *   每幀用「射線—矩形」求流星路徑進入禁區的距離，行程自動截斷在入口前（流星在進入中央前就熄滅）；
 *   橫式另有 land 欄位換起點，讓流星走左上/右上角落或上緣，不致被截太短。
 *   大流星火花若落入禁區就不畫。
 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  // 流星共同方向：往左下（斜率約 0.48）
  const DIR_X = -0.9, DIR_Y = 0.436;

  // 排程流星：t0 起點時間、dur 秒數、(fx,fy) 起點佔畫面寬高比例、len 行程（以短邊為單位）、tail 尾長、wid 尾粗、hs 頭部光點倍率
  // land：橫式時覆寫 fx/fy/len（橫式中央禁區較寬，改從角落走）；big：流星雨主角
  const SHOWERS = [
    // 零星
    { t0: 0.7, dur: 1.0, fx: 0.96, fy: 0.07, len: 0.6, tail: 0.28, wid: 0.0075, hs: 1.2, land: { fx: 0.94, fy: 0.05, len: 0.5 } },
    { t0: 2.4, dur: 1.1, fx: 0.5, fy: 0.04, len: 0.62, tail: 0.3, wid: 0.0078, hs: 1.25, land: { fx: 0.3, fy: 0.1, len: 0.5 } },
    { t0: 4.2, dur: 0.95, fx: 0.9, fy: 0.15, len: 0.55, tail: 0.28, wid: 0.007, hs: 1.15, land: { fx: 0.97, fy: 0.12, len: 0.5 } },
    // 流星雨（高潮）：三顆平行錯開
    { t0: 6.0, dur: 1.2, fx: 0.98, fy: 0.03, len: 0.95, tail: 0.8, wid: 0.019, hs: 2.7, big: true, land: { fx: 0.97, fy: 0.04, len: 0.8 } },
    { t0: 6.25, dur: 1.15, fx: 0.62, fy: 0.012, len: 0.85, tail: 0.66, wid: 0.016, hs: 2.3, land: { fx: 0.22, fy: 0.07, len: 0.6 } },
    { t0: 6.5, dur: 1.05, fx: 0.8, fy: 0.1, len: 0.75, tail: 0.55, wid: 0.0135, hs: 2.0, land: { fx: 0.97, fy: 0.2, len: 0.7 } },
    // 餘韻
    { t0: 9.4, dur: 1.0, fx: 0.7, fy: 0.03, len: 0.55, tail: 0.26, wid: 0.007, hs: 1.15, land: { fx: 0.09, fy: 0.02, len: 0.4 } },
    { t0: 10.7, dur: 0.95, fx: 0.4, fy: 0.07, len: 0.5, tail: 0.22, wid: 0.0065, hs: 1.05, land: { fx: 0.18, fy: 0.15, len: 0.4 } },
  ];

  // 中央禁區（矩形 50% × 45%，外擴 0.03u）；回傳 {x0,y0,L}，L 已截斷在進入禁區之前
  function showerGeom(m, S) {
    const w = S.w, h = S.h, u = S.u;
    const p = h >= w || !m.land ? m : m.land;
    const x0 = p.fx * w, y0 = p.fy * h;
    let L = p.len * u;
    const pad = u * 0.03;
    const ax = w * 0.25 - pad, bx = w * 0.75 + pad, ay = h * 0.275 - pad, by = h * 0.725 + pad;
    // slab 法：射線 (x0,y0)+d*(DIR) 與矩形的進入距離
    let tn = -1e9, tf = 1e9;
    const sl = (o, dv, lo, hi) => {
      if (Math.abs(dv) < 1e-9) { if (o < lo || o > hi) tf = -1e9; return; }
      let t1 = (lo - o) / dv, t2 = (hi - o) / dv;
      if (t1 > t2) { const q = t1; t1 = t2; t2 = q; }
      tn = Math.max(tn, t1); tf = Math.min(tf, t2);
    };
    sl(x0, DIR_X, ax, bx); sl(y0, DIR_Y, ay, by);
    if (tn < tf && tf > 0) L = Math.min(L, Math.max(tn, 0));
    return { x0, y0, L };
  }
  function inCenter(x, y, S) {
    const pad = S.u * 0.03;
    return x > S.w * 0.25 - pad && x < S.w * 0.75 + pad && y > S.h * 0.275 - pad && y < S.h * 0.725 + pad;
  }
  const TAIL_N = 14;
  const TAIL_COL = [];
  for (let i = 0; i < TAIL_N; i++) TAIL_COL.push(KK.mix(P.cream, P.apricot, (i / TAIL_N) * 0.7));

  KK.defineFilter({
    id: 'otona',
    no: 3,
    song: '大人中',
    title: '流星',
    mood: '長大・許願・夜裡的勇氣',
    duration: 12,
    hint: '用手指在畫面上一劃，放一顆流星',
    critterHint: '頂樓女兒牆後（畫面中偏右），Kai 牽著小袋熊抬頭看天，流星雨時揮手',
    create() {
      const st = { sky: null, roof: [], rh: 0, par: 0, stars: [], w: 0, h: 0, u: 0, meteors: [], downs: {} };

      /* ---------- 夜空：漸層＋銀河帶＋細碎星塵，預畫成一張 ---------- */
      function buildSky(S) {
        const { w, h, u } = S;
        const c = KK.canvas(w, h * 0.52);
        const g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 0, h * 0.5);
        const lo = KK.mix(P.night, P.slate, 0.4);
        gr.addColorStop(0, KK.rgba(P.night, 0.6));
        gr.addColorStop(0.35, KK.rgba(P.night, 0.42));
        gr.addColorStop(0.72, KK.rgba(lo, 0.13));
        gr.addColorStop(1, KK.rgba(lo, 0));
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h * 0.52);
        // 淡淡的銀河帶，與流星同一個方向
        g.save();
        g.translate(w * 0.6, h * 0.17);
        g.rotate(Math.atan2(DIR_Y, DIR_X) + Math.PI);
        const bw = u * 0.42;
        const bg = g.createLinearGradient(0, -bw / 2, 0, bw / 2);
        bg.addColorStop(0, KK.rgba(P.mist, 0));
        bg.addColorStop(0.5, KK.rgba(P.mist, 0.1));
        bg.addColorStop(1, KK.rgba(P.mist, 0));
        g.fillStyle = bg;
        g.fillRect(-Math.hypot(w, h), -bw / 2, Math.hypot(w, h) * 2, bw);
        g.restore();
        // 星塵：細小不閃的點
        const r = KK.rng(303);
        for (let i = 0; i < 90; i++) {
          const x = r() * w, y = h * 0.48 * Math.pow(r(), 1.3);
          const fade = 1 - KK.smooth(h * 0.22, h * 0.46, y);
          g.fillStyle = KK.rgba(P.page, (0.18 + r() * 0.3) * fade);
          const s = u * (0.0014 + r() * 0.0018);
          g.fillRect(x, y, s, s);
        }
        return c;
      }

      /* ---------- 會眨眼的星星（位置固定、由種子決定） ---------- */
      function buildStars(S) {
        const { w, h, u } = S;
        const r = KK.rng(1127);
        const arr = [];
        // 多數是小而銳利的亮點；少數手繪四芒星；極少數中等光暈
        const kinds = [];
        for (let i = 0; i < 28; i++) kinds.push('dot');
        for (let i = 0; i < 5; i++) kinds.push('four');
        for (let i = 0; i < 2; i++) kinds.push('halo');
        kinds.forEach((kind, i) => {
          // 集中在上方 45%，越往下越稀疏
          const y = h * (0.02 + 0.43 * Math.pow(r(), 1.5));
          const x = (0.03 + 0.94 * r()) * w;
          arr.push({
            x, y, kind,
            s: kind === 'dot' ? u * (0.0022 + Math.pow(r(), 1.5) * 0.0028)
              : kind === 'four' ? u * (0.014 + r() * 0.01) : u * (0.03 + r() * 0.012),
            n: 1 + Math.floor(r() * 4),          // 12 秒內眨幾圈（整數）
            ph: r() * TAU,
            warm: r() < 0.5,
            tilt: (r() - 0.5) * 0.4,
            seed: 40 + i * 3,
            vis: 1 - 0.85 * KK.smooth(h * 0.16, h * 0.46, y),
          });
        });
        return arr;
      }

      /* ---------- 頂樓剪影（三組手抖各畫一張） ---------- */
      function buildRoof(S) {
        const { w, h, u } = S;
        const portrait = h >= w;
        st.rh = Math.ceil(u * (portrait ? 0.155 : 0.125));
        st.U = st.rh / 0.155;                 // 剪影的「虛擬單位」，橫式整體縮小
        st.par = st.U * 0.036;
        st.pitch = st.U * 0.22;
        st.critX = (Math.floor((w * 0.57) / st.pitch) + 0.5) * st.pitch;   // 小動物坐在兩根柱子的正中間
        st.roof = [0, 1, 2].map((v) => {
          const c = KK.canvas(w, st.rh);
          drawRoof(c.getContext('2d'), S, (v + 0.5) / KK.BOIL_FPS);
          return c;
        });
      }

      function drawRoof(g, S, t) {
        const w = S.w, U = st.U, rh = st.rh, par = st.par, pitch = st.pitch;
        const col = KK.rgba(KK.mix(P.night, P.umber, 0.35), 0.94);
        const light = KK.rgba(KK.mix(P.night, P.slate, 0.4), 0.88);
        const leaf = KK.rgba(KK.mix(P.night, P.moss, 0.38), 0.92);
        const Y = (y) => rh - y;
        const a = U * 0.0012;
        const floor = par * 0.5;              // 頂樓地面（被女兒牆擋住的那一條）
        const top = Y(par);
        g.fillStyle = col;
        g.strokeStyle = col;
        g.lineCap = 'round';

        // 水塔：三腳架＋圓桶＋尖蓋
        {
          const cx = w * 0.13, tw = U * 0.072, th = U * 0.05, legH = U * 0.036;
          const fy = Y(floor), by = Y(floor + legH);
          g.lineWidth = U * 0.004;
          g.beginPath();
          g.moveTo(cx - tw * 0.42, fy); g.lineTo(cx - tw * 0.36, by);
          g.moveTo(cx + tw * 0.42, fy); g.lineTo(cx + tw * 0.36, by);
          g.moveTo(cx - tw * 0.4, fy - legH * 0.15); g.lineTo(cx + tw * 0.36, by + legH * 0.1);
          g.moveTo(cx + tw * 0.4, fy - legH * 0.15); g.lineTo(cx - tw * 0.36, by + legH * 0.1);
          g.stroke();
          KK.wobPath(g, [[cx - tw / 2, by], [cx - tw / 2, by - th], [cx - tw * 0.1, by - th - U * 0.014],
            [cx + tw * 0.1, by - th - U * 0.014], [cx + tw / 2, by - th], [cx + tw / 2, by]], true, a, 21, t);
          g.fill();
          g.strokeStyle = KK.rgba(P.page, 0.16);
          g.lineWidth = U * 0.002;
          g.beginPath();
          g.moveTo(cx - tw / 2, by - th * 0.35); g.lineTo(cx + tw / 2, by - th * 0.35);
          g.moveTo(cx - tw / 2, by - th * 0.7); g.lineTo(cx + tw / 2, by - th * 0.7);
          g.stroke();
          g.strokeStyle = col;
        }

        // 盆栽：兩盆（一大一小），葉子用苔綠混夜墨藍
        [[0.235, 1], [0.275, 0.7]].forEach((pp, i) => {
          const px = w * pp[0], sc = pp[1], fy = Y(floor);
          g.fillStyle = col;
          KK.wobPath(g, [[px - U * 0.016 * sc, fy - U * 0.022 * sc], [px + U * 0.016 * sc, fy - U * 0.022 * sc], [px + U * 0.011 * sc, fy], [px - U * 0.011 * sc, fy]], true, a, 61 + i * 4, t);
          g.fill();
          g.fillStyle = leaf;
          [[-0.012, -0.045, -0.5], [0.012, -0.05, 0.5], [0, -0.058, 0]].forEach((l, j) => {
            g.beginPath();
            g.ellipse(px + l[0] * U * sc, fy - U * 0.022 * sc + l[1] * U * sc, U * 0.007 * sc, U * 0.02 * sc, l[2], 0, TAU);
            g.fill();
          });
          g.fillStyle = col;
        });

        // 晾衣架：兩根柱子、一根橫桿、三件衣服
        {
          const cx = w * 0.37, rw = U * 0.2, ph = U * 0.075;
          const fy = Y(floor);
          g.lineWidth = U * 0.0034;
          g.beginPath();
          g.moveTo(cx - rw / 2, fy); g.lineTo(cx - rw / 2, fy - ph);
          g.moveTo(cx + rw / 2, fy); g.lineTo(cx + rw / 2, fy - ph);
          g.moveTo(cx - rw / 2 - U * 0.01, fy - ph); g.lineTo(cx + rw / 2 + U * 0.01, fy - ph);
          g.stroke();
          g.fillStyle = light;
          const cl = [[-0.3, 0.042, 0.04], [0.0, 0.034, 0.058], [0.28, 0.04, 0.046]];
          cl.forEach((c, i) => {
            const x = cx + c[0] * rw, ww = U * c[1], hh = U * c[2], yy = fy - ph;
            KK.wobPath(g, [[x - ww / 2, yy], [x + ww / 2, yy], [x + ww / 2 + U * 0.002, yy + hh], [x - ww / 2, yy + hh * 0.92]], true, a, 31 + i * 5, t);
            g.fill();
          });
          g.fillStyle = col;
        }

        // 小椅子（塑膠矮凳加椅背）
        {
          const cx = w * 0.68, fy = Y(floor), sw = U * 0.04, seatH = U * 0.032;
          g.lineWidth = U * 0.0042;
          g.beginPath();
          g.moveTo(cx - sw / 2, fy); g.lineTo(cx - sw / 2, fy - seatH);
          g.moveTo(cx + sw / 2, fy); g.lineTo(cx + sw / 2, fy - seatH);
          g.moveTo(cx - sw / 2, fy - seatH); g.lineTo(cx - sw / 2, fy - seatH - U * 0.036);
          g.stroke();
          KK.wobPath(g, [[cx - sw / 2 - U * 0.004, fy - seatH], [cx + sw / 2 + U * 0.004, fy - seatH], [cx + sw / 2 + U * 0.004, fy - seatH - U * 0.007], [cx - sw / 2 - U * 0.004, fy - seatH - U * 0.007]], true, a, 71, t);
          g.fill();
          KK.wobPath(g, [[cx - sw / 2 - U * 0.005, fy - seatH - U * 0.012], [cx - sw / 2 + U * 0.006, fy - seatH - U * 0.012], [cx - sw / 2 + U * 0.006, fy - seatH - U * 0.04], [cx - sw / 2 - U * 0.005, fy - seatH - U * 0.04]], true, a, 73, t);
          g.fill();
        }

        // 樓梯間加蓋（鐵皮屋）＋亮著的小門窗＋天線
        {
          const sw = U * 0.24, sx = w * 0.82 - sw / 2, sh = U * 0.085;
          const roofY = Y(floor + sh);
          KK.wobPath(g, [[sx, Y(floor) + 2], [sx, roofY], [sx + sw, roofY], [sx + sw, Y(floor) + 2]], true, a, 41, t);
          g.fill();
          KK.wobPath(g, [[sx - U * 0.014, roofY], [sx - U * 0.014, roofY - U * 0.007], [sx + sw + U * 0.014, roofY - U * 0.007], [sx + sw + U * 0.014, roofY]], true, a, 43, t);
          g.fill();
          g.fillStyle = KK.rgba(P.apricot, 0.62);
          g.fillRect(sx + sw * 0.16, Y(floor + U * 0.052), U * 0.03, U * 0.052);
          g.fillStyle = KK.rgba(P.page, 0.3);
          g.fillRect(sx + sw * 0.62, Y(floor + U * 0.058), U * 0.026, U * 0.02);
          g.fillStyle = col;
          const ax = sx + sw * 0.72, pole = U * 0.045, base = roofY - U * 0.007;
          g.lineWidth = U * 0.003;
          g.beginPath();
          g.moveTo(ax, base); g.lineTo(ax, base - pole);
          [[0.52, 0.03], [0.72, 0.024], [0.92, 0.017]].forEach((b) => {
            g.moveTo(ax - U * b[1], base - pole * b[0]); g.lineTo(ax + U * b[1], base - pole * b[0]);
          });
          g.stroke();
        }

        // 女兒牆：連續一條，每隔一段有柱子；單數段上方加鐵欄杆細線
        g.fillStyle = col;
        const wp = [[-10, rh + 4], [-10, top]];
        for (let k = 0; k * pitch < w + pitch; k++) {
          const x = k * pitch, pil = U * (0.012 + 0.003 * (k % 2));
          wp.push([x, top], [x, top - pil], [x + U * 0.018, top - pil], [x + U * 0.018, top]);
        }
        wp.push([w + 10, top], [w + 10, rh + 4]);
        KK.wobPath(g, wp, true, a, 11, t);
        g.fill();
        // 牆帽：略比牆寬的一條薄板
        g.fillRect(-10, top - U * 0.004, w + 20, U * 0.006);
        g.strokeStyle = col;
        g.lineWidth = U * 0.0022;
        const critSeg = Math.floor(st.critX / pitch);
        for (let k = 0; k * pitch < w + pitch; k++) {
          if (k % 2 !== 1 || k === critSeg) continue;
          const x0 = k * pitch + U * 0.018, x1 = (k + 1) * pitch, rt = top - U * 0.034;
          g.beginPath();
          g.moveTo(x0, rt); g.lineTo(x1, rt);
          for (let x = x0 + U * 0.006; x < x1; x += U * 0.016) { g.moveTo(x, top); g.lineTo(x, rt); }
          g.stroke();
        }
      }

      /* ---------- 流星本體：頭部亮點＋由粗到細、由亮到透明的多段尾巴 ---------- */
      function drawMeteor(g, u, x0, y0, dx, dy, L, Lt, k, wid, hs, al) {
        const env = KK.smooth(0, 0.12, k) * (1 - KK.smooth(0.72, 1, k)) * al;
        if (env <= 0.004) return;
        const d = L * k;
        const hx = x0 + dx * d, hy = y0 + dy * d;
        const tl = Math.min(Lt * (1 - 0.45 * KK.smooth(0.7, 1, k)), d);
        g.lineCap = 'butt';
        for (let i = 0; i < TAIL_N; i++) {
          const f = i / TAIL_N;
          const s0 = (tl * i) / TAIL_N, s1 = (tl * (i + 1)) / TAIL_N;
          g.globalAlpha = env * Math.pow(1 - f, 1.35) * 0.92;
          g.strokeStyle = TAIL_COL[i];
          const lw = Math.max(wid * (1 - f * 0.92), 0.7);
          g.beginPath();
          g.moveTo(hx - dx * s0, hy - dy * s0);
          g.lineTo(hx - dx * s1, hy - dy * s1);
          // 先畫一層寬而淡的暈，再畫亮的細芯（不用 shadowBlur）
          g.lineWidth = lw * 3;
          g.globalAlpha *= 0.28;
          g.stroke();
          g.globalAlpha = env * Math.pow(1 - f, 1.35) * 0.95;
          g.lineWidth = lw;
          g.stroke();
        }
        g.globalAlpha = 1;
        KK.drawSprite(g, KK.glow(P.cream, 64), hx, hy, u * 0.055 * hs, 0.85 * env);
        KK.drawSprite(g, KK.glow(P.cream, 32, 0.9), hx, hy, u * 0.02 * hs, env);
      }

      /* 手繪四芒星 */
      function star4(g, cx, cy, R, seed, t, tilt) {
        const pts = [];
        const r = R * 0.27;
        for (let i = 0; i < 8; i++) {
          const ang = tilt + (i * Math.PI) / 4;
          const rr = i % 2 === 0 ? R : r;
          pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
        }
        KK.wobPath(g, pts, true, R * 0.05, seed, t);
        g.fill();
      }

      return {
        resize(S) {
          st.w = S.w; st.h = S.h; st.u = S.u;
          st.sky = buildSky(S);
          st.stars = buildStars(S);
          buildRoof(S);
          st.meteors = []; st.downs = {};
        },
        reset() { st.meteors = []; st.downs = {}; },

        pointer(S, ev) {
          const u = st.u;
          if (ev.type === 'down') {
            st.downs[ev.id] = { x: ev.x, y: ev.y };
            return;
          }
          if (ev.type !== 'up') return;
          const d0 = st.downs[ev.id] || { x: ev.x, y: ev.y };
          delete st.downs[ev.id];
          let vx = ev.x - d0.x, vy = ev.y - d0.y;
          const dist = Math.hypot(vx, vy);
          let sx = d0.x, sy = d0.y, dx, dy, L;
          if (dist < u * 0.04) {
            // 只是點一下：從點擊處往預設方向射出
            dx = DIR_X; dy = DIR_Y; L = u * 0.5;
          } else {
            dx = vx / dist; dy = vy / dist; L = u * 0.6;
            // 終點夾在畫面內，許願的星光才看得到
            const ex = KK.clamp(sx + dx * L, st.w * 0.04, st.w * 0.96);
            const ey = KK.clamp(sy + dy * L, st.h * 0.04, st.h * 0.96);
            const ll = Math.hypot(ex - sx, ey - sy);
            if (ll > u * 0.18) { dx = (ex - sx) / ll; dy = (ey - sy) / ll; L = ll; }
          }
          st.meteors.push({ x: sx, y: sy, dx, dy, L, born: S.now });
          if (st.meteors.length > 6) st.meteors.shift();
        },

        draw(g, S) {
          const t = S.t, ph = S.phase, u = S.u, w = S.w, h = S.h;
          const bi = KK.boil(t);

          // 1) 夜空
          g.drawImage(st.sky, 0, 0);

          // 2) 星星
          for (let i = 0; i < st.stars.length; i++) {
            const s = st.stars[i];
            const tw = 0.55 + 0.45 * Math.sin(ph * TAU * s.n + s.ph);
            const al = s.vis * tw;
            if (al < 0.02) continue;
            if (s.kind === 'four') {
              KK.drawSprite(g, KK.glow(P.page, 64), s.x, s.y, s.s * 2.6, 0.22 * al);
              g.fillStyle = KK.rgba(s.warm ? P.cream : P.page, 0.95 * Math.min(1, al + 0.15));
              star4(g, s.x, s.y, s.s * (0.78 + 0.22 * tw), s.seed, t, s.tilt);
            } else if (s.kind === 'halo') {
              KK.drawSprite(g, KK.glow(s.warm ? P.cream : P.page, 64), s.x, s.y, s.s * (0.85 + 0.25 * tw), 0.6 * al);
              g.fillStyle = KK.rgba(P.cream, 0.95 * al);
              g.beginPath(); g.arc(s.x, s.y, u * 0.0034, 0, TAU); g.fill();
            } else {
              g.fillStyle = KK.rgba(s.warm ? P.cream : P.page, Math.min(1, 0.95 * al + 0.1 * s.vis));
              g.beginPath(); g.arc(s.x, s.y, s.s, 0, TAU); g.fill();
            }
          }

          // 3) 排程流星雨（只看 S.t）
          for (let i = 0; i < SHOWERS.length; i++) {
            const m = SHOWERS[i];
            const k = (t - m.t0) / m.dur;
            const gm = showerGeom(m, S);
            if (k > 0 && k < 1) {
              drawMeteor(g, u, gm.x0, gm.y0, DIR_X, DIR_Y, gm.L, m.tail * u, k, m.wid * u, m.hs, 1);
            }
            // 大流星尾端灑下的小火花
            if (m.big) {
              const NSP = 9;
              for (let j = 0; j < NSP; j++) {
                const te = m.t0 + m.dur * (0.4 + 0.56 * (j / (NSP - 1)));
                const age = t - te;
                const life = 1.4 + KK.hash(j, 5) * 0.8;
                if (age <= 0 || age >= life) continue;
                const kk = (te - m.t0) / m.dur;
                const px = gm.x0 + DIR_X * gm.L * kk;
                const py = gm.y0 + DIR_Y * gm.L * kk;
                const sp = u * (0.03 + KK.hash(j, 9) * 0.05);
                const side = (KK.hash(j, 2) - 0.5) * 2;
                const vx = DIR_X * sp * 0.4 + -DIR_Y * side * sp * 0.6;
                const vy = DIR_Y * sp * 0.4 + DIR_X * side * sp * 0.6 * -1;
                const dr = (1 - Math.exp(-2.2 * age)) / 2.2;
                const x = px + vx * dr * 3;
                const y = py + vy * dr * 3 + 0.5 * u * 0.09 * age * age;
                if (inCenter(x, y, S)) continue;   // 火花不落入中央禁區
                const f = age / life;
                const flick = 0.65 + 0.35 * Math.sin(age * 17 + j * 2);
                const a = (1 - KK.smooth(0.45, 1, f)) * flick * KK.smooth(0, 0.06, age);
                const col = j % 2 ? P.cream : P.apricot;
                KK.drawSprite(g, KK.glow(col, 32, 0.7), x, y, u * (0.016 + KK.hash(j, 7) * 0.012) * (1 - f * 0.4), a);
              }
            }
          }

          // 4) 手指放出的流星＋消失處的小星光
          if (st.meteors.length) {
            const keep = [];
            for (let i = 0; i < st.meteors.length; i++) {
              const m = st.meteors[i];
              const age = S.now - m.born;
              if (age < 0 || age > 1.9) continue;
              keep.push(m);
              const dur = 1.0;
              const k = age / dur;
              if (k < 1) drawMeteor(g, u, m.x, m.y, m.dx, m.dy, m.L, u * 0.3, k, u * 0.0055, 1.15, 1);
              // 許願成功：終點閃一下
              const fa = age - dur * 0.92;
              if (fa > 0 && fa < 0.85) {
                const ex = m.x + m.dx * m.L, ey = m.y + m.dy * m.L;
                const q = fa / 0.85;
                const pulse = Math.sin(q * Math.PI);
                KK.drawSprite(g, KK.glow(P.cream, 64), ex, ey, u * 0.12 * (0.6 + 0.5 * pulse), 0.55 * pulse);
                g.fillStyle = KK.rgba(P.cream, 0.95 * pulse);
                star4(g, ex, ey, u * 0.04 * (0.4 + 0.8 * pulse), 90 + i, t, q * 0.8);
                // 兩顆更小的陪襯星
                g.fillStyle = KK.rgba(P.page, 0.8 * pulse);
                star4(g, ex + u * 0.035, ey - u * 0.025, u * 0.014 * pulse, 95 + i, t, 0.3);
                star4(g, ex - u * 0.03, ey + u * 0.03, u * 0.01 * pulse, 99 + i, t, 0.2);
              }
            }
            st.meteors = keep;
          }

          // 5) 抬頭看天的小動物（Kai 牽著小袋熊）：站在頂樓女兒牆後，先畫、再蓋上頂樓剪影（下半身被牆擋住）；流星雨時（5.8–7.4s）開心揮手、小跳
          if (S.critter) {
            const cs = u * 0.05;
            const cheer = KK.smooth(5.7, 6.0, t) * (1 - KK.smooth(7.1, 7.5, t));
            const hop = cheer * Math.abs(Math.sin(t * TAU * 1.5)) * cs * 0.08;
            KK.Critter.draw(g, st.critX, h - st.par + cs * 0.3 - hop, cs, { pose: cheer > 0.5 ? 'wave' : 'lookup', facing: 1, alpha: 0.85, tone: 0.5, t });
          }
          g.drawImage(st.roof[bi], 0, h - st.rh);

          KK.paper(g, S, { grain: 0.4, vignette: 0.5 });
        },
      };
    },
  });
})();
