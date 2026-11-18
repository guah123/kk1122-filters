/* Where scene: bridge (flow 17) - winter night, full moon, Christmas market crowd going home */
(function () {
  window.DAYOF = window.DAYOF || {};
  var D = window.DAYOF;
  D.Where = D.Where || { _scenes: {} };
  D.Where._scenes = D.Where._scenes || {};

  D.Where._scenes['bridge'] = {
    W: 2000, H: 2600, bgColor: '#1F2840',
    build: function (S) {
      var W = S.W, H = S.H, L = S.layer;
      var MX = 1000, MY = 560, MR = 340;       // moon
      var HOR = 1080;                           // far bank / horizon
      var DECK = 1500;                          // bridge deck walking line (feet)
      var RIVER2 = 1700;                        // front river starts
      var o = function (a) { return a; };

      /* ---- sky ---- */
      var sky = S.el('linearGradient', { id: 'brSky', x1: 0, y1: 0, x2: 0, y2: 1 }, S.el('defs', {}, L.bg));
      [['0', '#161C33'], ['0.6', '#2B3558'], ['1', '#4A4A68']].forEach(function (s) {
        S.el('stop', { offset: s[0], 'stop-color': s[1] }, sky);
      });
      S.rect(0, 0, W, HOR + 40, { fill: 'url(#brSky)' }, L.bg);
      // moon glow (layered soft discs)
      var glow = [];
      [3.1, 2.3, 1.7, 1.3].forEach(function (k, i) {
        glow.push(S.circle(MX, MY, MR * k * 0.6, { fill: '#F6E7B4', opacity: 0.05 + i * 0.03 }, L.bg));
      });
      S.circle(MX, MY, MR, { fill: '#F8EBC0', filter: 'url(#wc)' }, L.bg);
      S.circle(MX, MY, MR * 0.96, { fill: '#FBF3D6', opacity: 0.8 }, L.bg);
      // maria (soft craters)
      [[-110, -90, 90], [70, -130, 60], [90, 40, 110], [-60, 90, 70], [-150, 40, 45], [20, -20, 40]].forEach(function (c) {
        S.circle(MX + c[0], MY + c[1], c[2], { fill: '#D9C894', opacity: 0.35 }, L.bg);
      });
      // stars
      for (var i = 0; i < 55; i++) {
        var sx = S.range(30, W - 30), sy = S.range(20, 880);
        if (Math.hypot(sx - MX, sy - MY) < MR * 1.25) continue;
        S.circle(sx, sy, S.range(1.5, 3.5), { fill: '#FFF6D8', opacity: S.range(0.4, 0.9) }, L.bg);
      }
      // thin clouds
      [[250, 300, 420], [1650, 700, 380], [1500, 220, 300], [300, 760, 360]].forEach(function (c) {
        S.wash(c[0], c[1], c[2], 70, '#6C6C8E', 0.35, L.bg);
      });

      /* ---- far bank + Christmas market ---- */
      S.rect(0, HOR - 10, W, 90, { fill: '#232B45' }, L.bg);
      // distant town silhouettes
      var bx = 0;
      while (bx < W) {
        var bw = S.range(70, 150), bh = S.range(60, 190);
        S.rect(bx, HOR - bh, bw, bh + 10, { fill: '#2A3150', opacity: 0.95 }, L.bg);
        if (S.rng() < 0.5) S.path('M' + bx + ' ' + (HOR - bh) + ' l' + bw / 2 + ' -40 l' + bw / 2 + ' 40z', { fill: '#2A3150' }, L.bg);
        for (var w = 0; w < 3; w++) if (S.rng() < 0.5) S.rect(bx + 14 + w * 30, HOR - bh + 26 + S.range(0, 60), 12, 16, { fill: '#F4C46B', opacity: 0.75 }, L.bg);
        bx += bw + S.range(0, 20);
      }
      // market stalls on the left bank (x 80..900)
      var stalls = [[130, '#C4553F'], [330, '#E3A93B'], [530, '#4B8F7B'], [730, '#C4553F']];
      stalls.forEach(function (st) {
        var x = st[0], y = HOR + 40;
        S.rect(x, y - 100, 150, 100, { fill: '#5B3F31' }, L.bg);
        S.path('M' + (x - 14) + ' ' + (y - 100) + ' L' + (x + 164) + ' ' + (y - 100) + ' L' + (x + 140) + ' ' + (y - 150) + ' L' + (x + 10) + ' ' + (y - 150) + 'Z', { fill: st[1], filter: 'url(#wc)' }, L.bg);
        S.rect(x + 12, y - 88, 126, 58, { fill: '#FFD98A', opacity: 0.85 }, L.bg);
        S.wash(x + 75, y - 60, 220, 160, '#FFC965', 0.18, L.bg);
      });
      // christmas tree
      (function () {
        var tx = 930, ty = HOR + 40;
        S.path('M' + tx + ' ' + ty + ' l-70 0 l55 -90 l-40 0 l55 -90 l-30 0 l30 -70 l30 70 l-30 0 l55 90 l-40 0 l55 90z', { fill: '#2F5D4A', filter: 'url(#wc)' }, L.bg);
        S.path('M' + (tx - 3) + ' ' + (ty - 255) + ' l8 20 l22 3 l-16 15 l5 22 l-19 -11 l-19 11 l5 -22 l-16 -15 l22 -3z', { fill: '#FFD36B' }, L.bg);
        for (var k = 0; k < 14; k++) S.circle(tx + S.range(-45, 45) * (1 - k / 18), ty - 20 - k * 17, 5, { fill: S.pick(['#FF7A59', '#FFD36B', '#fff']) }, L.bg);
      })();
      // string lights across market
      var bulbs = [];
      S.path('M60 ' + (HOR - 120) + ' Q 500 ' + (HOR - 40) + ' 900 ' + (HOR - 150), { fill: 'none', stroke: '#1a1a2a', 'stroke-width': 3 }, L.bg);
      for (var b = 0; b < 26; b++) {
        var t = b / 25, bxp = 60 + t * 840, byp = (1 - t) * (1 - t) * (HOR - 120) + 2 * t * (1 - t) * (HOR - 40) + t * t * (HOR - 150);
        bulbs.push(S.circle(bxp, byp + 8, 6, { fill: S.pick(['#FFD36B', '#FF8A6B', '#FFF2C0']) }, L.bg));
      }
      // faint market crowd far away (tiny)
      S.crowd({ x: 100, y: HOR + 10, w: 820, h: 70, n: 14, s: 0.28, sortByY: true, parent: L.bg });

      /* ---- river (far, behind bridge) ---- */
      var rv = S.el('linearGradient', { id: 'brRiv', x1: 0, y1: 0, x2: 0, y2: 1 }, L.bg.parentNode.querySelector('defs') || S.el('defs', {}, L.bg));
      [['0', '#2A3454'], ['1', '#141A2E']].forEach(function (s) { S.el('stop', { offset: s[0], 'stop-color': s[1] }, rv); });
      S.rect(0, HOR + 60, W, H - HOR - 60, { fill: 'url(#brRiv)' }, L.bg);
      // far reflection of market lights (small, plausible)
      for (var m = 0; m < 6; m++) S.rect(120 + m * 130, HOR + 130 + m % 2 * 12, 60, 6, { fill: '#F4C46B', opacity: 0.25, rx: 3 }, L.bg);

      // MOON REFLECTION: directly below moon, mirrored about horizon band; shimmering strips
      var ripples = [];
      var ry0 = RIVER2 + 120, ry1 = H - 60;
      S.wash(MX, (ry0 + ry1) / 2, 760, 900, '#F4E3A8', 0.10, L.bg);
      S.circle(MX, 2060, 300, { fill: '#F6E7B0', opacity: 0.35, filter: 'url(#wc)' }, L.bg);
      for (var r = 0; r < 22; r++) {
        var yy = 1800 + r * 34 + S.range(-8, 8);
        var span = Math.sqrt(Math.max(0, 1 - Math.pow((yy - 2060) / 330, 2))) * 330;
        if (span < 30) continue;
        var rw = span * S.range(0.9, 1.9);
        var rr = S.rect(MX - rw / 2, yy, rw, S.range(7, 13), { fill: r % 2 ? '#FFF4C8' : '#E9D58F', opacity: 0.6, rx: 6 }, L.bg);
        ripples.push({ el: rr, cx: MX, w: rw, y: yy, ph: S.range(0, 6.28), sp: S.range(0.6, 1.4) });
      }
      // dark ripple lines elsewhere
      for (var q = 0; q < 24; q++) {
        var qx = S.range(40, W - 300), qy = S.range(HOR + 100, H - 40);
        if (Math.abs(qx - MX) < 420 && qy > 1700) continue;
        S.rect(qx, qy, S.range(60, 190), 5, { fill: '#3B466C', opacity: 0.55, rx: 3 }, L.bg);
      }

      /* ---- bridge ---- */
      var br = L.mid;
      // far side railing + deck body
      S.rect(0, DECK - 10, W, 200, { fill: '#3B3342', filter: 'url(#wc)' }, br);       // deck side
      S.rect(0, DECK - 14, W, 22, { fill: '#6A5A57' }, br);                                // walkway edge
      // arches below deck
      for (var a = 0; a < 4; a++) {
        var ax = a * 560 - 60;
        S.path('M' + ax + ' ' + (DECK + 190) + ' Q ' + (ax + 280) + ' ' + (DECK + 20) + ' ' + (ax + 560) + ' ' + (DECK + 190) + ' L' + (ax + 560) + ' ' + (DECK + 200) + ' L' + ax + ' ' + (DECK + 200) + 'Z', { fill: '#141A2E', opacity: 0.95 }, br);
        S.path('M' + ax + ' ' + (DECK + 190) + ' Q ' + (ax + 280) + ' ' + (DECK + 20) + ' ' + (ax + 560) + ' ' + (DECK + 190), { fill: 'none', stroke: '#74645E', 'stroke-width': 10 }, br);
      }
      S.rect(0, DECK + 196, W, 14, { fill: '#0F1426', opacity: 0.8 }, br);
      // back railing (behind crowd)
      S.rect(0, DECK - 170, W, 10, { fill: '#2F2A3A' }, br);
      for (var p = 0; p < 42; p++) S.rect(p * 50 + 12, DECK - 160, 6, 148, { fill: '#2F2A3A' }, br);

      // lamp posts (back) with glow
      var lampX = [260, 760, 1260, 1760], lampGlows = [];
      lampX.forEach(function (lx) {
        S.rect(lx - 6, DECK - 480, 12, 480, { fill: '#241F2E' }, br);
        S.path('M' + (lx - 26) + ' ' + (DECK - 480) + ' l52 0 l-10 -46 l-32 0z', { fill: '#241F2E' }, br);
        S.wash(lx, DECK - 520, 360, 360, '#FFD98A', 0.22, br);
        S.circle(lx, DECK - 508, 20, { fill: '#FFF0B5' }, br);
        lampGlows.push(S.circle(lx, DECK - 508, 38, { fill: '#FFE59A', opacity: 0.3 }, br));
        // pool of light on deck
        S.wash(lx, DECK - 6, 300, 60, '#FFD98A', 0.28, br);
      });
      // light string between lamps
      for (var ls = 0; ls < 3; ls++) {
        var x0 = lampX[ls], x1 = lampX[ls + 1];
        S.path('M' + x0 + ' ' + (DECK - 470) + ' Q ' + (x0 + x1) / 2 + ' ' + (DECK - 400) + ' ' + x1 + ' ' + (DECK - 470), { fill: 'none', stroke: '#241F2E', 'stroke-width': 3 }, br);
        for (var bb = 1; bb < 10; bb++) {
          var t2 = bb / 10, px = x0 + (x1 - x0) * t2, py = (1 - t2) * (1 - t2) * (DECK - 470) + 2 * t2 * (1 - t2) * (DECK - 400) + t2 * t2 * (DECK - 470);
          S.circle(px, py + 7, 5, { fill: S.pick(['#FFD36B', '#FF8A6B', '#FFF2C0']) }, br);
        }
      }

      /* ---- crowd on the bridge ---- */
      var items = ['gift', 'bag', 'lantern', 'cup', 'cottoncandy'];
      var avoid = [{ x: 1090, y: DECK + 40, r: 170 }, { x: 560, y: DECK + 40, r: 70 }];
      S.crowd({ x: 40, y: DECK - 70, w: W - 80, h: 110, n: 62, sMin: 0.95, sMax: 1.2, poses: ['walk', 'walk', 'stand', 'hold'], items: items, avoid: avoid, sortByY: true, parent: br });

      // the child vignette: little one on tiptoe pointing at the reflection, cotton candy in other hand
      var childX = 1090, childY = DECK + 40;
      var kind = (S.KINDS && S.KINDS.indexOf('rabbit') >= 0) ? 'rabbit' : undefined;
      var cg = S.animal({ x: childX, y: childY, s: 0.7, kind: kind, pose: 'wave', item: 'cottoncandy', flip: false, parent: br });
      // parent standing behind, hand-in-hand
      S.animal({ x: childX + 70, y: childY - 8, s: 1.1, pose: 'stand', item: 'bag', flip: true, parent: br });
      S.animal({ x: childX - 60, y: childY - 10, s: 1.05, pose: 'stand', item: 'gift', parent: br });
      // pointing arrow-ish sparkle line toward reflection
      S.path('M' + (childX + 36) + ' ' + (childY - 52) + ' Q ' + (childX + 80) + ' ' + (childY + 90) + ' ' + (childX + 10) + ' ' + (childY + 330), { fill: 'none', stroke: '#FFF0B0', 'stroke-width': 3, 'stroke-dasharray': '2 14', 'stroke-linecap': 'round', opacity: 0.55 }, L.fg);
      var heart = S.text(childX - 20, childY - 120, '✨', { 'font-size': 38, opacity: 0.9 }, L.fg);

      /* ---- Kai: somewhere left-of-center, behind a lamp/person ---- */
      S.kai({ x: 560, y: DECK + 36, s: 1.05, pose: 'walk', item: 'lantern', parent: br });
      // occluders in front of Kai
      S.animal({ x: 585, y: DECK + 52, s: 1.25, pose: 'walk', item: 'bag', parent: br });
      S.animal({ x: 520, y: DECK + 58, s: 1.1, pose: 'stand', item: 'cup', parent: br });

      /* ---- front railing (translucent, foreground) ---- */
      S.rect(0, DECK + 70, W, 14, { fill: '#3A3244' }, L.fg);
      S.rect(0, DECK + 150, W, 8, { fill: '#3A3244' }, L.fg);
      for (var f = 0; f < 50; f++) S.rect(f * 40 + 8, DECK + 80, 7, 72, { fill: '#3A3244', opacity: 0.95 }, L.fg);
      S.rect(0, DECK + 62, W, 4, { fill: '#7A6A66', opacity: 0.7 }, L.fg);
      // front foreground couple walking at bottom of bridge sides? keep river clear; a few floating lanterns
      var lan = [];
      for (var l = 0; l < 5; l++) lan.push(S.circle(S.range(150, 1850), S.range(1950, 2450), 9, { fill: '#FFB86B', opacity: 0.8 }, L.fg));

      /* ---- snow ---- */
      var flakes = [];
      for (var n = 0; n < 60; n++) {
        flakes.push({ el: S.circle(0, 0, S.range(2, 5.5), { fill: '#FFFFFF', opacity: S.range(0.5, 0.95) }, L.top), x: S.range(0, W), y: S.range(0, H), v: S.range(40, 110), d: S.range(10, 40), ph: S.range(0, 6.28) });
      }

      /* ---- animation ---- */
      S.anim(function (t, dt) {
        dt = Math.min(dt || 0.016, 0.1);
        for (var i = 0; i < flakes.length; i++) {
          var f = flakes[i];
          f.y += f.v * dt;
          if (f.y > H + 10) { f.y = -10; f.x = S.range(0, W); }
          f.el.setAttribute('cx', (f.x + Math.sin(t * 0.8 + f.ph) * f.d).toFixed(1));
          f.el.setAttribute('cy', f.y.toFixed(1));
        }
        for (var j = 0; j < ripples.length; j++) {
          var r = ripples[j], k = 0.82 + 0.18 * Math.sin(t * r.sp + r.ph);
          r.el.setAttribute('width', (r.w * k).toFixed(1));
          r.el.setAttribute('x', (r.cx - r.w * k / 2 + Math.sin(t * 0.5 + r.ph) * 8).toFixed(1));
          r.el.setAttribute('opacity', (0.35 + 0.35 * Math.sin(t * r.sp * 1.3 + r.ph)).toFixed(2));
        }
        for (var g = 0; g < bulbs.length; g++) bulbs[g].setAttribute('opacity', (0.65 + 0.35 * Math.sin(t * 2 + g)).toFixed(2));
        for (var q = 0; q < glow.length; q++) glow[q].setAttribute('opacity', (0.06 + q * 0.03 + 0.015 * Math.sin(t * 0.7 + q)).toFixed(3));
        for (var h = 0; h < lampGlows.length; h++) lampGlows[h].setAttribute('opacity', (0.28 + 0.06 * Math.sin(t * 1.5 + h * 2)).toFixed(2));
        heart.setAttribute('opacity', (0.6 + 0.4 * Math.sin(t * 3)).toFixed(2));
      });
    }
  };
})();
