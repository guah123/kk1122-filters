/* Scene 'bookstore' (flow item 19): 沐月書店 concert. main = audience from behind, selfie = Kai's front-camera view. */
(function () {
  window.DAYOF = window.DAYOF || {};
  DAYOF.Where = DAYOF.Where || { _scenes: {} };
  DAYOF.Where._scenes = DAYOF.Where._scenes || {};

  var W = 2000, H = 2600;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function build(S) {
    var P = S.pal || {};
    var WOOD = ['#B58A5E', '#A67B52', '#C29A6C', '#9C714A'];
    var BOOKS = ['#C9877A', '#8FA8A0', '#E0BC72', '#7E94B0', '#B79BB4', '#D9A27E', '#9DB48A', '#C4604F'];
    var FUR = ['#E8C9A0', '#D9B48C', '#C9A27A', '#EAD7BF', '#B8A58E', '#D8A98B', '#CFC1AE', '#BFA07F'];
    var CLOTH = ['#C9877A', '#8FA8A0', '#E0BC72', '#7E94B0', '#B79BB4', '#D9A27E', '#9DB48A', '#E6D3B0', '#A8806A'];
    var swayers = []; // {el, cx, cy, amp, ph, sp, base}

    function sway(el, cx, cy, amp, base) {
      swayers.push({ el: el, cx: cx, cy: cy, amp: amp, base: base || 0, ph: S.rng() * 6.28, sp: 2.2 + S.rng() * 1.4 });
    }

    /* ---------- shared room backdrop ---------- */
    function room(L, opts) {
      var bg = L.bg;
      S.rect(0, 0, W, H, { fill: '#F1E4CC' }, bg);
      S.wash(0, 0, W, 1000, '#F6D9A0', 0.35, bg);
      S.wash(300, 200, 1400, 900, '#FFF1CC', 0.45, bg);
      // floor
      S.rect(0, 1250, W, H - 1250, { fill: '#D9B98B' }, bg);
      for (var i = 0; i < 16; i++) S.path('M0 ' + (1280 + i * 90) + ' Q1000 ' + (1260 + i * 90 + S.range(-12, 12)) + ' 2000 ' + (1280 + i * 90), { stroke: '#B8946A', 'stroke-width': 2, fill: 'none', opacity: 0.35 }, bg);
      S.wash(200, 1500, 1600, 900, '#F3D9A8', 0.4, bg);
      // bookshelves left & right, tall
      [[40, 80, 520, 1180], [1440, 80, 520, 1180]].forEach(function (b) { shelf(bg, b[0], b[1], b[2], b[3]); });
      // back wall small shelf + window in middle
      S.rect(660, 180, 680, 520, { fill: '#FFF6DC', stroke: '#8A6B48', 'stroke-width': 10, rx: 14 }, bg);
      S.wash(680, 200, 640, 480, '#FFE7A0', 0.7, bg);
      S.path('M1000 190 V690 M670 440 H1330', { stroke: '#8A6B48', 'stroke-width': 8 }, bg);
      // lamps
      [[760, 60], [1240, 60]].forEach(function (l) { lamp(bg, l[0], l[1]); });
      // plants
      plant(bg, 640, 1210, 1.1); plant(bg, 1380, 1220, 1.3);
      return bg;
    }
    function shelf(g, x, y, w, h) {
      S.rect(x, y, w, h, { fill: WOOD[1], stroke: '#7A5636', 'stroke-width': 8 }, g);
      var rows = 6, rh = h / rows;
      for (var r = 0; r < rows; r++) {
        var ry = y + r * rh;
        S.rect(x + 12, ry + 10, w - 24, rh - 18, { fill: '#8E6743', opacity: 0.55 }, g);
        var bx = x + 16;
        while (bx < x + w - 40) {
          var bw = S.range(16, 34), bh = S.range(rh * 0.5, rh - 26);
          S.rect(bx, ry + rh - 12 - bh, bw, bh, { fill: S.pick(BOOKS), stroke: '#6A4A30', 'stroke-width': 1.5, opacity: 0.9 }, g);
          bx += bw + 2;
        }
        S.rect(x + 8, ry + rh - 14, w - 16, 10, { fill: WOOD[3] }, g);
      }
      S.wash(x, y, w, h, '#F6D9A0', 0.2, g);
    }
    function lamp(g, x, y) {
      S.path('M' + x + ' ' + y + ' V' + (y + 90), { stroke: '#6A4A30', 'stroke-width': 4 }, g);
      S.path('M' + (x - 50) + ' ' + (y + 150) + ' Q' + x + ' ' + (y + 40) + ' ' + (x + 50) + ' ' + (y + 150) + ' Z', { fill: '#F4C46E', stroke: '#B88A3E', 'stroke-width': 3 }, g);
      S.circle(x, y + 190, 120, { fill: '#FFE9A8', opacity: 0.35 }, g);
    }
    function plant(g, x, y, s) {
      S.path('M' + (x - 40 * s) + ' ' + y + ' L' + (x - 30 * s) + ' ' + (y - 60 * s) + ' H' + (x + 30 * s) + ' L' + (x + 40 * s) + ' ' + y + ' Z', { fill: '#C4604F', stroke: '#8E3F31', 'stroke-width': 3 }, g);
      for (var i = 0; i < 7; i++) {
        var a = -Math.PI / 2 + (i - 3) * 0.38, len = (110 + S.rng() * 60) * s;
        var ex = x + Math.cos(a) * len, ey = y - 60 * s + Math.sin(a) * len;
        S.path('M' + x + ' ' + (y - 60 * s) + ' Q' + (x + (ex - x) * 0.3) + ' ' + (ey - 20) + ' ' + ex + ' ' + ey + ' Q' + (x + (ex - x) * 0.7) + ' ' + (ey + 40) + ' ' + x + ' ' + (y - 60 * s) + 'Z', { fill: S.pick(['#7FA070', '#6E9266', '#93B07C']), stroke: '#4F7048', 'stroke-width': 2 }, g);
      }
    }
    function stage(g) {
      S.wash(520, 820, 960, 120, '#6A4A30', 0.25, g);
      S.rect(560, 880, 880, 70, { fill: '#B58A5E', stroke: '#7A5636', 'stroke-width': 6 }, g);
      S.rect(560, 950, 880, 110, { fill: '#9C714A', stroke: '#7A5636', 'stroke-width': 6 }, g);
      S.rect(700, 960, 600, 80, { fill: '#C9877A', opacity: 0.55 }, g); // rug
      // mic stand (empty spot, left of center) 
      var mx = 900, my = 880;
      S.path('M' + mx + ' ' + my + ' V' + (my - 220) + ' M' + (mx - 40) + ' ' + my + ' H' + (mx + 40), { stroke: '#4A4038', 'stroke-width': 6 }, g);
      S.path('M' + mx + ' ' + (my - 220) + ' q40 -20 56 6', { stroke: '#4A4038', 'stroke-width': 6, fill: 'none' }, g);
      S.circle(mx + 60, my - 210, 14, { fill: '#3A3430' }, g);
      // stool
      S.path('M1060 880 L1050 800 H1130 L1120 880', { stroke: '#6A4A30', 'stroke-width': 8, fill: 'none' }, g);
      S.rect(1040, 780, 100, 22, { fill: '#C29A6C', stroke: '#6A4A30', 'stroke-width': 3 }, g);
    }
    function paperPlane(g, x, y) { S.path('M' + x + ' ' + y + ' l60 -20 l-30 40 z', { fill: '#FFF', stroke: '#B8A58E', 'stroke-width': 2, opacity: 0.8 }, g); }

    /* ---------- MAIN view: audience from behind ---------- */
    var Lm = S.layer;
    room(Lm);
    stage(Lm.mid);
    // guitarist on stage (empty spot kept = mic stand left; guitarist on stool)
    var gt = S.animal({ x: 1090, y: 880, s: 1.0, kind: S.pick(S.KINDS.filter(function (k) { return k !== 'mouse'; })), pose: 'sit', item: 'violin', parent: Lm.mid });
    paperPlane(Lm.bg, 1450, 560);

    // audience backs: custom
    function backPerson(parent, x, y, s, doSway) {
      var g = S.el('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' }, parent);
      var fur = S.pick(FUR), cloth = S.pick(CLOTH);
      var eared = S.rng();
      // body
      S.path('M-46 0 Q-52 -90 -30 -130 Q0 -150 30 -130 Q52 -90 46 0 Z', { fill: cloth, stroke: '#6A4A30', 'stroke-width': 3, filter: 'url(#wc)' }, g);
      // arms (single group, rotates)
      var a = S.el('g', { transform: 'translate(0 -125)' }, g);
      S.path('M-28 0 Q-50 -50 -46 -100', { stroke: fur, 'stroke-width': 14, 'stroke-linecap': 'round', fill: 'none' }, a);
      S.path('M28 0 Q50 -50 46 -100', { stroke: fur, 'stroke-width': 14, 'stroke-linecap': 'round', fill: 'none' }, a);
      S.circle(-46, -106, 12, { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, a);
      S.circle(46, -106, 12, { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, a);
      // head (from behind) + ears
      var hg = S.el('g', { transform: 'translate(0 -150)' }, g);
      if (eared < 0.4) { S.circle(-24, -34, 14, { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, hg); S.circle(24, -34, 14, { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, hg); }
      else if (eared < 0.7) { S.path('M-28 -20 L-20 -66 L-6 -30 Z M28 -20 L20 -66 L6 -30 Z', { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, hg); }
      else { S.path('M-20 -20 Q-34 -80 -12 -80 Q-6 -50 -4 -26 Z M20 -20 Q34 -80 12 -80 Q6 -50 4 -26 Z', { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, hg); }
      S.circle(0, 0, 34, { fill: fur, stroke: '#6A4A30', 'stroke-width': 3, filter: 'url(#wc)' }, hg);
      S.path('M-22 -14 Q0 -30 22 -14', { stroke: '#6A4A30', 'stroke-width': 3, fill: 'none', opacity: 0.4 }, hg);
      if (doSway) sway(a, 0, 0, 22, 0);
      return g;
    }
    var rows = [[1260, 0.8, 7, 280], [1420, 0.95, 7, 250], [1600, 1.1, 6, 270], [1810, 1.3, 5, 300], [2060, 1.55, 4, 330]];
    rows.forEach(function (r, ri) {
      var n = r[2], span = 1640, x0 = 180 + (ri % 2) * 40;
      for (var i = 0; i < n; i++) {
        var x = x0 + (i + 0.5) * (span / n) + S.range(-30, 30);
        backPerson(Lm.mid, x, r[0] + S.range(-10, 10) + 130 * r[1] * 0, r[1], true);
      }
    });
    // a few seated unanimated at far edges + foreground plant
    plant(Lm.fg, 120, 2540, 1.8); plant(Lm.fg, 1900, 2560, 2.0);
    S.text(1000, 2560, '沐月書店', { 'text-anchor': 'middle', 'font-size': 46, fill: '#8A6B48', opacity: 0.6 }, Lm.fg);

    /* ---------- SELFIE view ---------- */
    var V = S.view('selfie');
    var Lv = V.layer;
    S.useView('selfie');
    room(Lv);
    // behind-crowd far wall: stage replaced by back counter
    S.rect(560, 880, 880, 90, { fill: '#B58A5E', stroke: '#7A5636', 'stroke-width': 6 }, Lv.bg);
    plant(Lv.bg, 1000, 880, 1.2);
    paperPlane(Lv.bg, 500, 520);

    // waving hands above heads, behind crowd members (animated groups)
    var handCount = 0;
    function handPair(x, y, s) {
      var g = S.el('g', { transform: 'translate(' + x + ' ' + y + ')' }, Lv.mid);
      var a = S.el('g', {}, g), fur = S.pick(FUR);
      S.path('M-26 0 Q-44 -50 -40 -95', { stroke: fur, 'stroke-width': 13 * s, 'stroke-linecap': 'round', fill: 'none' }, a);
      S.path('M26 0 Q44 -50 40 -95', { stroke: fur, 'stroke-width': 13 * s, 'stroke-linecap': 'round', fill: 'none' }, a);
      S.circle(-40, -102, 12 * s, { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, a);
      S.circle(40, -102, 12 * s, { fill: fur, stroke: '#6A4A30', 'stroke-width': 2 }, a);
      sway(a, 0, 0, 24, 0); handCount++;
    }
    var crowdRows = [
      { y: 1320, s: 0.7, n: 12 }, { y: 1500, s: 0.85, n: 11 }, { y: 1710, s: 1.0, n: 10 },
      { y: 1950, s: 1.12, n: 8 }, { y: 2230, s: 1.25, n: 6 }
    ];
    var kaiX = 1290, kaiY = 1930, kaiS = 1.12;
    var avoid = [{ x: kaiX, y: kaiY - 60, r: 90 }];
    crowdRows.forEach(function (r, ri) {
      var span = 1760, x0 = 120 + (ri % 2) * 40;
      for (var i = 0; i < r.n; i++) {
        var x = x0 + (i + 0.5) * (span / r.n) + S.range(-20, 20);
        if (Math.abs(x - kaiX) < 150 && Math.abs(r.y - kaiY) < 120) continue;
        if (handCount < 36 && S.rng() < 0.7 && r.y < 2200) handPair(x, r.y - 90 * r.s, r.s);
        S.animal({ x: x, y: r.y + S.range(-8, 8), s: r.s, pose: S.pick(['stand', 'wave', 'wave', 'stand']), kind: S.pick(S.KINDS.filter(function (k) { return k !== 'mouse'; })), parent: Lv.mid });
      }
    });
    // Kai (once) + phone arm toward viewer
    S.kai({ x: kaiX, y: kaiY, s: kaiS, pose: 'hold', item: 'mic', parent: Lv.mid });
    // phone arm: extended up-left toward the viewer, partly overlapping Kai's side
    var pa = S.el('g', { transform: 'translate(' + (kaiX - 70) + ' ' + (kaiY - 130) + ')' }, Lv.mid);
    S.path('M60 40 Q20 10 -30 -30', { stroke: '#BFA07F', 'stroke-width': 14, 'stroke-linecap': 'round', fill: 'none' }, pa);
    S.rect(-62, -92, 46, 78, { fill: '#3A3430', stroke: '#222', 'stroke-width': 3, rx: 8, transform: 'rotate(-18 -40 -50)' }, pa);
    S.rect(-56, -84, 34, 60, { fill: '#7E94B0', opacity: 0.8, rx: 4, transform: 'rotate(-18 -40 -50)' }, pa);
    // occluder in front of Kai (partial): a nearby animal after him, lower & to the side
    S.animal({ x: kaiX + 58, y: kaiY + 40, s: 1.2, kind: S.pick(S.KINDS.filter(function (k) { return k !== 'mouse'; })), pose: 'wave', parent: Lv.mid });
    // foreground edge heads
    S.crowd({ x: 40, y: 2380, w: 1920, h: 180, n: 5, s: 1.5, parent: Lv.fg, sortByY: true, avoid: avoid });
    plant(Lv.fg, 80, 2570, 1.7);
    S.useView('main');

    /* ---------- animation ---------- */
    S.anim(function (t) {
      for (var i = 0; i < swayers.length; i++) {
        var w = swayers[i];
        var ang = w.base + Math.sin(t * w.sp + w.ph) * w.amp;
        w.el.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ' ' + w.cx + ' ' + w.cy + ')');
      }
    });
  }

  DAYOF.Where._scenes['bookstore'] = { W: W, H: H, bgColor: '#F1E4CC', build: build };
})();
