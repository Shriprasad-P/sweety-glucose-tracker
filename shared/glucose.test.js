import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calendarToday,
  glucoseError,
  isCalendarDate,
  messages,
  reportRange,
} from './glucose.js';

test('calendar dates validate leap days and reject rollover, year zero, and timestamps', () => {
  for (const date of ['2024-02-29', '2000-02-29', '0001-01-01'])
    assert.ok(isCalendarDate(date));
  for (const date of [
    '2026-02-29',
    '1900-02-29',
    '0000-01-01',
    '2026-04-31',
    '2026-1-01',
    '2026-01-01T00:00Z',
    null,
  ]) {
    assert.equal(isCalendarDate(date), false);
  }
});

test('today follows the configured timezone at midnight boundaries', () => {
  const time = new Date('2026-10-14T20:00:00Z');
  assert.equal(calendarToday('Asia/Kolkata', time), '2026-10-15');
  assert.equal(calendarToday('UTC', time), '2026-10-14');
});

test('daily and month-to-date boundaries include the selected date', () => {
  assert.deepEqual(reportRange('daily', '2026-10-15'), {
    start: '2026-10-15',
    end: '2026-10-15',
  });
  assert.deepEqual(reportRange('month-to-date', '2026-10-15'), {
    start: '2026-10-01',
    end: '2026-10-15',
  });
});

test('previous month handles year boundaries and variable month lengths', () => {
  assert.deepEqual(reportRange('monthly', '2026-01-15'), {
    start: '2025-12-01',
    end: '2025-12-31',
  });
  assert.deepEqual(reportRange('monthly', '2026-10-15'), {
    start: '2026-09-01',
    end: '2026-09-30',
  });
  assert.deepEqual(reportRange('monthly', '2024-03-10'), {
    start: '2024-02-01',
    end: '2024-02-29',
  });
  assert.deepEqual(reportRange('monthly', '2026-03-10'), {
    start: '2026-02-01',
    end: '2026-02-28',
  });
  assert.equal(reportRange('monthly', '0001-01-01'), null);
});

test('glucose validation accepts integers at both endpoints', () => {
  for (const value of [40, 110, 600]) assert.equal(glucoseError(value), null);
  for (const value of [39, 601, 120.5, '110', NaN, true])
    assert.equal(glucoseError(value), messages.invalidValue);
  for (const value of ['', undefined, null])
    assert.equal(glucoseError(value), messages.missingValue);
});
