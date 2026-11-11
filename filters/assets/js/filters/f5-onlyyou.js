/* 5〈我只在乎你〉流往同一個方向的光
 * 分鏡（15 秒、全部元素朝同一個方向流動，預設左上 → 右下約 22°）：
 *   0–4s   左上角暖色漏光緩緩呼吸，幾條柔光帶與大散景從上游飄進畫面。
 *   4–8s   小光圈較快、大光圈較慢，一條細長光軌像長曝光車燈掠過。
 *   8–12s  另一條光軌掠過；下半部有顆較大的散景經過，裡面隱約有個小剪影。
 *   12–15s 光流回到起點的樣子（整數圈，無縫）。
 * 互動：手指拖曳 → 流向慢慢轉向拖曳方向，放開保持；點一下 → 指尖綻放一圈小光點。
 * 構圖：所有光都在「流向座標系」裡算（s 沿流向、p 垂直流向），畫面中央區域的光自動變淡，
 * Kai 的臉不會被洗白。 */
(function () {
  'use strict';
  const KK = window.KK, P = KK.PAL, TAU = KK.TAU;

  KK.defineFilter({
    id: 'onlyyou',
    no: 5,
    song: '我只在乎你',
    title: '流往同一個方向的光',
    mood: '溫柔・時間流逝・專注',
    duration: 15,
    hint: '用手指拖曳，改變光流動的方向',
    critterHint: '下半部一顆大散景光圈裡的淡淡倒影',
    create() {
      const BASE = 0.39; // 預設流向約 22°（往右下）
      const st = {
        ang: BASE, tgt: BASE, accX: 0, accY: 0, drag: null, moved: false,
        taps: [], lastNow: 0, items: [], bands: [], trails: [],
        bandSpr: {}, trailSpr: {},
      };

      /* ---------- 預畫：拉長的柔光帶（橢圓漸層） ---------- */
      function bandSprite(hex) {
        if (st.bandSpr[hex]) return st.bandSpr[hex];
        const c = KK.canvas(512, 128), g = c.getContext('2d');
        g.translate(256, 64);
        g.scale(1, 0.25);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 256);
        gr.addColorStop(0, KK.rgba(hex, 0.9));
        gr.addColorStop(0.18, KK.rgba(hex, 0.5));
        gr.addColorStop(0.45, KK.rgba(hex, 0.1));
        gr.addColorStop(1, KK.rgba(hex, 0));
        g.fillStyle = gr;
        g.fillRect(-256, -256, 512, 512);
        // 中心再疊一道細亮芯（兩側快速衰減，書牆上也看得出斜向）
        g.setTransform(1, 0, 0, 1, 0, 0);
        const v = g.createLinearGradient(0, 0, 0, 128);
        v.addColorStop(0, KK.rgba(hex, 0));
        v.addColorStop(0.5, KK.rgba(hex, 0.55));
        v.addColorStop(1, KK.rgba(hex, 0));
        const hh = g.createLinearGradient(0, 0, 512, 0);
        hh.addColorStop(0, 'rgba(0,0,0,0)'); hh.addColorStop(0.3, 'rgba(0,0,0,1)');
        hh.addColorStop(0.7, 'rgba(0,0,0,1)'); hh.addColorStop(1, 'rgba(0,0,0,0)');
        const core = KK.canvas(512, 128), cg = core.getContext('2d');
        cg.fillStyle = v; cg.fillRect(0, 0, 512, 128);
        cg.globalCompositeOperation = 'destination-in';
        cg.fillStyle = hh; cg.fillRect(0, 0, 512, 128);
        g.drawImage(core, 0, 0);
        return (st.bandSpr[hex] = c);
      }
      /* ---------- 預畫：長曝光光軌（尾巴淡、頭亮、上下很細） ---------- */
      function trailSprite(hex) {
        if (st.trailSpr[hex]) return st.trailSpr[hex];
        const c = KK.canvas(512, 32), g = c.getContext('2d');
        const v = g.createLinearGradient(0, 0, 0, 32);
        v.addColorStop(0, KK.rgba(hex, 0));
        v.addColorStop(0.4, KK.rgba(hex, 0.22));
        v.addColorStop(0.5, KK.rgba(hex, 1));
        v.addColorStop(0.6, KK.rgba(hex, 0.22));
        v.addColorStop(1, KK.rgba(hex, 0));
        g.fillStyle = v;
        g.fillRect(0, 0, 512, 32);
        g.globalCompositeOperation = 'destination-in';
        const h = g.createLinearGradient(0, 0, 512, 0);
        h.addColorStop(0, 'rgba(0,0,0,0)');
        h.addColorStop(0.85, 'rgba(0,0,0,1)');
        h.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = h;
        g.fillRect(0, 0, 512, 32);
        return (st.trailSpr[hex] = c);
      }

      /* ---------- 佈景（比例值，與尺寸無關；一次決定） ---------- */
      (function build() {
        const r = KK.rng(5151);
        const pickCol = () => {
          const q = r();
          return q < 0.4 ? P.cream : q < 0.7 ? P.page : q < 0.92 ? P.apricot : P.brick;
        };
        const perp = () => (r() < 0.5 ? -1 : 1) * (0.1 + 0.9 * r());
        // [數量, 尺寸(u)範圍, 圈數, 透明度範圍]：大的慢（近景），小的快（遠處的星點）
        // ring=true 才是亮邊圓環（只留少數）；其餘是實心柔邊光團／光痕
        const cls = [
          [4, [0.24, 0.34], 1, [0.2, 0.32], false],
          [9, [0.1, 0.16], 1, [0.3, 0.45], false],
          [3, [0.1, 0.16], 1, [0.34, 0.5], true],
          [16, [0.04, 0.07], 2, [0.5, 0.75], false],
        ];
        cls.forEach((c) => {
          for (let i = 0; i < c[0]; i++) {
            st.items.push({
              col: pickCol(), size: KK.lerp(c[1][0], c[1][1], r()), laps: c[2],
              off: r(), pf: perp(), wf: 1 + Math.floor(r() * 3), wph: r() * TAU,
              ring: c[4], amp: 0.01 + r() * 0.03, a: KK.lerp(c[3][0], c[3][1], r()),
              bf: 1 + Math.floor(r() * 3), bph: r() * TAU,
            });
          }
        });
        // 柔光帶：避開畫面中線（p 接近 0 的地方）
        [[-0.44, P.apricot, 0.2, 1.9, 0.34], [-0.27, P.page, 0.16, 1.6, 0.26], [0.2, P.cream, 0.14, 2.1, 0.3],
          [0.36, P.brick, 0.15, 1.7, 0.3], [0.52, P.apricot, 0.18, 2.0, 0.4]].forEach((b, i) => {
          st.bands.push({ pf: b[0], col: b[1], a: b[2], len: b[3], th: b[4], off: i * 0.2 + 0.07, bf: 1 + (i % 3), bph: i * 1.7 });
        });
        // 光軌：每個 loop 掠過一次（只佔 loop 的一小段，其餘時間不可見）
        [[-0.62, P.apricot, 0.5, 0.02], [-0.4, P.cream, 0.55, 0.14], [-0.2, P.page, 0.3, 0.27], [0.18, P.apricot, 0.34, 0.38],
          [0.34, P.cream, 0.6, 0.5], [0.5, P.page, 0.5, 0.62], [0.66, P.apricot, 0.5, 0.74], [-0.78, P.cream, 0.45, 0.87]].forEach((t) => {
          st.trails.push({ pf: t[0], col: t[1], a: t[2], off: t[3] });
        });
      })();

      /* 中央區域變淡：離畫面中心越近，光越節制 */
      function att(x, y, S) {
        const ex = (x - S.w / 2) / (S.w / 2), ey = (y - S.h / 2) / (S.h / 2);
        return 0.28 + 0.72 * KK.smooth(0.22, 0.72, Math.hypot(ex, ey));
      }
      const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

      return {
        resize() {},
        reset() {
          st.ang = st.tgt = BASE; st.accX = st.accY = 0; st.drag = null; st.taps = [];
        },
        pointer(S, ev) {
          if (ev.type === 'down') {
            st.drag = { x0: ev.x, y0: ev.y, lx: ev.x, ly: ev.y, t0: S.now };
            st.accX = st.accY = 0; st.moved = false;
          } else if (ev.type === 'move' && st.drag) {
            const vx = ev.x - st.drag.lx, vy = ev.y - st.drag.ly;
            st.drag.lx = ev.x; st.drag.ly = ev.y;
            if (Math.hypot(ev.x - st.drag.x0, ev.y - st.drag.y0) > S.u * 0.03) st.moved = true;
            if (Math.hypot(vx, vy) > 1) {
              // 近期移動向量做指數平均，方向不會抖
              st.accX = st.accX * 0.75 + vx; st.accY = st.accY * 0.75 + vy;
              if (st.moved) st.tgt = Math.atan2(st.accY, st.accX);
            }
          } else if (ev.type === 'up') {
            if (st.drag && !st.moved) {
              if (st.taps.length >= 3) st.taps.shift();
              st.taps.push({ x: ev.x, y: ev.y, born: S.now, seed: Math.random() * TAU });
            }
            st.drag = null;
          }
        },
        draw(g, S) {
          const w = S.w, h = S.h, u = S.u, ph = S.phase, cx = w / 2, cy = h / 2;

          /* --- 流向：自動示範時只由 S.t 決定；平時 easing 向目標角度 --- */
          if (S.autoDemo) {
            st.ang = BASE; // 固定同一方向
          } else {
            const dt = KK.clamp(S.now - st.lastNow, 0, 0.1);
            st.ang += angDiff(st.tgt, st.ang) * (1 - Math.exp(-dt * 2.6));
          }
          st.lastNow = S.now;
          const a = st.ang, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
          const ca = Math.abs(dx), sa = Math.abs(dy);
          const Lh = (w * ca + h * sa) / 2 + u * 0.22; // 沿流向的半長（含邊界）
          const Ph = (w * sa + h * ca) / 2;            // 垂直流向的半寬
          const at = (s, p) => [cx + dx * s + nx * p, cy + dy * s + ny * p];

          g.save();
          g.globalCompositeOperation = 'lighter';

          /* --- 上游角落的漏光（底片感）與下游的淡淡收尾 --- */
          const tExit = Math.min(ca > 1e-4 ? w / 2 / ca : 1e9, sa > 1e-4 ? h / 2 / sa : 1e9);
          const lx = cx - dx * tExit - nx * u * 0.26, ly = cy - dy * tExit - ny * u * 0.26;
          const br = 0.5 + 0.5 * Math.sin(ph * TAU);
          KK.drawSprite(g, KK.glow(P.apricot, 256), lx, ly, u * 1.55, 0.34 + 0.12 * br);
          KK.drawSprite(g, KK.glow(P.brick, 256), lx + nx * u * 0.2, ly + ny * u * 0.2 - u * 0.05, u * 0.95,
            0.24 + 0.12 * (0.5 + 0.5 * Math.sin(ph * TAU * 2 + 1.3)));
          const ex = cx + dx * tExit + nx * u * 0.2, ey = cy + dy * tExit + ny * u * 0.2;
          KK.drawSprite(g, KK.glow(P.page, 256), ex, ey, u * 1.1, 0.13 + 0.05 * Math.sin(ph * TAU + 2));

          /* --- 柔光帶（拉長光暈，沿流向慢慢飄，厚度與亮度呼吸） --- */
          g.globalCompositeOperation = 'lighter';
          st.bands.forEach((b) => {
            const k = KK.mod(ph + b.off, 1);
            const s = KK.lerp(-Lh - u * 0.6, Lh + u * 0.6, k);
            const p = b.pf * Ph + Math.sin(ph * TAU + b.bph) * u * 0.03;
            const pos = at(s, p);
            const breathe = 0.7 + 0.3 * Math.sin(ph * TAU * b.bf + b.bph);
            const len = u * b.len, th = u * b.th * (0.9 + 0.1 * breathe);
            g.save();
            g.translate(pos[0], pos[1]);
            g.rotate(a);
            g.globalAlpha = Math.min(0.85, b.a * 2.6) * breathe * (0.7 + 0.3 * att(pos[0], pos[1], S));
            g.drawImage(bandSprite(b.col), -len / 2, -th / 2, len, th);
            g.restore();
          });
          g.globalAlpha = 1;
          g.globalCompositeOperation = 'lighter';

          /* --- 散景光圈 --- */
          const cs = [];
          st.items.forEach((it) => {
            const k = KK.mod(ph * it.laps + it.off, 1);
            const s = KK.lerp(-Lh, Lh, k);
            const p = it.pf * Ph + Math.sin(ph * TAU * it.wf + it.wph) * u * it.amp;
            const pos = at(s, p);
            const size = u * it.size;
            if (pos[0] < -size || pos[0] > w + size || pos[1] < -size || pos[1] > h + size) return;
            const breathe = 0.78 + 0.22 * Math.sin(ph * TAU * it.bf + it.bph);
            const al = it.a * breathe * att(pos[0], pos[1], S);
            if (it.laps > 1) {
              // 小而快的光點：沿流向拉長成光痕（像長曝光）
              g.save();
              g.translate(pos[0], pos[1]);
              g.rotate(a);
              g.globalAlpha = al * 0.8;
              g.drawImage(KK.glow(it.col, 64), -size * 3.2, -size * 0.4, size * 6.4, size * 0.8);
              g.restore();
              g.globalAlpha = 1;
            } else if (it.ring) KK.drawSprite(g, KK.bokeh(it.col, 128), pos[0], pos[1], size, al);
            else KK.drawSprite(g, KK.glow(it.col, 128), pos[0], pos[1], size, al * 0.9);
          });

          /* --- 小動物：下半部一顆較大的散景，光圈裡隱約映出剪影（偷偷的） --- */
          {
            const k = KK.mod(ph + 0.12, 1);
            const s = KK.lerp(-Lh - u * 0.2, Lh + u * 0.2, k);
            const pos = at(s, 0.34 * Ph);
            const size = u * 0.26;
            const vis = Math.max(0.5, att(pos[0], pos[1], S));
            KK.drawSprite(g, KK.bokeh(P.cream, 128), pos[0], pos[1], size, 0.85 * vis);
            KK.drawSprite(g, KK.glow(P.cream, 128), pos[0], pos[1], size * 0.8, 0.14 * vis);
            if (S.critter) cs.push([pos[0], pos[1], size, vis]);
          }

          /* --- 長曝光光軌：快速掠過 --- */
          st.trails.forEach((t) => {
            const kk = KK.mod(ph + t.off, 1), win = 0.2;
            if (kk > win) return;
            const q = kk / win;
            const len = u * 1.5;
            const s = KK.lerp(-Lh - len / 2, Lh + len / 2, q);
            const pos = at(s, t.pf * Ph);
            const f = Math.sin(q * Math.PI);
            g.save();
            g.translate(pos[0], pos[1]);
            g.rotate(a);
            g.globalAlpha = t.a * f * att(pos[0], pos[1], S);
            g.drawImage(trailSprite(t.col), -len / 2, -u * 0.009, len, u * 0.018);
            g.restore();
            g.globalAlpha = 1;
            const hd = at(s + len * 0.46, t.pf * Ph);
            KK.drawSprite(g, KK.glow(t.col, 64), hd[0], hd[1], u * 0.07, 0.6 * f * att(hd[0], hd[1], S));
          });
          g.globalAlpha = 1;

          /* --- 點一下：指尖綻放一圈小光點，沿流向漂走，1.5 秒淡出 --- */
          st.taps = st.taps.filter((tp) => S.now - tp.born < 1.5 && S.now - tp.born >= -0.05);
          st.taps.forEach((tp) => {
            const age = Math.max(0, S.now - tp.born), q = age / 1.5;
            const e = 1 - Math.pow(1 - q, 3);
            const fade = Math.pow(1 - q, 1.4);
            for (let i = 0; i < 8; i++) {
              const an = tp.seed + (i / 8) * TAU;
              const rr = u * (0.03 + 0.085 * e) * (0.85 + 0.3 * KK.hash(i, 3));
              const x = tp.x + Math.cos(an) * rr + dx * age * u * 0.07;
              const y = tp.y + Math.sin(an) * rr + dy * age * u * 0.07;
              KK.drawSprite(g, KK.glow(i % 2 ? P.cream : P.apricot, 64), x, y, u * 0.05 * (1 - 0.35 * q), 0.9 * fade);
            }
            KK.drawSprite(g, KK.glow(P.cream, 128), tp.x, tp.y, u * 0.2 * (0.6 + 0.4 * e), 0.35 * fade);
          });
          g.restore();

          /* --- 小剪影畫在光圈內（正常疊色，很淡像倒影，並裁在光圈內） --- */
          cs.forEach((c) => {
            g.save();
            g.globalCompositeOperation = 'lighter';
            g.beginPath();
            g.arc(c[0], c[1], c[2] * 0.4, 0, TAU);
            g.clip();
            KK.Critter.draw(g, c[0], c[1] + c[2] * 0.14, S.u * 0.035, {
              pose: 'sit', facing: dx >= 0 ? 1 : -1, color: P.cream, alpha: 0.15 * c[3], t: S.t, eye: false,
            });
            g.restore();
          });

          KK.paper(g, S, { grain: 0.35, vignette: 0.4 });
        },
      };
    },
  });
})();
