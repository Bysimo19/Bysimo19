import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

const ACCENT = 0xff5b1f;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = (t) => 1 - Math.pow(1 - t, 4);
const easeOutBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

/* ---------- Bucle global: solo renderiza escenas visibles ---------- */
const loops = new Set();
let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  for (const l of loops) if (l.visible) l.frame(now / 1000, dt);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function register(container, frame) {
  const entry = { visible: false, frame };
  new IntersectionObserver(([e]) => { entry.visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(container);
  loops.add(entry);
  return entry;
}

function makeRenderer(container, shadows = true) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.shadowMap.enabled = shadows;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  container.appendChild(r.domElement);
  return r;
}

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/* ---------- Texturas procedurales ---------- */
function canvasTex(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 4;
  return t;
}

const cardboardTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#c4935c'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${Math.random() > .5 ? '255,230,190' : '90,55,25'},${Math.random() * .08})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  g.fillStyle = 'rgba(230,205,160,.75)'; g.fillRect(0, s * .44, s, s * .12);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(s * .12, s * .66, s * .3, s * .16);
  g.fillStyle = 'rgba(30,30,30,.55)'; for (let i = 0; i < 3; i++) g.fillRect(s * .15, s * (.69 + i * .04), s * (.24 - i * .05), s * .015);
});

const doorTex = canvasTex(256, (g, s) => {
  const grad = g.createLinearGradient(0, 0, 0, 16);
  grad.addColorStop(0, '#ff7a45'); grad.addColorStop(.5, '#ff5b1f'); grad.addColorStop(1, '#c23d0c');
  for (let y = 0; y < s; y += 16) { g.save(); g.translate(0, y); g.fillStyle = grad; g.fillRect(0, 0, s, 16); g.restore(); }
}, [1, 6]);

const floorGridTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#d9d6cf'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  g.strokeStyle = 'rgba(40,40,40,.35)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
});

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: .02, ...o });
const M = {
  concrete: mat(0xbfc3c9, { roughness: .92 }),
  concreteDark: mat(0x7d838c, { roughness: .95 }),
  inner: mat(0xe7e3da, { roughness: .95 }),
  steel: mat(0x3a3f47, { metalness: .6, roughness: .4 }),
  door: new THREE.MeshStandardMaterial({ map: doorTex, roughness: .45, metalness: .35, side: THREE.DoubleSide }),
  cardboard: new THREE.MeshStandardMaterial({ map: cardboardTex, roughness: .85 }),
  white: mat(0xf2f1ee, { roughness: .5 }),
  dark: mat(0x23262b, { roughness: .6 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xffd7a3, transparent: true, opacity: 0 }),
  ground: mat(0x16191e, { roughness: 1 }),
  stripe: new THREE.MeshBasicMaterial({ color: 0xffc24b }),
  accent: mat(ACCENT, { roughness: .5 }),
};

function box(w, h, d, material, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

/* ================================================================
   HERO · diorama isométrico de un edificio de trasteros
   ================================================================ */
export function createHero(container) {
  const renderer = makeRenderer(container);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera();
  const world = new THREE.Group();
  scene.add(world);

  scene.add(new THREE.HemisphereLight(0xcfdcff, 0x2a1a10, .85));
  const sun = new THREE.DirectionalLight(0xfff1e0, 2.6);
  sun.position.set(9, 16, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6f8cff, 1.1);
  rim.position.set(-12, 8, -10);
  scene.add(rim);
  const warm = new THREE.PointLight(ACCENT, 18, 14, 2);
  warm.position.set(0, 1.4, 4.5);
  scene.add(warm);

  // Suelo
  const ground = new THREE.Mesh(new THREE.CircleGeometry(22, 64), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  world.add(ground);
  const pad = at(box(13, .2, 9.5, M.concreteDark), 0, .1, .9);
  world.add(pad);

  const UW = 2.2, UH = 2.6, UD = 2.6, COLS = 4, FLOORS = 2, SLAB = .22;
  const W = UW * COLS, front = UD / 2;
  const building = new THREE.Group();
  building.position.y = .2;
  world.add(building);

  const doors = [];
  for (let f = 0; f < FLOORS; f++) {
    const y0 = f * (UH + SLAB);
    building.add(at(box(W + .3, SLAB, UD + (f ? 1.2 : .3), M.concrete), 0, y0 + UH + SLAB / 2, f ? .45 : 0)); // techo / pasarela
    building.add(at(box(W + .3, UH, .2, M.concrete), 0, y0 + UH / 2, -UD / 2)); // fondo
    for (let c = 0; c <= COLS; c++) {
      const x = -W / 2 + c * UW;
      building.add(at(box(.24, UH, UD, M.concrete), x, y0 + UH / 2, 0)); // tabiques
    }
    for (let c = 0; c < COLS; c++) {
      const cx = -W / 2 + UW / 2 + c * UW;
      const dw = UW - .24, dh = UH - .42;
      building.add(at(box(dw, .42, .24, M.concrete), cx, y0 + UH - .21, front - .12)); // dintel
      // Interior: paredes claras, luz cálida y cajas
      building.add(at(new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), M.inner), cx, y0 + dh / 2, -UD / 2 + .11));
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(dw * .6, .5), M.glow.clone());
      glow.rotation.x = Math.PI / 2; glow.position.set(cx, y0 + UH - .01, 0);
      building.add(glow);
      const stuff = new THREE.Group();
      const n = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        const s = .35 + Math.random() * .3;
        const b = box(s, s * .8, s, M.cardboard, .02);
        const col = i % 3, row = Math.floor(i / 3);
        b.position.set(cx - .6 + col * .55 + Math.random() * .08, y0 + s * .4 + row * .5, -UD / 2 + .45 + Math.random() * .4);
        b.rotation.y = (Math.random() - .5) * .3;
        stuff.add(b);
      }
      if (Math.random() > .5) stuff.add(at(box(.6, 1.6, .6, M.white, .04), cx + .55, y0 + .8, -UD / 2 + .5));
      building.add(stuff);
      // Puerta enrollable (pivota en su borde superior)
      const pivot = new THREE.Group();
      pivot.position.set(cx, y0 + dh, front - .02);
      const geo = new THREE.PlaneGeometry(dw - .04, dh); geo.translate(0, -dh / 2, 0);
      const door = new THREE.Mesh(geo, M.door); door.castShadow = true;
      pivot.add(door);
      building.add(pivot);
      building.add(at(box(dw, .2, .2, M.steel), cx, y0 + dh + .1, front + .02));
      // Número de trastero
      const light = at(new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .05), new THREE.MeshBasicMaterial({ color: 0xffe2b8 })), cx, y0 + UH - .1, front + .02);
      building.add(light);
      doors.push({ door, glow, t: 0, target: 0, until: 0 });
    }
  }
  // Barandilla de la pasarela
  const railY = UH + SLAB + .2;
  const rail = at(box(W + .3, .05, .05, M.steel), 0, railY + 1, front + 1.0);
  building.add(rail);
  for (let i = 0; i <= 16; i++) building.add(at(box(.035, 1, .035, M.steel), -W / 2 - .1 + i * (W + .2) / 16, railY + .5, front + 1.0));
  // Escalera lateral
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    building.add(at(box(1.1, .2, .42, M.concrete), W / 2 + .75, (i + .5) * (UH + SLAB) / steps, -2.4 + i * .3));
  }
  // Rótulo
  const sign = at(box(3.2, .55, .12, M.accent, .05), -W / 2 + 1.9, 2 * (UH + SLAB) + .45, .2);
  building.add(sign);

  // Zona de carga: rayas
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(.18, 1.3), M.stripe);
    s.rotation.x = -Math.PI / 2; s.rotation.z = .5; s.position.set(-3.2 + i * .55, .211, front + 2.6);
    world.add(s);
  }
  // Furgoneta
  const van = new THREE.Group();
  van.add(at(box(2.9, 1.5, 1.4, M.white, .12), 0, 1.05, 0));
  van.add(at(box(.9, 1.0, 1.36, M.white, .12), 1.75, .8, 0));
  van.add(at(box(.5, .5, 1.38, new THREE.MeshStandardMaterial({ color: 0x1d2a3a, metalness: .6, roughness: .15 }), .05), 1.9, 1.05, 0));
  van.add(at(box(2.9, .12, 1.42, M.accent), 0, .95, 0));
  for (const [x, z] of [[-.9, .62], [-.9, -.62], [1.6, .62], [1.6, -.62]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .2, 20), M.dark);
    w.rotation.x = Math.PI / 2; w.position.set(x, .3, z); w.castShadow = true;
    van.add(w);
  }
  van.position.set(-2.4, .2, front + 2.7);
  world.add(van);

  // Carro con cajas que recorre el frente
  const cart = new THREE.Group();
  cart.add(at(box(.9, .06, .6, M.steel), 0, .2, 0));
  cart.add(at(box(.05, .9, .6, M.steel), -.45, .6, 0));
  cart.add(at(box(.45, .38, .4, M.cardboard, .02), .05, .43, 0));
  cart.add(at(box(.38, .3, .36, M.cardboard, .02), .02, .77, .02));
  cart.add(at(box(.3, .26, .3, M.cardboard, .02), .2, .43 + .32, -.02));
  cart.position.set(0, .2, front + 1.2);
  world.add(cart);

  // Cajas en palé
  const pallet = new THREE.Group();
  pallet.add(at(box(1.1, .14, .9, mat(0xa47b4f)), 0, .07, 0));
  for (let i = 0; i < 6; i++) pallet.add(at(box(.5, .4, .42, M.cardboard, .02), -.27 + (i % 2) * .54, .35 + Math.floor(i / 2) * .41, 0));
  pallet.position.set(5.6, .2, front + 1.7); pallet.rotation.y = -.3;
  world.add(pallet);

  // Estado y cámara
  let aspect = 1, mx = 0, my = 0, smx = 0, smy = 0, scroll = 0;
  const start = performance.now() / 1000;
  const size = () => {
    const r = container.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    aspect = r.width / r.height;
    const fr = aspect < 1 ? 15 / aspect * .8 : 15;
    camera.left = -fr * aspect / 2; camera.right = fr * aspect / 2; camera.top = fr / 2; camera.bottom = -fr / 2;
    camera.near = -100; camera.far = 100;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(size).observe(container);
  size();
  window.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
  window.addEventListener('scroll', () => { scroll = Math.min(scrollY / innerHeight, 1.2); }, { passive: true });

  doors[1].target = 1; doors[6].target = 1;
  let nextSwap = 0;

  const frame = (t, dt) => {
    const k = reduced ? 1 : easeOut(Math.min((t - start) / 2.4, 1));
    smx = damp(smx, mx, 3, dt); smy = damp(smy, my, 3, dt);
    world.rotation.y = .32 + (1 - k) * -1.1 + smx * .3 - scroll * .45;
    camera.zoom = (.72 + .28 * k) * (1 + scroll * .25);
    camera.position.set(20, 15 + smy * -3, 20);
    camera.lookAt(.6, 2.2 - scroll * 1.2, 0);
    camera.updateProjectionMatrix();
    building.scale.y = reduced ? 1 : .001 + .999 * easeOutBack(Math.min(Math.max((t - start - .2) / 1.4, 0), 1));

    if (!reduced && t > nextSwap) {
      nextSwap = t + 1.3 + Math.random();
      const closed = doors.filter((d) => d.target === 0);
      const pick = closed[Math.floor(Math.random() * closed.length)];
      if (pick) { pick.target = 1; pick.until = t + 3 + Math.random() * 2.5; }
    }
    for (const d of doors) {
      if (d.target === 1 && d.until && t > d.until) { d.target = 0; d.until = 0; }
      d.t = reduced ? d.target : damp(d.t, d.target, 2.6, dt);
      d.door.scale.y = Math.max(1 - d.t * .93, .07);
      d.glow.material.opacity = d.t * .95;
    }
    cart.position.x = reduced ? 1.5 : ((t * .9) % 14) - 6;
    renderer.render(scene, camera);
  };
  register(container, frame);
  if (reduced) setTimeout(() => frame(performance.now() / 1000, .016), 50);
}

/* ================================================================
   CALCULADORA · trastero a escala con tus cosas dentro
   ================================================================ */
const builders = {
  cajas(w, d, h) {
    const g = new THREE.Group(); const n = 5, bh = h / n;
    for (let i = 0; i < n; i++) {
      const b = box(w - .02, bh - .015, d - .02, M.cardboard, .015);
      b.position.set(w / 2 + (Math.random() - .5) * .03, bh * i + bh / 2, d / 2 + (Math.random() - .5) * .03);
      b.rotation.y = (Math.random() - .5) * .08;
      g.add(b);
    }
    return g;
  },
  sofa(w, d, h, m) {
    const g = new THREE.Group();
    g.add(at(box(w - .3, .42, d - .2, m, .06), w / 2, .21, d / 2 + .1));
    g.add(at(box(w, .5, .22, m, .08), w / 2, .6, .11));
    g.add(at(box(.18, .62, d, m, .07), .09, .31, d / 2));
    g.add(at(box(.18, .62, d, m, .07), w - .09, .31, d / 2));
    g.add(at(box(w - .4, .12, d - .3, mat(0x8a9a8d), .05), w / 2, .48, d / 2 + .12));
    return g;
  },
  colchon(w, d, h, m) { return at(box(w, h, d, m, .07), w / 2, h / 2, d / 2); },
  somier(w, d, h, m) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) g.add(at(box(w, h / 3 - .02, d, m, .02), w / 2, (h / 3) * i + h / 6, d / 2));
    return g;
  },
  armario(w, d, h, m) {
    const g = new THREE.Group();
    g.add(at(box(w, h, d, m, .02), w / 2, h / 2, d / 2));
    g.add(at(box(.02, h - .2, .02, M.dark), w / 2, h / 2, d + .005));
    g.add(at(box(.03, .25, .03, M.steel), w / 2 - .08, h * .55, d + .02));
    g.add(at(box(.03, .25, .03, M.steel), w / 2 + .08, h * .55, d + .02));
    return g;
  },
  nevera(w, d, h) {
    const g = new THREE.Group();
    g.add(at(box(w, h, d, M.white, .05), w / 2, h / 2, d / 2));
    g.add(at(box(w - .04, .015, .01, M.dark), w / 2, h * .62, d + .003));
    g.add(at(box(.03, .4, .04, M.steel), w - .08, h * .78, d + .02));
    return g;
  },
  lavadora(w, d, h) {
    const g = new THREE.Group();
    g.add(at(box(w, h, d, M.white, .04), w / 2, h / 2, d / 2));
    const door = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .04, 32), new THREE.MeshStandardMaterial({ color: 0x2c3a4a, metalness: .5, roughness: .1 }));
    door.rotation.x = Math.PI / 2; door.position.set(w / 2, h * .45, d + .01);
    g.add(door);
    return g;
  },
  mesa(w, d, h, m) {
    const g = new THREE.Group();
    g.add(at(box(w, .05, d, m, .01), w / 2, .74, d / 2));
    for (const [x, z] of [[.05, .05], [w - .05, .05], [.05, d - .05], [w - .05, d - .05]]) g.add(at(box(.05, .72, .05, m), x, .36, z));
    for (let i = 0; i < 4; i++) g.add(at(box(.42, .05, .42, mat(0x40464f), .01), w / 2 + (i % 2 ? .25 : -.25), .79 + .06 * Math.floor(i / 2) + (i > 1 ? .06 : 0), d / 2));
    return g;
  },
  bici(w, d, h, m) {
    const g = new THREE.Group();
    const wheelMat = M.dark;
    for (const x of [.38, w - .38]) {
      const wh = new THREE.Mesh(new THREE.TorusGeometry(.34, .025, 8, 32), wheelMat);
      wh.position.set(x, .36, d / 2); wh.castShadow = true;
      g.add(wh);
    }
    const bar = (x1, y1, x2, y2) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, len, 8), m);
      c.position.set((x1 + x2) / 2, (y1 + y2) / 2, d / 2);
      c.rotation.z = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;
      c.castShadow = true;
      g.add(c);
    };
    bar(.38, .36, .85, .36); bar(.85, .36, .7, .85); bar(.7, .85, w - .5, .85); bar(w - .5, .85, w - .38, .36); bar(.85, .36, w - .5, .85); bar(.38, .36, .7, .85);
    g.add(at(box(.24, .05, .1, M.dark, .02), .68, .9, d / 2));
    g.add(at(box(.05, .05, .44, M.dark, .02), w - .48, h - .05, d / 2));
    return g;
  },
  moto(w, d, h, m) {
    const g = new THREE.Group();
    for (const x of [.36, w - .36]) {
      const wh = new THREE.Mesh(new THREE.TorusGeometry(.28, .09, 10, 28), M.dark);
      wh.position.set(x, .37, d / 2); wh.castShadow = true;
      g.add(wh);
    }
    g.add(at(box(w * .55, .38, .32, m, .12), w * .5, .72, d / 2));
    g.add(at(box(.6, .1, .28, M.dark, .04), w * .38, .95, d / 2));
    g.add(at(box(.08, .5, .08, M.steel), w - .45, .75, d / 2));
    g.add(at(box(.06, .06, .7, M.steel), w - .45, h - .06, d / 2));
    return g;
  },
  tv(w, d, h) {
    const g = new THREE.Group();
    g.add(at(box(w, h, d, M.cardboard, .02), w / 2, h / 2, d / 2));
    return g;
  },
  estanteria(w, d, h, m) {
    const g = new THREE.Group();
    for (const x of [.02, w - .02]) g.add(at(box(.04, h, d, m), x, h / 2, d / 2));
    for (let i = 0; i < 5; i++) {
      const y = .05 + i * (h - .1) / 4;
      g.add(at(box(w, .03, d, m), w / 2, y, d / 2));
      if (i < 4) for (let j = 0; j < 2; j++) g.add(at(box(.4, .3, d - .1, M.cardboard, .015), .27 + j * .46, y + .17, d / 2));
    }
    return g;
  },
  deporte(w, d, h, m) {
    const g = new THREE.Group();
    g.add(at(box(.18, h, .14, m, .06), .15, h / 2, d / 2));
    g.add(at(box(.18, h * .95, .14, mat(0x2b6cb0), .06), .38, h * .475, d / 2));
    g.add(at(box(.2, .6, d - .05, M.dark, .08), w - .14, .3, d / 2));
    return g;
  },
};

export function createCalc(container) {
  const renderer = makeRenderer(container);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  scene.add(new THREE.HemisphereLight(0xe6eeff, 0x302418, 1.1));
  const key = new THREE.DirectionalLight(0xfff3e6, 2.4);
  key.position.set(6, 10, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  key.shadow.normalBias = .02;
  scene.add(key);
  const fill = new THREE.PointLight(0xffc89a, 8, 12, 2);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.ShadowMaterial({ opacity: .35 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const unit = new THREE.Group();
  const items = new THREE.Group();
  scene.add(unit, items);
  const person = new THREE.Group();
  const pm = mat(0x5a606a, { roughness: .9 });
  person.add(at(new THREE.Mesh(new THREE.CapsuleGeometry(.2, .9, 6, 16), pm), 0, .85, 0));
  person.add(at(new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 16), pm), 0, 1.62, 0));
  person.traverse((o) => { o.castShadow = true; });
  scene.add(person);

  const H = 2.5;
  let W = 2, D = 1.5;
  let theta = .62, phi = 1.0, dist = 9, distT = 9, thetaT = .62;
  const center = new THREE.Vector3();

  function buildUnit() {
    unit.clear();
    const floorMat = M.concrete.clone();
    floorMat.map = floorGridTex.clone(); floorMat.map.needsUpdate = true;
    floorMat.map.repeat.set(W, D); floorMat.color.set(0xffffff);
    unit.add(at(box(W + .12, .08, D + .12, floorMat), W / 2, -.04, D / 2));
    unit.add(at(box(W + .12, H, .06, M.inner), W / 2, H / 2, -.03));
    unit.add(at(box(.06, H, D + .06, M.inner), -.03, H / 2, D / 2));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .35 }));
    edges.position.set(W / 2, H / 2, D / 2);
    unit.add(edges);
    unit.position.set(-W / 2, 0, -D / 2);
    items.position.copy(unit.position);
    person.position.set(W / 2 + .7, 0, D / 2 - .2);
    fill.position.set(0, H + .5, D);
    distT = Math.max(W * 1.45, D * 2, 3.4) + 6.5;
  }

  const animated = [];
  function setItems(placements, overflow) {
    items.clear(); animated.length = 0;
    const now = performance.now() / 1000;
    let i = 0;
    const place = (p, outside) => {
      const { item } = p;
      const material = outside ? mat(0xff4d4d, { transparent: true, opacity: .55 }) : mat(item.color);
      const g = builders[item.shape](item.w, item.d, item.h, material);
      if (outside) g.traverse((o) => { if (o.isMesh) o.material = material; });
      const holder = new THREE.Group();
      holder.add(g);
      if (p.rot) { g.rotation.y = Math.PI / 2; g.position.z = item.w; }
      holder.position.set(p.x, 0, p.z);
      holder.userData = { y: 0, t0: now + i * .045 };
      items.add(holder);
      animated.push(holder);
      i++;
    };
    placements.forEach((p) => place(p, false));
    let ox = 0;
    overflow.forEach((p) => {
      const iw = p.item.w;
      place({ item: p.item, x: ox, z: D + 1.1, rot: false }, true);
      ox += iw + .1;
    });
  }

  function setUnit(w, d) { W = w; D = d; buildUnit(); }

  // Control de órbita mínimo
  let dragging = false, px = 0, py = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    thetaT = Math.max(-.2, Math.min(1.45, thetaT - (e.clientX - px) * .006));
    phi = Math.max(.55, Math.min(1.3, phi - (e.clientY - py) * .004));
    px = e.clientX; py = e.clientY;
  });
  el.addEventListener('pointerup', () => { dragging = false; });
  el.addEventListener('pointercancel', () => { dragging = false; });

  const size = () => {
    const r = container.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(size).observe(container);
  size();
  buildUnit();

  register(container, (t, dt) => {
    dist = damp(dist, distT * (camera.aspect < .9 ? 1.45 : 1), 4, dt);
    if (!dragging && !reduced) thetaT += Math.sin(t * .25) * .0006;
    theta = damp(theta, thetaT, 6, dt);
    center.set(0, .9, 0);
    camera.position.set(
      center.x + dist * Math.sin(theta) * Math.sin(phi),
      center.y + dist * Math.cos(phi) + .4,
      center.z + dist * Math.cos(theta) * Math.sin(phi)
    );
    camera.lookAt(center.x, center.y - .1, center.z);
    for (const h of animated) {
      const k = reduced ? 1 : Math.min(Math.max((t - h.userData.t0) / .55, 0), 1);
      h.position.y = (1 - easeOut(k)) * 2.6;
      h.scale.setScalar(.6 + .4 * easeOutBack(k));
    }
    renderer.render(scene, camera);
  });

  return { setUnit, setItems };
}

/* ================================================================
   CTA FINAL · cajas flotando
   ================================================================ */
export function createFinal(container) {
  const renderer = makeRenderer(container, false);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e1013, 8, 26);
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 60);
  camera.position.set(0, 0, 14);
  scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x3a2414, 1.2));
  const l = new THREE.DirectionalLight(0xffe2c6, 2); l.position.set(5, 6, 8); scene.add(l);
  const o = new THREE.PointLight(ACCENT, 60, 20, 2); o.position.set(0, -2, 4); scene.add(o);

  const N = 70;
  const geo = new RoundedBoxGeometry(1, .8, 1, 2, .04);
  const mesh = new THREE.InstancedMesh(geo, M.cardboard, N);
  scene.add(mesh);
  const data = Array.from({ length: N }, () => ({
    p: new THREE.Vector3((Math.random() - .5) * 26, (Math.random() - .5) * 14, -Math.random() * 14 + 2),
    r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
    s: .4 + Math.random() * .9,
    v: (Math.random() - .5) * .4,
    sp: .15 + Math.random() * .35,
  }));
  // Hueco central para el titular
  data.forEach((d) => { if (Math.abs(d.p.x) < 6 && Math.abs(d.p.y) < 2.6 && d.p.z > -4) d.p.x += Math.sign(d.p.x || 1) * 6; });
  const dummy = new THREE.Object3D();
  let mx = 0, my = 0;
  window.addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  const size = () => {
    const r = container.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
  };
  new ResizeObserver(size).observe(container);
  size();

  register(container, (t) => {
    const tt = reduced ? 0 : t;
    data.forEach((d, i) => {
      dummy.position.set(d.p.x, d.p.y + Math.sin(tt * d.sp + i) * .4, d.p.z);
      dummy.rotation.set(d.r.x + tt * d.v, d.r.y + tt * d.v * .7, 0);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    camera.position.x += (mx * 2 - camera.position.x) * .04;
    camera.position.y += (-my * 1.4 - camera.position.y) * .04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  });
}
