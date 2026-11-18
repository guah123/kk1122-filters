/* DAYOF.Chars — procedural storybook animal + Kai (mouse) character library.
   Local coords: feet at (0,0), facing front, ~90px tall at s=1, +x right, y down. */
window.DAYOF = window.DAYOF || {};
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var INK = '#5B4A3C';

  function E(tag, a, p) {
    var e = document.createElementNS(NS, tag);
    if (a) for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]);
    if (p) p.appendChild(e);
    return e;
  }
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb2hex(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
  function shade(c, f) { return f < 0 ? mix(c, '#2b1f17', -f) : mix(c, '#fffaf0', f); }
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }

  // line style: soft coloured-pencil outline
  function ln(w) { return { stroke: INK, 'stroke-opacity': 0.5, 'stroke-width': w || 1, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }; }
  function mk(tag, a, p, w) { var o = ln(w); for (var k in a) o[k] = a[k]; return E(tag, o, p); }
  function ell(p, cx, cy, rx, ry, fill, w) { return mk('ellipse', { cx: cx, cy: cy, rx: rx, ry: ry, fill: fill }, p, w); }
  function pth(p, d, fill, w, extra) { var o = { d: d, fill: fill }; if (extra) for (var k in extra) o[k] = extra[k]; return mk('path', o, p, w); }

  /* ------------------------------------------------------------------ species */
  var SP = {
    cat:      { fur: '#D9A66B', fur2: '#F5E6CF', ear: 'point', earIn: '#E9A9A0', snout: 'small', nose: '#D98B8B', tail: 'long', marks: ['tabby', 'whisk'] },
    dog:      { fur: '#B8895B', fur2: '#F0DFC4', ear: 'floppy', earCol: '#7A5638', snout: 'muzzle', nose: '#3E322C', tail: 'up' },
    rabbit:   { fur: '#EDE6DC', fur2: '#F8EFE8', ear: 'long', earIn: '#EBB5B0', snout: 'small', nose: '#E3A2A2', tail: 'puff', marks: ['whisk'] },
    bear:     { fur: '#8B6445', fur2: '#D9BC95', ear: 'round', earIn: '#C79E75', snout: 'muzzle', nose: '#2F2823', tail: 'puff' },
    fox:      { fur: '#D0763C', fur2: '#F7EBD8', ear: 'point', earCol: '#8A4A28', earIn: '#4A3A30', snout: 'long', nose: '#3A2F2A', tail: 'bushy', tailTip: '#F7EBD8', marks: ['cheek'] },
    panda:    { fur: '#F4F1EA', fur2: '#F4F1EA', ear: 'round', earCol: '#3B3836', earIn: '#3B3836', snout: 'small', nose: '#2F2B29', tail: 'puff', limb: '#3B3836', eyes: 'patch' },
    raccoon:  { fur: '#9A9AA0', fur2: '#E7E4DE', ear: 'round', earIn: '#D9C9C0', snout: 'small', nose: '#2F2B29', tail: 'stripe', eyes: 'mask' },
    deer:     { fur: '#B98F62', fur2: '#F0DFC4', ear: 'sideleaf', earIn: '#E6C9AE', horn: 'antler', snout: 'small', nose: '#3E322C', tail: 'puff', marks: ['dots'] },
    sheep:    { fur: '#4B4038', fur2: '#4B4038', ear: 'sideleaf', earCol: '#4B4038', earIn: '#6B5A4C', wool: '#F4EFE6', snout: 'small', nose: '#8A6F5E', tail: 'puff' },
    pig:      { fur: '#EBB6B0', fur2: '#F2C8C2', ear: 'droop', earIn: '#D98F8A', snout: 'pig', nose: '#D98F8A', tail: 'puff' },
    owl:      { fur: '#8B7355', fur2: '#E8D9BD', ear: 'tuft', snout: 'beak', beak: '#E3A24A', eyes: 'big', tail: 'none', marks: ['owlface'] },
    penguin:  { fur: '#3A3E4C', fur2: '#F6F2EA', ear: 'none', snout: 'beak', beak: '#E8A24A', suit: 'penguin', limb: '#3A3E4C', tail: 'none', marks: ['penguinface'] },
    elephant: { fur: '#A9A7AA', fur2: '#C7C3C4', ear: 'big', earIn: '#D9B8B8', snout: 'trunk', tail: 'thin', hx: 16, hy: 15 },
    giraffe:  { fur: '#E6C173', fur2: '#F5E3B8', ear: 'sideleaf', earIn: '#C99A5A', horn: 'ossicone', snout: 'small', nose: '#7B5A3A', tail: 'thin', neck: 14, marks: ['spots'], hx: 14, hy: 15 },
    koala:    { fur: '#A5A3A6', fur2: '#D9D6D8', ear: 'bigfluff', earIn: '#EDE6E6', snout: 'koala', nose: '#2F2B29', tail: 'none' },
    lion:     { fur: '#DDAE55', fur2: '#F3DDB0', ear: 'round', earIn: '#C9894A', mane: '#9A6A32', snout: 'muzzle', nose: '#5A3A2A', tail: 'tuft' },
    tiger:    { fur: '#E08B3F', fur2: '#F8EBD8', ear: 'round', earIn: '#F8EBD8', snout: 'muzzle', nose: '#C77A6B', tail: 'stripe', marks: ['stripes'] },
    monkey:   { fur: '#8B5E3C', fur2: '#E8C9A0', ear: 'sideround', earIn: '#E8C9A0', snout: 'monkey', nose: '#5A3A2A', tail: 'curl' },
    hedgehog: { fur: '#E2C9A8', fur2: '#F1E1C8', ear: 'tinyround', earIn: '#E6B9A8', spikes: '#7B6450', snout: 'small', nose: '#3E322C', tail: 'none', hy: 14 },
    otter:    { fur: '#8A6A50', fur2: '#D9C0A0', ear: 'tinyround', earIn: '#B99A7A', snout: 'muzzle', nose: '#2F2823', tail: 'thin', marks: ['whisk'] },
    frog:     { fur: '#8FB05A', fur2: '#E3E8B8', ear: 'none', snout: 'frog', nose: '#5E7A3A', tail: 'none', eyes: 'bump', hx: 18, hy: 13 },
    duck:     { fur: '#F2D26B', fur2: '#F8E7A0', ear: 'none', snout: 'bill', beak: '#E8963A', tail: 'puff', tuftTop: true },
    chicken:  { fur: '#F4EDE0', fur2: '#F8F2E8', ear: 'none', snout: 'beak', beak: '#E8A24A', tail: 'puff', comb: '#D9534A' },
    horse:    { fur: '#A9744A', fur2: '#C99A70', ear: 'point', earIn: '#7A5030', mane: '#4A3426', snout: 'horse', nose: '#4A3426', tail: 'bushy', hx: 14, hy: 17 },
    cow:      { fur: '#F2EEE8', fur2: '#F0B9B0', ear: 'sideleaf', earIn: '#F0B9B0', horn: 'smallhorn', snout: 'cow', nose: '#D98F8A', tail: 'thin', marks: ['patches'] },
    goat:     { fur: '#E8E1D4', fur2: '#F5F0E6', ear: 'sideleaf', earIn: '#E6C9C0', horn: 'curl', snout: 'small', nose: '#B98F80', tail: 'puff', beard: true },
    squirrel: { fur: '#B5703F', fur2: '#F0DFC4', ear: 'tufted', earIn: '#E8C9A8', snout: 'small', nose: '#3E322C', tail: 'huge', marks: ['whisk'] },
    hamster:  { fur: '#E9C79A', fur2: '#FAEFE0', ear: 'tinyround', earIn: '#EBB5B0', snout: 'small', nose: '#E3A2A2', tail: 'none', hx: 18, hy: 15, cheeks: true },
    seal:     { fur: '#9CA3A9', fur2: '#D6DADD', ear: 'none', snout: 'seal', nose: '#2F2B29', tail: 'none', marks: ['whisk'] },
    crocodile:{ fur: '#7FA06A', fur2: '#D9E0B8', ear: 'none', snout: 'croc', nose: '#4E6A3E', tail: 'thin', eyes: 'bump', hx: 16, hy: 14 },
    zebra:    { fur: '#F2EEE8', fur2: '#E4DED4', ear: 'point', earIn: '#3B3836', mane: '#3B3836', snout: 'horse', nose: '#3B3836', tail: 'tuft', marks: ['zstripes'], hx: 14, hy: 17 },
    sloth:    { fur: '#B09E86', fur2: '#D9CBB4', ear: 'tinyround', earIn: '#8A7A66', snout: 'small', nose: '#3E322C', tail: 'none', eyes: 'slothmask' },
    alpaca:   { fur: '#E9DCC4', fur2: '#F4EAD6', ear: 'banana', earIn: '#E6C9B8', topknot: true, snout: 'small', nose: '#7B6450', tail: 'puff', neck: 9, hx: 14, hy: 14 },
    capybara: { fur: '#A47B55', fur2: '#C4A07A', ear: 'tinyround', earIn: '#7A5638', snout: 'capy', nose: '#3E322C', tail: 'none', hx: 17, hy: 14 },
    hippo:    { fur: '#9A8A95', fur2: '#C7B8BE', ear: 'tinyround', earIn: '#E0B8BC', snout: 'wide', nose: '#6A5A66', tail: 'puff', hx: 18, hy: 14 },
    mouse:    { fur: '#C9C2B8', fur2: '#EDE6DC', ear: 'biground', earIn: '#EBA9A6', snout: 'small', nose: '#E58F8F', tail: 'thin', marks: ['whisk'], hx: 15, hy: 14 }
  };
  var KINDS = Object.keys(SP).filter(function (k) { return k !== 'mouse'; });

  /* ------------------------------------------------------------------ outfits */
  var CLOTH = ['#C9776B', '#8FA9B8', '#A8BBB0', '#D9B56F', '#B7A0B8', '#8A9E7B', '#D8A28A', '#7C97A6', '#C9B79C', '#9E8CA8', '#B5846A', '#E0C9A6', '#7F9AA8', '#C79AA0', '#A9A37A'];
  var BOTTOM = ['#6F7C8E', '#8A7660', '#A59A86', '#7A8A7A', '#9C7B6B', '#5F6F7A', '#B8A58A'];
  var HATC = ['#C9776B', '#8FA9B8', '#D9B56F', '#A8BBB0', '#B7A0B8', '#E0C9A6'];
  var DEFAULT_KAI = { top: '#2F3E56', pattern: 'stripe', bottom: '#C9A27A', hat: 'beanie', hatColor: '#C2674E', accent: '#F2C66D' };

  function randomOutfit(rnd, decoy) {
    var o = { top: pick(CLOTH, rnd), pattern: 'none', bottom: pick(BOTTOM, rnd), hat: 'none', hatColor: pick(HATC, rnd), accent: pick(CLOTH, rnd), style: 'tee' };
    var r = rnd();
    o.pattern = r < 0.2 ? 'stripe' : r < 0.32 ? 'dots' : r < 0.4 ? 'check' : 'none';
    o.pcolor = '#F6EFE2';
    r = rnd();
    o.hat = r < 0.5 ? 'none' : r < 0.68 ? 'beanie' : r < 0.78 ? 'cap' : r < 0.86 ? 'bow' : r < 0.93 ? 'flower' : 'bucket';
    r = rnd();
    o.style = r < 0.58 ? 'tee' : r < 0.82 ? 'dress' : 'overall';
    if (rnd() < 0.18) o.scarf = pick(CLOTH, rnd);
    if (decoy) { // looks vaguely Kai-ish but wrong colours
      o.pattern = 'stripe'; o.top = pick(['#6F7C8E', '#8A9E7B', '#7C6A8A', '#4F6A5E'], rnd); o.pcolor = pick(['#F6EFE2', '#E0C9A6', '#C9B79C'], rnd);
      o.hat = 'beanie'; o.hatColor = pick(['#8FA9B8', '#A8BBB0', '#B7A0B8', '#D9B56F'], rnd);
    }
    return o;
  }

  /* ------------------------------------------------------------------ pose table */
  // arm angle: 0 = hanging, + = swing outward (away from body), up to 180 = straight up
  var POSES = {
    stand: { l: 8, r: 8, leg: 0, dy: 0 },
    walk:  { l: 28, r: -8, leg: 13, dy: 0 },
    wave:  { l: 8, r: 150, leg: 0, dy: 0 },
    cheer: { l: 160, r: 160, leg: 0, dy: 0 },
    point: { l: 8, r: 125, leg: 0, dy: 0 },
    hold:  { l: 10, r: 62, leg: 0, dy: 0 },
    sit:   { l: 14, r: 14, leg: 0, dy: 13, sit: true },
    selfie:{ l: 10, r: 138, leg: 0, dy: 0 }
  };

  /* ------------------------------------------------------------------ pieces */
  function drawTail(g, sp, fur, o) {
    var t = sp.tail || 'none'; var f = shade(fur, -0.06);
    if (t === 'none') return;
    var G = E('g', { transform: 'translate(8,-26)' }, g);
    if (t === 'long') pth(G, 'M0 0 Q18 -2 18 -18 Q18 -28 24 -26', 'none', 4.2, { stroke: f, 'stroke-opacity': 1 });
    else if (t === 'up') pth(G, 'M0 0 Q14 -4 12 -20', 'none', 4.5, { stroke: f, 'stroke-opacity': 1 });
    else if (t === 'thin' && o.kind === 'mouse') pth(G, 'M0 -2 Q22 4 24 -10 Q26 -24 36 -22 Q42 -20 40 -14', 'none', 2.2, { stroke: '#E3B3AA', 'stroke-opacity': 1 });
    else if (t === 'thin') pth(G, 'M0 0 Q12 2 14 -8', 'none', 2.6, { stroke: f, 'stroke-opacity': 1 });
    else if (t === 'puff') ell(G, 7, -2, 5, 5, sp.fur2 || fur);
    else if (t === 'bushy' || t === 'huge') {
      var big = t === 'huge';
      var e = ell(G, 12, big ? -22 : -8, big ? 8 : 6.5, big ? 22 : 14, f); e.setAttribute('transform', 'rotate(' + (big ? 14 : 38) + ' 8 -4)');
      if (sp.tailTip) { var tp = ell(G, 18, -17, 4.5, 6, sp.tailTip); tp.setAttribute('transform', 'rotate(38 8 -4)'); }
    }
    else if (t === 'stripe') {
      var e2 = ell(G, 12, -8, 6, 14, f); e2.setAttribute('transform', 'rotate(38 8 -4)');
      for (var i = 0; i < 3; i++) { var s = E('path', { d: 'M' + (4 + i * 5) + ' ' + (-4 - i * 5) + ' l7 -6', stroke: '#3B3836', 'stroke-width': 2.2, 'stroke-opacity': 0.7, fill: 'none', 'stroke-linecap': 'round' }, G); }
    }
    else if (t === 'tuft') { pth(G, 'M0 0 Q14 -2 14 -16', 'none', 2.6, { stroke: f, 'stroke-opacity': 1 }); ell(G, 14, -18, 3.4, 5, sp.mane || '#6A4A32'); }
    else if (t === 'curl') pth(G, 'M0 0 Q18 6 20 -8 Q21 -18 13 -17', 'none', 3.2, { stroke: f, 'stroke-opacity': 1 });
  }

  function earsBack(h, sp, fur, hx, hy) {
    var e = sp.ear, c = sp.earCol || fur, inn = sp.earIn || shade(fur, 0.3), i, sg;
    if (e === 'round') { [-1, 1].forEach(function (d) { ell(h, d * hx * 0.72, -hy * 0.82, 6.4, 6.4, c); ell(h, d * hx * 0.72, -hy * 0.8, 3.4, 3.4, inn, 0); }); }
    else if (e === 'biground') { [-1, 1].forEach(function (d) { ell(h, d * hx * 0.88, -hy * 0.78, 10.5, 10.5, c); ell(h, d * hx * 0.88, -hy * 0.78, 6.3, 6.3, inn, 0); }); }
    else if (e === 'point' || e === 'tuft') {
      [-1, 1].forEach(function (d) {
        var tipH = e === 'tuft' ? 12 : 11;
        pth(h, 'M' + (d * hx * 0.92) + ' ' + (-hy * 0.2) + ' L' + (d * hx * 0.72) + ' ' + (-hy - tipH) + ' L' + (d * hx * 0.1) + ' ' + (-hy * 0.88) + ' Z', c);
        if (e === 'point') pth(h, 'M' + (d * hx * 0.76) + ' ' + (-hy * 0.5) + ' L' + (d * hx * 0.66) + ' ' + (-hy - 4) + ' L' + (d * hx * 0.3) + ' ' + (-hy * 0.86) + ' Z', inn, 0);
      });
    }
    else if (e === 'long') { [-1, 1].forEach(function (d) { var a = ell(h, d * 6.5, -hy - 10, 4.6, 15, c); a.setAttribute('transform', 'rotate(' + (d * 9) + ' ' + (d * 6.5) + ' ' + (-hy - 3) + ')'); var b = ell(h, d * 6.5, -hy - 9, 2.2, 11, inn, 0); b.setAttribute('transform', 'rotate(' + (d * 9) + ' ' + (d * 6.5) + ' ' + (-hy - 3) + ')'); }); }
    else if (e === 'floppy') { [-1, 1].forEach(function (d) { var a = ell(h, d * (hx + 1), 2, 5.4, 11.5, c); a.setAttribute('transform', 'rotate(' + (d * 12) + ' ' + (d * (hx - 3)) + ' -8)'); }); }
    else if (e === 'droop') { [-1, 1].forEach(function (d) { pth(h, 'M' + (d * hx * 0.3) + ' ' + (-hy * 0.9) + ' L' + (d * hx * 0.95) + ' ' + (-hy * 0.75) + ' L' + (d * hx * 1.05) + ' ' + (-hy * 0.1) + ' Z', c); }); }
    else if (e === 'sideleaf') { [-1, 1].forEach(function (d) { var a = ell(h, d * (hx + 5), -hy * 0.45, 7.5, 3.8, c); a.setAttribute('transform', 'rotate(' + (d * -22) + ' ' + (d * (hx + 5)) + ' ' + (-hy * 0.45) + ')'); var b = ell(h, d * (hx + 5), -hy * 0.45, 4.6, 1.9, inn, 0); b.setAttribute('transform', 'rotate(' + (d * -22) + ' ' + (d * (hx + 5)) + ' ' + (-hy * 0.45) + ')'); }); }
    else if (e === 'big') { [-1, 1].forEach(function (d) { ell(h, d * (hx + 5), -2, 11, 13, c); ell(h, d * (hx + 5), -1, 7, 9, inn, 0); }); }
    else if (e === 'bigfluff') { [-1, 1].forEach(function (d) { ell(h, d * (hx + 1), -hy * 0.7, 9.4, 9.4, c); ell(h, d * (hx + 1), -hy * 0.7, 5.4, 5.4, inn, 0); }); }
    else if (e === 'sideround') { [-1, 1].forEach(function (d) { ell(h, d * (hx + 3), 0, 6, 6, c); ell(h, d * (hx + 3), 0, 3.4, 3.4, inn, 0); }); }
    else if (e === 'tinyround') { [-1, 1].forEach(function (d) { ell(h, d * hx * 0.74, -hy * 0.82, 4.4, 4.4, c); ell(h, d * hx * 0.74, -hy * 0.82, 2.2, 2.2, inn, 0); }); }
    else if (e === 'tufted') { [-1, 1].forEach(function (d) { ell(h, d * hx * 0.7, -hy * 0.85, 5, 5.6, c); pth(h, 'M' + (d * hx * 0.7) + ' ' + (-hy - 5) + ' l' + (d * 2) + ' -7', 'none', 1.8, { stroke: shade(fur, -0.25), 'stroke-opacity': 1 }); }); }
    else if (e === 'banana') { [-1, 1].forEach(function (d) { var a = ell(h, d * hx * 0.62, -hy - 7, 3.6, 10, c); a.setAttribute('transform', 'rotate(' + (d * 10) + ' ' + (d * hx * 0.62) + ' ' + (-hy) + ')'); }); }
    // horns / antlers / mane / spikes behind head
    if (sp.horn === 'antler') { [-1, 1].forEach(function (d) { var col = '#8A6A48'; pth(h, 'M' + d * 6 + ' ' + (-hy + 2) + ' Q' + d * 8 + ' ' + (-hy - 8) + ' ' + d * 14 + ' ' + (-hy - 17) + ' M' + d * 9 + ' ' + (-hy - 6) + ' l' + d * -5 + ' -6 M' + d * 12 + ' ' + (-hy - 12) + ' l' + d * 5 + ' -2', 'none', 2.2, { stroke: col, 'stroke-opacity': 1 }); }); }
    if (sp.horn === 'ossicone') { [-1, 1].forEach(function (d) { mk('line', { x1: d * 5, y1: -hy + 1, x2: d * 5, y2: -hy - 8, stroke: '#B58A5A', 'stroke-width': 2.6, 'stroke-opacity': 1 }, h); ell(h, d * 5, -hy - 9, 2.8, 2.8, '#8A6A48'); }); }
    if (sp.horn === 'smallhorn') { [-1, 1].forEach(function (d) { pth(h, 'M' + d * 8 + ' ' + (-hy + 1) + ' Q' + d * 12 + ' ' + (-hy - 4) + ' ' + d * 10 + ' ' + (-hy - 8), 'none', 2.8, { stroke: '#E8DCC4', 'stroke-opacity': 1 }); }); }
    if (sp.horn === 'curl') { [-1, 1].forEach(function (d) { pth(h, 'M' + d * 5 + ' ' + (-hy + 1) + ' Q' + d * 10 + ' ' + (-hy - 9) + ' ' + d * 15 + ' ' + (-hy - 3), 'none', 2.8, { stroke: '#C9B79C', 'stroke-opacity': 1 }); }); }
    if (sp.mane) {
      if (sp.snout === 'muzzle') { ell(h, 0, 1, hx + 8, hy + 7, sp.mane); } // lion mane ring
      else { pth(h, 'M-5 ' + (-hy - 3) + ' Q0 ' + (-hy - 12) + ' 6 ' + (-hy - 3) + ' L4 ' + (-hy + 2) + ' L-4 ' + (-hy + 2) + ' Z', sp.mane); }
    }
    if (sp.spikes) { for (i = -5; i <= 5; i++) { var xx = i * 3.4, yy = -hy + Math.abs(i) * 0.9; pth(h, 'M' + (xx - 2.6) + ' ' + (yy + 2) + ' L' + (xx + 0.4 * i) + ' ' + (yy - 9) + ' L' + (xx + 2.6) + ' ' + (yy + 2) + ' Z', sp.spikes, 0.6); } }
    if (sp.wool) { // sheep wool: puffs around head
      var pos = [[-14, -6], [-12, -13], [-6, -17], [0, -19], [6, -17], [12, -13], [14, -6]];
      pos.forEach(function (p) { ell(h, p[0], p[1] - 1, 6.4, 6.2, sp.wool); });
    }
  }

  function eyeP(o, el) { if (o && o.eyes) { el.__ry = el.getAttribute('ry'); o.eyes.push(el); } return el; }
  function headFace(h, sp, fur, hx, hy, o) {
    var i, d;
    // head shape
    var skull = ell(h, 0, 0, hx, hy, fur);
    if (sp.snout === 'horse' || sp.snout === 'croc') { /* longer head */ ell(h, 0, 6, hx - 1, hy - 4, fur, 0); }
    // lower-face / cheek lightness
    if (sp.fur2 && sp.fur2 !== fur && !sp.mane) {
      if (sp.snout === 'small' || sp.snout === 'pig') pth(h, 'M' + (-hx * 0.78) + ' 3 Q0 ' + (hy + 4) + ' ' + (hx * 0.78) + ' 3 Q0 ' + (hy * 0.35) + ' ' + (-hx * 0.78) + ' 3 Z', sp.fur2, 0, { 'fill-opacity': 0.75, stroke: 'none' });
    }
    var m = sp.marks || [];
    if (m.indexOf('cheek') >= 0) { pth(h, 'M' + (-hx) + ' 2 Q' + (-hx * 0.4) + ' 4 0 10 Q' + (hx * 0.4) + ' 4 ' + hx + ' 2 Q' + (hx * 0.5) + ' ' + (hy) + ' 0 ' + hy + ' Q' + (-hx * 0.5) + ' ' + hy + ' ' + (-hx) + ' 2 Z', sp.fur2, 0, { stroke: 'none' }); }
    if (m.indexOf('tabby') >= 0 || m.indexOf('stripes') >= 0) {
      var sc = m.indexOf('stripes') >= 0 ? '#3B3836' : shade(fur, -0.28);
      mk('path', { d: 'M0 ' + (-hy + 1) + ' v6 M-4 ' + (-hy + 2) + ' v4 M4 ' + (-hy + 2) + ' v4 M' + (-hx + 1) + ' -2 h5 M' + (hx - 1) + ' -2 h-5 M' + (-hx + 1.5) + ' 3 h4 M' + (hx - 1.5) + ' 3 h-4', stroke: sc, 'stroke-width': 1.8, 'stroke-opacity': 0.75, fill: 'none' }, h);
    }
    if (m.indexOf('zstripes') >= 0) { mk('path', { d: 'M-8 ' + (-hy + 2) + ' l3 6 M0 ' + (-hy) + ' v8 M8 ' + (-hy + 2) + ' l-3 6 M' + (-hx + 1) + ' 0 h6 M' + (hx - 1) + ' 0 h-6', stroke: '#3B3836', 'stroke-width': 2, 'stroke-opacity': 0.85, fill: 'none' }, h); }
    if (m.indexOf('patches') >= 0) { ell(h, -8, -6, 5.5, 4.5, '#3B3836', 0); ell(h, 9, -1, 3.5, 3, '#3B3836', 0); }
    if (m.indexOf('spots') >= 0) { [[-9, -7, 2.6], [8, -8, 2.2], [11, 1, 1.8], [-11, 3, 1.8]].forEach(function (p) { ell(h, p[0], p[1], p[2], p[2], '#B58A5A', 0); }); }
    if (m.indexOf('dots') >= 0) { [[-9, -8, 1.4], [-5, -11, 1.2], [9, -8, 1.4], [6, -11, 1.2]].forEach(function (p) { ell(h, p[0], p[1], p[2], p[2], '#F6EFE2', 0); }); }
    if (m.indexOf('owlface') >= 0) { ell(h, -6.5, -2, 8, 8, sp.fur2, 0); ell(h, 6.5, -2, 8, 8, sp.fur2, 0); }
    if (m.indexOf('penguinface') >= 0) { pth(h, 'M-13 -3 Q-6 -14 0 -6 Q6 -14 13 -3 Q9 12 0 13 Q-9 12 -13 -3 Z', sp.fur2, 0, { stroke: 'none' }); }

    // eyes
    var ey = -2, ex = hx * 0.38;
    if (sp.eyes === 'big') {
      [-1, 1].forEach(function (s) { ell(h, s * 6.5, -2, 6, 6, '#FFF8E8', 0.8); eyeP(o, ell(h, s * 6.5, -1.5, 3, 3, '#3A2F2A', 0)); ell(h, s * 6.5 + 1, -2.6, 0.9, 0.9, '#fff', 0); });
    } else if (sp.eyes === 'patch') {
      [-1, 1].forEach(function (s) { var p = ell(h, s * 6.4, -1.5, 4.4, 5.6, '#3B3836', 0); p.setAttribute('transform', 'rotate(' + (s * -22) + ' ' + (s * 6.4) + ' -1.5)'); ell(h, s * 6.2, -2, 1.5, 1.5, '#fff', 0); ell(h, s * 6.2, -2, 0.8, 0.8, '#222', 0); });
    } else if (sp.eyes === 'mask') {
      pth(h, 'M-14 -4 Q-7 -9 0 -4 Q7 -9 14 -4 Q10 3 6 3 Q0 0 -6 3 Q-10 3 -14 -4 Z', '#4A4A50', 0, { stroke: 'none' });
      [-1, 1].forEach(function (s) { ell(h, s * 6, -2, 1.7, 1.7, '#fff', 0); eyeP(o, ell(h, s * 6, -2, 0.9, 0.9, '#222', 0)); });
    } else if (sp.eyes === 'slothmask') {
      [-1, 1].forEach(function (s) { var p = ell(h, s * 6.4, -1, 4.6, 6.2, '#7A6A58', 0); p.setAttribute('transform', 'rotate(' + (s * -20) + ' ' + (s * 6.4) + ' -1)'); eyeP(o, ell(h, s * 6.2, -1.5, 1.4, 1.4, '#222', 0)); });
    } else if (sp.eyes === 'bump') {
      [-1, 1].forEach(function (s) { ell(h, s * 8, -hy + 1, 5.4, 5.4, fur); ell(h, s * 8, -hy + 1, 3.6, 3.6, '#FFF8E8', 0); ell(h, s * 8, -hy + 1.4, 1.7, 1.7, '#222', 0); });
    } else {
      [-1, 1].forEach(function (s) { eyeP(o, ell(h, s * ex, ey, 1.9, 2.2, '#2E2520', 0)); ell(h, s * ex + 0.7, ey - 0.8, 0.7, 0.7, '#fff', 0); });
    }
    // blush
    if (['frog', 'crocodile', 'owl', 'penguin'].indexOf(o.kind) < 0) { [-1, 1].forEach(function (s) { ell(h, s * hx * 0.62, 5, 3, 2, '#E8998F', 0).setAttribute('fill-opacity', 0.28); }); }
    if (sp.cheeks) { [-1, 1].forEach(function (s) { ell(h, s * 10, 4, 6, 5, sp.fur2, 0).setAttribute('fill-opacity', 0.9); }); }

    // snout
    var sn = sp.snout, nose = sp.nose || '#3E322C';
    function mouth(y, w) { mk('path', { d: 'M0 ' + y + ' q' + (-w / 2) + ' 2.6 ' + (-w) + ' 0.6 M0 ' + y + ' q' + (w / 2) + ' 2.6 ' + w + ' 0.6', fill: 'none', 'stroke-opacity': 0.6 }, h); }
    if (sn === 'small') { ell(h, 0, 3.2, 2.4, 1.8, nose, 0.6); mouth(5, 3.4); }
    else if (sn === 'muzzle') { ell(h, 0, 5.5, 8, 6, sp.fur2, 0.7); ell(h, 0, 2.8, 3.2, 2.3, nose, 0.5); mouth(6, 3.8); }
    else if (sn === 'long') { var lm = pth(h, 'M-8 4 Q0 -2 8 4 Q5 15 0 15 Q-5 15 -8 4 Z', sp.fur2, 0.8); ell(h, 0, 13, 2.6, 2, nose, 0); }
    else if (sn === 'pig') { ell(h, 0, 4.5, 7.2, 5.2, shade(fur, -0.07), 0.8); ell(h, -2.6, 4.5, 1.2, 1.9, nose, 0); ell(h, 2.6, 4.5, 1.2, 1.9, nose, 0); }
    else if (sn === 'beak') { pth(h, 'M-3.6 1 L3.6 1 L0 8.5 Z', sp.beak, 0.8); }
    else if (sn === 'bill') { ell(h, 0, 5.5, 9, 3.8, sp.beak, 0.8); }
    else if (sn === 'trunk') {
      pth(h, 'M-5 4 Q-6 18 -1 24 Q4 28 8 24 Q9 22 6 21 Q3 22 3 18 Q4 8 5 4 Z', fur, 0.9);
      mk('path', { d: 'M-4 12 h7 M-4.4 17 h7', stroke: shade(fur, -0.25), 'stroke-width': 0.8, 'stroke-opacity': 0.5, fill: 'none' }, h);
    }
    else if (sn === 'koala') { ell(h, 0, 4, 4.4, 6, nose, 0.6); }
    else if (sn === 'monkey') { pth(h, 'M-12 -4 Q-6 -10 0 -4 Q6 -10 12 -4 Q12 12 0 14 Q-12 12 -12 -4 Z', sp.fur2, 0.8); ell(h, 0, 4, 1.8, 1.2, nose, 0); mouth(7, 3.6); [-1, 1].forEach(function (s) { eyeP(o, ell(h, s * ex, ey, 1.9, 2.2, '#2E2520', 0)); }); }
    else if (sn === 'frog') { mk('path', { d: 'M-11 5 Q0 11 11 5', fill: 'none', 'stroke-opacity': 0.7, 'stroke-width': 1.3 }, h); ell(h, -3, 2.6, 0.8, 0.8, nose, 0); ell(h, 3, 2.6, 0.8, 0.8, nose, 0); }
    else if (sn === 'horse') { ell(h, 0, 9, 9, 9, sp.fur2, 0.8); ell(h, -3.4, 12, 1.6, 2.2, nose, 0); ell(h, 3.4, 12, 1.6, 2.2, nose, 0); }
    else if (sn === 'cow') { ell(h, 0, 8, 9, 6.5, sp.fur2, 0.8); ell(h, -3.4, 8, 1.6, 2, nose, 0); ell(h, 3.4, 8, 1.6, 2, nose, 0); }
    else if (sn === 'seal') { ell(h, 0, 4.5, 6.4, 4.6, sp.fur2, 0.5); ell(h, 0, 2.2, 2.8, 2, nose, 0); mk('path', { d: 'M-14 6 h-5 M-14 8 l-5 2 M14 6 h5 M14 8 l5 2', stroke: '#fff', 'stroke-opacity': 0.8, 'stroke-width': 0.8, fill: 'none' }, h); }
    else if (sn === 'croc') {
      pth(h, 'M-12 4 Q0 -2 12 4 Q14 17 0 18 Q-14 17 -12 4 Z', shade(fur, 0.1), 1); mk('path', { d: 'M-10 14 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3 l2 3 l2 -3', stroke: '#fff', 'stroke-opacity': 0.9, 'stroke-width': 1, fill: 'none' }, h); ell(h, -4, 5, 1, 1, nose, 0); ell(h, 4, 5, 1, 1, nose, 0);
    }
    else if (sn === 'capy') { ell(h, 0, 6, 11, 8, sp.fur2, 0.7); ell(h, -3.4, 3.4, 1.6, 1.4, nose, 0); ell(h, 3.4, 3.4, 1.6, 1.4, nose, 0); mouth(8, 3); }
    else if (sn === 'wide') { ell(h, 0, 6, 13, 7.5, sp.fur2, 0.8); ell(h, -5, 3, 1.5, 1.2, nose, 0); ell(h, 5, 3, 1.5, 1.2, nose, 0); }
    if (m.indexOf('whisk') >= 0) { mk('path', { d: 'M-8 5 l-9 -2 M-8 6.5 l-9 2 M8 5 l9 -2 M8 6.5 l9 2', stroke: INK, 'stroke-opacity': 0.5, 'stroke-width': 0.8, fill: 'none' }, h); }
    if (sp.comb) { [-4, 0, 4].forEach(function (x) { ell(h, x, -hy - 1, 3, 4, sp.comb, 0.6); }); }
    if (sp.tuftTop) { mk('path', { d: 'M0 ' + (-hy + 1) + ' q-3 -5 0 -8 M3 ' + (-hy + 1) + ' q-1 -4 3 -6', stroke: fur, 'stroke-width': 2, fill: 'none', 'stroke-opacity': 1 }, h); }
    if (sp.beard) { pth(h, 'M-3 12 Q0 22 3 12 Z', '#F5F0E6', 0.8); }
    if (sp.topknot) { ell(h, 0, -hy - 4, 9, 7, sp.fur2, 0.8); ell(h, 0, -hy - 8, 6, 5, sp.fur2, 0.8); }
  }

  function hat(h, o, hx, hy) {
    var t = o.hat, c = o.hatColor, ac = o.accent || '#F2C66D';
    if (!t || t === 'none') return;
    var top = -hy;
    if (t === 'beanie') {
      pth(h, 'M' + (-hx * 0.98) + ' ' + (-hy * 0.38) + ' Q' + (-hx * 1.05) + ' ' + (top - 10) + ' 0 ' + (top - 9) + ' Q' + (hx * 1.05) + ' ' + (top - 10) + ' ' + (hx * 0.98) + ' ' + (-hy * 0.38) + ' Z', c, 1);
      pth(h, 'M' + (-hx * 0.99) + ' ' + (-hy * 0.38) + ' Q0 ' + (-hy * 0.6) + ' ' + (hx * 0.99) + ' ' + (-hy * 0.38) + ' L' + (hx * 0.96) + ' ' + (-hy * 0.66) + ' Q0 ' + (-hy * 0.88) + ' ' + (-hx * 0.96) + ' ' + (-hy * 0.66) + ' Z', shade(c, -0.12), 1);
      ell(h, 0, top - 10, 3.6, 3.6, ac, 0.9);
    } else if (t === 'cap') {
      pth(h, 'M' + (-hx * 0.95) + ' ' + (-hy * 0.3) + ' Q' + (-hx) + ' ' + (top - 7) + ' 0 ' + (top - 7) + ' Q' + hx + ' ' + (top - 7) + ' ' + (hx * 0.95) + ' ' + (-hy * 0.3) + ' Z', c, 1);
      pth(h, 'M' + (-hx * 0.3) + ' ' + (-hy * 0.32) + ' Q' + (hx * 0.9) + ' ' + (-hy * 0.1) + ' ' + (hx * 1.35) + ' ' + (-hy * 0.28) + ' Q' + (hx * 0.9) + ' ' + (-hy * 0.5) + ' ' + (-hx * 0.3) + ' ' + (-hy * 0.5) + ' Z', shade(c, -0.15), 1);
    } else if (t === 'bow') {
      var G = E('g', { transform: 'translate(' + (hx * 0.55) + ',' + (top + 1) + ')' }, h);
      pth(G, 'M0 0 L-8 -5 L-8 5 Z M0 0 L8 -5 L8 5 Z', c, 1); ell(G, 0, 0, 2.2, 2.2, shade(c, -0.2), 0.8);
    } else if (t === 'flower') {
      var F = E('g', { transform: 'translate(' + (-hx * 0.5) + ',' + (top + 1) + ')' }, h);
      for (var i = 0; i < 5; i++) { var a = i * 72 * Math.PI / 180; ell(F, Math.sin(a) * 4.2, -Math.cos(a) * 4.2, 3, 3, c, 0.6); }
      ell(F, 0, 0, 2.4, 2.4, ac, 0.6);
    } else if (t === 'bucket') {
      pth(h, 'M' + (-hx * 0.8) + ' ' + (-hy * 0.5) + ' L' + (-hx * 0.62) + ' ' + (top - 6) + ' L' + (hx * 0.62) + ' ' + (top - 6) + ' L' + (hx * 0.8) + ' ' + (-hy * 0.5) + ' Z', c, 1);
      ell(h, 0, -hy * 0.48, hx * 1.28, 3.6, shade(c, -0.1), 1);
    }
  }

  /* ------------------------------------------------------------------ body */
  function hw(y) { return 11.5 + (y + 54) * 0.12; }
  function drawTorso(g, sp, o, out, bottomLegsDy) {
    var top = out.top, style = out.style || 'tee';
    if (sp.suit === 'penguin') {
      ell(g, 0, -36, 15, 19, sp.fur, 1); ell(g, 0, -33, 10.4, 15, sp.fur2, 0);
      return;
    }
    var yb = style === 'dress' ? -9 : -20, wb = style === 'dress' ? 20 : 15;
    var torso = pth(g, 'M-11 -53 Q-14 -55 -9 -56 L9 -56 Q14 -55 11 -53 L' + wb + ' ' + yb + ' Q0 ' + (yb + 4) + ' ' + (-wb) + ' ' + yb + ' Z', top, 1);
    if (style === 'overall') {
      pth(g, 'M-13 -36 L13 -36 L' + wb + ' ' + yb + ' Q0 ' + (yb + 3) + ' ' + (-wb) + ' ' + yb + ' Z', out.bottom, 1);
      mk('path', { d: 'M-8 -36 L-7 -52 M8 -36 L7 -52', stroke: shade(out.bottom, -0.15), 'stroke-width': 2.2, 'stroke-opacity': 1, fill: 'none' }, g);
    }
    var pc = out.pcolor || '#F6EFE2';
    if (out.pattern === 'stripe') {
      for (var y = -50; y < yb - 2; y += 6.5) { var w = hw(y) - 0.6; mk('path', { d: 'M' + (-w) + ' ' + y + ' L' + w + ' ' + y, stroke: out.pattern === 'stripe' && o.kai ? out.accent : pc, 'stroke-width': 2.6, 'stroke-opacity': 0.95, fill: 'none', 'stroke-linecap': 'butt' }, g); }
    } else if (out.pattern === 'dots') {
      for (var yy = -48, r = 0; yy < yb - 3; yy += 7, r++) for (var xx = -8 + (r % 2) * 3.5; xx < 9; xx += 7) { if (Math.abs(xx) < hw(yy) - 2) ell(g, xx, yy, 1.4, 1.4, pc, 0).setAttribute('fill-opacity', 0.9); }
    } else if (out.pattern === 'check') {
      for (var y2 = -50; y2 < yb - 2; y2 += 8) { var w2 = hw(y2) - 0.6; mk('path', { d: 'M' + (-w2) + ' ' + y2 + ' L' + w2 + ' ' + y2, stroke: pc, 'stroke-width': 1.4, 'stroke-opacity': 0.55, fill: 'none' }, g); }
      for (var x3 = -8; x3 <= 8; x3 += 8) mk('path', { d: 'M' + x3 + ' -54 L' + (x3 * 1.15) + ' ' + (yb - 1), stroke: pc, 'stroke-width': 1.4, 'stroke-opacity': 0.55, fill: 'none' }, g);
    }
    // collar
    pth(g, 'M-6 -56 Q0 -50 6 -56', 'none', 1.2, { stroke: shade(top, -0.3), 'stroke-opacity': 0.7 });
    if (out.scarf) {
      pth(g, 'M-10 -57 Q0 -49 10 -57 L9 -52 Q0 -45 -9 -52 Z', out.scarf, 1);
      pth(g, 'M5 -50 L8 -36 L2 -37 Z', shade(out.scarf, -0.1), 1);
    }
  }
  function drawLegs(g, sp, out, pose, P) {
    var limb = sp.limb || sp.fur, style = out.style;
    var shoe = shade(out.bottom, -0.35);
    if (sp.suit === 'penguin') { [-1, 1].forEach(function (s) { ell(g, s * 6, -2, 6, 3, sp.beak, 1); }); return; }
    if (P.sit) {
      [-1, 1].forEach(function (s) {
        var L = E('g', {}, g);
        pth(L, 'M' + (s * 4) + ' -12 L' + (s * 20) + ' -10 L' + (s * 20) + ' -3 L' + (s * 4) + ' -4 Z', style === 'dress' ? out.top : out.bottom, 1);
        ell(L, s * 22, -6, 3.8, 5, shoe, 1);
      });
      return;
    }
    [-1, 1].forEach(function (s) {
      var rot = s * P.leg * (pose === 'walk' ? 1 : 0) * (s === 1 ? 1 : -0.5);
      var L = E('g', { transform: 'rotate(' + rot + ' ' + (s * 5.5) + ' -20)' }, g);
      var pants = style !== 'dress';
      rect(L, s * 5.5 - 3.6, -22, 7.2, 22 - 3, pants ? out.bottom : limb, 1);
      if (!pants) { /* bare legs from dress */ }
      ell(L, s * 5.5 + s * 0.8, -2, 5.6, 3, shoe, 1);
    });
  }
  function rect(p, x, y, w, h, fill, sw) { return mk('rect', { x: x, y: y, width: w, height: h, rx: Math.min(3, w / 2), fill: fill }, p, sw); }

  function arm(g, sp, out, side, ang, dy) {
    // returns hand position in g-local coords (after dy applied by caller's group)
    var sx = side * 12, sy = -50;
    var G = E('g', { transform: 'translate(' + sx + ',' + sy + ') rotate(' + (side * -ang) + ')' }, g);
    var sleeve = sp.suit === 'penguin' ? sp.fur : out.top;
    var lim = sp.limb || sp.fur;
    // upper sleeve + hand
    rect(G, -3.2, -2, 6.4, 13, sleeve, 1);
    rect(G, -2.6, 8, 5.2, 9, sp.suit === 'penguin' ? sp.fur : lim, 0.8);
    ell(G, 0, 18.5, 3.6, 3.6, sp.suit === 'penguin' ? sp.fur : lim, 0.9);
    var a = ang * Math.PI / 180;
    // hand in parent coords: rotate (0,18.5) by (-side*ang) deg
    var rr = side * -a;
    var hx = sx + (-Math.sin(rr)) * 18.5 * -1; // x' = x cos - y sin => -(18.5)*sin(rr)
    hx = sx - 18.5 * Math.sin(rr);
    var hy = sy + 18.5 * Math.cos(rr);
    return { x: hx, y: hy, G: G, side: side, sx: sx, sy: sy };
  }

  /* ------------------------------------------------------------------ items */
  var BAL = ['#D98F8A', '#E3B873', '#8FA9B8', '#A8BBB0', '#B7A0B8', '#C9776B'];
  function drawItem(p, item, hand, side, rnd) {
    var x = hand.x, y = hand.y, G = E('g', { transform: 'translate(' + x + ',' + y + ')' }, p);
    var c = pick(BAL, rnd);
    switch (item) {
      case 'balloon':
        mk('path', { d: 'M0 0 Q' + (side * 6) + ' -20 ' + (side * 2) + ' -40', stroke: INK, 'stroke-opacity': 0.55, 'stroke-width': 0.8, fill: 'none' }, G);
        ell(G, side * 2, -52, 10, 12, c, 1).setAttribute('fill-opacity', 0.92); ell(G, side * -1, -56, 2.6, 3.8, '#fff', 0).setAttribute('fill-opacity', 0.5);
        break;
      case 'bag':
        mk('path', { d: 'M-4 2 Q0 -8 4 2', fill: 'none', stroke: shade(c, -0.3), 'stroke-width': 1.4, 'stroke-opacity': 1 }, G);
        rect(G, -7, 1, 14, 14, c, 1);
        break;
      case 'phone':
        rect(G, -3, -10, 6.5, 11, '#4A4A52', 0.8); rect(G, -2.2, -9, 4.8, 8, '#A9D0DE', 0);
        break;
      case 'umbrella': {
        var cc = c; mk('line', { x1: 0, y1: 2, x2: 0, y2: -62, stroke: '#6B5545', 'stroke-width': 1.6, 'stroke-opacity': 1 }, G);
        pth(G, 'M-26 -58 Q-22 -86 0 -86 Q22 -86 26 -58 Q18 -64 13 -58 Q6 -64 0 -58 Q-6 -64 -13 -58 Q-18 -64 -26 -58 Z', cc, 1);
        break; }
      case 'cottoncandy':
        mk('line', { x1: 0, y1: 4, x2: 0, y2: -14, stroke: '#E8DCC4', 'stroke-width': 1.8, 'stroke-opacity': 1 }, G);
        [[-4, -20], [4, -20], [0, -25], [0, -17]].forEach(function (q) { ell(G, q[0], q[1], 6, 6, '#F2B8C6', 0.6).setAttribute('fill-opacity', 0.95); });
        ell(G, 2, -24, 2.4, 2.4, '#fff', 0).setAttribute('fill-opacity', 0.55);
        break;
      case 'lantern':
        mk('line', { x1: 0, y1: 4, x2: 0, y2: -34, stroke: '#6B5545', 'stroke-width': 1.5, 'stroke-opacity': 1 }, G);
        mk('line', { x1: 0, y1: -34, x2: 0, y2: -38, stroke: INK, 'stroke-opacity': 0.5, 'stroke-width': 0.8 }, G);
        ell(G, 0, -45, 8, 9.5, '#F2C66D', 0).setAttribute('fill-opacity', 0.35); ell(G, 0, -45, 6, 7.5, '#E2735E', 0.8);
        mk('path', { d: 'M-6 -45 Q0 -41 6 -45', stroke: '#9A3B2C', 'stroke-opacity': 0.6, fill: 'none', 'stroke-width': 0.8 }, G);
        break;
      case 'bread': {
        var b = ell(G, 3, -4, 11, 3.6, '#D9A66B', 0.9); b.setAttribute('transform', 'rotate(-28)');
        mk('path', { d: 'M-2 -8 l3 3 M2 -10 l3 3 M6 -12 l3 3', stroke: '#B98250', 'stroke-opacity': 0.7, fill: 'none', 'stroke-width': 0.8 }, G);
        break; }
      case 'violin': {
        var v = E('g', { transform: 'translate(-2,-6) rotate(-62)' }, G);
        pth(v, 'M-6 0 Q-9 -7 -5 -9 Q0 -11 5 -9 Q9 -7 6 0 Q9 5 5 9 Q0 11 -5 9 Q-9 5 -6 0 Z', '#A9683A', 1);
        mk('line', { x1: 0, y1: -9, x2: 0, y2: -22, stroke: '#4A3426', 'stroke-width': 2, 'stroke-opacity': 1 }, v);
        mk('line', { x1: -14, y1: 3, x2: 14, y2: -3, stroke: '#4A3426', 'stroke-width': 0.8, 'stroke-opacity': 0.9 }, G);
        break; }
      case 'mic':
        mk('line', { x1: 0, y1: 4, x2: 0, y2: -12, stroke: '#4A4A52', 'stroke-width': 2.4, 'stroke-opacity': 1 }, G);
        ell(G, 0, -15, 3.8, 3.8, '#7A7A84', 0.9);
        break;
      case 'scarf': break;
      case 'gift':
        rect(G, -7, -2, 14, 12, c, 1); rect(G, -1, -2, 2.4, 12, '#F6EFE2', 0); rect(G, -7, 2.6, 14, 2.4, '#F6EFE2', 0);
        pth(G, 'M0 -2 q-6 -6 -4 -1 M0 -2 q6 -6 4 -1', 'none', 1, {});
        break;
      case 'cup':
        pth(G, 'M-4 -9 L4 -9 L3 3 L-3 3 Z', '#F6EFE2', 1); rect(G, -4.4, -11, 8.8, 2.4, '#8A6545', 0.8); rect(G, -4, -4, 8, 4, '#C9776B', 0);
        mk('path', { d: 'M-1 -14 q-2 -3 0 -5 M2 -14 q-2 -3 0 -5', stroke: '#fff', 'stroke-opacity': 0.8, fill: 'none', 'stroke-width': 0.9 }, G);
        break;
      case 'book':
        rect(G, -7, -5, 13, 10, '#8A6545', 1); rect(G, -5, -4, 10, 8, '#F0E2C8', 0); break;
      case 'camera':
        rect(G, -7, -7, 14, 9, '#4A4A52', 1); ell(G, 0, -2.5, 3, 3, '#A9D0DE', 0.8); break;
      case 'glowstick':
        mk('line', { x1: 0, y1: 3, x2: 0, y2: -22, stroke: pick(['#F2C66D', '#E8998F', '#A8D8C0'], rnd), 'stroke-width': 3.4, 'stroke-linecap': 'round', 'stroke-opacity': 0.95 }, G);
        mk('line', { x1: 0, y1: 3, x2: 0, y2: -22, stroke: '#fff', 'stroke-width': 1, 'stroke-linecap': 'round', 'stroke-opacity': 0.6 }, G);
        break;
      case 'fan':
        pth(G, 'M0 2 L-10 -14 Q0 -20 10 -14 Z', c, 1); break;
    }
  }

  /* ------------------------------------------------------------------ main draw */
  function draw(kind, o) {
    o = o || {};
    var rnd = o.rnd || Math.random;
    var sp = SP[kind] || SP.cat;
    kind = SP[kind] ? kind : 'cat';
    var jit = (o.noJitter || kind === 'mouse') ? 0 : (rnd() - 0.5) * 0.18;
    var fur = shade(sp.fur, jit);
    var out = o.outfit || randomOutfit(rnd, o.decoy);
    var poseName = POSES[o.pose] ? o.pose : 'stand';
    var item = o.item;
    var P = POSES[poseName];
    var g = E('g', { class: 'ch ch-' + kind });
    var sc = (o.s == null ? 1 : o.s) * (o.flip ? -1 : 1);
    g.setAttribute('transform', 'translate(' + (o.x || 0) + ',' + (o.y || 0) + ') scale(' + sc + ',' + (o.s == null ? 1 : o.s) + ')');
    var ctxo = { kind: kind, kai: !!o.kai, eyes: [] };
    // soft ground shadow
    ell(g, 0, 0, 15, 3.2, '#5B4A3C', 0).setAttribute('fill-opacity', 0.13);

    var imgUrl = o.img;
    if (imgUrl) {
      E('image', { href: imgUrl, x: -45, y: -90, width: 90, height: 90, preserveAspectRatio: 'xMidYMax meet' }, g);
      return g;
    }

    var W = E('g', { class: 'body' }, g); g.__body = W;
    var up = E('g', { transform: P.dy ? 'translate(0,' + P.dy + ')' : null }, W);
    drawTail(up, sp, fur, ctxo);
    // sit: legs stay on ground (outside shifted group)
    var legsG = E('g', {}, P.sit ? W : up);
    var spL = sp; // legs use limb colour when bare
    var spx = Object.assign({}, sp, { fur: fur });
    drawLegs(legsG, spx, out, poseName, P);
    drawTorso(up, spx, ctxo, out);
    if (sp.suit === 'penguin' && out.scarf) { pth(up, 'M-10 -56 Q0 -49 10 -56 L9 -52 Q0 -45 -9 -52 Z', out.scarf, 1); }

    // arms
    var armDefs = P;
    var lA = armDefs.l, rA = armDefs.r;
    if (item === 'violin') { lA = 112; rA = 62; }
    if (item === 'mic' && poseName === 'stand') { rA = 95; }
    if (item === 'phone' && poseName === 'stand') { rA = 100; }
    if (item === 'umbrella' || item === 'cottoncandy' || item === 'lantern' || item === 'balloon' || item === 'bread' || item === 'cup' || item === 'bag' || item === 'gift' || item === 'book' || item === 'camera') { if (poseName === 'stand') rA = 36; }
    var handL = arm(up, spx, out, -1, lA);
    var neck = (sp.neck || 0);
    // neck
    if (neck) rect(up, -5.5, -56 - neck, 11, neck + 5, fur, 1);
    // head
    var hx = sp.hx || 17, hy = sp.hy || 15;
    var hBase = 'translate(0,' + (-68 - neck) + ')';
    var h = E('g', { transform: hBase }, up);
    g.__head = h; g.__headBase = hBase; g.__eyes = ctxo.eyes; g.__s = o.s == null ? 1 : o.s;
    earsBack(h, sp, fur, hx, hy);
    headFace(h, spx, fur, hx, hy, ctxo);
    hat(h, out, hx, hy);
    var handR = arm(up, spx, out, 1, rA);
    if (item && item !== 'scarf') {
      if (item === 'violin') drawItem(up, item, { x: handL.x * 0.45, y: handL.y - 2 }, -1, rnd);
      else drawItem(up, item, handR, 1, rnd);
    }
    g.__hand = { x: handR.x, y: handR.y + (P.dy || 0) }; g.__armL = handL; g.__armR = handR;
    return g;
  }

  // Kai portrait / reference svg
  function portrait(opts) {
    opts = opts || {};
    var svg = E('svg', { viewBox: '-34 -108 68 116', width: opts.w || 54, height: opts.h || 92, class: 'kai-portrait' });
    var g = draw('mouse', { outfit: Chars.kaiOutfit(), kai: true, pose: opts.pose || 'wave', rnd: Math.random });
    svg.appendChild(g);
    return svg;
  }

  // ---- ambient-life helpers (cheap attribute pokes) ----
  function blink(g, closed) { var es = g && g.__eyes; if (!es) return; for (var i = 0; i < es.length; i++) es[i].setAttribute('ry', closed ? 0.25 : es[i].__ry); }
  function tilt(g, ang) { if (g && g.__head) g.__head.setAttribute('transform', g.__headBase + (ang ? ' rotate(' + ang.toFixed(1) + ' 0 6)' : '')); }
  function bodyXf(g, dy, sy, sx) { if (g && g.__body) g.__body.setAttribute('transform', (dy ? 'translate(0,' + (-dy).toFixed(1) + ') ' : '') + 'scale(' + (sx || 1).toFixed(3) + ',' + (sy || 1).toFixed(3) + ')'); }
  function setArm(g, side, ang) { var a = side > 0 ? g.__armR : g.__armL; if (a && a.G) a.G.setAttribute('transform', 'translate(' + a.sx + ',' + a.sy + ') rotate(' + (side * -ang).toFixed(1) + ')'); }

  var Chars = DAYOF.Chars = {
    blink: blink, tilt: tilt, bodyXf: bodyXf, setArm: setArm,
    KINDS: KINDS, SPECIES: SP, KAI_KIND: 'mouse', INK: INK,
    data: null, _outfit: null,
    draw: draw, randomOutfit: randomOutfit, portrait: portrait, E: E, shade: shade, mix: mix,
    kaiOutfit: function () { return Object.assign({}, DEFAULT_KAI, this._outfit || {}, { pcolor: (this._outfit && this._outfit.pcolor) || DEFAULT_KAI.accent }); },
    crowdEntries: function () { return (this.data && this.data.crowd && this.data.crowd.length) ? this.data.crowd : KINDS.map(function (k, i) { return { id: 'guest' + (i + 1), kind: k }; }); },
    setData: function (d) { if (!d) return; this.data = d; if (d.kai && d.kai.outfit) this._outfit = d.kai.outfit; },
    load: function (url) {
      var self = this;
      return fetch(url || 'data/characters.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { self.setData(d); return self.data; }).catch(function () { return null; });
    }
  };
  // kick off (relative to page); engine awaits Chars.ready
  Chars.ready = (typeof fetch === 'function') ? Chars.load('data/characters.json') : Promise.resolve(null);
})();
