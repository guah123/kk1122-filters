/* filterstack.js — round semi-transparent filter buttons stacked top-right (owner A). */
window.DAYOF = window.DAYOF || {};
(function () {
  var CSS = [
    ':where(.filter-stack){position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);right:12px;z-index:50;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none}',
    ':where(.filter-stack) > *{pointer-events:auto}',
    ':where(.filter-stack .fs-item){display:flex;flex-direction:column;align-items:center;gap:2px}',
    ':where(.filter-stack .round-btn){width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:var(--ink,#4A3C30);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 3px 10px rgba(74,60,48,.18);-webkit-tap-highlight-color:transparent;font:600 12px/1 var(--font,system-ui)}',
    ':where(.filter-stack .round-btn:active){transform:scale(.94)}',
    ':where(.filter-stack .round-btn svg){width:30px;height:30px;display:block}',
    ':where(.filter-stack .round-btn .ico){display:flex;align-items:center;justify-content:center}',
    ':where(.filter-stack .fs-label){font:600 10px/1.2 var(--font,system-ui);color:var(--ink,#4A3C30);background:rgba(255,255,255,.6);padding:1px 6px;border-radius:8px;white-space:nowrap}',
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
      wrap.className = 'filter-stack';
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
        b.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (busy) return; busy = true;
          var p;
          try { p = ctx.openFilter(f.id); } catch (e) { p = null; }
          Promise.resolve(p).then(function () { busy = false; }, function () { busy = false; });
        });
        item.appendChild(b);
        if (opts.labels !== false) {
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
