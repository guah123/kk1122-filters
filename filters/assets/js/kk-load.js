/* 載入清單：所有頁面（展示頁、harness、selftest）共用。
 * 新增濾鏡：把檔案放進 assets/js/filters/ 並加到 FILES。 */
(function () {
  'use strict';
  var BASE = (document.currentScript && document.currentScript.src.replace(/kk-load\.js.*$/, '')) || 'assets/js/';
  var FILES = [
    'kk-core.js', 'kk-art.js', 'kk-critter.js', 'kk-glyphs.js', 'kk-bg.js', 'kk-stage.js', 'kk-recorder.js',
    'filters/f1-delilah.js', 'filters/f2-remember.js', 'filters/f3-otona.js',
    'filters/f4-hareru.js', 'filters/f5-onlyyou.js',
    'filters/e0-together.js', 'filters/e1-curtaincall.js', 'filters/e2-keyhole.js', 'filters/e3-reveal.js',
    'filters/x-colophon.js',
  ];
  window.KK_LOAD_ERRORS = [];
  window.KKReady = function (cb) {
    var i = 0;
    (function next() {
      if (i >= FILES.length) {
        // 等 Kai 的插圖（kk-art.js 內嵌 data URL）解碼完成再開始，避免第一幀畫不到
        var art = window.KK && window.KK.Art && window.KK.Art.ready;
        if (art && art.then) art.then(cb, function (e) { window.KK_LOAD_ERRORS.push('art:' + e); cb(); });
        else cb();
        return;
      }
      var s = document.createElement('script');
      s.src = BASE + FILES[i++];
      s.onload = next;
      s.onerror = function () { window.KK_LOAD_ERRORS.push(s.src); next(); };
      document.head.appendChild(s);
    })();
  };
})();
