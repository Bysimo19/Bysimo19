/* =========================================================
   VOLTA — theme.js (global, defer). Sin dependencias.
   ========================================================= */
(() => {
  document.documentElement.classList.remove('no-js');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const T = window.theme || {};
  const routes = T.routes || { cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change', search: '/search' };

  /* ---------- Formato de dinero ---------- */
  function money(cents, fmt = T.moneyFormat || '{{amount_with_comma_separator}} €') {
    cents = Number(cents) || 0;
    const fx = (n, d, t = '.', dec = ',') => {
      const [i, f] = (n / 100).toFixed(d).split('.');
      return i.replace(/\B(?=(\d{3})+(?!\d))/g, t) + (f ? dec + f : '');
    };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, k) => ({
      amount: fx(cents, 2, ',', '.'),
      amount_no_decimals: fx(cents, 0, ',', '.'),
      amount_with_comma_separator: fx(cents, 2, '.', ','),
      amount_no_decimals_with_comma_separator: fx(cents, 0, '.', ','),
      amount_with_apostrophe_separator: fx(cents, 2, "'", '.'),
      amount_with_period_and_space_separator: fx(cents, 2, ' ', ','),
    }[k] || fx(cents, 2)));
  }
  T.money = money;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    let el = $('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('is-on'), 2600);
  }

  /* ---------- Drawers ---------- */
  let lastFocus;
  function openDrawer(el) {
    if (!el) return;
    lastFocus = document.activeElement;
    el.classList.add('is-open'); el.removeAttribute('inert'); el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const f = $('[data-autofocus], button, a, input', el.querySelector('.drawer__panel') || el);
    setTimeout(() => f && f.focus({ preventScroll: true }), 50);
  }
  function closeDrawer(el) {
    if (!el) return;
    el.classList.remove('is-open'); el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true');
    if (!$('.drawer.is-open, .search-ov.is-open')) document.body.classList.remove('is-locked');
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) {
      const target = document.getElementById(o.dataset.open);
      if (target) { e.preventDefault(); if (target.id === 'CartDrawer') renderCart(); target.classList.contains('search-ov') ? openSearch() : openDrawer(target); }
    }
    const c = e.target.closest('[data-close]');
    if (c) { e.preventDefault(); const d = c.closest('.drawer, .search-ov'); d.classList.contains('search-ov') ? closeSearch() : closeDrawer(d); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('.drawer.is-open').forEach(closeDrawer);
    closeSearch();
  });

  /* ---------- Header: ocultar al bajar, sólido al salir del hero ---------- */
  const header = $('.header');
  if (header) {
    let lastY = scrollY, ticking = false;
    const overlay = header.classList.contains('header--overlay');
    const update = () => {
      const y = scrollY;
      const threshold = overlay ? Math.max(80, innerHeight * 0.85) : 120;
      header.classList.toggle('is-solid', !overlay || y > threshold - 80);
      header.classList.toggle('is-hidden', y > threshold && y > lastY && !$('.drawer.is-open'));
      lastY = y; ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  /* ---------- Reveal on scroll + split lines ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => {
    ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }) : null;
  function observeReveals(ctx = document) {
    $$('.reveal, .split-line, [data-reveal-group]', ctx).forEach((el) => (io ? io.observe(el) : el.classList.add('is-in')));
    $$('[data-stagger]', ctx).forEach((g) => $$(':scope > *', g).forEach((el, i) => el.style.setProperty('--i', i % 8)));
  }
  observeReveals();

  /* ---------- Parallax ligero (solo imágenes marcadas) ---------- */
  const pxEls = $$('[data-parallax]');
  if (pxEls.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let on = false;
    const run = () => {
      pxEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        el.style.setProperty('--py', (p * -9).toFixed(2) + '%');
      });
      on = false;
    };
    addEventListener('scroll', () => { if (!on) { on = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* ---------- Rails horizontales ---------- */
  $$('[data-rail]').forEach((wrap) => {
    const rail = $('.rail', wrap);
    const bar = $('.rail-progress i', wrap);
    const step = () => (rail.firstElementChild ? rail.firstElementChild.getBoundingClientRect().width + 16 : 300);
    $('[data-prev]', wrap)?.addEventListener('click', () => rail.scrollBy({ left: -step() * 2, behavior: 'smooth' }));
    $('[data-next]', wrap)?.addEventListener('click', () => rail.scrollBy({ left: step() * 2, behavior: 'smooth' }));
    const upd = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const vis = rail.clientWidth / rail.scrollWidth;
      bar && bar.parentElement.style.setProperty('--p', Math.min(1, vis + (max ? rail.scrollLeft / max : 0) * (1 - vis)));
    };
    rail.addEventListener('scroll', upd, { passive: true }); upd();
  });

  /* ---------- Carrito AJAX ---------- */
  const drawer = $('#CartDrawer');
  async function getCart() { const r = await fetch(routes.cart + '.js', { headers: { Accept: 'application/json' } }); return r.json(); }
  function setCount(n, bump) {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = n; el.classList.toggle('has-items', n > 0);
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
  }
  async function renderCart() {
    if (!drawer) return;
    const body = $('[data-cart-body]', drawer), foot = $('[data-cart-foot]', drawer);
    let cart;
    try { cart = await getCart(); } catch (e) { return; }
    setCount(cart.item_count);
    const free = Number(drawer.dataset.freeShipping || 0) * 100;
    const ship = $('[data-ship]', drawer);
    if (ship) {
      if (free > 0) {
        const left = free - cart.total_price;
        ship.hidden = cart.item_count === 0;
        ship.classList.toggle('is-done', left <= 0);
        $('[data-ship-text]', ship).innerHTML = left > 0 ? `Te faltan <b>${money(left)}</b> para el envío gratis` : '<b>Envío gratis</b> desbloqueado';
        $('.ship-bar__track i', ship).style.width = Math.min(100, (cart.total_price / free) * 100) + '%';
      } else ship.hidden = true;
    }
    if (!cart.items.length) {
      body.innerHTML = `<div class="cart-empty"><p class="h3">Tu carrito está vacío</p><p class="muted">Los mejores pares se agotan rápido.</p><a class="btn" href="${esc(T.routes?.all || '/collections/all')}">Ver novedades <span class="arrow">→</span></a></div>`;
      foot.hidden = true; return;
    }
    foot.hidden = false;
    body.innerHTML = cart.items.map((it, i) => `
      <div class="line" data-line="${i + 1}">
        <a href="${esc(it.url)}">${it.image ? `<img src="${esc(it.image.replace(/(\.[a-z]+)(\?|$)/i, '_200x$1$2'))}" alt="${esc(it.product_title)}" width="92" height="115" loading="lazy">` : ''}</a>
        <div>
          <a class="line__title" href="${esc(it.url)}">${esc(it.product_title)}</a>
          ${it.variant_title && it.variant_title !== 'Default Title' ? `<div class="line__variant">${esc(it.variant_title)}</div>` : ''}
          <div class="qty">
            <button type="button" data-qty="${it.quantity - 1}" aria-label="Quitar uno">−</button>
            <span>${it.quantity}</span>
            <button type="button" data-qty="${it.quantity + 1}" aria-label="Añadir uno">+</button>
          </div>
          <button type="button" class="line__rm" data-qty="0">Eliminar</button>
        </div>
        <div class="price">${it.original_line_price > it.final_line_price ? `<s>${money(it.original_line_price)}</s>` : ''}${money(it.final_line_price)}</div>
      </div>`).join('');
    $('[data-cart-total]', drawer).textContent = money(cart.total_price);
  }
  drawer?.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-qty]');
    if (!b) return;
    const line = b.closest('[data-line]');
    line.classList.add('is-loading');
    const r = await fetch(routes.cartChange + '.js', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: Number(line.dataset.line), quantity: Number(b.dataset.qty) }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); toast(j.description || 'No hay más stock'); }
    renderCart();
  });

  // Interceptar cualquier formulario de producto
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[action*="/cart/add"]');
    if (!form || !drawer || T.cartType === 'page') return;
    e.preventDefault();
    const btn = $('[type="submit"]', form);
    const label = btn && btn.innerHTML;
    if (btn) { btn.setAttribute('aria-busy', 'true'); btn.innerHTML = 'Añadiendo…'; btn.disabled = true; }
    try {
      const r = await fetch(routes.cartAdd + '.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.description || 'No se pudo añadir');
      await renderCart();
      setCount(Number($('[data-cart-count]')?.textContent || 0), true);
      openDrawer(drawer);
    } catch (err) { toast(err.message); }
    finally { if (btn) { btn.innerHTML = label; btn.disabled = false; btn.removeAttribute('aria-busy'); } }
  });

  /* ---------- Búsqueda predictiva ---------- */
  const sov = $('#SearchOverlay');
  function openSearch() { if (!sov) return; sov.classList.add('is-open'); document.body.classList.add('is-locked'); setTimeout(() => $('input', sov).focus(), 30); }
  function closeSearch() { if (!sov || !sov.classList.contains('is-open')) return; sov.classList.remove('is-open'); if (!$('.drawer.is-open')) document.body.classList.remove('is-locked'); }
  if (sov) {
    const input = $('input[name="q"]', sov), res = $('[data-search-results]', sov);
    let tm, ctrl;
    input.addEventListener('input', () => {
      clearTimeout(tm);
      const q = input.value.trim();
      if (q.length < 2) { res.innerHTML = ''; return; }
      tm = setTimeout(async () => {
        ctrl?.abort(); ctrl = new AbortController();
        try {
          const r = await fetch(`${routes.search}/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=8`, { signal: ctrl.signal });
          const j = await r.json();
          const ps = j.resources?.results?.products || [];
          res.innerHTML = ps.length ? ps.map((p) => `<a href="${esc(p.url)}">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" width="200" height="250">` : ''}<span>${esc(p.title)}</span><b class="mono">${money(Math.round(parseFloat(p.price) * 100))}</b></a>`).join('') : `<p class="muted">Sin resultados para “${esc(q)}”.</p>`;
        } catch (e) { /* abortado */ }
      }, 180);
    });
  }

  /* ---------- Página de producto: variantes ---------- */
  $$('[data-product]').forEach((root) => {
    const json = $('[data-product-json]', root);
    if (!json) return;
    const product = JSON.parse(json.textContent);
    const form = $('form[action*="/cart/add"]', root);
    const idInput = $('input[name="id"]', form);
    const btn = $('[data-atc]', root);
    const priceEl = $('[data-price]', root);
    const stockEl = $('[data-stock]', root);
    const fieldsets = $$('[data-option-index]', root);

    const selected = () => fieldsets.map((fs) => ($('input:checked', fs) || {}).value);
    function current() { const s = selected(); return product.variants.find((v) => v.options.every((o, i) => o === s[i])); }

    function markAvailability() {
      const s = selected();
      fieldsets.forEach((fs, idx) => {
        $$('input', fs).forEach((inp) => {
          const ok = product.variants.some((v) => v.available && v.options[idx] === inp.value && v.options.every((o, j) => j === idx || o === s[j]));
          inp.closest('label').classList.toggle('is-na', !ok);
        });
      });
    }

    function update() {
      const v = current();
      markAvailability();
      fieldsets.forEach((fs) => { const l = $('legend span', fs); const c = $('input:checked', fs); if (l && c) l.textContent = c.value; });
      if (!v) { btn.disabled = true; btn.querySelector('span').textContent = 'No disponible'; return; }
      idInput.value = v.id;
      priceEl.innerHTML = (v.compare_at_price > v.price ? `<s>${money(v.compare_at_price)}</s> ` : '') + `<span>${money(v.price)}</span>`;
      btn.disabled = !v.available;
      btn.querySelector('span').textContent = v.available ? 'Añadir al carrito' : 'Agotado';
      if (stockEl) {
        const q = v.inventory_quantity;
        stockEl.className = 'pdp__stock' + (!v.available ? ' is-out' : (typeof q === 'number' && q > 0 && q <= 3 ? ' is-low' : ''));
        stockEl.textContent = !v.available ? 'Agotado en esta talla' : (typeof q === 'number' && q > 0 && q <= 3 ? `Últimas ${q} unidades` : 'En stock · envío en 24/48h');
      }
      const url = new URL(location.href); url.searchParams.set('variant', v.id);
      history.replaceState(null, '', url);
      if (v.featured_media) {
        const fig = $(`[data-media-id="${v.featured_media.id}"]`, root);
        if (fig) fig.parentElement.scrollTo({ left: fig.offsetLeft, behavior: 'smooth' });
      }
      const s = $('[data-sticky-price]'); if (s) s.textContent = money(v.price);
    }
    root.addEventListener('change', (e) => { if (e.target.closest('[data-option-index]')) update(); });
    markAvailability();

    // Dots de galería en móvil
    const gal = $('.pdp__gallery', root), dots = $$('.pdp__dots i', root);
    if (gal && dots.length) gal.addEventListener('scroll', () => {
      const i = Math.round(gal.scrollLeft / gal.clientWidth);
      dots.forEach((d, j) => d.classList.toggle('is-on', i === j));
    }, { passive: true });

    // Sticky add-to-cart en móvil
    const sticky = $('.sticky-atc');
    if (sticky && btn && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => sticky.classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(btn);
      $('button', sticky).addEventListener('click', () => (btn.disabled ? btn.scrollIntoView({ behavior: 'smooth', block: 'center' }) : form.requestSubmit()));
    }
  });

  /* ---------- Colección: filtros auto-submit + columnas ---------- */
  $$('[data-filters]').forEach((form) => {
    form.addEventListener('change', (e) => {
      if (e.target.type === 'number') return;
      form.closest('main')?.classList.add('is-loading');
      form.requestSubmit ? form.requestSubmit() : form.submit();
    });
    // Cerrar dropdowns al hacer clic fuera
    document.addEventListener('click', (e) => { $$('details[open]', form).forEach((d) => { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
  });
  $$('[data-cols]').forEach((b) => b.addEventListener('click', () => {
    const g = $('[data-grid]');
    g.style.setProperty('--cols', b.dataset.cols);
    $$('[data-cols]').forEach((x) => x.classList.toggle('is-active', x === b));
    try { localStorage.setItem('cols', b.dataset.cols); } catch (e) {}
  }));
  try { const c = localStorage.getItem('cols'); if (c && innerWidth > 860) $(`[data-cols="${c}"]`)?.click(); } catch (e) {}

  /* ---------- Recomendados (carga diferida) ---------- */
  $$('[data-recs]').forEach((el) => {
    const load = async () => {
      try {
        const r = await fetch(el.dataset.recs);
        const tmp = document.createElement('div');
        tmp.innerHTML = await r.text();
        const inner = $('[data-recs-inner]', tmp);
        if (inner && inner.children.length) { el.replaceChildren(inner); observeReveals(el); }
        else { const sec = el.closest('section'); if (sec) sec.hidden = true; }
      } catch (e) { /* sin red */ }
    };
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver(([en]) => { if (en.isIntersecting) { o.disconnect(); load(); } }, { rootMargin: '400px' });
      o.observe(el);
    } else load();
  });

  /* ---------- Newsletter: feedback inline ---------- */
  if (location.search.includes('customer_posted=true')) $$('[data-news-ok]').forEach((el) => (el.hidden = false));

  /* ---------- Editor de temas ---------- */
  document.addEventListener('shopify:section:load', (e) => observeReveals(e.target));

  // Carga inicial del contador
  if (drawer) getCart().then((c) => setCount(c.item_count)).catch(() => {});
})();
