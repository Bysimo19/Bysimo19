/* =========================================================
   CONFIGURACIÓN · edita aquí precios, stock y contacto
   ========================================================= */
const CONFIG = {
  whatsapp: '34600000000',
  // Pon aquí la URL de tu CRM / Formspree / Make / Zapier para recibir los leads (POST JSON).
  formEndpoint: '',
  promo: 0.5, // -50% los 2 primeros meses
};

const SIZES = [
  { m2: 1, w: 1, d: 1, price: 39, stock: 4, fits: '10–15 cajas, maletas y ropa de temporada' },
  { m2: 2, w: 2, d: 1, price: 59, stock: 6, fits: 'Un estudio, una moto o el material de deporte' },
  { m2: 3, w: 2, d: 1.5, price: 79, stock: 3, fits: 'Una habitación o los muebles de un estudiante', hot: 'Más elegido' },
  { m2: 5, w: 2.5, d: 2, price: 115, stock: 5, fits: 'Piso pequeño o una reforma de cocina' },
  { m2: 8, w: 4, d: 2, price: 165, stock: 2, fits: 'Piso de 1 o 2 habitaciones' },
  { m2: 12, w: 4, d: 3, price: 229, stock: 7, fits: 'Piso de 3 habitaciones o stock de tienda' },
  { m2: 18, w: 6, d: 3, price: 309, stock: 2, fits: 'Casa entera o almacén para empresa' },
];

const ITEMS = [
  { id: 'cajas', name: 'Cajas de mudanza', sub: 'Pack de 5', shape: 'cajas', w: .5, d: .4, h: 1.6, color: 0xc4935c, sw: '#c4935c', ic: '▦' },
  { id: 'sofa', name: 'Sofá 3 plazas', sub: '210 × 90 cm', shape: 'sofa', w: 2.1, d: .9, h: .85, color: 0x6b7f73, sw: '#6b7f73', ic: '▬' },
  { id: 'colchon', name: 'Colchón', sub: 'De pie, 150 × 200', shape: 'colchon', w: 2, d: .3, h: 1.5, color: 0xdfe6ee, sw: '#dfe6ee', ic: '▯' },
  { id: 'cama', name: 'Cama desmontada', sub: 'Somier y cabecero', shape: 'somier', w: 2, d: .35, h: 1.3, color: 0xb08a5e, sw: '#b08a5e', ic: '≡' },
  { id: 'armario', name: 'Armario', sub: '100 × 60 × 200', shape: 'armario', w: 1, d: .6, h: 2, color: 0xcfb48c, sw: '#cfb48c', ic: '▮' },
  { id: 'nevera', name: 'Frigorífico', sub: 'Combi', shape: 'nevera', w: .6, d: .65, h: 1.85, color: 0xf2f1ee, sw: '#f2f1ee', ic: '❒' },
  { id: 'lavadora', name: 'Lavadora', sub: '60 × 60', shape: 'lavadora', w: .6, d: .6, h: .85, color: 0xf2f1ee, sw: '#e9e7e2', ic: '◎' },
  { id: 'mesa', name: 'Mesa y 4 sillas', sub: 'Comedor', shape: 'mesa', w: 1.6, d: .9, h: 1, color: 0x9c7a55, sw: '#9c7a55', ic: '⊓' },
  { id: 'tv', name: 'TV y electrónica', sub: 'Embalada', shape: 'tv', w: 1.2, d: .25, h: .75, color: 0xc4935c, sw: '#8b6a46', ic: '▭' },
  { id: 'estanteria', name: 'Estantería con cajas', sub: '100 × 40 × 190', shape: 'estanteria', w: 1, d: .4, h: 1.9, color: 0x6e747c, sw: '#6e747c', ic: '☰' },
  { id: 'bici', name: 'Bicicleta', sub: 'Adulto', shape: 'bici', w: 1.75, d: .5, h: 1.05, color: 0x2b6cb0, sw: '#2b6cb0', ic: '⚲' },
  { id: 'moto', name: 'Moto o scooter', sub: 'Hasta 125 cc', shape: 'moto', w: 2, d: .8, h: 1.15, color: 0xd94b2b, sw: '#d94b2b', ic: '⚙' },
  { id: 'deporte', name: 'Esquís, golf, camping', sub: 'Material deportivo', shape: 'deporte', w: .9, d: .4, h: 1.8, color: 0x3f8f6b, sw: '#3f8f6b', ic: '⛷' },
];

const PRESETS = {
  estudiante: { cajas: 2, colchon: 1, bici: 1 },
  piso1: { cajas: 4, sofa: 1, colchon: 1, armario: 1, nevera: 1, lavadora: 1, mesa: 1, tv: 1 },
  piso3: { cajas: 8, sofa: 1, colchon: 2, cama: 2, armario: 2, nevera: 1, lavadora: 1, mesa: 1, tv: 1, estanteria: 1, bici: 1 },
  reforma: { cajas: 4, sofa: 1, mesa: 1, armario: 1, estanteria: 1, tv: 1 },
  ecommerce: { estanteria: 6, cajas: 12 },
};

/* ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const eur = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const dims = (s) => `${eur(s.w)} × ${eur(s.d)} m`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const bySize = (m2) => SIZES.find((s) => s.m2 === +m2) || SIZES[2];

let billing = 1;
const billingDiscount = () => ({ 1: 0, 6: .1, 12: .15 })[billing];

/* ---------- Oferta: fin de mes ---------- */
const now = new Date();
const offerEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
$$('[data-offer-end]').forEach((el) => { el.textContent = offerEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }); });
$$('[data-year]').forEach((el) => { el.textContent = now.getFullYear(); });
const cd = $('[data-countdown]');
function tickCountdown() {
  let s = Math.max(0, Math.floor((offerEnd - Date.now()) / 1000));
  const parts = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
  $$('b', cd).forEach((b, i) => { b.textContent = String(parts[i]).padStart(2, '0'); });
}
tickCountdown(); setInterval(tickCountdown, 1000);

/* ---------- Nav ---------- */
const nav = $('[data-nav]');
const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

/* ---------- Quick quote ---------- */
const qq = $('[data-quick-quote]');
function renderQQ() {
  const s = bySize(qq.size.value);
  $('[data-qq-old]').textContent = `${eur(s.price)} €`;
  $('[data-qq-new]').textContent = eur(s.price * CONFIG.promo);
}
qq.size.addEventListener('change', renderQQ); renderQQ();
qq.addEventListener('submit', (e) => {
  e.preventDefault();
  selectLeadSize(qq.size.value);
  $('#reservar').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
});

/* ---------- Tarjetas de tamaños ---------- */
function isoSVG(s) {
  const k = 13, c = .866, H = 2.5;
  const P = (x, y, z) => [(x - z) * c * k, ((x + z) * .5 - y) * k];
  const pts = (arr) => arr.map((p) => P(...p).map((v) => v.toFixed(1)).join(',')).join(' ');
  const { w, d } = s;
  const top = pts([[0, H, 0], [w, H, 0], [w, H, d], [0, H, d]]);
  const left = pts([[0, 0, d], [w, 0, d], [w, H, d], [0, H, d]]);
  const right = pts([[w, 0, 0], [w, 0, d], [w, H, d], [w, H, 0]]);
  const dw = Math.min(w * .7, 1.6), dx = (w - dw) / 2;
  const door = pts([[dx, 0, d], [dx + dw, 0, d], [dx + dw, 2, d], [dx, 2, d]]);
  const xs = [P(0, 0, d)[0], P(w, 0, 0)[0], P(0, H, d)[0], P(w, H, 0)[0]];
  const ys = [P(0, H, 0)[1], P(w, 0, d)[1]];
  const minX = Math.min(...xs) - 2, maxX = Math.max(...xs) + 2, minY = Math.min(...ys) - 2, maxY = Math.max(...ys) + 2;
  const vb = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  return `<svg viewBox="${vb}" width="${(maxX - minX).toFixed(0)}" height="${(maxY - minY).toFixed(0)}" aria-hidden="true">
    <polygon points="${top}" fill="#E8E3D8" stroke="#1112" />
    <polygon points="${left}" fill="#C9C3B6" stroke="#1112" />
    <polygon points="${right}" fill="#ADA697" stroke="#1112" />
    <polygon points="${door}" fill="#FF5B1F" />
  </svg>`;
}

const grid = $('[data-sizes-grid]');
function renderSizes() {
  const disc = billingDiscount();
  grid.innerHTML = SIZES.map((s) => {
    const after = s.price * (1 - disc);
    const low = s.stock <= 3;
    return `<article class="size ${s.hot ? 'size--hot' : ''} tilt">
      ${s.hot ? `<span class="size__tag">${s.hot}</span>` : ''}
      <div class="size__cube">${isoSVG(s)}</div>
      <div class="size__m2">${eur(s.m2)}<small>m²</small></div>
      <p class="size__fits">${s.fits}<br><small>${dims(s)} · 2,5 m alto</small></p>
      <div class="size__price"><s>${eur(after)} €</s><b>${eur(s.price * CONFIG.promo)} €</b><span>/mes</span></div>
      <p style="margin:2px 0 0;font-size:13px;opacity:.7">2 primeros meses · luego ${eur(after)} €/mes</p>
      <p class="size__stock ${low ? 'is-low' : ''}">● ${low ? `Solo quedan ${s.stock}` : `${s.stock} disponibles`}</p>
      <a href="#reservar" class="btn ${s.hot ? 'btn--accent' : 'btn--ghost'}" data-pick="${s.m2}">Reservar ${eur(s.m2)} m²</a>
    </article>`;
  }).join('') + `<article class="size size--custom tilt" style="background:var(--accent);color:#fff">
      <div class="size__m2" style="margin-top:8px">+18<small>m²</small></div>
      <p class="size__fits" style="color:#fff;opacity:.9">¿Empresa, obra o mudanza internacional? Te preparamos un espacio a medida y precio por volumen.</p>
      <a href="https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hola, necesito más de 18 m²')}" target="_blank" rel="noopener" class="btn" style="margin-top:auto;--bg:#0E1013">Pedir presupuesto</a>
    </article>`;
  bindTilt(grid);
}
grid.addEventListener('click', (e) => { const a = e.target.closest('[data-pick]'); if (a) selectLeadSize(a.dataset.pick); });
$$('[data-billing]').forEach((b) => b.addEventListener('click', () => {
  billing = +b.dataset.billing;
  $$('[data-billing]').forEach((x) => x.classList.toggle('is-active', x === b));
  renderSizes();
}));
renderSizes();

/* ---------- Calculadora ---------- */
const qty = Object.fromEntries(ITEMS.map((i) => [i.id, 0]));
let current = SIZES[2], manual = false, calc3d = null;

const list = $('[data-items]');
list.innerHTML = ITEMS.map((i) => `<li class="item" data-id="${i.id}">
  <span class="item__sw" style="background:${i.sw}22;color:${i.sw}">${i.ic}</span>
  <span class="item__name">${i.name}<small>${i.sub}</small></span>
  <span class="qty"><button type="button" data-d="-1" aria-label="Quitar ${i.name}">−</button><output>0</output><button type="button" data-d="1" aria-label="Añadir ${i.name}">+</button></span>
</li>`).join('');
list.addEventListener('click', (e) => {
  const b = e.target.closest('[data-d]'); if (!b) return;
  const id = b.closest('[data-id]').dataset.id;
  qty[id] = Math.max(0, Math.min(30, qty[id] + +b.dataset.d));
  manual = false; $$('[data-preset]').forEach((p) => p.classList.remove('is-active'));
  updateCalc();
});
$$('[data-preset]').forEach((p) => p.addEventListener('click', () => {
  for (const k in qty) qty[k] = PRESETS[p.dataset.preset][k] || 0;
  $$('[data-preset]').forEach((x) => x.classList.toggle('is-active', x === p));
  manual = false; updateCalc();
}));
$('[data-reset]').addEventListener('click', () => { for (const k in qty) qty[k] = 0; manual = false; updateCalc(); });

const tabs = $('[data-size-tabs]');
tabs.innerHTML = SIZES.map((s) => `<button type="button" role="radio" data-m2="${s.m2}">${eur(s.m2)} m²</button>`).join('');
tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-m2]'); if (!b) return;
  current = bySize(b.dataset.m2); manual = true; updateCalc();
});

function pack(units, W, D) {
  // Heurística "abajo-izquierda": coloca cada objeto en la primera esquina libre, probando ambas orientaciones.
  const gap = .04, placed = [], over = [], rects = [];
  let cands = [{ x: 0, z: 0 }];
  const sorted = [...units].sort((a, b) => b.w * b.d - a.w * a.d);
  const hit = (x, z, w, d) => rects.some((r) => x < r.x + r.w && x + w > r.x && z < r.z + r.d && z + d > r.z);
  for (const it of sorted) {
    let best = null;
    cands.sort((a, b) => a.z - b.z || a.x - b.x);
    for (const c of cands) {
      for (const o of [{ w: it.w, d: it.d, rot: false }, { w: it.d, d: it.w, rot: true }]) {
        if (c.x + o.w <= W + 1e-6 && c.z + o.d <= D + 1e-6 && !hit(c.x, c.z, o.w, o.d)) { best = { ...c, ...o }; break; }
      }
      if (best) break;
    }
    if (!best) { over.push({ item: it }); continue; }
    rects.push({ x: best.x, z: best.z, w: best.w + gap, d: best.d + gap });
    placed.push({ item: it, x: best.x, z: best.z, rot: best.rot });
    cands = cands.filter((c) => !(c.x === best.x && c.z === best.z));
    cands.push({ x: best.x + best.w + gap, z: best.z }, { x: best.x, z: best.z + best.d + gap });
  }
  return { placed, over };
}

function updateCalc() {
  const units = ITEMS.flatMap((i) => Array(qty[i.id]).fill(i));
  $$('.item', list).forEach((li) => {
    const n = qty[li.dataset.id];
    $('output', li).textContent = n;
    li.classList.toggle('has-qty', n > 0);
  });
  let rec = SIZES.find((s) => pack(units, s.w, s.d).over.length === 0) || null;
  if (!units.length) rec = SIZES[0];
  if (!manual) current = rec || SIZES[SIZES.length - 1];
  const { placed, over } = pack(units, current.w, current.d);
  const area = units.reduce((a, i) => a + i.w * i.d, 0);
  const pct = Math.round(Math.min(area / (current.w * current.d), 1.5) * 100);

  $$('button', tabs).forEach((b) => {
    b.classList.toggle('is-active', +b.dataset.m2 === current.m2);
    b.setAttribute('aria-checked', +b.dataset.m2 === current.m2);
    b.classList.toggle('is-rec', rec && +b.dataset.m2 === rec.m2 && units.length > 0);
  });
  const meter = $('[data-meter]');
  meter.style.width = `${Math.min(pct, 100)}%`;
  meter.className = over.length ? 'is-over' : pct > 80 ? 'is-high' : '';
  $('[data-fill-label]').textContent = over.length ? `${over.length} cosas no caben` : `${pct}% ocupado`;

  const show = rec && !manual ? rec : current;
  $('[data-rec-size]').textContent = `${eur(show.m2)} m²`;
  $('[data-rec-dims]').textContent = dims(show);
  $('[data-rec-old]').textContent = `${eur(show.price)} €`;
  $('[data-rec-new]').textContent = `${eur(show.price * CONFIG.promo)} €/mes`;
  $('.calc__result-k').textContent = manual ? 'Has elegido' : 'Te recomendamos';
  const warn = $('[data-warn]');
  if (!rec && units.length) { warn.hidden = false; warn.textContent = 'Necesitas más de 18 m². Te preparamos un espacio a medida.'; }
  else if (over.length) { warn.hidden = false; warn.textContent = `No cabe todo. Con ${eur(rec.m2)} m² sí entra.`; }
  else warn.hidden = true;
  $('[data-rec-cta]').dataset.m2 = show.m2;

  if (calc3d) { calc3d.setUnit(current.w, current.d); calc3d.setItems(placed, over); }
}
$('[data-rec-cta]').addEventListener('click', (e) => selectLeadSize(e.currentTarget.dataset.m2));

/* ---------- Lead form ---------- */
const lead = $('[data-lead]');
$('[data-lead-sizes]').innerHTML = SIZES.map((s) => `<label><input type="radio" name="size" value="${s.m2}" ${s.m2 === 3 ? 'checked' : ''}><span>${eur(s.m2)} m²<small>${eur(s.price * CONFIG.promo)} €</small></span></label>`).join('')
  + `<label><input type="radio" name="size" value="?"><span>¿?<small>Asesórame</small></span></label>`;
function selectLeadSize(m2) {
  const r = $(`input[name="size"][value="${m2}"]`, lead); if (r) r.checked = true;
}
const steps = $$('fieldset', lead), dots = $$('.lead__steps span', lead);
const goStep = (n) => { steps.forEach((f, i) => { f.hidden = i !== n; }); dots.forEach((d, i) => d.classList.toggle('is-on', i <= n)); };
$('[data-next]', lead).addEventListener('click', () => { goStep(1); lead.nombre.focus(); });
$('[data-back]', lead).addEventListener('click', () => goStep(0));
lead.addEventListener('submit', async (e) => {
  e.preventDefault();
  let ok = true;
  for (const name of ['nombre', 'telefono', 'email']) {
    const f = lead[name]; const v = f.checkValidity(); f.classList.toggle('is-invalid', !v); ok = ok && v;
  }
  const priv = lead.privacidad; priv.closest('.check').classList.toggle('is-invalid', !priv.checked); ok = ok && priv.checked;
  if (!ok) return;
  const data = Object.fromEntries(new FormData(lead));
  data.origen = 'web'; data.fecha = new Date().toISOString();
  await sendLead(data);
  steps.forEach((f) => { f.hidden = true; }); $('.lead__steps', lead).hidden = true;
  const ok$ = $('[data-ok]', lead); ok$.hidden = false;
  $('[data-ok-size]', lead).textContent = data.size === '?' ? 'tu tamaño ideal' : `${data.size} m²`;
  $('[data-ok-wa]', lead).href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(`Hola, soy ${data.nombre}. Acabo de reservar un trastero de ${data.size} m² en la web.`)}`;
});
async function sendLead(data) {
  try { localStorage.setItem('trastea_leads', JSON.stringify([...(JSON.parse(localStorage.getItem('trastea_leads') || '[]')), data])); } catch {}
  if (!CONFIG.formEndpoint) return;
  try { await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) }); } catch {}
}

/* ---------- Exit intent ---------- */
const exit = $('[data-exit]');
let exitShown = false;
try { exitShown = sessionStorage.getItem('trastea_exit') === '1'; } catch {}
const openExit = () => {
  if (exitShown || !$('[data-ok]').hidden) return;
  exitShown = true; exit.hidden = false;
  try { sessionStorage.setItem('trastea_exit', '1'); } catch {}
};
document.addEventListener('mouseout', (e) => { if (!e.relatedTarget && e.clientY < 10 && scrollY > 600) openExit(); });
exit.addEventListener('click', (e) => { if (e.target === exit || e.target.closest('[data-exit-close]')) exit.hidden = true; });
addEventListener('keydown', (e) => { if (e.key === 'Escape') exit.hidden = true; });
$('[data-exit-form]').addEventListener('submit', async (e) => {
  e.preventDefault();
  await sendLead({ telefono: e.target.telefono.value, origen: 'exit-popup', fecha: new Date().toISOString() });
  e.target.hidden = true; $('[data-exit-ok]').hidden = false;
});

/* ---------- Animaciones de scroll ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  en.target.classList.add('is-in');
  io.unobserve(en.target);
}), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
$$('.reveal').forEach((el) => {
  const sib = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  el.style.setProperty('--d', `${Math.min(sib.indexOf(el), 6) * .08}s`);
  io.observe(el);
});
const barsIO = new IntersectionObserver(([en]) => { if (en.isIntersecting) en.target.classList.add('is-in'); }, { threshold: .4 });
barsIO.observe($('[data-bars]'));

const counterIO = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  const el = en.target, to = +el.dataset.count, suf = el.dataset.suffix || '';
  const t0 = performance.now(), dur = reduced ? 1 : 1400;
  const step = (t) => {
    const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(to * e) + suf;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step); counterIO.unobserve(el);
}), { threshold: .6 });
$$('[data-count]').forEach((el) => counterIO.observe(el));

const stepsLine = $('.steps__line span'), stepsSec = $('.steps');
const secImg = $('.security__media img'), secFig = $('.security__media');
function scrollFx() {
  const vh = innerHeight;
  const r = stepsSec.getBoundingClientRect();
  stepsLine.style.setProperty('--p', Math.min(Math.max((vh * .8 - r.top) / (r.height * .7), 0), 1));
  const f = secFig.getBoundingClientRect();
  if (secImg && f.bottom > 0 && f.top < vh) secImg.style.setProperty('--py', `${((f.top + f.height / 2 - vh / 2) / vh) * -60 - 40}px`);
}
if (!reduced) { addEventListener('scroll', scrollFx, { passive: true }); scrollFx(); }

/* ---------- Tilt 3D y botones magnéticos ---------- */
function bindTilt(root = document) {
  if (reduced || matchMedia('(hover: none)').matches) return;
  $$('.tilt', root).forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateZ(0)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}
bindTilt();
if (!reduced && matchMedia('(hover: hover)').matches) {
  $$('.magnetic').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
}

/* ---------- Imágenes: si falla una foto, queda el degradado ---------- */
$$('figure img').forEach((img) => {
  const hide = () => { img.style.opacity = 0; };
  img.addEventListener('error', hide);
  if (img.complete && !img.naturalWidth) hide();
});

/* ---------- 3D ---------- */
(async () => {
  const S = await import('./scenes.js');
  if (!S.webglAvailable()) { updateCalc(); return; }
  S.createHero($('#hero-3d'));
  calc3d = S.createCalc($('#calc-3d'));
  S.createFinal($('#final-3d'));
  for (const k in qty) qty[k] = PRESETS.piso1[k] || 0;
  $('[data-preset="piso1"]').classList.add('is-active');
  updateCalc();
})().catch((err) => { console.error(err); updateCalc(); });
