import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { createAuth } from './auth.js';
import { createReadings } from './readings.js';
import { createReports } from './reports.js';
import { handleError, HttpError, mutationGuard } from './http.js';

export function createApp({ pool, config, now = () => new Date() }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.proxyHops || false);
  app.use(helmet({
    strictTransportSecurity: config.secure,
    contentSecurityPolicy: { directives: { upgradeInsecureRequests: config.secure ? [] : null } },
  }));

  const auth = createAuth(pool, config);
  const api = express.Router();
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(mutationGuard(config.origin), express.json({ limit: '16kb' }), cookieParser());
  api.get('/config', (_req, res) => res.json({ data: { timeZone: config.timeZone } }));
  api.use('/auth', auth.router);
  api.use('/readings', auth.requireUser, createReadings({ pool, config, now }));
  api.use('/reports', auth.requireUser, createReports({ pool, config, now }));
  api.use(() => { throw new HttpError(404, 'NOT_FOUND', 'This endpoint was not found.'); });
  app.use('/api', api);

  const dist = fileURLToPath(new URL('../../client/dist/', import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: dist }));
  }
  app.use(handleError);
  return app;
}
