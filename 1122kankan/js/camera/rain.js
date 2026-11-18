/* 16〈創作-毛毛雨〉下雨（id 'rain'）：隔著淡淡起霧、沾著雨珠的鏡頭看世界；雨絲一直落、畫出來的水珠沿鏡頭滑下。
 * 與 KK 濾鏡同一套 API／手繪風格／暖色盤（KK.PAL），loop 12 秒無縫。
 * 圖層（由下而上）：相機畫面 → 暖米色薄罩 → 靜態薄霧（半解析度離屏 C，只挖掉水珠滑落痕）
 *   → 玻璃上的水珠＋滑落中的大水珠 → 細斜雨絲 → 點雲落下的小雨 → 頂部雲帶 → 左下單車母子與水窪漣漪
 *   → 小雨落地漣漪 → 手指點出的漣漪＋小水花 → 紙張顆粒＋暗角。
 * 互動（Kai 02:47：與〈太陽〉的抹開烏雲區隔）：點下方／按住滑動 → 在手指處出現漣漪圈＋小水花（可多指）。不再抹霧。
 * r8（Kai 選定方案 C「自由發想」：毛毛雨總下在剛好的時候）：頂部一大片雨雲（rain-c-clouds.webp）、左下角水窪裡騎單車的母子
 *   （rain-c-bike.webp，車頭一盞小燈）。原本的下緣水窪條與紅傘兩人拿掉；薄霧、鏡頭水珠、毛毛雨照舊。
 *   新互動：點雲（雲帶以下約 0.12h 以內都算）→ 雲抖一下，在那個 x 位置落下 1.5 秒比較密的一陣雨，落地處起漣漪；
 *   點在下方其他地方 → 照舊出現漣漪圈＋小水花。
 * 點陣素材（有檔就用）：rain-mist（靜態薄霧）、rain-drop-1..4、rain-puddle、rain-umbrella-walkers、rain-splash、rain-ripple。
 * 載入：KK 還沒載入時本檔只登記到 DAYOF.kkPlugins，由 camera.js 在 KK 載入後執行註冊。 */
(function () {
  'use strict';
  window.DAYOF = window.DAYOF || {};
  var DAYOF = window.DAYOF;
  DAYOF.kkPlugins = DAYOF.kkPlugins || [];

  DAYOF.kkPlugins.push(function (KK) {
    if (KK.byId.rain) return;
    var P = KK.PAL, TAU = KK.TAU;
    var C_DIV = 2, FOG_ALPHA = 0.5, TAP_LIFE = 1.3;
    /* 水彩點陣素材掛點（assets/filters/rain-*.png；沒有檔案就用向量畫法） */
    var ART = function (n) { return KK.art ? KK.art(n) : null; };
    var dropImgs = function () { var a = []; for (var i = 1; i <= 4; i++) { var im = ART('rain-drop-' + i + '.png'); if (im) a.push(im); } return a; };

    /* 滑落的大水珠：x 比例、起點 y、行程、每 loop 圈數、起點偏移、大小 */
    var RUNNERS = [
      // 毛毛雨（Kai 2026-11-16）：7 → 3 顆
      { x: 0.12, y0: 0.05, len: 0.55, laps: 1, off: 0.00, s: 1.0 },
      { x: 0.72, y0: 0.25, len: 0.58, laps: 1, off: 0.70, s: 1.1 },
      { x: 0.44, y0: 0.40, len: 0.42, laps: 1, off: 0.36, s: 0.65 },
    ];
    /* 毛毛雨參數（Kai 2026-11-16：原本像暴雨）：雨絲約 200 → 48 條、更短更細更淡更慢；鏡頭水珠 70 → 23 */
    var STREAKS = 48, STREAK_ALPHA = 0.5, STREAK_TILES_PER_LOOP = 4, BEADS = 23;
    /* r8 方案 C 素材擺位（1080×1920 設計稿比例）：雲帶、單車母子＋水窪、車燈（單車圖內比例） */
    var CLOUD_BOX = [0, 0, 1, 0.2964], BIKE_BOX = [0, 0.7948, 0.5426, 1], BIKE_LAMP = [0.486, 0.412];
    /* 水窪漣漪（單車圖內比例）：x、y、每 loop 次數、偏移 */
    var RIPPLES = [
      [0.12, 0.62, 3, 0.0], [0.3, 0.88, 2, 0.3], [0.66, 0.7, 3, 0.55], [0.8, 0.9, 2, 0.15], [0.86, 0.6, 2, 0.8], [0.5, 0.95, 3, 0.7],
    ];
    /* 點雲下的小雨：每陣雨滴數、持續秒數、落速（畫面高／秒）、同時最多幾陣、斜率（同毛毛雨） */
    var SHOWER_N = 44, SHOWER_T = 1.5, SHOWER_V = 1.6, SHOWER_MAX = 5, SLOPE = 0.14;

    KK.defineFilter({
      id: 'rain',
      no: 16,
      song: '創作-毛毛雨',
      title: '下雨',
      mood: '毛毛雨・起霧的窗・慢慢看清楚',
      duration: 12,
      hint: '點點上面的雲，下一陣小雨',
      critterHint: '左下角水窪裡，媽媽騎單車載著小孩（人類），車頭一盞小燈',
      create: function () {
        var st = { C: null, cg: null, fog: null, rain: null, bead: null, beads: [], fingers: {}, taps: [], showers: [], cloudBase: 0, tapLimit: 0, key: '' };

        function makeFog(Cw, Ch, U) {
          var t = KK.canvas(Cw, Ch), g = t.getContext('2d');
          var gr = g.createLinearGradient(0, 0, 0, Ch);
          gr.addColorStop(0, KK.rgba(KK.mix(P.cream, P.mist, 0.35), 0.18));
          gr.addColorStop(0.6, KK.rgba(KK.mix(P.cream, P.mist, 0.2), 0.12));
          gr.addColorStop(1, KK.rgba(KK.mix(P.cream, P.page, 0.4), 0.08));
          g.fillStyle = gr; g.fillRect(0, 0, Cw, Ch);
          var r = KK.rng(1616);
          // 霧的濃淡斑（柔邊光點疊）
          for (var i = 0; i < 20; i++) {
            var sz = U * (0.25 + r() * 0.5);
            KK.drawSprite(g, KK.glow(r() < 0.5 ? P.cream : P.mist, 128), r() * Cw, r() * Ch, sz, 0.04 + r() * 0.04);
          }
          // 細小凝結點
          for (var j = 0; j < 0; j++) {  // 髒點已移除（保持畫面乾淨）
            g.fillStyle = KK.rgba(r() < 0.6 ? P.cream : P.slate, 0.18 + r() * 0.25);
            var d = Math.max(0.6, U * (0.002 + r() * 0.004));
            g.fillRect(r() * Cw, r() * Ch, d, d);
          }
          return t;
        }
        function makeRain(Tw, Th, U) {
          var t = KK.canvas(Tw, Th), g = t.getContext('2d'), rnd = KK.rng(77), slope = 0.14, col = KK.mix(P.cream, P.mist, 0.45);
          g.lineCap = 'round';
          for (var i = 0; i < STREAKS; i++) {                // 稀疏、短、細、半透明（每條濃淡略不同，像細雨）
            var x = rnd() * Tw, y = rnd() * Th, len = U * (0.018 + rnd() * 0.026);
            g.strokeStyle = KK.rgba(col, 0.55 + rnd() * 0.45);
            g.lineWidth = Math.max(0.8, U * (0.0013 + rnd() * 0.0009));
            g.beginPath();
            [-Tw, 0, Tw].forEach(function (ox) { [-Th, 0, Th].forEach(function (oy) { g.moveTo(x + ox, y + oy); g.lineTo(x + ox - len * slope, y + oy + len); }); });
            g.stroke();
          }
          var d = KK.canvas(Tw, Th * 2), dg = d.getContext('2d');
          dg.drawImage(t, 0, 0); dg.drawImage(t, 0, Th);
          return d;
        }
        function makeBead(sz) {
          var c = KK.canvas(sz, sz), g = c.getContext('2d'), r = sz / 2;
          var gr = g.createRadialGradient(r * 0.85, r * 0.75, r * 0.1, r, r, r);
          gr.addColorStop(0, KK.rgba(P.cream, 0.08));
          gr.addColorStop(0.7, KK.rgba(P.cream, 0.18));
          gr.addColorStop(0.9, KK.rgba(P.umber, 0.38));
          gr.addColorStop(1, KK.rgba(P.umber, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(r, r, r * 0.98, 0, TAU); g.fill();
          g.fillStyle = KK.rgba(P.cream, 0.85);
          g.beginPath(); g.ellipse(r * 0.68, r * 0.6, r * 0.2, r * 0.13, -0.6, 0, TAU); g.fill();
          g.fillStyle = KK.rgba(P.cream, 0.35);
          g.beginPath(); g.ellipse(r * 1.2, r * 1.35, r * 0.18, r * 0.08, -0.4, 0, TAU); g.fill();
          return c;
        }

        function resize(S) {
          var Cw = Math.max(2, Math.round(S.w / C_DIV)), Ch = Math.max(2, Math.round(S.h / C_DIV));
          st.C = KK.canvas(Cw, Ch); st.cg = st.C.getContext('2d');
          st.fingers = {};
          var U = S.u / C_DIV;
          var aMist = ART('rain-mist.png');
          if (aMist) { st.fog = KK.canvas(Cw, Ch); st.fog.getContext('2d').drawImage(aMist, 0, 0, Cw, Ch); }
          else st.fog = makeFog(Cw, Ch, U);
          st.rain = makeRain(Cw, Ch, U);
          st.bead = makeBead(64);
          var r = KK.rng(316);
          st.beads = [];
          for (var i = 0; i < BEADS; i++) st.beads.push({ x: r() * S.w, y: r() * S.h * 0.9, s: S.u * (0.008 + Math.pow(r(), 2) * 0.03), ph: r() });
          st.key = S.w + 'x' + S.h + (aMist ? 'm' : '');
        }

        /* 手指：按下就濺一次；按住滑動時每移動一段距離（且間隔 ≥0.12 秒）再濺一次 */
        function splash(S, x, y) {
          st.taps.push({ x: x, y: y, born: S.now, seed: Math.random() * 1000 });
          if (st.taps.length > 24) st.taps.shift();
        }
        function pointer(S, ev) {
          if (S.autoDemo) return;
          if (ev.type === 'down') {
            if (ev.y < (st.tapLimit || S.h * 0.4)) { addShower(S, ev.x); st.fingers[ev.id] = { sky: true }; }   // r8：點雲 → 一陣小雨
            else { st.fingers[ev.id] = { x: ev.x, y: ev.y, t: S.now }; splash(S, ev.x, ev.y); }
          }
          else if (ev.type === 'move') {
            var f = st.fingers[ev.id];
            if (f && !f.sky && Math.hypot(ev.x - f.x, ev.y - f.y) > S.u * 0.08 && S.now - f.t > 0.12) { f.x = ev.x; f.y = ev.y; f.t = S.now; splash(S, ev.x, ev.y); }
          } else delete st.fingers[ev.id];
        }
        function reset() { st.taps = []; st.fingers = {}; st.showers = []; }
        /* ---------- r8：點雲下一陣小雨 ----------
         * 點在雲帶（或上方區域）→ 在那個 x 位置 SHOWER_T 秒內落下 SHOWER_N 滴比較密的雨，各自落到下緣（0.86–0.96h），
         * 落地處起一圈漣漪。雨滴參數在點的當下就算好（每幀只算位置），同時最多 SHOWER_MAX 陣。 */
        function addShower(S, x) {
          var r = KK.rng(Math.floor(Math.random() * 1e6) + 1), drops = [], u = S.u;
          for (var i = 0; i < SHOWER_N; i++) {
            var spread = (r() + r() - 1) * u * 0.13;                       // 中間密、兩邊疏
            drops.push({ dx: spread, delay: r() * SHOWER_T, y0: r() * u * 0.06, yEnd: S.h * (0.86 + r() * 0.1), len: u * (0.06 + r() * 0.045), a: 0.55 + r() * 0.4 });
          }
          st.showers.push({ x: x, born: S.now, drops: drops });
          if (st.showers.length > SHOWER_MAX) st.showers.shift();
        }
        function dropAt(sh, d, S, age) {
          var y0 = st.cloudBase + d.y0, fall = (d.yEnd - y0) / (S.h * SHOWER_V), ta = age - d.delay;
          return { ta: ta, fall: fall, y: y0 + ta * S.h * SHOWER_V, x0: sh.x + d.dx, y0: y0 };
        }
        function drawShowers(g, S) {
          if (!st.showers.length) return;
          var u = S.u, keep = [], col = KK.mix(P.cream, P.mist, 0.4);
          g.lineCap = 'round';
          for (var i = 0; i < st.showers.length; i++) {
            var sh = st.showers[i], age = S.now - sh.born;
            if (age < 0 || age > SHOWER_T + 1.6) continue;
            keep.push(sh);
            // 雲底在那裡暗一點（雨雲聚起來）
            KK.drawSprite(g, KK.glow(KK.mix(P.mist, P.slate, 0.5), 96), sh.x, st.cloudBase, u * 0.34, 0.22 * KK.smooth(0, 0.2, age) * (1 - KK.smooth(SHOWER_T, SHOWER_T + 0.6, age)));
            g.beginPath();
            for (var j = 0; j < sh.drops.length; j++) {
              var d = sh.drops[j], p = dropAt(sh, d, S, age);
              if (p.ta <= 0 || p.ta >= p.fall) continue;
              var y = p.y, x = p.x0 - (y - p.y0) * SLOPE, L = d.len;
              g.moveTo(x, y); g.lineTo(x - L * SLOPE, y + L);
            }
            // 兩層筆觸：淡藍灰的邊（亮牆上也看得到）＋米白的芯（暗處看得到）
            g.strokeStyle = KK.rgba(KK.mix(P.mist, P.slate, 0.55), 0.32); g.lineWidth = Math.max(2, u * 0.0075); g.stroke();
            g.strokeStyle = KK.rgba(col, 0.9); g.lineWidth = Math.max(1.2, u * 0.0034); g.stroke();
          }
          st.showers = keep;
        }
        function drawShowerRipples(g, S) {
          if (!st.showers.length) return;
          var u = S.u;
          g.lineWidth = Math.max(1, u * 0.0028);
          for (var i = 0; i < st.showers.length; i++) {
            var sh = st.showers[i], age = S.now - sh.born;
            for (var j = 0; j < sh.drops.length; j++) {
              var d = sh.drops[j], p = dropAt(sh, d, S, age), k = (p.ta - p.fall) / 0.9;
              if (k <= 0 || k >= 1) continue;
              var x = p.x0 - (d.yEnd - p.y0) * SLOPE, rx = u * (0.012 + 0.05 * Math.sqrt(k));
              g.strokeStyle = KK.rgba(P.cream, (1 - k) * 0.75 * d.a);
              g.beginPath(); g.ellipse(x, d.yEnd + d.len, rx, rx * 0.3, 0, 0, TAU); g.stroke();
            }
          }
        }

        /* 漣漪圈＋小水花（點陣 rain-ripple.png／rain-splash.png，沒有就手繪） */
        function drawTaps(g, S) {
          if (!st.taps.length) return;
          var u = S.u, aRp = ART('rain-ripple.png'), aSp = ART('rain-splash.png'), keep = [];
          for (var i = 0; i < st.taps.length; i++) {
            var tp = st.taps[i], age = S.now - tp.born;
            if (age < 0 || age > TAP_LIFE) continue;
            keep.push(tp);
            var k = age / TAP_LIFE;
            for (var ring = 0; ring < 3; ring++) {           // 三圈依序擴散
              var kr = (age - ring * 0.16) / (TAP_LIFE - 0.3);
              if (kr <= 0 || kr >= 1) continue;
              var rx = u * (0.03 + 0.17 * Math.sqrt(kr)), al = (1 - kr) * (ring ? 0.55 : 0.85);
              if (aRp) { g.globalAlpha = al; g.drawImage(aRp, tp.x - rx, tp.y - rx * 0.5, rx * 2, rx); g.globalAlpha = 1; }
              else {
                g.strokeStyle = KK.rgba(P.cream, al); g.lineWidth = Math.max(1.2, u * 0.005 * (1 - kr * 0.5));
                g.beginPath(); g.ellipse(tp.x, tp.y, rx, rx * 0.42, 0, 0, TAU); g.stroke();
              }
            }
            if (aSp) {                                        // 點陣水花：一張圖，彈起後縮小淡出
              var ss = u * 0.16 * (0.6 + 0.6 * KK.smooth(0, 0.25, age)), sa = 1 - KK.smooth(0.25, 0.75, k);
              if (sa > 0.01) { g.globalAlpha = sa; g.drawImage(aSp, tp.x - ss / 2, tp.y - ss * 0.85, ss, ss); g.globalAlpha = 1; }
            } else {                                          // 手繪小水花：6 顆水滴往外彈、受重力落下
              var r = KK.rng(Math.floor(tp.seed) + 1);
              for (var j = 0; j < 7; j++) {
                var ang = -Math.PI * (0.12 + 0.76 * (j + r() * 0.6) / 7), sp = u * (0.25 + r() * 0.3);
                var x = tp.x + Math.cos(ang) * sp * age, y = tp.y + Math.sin(ang) * sp * age + 0.5 * u * 1.4 * age * age;
                var ra = u * (0.005 + r() * 0.006) * (1 - k * 0.5), aa = 1 - KK.smooth(0.3, 0.8, k);
                if (aa <= 0.01) continue;
                g.fillStyle = KK.rgba(KK.mix(P.cream, P.mist, 0.3), 0.9 * aa);
                g.beginPath(); g.arc(x, y, ra, 0, TAU); g.fill();
                g.fillStyle = KK.rgba('#FFFFFF', 0.8 * aa);
                g.beginPath(); g.arc(x - ra * 0.3, y - ra * 0.3, ra * 0.35, 0, TAU); g.fill();
              }
            }
          }
          st.taps = keep;
        }

        /* 滑落水珠位置（決定性）：k 0..1 的行程，速度忽快忽慢（像真的水珠一頓一頓） */
        function runnerAt(rn, S) {
          var k = KK.mod(S.phase * rn.laps + rn.off, 1);
          var e = KK.smooth(0, 1, k) * 0.6 + k * 0.4 + Math.sin(k * TAU * 3) * 0.015;
          var y = S.h * (rn.y0 + rn.len * e);
          var x = S.w * rn.x + Math.sin(k * TAU * 2 + rn.off * 9) * S.u * 0.006;
          var a = KK.smooth(0, 0.08, k) * (1 - KK.smooth(0.9, 1, k));
          return { x: x, y: y, k: k, a: a, top: S.h * rn.y0 };
        }

        var inst = {
          resize: resize,
          pointer: pointer,
          reset: reset,
          draw: function (g, S) {
            if (!st.C || st.key !== S.w + 'x' + S.h + (ART('rain-mist.png') ? 'm' : '')) resize(S);
            var t = S.t, u = S.u, ph = S.phase, w = S.w, h = S.h;
            var cg = st.cg, Cw = st.C.width, Ch = st.C.height;

            // 0. 暖米色薄罩（雨天的柔光）
            g.fillStyle = KK.rgba(KK.mix(P.cream, P.apricot, 0.25), 0.06);
            g.fillRect(0, 0, w, h);

            // 1. 靜態薄霧（不能抹；只有水珠滑落處留下清痕）
            cg.globalCompositeOperation = 'copy'; cg.globalAlpha = 1;
            cg.drawImage(st.fog, 0, 0);
            cg.globalCompositeOperation = 'destination-out';
            // 水珠滑落留下的清痕（上淡下濃）
            cg.lineCap = 'round';
            var runs = RUNNERS.map(function (rn) { return runnerAt(rn, S); });
            for (var i = 0; i < runs.length; i++) {
              var R = runs[i], rs = RUNNERS[i].s;
              if (R.a <= 0.01) continue;
              var gr = cg.createLinearGradient(0, R.top / C_DIV, 0, R.y / C_DIV);
              gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + (0.85 * R.a) + ')');
              cg.strokeStyle = gr; cg.lineWidth = u * 0.012 * rs / C_DIV;
              cg.beginPath(); cg.moveTo(R.x / C_DIV, R.top / C_DIV);
              cg.quadraticCurveTo((R.x + u * 0.01) / C_DIV, (R.top + R.y) / 2 / C_DIV, R.x / C_DIV, R.y / C_DIV); cg.stroke();
            }
            cg.globalCompositeOperation = 'source-over';
            g.globalAlpha = FOG_ALPHA;
            g.drawImage(st.C, 0, 0, w, h);
            g.globalAlpha = 1;

            // 2. 玻璃上的水珠（靜止，跟著手繪節奏微微閃）＋滑落的大水珠
            var b = KK.boil(t), drops = dropImgs();
            if (drops.length) {                       // 點陣水滴（畫出來的，不是寫實玻璃水珠）
              for (var j2 = 0; j2 < st.beads.length; j2++) {
                var bd2 = st.beads[j2], im = drops[j2 % drops.length], dw = bd2.s * 2.2, dh = dw * im.naturalHeight / im.naturalWidth;
                g.globalAlpha = 0.9; g.drawImage(im, bd2.x - dw / 2, bd2.y - dh / 2, dw, dh);
              }
              for (var q2 = 0; q2 < runs.length; q2++) {
                var R2 = runs[q2]; if (R2.a <= 0.01) continue;
                var im2 = drops[q2 % drops.length], dw2 = u * 0.045 * RUNNERS[q2].s, dh2 = dw2 * im2.naturalHeight / im2.naturalWidth;
                g.globalAlpha = R2.a; g.drawImage(im2, R2.x - dw2 / 2, R2.y - dh2 * 0.7, dw2, dh2);
              }
              g.globalAlpha = 1;
            } else {
            for (var j = 0; j < st.beads.length; j++) {
              var bd = st.beads[j];
              KK.drawSprite(g, st.bead, bd.x, bd.y, bd.s * 2 * (1 + 0.04 * ((b + j) % 3 - 1)), 0.9);
            }
            for (var q = 0; q < runs.length; q++) {
              var Rq = runs[q];
              if (Rq.a <= 0.01) continue;
              var sz = u * 0.03 * RUNNERS[q].s;
              KK.drawSprite(g, st.bead, Rq.x, Rq.y, sz * 1.15, Rq.a);
              KK.drawSprite(g, st.bead, Rq.x, Rq.y - sz * 0.35, sz * 0.7, Rq.a * 0.8);
            }
            }

            // 3. 窗外毛毛雨：一層稀疏細短雨絲（每 loop 落 STREAK_TILES_PER_LOOP 個 tile 高 → 無縫）。
            //    rain-strokes.png 太密太長（像暴雨），Kai 2026-11-16 起不再平鋪使用。
            g.globalAlpha = STREAK_ALPHA;
            g.drawImage(st.rain, 0, Ch - KK.mod(ph * STREAK_TILES_PER_LOOP, 1) * Ch, Cw, Ch, 0, 0, w, h);
            g.globalAlpha = 1;

            // 3b. r8：手指點雲下的一陣小雨（比毛毛雨密、粗一點），從雲底落下；落地處起漣漪
            drawShowers(g, S);

            // 3c. r8 方案 C：頂部一大片雨雲（rain-c-clouds.webp）。整片左右輕飄；被點時抖一下
            var aCl = ART('rain-c-clouds.webp'), CR = null;
            if (aCl && KK.placeArt) {
              CR = KK.placeArt(aCl, S, CLOUD_BOX, { landFull: 'stretch', landMaxH: 0.3 });
              var shake = 0;
              for (var si = 0; si < st.showers.length; si++) {
                var sa0 = S.now - st.showers[si].born;
                if (sa0 >= 0 && sa0 < 0.5) shake += Math.sin(sa0 * 46) * u * 0.007 * (1 - sa0 / 0.5);
              }
              var drift = Math.sin(ph * TAU) * w * 0.012 + shake, over = 0.035;   // 圖畫寬一點，飄動時兩邊不露縫
              g.drawImage(aCl, CR.x - CR.w * over + drift, CR.y - CR.h * over * 0.5 + shake * 0.3, CR.w * (1 + 2 * over), CR.h * (1 + over));
            }
            st.cloudBase = CR ? CR.y + CR.h * 0.72 : h * 0.12;     // 雲底（雲圖下緣是畫出來的雨滴，雲本身約到 72%）
            st.tapLimit = CR ? CR.y + CR.h + h * 0.12 : h * 0.4;   // 點在這條線以上＝點雲下雨；以下＝原本的漣漪水花

            // 4. 左下角：水窪裡騎單車的母子（rain-c-bike.webp），車頭小燈微微亮；水窪裡的漣漪（整數圈擴散）
            var aBk = ART('rain-c-bike.webp');
            if (aBk && KK.placeArt) {
              var BR = KK.placeArt(aBk, S, BIKE_BOX);
              g.drawImage(aBk, BR.x, BR.y, BR.w, BR.h);
              g.save(); g.globalCompositeOperation = 'screen';
              KK.drawSprite(g, KK.glow(P.apricot, 96), BR.x + BR.w * BIKE_LAMP[0], BR.y + BR.h * BIKE_LAMP[1], BR.w * 0.22, 0.32 + 0.08 * Math.sin(ph * TAU * 6));
              g.restore();
              g.lineWidth = Math.max(1.2, u * 0.003);
              for (var k2 = 0; k2 < RIPPLES.length; k2++) {
                var rp = RIPPLES[k2], kk = KK.mod(ph * rp[2] + rp[3], 1);
                for (var ring = 0; ring < 2; ring++) {
                  var kr = kk - ring * 0.18;
                  if (kr <= 0) continue;
                  var rx = BR.w * 0.1 * kr, al = (1 - kr) * 0.7;
                  g.strokeStyle = KK.rgba(P.cream, al);
                  g.beginPath(); g.ellipse(BR.x + BR.w * rp[0], BR.y + BR.h * rp[1], rx, rx * 0.3, 0, 0, TAU); g.stroke();
                }
              }
            } else {
              var pg = g.createLinearGradient(0, h * 0.9, 0, h);
              pg.addColorStop(0, KK.rgba(P.mist, 0)); pg.addColorStop(1, KK.rgba(KK.mix(P.mist, P.slate, 0.4), 0.35));
              g.fillStyle = pg; g.fillRect(0, h * 0.9, w, h * 0.1);
            }
            drawShowerRipples(g, S);

            // 4b. 手指點出的漣漪＋小水花
            drawTaps(g, S);

            KK.paper(g, S, { grain: 0.4, vignette: 0.42 });
          },
        };
        return inst;
      },
    });
  });
  // 若 KK 已經載入（例如被別的頁面先載入），立刻註冊
  if (window.KK && window.KK.defineFilter && window.KK.Critter) DAYOF.kkPlugins[DAYOF.kkPlugins.length - 1](window.KK);
})();
