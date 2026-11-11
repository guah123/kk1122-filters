/* E3 彩蛋〈牠終於出來了〉：整場都偷偷藏著的小動物，終於走到鏡頭前打招呼。
 *
 * ★ 此彩蛋「不受 S.critter 開關影響」——牠就是主角，永遠會畫（只看 KK.Critter.visible 以外的東西都不擋）。
 *
 * 分鏡（D = 14 秒）：
 *   t=0       畫面乾淨（無縫起點）
 *   t=0.5–4   牠從右下邊緣走進來（walk），沿下緣走到畫面下方偏右，下緣浮出一條暖色地面光
 *   t=4–5     坐下（sit，有一點壓扁的緩衝）；t=5–6.5 抬頭看鏡頭（lookup）
 *   t=6.5–9   揮手（wave），身邊冒出小星光、花瓣，最後一顆小愛心
 *   t=9–13    起身往左走出畫面，腳下留下一串淡淡的小腳印，腳印慢慢淡掉
 *   t=13–14   只剩快消失的腳印；t=14 = t=0 → 乾淨
 * 互動：點一下，牠原地跳一下（S.now 計時），頭上冒一顆小愛心。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  const T_IN0 = 0.5, T_SIT = 4, T_LOOK = 5, T_WAVE = 6.5, T_UP = 9, T_GO = 9.4, T_OUT = 13.2, D = 14;

  KK.defineFilter({
    id: 'reveal',
    no: 'E3',
    song: '',
    title: '牠終於出來了',
    mood: '原來一直都在・溫暖的告別',
    duration: 14,
    hint: '點一下，牠會跳起來跟你打招呼',
    critterHint: '主角就是牠',
    create() {
      const st = { tapAt: -1e9, prints: [], key: '' };

      /* 版面：牠的大小、地面、停留位置、離場起點 */
      function lay(S) {
        const c = S.u * 0.21; // 新版袋熊較矮寬（高約 0.7×size），放大讓視覺高度約短邊 14–16%
        return { c, floor: S.h - S.u * 0.07, tx: S.w * 0.7, startX: S.w + c * 0.9, endX: -c * 0.9 };
      }
      function xAt(L, t) {
        if (t < T_IN0) return L.startX;
        if (t < T_SIT) { const k = (t - T_IN0) / (T_SIT - T_IN0); return KK.lerp(L.startX, L.tx, 1 - Math.pow(1 - k, 1.6)); }
        if (t < T_GO) return L.tx;
        if (t < T_OUT) { const k = (t - T_GO) / (T_OUT - T_GO); return KK.lerp(L.tx, L.endX, k * k * (3 - 2 * k) * 0.5 + k * 0.5); }
        return L.endX;
      }
      function poseAt(t) {
        if (t < T_SIT) return 'walk';
        if (t < T_LOOK) return 'sit';
        if (t < T_WAVE) return 'lookup';
        if (t < T_UP) return 'wave';
        if (t < T_GO) return 'sit';
        return 'walk';
      }

      /* 腳印：沿離場路徑每隔一段距離一對；算出牠經過的時間，用來淡入與淡出 */
      function buildPrints(S) {
        const L = lay(S);
        st.prints = [];
        const stepD = L.c * 0.5;
        for (let j = 0, x = L.tx - L.c * 0.1; x > L.endX + L.c * 0.2; j++, x -= stepD) {
          let lo = T_GO, hi = T_OUT;
          for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; if (xAt(L, mid) > x) lo = mid; else hi = mid; }
          st.prints.push({ x, side: j % 2 ? 1 : -1, tp: hi });
        }
      }

      function heart(g, x, y, r) {
        g.beginPath();
        g.moveTo(x, y + r * 0.9);
        g.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.4);
        g.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
        g.fill();
      }
      function star4(g, x, y, r, rot) {
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = rot + (i / 8) * TAU, rr = i % 2 ? r * 0.28 : r;
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
      }
      function petal(g, x, y, r, rot) {
        g.beginPath();
        g.ellipse(x, y, r, r * 0.5, rot, 0, TAU);
        g.fill();
      }

      /* 揮手時的小粒子（決定性：只看 S.t）：星光、花瓣，最後一顆愛心 */
      const SPARKS = [];
      for (let i = 0; i < 12; i++) {
        // 相對「頭」的位置（單位 c）：頭旁邊與頭上方近處，不蓋住臉
        let ox = (KK.hash(i, 2) - 0.5) * 1.3;
        let oy = -0.28 - KK.hash(i, 5) * 0.4;
        if (Math.abs(ox) < 0.3) { ox = ox < 0 ? -0.3 : 0.3; }
        SPARKS.push({
          t0: T_WAVE - 0.1 + i * 0.22, life: 1.7,
          ox, oy,
          dx: (KK.hash(i, 7) - 0.5) * 0.4, rise: 0.2 + KK.hash(i, 9) * 0.2,
          kind: i % 3 === 0 ? 'star' : 'petal', col: [P.cream, P.apricot, P.page, P.brick][i % 4], rot: KK.hash(i, 11) * 6,
        });
      }

      return {
        resize(S) { buildPrints(S); },
        reset() { st.tapAt = -1e9; },
        pointer(S, ev) { if (ev.type === 'down') st.tapAt = S.now; },
        draw(g, S) {
          const t = S.t, w = S.w, h = S.h, u = S.u;
          const L = lay(S);
          const c = L.c, fy = L.floor;

          // ---- 下緣地面光（暖色 screen），像站在舞台前緣 ----
          const env = KK.smooth(0.3, 1.8, t) * (1 - KK.smooth(12.5, 13.9, t));
          if (env > 0.003) {
            g.save();
            g.globalCompositeOperation = 'screen';
            const gl = g.createLinearGradient(0, h, 0, h - u * 0.22);
            gl.addColorStop(0, KK.rgba(P.apricot, 0.42 * env));
            gl.addColorStop(1, KK.rgba(P.apricot, 0));
            g.fillStyle = gl;
            g.fillRect(0, h - u * 0.22, w, u * 0.22);
            g.restore();
          }

          // ---- 腳印 ----
          for (const p of st.prints) {
            const fin = KK.smooth(p.tp, p.tp + 0.25, t);
            const fout = 1 - KK.smooth(p.tp + 0.5, Math.min(D, p.tp + 4.6), t);
            const a = fin * fout * 0.65;
            if (a < 0.01) continue;
            const px = p.x, py = fy - c * 0.02 + p.side * c * 0.035;
            g.fillStyle = KK.rgba(P.umber, a);
            g.beginPath(); g.ellipse(px, py, c * 0.075, c * 0.045, 0, 0, TAU); g.fill();
            for (let k = -1; k <= 1; k++) {
              g.beginPath(); g.arc(px - c * 0.115, py + k * c * 0.04, c * 0.022, 0, TAU); g.fill();
            }
            g.fillStyle = KK.rgba(P.cream, a * 0.35); // 淡淡的亮邊，在深色書牆上也看得到
            g.beginPath(); g.ellipse(px + c * 0.004, py + c * 0.012, c * 0.075, c * 0.02, 0, 0, TAU); g.fill();
          }

          // ---- 主角 ----
          const ref = S.autoDemo ? t - 5.4 : S.now - st.tapAt;
          const jk = ref / 0.6;
          const jumping = jk > 0 && jk < 1;
          const jump = jumping ? Math.sin(jk * Math.PI) * c * 0.38 : 0;

          if (t >= T_IN0 && t < T_OUT + 0.3) {
            const x = xAt(L, t), pose = poseAt(t);
            // 坐下／起身的壓扁緩衝
            let sy = 1;
            if (t >= T_SIT && t < T_SIT + 0.35) sy = 1 - 0.07 * Math.sin(((t - T_SIT) / 0.35) * Math.PI);
            if (t >= T_UP && t < T_GO) sy = 1 - 0.06 * Math.sin(((t - T_UP) / (T_GO - T_UP)) * Math.PI);
            if (jumping) sy *= jk < 0.12 ? 1 - 0.1 * (jk / 0.12) : 1;
            const fall = KK.smooth(T_OUT, T_OUT + 0.3, t);
            // 腳下的小影子與舞台光
            g.save();
            g.globalCompositeOperation = 'screen';
            KK.drawSprite(g, KK.glow(P.apricot, 128), x, fy - c * 0.3, c * 3.4, 0.62 * env); // 身後的暖色光暈
            KK.drawSprite(g, KK.glow(P.cream, 128), x, fy - c * 0.35, c * 1.7, 0.22 * env);
            KK.drawSprite(g, KK.glow(P.apricot, 128), x, fy, c * 3.0, 0.4 * env * 0.8);
            g.restore();
            g.fillStyle = KK.rgba(P.umber, 0.28 * (1 - jump / c * 1.6));
            g.beginPath(); g.ellipse(x, fy + c * 0.01, c * 0.55 * (1 - jump / c * 0.5), c * 0.06, 0, 0, TAU); g.fill();

            const body = KK.mix(P.umber, P.night, 0.25);
            const opt = { pose, facing: -1, color: KK.rgba(body, 0.95), eyeColor: P.cream, t };
            g.save();
            g.translate(x, fy - jump);
            g.scale(1, sy);
            if (fall > 0) g.globalAlpha = 1 - fall;
            // 一圈淡淡的暖色邊光（往上偏移一點點的米色剪影），讓深色剪影在書牆前讀得出來
            const wasVis = KK.Critter.visible;
            KK.Critter.visible = true; // 主角不受開關影響
            // （圖片版自帶白肚，不再疊一層米色剪影邊光）
            KK.Critter.draw(g, 0, 0, c, { pose, facing: -1, t, tone: 0, alpha: 1 });
            KK.Critter.visible = wasVis;
            g.restore();

            // 頭的位置（facing=-1）：坐姿 (0.3,-0.5)；walk (0.5,-0.37)
            const hdx = x - c * (pose === 'walk' ? 0.5 : 0.3), hdy = fy - jump - c * (pose === 'walk' ? 0.37 : 0.5);
            // 頭上的小愛心（點一下）
            if (jk > 0 && jk < 2.4) {
              const f = jk / 2.4;
              g.fillStyle = KK.rgba(P.brick, Math.sin(Math.min(f, 1) * Math.PI) * 0.95);
              heart(g, hdx, hdy - c * (0.4 + f * 0.4), c * (0.07 + 0.05 * Math.sin(Math.min(f * 2, 1) * Math.PI)));
            }

            // ---- 揮手時身邊的星光／花瓣／愛心 ----
            for (const sp of SPARKS) {
              const k = (t - sp.t0) / sp.life;
              if (k <= 0 || k >= 1) continue;
              const al = Math.sin(k * Math.PI);
              const px = hdx + (sp.ox + sp.dx * k) * c;
              const py = hdy + (sp.oy - sp.rise * k) * c;
              g.fillStyle = KK.rgba(sp.col, al * 0.9);
              if (sp.kind === 'star') {
                KK.drawSprite(g, KK.glow(P.page, 32), px, py, c * 0.32, al * 0.5);
                star4(g, px, py, c * 0.08 * (0.7 + 0.3 * Math.sin(t * 6 + sp.rot)), sp.rot * 0.2);
              } else petal(g, px, py + Math.sin(k * 9 + sp.rot) * c * 0.03, c * 0.065, sp.rot + k * 3);
            }
            const hk = (t - 7.6) / 2.0;
            if (hk > 0 && hk < 1) {
              g.fillStyle = KK.rgba(P.brick, Math.sin(hk * Math.PI) * 0.95);
              heart(g, hdx - c * 0.05 + Math.sin(hk * 5) * c * 0.03, hdy - c * (0.42 + hk * 0.35), c * 0.09);
            }
          }

          KK.paper(g, S, { grain: 0.4, vignette: 0.4 });
        },
      };
    },
  });
})();
