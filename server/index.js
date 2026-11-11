import pg from 'pg';
import { createApp } from './src/app.js';
import { configFromEnv } from './src/config.js';

const config = configFromEnv(process.env);
const pool = new pg.Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });
pool.on('error', (error) => console.error('Idle database connection failed', error.code ?? error.name));

try {
  await pool.query('SELECT 1 FROM schema_migrations LIMIT 1');
} catch {
  console.error('Unable to reach the migrated Sweety database. Check DATABASE_URL and run npm run db:migrate.');
  await pool.end();
  process.exit(1);
}

const server = createApp({ config, pool }).listen(config.port, '127.0.0.1', () => {
  console.log(`Sweety listening on http://127.0.0.1:${config.port}`);
});
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => server.close(() => pool.end()));
}
