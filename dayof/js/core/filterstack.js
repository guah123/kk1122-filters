/* filterstack.js — round filter buttons stacked top-right (owner A).
 * DAYOF.FilterStack.mount(container, ctx, opts?) → { el, destroy }
 *   opts.labels  true → show the text label under each icon (default: icon-only, v=261116x)
 *   opts.layout  'row' → one horizontal row anchored top-right (default: vertical column)
 *   opts.top     number(px) | css length → override the top offset
 *   opts.className extra class on the wrapper;  opts.extra [nodes] appended under the filters */
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
    '@keyframes fsPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
    '@keyframes fsRing{0%{opacity:.8;transform:scale(.95)}100%{opacity:0;transform:scale(1.3)}}',
    '@media (prefers-reduced-motion:reduce){.filter-stack .round-btn.is-new,.filter-stack .round-btn.is-new::after{animation-duration:4s}}',
    ':where(.filter-stack .fs-extra){margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:10px}'
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

  DAYOF.FilterStack = {
    mount: function (container, ctx, opts) {
      opts = opts || {};
      injectCss();
      var wrap = document.createElement('div');
      wrap.className = 'filter-stack' + (opts.layout === 'row' ? ' fs-row' : '') + (opts.className ? ' ' + opts.className : '');
      if (opts.top != null) wrap.style.top = typeof opts.top === 'number' ? opts.top + 'px' : opts.top;
      var busy = false;
      var ids = (ctx && ctx.filtersAvailable) ? ctx.filtersAvailable() : [];
      var byId = {};
      (DAYOF.FILTERS || []).forEach(function (f) { byId[f.id] = f; });
      ids.forEach(function (id) {
        var f = byId[id] || { id: id, icon: id, label: id };
        var item = document.createElement('div'); item.className = 'fs-item';
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'round-btn filter-btn filter-' + f.id;
        b.setAttribute('aria-label', f.label + '濾鏡'); b.title = f.label;
        b.dataset.filter = f.id;
        b.appendChild(iconEl(f.icon, f.label));
        var st = ctx && ctx.state;
        if (st && !(st.filterSeen && st.filterSeen[f.id])) b.classList.add('is-new');
        b.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (st && b.classList.contains('is-new')) {
            b.classList.remove('is-new');
            st.filterSeen = st.filterSeen || {}; st.filterSeen[f.id] = true;
            try { ctx.save(); } catch (e) {}
          }
          if (busy) return; busy = true;
          var p;
          try { p = ctx.openFilter(f.id); } catch (e) { p = null; }
          Promise.resolve(p).then(function () { busy = false; }, function () { busy = false; });
        });
        item.appendChild(b);
        if (opts.labels === true) {
          var l = document.createElement('span'); l.className = 'fs-label'; l.textContent = f.label; item.appendChild(l);
        }
        wrap.appendChild(item);
      });
      if (opts.extra && opts.extra.length) {
        var ex = document.createElement('div'); ex.className = 'fs-extra';
        opts.extra.forEach(function (n) { if (n) ex.appendChild(n); });
        wrap.appendChild(ex);
      }
      container.appendChild(wrap);
      return { el: wrap, destroy: function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); } };
    }
  };
})();
