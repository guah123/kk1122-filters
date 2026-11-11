/* 看看｜濾鏡展示頁：首頁（卡片）＋播放頁（全螢幕 canvas／相機）＋ ?selftest=1。
 * classic script，可直接 file:// 開，也可放 GitHub Pages。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);

  /* ---------- localStorage（隨時可能不能用，一律 try/catch） ---------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- 預期會有的濾鏡（還沒做出來的顯示「製作中」） ---------- */
  var EXPECTED = [
    { id: 'delilah', no: 1, song: 'Hey There Delilah', sec: 1 },
    { id: 'remember', no: 2, song: '我記得', sec: 1 },
    { id: 'otona', no: 3, song: '大人中', sec: 1 },
    { id: 'hareru', no: 4, song: '明日晴れるかな', sec: 1 },
    { id: 'onlyyou', no: 5, song: '我只在乎你', sec: 1 },
    { id: 'together', no: 'E0', song: '', sec: 2 },
    { id: 'curtaincall', no: 'E1', song: '', sec: 2 },
    { id: 'keyhole', no: 'E2', song: '', sec: 2 },
    { id: 'reveal', no: 'E3', song: '', sec: 2 },
    { id: 'colophon', no: '', song: '', title: '版權頁', sec: 3 },
  ];
  var SECTIONS = [
    { n: 1, title: '五首歌的濾鏡', cap: '每個濾鏡是一段 12–16 秒、無縫 loop 的動畫；有互動的，手指可以參與。' },
    { n: 2, title: '安可彩蛋候選', cap: '安可時的小驚喜：E0 是首選，其餘是備案。' },
    { n: 3, title: '結尾素材', cap: '音樂會結尾使用。' },
  ];

  var critterOn = lsGet('kk.critter', '1') !== '0';
  var inApp = window.KK_Diag ? KK_Diag.isInApp() : false;
  var P = null;            // 播放頁狀態（不在播放頁時為 null）
  var homeBuilt = false;
  var homeScroll = 0;
  var thumbSeq = 0;
  var thumbsDone = false;
  var navList = [];        // 可播放的濾鏡 id（依首頁順序）

  /* ---------- 小工具 ---------- */
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function sortKey(no, id) {
    if (id === 'colophon') return 100;
    if (typeof no === 'number') return no;
    var m = String(no == null ? '' : no).match(/^[A-Za-z]*(\d+)/);
    if (m) return (/^e/i.test(String(no)) ? 10 : 0) + parseInt(m[1], 10);
    return 50;
  }
  function numOf(no) { var n = Number(no); return isFinite(n) && no !== '' && no != null ? n : null; }
  function noLabel(no, id) {
    if (no == null || no === '') return id === 'colophon' ? '結尾' : '';
    return typeof no === 'number' ? 'No.' + no : String(no);
  }
  function applyCritter() {
    if (window.KK && KK.Critter) KK.Critter.visible = critterOn;
    if (P) P.stage.S.critter = critterOn;
  }

  /* =====================================================================
   * 首頁
   * ===================================================================== */
  function collectItems() {
    var items = [];
    var seen = {};
    (KK.filters || []).forEach(function (d) {
      if (seen[d.id]) return;
      seen[d.id] = 1;
      var ex = EXPECTED.filter(function (e) { return e.id === d.id; })[0];
      var sec;
      if (d.id === 'colophon') sec = 3;
      else if (typeof d.no === 'string' && /^e/i.test(d.no)) sec = 2;
      else if (numOf(d.no) != null && numOf(d.no) >= 1 && numOf(d.no) <= 5) sec = 1;
      else sec = ex ? ex.sec : 1;
      items.push({ id: d.id, def: d, sec: sec, key: sortKey(d.no, d.id) });
    });
    EXPECTED.forEach(function (e) {
      if (seen[e.id]) return;
      items.push({ id: e.id, def: null, meta: e, sec: e.sec, key: sortKey(e.no, e.id) });
    });
    items.sort(function (a, b) { return a.key - b.key; });
    return items;
  }

  function bakeTitle() {
    var cv = $('title-canvas');
    try {
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var size = 92 * dpr;
      var baked = KK.Glyphs.bake('看看', size, KK.PAL.cream, 8, 0.12);
      cv.width = baked.width;
      cv.height = baked.height;
      cv.style.width = baked.width / dpr + 'px';
      cv.style.height = baked.height / dpr + 'px';
      cv.getContext('2d').drawImage(baked, 0, 0);
    } catch (e) {
      var t = h('div', 'title-fallback', '看看');
      t.style.cssText = 'font-size:72px;font-family:serif;color:#F3E6CF';
      cv.replaceWith(t);
    }
  }

  function buildCard(it) {
    var d = it.def, m = it.meta || {};
    var wip = !d;
    var el = h(wip ? 'div' : 'a', 'card' + (wip ? ' wip' : ''));
    if (!wip) el.href = '#/f/' + encodeURIComponent(it.id);
    var th = h('div', 'thumb');
    if (wip) {
      th.textContent = '製作中';
    } else {
      var cv = document.createElement('canvas');
      cv.width = 270; cv.height = 480;
      th.appendChild(cv);
      it.canvas = cv;
    }
    el.appendChild(th);
    var info = h('div', 'info');
    var nl = noLabel(wip ? m.no : d.no, it.id);
    if (nl) info.appendChild(h('span', 'no', nl));
    var song = wip ? m.song : d.song;
    if (song) info.appendChild(h('p', 'song', song));
    var title = wip ? (m.title || '') : d.title;
    if (title) info.appendChild(h('p', 'ttl', title));
    if (wip) {
      info.appendChild(h('p', 'mood', '製作中（還沒有這個濾鏡）'));
    } else {
      if (d.mood) info.appendChild(h('p', 'mood', d.mood));
      var meta = h('div', 'meta');
      meta.appendChild(h('span', 'pill', 'loop ' + d.duration + ' 秒'));
      if (d.critterHint) meta.appendChild(h('span', 'pill', '小動物：' + d.critterHint));
      info.appendChild(meta);
      if (d.hint) info.appendChild(h('p', 'hint', d.hint));
    }
    el.appendChild(info);
    return el;
  }

  function buildHome() {
    homeBuilt = true;
    bakeTitle();
    var main = $('home-main');
    main.textContent = '';
    var items = collectItems();
    navList = items.filter(function (it) { return !!it.def; }).map(function (it) { return it.id; });
    SECTIONS.forEach(function (s) {
      var list = items.filter(function (it) { return it.sec === s.n; });
      if (!list.length) return;
      var sec = h('section', 'sec');
      sec.appendChild(h('h2', '', s.title));
      sec.appendChild(h('p', 'cap', s.cap));
      var grid = h('div', 'grid');
      list.forEach(function (it) { grid.appendChild(buildCard(it)); });
      sec.appendChild(grid);
      main.appendChild(sec);
    });
    window.KK_HOME_ITEMS = items;
    if (!/^#\/f\//.test(location.hash || '')) renderThumbs(items);
  }

  /* 縮圖：共用一個離屏 stage（270×480），一張一張畫完 drawImage 到卡片上 */
  function renderThumbs(items) {
    var seq = ++thumbSeq;
    thumbsDone = false;
    var off = document.createElement('canvas');
    off.width = 270; off.height = 480;
    var st;
    try { st = new KK.Stage(off, { size: [270, 480], pointer: false, bg: 'books' }); }
    catch (e) { return; }
    st.S.autoDemo = true;
    var todo = items.filter(function (it) { return it.def && it.canvas; });
    var i = 0;
    (function next() {
      if (seq !== thumbSeq) return;
      if (i >= todo.length) { thumbsDone = true; return; }
      var it = todo[i++];
      var g = it.canvas.getContext('2d');
      try {
        st.S.critter = critterOn;
        st.setFilter(it.id);
        st.S.autoDemo = true;
        var t = it.def.duration * 0.45;
        st.renderAt(t, t);
        g.drawImage(off, 0, 0);
      } catch (e) {
        g.fillStyle = '#3A2E28'; g.fillRect(0, 0, 270, 480);
        g.fillStyle = '#E3A46F'; g.font = '16px sans-serif'; g.textAlign = 'center';
        g.fillText('縮圖失敗', 135, 230);
        g.fillStyle = '#b9a68c'; g.font = '11px sans-serif';
        g.fillText(String(e && e.message || e).slice(0, 34), 135, 252);
        if (window.console) console.error('thumb', it.id, e);
      }
      setTimeout(next, 0);
    })();
  }

  function updateCritterButtons() {
    var b = $('h-critter');
    b.setAttribute('aria-pressed', String(critterOn));
    b.textContent = '小動物：' + (critterOn ? '顯示' : '隱藏');
    if (P) {
      var pb = $('p-critter');
      pb.textContent = critterOn ? '顯示中（點一下關閉）' : '已隱藏（點一下開啟）';
      pb.setAttribute('aria-pressed', String(critterOn));
    }
  }
  function setCritter(v) {
    critterOn = v;
    lsSet('kk.critter', v ? '1' : '0');
    applyCritter();
    updateCritterButtons();
  }

  function initHome() {
    $('h-critter').addEventListener('click', function () {
      setCritter(!critterOn);
      if (homeBuilt && window.KK_HOME_ITEMS) renderThumbs(window.KK_HOME_ITEMS);
    });
    $('h-diag').addEventListener('click', function () { KK_Diag.show(); });
    if (inApp) $('inapp').hidden = false;
    $('inapp-x').addEventListener('click', function () { $('inapp').hidden = true; });
    if (window.KK_LOAD_ERRORS && KK_LOAD_ERRORS.length) {
      var w = $('load-warn');
      w.hidden = false;
      w.textContent = '有 ' + KK_LOAD_ERRORS.length + ' 個檔案載入失敗（詳見診斷資訊）';
    }
    updateCritterButtons();
  }

  /* =====================================================================
   * 播放頁
   * ===================================================================== */
  function toast(msg, ms, detail) {
    var el = $('p-toast');
    clearTimeout(toast._t);
    el.textContent = msg;
    if (detail) { var s = document.createElement('small'); s.textContent = detail; el.appendChild(s); }
    el.classList.add('show');
    el.classList.toggle('sticky', !ms);
    el.onclick = ms ? null : function () { el.classList.remove('show', 'sticky'); };
    if (ms) toast._t = setTimeout(function () { el.classList.remove('show'); }, ms);
  }
  function hideToast() { var el = $('p-toast'); clearTimeout(toast._t); el.classList.remove('show', 'sticky'); }

  function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }

  function buildPlayer() {
    var view = $('view-player');
    var old = $('stage');
    if (old) old.remove();
    var canvas = document.createElement('canvas');
    canvas.id = 'stage';
    view.insertBefore(canvas, view.firstChild);
    var stage = new KK.Stage(canvas, { bg: 'books' });
    P = {
      view: view, canvas: canvas, stage: stage, id: '', bg: 'books', lastBg: 'books',
      facing: 'environment', camSeq: 0, wasCam: false, hintT: 0,
      showFps: qs.get('fps') === '1', lastSec: -1, lastFps: 0, lastInfo: 0,
    };
    // 濾鏡畫到一半丟例外：不讓 rAF 迴圈整個死掉
    var orig = stage.renderAt.bind(stage);
    stage.renderAt = function (t, now) {
      try { orig(t, now); }
      catch (e) {
        if (window.console) console.error('filter draw error', e);
        stage.inst = null;
        try { stage.ctx.restore(); } catch (_) { /* ignore */ }
        toast('這個濾鏡執行時發生錯誤，已暫停疊加', 0, String(e && e.message || e));
        try { orig(t, now); } catch (_) { /* ignore */ }
      }
    };
    stage.onFrame = onFrame;
    P.rec = null; P.lastResult = null; P.resultUrl = '';
    window.KK_ACTIVE_STAGE = stage;
    applyCritter();
    updateCritterButtons();
    $('p-fps').hidden = !P.showFps;
  }

  function onFrame(S) {
    if (!P) return;
    var D = S.D || 1;
    $('p-loopfill').style.transform = 'scaleX(' + (S.t / D).toFixed(4) + ')';
    var s = Math.floor(S.t);
    if (s !== P.lastSec) {
      P.lastSec = s;
      $('p-looptxt').textContent = 'loop ' + s + ' / ' + D + ' 秒';
    }
    if (P.bg === 'camera') {
      var nn = performance.now();
      if (nn - P.lastInfo > 500) {
        P.lastInfo = nn;
        var o = P.stage.outputInfo();
        $('p-info').textContent = '預覽 9:16 · 錄影 ' + o.canvas + ' · 相機 ' + o.source.replace('（橫，已置中裁切）', '(橫,已裁切)').replace('（直）', '(直)') + ' · ' + S.fps + 'fps' + (o.rotate ? ' · rotate=' + o.rotate : '');
      }
    }
    if (P.showFps) {
      var n = performance.now();
      if (n - P.lastFps > 250) {
        P.lastFps = n;
        $('p-fps').textContent = S.fps + ' fps　' + S.w + '×' + S.h;
      }
    }
  }

  function enterPlayer(id) {
    // 切換畫面
    if (!P) {
      homeScroll = window.scrollY || 0;
      thumbSeq++; // 中斷尚未畫完的縮圖，避免和播放頁搶背景快取
      $('view-home').hidden = true;
      $('view-player').hidden = false;
      document.documentElement.classList.add('in-player');
      buildPlayer();
    }
    var def = KK.byId[id] || null;
    P.id = id;
    P.view.classList.remove('ui-hidden');
    $('p-dot').hidden = true;
    hideToast();

    // 頂列文字
    $('p-no').textContent = def ? noLabel(def.no, id) : '';
    $('p-title').textContent = def ? def.title : id;
    $('p-song').textContent = def && def.song ? def.song : '';
    $('p-reset-row').hidden = id !== 'hareru';
    setMenu(false);
    wake();
    var idx = navList.indexOf(id);
    var multi = navList.length > 1;
    $('p-prev').hidden = !multi;
    $('p-next').hidden = !multi;
    P.prev = multi ? navList[(idx < 0 ? 0 : idx - 1 + navList.length) % navList.length] : null;
    P.next = multi ? navList[(idx < 0 ? 0 : idx + 1) % navList.length] : null;
    document.title = (def ? def.title + '｜' : '') + '看看｜現場濾鏡展示';

    // 舞台
    var stage = P.stage;
    stage.inst = null; stage.def = null;
    $('p-wip').hidden = !!def;
    stage.S.critter = critterOn;
    stage.S.autoDemo = false;
    if (def) {
      try { stage.setFilter(id); }
      catch (e) {
        if (window.console) console.error(e);
        stage.inst = null;
        toast('這個濾鏡載入失敗', 0, String(e && e.message || e));
      }
    } else {
      stage.S.D = 12;
      stage.fit();
    }
    P.lastSec = -1;
    if (!stage.running && !document.hidden) stage.start();

    // 提示泡泡 4 秒
    var hint = $('p-hint');
    clearTimeout(P.hintT);
    if (def && def.hint) {
      hint.textContent = def.hint;
      hint.classList.add('show');
      P.hintT = setTimeout(function () { hint.classList.remove('show'); }, 4000);
    } else hint.classList.remove('show');
  }

  function leavePlayer() {
    if (!P) return;
    if (P.rec) { var rh = P.rec; P.rec = null; rh.stop('離開播放頁'); }
    closeResult();
    setRecUi(false);
    P.stage.stop();
    P.camSeq++;
    try { KK.Camera.stop(); } catch (e) { /* ignore */ }
    P.stage.video = null;
    clearTimeout(P.hintT);
    clearTimeout(P.dimT);
    if (fsElement()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ignore */ } }
    P.canvas.remove();
    window.KK_ACTIVE_STAGE = null;
    P = null;
    hideToast();
    document.documentElement.classList.remove('in-player');
    $('view-player').hidden = true;
    document.title = '看看｜現場濾鏡展示';
  }

  /* ---------- 背景／相機 ---------- */
  var CAM_MSG = {
    InsecureContext: '需要 https 網址才能開相機（file:// 或 http 不能開相機）。',
    NotAllowedError: '請允許相機權限（到網址列或系統設定打開相機）。',
    PermissionDeniedError: '請允許相機權限（到網址列或系統設定打開相機）。',
    SecurityError: '請允許相機權限；若是在 App 內建瀏覽器，請改用 Safari 或 Chrome。',
    NotFoundError: '找不到相機。',
    DevicesNotFoundError: '找不到相機。',
    NotReadableError: '相機被其他 App 佔用，請先關閉其他正在用相機的 App。',
    TrackStartError: '相機被其他 App 佔用，請先關閉其他正在用相機的 App。',
    OverconstrainedError: '這支手機的相機不支援要求的設定，請試試切換前／後鏡頭。',
    AbortError: '相機啟動被中斷，請再試一次。',
    NotSupported: '這個瀏覽器不支援相機。',
  };
  function camErrorText(e) {
    var name = (e && e.name) || 'Error';
    var msg = CAM_MSG[name] || '相機無法啟動。';
    if (inApp) msg += '（你正在 App 內建瀏覽器，建議改用 Safari 或 Chrome。）';
    return { msg: msg, detail: '錯誤：' + name + (e && e.message ? '：' + e.message : '') };
  }

  function refreshBgUi() {
    var btns = document.querySelectorAll('.seg button');
    for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-bg') === P.bg);
    $('p-flip-row').hidden = P.bg !== 'camera';
    $('p-flip').textContent = '鏡頭：' + (P.facing === 'user' ? '前' : '後') + '（點一下切換）';
    $('p-rec').hidden = P.bg !== 'camera';
    $('p-info').hidden = P.bg !== 'camera';
    P.view.classList.toggle('cam', P.bg === 'camera');
    updateOrient();
  }

  /* ---------- 相機模式：直式輸出＋錄影 ---------- */
  function isTouch() {
    try { return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window || (window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  }
  /* 橫放觸控裝置：提示「請直拿手機」（不影響錄影輸出，畫布固定 720×1280） */
  function updateOrient() {
    var el = $('p-rotate');
    if (!el) return;
    el.hidden = !(P && P.bg === 'camera' && isTouch() && window.innerWidth > window.innerHeight);
  }
  function fmtT(s) { return Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2); }
  function setRecUi(on) {
    var b = $('p-rec'), t = $('p-timer');
    b.classList.toggle('on', on);
    b.setAttribute('aria-label', on ? '停止錄影' : '開始錄影');
    t.hidden = !on;
    if (P) P.view.classList.toggle('recording', on);
    if (!on) t.textContent = '● 0:00 / 0:30';
  }
  function onRecTick(el, max) { $('p-timer').textContent = '● ' + fmtT(el) + ' / ' + fmtT(max); }
  function startRec() {
    if (!P || P.rec || P.bg !== 'camera' || !P.stage.video) return;
    closeResult();
    var h;
    try { h = KK.Recorder.start(P.stage, { maxSec: 30, onTick: onRecTick }); }
    catch (e) { toast('無法錄影：' + ((e && e.message) || e), 0, '錯誤：' + ((e && e.name) || '') + '（點一下關閉）'); return; }
    P.rec = h;
    setRecUi(true);
    h.done.then(function (r) {
      if (!P || P.rec !== h) return;
      P.rec = null;
      setRecUi(false);
      showResult(r);
    });
  }
  function stopRec() { if (P && P.rec) P.rec.stop('手動停止'); }
  function showResult(r) {
    P.lastResult = r;
    closeResult();
    var v = $('p-rv');
    try { P.resultUrl = URL.createObjectURL(r.blob); v.src = P.resultUrl; v.load(); } catch (e) { /* ignore */ }
    $('p-rinfo').textContent = KK.Recorder.describe(r).join('\n');
    $('p-rmsg').textContent = '';
    $('p-rsave').disabled = !r.size;
    $('p-result').hidden = false;
    P.view.classList.add('result');
  }
  function closeResult() {
    var el = $('p-result');
    if (!el || el.hidden && !(P && P.resultUrl)) return;
    el.hidden = true;
    var v = $('p-rv');
    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { /* ignore */ }
    if (P) {
      if (P.resultUrl) { try { URL.revokeObjectURL(P.resultUrl); } catch (e) { /* ignore */ } P.resultUrl = ''; }
      P.view.classList.remove('result');
    }
  }

  function startCamera() {
    if (!P) return;
    var seq = ++P.camSeq;
    var stage = P.stage;
    stage.bgMode = 'camera';
    stage.video = null;
    stage.mirror = P.facing === 'user';
    $('p-rec').disabled = true;
    toast('相機啟動中…', 2500);
    KK.Camera.start(P.facing).then(function (v) {
      if (!P || seq !== P.camSeq || P.bg !== 'camera') { KK.Camera.stop(); return; }
      stage.video = v;
      stage.mirror = P.facing === 'user';
      $('p-rec').disabled = false;
      hideToast();
    }, function (e) {
      if (!P || seq !== P.camSeq) return;
      if (window.console) console.warn('camera', e);
      setBg(P.lastBg || 'books');
      var t = camErrorText(e);
      toast(t.msg, 0, t.detail + '（點一下關閉）');
    });
  }

  function setBg(mode) {
    if (!P || P.rec) return;
    P.bg = mode;
    P.wasCam = false;
    // 相機模式一律直式 9:16 輸出（畫布 720×1280，置中裁切）；其他模式依視窗大小
    P.view.classList.toggle('cam', mode === 'camera');
    P.stage.setPortraitOutput(mode === 'camera');
    if (mode === 'camera') {
      refreshBgUi();
      startCamera();
    } else {
      P.camSeq++;
      try { KK.Camera.stop(); } catch (e) { /* ignore */ }
      P.stage.video = null;
      P.stage.mirror = false;
      P.stage.bgMode = mode;
      P.lastBg = mode;
      refreshBgUi();
    }
  }

  function toggleFs() {
    if (fsElement()) {
      try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ignore */ }
      return;
    }
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    function fallback() {
      if (!P) return;
      P.view.classList.add('ui-hidden');
      $('p-dot').hidden = false;
      toast('iPhone 可用「加入主畫面」取得全螢幕', 4000);
    }
    if (!req) { fallback(); return; }
    try {
      var r = req.call(el);
      if (r && r.catch) r.catch(fallback);
    } catch (e) { fallback(); }
  }

  /* 設定面板、頂列自動淡出（4 秒沒碰介面 → 25%） */
  function setMenu(open) {
    $('p-menu').hidden = !open;
    $('p-more').setAttribute('aria-expanded', String(open));
    wake();
  }
  function wake() {
    var top = $('ptop');
    top.classList.remove('dim');
    if (!P) return;
    clearTimeout(P.dimT);
    P.dimT = setTimeout(function () {
      if (P && $('p-menu').hidden) top.classList.add('dim');
    }, 4000);
  }

  function setUiHidden(hide) {
    if (!P) return;
    P.view.classList.toggle('ui-hidden', hide);
    $('p-dot').hidden = !hide;
    if (hide) { hideToast(); setMenu(false); }
    else wake();
  }

  var fitT = 0;
  function scheduleFit() {
    clearTimeout(fitT);
    fitT = setTimeout(function () {
      if (!P) return;
      try { P.stage.fit(); } catch (e) { if (window.console) console.error(e); }
    }, 120);
  }

  function initPlayer() {
    $('p-more').addEventListener('click', function () { setMenu($('p-menu').hidden); });
    // 點面板外面收起；碰頂列／面板／進度線＝操作介面（濾鏡上的手指不算）
    document.addEventListener('pointerdown', function (e) {
      if (!P) return;
      var inUi = e.target.closest && e.target.closest('#ptop, #p-menu, #p-loop, #p-dot, #p-rec');
      if (inUi) wake();
      if (!$('p-menu').hidden && !(e.target.closest && e.target.closest('#p-menu, #p-more'))) setMenu(false);
    }, true);
    $('p-prev').addEventListener('click', function () { if (P && P.prev) location.replace('#/f/' + encodeURIComponent(P.prev)); });
    $('p-next').addEventListener('click', function () { if (P && P.next) location.replace('#/f/' + encodeURIComponent(P.next)); });
    var segs = document.querySelectorAll('.seg button');
    for (var i = 0; i < segs.length; i++) {
      segs[i].addEventListener('click', function (e) { setBg(e.currentTarget.getAttribute('data-bg')); });
    }
    $('p-flip').addEventListener('click', function () {
      if (!P || P.rec) return;
      P.facing = P.facing === 'user' ? 'environment' : 'user';
      refreshBgUi();
      startCamera();
    });
    $('p-critter').addEventListener('click', function () { setCritter(!critterOn); });
    $('p-rec').addEventListener('click', function () { if (P && P.rec) stopRec(); else startRec(); });
    $('p-rsave').addEventListener('click', function () {
      if (!P || !P.lastResult) return;
      var b = $('p-rsave'); b.disabled = true;
      KK.Recorder.save(P.lastResult).then(function (o) { $('p-rmsg').textContent = o.msg; b.disabled = false; },
        function (e) { $('p-rmsg').textContent = '儲存失敗：' + ((e && e.message) || e); b.disabled = false; });
    });
    $('p-ragain').addEventListener('click', closeResult);
    $('p-rcopy').addEventListener('click', function () {
      var t = KK_Diag.collect().text;
      KK_Diag.copy(t, null).then(function (ok) { $('p-rmsg').textContent = ok ? '已複製測試資訊。' : '複製失敗，請到首頁「診斷資訊」複製。'; });
    });
    $('p-back').addEventListener('click', function (e) { if (P && P.rec) { e.preventDefault(); toast('錄影中，請先停止錄影', 1800); } });
    $('p-fs').addEventListener('click', toggleFs);
    $('p-hide').addEventListener('click', function () { setUiHidden(true); });
    $('p-dot').addEventListener('click', function () { setUiHidden(false); });
    $('p-reset').addEventListener('click', function () { if (P) { P.stage.reset(); toast('烏雲重新佈滿了', 1500); } });
    $('p-loop').addEventListener('click', function () {
      if (!P) return;
      P.showFps = !P.showFps;
      $('p-fps').hidden = !P.showFps;
    });

    window.addEventListener('resize', function () { scheduleFit(); updateOrient(); });
    window.addEventListener('orientationchange', function () { scheduleFit(); updateOrient(); });
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleFit);

    // 離開頁面／切到背景：停相機，回來時自動重開
    document.addEventListener('visibilitychange', function () {
      if (!P) return;
      if (document.hidden) {
        P.stage.stop();
        if (P.bg === 'camera') { P.wasCam = true; P.camSeq++; KK.Camera.stop(); P.stage.video = null; }
      } else {
        P.stage.start();
        if (P.wasCam && P.bg === 'camera') { P.wasCam = false; startCamera(); }
      }
    });
    window.addEventListener('pagehide', function () { try { KK.Camera.stop(); } catch (e) { /* ignore */ } });
  }
  function onFsChange() {
    $('p-fs').textContent = fsElement() ? '結束全螢幕' : '全螢幕';
    scheduleFit();
  }

  /* =====================================================================
   * 路由
   * ===================================================================== */
  function route() {
    var m = (location.hash || '').match(/^#\/f\/([^/?]+)/);
    if (m) {
      var id = decodeURIComponent(m[1]);
      enterPlayer(id);
      refreshBgUi();
    } else {
      leavePlayer();
      $('view-home').hidden = false;
      if (!thumbsDone && window.KK_HOME_ITEMS) renderThumbs(window.KK_HOME_ITEMS);
      window.scrollTo(0, homeScroll);
    }
  }

  function boot() {
    document.documentElement.setAttribute('data-ready', '1');
    if (qs.get('selftest') === '1') {
      $('view-home').hidden = true;
      $('view-selftest').hidden = false;
      applyCritter();
      KK_Selftest.run($('view-selftest'), { cam: qs.get('cam') === '1' });
      return;
    }
    initHome();
    initPlayer();
    applyCritter();
    buildHome();
    window.addEventListener('hashchange', route);
    route();
    window.KK_APP = { ready: true };
  }

  window.KK_APP_API = { toast: toast, camErrorText: camErrorText };
  KKReady(boot);
})();
