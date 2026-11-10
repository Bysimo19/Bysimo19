# Forja · Gym, nutrición y progreso

App web (PWA instalable en iPhone) para gestionar entrenamientos, nutrición, suplementación, evolución física y constancia. Multiusuario: cada cuenta tiene sus propios datos, aislados del resto.

## Qué incluye

| Sección | Funciones |
|---|---|
| **Hoy** | Próximo entreno, semana (L-D), racha semanal con comodines, % de cumplimiento, nutrición del día, creatina en un toque, batido rápido, agua, sueño, peso con tendencia, resumen del mes, hábitos, objetivos y siguiente logro |
| **Entreno** | Rutina inicial A/B/C full body para principiantes (lunes, martes, jueves). Crear, editar, duplicar, reordenar, sustituir y eliminar ejercicios. Series, rango de repeticiones, descanso, peso, técnica, vídeo y notas |
| **Sesión en vivo** | Registro por serie (kg, reps, ✓), marcas de la última sesión, sugerencia automática de subida de peso (progresión doble), detección de récords en directo, temporizador de descanso automático con sonido y vibración, añadir ejercicios/series, borrador persistente si cierras la app, **FINALIZAR ENTRENAMIENTO** con resumen y récords |
| **Historial** | Todos los entrenos por mes, detalle con comparación frente a la sesión anterior |
| **Nutrición** | Desayuno/comida/merienda/cena/snacks, base de alimentos con macros por 100 g y por unidad, alimentos propios, entrada manual, frecuentes, edición proporcional. Proteína, batidos (scoops, líquido, extras), crema de arroz con añadidos, creatina con racha e historial de 14 días, agua. Historial 7/14/30 días con gráficos |
| **Progreso** | Constancia (calendario, entrenos por semana, rachas diarias, hábitos 4 semanas, 23 logros), cuerpo (peso y 8 medidas con gráficos y deltas), fuerza (1RM estimado, peso máx., volumen y reps por ejercicio, volumen semanal), fotos privadas con comparador deslizante y lado a lado |
| **Más** | Perfil y objetivos (recalculables), objetivos con progreso, hábitos, calculadoras (calorías, proteína, 1RM), guía de 47 ejercicios con demostración animada, consejos para principiantes, recordatorios push y calendario .ics, exportación de datos, modo oscuro/claro, cambiar contraseña, borrar cuenta |

**Constancia sin castigo**: cada 4 semanas cumplidas ganas un comodín (máx. 2) que salva automáticamente una semana fallida; la semana de alta no penaliza; el total de entrenos nunca se resetea; los mensajes se adaptan tras una mala semana.

## Stack

- **Backend**: Node.js 22 + Express, SQLite integrado (`node:sqlite`, sin dependencias nativas), sesiones con cookie httpOnly, contraseñas con scrypt, protección CSRF por cabecera, límite de intentos de login, Web Push (VAPID).
- **Frontend**: React 18 + Vite, React Router, iconos Lucide, CSS propio (sin plantillas), gráficos SVG propios.
- **PWA**: manifest, service worker (shell offline, caché de imágenes, push), iconos para iOS.

```
server/          API (routes/), base de datos, auth, estadísticas, push
shared/calc.js   Cálculos compartidos (calorías, macros, 1RM, fechas)
client/src/      App React (pages/, components/, lib/)
client/public/   Manifest, service worker, iconos, imágenes de ejercicios
tests/           Tests de API (node:test)
```

## Uso local

Requiere Node.js 22.5 o superior.

```bash
npm install
npm run build
npm start            # http://localhost:3000
```

Desarrollo con recarga: `npm run dev:server` y `npm run dev:client` (Vite en :5173 con proxy a la API).

Tests: `npm test`

## Despliegue (para usarla en el iPhone)

La PWA y las notificaciones necesitan **HTTPS** y la base de datos necesita **disco persistente**.

**Opción recomendada: Railway / Render / Fly.io con Docker**

1. Conecta este repositorio y usa el `Dockerfile` incluido.
2. Añade un volumen persistente montado en `/data` (ahí van la base de datos y las fotos).
3. Variables opcionales:
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (si no se definen, se generan y guardan en la base de datos).
4. Abre la URL HTTPS en Safari → Compartir → **Añadir a pantalla de inicio**.
5. Desde la app instalada: Más → Recordatorios → Activar notificaciones (iOS 16.4+).

Cada amigo se registra con su email desde la misma URL.

## Copias de seguridad

Todo vive en `DATA_DIR` (`forja.db` + `uploads/`). Copia esa carpeta para tener backup. Cada usuario puede además exportar sus datos en JSON desde Más.

## Créditos

Imágenes de ejercicios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público, Unlicense).
Valores nutricionales orientativos (BEDCA/USDA).
