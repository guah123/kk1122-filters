/* Page type 'suitcase' (step 11): 上太空的行李箱你要帶什麼去？ — fully pictorial drag-to-pack game */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };

(function () {
  'use strict';
  var INK = '#4A3C30';
  var ST = 'stroke="' + INK + '" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"';
  function P(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '" ' + ST + ' ' + (extra || '') + '/>'; }
  function R(x, y, w, h, rx, fill, extra) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '" fill="' + fill + '" ' + ST + ' ' + (extra || '') + '/>'; }
  function C(x, y, r, fill, extra) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" ' + ST + ' ' + (extra || '') + '/>'; }
  function L(d, color, w, extra) { return '<path d="' + d + '" fill="none" stroke="' + (color || INK) + '" stroke-width="' + (w || 1.2) + '" stroke-linecap="round" ' + (extra || '') + '/>'; }
  function H(d, extra) { return '<path d="' + d + '" fill="url(#sc-hatch)" stroke="none" ' + (extra || '') + '/>'; }
  function svg(inner) { return '<svg viewBox="0 0 64 64" aria-hidden="true"><g filter="url(#sc-rough)">' + inner + '</g></svg>'; }

  var leaf = 'M0 0 C-14 -2 -17 -14 -9 -21 C-5 -25 -1 -23 0 -19 C1 -23 5 -25 9 -21 C17 -14 14 -2 0 0z';
  function leafG(tr) {
    return '<g transform="' + tr + '">' + P(leaf, '#8FA37A') + H(leaf) +
      L('M-13 -8 L-5 -9 M-12 -15 L-5 -13 M13 -8 L5 -9 M12 -15 L5 -13', '#F6EFE2', 1.5) + L('M0 0 L0 -19', '#5F7550', 1) + '</g>';
  }

  var ART = {
    switch: svg(
      R(18, 13, 28, 38, 3, '#55504A') + R(21, 16, 22, 32, 1.5, '#BFDCEB', 'stroke-width="1"') +
      C(36, 24, 3.2, '#F2C66D', 'stroke-width="1"') + P('M21 48 L21 38 Q27 31 32 38 Q37 33 43 40 L43 48z', '#A9BC93', 'stroke-width="1"') +
      P('M8 19 Q8 13 14 13 H18 V51 H14 Q8 51 8 45z', '#79B6D6') + H('M8 19 Q8 13 14 13 H18 V51 H14 Q8 51 8 45z') +
      P('M56 19 Q56 13 50 13 H46 V51 H50 Q56 51 56 45z', '#E98874') + H('M56 19 Q56 13 50 13 H46 V51 H50 Q56 51 56 45z') +
      C(13, 25, 3.4, '#3D352D') + C(51, 38, 3.4, '#3D352D') +
      C(51, 22, 1.5, '#FBF7EF', 'stroke-width="1"') + C(51, 28, 1.5, '#FBF7EF', 'stroke-width="1"') + C(48.2, 25, 1.5, '#FBF7EF', 'stroke-width="1"') + C(53.8, 25, 1.5, '#FBF7EF', 'stroke-width="1"') +
      R(11, 41, 4, 1.8, 0.8, '#FBF7EF', 'stroke-width="1"')),
    headphones: svg(
      '<path d="M13 40 C10 6 54 6 51 40" fill="none" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M13 40 C10 6 54 6 51 40" fill="none" stroke="#C9A27A" stroke-width="4" stroke-linecap="round"/>' +
      L('M20 14 Q32 8 44 14', '#F6EFE2', 1, 'opacity=".7"') +
      R(7, 33, 15, 22, 6.5, '#5E86A8') + R(19, 36, 6, 16, 3, '#F6EFE2') + H('M7 33 H22 V55 H7z') +
      R(42, 33, 15, 22, 6.5, '#5E86A8') + R(39, 36, 6, 16, 3, '#F6EFE2') + H('M42 33 H57 V55 H42z')),
    book: svg('<g transform="rotate(-6 32 32)">' +
      R(48, 10, 5, 44, 1, '#F6EFE2') + L('M49.5 14 V52 M51 14 V52', '#C9B28A', .8) +
      R(14, 8, 34, 48, 2, '#8B5A3A') + H('M14 8 H48 V56 H14z') + R(14, 8, 6, 48, 2, '#6E4128') +
      R(24, 16, 20, 13, 1.5, '#E9D5B0', 'stroke-width="1.2"') + L('M27 21 H41 M27 25 H37', INK, 1) +
      L('M24 40 H44 M24 44 H44', '#D6B084', 1.2) +
      P('M38 56 V63 L41 60 L44 63 V56z', '#C65D4C', 'stroke-width="1.3"') + '</g>'),
    monstera: svg(
      L('M32 42 Q22 34 22 30 M32 42 Q42 32 44 24 M32 42 V22', '#6B8556', 2) +
      leafG('translate(32 41) rotate(-38) scale(1.05)') + leafG('translate(32 41) rotate(34) scale(1.05)') + leafG('translate(32 41) rotate(-2) scale(1.2)') +
      P('M19 46 H45 L41 61 Q40 62 38 62 H26 Q24 62 23 61z', '#C8754F') + H('M19 46 H45 L41 61 H23z') +
      R(17, 41, 30, 6, 2.5, '#D98960') + L('M20 44 H44', '#F0B58F', 1, 'opacity=".7"')),
    guitar: svg('<g transform="rotate(32 32 32) translate(0 1)">' +
      R(29, 4, 6, 30, 1.5, '#8A6545') + R(27.5, -1, 9, 8, 2, '#5A3B25') + C(30, 3, .9, '#E9D5B0', 'stroke-width=".5"') + C(34, 3, .9, '#E9D5B0', 'stroke-width=".5"') +
      L('M29 12 H35 M29 18 H35 M29 24 H35', '#E9D5B0', .8) +
      P('M32 30 C24 30 20 35 22 40 C16 42 14 50 18 55 C23 62 41 62 46 55 C50 50 48 42 42 40 C44 35 40 30 32 30z', '#D9A25F') +
      H('M32 30 C24 30 20 35 22 40 C16 42 14 50 18 55 C23 62 41 62 46 55 C50 50 48 42 42 40 C44 35 40 30 32 30z') +
      C(32, 46, 5, '#3D352D') + R(26.5, 54, 11, 3, 1, '#5A3B25', 'stroke-width="1"') +
      L('M31 8 V54 M33 8 V54', '#F6EFE2', .7) + '</g>'),
    chips: svg(
      '<ellipse cx="25" cy="8" rx="6" ry="3" fill="#F2D58A" ' + ST + ' stroke-width="1.2" transform="rotate(-20 25 8)"/><ellipse cx="38" cy="7" rx="6" ry="3" fill="#F2D58A" ' + ST + ' stroke-width="1.2" transform="rotate(15 38 7)"/>' +
      P('M16 12 H48 L52 52 Q52 56 48 56 H16 Q12 56 12 52z', '#F2C66D') + H('M16 12 H48 L52 52 Q52 56 48 56 H16 Q12 56 12 52z') +
      P('M13.5 27 Q22 21 32 27 T50.5 27 V41 Q42 47 32 41 T13.5 41z', '#D9604C') +
      C(32, 34, 7, '#FBF7EF') + '<ellipse cx="32" cy="34" rx="4.2" ry="3" fill="#F2D58A" ' + ST + ' stroke-width="1" transform="rotate(-25 32 34)"/>' +
      R(11, 8, 42, 6, 1, '#E9B94F') + L('M15 8 V14 M19 8 V14 M23 8 V14 M27 8 V14 M31 8 V14 M35 8 V14 M39 8 V14 M43 8 V14 M47 8 V14 M51 8 V14', INK, .8) +
      R(11, 54, 42, 5, 1, '#E9B94F') + L('M15 54 V59 M19 54 V59 M23 54 V59 M27 54 V59 M31 54 V59 M35 54 V59 M39 54 V59 M43 54 V59 M47 54 V59 M51 54 V59', INK, .8)),
    football: svg(
      '<ellipse cx="33" cy="57" rx="17" ry="3.5" fill="#8FA37A" opacity=".5"/>' +
      C(32, 32, 23, '#FBF7EF') + H('M32 9 A23 23 0 1 1 31.9 9z') +
      P('M32 25 L38.7 29.9 L36.1 37.6 L27.9 37.6 L25.3 29.9z', '#4A3C30') +
      L('M32 25 V15 M38.7 29.9 L47 26 M36.1 37.6 L42 46 M27.9 37.6 L22 46 M25.3 29.9 L17 26') +
      P('M27 11.5 L37 11.5 L35 17 L29 17z', '#4A3C30', 'stroke-width="1"') +
      P('M47 24 L53 29 L50 36 L46 32z', '#4A3C30', 'stroke-width="1"') + P('M17 24 L11 29 L14 36 L18 32z', '#4A3C30', 'stroke-width="1"') +
      P('M40 46 L47 45 L47 51 L42 53z', '#4A3C30', 'stroke-width="1"') + P('M24 46 L17 45 L17 51 L22 53z', '#4A3C30', 'stroke-width="1"')),
    photoframe: svg(
      P('M10 58 L32 48 L54 58', 'none', 'stroke-width="1.4"') +
      R(8, 6, 48, 48, 3, '#A87B4F') + H('M8 6 H56 V54 H8z') + R(13, 11, 38, 38, 1.5, '#F6EFE2', 'stroke-width="1.2"') +
      R(16, 14, 32, 32, 1, '#BFDCEB', 'stroke-width="1"') + C(41, 21, 3.6, '#F2C66D', 'stroke-width="1"') +
      R(16, 40, 32, 6, 0, '#A9BC93', 'stroke-width="1"') +
      C(24, 27, 3, '#E9C9A5', 'stroke-width="1.1"') + P('M19 41 Q19 32 24 32 Q29 32 29 41z', '#5E86A8', 'stroke-width="1.1"') +
      C(33.5, 27.5, 2.9, '#E9C9A5', 'stroke-width="1.1"') + P('M29 41 Q29 32.5 33.5 32.5 Q38 32.5 38 41z', '#E7A9A0', 'stroke-width="1.1"') +
      C(41.5, 32.5, 2.2, '#E9C9A5', 'stroke-width="1"') + P('M38 41 Q38 36 41.5 36 Q45 36 45 41z', '#F2C66D', 'stroke-width="1"')),
    cigarettes: svg(
      L('M27 5 Q22 1 26 -3', '#B8AFA2', 1.2, 'opacity=".8"') +
      R(24, 8, 4.5, 16, 1, '#FBF7EF') + R(24, 8, 4.5, 4.5, 1, '#E39A52', 'stroke-width="1.2"') + R(31, 11, 4.5, 13, 1, '#FBF7EF') + R(31, 11, 4.5, 4, 1, '#E39A52', 'stroke-width="1.2"') +
      P('M44 20 L51 17 V55 L44 58z', '#E0CFAE') + H('M44 20 L51 17 V55 L44 58z') +
      R(14, 20, 30, 38, 2, '#FBF7EF') + H('M14 20 H44 V58 H14z') + L('M14 26 H44') +
      R(14, 34, 30, 10, 0, '#C65D4C', 'stroke-width="1.3"') + P('M29 36 L30.2 38.8 L33 39 L30.8 40.8 L31.5 43.5 L29 42 L26.5 43.5 L27.2 40.8 L25 39 L27.8 38.8z', '#F2C66D', 'stroke-width=".8"') +
      L('M18 50 H40', '#B8AFA2', 1)),
    dress: svg(
      P('M21 12 L24 12 Q28 19 32 12 L35 12 L37 28 Q46 36 50 58 L6 58 Q10 36 19 28z', '#E7A9A0') + H('M21 12 L24 12 Q28 19 32 12 L35 12 L37 28 Q46 36 50 58 L6 58 Q10 36 19 28z') +
      P('M19 28 L37 28 L37.5 32.5 Q28 35.5 18.5 32.5z', '#5E86A8') +
      C(18, 46, 1.3, '#FBF7EF', 'stroke-width=".6"') + C(28, 43, 1.3, '#FBF7EF', 'stroke-width=".6"') + C(37, 48, 1.3, '#FBF7EF', 'stroke-width=".6"') + C(24, 53, 1.3, '#FBF7EF', 'stroke-width=".6"') + C(34, 55, 1.3, '#FBF7EF', 'stroke-width=".6"') + C(13, 54, 1.3, '#FBF7EF', 'stroke-width=".6"') + C(43, 54, 1.3, '#FBF7EF', 'stroke-width=".6"') +
      P('M41 22 Q41 6 49 6 Q57 6 57 22z', '#F0D8A0') + '<ellipse cx="49" cy="22" rx="14.5" ry="5" fill="#E9C98F" ' + ST + '/>' +
      P('M41.5 18 Q49 21.5 56.5 18 L57 21.5 Q49 25 41 21.5z', '#5E86A8', 'stroke-width="1.2"') + L('M44 12 Q49 9 54 12', '#FBF7EF', 1, 'opacity=".7"'))
  };

  var ITEMS = [
    { id: 'switch', label: 'Switch' }, { id: 'headphones', label: '全罩耳機' }, { id: 'book', label: '咖啡色書皮的書' },
    { id: 'monstera', label: '龜背芋盆栽' }, { id: 'guitar', label: '一把吉他' }, { id: 'chips', label: '一包洋芋片' },
    { id: 'football', label: '一顆足球' }, { id: 'photoframe', label: '一個全家福相框' }, { id: 'cigarettes', label: '一包菸' },
    { id: 'dress', label: '一套洋裝（和帽子一起）' }
  ];
  // scattered layout (design px on a 390×844 screen; JS maps them onto the real stage). [cx, cy, rotate°, size]
  // bands: header ≤130 · top scatter 132–340 · suitcase 350–494 (sides x≤100 / ≥290) · message ~510 · bottom scatter 536–716
  var POS = {
    switch: [67, 190, -6, 0.95], headphones: [196, 184, 7, 1.04], book: [325, 196, -4, 0.92],
    monstera: [116, 290, 5, 1.08], guitar: [272, 293, -9, 1.1],
    chips: [61, 410, 3, 0.94], football: [329, 436, -3, 0.96],
    photoframe: [86, 588, -5, 1], cigarettes: [304, 598, 9, 0.9], dress: [196, 668, -3, 1.04]
  };
  var DESIGN = { W: 390, H: 844, TOP: 130, BOTTOM: 124, CASE_Y: 422, CASE_W: 172 };
  var LABEL = {}; ITEMS.forEach(function (i) { LABEL[i.id] = i.label; });

  // slot centres inside the suitcase interior (viewBox 260x200)
  var SLOTS = [[50, 114], [90, 114], [130, 114], [170, 114], [210, 114], [50, 132], [90, 132], [130, 132], [170, 132], [210, 132]];
  var ROT = [-7, 4, -3, 8, -5, 5, -8, 3, 7, -4];

  var DEFS = '<svg class="sc-defs" aria-hidden="true"><defs>' +
    '<filter id="sc-rough" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2"/></filter>' +
    '<pattern id="sc-hatch" patternUnits="userSpaceOnUse" width="3.2" height="3.2" patternTransform="rotate(40)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="' + INK + '" stroke-width=".7" opacity=".16"/></pattern>' +
    '</defs></svg>';

  var CS = 'stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
  var BACK = '<svg class="lay back" viewBox="0 0 260 200" aria-hidden="true"><g filter="url(#sc-rough)">' +
    '<path d="M22 86 H238 L252 152 H8z" fill="#E2CBA2" ' + CS + '/><path d="M22 86 H238 L241 104 H19z" fill="#B9996A" opacity=".55"/>' +
    '<path d="M22 86 H238 L252 152 H8z" fill="url(#sc-hatch)"/></g></svg>';
  function strap(x, extra) {
    return '<rect x="' + x + '" y="' + extra[0] + '" width="18" height="' + extra[1] + '" fill="#6F4A30" ' + CS + ' stroke-width="1.8"/>';
  }
  function buckle(x, y) {
    return '<g class="latch"><rect x="' + (x - 3) + '" y="' + y + '" width="24" height="15" rx="3.5" fill="#E5B94F" ' + CS + ' stroke-width="1.8"/><rect x="' + (x + 5) + '" y="' + (y + 4) + '" width="8" height="7" rx="1.5" fill="#6F4A30"/></g>';
  }
  var FRONT = '<svg class="lay front" viewBox="0 0 260 200" aria-hidden="true"><g filter="url(#sc-rough)">' +
    '<rect x="22" y="192" width="24" height="6" rx="3" fill="#6F4A30"/><rect x="214" y="192" width="24" height="6" rx="3" fill="#6F4A30"/>' +
    '<path d="M6 146 H254 L252 188 Q252 194 246 194 H14 Q8 194 8 188z" fill="#A9744A" ' + CS + '/>' +
    '<path d="M6 146 H254 L252 188 Q252 194 246 194 H14 Q8 194 8 188z" fill="url(#sc-hatch)"/>' +
    '<rect x="4" y="144" width="252" height="9" rx="4" fill="#7A5236" ' + CS + ' stroke-width="1.8"/>' +
    '<path d="M16 183 H244" stroke="#F0DDB8" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/>' +
    '<path d="M20 160 Q130 154 240 160" stroke="#C99668" stroke-width="2" opacity=".6" fill="none"/>' +
    strap(58, [153, 41]) + strap(184, [153, 41]) + buckle(55, 164) + buckle(181, 164) +
    '<path d="M6 190 L6 178 L18 190z M254 190 L254 178 L242 190z" fill="#E5B94F" stroke="' + INK + '" stroke-width="1.6"/></g></svg>';
  // Lid: one quad hinged at the BACK edge of the body (y=86). phi = opening angle (100 open .. 0 closed).
  function lidSvg(phi, final) {
    var rad = phi * Math.PI / 180;
    var fy = 86 + 64 * Math.cos(rad) - 68 * Math.sin(rad);
    var hw = 98 + 24 * (100 - phi) / 100;
    function B(u, v) { var bx = 22 + 216 * u, fx = 130 - hw + 2 * hw * u; return [bx + (fx - bx) * v, 86 + (fy - 86) * v]; }
    function Q(u0, v0, u1, v1) { return [B(u0, v0), B(u1, v0), B(u1, v1), B(u0, v1)].map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }
    function poly(pts, fill, sw, stroke, extra) { return '<polygon points="' + pts + '" fill="' + fill + '" stroke="' + (stroke || INK) + '" stroke-width="' + sw + '" stroke-linejoin="round" ' + (extra || '') + '/>'; }
    function ln(u0, v0, u1, v1, col, w, extra) { var a = B(u0, v0), b = B(u1, v1); return '<path d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" fill="none" ' + (extra || '') + '/>'; }
    var o = '';
    if (final) o += '<path d="M100 88 Q100 56 130 56 Q160 56 160 88" fill="none" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/><path d="M100 88 Q100 56 130 56 Q160 56 160 88" fill="none" stroke="#6F4A30" stroke-width="5" stroke-linecap="round"/>';
    if (phi > 55) { // inside face (lining) visible
      o += poly(Q(0, 0, 1, 1), '#8F5E3C', 2.2) + poly(Q(.06, .07, .94, .92), '#EFDDBC', 1.5);
      [.2, .35, .5, .65, .8].forEach(function (u) { o += ln(u, .1, u, .9, '#DDC498', 3, 'opacity=".6"'); });
      o += ln(.08, .6, .92, .6, '#8A6545', 5) + ln(.08, .6, .92, .6, '#C99668', 2, 'stroke-dasharray="6 5"');
      o += poly(Q(.4, .15, .6, .38), '#F6EFE2', 1.3);
      o += poly(Q(0, 0, 1, 1), 'url(#sc-hatch)', 0, 'none');
    } else {       // outside face (leather, straps, buckles)
      o += poly(Q(0, 0, 1, 1), '#A9744A', 2.2) + poly(Q(0, 0, 1, 1), 'url(#sc-hatch)', 0, 'none');
      o += poly(Q(.07, .1, .93, .9), 'none', 1.6, '#F0DDB8', 'stroke-dasharray="5 4"');
      o += poly(Q(.205, 0, .279, 1), '#6F4A30', 1.8) + poly(Q(.721, 0, .795, 1), '#6F4A30', 1.8);
      [.2325, .7585].forEach(function (uc) {
        o += '<g class="latch">' + poly(Q(uc - .06, .62, uc + .06, .88), '#E5B94F', 1.8) + poly(Q(uc - .02, .68, uc + .02, .8), '#6F4A30', 0) + '</g>';
      });
    }
    return '<g filter="url(#sc-rough)">' + o + '</g>';
  }

  var ROCKET = '<svg class="sc-rocket" viewBox="0 0 34 46"><g ' + ST + '><path d="M17 2 Q27 12 25 30 H9 Q7 12 17 2z" fill="#FBF7EF"/><circle cx="17" cy="16" r="4" fill="#9DBFD8"/><path d="M9 24 L2 34 L9 32z M25 24 L32 34 L25 32z" fill="#C65D4C"/><path d="M12 30 Q17 44 22 30z" fill="#F2C66D"/></g></svg>';
  var STAR = '<svg class="sc-star" viewBox="0 0 24 24"><path d="M12 1 L15 9 L23 9.5 L17 14.5 L19 23 L12 18 L5 23 L7 14.5 L1 9.5 L9 9z" fill="#F2C66D" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  function renderDefault(container, ctx) {
      var state = ctx.state;
      var saved = state.suitcase && state.suitcase.closed ? state.suitcase : null;
      var slotOf = {};               // id -> slot index (packed)
      var closed = false, closing = false, zeroAsked = false, dragging = null, lastDragEnd = 0;
      var timers = [], ghosts = [], raf = 0;
      function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

      // ---- DOM
      var stage = document.createElement('div'); stage.className = 'sc-stage';
      var html = DEFS +
        '<div class="sc-head"><h2 class="sc-title">上太空的行李箱你要帶什麼去？</h2><p class="sc-hint">把想帶的東西拖進行李箱，<br>拖完點一下行李箱，把它關起來</p></div>';
      function capHtml(t) { return t.replace(/（[^（）]*）|\([^()]*\)/g, function (m) { return '<span class="sc-note">' + m + '</span>'; }); }
      html += '<div class="sc-rug" aria-hidden="true"></div>';
      html += ITEMS.map(function (it) {
        var q = POS[it.id];
        return '<div class="sc-item" data-id="' + it.id + '" style="--r:' + q[2] + 'deg;--z:' + q[3] + '"><div class="sc-art">' + ART[it.id] + '</div><div class="sc-cap">' + capHtml(LABEL[it.id]) + '</div></div>';
      }).join('');
      html += '<div class="sc-case" role="button" aria-label="行李箱"><div class="shadow"></div>' + BACK + '<div class="sc-slots"></div>' + FRONT + '<svg class="lay sc-lid" viewBox="0 0 260 200" aria-hidden="true"></svg></div>';
      html += '<div class="sc-under"><div class="sc-msg"></div><div class="sc-actions"><button class="btn sc-fallbackbtn" type="button">繼續看看</button></div></div>';
      stage.innerHTML = html;
      container.appendChild(stage);

      var $case = stage.querySelector('.sc-case'), $slots = stage.querySelector('.sc-slots');
      var $msg = stage.querySelector('.sc-msg'), $hint = stage.querySelector('.sc-hint'), $btn = stage.querySelector('.sc-actions .btn');
      var $under = stage.querySelector('.sc-under');
      var $lid = stage.querySelector('.sc-lid');
      function drawLid(phi, final) { $lid.innerHTML = lidSvg(phi, final); }
      drawLid(100, false);
      var trayEl = {}; [].forEach.call(stage.querySelectorAll('.sc-item'), function (el) { trayEl[el.getAttribute('data-id')] = el; });

      var $rug = stage.querySelector('.sc-rug');
      function layout() {
        var W = stage.clientWidth, Hh = stage.clientHeight; if (!W || !Hh) return;
        var sx = Math.min(1.15, W / DESIGN.W), sy = Math.max(0.6, (Hh - DESIGN.TOP - DESIGN.BOTTOM) / (DESIGN.H - DESIGN.TOP - DESIGN.BOTTOM));
        var k = Math.min(1, sx, sy);
        stage.style.setProperty('--s', k.toFixed(3));
        var X = function (cx) { return W / 2 + (cx - DESIGN.W / 2) * sx; }, Y = function (cy) { return DESIGN.TOP + (cy - DESIGN.TOP) * sy; };
        ITEMS.forEach(function (it) { var q = POS[it.id], e = trayEl[it.id]; e.style.left = X(q[0]).toFixed(1) + 'px'; e.style.top = Y(q[1]).toFixed(1) + 'px'; });
        $case.style.top = Y(DESIGN.CASE_Y).toFixed(1) + 'px'; $case.style.width = (DESIGN.CASE_W * Math.min(1.1, sx, sy)).toFixed(1) + 'px';
        if ($rug) { $rug.style.top = (Y(DESIGN.CASE_Y) + DESIGN.CASE_W * k * 0.3).toFixed(1) + 'px'; }
        var s = stage.getBoundingClientRect(), c = $case.getBoundingClientRect();
        if (c.height) $under.style.top = (c.bottom - s.top + 12) + 'px';
      }
      window.addEventListener('resize', layout);
      layout(); later(layout, 60);

      // ---- packed items inside the suitcase
      function slotCss(i) { return { l: SLOTS[i][0] / 260 * 100, t: SLOTS[i][1] / 200 * 100 }; }
      function addPacked(id, i) {
        var el = document.createElement('div');
        el.className = 'sc-packed'; el.setAttribute('data-id', id);
        var p = slotCss(i);
        el.style.left = p.l + '%'; el.style.top = p.t + '%'; el.style.zIndex = i + 1;
        el.style.rotate = ROT[i] + 'deg';
        el.innerHTML = ART[id]; el.setAttribute('draggable', 'false');
        el.addEventListener('pointerdown', function (e) { startDrag(e, id, true, el); });
        $slots.appendChild(el);
        return el;
      }
      function packedEl(id) { return $slots.querySelector('[data-id="' + id + '"]'); }
      function freeSlot() { var used = {}; Object.keys(slotOf).forEach(function (k) { used[slotOf[k]] = 1; }); for (var i = 0; i < SLOTS.length; i++) if (!used[i]) return i; return SLOTS.length - 1; }
      function packedIds() { return ITEMS.map(function (i) { return i.id; }).filter(function (id) { return id in slotOf; }); }

      // ---- drag
      function overCase(x, y) {
        var r = $case.getBoundingClientRect(), m = 10;
        return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m;
      }
      var LIFT = 30;
      function ghostPlace(g, x, y, s) { g.style.transform = 'translate(' + (x - 38) + 'px,' + (y - 38 - LIFT) + 'px) scale(' + s + ')'; }
      var capture = null; // tap tracker for the suitcase
      function abortDrag() {
        var d = dragging; if (!d) return;
        dragging = null; $case.classList.remove('over');
        if (d.cleanup) d.cleanup();
        if (d.ghost) { if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost); }
        if (d.fromPacked) { var pe = packedEl(d.id); if (pe) pe.style.opacity = ''; } else if (trayEl[d.id]) trayEl[d.id].classList.remove('gone');
      }
      function startDrag(e, id, fromPacked, src) {
        if (closed || closing) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (dragging) abortDrag();   // stale drag (lost pointerup on iOS) must never block new drags
        e.preventDefault();
        var d = dragging = { id: id, fromPacked: fromPacked, pid: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, src: src, done: false };
        try { src.setPointerCapture(e.pointerId); } catch (err) { }
        function mv(ev) {
          if (ev.pointerId !== d.pid || d.done) return;
          var x = ev.clientX, y = ev.clientY;
          if (!d.moved) {
            if (Math.abs(x - d.sx) + Math.abs(y - d.sy) < 7) return;
            d.moved = true; if (capture) capture.blocked = true;
            var g = document.createElement('div'); g.className = 'sc-ghost'; g.innerHTML = ART[id];
            document.body.appendChild(g); ghosts.push(g); d.ghost = g;
            if (fromPacked) src.style.opacity = '0'; else trayEl[id].classList.add('gone');
          }
          ghostPlace(d.ghost, x, y, 1.18);
          $case.classList.toggle('over', overCase(x, y) || overCase(x, y - LIFT));
        }
        function up(ev) {
          if (ev.pointerId !== d.pid || d.done) return;
          d.done = true; d.cleanup();
          dragging = null; $case.classList.remove('over');
          if (!d.moved) { if (!fromPacked) { trayEl[id].classList.add('wiggle'); later(function () { trayEl[id].classList.remove('wiggle'); }, 500); } return; }
          var x = ev.clientX, y = ev.clientY, ok = ev.type !== 'pointercancel' && (overCase(x, y) || overCase(x, y - LIFT));
          if (ok) dropIn(d, x, y); else dropOut(d);
        }
        d.cleanup = function () {
          src.removeEventListener('pointermove', mv); src.removeEventListener('pointerup', up); src.removeEventListener('pointercancel', up);
          window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          try { src.releasePointerCapture(d.pid); } catch (err) { }
        };
        src.addEventListener('pointermove', mv); src.addEventListener('pointerup', up); src.addEventListener('pointercancel', up);
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      }
      function endGhost(g) { later(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 300); }
      function dropIn(d, x, y) {
        var id = d.id, g = d.ghost, i;
        if (d.fromPacked) { i = slotOf[id]; } else { i = freeSlot(); slotOf[id] = i; zeroAsked = false; }
        var r = $case.getBoundingClientRect(), tx = r.left + SLOTS[i][0] / 260 * r.width, ty = r.top + SLOTS[i][1] / 200 * r.height;
        var s = (0.2 * r.width) / 76;
        g.classList.add('anim'); g.style.transform = 'translate(' + (tx - 38) + 'px,' + (ty - 38) + 'px) scale(' + s + ')';
        later(function () {
          if (d.fromPacked) { var pe = packedEl(id); if (pe) pe.style.opacity = ''; } else { addPacked(id, i); }
          if (g.parentNode) g.parentNode.removeChild(g);
        }, 270);
        updateMsg();
      }
      function dropOut(d) {
        var id = d.id, g = d.ghost, t = trayEl[id].querySelector('.sc-art').getBoundingClientRect();
        if (d.fromPacked) { var pe = packedEl(id); if (pe) pe.parentNode.removeChild(pe); delete slotOf[id]; }
        var s = t.width / 76;
        g.classList.add('anim'); g.style.transform = 'translate(' + (t.left + t.width / 2 - 38) + 'px,' + (t.top + t.height / 2 - 38) + 'px) scale(' + s + ')';
        later(function () { trayEl[id].classList.remove('gone'); }, 240);
        endGhost(g); updateMsg();
      }
      ITEMS.forEach(function (it) {
        var el = trayEl[it.id];
        el.addEventListener('pointerdown', function (e) { startDrag(e, it.id, false, el); });
        el.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
        [].forEach.call(el.querySelectorAll('svg'), function (v) { v.setAttribute('draggable', 'false'); v.setAttribute('focusable', 'false'); });
        el.addEventListener('dragstart', function (e) { e.preventDefault(); });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      });
      // block page scroll / rubber-band while this step is mounted (iOS)
      function stopTouch(e) { if (e.cancelable) e.preventDefault(); }
      stage.addEventListener('touchmove', stopTouch, { passive: false });
      container.addEventListener('touchmove', stopTouch, { passive: false });
      container.style.touchAction = 'none';
      var prevOB = [document.documentElement.style.overscrollBehavior, document.body.style.overscrollBehavior];
      document.documentElement.style.overscrollBehavior = 'none'; document.body.style.overscrollBehavior = 'none';

      function updateMsg() { if (!closed && !closing) $msg.textContent = ''; }

      // ---- closing
      function onCaseTap() {
        if (closed || closing) return;
        var n = packedIds().length;
        if (n === 0 && !zeroAsked) { zeroAsked = true; $msg.textContent = '什麼都不帶嗎？再點一次就關上囉'; return; }
        closeCase(true);
      }
      var lastTap = 0, lastPD = 0;
      $case.addEventListener('pointerdown', function (e) { lastPD = Date.now(); capture = { x: e.clientX, y: e.clientY, t: Date.now(), blocked: false, pid: e.pointerId }; });
      $case.addEventListener('pointerup', function (e) {
        var c = capture; capture = null;
        if (!c || c.blocked || c.pid !== e.pointerId) return;
        if (Math.abs(e.clientX - c.x) + Math.abs(e.clientY - c.y) > 14 || Date.now() - c.t > 900) return;
        lastTap = Date.now(); onCaseTap();
      });
      $case.addEventListener('pointercancel', function () { capture = null; });
      $case.addEventListener('click', function () { if (Date.now() - lastPD < 1500) return; if (Date.now() - lastTap > 700) { lastTap = Date.now(); onCaseTap(); } });

      function puff() {
        var box = document.createElement('div'); box.className = 'sc-puff'; $case.parentNode.appendChild(box);
        var r = $case.getBoundingClientRect(), s = stage.getBoundingClientRect();
        box.style.left = (r.left - s.left + r.width / 2) + 'px'; box.style.top = (r.top - s.top + r.height * 0.3) + 'px';
        for (var k = 0; k < 9; k++) {
          var w = document.createElement('div'); w.innerHTML = STAR; var st = w.firstChild;
          var a = (-90 + (k - 4) * 22) * Math.PI / 180, dist = 70 + (k % 3) * 28;
          st.style.setProperty('--dx', Math.cos(a) * dist + 'px'); st.style.setProperty('--dy', Math.sin(a) * dist + 'px');
          st.style.animationDelay = (k % 3) * 60 + 'ms'; box.appendChild(st);
        }
        var rk = document.createElement('div'); rk.innerHTML = ROCKET; box.appendChild(rk.firstChild);
        later(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
      }

      function finishClosed(animated) {
        closed = true; closing = false;
        var n = packedIds().length;
        Object.keys(trayEl).forEach(function (id) { trayEl[id].classList.add('away'); });
        $hint.textContent = n ? '行李箱關好了，準備出發！' : '輕輕的，什麼都不帶也很好。';
        $msg.textContent = n ? '帶了 ' + n + ' 樣東西' : '';
        later(function () { $btn.classList.add('show'); }, animated ? 250 : 0);
      }

      function closeCase(animated) {
        if (closed || closing) return;
        closing = true; $msg.textContent = '';
        var ids = packedIds();
        state.suitcase = { packed: ids, closed: true, at: Date.now() };
        try { ctx.save(); } catch (e) { }
        if (!animated) { $case.classList.add('closed'); drawLid(0, true); $slots.style.opacity = '0'; finishClosed(false); return; }
        var t0 = null, DUR = 520, hid = false;
        function step(ts) {
          if (t0 === null) t0 = ts;
          var t = Math.min(1, (ts - t0) / DUR), e = t * t * (1.6 - 0.6 * t);   // gravity: slow start, quick finish
          var phi = 100 * (1 - e);
          drawLid(phi, false);
          if (phi < 30 && !hid) { hid = true; $slots.style.opacity = '0'; }
          if (t < 1) { raf = requestAnimationFrame(step); return; }
          drawLid(0, true); $case.classList.add('closed'); $slots.style.opacity = '0';
          $case.classList.add('click'); $case.classList.add('bounce'); puff();
          later(function () { finishClosed(true); }, 330);
        }
        raf = requestAnimationFrame(step);
      }

      $btn.addEventListener('click', function () { if (closed) ctx.next(); });

      // ---- filter buttons (helmet is unlocked at 10) — top-right of the stage, above the scattered items
      var stack = null;
      if ((ctx.step && ctx.step.n || 11) >= 10 && DAYOF.FilterStack && DAYOF.FilterStack.mount) {
        try { stack = DAYOF.FilterStack.mount(stage, ctx, { labels: false }); } catch (e) { console.error(e); }
      }

      // ---- restore
      if (saved) {
        (saved.packed || []).forEach(function (id) { if (ART[id] && !(id in slotOf)) { var i = freeSlot(); slotOf[id] = i; addPacked(id, i); trayEl[id].classList.add('gone'); } });
        closing = false; $case.classList.add('closed'); drawLid(0, true); $slots.style.opacity = '0';
        finishClosed(false);
      }

      return function cleanup() {
        window.removeEventListener('resize', layout); if (dragging && dragging.cleanup) dragging.cleanup();
        if (stack && stack.destroy) stack.destroy();
        timers.forEach(clearTimeout);
        ghosts.forEach(function (g) { if (g.parentNode) g.parentNode.removeChild(g); });
        dragging = null; cancelAnimationFrame(raf);
        document.documentElement.style.overscrollBehavior = prevOB[0]; document.body.style.overscrollBehavior = prevOB[1];
      };
    }

  /* ======================================================================================================
   * Painted-scene mode (OFF by default). Turned on only when data/scenes/suitcase.json exists (or, for tests,
   * ?suitcaseCfg=<relative .json path>). Format: data/scenes/suitcase.schema.md. The 10 props are painted INTO the
   * background; invisible hit regions sit over them, a drag lifts a crop of the painting (and reveals the optional
   * 'empty' painting underneath), dropping into the suitcase zone packs it, tapping the zone closes the case.
   * ====================================================================================================== */
  var ALIAS = { familyphoto: 'photoframe' };
  function validRect(r) {
    return Array.isArray(r) && r.length === 4 && r.every(function (v) { return typeof v === 'number' && v >= 0 && v <= 1; }) && r[2] > r[0] && r[3] > r[1];
  }
  function normCfg(c) {
    if (!c || typeof c !== 'object' || c.enabled === false || typeof c.bg !== 'string' || !validRect(c.suitcase) || !c.items) return null;
    var items = {}, n = 0;
    Object.keys(c.items).forEach(function (k) { var id = ALIAS[k] || k; if (LABEL[id] && validRect(c.items[k])) { items[id] = c.items[k]; n++; } });
    if (!n) return null;
    var cut = {}; if (c.cutouts && typeof c.cutouts === 'object') Object.keys(c.cutouts).forEach(function (k) { var id = ALIAS[k] || k; if (items[id] && typeof c.cutouts[k] === 'string') cut[id] = c.cutouts[k]; });
    return { bg: c.bg, empty: typeof c.empty === 'string' ? c.empty : null, closed: typeof c.closed === 'string' ? c.closed : null, items: items, suitcase: c.suitcase, lid: validRect(c.lid) ? c.lid : null, cutouts: cut };
  }
  function loadSceneCfg() {
    if (!window.fetch) return Promise.resolve(null);
    var url = 'data/scenes/suitcase.json';
    try {
      var q = new URLSearchParams(location.search).get('suitcaseCfg');   // debug/test only: relative same-origin .json
      if (q && /^[\w\-./]+\.json$/.test(q) && q.indexOf('..') < 0 && q.charAt(0) !== '/') url = q;
    } catch (e) { }
    return fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) { return c && c.enabled === false ? null : normCfg(c); }, function () { return null; });
  }
  function loadImg(src) { return new Promise(function (res) { if (!src) return res(null); var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }

  function renderScene(container, ctx, cfg, bgImg) {
    var state = ctx.state;
    var saved = state.suitcase && state.suitcase.closed ? state.suitcase : null;
    var IW = bgImg.naturalWidth, IH = bgImg.naturalHeight;
    var ids = ITEMS.map(function (i) { return i.id; }).filter(function (id) { return cfg.items[id]; });
    var packed = {}, order = [];      // id -> true, packing order
    var closed = false, closing = false, zeroAsked = false, dragging = null;
    var timers = [], ghosts = [], raf = 0, geo = null;
    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
    function E(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

    var stage = E('div', 'sc-stage sc-scene', container);
    stage.innerHTML = DEFS + '<div class="scs-bg"></div><div class="scs-img"></div><div class="scs-layer"></div>' +
      '<div class="sc-head"><h2 class="sc-title">上太空的行李箱你要帶什麼去？</h2><p class="sc-hint">把想帶的東西拖進行李箱，<br>拖完點一下行李箱，把它關起來</p></div>' +
      '<div class="sc-under"><div class="sc-msg"></div><div class="sc-actions"><button class="btn sc-fallbackbtn" type="button">繼續看看</button></div></div>';
    var $bg = stage.querySelector('.scs-bg'), $layer = stage.querySelector('.scs-layer');
    var $hint = stage.querySelector('.sc-hint'), $msg = stage.querySelector('.sc-msg'), $btn = stage.querySelector('.sc-actions .btn'), $under = stage.querySelector('.sc-under');
    var $img = stage.querySelector('.scs-img');
    $bg.style.backgroundImage = 'url("' + (cfg.empty || cfg.bg) + '")';   // blurred backdrop fills the bands around the width-fit painting
    $img.style.backgroundImage = 'url("' + cfg.bg + '")';
    var emptyEl = {}, hitEl = {};
    ids.forEach(function (id) {
      if (cfg.empty) { var p = E('div', 'scs-empty', $layer); p.style.backgroundImage = 'url("' + cfg.empty + '")'; emptyEl[id] = p; }
      var h = E('div', 'scs-hit', $layer); h.setAttribute('data-id', id); h.setAttribute('role', 'button'); h.setAttribute('aria-label', LABEL[id]); hitEl[id] = h;
    });
    var $zone = E('div', 'scs-zone', $layer); $zone.setAttribute('role', 'button'); $zone.setAttribute('aria-label', '行李箱');
    var $closedImg = null; if (cfg.closed) { $closedImg = E('div', 'scs-closedimg', $layer); $closedImg.style.backgroundImage = 'url("' + cfg.closed + '")'; }
    var $packs = E('div', 'scs-packs', $zone);
    // when there is no painted 'closed' plate: the painted open lid is softened (blurred crop of the plate) while the SVG lid closes
    var $veil = E('div', 'scs-veil', $layer); $veil.style.backgroundImage = 'url("' + (cfg.empty || cfg.bg) + '")';
    var $lidZone = E('div', 'scs-zone scs-lidzone', $layer); if (!cfg.lid) $lidZone.style.display = 'none';   // open lid is tappable too
    var $lid = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); $lid.setAttribute('class', 'scs-lid'); $lid.setAttribute('viewBox', '0 0 260 200'); $lid.setAttribute('preserveAspectRatio', 'none'); $layer.appendChild($lid);
    var packEl = {};

    // ---- geometry: cover transform of the painting onto the stage
    function crop(el, r) {   // show painting region r (fractions) inside el, which is sized/positioned to r
      el.style.backgroundSize = geo.iw + 'px ' + geo.ih + 'px';
      el.style.backgroundPosition = (-r[0] * geo.iw) + 'px ' + (-r[1] * geo.ih) + 'px';
    }
    var MINHIT = 48;
    function padBox(b) { var w = Math.max(b.w, MINHIT), h = Math.max(b.h, MINHIT); return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w: w, h: h }; }
    function inB(x, y, b) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
    // overlapping props: the smallest box that CONTAINS the point wins, else the nearest centre among padded boxes
    function pick(x, y) {
      var best = null, bestA = 1e12, near = null, nearD = 1e12;
      ids.forEach(function (id) {
        if (packed[id]) return; var b = R(cfg.items[id]);
        if (inB(x, y, b)) { var a = b.w * b.h; if (a < bestA) { bestA = a; best = id; } }
        else if (inB(x, y, padBox(b))) { var d = Math.hypot(x - b.x - b.w / 2, y - b.y - b.h / 2); if (d < nearD) { nearD = d; near = id; } }
      });
      return best || near;
    }
    function R(r) { return { x: geo.ox + r[0] * geo.iw, y: geo.oy + r[1] * geo.ih, w: (r[2] - r[0]) * geo.iw, h: (r[3] - r[1]) * geo.ih }; }
    function place(el, b) { el.style.left = b.x + 'px'; el.style.top = b.y + 'px'; el.style.width = b.w + 'px'; el.style.height = b.h + 'px'; }
    function layout() {
      var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
      // WIDTH-FIT (every painted prop reachable): image width = stage width, vertically centred between the header and
      // the bottom restart-link strip; if that is too short, fit the height instead (bands left/right)
      var HEAD = 136, FOOT = 56, k = Math.min(W / IW, (H - HEAD - FOOT) / IH);
      geo = { k: k, iw: IW * k, ih: IH * k, W: W, H: H }; geo.ox = (W - geo.iw) / 2; geo.oy = HEAD + Math.max(0, (H - HEAD - FOOT - geo.ih) / 2);
      place($img, { x: geo.ox, y: geo.oy, w: geo.iw, h: geo.ih });
      ids.forEach(function (id) {
        var b = R(cfg.items[id]);
        if (emptyEl[id]) { place(emptyEl[id], b); crop(emptyEl[id], cfg.items[id]); }
        place(hitEl[id], padBox(b));   // marker only (pointer-events:none); touches are resolved by pick()
      });
      var z = R(cfg.suitcase); place($zone, z);
      if ($closedImg) { place($closedImg, z); crop($closedImg, cfg.suitcase); }
      // SVG lid fallback: map the lid art's body (viewBox x 6..254, y 86..194) onto the zone
      var lw = z.w * 260 / 248, lh = z.h * 200 / 108;
      place($lid, { x: z.x - 6 / 248 * z.w, y: z.y - 86 / 108 * z.h, w: lw, h: lh });
      order.forEach(function (id, i) { slotPlace(packEl[id], i); });
      if (cfg.lid) { var lb = R(cfg.lid); place($lidZone, lb); place($veil, lb); crop($veil, cfg.lid); }
      // message + 繼續看看 float over the empty wall in the upper part of the painting
      $under.style.bottom = 'auto'; $under.style.top = Math.max(HEAD + 4, geo.oy + geo.ih * 0.13) + 'px';
    }
    // packed minis: 5×2 grid over the lower part of the zone
    function slotPlace(el, i) {
      if (!el) return; var z = R(cfg.suitcase), id = el.getAttribute('data-id'), b = R(cfg.items[id]);
      // two loose rows on the case's open interior (upper ~60% of the body box), slightly overlapping like a real pile
      var cw = z.w / 5, chh = z.h * 0.3, s = Math.min(cw * 1.3 / b.w, chh * 1.25 / b.h, 1);
      var cx = (i % 5 + 0.5) * cw + (Math.floor(i / 5) ? cw * 0.25 : 0), cy = z.h * 0.16 + (Math.floor(i / 5) + 0.5) * chh;
      el.style.width = b.w + 'px'; el.style.height = b.h + 'px'; lifted(el, id);
      el.style.left = (cx - b.w / 2) + 'px'; el.style.top = (cy - b.h / 2) + 'px';
      el.style.transform = 'scale(' + s.toFixed(3) + ') rotate(' + ROT[i % ROT.length] + 'deg)';
    }
    function lifted(el, id) {
      if (cfg.cutouts[id]) { el.style.backgroundImage = 'url("' + cfg.cutouts[id] + '")'; el.style.backgroundSize = '100% 100%'; el.style.backgroundPosition = '0 0'; el.classList.add('cut'); }
      else { el.style.backgroundImage = 'url("' + cfg.bg + '")'; crop(el, cfg.items[id]); }
    }
    function setRemoved(id, on) { if (emptyEl[id]) emptyEl[id].classList.toggle('show', !!on); }
    function addPacked(id) {
      if (packed[id]) return; packed[id] = true; order.push(id);
      var el = E('div', 'scs-pack', $packs); el.setAttribute('data-id', id);
      packEl[id] = el; slotPlace(el, order.length - 1); setRemoved(id, true); hitEl[id].classList.add('gone');
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); startDrag(e, id, true, el); });
    }
    function removePacked(id) {
      if (!packed[id]) return; delete packed[id]; order.splice(order.indexOf(id), 1);
      var el = packEl[id]; if (el && el.parentNode) el.parentNode.removeChild(el); delete packEl[id];
      order.forEach(function (oid, i) { slotPlace(packEl[oid], i); });
      setRemoved(id, false); hitEl[id].classList.remove('gone');
    }

    // ---- drag (pointer events + capture; stale drags aborted; iOS scroll blocked below)
    var LIFT = 30, capture = null;
    function overZone(x, y) {
      return [$zone, cfg.lid ? $lidZone : null].some(function (el) { if (!el) return false; var r = el.getBoundingClientRect(), m = 12; return x >= r.left - m && x <= r.right + m && y >= r.top - m && y <= r.bottom + m; });
    }
    function ghostAt(g, x, y, s) { g.style.transform = 'translate(' + (x - g._w * s / 2) + 'px,' + (y - g._h * s / 2 - LIFT) + 'px) scale(' + s + ')'; }   // transform-origin 0 0
    function abortDrag() { var d = dragging; if (!d) return; dragging = null; $zone.classList.remove('over'); d.cleanup(); if (d.ghost && d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost); if (d.fromPacked) packEl[d.id] && (packEl[d.id].style.opacity = ''); else setRemoved(d.id, false); }
    function startDrag(e, id, fromPacked, src) {
      if (closed || closing) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (dragging) abortDrag();
      e.preventDefault();
      var d = dragging = { id: id, fromPacked: fromPacked, pid: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, done: false };
      try { src.setPointerCapture(e.pointerId); } catch (er) { }
      function mv(ev) {
        if (ev.pointerId !== d.pid || d.done) return;
        if (!d.moved) {
          if (Math.abs(ev.clientX - d.sx) + Math.abs(ev.clientY - d.sy) < 7) return;
          d.moved = true; if (capture) capture.blocked = true;
          var b = R(cfg.items[id]), g = E('div', 'scs-ghost', document.body); g._w = b.w; g._h = b.h;
          g.style.width = b.w + 'px'; g.style.height = b.h + 'px'; lifted(g, id);
          ghosts.push(g); d.ghost = g;
          if (fromPacked) packEl[id].style.opacity = '0'; else setRemoved(id, true);
        }
        ghostAt(d.ghost, ev.clientX, ev.clientY, 1.12);
        $zone.classList.toggle('over', overZone(ev.clientX, ev.clientY) || overZone(ev.clientX, ev.clientY - LIFT));
      }
      function up(ev) {
        if (ev.pointerId !== d.pid || d.done) return;
        d.done = true; d.cleanup(); dragging = null; $zone.classList.remove('over');
        if (!d.moved) { if (!fromPacked && hitEl[id]) { hitEl[id].classList.add('wiggle'); later(function () { hitEl[id].classList.remove('wiggle'); }, 500); } return; }
        var x = ev.clientX, y = ev.clientY, ok = ev.type !== 'pointercancel' && (overZone(x, y) || overZone(x, y - LIFT));
        var g = d.ghost; g.classList.add('anim');
        if (ok) {
          if (!fromPacked) { zeroAsked = false; addPacked(id); packEl[id].style.opacity = '0'; }
          var pr = packEl[id].getBoundingClientRect();
          var ps = Math.min(pr.width / g._w, pr.height / g._h); g.style.transform = 'translate(' + (pr.left + pr.width / 2 - g._w * ps / 2) + 'px,' + (pr.top + pr.height / 2 - g._h * ps / 2) + 'px) scale(' + ps.toFixed(3) + ')';
          later(function () { if (packEl[id]) packEl[id].style.opacity = ''; if (g.parentNode) g.parentNode.removeChild(g); }, 270);
        } else {
          var b = R(cfg.items[id]), sr = stage.getBoundingClientRect();
          if (fromPacked) removePacked(id); else setRemoved(id, true);
          g.style.transform = 'translate(' + (sr.left + b.x) + 'px,' + (sr.top + b.y) + 'px) scale(1)';
          later(function () { setRemoved(id, false); if (g.parentNode) g.parentNode.removeChild(g); }, 270);
        }
        $msg.textContent = '';
      }
      d.cleanup = function () {
        ['pointermove', 'pointerup', 'pointercancel'].forEach(function (t, i) { var f = i ? up : mv; src.removeEventListener(t, f); window.removeEventListener(t, f); });
        try { src.releasePointerCapture(d.pid); } catch (er) { }
      };
      ['pointermove', 'pointerup', 'pointercancel'].forEach(function (t, i) { var f = i ? up : mv; src.addEventListener(t, f); window.addEventListener(t, f); });
    }
    $layer.addEventListener('pointerdown', function (e) {
      if (closed || closing || (e.target.closest && e.target.closest('.scs-pack'))) return;   // packed minis handle themselves
      var sr = stage.getBoundingClientRect(), id = pick(e.clientX - sr.left, e.clientY - sr.top);
      if (!id) return;                                         // not on a prop → the suitcase zones get the event
      e.stopPropagation(); startDrag(e, id, false, $layer);
    }, true);
    $layer.addEventListener('touchstart', function (e) { if (e.cancelable) e.preventDefault(); }, { passive: false });
    $layer.addEventListener('dragstart', function (e) { e.preventDefault(); });
    $layer.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    function stopTouch(e) { if (e.cancelable) e.preventDefault(); }
    stage.addEventListener('touchmove', stopTouch, { passive: false });
    container.addEventListener('touchmove', stopTouch, { passive: false });
    container.style.touchAction = 'none';
    var prevOB = [document.documentElement.style.overscrollBehavior, document.body.style.overscrollBehavior];
    document.documentElement.style.overscrollBehavior = 'none'; document.body.style.overscrollBehavior = 'none';

    // ---- close (tap the zone)
    var lastPD = 0, lastTap = 0;
    [$zone, $lidZone].forEach(function ($z) {
    $z.addEventListener('pointerdown', function (e) { lastPD = Date.now(); capture = { x: e.clientX, y: e.clientY, t: Date.now(), blocked: false, pid: e.pointerId }; });
    $z.addEventListener('pointerup', function (e) {
      var c = capture; capture = null;
      if (!c || c.blocked || c.pid !== e.pointerId) return;
      if (Math.abs(e.clientX - c.x) + Math.abs(e.clientY - c.y) > 14 || Date.now() - c.t > 900) return;
      lastTap = Date.now(); onTap();
    });
    $z.addEventListener('pointercancel', function () { capture = null; });
    $z.addEventListener('click', function () { if (Date.now() - lastPD < 1500) return; if (Date.now() - lastTap > 700) { lastTap = Date.now(); onTap(); } });
    });
    function onTap() {
      if (closed || closing) return;
      if (!order.length && !zeroAsked) { zeroAsked = true; $msg.textContent = '什麼都不帶嗎？再點一次就關上囉'; return; }
      closeCase(true);
    }
    function finishClosed(animated) {
      closed = true; closing = false;
      ids.forEach(function (id) { hitEl[id].classList.add('away'); });
      $hint.textContent = order.length ? '行李箱關好了，準備出發！' : '輕輕的，什麼都不帶也很好。';
      $msg.textContent = order.length ? '帶了 ' + order.length + ' 樣東西' : '';
      later(function () { $btn.classList.add('show'); }, animated ? 250 : 0);
    }
    function drawLid(phi, fin) { $lid.innerHTML = lidSvg(phi, fin); }
    function closeCase(animated) {
      if (closed || closing) return;
      closing = true; $msg.textContent = '';
      state.suitcase = { packed: ITEMS.map(function (i) { return i.id; }).filter(function (id) { return packed[id]; }), closed: true, at: Date.now() };
      try { ctx.save(); } catch (e) { }
      $zone.classList.add('closing');
      if ($closedImg) {   // painted closed suitcase: cross-fade
        $closedImg.classList.add('show'); later(function () { $packs.style.opacity = '0'; }, animated ? 200 : 0);
        if (!animated) return finishClosed(false);
        later(function () { puffAt(); finishClosed(true); }, 520); return;
      }
      $lid.classList.add('show');
      if (!animated) { drawLid(0, true); $lid.style.opacity = '1'; if (cfg.lid) $veil.style.opacity = '1'; $packs.style.opacity = '0'; return finishClosed(false); }
      var t0 = null, DUR = 560;
      (function step(ts) {
        if (!ts) { raf = requestAnimationFrame(step); return; }
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / DUR), e = t * t * (1.6 - 0.6 * t), phi = 70 * (1 - e);
        $lid.style.opacity = Math.min(1, t * 3).toFixed(2); drawLid(phi, false); if (cfg.lid) $veil.style.opacity = Math.min(1, t * 1.6).toFixed(2);
        if (phi < 30) $packs.style.opacity = '0';
        if (t < 1) { raf = requestAnimationFrame(step); return; }
        drawLid(0, true); puffAt(); later(function () { finishClosed(true); }, 330);
      })();
    }
    function puffAt() {
      var box = E('div', 'sc-puff', stage), z = $zone.getBoundingClientRect(), s = stage.getBoundingClientRect();
      box.style.left = (z.left - s.left + z.width / 2) + 'px'; box.style.top = (z.top - s.top + z.height * 0.3) + 'px';
      for (var k = 0; k < 9; k++) {
        var w = document.createElement('div'); w.innerHTML = STAR; var st = w.firstChild, a = (-90 + (k - 4) * 22) * Math.PI / 180, dist = 70 + (k % 3) * 28;
        st.style.setProperty('--dx', Math.cos(a) * dist + 'px'); st.style.setProperty('--dy', Math.sin(a) * dist + 'px'); st.style.animationDelay = (k % 3) * 60 + 'ms'; box.appendChild(st);
      }
      var rk = document.createElement('div'); rk.innerHTML = ROCKET; box.appendChild(rk.firstChild);
      later(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
    }
    $btn.addEventListener('click', function () { if (closed) ctx.next(); });

    var stack = null;
    if (DAYOF.FilterStack && DAYOF.FilterStack.mount) { try { stack = DAYOF.FilterStack.mount(stage, ctx, { labels: false }); } catch (e) { console.error(e); } }

    window.addEventListener('resize', layout); layout(); later(layout, 60);
    if (saved) { (saved.packed || []).forEach(function (id) { if (cfg.items[id]) addPacked(id); }); closeCase(false); }
    requestAnimationFrame(function () { stage.classList.add('ready'); });

    return function cleanup() {
      window.removeEventListener('resize', layout); if (dragging && dragging.cleanup) dragging.cleanup();
      timers.forEach(clearTimeout); cancelAnimationFrame(raf);
      ghosts.forEach(function (g) { if (g.parentNode) g.parentNode.removeChild(g); });
      if (stack && stack.destroy) stack.destroy();
      document.documentElement.style.overscrollBehavior = prevOB[0]; document.body.style.overscrollBehavior = prevOB[1];
      if (stage.parentNode) stage.parentNode.removeChild(stage);
    };
  }

  // default = shipped scattered-SVG room; the painted-scene mode replaces it only if its config + painting load
  DAYOF.registerPage('suitcase', {
    render: function (container, ctx) {
      var cur = renderDefault(container, ctx), dead = false;
      loadSceneCfg().then(function (cfg) {
        if (dead || !cfg) return null;
        return loadImg(cfg.bg).then(function (im) {
          if (dead || !im || !im.naturalWidth) return;
          try { cur(); } catch (e) { }
          [].forEach.call(container.querySelectorAll('.sc-stage'), function (s) { s.parentNode.removeChild(s); });
          cur = renderScene(container, ctx, cfg, im);
        });
      }).catch(function (e) { console.error(e); });
      return function () { dead = true; if (cur) cur(); };
    }
  });
})();
