import { z } from 'zod';

export function configFromEnv(env) {
  const parsed = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_ORIGIN: z.url().default('http://127.0.0.1:5173'),
    DATABASE_URL: z.url(),
    JWT_SECRET: z.string().min(32),
    APP_TIME_ZONE: z.string().default('Asia/Kolkata'),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  }).safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}.`);
  }
  const value = parsed.data;
  const origin = new URL(value.APP_ORIGIN);
  const secure = value.NODE_ENV === 'production';
  if (!['http:', 'https:'].includes(origin.protocol) || origin.origin !== value.APP_ORIGIN) {
    throw new Error('APP_ORIGIN must be an exact HTTP(S) origin without a trailing slash.');
  }
  if (secure && (origin.protocol !== 'https:' || value.JWT_SECRET.startsWith('replace-'))) {
    throw new Error('Production requires an HTTPS APP_ORIGIN and a generated JWT_SECRET.');
  }
  new Intl.DateTimeFormat('en', { timeZone: value.APP_TIME_ZONE });
  return {
    port: value.PORT,
    origin: origin.origin,
    databaseUrl: value.DATABASE_URL,
    secret: value.JWT_SECRET,
    timeZone: value.APP_TIME_ZONE,
    secure,
    proxyHops: value.TRUST_PROXY_HOPS,
  };
}
