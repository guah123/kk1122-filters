/* DAYOF.Where engine — scene builder, pan/zoom, hit-test, found celebration, hint, views.
   Contract: out/INTERFACES.md "Where engine". Plain script, no modules. */
window.DAYOF = window.DAYOF || {};
(function () {
  'use strict';
  var D = window.DAYOF;
  var NS = 'http://www.w3.org/2000/svg';
  var prevScenes = (D.Where && D.Where._scenes) || {};

  function E(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function H(tag, cls, parent, html) {
    var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e;
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  var ICON_FLIP = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="15" width="34" height="22" rx="4"/><path d="M17 15l2.5-4h9L31 15"/><circle cx="24" cy="26" r="6"/><path d="M14 8c3-3 8-4 12-3M34 8c-3-3-8-4-12-3" opacity=".0"/><path d="M33 44l4-3-4-3M15 44l-4-3 4-3" opacity=".0"/></svg>';
  var ICON_HINT = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 31c-3-3-5-6-5-10a12 12 0 0 1 24 0c0 4-2 7-5 10-1 1-1 3-1 4H18c0-1 0-3-1-4z"/><path d="M19 40h10M21 44h6"/></svg>';
  function icon(name, fb) {
    try { if (D.icons && D.icons[name]) return D.icons[name]; } catch (e) { }
    return fb;
  }

  /* -------------------------------------------------------------- palette */
  var PAL = {
    paper: '#F4ECDD', ink: '#5B4A3C',
    warm: ['#D9A689', '#E3B873', '#C9776B', '#B98A5E', '#E8C9A0', '#D8A28A'],
    cool: ['#8FA9B8', '#7C97A6', '#A8BBB0', '#6F8A8F', '#B5B8C6', '#9DBFD8'],
    skin: ['#E7C9A5', '#D8B08A', '#C99A76'],
    cloth: ['#C9776B', '#8FA9B8', '#A8BBB0', '#D9B56F', '#B7A0B8', '#8A9E7B', '#D8A28A', '#7C97A6', '#C9B79C', '#9E8CA8']
  };

  /* -------------------------------------------------------------- builder */
  function Builder(def, id, svgRoot, camG, defs, opts) {
    var rng = mulberry(hashStr(id) ^ (opts.seed || 0));
    var S = this;
    S.id = id; S.W = def.W || 2000; S.H = def.H || 2600;
    S.rng = rng; S.lowfx = !!opts.lowfx; S.pal = PAL;
    S.defs = defs; S.camG = camG;
    S.KINDS = (D.Chars && D.Chars.KINDS) ? D.Chars.KINDS.slice() : [];
    S.KAI_KIND = 'mouse';
    S.views = {}; S.curName = 'main'; S.anims = []; S.kaiInfo = null; S.sisterInfo = null; S._animals = []; S._uid = 0; S._bag = [];

    S.pick = function (arr) { return arr[Math.floor(rng() * arr.length) % arr.length]; };
    S.range = function (a, b) { return a + (b - a) * rng(); };
    S.uid = function (p) { return (p || 'u') + id + (++S._uid); };

    function makeView(name) {
      var g = E('g', { 'data-view': name, style: 'display:none' }, camG);
      var v = { name: name, g: g, layer: { bg: E('g', { class: 'L-bg' }, g), mid: E('g', { class: 'L-mid' }, g), fg: E('g', { class: 'L-fg' }, g), top: E('g', { class: 'L-top' }, g) }, bgColor: null };
      S.views[name] = v; return v;
    }
    makeView('main');
    S.layer = {};
    ['bg', 'mid', 'fg', 'top'].forEach(function (n) { Object.defineProperty(S.layer, n, { get: function () { return S.views[S.curName].layer[n]; }, enumerable: true }); });
    S.view = function (name) { return S.views[name] || makeView(name); };
    S.useView = function (name) { S.view(name); S.curName = name; return S; };
    S.viewNames = function () { return Object.keys(S.views); };

    S.el = function (tag, attrs, parent) { return E(tag, attrs, parent || S.layer.mid); };
    S.group = function (attrs, parent) { return E('g', attrs, parent || S.layer.mid); };
    S.path = function (d, attrs, parent) { var a = attrs || {}; a.d = d; return E('path', a, parent || S.layer.mid); };
    S.rect = function (x, y, w, h, attrs, parent) { var a = attrs || {}; a.x = x; a.y = y; a.width = w; a.height = h; return E('rect', a, parent || S.layer.mid); };
    S.circle = function (cx, cy, r, attrs, parent) { var a = attrs || {}; a.cx = cx; a.cy = cy; a.r = r; return E('circle', a, parent || S.layer.mid); };
    S.ellipse = function (cx, cy, rx, ry, attrs, parent) { var a = attrs || {}; a.cx = cx; a.cy = cy; a.rx = rx; a.ry = ry; return E('ellipse', a, parent || S.layer.mid); };
    S.line = function (x1, y1, x2, y2, attrs, parent) { var a = attrs || {}; a.x1 = x1; a.y1 = y1; a.x2 = x2; a.y2 = y2; return E('line', a, parent || S.layer.mid); };
    S.text = function (x, y, str, attrs, parent) {
      var a = attrs || {}; a.x = x; a.y = y; if (!a['font-family']) a['font-family'] = '"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif';
      var t = E('text', a, parent || S.layer.mid); t.textContent = str; return t;
    };
    // fill the whole world of the current view with a colour (bgColor wash)
    S.paper = function (color, parent) { return S.rect(0, 0, S.W, S.H, { fill: color || def.bgColor || PAL.paper }, parent || S.layer.bg); };

    // gradient helper -> 'url(#id)'
    S.gradient = function (o) {
      var gid = o.id || S.uid('gr');
      var g = E(o.type === 'radial' ? 'radialGradient' : 'linearGradient', { id: gid }, defs);
      if (o.type === 'radial') { g.setAttribute('cx', o.cx != null ? o.cx : 0.5); g.setAttribute('cy', o.cy != null ? o.cy : 0.5); g.setAttribute('r', o.r != null ? o.r : 0.5); if (o.fx != null) g.setAttribute('fx', o.fx); if (o.fy != null) g.setAttribute('fy', o.fy); }
      else { g.setAttribute('x1', o.x1 != null ? o.x1 : 0); g.setAttribute('y1', o.y1 != null ? o.y1 : 0); g.setAttribute('x2', o.x2 != null ? o.x2 : 0); g.setAttribute('y2', o.y2 != null ? o.y2 : 1); }
      if (o.units) g.setAttribute('gradientUnits', o.units);
      (o.stops || []).forEach(function (s) { E('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] != null ? s[2] : 1 }, g); });
      return 'url(#' + gid + ')';
    };

    // watercolour blob path (smooth, irregular). p controls squareness (0.5 = soft rectangle, 1 = ellipse)
    function blobD(cx, cy, rx, ry, jit, n, p) {
      var pts = [], i;
      for (i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        var j = 1 + (rng() - 0.5) * 2 * jit;
        pts.push([cx + rx * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), p) * j, cy + ry * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), p) * j]);
      }
      var d = '';
      for (i = 0; i < n; i++) {
        var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        if (i === 0) d += 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
        d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
      }
      return d + 'Z';
    }
    S.blobD = blobD;
    // soft watercolour wash: (x,y,w,h) box, colour, opacity. no SVG filter (cheap); edges are irregular + pooled.
    S.wash = function (x, y, w, h, color, opacity, parent) {
      var P = parent || S.layer.bg, g = E('g', { class: 'wash' }, P), op = opacity == null ? 0.6 : opacity;
      var cx = x + w / 2, cy = y + h / 2, rx = w / 2, ry = h / 2, sq = 0.52;
      E('path', { d: blobD(cx, cy, rx, ry, 0.045, 12, sq), fill: color, 'fill-opacity': op * 0.78 }, g);
      E('path', { d: blobD(cx, cy, rx * 0.9, ry * 0.9, 0.06, 10, sq), fill: color, 'fill-opacity': op * 0.5 }, g);
      E('path', { d: blobD(cx, cy, rx * 0.99, ry * 0.99, 0.04, 12, sq), fill: 'none', stroke: color, 'stroke-opacity': Math.min(1, op * 0.9), 'stroke-width': Math.max(1.5, Math.min(w, h) * 0.012) }, g);
      return g;
    };
    S.blob = function (cx, cy, rx, ry, color, opacity, parent) { return S.wash(cx - rx, cy - ry, rx * 2, ry * 2, color, opacity, parent); };
    // coloured-pencil hatching inside a box
    S.hatch = function (x, y, w, h, color, o, parent) {
      o = o || {}; var n = o.n || Math.round(w * h / 900), ang = (o.angle == null ? -35 : o.angle) * Math.PI / 180, len = o.len || 26;
      var g = E('g', { class: 'hatch', fill: 'none', stroke: color || PAL.ink, 'stroke-opacity': o.op == null ? 0.35 : o.op, 'stroke-width': o.sw || 1.1, 'stroke-linecap': 'round' }, parent || S.layer.bg), d = '';
      for (var i = 0; i < n; i++) { var px = x + rng() * w, py = y + rng() * h, l = len * (0.5 + rng() * 0.7); d += 'M' + px.toFixed(0) + ' ' + py.toFixed(0) + 'l' + (Math.cos(ang) * l).toFixed(0) + ' ' + (Math.sin(ang) * l).toFixed(0); }
      E('path', { d: d }, g); return g;
    };

    /* ---- characters ---- */
    function nextEntry() {
      if (!S._bag.length) {
        S._bag = (D.Chars ? D.Chars.crowdEntries() : []).slice();
        for (var i = S._bag.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = S._bag[i]; S._bag[i] = S._bag[j]; S._bag[j] = t; }
      }
      return S._bag.pop() || { kind: 'cat' };
    }
    S.animal = function (o) {
      o = o || {};
      var kind = o.kind, entry = null;
      if (o.id && D.Chars) entry = D.Chars.crowdEntries().filter(function (e) { return e.id === o.id; })[0];
      if (!kind && !entry) entry = nextEntry();
      if (entry) kind = kind || entry.kind;
      if (kind === 'mouse') kind = S.pick(S.KINDS);
      var parent = o.parent || S.layer.mid;
      var g = D.Chars.draw(kind, { x: o.x || 0, y: o.y || 0, s: o.s == null ? 1 : o.s, flip: o.flip, pose: o.pose, item: o.item, rnd: rng, img: entry && entry.img, outfit: o.outfit || (entry && entry.outfit), decoy: o.decoy });
      parent.appendChild(g); S._animals.push({ g: g, x: o.x || 0, y: o.y || 0, s: o.s == null ? 1 : o.s, view: S.curName, parent: parent });
      return g;
    };
    S.crowd = function (o) {
      o = o || {};
      var n = o.n || 20, parent = o.parent || S.layer.mid, pts = [], items = [], avoid = o.avoid || [], i, t;
      var poses = o.poses || ['stand', 'stand', 'stand', 'walk', 'walk', 'wave', 'hold'];
      var sMin = o.sMin || (o.s ? o.s * 0.88 : 0.85), sMax = o.sMax || (o.s ? o.s * 1.12 : 1.15);
      var minD = o.minDist != null ? o.minDist : Math.sqrt(o.w * o.h / n) * 0.55;
      for (i = 0; i < n; i++) {
        var best = null, bestD = -1;
        for (t = 0; t < 14; t++) {
          var x = o.x + rng() * o.w, y = o.y + rng() * o.h, bad = false, k, md = 1e9;
          for (k = 0; k < avoid.length; k++) { var dx = x - avoid[k].x, dy = y - avoid[k].y; if (dx * dx + dy * dy < avoid[k].r * avoid[k].r) { bad = true; break; } }
          if (bad) continue;
          for (k = 0; k < pts.length; k++) { var ex = x - pts[k].x, ey = (y - pts[k].y) * 1.6; var dd = Math.sqrt(ex * ex + ey * ey); if (dd < md) md = dd; }
          if (md > bestD) { bestD = md; best = { x: x, y: y }; if (md >= minD) break; }
        }
        if (best) pts.push({ x: best.x, y: best.y, s: sMin + rng() * (sMax - sMin) });
      }
      if (o.sortByY !== false) pts.sort(function (a, b) { return a.y - b.y; });
      var its = o.items;
      pts.forEach(function (p) {
        var item = null; if (its && its.length && rng() < (o.itemP != null ? o.itemP : 0.35)) item = S.pick(its);
        items.push(S.animal({ x: p.x, y: p.y, s: p.s, flip: rng() < 0.5, pose: S.pick(poses), item: item, parent: parent, decoy: rng() < (o.decoyP != null ? o.decoyP : 0.1) }));
      });
      return items;
    };
    S.kai = function (o) {
      o = o || {};
      if (S.kaiInfo && S.kaiInfo.g && S.kaiInfo.g.parentNode) S.kaiInfo.g.parentNode.removeChild(S.kaiInfo.g);
      var s = o.s == null ? 1 : o.s, parent = o.parent || S.layer.mid;
      var g = D.Chars.draw('mouse', { x: o.x || 0, y: o.y || 0, s: s, flip: o.flip, pose: o.pose || 'stand', item: o.item, rnd: rng, outfit: o.outfit || D.Chars.kaiOutfit(), kai: true });
      g.setAttribute('class', 'ch ch-mouse kai'); g.__flip = !!o.flip;
      parent.appendChild(g);
      S.kaiInfo = { g: g, view: S.curName, flip: !!o.flip, outfit: o.outfit || D.Chars.kaiOutfit(), x: o.x || 0, y: o.y || 0, s: s, x0: (o.x || 0) - 30 * s, x1: (o.x || 0) + 30 * s, y0: (o.y || 0) - 98 * s, y1: (o.y || 0) + 3 * s };
      return g;
    };
    // 姊姊 (small wombat sticker) — optional extra find. opts: {x,y,s=1,flip,parent}
    S.sister = function (o) {
      o = o || {};
      if (S.sisterInfo && S.sisterInfo.g.parentNode) S.sisterInfo.g.parentNode.removeChild(S.sisterInfo.g);
      var s = o.s == null ? 1 : o.s, H0 = 68, W0 = Math.round(H0 * 163 / 200);
      var g = E('g', { class: 'sister', transform: 'translate(' + (o.x || 0) + ',' + (o.y || 0) + ') scale(' + (s * (o.flip ? -1 : 1)) + ',' + s + ')' }, o.parent || S.layer.mid);
      E('ellipse', { cx: 0, cy: 0, rx: 14, ry: 3, fill: '#5B4A3C', 'fill-opacity': 0.13 }, g);
      var inner = E('g', { class: 'sis-in' }, g);
      E('image', { href: S.sisterUrl, x: -W0 / 2, y: -H0, width: W0, height: H0, preserveAspectRatio: 'xMidYMax meet' }, inner);
      S.sisterInfo = { g: g, inner: inner, view: S.curName, x: o.x || 0, y: o.y || 0, s: s, x0: (o.x || 0) - W0 / 2 * s - 4, x1: (o.x || 0) + W0 / 2 * s + 4, y0: (o.y || 0) - H0 * s - 2, y1: (o.y || 0) + 3 };
      return g;
    };
    S.sisterUrl = 'assets/sister-wombat.png';
    S.anim = function (fn) { S.anims.push(fn); return fn; };
  }

  /* -------------------------------------------------------------- built-in fallback scene (missing scene file) */
  var FALLBACK = {
    W: 2000, H: 2600, bgColor: '#EFE6D4',
    build: function (S) {
      S.paper('#EFE6D4');
      var i; for (i = 0; i < 14; i++) S.wash(S.range(0, 1700), S.range(0, 2300), S.range(300, 700), S.range(200, 600), S.pick(S.pal.warm.concat(S.pal.cool)), 0.22);
      S.crowd({ x: 150, y: 400, w: 1700, h: 2100, n: 150, items: ['balloon', 'bag', 'cup', 'bread'] });
      S.kai({ x: 1180, y: 1540, s: 1, pose: 'wave' });
      S.crowd({ x: 1100, y: 1560, w: 160, h: 80, n: 3, s: 1.1 });
    }
  };

  /* -------------------------------------------------------------- mount */
  var current = null; // handle of the latest interactive mount (for debug.solveWhere)
  var MAG = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="21" cy="21" r="12"/><path d="M30 30l11 11"/><path d="M16 18c1-2.4 3-3.8 5.4-4" opacity=".6"/></svg>';
  var CONF = ['#F2C66D', '#E8998F', '#A8D8C0', '#F6EFE2', '#9DBFD8', '#C2674E', '#B7A0B8'];

  function mount(container, sceneId, opts) {
    opts = opts || {};
    var interactive = opts.interactive !== false;
    var cfg = (window.DAYOF_CONFIG || {});
    var hintAfter = opts.hintAfterSec != null ? opts.hintAfterSec : (cfg.HINT_AFTER_SEC || 30);
    var def = D.Where._scenes[sceneId] || (D.Where._scenes['__fallback'] = D.Where._scenes['__fallback'] || FALLBACK);
    var destroyed = false, S = null;
    var qs = ''; try { qs = location.search; } catch (e) { }
    var lowfx = !!opts.lowfx || /[?&]lowfx=1/.test(qs) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 2);

    try { var cs = getComputedStyle(container); if (cs.position === 'static') container.style.position = 'relative'; } catch (e) { }
    var root = H('div', 'where-root' + (interactive ? '' : ' where-static') + (lowfx ? ' where-lowfx' : ''), container);
    root.style.background = def.bgColor || PAL.paper;
    var stage = H('div', 'where-stage', root);
    var svg = E('svg', { class: 'where-svg', width: '100%', height: '100%', 'aria-label': '場景' }, stage);
    var defs = E('defs', null, svg);
    var f1 = E('filter', { id: 'wc', x: '-6%', y: '-6%', width: '112%', height: '112%' }, defs);
    E('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.018', numOctaves: 2, seed: 3, result: 'n' }, f1);
    E('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 7, xChannelSelector: 'R', yChannelSelector: 'G' }, f1);
    var f2 = E('filter', { id: 'pencil', x: '-3%', y: '-3%', width: '106%', height: '106%' }, defs);
    E('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: 1, seed: 8, result: 'n' }, f2);
    E('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 1.8, xChannelSelector: 'R', yChannelSelector: 'G' }, f2);
    var camG = E('g', { class: 'cam' }, svg);
    var paper = H('div', 'where-paper', root);
    var hud = H('div', 'where-hud', root);
    var toastEl = H('div', 'where-toast', root);

    var vw = 0, vh = 0, cams = {}, curView = 'main', minK = 0.3, maxK = 1.6, t = 0, sec = 0, hints = 0, wrong = 0;
    var done = false, locked = false, started = !interactive || opts.intro === false, sisterFound = false;
    var raf = 0, last = 0, visible = true;
    var tween = null, inertia = null, dirty = true, moving = false, movingTimer = 0, hintObj = null, celebrate = null, hintShown = false, foundFired = false;
    var flipBtn = null, hintBtn = null, timers = [], slowFrames = 0;
    var fx = [], hops = [], amb = [], nextPick = 0, kaiAmb = null, sisNext = 3, bubbleEl = null, bubbleT = 0;
    var map = null; // minimap {sc,w,h,el,vp,canv:{view:canvas}}

    function later(fn, ms) { var id = setTimeout(function () { fn(); }, ms); timers.push(id); return id; }
    function toast(msg, ms) {
      toastEl.textContent = msg; toastEl.classList.add('show');
      if (toast._t) clearTimeout(toast._t);
      toast._t = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1600);
    }
    function world(sx, sy) { var c = cams[curView]; return { x: (sx - c.tx) / c.k, y: (sy - c.ty) / c.k }; }
    function clampCam(c) {
      c.k = clamp(c.k, minK, maxK);
      var ww = S.W * c.k, wh = S.H * c.k;
      c.tx = ww <= vw ? (vw - ww) / 2 : clamp(c.tx, vw - ww, 0);
      c.ty = wh <= vh ? (vh - wh) / 2 : clamp(c.ty, vh - wh, 0);
    }
    function updateMapVp() {
      if (!map) return;
      var c = cams[curView]; if (!c) return;
      var x0 = clamp(-c.tx / c.k, 0, S.W), y0 = clamp(-c.ty / c.k, 0, S.H), x1 = clamp((vw - c.tx) / c.k, 0, S.W), y1 = clamp((vh - c.ty) / c.k, 0, S.H);
      var st = map.vp.style; st.left = (x0 * map.sc) + 'px'; st.top = (y0 * map.sc) + 'px'; st.width = Math.max(4, (x1 - x0) * map.sc) + 'px'; st.height = Math.max(4, (y1 - y0) * map.sc) + 'px';
    }
    function applyCam() {
      var c = cams[curView]; if (!c) return;
      camG.setAttribute('transform', 'translate(' + c.tx.toFixed(2) + ',' + c.ty.toFixed(2) + ') scale(' + c.k.toFixed(4) + ')');
      updateMapVp(); dirty = false;
    }
    function zoomAt(sx, sy, nk) {
      var c = cams[curView], w = world(sx, sy);
      c.k = clamp(nk, minK, maxK); c.tx = sx - w.x * c.k; c.ty = sy - w.y * c.k; clampCam(c); dirty = true;
    }
    function centerOn(wx, wy, k) { var c = cams[curView]; c.k = clamp(k == null ? c.k : k, minK, maxK); c.tx = vw / 2 - wx * c.k; c.ty = vh / 2 - wy * c.k; clampCam(c); dirty = true; }
    function tweenTo(wx, wy, k, dur) {
      var c = cams[curView]; var k1 = clamp(k == null ? c.k : k, minK, maxK);
      var ghost = { k: k1, tx: vw / 2 - wx * k1, ty: vh / 2 - wy * k1 }; clampCam(ghost);
      tween = { t0: t, dur: dur || 0.6, from: { k: c.k, tx: c.tx, ty: c.ty }, to: ghost }; inertia = null;
    }
    function tweenZoom(sx, sy, nk) {
      var c = cams[curView], w = world(sx, sy); var k1 = clamp(nk, minK, maxK);
      var g = { k: k1, tx: sx - w.x * k1, ty: sy - w.y * k1 }; clampCam(g);
      tween = { t0: t, dur: 0.32, from: { k: c.k, tx: c.tx, ty: c.ty }, to: g }; inertia = null;
    }
    function setMoving(on) {
      if (on) { if (!moving) { moving = true; root.classList.add('where-moving'); } clearTimeout(movingTimer); movingTimer = setTimeout(function () { moving = false; root.classList.remove('where-moving'); }, 160); }
    }

    function measure() {
      var r = root.getBoundingClientRect(); var nw = Math.round(r.width), nh = Math.round(r.height);
      if (!nw || !nh || !S) return false;
      var first = !vw, prevC = cams[curView], wc = null;
      if (!first && prevC) wc = { x: (vw / 2 - prevC.tx) / prevC.k, y: (vh / 2 - prevC.ty) / prevC.k };
      var wasMin = !first && prevC && prevC.k <= minK * 1.001;
      vw = nw; vh = nh;
      var contain = Math.min(vw / S.W, vh / S.H), cover = Math.max(vw / S.W, vh / S.H);
      minK = interactive ? contain : cover; maxK = interactive ? Math.max(cover * 4, 1.6, contain * 2) : cover;
      if (first) {
        Object.keys(S.views).forEach(function (n) { cams[n] = { k: minK, tx: 0, ty: 0 }; clampCam(cams[n]); });
      } else if (wc) {
        var c = cams[curView]; c.k = wasMin ? minK : clamp(c.k, minK, maxK); c.tx = vw / 2 - wc.x * c.k; c.ty = vh / 2 - wc.y * c.k;
        Object.keys(cams).forEach(function (n) { clampCam(cams[n]); });
      }
      svg.setAttribute('width', vw); svg.setAttribute('height', vh);
      dirty = true; applyCam();
      return true;
    }

    /* -------------- views / flip -------------- */
    function showView(name) {
      if (!S.views[name]) return;
      Object.keys(S.views).forEach(function (n) { S.views[n].g.style.display = n === name ? '' : 'none'; });
      curView = name; root.style.background = S.views[name].bgColor || def.bgColor || PAL.paper;
      root.setAttribute('data-view', name);
      if (map) Object.keys(map.canv).forEach(function (n) { map.canv[n].style.display = n === name ? '' : 'none'; });
      nextPick = 0; clearAmbient();
      if (cams[name]) { clampCam(cams[name]); dirty = true; applyCam(); }
    }
    function flipView() {
      if (locked || !started) return;
      var names = Object.keys(S.views); var next = names[(names.indexOf(curView) + 1) % names.length];
      var fl = H('div', 'where-flash', root); setTimeout(function () { if (fl.parentNode) fl.parentNode.removeChild(fl); }, 700);
      try {
        var a = stage.animate([{ transform: 'perspective(900px) rotateY(0deg)' }, { transform: 'perspective(900px) rotateY(88deg)' }], { duration: 230, easing: 'ease-in', fill: 'forwards' });
        a.onfinish = function () {
          if (destroyed) return;
          showView(next);
          var b = stage.animate([{ transform: 'perspective(900px) rotateY(-88deg)' }, { transform: 'perspective(900px) rotateY(0deg)' }], { duration: 260, easing: 'ease-out' });
          b.onfinish = function () { try { a.cancel(); } catch (e) { } };
        };
      } catch (e) { showView(next); }
      if (flipBtn) flipBtn.classList.remove('pulse');
    }

    /* -------------- effects -------------- */
    function star(g, r, col) {
      return E('path', { d: 'M0 ' + (-r) + ' Q0 0 ' + r + ' 0 Q0 0 0 ' + r + ' Q0 0 ' + (-r) + ' 0 Q0 0 0 ' + (-r) + ' Z', fill: col }, g);
    }
    // confetti + sparkle burst at world (x,y) in view
    function burst(x, y, viewName, o) {
      o = o || {};
      var layer = S.views[viewName || curView].layer.top, g = E('g', { class: 'burst', 'pointer-events': 'none' }, layer), ps = [], i;
      var ns = o.stars == null ? 16 : o.stars, nc = o.conf == null ? 44 : o.conf, sp = o.speed || 1;
      for (i = 0; i < ns; i++) { var a = i / ns * Math.PI * 2 + S.rng() * 0.3, e = E('g', null, g); star(e, 5 + S.rng() * 8, CONF[i % CONF.length]); ps.push({ e: e, vx: Math.cos(a) * (90 + S.rng() * 140) * sp, vy: Math.sin(a) * (90 + S.rng() * 140) * sp - 40, gr: 60, rot: S.rng() * 90, w: 120, life: 1.3 }); }
      for (i = 0; i < nc; i++) {
        var a2 = -Math.PI / 2 + (S.rng() - 0.5) * Math.PI * 1.25, v = (200 + S.rng() * 380) * sp, e2 = E('g', null, g);
        var col = CONF[i % CONF.length];
        if (i % 3) E('rect', { x: -4, y: -2.4, width: 8, height: 4.8, rx: 1, fill: col }, e2); else E('circle', { r: 3.2, fill: col }, e2);
        ps.push({ e: e2, vx: Math.cos(a2) * v, vy: Math.sin(a2) * v, gr: 520, rot: S.rng() * 360, w: (S.rng() - 0.5) * 700, life: 1.6 + S.rng() * 0.7 });
      }
      fx.push({ t0: t, g: g, ps: ps, x: x, y: y, life: 2.4, update: function (cu) {
        this.ps.forEach(function (p) {
          var px = this.x + p.vx * cu * (1 - 0.25 * Math.min(cu, 1.2)), py = this.y + p.vy * cu + 0.5 * p.gr * cu * cu, fa = clamp(1 - (cu - p.life * 0.55) / (p.life * 0.45), 0, 1);
          p.e.setAttribute('transform', 'translate(' + px.toFixed(1) + ',' + py.toFixed(1) + ') rotate(' + (p.rot + p.w * cu).toFixed(0) + ')'); p.e.setAttribute('opacity', fa.toFixed(2));
        }, this);
        return cu < this.life;
      } });
    }
    function banner(text, ms, cls) {
      var b = H('div', 'where-banner ' + (cls || ''), root, text);
      later(function () { if (b.parentNode) b.parentNode.removeChild(b); }, ms || 2000);
      return b;
    }
    function bubbleFor(gEl, text) {
      if (bubbleEl && bubbleEl.parentNode) bubbleEl.parentNode.removeChild(bubbleEl);
      var rr = gEl.getBoundingClientRect(), rb = root.getBoundingClientRect();
      var b = H('div', 'where-bubble', root, text);
      var cx = (rr.left + rr.right) / 2 - rb.left, ty = rr.top - rb.top - 4;
      b.style.left = clamp(cx, 56, rb.width - 56) + 'px'; b.style.top = ty + 'px';
      if (ty < 40) { b.style.top = (rr.bottom - rb.top + 6) + 'px'; b.classList.add('below'); }
      bubbleEl = b; clearTimeout(bubbleT); bubbleT = setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1500);
    }

    /* -------------- found / hint -------------- */
    function found(fromDebug) {
      if (done || !S || !S.kaiInfo) return;
      done = true; locked = true; started = true; foundFired = false; kaiAmb = null;
      var K = S.kaiInfo;
      if (curView !== K.view) showView(K.view);
      if (hintBtn) hintBtn.classList.remove('show'); hintBtn && hintBtn.classList.add('gone');
      if (hintObj) { if (hintObj.g.parentNode) hintObj.g.parentNode.removeChild(hintObj.g); hintObj = null; }
      var cx = (K.x0 + K.x1) / 2, cy = (K.y0 + K.y1) / 2;
      var layer = S.views[K.view].layer.top;
      var g0 = E('g', { class: 'found-fx', 'pointer-events': 'none' }, layer);
      var ring = E('circle', { cx: cx, cy: cy, r: 10, fill: 'none', stroke: '#F2C66D', 'stroke-width': 8, 'stroke-opacity': 0.95 }, g0);
      var ring2 = E('circle', { cx: cx, cy: cy, r: 10, fill: 'rgba(255,248,225,.25)', stroke: '#C2674E', 'stroke-width': 3, 'stroke-opacity': 0.8, 'stroke-dasharray': '10 8' }, g0);
      // Kai steps out of the crowd and waves (redrawn with the wave pose, no item)
      var ng = D.Chars.draw('mouse', { x: K.x, y: K.y, s: K.s, flip: K.flip, pose: 'wave', rnd: Math.random, outfit: K.outfit, kai: true });
      ng.setAttribute('class', 'ch ch-mouse kai'); ng.__flip = K.flip;
      if (K.g.parentNode) K.g.parentNode.removeChild(K.g);
      layer.appendChild(ng); K.g = ng;
      burst(cx, cy - 30, K.view, { stars: 18, conf: 54 });
      celebrate = { g: g0, ring: ring, ring2: ring2, cx: cx, cy: cy, t0: t, R: Math.max(70, (K.x1 - K.x0) * 1.2) };
      tweenTo(cx, cy, Math.max(cams[curView].k, Math.min(maxK, 170 / (100 * K.s))), 0.8);
      celebrate.banner = banner('找到凱凱了！', 2300, 'main');
      later(function () { locked = false; }, 2100);
      later(function () {
        if (destroyed || foundFired) return; foundFired = true;
        if (typeof opts.onFound === 'function') { try { opts.onFound({ sec: Math.round(sec), hints: hints, sister: sisterFound }); } catch (e) { console.error(e); } }
      }, fromDebug ? 900 : 1700);
    }
    function foundSister(fromDebug) {
      if (sisterFound || !S || !S.sisterInfo) return;
      sisterFound = true;
      var Si = S.sisterInfo;
      if (Si.view !== curView && fromDebug) showView(Si.view);
      burst((Si.x0 + Si.x1) / 2, Si.y0 + 10, Si.view, { stars: 10, conf: 26, speed: 0.7 });
      hops.push({ g: Si.inner, t0: t, big: true, sis: true });
      banner('找到姊姊了！', 1900, 'sis');
      Si.g.classList.add('found');
      if (typeof opts.onSister === 'function') { try { opts.onSister({ sec: Math.round(sec), hints: hints }); } catch (e) { console.error(e); } }
    }

    function useHint() {
      if (done || !S.kaiInfo || !started) return;
      var K = S.kaiInfo; hints++;
      if (K.view !== curView) {
        if (flipBtn) flipBtn.classList.add('pulse');
        toast('他好像不在這個畫面…試試「更換前後鏡頭」', 3200); return;
      }
      var cx = (K.x0 + K.x1) / 2, cy = (K.y0 + K.y1) / 2;
      var ang = S.rng() * Math.PI * 2, off = 60 + S.rng() * 50;
      var hx = cx + Math.cos(ang) * off, hy = cy + Math.sin(ang) * off;
      if (hintObj && hintObj.g.parentNode) hintObj.g.parentNode.removeChild(hintObj.g);
      var g = E('g', { class: 'hint-fx', 'pointer-events': 'none' }, S.views[K.view].layer.top);
      var R = clamp(115 / cams[curView].k, 130, 480);
      E('circle', { cx: hx, cy: hy, r: R, fill: 'rgba(255,240,200,.16)', stroke: '#E3B873', 'stroke-width': 5 / Math.max(0.4, Math.min(1, cams[curView].k * 2)), 'stroke-opacity': 0.8, 'stroke-dasharray': '16 12' }, g);
      var c2 = E('circle', { cx: hx, cy: hy, r: R, fill: 'none', stroke: '#F2C66D', 'stroke-width': 3, 'stroke-opacity': 0.6 }, g);
      hintObj = { g: g, c2: c2, hx: hx, hy: hy, R: R, t0: t };
      var cm = cams[curView], sx = hx * cm.k + cm.tx, sy = hy * cm.k + cm.ty;
      if (sx < 40 || sx > vw - 40 || sy < 60 || sy > vh - 60 || cm.k < minK * 1.6) tweenTo(hx, hy, Math.max(cm.k, Math.min(maxK, 0.75)), 0.8);
      toast('Kai 大概在這個圈圈附近', 2200);
    }

    /* -------------- minimap -------------- */
    function buildMap() {
      var sc = Math.min(86 / S.W, 112 / S.H), w = Math.round(S.W * sc), h = Math.round(S.H * sc);
      var el = H('div', 'where-map', hud); el.style.width = w + 'px'; el.style.height = h + 'px';
      map = { sc: sc, w: w, h: h, el: el, canv: {} };
      Object.keys(S.views).forEach(function (n) {
        var cv = H('canvas', 'where-map-c', el); cv.width = w * 2; cv.height = h * 2; cv.style.display = n === curView ? '' : 'none';
        var cx = cv.getContext('2d'); cx.fillStyle = S.views[n].bgColor || def.bgColor || PAL.paper; cx.fillRect(0, 0, cv.width, cv.height);
        map.canv[n] = cv;
      });
      map.vp = H('div', 'where-map-vp', el);
      var drag = false;
      function go(e) { var r = el.getBoundingClientRect(); centerOn(clamp((e.clientX - r.left) / map.sc, 0, S.W), clamp((e.clientY - r.top) / map.sc, 0, S.H)); tween = null; inertia = null; }
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); if (locked) return; drag = true; try { el.setPointerCapture(e.pointerId); } catch (er) { } go(e); });
      el.addEventListener('pointermove', function (e) { if (drag) { e.stopPropagation(); go(e); } });
      el.addEventListener('pointerup', function (e) { drag = false; });
      el.addEventListener('pointercancel', function () { drag = false; });
      updateMapVp();
      var names = Object.keys(S.views), i = 0;
      (function next() {
        if (destroyed || i >= names.length) return;
        var n = names[i++]; later(function () { thumb(n); next(); }, 380);
      })();
    }
    function thumb(n) {
      try {
        var v = S.views[n], clone = v.g.cloneNode(true); clone.removeAttribute('style');
        ['.kai', '.sister', '.hint-fx', '.found-fx', '.burst', 'image', 'text'].forEach(function (sel) { [].slice.call(clone.querySelectorAll(sel)).forEach(function (e) { e.parentNode && e.parentNode.removeChild(e); }); });
        [].slice.call(clone.querySelectorAll('[filter]')).forEach(function (e) { e.removeAttribute('filter'); });
        var dcl = defs.cloneNode(true); [].slice.call(dcl.querySelectorAll('filter')).forEach(function (e) { e.parentNode.removeChild(e); });
        var ser = new XMLSerializer();
        var bg = v.bgColor || def.bgColor || PAL.paper;
        var src = '<svg xmlns="' + NS + '" width="' + map.w * 2 + '" height="' + map.h * 2 + '" viewBox="0 0 ' + S.W + ' ' + S.H + '"><rect width="' + S.W + '" height="' + S.H + '" fill="' + bg + '"/>' + ser.serializeToString(dcl) + ser.serializeToString(clone) + '</svg>';
        var img = new Image();
        img.onload = function () { if (destroyed) return; try { map.canv[n].getContext('2d').drawImage(img, 0, 0, map.w * 2, map.h * 2); } catch (e) { } };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
      } catch (e) { }
    }

    /* -------------- hud -------------- */
    function buildHud() {
      var right = H('div', 'where-hud-r', hud);
      if (Object.keys(S.views).length > 1) {
        flipBtn = H('button', 'where-btn where-flip', right, '<span class="ico">' + icon('flipcam', ICON_FLIP) + '</span><span class="lbl">更換前後鏡頭</span>');
        flipBtn.type = 'button'; flipBtn.addEventListener('click', function (e) { e.stopPropagation(); flipView(); });
        flipBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      }
      var zin = H('button', 'where-btn where-zoom', right, '+'), zout = H('button', 'where-btn where-zoom', right, '−');
      zin.type = zout.type = 'button'; zin.setAttribute('aria-label', '放大'); zout.setAttribute('aria-label', '縮小');
      [zin, zout].forEach(function (b, i) {
        b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        b.addEventListener('click', function (e) { e.stopPropagation(); if (locked) return; var c = cams[curView]; tweenZoom(vw / 2, vh / 2, c.k * (i ? 1 / 1.7 : 1.7)); });
      });
      hintBtn = H('button', 'where-btn where-hint', hud, '<span class="ico">' + MAG + '</span><span class="lbl">提示</span>');
      hintBtn.type = 'button'; hintBtn.setAttribute('aria-label', '提示');
      hintBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      hintBtn.addEventListener('click', function (e) { e.stopPropagation(); useHint(); });
      buildMap();
      hintBtn.style.bottom = 'calc(' + (map.h + 28) + 'px + env(safe-area-inset-bottom))';
    }
    function buildIntro() {
      var ov = H('div', 'where-intro', root);
      var card = H('div', 'where-intro-card', ov);
      var pt = H('div', 'where-intro-pt', card);
      try { var p = D.Chars.portrait({ w: 150, h: 255, pose: 'wave' }); pt.appendChild(p); } catch (e) { }
      H('h2', null, card, '找到他！點他一下');
      H('p', 'sub', card, '他是一隻老鼠，穿著這身衣服<br>混在大家之間');
      H('p', 'sis', card, '<img src="' + (S.sisterUrl) + '" alt="">場景裡還偷偷藏著姊姊喔');
      var b = H('button', 'where-intro-btn', card, '開始找'); b.type = 'button';
      function go() {
        if (started) return; started = true; ov.classList.add('out'); setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 450);
        kick();
      }
      ov.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      ov.addEventListener('click', function (e) { e.stopPropagation(); go(); });
    }

    /* -------------- input -------------- */
    var ptrs = {}, nPtr = 0, drag = null, pinch = null, tap = null, lastTap = { t: 0, x: -99, y: -99 };
    function rel(e) { var r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function onDown(e) {
      if (locked || !started || !interactive) return;
      var p = rel(e); ptrs[e.pointerId] = { x: p.x, y: p.y }; nPtr++;
      try { stage.setPointerCapture(e.pointerId); } catch (er) { }
      inertia = null; tween = null;
      if (nPtr === 1) { drag = { id: e.pointerId, x: p.x, y: p.y, vx: 0, vy: 0, lt: performance.now() }; tap = { x: p.x, y: p.y, t: performance.now(), moved: false }; }
      else if (nPtr === 2) {
        var ids = Object.keys(ptrs), a = ptrs[ids[0]], b = ptrs[ids[1]];
        var c = cams[curView]; pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: c.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        pinch.w = world(pinch.mx, pinch.my); drag = null; if (tap) tap.moved = true;
      }
    }
    function onMove(e) {
      if (!ptrs[e.pointerId] || locked) return;
      var p = rel(e); var prev = ptrs[e.pointerId]; ptrs[e.pointerId] = { x: p.x, y: p.y };
      var c = cams[curView];
      if (nPtr >= 2 && pinch) {
        var ids = Object.keys(ptrs), a = ptrs[ids[0]], b = ptrs[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        c.k = clamp(pinch.k0 * d / pinch.d0, minK, maxK);
        c.tx = mx - pinch.w.x * c.k; c.ty = my - pinch.w.y * c.k; clampCam(c); dirty = true; setMoving(true);
      } else if (drag && drag.id === e.pointerId) {
        var dx = p.x - prev.x, dy = p.y - prev.y;
        if (!tap.moved && Math.hypot(p.x - tap.x, p.y - tap.y) > 9) tap.moved = true;
        if (tap.moved) { c.tx += dx; c.ty += dy; clampCam(c); dirty = true; setMoving(true); var now = performance.now(), dtm = Math.max(1, now - drag.lt); drag.vx = 0.7 * drag.vx + 0.3 * dx / dtm * 16; drag.vy = 0.7 * drag.vy + 0.3 * dy / dtm * 16; drag.lt = now; }
      }
    }
    function onUp(e) {
      if (!ptrs[e.pointerId]) return;
      var p = rel(e); var wasDrag = drag && drag.id === e.pointerId;
      delete ptrs[e.pointerId]; nPtr = Math.max(0, nPtr - 1);
      try { stage.releasePointerCapture(e.pointerId); } catch (er) { }
      if (nPtr === 0) {
        pinch = null;
        if (wasDrag && tap && !tap.moved && performance.now() - tap.t < 600) handleTap(p.x, p.y, e.clientX, e.clientY);
        else if (wasDrag && drag && (Math.abs(drag.vx) > 0.5 || Math.abs(drag.vy) > 0.5) && performance.now() - drag.lt < 80) inertia = { vx: drag.vx, vy: drag.vy };
        drag = null; tap = null;
      } else if (nPtr === 1) {
        pinch = null; var id = Object.keys(ptrs)[0]; drag = { id: +id, x: ptrs[id].x, y: ptrs[id].y, vx: 0, vy: 0, lt: performance.now() }; tap = { x: ptrs[id].x, y: ptrs[id].y, t: 0, moved: true };
      }
    }
    function onCancel(e) { delete ptrs[e.pointerId]; nPtr = Math.max(0, nPtr - 1); if (!nPtr) { drag = null; pinch = null; tap = null; } }
    function onWheel(e) {
      if (!interactive || locked || !started) return; e.preventDefault();
      var p = rel(e), c = cams[curView]; var f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      tween = null; zoomAt(p.x, p.y, c.k * f); setMoving(true);
    }
    function inBox(B, w, pad) { return w.x >= B.x0 - pad && w.x <= B.x1 + pad && w.y >= B.y0 - pad && w.y <= B.y1 + pad; }
    function handleTap(sx, sy, clientX, clientY) {
      if (locked || !started) return;
      var now = performance.now(), isDouble = now - lastTap.t < 330 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 36;
      lastTap = { t: now, x: sx, y: sy };
      var K = S.kaiInfo, Si = S.sisterInfo, w = world(sx, sy), c = cams[curView], pad = 13 / c.k;
      if (!done && K && K.view === curView && inBox(K, w, pad)) { found(); return; }
      if (!sisterFound && Si && Si.view === curView && inBox(Si, w, pad)) { foundSister(); return; }
      if (isDouble) { lastTap.t = 0; tweenZoom(sx, sy, c.k < minK * 2.2 ? Math.min(maxK, Math.max(c.k * 3, 0.62)) : minK); return; }
      // an animal under the finger?
      var hit = null;
      try {
        var els = document.elementsFromPoint(clientX, clientY);
        for (var i = 0; i < els.length; i++) {
          var gEl = els[i].closest && els[i].closest('g.ch');
          if (gEl && !gEl.classList.contains('kai') && stage.contains(gEl)) { hit = gEl; break; }
        }
      } catch (er) { }
      if (hit) {
        hops.push({ g: hit, t0: t }); bubbleFor(hit, Math.random() < 0.75 ? '不是我啦～' : '找錯囉～');
        wrong++; return;
      }
      var rp = H('div', 'where-ripple', root); rp.style.left = sx + 'px'; rp.style.top = sy + 'px'; setTimeout(function () { if (rp.parentNode) rp.parentNode.removeChild(rp); }, 700);
      wrong++;
      if (!done && K && K.view === curView && Math.hypot(w.x - (K.x0 + K.x1) / 2, w.y - (K.y0 + K.y1) / 2) < 190 && wrong % 3 === 0) toast('好像很接近了…', 1300);
    }

    /* -------------- ambient life -------------- */
    function clearAmbient() { amb.forEach(function (a) { D.Chars.blink(a.g, false); D.Chars.tilt(a.g, 0); }); amb = []; }
    function mkAmb(g) { return { g: g, nb: t + 0.4 + Math.random() * 3.2, nt: t + 0.8 + Math.random() * 5, be: 0, tu: -1, ta: 0 }; }
    function pickAmbient() {
      clearAmbient();
      var rb = root.getBoundingClientRect(), pool = [];
      for (var i = 0; i < S._animals.length; i++) {
        var a = S._animals[i]; if (a.view !== curView || !a.g.__head) continue;
        var r = a.g.getBoundingClientRect(); if (r.width === 0 || r.right < rb.left || r.left > rb.right || r.bottom < rb.top || r.top > rb.bottom) continue;
        pool.push(a.g);
      }
      for (var j = pool.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)), tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp; }
      amb = pool.slice(0, 20).map(mkAmb);
    }
    function stepAmb(a, dt) {
      if (a.be && t > a.be) { D.Chars.blink(a.g, false); a.be = 0; }
      if (t >= a.nb) { D.Chars.blink(a.g, true); a.be = t + 0.13; a.nb = t + 1.8 + Math.random() * 3.2; if (Math.random() < 0.2) a.nb = t + 0.35; }
      if (a.tu < 0 && t >= a.nt) { a.tu = 0; a.ta = (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 7); }
      if (a.tu >= 0) { a.tu += dt / 1.1; if (a.tu >= 1) { a.tu = -1; D.Chars.tilt(a.g, 0); a.nt = t + 3 + Math.random() * 6; } else D.Chars.tilt(a.g, a.ta * Math.sin(Math.PI * a.tu)); }
    }

    /* -------------- frame loop -------------- */
    function want() { return !destroyed && visible && !document.hidden && vw > 0; }
    function frame(ts) {
      raf = 0; if (!want()) return;
      var dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000)); last = ts; t += dt;
      if (dt > 0.034) { if (++slowFrames > 40 && !root.classList.contains('where-lowfx')) { root.classList.add('where-lowfx'); S.lowfx = true; } } else if (slowFrames > 0 && Math.random() < 0.02) slowFrames--;
      var c = cams[curView], i;
      if (started && !done) sec += dt;
      if (tween) {
        var u = clamp((t - tween.t0) / tween.dur, 0, 1), e = ease(u);
        c.k = tween.from.k + (tween.to.k - tween.from.k) * e; c.tx = tween.from.tx + (tween.to.tx - tween.from.tx) * e; c.ty = tween.from.ty + (tween.to.ty - tween.from.ty) * e;
        dirty = true; if (u >= 1) tween = null; else setMoving(true);
      } else if (inertia) {
        c.tx += inertia.vx; c.ty += inertia.vy; inertia.vx *= 0.93; inertia.vy *= 0.93; clampCam(c); dirty = true; setMoving(true);
        if (Math.abs(inertia.vx) < 0.15 && Math.abs(inertia.vy) < 0.15) inertia = null;
      } else if (!interactive && opts.drift !== false) {
        var ox = S.W * c.k - vw, oy = S.H * c.k - vh;
        if (ox > 0) c.tx = -ox * (0.5 + 0.5 * Math.sin(t * 0.05 + 1)); if (oy > 0) c.ty = -oy * (0.5 + 0.3 * Math.sin(t * 0.037 + 2)); dirty = true;
      }
      if (interactive && !hintShown && started && sec >= hintAfter && !done) { hintShown = true; hintBtn.classList.add('show'); }
      for (i = 0; i < S.anims.length; i++) { try { S.anims[i](t, dt); } catch (er) { console.error(er); S.anims.splice(i--, 1); } }

      // ambient life: random subset blinks / turns head; Kai breathes
      if (t >= nextPick) { pickAmbient(); nextPick = t + 7 + Math.random() * 3; }
      for (i = 0; i < amb.length; i++) stepAmb(amb[i], dt);
      if (kaiAmb && !done && S.kaiInfo && S.kaiInfo.view === curView) {
        D.Chars.bodyXf(kaiAmb.g, 0, 1 + 0.013 * Math.sin(t * 1.9), 1 - 0.006 * Math.sin(t * 1.9)); stepAmb(kaiAmb, dt);
      }
      // little hops (wrong-tap animals, sister)
      for (i = hops.length - 1; i >= 0; i--) {
        var h = hops[i], hu = (t - h.t0) / (h.big ? 0.9 : 0.6), amp = h.big ? 16 : 9;
        if (hu >= 1) { if (h.sis) h.g.removeAttribute('transform'); else { D.Chars.bodyXf(h.g, 0, 1); D.Chars.tilt(h.g, 0); } hops.splice(i, 1); continue; }
        var dy = Math.abs(Math.sin(hu * Math.PI * (h.big ? 3 : 2))) * amp * (1 - hu);
        if (h.sis) h.g.setAttribute('transform', 'translate(0,' + (-dy).toFixed(1) + ')'); else { D.Chars.bodyXf(h.g, dy, 1 - 0.04 * Math.sin(hu * Math.PI * 2) * (1 - hu)); D.Chars.tilt(h.g, 9 * Math.sin(hu * Math.PI)); }
      }
      // the sister peeks now and then (small bounce)
      if (S.sisterInfo && !sisterFound && t >= sisNext && S.sisterInfo.view === curView) { hops.push({ g: S.sisterInfo.inner, t0: t, big: false, sis: true }); sisNext = t + 5 + Math.random() * 5; }
      if (hintObj) {
        var hu2 = t - hintObj.t0, pulse = 1 + Math.sin(hu2 * 3.2) * 0.04; hintObj.c2.setAttribute('r', hintObj.R * pulse); hintObj.c2.setAttribute('stroke-opacity', 0.35 + 0.3 * Math.sin(hu2 * 3.2));
        if (hu2 > 8) { if (hintObj.g.parentNode) hintObj.g.parentNode.removeChild(hintObj.g); hintObj = null; }
      }
      for (i = fx.length - 1; i >= 0; i--) { var F = fx[i]; if (!F.update(t - F.t0)) { if (F.g.parentNode) F.g.parentNode.removeChild(F.g); fx.splice(i, 1); } }
      if (celebrate) {
        var cu = t - celebrate.t0, f = clamp(cu / 1.4, 0, 1), eo = 1 - Math.pow(1 - f, 3);
        celebrate.ring.setAttribute('r', celebrate.R * (0.3 + 0.7 * eo)); celebrate.ring.setAttribute('stroke-width', 9 * (1 - f * 0.6)); celebrate.ring.setAttribute('stroke-opacity', 1 - f * 0.3);
        celebrate.ring2.setAttribute('r', celebrate.R * (0.5 + 0.9 * eo)); celebrate.ring2.setAttribute('stroke-opacity', 0.9 * (1 - f));
        var K = S.kaiInfo, kg = K.g, bounce = cu < 0.9 ? Math.abs(Math.sin(cu * 9)) * 12 * (1 - cu / 0.9) : 0, pop = 1 + 0.08 * Math.sin(Math.min(cu, 1) * Math.PI);
        kg.setAttribute('transform', 'translate(' + K.x + ',' + (K.y - bounce).toFixed(1) + ') scale(' + ((K.flip ? -1 : 1) * K.s * pop).toFixed(3) + ',' + (K.s * pop).toFixed(3) + ')');
        D.Chars.setArm(kg, 1, 148 + 24 * Math.sin(cu * 11));
        if (cu > 6) celebrate = null;
      }
      if (dirty) applyCam();
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && want()) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    /* -------------- build (after characters data is ready) -------------- */
    var handle = {
      root: root, destroy: destroy, solve: function () { if (S) found(true); }, solveSister: function () { if (S) foundSister(true); },
      getKai: function () { return S && S.kaiInfo ? { view: S.kaiInfo.view, x: S.kaiInfo.x, y: S.kaiInfo.y, s: S.kaiInfo.s } : null; },
      getSister: function () { return S && S.sisterInfo ? { view: S.sisterInfo.view, x: S.sisterInfo.x, y: S.sisterInfo.y, s: S.sisterInfo.s } : null; },
      start: function () { started = true; var ov = root.querySelector('.where-intro'); if (ov) ov.parentNode.removeChild(ov); kick(); },
      focus: function (x, y, k) { centerOn(x, y, k); applyCam(); }, flip: function () { flipView(); }, camera: function () { return cams[curView]; }, hint: function () { useHint(); },
      scene: function () { return S; }, view: function () { return curView; }
    };
    var io = null, ro = null;

    // put 姊姊 somewhere plausible if the scene did not (beside a crowd animal that lives in plain world coords)
    function autoSister() {
      var rg = mulberry(hashStr(sceneId) ^ 0x5157), K = S.kaiInfo, i, cand = [];
      function plain(g) { for (var n = g.parentNode; n && n !== camG; n = n.parentNode) { if (n.getAttribute && n.getAttribute('transform')) return false; } return true; }
      for (i = 0; i < S._animals.length; i++) {
        var a = S._animals[i];
        if (a.y < S.H * 0.12 || a.y > S.H * 0.97 || a.x < S.W * 0.06 || a.x > S.W * 0.94 || !plain(a.g)) continue;
        if (K && K.view === a.view && Math.hypot(a.x - K.x, a.y - K.y) < 260) continue;
        cand.push(a);
      }
      var spot;
      if (cand.length) {
        var a2 = cand[Math.floor(rg() * cand.length)], side = rg() < 0.5 ? -1 : 1;
        spot = { view: a2.view, x: a2.x + side * (30 * a2.s + 18), y: a2.y + 3, after: a2.g, parent: a2.parent, flip: side > 0 };
      } else {
        spot = { view: 'main', x: S.W * (0.2 + rg() * 0.6), y: S.H * (0.4 + rg() * 0.5), flip: rg() < 0.5 };
        if (K && Math.hypot(spot.x - K.x, spot.y - K.y) < 260) spot.x = (spot.x + S.W * 0.4) % S.W;
      }
      S.useView(spot.view);
      var g = S.sister({ x: spot.x, y: spot.y, s: 0.95, flip: spot.flip, parent: spot.parent || S.layer.mid });
      if (spot.after && spot.after.nextSibling && g.parentNode === spot.after.parentNode) spot.after.parentNode.insertBefore(g, spot.after.nextSibling);
      S.useView('main');
    }

    function setup() {
      if (destroyed) return;
      S = new Builder(def, sceneId, svg, camG, defs, { seed: opts.seed || 0, lowfx: lowfx });
      try { def.build(S); } catch (e) { console.error('[Where] scene build failed', sceneId, e); }
      if (!S.kaiInfo) { try { S.useView('main'); S.kai({ x: S.W * 0.62, y: S.H * 0.55 }); } catch (e) { } }
      if (interactive && !S.sisterInfo) { try { autoSister(); } catch (e) { console.error('[Where] sister', e); } }
      S.useView('main');
      var kv = S.kaiInfo && S.kaiInfo.g;
      if (kv && !interactive && opts.hideKai !== false) kv.style.display = 'none';
      else if (kv) kaiAmb = mkAmb(kv);
      showView('main');
      if (interactive) {
        buildHud();
        if (!started) buildIntro();
        stage.addEventListener('pointerdown', onDown); stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerup', onUp); stage.addEventListener('pointercancel', onCancel);
        stage.addEventListener('wheel', onWheel, { passive: false });
        stage.addEventListener('dblclick', function (e) { e.preventDefault(); });
      }
      measure();
      try { ro = new ResizeObserver(function () { if (measure()) kick(); }); ro.observe(root); } catch (e) { window.addEventListener('resize', onResize); }
      try { io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }); io.observe(root); } catch (e) { }
      document.addEventListener('visibilitychange', onVis);
      root.classList.add('ready');
      kick();
    }
    function onResize() { if (measure()) kick(); }
    function onVis() { if (!document.hidden) kick(); }
    function destroy() {
      if (destroyed) return; destroyed = true;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      timers.forEach(clearTimeout); clearTimeout(movingTimer); clearTimeout(bubbleT); if (toast._t) clearTimeout(toast._t);
      if (ro) ro.disconnect(); if (io) io.disconnect();
      window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis);
      if (root.parentNode) root.parentNode.removeChild(root);
      if (current === handle) current = null;
    }
    current = interactive ? handle : current;
    if (interactive) { D.debug = D.debug || {}; D.debug.solveWhere = function () { return W.solveCurrent(); }; D.debug.solveSister = function () { return W.solveSisterCurrent(); }; }

    var ready = (D.Chars && D.Chars.ready) ? D.Chars.ready : Promise.resolve();
    var go = function () { if (!destroyed) setup(); };
    var settled = false; var tmo = setTimeout(function () { if (!settled) { settled = true; go(); } }, 1500);
    ready.then(function () { if (!settled) { settled = true; clearTimeout(tmo); go(); } }, function () { if (!settled) { settled = true; clearTimeout(tmo); go(); } });
    return handle;
  }

  var W = D.Where = Object.assign(D.Where || { _scenes: {} }, {
    _scenes: prevScenes,
    SCENES: ['park', 'escalator', 'bridge', 'bookstore', 'office', 'fireworks', 'newyork'],
    mount: mount,
    solveCurrent: function () { if (current) { current.solve(); return true; } return false; },
    solveSisterCurrent: function () { if (current) { current.solveSister(); return true; } return false; },
    current: function () { return current; }
  });
  W._scenes = Object.assign(prevScenes, (D.Where && D.Where._scenes) || {});
  D.debug = D.debug || {}; D.debug.solveWhere = function () { return W.solveCurrent(); }; D.debug.solveSister = function () { return W.solveSisterCurrent(); };
})();
