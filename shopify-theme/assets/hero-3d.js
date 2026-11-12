/* =========================================================
   VOLTA — hero-3d.js
   Anillo 3D de productos en WebGL puro (sin Three.js).
   - Solo se carga en la sección "Hero 3D" (portada).
   - Se pausa fuera de pantalla y con la pestaña oculta.
   - Respeta prefers-reduced-motion y cae a imágenes estáticas sin WebGL.
   ========================================================= */
(() => {
  const root = document.querySelector('[data-hero3d]');
  if (!root) return;

  const canvas = root.querySelector('canvas');
  const dataEl = root.querySelector('[data-hero-items]');
  const focusEl = root.querySelector('[data-hero-focus]');
  const countEl = root.querySelector('[data-hero-count]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const removeBg = root.dataset.removeBg !== 'false';

  let items = [];
  try { items = JSON.parse(dataEl.textContent || '[]'); } catch (e) { items = []; }
  items = items.filter(Boolean);

  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  if (!gl || !items.length) return; // fallback estático visible

  /* ---------- Config ---------- */
  const isMobile = matchMedia('(max-width: 860px)').matches;
  const MIN = 9;
  const base = items.slice();
  while (items.length < MIN) items = items.concat(base);
  if (items.length > 14) items = items.slice(0, 14);
  const N = items.length;
  const R = 3.3;
  const SPAN = (Math.PI * 2 / N) * 0.8;
  const W = SPAN * R;              // ancho de arco
  const H = W * 1.25;              // tarjeta 4:5
  const SEG = isMobile ? 20 : 36;
  const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);

  /* ---------- Shaders ---------- */
  const VS = `
    attribute vec2 aUv;
    uniform mat4 uProj; uniform mat4 uView;
    uniform float uA0; uniform float uSpan; uniform float uR; uniform float uH;
    uniform float uTime; uniform float uVel;
    varying vec2 vUv; varying float vZ;
    void main(){
      vUv = aUv;
      // plano recto colocado sobre el anillo, mirando hacia fuera
      vec3 n = vec3(sin(uA0), 0.0, cos(uA0));
      vec3 t = vec3(cos(uA0), 0.0, -sin(uA0));
      float off = (aUv.x - 0.5) * uSpan * uR;
      float bulge = sin(aUv.x * 3.14159) * uVel * 0.35;   // ligera curva al girar rápido
      float wave = sin(uTime * 0.9 + uA0 * 3.0) * 0.07;    // flotación
      float y = (aUv.y - 0.5) * uH + wave;
      vec3 p = n * (uR + bulge) + t * off + vec3(0.0, y, 0.0);
      vZ = p.z;
      gl_Position = uProj * uView * vec4(p, 1.0);
    }`;
  const FS = `
    precision mediump float;
    uniform sampler2D uTex; uniform vec2 uCover; uniform float uAspect;
    uniform float uRad; uniform float uLoaded;
    varying vec2 vUv; varying float vZ;
    float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
    void main(){
      vec2 uv = vUv;
      if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
      vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
      float d = sdRound(p, vec2(uAspect * 0.5, 0.5), 0.045);
      float alpha = 1.0 - smoothstep(-0.006, 0.0, d);
      vec2 tuv = (uv - 0.5) * uCover + 0.5;
      vec4 tc = texture2D(uTex, tuv);               // premultiplicado: el producto ya trae su transparencia
      float depth = clamp((vZ + uRad) / (2.0 * uRad), 0.0, 1.0);
      float shade = mix(0.14, 1.0, smoothstep(0.05, 0.95, depth));
      if (!gl_FrontFacing) shade *= 0.45;
      // brillo suave que recorre el producto al pasar por delante
      float sheen = smoothstep(0.35, 0.0, abs(vUv.x - 0.5 + (depth - 0.75) * 1.6)) * 0.07 * depth;
      float k = alpha * uLoaded * mix(0.35, 1.0, depth);
      gl_FragColor = vec4((tc.rgb * shade + sheen * tc.a) * k, tc.a * k);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('[hero3d]', e); return; }
  gl.useProgram(prog);

  const U = {};
  ['uProj', 'uView', 'uA0', 'uSpan', 'uR', 'uH', 'uTime', 'uVel', 'uTex', 'uCover', 'uAspect', 'uLoaded', 'uRad']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  /* ---------- Geometría: una tira curvada compartida ---------- */
  const verts = new Float32Array((SEG + 1) * 4);
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    verts.set([u, 1, u, 0], i * 4);
  }
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const aUv = gl.getAttribLocation(prog, 'aUv');
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

  gl.disable(gl.CULL_FACE);
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  /* ---------- Texturas ---------- */
  const planeAspect = W / H;

  // Prepara cada producto para flotar en el anillo, sin tarjeta:
  // - PNG/WebP con transparencia: se usa tal cual.
  // - Foto con fondo liso (blanco, gris): se quita el fondo desde los bordes.
  // Después se recorta al producto, se centra y se añade un reflejo en el suelo.
  function fitImage(img) {
    try {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      // 1) Trabajar a tamaño moderado
      const k = Math.min(1, 900 / Math.max(iw, ih));
      const w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
      const a = document.createElement('canvas'); a.width = w; a.height = h;
      const ax = a.getContext('2d', { willReadFrequently: true });
      ax.drawImage(img, 0, 0, w, h);
      const id = ax.getImageData(0, 0, w, h);
      const d = id.data;
      const at = (x, y) => (y * w + x) * 4;

      // 2) ¿Ya trae transparencia?
      let transparent = 0;
      [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].forEach(([x, y]) => { if (d[at(x, y) + 3] < 40) transparent++; });

      if (transparent < 2 && removeBg) {
        // color de fondo = media del borde
        let r = 0, g = 0, b = 0, n = 0;
        for (let x = 0; x < w; x += 4) for (const y of [0, h - 1]) { const i = at(x, y); r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        for (let y = 0; y < h; y += 4) for (const x of [0, w - 1]) { const i = at(x, y); r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        const bg = [r / n, g / n, b / n];
        const diff = (i) => Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]);
        // relleno desde los bordes: solo se borra el fondo conectado con el exterior,
        // así los blancos dentro de la prenda (suelas, logos) se conservan
        const T0 = 14, T1 = 46;
        const seen = new Uint8Array(w * h);
        const stack = [];
        for (let x = 0; x < w; x++) { stack.push(x, 0, x, h - 1); }
        for (let y = 0; y < h; y++) { stack.push(0, y, w - 1, y); }
        while (stack.length) {
          const y = stack.pop(), x = stack.pop();
          const p = y * w + x;
          if (seen[p]) continue;
          seen[p] = 1;
          const i = p * 4, df = diff(i);
          if (df >= T1) continue;
          d[i + 3] = df <= T0 ? 0 : Math.round(d[i + 3] * (df - T0) / (T1 - T0));
          if (x > 0) stack.push(x - 1, y);
          if (x < w - 1) stack.push(x + 1, y);
          if (y > 0) stack.push(x, y - 1);
          if (y < h - 1) stack.push(x, y + 1);
        }
        // limpiar halo: 2 pasadas sobre el contorno, quitando píxeles claros pegados al fondo
        for (let pass = 0; pass < 2; pass++) {
          const out = new Uint8Array(w * h);
          for (let p = 0; p < w * h; p++) out[p] = d[p * 4 + 3] < 128 ? 1 : 0;
          for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            const p = y * w + x;
            if (out[p] || !(out[p - 1] || out[p + 1] || out[p - w] || out[p + w])) continue;
            const i = p * 4, df = diff(i);
            if (df < 140) d[i + 3] = Math.round(d[i + 3] * Math.max(0, (df - T1) / (140 - T1)));
          }
        }
        // quitar el color del fondo mezclado en los bordes semitransparentes
        for (let p = 0; p < w * h; p++) {
          const i = p * 4, al = d[i + 3] / 255;
          if (al > 0.02 && al < 0.98) for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, (d[i + c] - bg[c] * (1 - al)) / al));
        }
        ax.putImageData(id, 0, 0);
      }

      // 3) Caja del producto según la transparencia
      let x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
        if (d[at(x, y) + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 <= x0 || y1 <= y0) return null;
      const sx = Math.max(0, x0 - 2), sy = Math.max(0, y0 - 2);
      const sw = Math.min(w - sx, x1 - x0 + 5), sh = Math.min(h - sy, y1 - y0 + 5);

      // 4) Componer: producto arriba, reflejo abajo, fondo transparente
      const TW = 640, TH = Math.round(TW / planeAspect);
      const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
      const x = cv.getContext('2d');
      const areaH = TH * 0.74, pad = 0.06;
      const sc = Math.min((TW * (1 - pad * 2)) / sw, (areaH * (1 - pad * 2)) / sh);
      const dw = sw * sc, dh = sh * sc;
      const dx = (TW - dw) / 2, dy = areaH - dh - areaH * pad * 0.6;  // apoyado en el "suelo"
      // reflejo
      x.save();
      x.translate(0, (dy + dh) * 2 + 4); x.scale(1, -1);
      x.globalAlpha = 0.22;
      x.drawImage(a, sx, sy, sw, sh, dx, dy, dw, dh);
      x.restore();
      const fade = x.createLinearGradient(0, dy + dh, 0, dy + dh + dh * 0.45);
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
      x.save(); x.globalCompositeOperation = 'destination-out';
      x.fillStyle = fade; x.fillRect(0, dy + dh, TW, TH - dy - dh);
      x.restore();
      // producto
      x.drawImage(a, sx, sy, sw, sh, dx, dy, dw, dh);
      return cv;
    } catch (e) { return null; } // imagen sin CORS: se usa la foto tal cual
  }

  const cards = items.map((it, i) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([30, 30, 32, 255]));
    ['TEXTURE_WRAP_S', 'TEXTURE_WRAP_T'].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, gl[k], gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const card = { item: it, tex, base: (i / N) * Math.PI * 2, cover: [1, 1], loaded: 0, target: 0 };
    if (it.img) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        const fitted = fitImage(img);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fitted || img); } catch (e) { return; }
        if (fitted) card.cover = [1, 1];
        else {
          const ia = img.naturalWidth / img.naturalHeight;
          card.cover = ia > planeAspect ? [planeAspect / ia, 1] : [1, ia / planeAspect];
        }
        card.target = 1;
        wake();
      };
      img.src = it.img.startsWith('//') ? 'https:' + it.img : it.img;
    }
    return card;
  });

  /* ---------- Matrices ---------- */
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  const rotX = (t) => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const rotY = (t) => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
  const rotZ = (t) => { const c = Math.cos(t), s = Math.sin(t); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
  const trans = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);

  /* ---------- Estado / interacción ---------- */
  let w = 1, h = 1, aspect = 1, proj;
  let rot = 0, vel = 0, scrollP = 0, mx = 0, my = 0, smx = 0, smy = 0;
  let intro = 0; // 0 → 1 animación de entrada
  let dragging = false, lastX = 0, downX = 0, downY = 0, moved = false;
  let running = false, visible = true, raf = 0, t0 = performance.now(), last = t0;
  let focusIdx = -1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width * DPR));
    h = Math.max(1, Math.round(r.height * DPR));
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    aspect = r.width / r.height;
    proj = perspective((aspect < 1 ? 46 : 34) * Math.PI / 180, aspect, 0.1, 100);
    wake();
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false; lastX = downX = e.clientX; downY = e.clientY;
    canvas.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width) * 2 - 1;
    my = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      if (Math.abs(e.clientX - downX) > 6) moved = true;
      vel = dx * 0.0042;
    }
    wake();
  }, { passive: true });
  const end = () => { dragging = false; canvas.classList.remove('is-dragging'); };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  canvas.addEventListener('click', (e) => {
    if (moved || Math.abs(e.clientY - downY) > 6) return;
    const c = cards[focusIdx];
    if (c && c.item.url) window.location.href = c.item.url;
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { vel = 0.06; wake(); }
    if (e.key === 'ArrowLeft') { vel = -0.06; wake(); }
    if (e.key === 'Enter' && cards[focusIdx]) window.location.href = cards[focusIdx].item.url;
  });

  function onScroll() {
    const r = root.getBoundingClientRect();
    scrollP = Math.min(1, Math.max(0, -r.top / r.height));
    wake();
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? wake() : stop(); }, { threshold: 0 }).observe(root);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : wake()));
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener('resize', resize);

  function wake() { if (!running && visible && !document.hidden) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function wrap(a) { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; }

  function setFocus(i) {
    if (i === focusIdx || !focusEl) { focusIdx = i; return; }
    focusIdx = i;
    const it = cards[i].item;
    focusEl.querySelector('a').href = it.url || '#';
    focusEl.querySelector('[data-f-title]').textContent = it.title || '';
    focusEl.querySelector('[data-f-price]').innerHTML = (it.compare ? '<s>' + it.compare + '</s> ' : '') + (it.price || '') + (it.badge ? ' <b>' + it.badge + '</b>' : '');
    focusEl.classList.remove('swap'); void focusEl.offsetWidth; focusEl.classList.add('swap');
    if (countEl) countEl.textContent = String((i % dataLen) + 1).padStart(2, '0') + ' / ' + String(dataLen).padStart(2, '0');
  }
  const dataLen = JSON.parse(dataEl.textContent || '[]').filter(Boolean).length || N;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = (now - t0) / 1000;

    intro = Math.min(1, intro + dt * 0.55);
    const ei = 1 - Math.pow(1 - intro, 4);

    if (!dragging) {
      vel *= Math.pow(0.0015, dt);              // inercia
      if (!reduce) vel += (0.0028 - vel) * dt * 1.2; // autogiro suave
    }
    rot += vel * (dt * 60);
    smx += (mx - smx) * Math.min(1, dt * 3);
    smy += (my - smy) * Math.min(1, dt * 3);

    // cámara: entra desde arriba y se inclina al hacer scroll
    const far = aspect < 1 ? Math.max(8.6, R + (W / 0.55) / (0.849 * aspect)) : 10.4;
    const dist = far + (1 - ei) * 6 - scrollP * 2.2;
    const tilt = 0.13 + (1 - ei) * 0.5 + scrollP * 0.35 + smy * 0.04;
    const camY = -0.15 + scrollP * 0.6;
    let view = mul(trans(0, camY, -dist), rotX(tilt));
    view = mul(view, rotY(smx * 0.12));
    view = mul(rotZ(-0.05 + smx * 0.02), view);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(U.uProj, false, proj);
    gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform1f(U.uSpan, SPAN);
    gl.uniform1f(U.uR, R);
    gl.uniform1f(U.uRad, R);
    gl.uniform1f(U.uH, H);
    gl.uniform1f(U.uAspect, planeAspect);
    gl.uniform1f(U.uTime, reduce ? 0 : time);
    gl.uniform1f(U.uVel, reduce ? 0 : Math.max(-1, Math.min(1, vel * 14)));

    // ordenar de atrás hacia delante
    const spin = rot + (1 - ei) * -2.2 + scrollP * 1.4;
    const order = cards.map((c, i) => {
      const a = c.base + spin;
      return { c, i, a, z: Math.cos(a) };
    }).sort((p, q) => p.z - q.z);

    let best = 0, bestD = 9;
    for (const o of order) {
      const c = o.c;
      c.loaded += (c.target - c.loaded) * Math.min(1, dt * 4);
      gl.bindTexture(gl.TEXTURE_2D, c.tex);
      gl.uniform1f(U.uA0, o.a);
      gl.uniform2f(U.uCover, c.cover[0], c.cover[1]);
      gl.uniform1f(U.uLoaded, c.loaded);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, (SEG + 1) * 2);
      const d = Math.abs(wrap(o.a));
      if (d < bestD) { bestD = d; best = o.i; }
    }
    setFocus(best);

    const settled = intro >= 1 && !dragging && reduce && Math.abs(vel) < 0.0004 && cards.every((c) => Math.abs(c.target - c.loaded) < 0.01);
    if (!settled && running) raf = requestAnimationFrame(frame);
    else running = false;
  }

  resize();
  onScroll();
  root.classList.add('is-gl');
  canvas.classList.add('is-ready');
  wake();
})();
