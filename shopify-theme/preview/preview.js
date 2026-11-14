/* Datos y utilidades SOLO para la vista previa (no se sube a Shopify). */
(() => {
  const fmt = (n) => n.toFixed(2).replace('.', ',') + ' €';

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

  // Stone Island (fotos reales, precios de ejemplo)
  const SI = [
    { t: 'Gorro de canalé con parche', img: 'si-gorros', img2: 'si-gorro-naranja', p: 95, colors: 3, tag: 'new' },
    { t: 'Sobrecamisa Nylon Metal', img: 'si-sobrecamisas', img2: 'si-sobrecamisa-navy', p: 265, colors: 3 },
    { t: 'Plumífero Crinkle Reps', img: 'si-plumiferos', img2: 'si-plumifero-negro', p: 425, colors: 2, tag: 'top' },
    { t: 'Plumífero Logo Print', img: 'si-plumiferos-logo', img2: 'si-plumifero-logo-azul', p: 469, c: 520, colors: 3 },
    { t: 'Sudadera Garment Dyed', img: 'si-conjunto', img2: 'si-sudadera-beige', p: 175, colors: 3 },
    { t: 'Pantalón Fleece Garment Dyed', img: 'si-pantalon-negro', img2: 'si-conjunto', p: 155, colors: 3 },
  ];
  const CG = [
    { t: 'Plumífero Crofton', img: 'cg-plumiferos-mate', img2: 'cg-plumifero-oliva', p: 695, colors: 2, tag: 'top', brand: 'Canada Goose' },
    { t: 'Plumífero Lawrence', img: 'cg-plumiferos-navy', img2: 'cg-plumifero-navy', p: 745, colors: 2, brand: 'Canada Goose' },
    { t: 'Plumífero con capucha Crofton Hoody', img: 'cg-plumiferos-capucha', img2: 'cg-plumifero-capucha-negro', p: 850, c: 950, colors: 2, brand: 'Canada Goose' },
    { t: 'Plumífero Everett brillo', img: 'cg-plumiferos-brillo', img2: 'cg-plumifero-brillo-gris', p: 795, colors: 2, tag: 'new', brand: 'Canada Goose' },
    { t: 'Bomber Chilliwack con pelo', img: 'cg-bomber-pelo', img2: 'cg-bomber-azul', p: 1150, colors: 6, tag: 'top', brand: 'Canada Goose' },
    { t: 'Plumífero corto Cypress', img: 'cg-cropped-colores', img2: 'cg-cropped-rosa', p: 650, colors: 4, tag: 'new', brand: 'Canada Goose' },
    { t: 'Parka Expedition × OVO', img: 'cg-ovo-parka', img2: 'cg-ovo-negro', p: 1390, colors: 2, brand: 'Canada Goose' },
    { t: 'Abrigo largo Byward Black Label', img: 'cg-abrigo-largo', img2: 'cg-abrigo-largo-z', p: 1095, c: 1250, colors: 1, brand: 'Canada Goose' },
    { t: 'Pantalón Huron Fleece', img: 'cg-pantalones', img2: 'cg-pantalon-negro', p: 225, colors: 2, brand: 'Canada Goose' },
  ];
  const LC = [
    { t: 'Sudadera con capucha Croco', cat: 'Sudaderas', img: 'lc-sudaderas', img2: 'lc-sudadera-verde', p: 129, colors: 3, tag: 'top', brand: 'Lacoste' },
    { t: 'Chándal Sport completo', cat: 'Chándals', img: 'lc-chandal', img2: 'lc-chandal-rojo', p: 189, c: 220, colors: 3, brand: 'Lacoste' },
    { t: 'Plumífero ligero con capucha', cat: 'Plumíferos', img: 'lc-plumiferos', img2: 'lc-plumifero-navy', p: 249, colors: 3, tag: 'new', brand: 'Lacoste' },
    { t: 'Chaqueta de punto con capucha', cat: 'Punto', img: 'lc-punto-capucha', img2: 'lc-punto-negro', p: 165, colors: 2, brand: 'Lacoste' },
    { t: 'Camiseta Paris oversize', cat: 'Camisetas', img: 'lc-camiseta-paris', img2: 'lc-camiseta-paris-negra', p: 69, colors: 3, tag: 'new', brand: 'Lacoste' },
    { t: 'Camiseta básica cocodrilo', cat: 'Camisetas', img: 'lc-camisetas-basicas', img2: 'lc-camiseta-verde', p: 55, colors: 7, tag: 'top', brand: 'Lacoste' },
    { t: 'Polo Sport técnico', cat: 'Polos', img: 'lc-polos-sport', img2: 'lc-polo-navy', p: 95, colors: 6, brand: 'Lacoste' },
    { t: 'Polo monograma jacquard', cat: 'Polos', img: 'lc-polos-monograma', img2: 'lc-polo-monograma-azul', p: 125, c: 145, colors: 3, brand: 'Lacoste' },
    { t: 'Chaqueta track con logo', cat: 'Chaquetas', img: 'lc-chaqueta-track', img2: 'lc-chaqueta-track-navy', p: 179, colors: 3, brand: 'Lacoste' },
    { t: 'Polo clásico L.12.12', cat: 'Polos', img: 'lc-polos-clasicos', img2: 'lc-polo-verde', p: 99, colors: 8, tag: 'top', brand: 'Lacoste' },
    { t: 'Camiseta cocodrilo grande', cat: 'Camisetas', img: 'lc-camiseta-croco-grande', img2: 'lc-camiseta-croco-negra', p: 65, colors: 7, brand: 'Lacoste' },
    { t: 'Camiseta logo Paris', cat: 'Camisetas', img: 'lc-camiseta-paris-logo', img2: 'lc-camiseta-paris-negra2', p: 59, colors: 5, tag: 'new', brand: 'Lacoste' },
    { t: 'Camiseta básica algodón pima', cat: 'Camisetas', img: 'lc-camiseta-basica-2', img2: 'lc-camiseta-negra', p: 49, colors: 7, brand: 'Lacoste' },
    { t: 'Pantalón chino slim', cat: 'Pantalones', img: 'lc-chinos', img2: 'lc-chino-beige', p: 115, c: 135, colors: 3, brand: 'Lacoste' },
    { t: 'Set gorro y bufanda', cat: 'Gorros', img: 'lc-gorros-bufandas', img2: 'lc-gorro-negro', p: 89, colors: 4, brand: 'Lacoste' },
  ];
  const CP = [
    { t: 'Chaqueta híbrida punto y plumón', cat: 'Chaquetas', img: 'cp-hibrida-punto', img2: 'cp-hibrida-negra', p: 495, colors: 3, tag: 'new', brand: 'C.P. Company' },
    { t: 'Plumífero D.D. Shell cuadros', cat: 'Plumíferos', img: 'cp-plumifero-cuadros', img2: 'cp-cuadros-oliva', p: 545, colors: 3, brand: 'C.P. Company' },
    { t: 'Plumífero con capucha Lens', cat: 'Plumíferos', img: 'cp-plumifero-capucha', img2: 'cp-capucha-oliva', p: 520, c: 590, colors: 3, brand: 'C.P. Company' },
    { t: 'Parka acolchada Nycra', cat: 'Parkas', img: 'cp-parka-acolchada', img2: 'cp-parka-oliva', p: 610, colors: 3, brand: 'C.P. Company' },
    { t: 'Plumífero Goggle', cat: 'Plumíferos', img: 'cp-goggle-plumifero', img2: 'cp-goggle-oliva', p: 650, colors: 3, tag: 'top', brand: 'C.P. Company' },
  ];
  const render = (list) => list.map((it, i) => {
      const off = it.c ? Math.round((1 - it.p / it.c) * 100) : 0;
      const badges = (off ? `<span class="badge badge--sale">-${off}%</span>` : '') + (it.tag === 'new' ? '<span class="badge badge--new">Nuevo</span>' : '') + (it.tag === 'top' ? '<span class="badge">Top ventas</span>' : '');
      return `<article class="card reveal" style="--i:${i}" data-cat="${it.cat || ''}">
        <a class="card__media" href="producto.html">
          <img class="card__img" src="img/${it.img}.webp" alt="${it.brand || 'Stone Island'} ${it.t}" loading="lazy">
          <img class="card__img2" src="img/${it.img2}.webp" alt="" loading="lazy">
          <div class="card__badges">${badges}</div>
          <div class="card__quick"><span>S</span><span>M</span><span>L</span><span${i % 2 ? ' class="na"' : ''}>XL</span></div>
        </a>
        <div class="card__info">
          <div><div class="card__vendor">${it.brand || 'Stone Island'}</div><a class="card__title" href="producto.html">${it.t}</a><div class="card__colors">${it.colors} colores</div></div>
          <div class="price${it.c ? ' price--sale' : ''}">${it.c ? `<s>${fmt(it.c)}</s>` : ''}${fmt(it.p)}</div>
        </div>
      </article>`;
    }).join('');
  const OTHER = [
    { t: 'Chaqueta Check con capucha', cat: 'Chaquetas', img: 'bb-chaqueta', img2: 'burberry-check-chaqueta', p: 690, colors: 1, brand: 'Burberry' },
    { t: 'Plumífero Oblique', cat: 'Plumíferos', img: 'dior-puffer', img2: 'dior-oblique-puffer', p: 1890, colors: 1, tag: 'top', brand: 'Dior' },
    { t: 'Chaqueta Oblique punto y plumas', cat: 'Chaquetas', img: 'dior-knit', img2: 'dior-oblique-knit-down', p: 1450, c: 1690, colors: 1, brand: 'Dior' },
    { t: 'Zapatillas Rhyton GG Supreme', cat: 'Zapatillas', img: 'gucci-rhyton-full', img2: 'gucci-rhyton-full', p: 590, colors: 1, brand: 'Gucci' },
    { t: 'Gorra Check', cat: 'Gorros', img: 'bb-gorra', img2: 'bb-gorra', p: 320, colors: 1, brand: 'Burberry' },
  ];
  // intercala marcas para que las rejillas se vean variadas
  const MIX = [];
  const pools = [CP, CG, SI, LC, OTHER].map((l) => l.slice());
  while (pools.some((l) => l.length)) pools.forEach((l) => { if (l.length) MIX.push(l.shift()); });
  document.querySelectorAll('[data-demo]').forEach((el) => {
    const n = Number(el.dataset.count || 8), start = Number(el.dataset.start || 0);
    el.innerHTML = render(Array.from({ length: n }, (_, k) => MIX[(start + k) % MIX.length]));
  });
  document.querySelectorAll('[data-demo-si]').forEach((el) => { el.innerHTML = render(SI); });
  document.querySelectorAll('[data-demo-cp]').forEach((el) => { el.innerHTML = render(CP); });
  document.querySelectorAll('[data-demo-lc]').forEach((el) => { el.innerHTML = render(LC); });
  document.querySelectorAll('[data-demo-cg]').forEach((el) => { el.innerHTML = render(CG); });

  // Pestañas de categoría: filtran los productos de la página de marca
  document.querySelectorAll('nav.chips').forEach((nav) => {
    nav.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      const grid = document.querySelector('[data-demo-si],[data-demo-cg],[data-demo-lc],[data-demo-cp]'); if (!grid) return;
      e.preventDefault();
      nav.querySelectorAll('.chip').forEach((c) => { c.classList.toggle('is-active', c === chip); c.removeAttribute('aria-current'); });
      chip.setAttribute('aria-current', 'page');
      const cat = chip.textContent.trim();
      let n = 0;
      grid.querySelectorAll('.card').forEach((card) => {
        const show = cat === 'Todo' || card.dataset.cat === cat;
        card.hidden = !show; if (show) { card.style.setProperty('--i', n++ % 8); card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); }
      });
      let empty = grid.parentElement.querySelector('.empty');
      if (!n) { if (!empty) { empty = document.createElement('div'); empty.className = 'empty'; grid.after(empty); } empty.innerHTML = '<p class="h3">Próximamente</p><p class="muted">Aún no hay piezas en ' + cat + '.</p>'; empty.hidden = false; }
      else if (empty) empty.hidden = true;
    });
  });


  // En la vista previa no hay carrito real
  document.addEventListener('submit', (e) => {
    if (e.target.matches('[data-demo-form]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      const c = document.querySelector('[data-cart-count]');
      if (c) { c.textContent = Number(c.textContent) + 1; c.classList.add('has-items'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
    }
  }, true);
})();
