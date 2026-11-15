/* 魚眼（id 'fish'）：把相機畫面即時做魚眼／桶狀變形。
 * 引擎 DAYOF.Fisheye.create() → { render(video, W, H, mirror) → canvas, mode:'webgl'|'2d', destroy() }
 *   - 優先 WebGL fragment shader（手機也順）；不支援時改用 2D canvas「預先算好的重映射表」（半解析度）。
 *   - 圓形鏡頭：圓直徑約 1.18×畫面寬（直式 9:16 時上下露出弧形暗邊、左右略裁），邊緣暖褐暗角＋細亮環，整體微暖色調。
 *   - 映射：輸出半徑 rn（0..1）取樣來源半徑 tan(rn·A)/tan(A)：中央放大約 1.8×、邊緣壓縮 → 魚眼感。
 * KK 濾鏡：載入 KK 之後由 camera.js 跑 DAYOF.kkPlugins 註冊 KK.defineFilter({ id:'fish', ... })，
 *   與其他 KK 濾鏡一樣走 KK.Stage → KK.Recorder（錄影 720×1280 直式）／拍照（stage canvas → JPEG）。
 *   影像來源：S.stage.video（camera.js 會設 stage.S.stage = stage）或 KK.Camera.video；鏡像：stage.mirror。 */
(function () {
  'use strict';
  window.DAYOF = window.DAYOF || {};
  var DAYOF = window.DAYOF;

  var A = 1.1;            // 魚眼強度（tan 映射參數）
  var CIRCLE = 0.59;      // 圓半徑＝畫面寬 × 0.59
  var EDGE = [0.42, 0.33, 0.26];   // 暖褐（比炭褐亮、偏暖，避免髒黑）
  var FRAME_HOLE = 325 / 720;     // fisheye-frame.png 中央圓洞半徑（畫布寬比例）

  var VS = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FS = [
    'precision mediump float;',
    'uniform sampler2D uTex; uniform vec2 uV; uniform vec2 uOut; uniform float uMirror; uniform float uR; uniform float uA;',
    'void main(){',
    '  vec2 q = vec2(gl_FragCoord.x, uOut.y - gl_FragCoord.y);',
    '  vec2 c = uOut * 0.5; vec2 d = q - c; float r = length(d); float rn = r / uR;',
    '  float k = max(uOut.x / uV.x, uOut.y / uV.y); vec2 dsz = uV * k;',
    '  float Rs = min(uR, min(dsz.x, dsz.y) * 0.5) * 0.98;',
    '  float s = tan(min(rn, 1.0) * uA) / tan(uA);',
    '  vec2 dir = r > 0.0001 ? d / r : vec2(0.0);',
    '  vec2 pp = c + dir * s * Rs;',
    '  vec2 tuv = (pp - (uOut - dsz) * 0.5) / dsz;',
    '  if (uMirror > 0.5) tuv.x = 1.0 - tuv.x;',
    '  vec3 col = texture2D(uTex, clamp(tuv, 0.0, 1.0)).rgb;',
    '  col = col * vec3(1.05, 1.0, 0.9) + vec3(0.035, 0.022, 0.0);',          // 微暖
    '  col = mix(col, vec3(dot(col, vec3(0.3, 0.59, 0.11))), 0.08);',           // 一點點降飽和（紙感）
    '  float vig = 1.0 - smoothstep(0.66, 1.0, rn);',
    '  vec3 edge = vec3(' + EDGE.join(',') + ');',
    '  col = mix(edge, col, vig * 0.92 + 0.08 * (1.0 - step(1.0, rn)));',
    '  float ring = exp(-pow((rn - 1.0) * 38.0, 2.0)) * 0.22;',                // 鏡頭邊緣細亮環
    '  col += vec3(0.95, 0.88, 0.75) * ring;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}',
  ].join('\n');

  function makeGL() {
    var cv = document.createElement('canvas');
    var gl = null;
    try { gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false }) || cv.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) return null;
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    var U = {};
    ['uTex', 'uV', 'uOut', 'uMirror', 'uR', 'uA'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(U.uTex, 0);
    var hasFrame = false;
    return {
      mode: 'webgl', canvas: cv,
      render: function (v, W, H, mirror, Rr) {
        if (cv.width !== W) cv.width = W;
        if (cv.height !== H) cv.height = H;
        gl.viewport(0, 0, W, H);
        if (v && v.readyState >= 2 && v.videoWidth) {
          try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v); hasFrame = true; } catch (e) { /* 這一格略過 */ }
        }
        if (!hasFrame) { gl.clearColor(EDGE[0], EDGE[1], EDGE[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); return cv; }
        gl.uniform2f(U.uV, v && v.videoWidth || W, v && v.videoHeight || H);
        gl.uniform2f(U.uOut, W, H);
        gl.uniform1f(U.uMirror, mirror ? 1 : 0);
        gl.uniform1f(U.uR, Rr || W * CIRCLE);
        gl.uniform1f(U.uA, A);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return cv;
      },
      destroy: function () { try { var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { /* ignore */ } },
    };
  }

  /* 2D 備援：半解析度，預先算好「輸出像素 → 來源像素」索引表＋暗角係數 */
  function make2D() {
    var out = document.createElement('canvas'), og = out.getContext('2d');
    var src = document.createElement('canvas'), sg = src.getContext('2d', { willReadFrequently: true });
    var map = null, vig = null, key = '', img = null;
    function build(w, h, vw, vh, Rf) {
      map = new Int32Array(w * h); vig = new Float32Array(w * h);
      var R = w * (Rf || CIRCLE), cx = w / 2, cy = h / 2;
      var k = Math.max(w / vw, h / vh), dw = vw * k, dh = vh * k;
      var Rs = Math.min(R, Math.min(dw, dh) / 2) * 0.98, tA = Math.tan(A);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.sqrt(dx * dx + dy * dy), rn = r / R;
        var s = Math.tan(Math.min(rn, 1) * A) / tA;
        var px = r > 1e-4 ? cx + dx / r * s * Rs : cx, py = r > 1e-4 ? cy + dy / r * s * Rs : cy;
        var sx = Math.max(0, Math.min(w - 1, Math.round(px))), sy = Math.max(0, Math.min(h - 1, Math.round(py)));
        var i = y * w + x;
        map[i] = (sy * w + sx) * 4;
        var e = Math.min(1, Math.max(0, (rn - 0.66) / 0.34)); e = e * e * (3 - 2 * e);
        vig[i] = (1 - e) * 0.92 + (rn < 1 ? 0.08 : 0);
      }
      img = og.createImageData(w, h);
    }
    return {
      mode: '2d', canvas: out,
      render: function (v, W, H, mirror, Rr) {
        var Rf = Rr ? Rr / W : CIRCLE;
        var w = Math.max(2, Math.round(W / 2)), h = Math.max(2, Math.round(H / 2));
        if (out.width !== w) out.width = w;
        if (out.height !== h) out.height = h;
        if (src.width !== w) src.width = w;
        if (src.height !== h) src.height = h;
        if (!(v && v.readyState >= 2 && v.videoWidth)) {
          if (!img) { og.fillStyle = '#3A2E28'; og.fillRect(0, 0, w, h); }
          return out;
        }
        var k2 = w + 'x' + h + ':' + v.videoWidth + 'x' + v.videoHeight + ':' + Rf;
        if (k2 !== key) { build(w, h, v.videoWidth, v.videoHeight, Rf); key = k2; }
        var k = Math.max(w / v.videoWidth, h / v.videoHeight), dw = v.videoWidth * k, dh = v.videoHeight * k;
        sg.save();
        if (mirror) { sg.translate(w, 0); sg.scale(-1, 1); }
        sg.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh);
        sg.restore();
        var s = sg.getImageData(0, 0, w, h).data, d = img.data, n = w * h;
        var er = EDGE[0] * 255, eg = EDGE[1] * 255, eb = EDGE[2] * 255;
        for (var i = 0; i < n; i++) {
          var j = map[i], a = vig[i], o = i * 4;
          var r = s[j] * 1.05 + 9, g = s[j + 1] + 5.6, b = s[j + 2] * 0.9;
          d[o] = er + (r - er) * a; d[o + 1] = eg + (g - eg) * a; d[o + 2] = eb + (b - eb) * a; d[o + 3] = 255;
        }
        og.putImageData(img, 0, 0);
        return out;
      },
      destroy: function () { map = vig = img = null; },
    };
  }

  DAYOF.Fisheye = {
    create: function (opts) {
      opts = opts || {};
      var e = null;
      if (!opts.force2d) { try { e = makeGL(); } catch (err) { e = null; } }
      return e || make2D();
    },
  };

  /* ---------- KK 濾鏡註冊（camera.js 在 KK 載入後呼叫） ---------- */
  DAYOF.kkPlugins = DAYOF.kkPlugins || [];
  DAYOF.kkPlugins.push(function (KK) {
    if (KK.byId.fish) return;
    var P = KK.PAL, TAU = KK.TAU;
    KK.defineFilter({
      id: 'fish',
      no: 30,
      song: '創作-記得我',
      title: '魚眼',
      mood: '靠近・好奇・圓圓的世界',
      duration: 12,
      hint: '魚眼鏡頭：靠近一點，世界會變圓',
      bg: 'none',               // camera.js：此濾鏡自己畫相機畫面，舞台背景改成純黑省效能
      create: function () {
        var eng = null;
        try { var q = new URLSearchParams(location.search).get('fish2d') === '1'; eng = DAYOF.Fisheye.create({ force2d: q }); } catch (e) { eng = DAYOF.Fisheye.create(); }
        var inst = {
          engineMode: eng.mode,
          draw: function (g, S) {
            var stage = S.stage, v = (stage && stage.video) || (KK.Camera && KK.Camera.video);
            var aFrame = KK.art ? KK.art('fisheye-frame.png') : null, aBub = KK.art ? KK.art('fisheye-bubble.png') : null;
            var R = S.w * (aFrame ? FRAME_HOLE * 1.03 : CIRCLE);   // 有舷窗外框時，變形圓縮到外框洞裡（略大一點被框蓋住接縫）
            var cv = eng.render(v, S.w, S.h, !!(stage && stage.mirror), R);
            g.imageSmoothingEnabled = true;
            g.drawImage(cv, 0, 0, S.w, S.h);
            // 繪本舷窗外框（錄影與第 29 步拍照都一起輸出）
            if (aFrame) g.drawImage(aFrame, 0, 0, S.w, S.h);
            // 鏡頭外暗邊上冒幾顆小泡泡（手繪、整數圈 → 無縫）
            var u = S.u, cx = S.w / 2, cy = S.h / 2;
            g.lineWidth = Math.max(1.2, u * 0.003);
            for (var i = 0; i < 7; i++) {
              var side = i % 2 ? 1 : -1;
              var k = KK.mod(S.phase * (1 + (i % 3)) + i * 0.137, 1);
              var y = S.h * (1.02 - k * 1.1);
              var dy = y - cy, half = Math.abs(dy) < R ? Math.sqrt(R * R - dy * dy) : 0;
              var x = cx + side * (half + u * (0.03 + 0.03 * KK.hash(i, 3))) + Math.sin(S.phase * TAU * 3 + i) * u * 0.01;
              if (x < -u * 0.05 || x > S.w + u * 0.05) continue;
              var r = u * (0.008 + 0.012 * KK.hash(i, 9));
              var a = 0.55 * Math.sin(k * Math.PI);
              if (aBub) { g.globalAlpha = Math.min(1, a * 1.6); g.drawImage(aBub, x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2); g.globalAlpha = 1; continue; }
              g.strokeStyle = KK.rgba(P.cream, a);
              KK.wobCircle(g, x, y, r, r * 0.08, i * 7, S.t, 10); g.stroke();
            }
            KK.paper(g, S, { grain: 0.28, vignette: aFrame ? 0.2 : 0.3 });
          },
          destroy: function () { eng.destroy(); },
        };
        return inst;
      },
    });
  });
  if (window.KK && window.KK.defineFilter) DAYOF.kkPlugins[DAYOF.kkPlugins.length - 1](window.KK);
})();
