/* 自我檢測（?selftest=1[&cam=1]）：載入後自動跑一輪，不用人操作。
 * 結果：畫面上的大字＋每個濾鏡一列；document.title = SELFTEST PASS / FAIL；
 * window.KK_SELFTEST_RESULT 給 Playwright 讀。 */
(function () {
  'use strict';
  var EXPECTED = ['delilah', 'remember', 'otona', 'hareru', 'onlyyou', 'together', 'curtaincall', 'keyhole', 'reveal', 'colophon'];
  var NAMES = {
    delilah: 'Hey There Delilah', remember: '我記得', otona: '大人中', hareru: '明日晴れるかな', onlyyou: '我只在乎你',
    curtaincall: '彩蛋 E1', keyhole: '彩蛋 E2', reveal: '彩蛋 E3', colophon: '版權頁',
  };
  var TW = 360, TH = 640;
  var T = (window.KK_Selftest = {});

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function msg(e) { return String((e && e.message) || e); }

  /* 取樣：每 4 像素取一點的亮度（0..255） */
  function sample(stage) {
    var c = stage.canvas, w = c.width, h = c.height;
    var d = stage.ctx.getImageData(0, 0, w, h).data;
    var step = 4, cols = Math.floor(w / step), rows = Math.floor(h / step);
    var out = new Uint8Array(cols * rows), k = 0;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = ((y * step) * w + (x * step)) * 4;
        out[k++] = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      }
    }
    return out;
  }
  function stats(a) {
    var n = a.length, s = 0, i;
    for (i = 0; i < n; i++) s += a[i];
    var m = s / n, v = 0;
    for (i = 0; i < n; i++) v += (a[i] - m) * (a[i] - m);
    return { mean: m, variance: v / n };
  }
  /* 兩張取樣圖的差異：平均絕對差、差超過 20 的像素比例 */
  function diff(a, b) {
    var n = Math.min(a.length, b.length), s = 0, c = 0;
    for (var i = 0; i < n; i++) { var d = Math.abs(a[i] - b[i]); s += d; if (d > 20) c++; }
    return { mean: s / n, ratio: c / n };
  }

  function newStage(canvas, opts) {
    return new KK.Stage(canvas, opts);
  }

  /* 真實 rAF 跑 ms 毫秒；every(now) 每幀前呼叫（可做事），回傳統計 */
  function runRealtime(stage, ms, hooks) {
    return new Promise(function (resolve) {
      var frames = 0, n = 0, sum = 0, first = 0, last = 0, done = false, err = null;
      var t0 = performance.now();
      var guard = setTimeout(finish, ms + 3000);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(guard);
        var span = (last - first) / 1000;
        resolve({
          frames: frames,
          fps: frames > 2 && span > 0 ? (frames - 1) / span : 0,
          ms: n ? sum / n : 0,
          err: err,
        });
      }
      function tick(ts) {
        if (done) return;
        var a = performance.now();
        var now = (a - t0) / 1000;
        try {
          if (hooks && hooks.before) hooks.before(now, frames);
          stage.renderAt(now, now);
          if (hooks && hooks.after) hooks.after(now, frames);
        } catch (e) { err = e; finish(); return; }
        var b = performance.now();
        frames++;
        if (frames > 2) { sum += b - a; n++; }
        if (frames === 1) first = ts;
        last = ts;
        if (ts - first >= ms || (hooks && hooks.stop && hooks.stop(now))) finish();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ---------- 結果列 UI ---------- */
  var ICON = { pass: '✓', warn: '!', fail: '✗' };
  function rowEl(r) {
    var d = el('div', 'strow ' + r.status);
    d.appendChild(el('span', 'ic', ICON[r.status]));
    var nm = el('div', 'nm');
    nm.appendChild(el('b', '', r.name));
    nm.appendChild(el('small', '', r.id));
    d.appendChild(nm);
    d.appendChild(el('div', 'mt', r.fps != null ? r.fps + ' fps · ' + r.ms + ' ms' : ''));
    var m = el('div', 'msg');
    r.errors.forEach(function (t) { m.appendChild(el('div', 'e', '失敗：' + t)); });
    r.warns.forEach(function (t) { m.appendChild(el('div', 'w', '警告：' + t)); });
    r.notes.forEach(function (t) { m.appendChild(el('div', 'i', t)); });
    d.appendChild(m);
    return d;
  }
  function finalize(r) {
    r.status = r.errors.length ? 'fail' : r.warns.length ? 'warn' : 'pass';
    return r;
  }
  function newRow(id, name) {
    return { id: id, name: name || id, status: 'pass', fps: null, ms: null, errors: [], warns: [], notes: [] };
  }

  /* ---------- 單一濾鏡 ---------- */
  async function testFilter(id, perfCanvas) {
    var def = KK.byId[id];
    var row = newRow(id, NAMES[id] || id);
    if (!def) { row.errors.push('未實作（KK.byId.' + id + ' 不存在）'); return finalize(row); }
    row.name = (def.no !== '' && def.no != null ? '#' + def.no + ' ' : '') + (def.song || def.title || id);

    var stage;
    try {
      stage = newStage(KK.canvas(TW, TH), { size: [TW, TH], pointer: false, bg: 'books' });
      stage.S.critter = true;
      stage.S.autoDemo = true;
      stage.setFilter(id);
    } catch (e) { row.errors.push('建立失敗：' + msg(e)); return finalize(row); }
    var D = stage.S.D;
    if (!(D >= 12 && D <= 16) || D % 1 !== 0) row.warns.push('duration=' + D + '，規格是 12–16 的整數秒');

    // a. 四個時間點 render 不丟例外
    var times = [0, D * 0.25, D * 0.5, D * 0.75];
    var frames = [], renderOk = true;
    times.forEach(function (t) {
      try { stage.renderAt(t, t); frames.push(sample(stage)); }
      catch (e) { renderOk = false; row.errors.push('render t=' + r1(t) + ' 例外：' + msg(e)); }
    });
    if (renderOk) {
      // b. 有畫面（不是全黑、有亮度變化）
      var bad = [];
      frames.forEach(function (f, i) {
        var s = stats(f);
        if (s.mean < 6 || s.variance < 30) bad.push('t=' + r1(times[i]) + '(平均 ' + r1(s.mean) + '、變異 ' + r1(s.variance) + ')');
      });
      if (bad.length) row.errors.push('畫面幾乎是空的／全黑：' + bad.join('、'));

      // c. 濾鏡真的有畫東西：與只畫背景比
      var inst = stage.inst, best = { mean: 0, ratio: 0 };
      try {
        stage.inst = null;
        times.forEach(function (t, i) {
          stage.renderAt(t, t);
          var d = diff(frames[i], sample(stage));
          if (d.ratio > best.ratio) best = d;
        });
      } catch (e) { row.errors.push('純背景 render 例外：' + msg(e)); }
      stage.inst = inst;
      row.notes.push('與純背景差異：平均 ' + r3(best.mean) + '、變動像素 ' + r1(best.ratio * 100) + '%');
      if (best.ratio < 0.01) row.errors.push('濾鏡幾乎沒有畫東西（與純背景只差 ' + r1(best.ratio * 100) + '% 像素）');

      // d. 無縫（警告）：t=0 與 t=D−1/30 的差，不應比「loop 中段同樣跨過手繪換格邊界」的一步更大。
      //    （手繪抖動／紙張顆粒每 1/6 秒換一組，所以不能直接拿 t=0 對 t=D/2 比。）
      try {
        var A = frames[0];
        stage.renderAt(D - 1 / 30, D - 1 / 30);
        var seam = diff(A, sample(stage)).mean;
        var xm = Math.floor(D / 2 / 0.5) * 0.5; // 0.5 秒的倍數 → 換格邊界型態與 loop 接縫相同
        stage.renderAt(xm - 1 / 30, xm - 1 / 30);
        var pm = sample(stage);
        stage.renderAt(xm, xm);
        var mid = diff(pm, sample(stage)).mean;
        var half = diff(A, frames[2]).mean;
        row.notes.push('無縫：接縫一步差 ' + r3(seam) + '；中段同型一步差 ' + r3(mid) + '；t=0 對 t=D/2 差 ' + r3(half));
        if (seam > mid * 1.5 + 0.5) row.warns.push('loop 接縫可能跳一下（接縫差 ' + r3(seam) + '，中段同型一步只差 ' + r3(mid) + '）');
      } catch (e) { row.errors.push('無縫檢查例外：' + msg(e)); }

      // e. 效能：真實 rAF、視窗大小的 stage
      if (perfCanvas) {
        try {
          var ps = newStage(perfCanvas, { pointer: false, bg: 'books' });
          ps.S.critter = true;
          ps.setFilter(id);
          row.notes.push('效能測試解析度 ' + ps.S.w + '×' + ps.S.h);
          var res = await runRealtime(ps, 1500);
          if (res.err) row.errors.push('效能測試例外：' + msg(res.err));
          else if (res.frames < 5) row.warns.push('rAF 幾乎沒在跑（' + res.frames + ' 幀）：分頁可能在背景');
          else {
            row.fps = r1(res.fps); row.ms = r1(res.ms);
            if (res.fps < 15) row.errors.push('fps 太低：' + r1(res.fps));
            else if (res.fps < 24) row.warns.push('fps 偏低：' + r1(res.fps));
          }
        } catch (e) { row.errors.push('效能測試失敗：' + msg(e)); }
      }
    }
    if (id === 'hareru') await testHareru(row);
    return finalize(row);
  }

  /* ---------- 〈明日晴れるかな〉互動 ---------- */
  async function testHareru(row) {
    // 1) 手指抹開 → cleared 上升 → reset 歸零
    try {
      var st = newStage(KK.canvas(TW, TH), { size: [TW, TH], pointer: false, bg: 'books' });
      st.S.critter = true;
      st.S.autoDemo = false;
      st.setFilter('hareru');
      var inst = st.inst, S = st.S;
      if (!inst || typeof inst.pointer !== 'function') {
        row.warns.push('hareru 沒有 pointer()，無法測互動');
      } else {
        var peak = 0, readable = typeof inst.cleared === 'number';
        var pts = [];
        for (var i = 0; i < 20; i++) {
          var k = i / 19;
          pts.push([TW * (0.1 + 0.8 * k), TH * (0.5 + 0.12 * Math.sin(k * 6.28 * 1.5))]);
        }
        var up = false, upAt = 0;
        await runRealtime(st, 4000, {
          before: function (now, f) {
            if (f === 0) inst.pointer(S, { type: 'down', x: pts[0][0], y: pts[0][1], id: 1 });
            else if (f <= 19) inst.pointer(S, { type: 'move', x: pts[f][0], y: pts[f][1], id: 1 });
            else if (!up) { up = true; upAt = now; inst.pointer(S, { type: 'up', x: pts[19][0], y: pts[19][1], id: 1 }); }
          },
          after: function () { if (typeof inst.cleared === 'number' && inst.cleared > peak) peak = inst.cleared; },
          stop: function (now) { return up && (now - upAt > 1.3 || peak > 0.02 && now - upAt > 0.8); },
        });
        if (!readable && typeof inst.cleared !== 'number') {
          row.warns.push('inst.cleared 不存在，無法量測抹開比例');
        } else {
          row.notes.push('抹開後 cleared 最大值 ' + r3(peak));
          if (!(peak > 0.02)) row.errors.push('手指抹開後 cleared 沒超過 0.02（' + r3(peak) + '）');
          // reset
          if (typeof inst.reset !== 'function') row.warns.push('沒有 reset()');
          else {
            inst.reset(S);
            var after = 1;
            await runRealtime(st, 1400, { after: function () { after = inst.cleared; } });
            row.notes.push('reset 後 cleared ' + r3(after));
            if (!(after < 0.02)) row.errors.push('reset 後 cleared 沒有回到接近 0（' + r3(after) + '）');
          }
        }
      }
    } catch (e) { row.errors.push('互動測試例外：' + msg(e)); }

    // 2) autoDemo：t=10 與 t=0.5 畫面差異要大
    try {
      var sd = newStage(KK.canvas(TW, TH), { size: [TW, TH], pointer: false, bg: 'books' });
      sd.S.autoDemo = true; sd.S.critter = true;
      sd.setFilter('hareru');
      sd.renderAt(0.5, 0.5);
      var a = sample(sd);
      sd.renderAt(10, 10);
      var d = diff(a, sample(sd));
      row.notes.push('autoDemo：t=0.5 對 t=10 差 ' + r3(d.mean) + '、變動像素 ' + r1(d.ratio * 100) + '%');
      if (d.ratio < 0.05) row.errors.push('autoDemo 看不出抹開（t=10 與 t=0.5 只差 ' + r1(d.ratio * 100) + '% 像素）');
    } catch (e) { row.errors.push('autoDemo 測試例外：' + msg(e)); }
  }

  /* ---------- 相機 ---------- */
  async function testCamera() {
    var row = newRow('camera', '相機（KK.Camera）');
    var info = { requested: true };
    try {
      var stage = newStage(KK.canvas(TW, TH), { size: [TW, TH], pointer: false, bg: 'camera' });
      stage.fit();
      var v = await KK.Camera.start('environment');
      await sleep(1000);
      stage.video = v; stage.bgMode = 'camera';
      stage.renderAt(0, 0);
      var s = stats(sample(stage));
      var inf = KK.Camera.info() || {};
      info.width = inf.width; info.height = inf.height; info.frameRate = inf.frameRate; info.facingMode = inf.facingMode;
      info.video = v.videoWidth + '×' + v.videoHeight; info.mean = r1(s.mean); info.variance = r1(s.variance);
      row.notes.push('KK.Camera.info()：' + JSON.stringify(inf));
      row.notes.push('取樣：平均亮度 ' + r1(s.mean) + '、變異 ' + r1(s.variance));
      if (s.mean < 4) row.errors.push('相機畫面全黑');
    } catch (e) {
      row.errors.push('相機失敗：' + ((e && e.name) || '') + ' ' + msg(e));
      info.error = ((e && e.name) || '') + ': ' + msg(e);
    }
    try { KK.Camera.stop(); } catch (e) { /* ignore */ }
    row.camInfo = info;
    return finalize(row);
  }

  /* ---------- 錄影（直式 9:16）：用 KK.Recorder 錄 2 秒，驗證錄出的影片是直向、比例約 9:16 ---------- */
  async function testRecorder() {
    var row = newRow('recorder', '錄影（KK.Recorder，直式 9:16）');
    var cv = el('canvas');
    cv.style.cssText = 'position:fixed;left:-9999px;top:0;width:180px;height:320px;';
    document.body.appendChild(cv);
    var stage = null;
    try {
      if (!KK.Recorder || !KK.Recorder.supported()) throw new Error('此瀏覽器不支援 MediaRecorder／captureStream');
      stage = newStage(cv, { pointer: false, bg: 'camera' });
      stage.setPortraitOutput(true);
      stage.setFilter('delilah');
      stage.S.critter = true;
      var v = await KK.Camera.start('environment');
      await sleep(600);
      stage.video = v; stage.bgMode = 'camera';
      stage.start();
      await sleep(400);
      var h = KK.Recorder.start(stage, { maxSec: 30 });
      await sleep(2000);
      var r = await h.stop('selftest 2 秒');
      var vf = r.verified || {};
      var ratio = vf.videoWidth ? vf.videoWidth / vf.videoHeight : 0;
      row.notes.push('畫布 ' + r.width + '×' + r.height + '；錄出影片 ' + (vf.videoWidth ? vf.videoWidth + '×' + vf.videoHeight : '讀不到') + '；' + r.mime);
      row.notes.push('時長 ' + r1(r.durationSec) + ' 秒、大小 ' + Math.round(r.size / 1024) + ' KB、平均 ' + r1(r.fpsAvg) + ' fps');
      if (vf.error) row.errors.push('讀不到錄出影片的尺寸：' + vf.error);
      else if (!(vf.videoHeight > vf.videoWidth)) row.errors.push('錄出的影片不是直向：' + vf.videoWidth + '×' + vf.videoHeight);
      else if (Math.abs(ratio / (9 / 16) - 1) > 0.02) row.errors.push('錄出的影片比例不是 9:16（±2%）：' + vf.videoWidth + '×' + vf.videoHeight + '（' + r3(ratio) + '）');
      if (!r.size) row.errors.push('錄出的檔案是空的');
      if (r.warn) row.warns.push(r.warn);
      row.recInfo = KK.Recorder.summary(r);
    } catch (e) {
      row.errors.push('錄影失敗：' + ((e && e.name) || '') + ' ' + msg(e));
      row.recInfo = { error: msg(e) };
    }
    try { if (KK.Recorder.active) await KK.Recorder.active.stop('selftest 清理'); } catch (e) { /* ignore */ }
    try { if (stage) stage.stop(); KK.Camera.stop(); } catch (e) { /* ignore */ }
    cv.remove();
    return finalize(row);
  }

  /* ---------- 主流程 ---------- */
  T.run = async function (root, opts) {
    opts = opts || {};
    document.title = 'SELFTEST RUNNING';
    root.textContent = '';
    root.classList.add('running');
    var wrap = el('div', 'st-wrap');
    root.appendChild(wrap);
    var banner = el('div', 'st-banner run', '檢測中…');
    var sub = el('small', '', '');
    banner.appendChild(sub);
    wrap.appendChild(banner);
    var bar = el('div', 'st-bar'), fill = el('b');
    bar.appendChild(fill); wrap.appendChild(bar);
    var warnBox = el('div', 'st-warns'); warnBox.hidden = true;
    wrap.appendChild(warnBox);
    var rowsBox = el('div', 'st-rows');
    wrap.appendChild(rowsBox);

    // 效能測試用的「跟視窗一樣大」畫布（放在畫面後面，檢測中可以看到動畫）
    var perfCanvas = el('canvas', 'st-perf');
    document.body.appendChild(perfCanvas);

    var rows = [];
    function push(r) { rows.push(r); rowsBox.appendChild(rowEl(r)); }

    // 載入錯誤
    if (window.KK_LOAD_ERRORS && KK_LOAD_ERRORS.length) {
      var lr = newRow('load', '檔案載入');
      KK_LOAD_ERRORS.forEach(function (u) { lr.errors.push('載入失敗：' + u); });
      push(finalize(lr));
    }

    var total = EXPECTED.length + (opts.cam ? 2 : 0), done = 0;
    function progress(label) {
      fill.style.width = Math.round(done / total * 100) + '%';
      sub.textContent = label;
    }

    // 其他不在清單但已定義的濾鏡也一起測
    var ids = EXPECTED.slice();
    (KK.filters || []).forEach(function (d) { if (ids.indexOf(d.id) < 0) { ids.push(d.id); total++; } });

    for (var i = 0; i < ids.length; i++) {
      progress('正在測：' + ids[i] + '（' + (i + 1) + '/' + ids.length + '）');
      await sleep(30);
      var r;
      try { r = await testFilter(ids[i], perfCanvas); }
      catch (e) { r = newRow(ids[i]); r.errors.push('檢測程式例外：' + msg(e)); finalize(r); }
      push(r);
      done++;
    }

    var camera = null, recorder = null;
    if (opts.cam) {
      progress('正在測：相機');
      var cr = await testCamera();
      camera = cr.camInfo;
      push(cr);
      done++;
      progress('正在測：錄影（直式 9:16）');
      var rr = await testRecorder();
      recorder = rr.recInfo;
      push(rr);
      done++;
    } else {
      var skip = newRow('camera', '相機（KK.Camera）');
      skip.notes.push('略過（加 &cam=1 測相機）');
      var se = rowEl(skip);
      se.classList.add('skip');
      rowsBox.appendChild(se);
      camera = { skipped: true };
      var skip2 = newRow('recorder', '錄影（KK.Recorder，直式 9:16）');
      skip2.notes.push('略過（加 &cam=1 測錄影）');
      var se2 = rowEl(skip2);
      se2.classList.add('skip');
      rowsBox.appendChild(se2);
      recorder = { skipped: true };
    }

    perfCanvas.remove();
    root.classList.remove('running');
    progress('完成');
    bar.hidden = true;

    var fails = 0, warns = 0, warnList = [];
    rows.forEach(function (r) {
      fails += r.errors.length ? 1 : 0;
      warns += r.warns.length;
      r.warns.forEach(function (w) { warnList.push(r.name + '：' + w); });
    });
    var pass = fails === 0;
    banner.className = 'st-banner ' + (pass ? 'pass' : 'fail');
    banner.textContent = pass ? '✓ 全部通過' : '✗ 有 ' + fails + ' 項失敗';
    var bsub = el('small', '', warns ? '另有 ' + warns + ' 項黃色警告' : '沒有警告');
    banner.appendChild(bsub);
    if (warnList.length) {
      warnBox.hidden = false;
      warnBox.appendChild(el('b', '', '警告（不影響通過）'));
      var ul = el('ul');
      warnList.forEach(function (w) { ul.appendChild(el('li', '', w)); });
      warnBox.appendChild(ul);
    }

    window.KK_SELFTEST_RESULT = {
      done: true, pass: pass, fails: fails, warns: warns,
      finishedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: innerWidth + '×' + innerHeight, dpr: window.devicePixelRatio || 1,
      rows: rows.map(function (r) {
        return { id: r.id, name: r.name, status: r.status, fps: r.fps, ms: r.ms, errors: r.errors, warns: r.warns, notes: r.notes };
      }),
      camera: camera,
      recorder: recorder,
    };
    document.title = pass ? 'SELFTEST PASS' : 'SELFTEST FAIL';

    // 診斷＋複製
    var diag = el('div', 'st-diag');
    var acts = el('div', 'st-actions');
    var copy = el('button', 'btn big', '複製診斷資訊');
    copy.type = 'button';
    var back = el('a', 'btn', '返回展示頁');
    back.href = location.href.split('?')[0].split('#')[0];
    acts.appendChild(copy); acts.appendChild(back);
    var again = el('a', 'btn', '再跑一次');
    again.href = location.href;
    acts.appendChild(again);
    wrap.appendChild(acts);
    var note = el('p', 'diag-msg', '');
    note.setAttribute('role', 'status');
    wrap.appendChild(note);
    diag.appendChild(el('h2', '', '診斷資訊'));
    var ta = el('textarea');
    ta.readOnly = true; ta.rows = 12; ta.spellcheck = false;
    ta.value = KK_Diag.collect().text;
    diag.appendChild(ta);
    wrap.appendChild(diag);
    copy.addEventListener('click', function () {
      ta.value = KK_Diag.collect().text;
      KK_Diag.copy(ta.value, ta).then(function (ok) {
        note.textContent = ok ? '已複製，可以直接貼給工程師。' : '已幫你選取全部文字，請長按或按 Ctrl/Cmd+C 複製。';
      });
    });
    window.scrollTo(0, 0);
    return window.KK_SELFTEST_RESULT;
  };
})();
