import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../db/migrate.js';
import { createApp } from '../src/app.js';

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.',
  );
const schema = `sweety_${randomUUID().replaceAll('-', '')}`;
const control = new pg.Pool({
  connectionString: url,
  connectionTimeoutMillis: 3000,
});
let pool;
let app;
let alice;
let bob;
let schemaCreated = false;
const date = '2026-10-15';
const password = 'Test-only-password!';
const origin = 'http://127.0.0.1:5173';
const config = {
  secret: 'integration-test-secret-with-more-than-32-bytes',
  origin,
  timeZone: 'Asia/Kolkata',
};

function write(agent, method, path, body) {
  const query = agent[method](`/api${path}`)
    .set('X-Sweety-Request', '1')
    .set('Origin', origin);
  return body === undefined ? query : query.send(body);
}

function reading(slot = 'morning', value = 100, day = date) {
  return { date: day, slot, value };
}

async function add(agent, input = reading()) {
  const response = await write(agent, 'post', '/readings', input).expect(201);
  return response.body.data;
}

async function report(agent, kind, day = date) {
  const response = await agent
    .get(`/api/reports/${kind}`)
    .query({ date: day })
    .expect(200);
  return response.body.data;
}

beforeAll(async () => {
  const {
    rows: [database],
  } = await control.query('SELECT current_database() AS name');
  if (!database.name.endsWith('_test'))
    throw new Error('Integration tests require a database ending in _test.');
  await control.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  pool = new pg.Pool({
    connectionString: url,
    options: `-c search_path=${schema}`,
  });
  await migrate(pool);
  // Running the migrations twice verifies idempotency.
  await migrate(pool);
  app = createApp({
    pool,
    config,
    now: () => new Date('2026-10-14T20:00:00Z'),
  });
  alice = request.agent(app);
  bob = request.agent(app);
  await write(alice, 'post', '/auth/register', {
    name: 'Alice',
    email: 'alice@example.com',
    password,
  }).expect(201);
  await write(bob, 'post', '/auth/register', {
    name: 'Bob',
    email: 'bob@example.com',
    password,
  }).expect(201);
}, 20000);

beforeEach(async () => {
  await pool.query('DELETE FROM readings');
});

afterAll(async () => {
  try {
    await pool?.end();
    if (schemaCreated) await control.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await control.end();
  }
});

describe('authentication', () => {
  it('registers, persists a session, hashes passwords, and logs in case-insensitively', async () => {
    const agent = request.agent(app);
    const registration = await write(agent, 'post', '/auth/register', {
      name: ' Casey ',
      email: 'Casey@example.com',
      password,
    }).expect(201);
    expect(registration.body.data).toEqual({
      id: expect.any(String),
      name: 'Casey',
      email: 'casey@example.com',
    });
    expect(registration.headers['set-cookie'][0]).toMatch(
      /HttpOnly; SameSite=Lax/i,
    );
    expect(registration.headers['cache-control']).toBe('no-store');
    const {
      rows: [account],
    } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [
      registration.body.data.id,
    ]);
    expect(account.password_hash).not.toBe(password);
    expect(await bcrypt.compare(password, account.password_hash)).toBe(true);
    await agent.get('/api/auth/me').expect(200, registration.body);
    const fresh = request.agent(app);
    await write(fresh, 'post', '/auth/login', {
      email: 'CASEY@example.com',
      password,
    }).expect(200, registration.body);
    await fresh.get('/api/auth/me').expect(200, registration.body);
  });

  it('rejects duplicate emails and invalid credentials', async () => {
    const anonymous = request(app);
    await write(anonymous, 'post', '/auth/register', {
      name: 'Alice Again',
      email: 'ALICE@EXAMPLE.COM',
      password,
    })
      .expect(409)
      .expect(({ body }) => expect(body.error.code).toBe('EMAIL_EXISTS'));
    await write(anonymous, 'post', '/auth/login', {
      email: 'alice@example.com',
      password: 'Wrong password',
    })
      .expect(401)
      .expect(({ body }) =>
        expect(body.error.code).toBe('INVALID_CREDENTIALS'),
      );
  });

  it('clears the session cookie and rejects replay of the old JWT', async () => {
    const agent = request.agent(app);
    const login = await write(agent, 'post', '/auth/login', {
      email: 'alice@example.com',
      password,
    }).expect(200);
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    await write(agent, 'post', '/auth/logout').expect(200);
    await agent.get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
  });

  it('requires authentication for private endpoints', async () => {
    const anonymous = request(app);
    await anonymous.get('/api/auth/me').expect(401);
    await anonymous.get('/api/readings').expect(401);
    await write(anonymous, 'post', '/readings', reading()).expect(401);
    await anonymous.get(`/api/reports/daily?date=${date}`).expect(401);
  });

  it('rejects a missing CSRF header or a foreign Origin', async () => {
    await alice.post('/api/readings').send(reading()).expect(403);
    await alice
      .post('/api/readings')
      .set('Origin', 'https://untrusted.example')
      .set('X-Sweety-Request', '1')
      .send(reading())
      .expect(403);
  });
});

describe('readings', () => {
  it('creates, lists, retrieves, edits, and deletes a reading', async () => {
    const entry = await add(alice, reading('morning', 40));
    const path = `/readings/${entry.id}`;
    await alice
      .get('/api/readings')
      .query({ date })
      .expect(200, { data: [entry] });
    await alice.get(`/api${path}`).expect(200, { data: entry });
    const edited = reading('after_lunch', 600, '2026-10-14');
    await write(alice, 'put', path, edited).expect(200, {
      data: { id: entry.id, ...edited },
    });
    await alice.get('/api/readings').query({ date }).expect(200, { data: [] });
    await write(alice, 'delete', path).expect(200, { data: { id: entry.id } });
    await alice.get(`/api${path}`).expect(404);
  });

  it('isolates reads, writes, deletes, and aggregates across accounts', async () => {
    const entry = await add(alice);
    await bob.get('/api/readings').expect(200, { data: [] });
    await bob.get(`/api/readings/${entry.id}`).expect(404);
    await write(
      bob,
      'put',
      `/readings/${entry.id}`,
      reading('morning', 500),
    ).expect(404);
    await write(bob, 'delete', `/readings/${entry.id}`).expect(404);
    expect(await report(bob, 'daily')).toMatchObject({
      count: 0,
      readings: [],
    });
    await add(bob, reading('morning', 500));
    expect(await report(alice, 'daily')).toMatchObject({
      count: 1,
      average: 100,
    });
  });

  it.each([39, 601, 100.5, '110', true])(
    'rejects invalid glucose value %j',
    async (value) => {
      const response = await write(
        alice,
        'post',
        '/readings',
        reading('morning', value),
      ).expect(400);
      expect(response.body.error).toMatchObject({
        field: 'value',
        message: 'Value must be a whole number between 40 and 600 mg/dl.',
      });
    },
  );

  it('rejects missing glucose values', async () => {
    const response = await write(alice, 'post', '/readings', {
      date,
      slot: 'morning',
    }).expect(400);
    expect(response.body.error).toMatchObject({
      field: 'value',
      message: 'Please enter a glucose value.',
    });
  });

  it('rejects future dates, invalid dates, and unrecognized slots', async () => {
    const response = await write(
      alice,
      'post',
      '/readings',
      reading('morning', 100, '2026-10-16'),
    ).expect(400);
    expect(response.body.error.message).toBe('Date cannot be in the future.');
    await write(
      alice,
      'post',
      '/readings',
      reading('morning', 100, '2026-02-30'),
    ).expect(400);
    await write(alice, 'post', '/readings', reading('after_snack')).expect(400);
  });

  it('enforces duplicate slots on create and edit and caps a day at four readings', async () => {
    await add(alice);
    await write(alice, 'post', '/readings', reading())
      .expect(409)
      .expect(({ body }) => {
        expect(body.error.message).toBe(
          'You already have an Morning (fasting) reading for this date.',
        );
      });
    const lunch = await add(alice, reading('after_lunch'));
    await write(alice, 'put', `/readings/${lunch.id}`, reading()).expect(409);
    await write(
      alice,
      'put',
      `/readings/${lunch.id}`,
      reading('after_lunch', 38),
    ).expect(400);
    await add(alice, reading('after_breakfast'));
    await add(alice, reading('after_dinner'));
    await write(alice, 'post', '/readings', reading())
      .expect(409)
      .expect(({ body }) => {
        expect(body.error.message).toBe('You can add only 4 readings per day.');
      });
  });

  it('resolves simultaneous writes to the same slot as one success and one conflict', async () => {
    const results = await Promise.all([
      write(alice, 'post', '/readings', reading()),
      write(alice, 'post', '/readings', reading()),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await report(alice, 'daily')).toMatchObject({ count: 1 });
  });
});

describe('reporting', () => {
  it('calculates daily statistics with one-decimal precision and ordered readings', async () => {
    const dinner = await add(alice, reading('after_dinner', 146));
    const morning = await add(alice, reading('morning', 91));
    const lunch = await add(alice, reading('after_lunch', 130));
    await add(alice, reading('morning', 500, '2026-10-14'));
    expect(await report(alice, 'daily')).toMatchObject({
      start: date,
      end: date,
      count: 3,
      lowest: 91,
      highest: 146,
      average: 122.3,
      readings: [morning, lunch, dinner],
    });
  });

  it('includes the first day and selected day for month-to-date', async () => {
    for (const [day, value] of [
      ['2026-09-30', 500],
      ['2026-10-01', 90],
      ['2026-10-14', 140],
      [date, 550],
    ]) {
      await add(alice, reading('morning', value, day));
    }
    expect(await report(alice, 'month-to-date', '2026-10-14')).toMatchObject({
      start: '2026-10-01',
      end: '2026-10-14',
      count: 2,
      lowest: 90,
      highest: 140,
      average: 115,
    });
  });

  it('selects the whole previous calendar month at a January year boundary', async () => {
    for (const [day, value] of [
      ['2025-11-30', 500],
      ['2025-12-01', 80],
      ['2025-12-31', 160],
      ['2026-01-01', 540],
    ]) {
      await add(alice, reading('morning', value, day));
    }
    expect(await report(alice, 'monthly', '2026-01-15')).toMatchObject({
      start: '2025-12-01',
      end: '2025-12-31',
      count: 2,
      lowest: 80,
      highest: 160,
      average: 120,
    });
  });

  it('includes February 29 in a leap year', async () => {
    await add(alice, reading('morning', 103, '2024-02-29'));
    expect(await report(alice, 'monthly', '2024-03-04')).toMatchObject({
      start: '2024-02-01',
      end: '2024-02-29',
      count: 1,
      average: 103,
    });
  });

  it.each(['daily', 'month-to-date', 'monthly'])(
    'returns null statistics for empty %s reports',
    async (kind) => {
      expect(await report(alice, kind)).toMatchObject({
        count: 0,
        average: null,
        highest: null,
        lowest: null,
        readings: [],
      });
    },
  );
});
