/* credits.js — step 33: curtains close from left/right, then credit cards roll up; Kai+姊姊 wander in front. */
window.DAYOF = window.DAYOF || {}; DAYOF._pages = DAYOF._pages || {};
DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };
(function () {
  // kai-sister.png is drawn walking LEFT (Kai's snout/flag on the left). It may only ever MOVE in the way it faces.
  var NATURAL_FACING = 'left';
  var IMG = 'assets/kai-sister.png';

  var FALLBACK = [
    { section: '工作人員', items: [
      { role: '主唱', name: 'Kai' }, { role: '吉他手', name: '蘭多' },
      { role: '視覺設計', name: '聖壹' }, { role: '程式設計', name: 'Kai' } ] },
    { section: '感謝名單', items: [
      { role: '寫詞顧問', name: 'Emma' }, { role: '甜點大師', name: 'Lynn @失眠動物園' } ] },
    { section: '', note: '謝謝你，今天來看看', items: [] }
  ];

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  // ---- shared walker engine (also copied in egg.js; kept self-contained on purpose) ----
  // facing sign: +1 = scaleX(1) shows natural facing; movement direction dir (-1 left, +1 right).
  function sxFor(dir) { return ((NATURAL_FACING === 'left') === (dir < 0)) ? 1 : -1; }

  function makeWalker(parent, opts) {
    var wrap = el('div', 'fn-walker'), bob = el('div', 'fn-bob'), img = new Image();
    img.src = IMG; img.alt = '凱凱和姊姊'; img.draggable = false;
    var sh = el('div', 'fn-shadow');
    bob.appendChild(sh); bob.appendChild(img); wrap.appendChild(bob); parent.appendChild(wrap);
    var w = {
      el: wrap, img: img, x: 0, y: 0, dir: opts.dir || 1, sx: sxFor(opts.dir || 1), vx: 0,
      mode: 'idle', t: 0, spin: 0, hop: 0, squash: null, width: 100, height: 100
    };
    w.size = function (h) { wrap.style.setProperty('--fn-h', h + 'px'); w.height = h; w.width = h * (img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.21); };
    img.addEventListener('load', function () { w.size(w.height); });
    return w;
  }

  function mount(container, ctx) {
    var cleaned = false, rafId = 0, timers = [], finished = false;
    var page = container;
    page.classList.add('page-credits');
    var stage = el('div', 'cr-stage');
    var curL = el('div', 'cr-curtain l'), curR = el('div', 'cr-curtain r'), valance = el('div', 'cr-valance');
    var rollwrap = el('div', 'cr-rollwrap'), roll = el('div', 'cr-roll');
    var zone = el('div', 'cr-walkzone');
    var skip = el('a', 'cr-skip', '略過'); skip.href = '#'; skip.setAttribute('role', 'button');
    rollwrap.appendChild(roll); roll.style.visibility = 'hidden';
    stage.appendChild(curL); stage.appendChild(curR); stage.appendChild(valance);
    stage.appendChild(rollwrap); stage.appendChild(zone);
    page.appendChild(stage); page.appendChild(skip);

    function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }

    // ---- credits data ----
    var data = FALLBACK;
    function buildCards(list) {
      roll.innerHTML = '';
      list.forEach(function (sec) {
        var card = el('section', 'cr-card');
        if (sec.section) card.appendChild(el('h2', null, sec.section));
        (sec.items || []).forEach(function (it) {
          var line = el('div', 'cr-line');
          line.appendChild(el('span', 'cr-role', it.role || ''));
          line.appendChild(el('span', 'cr-name', it.name || ''));
          card.appendChild(line);
        });
        if (sec.note) card.appendChild(el('div', 'cr-note', sec.note));
        roll.appendChild(card);
      });
    }
    buildCards(FALLBACK);
    try {
      fetch('data/credits.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        var list = j && (Array.isArray(j) ? j : j.sections);
        if (list && list.length && !cleaned && !rollStarted) { data = list; buildCards(list); }
      }).catch(function () {});
    } catch (e) {}

    // ---- walker ----
    var W = 390, H = 844, walker = makeWalker(zone, { dir: -1 });
    walker.size(100);
    function measure() {
      W = page.clientWidth || 390; H = page.clientHeight || 844;
      var zh = zone.clientHeight || 160;
      walker.size(Math.max(70, Math.min(150, zh - 40, H * .18)));
      zone.style.setProperty('--cr-zone', '26%');
    }
    measure();
    var onResize = function () { measure(); };
    window.addEventListener('resize', onResize);
    walker.x = W * 0.62; walker.dir = -1; walker.sx = sxFor(-1);
    var nextAct = 1.2;

    function applyWalker() {
      var gy = zone.clientHeight - walker.height - 6; if (gy < 0) gy = 0;
      var bobY = walker.mode === 'walk' || walker.mode === 'hopwalk' ? Math.abs(Math.sin(walker.t * 11)) * -5 : 0;
      var tilt = walker.mode === 'walk' || walker.mode === 'hopwalk' ? Math.sin(walker.t * 11) * 2.2 : 0;
      walker.el.style.transform = 'translate3d(' + walker.x.toFixed(1) + 'px,' + (gy + walker.y + bobY).toFixed(1) + 'px,0)';
      walker.img.style.transform = 'scaleX(' + walker.sx.toFixed(3) + ') rotate(' + (walker.spin + tilt * walker.sx).toFixed(1) + 'deg)';
    }

    // The ONLY place where the horizontal velocity is set: always equals dir * speed and sx always == sxFor(dir) outside a turn squash.
    function startTurn() {
      walker.mode = 'turn'; walker.vx = 0; walker.spin = 0; walker.y = 0; walker.squash = { t: 0, dur: 0.32, to: -walker.dir };
    }
    function chooseAction() {
      var r = Math.random();
      if (r < 0.34) { walker.mode = 'walk'; nextAct = 1.6 + Math.random() * 2.2; }
      else if (r < 0.58) { walker.mode = 'hopwalk'; walker.hop = 0; nextAct = 1.5; }
      else if (r < 0.78) { walker.mode = 'spin'; walker.spin = 0; walker.vx = 0; nextAct = 1.2; walker.spinT = 0; }
      else if (r < 0.9) { walker.mode = 'jump'; walker.hop = 0; walker.vx = 0; nextAct = 1.0; }
      else { startTurn(); nextAct = 2; }
    }
    walker.mode = 'walk';
    var last = 0, speed = 64, elapsed = 0;

    function step(now) {
      if (cleaned) return;
      rafId = requestAnimationFrame(step);
      var dt = last ? Math.min(0.06, (now - last) / 1000) : 0.016; last = now; elapsed += dt;
      walker.t += dt; nextAct -= dt;
      var minX = 8, maxX = Math.max(minX + 10, W - walker.width - 8);
      var m = walker.mode;
      if (m === 'turn') {
        var s = walker.squash; s.t += dt; var p = Math.min(1, s.t / s.dur);
        // squash through 0 then out the other side; direction changes at the midpoint while velocity is 0
        var cur = sxFor(walker.dir), nxt = sxFor(s.to);
        walker.sx = p < .5 ? cur * (1 - p * 2) : nxt * ((p - .5) * 2);
        if (p >= .5 && walker.dir !== s.to) walker.dir = s.to;
        if (p >= 1) { walker.sx = sxFor(walker.dir); walker.squash = null; walker.mode = 'walk'; nextAct = 1.2 + Math.random() * 1.5; }
        walker.vx = 0;
      } else {
        walker.sx = sxFor(walker.dir);
        if (m === 'walk') { walker.vx = walker.dir * speed; }
        else if (m === 'hopwalk') { walker.vx = walker.dir * speed * 0.9; walker.hop += dt; walker.y = -Math.abs(Math.sin(walker.hop * 7)) * 34; }
        else if (m === 'jump') { walker.vx = 0; walker.hop += dt; walker.y = -Math.abs(Math.sin(walker.hop * Math.PI / 0.9)) * 70; }
        else if (m === 'spin') {
          walker.vx = 0; walker.spinT += dt; var q = Math.min(1, walker.spinT / 0.95);
          var e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
          walker.spin = 360 * e * walker.dir * -1; walker.y = -Math.sin(q * Math.PI) * 38;
          if (q >= 1) { walker.spin = 0; walker.y = 0; walker.mode = 'walk'; nextAct = 1.4; }
        }
        walker.x += walker.vx * dt;
        if ((walker.dir < 0 && walker.x <= minX) || (walker.dir > 0 && walker.x >= maxX)) {
          walker.x = Math.max(minX, Math.min(maxX, walker.x)); walker.y = 0;
          startTurn();
        } else if (m === 'jump' && walker.hop >= 0.9) {
          walker.y = 0; walker.mode = 'walk'; nextAct = 1.0;
        } else if (nextAct <= 0 && (m === 'walk' || m === 'hopwalk')) {
          walker.y = 0; chooseAction();
        }
      }
      // debug exposure for tests
      DAYOF._finale = DAYOF._finale || {}; DAYOF._finale.walker = { vx: walker.vx, sx: walker.sx, dir: walker.dir, mode: walker.mode, x: walker.x };
      applyWalker();
      if (rollStarted && !finished) stepRoll(dt);
    }

    // ---- roll ----
    var rollStarted = false, rollY = 0, rollEnd = 0, rollSpeed = 46;
    function startRoll() {
      rollStarted = true;
      var vh = rollwrap.clientHeight;
      roll.style.visibility = 'visible'; rollY = vh;                      // first card enters from the bottom of the roll area
      rollEnd = -roll.offsetHeight + 40; // last card has fully gone
      roll.style.transform = 'translate3d(0,' + rollY + 'px,0)';
    }
    function stepRoll(dt) {
      rollY -= rollSpeed * dt;
      roll.style.transform = 'translate3d(0,' + rollY.toFixed(1) + 'px,0)';
      if (rollY <= rollEnd - 20) finish();
    }
    function finish() {
      if (finished) return; finished = true;
      page.classList.add('cr-out');
      later(function () { if (!cleaned) ctx.next(); }, 950);
    }
    skip.addEventListener('click', function (e) { e.preventDefault(); finish(); });

    // ---- curtain sequence ----
    walker.el.style.opacity = '0';
    later(function () { stage.classList.add('cr-closing'); page.classList.add('cr-closed'); }, 250);
    later(function () { if (!cleaned) { walker.el.style.transition = 'opacity .8s'; walker.el.style.opacity = '1'; startRoll(); } }, 250 + 2600 + 350);
    // walker tick runs immediately so it is positioned; hidden until curtain closed
    rafId = requestAnimationFrame(step);

    DAYOF._finale = DAYOF._finale || {};
    DAYOF._finale.credits = { sxFor: sxFor, NATURAL_FACING: NATURAL_FACING };

    return function cleanup() {
      cleaned = true; cancelAnimationFrame(rafId); timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
      page.classList.remove('page-credits', 'cr-out', 'cr-closed');
    };
  }

  DAYOF.registerPage('credits', { render: mount });
})();
