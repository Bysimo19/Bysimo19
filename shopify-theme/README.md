# Volta: tema Shopify para sneakers y streetwear

Tema Online Store 2.0, sin dependencias. Pasa `theme-check` con 0 errores y 0 avisos.

## Cómo subirlo

1. Comprime el contenido de esta carpeta **sin** `preview/` ni `README.md`, o usa `volta-theme.zip`.
2. Shopify → Tienda online → Temas → Añadir tema → Subir archivo zip.
3. Personalizar → asigna:
   - **Hero 3D**: la colección que gira en el anillo (6-14 productos; mejor fotos con fondo uniforme).
   - **Novedades / Top ventas**: sus colecciones.
   - **Categorías**: una colección por bloque (la imagen es opcional, si no hay coge la del primer producto).
   - **Cabecera**: menú `main-menu`. **Pie**: menús por columna.
4. Configuración del tema → Carrito → umbral de envío gratis (100 € por defecto).

### Fotos del anillo 3D
Los productos flotan sin fondo sobre el hero oscuro, con reflejo en el suelo.
- **Mejor resultado:** sube la foto principal en PNG sin fondo. En el admin de Shopify: abre la imagen → Editar → *Quitar fondo*.
- **Fotos con fondo blanco o gris liso:** el tema quita el fondo solo (ajuste *Quitar fondo liso* en la sección Hero 3D). Con fondos con degradado o sombras fuertes puede quedar un borde fino.

### Etiquetas de producto que usa el tema
- `nuevo` → badge "Nuevo".
- `top` → badge "Top ventas".
- Las rebajas salen solas si rellenas "Precio de comparación".

### Filtros de categoría
Instala la app gratuita **Search & Discovery** de Shopify y activa los filtros de Marca, Talla, Precio y Disponibilidad. Si el filtro se llama "Talla" o "Size", se pinta como rejilla de botones.

Las tallas que se ven en la tarjeta al pasar el ratón salen de la opción de variante llamada "Talla", "Size" o "EU".

## Rendimiento

| Página | JS que carga | 3D |
|---|---|---|
| Portada | `theme.js` (~6 KB gzip) + `hero-3d.js` (~5 KB gzip) | Sí, WebGL puro |
| Categoría, producto, carrito | Solo `theme.js` | No |

- Hero 3D sin Three.js. Se pausa fuera de pantalla y con la pestaña oculta. DPR limitado a 1,5 en móvil.
- Sin WebGL o con "reducir movimiento" activado: imágenes estáticas o anillo sin autogiro.
- Imágenes con `srcset` y `loading="lazy"` en todo lo que está por debajo del primer pantallazo.
- Un solo CSS (`base.css`) y ninguna librería externa.

## Estructura

```
layout/theme.liquid         Esqueleto, colores y fuentes desde ajustes
sections/hero-3d.liquid     Anillo 3D de productos (portada)
sections/main-*.liquid      Colección, producto, carrito, búsqueda, cuenta, blog…
snippets/product-card       Tarjeta con 2ª foto al hover, badges y tallas disponibles
assets/base.css             Estilos
assets/theme.js             Carrito lateral AJAX, búsqueda predictiva, variantes, filtros
assets/hero-3d.js           Motor WebGL del hero
preview/                    Vista previa estática con productos de ejemplo (no se sube)
```
