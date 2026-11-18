/* Scene: office (flow 23) — 「在一個很高的辦公樓裡，每一格裡面都有一個人。」 */
DAYOF.Where = DAYOF.Where || { _scenes: {} };
DAYOF.Where._scenes = DAYOF.Where._scenes || {};
DAYOF.Where._scenes['office'] = {
  W: 1600, H: 3200, bgColor: '#E9D9C4',
  build(S) {
    const W = S.W, H = S.H, rng = S.rng, pick = S.pick;
    const COLS = 8, ROWS = 18, CW = 150, CH = 150;
    const BX = (W - COLS * CW) / 2, BY = 330;           // building facade origin
    const BH = ROWS * CH, GROUND = BY + BH + 60;
    const bg = S.layer.bg, mid = S.layer.mid, fg = S.layer.fg, top = S.layer.top;

    // ---- dusk sky (banded watercolor washes) ----
    const sky = ['#F3DCC0', '#F0CDB0', '#E8BCA6', '#D9AFA6', '#C4A5A8'];
    sky.forEach((c, i) => S.rect(0, i * (GROUND / sky.length), W, GROUND / sky.length + 4, { fill: c, opacity: .95 }, bg));
    S.wash(300, 80, 700, 220, '#FBEBD0', .6, bg);
    S.wash(1000, 200, 500, 160, '#F6D8C0', .5, bg);
    S.circle(1330, 150, 70, { fill: '#FBE7C4', opacity: .8 }, bg);

    // ---- neighbouring buildings (soft, far) ----
    const far = ['#BFA9A6', '#B5A2A4', '#C7B0A4'];
    let x = -40;
    while (x < W) {
      const w = S.range(140, 260), h = S.range(700, 1900);
      S.rect(x, GROUND - h, w, h, { fill: pick(far), opacity: .55, filter: 'url(#wc)' }, bg);
      for (let k = 0; k < 14; k++) if (rng() < .35)
        S.rect(x + 14 + (k % 4) * (w / 4.4), GROUND - h + 40 + Math.floor(k / 4) * 90, 14, 20, { fill: '#F4D9A0', opacity: .45 }, bg);
      x += w + S.range(-20, 30);
    }

    // ---- main building ----
    S.rect(BX - 36, BY - 50, COLS * CW + 72, BH + 110, { fill: '#8E7B78', filter: 'url(#wc)', opacity: .95 }, mid);
    S.rect(BX - 20, BY - 30, COLS * CW + 40, BH + 90, { fill: '#A89288' }, mid);
    S.rect(BX - 50, BY - 62, COLS * CW + 100, 22, { fill: '#7A6A6A' }, mid);      // cornice
    S.rect(BX + COLS * CW / 2 - 6, BY - 150, 12, 90, { fill: '#6F6262' }, mid);   // antenna
    S.circle(BX + COLS * CW / 2, BY - 152, 7, { fill: '#D46A5A' }, mid);
    S.wash(BX, BY, COLS * CW, BH, '#F0C9A0', .12, mid);

    const kinds = (S.KINDS || []).filter(k => k !== S.KAI_KIND);
    const lamp = ['#FFE7B0', '#FFD9A0', '#FFF0C8', '#FBD6A8', '#F6E2B8', '#FFDFC0'];
    const deskC = ['#8B6B55', '#9A7A62', '#7C6A5A', '#A08568'];
    const things = ['monitor', 'phone', 'nap', 'stretch', 'water', 'stare', 'coffee', 'paper', 'monitor', 'monitor', 'phone', 'coffee'];
    const kaiC = 5, kaiR = 11;
    const flicker = [], blinds = [];

    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cx = BX + c * CW, cy = BY + r * CH;
      const wx = cx + 11, wy = cy + 10, ww = CW - 22, wh = CH - 22;
      const isKai = c === kaiC && r === kaiR;
      const g = S.el('g', {}, mid);
      const L = pick(lamp);
      S.rect(wx - 4, wy - 4, ww + 8, wh + 8, { fill: '#6E5F5C' }, g);                     // frame
      S.rect(wx, wy, ww, wh, { fill: L }, g);                                             // lit glass
      S.rect(wx, wy + wh * .55, ww, wh * .45, { fill: '#F2B98C', opacity: .25 }, g);      // warm glow low
      const lightOff = S.el('rect', { x: wx, y: wy, width: ww, height: wh, fill: '#5E5668', opacity: 0 }, g);
      // person
      const kind = kinds.length ? pick(kinds) : undefined;
      const act = isKai ? 'kai' : pick(things);
      const px = cx + CW / 2 + S.range(-18, 18), py = wy + wh - 12;
      const fl = rng() < .5;
      const opts = { x: px, y: py, s: .72, flip: fl, pose: 'sit', parent: g };
      if (act === 'phone') { opts.item = 'phone'; opts.pose = 'hold'; }
      if (act === 'stretch') opts.pose = 'wave';
      if (act === 'stare') opts.pose = 'stand';
      if (isKai) { opts.pose = 'hold'; opts.item = 'violin'; opts.flip = false; S.kai(opts); }
      else S.animal(Object.assign(opts, kind ? { kind } : {}));
      // desk + props in front (hides lower body)
      const dy = wy + wh - 26;
      if (act === 'nap') S.rect(wx + 14, dy - 12, ww - 28, 14, { fill: '#C9B8A6', opacity: .9 }, g);
      S.rect(wx, dy, ww, wh - (dy - wy), { fill: pick(deskC) }, g);
      S.rect(wx, dy, ww, 4, { fill: '#B59A7E' }, g);
      const side = fl ? 1 : -1;
      if (act === 'monitor' || act === 'paper' || isKai && false) {
        const mx = cx + CW / 2 + side * 38 - 14;
        S.rect(mx, dy - 30, 30, 22, { fill: '#4F5C66' }, g);
        S.rect(mx + 3, dy - 27, 24, 16, { fill: rng() < .5 ? '#BFE0E4' : '#E8E0B0' }, g);
        S.rect(mx + 12, dy - 8, 6, 8, { fill: '#4A4A4A' }, g);
      }
      if (act === 'paper') for (let k = 0; k < 3; k++)
        S.rect(cx + CW / 2 - side * 40 - 12, dy - 7 - k * 6, 26, 6, { fill: pick(['#F5EEDD', '#EADFC8', '#F8F2E6']), stroke: '#B8A890', 'stroke-width': .8 }, g);
      if (act === 'coffee' || rng() < .25) {
        const kx = cx + CW / 2 - side * 44;
        S.rect(kx, dy - 12, 10, 12, { fill: '#F4F0E8' }, g);
        S.path(`M${kx + 10} ${dy - 9} q6 2 0 7`, { fill: 'none', stroke: '#F4F0E8', 'stroke-width': 1.6 }, g);
      }
      if (act === 'water' || (act !== 'nap' && rng() < .3)) {
        const gx = wx + (rng() < .5 ? 8 : ww - 22);
        S.rect(gx + 2, dy - 12, 12, 12, { fill: '#B5745A' }, g);
        for (let k = 0; k < 3; k++) S.circle(gx + 8 + (k - 1) * 6, dy - 18 - (k === 1 ? 4 : 0), 6, { fill: pick(['#7FA27A', '#8FB58A', '#6E9570']) }, g);
      }
      if (rng() < .3) { // desk lamp
        const lx = wx + 14;
        S.path(`M${lx} ${dy} v-16 l10 -8`, { fill: 'none', stroke: '#5E4F4A', 'stroke-width': 2 }, g);
        S.circle(lx + 11, dy - 25, 5, { fill: pick(['#F2B84B', '#E58F6B', '#9ACB9A']) }, g);
      }
      // blinds
      const bl = S.rect(wx, wy, ww, [0, 0, 8, 22, 36, 14][Math.floor(rng() * 6)], { fill: '#D8C6AE', opacity: .95 }, g);
      if (rng() < .08 || (c === 2 && r === 7)) blinds.push({ el: bl, base: parseFloat(bl.getAttribute('height')), ph: rng() * 6, max: wh * .55 });
      if (rng() < .05 || (isKai === false && flicker.length < 6 && rng() < .03)) flicker.push({ el: lightOff, ph: rng() * 20, per: S.range(6, 14) });
      if (act === 'stare' || isKai) S.rect(wx, wy + wh * .35, ww, 3, { fill: '#fff', opacity: .12 }, g); // glass shine
      S.rect(wx, wy, ww, wh, { fill: 'none', stroke: '#6E5F5C', 'stroke-width': 1.2, opacity: .5 }, g);
      S.rect(wx + ww / 2 - 1, wy, 2, wh, { fill: '#6E5F5C', opacity: .35 }, g);
      // watercolor edge wobble over window
      if (r % 3 === 0) S.rect(wx - 4, wy + wh + 4, ww + 8, 6, { fill: '#7A6A6A', opacity: .3 }, g);
    }
    // floor slab lines
    for (let r = 1; r < ROWS; r++) S.rect(BX - 20, BY + r * CH - 5, COLS * CW + 40, 3, { fill: '#8B7970', opacity: .5 }, mid);

    // ground, entrance, trees
    S.rect(0, GROUND, W, H - GROUND, { fill: '#B7A08C' }, bg);
    S.wash(0, GROUND, W, 100, '#8C7868', .35, bg);
    S.rect(BX + COLS * CW / 2 - 70, GROUND - 100, 140, 100, { fill: '#5E5058' }, fg);
    S.rect(BX + COLS * CW / 2 - 56, GROUND - 90, 112, 90, { fill: '#F2D49A', opacity: .8 }, fg);
    [[160, 1], [W - 170, -1], [370, .7], [W - 380, .7]].forEach(([tx, k]) => {
      S.rect(tx - 5, GROUND - 120 * Math.abs(k), 10, 120 * Math.abs(k), { fill: '#6B5A4C' }, fg);
      S.circle(tx, GROUND - 150 * Math.abs(k), 70 * Math.abs(k), { fill: '#8AA27E', opacity: .85, filter: 'url(#wc)' }, fg);
    });
    S.wash(0, H - 300, W, 300, '#9A8576', .3, fg);

    // birds
    const birds = [];
    for (let i = 0; i < 5; i++) {
      const b = S.path('M-10 0 q5 -8 10 0 q5 -8 10 0', { fill: 'none', stroke: '#6A5A5E', 'stroke-width': 2, 'stroke-linecap': 'round' }, top);
      birds.push({ el: b, x0: S.range(100, W - 100), y0: S.range(40, 280), sp: S.range(8, 20), ph: rng() * 6 });
    }
    // light veil on top for dusk feel
    S.rect(0, 0, W, H, { fill: '#C98F8A', opacity: .07 }, top);

    S.anim((t) => {
      for (const f of flicker) {
        const v = ((t + f.ph) % f.per) / f.per;
        f.el.setAttribute('opacity', v > .86 && v < .94 ? .85 : 0);
      }
      for (const b of blinds) {
        const h = b.base + (Math.sin(t * .35 + b.ph) * .5 + .5) * b.max;
        b.el.setAttribute('height', h.toFixed(1));
      }
      for (const b of birds) {
        const xx = ((b.x0 + t * b.sp) % (W + 200)) - 100;
        b.el.setAttribute('transform', `translate(${xx.toFixed(1)} ${(b.y0 + Math.sin(t + b.ph) * 8).toFixed(1)}) scale(1 ${(0.7 + .5 * Math.sin(t * 5 + b.ph)).toFixed(2)})`);
      }
    });
  }
};
