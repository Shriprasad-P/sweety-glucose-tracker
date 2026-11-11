import { Router } from 'express';
import { z } from 'zod';
import { reportRange } from '../../shared/glucose.js';
import { HttpError, validate } from './http.js';
import { columns, dateInput, order, validateDate } from './readings.js';

const reportKind = z.enum(['daily', 'month-to-date', 'monthly']);
const queryInput = z.object({ date: dateInput }).strict();

export function createReports({ pool, config, now }) {
  const router = Router();
  router.get('/:kind', async (req, res) => {
    const kind = validate(reportKind, req.params.kind);
    const { date } = validate(queryInput, req.query);
    validateDate(date, config.timeZone, now());
    const range = reportRange(kind, date);
    if (!range)
      throw new HttpError(
        400,
        'INVALID_INPUT',
        'Choose a date with a previous calendar month.',
        'date',
      );
    const {
      rows: [report],
    } = await pool.query(
      `WITH period AS (
         SELECT * FROM readings WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
       )
       SELECT count(*)::int AS count, max(glucose_value) AS highest, min(glucose_value) AS lowest,
              round(avg(glucose_value), 1)::float8 AS average,
              CASE WHEN $4::boolean THEN (
                SELECT coalesce(json_agg(item), '[]'::json)
                FROM (SELECT ${columns} FROM period ORDER BY ${order}) AS item
              ) ELSE '[]'::json END AS readings
       FROM period`,
      [req.user.id, range.start, range.end, kind === 'daily'],
    );
    res.json({ data: { kind, date, ...range, ...report } });
  });
  return router;
}
