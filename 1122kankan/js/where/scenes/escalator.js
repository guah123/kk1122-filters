/* Scene: escalator — MRT hall at rush hour, four animated escalators. */
(function () {
  window.DAYOF = window.DAYOF || {};
  DAYOF.Where = DAYOF.Where || { _scenes: {} };
  DAYOF.Where._scenes = DAYOF.Where._scenes || {};

  DAYOF.Where._scenes['escalator'] = {
    W: 2000, H: 2600, bgColor: '#E6DFD1',
    build: function (S) {
      var W = S.W, H = S.H;
      var XS = 500, XE = 1700, K = 0.3833, RISE = (XE - XS) * K;
      var YT = [300, 860, 1420, 1980];           // top (right) end y of each escalator
      var DIR = [1, -1, 1, -1];                  // 1 = going up (right), -1 = going down
      var BG = S.layer.bg, MID = S.layer.mid, FG = S.layer.fg;

      // ---- hall: wall, tiles, ceiling, pillars
      S.rect(0, 0, W, H, { fill: '#E6DFD1' }, BG);
      S.wash(0, 0, W, 260, '#9fb0b5', 0.35, BG);
      S.wash(0, 1100, W, 600, '#d6c6a8', 0.25, BG);
      S.wash(0, 2200, W, 400, '#8f9aa3', 0.3, BG);
      for (var ty = 160; ty < H; ty += 120)
        S.path('M0 ' + ty + 'H' + W, { stroke: '#cfc5b2', 'stroke-width': 2, opacity: 0.6 }, BG);
      for (var px = 120; px < W; px += 240)
        S.path('M' + px + ' 0V' + H, { stroke: '#d8cebb', 'stroke-width': 2, opacity: 0.5 }, BG);
      for (var lx = 140; lx < W; lx += 260) {
        S.rect(lx, 60, 150, 14, { fill: '#fbf6df', opacity: 0.9 }, BG);
        S.wash(lx - 30, 40, 210, 120, '#fff4c8', 0.35, BG);
      }
      [60, 1960].forEach(function (x) {
        S.rect(x - 40, 0, 80, H, { fill: '#c9c0ae', opacity: 0.8, filter: 'url(#wc)' }, BG);
      });
      // wayfinding signs
      var signs = [[140, 400, '↑ 出口 2'], [140, 980, '↓ 月台 往南港'], [140, 1540, '↑ 轉乘 板南線'], [140, 2100, '↓ 月台 往淡水']];
      signs.forEach(function (g) {
        S.rect(g[0] - 20, g[1] - 44, 260, 62, { fill: '#3f6f78', rx: 8, opacity: 0.92 }, BG);
        S.text(g[0] + 6, g[1] - 2, g[2], { fill: '#f4efe2', 'font-size': 36, 'font-family': 'sans-serif' }, BG);
      });
      S.text(1180, 2350, '請讓出左側通行', { fill: '#8d8574', 'font-size': 34, 'font-family': 'sans-serif', opacity: 0.8 }, BG);

      // ---- escalators
      var esc = [];
      var L = XE - XS, MARG = 70, LW = L + 2 * MARG, N = 12, SPACING = LW / N;
      var COS = 1 / Math.sqrt(1 + K * K);

      YT.forEach(function (yt, i) {
        var yb = yt + RISE;
        // floors (landings)
        S.rect(0, yb, XS + 6, 70, { fill: '#cbbea4', filter: 'url(#wc)' }, BG);
        S.rect(XE - 6, yt, W - XE + 6, 70, { fill: '#cbbea4', filter: 'url(#wc)' }, BG);
        S.rect(0, yb + 70, XS, 12, { fill: '#9d927d', opacity: 0.6 }, BG);
        // truss underneath
        S.path('M' + XS + ' ' + (yb + 4) + 'L' + XE + ' ' + (yt + 4) + 'V' + (yt + 78) + 'L' + XS + ' ' + (yb + 78) + 'Z',
          { fill: '#7f878d', filter: 'url(#wc)', opacity: 0.95 }, BG);
        S.path('M' + XS + ' ' + (yb + 78) + 'L' + XE + ' ' + (yt + 78) + 'V' + (yt + 96) + 'L' + XS + ' ' + (yb + 96) + 'Z',
          { fill: '#575d63', opacity: 0.7 }, BG);
        // rear glass balustrade
        S.path('M' + XS + ' ' + (yb - 22) + 'L' + XE + ' ' + (yt - 22) + 'V' + (yt - 150) + 'L' + XS + ' ' + (yb - 150) + 'Z',
          { fill: '#cfe2e2', opacity: 0.4 }, BG);
        S.path('M' + XS + ' ' + (yb - 150) + 'L' + XE + ' ' + (yt - 150),
          { stroke: '#3d4348', 'stroke-width': 12, 'stroke-linecap': 'round' }, BG);
        // tread + animated step lines
        var d = 'M' + XS + ' ' + (yb + 10) + 'L' + XE + ' ' + (yt + 10);
        S.path(d, { stroke: '#8a9096', 'stroke-width': 22, fill: 'none' }, BG);
        var steps = S.path(d, { stroke: '#4b5157', 'stroke-width': 22, fill: 'none', 'stroke-dasharray': '5 31' }, BG);
        // arrow decal
        S.text(XS - 90, yb - 16, DIR[i] > 0 ? '⬆ 上' : '⬇ 下', { fill: '#7b7364', 'font-size': 34, 'font-family': 'sans-serif' }, BG);

        // riders
        var riders = [];
        for (var j = 0; j < N; j++) {
          var w = S.el('g', {}, MID);
          var it = S.pick([null, 'phone', 'phone', 'bag', null, 'phone']);
          var o = { x: 0, y: 0, s: S.range(0.8, 0.92), pose: 'stand', flip: DIR[i] < 0, parent: w };
          if (it) o.item = it;
          S.animal(o);
          if (S.rng() < 0.3) S.text(-8, -112, S.pick(['…', '……', 'zzZ', '?']),
            { fill: '#6b6f77', 'font-size': 26, 'font-family': 'sans-serif', opacity: 0.8 }, w);
          riders.push({ g: w, u: j * SPACING + S.range(-12, 12) });
        }
        esc.push({ yb: yb, yt: yt, dir: DIR[i], steps: steps, riders: riders });
      });

      // ---- landing crowds (dazed commuters waiting / shuffling)
      YT.forEach(function (yt, i) {
        var yb = yt + RISE;
        S.crowd({ x: 90, y: yb - 40, w: XS - 150, h: 60, n: 5, sMin: 0.8, sMax: 0.95, poses: ['stand'], items: ['phone', 'bag'], sortByY: true, parent: MID });
        S.crowd({ x: XE + 60, y: yt - 40, w: W - XE - 150, h: 60, n: 4, sMin: 0.8, sMax: 0.95, poses: ['stand'], items: ['phone', 'bag'], sortByY: true, parent: MID });
      });
      // a few stragglers on the open mezzanine floor strip at the bottom
      S.crowd({ x: 150, y: 2470, w: 1700, h: 80, n: 12, sMin: 0.85, sMax: 1.0, poses: ['stand', 'walk'], items: ['phone', 'bag'], sortByY: true, parent: MID });

      // ---- Kai: left landing of escalator #3, partly hidden by someone in front
      S.kai({ x: 330, y: esc[2].yb - 18, s: 0.92, pose: 'stand' });
      S.animal({ x: 372, y: esc[2].yb + 8, s: 1.05, pose: 'stand', item: 'phone', parent: FG });

      // gentle vignette wash over foreground
      S.wash(0, 0, W, H, '#7c8793', 0.07, S.layer.top);

      // ---- animation
      var V = 52; // horizontal px/s
      S.anim(function (t) {
        for (var i = 0; i < esc.length; i++) {
          var e = esc[i];
          e.steps.setAttribute('stroke-dashoffset', (-e.dir * V / COS * t) % 36);
          for (var j = 0; j < e.riders.length; j++) {
            var r = e.riders[j];
            var u = (((r.u + e.dir * V * t) % LW) + LW) % LW;
            var x = XS - MARG + u;
            var y = e.yb - (x - XS) * K;
            var edge = Math.min(u, LW - u);
            r.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
            r.g.setAttribute('opacity', edge < 60 ? (edge / 60).toFixed(2) : 1);
          }
        }
      });
    }
  };
})();
