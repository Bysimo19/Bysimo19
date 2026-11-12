/* Datos y utilidades SOLO para la vista previa (no se sube a Shopify). */
(() => {
  const P = [
    { v: 'Nike', t: 'Dunk Low “Panda”', p: 129.95, k: 'shoe', bg: '#FFFFFF', fg: '#141414', tag: 'top' },
    { v: 'Jordan', t: 'Air Jordan 1 Low “Mocha”', p: 159.95, c: 179.95, k: 'shoe', bg: '#E3D3BD', fg: '#5A3A28' },
    { v: 'New Balance', t: '550 “White Green”', p: 139.95, k: 'shoe', bg: '#C9D3C1', fg: '#1F4A33', tag: 'new' },
    { v: 'Adidas', t: 'Samba OG “Core Black”', p: 119.95, k: 'shoe', bg: '#ECE7DD', fg: '#141414' },
    { v: 'Essentials', t: 'Hoodie “Dark Oatmeal”', p: 109.95, k: 'hoodie', bg: '#D9D6CF', fg: '#7B6F60' },
    { v: 'Yeezy', t: 'Slide “Onyx”', p: 99.95, k: 'slide', bg: '#CBD2DA', fg: '#1A1A1A', soldout: true },
    { v: 'Nike', t: 'Tech Fleece Jogger', p: 89.95, k: 'pants', bg: '#ECE7DD', fg: '#3C3F44' },
    { v: 'Stüssy', t: 'Basic Logo Tee', p: 59.95, k: 'tee', bg: '#C8FF2E', fg: '#141414', tag: 'new' },
    { v: 'Asics', t: 'Gel-1130 “Silver”', p: 129.95, k: 'shoe', bg: '#FFFFFF', fg: '#9AA3AD' },
    { v: 'Carhartt WIP', t: 'Acrylic Watch Hat', p: 34.95, k: 'beanie', bg: '#E3D3BD', fg: '#C2581F' },
    { v: 'Jordan', t: 'Air Jordan 4 “Military Black”', p: 289.95, c: 319.95, k: 'shoe', bg: '#D9D6CF', fg: '#202020', tag: 'top' },
    { v: 'New Balance', t: '9060 “Sea Salt”', p: 169.95, k: 'shoe', bg: '#ECE7DD', fg: '#B9B2A3' },
  ];
  const SIZES = ['38', '39', '40', '41', '42', '43', '44', '45'];
  const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

  function path(ctx, kind) {
    ctx.beginPath();
    if (kind === 'shoe') {
      ctx.moveTo(95, 470); ctx.quadraticCurveTo(88, 418, 165, 402); ctx.lineTo(300, 356);
      ctx.quadraticCurveTo(345, 296, 405, 288); ctx.lineTo(470, 284); ctx.quadraticCurveTo(522, 290, 532, 340);
      ctx.lineTo(545, 452); ctx.lineTo(530, 478); ctx.closePath();
    } else if (kind === 'hoodie') {
      ctx.moveTo(240, 250); ctx.quadraticCurveTo(320, 150, 400, 250); ctx.lineTo(505, 285); ctx.lineTo(565, 540);
      ctx.lineTo(512, 552); ctx.lineTo(468, 395); ctx.lineTo(470, 610); ctx.lineTo(170, 610); ctx.lineTo(172, 395);
      ctx.lineTo(128, 552); ctx.lineTo(75, 540); ctx.lineTo(135, 285); ctx.closePath();
    } else if (kind === 'tee') {
      ctx.moveTo(260, 235); ctx.quadraticCurveTo(320, 275, 380, 235); ctx.lineTo(500, 270); ctx.lineTo(555, 370);
      ctx.lineTo(490, 400); ctx.lineTo(468, 370); ctx.lineTo(470, 600); ctx.lineTo(170, 600); ctx.lineTo(172, 370);
      ctx.lineTo(150, 400); ctx.lineTo(85, 370); ctx.lineTo(140, 270); ctx.closePath();
    } else if (kind === 'pants') {
      ctx.moveTo(215, 190); ctx.lineTo(425, 190); ctx.lineTo(470, 640); ctx.lineTo(370, 650); ctx.lineTo(322, 330);
      ctx.lineTo(272, 650); ctx.lineTo(172, 640); ctx.closePath();
    } else if (kind === 'slide') {
      ctx.ellipse(320, 470, 230, 62, -0.08, 0, Math.PI * 2);
      ctx.moveTo(190, 450); ctx.quadraticCurveTo(250, 300, 420, 330); ctx.quadraticCurveTo(470, 360, 460, 440); ctx.closePath();
    } else if (kind === 'beanie') {
      ctx.moveTo(150, 520); ctx.quadraticCurveTo(150, 230, 320, 225); ctx.quadraticCurveTo(490, 230, 490, 520); ctx.closePath();
    }
  }

  function texture(item, i) {
    const cv = document.createElement('canvas');
    cv.width = 640; cv.height = 800;
    const x = cv.getContext('2d');
    x.fillStyle = item.bg; x.fillRect(0, 0, 640, 800);
    const g = x.createRadialGradient(320, 380, 40, 320, 420, 420);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.06)');
    x.fillStyle = g; x.fillRect(0, 0, 640, 800);
    // marca gigante de fondo
    x.save(); x.font = '800 210px Inter, Helvetica, Arial, sans-serif'; x.fillStyle = 'rgba(0,0,0,0.05)';
    x.textBaseline = 'top'; x.fillText(item.v.toUpperCase().split(' ')[0], -12, 600); x.restore();
    // sombra de suelo
    x.save(); x.filter = 'blur(18px)'; x.fillStyle = 'rgba(0,0,0,0.22)';
    x.beginPath(); x.ellipse(320, item.k === 'shoe' || item.k === 'slide' ? 515 : 640, 230, 22, 0, 0, Math.PI * 2); x.fill(); x.restore();
    // producto
    x.save();
    x.translate(0, item.k === 'shoe' ? 40 : 0);
    x.fillStyle = item.fg; path(x, item.k); x.fill();
    if (item.k === 'shoe') {
      x.fillStyle = 'rgba(255,255,255,0.92)';
      x.beginPath(); x.roundRect(88, 466, 462, 40, 14); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.75)'; x.lineWidth = 6; x.lineCap = 'round';
      for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(300 + k * 22, 352 - k * 15); x.lineTo(330 + k * 22, 372 - k * 15); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,0.18)'; x.beginPath(); x.ellipse(250, 420, 120, 34, -0.25, 0, Math.PI * 2); x.fill();
    }
    if (item.k === 'hoodie') { x.strokeStyle = 'rgba(0,0,0,0.18)'; x.lineWidth = 5; x.strokeRect(235, 470, 170, 90); }
    if (item.k === 'beanie') { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(150, 430, 340, 90); }
    x.restore();
    // textos
    x.fillStyle = 'rgba(0,0,0,0.75)'; x.font = '600 22px Inter, Helvetica, Arial, sans-serif';
    x.fillText('№ ' + String(i + 1).padStart(2, '0'), 36, 54);
    x.textAlign = 'right'; x.fillText(item.v.toUpperCase(), 604, 54);
    return cv.toDataURL('image/jpeg', 0.86);
  }

  const imgs = P.map(texture);
  const imgs2 = P.map((it, i) => texture({ ...it, bg: it.fg === '#141414' ? '#E9E6DF' : '#141414', fg: it.bg === '#C8FF2E' ? '#C8FF2E' : it.fg === '#141414' ? '#141414' : it.bg }, i));

  function card(i, idx) {
    const it = P[i];
    const off = it.c ? Math.round((1 - it.p / it.c) * 100) : 0;
    const badges = (it.soldout ? '<span class="badge badge--soldout">Agotado</span>' : '') +
      (off ? `<span class="badge badge--sale">-${off}%</span>` : '') +
      (it.tag === 'new' ? '<span class="badge badge--new">Nuevo</span>' : '') +
      (it.tag === 'top' ? '<span class="badge">Top ventas</span>' : '');
    const sizes = it.soldout ? '' : `<div class="card__quick">${SIZES.map((s, k) => `<span${(k + i) % 5 === 0 ? ' class="na"' : ''}>${s}</span>`).join('')}</div>`;
    return `<article class="card reveal" style="--i:${idx % 8}">
      <a class="card__media" href="producto.html">
        <img class="card__img" src="${imgs[i]}" alt="${it.v} ${it.t}" width="640" height="800" loading="lazy">
        <img class="card__img2" src="${imgs2[i]}" alt="" width="640" height="800" loading="lazy">
        <div class="card__badges">${badges}</div>${sizes}
      </a>
      <div class="card__info">
        <div><div class="card__vendor">${it.v}</div><a class="card__title" href="producto.html">${it.t}</a></div>
        <div class="price${it.c ? ' price--sale' : ''}">${it.c ? `<s>${fmt(it.c)}</s>` : ''}${fmt(it.p)}</div>
      </div>
    </article>`;
  }

  // Hero 3D: rellenar el JSON antes de que corra hero-3d.js
  const heroData = document.querySelector('[data-hero-items]');
  // Fotos reales del anillo (precios de ejemplo)
  const HERO = [
    { img: 'img/burberry-check-chaqueta.webp', title: 'Burberry Chaqueta Check con capucha', price: 690 },
    { img: 'img/dior-oblique-knit-down.webp', title: 'Dior Chaqueta Oblique punto y plumas', price: 1450, compare: 1690 },
    { img: 'img/gucci-rhyton.webp', title: 'Gucci Rhyton GG Supreme', price: 590 },
    { img: 'img/dior-oblique-puffer.webp', title: 'Dior Plumífero Oblique', price: 1890 },
    { img: 'img/burberry-check-gorra.webp', title: 'Burberry Gorra Check', price: 320 },
  ];
  if (heroData) heroData.textContent = JSON.stringify(HERO.map((it) => ({
    img: it.img, title: it.title, url: 'producto.html', price: fmt(it.price),
    compare: it.compare ? fmt(it.compare) : null, badge: it.compare ? `-${Math.round((1 - it.price / it.compare) * 100)}%` : null,
  })));

  document.querySelectorAll('[data-demo]').forEach((el) => {
    const n = Number(el.dataset.count || 8), start = Number(el.dataset.start || 0);
    let html = '';
    for (let k = 0; k < n; k++) html += card((start + k) % P.length, k);
    el.innerHTML = html;
  });
  document.querySelectorAll('[data-demo-img]').forEach((el) => { el.src = imgs[Number(el.dataset.demoImg)]; });
  document.querySelectorAll('[data-demo-img2]').forEach((el) => { el.src = imgs2[Number(el.dataset.demoImg2)]; });

  // En la vista previa no hay carrito real
  document.addEventListener('submit', (e) => {
    if (e.target.matches('[data-demo-form]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const c = document.querySelector('[data-cart-count]');
      if (c) { c.textContent = Number(c.textContent) + 1; c.classList.add('has-items'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    }
  }, true);
})();
