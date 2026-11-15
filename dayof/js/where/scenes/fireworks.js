/* Scene: fireworks — 煙火大會前的街道 (find 凱凱) */
(function () {
  var DAYOF = (window.DAYOF = window.DAYOF || {});
  DAYOF.Where = DAYOF.Where || { _scenes: {} };
  DAYOF.Where._scenes = DAYOF.Where._scenes || {};

  var VP = { x: 1000, y: 1000 };
  function half(y) { return 70 + (y - VP.y) * 0.5; }
  function sc(y) { return 0.24 + (y - VP.y) / 1600 * 1.32; }
  var HK = 0.5;
  function up(y, v) { return y - v * (y - VP.y) * (1 + HK); }

  var YUK = ['#3F5C8A', '#C9707A', '#7C9A8E', '#D8A24A', '#8A6AA0', '#B5483F', '#5E8CA6', '#E4B9A0'];
  var OBI = ['#E8C766', '#B5483F', '#F1E4C8', '#3F4E78', '#C9707A'];

  DAYOF.Where._scenes['fireworks'] = {
    W: 2000, H: 2600, bgColor: '#262B4C',
    build: function (S) {
      var bg = S.layer.bg, mid = S.layer.mid, fg = S.layer.fg, top = S.layer.top;

      // ---- sky ----
      var defs = S.el('defs', {}, bg);
      var g1 = S.el('linearGradient', { id: 'fwSky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      [['0', '#171B38'], ['0.6', '#2E3560'], ['1', '#7A5F78']].forEach(function (a) {
        S.el('stop', { offset: a[0], 'stop-color': a[1] }, g1);
      });
      S.rect(0, 0, 2000, 1060, { fill: 'url(#fwSky)' }, bg);
      for (var i = 0; i < 60; i++) {
        S.circle(S.range(20, 1980), S.range(20, 700), S.range(1.2, 3), { fill: '#F4EBD0', opacity: S.range(0.3, 0.8) }, bg);
      }
      S.circle(1560, 230, 60, { fill: '#F3E6B8', opacity: 0.85 }, bg);
      S.wash(1380, 120, 360, 220, '#F3E6B8', 0.10, bg);
      // distant hills + far roofs
      S.path('M0 1010 Q250 930 520 985 T1000 975 T1500 985 T2000 950 L2000 1060 L0 1060Z', { fill: '#3A3F63', opacity: 0.9 }, bg);
      for (i = 0; i < 9; i++) {
        var rx = 760 + i * 56, rh = S.range(26, 52);
        S.path('M' + rx + ' 1010 L' + rx + ' ' + (1010 - rh) + ' L' + (rx + 28) + ' ' + (1010 - rh - 14) + ' L' + (rx + 56) + ' ' + (1010 - rh) + ' L' + (rx + 56) + ' 1010Z', { fill: '#2A2E50' }, bg);
      }
      S.wash(700, 880, 600, 200, '#E8A670', 0.28, bg); // glow at end of street

      // ---- fireworks (pre-built groups, animated by scale/opacity) ----
      var bursts = [];
      var specs = [
        { x: 1000, y: 430, r: 210, c: '#F5D36B', c2: '#F08A5D', per: 4.2, off: 0 },
        { x: 520, y: 640, r: 140, c: '#9AD4E8', c2: '#F2F2F2', per: 3.6, off: 1.2 },
        { x: 1480, y: 560, r: 150, c: '#F29AB8', c2: '#F5D36B', per: 4.0, off: 2.1 },
        { x: 780, y: 220, r: 110, c: '#B6E3A0', c2: '#F5D36B', per: 3.4, off: 2.8 },
        { x: 1250, y: 230, r: 100, c: '#E8A0F0', c2: '#9AD4E8', per: 4.6, off: 0.6 }
      ];
      specs.forEach(function (b) {
        var g = S.el('g', { transform: 'translate(' + b.x + ' ' + b.y + ') scale(0.01)', opacity: 0 }, bg);
        S.circle(0, 0, b.r * 1.25, { fill: b.c, opacity: 0.12 }, g);
        var n = 14;
        for (var k = 0; k < n; k++) {
          var a = k / n * Math.PI * 2, col = k % 2 ? b.c : b.c2;
          var x1 = Math.cos(a) * b.r * 0.35, y1 = Math.sin(a) * b.r * 0.35;
          var x2 = Math.cos(a) * b.r, y2 = Math.sin(a) * b.r;
          S.el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
          S.circle(x2, y2, 6, { fill: col }, g);
          S.circle(Math.cos(a + 0.2) * b.r * 0.7, Math.sin(a + 0.2) * b.r * 0.7, 3.5, { fill: col, opacity: 0.8 }, g);
        }
        bursts.push({ g: g, b: b });
      });
      // static faded afterglow smoke
      S.wash(500, 300, 900, 300, '#9A8CC0', 0.10, bg);

      // ---- ground ----
      S.rect(0, 1000, 2000, 1600, { fill: '#B79A78' }, bg);
      S.path('M' + (VP.x - 70) + ' 1000 L' + (VP.x + 70) + ' 1000 L' + (VP.x + 930) + ' 2600 L' + (VP.x - 930) + ' 2600Z', { fill: '#D6BC92', filter: 'url(#wc)' }, bg);
      S.wash(900, 1000, 200, 300, '#F6D79A', 0.5, bg);
      S.wash(700, 1900, 600, 500, '#F6D79A', 0.22, bg);
      for (i = 0; i < 14; i++) { // paper scraps / street texture
        var ty = S.range(1100, 2550);
        S.rect(VP.x + S.range(-0.8, 0.8) * half(ty), ty, 30 * sc(ty) * 2, 5 * sc(ty) * 2, { fill: '#C4A57E', opacity: 0.5 }, bg);
      }

      // ---- wooden shop walls ----
      var ys = [960, 1010, 1075, 1160, 1275, 1430, 1640, 1930, 2320, 2800];
      var wood = ['#6B4A3A', '#7A5642', '#5E4A44', '#85604A', '#664A52'];
      var noren = ['#3F4E78', '#B5483F', '#2F6B6B', '#8A3F5E'];
      function Q(side, y1, y2, u0, u1, v0, v1) {
        var pts = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(function (p) {
          var y = y1 + (y2 - y1) * p[0];
          return (VP.x + side * half(y)) + ',' + up(y, p[1]);
        });
        return 'M' + pts.join('L') + 'Z';
      }
      [-1, 1].forEach(function (side) {
        for (var k = 0; k < ys.length - 1; k++) {
          var y1 = ys[k] + (side > 0 ? 15 : 0), y2 = ys[k + 1] + (side > 0 ? 15 : 0);
          if (k % 2 && side > 0) { y1 -= 15; }
          var col = S.pick(wood);
          S.path(Q(side, y1, y2, 0, 1, 0, 1), { fill: col, stroke: '#2E2022', 'stroke-width': 3, filter: 'url(#pencil)' }, mid);
          // upper floor lattice + lit windows
          S.path(Q(side, y1, y2, 0.1, 0.9, 0.62, 0.9), { fill: '#F2C66E', opacity: 0.85, stroke: '#3A2A26', 'stroke-width': 2 }, mid);
          for (var m = 1; m < 5; m++) S.path(Q(side, y1, y2, 0.1 + 0.16 * m, 0.1 + 0.16 * m + 0.012, 0.62, 0.9), { fill: '#3A2A26' }, mid);
          // tiled roof eave
          S.path(Q(side, y1, y2, -0.02, 1.02, 0.94, 1.06), { fill: '#3A3640', stroke: '#2A2630', 'stroke-width': 2 }, mid);
          // shop opening + noren
          S.path(Q(side, y1, y2, 0.15, 0.85, 0.02, 0.5), { fill: '#E8B66A', opacity: 0.9 }, mid);
          S.path(Q(side, y1, y2, 0.15, 0.85, 0.28, 0.52), { fill: S.pick(noren), opacity: 0.95 }, mid);
          for (m = 1; m < 4; m++) S.path(Q(side, y1, y2, 0.15 + 0.175 * m, 0.15 + 0.175 * m + 0.008, 0.28, 0.5), { fill: '#EFE3C8', opacity: 0.8 }, mid);
        }
      });
      S.wash(0, 1100, 500, 1400, '#F2C66E', 0.1, mid);

      // ---- yatai stalls at street edges ----
      function stall(side, y) {
        var s = sc(y), cx = VP.x + side * (half(y) - 95 * s), w = 170 * s, h = 150 * s;
        var x = cx - w / 2;
        S.rect(x, y - h * 0.55, w, h * 0.55, { fill: '#8A6A4C', stroke: '#2E2022', 'stroke-width': 2, filter: 'url(#pencil)' }, mid);
        S.rect(x - 4 * s, y - h * 0.58, w + 8 * s, 10 * s, { fill: '#5A4030' }, mid);
        S.rect(x + 8 * s, y - h * 0.5, w - 16 * s, h * 0.38, { fill: '#F2C66E', opacity: 0.55 }, mid);
        for (var k = 0; k < 6; k++) {
          S.rect(x + k * w / 6, y - h, w / 6, h * 0.34, { fill: k % 2 ? '#F1E4C8' : '#B5483F', stroke: '#2E2022', 'stroke-width': 1 }, mid);
        }
        S.rect(x - 3 * s, y - h * 1.04, w + 6 * s, 8 * s, { fill: '#5A4030' }, mid);
        S.circle(cx - w * 0.38, y - h * 0.58, 12 * s, { fill: '#E94F3D', stroke: '#6A2A22', 'stroke-width': 1 }, mid);
        S.circle(cx + w * 0.38, y - h * 0.58, 12 * s, { fill: '#E94F3D', stroke: '#6A2A22', 'stroke-width': 1 }, mid);
        S.wash(cx - w * 0.7, y - h * 0.9, w * 1.4, h * 1.0, '#F6C770', 0.25, mid);
      }
      [1180, 1380, 1620, 1930, 2300].forEach(function (y, i) { stall(i % 2 ? 1 : -1, y + (i % 2 ? 40 : 0)); });

      // ---- crowd of yukata folks heading toward the fireworks ----
      function yukata(x, y, s, parent) {
        var c = S.pick(YUK), o = S.pick(OBI);
        var g = S.el('g', {}, parent);
        S.path('M' + (x - 13 * s) + ' ' + (y - 54 * s) + ' Q' + x + ' ' + (y - 60 * s) + ' ' + (x + 13 * s) + ' ' + (y - 54 * s) + ' L' + (x + 12 * s) + ' ' + (y - 9 * s) + ' L' + (x - 12 * s) + ' ' + (y - 9 * s) + 'Z', { fill: c, opacity: 0.93, stroke: '#2E2022', 'stroke-width': 1.2 * Math.max(s, 0.6) }, g);
        for (var k = 0; k < 4; k++) {
          S.circle(x + S.range(-8, 8) * s, y - S.range(14, 50) * s, 2.4 * s, { fill: '#F4EBD8', opacity: 0.8 }, g);
        }
        S.rect(x - 13 * s, y - 38 * s, 26 * s, 9 * s, { fill: o, stroke: '#2E2022', 'stroke-width': 1 }, g);
        S.path('M' + (x - 8 * s) + ' ' + (y - 36 * s) + ' L' + (x - 17 * s) + ' ' + (y - 44 * s) + ' L' + (x - 15 * s) + ' ' + (y - 29 * s) + 'Z', { fill: o }, g);
        return g;
      }
      var items = ['lantern', 'cottoncandy', 'fan', null, null, null, 'balloon'];
      var poses = ['walk', 'walk', 'walk', 'stand', 'hold'];
      var kaiDone = false, kaiY = 1900;
      var y = 1030, row = 0;
      while (y < 2540) {
        var s = sc(y), cnt = Math.round(1 + s * 3.4 + (row % 2 ? 0.4 : 0));
        for (i = 0; i < cnt; i++) {
          var x = VP.x + S.range(-0.92, 0.92) * (half(y) - 30 * s);
          if (!kaiDone && y > kaiY) {
            kaiDone = true;
            var ks = sc(kaiY);
            var kx = 640;
            S.kai({ x: kx, y: kaiY, s: ks, flip: true, pose: 'walk', item: 'bag', parent: mid });
            // a lantern-carrying yukata walker partially in front of Kai
            var fy = kaiY + 14 * ks;
            S.animal({ x: kx + 20 * ks, y: fy, s: ks * 1.02, pose: 'walk', item: 'cottoncandy', parent: mid });
            yukata(kx + 20 * ks, fy, ks * 1.02, mid);
          }
          if (kaiDone && Math.abs(x - 640) < 70 * s && Math.abs(y - kaiY) < 40) continue;
          var animal = S.animal({ x: x, y: y, s: s, flip: S.rng() < 0.35, pose: S.pick(poses), item: S.pick(items), parent: mid });
          if (animal && S.KAI_KIND === undefined) { /* noop */ }
          yukata(x, y, s, mid);
        }
        y += 26 + s * 52 + S.range(0, 18); row++;
      }

      // ---- lantern strings across the street (top) ----
      function chain(y0, ya, n, wob) {
        var s = sc(y0 + 200);
        var xl = VP.x - half(y0) , xr = VP.x + half(y0);
        var yt = up(y0, 0.7);
        var d = 'M' + xl + ' ' + yt + ' Q' + VP.x + ' ' + (yt + 70 * s * 2) + ' ' + xr + ' ' + yt;
        S.path(d, { fill: 'none', stroke: '#2E2022', 'stroke-width': 2.5 * s * 1.5 }, top);
        for (var k = 0; k <= n; k++) {
          var t = k / n, px = (1 - t) * (1 - t) * xl + 2 * t * (1 - t) * VP.x + t * t * xr;
          var py = (1 - t) * (1 - t) * yt + 2 * t * (1 - t) * (yt + 70 * s * 2) + t * t * yt;
          var r = 17 * s * 1.5;
          S.el('ellipse', { cx: px, cy: py + r, rx: r * 0.8, ry: r, fill: k % 2 ? '#E94F3D' : '#F5C25A', stroke: '#5A2A22', 'stroke-width': 1.5 }, top);
          S.rect(px - r * 0.5, py + r * 0.1, r, r * 0.2, { fill: '#2E2022' }, top);
          S.circle(px, py + r, r * 1.9, { fill: '#F6B860', opacity: 0.16 }, top);
        }
      }
      chain(1280, 0, 8, 0); chain(1560, 0, 8, 0); chain(2000, 0, 9, 0);
      chain(2500, 0, 9, 0);

      // near foreground: a paper lantern pole & dark vignette
      S.wash(0, 2300, 2000, 300, '#2A2030', 0.25, fg);

      // ---- animation ----
      S.anim(function (t) {
        for (var k = 0; k < bursts.length; k++) {
          var b = bursts[k].b, p = (((t + b.off) % b.per) + b.per) % b.per / b.per;
          var e = 1 - Math.pow(1 - Math.min(p / 0.55, 1), 3);
          var sc2 = 0.05 + e * 1.0 + (p > 0.55 ? (p - 0.55) * 0.12 : 0);
          var op = p < 0.06 ? p / 0.06 : (p < 0.55 ? 1 : Math.max(0, 1 - (p - 0.55) / 0.35));
          bursts[k].g.setAttribute('transform', 'translate(' + b.x + ' ' + b.y + ') scale(' + sc2.toFixed(3) + ')');
          bursts[k].g.setAttribute('opacity', op.toFixed(2));
        }
      });
    }
  };
})();
