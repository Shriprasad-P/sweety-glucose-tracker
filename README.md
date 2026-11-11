# Sweety

Sweety is a personal blood glucose log. Create an account, record up to four readings per day in mg/dL, edit your entries, and review daily, month-to-date, and previous-calendar-month statistics.

Sweety is a recording tool for a technical assessment. It provides no diagnosis or medical advice.

## Features

- Registration, login, persistent sessions, and logout with server-side revocation
- Private reading history with four daily slots and full create, view, edit, and delete support
- Daily, month-to-date, and previous-month reports with minimum, maximum, mean, and count
- Responsive layouts, keyboard-accessible controls, and loading, empty, and error states
- PostgreSQL migrations, synthetic demo data, and automated unit, API, and browser tests

## Stack

React, React Router, Vite, Tailwind CSS, Fetch, and Lucide on the frontend. Node.js, Express, PostgreSQL via `pg`, bcrypt, JWT, and Zod on the backend. npm workspaces, ESLint, Prettier, Vitest, Supertest, and Playwright support development and verification.

## Local setup

Prerequisites are Node.js 22.13+ on the 22.x line or Node.js 24+, npm, and PostgreSQL 15+. Run these commands from the project root.

```sh
npm ci
cp .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated value into `JWT_SECRET` in `.env`. Configure the two database URLs to match your local PostgreSQL server. If you need fresh databases, connect using `psql` as a local PostgreSQL administrator and run the following. The password below is a development placeholder that matches `.env.example`.

```sql
CREATE ROLE sweety LOGIN PASSWORD 'local_sweety_password';
CREATE DATABASE sweety OWNER sweety;
CREATE DATABASE sweety_test OWNER sweety;
```

### Environment variables

| Variable            | Purpose                                                                                       | Development example                                                    |
| ------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`          | Environment mode                                                                              | `development`                                                          |
| `PORT`              | Express loopback port. Vite proxies API calls to this port.                                   | `4000`                                                                 |
| `APP_ORIGIN`        | Exact browser origin, without a trailing slash                                                | `http://127.0.0.1:5173`                                                |
| `DATABASE_URL`      | PostgreSQL connection URL                                                                     | `postgresql://sweety:local_sweety_password@127.0.0.1:5432/sweety`      |
| `TEST_DATABASE_URL` | Separate PostgreSQL database ending in `_test`. The test role must be able to create schemas. | `postgresql://sweety:local_sweety_password@127.0.0.1:5432/sweety_test` |
| `JWT_SECRET`        | Secret for signing the session cookie                                                         | Random value generated above                                           |
| `APP_TIME_ZONE`     | IANA timezone used for the application calendar                                               | `Asia/Kolkata`                                                         |
| `TRUST_PROXY_HOPS`  | Trusted reverse-proxy hop count                                                               | `0`                                                                    |

### Migrate, seed, and start

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

Open [Sweety](http://127.0.0.1:5173). The seed is optional and can be rerun. It adds sample readings for the current date and previous month while preserving existing readings for the demo account.

| Demo field | Value                 |
| ---------- | --------------------- |
| Email      | `demo@sweety.example` |
| Password   | `SweetyDemo!2026`     |

To run the two development processes in separate terminals, use `npm run dev -w server` for Express and `npm run dev -w client` for Vite.

To exercise the production build locally, stop the development server, set `APP_ORIGIN=http://127.0.0.1:4000` in `.env`, keep `NODE_ENV=development` for local HTTP, then run `npm run build` and `npm start`. Open [the built app](http://127.0.0.1:4000).

For a hosted installation, build the frontend and serve it through Express behind a same-host TLS reverse proxy. Set `NODE_ENV=production`, set `APP_ORIGIN` to the public HTTPS origin, and configure `TRUST_PROXY_HOPS` for the actual proxy path. Both the UI and API use that one origin. The API does not enable cross-origin requests.

## Verification

```sh
npm run test:unit
npm test
npm run lint
npm run build
```

The API tests create and remove a unique schema in `TEST_DATABASE_URL`. They use real PostgreSQL constraints and aggregates. The main application's database is independent of the test database.

To exercise the browser workflow, configure the app to use a disposable development database and run the migrations first. Playwright builds the app and starts it at `http://127.0.0.1:4173`. Set `SWEETY_E2E_URL` to test an already-running local instance.

```sh
npx playwright install chromium
npm run test:e2e
```

The browser test registers a synthetic account, checks session persistence and reading validation, exercises CRUD and reports, and verifies logout. It creates one test account per run. To capture seeded screenshots, run `npm run db:seed` and then:

```sh
SWEETY_CAPTURE=1 npm run test:e2e
```

This captures `screenshots/dashboard.png`, `screenshots/reports.png`, and `screenshots/mobile.png`. The [demo walkthrough](screenshots/DEMO.md) covers the same screens.

## API

Requests and responses use JSON. Success responses use `{ "data": ... }` and errors use `{ "error": { "code": "...", "message": "...", "field": "..." } }`. The field is included when a specific input is invalid. Send `X-Sweety-Request: 1` on write requests. Browser write requests must come from the configured origin. Cookie-aware API clients can reuse the session cookie after login.

| Method | Path                                         | Purpose                                                       |
| ------ | -------------------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/config`                                | Application calendar timezone                                 |
| POST   | `/api/auth/register`                         | Create an account and sign in                                 |
| POST   | `/api/auth/login`                            | Sign in                                                       |
| POST   | `/api/auth/logout`                           | Revoke the current session and clear its cookie               |
| GET    | `/api/auth/me`                               | Retrieve the signed-in account                                |
| GET    | `/api/readings?date=YYYY-MM-DD`              | List readings for a date. Omit the date for the full history. |
| POST   | `/api/readings`                              | Create a reading                                              |
| GET    | `/api/readings/:id`                          | Retrieve a reading                                            |
| PUT    | `/api/readings/:id`                          | Replace a reading's date, slot, and value                     |
| DELETE | `/api/readings/:id`                          | Delete a reading                                              |
| GET    | `/api/reports/daily?date=YYYY-MM-DD`         | Selected date, including its individual readings              |
| GET    | `/api/reports/month-to-date?date=YYYY-MM-DD` | First day of the selected month through the selected date     |
| GET    | `/api/reports/monthly?date=YYYY-MM-DD`       | Whole calendar month before the selected date's month         |

A reading body is `{ "date": "2026-10-15", "slot": "morning", "value": 105 }`. Slot keys are `morning`, `after_breakfast`, `after_lunch`, and `after_dinner`. All reading and report routes require a valid session. Requests for another account's reading ID return 404.

## Notes

### Assumptions

- Reading days use PostgreSQL `DATE` values and are transmitted as `YYYY-MM-DD`. `APP_TIME_ZONE` determines today's calendar date, the maximum allowed date, and the seed dates. The server validates the limit for every request.
- The composite unique constraint on user, date, and slot also supports the report date range query. With four allowed slots, the database guarantees a maximum of four readings per day even when requests arrive concurrently. On a full day, a new entry returns the daily limit message.
- Reports aggregate readings in PostgreSQL. A day or range with no readings has a count of zero and null glucose statistics. Averages are rounded to one decimal place and displayed with one decimal digit.
- Passwords are bcrypt hashes using cost 12. JWTs last seven days and are stored in HTTP-only, SameSite=Lax cookies, with the Secure flag and host prefix in production. Each JWT references a PostgreSQL session that logout revokes.
- The demonstration uses synthetic readings and a local-only demo account. The seed command refuses to run in production.

### Improvements with more time

Add paginated history, charts for recorded values, broader keyboard and screen-reader coverage, and account recovery. A multi-instance deployment would also benefit from shared rate limiting and scheduled cleanup of expired sessions.
