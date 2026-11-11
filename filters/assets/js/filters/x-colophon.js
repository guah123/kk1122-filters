/* 終〈版權頁〉結尾素材：整個畫面像書的最後一頁（日式「奧付」的排版感）。
 * 卡片上只有三串字：看看／2026.11.22／沐月書店；其餘裝飾一律用線條與印章。
 *
 * 分鏡（D = 14 秒）
 *  0–2.5   四邊淡淡的米色紙邊從邊緣長進來（紙纖維、內緣淡淡陰影）
 *  2.5–3.5 半透明米色紙卡淡入在畫面下方（橫式在右下），印章稍晚「蓋」上去
 *  3.5–11  保持，紙卡極輕微呼吸
 *  11–13   全部淡出
 *  13–14   乾淨（接回 t=0，無縫） */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  KK.defineFilter({
    id: 'colophon',
    no: '終',
    song: '',
    title: '版權頁',
    mood: '闔上書・謝謝・留念',
    duration: 14,
    hint: '這一頁可以當安可或結尾的最後一個畫面',
    critterHint: '印花章裡',
    create() {
      const st = { edge: null, sT: 0, we: 0, card: null, seal: null, L: 1, cx: 0, cy: 0, sealOff: [0, 0], sealSz: 1 };

      /* ---------- 四邊紙邊（整張預畫，執行時只切四條 drawImage） ---------- */
      function bakeEdge(S) {
        const w = S.w, h = S.h, u = S.u, we = u * 0.05;
        const sT = Math.ceil(u * 0.1);
        st.we = we; st.sT = sT;
        const c = KK.canvas(w, h), g = c.getContext('2d'), r = KK.rng(61);
        // 內緣：帶一點不規則的手撕感
        const inner = [];
        const step = u * 0.03;
        const jit = () => we * (0.9 + r() * 0.2);
        inner.push([jit(), jit()]);
        for (let x = we; x < w - we; x += step) inner.push([x, jit()]);
        inner.push([w - jit(), jit()]);
        for (let y = we; y < h - we; y += step) inner.push([w - jit(), y]);
        inner.push([w - jit(), h - jit()]);
        for (let x = w - we; x > we; x -= step) inner.push([x, h - jit()]);
        inner.push([jit(), h - jit()]);
        for (let y = h - we; y > we; y -= step) inner.push([jit(), y]);
        const innerPath = () => {
          g.beginPath();
          inner.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
          g.closePath();
        };
        // 內緣陰影（只畫在紙邊內側，疊幾條漸寬的淡線）
        g.save();
        innerPath(); g.clip();
        g.lineJoin = 'round';
        for (let i = 1; i <= 8; i++) {
          innerPath();
          g.lineWidth = i * u * 0.003;
          g.strokeStyle = KK.rgba(P.umber, 0.035);
          g.stroke();
        }
        g.restore();
        // 紙邊本體（evenodd：外矩形挖掉內緣）
        g.beginPath(); g.rect(0, 0, w, h);
        inner.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
        g.closePath();
        g.fillStyle = KK.rgba(P.cream, 0.9);
        g.fill('evenodd');
        g.save();
        g.clip('evenodd');
        // 紙纖維
        g.lineCap = 'round';
        const cols = [P.page, P.umber, P.cream, P.apricot];
        for (let i = 0; i < 900; i++) {
          const side = r() * 4 | 0, o = r() * we * 1.4;
          let x, y;
          if (side === 0) { x = r() * w; y = o; }
          else if (side === 1) { x = w - o; y = r() * h; }
          else if (side === 2) { x = r() * w; y = h - o; }
          else { x = o; y = r() * h; }
          const a = r() * TAU, l = u * (0.012 + r() * 0.04);
          g.strokeStyle = KK.rgba(cols[i % 4], 0.1 + r() * 0.22);
          g.lineWidth = 0.6 + r() * 0.7;
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x + Math.cos(a + 0.8) * l * 0.5, y + Math.sin(a + 0.8) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
          g.stroke();
        }
        g.restore();
        // 內緣一條很淡的描邊，讓紙邊「有厚度」
        innerPath();
        g.strokeStyle = KK.rgba(P.umber, 0.2); g.lineWidth = Math.max(1, u * 0.002); g.stroke();
        st.edge = c;
      }

      /* ---------- 紙卡（版式、字、線框全部預畫） ---------- */
      function bakeCard(S) {
        const w = S.w, h = S.h, u = S.u;
        const portrait = h >= w;
        const L = portrait ? Math.min(h * 0.24, (w * 0.64) / 1.5) : h * 0.46;
        st.L = L;
        const bm = st.we + u * 0.05; // 卡片離邊緣
        st.cy = h - bm - L / 2;
        st.cx = portrait ? w / 2 : w - bm - L * 0.75;
        const pad = L * 0.1, cw = L * 1.5, ch = L;
        const c = KK.canvas(cw + pad * 2, ch + pad * 2), g = c.getContext('2d'), r = KK.rng(88);
        g.translate(pad, pad);
        // 卡片外形：邊緣帶一點點不規則
        const pts = [], stp = L * 0.04;
        const e = () => (r() - 0.5) * L * 0.006;
        for (let x = 0; x < cw; x += stp) pts.push([x + e(), e()]);
        for (let y = 0; y < ch; y += stp) pts.push([cw + e(), y + e()]);
        for (let x = cw; x > 0; x -= stp) pts.push([x + e(), ch + e()]);
        for (let y = ch; y > 0; y -= stp) pts.push([e(), y + e()]);
        const shape = () => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
        // 紙的厚度陰影（多層淡色偏移，不用 shadowBlur）
        for (let i = 6; i >= 1; i--) {
          g.fillStyle = KK.rgba(P.umber, 0.035);
          g.fillRect(-i * L * 0.006 + L * 0.008, -i * L * 0.004 + L * 0.02, cw + i * L * 0.012, ch + i * L * 0.012);
        }
        shape();
        const gr = g.createLinearGradient(0, 0, 0, ch);
        gr.addColorStop(0, KK.rgba(P.cream, 0.9));
        gr.addColorStop(1, KK.rgba(KK.mix(P.cream, P.page, 0.45), 0.9));
        g.fillStyle = gr; g.fill();
        // 紙纖維
        g.save(); shape(); g.clip();
        g.lineCap = 'round';
        for (let i = 0; i < 220; i++) {
          const x = r() * cw, y = r() * ch, a = r() * TAU, l = L * (0.02 + r() * 0.05);
          g.strokeStyle = KK.rgba(i % 2 ? P.page : P.umber, 0.07 + r() * 0.12);
          g.lineWidth = 0.6 + r() * 0.5;
          g.beginPath(); g.moveTo(x, y);
          g.quadraticCurveTo(x + Math.cos(a + 0.9) * l * 0.5, y + Math.sin(a + 0.9) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
          g.stroke();
        }
        g.restore();
        // 雙線框（外粗內細），帶一點手抖
        const ink = KK.rgba(P.umber, 0.88);
        const frame = (ins, lw, seed) => {
          const q = L * ins;
          KK.wobPath(g, [[q, q], [cw * 0.5, q], [cw - q, q], [cw - q, ch * 0.5], [cw - q, ch - q], [cw * 0.5, ch - q], [q, ch - q], [q, ch * 0.5]], true, L * 0.0016, seed, 0.1);
          g.strokeStyle = ink; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
        };
        frame(0.06, Math.max(1.4, L * 0.0075), 3);
        frame(0.085, Math.max(0.9, L * 0.0033), 9);
        // 文字（預畫 → 貼上）
        const put = (txt, size, W, track, x, y) => {
          const b = KK.Glyphs.bake(txt, size, P.umber, W, track);
          const pd = size * 0.15;
          g.globalAlpha = 0.93;
          g.drawImage(b, x - pd, y - pd);
          g.globalAlpha = 1;
        };
        const x0 = L * 0.17;
        put('看看', L * 0.3, 7, 0.07, x0, L * 0.13);
        // 分隔線（手抖的細線，兩端各一個小點）
        KK.wobPath(g, [[x0, L * 0.5], [x0 + L * 0.35, L * 0.5], [x0 + L * 0.7, L * 0.5]], false, L * 0.0016, 21, 0.1);
        g.strokeStyle = ink; g.lineWidth = Math.max(1, L * 0.0042); g.stroke();
        put('2026.11.22', L * 0.098, 7, 0.02, x0, L * 0.56);
        put('沐月書店', L * 0.092, 7, 0.1, x0, L * 0.72);
        // 右上：菱形分隔裝飾（純線條）
        const lx = L * 1.15, ly = L * 0.27, rr = L * 0.075;
        g.lineWidth = Math.max(1, L * 0.0042); g.strokeStyle = ink;
        KK.wobPath(g, [[lx, ly - rr], [lx + rr, ly], [lx, ly + rr], [lx - rr, ly]], true, L * 0.001, 31, 0.1); g.stroke();
        KK.wobPath(g, [[lx, ly - rr * 0.4], [lx + rr * 0.4, ly], [lx, ly + rr * 0.4], [lx - rr * 0.4, ly]], true, L * 0.0008, 32, 0.1); g.stroke();
        g.beginPath();
        g.moveTo(lx - rr * 3.2, ly); g.lineTo(lx - rr * 1.5, ly);
        g.moveTo(lx + rr * 1.5, ly); g.lineTo(lx + rr * 3.2, ly);
        g.stroke();
        st.card = c; st.cardPad = pad;
      }

      /* ---------- 磚紅方形印章（只畫章身與邊框；章裡的圖案每幀即時畫） ---------- */
      function bakeSeal(S) {
        const sz = st.L * 0.34;
        st.sealSz = sz;
        st.sealOff = [st.L * (1.15 - 0.75), st.L * (0.64 - 0.5)];
        const pad = sz * 0.1;
        const c = KK.canvas(sz + pad * 2, sz + pad * 2), g = c.getContext('2d'), r = KK.rng(5);
        g.translate(pad, pad);
        const pts = [], n = 8;
        const e = () => (r() - 0.5) * sz * 0.025;
        const rect = [[0, 0], [sz, 0], [sz, sz], [0, sz]];
        for (let s = 0; s < 4; s++) {
          const a = rect[s], b = rect[(s + 1) % 4];
          for (let i = 0; i < n; i++) pts.push([KK.lerp(a[0], b[0], i / n) + e(), KK.lerp(a[1], b[1], i / n) + e()]);
        }
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
        g.fillStyle = KK.rgba(P.brick, 0.93); g.fill();
        // 印泥不均：挖幾個小缺口
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 70; i++) {
          g.fillStyle = 'rgba(0,0,0,' + (0.25 + r() * 0.4) + ')';
          g.beginPath(); g.arc(r() * sz, r() * sz, sz * (0.006 + r() * 0.018), 0, TAU); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
        // 章內細框
        const q = sz * 0.085;
        KK.wobPath(g, [[q, q], [sz - q, q], [sz - q, sz - q], [q, sz - q]], true, sz * 0.006, 7, 0.1);
        g.strokeStyle = KK.rgba(P.cream, 0.8); g.lineWidth = Math.max(1, sz * 0.03); g.lineJoin = 'round'; g.stroke();
        st.seal = c; st.sealPad = pad;
      }

      return {
        resize(S) { bakeEdge(S); bakeCard(S); bakeSeal(S); },
        draw(g, S) {
          const t = S.t, u = S.u, w = S.w, h = S.h;
          const out = 1 - KK.smooth(11, 13, t);
          if (out <= 0.003) { KK.paper(g, S, { grain: 0.4, vignette: 0.4 }); return; }
          // ---- 紙邊：四條從邊緣長進來 ----
          const ek = KK.smooth(0, 2.5, t);
          if (ek > 0.003) {
            // 整張邊框從外面往內縮到定位（等於四邊一起長進來），一次 drawImage
            const o = (1 - ek) * st.we * 1.6;
            g.globalAlpha = ek * out;
            g.drawImage(st.edge, -o, -o, w + 2 * o, h + 2 * o);
            g.globalAlpha = 1;
          }
          // ---- 紙卡 ----
          const ck = KK.smooth(2.5, 3.5, t) * out;
          if (ck > 0.003) {
            const L = st.L, breath = 1 + 0.004 * Math.sin(t / S.D * TAU * 2);
            g.save();
            g.translate(st.cx, st.cy + (1 - ck) * L * 0.04);
            g.rotate(-0.008);
            g.scale(breath, breath);
            g.globalAlpha = ck;
            g.drawImage(st.card, -L * 0.75 - st.cardPad, -L * 0.5 - st.cardPad);
            // ---- 印章（稍晚「蓋」上去）----
            const sk = KK.smooth(3.2, 3.9, t) * out;
            if (sk > 0.003) {
              const sz = st.sealSz, sc = 1 + 0.14 * (1 - sk);
              g.save();
              g.translate(st.sealOff[0], st.sealOff[1]);
              g.rotate(-0.07);
              g.scale(sc, sc);
              g.globalAlpha = sk;
              g.drawImage(st.seal, -sz / 2 - st.sealPad, -sz / 2 - st.sealPad);
              if (S.critter) {
                KK.Critter.draw(g, 0, sz * 0.25, sz * 0.5, { pose: 'sit', facing: 1, alpha: 0.95, tone: 0, t: 0 }); // 印章裡：Kai 牽著小袋熊
              } else {
                g.fillStyle = KK.rgba(P.cream, 0.92);
                g.beginPath();
                for (let i = 0; i < 10; i++) {
                  const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 0.12 : 0.27) * sz;
                  const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
                  if (i) g.lineTo(x, y); else g.moveTo(x, y);
                }
                g.closePath(); g.fill();
              }
              g.restore();
            }
            g.restore();
          }
          KK.paper(g, S, { grain: 0.4, vignette: 0.4 });
        },
      };
    },
  });
})();
