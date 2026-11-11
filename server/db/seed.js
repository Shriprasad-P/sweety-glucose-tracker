import bcrypt from 'bcrypt';
import pg from 'pg';
import { calendarToday, reportRange, slots } from '../../shared/glucose.js';
import { bcryptCost } from '../src/auth.js';

if (process.env.NODE_ENV === 'production')
  throw new Error('Demo seeding is disabled in production.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const hash = await bcrypt.hash('SweetyDemo!2026', bcryptCost);
  const today = calendarToday(process.env.APP_TIME_ZONE ?? 'Asia/Kolkata');
  const previous = reportRange('monthly', today);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      rows: [user],
    } = await client.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       WHERE users.name = EXCLUDED.name
       RETURNING id`,
      ['Alex Morgan', 'demo@sweety.example', hash],
    );
    if (!user) throw new Error('The reserved demo email is already in use.');
    const days = new Map([
      [previous.start, [88, 126, 142, 116]],
      [previous.end, [93, 131, 151, 120]],
      [`${today.slice(0, 7)}-01`, [91, 122, 136, 124]],
      [today, [96, 132, 145]],
    ]);
    for (const [date, readings] of days) {
      for (const [index, value] of readings.entries()) {
        await client.query(
          `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, reading_date, time_slot) DO NOTHING`,
          [user.id, date, slots[index].value, value],
        );
      }
    }
    await client.query('COMMIT');
    console.log('Demo user and sample readings are ready.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
