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
    // 姊姊 (small quokka sticker) — optional extra find. opts: {x,y,s=1,flip,parent}
    S.sister = function (o) {
      o = o || {};
      if (S.sisterInfo && S.sisterInfo.g.parentNode) S.sisterInfo.g.parentNode.removeChild(S.sisterInfo.g);
      var s = o.s == null ? 1 : o.s, H0 = 68, W0 = Math.round(H0 * (o.ar || 163 / 200));
      var g = E('g', { class: 'sister', transform: 'translate(' + (o.x || 0) + ',' + (o.y || 0) + ')' + (o.rot ? ' rotate(' + o.rot + ')' : '') + ' scale(' + (s * (o.flip ? -1 : 1)) + ',' + s + ')' }, o.parent || S.layer.mid);
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

  /* -------------------------------------------------------------- image mode (raster scene art, data/scenes.json)
     If data/scenes.json has an entry for the scene AND its background image(s) load, the scene is a raster
     image + sprites; otherwise the procedural scene file is used (auto fallback). Debug: ?scenesBase=<url/>
     replaces the leading "assets/scenes/" of every image path. */
  var IMG = { cfg: null, cache: {}, base: null };
  try { var mb = /[?&]scenesBase=([^&#]+)/.exec(location.search); if (mb) { IMG.base = decodeURIComponent(mb[1]); if (!/\/$/.test(IMG.base)) IMG.base += '/'; } } catch (e) { }
  if (/[?&]noimg=1/.test((function () { try { return location.search; } catch (e) { return ''; } })())) IMG.off = true;
  function imgUrl(u) { if (!u) return u; return (IMG.base && u.indexOf('assets/scenes/') === 0) ? IMG.base + u.slice(14) : u; }
  function withTimeout(p, ms, val) { return new Promise(function (res) { var to = setTimeout(function () { res(val); }, ms); p.then(function (v) { clearTimeout(to); res(v); }, function () { clearTimeout(to); res(null); }); }); }
  var KAI_SPRITE = 'assets/scenes/kai-mouse.png';
  // per-scene config data/scenes/<id>.json (cached per id; null when missing/invalid)
  function sceneCfg(id) {
    if (IMG.off || typeof fetch !== 'function' || !id) return Promise.resolve(null);
    if (!IMG.cfg) IMG.cfg = {};
    if (!IMG.cfg[id]) IMG.cfg[id] = fetch('data/scenes/' + id + '.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return IMG.cfg[id];
  }
  // cached: resolves the loaded HTMLImageElement, or null on error (never rejects, no timeout; callers race it)
  function loadImg(url) {
    if (!url) return Promise.resolve(null);
    if (!IMG.cache[url]) IMG.cache[url] = new Promise(function (res) {
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { if (im.decode) im.decode().then(function () { res(im); }, function () { res(im); }); else res(im); };
      im.onerror = function () { res(null); };
      im.src = url;
    });
    return IMG.cache[url];
  }
  // background must exist: fast path = load within `ms`; if slow but the file exists (HEAD ok) keep waiting (≤20s)
  function loadBg(url, ms) {
    var p = loadImg(url);
    return withTimeout(p, ms, 'slow').then(function (r) {
      if (r !== 'slow') return r;
      return withTimeout(fetch(url, { method: 'HEAD' }).then(function (h) { return h.ok; }), 1500, false).then(function (ok) {
        if (!ok) { console.warn('[Where] scene image timeout → procedural', url); return null; }
        return withTimeout(p, 20000, null);
      });
    });
  }
  // → null (procedural) or {cfg, W, H, views:{name:{url,img}}, kaiImg, kaiUrl, bonusImg:{id:img}}
  function probeImage(sceneId, interactive) {
    return withTimeout(sceneCfg(sceneId), 3000, null).then(function (c) {
      if (!c || !c.views || !c.views.main) return null;
      var ms = c.loadTimeoutMs || 4000, names = Object.keys(c.views);
      var kaiUrl = imgUrl(KAI_SPRITE); // intro-card portrait only — nothing is composited onto the scene
      var jobs = names.map(function (n) { return loadBg(imgUrl(c.views[n]), ms); });
      jobs.push(interactive ? withTimeout(loadImg(kaiUrl), ms, null) : Promise.resolve(null));
      jobs.push(interactive ? withTimeout(hitboxes(), ms, null) : Promise.resolve(null));
      return Promise.all(jobs).then(function (r) {
        var views = {}, i;
        for (i = 0; i < names.length; i++) { if (!r[i]) return null; views[names[i]] = { url: imgUrl(c.views[names[i]]), img: r[i] }; }
        var m = views.main.img, kaiImg = r[names.length], W0 = m.naturalWidth || 768, H0 = m.naturalHeight || 1024;
        return { cfg: c, W: W0, H: H0, views: views, kaiImg: kaiImg, kaiUrl: kaiImg ? kaiUrl : null, hits: sceneHits(r[names.length + 1], sceneId, c, W0, H0) };
      });
    });
  }
  /* data/scenes/hitboxes.json — painted Kai / quokka boxes per scene (tolerant of shape; re-fetched per page load).
     keys: scene id (park) or image stem (s05-park, s19-moumoon-selfie[.jpg]); values {kai:box, quokka|sister:box, view?}
     box: [x,y,w,h] | {x,y,w,h} (top-left) | {cx,cy,w,h} (centre) | {x0,y0,x1,y1} | {left,top,width,height}; >1.5 → pixels */
  function hitboxes() {
    if (IMG.off || typeof fetch !== 'function') return Promise.resolve(null);
    if (!IMG.hb) IMG.hb = fetch('data/scenes/hitboxes.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return IMG.hb;
  }
  function normBox(b, W, H) {
    if (!b) return null;
    var x, y, w, h, n = function (v) { return v == null ? null : +v; };
    if (Array.isArray(b)) { // real format: corners [x0,y0,x1,y1]; [x,y,w,h] only if it cannot be corners
      x = n(b[0]); y = n(b[1]);
      if (n(b[2]) > x && n(b[3]) > y) { w = n(b[2]) - x; h = n(b[3]) - y; } else { w = n(b[2]); h = n(b[3]); }
    }
    else if (typeof b === 'object') {
      if (b.box || b.rect || b.bbox) return normBox(b.box || b.rect || b.bbox, W, H);
      w = n(b.w != null ? b.w : b.width); h = n(b.h != null ? b.h : b.height);
      if (b.cx != null && b.cy != null) { x = n(b.cx) - w / 2; y = n(b.cy) - h / 2; }
      else if (b.x0 != null && b.x1 != null) { x = n(b.x0); y = n(b.y0); w = n(b.x1) - x; h = n(b.y1) - y; }
      else if (b.x1 != null && b.x2 != null) { x = n(b.x1); y = n(b.y1); w = n(b.x2) - x; h = n(b.y2) - y; }
      else { x = n(b.x != null ? b.x : b.left); y = n(b.y != null ? b.y : b.top); }
    }
    if ([x, y, w, h].some(function (v) { return v == null || isNaN(v); }) || w <= 0 || h <= 0) return null;
    if (Math.max(x + w, y + h) > 1.5) { x /= W; w /= W; y /= H; h /= H; } // pixels → fractions
    return { x: x, y: y, w: w, h: h };
  }
  // → {kai:{view,box}, sister:{view,box}} for this scene (either may be missing)
  function sceneHits(all, sceneId, cfg, W, H) {
    var out = {}; if (!all || typeof all !== 'object') return out;
    if (all.scenes && typeof all.scenes === 'object') all = all.scenes;
    var views = cfg.views || {}, cand = [];
    Object.keys(views).forEach(function (v) {
      var stem = String(views[v]).split('/').pop(), base = stem.replace(/\.[a-z0-9]+$/i, '');
      [stem, base].forEach(function (k) { if (all[k]) cand.push({ view: v, e: all[k] }); });
    });
    if (all[sceneId]) cand.push({ view: null, e: all[sceneId] });
    cand.forEach(function (c0) {
      var e = c0.e; if (!e || typeof e !== 'object') return;
      var ev = c0.view || (e.view && views[e.view] ? e.view : null);
      [['kai', ['kai', 'Kai', 'mouse']], ['sister', ['quokka', 'Quokka', 'sister', '姊姊', 'wombat', 'Wombat']]].forEach(function (pair) {
        if (out[pair[0]]) return;
        for (var i = 0; i < pair[1].length; i++) {
          var raw = e[pair[1][i]]; if (!raw) continue;
          var bx = normBox(raw, W, H); if (!bx) continue;
          var v = (raw && raw.view && views[raw.view]) ? raw.view : ev;
          out[pair[0]] = { view: v, box: bx }; break;
        }
      });
    });
    return out;
  }
  function preloadScene(sceneId) {
    sceneCfg(sceneId).then(function (c) { if (!c || !c.views) return; Object.keys(c.views).forEach(function (n) { loadImg(imgUrl(c.views[n])); }); });
  }
  // page helper: {kai: url|null} once the Kai sprite has loaded (or failed)
  function spriteUrls() {
    if (IMG.off) return Promise.resolve({ kai: null });
    var u = imgUrl(KAI_SPRITE);
    return withTimeout(loadImg(u), 4000, null).then(function (im) { return { kai: im ? u : null }; });
  }

  /* -------------------------------------------------------------- mount */
  var current = null; // handle of the latest interactive mount (for debug.solveWhere)
  var MAG = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="21" cy="21" r="12"/><path d="M30 30l11 11"/><path d="M16 18c1-2.4 3-3.8 5.4-4" opacity=".6"/></svg>';
  var CONF = ['#F2C66D', '#E8998F', '#A8D8C0', '#F6EFE2', '#9DBFD8', '#C2674E', '#B7A0B8'];

  function mount(container, sceneId, opts) {
    opts = opts || {};
    var interactive = opts.interactive !== false;
    var cfg = (window.DAYOF_CONFIG || {});
    // (Kai 02:11) 30s: hint button + auto quarter-zoom hint; 45s: auto circle on Kai; 60s: skip button
    var hintAfter = opts.hintAfterSec != null ? opts.hintAfterSec : (cfg.HINT_AFTER_SEC || 30);
    var autoHintAfter = opts.autoHintSec != null ? opts.autoHintSec : (cfg.AUTO_HINT_SEC || 45);
    var skipAfter = opts.skipAfterSec != null ? opts.skipAfterSec : (cfg.SKIP_AFTER_SEC || 60);
    var autoHinted = false, skipShown = false, skipBtn = null;
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
      // full-bleed (Kai 02:14): cover fit is both the minimum zoom and the opening view (no empty bands)
      minK = cover; maxK = interactive ? Math.max(cover * 4, 1.6, contain * 2) : cover;
      if (first) {
        Object.keys(S.views).forEach(function (n) { cams[n] = { k: minK, tx: (vw - S.W * minK) / 2, ty: (vh - S.H * minK) / 2 }; clampCam(cams[n]); });
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
    // kai.foundOnView: arriving at Kai's view counts as finding him (~0.8s after the flip)
    function viewFound() {
      var K = S && S.kaiInfo; if (!K || !K.foundOnView || done || curView !== K.view) return;
      later(function () { if (!destroyed && !done && curView === K.view) found(); }, 800);
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
          b.onfinish = function () { try { a.cancel(); } catch (e) { } viewFound(); };
        };
      } catch (e) { showView(next); viewFound(); }
      if (flipBtn) flipBtn.classList.remove('pulse');
      if (bubbleEl && bubbleEl.parentNode) bubbleEl.parentNode.removeChild(bubbleEl);
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
      var rr = gEl.getBoundingClientRect(), rb = root.getBoundingClientRect();
      bubbleAt((rr.left + rr.right) / 2 - rb.left, rr.top - rb.top - 4, rr.bottom - rb.top + 6, text);
    }
    // bubble anchored at a screen point (root coords): above `ty`, or below at `by` when too close to the top
    function bubbleAt(cx, ty, by, text) {
      if (bubbleEl && bubbleEl.parentNode) bubbleEl.parentNode.removeChild(bubbleEl);
      var rb = root.getBoundingClientRect();
      var b = H('div', 'where-bubble', root, text);
      b.style.left = clamp(cx, 56, rb.width - 56) + 'px'; b.style.top = ty + 'px';
      if (ty < 40) { b.style.top = by + 'px'; b.classList.add('below'); }
      bubbleEl = b; clearTimeout(bubbleT); bubbleT = setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 1500);
    }

    /* -------------- found / hint -------------- */
    function found(fromDebug) {
      if (done || !S || !S.kaiInfo) return;
      done = true; locked = true; started = true; foundFired = false; kaiAmb = null;
      var K = S.kaiInfo;
      if (curView !== K.view) showView(K.view);
      if (hintBtn) hintBtn.classList.remove('show'); hintBtn && hintBtn.classList.add('gone'); if (skipBtn) skipBtn.classList.remove('show'); root.classList.add('where-found');
      if (hintObj) { if (hintObj.g.parentNode) hintObj.g.parentNode.removeChild(hintObj.g); hintObj = null; }
      var cx = (K.x0 + K.x1) / 2, cy = (K.y0 + K.y1) / 2;
      var layer = S.views[K.view].layer.top;
      var g0 = E('g', { class: 'found-fx', 'pointer-events': 'none' }, layer);
      var ring = E('circle', { cx: cx, cy: cy, r: 10, fill: 'none', stroke: '#F2C66D', 'stroke-width': 8, 'stroke-opacity': 0.95 }, g0);
      var ring2 = E('circle', { cx: cx, cy: cy, r: 10, fill: 'rgba(255,248,225,.25)', stroke: '#C2674E', 'stroke-width': 3, 'stroke-opacity': 0.8, 'stroke-dasharray': '10 8' }, g0);
      if (K.painted) { /* nothing to move */ }
 // sprite: brought to front, hops/waves via its inner group (frame loop)
      else {
        // Kai steps out of the crowd and waves (redrawn with the wave pose, no item)
        var ng = D.Chars.draw('mouse', { x: K.x, y: K.y, s: K.s, flip: K.flip, pose: 'wave', rnd: Math.random, outfit: K.outfit, kai: true });
        ng.setAttribute('class', 'ch ch-mouse kai'); ng.__flip = K.flip;
        if (K.g.parentNode) K.g.parentNode.removeChild(K.g);
        layer.appendChild(ng); K.g = ng;
      }
      burst(cx, cy - 30, K.view, { stars: 18, conf: 54 });
      celebrate = { g: g0, ring: ring, ring2: ring2, cx: cx, cy: cy, t0: t, R: Math.max(70, (K.x1 - K.x0) * 1.2) };
      tweenTo(cx, cy, K.painted ? cams[curView].k : Math.max(cams[curView].k, Math.min(maxK, 170 / (100 * K.s))), 0.8);
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
      twinkle((Si.x0 + Si.x1) / 2, Si.y0 + 10, 24, Si.view, true);
      Si.g.classList.add('found');
      if (typeof opts.onSister === 'function') { try { opts.onSister({ sec: Math.round(sec), hints: hints }); } catch (e) { console.error(e); } }
    }

    // secret find: a little surprise AT the spot (twinkling stars; quokka also gets a soft heart). No text, no count.
    function foundBonus(B) {
      if (!B || B.found) return;
      B.found = true;
      var cx = (B.x0 + B.x1) / 2, cy = (B.y0 + B.y1) / 2, sz = Math.max(14, Math.min(Math.min(B.x1 - B.x0, B.y1 - B.y0) * 0.22, S.W * 0.035));
      twinkle(cx, cy, sz, B.view, B.id === 'sister');
      var info = { sec: Math.round(sec), hints: hints, id: B.id };
      if (typeof opts.onBonus === 'function') { try { opts.onBonus(B.id, info); } catch (e) { console.error(e); } }
      if (B.id === 'sister' && typeof opts.onSister === 'function') { try { opts.onSister(info); } catch (e) { console.error(e); } }
    }
    // v=261118f (Kai): tapping the wombat again (after it was found / on a revisit) repeats the small surprise: stars + ONE little heart
    function heartsAt(B) {
      var sz = Math.max(14, Math.min(Math.min(B.x1 - B.x0, B.y1 - B.y0) * 0.22, S.W * 0.035));
      twinkle((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, sz, B.view, true);
    }
    function twinkle(cx, cy, sz, viewName, heart) {
      var g = E('g', { class: 'twinkle', 'pointer-events': 'none' }, S.views[viewName || curView].layer.top), ps = [], i, n = 7;
      for (i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2 + Math.random() * 0.5, d = sz * (0.9 + Math.random() * 0.9), e = E('g', null, g);
        star(e, sz * (0.18 + Math.random() * 0.14), ['#FFF3C4', '#F2C66D', '#FFFFFF'][i % 3]);
        ps.push({ e: e, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, d0: Math.random() * 0.5 });
      }
      var hp = null;
      if (heart) { hp = E('path', { d: 'M0 4C-6-2-12 2-9 8L0 16L9 8C12 2 6-2 0 4Z', fill: '#E8998F', stroke: '#FBF7EF', 'stroke-width': 1.5 }, g); }
      fx.push({ t0: t, g: g, life: 1.9, update: function (cu) {
        ps.forEach(function (p) { var u = clamp((cu - p.d0) / 1.1, 0, 1), sc = Math.sin(Math.PI * u) * (0.8 + 0.3 * Math.sin(cu * 18)); p.e.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') scale(' + Math.max(0, sc).toFixed(3) + ') rotate(' + (cu * 90).toFixed(0) + ')'); });
        if (hp) { var hu = clamp(cu / 1.7, 0, 1), hs = sz / 16 * (0.6 + 0.5 * Math.min(1, hu * 4)); hp.setAttribute('transform', 'translate(' + cx.toFixed(1) + ',' + (cy - sz * 0.6 - hu * sz * 1.4).toFixed(1) + ') scale(' + hs.toFixed(3) + ')'); hp.setAttribute('opacity', (hu < 0.6 ? 1 : 1 - (hu - 0.6) / 0.4).toFixed(2)); }
        return cu < this.life;
      } });
    }

    // level 1 = zoom to the image quarter that holds Kai + pulse its border; level 2 = pulse a circle on Kai.
    // Scenes where Kai is found by switching views (kai.foundOnView) → both levels point at the 換鏡頭 button.
    var hintLevel = 0;
    function flipNudge(msg) {
      if (flipBtn) {
        flipBtn.classList.add('pulse');
        var rr = flipBtn.getBoundingClientRect(), rb = root.getBoundingClientRect();
        bubbleAt((rr.left + rr.right) / 2 - rb.left, rr.top - rb.top - 6, rr.bottom - rb.top + 6, msg || '試試換鏡頭？');
        clearTimeout(bubbleT); var be = bubbleEl; bubbleT = setTimeout(function () { if (be && be.parentNode) be.parentNode.removeChild(be); }, 3200);
      } else toast(msg || '試試換鏡頭？', 3000);
    }
    function useHint(auto, level) {
      if (done || !S.kaiInfo || !started) return;
      var K = S.kaiInfo; if (!auto) hints++;
      level = level || (hintLevel >= 1 ? 2 : 1); hintLevel = Math.max(hintLevel, level);
      if (K.foundOnView || K.view !== curView) { flipNudge(K.foundOnView ? '試試換鏡頭？' : '他不在這個畫面…試試換鏡頭？'); return; }
      if (hintObj && hintObj.g.parentNode) hintObj.g.parentNode.removeChild(hintObj.g);
      var g = E('g', { class: 'hint-fx', 'pointer-events': 'none' }, S.views[K.view].layer.top);
      var cx = (K.x0 + K.x1) / 2, cy = (K.y0 + K.y1) / 2, cm = cams[curView];
      if (level === 1) {
        var qx = cx < S.W / 2 ? 0 : S.W / 2, qy = cy < S.H / 2 ? 0 : S.H / 2, qw = S.W / 2, qh = S.H / 2, sw = Math.max(3, S.W * 0.006);
        E('rect', { x: qx + sw / 2, y: qy + sw / 2, width: qw - sw, height: qh - sw, fill: 'rgba(255,240,200,.08)', stroke: '#E3B873', 'stroke-width': sw, 'stroke-opacity': 0.75, 'stroke-dasharray': (sw * 4) + ' ' + (sw * 3) }, g);
        var r2 = E('rect', { x: qx + sw / 2, y: qy + sw / 2, width: qw - sw, height: qh - sw, fill: 'none', stroke: '#F2C66D', 'stroke-width': sw * 1.6, 'stroke-opacity': 0.6 }, g);
        hintObj = { g: g, rect: r2, sw: sw, t0: t, life: 12 };
        tweenTo(qx + qw / 2, qy + qh / 2, Math.min(maxK, Math.min(vw / qw, vh / qh) * 0.98), 0.9);
        toast(auto ? '凱凱就在這一塊裡面喔～' : '凱凱在這四分之一裡', 2600);
      } else {
        var R = Math.max((K.x1 - K.x0), (K.y1 - K.y0)) * 0.75;
        E('circle', { cx: cx, cy: cy, r: R, fill: 'rgba(255,240,200,.16)', stroke: '#E3B873', 'stroke-width': Math.max(3, R * 0.06), 'stroke-opacity': 0.85, 'stroke-dasharray': (R * 0.2) + ' ' + (R * 0.14) }, g);
        var c2 = E('circle', { cx: cx, cy: cy, r: R, fill: 'none', stroke: '#F2C66D', 'stroke-width': Math.max(3, R * 0.05), 'stroke-opacity': 0.6 }, g);
        hintObj = { g: g, c2: c2, R: R, t0: t, life: 10 };
        var sx = cx * cm.k + cm.tx, sy = cy * cm.k + cm.ty;
        if (sx < 40 || sx > vw - 40 || sy < 60 || sy > vh - 60 || cm.k < minK * 1.6) tweenTo(cx, cy, Math.max(cm.k, Math.min(maxK, minK * 2.4)), 0.8);
        toast(auto ? '凱凱就在圈圈裡！點他一下' : '凱凱就在圈圈裡', 2600);
      }
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
        if (S.views[n].bgImg) { var cv0 = map.canv[n], cx0 = cv0.getContext('2d'); cx0.drawImage(S.views[n].bgImg, 0, 0, cv0.width, cv0.height); return; }
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
        flipBtn = H('button', 'where-btn where-flip', right, '<span class="ico">' + icon('flipcam', ICON_FLIP) + '</span>'); flipBtn.setAttribute('aria-label', '更換前後鏡頭'); flipBtn.title = '更換前後鏡頭';
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
      hintBtn.addEventListener('click', function (e) { e.stopPropagation(); useHint(false); });
      if (typeof opts.onSkip === 'function') {
        skipBtn = H('button', 'where-btn where-skip', hud, '直接看下一首 ›'); skipBtn.type = 'button';
        skipBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        skipBtn.addEventListener('click', function (e) { e.stopPropagation(); if (done) return; skipBtn.disabled = true; try { opts.onSkip({ sec: Math.round(sec), hints: hints }); } catch (er) { console.error(er); } });
      }
      buildMap();
      hintBtn.style.bottom = 'calc(' + (map.h + 28) + 'px + env(safe-area-inset-bottom))';
    }
    function buildIntro() {
      var ov = H('div', 'where-intro', root);
      var card = H('div', 'where-intro-card', ov);
      var pt = H('div', 'where-intro-pt', card);
      if (S.kaiSpriteUrl) { var pi = H('img', null, pt); pi.src = S.kaiSpriteUrl; pi.alt = '凱凱'; }
      else { try { var p = D.Chars.portrait({ w: 150, h: 255, pose: 'wave' }); pt.appendChild(p); } catch (e) { } }
      H('h2', null, card, '找到他！點他一下');
      H('p', 'sub', card, '他是一隻老鼠，穿著這身衣服<br>混在大家之間');
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
      if (S.bonus) for (var bi = 0; bi < S.bonus.length; bi++) { var Bn = S.bonus[bi]; if (!Bn.found && Bn.view === curView && inBox(Bn, w, pad)) { foundBonus(Bn); return; } }
      // v=261118f (Kai): the wombat always answers a tap with hearts, also after it was found / on a revisit
      if (S.bonus) for (var bj = 0; bj < S.bonus.length; bj++) { var Bs = S.bonus[bj]; if (Bs.found && Bs.id === 'sister' && Bs.view === curView && inBox(Bs, w, pad)) { heartsAt(Bs); return; } }
      if (sisterFound && Si && Si.view === curView && inBox(Si, w, pad)) { heartsAt(Si); return; }
      if (isDouble) { lastTap.t = 0; tweenZoom(sx, sy, c.k < minK * 2.2 ? Math.min(maxK, Math.max(c.k * 3, 0.62)) : minK); return; }
      // image mode: configured wrong-tap hotspots → bubble at the tap point
      if (S.hotspots) for (var hi = 0; hi < S.hotspots.length; hi++) {
        var hs = S.hotspots[hi];
        if (hs.view === curView && inBox(hs, w, 0)) { bubbleAt(sx, sy - 18, sy + 18, hs.say || (Math.random() < 0.75 ? '不是我啦～' : '找錯囉～')); wrong++; return; }
      }
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
      if (interactive && !hintShown && started && sec >= hintAfter && !done) { hintShown = true; hintBtn.classList.add('show'); if (hintLevel < 1) useHint(true, 1); }
      if (interactive && !autoHinted && started && sec >= autoHintAfter && !done) { autoHinted = true; useHint(true, 2); }
      if (interactive && skipBtn && !skipShown && started && sec >= skipAfter && !done) { skipShown = true; skipBtn.classList.add('show'); }
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
        var hu2 = t - hintObj.t0, pulse = 1 + Math.sin(hu2 * 3.2) * 0.04;
        if (hintObj.c2) { hintObj.c2.setAttribute('r', hintObj.R * pulse); hintObj.c2.setAttribute('stroke-opacity', 0.35 + 0.3 * Math.sin(hu2 * 3.2)); }
        else { hintObj.rect.setAttribute('stroke-width', (hintObj.sw * (1.2 + 0.9 * (0.5 + 0.5 * Math.sin(hu2 * 3.6)))).toFixed(2)); hintObj.rect.setAttribute('stroke-opacity', (0.3 + 0.5 * (0.5 + 0.5 * Math.sin(hu2 * 3.6))).toFixed(2)); }
        if (hu2 > (hintObj.life || 8)) { if (hintObj.g.parentNode) hintObj.g.parentNode.removeChild(hintObj.g); hintObj = null; }
      }
      for (i = fx.length - 1; i >= 0; i--) { var F = fx[i]; if (!F.update(t - F.t0)) { if (F.g.parentNode) F.g.parentNode.removeChild(F.g); fx.splice(i, 1); } }
      if (celebrate) {
        var cu = t - celebrate.t0, f = clamp(cu / 1.4, 0, 1), eo = 1 - Math.pow(1 - f, 3);
        celebrate.ring.setAttribute('r', celebrate.R * (0.3 + 0.7 * eo)); celebrate.ring.setAttribute('stroke-width', 9 * (1 - f * 0.6)); celebrate.ring.setAttribute('stroke-opacity', 1 - f * 0.3);
        celebrate.ring2.setAttribute('r', celebrate.R * (0.5 + 0.9 * eo)); celebrate.ring2.setAttribute('stroke-opacity', 0.9 * (1 - f));
        var K = S.kaiInfo, kg = K.g, bounce = cu < 0.9 ? Math.abs(Math.sin(cu * 9)) * 12 * (1 - cu / 0.9) : 0, pop = 1 + 0.08 * Math.sin(Math.min(cu, 1) * Math.PI);
        if (K.painted) { /* painted into the background: ring + confetti only */ }
        else {
          kg.setAttribute('transform', 'translate(' + K.x + ',' + (K.y - bounce).toFixed(1) + ') scale(' + ((K.flip ? -1 : 1) * K.s * pop).toFixed(3) + ',' + (K.s * pop).toFixed(3) + ')');
          D.Chars.setArm(kg, 1, 148 + 24 * Math.sin(cu * 11));
        }
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
      getBonus: function () { return S && S.bonus ? S.bonus.map(function (b) { return { id: b.id, label: b.label, view: b.view, found: b.found, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }; }) : []; },
      solveBonus: function (id) { if (S && S.bonus) S.bonus.forEach(function (b) { if (!id || b.id === id) { if (b.view !== curView) showView(b.view); foundBonus(b); } }); },
      getSister: function () { return S && S.sisterInfo ? { view: S.sisterInfo.view, x: S.sisterInfo.x, y: S.sisterInfo.y, s: S.sisterInfo.s } : null; },
      start: function () { started = true; var ov = root.querySelector('.where-intro'); if (ov) ov.parentNode.removeChild(ov); kick(); },
      focus: function (x, y, k) { centerOn(x, y, k); applyCam(); }, flip: function () { flipView(); }, camera: function () { return cams[curView]; }, hint: function () { useHint(); },
      scene: function () { return S; }, view: function () { return curView; }, mode: function () { return S ? (S.imageMode ? 'image' : 'procedural') : null; }
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

    /* -------------- image mode build -------------- */
    function buildImage(IM) {
      var c = IM.cfg;
      S.imageMode = true; root.classList.add('where-img');
      S.kaiSpriteUrl = IM.kaiUrl || null;
      Object.keys(IM.views).forEach(function (n) {
        var v = S.view(n); v.bgImg = IM.views[n].img; v.bgUrl = IM.views[n].url; v.bgColor = c.bgColor || null;
        E('image', { href: IM.views[n].url, x: 0, y: 0, width: S.W, height: S.H, preserveAspectRatio: 'xMidYMid slice', class: 'where-bgimg' }, v.layer.bg);
      });
      function vw_(name) { return name && IM.views[name] ? name : 'main'; }
      if (interactive) {
        // NO sprites on the scene (Kai and the quokka are painted into the art). Kai box: hitboxes.json →
        // scene json kai.rect → derived from kai x/y/h (sprite-sized box). Hit = box + 15% padding (v7).
        var ck = c.kai || {}, HB = IM.hits || {}, KAR = 158 / 320, WAR = 216 / 320;
        function fromXYH(o, ar) { var h = o.h != null ? o.h : (o.scale || 0.08), vis = clamp(o.visible != null ? +o.visible : 1, 0.15, 1), w = h * ar * S.H / S.W; return { x: (o.x != null ? o.x : 0.62) - w / 2, y: (o.y != null ? o.y : 0.71) - h, w: w, h: h * vis }; }
        function padBox(bx, view, pad) {
          var x = bx.x * S.W, y = bx.y * S.H, w = bx.w * S.W, h = bx.h * S.H;
          return { painted: true, view: view, x: x + w / 2, y: y + h, s: h / 100, w: w, h: h, x0: x - w * pad, x1: x + w * (1 + pad), y0: y - h * pad, y1: y + h * (1 + pad) };
        }
        var kv = HB.kai ? vw_(HB.kai.view || ck.view) : vw_(ck.view);
        var kbox = HB.kai ? HB.kai.box : (ck.rect ? normBox(ck.rect, S.W, S.H) : fromXYH(ck, KAR));
        S.kaiInfo = padBox(kbox, kv, 0.15);
        // Kai not in the opening view (bookstore selfie) → flipping to his view finds him
        S.kaiInfo.foundOnView = ck.foundOnView != null ? !!ck.foundOnView : kv !== vw_(c.initView);
        // secrets (no UI): sister/quokka + painted scene items; recorded silently via onBonus
        S.bonus = [];
        var sb = (c.bonus || []).filter(function (b) { return b && (b.id === 'sister' || b.id === 'quokka'); })[0];
        if (HB.sister || sb) {
          var sv = HB.sister ? vw_(HB.sister.view || (sb && sb.view)) : vw_(sb.view);
          var sbox = HB.sister ? HB.sister.box : (sb.w != null && !sb.sprite ? normBox(sb, S.W, S.H) : fromXYH(sb, WAR));
          var SB = padBox(sbox, sv, 0.15); SB.id = 'sister'; SB.label = (sb && sb.label) || '姊姊'; S.bonus.push(SB);
        }
        (c.bonus || []).forEach(function (b, i) {
          if (!b || b.sprite || b.w == null || b.id === 'sister' || b.id === 'quokka') return; // sprite bonuses (pick) are gone
          var B = padBox({ x: b.x, y: b.y, w: b.w, h: b.h }, vw_(b.view), 0); B.id = b.id || ('b' + i); B.label = b.label || B.id; S.bonus.push(B);
        });
        S.bonus.forEach(function (B) { B.found = !!(opts.bonusFound && opts.bonusFound[B.id]); });
        S.hotspots = (c.hotspots || []).map(function (h) { return { view: vw_(h.view), x0: h.x * S.W, y0: h.y * S.H, x1: (h.x + h.w) * S.W, y1: (h.y + h.h) * S.H, say: h.say }; });
      }
      // occluders: crops of the background redrawn ABOVE the sprites (fake foreground)
      (c.occluders || []).forEach(function (o) {
        var v = S.views[vw_(o.view)], ox = o.x * S.W, oy = o.y * S.H, ow = o.w * S.W, oh = o.h * S.H;
        var ns = E('svg', { x: ox, y: oy, width: ow, height: oh, viewBox: ox + ' ' + oy + ' ' + ow + ' ' + oh, preserveAspectRatio: 'none', overflow: 'hidden', class: 'occl', 'pointer-events': 'none' }, v.layer.fg);
        E('image', { href: v.bgUrl, x: 0, y: 0, width: S.W, height: S.H, preserveAspectRatio: 'xMidYMid slice' }, ns);
      });
      var am = c.ambient;
      if (am && typeof am === 'object') { try { ambient(am.type, am); } catch (e) { console.error('[Where] ambient', e); } }
      else if (typeof am === 'string') { try { ambient(am, c.ambientOpts || {}); } catch (e) { console.error('[Where] ambient', e); } }
      S.initView = vw_(c.initView);
    }
    // light overlays on top of the raster art (fractions of the image). Cheap: a few dozen attr updates / frame.
    function ambient(kind, o) {
      if (!kind) return;
      var v = S.view(o.view && S.views[o.view] ? o.view : 'main'), L = E('g', { class: 'amb-' + kind, 'pointer-events': 'none' }, v.layer.fg), Wd = S.W, Ht = S.H, i, j;
      function px(p) { return [p[0] * Wd, p[1] * Ht]; }
      if (kind === 'escalator') {
        // quads: [{pts:[[tl],[tr],[br],[bl]], dir:'up'|'down'}] ; stripes move along tl→bl / tr→br
        // or lanes: [{x0,y0 (bottom centre), x1,y1 (top centre), w (bottom width; top = w*topScale), dir}]
        var quads = (o.quads || []).concat((o.lanes || []).map(function (l) {
          var wb = (l.w || 0.2) / 2, wt = wb * (o.topScale || 0.55);
          return { dir: l.dir, pts: [[l.x1 - wt, l.y1], [l.x1 + wt, l.y1], [l.x0 + wb, l.y0], [l.x0 - wb, l.y0]] };
        }));
        var n = o.n || 10, sp = o.speed || 0.18, col = o.color || '#FFF8E6', op = o.opacity == null ? 0.22 : o.opacity, lines = [];
        quads.forEach(function (Q) {
          var pts = (Q.pts || []).map(px); if (pts.length !== 4) return;
          for (j = 0; j < n; j++) lines.push({ q: pts, up: Q.dir !== 'down', ph: j / n, el: E('line', { stroke: col, 'stroke-width': Math.max(2, Wd * 0.0025), 'stroke-linecap': 'round' }, L) });
        });
        S.anim(function (tt) {
          for (var a = 0; a < lines.length; a++) {
            var ln = lines[a], u = (ln.ph + tt * sp) % 1, f = ln.up ? 1 - u : u, q = ln.q;
            var x1 = q[0][0] + (q[3][0] - q[0][0]) * f, y1 = q[0][1] + (q[3][1] - q[0][1]) * f, x2 = q[1][0] + (q[2][0] - q[1][0]) * f, y2 = q[1][1] + (q[2][1] - q[1][1]) * f;
            ln.el.setAttribute('x1', x1.toFixed(1)); ln.el.setAttribute('y1', y1.toFixed(1)); ln.el.setAttribute('x2', x2.toFixed(1)); ln.el.setAttribute('y2', y2.toFixed(1));
            ln.el.setAttribute('stroke-opacity', (op * Math.sin(Math.PI * u)).toFixed(3));
          }
        });
      } else if (kind === 'fireworks') {
        // points: [[x,y],...] sky positions ; r = burst radius (fraction of width) ; period seconds
        // points: [[x,y],...] or bursts: [{x,y,r}]
        var pts2 = (o.bursts ? o.bursts.map(function (q) { return [q.x, q.y, q.r]; }) : (o.points || [[0.3, 0.14], [0.68, 0.1], [0.5, 0.22]])), per = o.period || 3.4, cols = o.colors || CONF, bs = [];
        pts2.forEach(function (p0, bi) {
          var p = px(p0), R = (p0[2] || o.r || 0.07) * Wd;
          var g = E('g', { transform: 'translate(' + p[0].toFixed(0) + ',' + p[1].toFixed(0) + ') scale(0)', opacity: 0 }, L), col = cols[bi % cols.length], ns = 14;
          for (j = 0; j < ns; j++) { var a = j / ns * Math.PI * 2; E('line', { x1: Math.cos(a) * R * 0.25, y1: Math.sin(a) * R * 0.25, x2: Math.cos(a) * R, y2: Math.sin(a) * R, stroke: col, 'stroke-width': Math.max(2, R * 0.04), 'stroke-linecap': 'round' }, g); E('circle', { cx: Math.cos(a) * R * 1.08, cy: Math.sin(a) * R * 1.08, r: Math.max(2, R * 0.035), fill: col }, g); }
          bs.push({ g: g, p: p, R: R, off: bi * per / pts2.length + bi * 0.37 });
        });
        S.anim(function (tt) {
          for (var a = 0; a < bs.length; a++) {
            var B = bs[a], u = ((tt + B.off) % per) / per, life = 0.42; // bloom in the first 42% of each cycle
            if (u > life) { if (B.vis) { B.g.setAttribute('opacity', 0); B.vis = false; } continue; }
            var f = u / life, sc = 1 - Math.pow(1 - f, 3);
            B.g.setAttribute('transform', 'translate(' + B.p[0].toFixed(0) + ',' + (B.p[1] + f * B.R * 0.15).toFixed(0) + ') scale(' + sc.toFixed(3) + ')'); B.g.setAttribute('opacity', (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85).toFixed(3)); B.vis = true;
          }
        });
      } else if (kind === 'sky') {
        // Animated fireworks over an EMPTY painted sky: rockets rise from the horizon, burst into falling sparks with a soft warm glow.
        // o.region = [x0,y0,x1,y1] (fractions), o.n = simultaneous shells, o.colors
        var rg = o.region || [0, 0, 1, 0.38], X0 = rg[0] * Wd, Y0 = rg[1] * Ht, X1 = rg[2] * Wd, Y1 = rg[3] * Ht;
        var palette = o.colors || ['#FFD27A', '#FF9E7A', '#FFB3C7', '#BFE3FF', '#E8C6FF', '#FFF1B8', '#9FE6C8'];
        var defsS = S.defs || E('defs', null, L), gid = 'skyglow' + Math.floor(Math.random() * 1e6);
        var grd = E('radialGradient', { id: gid }, defsS);
        E('stop', { offset: '0', 'stop-color': '#FFF2C9', 'stop-opacity': '0.5' }, grd); E('stop', { offset: '0.45', 'stop-color': '#FFC27A', 'stop-opacity': '0.18' }, grd); E('stop', { offset: '1', 'stop-color': '#FF9E5A', 'stop-opacity': '0' }, grd);
        var NSH = o.n || 5, NP = o.particles || 26, shells = [], seed = 7;
        function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        for (i = 0; i < NSH; i++) {
          var sg = E('g', { opacity: 0 }, L), glow = E('circle', { r: 1, fill: 'url(#' + gid + ')' }, sg);
          var trail = E('line', { stroke: '#FFE7B0', 'stroke-width': Math.max(2, Wd * 0.003), 'stroke-linecap': 'round', 'stroke-opacity': 0.8 }, sg), ps = [];
          for (j = 0; j < NP; j++) ps.push(E('line', { stroke: '#fff', 'stroke-width': Math.max(2, Wd * 0.005), 'stroke-linecap': 'round' }, sg));
          shells.push({ g: sg, glow: glow, trail: trail, ps: ps, t0: 0.3 + i * (o.gap || 0.75) + rnd() * 0.4 });
        }
        function launch(s, tt) {
          s.t0 = tt; s.x = X0 + (X1 - X0) * (0.12 + 0.76 * rnd()); s.y = Y0 + (Y1 - Y0) * (0.18 + 0.45 * rnd());
          s.R = Wd * (0.07 + 0.05 * rnd()); s.col = palette[Math.floor(rnd() * palette.length)]; s.col2 = palette[Math.floor(rnd() * palette.length)];
          s.rise = 0.7 + 0.3 * rnd(); s.life = 2.2 + 0.6 * rnd();
          for (var k = 0; k < s.ps.length; k++) s.ps[k].setAttribute('stroke', k % 3 ? s.col : s.col2);
        }
        S.anim(function (tt) {
          for (var a = 0; a < shells.length; a++) {
            var s = shells[a];
            if (s.x == null || tt - s.t0 > s.rise + s.life + 0.4) { if (tt >= s.t0) launch(s, tt); else continue; }
            var u = tt - s.t0;
            if (u < 0) { s.g.setAttribute('opacity', 0); continue; }
            s.g.setAttribute('opacity', 1);
            if (u < s.rise) { // rocket rising from the horizon line
              var f = u / s.rise, yy = Y1 + (s.y - Y1) * (1 - Math.pow(1 - f, 2));
              s.trail.setAttribute('x1', s.x.toFixed(1)); s.trail.setAttribute('x2', s.x.toFixed(1));
              s.trail.setAttribute('y1', yy.toFixed(1)); s.trail.setAttribute('y2', Math.min(Y1, yy + Ht * 0.05).toFixed(1)); s.trail.setAttribute('stroke-opacity', 0.8);
              s.glow.setAttribute('r', 0); for (var k = 0; k < s.ps.length; k++) s.ps[k].setAttribute('opacity', 0);
              continue;
            }
            s.trail.setAttribute('stroke-opacity', 0);
            var e = (u - s.rise) / s.life; if (e > 1) { s.g.setAttribute('opacity', 0); continue; }
            var spread = 1 - Math.pow(1 - Math.min(1, e * 1.6), 3), fade = e < 0.08 ? e / 0.08 : Math.max(0, 1 - (e - 0.08) / 0.92);
            s.glow.setAttribute('cx', s.x.toFixed(1)); s.glow.setAttribute('cy', s.y.toFixed(1)); s.glow.setAttribute('r', (s.R * (0.5 + 0.8 * spread)).toFixed(1)); s.glow.setAttribute('opacity', (fade * 0.75).toFixed(3));
            for (var m = 0; m < s.ps.length; m++) {
              var ang = m / s.ps.length * Math.PI * 2 + (m % 2) * 0.12, rr = s.R * spread * (m % 2 ? 0.78 : 1);
              var cx = s.x + Math.cos(ang) * rr, cy = s.y + Math.sin(ang) * rr + e * e * s.R * 0.55; // gentle gravity droop
              var tl = s.R * 0.16 * (1 - e); s.ps[m].setAttribute('x1', cx.toFixed(1)); s.ps[m].setAttribute('y1', cy.toFixed(1)); s.ps[m].setAttribute('x2', (cx - Math.cos(ang) * tl).toFixed(1)); s.ps[m].setAttribute('y2', (cy - Math.sin(ang) * tl - e * s.R * 0.08).toFixed(1));
              s.ps[m].setAttribute('opacity', (fade * (0.75 + 0.25 * Math.sin(tt * 18 + m))).toFixed(3));
            }
          }
        });
      } else if (kind === 'moon') {
        // rect: [x,y,w,h] reflection area ; n shimmer strokes
        var rc = o.rect || [0.35, 0.6, 0.3, 0.12]; if (!Array.isArray(rc)) rc = [rc.x, rc.y, rc.w, rc.h];
        var rx = rc[0] * Wd, ry = rc[1] * Ht, rw = rc[2] * Wd, rh = rc[3] * Ht, nn = o.n || 10, col2 = o.color || '#FFF6D8', rs = [];
        for (j = 0; j < nn; j++) {
          var yy = ry + rh * (j + 0.5) / nn, ww = rw * (0.35 + 0.5 * Math.sin(Math.PI * (j + 0.5) / nn));
          rs.push({ y: yy, w: ww, ph: j * 1.7, el: E('line', { x1: 0, y1: yy, x2: 0, y2: yy, stroke: col2, 'stroke-width': Math.max(2, rh / nn * 0.35), 'stroke-linecap': 'round' }, L) });
        }
        S.anim(function (tt) {
          for (var a = 0; a < rs.length; a++) {
            var r0 = rs[a], cx = rx + rw / 2 + Math.sin(tt * 0.9 + r0.ph) * rw * 0.08, hw = r0.w / 2 * (0.75 + 0.25 * Math.sin(tt * 1.3 + r0.ph * 2));
            r0.el.setAttribute('x1', (cx - hw).toFixed(1)); r0.el.setAttribute('x2', (cx + hw).toFixed(1)); r0.el.setAttribute('stroke-opacity', (0.18 + 0.22 * (0.5 + 0.5 * Math.sin(tt * 2.1 + r0.ph))).toFixed(3));
          }
        });
      }
    }

    function setup(IM) {
      if (destroyed) return;
      if (IM) { def = { W: IM.W, H: IM.H, bgColor: IM.cfg.bgColor || '#EFE6D4' }; root.style.background = def.bgColor; }
      S = new Builder(def, sceneId, svg, camG, defs, { seed: opts.seed || 0, lowfx: lowfx });
      if (IM) { try { buildImage(IM); } catch (e) { console.error('[Where] image scene build failed', sceneId, e); } }
      else { try { def.build(S); } catch (e) { console.error('[Where] scene build failed', sceneId, e); } }
      if (!S.kaiInfo && !(IM && !interactive)) { try { S.useView('main'); S.kai({ x: S.W * 0.62, y: S.H * 0.55 }); } catch (e) { } }
      if (interactive && !S.sisterInfo && !IM) { try { autoSister(); } catch (e) { console.error('[Where] sister', e); } }
      S.useView('main');
      var kv = S.kaiInfo && S.kaiInfo.g;
      if (kv && !interactive && opts.hideKai !== false) kv.style.display = 'none';
      else if (kv) kaiAmb = mkAmb(kv);
      showView('main');
      if (S.initView && S.initView !== 'main') showView(S.initView);
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
      if (interactive) { var si = W.SCENES.indexOf(sceneId); if (si >= 0 && si + 1 < W.SCENES.length) later(function () { preloadScene(W.SCENES[si + 1]); }, 2500); }
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
    var probe = (opts.image === false) ? Promise.resolve(null) : probeImage(sceneId, interactive).catch(function (e) { console.error('[Where] image probe', e); return null; });
    Promise.all([withTimeout(ready, 1500, null), probe]).then(function (r) { if (!destroyed) setup(r[1]); });
    return handle;
  }

  var W = D.Where = Object.assign(D.Where || { _scenes: {} }, {
    _scenes: prevScenes,
    SCENES: ['park', 'escalator', 'bridge', 'bookstore', 'office', 'fireworks', 'newyork'],
    mount: mount, sceneConfig: sceneCfg, preload: preloadScene, sprites: spriteUrls, _imgUrl: imgUrl,
    solveCurrent: function () { if (current) { current.solve(); return true; } return false; },
    solveSisterCurrent: function () { if (current) { current.solveSister(); return true; } return false; },
    current: function () { return current; }
  });
  W._scenes = Object.assign(prevScenes, (D.Where && D.Where._scenes) || {});
  D.debug = D.debug || {}; D.debug.solveWhere = function () { return W.solveCurrent(); }; D.debug.solveSister = function () { return W.solveSisterCurrent(); };
})();
