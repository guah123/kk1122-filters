/* 藏在每個濾鏡裡的小動物（占位）。
 * ★ 預設 kind='duo'：Kai 牽著小袋熊（Kai 自己的插圖，KK.Art.duoSmall，已去旗子；黑線＋白肚，不改線條）。
 *   'kai' = 只有小袋熊（KK.Art.wombat）；'wombat'/'cat' = 舊的向量占位；可用 ?critter=cat 切換。
 *   圖片版的 color/eyeColor 無效；改用 opts.alpha（預設 0.75）與 opts.tone（0..1，把白肚往暗色壓，預設 0.35）。
 *   facing 1 = 原圖方向（往右走）；'peek' 只畫上半身（y = 遮蔽物邊緣）。
 * ★ 要換動物，只改這個檔案：
 *   1. 改 KK.Critter.kind = 'duo' | 'kai' | 'wombat' | 'cat' | 'svg'
 *      （或網址加 ?critter=cat 試看看）
 *   2. 若設計師畫好了，存成 assets/critter.svg（單色剪影、站在底線上、面向右），
 *      kind 設成 'svg' 即可，所有濾鏡會自動換掉。
 * 所有濾鏡只呼叫 KK.Critter.draw(ctx, x, y, size, opts)：
 *   x,y = 腳底中心點；size = 坐姿高度（像素）
 *   opts = { pose: 'sit'|'lookup'|'walk'|'peek'|'wave', facing: 1|-1, color, alpha, t, eye }
 */
(function () {
  'use strict';
  const KK = window.KK;
  const C = (KK.Critter = { kind: 'duo', visible: true });

  try {
    const q = new URLSearchParams(location.search).get('critter');
    if (q && ['duo', 'kai', 'wombat', 'cat', 'svg'].indexOf(q) >= 0) C.kind = q; // ?critter=1/0 是開關，不是種類
  } catch (e) { /* ignore */ }

  function ell(ctx, x, y, rx, ry, rot) {
    ctx.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0));
    ctx.ellipse(x, y, rx, ry, rot || 0, 0, KK.TAU);
  }

  function rr(ctx, x, y, w, h, r) { // 圓角矩形（與 ell 同繞向，nonzero 下會正確聯集）
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 袋熊的頭（局部座標，原點 = 頭中心，單位 = hr）：寬扁的頭＋兩側小圓耳＋略凸的方圓鼻頭 */
  function wombatHead(ctx, hr, small, front) {
    const e = small ? 1.35 : 1;
    ell(ctx, 0, 0, hr * (front ? 1.3 : 1.2), hr * (front ? 0.72 : 0.78), 0);
    if (front) { // 正面（peek）：寬頭＋雙耳在兩側頂端
      ell(ctx, -hr * 0.92, -hr * 0.5, hr * 0.2 * e, hr * 0.2 * e, 0);
      ell(ctx, hr * 0.92, -hr * 0.5, hr * 0.2 * e, hr * 0.2 * e, 0);
    } else { // 側面：兩個小耳靠頭頂兩側（一前一後）
      ell(ctx, -hr * 0.45, -hr * 0.66, hr * 0.2 * e, hr * 0.2 * e, 0);
      ell(ctx, hr * 0.32, -hr * 0.7, hr * 0.2 * e, hr * 0.2 * e, 0);
      rr(ctx, hr * 0.78, -hr * 0.3, hr * 0.7, hr * 0.78, hr * 0.3); // 寬鼻頭
    }
  }

  /* ---- 袋熊：吐司形身體、寬扁頭、極短四肢 ---- */
  function wombat(ctx, o, t, size) {
    const pose = o.pose || 'sit';
    const small = (size || 100) < 44;
    ctx.beginPath();
    let hx, hy, hr = 0.25, tilt = 0, front = false;
    if (pose === 'walk') {
      const step = Math.sin(t * KK.TAU * 2.2);
      ell(ctx, -0.08, -0.34, 0.5, 0.27, 0.03); // 圓吐司
      ell(ctx, 0.3, -0.37, 0.27, 0.24, 0);
      const legs = [[-0.4, 1], [-0.22, -1], [0.18, -1], [0.36, 1]];
      for (const [lx, ph] of legs) {
        const dx = step * ph * 0.05, lift = Math.max(0, step * ph) * 0.025;
        rr(ctx, lx + dx - 0.075, -0.2, 0.15, 0.2 - lift, 0.07);
      }
      hx = 0.5; hy = -0.37 + Math.abs(step) * 0.01; hr = 0.23; tilt = 0.1;
    } else if (pose === 'peek') {
      front = true; hr = 0.3; hx = 0; hy = -0.18;
    } else {
      // 坐姿：屁股坐地、圓吐司微前傾；頭在前上方
      ell(ctx, -0.08, -0.31, 0.46, 0.3, -0.22);
      ell(ctx, -0.2, -0.2, 0.3, 0.2, 0); // 圓屁股
      ell(ctx, 0.2, -0.4, 0.22, 0.2, 0); // 胸口圓弧，與頭融成一體（沒有脖子）
      ell(ctx, -0.12, -0.05, 0.2, 0.06, 0); // 後腳掌
      ell(ctx, 0.3, -0.05, 0.12, 0.055, 0); // 前腳掌
      rr(ctx, 0.2, -0.28, 0.2, 0.24, 0.09); // 短短的前肢
      hx = 0.3; hy = -0.5; hr = 0.29;
      if (pose === 'lookup') { hx = 0.27; hy = -0.53; tilt = -0.5; }
      if (pose === 'wave') {
        const a = -0.3 + Math.sin(t * KK.TAU * 1.6) * 0.3;
        const sx = 0.36, sy = -0.17;
        ell(ctx, sx + Math.cos(a) * 0.11, sy + Math.sin(a) * 0.11, 0.08, 0.19, a + Math.PI / 2);
      }
    }
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(tilt);
    wombatHead(ctx, hr, small, front);
    ctx.restore();
    ctx.fill();
    const eyes = front ? [[-hr * 0.55, -hr * 0.1], [hr * 0.55, -hr * 0.1]] : [[hr * 0.5, -hr * 0.22]];
    return { headX: hx, headY: hy, headR: hr, tilt, eyes };
  }

  /* ---- 貓：側面、尖耳、長尾巴 ---- */
  function cat(ctx, o, t, size) {
    const pose = o.pose || 'sit';
    const small = (size || 100) < 44;
    ctx.beginPath();
    let hx = 0.14, hy = -0.76, hr = 0.2, tilt = 0, front = false;
    let tail = null;
    if (pose === 'walk') {
      const step = Math.sin(t * KK.TAU * 2.2);
      ell(ctx, -0.04, -0.36, 0.4, 0.17, 0);
      ell(ctx, 0.28, -0.4, 0.16, 0.17, 0);
      const legs = [[-0.32, 1], [-0.2, -1], [0.14, -1], [0.28, 1]];
      for (const [lx, ph] of legs) {
        const dx = step * ph * 0.06, lift = Math.max(0, step * ph) * 0.04;
        rr(ctx, lx + dx - 0.045, -0.3, 0.09, 0.3 - lift, 0.045);
      }
      hx = 0.5; hy = -0.48; hr = 0.17;
      const sw = Math.sin(t * KK.TAU * 1.1) * 0.05;
      tail = [[-0.4, -0.4], [-0.62, -0.4], [-0.58 + sw, -0.66], [-0.46 + sw, -0.76]];
    } else if (pose === 'peek') {
      front = true; hr = 0.24; hx = 0; hy = -0.17;
    } else {
      ell(ctx, -0.1, -0.2, 0.28, 0.2, 0); // 蹲坐的後腿圓
      ell(ctx, 0.04, -0.42, 0.19, 0.34, -0.12); // 胸身
      ell(ctx, 0.2, -0.04, 0.1, 0.045, 0); // 前掌
      rr(ctx, 0.12, -0.4, 0.1, 0.38, 0.045); // 前腳
      hx = 0.14; hy = -0.76;
      if (pose === 'lookup') { hx = 0.15; hy = -0.78; tilt = -0.5; }
      if (pose === 'wave') {
        const a = -0.55 + Math.sin(t * KK.TAU * 1.6) * 0.3;
        ell(ctx, 0.18 + Math.cos(a) * 0.1, -0.33 + Math.sin(a) * 0.1, 0.06, 0.17, a + Math.PI / 2);
      }
      const sw = Math.sin(t * KK.TAU * 0.8) * 0.03;
      // 尾巴從屁股貼地繞到身體前面，尾尖微翹
      tail = [[-0.34, -0.1], [-0.4, 0.01], [0.3, 0.01], [0.5 + sw, -0.16]];
    }
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(tilt);
    ell(ctx, 0, 0, hr * 1.12, hr * 0.98, 0);
    const k = small ? 1.15 : 1;
    ctx.moveTo(-hr * 0.98, -hr * 0.2); // 尖耳（繞向要與橢圓一致，否則聯集會挖洞）
    ctx.lineTo(-hr * 0.8, -hr * 1.5 * k);
    ctx.lineTo(-hr * 0.1, -hr * 0.85);
    ctx.closePath();
    ctx.moveTo(hr * 0.1, -hr * 0.85);
    ctx.lineTo(hr * 0.8, -hr * 1.5 * k);
    ctx.lineTo(hr * 0.98, -hr * 0.2);
    ctx.closePath();
    ctx.restore();
    ctx.fill();
    if (tail) {
      ctx.beginPath();
      ctx.moveTo(tail[0][0], tail[0][1]);
      ctx.bezierCurveTo(tail[1][0], tail[1][1], tail[2][0], tail[2][1], tail[3][0], tail[3][1]);
      ctx.lineWidth = small ? 0.1 : 0.075;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    const eyes = front ? [[-hr * 0.45, -hr * 0.05], [hr * 0.45, -hr * 0.05]] : [[hr * 0.42, -hr * 0.1]];
    return { headX: hx, headY: hy, headR: hr, tilt, eyes };
  }

  /* ---- 設計師提供的 SVG（單色剪影） ---- */
  let svgImg = null, svgTried = false;
  function svg(ctx) {
    if (!svgTried) {
      svgTried = true;
      svgImg = new Image();
      svgImg.src = 'assets/critter.svg';
    }
    if (svgImg && svgImg.complete && svgImg.naturalWidth) {
      const ar = svgImg.naturalWidth / svgImg.naturalHeight;
      ctx.drawImage(svgImg, -ar / 2, -1, ar, 1);
      return null;
    }
    return wombat(ctx, { pose: 'sit' }, 0);
  }

  C.kinds = { wombat, cat, svg };

  /* ---------- 圖片版（Kai 的插圖） ---------- */
  const IMG = { duo: 'duoSmall', kai: 'wombat', duomain: 'duo' };
  const cache = {};
  let cacheN = 0;
  /* 預先縮成目標高度（逐步對半縮，避免 drawImage 大幅縮小時鋸齒）；tone>0 時用 source-atop 壓暗，結果快取，不在每幀處理像素 */
  function sprite(kind, hpx, tone) {
    const src = KK.Art && KK.Art[IMG[kind]];
    if (!src || !src.naturalWidth) return null;
    const h = Math.max(4, Math.round(hpx / 2) * 2);
    const tq = Math.round(tone * 10);
    const key = kind + '|' + h + '|' + tq;
    if (cache[key]) return cache[key];
    if (cacheN > 60) { for (const k in cache) delete cache[k]; cacheN = 0; }
    const ar = src.naturalWidth / src.naturalHeight;
    let cur = src, cw = src.naturalWidth, ch = src.naturalHeight;
    const tw = Math.max(2, Math.round(h * ar));
    while (ch / 2 > h) {
      const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
      const c = KK.canvas(nw, nh); const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, nw, nh);
      cur = c; cw = nw; ch = nh;
    }
    const out = KK.canvas(tw, h); const og = out.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(cur, 0, 0, tw, h);
    if (tq > 0) {
      og.globalCompositeOperation = 'source-atop';
      og.fillStyle = KK.rgba('#2A211C', Math.min(0.92, tq / 10 * 0.9));
      og.fillRect(0, 0, tw, h);
    }
    cache[key] = out; cacheN++;
    return out;
  }

  function drawImg(ctx, x, y, size, o, t) {
    const kind = C.kind;
    const dpr = o.dpr || 1;
    const tone = o.tone == null ? 0.35 : o.tone;
    const spr = sprite(kind, size * dpr, tone);
    if (!spr) return;
    const pose = o.pose || 'sit';
    const ar = spr.width / spr.height;
    const w = size * ar;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = o.alpha == null ? 0.75 : o.alpha;
    if ((o.facing || 1) < 0) ctx.scale(-1, 1);
    let dy = 0, rot = 0, sc = 1;
    if (pose === 'walk') {
      const ph = Math.sin(t * KK.TAU * 2.2);
      dy = -Math.abs(ph) * size * 0.045;
      rot = ph * 0.025;
    } else {
      sc = 1 + Math.sin(t * KK.TAU * 0.4) * 0.008; // 極輕微的呼吸
      if (pose === 'wave') rot = Math.sin(t * KK.TAU * 1.6) * 0.012;
      if (pose === 'lookup') rot = -0.03;
    }
    ctx.translate(0, dy);
    if (rot) ctx.rotate(rot);
    if (sc !== 1) ctx.scale(1, sc);
    if (pose === 'peek') {
      // 只露出上半身：整張往下沉 45%，以 y 為界裁掉下半
      ctx.beginPath(); ctx.rect(-w, -size * 2, w * 2, size * 2 + 0); ctx.clip();
      ctx.drawImage(spr, -w / 2, size * 0.45 - size, w, size);
    } else {
      ctx.drawImage(spr, -w / 2, -size, w, size);
    }
    ctx.restore();
  }

  C.draw = function (ctx, x, y, size, o) {
    o = o || {};
    if (!C.visible || o.alpha === 0) return;
    const t = o.t || 0;
    if (IMG[C.kind]) { drawImg(ctx, x, y, size, o, t); return; }
    const fn = C.kinds[C.kind] || wombat;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((o.facing || 1) * size, size);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.fillStyle = o.color || KK.PAL.umber;
    ctx.strokeStyle = ctx.fillStyle;
    const head = fn(ctx, o, t, size);
    // 一顆小小的眼睛（亮點），讓剪影「活起來」
    if (head && o.eye !== false && o.pose !== 'walk-noeye') {
      ctx.save();
      ctx.translate(head.headX, head.headY);
      ctx.rotate(head.tilt || 0);
      ctx.fillStyle = o.eyeColor || KK.PAL.cream;
      ctx.globalAlpha *= 0.85;
      const blink = (KK.mod(t, 4.2) < 0.12) ? 0.2 : 1;
      const er = head.headR * (size < 44 ? 0.17 : 0.11);
      const list = head.eyes || [[head.headR * 0.35, -head.headR * 0.12]];
      ctx.beginPath();
      for (const [ex, ey] of list) { ctx.moveTo(ex + er, ey); ctx.ellipse(ex, ey, er, er * blink, 0, 0, KK.TAU); }
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };
})();
