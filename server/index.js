import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import { loadUser, requireAuth, csrfGuard, purgeExpiredSessions } from './auth.js';
import { seedFoods } from './seed.js';
import { HttpError } from './util.js';
import account from './routes/account.js';
import training from './routes/training.js';
import nutrition from './routes/nutrition.js';
import body from './routes/body.js';
import habits from './routes/habits.js';
import { pushRouter, startScheduler } from './push.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../client/dist');

export function createApp() {
  seedFoods();
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
    next();
  });

  const api = express.Router();
  api.use(express.json({ limit: '10mb' }));
  api.use(cookieParser());
  api.use(csrfGuard);
  api.use(loadUser);
  api.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  api.get('/health', (_req, res) => res.json({ ok: true }));
  api.use(account); // incluye /auth/* públicas y aplica requireAuth al resto de sus rutas
  api.use(requireAuth);
  api.use(training);
  api.use(nutrition);
  api.use(body);
  api.use(habits);
  api.use(pushRouter);
  api.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
  api.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Archivo demasiado grande' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });
  app.use('/api', api);

  if (fs.existsSync(DIST)) {
    app.use(express.static(DIST, {
      index: false,
      setHeaders(res, file) {
        if (file.includes(`${path.sep}assets${path.sep}`) || file.includes(`${path.sep}exercises${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else res.setHeader('Cache-Control', 'no-cache');
      },
    }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(DIST, 'index.html'));
    });
  }
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Forja escuchando en http://localhost:${port}`));
  startScheduler();
  purgeExpiredSessions();
  setInterval(purgeExpiredSessions, 6 * 3600e3).unref();
}
