/* DAYOF 精簡版載入清單（由 kk1122-filters v1.4 的 assets/js/kk-load.js 改寫）。
 * 只載入當天 app 需要的：核心、Kai 插圖、小動物、背景、舞台、錄影，以及三支沿用濾鏡：
 *   f3-otona（太空人＝大人中流星）、f4-hareru（太陽）、f2-remember（家）。
 * 新濾鏡（rain、fish）不在這裡：它們在 js/camera/rain.js、fisheye.js，用 DAYOF.kkPlugins 於載入後註冊。
 * 由 js/camera/camera.js 第一次開相機時動態載入（lazy）。 */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.src.replace(/kk-load\.js.*$/, '')) || 'vendor/kk/';
  var VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=([^&]+)/)) || [])[1] || '';   // passed on to every file
  var FILES = [
    'kk-core.js', 'kk-art.js', 'kk-critter.js', 'kk-bg.js', 'kk-stage.js', 'kk-recorder.js',
    'filters/f2-remember.js', 'filters/f3-otona.js', 'filters/f4-hareru.js',
  ];
  window.KK_LOAD_ERRORS = window.KK_LOAD_ERRORS || [];
  var waiting = null, done = false;
  window.KKReady = function (cb) {
    if (done) { cb(); return; }
    if (waiting) { waiting.push(cb); return; }
    waiting = [cb];
    var i = 0;
    var fin = function () { done = true; var w = waiting; waiting = null; w.forEach(function (f) { try { f(); } catch (e) { window.KK_LOAD_ERRORS.push('cb:' + e); } }); };
    (function next() {
      if (i >= FILES.length) {
        var art = window.KK && window.KK.Art && window.KK.Art.ready;
        if (art && art.then) art.then(fin, function (e) { window.KK_LOAD_ERRORS.push('art:' + e); fin(); });
        else fin();
        return;
      }
      var s = document.createElement('script');
      s.src = BASE + FILES[i++] + (VER ? '?v=' + VER : '');
      s.onload = next;
      s.onerror = function () { window.KK_LOAD_ERRORS.push(s.src); next(); };
      document.head.appendChild(s);
    })();
  };
})();
