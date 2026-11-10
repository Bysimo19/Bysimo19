# Trastea · Landing de trasteros

Web estática (HTML + CSS + JS, sin build). Three.js va incluido en `vendor/`, no depende de CDN.

## Ver en local
```bash
cd trasteros && python3 -m http.server 8080
# abre http://localhost:8080
```
Necesita servidor (usa módulos ES); abrir el `index.html` con doble clic no carga el 3D.

## Qué incluye
- Hero con diorama 3D del edificio: puertas que se abren, furgoneta, carro en movimiento. Reacciona al ratón y al scroll.
- Calculadora 3D: el cliente añade muebles y cajas, se colocan a escala en el trastero y recomienda el tamaño mínimo. CTA directo a reserva.
- Tarjetas de tamaños con precio promo, stock y descuento por 6/12 meses.
- Formulario de reserva en 2 pasos, pop-up de salida, WhatsApp flotante, barra fija en móvil, cuenta atrás a fin de mes.
- Soluciones por perfil, seguridad, comparativa de precio, reseñas, FAQ.

## Antes de publicar (obligatorio)
1. **`main.js` → `CONFIG`**: WhatsApp y `formEndpoint` (URL de Formspree, Make, Zapier o tu CRM). Sin endpoint los leads solo se guardan en el navegador del visitante.
2. **`SIZES`** en `main.js`: precios, medidas y stock reales.
3. **Datos de ejemplo** en `index.html`: nombre de marca, dirección, teléfono, nota de Google (4,9 / 1.200), reseñas, "37 trasteros libres", "0 incidencias", seguro 3.000 €, precios de la comparativa. Cámbialos por los reales o elimínalos: publicar cifras o reseñas inventadas es publicidad engañosa.
4. **Fotos**: ahora tiran de Unsplash. Sustitúyelas por fotos de tu instalación (convierten mucho mejor). Si una foto falla, se ve un degradado.
5. Textos legales (aviso legal, privacidad, cookies).
