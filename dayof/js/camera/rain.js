/* 16〈創作-毛毛雨〉下雨（id 'rain'）：隔著淡淡起霧、沾著雨珠的鏡頭看世界；雨絲一直落、畫出來的水珠沿鏡頭滑下。
 * 與 KK 濾鏡同一套 API／手繪風格／暖色盤（KK.PAL），loop 12 秒無縫。
 * 圖層（由下而上）：相機畫面 → 暖米色薄罩 → 靜態薄霧（半解析度離屏 C，只挖掉水珠滑落痕）
 *   → 玻璃上的水珠＋滑落中的大水珠 → 細斜雨絲 → 下緣水窪漣漪 → 手指點出的漣漪＋小水花
 *   → 紅傘下的兩個人（人類：大人牽小孩）每 12 秒沿下緣走過一次 → 紙張顆粒＋暗角。
 * 互動（Kai 02:47：與〈太陽〉的抹開烏雲區隔）：點一下／按住滑動 → 在手指處出現漣漪圈＋小水花（可多指）。不再抹霧。
 * 點陣素材（有檔就用）：rain-mist（靜態薄霧）、rain-strokes、rain-drop-1..4、rain-puddle、rain-umbrella-walkers、rain-splash、rain-ripple。
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
      { x: 0.12, y0: 0.05, len: 0.55, laps: 1, off: 0.00, s: 1.0 },
      { x: 0.31, y0: 0.18, len: 0.62, laps: 1, off: 0.42, s: 0.8 },
      { x: 0.55, y0: 0.02, len: 0.48, laps: 2, off: 0.15, s: 0.7 },
      { x: 0.72, y0: 0.25, len: 0.58, laps: 1, off: 0.70, s: 1.1 },
      { x: 0.88, y0: 0.08, len: 0.66, laps: 1, off: 0.28, s: 0.85 },
      { x: 0.44, y0: 0.40, len: 0.42, laps: 2, off: 0.61, s: 0.65 },
      { x: 0.20, y0: 0.50, len: 0.38, laps: 1, off: 0.83, s: 0.75 },
    ];
    /* 水窪漣漪：x 比例、y 比例、每 loop 次數、偏移 */
    var RIPPLES = [
      [0.14, 0.955, 3, 0.0], [0.36, 0.975, 2, 0.3], [0.58, 0.95, 3, 0.55], [0.8, 0.97, 2, 0.15], [0.68, 0.985, 4, 0.8], [0.27, 0.94, 2, 0.7],
    ];

    KK.defineFilter({
      id: 'rain',
      no: 16,
      song: '創作-毛毛雨',
      title: '下雨',
      mood: '毛毛雨・起霧的窗・慢慢看清楚',
      duration: 12,
      hint: '點一下畫面，看雨滴濺起來',
      critterHint: '下緣偶爾有紅傘下的兩個人（大人牽小孩，人類）走過水窪',
      create: function () {
        var st = { C: null, cg: null, fog: null, rain: null, bead: null, beads: [], fingers: {}, taps: [], key: '' };

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
          var t = KK.canvas(Tw, Th), g = t.getContext('2d'), rnd = KK.rng(77), slope = 0.18;
          g.strokeStyle = KK.rgba(KK.mix(P.cream, P.mist, 0.4), 0.42);
          g.lineWidth = Math.max(1, U * 0.0035); g.lineCap = 'round';
          g.beginPath();
          for (var i = 0; i < 38; i++) {
            var x = rnd() * Tw, y = rnd() * Th, len = U * (0.035 + rnd() * 0.05);
            [-Tw, 0, Tw].forEach(function (ox) { [-Th, 0, Th].forEach(function (oy) { g.moveTo(x + ox, y + oy); g.lineTo(x + ox - len * slope, y + oy + len); }); });
          }
          g.stroke();
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
          for (var i = 0; i < 70; i++) st.beads.push({ x: r() * S.w, y: r() * S.h * 0.9, s: S.u * (0.008 + Math.pow(r(), 2) * 0.03), ph: r() });
          st.key = S.w + 'x' + S.h + (aMist ? 'm' : '');
        }

        /* 手指：按下就濺一次；按住滑動時每移動一段距離（且間隔 ≥0.12 秒）再濺一次 */
        function splash(S, x, y) {
          st.taps.push({ x: x, y: y, born: S.now, seed: Math.random() * 1000 });
          if (st.taps.length > 24) st.taps.shift();
        }
        function pointer(S, ev) {
          if (S.autoDemo) return;
          if (ev.type === 'down') { st.fingers[ev.id] = { x: ev.x, y: ev.y, t: S.now }; splash(S, ev.x, ev.y); }
          else if (ev.type === 'move') {
            var f = st.fingers[ev.id];
            if (f && Math.hypot(ev.x - f.x, ev.y - f.y) > S.u * 0.08 && S.now - f.t > 0.12) { f.x = ev.x; f.y = ev.y; f.t = S.now; splash(S, ev.x, ev.y); }
          } else delete st.fingers[ev.id];
        }
        function reset() { st.taps = []; st.fingers = {}; }
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

        function drawUmbrella(g, x, y, s, t, a) {
          // 小雨傘：磚紅傘面＋計程車黃滾邊，傘柄往下到大人手邊（手繪抖動）
          g.globalAlpha = a;
          var w = s * 0.95, top = y - s * 1.55;
          var pts = [];
          for (var i = 0; i <= 10; i++) { var ang = Math.PI + (i / 10) * Math.PI; pts.push([x + Math.cos(ang) * w, top + Math.sin(ang) * w * 0.55]); }
          for (var j = 4; j >= 0; j--) { var xx = x - w + (j + 0.5) * (2 * w / 5); pts.push([xx + w / 10, top + s * 0.06]); pts.push([xx - w / 10, top]); }
          KK.wobPath(g, pts, true, s * 0.02, 51, t);
          g.fillStyle = KK.rgba(P.brick, 0.92); g.fill();
          g.strokeStyle = KK.rgba(P.umber, 0.9); g.lineWidth = Math.max(1.2, s * 0.05); g.lineJoin = 'round'; g.stroke();
          g.strokeStyle = KK.rgba(P.ochre, 0.9); g.lineWidth = Math.max(1, s * 0.035);
          KK.wobPath(g, [[x - w * 0.5, top - w * 0.45], [x - w * 0.15, top - w * 0.53]], false, s * 0.015, 61, t); g.stroke();
          g.strokeStyle = KK.rgba(P.umber, 0.9); g.lineWidth = Math.max(1.2, s * 0.045); g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, top - w * 0.55); g.lineTo(x, top - w * 0.68); g.stroke();
          KK.wobPath(g, [[x, top], [x + s * 0.02, y - s * 0.62], [x + s * 0.12, y - s * 0.5]], false, s * 0.012, 71, t); g.stroke();
          g.globalAlpha = 1;
        }

        /* 紅傘下的兩個人（人類，同〈家〉的姊弟剪影風格）：大人撐傘、牽著小孩；面朝右走。x,y = 大人腳底 */
        function person(g, x, y, H, p, body, head, alpha, t, seed, armUp) {
          var sw = Math.sin(p);
          g.save(); g.translate(x, y - Math.abs(sw) * H * 0.04); g.globalAlpha = alpha;
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.strokeStyle = KK.rgba(P.umber, 0.9); g.lineWidth = Math.max(1.5, H * 0.075);
          g.beginPath(); g.moveTo(0, -H * 0.45); g.lineTo(sw * H * 0.16, 0); g.moveTo(0, -H * 0.45); g.lineTo(-sw * H * 0.16, 0); g.stroke();
          g.fillStyle = body;
          KK.wobPath(g, [[-H * 0.13, -H * 0.42], [-H * 0.09, -H * 0.8], [H * 0.09, -H * 0.8], [H * 0.15, -H * 0.42]], true, H * 0.008, seed, t); g.fill();
          g.strokeStyle = body; g.lineWidth = Math.max(1.5, H * 0.07);
          g.beginPath(); g.moveTo(H * 0.04, -H * 0.74);
          if (armUp) g.lineTo(H * 0.14, -H * 0.98); else g.lineTo(-H * 0.2, -H * 0.5);
          g.stroke();
          g.fillStyle = head;
          KK.wobCircle(g, 0, -H * 0.9, H * 0.11, H * 0.006, seed + 3, t, 10); g.fill();
          g.fillStyle = KK.rgba(P.umber, 0.85);                     // 頭髮
          g.beginPath(); g.arc(-H * 0.015, -H * 0.93, H * 0.105, Math.PI * 0.95, Math.PI * 2.05); g.fill();
          g.restore();
        }
        function drawPair(g, x, y, s, t, a, k) {
          var p = k * TAU * 6;
          person(g, x - s * 0.42, y, s * 0.78, p + 1.3, KK.mix(P.ochre, P.apricot, 0.3), KK.mix(P.cream, P.apricot, 0.35), a, t, 81, false);   // 小孩（黃雨衣）
          person(g, x, y, s * 1.22, p, KK.mix(P.mist, P.slate, 0.35), KK.mix(P.cream, P.apricot, 0.35), a, t, 91, true);                  // 大人（藍灰外套）
          g.globalAlpha = a; g.strokeStyle = KK.rgba(P.umber, 0.8); g.lineWidth = Math.max(1.2, s * 0.05); g.lineCap = 'round';
          g.beginPath(); g.moveTo(x - s * 0.24, y - s * 0.62); g.quadraticCurveTo(x - s * 0.3, y - s * 0.5, x - s * 0.4, y - s * 0.44); g.stroke();   // 牽手
          g.globalAlpha = 1;
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
              for (var j2 = 0; j2 < st.beads.length; j2 += 2) {
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

            // 3. 窗外細斜雨絲（每 loop 落 6 個 tile 高 → 無縫）
            var aRs = ART('rain-strokes.png');
            if (aRs) {                                // 點陣雨絲：可垂直平鋪，兩層不同速度（每 loop 整數個 tile → 無縫）
              [[w, 5, 0.85, 0], [w * 0.7, 8, 0.5, 0.37]].forEach(function (L) {
                var tw = L[0], th = tw * aRs.naturalHeight / aRs.naturalWidth, off = KK.mod(ph * L[1], 1) * th;
                g.globalAlpha = L[2];
                for (var xx = -L[3] * tw; xx < w; xx += tw) for (var yy = off - th; yy < h; yy += th) g.drawImage(aRs, xx, yy, tw, th);
              });
              g.globalAlpha = 1;
            } else {
              g.globalAlpha = 0.85;
              g.drawImage(st.rain, 0, Ch - KK.mod(ph * 6, 1) * Ch, Cw, Ch, 0, 0, w, h);
              g.globalAlpha = 1;
            }

            // 4. 下緣水窪：淡淡的水面＋漣漪（手繪橢圓，整數圈擴散）
            var pg = g.createLinearGradient(0, h * 0.9, 0, h);
            pg.addColorStop(0, KK.rgba(P.mist, 0)); pg.addColorStop(1, KK.rgba(KK.mix(P.mist, P.slate, 0.4), 0.35));
            var aPd = ART('rain-puddle.png');
            if (aPd) { var ph2 = w * aPd.naturalHeight / aPd.naturalWidth; g.drawImage(aPd, 0, h - ph2, w, ph2); }
            else { g.fillStyle = pg; g.fillRect(0, h * 0.9, w, h * 0.1); }
            g.lineWidth = Math.max(1.2, u * 0.0035);
            for (var k2 = 0; k2 < RIPPLES.length; k2++) {
              var rp = RIPPLES[k2];
              var kk = KK.mod(ph * rp[2] + rp[3], 1);
              for (var ring = 0; ring < 2; ring++) {
                var kr = kk - ring * 0.18;
                if (kr <= 0) continue;
                var rx = u * 0.11 * kr, al = (1 - kr) * 0.75;
                g.strokeStyle = KK.rgba(P.cream, al);
                g.beginPath(); g.ellipse(w * rp[0], h * rp[1], rx, rx * 0.28, 0, 0, TAU); g.stroke();
              }
            }

            // 4b. 手指點出的漣漪＋小水花
            drawTaps(g, S);

            // 5. 紅傘下的兩個人（人類）：3–10.5 秒從左走到右，淡入淡出
            if (S.critter !== false) {
              var ck = (t - 3) / 7.5;
              if (ck > 0 && ck < 1) {
                var ca = KK.smooth(0, 0.12, ck) * (1 - KK.smooth(0.88, 1, ck));
                var cs = u * 0.075, cx = KK.lerp(-cs, w + cs, ck), cy = h * 0.965;
                var hop = Math.abs(Math.sin(ck * TAU * 6)) * cs * 0.04;
                var aUw = ART('rain-umbrella-walkers.png');
                if (aUw) {                            // 點陣紅傘＋傘下兩人（原圖面朝右；行進方向向右，不需翻轉）
                  var us = u * 0.3;
                  g.globalAlpha = ca; g.drawImage(aUw, cx - us / 2, cy - hop - us * 0.95, us, us); g.globalAlpha = 1;
                } else {
                  drawPair(g, cx, cy - hop, cs, t, 0.9 * ca, ck);
                  drawUmbrella(g, cx + cs * 0.12, cy - hop, cs * 1.15, t, ca);
                }
                // 腳邊的小水花
                g.strokeStyle = KK.rgba(P.cream, 0.6 * ca);
                g.beginPath(); g.ellipse(cx, cy + cs * 0.05, cs * 0.35 * (0.6 + 0.4 * Math.abs(Math.sin(ck * TAU * 6))), cs * 0.07, 0, 0, TAU); g.stroke();
              }
            }

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
