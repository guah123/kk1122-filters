/* 2〈我記得〉跑回家吃飯：黃昏草坡上，姊弟兩個剪影追著跑向遠方冒著炊煙的家。
 *
 * 分鏡（14 秒無縫 loop）：
 *  1. t=0–1    畫面只有草坡、房子、炊煙；姊弟從左外側跑進畫面。
 *  2. t=1–9    兩人沿草坡追逐、中途交換領先（手臂擺動、身體彈跳）；上方紅蜻蜓盤旋、小鳥歸巢。
 *  3. t=9–11   越跑越近，門口亮起暖光，t≈11 兩人一起跑進門、淡出。
 *  4. t=11–13  窗戶變亮（回家吃飯了），只剩房子與炊煙。
 *  5. t=13–14  燈光慢慢回到平常的亮度，與 t=0 接得起來。
 * 炊煙每 1 秒一團、壽命 7 秒（7 整除 14）；蜻蜓、小鳥、窗光呼吸都轉整數圈。
 *
 * r8（Kai 選定方案 A「原脈絡」）：底部一張夕陽草坡小畫（remember-a-hill.webp：晚霞、草坡、亮燈冒煙的小屋、姊弟跑回家），
 *   只佔下緣約 27% 高、中央淨空。動態只留：窗光呼吸（11–14 秒孩子到家時更亮）、落日微光、兩隻歸巢小鳥。
 *   原本的大片左上夕陽光暈、點陣草坡／房子／奔跑姊弟／遠方散步的人、紅蜻蜓都不畫（沒有 r8 圖時才回到舊畫法）。
 *   螢火蟲互動完全不變：點一下放 5 隻、按住滑過一路放。
 *
 * r9：姊弟從小畫裡剪出來（remember-a-boy.webp／remember-a-girl.webp，小畫原處已補成草坡與晚霞），
 *   在程式裡跑：沿著草坡小路往上跑向小屋（二次曲線 KIDS_PATH），7 秒一輪（整除 14）＝跑 5 秒＋到小屋旁淡出＋停 2 秒再從左下出現。
 *   跑步：|sin| 小跳、落地瞬間微壓扁、身體前傾＋每步左右小晃（rotate＋skew 模擬手腳擺動）、越遠越小（1.2 → 0.68 倍），
 *   姊姊先跑、弟弟晚 0.8 秒追在後面；每隔一步腳邊一小團塵土。孩子到家的那一刻窗光亮一下。
 *   螢火蟲改成帶綠的黃綠光（核心 #F4FFB0、光暈 #BEF078），動態與互動不變。
 *   相機調色（只作用在相機畫面）：暖琥珀＋一點玫瑰色的夕陽（見 GRADE）。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;
  /* DAYOF：水彩點陣素材掛點（assets/filters/remember-*.png；沒有檔案就用原本向量畫法）。奔跑的姊弟維持「人類」。 */
  const ART = (n) => (KK.art ? KK.art(n) : null);

  /* r8 方案 A 素材擺位（1080×1920 設計稿比例）：小畫範圍；畫內的兩扇窗、落日 */
  const HILL_BOX = [-0.2054, 0.659, 0.9694, 1];   /* v=261119o (Kai): whole vignette ×1.25, kept against the right edge so the cottage stays in frame */
  const HILL_WIN = [[0.742, 0.476], [0.907, 0.483]], HILL_SUN = [0.3, 0.555];
  /* r9 奔跑的姊弟：座標以小畫原稿（1015 px 寬）為單位。spr＝素材原稿大小、ax/ay＝腳底錨點（素材比例）、off＝起跑延遲（秒） */
  const HILL_W = 1015;
  const KIDS = [
    { n: 'remember-a-girl.webp', w: 81, h: 145, ax: 0.4, ay: 0.97, off: 0, seed: 0.0 },
    { n: 'remember-a-boy.webp', w: 86, h: 124, ax: 0.45, ay: 0.97, off: 0.8, seed: 1.7 },
  ];
  const KIDS_PATH = [[285, 428], [505, 376], [678, 322]];   // 起點（左下草坡）→ 控制點 → 終點（小屋左前）
  const KID_CYCLE = 7, KID_RUN = 5, KID_HOP = 2.6;           // 一輪秒數、跑步秒數、每秒步數
  const FLY_CORE = '#F4FFB0', FLY_GLOW = '#BEF078';
  /* r9 相機調色：soft-light 暖琥珀（主調）、soft-light 玫瑰（夕照的粉）、screen 深玫瑰褐（暗部微暖抬起） */
  const GRADE = [{ op: 'soft-light', c: '#F0975A', a: 0.3 }, { op: 'soft-light', c: '#E58A8A', a: 0.12 }, { op: 'screen', c: '#3C2224', a: 0.12 }];

  KK.defineFilter({
    id: 'remember',
    no: 2,
    song: '我記得',
    title: '跑回家吃飯',
    mood: '懷念・奔跑・被等待',
    duration: 14,
    hint: '點一下或滑過畫面，放出螢火蟲',
    grade: GRADE,
    critterHint: '只有人類：底部夕陽草坡上，姊弟跑回亮著燈的小屋（不畫小動物）',
    create() {
      const st = { back: null, front: null, flies: [], lastSpawn: 0, runX: null, runFace: 1, crest: null, crestKey: '' };

      function bandUnit(S) { return S.u * (S.h >= S.w ? 1 : 0.95); }

      /* 草坡曲線：遠坡、奔跑坡（小孩的腳踩在這條線）、前景 */
      function farY(x) { const u = x / st.w; return st.h - st.b * (0.24 + 0.035 * u + 0.032 * Math.sin(u * 4.2 + 0.8) + 0.01 * Math.sin(u * 11)); }
      function runY(x) { const u = x / st.w; return st.h - st.b * (0.09 + 0.11 * u + 0.02 * Math.sin(u * 6.5 + 1.2) + 0.008 * Math.sin(u * 15)); }
      function fgY(x) { const u = x / st.w; return st.h - st.b * (0.032 + 0.014 * Math.sin(u * 5 + 2) + 0.008 * u); }

      /* 點陣草坡（remember-hill.png 720×420）的稜線：逐欄找第一個不透明像素，平滑後換成畫面 y。
       * 素材構圖：x=0.8 處稜線距底約 133px（與向量 runY／房子位置一致）；姊弟踩這條線、房子坐在這條線上。 */
      function crestFrom(img) {
        const w = st.w, dh = w * img.naturalHeight / img.naturalWidth, key = w + 'x' + st.h + ':' + img.src;
        if (st.crestKey === key) return st.crest;
        let arr = null;
        try {
          const n = Math.max(2, Math.round(w)), hh = Math.max(2, Math.round(dh));
          const c = KK.canvas(n, hh), cg = c.getContext('2d');
          cg.drawImage(img, 0, 0, n, hh);
          const d = cg.getImageData(0, 0, n, hh).data, raw = new Float32Array(n);
          for (let x = 0; x < n; x++) {
            let y = 0;
            while (y < hh - 1 && d[(y * n + x) * 4 + 3] < 128) y++;
            raw[x] = y;
          }
          arr = new Float32Array(n);
          const R = Math.max(2, Math.round(n * 0.012));
          for (let x = 0; x < n; x++) {
            let a = 0, k = 0;
            for (let j = Math.max(0, x - R); j <= Math.min(n - 1, x + R); j++) { a += raw[j]; k++; }
            arr[x] = st.h - dh + a / k;
          }
        } catch (e) { arr = null; }
        st.crestKey = key; st.crest = arr;
        return arr;
      }
      function crestY(x, aHill) {
        const arr = aHill ? crestFrom(aHill) : null;
        if (!arr) return runY(x);
        const i = Math.max(0, Math.min(arr.length - 1, Math.round(x)));
        return arr[i];
      }

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
          const fgc = KK.mix(KK.mix(P.umber, P.moss, 0.42), P.apricot, 0.14);   // DAYOF：前景略暖略亮
          hill(g, fgY, KK.rgba(fgc, 0.92), t, 300, b * 0.003);
          tufts(g, fgY, KK.rgba(fgc, 0.95), 33, b * 0.09, b * 0.034, t);
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

      /* ---------- r9 奔跑的姊弟（剪出來的小畫素材） ---------- */
      function pathAt(k) {        // 二次貝茲：回傳原稿座標
        const A = KIDS_PATH[0], C = KIDS_PATH[1], B = KIDS_PATH[2], m = 1 - k;
        return [m * m * A[0] + 2 * m * k * C[0] + k * k * B[0], m * m * A[1] + 2 * m * k * C[1] + k * k * B[1]];
      }
      function kidState(K, t) {
        const q = KK.mod(t - K.off, KID_CYCLE);
        if (q >= KID_RUN) return null;
        const k0 = q / KID_RUN, k = 1 - Math.pow(1 - k0, 1.3);           // 上坡越跑越慢一點
        const al = KK.smooth(0, 0.07, k0) * (1 - KK.smooth(0.8, 0.98, k0));
        const p = q * KID_HOP * Math.PI + K.seed;                         // 每 π 一步
        return { q, k, al, p, pos: pathAt(k), sc: KK.lerp(1.2, 0.68, k) };
      }
      function drawKids(g, S, R) {
        const f = R.w / HILL_W, X = (x) => R.x + x * f, Y = (y) => R.y + y * f;
        const list = [];
        for (const K of KIDS) {
          const img = ART(K.n);
          if (!img) continue;
          const s = kidState(K, S.t);
          if (s && s.al > 0.01) list.push([K, img, s]);
        }
        list.sort((a, b) => a[2].pos[1] - b[2].pos[1]);                  // 遠的（上面）先畫
        const dust = KK.glow(KK.mix(P.page, P.cream, 0.5), 64);
        for (const [K, img, s] of list) {
          const w = K.w * f * s.sc, h = K.h * f * s.sc;
          const fx = X(s.pos[0]), fy = Y(s.pos[1]);
          // 腳邊塵土：每隔一步（落地瞬間）留一小團，0.5 秒內變大變淡
          const n = Math.floor(s.p / Math.PI);                              // sin(p)=0 的那一刻＝落地
          for (let j = 0; j < 2; j++) {
            const nn = n - j;
            if (nn % 2) continue;
            const age = s.q - (nn - K.seed / Math.PI) / KID_HOP;            // 距離那一步落地幾秒
            if (age < 0 || age > 0.5) continue;
            const ss = kidState(K, S.t - age);
            if (!ss) continue;
            const dx = X(ss.pos[0]) - w * 0.15, dy = Y(ss.pos[1]);
            const a = 0.28 * s.al * (1 - age / 0.5);
            KK.drawSprite(g, dust, dx - age * w * 0.3, dy - h * 0.02 - age * h * 0.08, h * (0.16 + 0.35 * age), a);
          }
          const sn = Math.sin(s.p), hop = Math.abs(sn), land = Math.pow(1 - hop, 4);
          g.save();
          g.globalAlpha = s.al;
          g.translate(fx, fy - hop * h * 0.07);
          g.rotate(0.07 + 0.035 * sn);                                       // 前傾＋每步左右晃
          g.transform(1, 0, 0.05 * Math.cos(s.p), 1, 0, 0);                  // 微微 skew：手腳擺動的感覺
          // v=261119o (Kai): the sprites are painted facing LEFT but the path runs left → right (toward the cottage),
          // so they looked like running backwards → mirror them to face the way they run
          g.scale(-(1 + 0.05 * land), 1 - 0.07 * land);                      // 水平翻轉＋落地微壓扁
          g.drawImage(img, -w * (1 - K.ax), -h * K.ay, w, h);
          g.restore();
        }
        g.globalAlpha = 1;
      }

      function spawnFly(S, x, y) {
        if (st.flies.length >= 40) st.flies.shift();
        st.flies.push({ x: x + (Math.random() - 0.5) * st.b * 0.05, y: y + (Math.random() - 0.5) * st.b * 0.05, born: S.now, seed: Math.random() * 10 });
      }

      function drawFly(g, spr, x, y, age, seed, b, core) {
        const env = KK.smooth(0, 0.3, age) * (1 - KK.smooth(1.8, 2.7, age));
        if (env <= 0) return;
        const fx = x + Math.sin(age * 2.4 + seed) * b * 0.018;
        const fy = y - age * b * 0.045;
        const fl = 0.55 + 0.45 * Math.sin(age * 9 + seed * 7);
        KK.drawSprite(g, spr, fx, fy, b * 0.045, env * fl);
        KK.drawSprite(g, core || spr, fx, fy, b * 0.014, env * Math.min(1, fl + 0.3));
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
          const t = S.t, ph = S.phase, b = st.b, w = S.w, h = S.h, u = S.u;
          let G = st.G;
          const bi = KK.boil(t);

          // 黃昏天色（screen，低透明度，不蓋臉）
          g.save();
          g.globalCompositeOperation = 'screen';
          const sk = g.createLinearGradient(0, 0, 0, h * 0.32);
          sk.addColorStop(0, KK.rgba(P.apricot, ART('remember-a-hill.webp') ? 0.16 : 0.3));
          sk.addColorStop(1, KK.rgba(P.apricot, 0));
          g.fillStyle = sk;
          g.fillRect(0, 0, w, h * 0.32);
          // 左上角低垂的夕陽（r8 有小畫時不畫：落日在小畫裡）
          const br = 1 + 0.04 * Math.sin(ph * TAU * 2);
          if (!ART('remember-a-hill.webp')) {
            KK.drawSprite(g, KK.glow(P.apricot, 256), w * 0.1, u * 0.1, u * 1.6 * br, 0.75);
            KK.drawSprite(g, KK.glow(P.cream, 128), w * 0.1, u * 0.1, u * 0.3 * br, 0.4);
          }
          g.restore();

          // r8 方案 A：底部夕陽草坡小畫＋窗光呼吸＋落日微光＋歸巢小鳥
          const aA = ART('remember-a-hill.webp');
          if (aA && KK.placeArt) {
            const R = KK.placeArt(aA, S, HILL_BOX, { landScale: 1.2 });
            g.drawImage(aA, R.x, R.y, R.w, R.h);
            const qa = KK.mod(t, KID_CYCLE);   // r9：姊姊到家（第 5 秒）時窗光亮一下
            const boostA = 0.3 * KK.smooth(4.5, 5.2, qa) * (1 - KK.smooth(6.2, 7, qa));
            const wA = 0.6 + 0.12 * Math.sin(ph * TAU * 3) + boostA;
            g.save();
            g.globalCompositeOperation = 'screen';
            KK.drawSprite(g, KK.glow(P.apricot, 128), R.x + R.w * HILL_SUN[0], R.y + R.h * HILL_SUN[1], R.w * 0.22 * br, 0.32);
            HILL_WIN.forEach((p) => {
              KK.drawSprite(g, KK.glow(P.apricot, 96), R.x + R.w * p[0], R.y + R.h * p[1], R.w * 0.1, wA * 0.6);
              KK.drawSprite(g, KK.glow(P.cream, 48), R.x + R.w * p[0], R.y + R.h * p[1], R.w * 0.035, wA * 0.5);
            });
            g.restore();
            for (let i = 0; i < 2; i++) {
              const k = KK.mod(ph + i * 0.37 + 0.1, 1);
              const x = KK.lerp(-b * 0.1, w + b * 0.1, k);
              const y = u * (0.16 + i * 0.05) + Math.sin(k * TAU) * b * 0.02 + KK.smooth(0.5, 1, k) * b * 0.08;
              drawBird(g, x, y, b * 0.016, t * TAU * 3 + i * 2, 0.75);
            }
            drawKids(g, S, R);
          } else {

            // 草坡＋房子（點陣：remember-hill.png 貼齊底部、remember-house.png 放在山丘上）
            const aHill = ART('remember-hill.png'), aHouse = ART('remember-house.png'), aSmoke = ART('remember-smoke.png');
            const aRunA = ART('remember-runner-a.png'), aRunB = ART('remember-runner-b.png');
            const bmHouse = !!(aHill && aHouse);
            if (aHill) g.drawImage(aHill, 0, h - w * aHill.naturalHeight / aHill.naturalWidth, w, w * aHill.naturalHeight / aHill.naturalWidth);
            else g.drawImage(st.back[bi], 0, 0);
            if (bmHouse) {
              // 點陣房子（remember-house.png 256×256）：坐在點陣稜線上；窗光、門光、煙囪位置改用素材上的實際位置
              const hs = b * 0.4, base = crestY(G.hx, aHill), top = base + b * 0.012 - hs, left = G.hx - hs / 2;
              g.drawImage(aHouse, left, top, hs, hs);
              G = Object.assign({}, G, {
                base: top + hs * 0.94, doorH: hs * 0.2,
                win: [[left + hs * 0.252, top + hs * 0.689], [left + hs * 0.751, top + hs * 0.696]],
                chx: left + hs * 0.754, chTop: top + hs * 0.15,
              });
            }

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
            if (!bmHouse) G.win.forEach((p) => {
              g.globalAlpha = Math.min(1, winA);
              g.fillRect(p[0] - G.winS / 2, p[1] - G.winS / 2, G.winS, G.winS);
              g.globalAlpha = Math.min(1, winA) * 0.7;
              g.fillStyle = KK.rgba(P.umber, 0.8);
              g.fillRect(p[0] - G.winS * 0.04, p[1] - G.winS / 2, G.winS * 0.08, G.winS);
              g.fillStyle = KK.rgba(P.page, 0.95);
            });
            g.globalAlpha = bmHouse ? 0 : open;
            g.fillStyle = KK.rgba(P.cream, 0.95);
            g.fillRect(G.hx - G.doorW / 2, G.base - G.doorH, G.doorW, G.doorH + b * 0.01);
            g.globalAlpha = 1;

            // 炊煙：細細一縷、S 形捲曲；每 0.5 秒一團、壽命 7 秒（整除 14）
            const smk = KK.glow(P.cream, 64, 0.1);
            const wind = 0.7 * Math.sin(ph * TAU);
            if (aSmoke) {                               // 點陣炊煙：3 縷依序往上飄、輕晃（7 秒一輪，整除 14）
              for (let i = 0; i < 3; i++) {
                const k = KK.mod(t / 7 + i / 3, 1), env = KK.smooth(0, 0.1, k) * (1 - KK.smooth(0.45, 1, k));
                if (env <= 0.01) continue;
                const sw = b * 0.085 * (0.85 + 0.3 * k), sh = sw * 2;   // 從煙囪口冒出、邊升邊散（升高約 0.13b，不脫離煙囪）
                const x = G.chx - b * 0.006 + Math.sin(k * TAU + wind) * b * 0.008 + k * b * 0.02, y = G.chTop + b * 0.035 - k * b * 0.12;
                g.globalAlpha = env * 0.85; g.drawImage(aSmoke, x - sw * 0.3, y - sh, sw, sh);   // 素材的煙根在 x≈0.30 處 → 對準煙囪口
              }
              g.globalAlpha = 1;
            }
            for (let i = 0; i < (aSmoke ? 0 : 14); i++) {
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

            // 遠方散步的三個人（remember-far-walkers.png 207×256：大人＋小孩＋大人，人類，原圖面朝右；Kai step 32 不要小動物）
            //   取代原本遠坡的小動物彩蛋：很小（高約 w×0.1）、略淡（距離感），沿草坡稜線慢慢往右走向小屋，
            //   整個 loop（14 秒）走一趟、頭尾淡入淡出 → 無縫；只往前走，不倒退；若方向改變就水平翻轉。先畫，姊弟蓋在前面。
            const aFar = ART('remember-far-walkers.png');
            if (aFar && aHill) {
              const fh = w * 0.1, fw = fh * aFar.naturalWidth / aFar.naturalHeight;
              const x0 = -fw * 0.6, x1 = G.hx - b * 0.2 - fw * 0.5;           // 走到小屋左邊就淡出
              const fx = KK.lerp(x0, x1, ph);
              const fal = 0.78 * KK.smooth(0.0, 0.08, ph) * (1 - KK.smooth(0.88, 0.99, ph));
              const fface = x1 >= x0 ? 1 : -1;
              const fhop = Math.abs(Math.sin(t * TAU * 1.5)) * fh * 0.015;
              if (fal > 0.01) {
                g.save(); g.globalAlpha = fal; g.translate(fx, crestY(fx, aHill) + fh * 0.03 - fhop); g.scale(fface, 1);
                g.drawImage(aFar, -fw / 2, -fh, fw, fh); g.restore();
              }
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
              if (aRunA) {                              // 點陣姊弟（一張圖含兩人，a/b 交替成跑步動畫，原圖面朝右；往左跑時水平翻轉）
                if (st.runX != null && Math.abs(base - st.runX) > 0.5) st.runFace = base >= st.runX ? 1 : -1;
                st.runX = base;
                const fr = (aRunB && Math.floor(t / 0.14) % 2) ? aRunB : aRunA, sz = u * 0.26;
                const hop = Math.abs(Math.sin(f)) * sz * 0.02;
                if (fade > 0.01 && base > -sz && base < w + sz) {
                  g.save(); g.globalAlpha = fade; g.translate(base, crestY(base, aHill) - hop); g.scale(st.runFace, 1);
                  g.drawImage(fr, -sz / 2, -sz * 0.95, sz, sz); g.restore();
                }
              } else order.forEach((o) => {
                if (o[0] > -b * 0.1 && o[0] < w + b * 0.1 && fade > 0.01) drawKid(g, o[0], runY(o[0]), o[1], o[2], o[3], fade, t);
              });
            }

            // 前景草叢（蓋住小動物的身體）
            if (!aHill) g.drawImage(st.front[bi], 0, 0);

          }

          // 螢火蟲
          g.save();
          g.globalCompositeOperation = 'screen';
          const spr = KK.glow(FLY_GLOW, 64), core = KK.glow(FLY_CORE, 32);   // r9：黃綠螢火（原本 P.page 米黃）
          if (S.autoDemo) {
            for (let i = 0; i < 14; i++) {
              const age = KK.mod(t - i * 1, 14);
              if (age > 2.7) continue;
              const x = w * (0.18 + 0.64 * KK.hash(i, 3)), y = h * (0.5 + 0.3 * KK.hash(i, 9));
              drawFly(g, spr, x, y, age, i * 1.3, b, core);
            }
          } else {
            st.flies = st.flies.filter((f) => S.now - f.born < 2.7);
            st.flies.forEach((f) => drawFly(g, spr, f.x, f.y, S.now - f.born, f.seed, b, core));
          }
          g.restore();

          KK.paper(g, S, { grain: 0.45, vignette: 0.45 });
        },
      };
    },
  });
})();
