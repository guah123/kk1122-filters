/* E0 彩蛋〈帶著姊姊去看看這世界〉：Kai 帶著小袋熊（姊姊），沿畫面下緣一路走過一個又一個小小的世界。
 * 主角是 Kai 自己的插圖（KK.Art.duo／stars，原樣使用：只縮放、位移、輕微彈跳與擺動，不改線條）。
 * ★ 此彩蛋的主角就是他們，不受 S.critter 開關影響；也不依賴人物位置（只用下緣＋極淡的全畫面暖色）。
 *
 * 分鏡（D = 16 秒，t=0 與 t=16 畫面上沒有他們，也沒有暖色疊層 → 無縫）：
 *   0.0–0.6   空畫面；暖色回憶濾鏡（燈下米 screen＋四周暗角）從 0 慢慢升起
 *   0.6–7.4   Kai 帶著小袋熊從左下外側走進來，沿下緣往右一路走（走路彈跳、輕微擺動）；
 *             頭上三顆星（原圖相對位置）一閃一閃；腳下的小世界依序被他們「照亮」：
 *             紐約天際線 → 有炊煙的小屋 → 星空與流星 → 雲後的太陽
 *   7.4–10.4  走到中間偏右停下；8.0–8.8 一起跳一下（小袋熊舉手開心），冒出一圈小星星
 *   10.4–15.4 再往右走，走出畫面
 *   15.4–16   空畫面，暖色褪去
 * 互動：點一下，點的地方冒幾顆小星星；他們若在畫面中也會再跳一下（S.now 計時）。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  const D = 16;
  const T_IN = 0.6, T_STOP = 7.4, T_GO = 10.4, T_OUT = 15.4;
  const T_JUMP = 8.0;

  KK.defineFilter({
    id: 'together',
    no: 'E0',
    song: '',
    title: '帶著姊姊去看看這世界',
    mood: '溫暖・同行・偷偷的驚喜',
    duration: D,
    hint: '點一下，小袋熊會跳起來揮手',
    critterHint: '主角（Kai 與姊姊）',
    create() {
      const st = { tapAt: -1e9, taps: [], base: null, scenes: null, key: '' };

      function star4(g, x, y, r, rot) {
        g.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = rot + (i / 8) * TAU, rr = i % 2 ? r * 0.3 : r;
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
      }

      /* ---- 版面 ---- */
      function lay(S) {
        const H = S.u * (S.w > S.h ? 0.27 : 0.29);
        const art = KK.Art && KK.Art.duo;
        const ar = art && art.naturalWidth ? art.naturalWidth / art.naturalHeight : 1.13;
        const W = H * ar;
        const foot = S.h - S.u * 0.07;
        return { H, W, foot, xp: S.w * 0.6, x0: -W * 0.62, x1: S.w + W * 0.7 };
      }
      /* 走路進度：回傳 { x, mv }（mv=移動中的程度 0..1，用來縮放彈跳） */
      function walkAt(L, t) {
        if (t < T_IN) return { x: L.x0, mv: 0 };
        if (t < T_STOP) { const k = (t - T_IN) / (T_STOP - T_IN); return { x: KK.lerp(L.x0, L.xp, k * (2 - k)), mv: KK.clamp((1 - k) * 4, 0, 1) }; }
        if (t < T_GO) return { x: L.xp, mv: 0 };
        if (t < T_OUT) { const k = (t - T_GO) / (T_OUT - T_GO); return { x: KK.lerp(L.xp, L.x1, k * k), mv: KK.clamp(k * 4, 0, 1) }; }
        return { x: L.x1, mv: 0 };
      }

      /* ---- 四個小小的世界（靜態剪影預畫一次；炊煙、星光、流星、太陽光芒每幀少量動態）---- */
      const SIL = KK.mix(P.night, P.slate, 0.5);
      function sceneBox(S) {
        const sw = S.w / 4;
        const hs = Math.min(sw * 1.1, S.u * 0.26);
        return { sw, hs };
      }
      function bakeScenes(S) {
        const { sw, hs } = sceneBox(S);
        const pad = 4;
        st.sc = { sw, hs, imgs: [] };
        for (let i = 0; i < 4; i++) {
          const c = KK.canvas(sw + pad * 2, hs + pad * 2);
          const g = c.getContext('2d');
          g.translate(pad, pad);
          g.lineJoin = 'round'; g.lineCap = 'round';
          const r = KK.rng(40 + i * 7);
          g.fillStyle = KK.rgba(SIL, 0.95);
          if (i === 0) { // 紐約天際線：幾棟階梯形的樓、水塔、尖塔
            let x = sw * 0.02;
            const bs = [];
            while (x < sw * 0.97) {
              const bw = sw * (0.08 + r() * 0.08), bh = hs * (0.28 + r() * 0.4);
              bs.push([x, bw, bh]);
              g.fillRect(x, hs - bh, bw, bh);
              if (r() < 0.4) g.fillRect(x + bw * 0.2, hs - bh - hs * 0.07, bw * 0.6, hs * 0.07);
              x += bw * 0.95;
            }
            // 尖塔
            const sx = sw * 0.62;
            g.fillRect(sx - sw * 0.05, hs - hs * 0.6, sw * 0.1, hs * 0.6);
            g.fillRect(sx - sw * 0.03, hs - hs * 0.78, sw * 0.06, hs * 0.2);
            g.beginPath(); g.moveTo(sx - sw * 0.012, hs - hs * 0.78); g.lineTo(sx, hs - hs * 0.98); g.lineTo(sx + sw * 0.012, hs - hs * 0.78); g.fill();
            // 窗戶
            g.fillStyle = KK.rgba(P.page, 0.85);
            bs.forEach(([bx, bw, bh]) => {
              for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) if (r() < 0.45) g.fillRect(bx + bw * (0.18 + a * 0.28), hs - bh + hs * 0.06 + b * hs * 0.1, bw * 0.12, hs * 0.045);
            });
          } else if (i === 1) { // 小屋與草坡
            g.beginPath(); g.moveTo(0, hs); g.quadraticCurveTo(sw * 0.3, hs * 0.62, sw * 0.62, hs * 0.8); g.quadraticCurveTo(sw * 0.85, hs * 0.9, sw, hs); g.lineTo(sw, hs); g.closePath();
            g.fillStyle = KK.rgba(KK.mix(P.moss, P.umber, 0.6), 0.95); g.fill();
            const hx = sw * 0.5, hb = hs * 0.82, bw = sw * 0.26, bh = hs * 0.26;
            g.fillStyle = KK.rgba(KK.mix(P.umber, P.brick, 0.5), 0.95); g.fillRect(hx - bw / 2, hb - bh, bw, bh);
            g.fillRect(hx + bw * 0.18, hb - bh - hs * 0.16, sw * 0.04, hs * 0.2); // 煙囪
            g.fillStyle = KK.rgba(P.brick, 0.98);
            g.beginPath(); g.moveTo(hx - bw * 0.62, hb - bh + 2); g.lineTo(hx, hb - bh - hs * 0.22); g.lineTo(hx + bw * 0.62, hb - bh + 2); g.closePath(); g.fill();
            g.fillStyle = KK.rgba(P.page, 0.95); g.fillRect(hx - bw * 0.3, hb - bh * 0.68, bw * 0.2, bh * 0.3); g.fillRect(hx + bw * 0.1, hb - bh * 0.68, bw * 0.2, bh * 0.3);
            // 小樹
            g.fillStyle = KK.rgba(KK.mix(P.moss, P.umber, 0.55), 0.95);
            [[0.16, 0.86, 0.07], [0.86, 0.84, 0.06]].forEach(([tx, ty, tr]) => { g.beginPath(); g.arc(sw * tx, hs * (ty - 0.1), sw * tr, 0, TAU); g.fill(); g.fillRect(sw * tx - 1.2, hs * (ty - 0.1), 2.4, hs * 0.12); });
          } else if (i === 2) { // 夜空：遠山
            g.beginPath(); g.moveTo(0, hs); g.quadraticCurveTo(sw * 0.25, hs * 0.6, sw * 0.5, hs * 0.84); g.quadraticCurveTo(sw * 0.75, hs * 0.98, sw, hs); g.closePath();
            g.fillStyle = KK.rgba(KK.mix(P.night, P.umber, 0.3), 0.95); g.fill();
          } else { // 太陽（靜態：雲）
            g.fillStyle = KK.rgba(KK.mix(P.mist, P.cream, 0.15), 0.9);
            [[0.3, 0.74, 0.1], [0.42, 0.68, 0.13], [0.58, 0.72, 0.11], [0.7, 0.77, 0.08]].forEach(([cx, cy, cr]) => { g.beginPath(); g.arc(sw * cx, hs * cy, sw * cr, 0, TAU); g.fill(); });
            g.fillRect(sw * 0.22, hs * 0.74, sw * 0.56, hs * 0.1);
          }
          st.sc.imgs.push(c);
        }
        st.sc.pad = pad;
        // 星空的星點位置
        const r = KK.rng(99);
        st.sc.stars = Array.from({ length: 8 }, (_, k) => ({ x: r() * 0.9 + 0.05, y: r() * 0.55 + 0.05, n: 2 + (k % 4), ph: r() * TAU, s: 0.012 + r() * 0.012 }));
      }

      function drawScenes(g, S, L, duoX, env) {
        const { sw, hs, pad, imgs } = st.sc;
        const u = S.u, t = S.t, ph = S.phase;
        const y0 = L.foot - hs + u * 0.02;
        for (let i = 0; i < 4; i++) {
          const x0 = i * sw;
          const cx = x0 + sw / 2;
          const near = Math.exp(-Math.pow((duoX - cx) / (sw * 0.9), 2));     // 他們走到哪，哪個世界就亮起來
          const al = (0.34 + 0.5 * near) * env;
          g.globalAlpha = al;
          g.drawImage(imgs[i], x0 - pad, y0 - pad);
          // 動態小細節
          if (i === 1) { // 炊煙（8 秒一輪、整數輪）
            const hx = x0 + sw * 0.5 + sw * 0.26 * 0.18 + sw * 0.02, hy = y0 + hs * 0.82 - hs * 0.26 - hs * 0.16;
            for (let j = 0; j < 4; j++) {
              const k = KK.mod(ph * 2 + j / 4, 1);
              const a = Math.sin(k * Math.PI) * 0.5 * (0.5 + near) * env;
              g.globalAlpha = a;
              KK.drawSprite(g, KK.glow(P.cream, 32), hx + Math.sin(k * 5 + j) * sw * 0.03 + k * sw * 0.08, hy - k * hs * 0.5, sw * (0.05 + 0.08 * k), 1);
            }
          } else if (i === 2) { // 星星眨眼＋流星
            g.fillStyle = P.cream;
            st.sc.stars.forEach((s) => {
              g.globalAlpha = al * (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(ph * TAU * s.n + s.ph)));
              star4(g, x0 + s.x * sw, y0 + s.y * hs, sw * s.s, 0.3);
            });
            const k = KK.mod(ph * 2 + 0.2, 1);
            if (k < 0.3) {
              const q = k / 0.3, hx = x0 + sw * (0.85 - 0.55 * q), hy = y0 + hs * (0.08 + 0.4 * q);
              for (let j = 0; j < 6; j++) {
                g.globalAlpha = al * (1 - j / 6) * Math.sin(q * Math.PI) * 0.95;
                g.fillStyle = P.cream;
                g.beginPath(); g.arc(hx + j * sw * 0.025, hy - j * sw * 0.012, sw * 0.014 * (1 - j / 8), 0, TAU); g.fill();
              }
            }
          } else if (i === 3) { // 雲後的太陽（雲緩緩飄、光芒轉整數圈）
            const sx = x0 + sw * 0.5, sy = y0 + hs * 0.5, rr = hs * 0.17;
            g.globalAlpha = al * 0.9;
            g.fillStyle = P.ochre;
            g.beginPath(); g.arc(sx, sy, rr, 0, TAU); g.fill();
            g.strokeStyle = KK.rgba(P.apricot, 1); g.lineWidth = Math.max(1, hs * 0.018);
            for (let j = 0; j < 8; j++) {
              const an = ph * TAU + (j / 8) * TAU;
              g.beginPath(); g.moveTo(sx + Math.cos(an) * rr * 1.35, sy + Math.sin(an) * rr * 1.35); g.lineTo(sx + Math.cos(an) * rr * 1.75, sy + Math.sin(an) * rr * 1.75); g.stroke();
            }
            g.globalAlpha = al * 0.95;
            g.fillStyle = KK.rgba(KK.mix(P.mist, P.cream, 0.25), 1);
            const dx = Math.sin(ph * TAU) * sw * 0.03;
            [[0.36, 0.64, 0.09], [0.47, 0.6, 0.11], [0.6, 0.66, 0.09]].forEach(([cx2, cy2, cr]) => { g.beginPath(); g.arc(x0 + sw * cx2 + dx, y0 + hs * cy2 + hs * 0.08, sw * cr, 0, TAU); g.fill(); });
          }
          g.globalAlpha = 1;
        }
      }

      /* ---- 全畫面暖色層（只做一次 drawImage）：四周暗角＋下緣一條路的暖光 ---- */
      function bakeBase(S) {
        const c = KK.canvas(S.w, S.h), g = c.getContext('2d');
        const gr = g.createRadialGradient(S.w / 2, S.h / 2, S.u * 0.3, S.w / 2, S.h / 2, Math.hypot(S.w, S.h) * 0.55);
        gr.addColorStop(0, KK.rgba(P.umber, 0));
        gr.addColorStop(1, KK.rgba(P.umber, 0.42));
        g.fillStyle = gr; g.fillRect(0, 0, S.w, S.h);
        const L = lay(S);
        const rd = g.createLinearGradient(0, L.foot - S.u * 0.05, 0, S.h);
        rd.addColorStop(0, KK.rgba(P.apricot, 0));
        rd.addColorStop(0.5, KK.rgba(P.apricot, 0.22));
        rd.addColorStop(1, KK.rgba(P.umber, 0.25));
        g.fillStyle = rd; g.fillRect(0, L.foot - S.u * 0.05, S.w, S.h - (L.foot - S.u * 0.05));
        g.fillStyle = KK.rgba(P.cream, 0.2); g.fillRect(0, L.foot + S.u * 0.004, S.w, Math.max(1, S.u * 0.003)); // 腳下那條路
        st.base = c;
      }

      function jumpOf(k) { return k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0; }

      return {
        resize(S) { bakeBase(S); bakeScenes(S); },
        reset() { st.tapAt = -1e9; st.taps = []; },
        pointer(S, ev) {
          if (ev.type !== 'down') return;
          st.tapAt = S.now;
          st.taps.push({ x: ev.x, y: ev.y, born: S.now });
          if (st.taps.length > 5) st.taps.shift();
        },
        draw(g, S) {
          const t = S.t, w = S.w, h = S.h, u = S.u, ph = S.phase;
          const art = KK.Art;
          const L = lay(S);
          const wk = walkAt(L, t);
          const env = KK.smooth(0, 2.4, t) * (1 - KK.smooth(13.8, 15.9, t));

          // ---- 回憶濾鏡：燈下米 screen（極低透明度）＋暗角／路面光（1 次 drawImage）----
          if (env > 0.003) {
            g.save();
            g.globalCompositeOperation = 'screen';
            g.fillStyle = KK.rgba(KK.mix(P.cream, P.apricot, 0.5), 0.1 * env);
            g.fillRect(0, 0, w, h);
            g.restore();
            g.globalAlpha = env;
            g.drawImage(st.base, 0, 0);
            g.globalAlpha = 1;
            // ---- 一個又一個小小的世界 ----
            drawScenes(g, { w, h, u, t, phase: ph }, L, wk.x, env);
          }

          // ---- 主角 ----
          if (art && art.duo && art.duo.naturalWidth && wk.x > -L.W * 0.55 && wk.x < w + L.W * 0.55) {
            const H = L.H, W = L.W, k = H / art.duo.naturalHeight;
            const x = wk.x;
            // 走路彈跳與擺動
            const f = 2.0;
            const bob = Math.abs(Math.sin(t * TAU * f)) * H * 0.03 * wk.mv;
            const sway = Math.sin(t * TAU * f * 0.5) * 0.02 * wk.mv;
            // 排程跳躍（8.0–8.8）＋點一下的跳躍
            const jk = (t - T_JUMP) / 0.8;
            let jh = jumpOf(jk);
            const tapK = S.autoDemo ? -1 : (S.now - st.tapAt) / 0.6;
            jh = Math.max(jh, jumpOf(tapK));
            const jump = jh * H * 0.2;
            let sq = 0;                       // 起跳前蹲一下、落地壓一下
            if (jk > -0.15 && jk <= 0) sq = 0.05 * (1 + jk / 0.15);
            if (jk >= 1 && jk < 1.2) sq = 0.05 * (1 - (jk - 1) / 0.2);
            const yf = L.foot - bob - jump;

            // 身後的暖光暈與腳下影子
            g.save();
            g.globalCompositeOperation = 'screen';
            KK.drawSprite(g, KK.glow(P.apricot, 128), x, yf - H * 0.45, H * 2.1, 0.3 * env);
            g.restore();
            g.fillStyle = KK.rgba(P.umber, 0.28 * (1 - jh * 0.6));
            g.beginPath(); g.ellipse(x, L.foot + H * 0.012, W * 0.36 * (1 - jh * 0.25), H * 0.035, 0, 0, TAU); g.fill();

            g.save();
            g.translate(x, yf);
            g.rotate(sway);
            g.scale(1 + sq, 1 - sq);
            g.imageSmoothingQuality = 'high';
            g.drawImage(art.duo, -W / 2, -H, W, H);
            // 頭上三顆星：原圖相對位置，一閃一閃（整數週期）
            const meta = art.meta;
            if (meta && meta.stars) {
              meta.stars.forEach((s, i) => {
                const sx = -W / 2 + s.cx * k, sy = -H + s.cy * k;
                const n = 4 + i;                                  // 每顆不同整數週期，交錯閃
                const tw = 0.5 + 0.5 * Math.sin(ph * TAU * n + i * 2.1);
                const sc = 0.78 + 0.3 * tw;
                const sz = (s.dw || s.w) * k * sc, szh = (s.dh || s.h) * k * sc;
                g.save();
                g.globalCompositeOperation = 'screen';
                KK.drawSprite(g, KK.glow(P.page, 64), sx, sy, sz * 2.1, 0.55 * tw * env);   // 淡淡的暖色星暈，讓深色星星在暗處也看得到
                g.restore();
                g.globalAlpha = 0.65 + 0.35 * tw;
                g.drawImage(art.stars[i], sx - sz / 2, sy - szh / 2, sz, szh);
                g.globalAlpha = 1;
              });
            }
            g.restore();

            // 跳起來時的小星星（排程）：以小袋熊頭頂為中心的一圈
            const hx = x + (meta && meta.wombatInDuo ? (meta.wombatInDuo.x + meta.wombatInDuo.w * 0.5) * k - W / 2 : W * 0.2);
            const hy = yf - H + (meta && meta.wombatInDuo ? meta.wombatInDuo.y * k : H * 0.2);
            const bk = (t - (T_JUMP + 0.1)) / 1.5;
            if (bk > 0 && bk < 1) {
              for (let i = 0; i < 9; i++) {
                const an = -Math.PI / 2 + (i - 4) * 0.42 + (KK.hash(i, 3) - 0.5) * 0.2;
                const d = H * (0.12 + 0.34 * (1 - Math.pow(1 - bk, 2))) * (0.8 + KK.hash(i, 5) * 0.5);
                const al = Math.sin(bk * Math.PI);
                g.fillStyle = KK.rgba([P.cream, P.apricot, P.page][i % 3], 0.95 * al);
                star4(g, hx + Math.cos(an) * d, hy + Math.sin(an) * d - H * 0.05, H * (0.025 + KK.hash(i, 8) * 0.02) * (1 + 0.3 * Math.sin(bk * 14 + i)), i);
              }
            }
          }

          // ---- 點一下：點的地方冒幾顆小星星（S.now 計時，不影響 loop 本體）----
          st.taps = st.taps.filter((tp) => S.now - tp.born < 1.3 && S.now - tp.born >= -0.05);
          st.taps.forEach((tp) => {
            const age = Math.max(0, S.now - tp.born), q = age / 1.3;
            for (let i = 0; i < 6; i++) {
              const an = -Math.PI / 2 + (i - 2.5) * 0.55 + (KK.hash(i, 9) - 0.5) * 0.3;
              const d = u * (0.03 + 0.1 * (1 - Math.pow(1 - q, 2))) * (0.8 + KK.hash(i, 4) * 0.5);
              g.fillStyle = KK.rgba([P.cream, P.apricot, P.page][i % 3], 0.95 * Math.sin(q * Math.PI));
              star4(g, tp.x + Math.cos(an) * d, tp.y + Math.sin(an) * d, u * 0.016 * (1 + 0.3 * Math.sin(q * 14 + i)), i);
            }
          });

          KK.paper(g, S, { grain: 0.4, vignette: 0.4 });
        },
      };
    },
  });
})();
