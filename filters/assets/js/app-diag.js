/* 診斷資訊：首頁按鈕與 selftest 結果頁共用。純文字＋最後附 JSON，方便貼給工程師。 */
(function () {
  'use strict';
  var D = (window.KK_Diag = {});

  D.isInApp = function () {
    return /\bLine\/|FBAN|FBAV|FB_IAB|Instagram|MicroMessenger/i.test(navigator.userAgent || '');
  };

  function yn(v) { return v ? '有' : '沒有'; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  /* 收集環境資訊，回傳 { text, data } */
  D.collect = function () {
    var nav = navigator;
    var d = {
      time: stamp(),
      href: location.href,
      userAgent: nav.userAgent,
      inAppBrowser: D.isInApp(),
      screen: screen.width + '×' + screen.height,
      window: window.innerWidth + '×' + window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      isSecureContext: !!window.isSecureContext,
      mediaDevices: !!nav.mediaDevices,
      getUserMedia: !!(nav.mediaDevices && nav.mediaDevices.getUserMedia),
      MediaRecorder: typeof window.MediaRecorder !== 'undefined',
      mimeSupport: {},
      captureStream: !!(window.HTMLCanvasElement && HTMLCanvasElement.prototype.captureStream),
      requestVideoFrameCallback: !!(window.HTMLVideoElement && HTMLVideoElement.prototype.requestVideoFrameCallback),
      share: typeof nav.share === 'function',
      canShare: typeof nav.canShare === 'function',
      clipboard: !!(nav.clipboard && nav.clipboard.writeText),
      loadErrors: (window.KK_LOAD_ERRORS || []).slice(),
      filtersDefined: (window.KK && KK.filters ? KK.filters.map(function (f) { return f.id; }) : []),
    };
    var types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'];
    types.forEach(function (m) {
      var ok = null;
      try { ok = d.MediaRecorder && MediaRecorder.isTypeSupported ? !!MediaRecorder.isTypeSupported(m) : false; } catch (e) { ok = 'error:' + e.message; }
      d.mimeSupport[m] = ok;
    });
    var st = window.KK_SELFTEST_RESULT || null;
    if (st) {
      d.selftest = {
        pass: st.pass, fails: st.fails, warns: st.warns,
        rows: st.rows.map(function (r) {
          return { id: r.id, status: r.status, fps: r.fps, ms: r.ms, errors: r.errors, warns: r.warns };
        }),
        camera: st.camera || null,
      };
    }

    var L = [];
    L.push('【看看 濾鏡展示頁 診斷資訊】');
    L.push('時間：' + d.time);
    L.push('網址：' + d.href);
    L.push('userAgent：' + d.userAgent);
    L.push('App 內建瀏覽器：' + (d.inAppBrowser ? '是（建議改用 Safari 或 Chrome）' : '否'));
    L.push('螢幕：' + d.screen + '　視窗：' + d.window + '　devicePixelRatio：' + d.devicePixelRatio);
    L.push('isSecureContext：' + d.isSecureContext + (d.isSecureContext ? '' : '（需要 https 才能開相機）'));
    L.push('navigator.mediaDevices：' + yn(d.mediaDevices) + '　getUserMedia：' + yn(d.getUserMedia));
    L.push('MediaRecorder：' + yn(d.MediaRecorder));
    Object.keys(d.mimeSupport).forEach(function (m) { L.push('  isTypeSupported(' + m + ')：' + d.mimeSupport[m]); });
    L.push('canvas.captureStream：' + yn(d.captureStream));
    L.push('video.requestVideoFrameCallback：' + yn(d.requestVideoFrameCallback));
    L.push('navigator.share：' + yn(d.share) + '　navigator.canShare：' + yn(d.canShare));
    L.push('navigator.clipboard.writeText：' + yn(d.clipboard));
    L.push('已定義的濾鏡：' + (d.filtersDefined.join(', ') || '（無）'));
    if (d.loadErrors.length) L.push('載入失敗的檔案：' + d.loadErrors.join(', '));
    if (st) {
      L.push('');
      L.push('【自我檢測】' + (st.pass ? 'PASS' : 'FAIL') + '　失敗 ' + st.fails + ' 項、警告 ' + st.warns + ' 項');
      st.rows.forEach(function (r) {
        var line = '  [' + r.status.toUpperCase() + '] ' + r.id +
          (r.fps != null ? '  fps=' + r.fps + ' ms=' + r.ms : '');
        L.push(line);
        r.errors.forEach(function (m) { L.push('      錯誤：' + m); });
        r.warns.forEach(function (m) { L.push('      警告：' + m); });
      });
      if (st.camera) L.push('  相機：' + JSON.stringify(st.camera));
    } else {
      L.push('自我檢測：尚未執行（網址加 ?selftest=1）');
    }
    L.push('');
    L.push('---- JSON ----');
    L.push(JSON.stringify(d, null, 1));
    return { text: L.join('\n'), data: d };
  };

  /* 複製到剪貼簿；失敗時選取 textarea 讓人手動複製。回傳 Promise<boolean> */
  D.copy = function (text, ta) {
    function fallback() {
      try {
        if (ta) {
          ta.value = text;
          ta.focus();
          ta.select();
          ta.setSelectionRange(0, text.length);
          return !!(document.execCommand && document.execCommand('copy'));
        }
      } catch (e) { /* ignore */ }
      return false;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  };

  /* 彈出診斷視窗（#modal 在 index.html） */
  D.show = function () {
    var m = document.getElementById('modal');
    if (!m) return;
    var ta = document.getElementById('diag-text');
    var msg = document.getElementById('diag-msg');
    ta.value = D.collect().text;
    msg.textContent = '';
    m.hidden = false;
    document.getElementById('diag-copy').onclick = function () {
      D.copy(ta.value, ta).then(function (ok) {
        msg.textContent = ok ? '已複製，可以直接貼給工程師。' : '已幫你選取全部文字，請長按或按 Ctrl/Cmd+C 複製。';
      });
    };
    document.getElementById('diag-close').onclick = function () { m.hidden = true; };
  };
})();
