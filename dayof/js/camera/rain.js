/* 16〈創作-毛毛雨〉下雨（id 'rain'）：像隔著一扇起霧、沾滿雨珠的窗看世界；手指在霧上抹出一道清楚的痕，
 * 過一陣子霧又慢慢回來。與 KK 濾鏡同一套 API／手繪風格／暖色盤（KK.PAL），loop 12 秒無縫。
 *
 * 圖層（由下而上）：相機畫面 → 暖米色薄罩 → 霧玻璃層（半解析度離屏 C：霧紋 tile，挖掉手指抹痕 M 與水珠滑落痕）
 *   → 玻璃上的水珠（預畫 sprite）＋滑落中的大水珠 → 窗外細斜雨絲（可平鋪 tile）→ 下緣水窪漣漪
 *   → 偶爾出現撐傘的小動物（KK.Critter：Kai 牽著小袋熊）沿下緣走過 → 紙張顆粒＋暗角。
 * 分鏡（12 秒）：雨絲每 loop 落 6 個 tile 高；滑落水珠各自整數圈；漣漪整數圈；小動物 3–10.5s 走過一次（淡入淡出）。
 * 互動：手指抹霧（同〈明日晴れるかな〉抹烏雲的作法：1/6 解析度遮罩、destination-out）；遮罩每 0.25s 衰減一點 → 約 8 秒霧氣回來。
 * 載入：KK 還沒載入時本檔只登記到 DAYOF.kkPlugins，由 camera.js 在 KK 載入後執行註冊。 */
(function () {
  'use strict';
  window.DAYOF = window.DAYOF || {};
  var DAYOF = window.DAYOF;
  DAYOF.kkPlugins = DAYOF.kkPlugins || [];

  DAYOF.kkPlugins.push(function (KK) {
    if (KK.byId.rain) return;
    var P = KK.PAL, TAU = KK.TAU;
    var M_DIV = 6, C_DIV = 2, BRUSH = 0.13, FOG_ALPHA = 0.78;

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
      hint: '窗戶起霧了，用手指抹開看看',
      critterHint: '下緣偶爾有撐著傘的小動物（Kai 牽著小袋熊）走過水窪',
      create: function () {
        var st = { C: null, cg: null, M: null, mg: null, fog: null, rain: null, bead: null, beads: [], fingers: {}, lastDecay: 0, key: '', lw: 1 };

        function makeFog(Cw, Ch, U) {
          var t = KK.canvas(Cw, Ch), g = t.getContext('2d');
          var gr = g.createLinearGradient(0, 0, 0, Ch);
          gr.addColorStop(0, KK.rgba(KK.mix(P.cream, P.mist, 0.35), 0.78));
          gr.addColorStop(0.6, KK.rgba(KK.mix(P.cream, P.mist, 0.2), 0.66));
          gr.addColorStop(1, KK.rgba(KK.mix(P.cream, P.page, 0.4), 0.58));
          g.fillStyle = gr; g.fillRect(0, 0, Cw, Ch);
          var r = KK.rng(1616);
          // 霧的濃淡斑（柔邊光點疊）
          for (var i = 0; i < 46; i++) {
            var sz = U * (0.25 + r() * 0.5);
            KK.drawSprite(g, KK.glow(r() < 0.5 ? P.cream : P.mist, 128), r() * Cw, r() * Ch, sz, 0.12 + r() * 0.12);
          }
          // 細小凝結點
          for (var j = 0; j < 900; j++) {
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
          var Mw = Math.max(2, Math.round(S.w / M_DIV)), Mh = Math.max(2, Math.round(S.h / M_DIV));
          var oldM = st.M;
          st.M = KK.canvas(Mw, Mh); st.mg = st.M.getContext('2d');
          if (oldM) st.mg.drawImage(oldM, 0, 0, Mw, Mh);
          st.fingers = {};
          var U = S.u / C_DIV;
          st.fog = makeFog(Cw, Ch, U);
          st.rain = makeRain(Cw, Ch, U);
          st.bead = makeBead(64);
          var r = KK.rng(316);
          st.beads = [];
          for (var i = 0; i < 70; i++) st.beads.push({ x: r() * S.w, y: r() * S.h * 0.9, s: S.u * (0.008 + Math.pow(r(), 2) * 0.03), ph: r() });
          st.key = S.w + 'x' + S.h;
        }

        function stamp(m, x, y) { m.fillStyle = '#fff'; m.beginPath(); m.arc(x, y, st.lw / 2, 0, TAU); m.fill(); }
        function pointer(S, ev) {
          if (S.autoDemo || !st.mg) return;
          var m = st.mg, x = ev.x / M_DIV, y = ev.y / M_DIV;
          st.lw = (S.u * BRUSH) / M_DIV;
          if (ev.type === 'down') { st.fingers[ev.id] = { x: x, y: y }; stamp(m, x, y); }
          else if (ev.type === 'move') {
            var f = st.fingers[ev.id];
            if (!f) { st.fingers[ev.id] = { x: x, y: y }; stamp(m, x, y); return; }
            m.strokeStyle = '#fff'; m.lineCap = 'round'; m.lineJoin = 'round';
            m.beginPath(); m.moveTo(f.x, f.y); m.lineTo(x, y);
            m.globalAlpha = 0.3; m.lineWidth = st.lw * 1.2; m.stroke();
            m.globalAlpha = 1; m.lineWidth = st.lw; m.stroke();
            f.x = x; f.y = y;
          } else delete st.fingers[ev.id];
        }
        function reset() { if (st.mg) st.mg.clearRect(0, 0, st.M.width, st.M.height); st.fingers = {}; }

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
          // 小雨傘：磚紅傘面＋計程車黃滾邊，傘柄往下到小動物手邊（手繪抖動）
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

        var inst = {
          resize: resize,
          pointer: pointer,
          reset: reset,
          draw: function (g, S) {
            if (!st.C || st.key !== S.w + 'x' + S.h) resize(S);
            var t = S.t, u = S.u, ph = S.phase, w = S.w, h = S.h;
            var cg = st.cg, Cw = st.C.width, Ch = st.C.height;

            // 霧氣慢慢回來：遮罩每 0.25 秒衰減
            if (S.now - st.lastDecay > 0.25 || S.now < st.lastDecay) {
              st.lastDecay = S.now;
              var m = st.mg; m.save(); m.globalCompositeOperation = 'destination-out'; m.globalAlpha = 0.035; m.fillStyle = '#fff'; m.fillRect(0, 0, st.M.width, st.M.height); m.restore();
            }

            // 0. 暖米色薄罩（雨天的柔光）
            g.fillStyle = KK.rgba(KK.mix(P.cream, P.apricot, 0.25), 0.12);
            g.fillRect(0, 0, w, h);

            // 1. 霧玻璃層
            cg.globalCompositeOperation = 'copy'; cg.globalAlpha = 1;
            cg.drawImage(st.fog, 0, 0);
            cg.globalCompositeOperation = 'destination-out';
            cg.drawImage(st.M, 0, 0, Cw, Ch);
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
            var b = KK.boil(t);
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

            // 3. 窗外細斜雨絲（每 loop 落 6 個 tile 高 → 無縫）
            g.globalAlpha = 0.85;
            g.drawImage(st.rain, 0, Ch - KK.mod(ph * 6, 1) * Ch, Cw, Ch, 0, 0, w, h);
            g.globalAlpha = 1;

            // 4. 下緣水窪：淡淡的水面＋漣漪（手繪橢圓，整數圈擴散）
            var pg = g.createLinearGradient(0, h * 0.9, 0, h);
            pg.addColorStop(0, KK.rgba(P.mist, 0)); pg.addColorStop(1, KK.rgba(KK.mix(P.mist, P.slate, 0.4), 0.35));
            g.fillStyle = pg; g.fillRect(0, h * 0.9, w, h * 0.1);
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

            // 5. 撐傘的小動物：3–10.5 秒從左走到右，淡入淡出
            if (S.critter !== false) {
              var ck = (t - 3) / 7.5;
              if (ck > 0 && ck < 1) {
                var ca = KK.smooth(0, 0.12, ck) * (1 - KK.smooth(0.88, 1, ck));
                var cs = u * 0.075, cx = KK.lerp(-cs, w + cs, ck), cy = h * 0.965;
                var hop = Math.abs(Math.sin(ck * TAU * 6)) * cs * 0.04;
                KK.Critter.draw(g, cx, cy - hop, cs, { pose: 'walk', facing: 1, alpha: 0.85 * ca, tone: 0.35, t: t });
                drawUmbrella(g, cx + cs * 0.15, cy - hop, cs, t, ca);
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
