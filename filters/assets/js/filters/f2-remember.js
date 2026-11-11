/* 2〈我記得〉跑回家吃飯：黃昏草坡上，姊弟兩個剪影追著跑向遠方冒著炊煙的家。
 *
 * 分鏡（14 秒無縫 loop）：
 *  1. t=0–1    畫面只有草坡、房子、炊煙；姊弟從左外側跑進畫面。
 *  2. t=1–9    兩人沿草坡追逐、中途交換領先（手臂擺動、身體彈跳）；上方紅蜻蜓盤旋、小鳥歸巢。
 *  3. t=9–11   越跑越近，門口亮起暖光，t≈11 兩人一起跑進門、淡出。
 *  4. t=11–13  窗戶變亮（回家吃飯了），只剩房子與炊煙。
 *  5. t=13–14  燈光慢慢回到平常的亮度，與 t=0 接得起來。
 * 炊煙每 1 秒一團、壽命 7 秒（7 整除 14）；蜻蜓、小鳥、窗光呼吸都轉整數圈。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  KK.defineFilter({
    id: 'remember',
    no: 2,
    song: '我記得',
    title: '跑回家吃飯',
    mood: '懷念・奔跑・被等待',
    duration: 14,
    hint: '點一下或滑過畫面，放出螢火蟲',
    critterHint: '遠坡坡頂：Kai 牽著小袋熊慢慢走向小屋，走到屋前淡出',
    create() {
      const st = { back: null, front: null, flies: [], lastSpawn: 0 };

      function bandUnit(S) { return S.u * (S.h >= S.w ? 1 : 0.95); }

      /* 草坡曲線：遠坡、奔跑坡（小孩的腳踩在這條線）、前景 */
      function farY(x) { const u = x / st.w; return st.h - st.b * (0.24 + 0.035 * u + 0.032 * Math.sin(u * 4.2 + 0.8) + 0.01 * Math.sin(u * 11)); }
      function runY(x) { const u = x / st.w; return st.h - st.b * (0.09 + 0.11 * u + 0.02 * Math.sin(u * 6.5 + 1.2) + 0.008 * Math.sin(u * 15)); }
      function fgY(x) { const u = x / st.w; return st.h - st.b * (0.032 + 0.014 * Math.sin(u * 5 + 2) + 0.008 * u); }

      function hill(g, yf, col, t, seed, amp) {
        const step = Math.max(8, st.w / 60);
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(-10, st.h + 10);
        let i = 0;
        for (let x = -10; x <= st.w + 10; x += step, i++) g.lineTo(x, yf(x) + KK.jit(seed + i * 3.1, t, amp));
        g.lineTo(st.w + 10, st.h + 10);
        g.closePath();
        g.fill();
      }

      /* 坡頂的黃昏逆光亮邊（杏色細線） */
      function rim(g, yf, a, t, seed) {
        const step = Math.max(8, st.w / 60);
        g.strokeStyle = KK.rgba(P.apricot, a);
        g.lineWidth = st.b * 0.0035; g.lineCap = 'round';
        g.beginPath();
        let i = 0;
        for (let x = -10; x <= st.w + 10; x += step, i++) {
          const y = yf(x) + KK.jit(seed + i * 3.1, t, st.b * 0.003) + 1;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }

      /* 手繪小草叢：幾根彎彎的草尖成一簇，加零星小點 */
      function tufts(g, yf, col, seed, gap, len, t) {
        const r = KK.rng(seed);
        g.strokeStyle = col; g.fillStyle = col; g.lineWidth = st.b * 0.0045; g.lineCap = 'round';
        g.beginPath();
        for (let x = r() * gap; x < st.w; x += gap * (0.5 + r() * 1.3)) {
          const y = yf(x) + len * 0.25 + r() * len * 0.8, n = 3 + Math.floor(r() * 2), L = len * (0.6 + r() * 0.8);
          for (let k = 0; k < n; k++) {
            const d = (k - (n - 1) / 2) * 0.55 + KK.jit(x + k, t, 0.06);
            g.moveTo(x + k * st.b * 0.003, y);
            g.quadraticCurveTo(x + d * L * 0.3, y - L * 0.7, x + d * L * 0.75, y - L * (0.8 + 0.2 * (k % 2)));
          }
        }
        g.stroke();
        for (let k = 0; k < st.w / (gap * 0.7); k++) {
          const x = r() * st.w, y = yf(x) + len * (0.4 + r() * 2);
          g.beginPath(); g.arc(x, y, st.b * (0.0025 + r() * 0.002), 0, TAU); g.fill();
        }
      }

      /* 房子幾何（與動態的窗光、門光共用） */
      function geom() {
        const b = st.b, hx = st.w * 0.8, base = runY(hx);
        const bw = b * 0.21, bh = b * 0.115, rh = b * 0.085, ov = b * 0.02;
        const chx = hx + bw * 0.2;
        const roofAt = (x) => base - bh - rh * (1 - Math.abs(x - hx) / (bw / 2 + ov));
        return {
          hx, base, bw, bh, rh, ov, chx, chTop: roofAt(chx) - b * 0.045,
          doorW: b * 0.032, doorH: b * 0.06,
          win: [[hx - bw * 0.3, base - bh * 0.6], [hx + bw * 0.3, base - bh * 0.6]], winS: b * 0.03,
        };
      }

      function drawHouse(g, t) {
        const G = st.G, b = st.b, a = b * 0.0025;
        g.fillStyle = KK.rgba(KK.mix(P.umber, P.brick, 0.18), 0.94);
        KK.wobPath(g, [[G.hx - G.bw / 2, G.base + b * 0.02], [G.hx - G.bw / 2, G.base - G.bh], [G.hx + G.bw / 2, G.base - G.bh], [G.hx + G.bw / 2, G.base + b * 0.02]], true, a, 11, t);
        g.fill();
        // 煙囪
        KK.wobPath(g, [[G.chx - b * 0.014, G.chTop + b * 0.06], [G.chx - b * 0.014, G.chTop], [G.chx + b * 0.014, G.chTop], [G.chx + b * 0.014, G.chTop + b * 0.06]], true, a * 0.6, 12, t);
        g.fill();
        // 磚紅屋頂
        g.fillStyle = KK.rgba(KK.mix(P.brick, P.umber, 0.55), 0.95);
        KK.wobPath(g, [[G.hx - G.bw / 2 - G.ov, G.base - G.bh + b * 0.004], [G.hx, G.base - G.bh - G.rh], [G.hx + G.bw / 2 + G.ov, G.base - G.bh + b * 0.004]], true, a, 13, t);
        g.fill();
        // 門
        g.fillStyle = KK.rgba(P.umber, 0.9);
        g.fillRect(G.hx - G.doorW / 2, G.base - G.doorH, G.doorW, G.doorH + b * 0.01);
      }

      function build(S) {
        st.w = S.w; st.h = S.h; st.b = bandUnit(S); st.G = geom();
        const b = st.b;
        const mk = (draw) => [0, 1, 2].map((v) => {
          const c = KK.canvas(S.w, S.h), g = c.getContext('2d');
          draw(g, v / KK.BOIL_FPS);
          return c;
        });
        st.back = mk((g, t) => {
          hill(g, farY, KK.rgba(KK.mix(KK.mix(P.moss, P.apricot, 0.12), P.umber, 0.4), 0.5), t, 100, b * 0.003);
          rim(g, farY, 0.14, t, 110);
          hill(g, runY, KK.rgba(KK.mix(KK.mix(P.moss, P.umber, 0.5), P.apricot, 0.08), 0.85), t, 200, b * 0.003);
          rim(g, runY, 0.32, t, 210);
          tufts(g, runY, KK.rgba(KK.mix(P.umber, P.moss, 0.15), 0.55), 21, b * 0.07, b * 0.022, t);
          tufts(g, farY, KK.rgba(KK.mix(P.moss, P.umber, 0.6), 0.4), 25, b * 0.12, b * 0.014, t);
          drawHouse(g, t);
        });
        st.front = mk((g, t) => {
          hill(g, fgY, KK.rgba(KK.mix(P.umber, P.moss, 0.22), 0.94), t, 300, b * 0.003);
          tufts(g, fgY, KK.rgba(KK.mix(P.umber, P.moss, 0.22), 0.95), 33, b * 0.09, b * 0.034, t);
        });
      }

      /* ---------- 小孩剪影（腳底為原點，面向右） ---------- */
      function drawKid(g, x, y, H, p, sis, alpha, t) {
        const col = KK.rgba(P.umber, 0.9 * alpha);
        const s = Math.sin(p), c = Math.cos(p);
        g.save();
        g.translate(x, y - Math.abs(s) * H * 0.07);
        g.strokeStyle = g.fillStyle = col;
        g.lineCap = 'round'; g.lineJoin = 'round';
        const hip = [0, -0.46 * H], sh = [H * 0.15, -0.76 * H];
        // 腿
        g.lineWidth = H * (sis ? 0.1 : 0.12);
        g.beginPath();
        for (const k of [1, -1]) {
          const a = s * k, lift = Math.max(0, c * k);
          g.moveTo(hip[0], hip[1]);
          g.quadraticCurveTo(a * 0.2 * H + 0.04 * H * (lift + 0.3), -0.25 * H, a * 0.44 * H, -lift * 0.2 * H);
        }
        g.stroke();
        // 手臂（與腿反向擺動，彎曲）
        g.lineWidth = H * 0.085;
        g.beginPath();
        for (const k of [1, -1]) {
          const a = -s * k;
          g.moveTo(sh[0], sh[1] + H * 0.02);
          g.quadraticCurveTo(sh[0] + a * 0.14 * H, -0.62 * H, sh[0] + a * 0.38 * H + 0.04 * H, -0.62 * H - Math.max(0, a) * 0.12 * H);
        }
        g.stroke();
        // 軀幹
        g.lineWidth = H * (sis ? 0.17 : 0.2);
        g.beginPath(); g.moveTo(hip[0], hip[1] + H * 0.02); g.lineTo(sh[0], sh[1]); g.stroke();
        // 裙擺
        if (sis) {
          const fl = Math.sin(p * 2) * H * 0.025;
          g.beginPath();
          g.moveTo(-H * 0.07, -0.56 * H); g.lineTo(H * 0.09, -0.56 * H);
          g.quadraticCurveTo(H * 0.2 + fl, -0.4 * H, H * 0.2, -0.3 * H);
          g.quadraticCurveTo(0, -0.27 * H + fl, -H * 0.2 - fl, -0.3 * H);
          g.quadraticCurveTo(-H * 0.14, -0.42 * H, -H * 0.07, -0.56 * H);
          g.closePath(); g.fill();
        }
        // 頭
        const hr = H * (sis ? 0.105 : 0.12), hx = sh[0] + H * 0.035, hy = -0.89 * H;
        g.beginPath(); g.arc(hx, hy, hr, 0, TAU); g.fill();
        // 馬尾 / 弟弟的小翹髮
        if (sis) {
          const sw = Math.sin(p - 0.8) * H * 0.13;
          g.lineWidth = H * 0.065;
          g.beginPath();
          g.moveTo(hx - hr * 0.8, hy - hr * 0.2);
          g.quadraticCurveTo(hx - hr * 2.4, hy - hr * 0.4 + sw, hx - hr * 3.0, hy + hr * 0.6 + sw * 1.6);
          g.stroke();
        } else {
          g.lineWidth = H * 0.04;
          g.beginPath(); g.moveTo(hx - hr * 0.2, hy - hr * 0.9); g.lineTo(hx - hr * 0.5, hy - hr * 1.5); g.stroke();
        }
        g.restore();
      }

      function drawBird(g, x, y, s, flap, alpha) {
        g.strokeStyle = KK.rgba(P.umber, alpha);
        g.lineWidth = s * 0.16; g.lineCap = 'round';
        const wy = Math.sin(flap) * s * 0.5;
        g.beginPath();
        g.moveTo(x - s, y - wy);
        g.quadraticCurveTo(x - s * 0.4, y - s * 0.1 - wy * 0.5, x, y);
        g.quadraticCurveTo(x + s * 0.4, y - s * 0.1 - wy * 0.5, x + s, y - wy);
        g.stroke();
      }

      function drawDragonfly(g, x, y, ang, L, t) {
        g.save();
        g.translate(x, y); g.rotate(ang);
        const fl = 0.35 + 0.65 * Math.abs(Math.sin(t * TAU * 7));
        g.fillStyle = KK.rgba(P.cream, 0.5);
        for (const [dx, k] of [[-0.12, 1], [0.12, 1]]) {
          for (const side of [-1, 1]) {
            g.beginPath();
            g.ellipse(dx * L, 0, L * 0.3, L * 0.09 * fl, side * 0.5 * -k + (dx > 0 ? 0.3 : -0.3) * side * 0, 0, TAU);
            g.save(); g.translate(0, side * L * 0.04 * fl); g.fill(); g.restore();
          }
        }
        g.strokeStyle = KK.rgba(P.brick, 0.95); g.lineCap = 'round';
        g.lineWidth = L * 0.07;
        g.beginPath(); g.moveTo(-L * 0.55, 0); g.lineTo(L * 0.35, 0); g.stroke();
        g.fillStyle = KK.rgba(P.brick, 0.95);
        g.beginPath(); g.arc(L * 0.4, 0, L * 0.085, 0, TAU); g.fill();
        g.restore();
      }

      function spawnFly(S, x, y) {
        if (st.flies.length >= 40) st.flies.shift();
        st.flies.push({ x: x + (Math.random() - 0.5) * st.b * 0.05, y: y + (Math.random() - 0.5) * st.b * 0.05, born: S.now, seed: Math.random() * 10 });
      }

      function drawFly(g, spr, x, y, age, seed, b) {
        const env = KK.smooth(0, 0.3, age) * (1 - KK.smooth(1.8, 2.7, age));
        if (env <= 0) return;
        const fx = x + Math.sin(age * 2.4 + seed) * b * 0.018;
        const fy = y - age * b * 0.045;
        const fl = 0.55 + 0.45 * Math.sin(age * 9 + seed * 7);
        KK.drawSprite(g, spr, fx, fy, b * 0.045, env * fl);
        KK.drawSprite(g, spr, fx, fy, b * 0.014, env * Math.min(1, fl + 0.3));
      }

      return {
        resize(S) { build(S); st.flies = []; },
        reset() { st.flies = []; },
        pointer(S, ev) {
          if (ev.type === 'down') {
            for (let i = 0; i < 5; i++) spawnFly(S, ev.x, ev.y);
            st.lastSpawn = S.now;
          } else if (ev.type === 'move' && S.now - st.lastSpawn > 0.09) {
            spawnFly(S, ev.x, ev.y);
            st.lastSpawn = S.now;
          }
        },
        draw(g, S) {
          const t = S.t, ph = S.phase, b = st.b, w = S.w, h = S.h, G = st.G, u = S.u;
          const bi = KK.boil(t);

          // 黃昏天色（screen，低透明度，不蓋臉）
          g.save();
          g.globalCompositeOperation = 'screen';
          const sk = g.createLinearGradient(0, 0, 0, h * 0.32);
          sk.addColorStop(0, KK.rgba(P.apricot, 0.3));
          sk.addColorStop(1, KK.rgba(P.apricot, 0));
          g.fillStyle = sk;
          g.fillRect(0, 0, w, h * 0.32);
          // 左上角低垂的夕陽
          const br = 1 + 0.04 * Math.sin(ph * TAU * 2);
          KK.drawSprite(g, KK.glow(P.apricot, 256), w * 0.1, u * 0.1, u * 1.6 * br, 0.75);
          KK.drawSprite(g, KK.glow(P.cream, 128), w * 0.1, u * 0.1, u * 0.3 * br, 0.4);
          g.restore();

          // 草坡＋房子
          g.drawImage(st.back[bi], 0, 0);

          // 窗光與門光
          const boost = 0.3 * KK.smooth(11.2, 12, t) * (1 - KK.smooth(13, 14, t));
          const winA = 0.68 + 0.1 * Math.sin(ph * TAU * 3) + boost;
          const doorA = KK.smooth(10.3, 11.2, t) * (1 - KK.smooth(12, 13.6, t));
          const open = KK.smooth(10.6, 11, t) * (1 - KK.smooth(11.9, 12.6, t));
          g.save();
          g.globalCompositeOperation = 'screen';
          G.win.forEach((p) => {
            KK.drawSprite(g, KK.glow(P.apricot, 96), p[0], p[1], b * 0.2, winA * 0.8);
            KK.drawSprite(g, KK.glow(P.cream, 48), p[0], p[1], b * 0.06, winA * 0.7);
          });
          KK.drawSprite(g, KK.glow(P.apricot, 128), G.hx, G.base - G.doorH * 0.4, b * 0.34, doorA * 0.9);
          KK.drawSprite(g, KK.glow(P.apricot, 64), G.hx, G.base - G.doorH * 0.4, b * 0.08, 0.3 + 0.5 * open);
          g.restore();
          g.fillStyle = KK.rgba(P.page, 0.95);
          G.win.forEach((p) => {
            g.globalAlpha = Math.min(1, winA);
            g.fillRect(p[0] - G.winS / 2, p[1] - G.winS / 2, G.winS, G.winS);
            g.globalAlpha = Math.min(1, winA) * 0.7;
            g.fillStyle = KK.rgba(P.umber, 0.8);
            g.fillRect(p[0] - G.winS * 0.04, p[1] - G.winS / 2, G.winS * 0.08, G.winS);
            g.fillStyle = KK.rgba(P.page, 0.95);
          });
          g.globalAlpha = open;
          g.fillStyle = KK.rgba(P.cream, 0.95);
          g.fillRect(G.hx - G.doorW / 2, G.base - G.doorH, G.doorW, G.doorH + b * 0.01);
          g.globalAlpha = 1;

          // 炊煙：細細一縷、S 形捲曲；每 0.5 秒一團、壽命 7 秒（整除 14）
          const smk = KK.glow(P.cream, 64, 0.1);
          const wind = 0.7 * Math.sin(ph * TAU);
          for (let i = 0; i < 14; i++) {
            const age = KK.mod(t - i * 0.5, 7), k = age / 7;
            const env = KK.smooth(0, 0.1, k) * (1 - KK.smooth(0.3, 1, k));
            if (env <= 0.01) continue;
            const sway = b * 0.03 * (0.3 + 1.6 * k) * Math.sin(k * TAU * 1.3 + wind);
            const x = G.chx + sway + k * b * 0.05 + Math.sin(age * 2.6 + i) * b * 0.004;
            const y = G.chTop - k * b * 0.45;
            const r = b * (0.006 + 0.024 * k);
            KK.drawSprite(g, smk, x, y, r * 6.5, env * 0.42);
          }

          // 歸巢的小鳥
          for (let i = 0; i < 2; i++) {
            const k = KK.mod(ph + i * 0.37 + 0.1, 1);
            const x = KK.lerp(-b * 0.1, w + b * 0.1, k);
            const y = u * (0.16 + i * 0.05) + Math.sin(k * TAU) * b * 0.02 + KK.smooth(0.5, 1, k) * b * 0.08;
            drawBird(g, x, y, b * 0.016, t * TAU * 3 + i * 2, 0.75);
          }

          // 紅蜻蜓（上方與側邊盤旋）
          [[0.7, 0.07, 0.14, 2, 3, 0], [0.12, 0.33, 0.12, 3, 2, 2], [0.9, 0.3, 0.1, 2, 3, 4]].forEach((d) => {
            const cx = w * d[0], cy = d[1] * h > u * 0.42 && h > w ? d[1] * h : Math.min(d[1] * h, h * 0.4) + (h > w ? 0 : u * 0.08);
            const A = u * d[2] * 0.6;
            const ax = ph * TAU * d[3] + d[5], ay = ph * TAU * d[4] + d[5] * 2;
            const x = cx + Math.sin(ax) * A, y = cy + Math.sin(ay) * A * 0.55;
            const vx = Math.cos(ax) * d[3] * A, vy = Math.cos(ay) * d[4] * A * 0.55;
            drawDragonfly(g, x, y, Math.atan2(vy, vx), u * 0.048, t);
          });

          // 小動物（Kai 牽著小袋熊）：沿遠坡坡頂慢慢走向小屋，走到屋前淡出（偷偷的；跟姊弟追逐是兩條不同的路）
          if (S.critter) {
            const cs = u * 0.05, cw = cs * 1.3;
            const xEnd = G.hx - G.bw / 2 - cw * 0.5;
            const x = KK.lerp(-cw, xEnd, ph);
            const al = 0.8 * KK.smooth(0.02, 0.1, ph) * (1 - KK.smooth(0.86, 0.98, ph));
            if (al > 0.01) KK.Critter.draw(g, x, farY(x) + cs * 0.06, cs, { pose: 'walk', facing: 1, alpha: al, tone: 0.45, t });
          }

          // 姊弟追逐
          const RUN = 11, k = Math.min(t / RUN, 1);
          if (t < RUN + 0.5) {
            const fade = 1 - KK.smooth(10.8, 11.3, t);
            const base = KK.lerp(-b * 0.32, G.hx - b * 0.02, k);
            const sep = b * 0.11 * Math.sin(k * TAU * 1.5 + 1) * (1 - KK.smooth(0.8, 1, k));
            const Hs = u * 0.13, Hb = u * 0.11;
            const f = t * TAU / 0.52;
            const xb = base - sep / 2, xs = base + sep / 2;
            // 離房子近時兩人略分層，弟弟在前（先到門口）
            const order = sep > 0 ? [[xb, Hb, f + 1.2, false], [xs, Hs, f, true]] : [[xs, Hs, f, true], [xb, Hb, f + 1.2, false]];
            order.forEach((o) => {
              if (o[0] > -b * 0.1 && o[0] < w + b * 0.1 && fade > 0.01) drawKid(g, o[0], runY(o[0]), o[1], o[2], o[3], fade, t);
            });
          }

          // 前景草叢（蓋住小動物的身體）
          g.drawImage(st.front[bi], 0, 0);

          // 螢火蟲
          g.save();
          g.globalCompositeOperation = 'screen';
          const spr = KK.glow(P.page, 64);
          if (S.autoDemo) {
            for (let i = 0; i < 14; i++) {
              const age = KK.mod(t - i * 1, 14);
              if (age > 2.7) continue;
              const x = w * (0.18 + 0.64 * KK.hash(i, 3)), y = h * (0.5 + 0.3 * KK.hash(i, 9));
              drawFly(g, spr, x, y, age, i * 1.3, b);
            }
          } else {
            st.flies = st.flies.filter((f) => S.now - f.born < 2.7);
            st.flies.forEach((f) => drawFly(g, spr, f.x, f.y, S.now - f.born, f.seed, b));
          }
          g.restore();

          KK.paper(g, S, { grain: 0.45, vignette: 0.45 });
        },
      };
    },
  });
})();
