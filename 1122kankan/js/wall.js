/* wall.js — 「大家的看看」: anonymous look-back wall. Data is a static, encrypted snapshot (wall/data.bin). */
(function () {
  'use strict';
  var V = '261124a', ROOT = document.getElementById('wall'), KEY = 'kk-wall-pin';
  var SPRITE = { photoframe: 'familyphoto' };

  function h(tag, attrs, kids) {
    var el = document.createElement(tag), k;
    for (k in attrs || {}) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'on') for (var ev in attrs.on) el.addEventListener(ev, attrs.on[ev]);
      else if (k === 'style') el.setAttribute('style', attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }

  /* ---------- unlock ---------- */
  var blob = null;
  function load() {
    if (blob) return Promise.resolve(blob);
    return fetch('wall/data.bin?v=' + V).then(function (r) {
      if (!r.ok) throw new Error('net');
      return r.arrayBuffer();
    }).then(function (b) { blob = new Uint8Array(b); return blob; });
  }
  function unlock(pin) {
    return load().then(function (b) {
      return crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']).then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b.slice(0, 16), iterations: 150000, hash: 'SHA-256' }, base,
          { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      }).then(function (key) {
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(16, 28) }, key, b.slice(28));
      }).then(function (plain) { return JSON.parse(new TextDecoder().decode(plain)); }, function () { throw new Error('pin'); });
    });
  }

  function gate() {
    var input = h('input', { 'class': 'wl-pin', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4, autocomplete: 'off', 'aria-label': '密碼' });
    var msg = h('p', { 'class': 'wl-msg', role: 'status' });
    var btn = h('button', { 'class': 'btn', type: 'submit', text: '打開' });
    var form = h('form', { on: { submit: function (e) {
      e.preventDefault();
      var pin = input.value.trim();
      if (!pin) return;
      btn.classList.add('is-loading'); msg.textContent = '';
      unlock(pin).then(function (data) {
        try { sessionStorage.setItem(KEY, pin); } catch (_) {}
        render(data);
      }, function (err) {
        btn.classList.remove('is-loading');
        msg.textContent = err.message !== 'pin' ? '讀不到資料，請檢查網路後再試一次。' : '密碼不對喔。';
        input.classList.remove('wl-shake'); void input.offsetWidth; input.classList.add('wl-shake');
        input.select();
      });
    } } }, [input, btn]);
    ROOT.replaceChildren(h('div', { 'class': 'wl-gate' }, [
      h('h1', { text: '大家的看看' }),
      h('p', {}, ['11/22 那天，大家寫下的話和拍下的照片。', h('br'), '請輸入密碼（提示：Kai 生日）。']),
      form, msg
    ]));
    input.focus();
  }

  /* ---------- pieces ---------- */
  function section(label, img, q, sub, scene) {
    var s = h('section', { 'class': 'wl-sec' }, [
      h('img', { 'class': 'wl-banner' + (scene ? ' is-scene' : ''), src: img + '?v=' + V, alt: '', loading: 'lazy' }),
      h('div', { 'class': 'wl-head' }, [
        h('span', { 'class': 'wl-label', text: label }),
        h('h2', { 'class': 'wl-q', text: q }),
        sub ? h('p', { 'class': 'wl-sub', text: sub }) : null
      ])
    ]);
    ROOT.appendChild(s);
    return s;
  }

  function overlay(kids) {
    var ov = h('div', { 'class': 'wl-ov', role: 'dialog', 'aria-modal': 'true' }, kids);
    function close() { ov.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); if (ov.onArrow && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ov.onArrow(e.key === 'ArrowLeft' ? -1 : 1); }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    ov.close = close;
    return ov;
  }

  function showNote(list, i) {
    var big = h('div', { 'class': 'wl-big' });
    function set(n) { i = n; big.replaceChildren(list[i][0], h('span', { 'class': 'wl-by', text: '— ' + list[i][1] }), reply(list[i])); big.classList.toggle('is-long', list[i][0].length > 110); big.scrollTop = 0;
      big.style.animation = 'none'; void big.offsetWidth; big.style.animation = ''; }
    var ov = overlay([big, h('div', { 'class': 'wl-ovbtns' }, [
      list.length > 1 ? h('button', { 'class': 'btn small', type: 'button', text: '再抽一張', on: { click: function () {
        var n; do { n = Math.floor(Math.random() * list.length); } while (n === i); set(n);
      } } }) : null,
      h('button', { 'class': 'btn small ghost', type: 'button', text: '關閉', on: { click: function () { ov.close(); } } })
    ])]);
    set(i);
  }

  function reply(t) {   // Kai's answer to this note, when there is one
    return t[2] ? h('span', { 'class': 'wl-reply' }, [h('b', { text: 'Kai 的回覆' }), t[2]]) : null;
  }

  function notes(sec, list) {
    if (!list.length) return;
    sec.querySelector('.wl-head').appendChild(h('button', { 'class': 'btn small wl-draw', type: 'button', text: '抽一張', on: { click: function () {
      showNote(list, Math.floor(Math.random() * list.length));
    } } }));
    sec.appendChild(h('div', { 'class': 'wl-notes' }, list.map(function (t, i) {
      var r = ((i * 37) % 9 - 4) * 0.7;            // steady little tilt per note
      return h('button', { 'class': 'wl-note' + (t[0].length > 110 ? ' is-long' : ''), type: 'button', style: '--r:' + r + 'deg',
        on: { click: function () { showNote(list, i); } } }, [t[0], h('span', { 'class': 'wl-by', text: '— ' + t[1] }), t[2] ? h('span', { 'class': 'wl-replied', text: 'Kai 回覆了' }) : null]);   // the reply itself only shows when the note is opened
    })));
  }

  function bar(cls, img, name, value, max, valueText) {
    var w = pct(value, max) + '%';
    var fill = h('i', { 'class': 'wl-fill', 'data-w': w });
    return h('div', { 'class': cls }, [
      img,
      h('div', {}, [name ? h('div', { 'class': 'nm', text: name }) : null,
        h('div', { 'class': 'wl-track', style: '--w:' + w }, [fill, h('span', { 'class': 'wl-val', text: valueText })])])
    ]);
  }

  function report(sec, s) {
    var n = s.n, keys = Object.keys(s.counts).sort(function (a, b) { return s.counts[b] - s.counts[a]; });
    var top = keys[0], last = keys[keys.length - 1], nm = function (k) { return s.names[k].replace(/^一[個把包顆套]/, '').replace(/（.*）/, ''); };
    var maxSize = Math.max.apply(null, s.sizes);
    var finds = [
      ['「' + nm(top) + '」登艦率 ' + pct(s.counts[top], n) + '%（' + s.counts[top] + '/' + n + '），全場第一。',
        s.onlyPhoto ? '其中 ' + s.onlyPhoto + ' 位的行李箱裡只有相框，其他什麼都沒帶。' : ''],
      s.guitarWithPhoto[1] && s.guitarWithPhoto[0] === s.guitarWithPhoto[1]
        ? ['帶吉他的 ' + s.guitarWithPhoto[1] + ' 個人，全部都帶了全家福（' + s.guitarWithPhoto[0] + '/' + s.guitarWithPhoto[1] + '）。', '本研究無法解釋，但覺得很感人。'] : null,
      s.smokeWithHeadphones[1] ? ['帶菸的 ' + s.smokeWithHeadphones[1] + ' 個人裡，有 ' + s.smokeWithHeadphones[0] + ' 個同時帶了全罩耳機。', '推測：太空已經很安靜了，但他們想要更安靜。'] : null,
      s.dressWithChips[1] ? ['「' + nm(last) + '」登艦率最低（' + s.counts[last] + '/' + n + '）。', '但帶洋裝的 ' + s.dressWithChips[1] + ' 個人裡有 ' + s.dressWithChips[0] + ' 個也帶了洋芋片：要好看，也要吃飽。'] : null,
      [s.sizes[10] + ' 個人十樣全帶（我全都要派），' + s.sizes[0] + ' 個人什麼都沒帶（人到就好派）。', '平均每人 ' + s.avg + ' 件。'],
      s.nineLeftOut.length ? ['只差一樣就全帶的人，最後留在地球上的是：' + s.nineLeftOut.map(function (p) { return nm(p[0]); }).join('、') + '。', ''] : null
    ].filter(Boolean);

    sec.appendChild(h('article', { 'class': 'wl-report' }, [
      h('h3', { text: '太空行李箱調查報告' }),
      h('p', { 'class': 'wl-meta', text: '樣本數 n = ' + n + '｜2026.11.22｜沐月書店｜方法：請大家收行李' }),
      h('h4', { text: '摘要' }),
      h('p', { text: '本研究邀請 ' + n + ' 位受試者，為一趟可能回不來的太空旅行打包。結果顯示：人類上太空最想帶的不是求生用品，是' + nm(top) + '。' }),
      h('h4', { text: '圖一　各物品登艦率' }),
      h('div', { 'class': 'wl-fig' }, keys.map(function (k, i) {
        return bar('wl-bar' + (i === 0 ? ' is-top' : ''), h('img', { src: 'assets/suitcase/' + (SPRITE[k] || k) + '.png?v=' + V, alt: '', loading: 'lazy' }),
          nm(k), s.counts[k], n, s.counts[k] + ' 人・' + pct(s.counts[k], n) + '%');
      })),
      h('h4', { text: '圖二　每個人帶了幾樣' }),
      h('div', { 'class': 'wl-fig' }, [
        h('div', { 'class': 'wl-hist' }, s.sizes.map(function (c, i) {
          return h('div', { 'class': i === 0 || i === 10 ? 'is-edge' : '', 'data-h': (maxSize ? c / maxSize * 100 : 0) + '%' }, [c ? h('span', { text: String(c) }) : null]);
        })),
        h('div', { 'class': 'wl-axis' }, s.sizes.map(function (_, i) { return h('span', { text: String(i) }); })),
        h('p', { 'class': 'wl-cap', text: '橫軸：行李件數　直條：人數' })
      ]),
      h('h4', { text: '主要發現' }),
      h('ol', {}, finds.map(function (f) { return h('li', {}, [h('strong', { text: f[0] }), f[1]]); })),
      h('h4', { text: '結論' }),
      h('p', { text: '人上了太空，最放不下的還是家人；其次是書和音樂。足球和洋裝，就留給地球。' }),
      h('p', { 'class': 'wl-foot', text: '研究限制：樣本全部是 Kai 的朋友，可能無法代表全人類。行李箱沒有重量限制，也沒有人問太空能不能抽菸。' })
    ]));
  }

  function yesno(sec, y) {
    sec.appendChild(h('div', { 'class': 'wl-stats' }, [
      h('div', { 'class': 'wl-stat' }, [h('b', { text: String(y.n) }), h('span', { text: '個人最後都說了 Yes' })]),
      h('div', { 'class': 'wl-stat' }, [h('b', { text: String(y.straight) }), h('span', { text: '個人第一下就按 Yes' })]),
      h('div', { 'class': 'wl-stat' }, [h('b', { text: String(y.total) }), h('span', { text: '次，No 逃跑的總次數' })])
    ]));
    if (!y.top.length) return;
    var max = y.top[0].n;
    sec.appendChild(h('div', { 'class': 'wl-board' }, [
      h('h3', { text: 'No 逃跑排行榜' }),
      h('p', { 'class': 'wl-sub', text: '追著 No 按了幾次，才肯放下面子' })
    ].concat(y.top.map(function (p, i) {
      var row = bar('wl-rank', h('span', { 'class': 'no', text: String(i + 1) }), '', p.n, max * 1.25, p.n + ' 次');
      row.insertBefore(h('span', { 'class': 'who', text: p.name }), row.children[1]);
      return row;
    }))));
  }

  function photos(sec, media, crop) {
    function open(i) {
      var lens = h('div', { 'class': 'wl-lens' });
      function set(n) {
        i = (n + media.length) % media.length;
        var m = media[i];
        lens.replaceChildren(m.k === 'v'
          ? h('video', { src: 'wall/m/' + m.f + '.mp4', poster: 'wall/m/' + m.f + '_s.jpg', controls: '', autoplay: '', loop: '', playsinline: '', style: 'width:' + (100 / crop) + '%' })
          : h('img', { src: 'wall/m/' + m.f + '.jpg', alt: '觀眾拍的照片' }));
      }
      var ov = overlay([lens, h('div', { 'class': 'wl-ovbtns' }, [
        h('button', { 'class': 'btn small ghost', type: 'button', text: '上一張', on: { click: function () { set(i - 1); } } }),
        h('button', { 'class': 'btn small ghost', type: 'button', text: '關閉', on: { click: function () { ov.close(); } } }),
        h('button', { 'class': 'btn small ghost', type: 'button', text: '下一張', on: { click: function () { set(i + 1); } } })
      ])]);
      ov.onArrow = function (d) { set(i + d); };
      set(i);
    }
    sec.appendChild(h('div', { 'class': 'wl-photos' }, media.map(function (m, i) {
      return h('button', { 'class': 'wl-ph' + (m.k === 'v' ? ' is-video' : ''), type: 'button', 'aria-label': m.k === 'v' ? '播放影片' : '放大照片', on: { click: function () { open(i); } } },
        [h('img', { src: 'wall/m/' + m.f + '_s.jpg', alt: '', loading: 'lazy' })]);
    })));
  }

  /* ---------- the buttons of the show's last page (no filters, no LINE) ---------- */
  var ICON = {
    music: '<path d="M19 34V12l18-4v22"/><ellipse cx="14" cy="34" rx="5" ry="4"/><ellipse cx="32" cy="30" rx="5" ry="4"/>',
    pod: '<rect x="18" y="7" width="12" height="20" rx="6"/><path d="M11 22a13 13 0 0 0 26 0"/><path d="M24 35v6"/><path d="M17 41h14"/>',
    pic: '<rect x="8" y="11" width="32" height="26" rx="4"/><circle cx="17.5" cy="20" r="3"/><path d="M9 33l9-8 6 5 7-8 8 9"/>',
    coffee: '<path d="M9 18h24v9c0 6-4.5 10-12 10S9 33 9 27z"/><path d="M33 20h3.5a4.5 4.5 0 0 1 0 9H32"/><path d="M15 8c-1.5 2 1.5 3 0 5M22 8c-1.5 2 1.5 3 0 5M29 8c-1.5 2 1.5 3 0 5"/>'
  };
  function openUrl(u) { if (u) window.open(u, '_blank', 'noopener'); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dlList() {
    var L = [['00-看看', 'assets/cover-illust.jpg']];
    [4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32].forEach(function (n) { L.push([pad(n) + '-歌詞', 'assets/lyrics-bg/' + pad(n) + '.jpg']); });
    [9, 13, 15, 21, 29, 31].forEach(function (n) { L.push([pad(n) + '-問答', 'assets/page-bg/' + pad(n) + '.jpg']); });
    [[5, 's05-park'], [7, 's07-escalator'], [17, 's17-bridge'], [19, 's19-moumoon'], [23, 's23-office'], [25, 's25-fireworks'], [27, 's27-nyc']]
      .forEach(function (x) { L.push([pad(x[0]) + '-凱凱在哪裡', 'assets/scenes/' + x[1] + '.jpg']); });
    return L.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
  }
  function zipStore(files) {   // [{name, bytes}] -> zip Blob, stored without compression (same as the last page of the show)
    var T = [], c, n, k, enc = new TextEncoder(), parts = [], cen = [], off = 0;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
    files.forEach(function (f) {
      var nm = enc.encode(f.name), d = f.bytes, crc = 0xFFFFFFFF, i;
      for (i = 0; i < d.length; i++) crc = T[(crc ^ d[i]) & 255] ^ (crc >>> 8);
      crc = (crc ^ 0xFFFFFFFF) >>> 0;
      var hd = new DataView(new ArrayBuffer(30)); hd.setUint32(0, 0x04034b50, true); hd.setUint16(4, 20, true); hd.setUint16(6, 0x0800, true); hd.setUint32(14, crc, true); hd.setUint32(18, d.length, true); hd.setUint32(22, d.length, true); hd.setUint16(26, nm.length, true);
      var e = new DataView(new ArrayBuffer(46)); e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint32(16, crc, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, nm.length, true); e.setUint32(42, off, true);
      parts.push(hd.buffer, nm, d); cen.push(e.buffer, nm); off += 30 + nm.length + d.length;
    });
    var cs = 0; cen.forEach(function (x) { cs += x.byteLength; });
    var z = new DataView(new ArrayBuffer(22)); z.setUint32(0, 0x06054b50, true); z.setUint16(8, files.length, true); z.setUint16(10, files.length, true); z.setUint32(12, cs, true); z.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [z.buffer]), { type: 'application/zip' });
  }
  function coffee(cfg) {
    var link = cfg.COFFEE_LINK || cfg.CTBC_URL || '';
    var ov = overlay([h('div', { 'class': 'wl-coffee' }, [
      h('h3', { text: '請 Kai 喝咖啡' }),
      h('img', { src: 'assets/ctbc-qr-crop.png', alt: '中信付款碼', on: { click: function () { openUrl(link); } } }),
      h('div', { 'class': 'acct', text: String(cfg.CTBC_ACCOUNT || '').replace(/\s*中國信託.*$/, '').trim() }),
      h('p', { text: '長按圖片可以下載／點圖片直接打開中信轉帳' }),
      h('button', { 'class': 'btn small', type: 'button', text: '打開中信轉帳', on: { click: function () { openUrl(link); } } })
    ]), h('button', { 'class': 'btn small ghost', type: 'button', text: '關閉', on: { click: function () { ov.close(); } } })]);
  }
  function links() {
    var cfg = window.DAYOF_CONFIG || {}, files = null, busy = false, dlLabel;
    function zip() {
      return Promise.all(files.map(function (f) { return f.blob.arrayBuffer().then(function (ab) { return { name: f.name, bytes: new Uint8Array(ab) }; }); })).then(function (list) {
        var url = URL.createObjectURL(zipStore(list)), a = h('a', { href: url, download: '看看-插畫.zip' });
        document.body.appendChild(a); a.click();
        setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
      });
    }
    function download() {
      if (busy) return;
      if (!files) {            // fetch first; sharing needs a fresh tap afterwards
        busy = true; dlLabel.textContent = '準備中…';
        Promise.all(dlList().map(function (it) {
          return fetch(it[1]).then(function (r) { if (!r.ok) throw new Error(it[1]); return r.blob(); }).then(function (b) { return { name: '看看-' + it[0] + '.jpg', blob: b }; });
        })).then(function (fs) { files = fs; busy = false; dlLabel.textContent = '好了，再點一次'; },
          function () { busy = false; dlLabel.textContent = '載入失敗，再點一次'; });
        return;
      }
      var fl = []; try { fl = files.map(function (f) { return new File([f.blob], f.name, { type: 'image/jpeg' }); }); } catch (e) { fl = []; }
      var done = function () { dlLabel.textContent = '帶走插畫'; };
      if (fl.length && navigator.canShare && navigator.share && navigator.canShare({ files: fl })) {
        navigator.share({ files: fl }).then(done, function (e) { done(); if (!e || e.name !== 'AbortError') zip(); });
      } else zip().then(done, done);
    }
    function item(cls, icon, label, fn) {
      var ico = h('span', { 'class': 'ico' }); ico.innerHTML = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + ICON[icon] + '</svg>';
      var lab = h('span', { 'class': 'lab', text: label });
      return [h('button', { 'class': 'wl-link ' + cls, type: 'button', on: { click: fn } }, [ico, lab]), lab];
    }
    var dl = item('is-dl', 'pic', '帶走插畫', download); dlLabel = dl[1];
    return h('div', { 'class': 'wl-links' }, [
      item('is-music', 'music', '那天的歌', function () { openUrl(cfg.PLAYLIST_URL || 'https://youtube.com/playlist?list=PLSYxzFWN7gR8&si=jkl7Pm1J-VsRj6sR'); })[0],
      item('is-pod', 'pod', '聽 Kai 聊聊', function () { openUrl(cfg.PODCAST_URL || 'https://open.firstory.fm/story/cmq50b0nv002m01zlfkhc0a1j'); })[0],
      dl[0],
      item('is-coffee', 'coffee', '請 Kai 喝咖啡', function () { coffee(cfg); })[0]
    ]);
  }

  /* ---------- page ---------- */
  function render(d) {
    var T = d.questionTexts, total = 0, k;
    for (k in d.texts) total += d.texts[k].length;
    var nPhoto = d.media.filter(function (m) { return m.k === 'p'; }).length, nVideo = d.media.length - nPhoto;
    ROOT.replaceChildren(h('header', { 'class': 'wl-hero' }, [
      h('img', { src: 'assets/key-visual.jpg?v=' + V, alt: '《看看》主視覺' }),
      h('h1', { text: '大家的看看' }),
      h('p', {}, ['2026.11.22　沐月書店', h('br'),
        '這一天，', h('b', { text: String(d.people) }), '個人一起看看，留下了', h('b', { text: String(total) }), '張紙條、',
        h('b', { text: String(nPhoto) }), '張照片和', h('b', { text: String(nVideo) }), '段影片。', h('br'),
        '紙條只留下名字的頭尾兩個字，順序也打散了。點任何一張可以放大。'])
    ]));

    notes(section('第 9 頁', 'assets/page-bg/09.jpg', T.q9), d.texts.q9);
    report(section('第 11 頁', 'assets/scenes/s11-suitcase.jpg', T.suitcase, '', true), d.suitcase);
    yesno(section('第 13 頁', 'assets/page-bg/13.jpg', T.yes13), d.yes);
    notes(section('第 15 頁', 'assets/page-bg/15.jpg', T.q15), d.texts.q15);
    notes(section('第 21 頁', 'assets/page-bg/21.jpg', T.q21, d.huh.q21 ? '另外有 ' + d.huh.q21 + ' 個人按了「蛤？」' : ''), d.texts.q21);
    photos(section('第 29 頁', 'assets/page-bg/29.jpg', '大家眼中的這一天', '魚眼相機拍下的 ' + nPhoto + ' 張照片、' + nVideo + ' 段影片'), d.media, d.crop);
    notes(section('第 31 頁', 'assets/page-bg/31.jpg', T.q31), d.texts.q31);

    ROOT.appendChild(h('footer', { 'class': 'wl-end' }, [h('strong', { text: '謝謝你來看看' }), '《看看》Kai 的生日音樂會', links()]));
    // production credits, kept quiet at the very bottom (same data file as the show's credits page)
    fetch('data/credits.json?v=' + V).then(function (r) { return r.json(); }).then(function (c) {
      var items = [];
      (c.sections || []).forEach(function (sec) { (sec.items || []).forEach(function (it) { items.push(it); }); });
      if (!items.length) return;
      ROOT.appendChild(h('div', { 'class': 'wl-credits' }, [h('span', { 'class': 'ttl', text: '製作名單' })].concat(items.map(function (it) {
        return h('span', {}, [it.role + ' ', h('b', { text: it.name })]);
      }))));
    }).catch(function () {});

    // charts grow when scrolled into view
    var grow = function (el) {
      el.querySelectorAll('.wl-fill').forEach(function (f) { f.style.width = f.getAttribute('data-w'); });
      el.querySelectorAll('.wl-hist div').forEach(function (b) { b.style.height = b.getAttribute('data-h'); });
    };
    var figs = ROOT.querySelectorAll('.wl-fig,.wl-board');
    if (!('IntersectionObserver' in window)) { figs.forEach(grow); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { grow(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    figs.forEach(function (f) { io.observe(f); });
    window.scrollTo(0, 0);
  }

  var saved = null;
  try { saved = sessionStorage.getItem(KEY); } catch (_) {}
  if (saved) unlock(saved).then(render, gate); else gate();
})();
