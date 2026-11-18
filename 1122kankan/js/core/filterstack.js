/* filterstack.js — round filter buttons stacked top-right (owner A).
 * DAYOF.FilterStack.mount(container, ctx, opts?) → { el, destroy }
 *   opts.labels  true → show the text label under each icon (default: icon-only, v=261116x)
 *   opts.layout  'row' → one horizontal row anchored top-right (default: vertical column)
 *   opts.top     number(px) | css length → override the top offset
 *   opts.className extra class on the wrapper;  opts.extra [nodes] appended under the filters
 *   opts.inline true (or className 'eg-fs') → plain non-collapsible list for a host that positions it (step 34 fold):
 *                 no NEW dots, no bubbles, no state writes.
 *   opts.collapsible true → (v=261118, lyrics pages) ONE round toggle top-right whose icon = newest unlocked filter;
 *                 tap → the filter buttons list downward, tap again / tap outside / pick a filter → collapse.
 *                 On the visit where a filter first unlocks: toggle bounces in + glow ring + NEW dot + speech bubble
 *                 (step 10 = longer explanatory text); the new one is marked NEW inside the list. state.filterHi (saved)
 *                 makes it one-time. Without collapsible the old flat column is used (step 34 ⋯ fold), API unchanged. */
window.DAYOF = window.DAYOF || {};
(function () {
  var CSS = [
    /* v=261116x: icon-only, 56px, muted low-saturation tints (cream / wood / sky palette), no frosted white */
    ':where(.filter-stack){position:absolute;top:calc(env(safe-area-inset-top,0px) + 10px);right:10px;z-index:50;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none}',
    ':where(.filter-stack.fs-row){flex-direction:row;align-items:flex-start;gap:8px}',
    ':where(.filter-stack) > *{pointer-events:auto}',
    ':where(.filter-stack .fs-item){display:flex;flex-direction:column;align-items:center;gap:2px}',
    ':where(.filter-stack .round-btn){position:relative;width:56px;height:56px;border-radius:50%;border:1px solid rgba(74,60,48,.14);background:#E6DACA;color:var(--ink,#4A3C30);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 2px 8px rgba(74,60,48,.16);-webkit-tap-highlight-color:transparent;font:600 12px/1 var(--font,system-ui)}',
    ':where(.filter-stack .round-btn:active){transform:scale(.94)}',
    ':where(.filter-stack .round-btn svg){width:32px;height:32px;display:block}',
    ':where(.filter-stack .round-btn .ico){display:flex;align-items:center;justify-content:center;width:32px;height:32px}',
    /* per-filter muted tints (overridable from css/*.css) */
    '.filter-stack .filter-helmet{background:#D6DEE3;color:#4C6273}',
    '.filter-stack .filter-rain{background:#D3DBDD;color:#4F6A75}',
    '.filter-stack .filter-sun{background:#EADFC6;color:#7E6236}',
    '.filter-stack .filter-fish{background:#DCE0D0;color:#5B6B4C}',
    '.filter-stack .filter-home{background:#E8D9C8;color:#7A5A40}',
    ':where(.filter-stack .fs-label){font:600 10px/1.2 var(--font,system-ui);color:var(--ink,#4A3C30);background:rgba(251,247,239,.8);padding:1px 6px;border-radius:8px;white-space:nowrap}',
    /* new-filter pulse (subtle): until the user taps that filter once (state.filterSeen[id]) */
    '.filter-stack .round-btn.is-new{animation:fsPulse 2.2s ease-in-out infinite}',
    '.filter-stack .round-btn.is-new::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(201,162,122,.75);animation:fsRing 2.2s ease-out infinite;pointer-events:none}',
    '.filter-stack .round-btn.is-new::before{content:"NEW";position:absolute;top:-3px;right:-5px;z-index:1;padding:2px 5px;border-radius:999px;background:#C65D4C;color:#fff;font:700 9px/1 var(--font,system-ui);letter-spacing:.04em;box-shadow:0 1px 3px rgba(74,60,48,.3);pointer-events:none}',
    '.filter-stack .round-btn.is-new{box-shadow:0 0 0 3px rgba(242,198,109,.55),0 2px 10px rgba(201,162,122,.55)}',
    '@keyframes fsPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
    '@keyframes fsRing{0%{opacity:.8;transform:scale(.95)}100%{opacity:0;transform:scale(1.3)}}',
    '@media (prefers-reduced-motion:reduce){.filter-stack .round-btn.is-new,.filter-stack .round-btn.is-new::after{animation-duration:4s}}',
    ':where(.filter-stack .fs-extra){margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:10px}',
    /* v=261118 (Kai): collapsible stack — one toggle, list drops down below it */
    '.filter-stack.fs-collapsible .fs-list{display:flex;flex-direction:column;align-items:center;gap:10px;transition:opacity .2s ease,transform .2s ease,visibility 0s linear 0s}',
    '.filter-stack.fs-collapsible:not(.fs-open) .fs-list{opacity:0;transform:translateY(-12px) scale(.94);visibility:hidden;pointer-events:none;transition:opacity .2s ease,transform .2s ease,visibility 0s linear .2s}',
    '.filter-stack.fs-collapsible:not(.fs-open) .fs-list *{pointer-events:none}',
    '.filter-stack .fs-toggle{background:#EADFCC;color:var(--ink,#4A3C30)}',
    '.filter-stack.fs-open .fs-toggle{box-shadow:0 0 0 3px rgba(138,101,69,.28),0 2px 8px rgba(74,60,48,.16)}',
    '.filter-stack .fs-toggle .fs-chev{position:absolute;left:50%;bottom:-2px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:#FBF7EF;box-shadow:0 1px 3px rgba(74,60,48,.25);display:flex;align-items:center;justify-content:center;transition:transform .2s}',
    '.filter-stack .fs-toggle .fs-chev svg{width:10px;height:10px}',
    '.filter-stack.fs-open .fs-toggle .fs-chev{transform:rotate(180deg)}',
    '.filter-stack .fs-toggle.fs-bounce{animation:fsBounceIn .75s cubic-bezier(.3,1.6,.5,1) both}',
    /* in the collapsible stack the button itself stays still (tappable/stable); the glow ring + NEW dot carry the alert */
    '.filter-stack.fs-collapsible .round-btn.is-new:not(.fs-bounce){animation:none}',
    '@keyframes fsBounceIn{0%{transform:scale(.3);opacity:0}55%{transform:scale(1.18);opacity:1}80%{transform:scale(.94)}100%{transform:scale(1)}}',
    /* speech bubble beside the toggle; never intercepts taps/scroll */
    '.fs-tip{position:absolute;z-index:51;box-sizing:border-box;max-width:min(240px,calc(100vw - 110px));padding:10px 14px;border-radius:16px;background:rgba(74,60,48,.94);color:#fff;font:500 14px/1.45 var(--font,system-ui);box-shadow:0 6px 18px rgba(74,60,48,.28);pointer-events:none;opacity:0;transform:translateX(-8px);transition:opacity .3s,transform .3s}',
    '.fs-tip.show{opacity:1;transform:translateX(0)}',
    '.fs-tip b{display:block;font-weight:700;color:var(--sun,#F2C66D);margin-bottom:2px}',
    '.fs-tip::after{content:"";position:absolute;right:-9px;top:var(--fs-tip-arrow,22px);margin-top:-9px;border:9px solid transparent;border-right:0;border-left-color:rgba(74,60,48,.94)}',
    '.fs-tip .fs-tip-arrow{display:inline-block;margin-left:4px;animation:fsNudge 1s ease-in-out infinite}',
    '@keyframes fsNudge{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}',
    '.fs-tip.fs-tip-eyes{max-width:none;padding:5px 10px;border-radius:999px;background:rgba(251,247,239,.96);color:inherit;border:1.5px solid var(--wood,#C9A27A);box-shadow:0 3px 12px rgba(74,60,48,.18);font:22px/1.1 system-ui,"Apple Color Emoji","Noto Color Emoji",sans-serif}',
    '.fs-tip.fs-tip-eyes::after{border-left-color:var(--wood,#C9A27A)}',
    '.fs-tip-eyes .fs-eyes{display:inline-block;animation:fsNudge 1s ease-in-out infinite}',
    '@media (prefers-reduced-motion:reduce){.filter-stack .fs-toggle.fs-bounce{animation:none}.fs-tip .fs-tip-arrow{animation:none}}'
  ].join('\n');
  function injectCss() {
    if (document.getElementById('filterstack-css')) return;
    var s = document.createElement('style'); s.id = 'filterstack-css'; s.textContent = CSS;
    document.head.insertBefore(s, document.head.firstChild); // first, so css/*.css overrides
  }

  function iconEl(name, label) {
    if (DAYOF.icon && DAYOF.icons && DAYOF.icons[name]) {
      try { return DAYOF.icon(name, 'fs-ico'); } catch (e) {}
    }
    var sp = document.createElement('span'); sp.className = 'ico fs-ico fs-text'; sp.textContent = label; return sp;
  }

  var CHEV = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5l3 3 3-3"/></svg>';

  /* speech bubble to the left of `btn` (inside `container`). Returns { hide, destroy }. */
  function tipBubble(container, btn, title, text, ms) {
    var tip = document.createElement('div'); tip.className = 'fs-tip'; tip.setAttribute('role', 'status');
    var b = document.createElement('b'); b.textContent = title;
    var t = document.createElement('span'); t.textContent = text;
    var ar = document.createElement('span'); ar.className = 'fs-tip-arrow'; ar.setAttribute('aria-hidden', 'true'); ar.textContent = '→';
    // v=261116aa (Kai): bubble is just 📷 — soft, short; full text kept for screen readers
    tip.setAttribute('aria-label', title + ' ' + text); tip.classList.add('fs-tip-eyes');
    var eyes = document.createElement('span'); eyes.className = 'fs-eyes'; eyes.setAttribute('aria-hidden', 'true'); eyes.textContent = '📷';
    tip.appendChild(eyes); container.appendChild(tip);
    var gone = false, timers = [], raf = 0;
    function place() {
      if (gone) return;
      var cr = container.getBoundingClientRect(), br = btn.getBoundingClientRect(); if (!br.width) return;
      tip.style.right = Math.round(cr.right - br.left + 12) + 'px';
      var top = Math.max(6, Math.round(br.top - cr.top + br.height / 2 - 24));
      tip.style.top = top + 'px';
      tip.style.setProperty('--fs-tip-arrow', Math.round(br.top - cr.top + br.height / 2 - top) + 'px');
    }
    function hide() {
      if (gone) return; gone = true; tip.classList.remove('show'); window.removeEventListener('resize', place);
      timers.push(setTimeout(function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 350));
    }
    raf = requestAnimationFrame(function () { place(); tip.classList.add('show'); });
    timers.push(setTimeout(hide, ms || 6000));
    window.addEventListener('resize', place);
    return { hide: hide, destroy: function () { hide(); cancelAnimationFrame(raf); timers.forEach(clearTimeout); if (tip.parentNode) tip.parentNode.removeChild(tip); } };
  }

  DAYOF.FilterStack = {
    mount: function (container, ctx, opts) {
      opts = opts || {};
      injectCss();
      var inline = opts.inline === true || / ?eg-fs\b/.test(' ' + (opts.className || ''));   // step 34 ⋯ fold: plain list, never alerts
      var coll = opts.collapsible === true && !inline;
      var wrap = document.createElement('div');
      wrap.className = 'filter-stack' + (inline ? ' fs-inline' : '') + (coll ? ' fs-collapsible' : '') + (opts.layout === 'row' && !coll ? ' fs-row' : '') + (opts.className ? ' ' + opts.className : '');
      if (opts.top != null) wrap.style.top = typeof opts.top === 'number' ? opts.top + 'px' : opts.top;
      var busy = false, st = ctx && ctx.state;
      var ids = (ctx && ctx.filtersAvailable) ? ctx.filtersAvailable() : [];
      var byId = {};
      (DAYOF.FILTERS || []).forEach(function (f) { byId[f.id] = f; });
      // filters appearing for the first time on this visit (never alerted, never tapped)
      var fresh = st && !inline ? ids.filter(function (id) { return !(st.filterSeen && st.filterSeen[id]) && !(st.filterHi && st.filterHi[id]); }) : [];
      var list = wrap, toggle = null, tip = null, open = false;
      function setOpen(on) {
        if (!toggle) return; open = !!on;
        wrap.classList.toggle('fs-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? '收起濾鏡' : '濾鏡（' + ids.length + '）');
      }
      function onDocDown(ev) { if (open && !wrap.contains(ev.target)) setOpen(false); }
      if (coll && ids.length) {
        var newest = byId[ids[ids.length - 1]] || { id: ids[ids.length - 1], icon: ids[ids.length - 1], label: ids[ids.length - 1] };
        var ti = document.createElement('div'); ti.className = 'fs-item';
        toggle = document.createElement('button'); toggle.type = 'button';
        toggle.className = 'round-btn fs-toggle';
        toggle.dataset.newest = newest.id;
        toggle.appendChild(iconEl(newest.icon, newest.label));
        var ch = document.createElement('span'); ch.className = 'fs-chev'; ch.setAttribute('aria-hidden', 'true'); ch.innerHTML = CHEV; toggle.appendChild(ch);
        toggle.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          toggle.classList.remove('is-new', 'fs-bounce'); if (tip) { tip.hide(); }
          setOpen(!open);
        });
        ti.appendChild(toggle); wrap.appendChild(ti);
        list = document.createElement('div'); list.className = 'fs-list'; wrap.appendChild(list);
        document.addEventListener('pointerdown', onDocDown, true);
        setOpen(false);
      }
      ids.forEach(function (id) {
        var f = byId[id] || { id: id, icon: id, label: id };
        var item = document.createElement('div'); item.className = 'fs-item';
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'round-btn filter-btn filter-' + f.id;
        b.setAttribute('aria-label', f.label + '濾鏡'); b.title = f.label;
        b.dataset.filter = f.id;
        b.appendChild(iconEl(f.icon, f.label));
        if (fresh.indexOf(id) >= 0) b.classList.add('is-new');
        b.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (st && b.classList.contains('is-new')) {
            b.classList.remove('is-new');
            st.filterSeen = st.filterSeen || {}; st.filterSeen[f.id] = true;
            try { ctx.save(); } catch (e) {}
          }
          if (toggle) { toggle.classList.remove('is-new', 'fs-bounce'); if (tip) tip.hide(); setOpen(false); }
          if (busy) return; busy = true;
          var p;
          try { p = ctx.openFilter(f.id); } catch (e) { p = null; }
          Promise.resolve(p).then(function () { busy = false; }, function () { busy = false; });
        });
        item.appendChild(b);
        if (opts.labels === true) {
          var l = document.createElement('span'); l.className = 'fs-label'; l.textContent = f.label; item.appendChild(l);
        }
        list.appendChild(item);
      });
      if (opts.extra && opts.extra.length) {
        var ex = document.createElement('div'); ex.className = 'fs-extra';
        opts.extra.forEach(function (n) { if (n) ex.appendChild(n); });
        wrap.appendChild(ex);
      }
      container.appendChild(wrap);
      // one-time alert for newly unlocked filters (collapsible stack only)
      if (toggle && fresh.length) {
        st.filterHi = st.filterHi || {}; fresh.forEach(function (id) { st.filterHi[id] = true; });
        try { ctx.save(); } catch (e) {}
        toggle.classList.add('is-new', 'fs-bounce');
        var nf = byId[fresh[fresh.length - 1]] || { label: fresh[fresh.length - 1] };
        var firstId = ((DAYOF.FILTERS || [])[0] || {}).id;
        var names = fresh.map(function (x) { return (byId[x] || { label: x }).label; }).join('、');
        var isFirst = fresh.indexOf(firstId) >= 0 && !(st.filterTipShown && st.filterTipShown[firstId]);
        if (isFirst) { st.filterTipShown = st.filterTipShown || {}; st.filterTipShown[firstId] = true; }
        try {
          tip = isFirst ? tipBubble(container, toggle, '新濾鏡解鎖：' + names, '點右上角的按鈕，就能打開相機玩濾鏡', 7000)
                        : tipBubble(container, toggle, '新濾鏡：' + nf.label, '點我試試', 6000);
        } catch (e) { tip = null; }
      }
      return {
        el: wrap,
        destroy: function () {
          document.removeEventListener('pointerdown', onDocDown, true);
          if (tip) tip.destroy();
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        }
      };
    }
  };
})();
