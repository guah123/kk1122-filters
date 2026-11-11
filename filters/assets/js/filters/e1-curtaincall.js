/* E1 彩蛋〈謝幕遊行〉電影結尾：上下兩條「電影遮幅」黑邊＋輕微放映機閃爍＋偶爾底片刮痕；
 * 下方遮幅帶裡，前面印象深刻的東西排成一列由右往左謝幕遊行：
 * 計程車 → 牽手奔跑的兩個小孩 → 流星 → 從雲後探頭的太陽 → 暖光球 → 小動物（最後面，小跑跟上）。
 * 最後上方遮幅帶浮出一個「看看」。
 *
 * 分鏡（D = 16 秒）：
 *   t=0       只有空的遮幅（無縫起點）
 *   t=1–11    隊伍從右邊走進、走過、由左邊走光（每個圖示各有走路/彈跳/閃爍的小動作）
 *   t=11.5–14.5 上遮幅帶淡入「看看」→ 淡出
 *   t=16      又是空的遮幅（無縫）
 * 互動：點一下，隊伍裡每個圖示依序跳一下（S.now 計時的波浪）。
 * 小動物：S.critter 為 true 時排在隊伍最後面（小跑）；false 時改成一架紙飛機。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  KK.defineFilter({
    id: 'curtaincall',
    no: 'E1',
    song: '',
    title: '謝幕遊行',
    mood: '謝幕・回味・會心一笑',
    duration: 16,
    hint: '點一下畫面，讓隊伍裡的大家跳一下',
    critterHint: '隊伍最後面，比其他圖示小一點的小跑剪影',
    create() {
      const st = { tapAt: -1e9, lookBake: null, key: '' };

      function barH(S) { return S.h >= S.w ? S.h * 0.1 : S.h * 0.12; }

      /* ---------- 六個圖示（朝右畫，外層再翻面成朝左；腳底在 y=0，單位 s） ---------- */
      function drawCab(g, s, t) {
        const bob = Math.abs(Math.sin(t * TAU * 2.6)) * s * 0.022;
        g.save();
        g.translate(0, -bob);
        const a = s * 0.012, b = KK.boil(t);
        // 排氣小煙圈（在車尾，隨車子留下）
        for (let k = 0; k < 3; k++) {
          const f = KK.mod(t * 1.3 + k / 3, 1);
          g.fillStyle = KK.rgba(P.cream, 0.32 * (1 - f));
          g.beginPath();
          g.arc(-s * (0.8 + f * 0.5), -s * (0.2 + f * 0.12), s * (0.03 + f * 0.05), 0, TAU);
          g.fill();
        }
        // 車頭燈
        KK.drawSprite(g, KK.glow(P.cream, 64), s * 0.86, -s * 0.34, s * 0.5, 0.4);
        g.fillStyle = P.ochre;
        KK.wobPath(g, [[-0.75, -0.1], [-0.75, -0.38], [-0.46, -0.42], [-0.3, -0.72], [0.2, -0.74], [0.38, -0.43], [0.76, -0.37], [0.76, -0.1]]
          .map((p) => [p[0] * s, p[1] * s]), true, a, 11, t);
        g.fill();
        g.fillStyle = KK.rgba(P.night, 0.85);
        KK.wobPath(g, [[-0.26, -0.45], [-0.19, -0.64], [0.14, -0.65], [0.27, -0.45]].map((p) => [p[0] * s, p[1] * s]), true, a * 0.6, 12, t);
        g.fill();
        g.fillStyle = P.cream; // 車頂燈牌
        g.fillRect(-s * 0.08, -s * 0.84, s * 0.2, s * 0.11);
        g.fillStyle = KK.rgba(P.umber, 0.6); // 車身格紋
        for (let i = 0; i < 8; i++) if (i % 2 === 0) g.fillRect(-s * 0.62 + i * s * 0.14, -s * 0.28, s * 0.14, s * 0.07);
        // 輪子（暗背景上用淺灰褐＋米色輪圈，才看得到）
        for (const wx of [-0.45, 0.45]) {
          g.fillStyle = KK.mix(P.umber, P.page, 0.4);
          g.beginPath(); g.arc(wx * s, -s * 0.11, s * 0.13, 0, TAU); g.fill();
          g.fillStyle = P.cream;
          g.beginPath(); g.arc(wx * s, -s * 0.11, s * 0.05, 0, TAU); g.fill();
        }
        g.restore();
      }

      function kid(g, s, x, h, col, phase, t, holdX) {
        const ph = t * TAU * 2.4 + phase;
        const sw = Math.sin(ph) * 0.75;
        const oy = -Math.abs(Math.cos(ph)) * h * 0.07;
        g.save();
        g.translate(x, oy);
        g.strokeStyle = col; g.fillStyle = col;
        g.lineCap = 'round';
        g.lineWidth = h * 0.12;
        g.beginPath();
        g.moveTo(0, -h * 0.42); g.lineTo(Math.sin(sw) * h * 0.3, h * 0.02 - oy);
        g.moveTo(0, -h * 0.42); g.lineTo(-Math.sin(sw) * h * 0.3, h * 0.02 - oy);
        g.stroke();
        // 牽著的手（朝內伸到 holdX）與另一隻擺動的手
        g.lineWidth = h * 0.09;
        g.beginPath();
        g.moveTo(0, -h * 0.7); g.lineTo(holdX - x, -h * 0.5);
        g.moveTo(0, -h * 0.7); g.lineTo(-Math.sin(sw) * h * 0.2 - h * 0.08, -h * 0.5);
        g.stroke();
        g.beginPath();
        g.ellipse(0, -h * 0.6, h * 0.12, h * 0.22, 0, 0, TAU);
        g.fill();
        g.beginPath();
        g.arc(h * 0.03, -h * 0.9, h * 0.15, 0, TAU);
        g.fill();
        g.restore();
        return { x, y: -h * 0.7 + oy };
      }
      function drawKids(g, s, t) {
        const xa = -s * 0.3, xb = s * 0.26, hold = (xa + xb) / 2;
        // 小圍巾尾巴（磚紅），隨風飄
        kid(g, s, xa, s * 0.98, P.apricot, 0, t, hold + s * 0.0);
        const fl = Math.sin(t * TAU * 2.4) * s * 0.05;
        g.strokeStyle = KK.rgba(P.brick, 0.95);
        g.lineWidth = s * 0.05; g.lineCap = 'round';
        g.beginPath();
        g.moveTo(xa, -s * 0.75);
        g.quadraticCurveTo(xa - s * 0.2, -s * 0.8 + fl, xa - s * 0.36, -s * 0.72 - fl);
        g.stroke();
        kid(g, s, xb, s * 0.8, P.page, 1.9, t, hold);
      }

      function drawMeteor(g, s, t) {
        const wob = Math.sin(t * TAU * 1.3) * s * 0.1;
        g.save();
        g.translate(0, -s * 0.5 + wob);
        g.rotate(Math.sin(t * TAU * 1.3 + 1) * 0.12);
        const hx = s * 0.4, hy = s * 0.12, tx = -s * 0.85, ty = -s * 0.4;
        const ang = Math.atan2(ty - hy, tx - hx), nx = -Math.sin(ang), ny = Math.cos(ang);
        const gr = g.createLinearGradient(hx, hy, tx, ty);
        gr.addColorStop(0, KK.rgba(P.cream, 0.95));
        gr.addColorStop(0.4, KK.rgba(P.page, 0.5));
        gr.addColorStop(1, KK.rgba(P.apricot, 0));
        g.fillStyle = gr;
        const fw = 0.14 + Math.sin(t * TAU * 3) * 0.015;
        g.beginPath();
        g.moveTo(hx + nx * s * fw, hy + ny * s * fw);
        g.lineTo(tx, ty);
        g.lineTo(hx - nx * s * fw, hy - ny * s * fw);
        g.closePath();
        g.fill();
        // 尾巴上的碎光
        for (let k = 0; k < 4; k++) {
          const f = KK.mod(t * 1.1 + k / 4, 1);
          const px = KK.lerp(hx, tx, 0.2 + f * 0.75), py = KK.lerp(hy, ty, 0.2 + f * 0.75) + Math.sin(k * 5 + t * 6) * s * 0.06;
          KK.drawSprite(g, KK.glow(P.page, 32), px, py, s * 0.12, 0.7 * (1 - f));
        }
        KK.drawSprite(g, KK.glow(P.cream, 64), hx, hy, s * 0.7, 0.8);
        g.fillStyle = P.cream;
        g.beginPath(); g.arc(hx, hy, s * 0.09, 0, TAU); g.fill();
        g.restore();
      }

      function drawSun(g, s, t) {
        const peek = Math.sin(t * TAU * 0.6) * s * 0.07;
        const cx = s * 0.02, cy = -s * 0.56 - peek, r = s * 0.3;
        KK.drawSprite(g, KK.glow(P.apricot, 96), cx, cy, s * 1.5, 0.55);
        // 光芒（慢轉）
        g.strokeStyle = KK.rgba(P.ochre, 0.95);
        g.lineWidth = s * 0.05; g.lineCap = 'round';
        g.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = t * 0.5 + (i / 9) * TAU;
          const r0 = r * 1.3, r1 = r * (1.62 + 0.12 * Math.sin(t * 4 + i));
          g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        }
        g.stroke();
        g.fillStyle = P.ochre;
        g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
        g.fillStyle = KK.rgba(P.cream, 0.5);
        g.beginPath(); g.arc(cx - r * 0.25, cy - r * 0.25, r * 0.5, 0, TAU); g.fill();
        // 前面的雲（把太陽下半遮住）
        const sh = Math.sin(t * TAU * 0.6 + 2) * s * 0.02;
        g.fillStyle = KK.mix(P.mist, P.cream, 0.25);
        g.beginPath();
        g.arc(-s * 0.32 + sh, -s * 0.24, s * 0.2, 0, TAU);
        g.arc(-s * 0.02 + sh, -s * 0.33, s * 0.28, 0, TAU);
        g.arc(s * 0.3 + sh, -s * 0.24, s * 0.2, 0, TAU);
        g.rect(-s * 0.4 + sh, -s * 0.24, s * 0.8, s * 0.2);
        g.fill();
        g.fillStyle = KK.rgba(P.slate, 0.35);
        g.fillRect(-s * 0.4 + sh, -s * 0.09, s * 0.8, s * 0.05);
      }

      function drawOrb(g, s, t) {
        const bob = Math.sin(t * TAU * 0.9) * s * 0.06;
        const pul = 1 + Math.sin(t * TAU * 1.2) * 0.1;
        g.save();
        g.translate(0, -s * 0.5 + bob);
        g.globalCompositeOperation = 'lighter';
        KK.drawSprite(g, KK.glow(P.apricot, 128), 0, 0, s * 1.5 * pul, 0.6);
        KK.drawSprite(g, KK.glow(P.cream, 64), 0, 0, s * 0.8 * pul, 0.9);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = P.cream;
        g.beginPath(); g.arc(0, 0, s * 0.15 * pul, 0, TAU); g.fill();
        // 繞著它的小光點
        for (let k = 0; k < 4; k++) {
          const a = t * (0.9 + k * 0.17) + k * 1.7, rr = s * (0.42 + 0.06 * k);
          g.fillStyle = KK.rgba(P.page, 0.85);
          g.beginPath(); g.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.7, s * 0.032, 0, TAU); g.fill();
        }
        g.restore();
      }

      function drawPlane(g, s, t) {
        const wv = Math.sin(t * TAU * 0.7);
        g.save();
        g.translate(0, -s * 0.5 + wv * s * 0.1);
        g.rotate(Math.cos(t * TAU * 0.7) * 0.2);
        g.strokeStyle = KK.rgba(P.cream, 0.4);
        g.lineWidth = s * 0.03;
        g.setLineDash([s * 0.06, s * 0.08]);
        g.beginPath(); g.moveTo(-s * 0.9, s * 0.1); g.quadraticCurveTo(-s * 0.55, -s * 0.12, -s * 0.3, 0); g.stroke();
        g.setLineDash([]);
        g.fillStyle = P.cream;
        g.beginPath();
        g.moveTo(s * 0.5, 0); g.lineTo(-s * 0.4, -s * 0.24); g.lineTo(-s * 0.22, 0); g.lineTo(-s * 0.4, s * 0.2); g.closePath();
        g.fill();
        g.strokeStyle = KK.rgba(P.umber, 0.45);
        g.lineWidth = s * 0.03;
        g.beginPath(); g.moveTo(s * 0.5, 0); g.lineTo(-s * 0.22, 0); g.stroke();
        g.restore();
      }

      const ITEMS = [
        { fn: drawCab, flip: true },
        { fn: drawKids, flip: true },
        { fn: drawMeteor, flip: true },
        { fn: drawSun, flip: true },
        { fn: drawOrb, flip: true },
      ];

      function lookBake(S, bh) {
        const key = S.w + 'x' + S.h;
        if (st.key !== key) {
          st.key = key;
          st.lookBake = KK.Glyphs.bake('看看', bh * 0.62, P.cream, 8, 0.12);
        }
        return st.lookBake;
      }

      return {
        resize(S) { st.key = ''; lookBake(S, barH(S)); },
        reset() { st.tapAt = -1e9; },
        pointer(S, ev) { if (ev.type === 'down') st.tapAt = S.now; },
        draw(g, S) {
          const t = S.t, w = S.w, h = S.h, u = S.u;
          const bh = barH(S);
          const s = bh * 0.62;

          // ---- 上下遮幅 ----
          g.fillStyle = KK.rgba(P.umber, 0.85);
          g.fillRect(0, 0, w, bh);
          g.fillRect(0, h - bh, w, bh);
          g.fillStyle = KK.rgba(P.cream, 0.1);
          g.fillRect(0, bh - 1, w, 1.5);
          g.fillRect(0, h - bh - 0.5, w, 1.5);

          // ---- 遊行 ----
          const gap = Math.max(s * 2.1, u * 0.15);
          const n = 6, m = s * 1.4;
          const kk = (t - 1) / 10;
          if (kk > -0.2 && kk < 1.2) {
            const lead = KK.lerp(w + m, -m - (n - 1) * gap, kk);
            const baseY = h - bh * 0.5 + s * 0.46;
            const ref = S.autoDemo ? t - 5.0 : S.now - st.tapAt;
            for (let i = 0; i < n; i++) {
              const x = lead + i * gap;
              if (x < -m * 1.2 || x > w + m * 1.2) continue;
              const jk = (ref - i * 0.13) / 0.5;
              const jump = jk > 0 && jk < 1 ? Math.sin(jk * Math.PI) * bh * 0.42 : 0;
              g.save();
              g.translate(x, baseY - jump);
              if (i < 5) {
                if (ITEMS[i].flip) g.scale(-1, 1);
                ITEMS[i].fn(g, s, t);
              } else if (S.critter) {
                const hop = Math.abs(Math.sin(t * TAU * 2.2)) * s * 0.03;
                KK.Critter.draw(g, 0, -hop, s * 0.9, { pose: 'walk', facing: -1, color: KK.mix(P.page, P.apricot, 0.3), alpha: 0.8, eyeColor: P.umber, t });
              } else {
                g.scale(-1, 1);
                drawPlane(g, s, t);
              }
              g.restore();
            }
          }

          // ---- 上方遮幅：「看看」 ----
          const fa = KK.smooth(11.5, 12.5, t) * (1 - KK.smooth(13.5, 14.5, t));
          if (fa > 0.003) {
            const c = lookBake(S, bh);
            g.globalAlpha = fa * 0.95;
            g.drawImage(c, (w - c.width) / 2, (bh - c.height) / 2 + (1 - fa) * 3);
            g.globalAlpha = 1;
          }

          // ---- 放映機閃爍（整體亮度極小幅度跳動，24 格/秒；384 格剛好一圈）----
          const fi = Math.floor(t * 24) % 384;
          const v = (KK.hash(fi, 5) - 0.5) * 2 + Math.sin(S.phase * TAU * 8) * 0.4;
          g.save();
          if (v > 0) {
            g.globalCompositeOperation = 'screen';
            g.fillStyle = KK.rgba(P.cream, Math.min(0.05, v * 0.03));
          } else {
            g.fillStyle = KK.rgba(P.umber, Math.min(0.06, -v * 0.035));
          }
          g.fillRect(0, 0, w, h);
          g.restore();

          // ---- 偶爾一條底片刮痕（t≈2.4 / 6.9 / 12.2 / 14.9，各約 0.18 秒）----
          const sc = [2.4, 6.9, 12.2, 14.9];
          for (let i = 0; i < sc.length; i++) {
            const d = t - sc[i];
            if (d >= 0 && d < 0.18) {
              const x = w * (0.12 + 0.76 * KK.hash(i * 3 + 1, 9));
              g.fillStyle = KK.rgba(P.cream, 0.2 * (1 - d / 0.18) + 0.06);
              g.fillRect(x + Math.sin(d * 30) * 0.6, 0, Math.max(1, u * 0.002), h);
              // 一粒灰塵
              g.fillStyle = KK.rgba(P.umber, 0.5);
              g.beginPath(); g.arc(w * (0.2 + 0.6 * KK.hash(i, 4)), h * (0.25 + 0.5 * KK.hash(i, 8)), u * 0.004, 0, TAU); g.fill();
            }
          }

          KK.paper(g, S, { grain: 0.4, vignette: 0.4 });
        },
      };
    },
  });
})();
