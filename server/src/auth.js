import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { HttpError, validate } from './http.js';

const sessionSeconds = 60 * 60 * 24 * 7;
export const bcryptCost = 12;
// A fixed valid cost-12 hash keeps login verification similar for unknown accounts.
const dummyHash =
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx3m9a7wKg8E3d2.Cx5U0mWRMZm';
const email = z
  .string()
  .trim()
  .max(254)
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address.' }));
const password = z
  .string({ error: 'Enter your password.' })
  .min(1, 'Enter your password.')
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must be at most 72 UTF-8 bytes.',
  );
const loginInput = z.object({ email, password });
const registerInput = loginInput.extend({
  name: z
    .string({ error: 'Enter your name.' })
    .trim()
    .min(1, 'Enter your name.')
    .max(100),
  password: password.refine(
    (value) => value.length >= 8,
    'Use at least 8 characters.',
  ),
});

function unauthorized() {
  return new HttpError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
}

export function createAuth(pool, config) {
  const router = Router();
  const cookieName = config.secure ? '__Host-sweety_session' : 'sweety_session';
  const cookie = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secure,
    path: '/',
  };
  const issuer = 'sweety';
  const throttle = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please try again later.',
      },
    },
  });

  async function createSession(res, user, status) {
    const sessionId = randomUUID();
    const token = jwt.sign({}, config.secret, {
      algorithm: 'HS256',
      issuer,
      subject: user.id,
      jwtid: sessionId,
      expiresIn: sessionSeconds,
    });
    const expiresAt = new Date(jwt.decode(token).exp * 1000);
    await pool.query(
      'DELETE FROM sessions WHERE user_id = $1 AND expires_at <= now()',
      [user.id],
    );
    await pool.query(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)',
      [sessionId, user.id, expiresAt],
    );
    res.cookie(cookieName, token, { ...cookie, maxAge: sessionSeconds * 1000 });
    res.status(status).json({ data: user });
  }

  function claims(req) {
    try {
      return jwt.verify(req.cookies[cookieName], config.secret, {
        issuer,
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
  }

  async function requireUser(req, _res, next) {
    const token = claims(req);
    if (!token) throw unauthorized();
    const {
      rows: [user],
    } = await pool.query(
      `SELECT users.id, users.name, users.email FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.id = $1 AND sessions.user_id = $2 AND sessions.expires_at > now()`,
      [token.jti, token.sub],
    );
    if (!user) throw unauthorized();
    req.user = user;
    next();
  }

  router.post('/register', throttle, async (req, res) => {
    const input = validate(registerInput, req.body);
    const hash = await bcrypt.hash(input.password, bcryptCost);
    let user;
    try {
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [input.name, input.email, hash],
      );
      [user] = result.rows;
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        throw new HttpError(
          409,
          'EMAIL_EXISTS',
          'An account already uses this email address.',
          'email',
        );
      }
      throw error;
    }
    await createSession(res, user, 201);
  });

  router.post('/login', throttle, async (req, res) => {
    const input = validate(loginInput, req.body);
    const {
      rows: [account],
    } = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [input.email],
    );
    const valid = await bcrypt.compare(
      input.password,
      account?.password_hash ?? dummyHash,
    );
    if (!account || !valid)
      throw new HttpError(
        401,
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
      );
    const { id, name, email: address } = account;
    await createSession(res, { id, name, email: address }, 200);
  });

  router.post('/logout', async (req, res) => {
    const token = claims(req);
    if (token)
      await pool.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [
        token.jti,
        token.sub,
      ]);
    res.clearCookie(cookieName, cookie).json({ data: { loggedOut: true } });
  });

  router.get('/me', requireUser, (req, res) => res.json({ data: req.user }));
  return { router, requireUser };
}
