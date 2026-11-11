/* 1〈Hey There Delilah〉忙碌的紐約：下緣天際線＋街道（計程車、公車、行人左右穿梭），
 * 上緣飛機、鴿子、一架紙飛機（寄給遠方的信）。點一下畫面放飛鴿子。
 * 路邊有熱狗推車與消防栓；小動物坐在左側屋頂邊緣、水塔旁。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL;

  KK.defineFilter({
    id: 'delilah',
    no: 1,
    song: 'Hey There Delilah',
    title: '忙碌的紐約',
    mood: '可愛・熱鬧・寄給遠方',
    duration: 16,
    hint: '點一下畫面，放飛一群鴿子',
    critterHint: '左側屋頂邊緣、水塔旁，半身沉在屋頂後只露頭和耳朵，與樓房同色',
    create() {
      const st = { sky: null, key: '', birds: [] };

      // 天際線單位（橫式縮小，讓下緣不超過約 35% 高度）；路面與車、人另用較大的單位，橫式也看得清楚
      function bandUnit(S) { return S.u * (S.h >= S.w ? 1 : 0.6); }
      function roadUnit(S) { return S.u * (S.h >= S.w ? 1 : 0.9); }
      // 上緣（飛機、鴿群、紙飛機）單位：比下緣大，才看得見
      function topUnit(S) { return S.u * 1.6; }

      /* ---------- 天際線（每種手抖各畫一張快取） ---------- */
      function buildSkyline(S) {
        const b = bandUnit(S);
        const r = KK.rng(1987);
        const top = Math.ceil(b * 0.62);
        const far = [], near = [];
        let x = -b * 0.05;
        while (x < S.w + b * 0.1) {
          const bw = b * (0.08 + r() * 0.1);
          far.push({ x, w: bw, h: b * (0.14 + r() * 0.2), kind: r() < 0.25 ? 'step' : 'plain' });
          x += bw * (0.85 + r() * 0.3);
        }
        x = -b * 0.03;
        let i = 0;
        while (x < S.w + b * 0.1) {
          const bw = b * (0.09 + r() * 0.08);
          let kind = 'plain';
          const roll = r();
          if (roll < 0.28) kind = 'water';
          else if (roll < 0.42) kind = 'step';
          near.push({ x, w: bw, h: b * (0.07 + r() * 0.13), kind, fire: r() < 0.35 });
          x += bw * (0.95 + r() * 0.12);
          i++;
        }
        // 一棟有尖塔的高樓（像帝國大廈的剪影，但不是任何真實建築的描摹）
        const spireX = S.w * 0.68;
        far.push({ x: spireX - b * 0.06, w: b * 0.12, h: b * (S.h >= S.w ? 0.33 : 0.28), kind: 'spire' });
        // 保證一棟水塔大樓在左側，讓小動物有地方坐
        const homeIdx = near.findIndex((n) => n.x > S.w * 0.14);
        if (homeIdx >= 0) { near[homeIdx].kind = 'water'; near[homeIdx].h = b * 0.15; near[homeIdx].w = Math.max(near[homeIdx].w, b * 0.17); }
        st.home = near[homeIdx];
        st.top = top;
        st.far = far; st.near = near; st.b = b; st.rb = roadUnit(S); st.tb = topUnit(S);
        // 會亮滅的窗戶
        st.windows = [];
        near.forEach((n, k) => {
          const cols = Math.max(1, Math.floor(n.w / (b * 0.028)));
          const rows = Math.max(1, Math.floor(n.h / (b * 0.035)));
          for (let cx = 0; cx < cols; cx++)
            for (let ry = 0; ry < rows; ry++) {
              const hv = KK.hash(k * 17 + cx, ry * 5 + 3);
              if (hv < 0.42) st.windows.push({ n, cx, ry, cols, rows, on: hv, blink: KK.hash(k, cx * 9 + ry) });
            }
        });
        st.sky = [0, 1, 2].map((v) => renderSky(S, v / KK.BOIL_FPS));
      }

      function drawBuilding(g, B, groundY, t, seed, col, b) {
        const x0 = B.x, x1 = B.x + B.w, y0 = groundY - B.h;
        const a = b * 0.0035;
        let pts;
        if (B.kind === 'step') {
          const s = B.w * 0.18, sh = b * 0.035;
          pts = [[x0, groundY], [x0, y0 + sh], [x0 + s, y0 + sh], [x0 + s, y0], [x1 - s, y0], [x1 - s, y0 + sh], [x1, y0 + sh], [x1, groundY]];
        } else if (B.kind === 'spire') {
          const m = (x0 + x1) / 2;
          pts = [[x0, groundY], [x0, y0 + b * 0.08], [x0 + B.w * 0.15, y0 + b * 0.08], [x0 + B.w * 0.15, y0 + b * 0.04],
            [x0 + B.w * 0.32, y0 + b * 0.04], [x0 + B.w * 0.32, y0], [x1 - B.w * 0.32, y0], [x1 - B.w * 0.32, y0 + b * 0.04],
            [x1 - B.w * 0.15, y0 + b * 0.04], [x1 - B.w * 0.15, y0 + b * 0.08], [x1, y0 + b * 0.08], [x1, groundY]];
          g.fillStyle = col;
          KK.wobPath(g, [[m - b * 0.02, y0], [m - b * 0.008, y0 - b * 0.05], [m, y0 - b * 0.11], [m + b * 0.008, y0 - b * 0.05], [m + b * 0.02, y0]], true, a, seed + 9, t);
          g.fill();
        } else {
          pts = [[x0, groundY], [x0, y0], [x1, y0], [x1, groundY]];
        }
        g.fillStyle = col;
        KK.wobPath(g, pts, true, a, seed, t);
        g.fill();
        if (B.kind === 'water') {
          // 屋頂水塔：細腳＋木桶＋尖頂
          const cx = x0 + B.w * 0.62, tw = b * 0.045, th = b * 0.045, ly = y0;
          g.strokeStyle = col;
          g.lineWidth = b * 0.005;
          g.beginPath();
          g.moveTo(cx - tw * 0.4, ly); g.lineTo(cx - tw * 0.35, ly - b * 0.025);
          g.moveTo(cx + tw * 0.4, ly); g.lineTo(cx + tw * 0.35, ly - b * 0.025);
          g.moveTo(cx - tw * 0.4, ly - b * 0.012); g.lineTo(cx + tw * 0.4, ly - b * 0.012);
          g.stroke();
          const by = ly - b * 0.025;
          KK.wobPath(g, [[cx - tw / 2, by], [cx - tw / 2, by - th], [cx, by - th - b * 0.022], [cx + tw / 2, by - th], [cx + tw / 2, by]], true, a, seed + 4, t);
          g.fill();
          B.towerTop = { x: cx, y: by - th - b * 0.006 };
        }
      }

      function renderSky(S, t) {
        const b = st.b;
        const c = KK.canvas(S.w, st.top + 2);
        const g = c.getContext('2d');
        const groundY = st.top;
        // 遠景：霧藍、半透明
        st.far.forEach((B, i) => drawBuilding(g, B, groundY, t, i * 13 + 1, KK.rgba(KK.mix(KK.mix(P.night, P.mist, 0.35), P.umber, 0.2), 0.62), b));
        // 近景：夜墨藍混約 25% 炭褐，與暖燈書牆更協調
        st.near.forEach((B, i) => {
          drawBuilding(g, B, groundY, t, i * 29 + 300, KK.rgba(KK.mix(P.night, P.umber, 0.25), 0.92), b);
          if (B.fire) {
            // 防火梯的之字線
            g.strokeStyle = KK.rgba(P.page, 0.28);
            g.lineWidth = b * 0.003;
            g.beginPath();
            const fx = B.x + B.w * 0.12, fw = B.w * 0.3;
            for (let y = groundY - b * 0.03, k = 0; y > groundY - B.h + b * 0.02; y -= b * 0.03, k++) {
              g.moveTo(fx, y); g.lineTo(fx + fw, y);
              g.moveTo(fx + (k % 2 ? 0 : fw), y); g.lineTo(fx + (k % 2 ? fw : 0), y - b * 0.03);
            }
            g.stroke();
          }
        });
        return c;
      }

      /* ---------- 車子 ---------- */
      const CARS_NEAR = [
        { type: 'taxi', off: 0.0 }, { type: 'sedan', off: 0.27 }, { type: 'taxi', off: 0.52 }, { type: 'taxi', off: 0.78 },
      ];
      const CARS_FAR = [
        { type: 'bus', off: 0.05 }, { type: 'taxi', off: 0.4 }, { type: 'van', off: 0.68 },
      ];
      function drawCar(g, x, y, dir, type, b, t, seed) {
        const L = type === 'bus' ? b * 0.27 : type === 'van' ? b * 0.15 : b * 0.135;
        const H = type === 'bus' ? b * 0.06 : b * 0.036;
        const body = type === 'taxi' ? P.ochre : type === 'sedan' ? P.brick : type === 'bus' ? KK.mix(P.mist, P.night, 0.25) : KK.mix(P.page, P.umber, 0.35);
        const bounce = Math.abs(Math.sin(t * KK.TAU * 3 + seed)) * b * 0.002;
        g.save();
        g.translate(x, y - bounce);
        g.scale(dir, 1);
        const a = b * 0.0025;
        // 車頭燈光暈
        KK.drawSprite(g, KK.glow(P.cream, 64), L * 0.55, -H * 0.35, b * 0.12, 0.35);
        g.fillStyle = body;
        if (type === 'bus') {
          KK.wobPath(g, [[-L / 2, 0], [-L / 2, -H], [L / 2 - b * 0.01, -H], [L / 2, -H * 0.7], [L / 2, 0]], true, a, seed, t);
          g.fill();
          g.fillStyle = KK.rgba(P.cream, 0.75);
          for (let i = 0; i < 6; i++) g.fillRect(-L / 2 + b * 0.012 + i * L * 0.155, -H * 0.82, L * 0.11, H * 0.32);
        } else {
          const cab = type === 'van' ? 0.85 : 0.62;
          KK.wobPath(g, [[-L / 2, 0], [-L / 2, -H * 0.62], [-L * 0.3, -H * 0.66], [-L * 0.2, -H * 1.18 * cab / 0.62 * 0.62 - H * 0.5],
            [L * 0.18, -H * 1.12], [L * 0.32, -H * 0.66], [L / 2, -H * 0.55], [L / 2, 0]], true, a, seed, t);
          g.fill();
          g.fillStyle = KK.rgba(P.night, 0.55);
          KK.wobPath(g, [[-L * 0.18, -H * 0.7], [-L * 0.13, -H * 1.02], [L * 0.14, -H * 1.0], [L * 0.24, -H * 0.7]], true, a * 0.6, seed + 3, t);
          g.fill();
          if (type === 'taxi') {
            // 車頂燈牌（亮著，微微呼吸）
            KK.drawSprite(g, KK.glow(P.cream, 48), L * 0.005, -H * 1.25, L * 0.4, 0.35 + 0.15 * Math.sin(t * KK.TAU + seed));
            g.fillStyle = P.cream;
            g.fillRect(-L * 0.06, -H * 1.32, L * 0.13, H * 0.18);
            // 車身格紋帶
            g.fillStyle = KK.rgba(P.umber, 0.55);
            for (let i = 0; i < 8; i++) if (i % 2 === 0) g.fillRect(-L * 0.4 + i * L * 0.1, -H * 0.4, L * 0.1, H * 0.12);
          }
        }
        // 輪子
        g.fillStyle = P.umber;
        for (const wx of [-L * 0.3, L * 0.3]) {
          g.beginPath(); g.arc(wx, 0, b * 0.016, 0, KK.TAU); g.fill();
        }
        g.fillStyle = KK.rgba(P.page, 0.7);
        for (const wx of [-L * 0.3, L * 0.3]) {
          g.beginPath(); g.arc(wx, 0, b * 0.005, 0, KK.TAU); g.fill();
        }
        g.restore();
      }

      /* ---------- 行人 ---------- */
      const PEOPLE = [
        { dir: 1, off: 0.05, kind: 'umbrella' }, { dir: -1, off: 0.18, kind: 'hat' },
        { dir: 1, off: 0.36, kind: 'dog' }, { dir: -1, off: 0.5, kind: 'bag' },
        { dir: 1, off: 0.66, kind: 'kid' }, { dir: -1, off: 0.83, kind: 'plain' },
      ];
      function drawPerson(g, x, y, dir, kind, b, t, seed) {
        const hgt = b * (kind === 'kid' ? 0.05 : 0.075);
        const ph = t * KK.TAU * 2 + seed;
        const sw = Math.sin(ph) * 0.45;
        g.save();
        g.translate(x, y - Math.abs(Math.cos(ph)) * hgt * 0.03);
        g.scale(dir, 1);
        g.strokeStyle = g.fillStyle = KK.rgba(P.umber, 0.92);
        g.lineCap = 'round';
        g.lineWidth = hgt * 0.13;
        // 腿
        g.beginPath();
        g.moveTo(0, -hgt * 0.42); g.lineTo(Math.sin(sw) * hgt * 0.32, 0);
        g.moveTo(0, -hgt * 0.42); g.lineTo(-Math.sin(sw) * hgt * 0.32, 0);
        // 手
        g.moveTo(0, -hgt * 0.72); g.lineTo(-Math.sin(sw) * hgt * 0.22, -hgt * 0.45);
        g.stroke();
        // 身體
        g.beginPath();
        g.ellipse(0, -hgt * 0.62, hgt * 0.13, hgt * 0.22, 0, 0, KK.TAU);
        g.fill();
        // 頭
        g.beginPath();
        g.arc(0, -hgt * 0.92, hgt * 0.1, 0, KK.TAU);
        g.fill();
        if (kind === 'hat') {
          g.fillRect(-hgt * 0.14, -hgt * 1.02, hgt * 0.28, hgt * 0.04);
          g.fillRect(-hgt * 0.08, -hgt * 1.12, hgt * 0.16, hgt * 0.1);
        } else if (kind === 'umbrella') {
          g.beginPath();
          g.moveTo(hgt * 0.05, -hgt * 0.7); g.lineTo(hgt * 0.05, -hgt * 1.25);
          g.stroke();
          g.fillStyle = KK.rgba(P.brick, 0.9);
          g.beginPath();
          g.moveTo(-hgt * 0.32, -hgt * 1.2);
          g.quadraticCurveTo(hgt * 0.05, -hgt * 1.6, hgt * 0.42, -hgt * 1.2);
          g.closePath();
          g.fill();
        } else if (kind === 'bag') {
          g.fillRect(hgt * 0.12, -hgt * 0.5, hgt * 0.18, hgt * 0.14);
        } else if (kind === 'dog') {
          // 狗狗走在前面
          const dx = hgt * 0.55;
          g.beginPath();
          g.moveTo(Math.sin(sw) * hgt * 0.1, -hgt * 0.5);
          g.lineTo(dx, -hgt * 0.2);
          g.lineWidth = hgt * 0.025;
          g.stroke();
          g.beginPath();
          g.ellipse(dx + hgt * 0.1, -hgt * 0.14, hgt * 0.14, hgt * 0.06, 0, 0, KK.TAU);
          g.arc(dx + hgt * 0.24, -hgt * 0.2, hgt * 0.05, 0, KK.TAU);
          g.fill();
          g.lineWidth = hgt * 0.04;
          g.beginPath();
          g.moveTo(dx, -hgt * 0.1); g.lineTo(dx + Math.sin(sw) * hgt * 0.05, 0);
          g.moveTo(dx + hgt * 0.2, -hgt * 0.1); g.lineTo(dx + hgt * 0.2 - Math.sin(sw) * hgt * 0.05, 0);
          g.stroke();
        }
        g.restore();
      }

      /* 熱狗推車：木箱＋條紋傘＋兩個小輪，蒸氣是三顆循環升起的暖白小圓（整數圈，無縫） */
      function drawCart(g, x, y, rb, t) {
        const u = rb;
        g.save();
        g.translate(x, y);
        g.fillStyle = KK.rgba(P.umber, 0.95);
        g.fillRect(-u * 0.003, -u * 0.05, u * 0.006, u * 0.034);          // 傘柄
        g.fillStyle = KK.rgba(P.page, 0.9);
        g.fillRect(-u * 0.036, -u * 0.036, u * 0.072, u * 0.026);          // 箱體
        g.fillStyle = KK.rgba(P.brick, 0.95);
        g.fillRect(-u * 0.036, -u * 0.026, u * 0.072, u * 0.008);          // 紅色腰帶
        // 條紋傘（磚紅／米色相間）
        const ur = u * 0.045;
        for (let k = 0; k < 4; k++) {
          g.fillStyle = k % 2 ? KK.rgba(P.cream, 0.95) : KK.rgba(P.brick, 0.95);
          g.beginPath();
          g.moveTo(-ur + k * ur * 0.5, -u * 0.05);
          g.quadraticCurveTo(-ur + k * ur * 0.5 + ur * 0.25, -u * 0.075, -ur + (k + 1) * ur * 0.5, -u * 0.05);
          g.closePath(); g.fill();
        }
        g.fillStyle = KK.rgba(P.umber, 0.95);
        for (const wx of [-u * 0.022, u * 0.022]) { g.beginPath(); g.arc(wx, -u * 0.008, u * 0.008, 0, KK.TAU); g.fill(); }
        // 蒸氣
        for (let k = 0; k < 3; k++) {
          const q = KK.mod(t / 4 + k / 3, 1);
          KK.drawSprite(g, KK.glow(P.cream, 32), u * 0.012 + Math.sin(q * KK.TAU * 2 + k) * u * 0.008, -u * 0.04 - q * u * 0.05, u * (0.014 + q * 0.012), 0.5 * Math.sin(q * Math.PI));
        }
        g.restore();
      }
      /* 消防栓：磚紅小圓柱＋帽 */
      function drawHydrant(g, x, y, rb) {
        const u = rb;
        g.save();
        g.translate(x, y);
        g.fillStyle = KK.rgba(P.brick, 0.95);
        g.fillRect(-u * 0.008, -u * 0.032, u * 0.016, u * 0.032);
        g.beginPath(); g.arc(0, -u * 0.032, u * 0.009, Math.PI, 0); g.fill();
        g.fillRect(-u * 0.013, -u * 0.022, u * 0.026, u * 0.006);
        g.fillStyle = KK.rgba(P.page, 0.7);
        g.fillRect(-u * 0.002, -u * 0.043, u * 0.004, u * 0.004);
        g.restore();
      }

      function drawBird(g, x, y, s, flap, alpha) {
        g.strokeStyle = KK.rgba(P.cream, alpha);
        g.lineWidth = s * 0.16;
        g.lineCap = 'round';
        const wy = Math.sin(flap) * s * 0.45;
        g.beginPath();
        g.moveTo(x - s, y - wy);
        g.quadraticCurveTo(x - s * 0.4, y - s * 0.1 - wy * 0.5, x, y);
        g.quadraticCurveTo(x + s * 0.4, y - s * 0.1 - wy * 0.5, x + s, y - wy);
        g.stroke();
      }

      return {
        resize(S) {
          buildSkyline(S);
          st.birds = [];
        },
        reset() { st.birds = []; },
        pointer(S, ev) {
          if (ev.type !== 'down') return;
          if (st.birds.length > 18) st.birds.splice(0, 6);
          for (let i = 0; i < 6; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
            const sp = st.b * (0.35 + Math.random() * 0.35);
            st.birds.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, born: S.now, seed: Math.random() * 10 });
          }
        },
        draw(g, S) {
          const t = S.t, ph = S.phase, b = st.b, rb = st.rb, tb = st.tb, w = S.w, h = S.h;
          const roadTop = h - rb * 0.12;
          // 城市燈火的暖色地氣
          g.save();
          g.globalCompositeOperation = 'screen';
          const gl = g.createLinearGradient(0, h, 0, h - b * 0.75);
          gl.addColorStop(0, KK.rgba(P.apricot, 0.32));
          gl.addColorStop(1, KK.rgba(P.apricot, 0));
          g.fillStyle = gl;
          g.fillRect(0, h - b * 0.75, w, b * 0.75);
          g.restore();

          // 天際線
          const sky = st.sky[KK.boil(t)];
          const skyY = roadTop - st.top;
          g.drawImage(sky, 0, skyY);
          // 亮滅的窗戶
          g.fillStyle = KK.rgba(P.page, 0.8);
          st.windows.forEach((wd) => {
            const n = wd.n;
            const cw = n.w / wd.cols;
            const lit = Math.sin(ph * KK.TAU * (1 + Math.floor(wd.blink * 3)) + wd.blink * 20) > -0.55;
            if (!lit) return;
            const rh = n.h / (wd.rows + 0.5);
            const x = n.x + wd.cx * cw + cw * 0.3;
            const y = roadTop - n.h + wd.ry * rh + rh * 0.45;
            g.globalAlpha = 0.45 + wd.on;
            g.fillRect(x, y, cw * 0.36, rh * 0.38);
          });
          g.globalAlpha = 1;

          // 小動物：沉在左側屋頂邊緣、水塔旁，顏色同樓房剪影，不加光；只露出頭和耳朵，輪流看左右（偷偷的）
          if (S.critter && st.home) {
            const hm = st.home;
            const cs = rb * 0.032;
            const cx = hm.x + hm.w * 0.2, cy = skyY + st.top - hm.h + cs * (KK.Critter.kind === 'cat' ? 0.62 : 0.42);
            const look = KK.mod(t, 16) > 8 ? -1 : 1;
            KK.Critter.draw(g, cx, cy, cs, { pose: 'sit', facing: look, color: KK.rgba(KK.mix(P.night, P.umber, 0.25), 0.92), t, eyeColor: KK.mix(P.night, P.page, 0.4), t });
          }

          // 馬路
          g.fillStyle = KK.rgba(P.umber, 0.86);
          KK.wobPath(g, [[-10, roadTop], [w + 10, roadTop], [w + 10, h + 10], [-10, h + 10]], true, rb * 0.002, 77, t);
          g.fill();
          g.strokeStyle = KK.rgba(P.page, 0.45);
          g.lineWidth = rb * 0.004;
          g.setLineDash([rb * 0.04, rb * 0.035]);
          g.beginPath();
          g.moveTo(0, roadTop + rb * 0.045); g.lineTo(w, roadTop + rb * 0.045);
          g.stroke();
          g.setLineDash([]);
          // 人行道
          g.fillStyle = KK.rgba(KK.mix(P.umber, P.page, 0.25), 0.92);
          g.fillRect(0, h - rb * 0.03, w, rb * 0.03);

          // 路邊小物：熱狗推車（蒸氣一圈圈升起）、消防栓（都貼在人行道上，行人從前面走過）
          drawCart(g, w * 0.33, h - rb * 0.012, rb * 1.3, t);
          drawHydrant(g, w * 0.86, h - rb * 0.012, rb * 1.3);

          // 遠車道（右→左，慢）、近車道（左→右，快）
          const m = rb * 0.3;
          CARS_FAR.forEach((c, i) => drawCar(g, KK.cross(ph, 1, c.off, w + m, -m), roadTop + rb * 0.038, -1, c.type, rb * 0.85, t, i * 3.3));
          CARS_NEAR.forEach((c, i) => drawCar(g, KK.cross(ph, 2, c.off, -m, w + m), roadTop + rb * 0.088, 1, c.type, rb, t, i * 2.1 + 7));
          // 行人
          PEOPLE.forEach((p, i) => {
            const x = p.dir > 0 ? KK.cross(ph, 1, p.off, -rb * 0.15, w + rb * 0.15) : KK.cross(ph, 1, p.off, w + rb * 0.15, -rb * 0.15);
            drawPerson(g, x, h - rb * 0.006, p.dir, p.kind, rb, t, i * 1.7);
          });

          // 上緣：飛機（右→左）＋凝結尾（米色、放大，才讀得出來）
          const py = S.u * 0.115;
          const px = KK.cross(ph, 1, 0.15, w + tb * 0.3, -tb * 0.6);
          g.lineCap = 'round';
          g.strokeStyle = KK.rgba(P.cream, 0.6);
          g.lineWidth = tb * 0.0045;
          g.setLineDash([tb * 0.02, tb * 0.014]);
          g.beginPath();
          g.moveTo(px + tb * 0.05, py + tb * 0.003);
          g.lineTo(px + tb * 0.42, py + tb * 0.02);
          g.stroke();
          g.setLineDash([]);
          g.save();
          g.translate(px, py);
          g.fillStyle = KK.rgba(P.page, 0.95);
          KK.wobPath(g, [[-tb * 0.05, 0], [-tb * 0.035, -tb * 0.008], [tb * 0.05, -tb * 0.008], [tb * 0.065, -tb * 0.022], [tb * 0.07, -tb * 0.022], [tb * 0.062, tb * 0.004], [-tb * 0.045, tb * 0.006]], true, tb * 0.0012, 5, t);
          g.fill();
          KK.wobPath(g, [[-tb * 0.005, 0], [tb * 0.02, tb * 0.03], [tb * 0.03, tb * 0.03], [tb * 0.018, 0]], true, tb * 0.0008, 6, t);
          g.fill();
          // 機身一排小窗
          g.fillStyle = KK.rgba(P.umber, 0.55);
          for (let k = 0; k < 5; k++) g.fillRect(-tb * 0.03 + k * tb * 0.017, -tb * 0.005, tb * 0.007, tb * 0.005);
          if (KK.mod(t, 1) < 0.5) KK.drawSprite(g, KK.glow(P.brick, 32), tb * 0.06, -tb * 0.012, tb * 0.035, 1);
          g.restore();

          // 鴿群（左→右），米色翅膀＋稍大
          const fx = KK.cross(ph, 1, 0.45, -tb * 0.4, w + tb * 0.4);
          const fy = S.u * 0.235 + Math.sin(ph * KK.TAU * 2) * tb * 0.025;
          [[0, 0], [-0.05, 0.025], [-0.09, -0.02], [-0.14, 0.035], [-0.18, 0.0]].forEach((o, i) => {
            drawBird(g, fx + o[0] * tb * 1.4, fy + o[1] * tb, tb * 0.017, t * KK.TAU * 3 + i * 1.3, 0.88);
          });

          // 紙飛機（一封寫給遠方的信）：大一點、帶暖光，後面拖著虛線軌跡
          const pk = KK.mod(ph + 0.62, 1);
          const pxp = KK.lerp(-tb * 0.2, w + tb * 0.2, pk);
          const wave = (k) => S.u * 0.34 + Math.sin(k * KK.TAU * 1.5) * tb * 0.05;
          g.strokeStyle = KK.rgba(P.cream, 0.6);
          g.lineWidth = tb * 0.0035;
          g.setLineDash([tb * 0.008, tb * 0.013]);
          g.beginPath();
          for (let k = Math.max(0, pk - 0.22); k <= pk; k += 0.01) {
            const xx = KK.lerp(-tb * 0.2, w + tb * 0.2, k);
            if (k === Math.max(0, pk - 0.22)) g.moveTo(xx, wave(k)); else g.lineTo(xx, wave(k));
          }
          g.stroke();
          g.setLineDash([]);
          const ang = Math.atan2(wave(pk + 0.003) - wave(pk), (w + tb * 0.4) * 0.003);
          KK.drawSprite(g, KK.glow(P.apricot, 64), pxp, wave(pk), tb * 0.1, 0.4);
          g.save();
          g.translate(pxp, wave(pk));
          g.rotate(ang);
          g.fillStyle = KK.rgba(P.cream, 1);
          g.beginPath();
          g.moveTo(tb * 0.042, 0); g.lineTo(-tb * 0.036, -tb * 0.02); g.lineTo(-tb * 0.022, 0); g.lineTo(-tb * 0.036, tb * 0.017); g.closePath();
          g.fill();
          // 下半翼稍暗，有折紙的立體感
          g.fillStyle = KK.rgba(P.apricot, 0.75);
          g.beginPath();
          g.moveTo(tb * 0.042, 0); g.lineTo(-tb * 0.022, 0); g.lineTo(-tb * 0.036, tb * 0.017); g.closePath();
          g.fill();
          g.strokeStyle = KK.rgba(P.umber, 0.5);
          g.lineWidth = tb * 0.0018;
          g.beginPath(); g.moveTo(tb * 0.042, 0); g.lineTo(-tb * 0.022, 0); g.stroke();
          g.restore();

          // 點擊放飛的鴿子
          st.birds = st.birds.filter((bd) => S.now - bd.born < 3);
          st.birds.forEach((bd) => {
            const age = S.now - bd.born;
            const x = bd.x + bd.vx * age + Math.sin(age * 3 + bd.seed) * b * 0.02;
            const y = bd.y + bd.vy * age - age * age * b * 0.04;
            drawBird(g, x, y, S.u * 0.026 * (1 + age * 0.15), age * KK.TAU * 3.5 + bd.seed, 0.9 * (1 - KK.smooth(2.2, 3, age)));
          });

          KK.paper(g, S, { grain: 0.45, vignette: 0.45 });
        },
      };
    },
  });
})();
