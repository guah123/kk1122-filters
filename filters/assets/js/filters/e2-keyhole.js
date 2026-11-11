/* E2〈窺孔〉安可彩蛋：整個畫面幾乎暗下來，只剩一個柔邊小窗（像透過捲起來的書頁／紙筒看出去）。
 * 暗處散落著淡淡的細線畫（計程車、冒煙的小房子、流星、太陽）回扣前面的濾鏡，各自緩慢閃爍。
 * 小窗沒人碰時沿 Lissajous 路徑自動遊走（途中會經過角落的小動物一次）；手指拖曳時小窗跟著走，
 * 放開 3 秒後平滑回到自動路徑。
 *
 * 分鏡（D = 12 秒，整個 loop 都在遊走）
 *  0–4   小窗從中間慢慢畫 8 字往右上、右下，經過太陽與小房子
 *  4–6   往左上掃過計程車與流星
 *  7–9.5 繞到左下角，停在小動物身上（小窗裡才看得到牠）
 *  9.5–12 離開角落，回到中央，接回 t=0
 *
 * 合成次數：暗層 1 次 drawImage（半解析度離屏）＋ KK.paper 2 次 ＝ 3 次全畫面。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  KK.defineFilter({
    id: 'keyhole',
    no: 'E2',
    song: '',
    title: '看看・窺孔',
    mood: '好奇・私密・我看見你了',
    duration: 12,
    hint: '用手指移動那個小窗，看看裡面',
    critterHint: '左下角一小疊書旁，只有小窗經過那裡才看得到（暗層下幾乎隱形）',
    create() {
      const st = {
        layer: null, lg: null, hole: null, ring: [], draws: [], books: null,
        R: 100, crit: { x: 0, y: 0, size: 10 },
        // 互動狀態
        fingers: new Map(), hand: { x: 0, y: 0 }, pos: { x: 0, y: 0 }, m: 0, rel: -99, last: null,
      };

      /* ---------- 細線畫（局部座標約 -0.5..0.5，stroke 用，之後預畫成 sprite） ---------- */
      function poly(g, pts, closed, seed, t) { KK.wobPath(g, pts, closed, 0.006, seed, t); g.stroke(); }
      function circ(g, x, y, r, seed, t) { KK.wobCircle(g, x, y, r, 0.004, seed, t, 12); g.stroke(); }
      function star5(g, x, y, r, seed, t) {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
          pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
        }
        poly(g, pts, true, seed, t);
      }
      const DRAW = {
        taxi(g, t) {
          poly(g, [[-0.5, 0.08], [-0.5, -0.02], [-0.3, -0.06], [-0.2, -0.2], [0.15, -0.2], [0.28, -0.06], [0.5, -0.02], [0.5, 0.08]], true, 1, t);
          poly(g, [[-0.17, -0.06], [-0.1, -0.16], [0.12, -0.16], [0.19, -0.06]], true, 20, t);
          poly(g, [[-0.05, -0.2], [-0.05, -0.27], [0.06, -0.27], [0.06, -0.2]], false, 30, t);
          circ(g, -0.28, 0.09, 0.07, 40, t);
          circ(g, 0.28, 0.09, 0.07, 50, t);
          poly(g, [[-0.5, 0.0], [0.5, 0.0]], false, 60, t); // 腰線
        },
        house(g, t) {
          poly(g, [[-0.22, 0.2], [-0.22, -0.02], [0, -0.22], [0.22, -0.02], [0.22, 0.2]], true, 3, t);
          poly(g, [[0.1, -0.12], [0.1, -0.28], [0.17, -0.28], [0.17, -0.07]], false, 8, t);
          poly(g, [[-0.05, 0.2], [-0.05, 0.07], [0.05, 0.07], [0.05, 0.2]], false, 12, t);
          poly(g, [[-0.15, 0.0], [-0.15, 0.08], [-0.08, 0.08], [-0.08, 0.0]], true, 15, t);
          // 炊煙
          KK.smoothPath(g, [[0.135, -0.3], [0.2, -0.38], [0.09, -0.45], [0.2, -0.53], [0.12, -0.62]], false, 0.005, 70, t); g.stroke();
          circ(g, 0.2, -0.7, 0.03, 71, t);
        },
        meteor(g, t) {
          star5(g, 0.3, -0.12, 0.08, 5, t);
          poly(g, [[0.23, -0.09], [-0.5, 0.24]], false, 6, t);
          poly(g, [[0.19, -0.14], [-0.28, -0.02]], false, 7, t);
          poly(g, [[0.27, -0.04], [-0.1, 0.2]], false, 8, t);
          circ(g, -0.38, -0.12, 0.012, 9, t);
          circ(g, -0.12, -0.25, 0.012, 10, t);
        },
        sun(g, t) {
          circ(g, 0, 0, 0.13, 2, t);
          for (let i = 0; i < 10; i++) {
            const a = i * TAU / 10, r0 = 0.18, r1 = i % 2 ? 0.26 : 0.31;
            poly(g, [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1]], false, 11 + i, t);
          }
        },
      };
      // 版面（每個圖的中心、寬度比例、閃爍頻率、星點位置）
      function layout(S) {
        const w = S.w, h = S.h, u = S.u, L = w <= h;
        const o = L ? {
          taxi: [0.27, 0.12], house: [0.76, 0.2], meteor: [0.27, 0.38], sun: [0.77, 0.72], crit: [0.2, 0.87],
        } : {
          taxi: [0.17, 0.22], house: [0.84, 0.3], meteor: [0.5, 0.16], sun: [0.84, 0.76], crit: [0.14, 0.82],
        };
        return [
          { id: 'taxi', x: o.taxi[0] * w, y: o.taxi[1] * h, k: u * 0.34, f: 1, ph: 0.3, spark: [0, -0.27] },
          { id: 'house', x: o.house[0] * w, y: o.house[1] * h, k: u * 0.3, f: 2, ph: 1.7, spark: [0.135, -0.3] },
          { id: 'meteor', x: o.meteor[0] * w, y: o.meteor[1] * h, k: u * 0.32, f: 3, ph: 3.1, spark: [0.3, -0.12] },
          { id: 'sun', x: o.sun[0] * w, y: o.sun[1] * h, k: u * 0.3, f: 1, ph: 4.4, spark: [0, 0] },
        ].concat([{ crit: o.crit }]);
      }

      function bakeDraw(d, u) {
        const half = d.k * 0.5, side = Math.ceil(half * 1.7);
        d.half = half; d.side = side;
        d.spr = [0, 1, 2].map((b) => {
          const c = KK.canvas(side, side), g = c.getContext('2d');
          g.translate(side / 2, side / 2);
          g.scale(half, half);
          g.strokeStyle = P.cream; g.fillStyle = P.cream;
          g.lineWidth = Math.max(1.3, u * 0.0034) / half;
          g.lineCap = 'round'; g.lineJoin = 'round';
          DRAW[d.id](g, (b + 0.01) / KK.BOIL_FPS);
          return c;
        });
      }

      function bakeBooks(u) {
        const c = KK.canvas(u * 0.16, u * 0.07), g = c.getContext('2d');
        const bk = [[0.13, 0.018, P.brick, 0.0], [0.1, 0.016, P.ochre, 0.012], [0.075, 0.014, P.mist, -0.006]];
        let y = c.height - 2;
        bk.forEach((b, i) => {
          const bw = u * b[0], bh = u * b[1], x = c.width / 2 - bw / 2 + u * b[3];
          g.fillStyle = KK.rgba(b[2], 0.95);
          KK.wobPath(g, [[x, y], [x, y - bh], [x + bw, y - bh], [x + bw, y]], true, u * 0.0012, 90 + i, 0.1);
          g.fill();
          g.fillStyle = KK.rgba(P.cream, 0.5);
          g.fillRect(x + bw * 0.08, y - bh * 0.62, bw * 0.84, bh * 0.14);
          y -= bh;
        });
        return { c, top: y, h: c.height };
      }

      /* 紙筒圈：3 張手抖版本（預畫） */
      function bakeRing(S) {
        const R = st.R, u = S.u, side = Math.ceil(R * 2.8), c0 = side / 2;
        st.ringSide = side;
        st.ring = [0, 1, 2].map((v) => {
          const c = KK.canvas(side, side), g = c.getContext('2d');
          const t = (v + 0.01) / KK.BOIL_FPS;
          // 內外的紙厚陰影（用漸層，不用 shadowBlur）
          const gr = g.createRadialGradient(c0, c0, 0, c0, c0, R * 1.4);
          gr.addColorStop(0, KK.rgba(P.umber, 0));
          gr.addColorStop(0.52, KK.rgba(P.umber, 0));
          gr.addColorStop(0.71, KK.rgba(P.umber, 0.45));
          gr.addColorStop(0.8, KK.rgba(P.umber, 0.34));
          gr.addColorStop(1, KK.rgba(P.umber, 0));
          g.fillStyle = gr; g.fillRect(0, 0, side, side);
          g.lineCap = 'round';
          // 紙筒的邊緣厚度（寬帶）
          KK.wobCircle(g, c0, c0, R * 1.055, u * 0.003, 5, t, 26);
          g.strokeStyle = KK.rgba(P.page, 0.5); g.lineWidth = R * 0.1; g.stroke();
          // 受光的上緣
          g.beginPath(); g.arc(c0, c0, R * 1.055, Math.PI * 1.05, Math.PI * 1.6);
          g.strokeStyle = KK.rgba(P.cream, 0.45); g.lineWidth = R * 0.05; g.stroke();
          // 雙圈線條：燈下米＋舊書頁，帶手抖
          KK.wobCircle(g, c0, c0, R * 1.0, u * 0.0035, 15, t, 26);
          g.strokeStyle = KK.rgba(P.cream, 0.95); g.lineWidth = Math.max(2, u * 0.0095); g.stroke();
          KK.wobCircle(g, c0, c0, R * 1.115, u * 0.0045, 25, t, 26);
          g.strokeStyle = KK.rgba(P.page, 0.85); g.lineWidth = Math.max(1.5, u * 0.0065); g.stroke();
          KK.wobCircle(g, c0, c0, R * 1.17, u * 0.004, 35, t, 26);
          g.strokeStyle = KK.rgba(P.umber, 0.3); g.lineWidth = Math.max(1, u * 0.003); g.stroke();
          return c;
        });
      }

      /* ---------- 小窗位置 ---------- */
      function autoPos(S) {
        const ph = S.phase, w = S.w, h = S.h;
        const lx = w * 0.5 + w * 0.3 * Math.sin(ph * TAU + 0.9);
        const ly = h * 0.5 + h * 0.28 * Math.sin(ph * TAU * 2 + 0.2);
        // 在 phase 0.7 附近繞去小動物那裡（周期函數，天然無縫）
        const b = KK.smooth(0.35, 0.8, Math.cos((ph - 0.7) * TAU));
        const cx = st.crit.x, cy = st.crit.y - st.crit.size * 0.45;
        return { x: KK.lerp(lx, cx, b), y: KK.lerp(ly, cy, b) };
      }

      return {
        resize(S) {
          const u = S.u;
          st.R = u * 0.28;
          st.layer = KK.canvas(S.w / 2, S.h / 2);
          st.lg = st.layer.getContext('2d');
          // 柔邊挖洞 sprite（半解析度）
          const dh = Math.max(8, Math.round(st.R));
          const hc = KK.canvas(dh, dh), hg = hc.getContext('2d'), r = dh / 2;
          const gr = hg.createRadialGradient(r, r, 0, r, r, r);
          gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.76, 'rgba(0,0,0,1)');
          gr.addColorStop(0.9, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          hg.fillStyle = gr; hg.fillRect(0, 0, dh, dh);
          st.hole = hc;
          bakeRing(S);
          const lay = layout(S);
          st.draws = lay.filter((d) => d.id);
          st.draws.forEach((d) => bakeDraw(d, u));
          const cr = lay.find((d) => d.crit).crit;
          st.crit = { x: cr[0] * S.w, y: cr[1] * S.h, size: u * 0.03 };
          st.books = bakeBooks(u);
          st.pos = autoPos({ phase: 0, w: S.w, h: S.h });
          st.hand = { x: st.pos.x, y: st.pos.y };
          st.m = 0; st.fingers.clear(); st.last = null;
        },
        reset() { st.m = 0; st.fingers.clear(); st.last = null; },
        pointer(S, ev) {
          if (S.autoDemo) return;
          const off = S.u * 0.14; // 讓小窗在指尖上方一點，手指不會擋住它
          if (ev.type === 'down') {
            st.fingers.set(ev.id, { x: ev.x, y: ev.y - off });
            st.hand = { x: st.pos.x, y: st.pos.y };
            st.m = 1;
          } else if (ev.type === 'move') {
            if (st.fingers.has(ev.id)) st.fingers.set(ev.id, { x: ev.x, y: ev.y - off });
          } else {
            st.fingers.delete(ev.id);
            if (!st.fingers.size) st.rel = S.now;
          }
        },
        draw(g, S) {
          const t = S.t, ph = S.phase, w = S.w, h = S.h, u = S.u, R = st.R;
          // ---- 小窗位置：自動路徑 ⇄ 手指 ----
          let dt = st.last == null ? 0 : KK.clamp(S.now - st.last, 0, 0.1);
          st.last = S.now;
          if (S.autoDemo) st.m = 0;
          const auto = autoPos(S);
          if (st.fingers.size) {
            const f = Array.from(st.fingers.values()).pop();
            const k = 1 - Math.exp(-dt * 9);
            st.hand.x += (f.x - st.hand.x) * k; st.hand.y += (f.y - st.hand.y) * k;
            st.m = Math.min(1, st.m + dt / 0.25);
          } else if (st.m > 0 && S.now - st.rel > 3) {
            st.m = Math.max(0, st.m - dt / 1.6);
          }
          const wgt = KK.smooth(0, 1, st.m);
          const cx = KK.lerp(auto.x, st.hand.x, wgt), cy = KK.lerp(auto.y, st.hand.y, wgt);
          st.pos.x = cx; st.pos.y = cy;

          // ---- 暗層下的小動物場景（暖色小剪影；只有小窗經過才看得見） ----
          const c = st.crit;
          g.save();
          g.globalCompositeOperation = 'screen';
          KK.drawSprite(g, KK.glow(P.apricot, 96), c.x, c.y - c.size * 0.5, u * 0.22, 0.3);
          g.restore();
          const bk = st.books;
          g.globalAlpha = 0.5;
          g.drawImage(bk.c, c.x - bk.c.width / 2, c.y - bk.top);
          g.globalAlpha = 1;
          if (S.critter) {
            const near = Math.hypot(cx - c.x, cy - c.y) < u * 0.5;
            KK.Critter.draw(g, c.x, c.y, c.size, {
              pose: near ? 'lookup' : 'sit', facing: cx < c.x - u * 0.02 ? -1 : 1,
              color: KK.mix(P.umber, P.night, 0.35), t, eyeColor: KK.mix(P.umber, P.cream, 0.6),
            });
          }

          // ---- 暗層（半解析度）：夜墨藍＋細線畫，再挖一個柔邊洞 ----
          const lg = st.lg, lw = st.layer.width, lh = st.layer.height;
          lg.globalCompositeOperation = 'source-over';
          lg.clearRect(0, 0, lw, lh);
          lg.fillStyle = KK.rgba(P.night, 0.865);
          lg.fillRect(0, 0, lw, lh);
          const bi = KK.boil(t);
          for (const d of st.draws) {
            const a = 0.185 + 0.06 * Math.sin(ph * TAU * d.f + d.ph);
            lg.globalAlpha = a;
            lg.drawImage(d.spr[bi], d.x / 2 - d.side / 2, d.y / 2 - d.side / 2);
            // 一顆星點偶爾亮一下
            const sp = Math.max(0, Math.sin(ph * TAU * (d.f + 1) + d.ph * 2));
            KK.drawSprite(lg, KK.glow(P.page, 48), (d.x + d.spark[0] * d.k) / 2, (d.y + d.spark[1] * d.k) / 2, u * 0.05, 0.1 + 0.3 * sp * sp);
          }
          lg.globalAlpha = 1;
          lg.globalCompositeOperation = 'destination-out';
          const hd = st.hole.width;
          lg.drawImage(st.hole, cx / 2 - hd / 2, cy / 2 - hd / 2);
          lg.globalCompositeOperation = 'source-over';
          g.drawImage(st.layer, 0, 0, w, h);

          // ---- 小窗裡面：暖色＋慢慢漂浮的光點 ----
          g.save();
          g.globalCompositeOperation = 'screen';
          KK.drawSprite(g, KK.glow(P.apricot, 128), cx, cy, R * 2.1, 0.2);
          const N = 14;
          for (let i = 0; i < N; i++) {
            const r1 = KK.hash(i, 1), r2 = KK.hash(i, 2), r3 = KK.hash(i, 3);
            const k = KK.mod(ph * (1 + (i % 2)) + r1, 1); // 慢慢往上飄
            const x = cx + R * (r2 * 1.5 - 0.75) * 0.95 + Math.sin(ph * TAU * (1 + (i % 3)) + r3 * 6) * R * 0.08;
            const y = cy + R * 0.85 * (1 - 2 * k);
            if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > R * R * 0.72) continue;
            const fade = Math.sin(k * Math.PI);
            KK.drawSprite(g, KK.glow(i % 3 ? P.cream : P.apricot, 32), x, y, u * (0.012 + 0.022 * r3), 0.65 * fade);
          }
          g.restore();

          // ---- 紙筒圈（手抖雙圈＋紙厚） ----
          const rg = st.ring[bi];
          g.drawImage(rg, cx - st.ringSide / 2, cy - st.ringSide / 2);

          KK.paper(g, S, { grain: 0.4, vignette: 0.38 });
        },
      };
    },
  });
})();
