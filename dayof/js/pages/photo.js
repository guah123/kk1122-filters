/* 第 29 頁（type 'photo'）：「現在就拍一張照吧，我也想看看你的世界」→［拍照］開魚眼相機
 * → 拍好按「用這張」：存到手機（相機覆蓋層在點擊當下觸發分享單／下載）＋這頁顯示照片（iPhone 可長按儲存）＋上傳雲端
 * → ［拍完了］→ ctx.next()。相機打不開時顯示「沒辦法拍照？直接下一頁」。
 * 後台未接（api.enabled=false）：照片先存在本機 localStorage（DAYOF.PhotoQueue），state.photo.queued=true，
 *   （v=261116x：上傳狀態一律不顯示文字，靜默處理）；app.js 開機時可呼叫 DAYOF.PhotoQueue.retry(email, api, state) 補傳。 */
(function () {
  'use strict';
  window.DAYOF = window.DAYOF || {}; var DAYOF = window.DAYOF;
  DAYOF._pages = DAYOF._pages || {};
  DAYOF.registerPage = DAYOF.registerPage || function (t, m) { DAYOF._pages[t] = m; };

  var TEXT = '現在就拍一張照吧，我也想看看你的世界';
  var MAX_EDGE = 1600;
  var QKEY = function (email) { return 'dayof:v1:photoq:' + String(email || '').toLowerCase(); };

  DAYOF.PhotoQueue = {
    put: function (email, dataUrl) { try { localStorage.setItem(QKEY(email), dataUrl); return true; } catch (e) { return false; } },
    get: function (email) { try { return localStorage.getItem(QKEY(email)); } catch (e) { return null; } },
    clear: function (email) { try { localStorage.removeItem(QKEY(email)); } catch (e) { /* ignore */ } },
    /* 後台接上後補傳：成功就寫回 state.photo.driveFileId 並清掉暫存 */
    retry: function (email, api, state) {
      var d = DAYOF.PhotoQueue.get(email);
      if (!d || !api || !api.enabled || !api.photo) return Promise.resolve(null);
      return api.photo(email, d).then(function (r) {
        if (r && r.ok) {
          state.photo = Object.assign(state.photo || {}, { driveFileId: r.fileId || null, queued: false, uploadError: undefined });
          DAYOF.PhotoQueue.clear(email);
        }
        return r;
      }, function () { return null; });
    },
  };

  /* 長邊超過 1600 就縮圖，重新壓成 JPEG 0.85 */
  function shrink(dataUrl) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, MAX_EDGE / Math.max(w, h));
        if (k >= 1) { resolve(dataUrl); return; }
        var c = document.createElement('canvas');
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL('image/jpeg', 0.85)); } catch (e) { resolve(dataUrl); }
      };
      img.onerror = function () { resolve(dataUrl); };
      img.src = dataUrl;
    });
  }

  DAYOF.registerPage('photo', {
    render: function (container, ctx) {
      var state = ctx.state || {};
      var email = state.email || '';
      var api = ctx.api || DAYOF.api || null;
      var alive = true, objUrl = '';

      var wrap = document.createElement('div');
      wrap.className = 'photo-wrap paper-bg';
      wrap.innerHTML =
        '<div class="photo-lens" aria-hidden="true"></div>' +
        '<p class="photo-text"></p>' +
        '<div class="photo-result" hidden>' +
        '  <img class="photo-img" alt="你拍的照片">' +
        '  <p class="photo-hint">長按照片可以存到相簿</p>' +
        '</div>' +
        '<p class="photo-status" role="status"></p>' +
        '<div class="photo-actions">' +
        '  <button type="button" class="btn photo-btn photo-done" hidden>拍完了</button>' +
        '  <button type="button" class="btn photo-btn photo-shoot">拍照</button>' +
        '  <button type="button" class="photo-skip" hidden>沒辦法拍照？直接下一頁</button>' +
        '</div>';
      container.appendChild(wrap);
      var $ = function (s) { return wrap.querySelector(s); };
      var ptxt = (ctx.step && (ctx.step.text || ctx.step.q)) || TEXT;
      if (DAYOF.punctLines) DAYOF.punctLines($('.photo-text'), ptxt); else $('.photo-text').textContent = ptxt;
      var stack = null; // v=261116y (Kai): no filter stack on 29 (lyrics pages only)
      var shootBtn = $('.photo-shoot'), doneBtn = $('.photo-done'), skip = $('.photo-skip');
      /* v=261116y (Kai): no 「存到相簿」 retry button on the result page — saving happens via the share sheet on 用這張
         (camera overlay); if that was cancelled the photo can still be long-pressed here */
      function watchSave(info) {
        if (!info || !info.promise) return;
        info.promise.then(function (out) { if (alive && out === 'shared' && ctx.toast) ctx.toast('已存到相簿'); }, function () {});
      }
      var result = $('.photo-result'), img = $('.photo-img'), status = $('.photo-status');

      function setStatus(msg, ok) { status.textContent = msg || ''; status.classList.toggle('ok', !!ok); }
      function showPhoto(src) {
        img.src = src;
        result.hidden = false;
        wrap.classList.add('has-photo');
        shootBtn.textContent = '再拍一張';
        shootBtn.classList.add('ghost');
        doneBtn.hidden = false;
      }

      // 回到這頁時：已經拍過 → 直接可以「拍完了」，有暫存就顯示照片
      if (state.photo && state.photo.at) {
        var q = DAYOF.PhotoQueue.get(email);
        if (q) showPhoto(q); else { doneBtn.hidden = false; shootBtn.textContent = '再拍一張'; shootBtn.classList.add('ghost'); }
      }

      function upload(dataUrl) {
        var rec = { at: Date.now(), savedLocal: true, driveFileId: null, queued: false };
        state.photo = rec;
        if (!api || !api.enabled || !api.photo) {
          rec.queued = true;
          DAYOF.PhotoQueue.put(email, dataUrl);
          if (ctx.save) ctx.save();
          return;
        }
        if (ctx.save) ctx.save();
        api.photo(email, dataUrl).then(function (r) {
          if (r && r.ok) {
            rec.driveFileId = r.fileId || null;
            DAYOF.PhotoQueue.clear(email);

          } else if (r && r.offline) {
            rec.queued = true; DAYOF.PhotoQueue.put(email, dataUrl);

          } else {
            rec.uploadError = String((r && r.error) || '上傳失敗'); rec.queued = true; DAYOF.PhotoQueue.put(email, dataUrl);

          }
          if (ctx.save) ctx.save();
        }, function (e) {
          rec.uploadError = String((e && e.message) || e); rec.queued = true; DAYOF.PhotoQueue.put(email, dataUrl);
          if (ctx.save) ctx.save();

        });
      }

      shootBtn.addEventListener('click', function () {
        if (!DAYOF.Camera) { skip.hidden = false; setStatus('相機功能載入失敗'); return; }
        DAYOF.Camera.open({
          filter: 'fish', mode: 'photo', stepNo: (ctx.step && ctx.step.n) || 29,
          onPhoto: function (blob, dataUrl, info) {
            if (!alive) return;
            showPhoto(dataUrl);
            watchSave(info);
            if (info && info.method === 'none') setStatus('自動儲存沒成功，請長按照片存到相簿');
            shrink(dataUrl).then(function (d) { if (alive) upload(d); });
          },
        }).then(function (res) {
          if (!alive) return;
          if (res && res.error && !res.photo) { skip.hidden = false; if (!state.photo) setStatus('相機沒有打開也沒關係'); }
        });
      });
      doneBtn.addEventListener('click', function () { ctx.next(); });
      skip.addEventListener('click', function () { ctx.next(); });

      return function cleanup() {
        alive = false;
        if (DAYOF.Camera && DAYOF.Camera.isOpen()) DAYOF.Camera.close();
        if (stack) stack.destroy();
        if (objUrl) { try { URL.revokeObjectURL(objUrl); } catch (e) { /* ignore */ } }
      };
    },
  });
})();
