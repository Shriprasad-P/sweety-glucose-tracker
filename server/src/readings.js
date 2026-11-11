import { Router } from 'express';
import { z } from 'zod';
import { calendarToday, glucoseError, isCalendarDate, messages, slots } from '../../shared/glucose.js';
import { HttpError, validate } from './http.js';

export const dateInput = z.string({ error: 'Choose a date.' })
  .refine(isCalendarDate, 'Enter a valid date in YYYY-MM-DD format.');

const readingInput = z.object({
  date: dateInput,
  slot: z.enum(slots.map(({ value }) => value), { error: 'Choose one of the four reading slots.' }),
  value: z.unknown().superRefine((value, ctx) => {
    const error = glucoseError(value);
    if (error) ctx.addIssue({ code: 'custom', message: error });
  }),
}).strict();

const readingId = z.uuid({ error: 'Enter a valid reading ID.' });
export const columns = "id, to_char(reading_date, 'YYYY-MM-DD') AS date, time_slot AS slot, glucose_value AS value";
export const order = `reading_date DESC, CASE time_slot
  WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2 WHEN 'after_lunch' THEN 3 ELSE 4 END`;

export function validateDate(date, timeZone, now) {
  if (date > calendarToday(timeZone, now)) throw new HttpError(400, 'FUTURE_DATE', messages.future, 'date');
}

function requireReading(row) {
  if (!row) throw new HttpError(404, 'READING_NOT_FOUND', 'This reading was not found.');
  return row;
}

function isSlotConflict(error) {
  return error.code === '23505' && error.constraint === 'readings_user_date_slot_unique';
}

async function throwSlotConflict(pool, userId, input, moving) {
  if (moving) {
    const { rows: [result] } = await pool.query(
      'SELECT count(*)::int AS count FROM readings WHERE user_id = $1 AND reading_date = $2',
      [userId, input.date],
    );
    if (result.count === slots.length) throw new HttpError(409, 'DAY_FULL', messages.fullDay, 'date');
  }
  throw new HttpError(409, 'DUPLICATE_SLOT', messages.duplicate(input.slot), 'slot');
}

export function createReadings({ pool, config, now }) {
  const router = Router();
  const queryInput = z.object({ date: dateInput.optional() }).strict();

  router.get('/', async (req, res) => {
    const { date } = validate(queryInput, req.query);
    if (date) validateDate(date, config.timeZone, now());
    const { rows } = await pool.query(
      `SELECT ${columns} FROM readings
       WHERE user_id = $1 AND ($2::date IS NULL OR reading_date = $2)
       ORDER BY ${order}`,
      [req.user.id, date ?? null],
    );
    res.json({ data: rows });
  });

  router.post('/', async (req, res) => {
    const input = validate(readingInput, req.body ?? {});
    validateDate(input.date, config.timeZone, now());
    try {
      const { rows: [reading] } = await pool.query(
        `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
         VALUES ($1, $2, $3, $4) RETURNING ${columns}`,
        [req.user.id, input.date, input.slot, input.value],
      );
      res.status(201).location(`/api/readings/${reading.id}`).json({ data: reading });
    } catch (error) {
      if (!isSlotConflict(error)) throw error;
      await throwSlotConflict(pool, req.user.id, input, true);
    }
  });

  router.get('/:id', async (req, res) => {
    const id = validate(readingId, req.params.id);
    const { rows: [row] } = await pool.query(
      `SELECT ${columns} FROM readings WHERE user_id = $1 AND id = $2`, [req.user.id, id],
    );
    res.json({ data: requireReading(row) });
  });

  router.put('/:id', async (req, res) => {
    const id = validate(readingId, req.params.id);
    const input = validate(readingInput, req.body ?? {});
    validateDate(input.date, config.timeZone, now());
    try {
      const { rows: [reading] } = await pool.query(
        `UPDATE readings SET reading_date = $3, time_slot = $4, glucose_value = $5, updated_at = now()
         WHERE user_id = $1 AND id = $2 RETURNING ${columns}`,
        [req.user.id, id, input.date, input.slot, input.value],
      );
      res.json({ data: requireReading(reading) });
    } catch (error) {
      if (!isSlotConflict(error)) throw error;
      const { rows: [current] } = await pool.query(
        "SELECT to_char(reading_date, 'YYYY-MM-DD') AS date FROM readings WHERE user_id = $1 AND id = $2",
        [req.user.id, id],
      );
      await throwSlotConflict(pool, req.user.id, input, requireReading(current).date !== input.date);
    }
  });

  router.delete('/:id', async (req, res) => {
    const id = validate(readingId, req.params.id);
    const { rows: [deleted] } = await pool.query(
      'DELETE FROM readings WHERE user_id = $1 AND id = $2 RETURNING id', [req.user.id, id],
    );
    res.json({ data: requireReading(deleted) });
  });

  return router;
}
