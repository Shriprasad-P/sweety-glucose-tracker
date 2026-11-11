export const slots = [
  { value: 'morning', label: 'Morning (fasting)' },
  { value: 'after_breakfast', label: 'After breakfast' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'after_dinner', label: 'After dinner' },
];

export const messages = {
  missingValue: 'Please enter a glucose value.',
  invalidValue: 'Value must be a whole number between 40 and 600 mg/dl.',
  future: 'Date cannot be in the future.',
  fullDay: 'You can add only 4 readings per day.',
  duplicate: (slot) =>
    `You already have an ${slots.find(({ value }) => value === slot)?.label} reading for this date.`,
};

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function calendarToday(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(now);
  const fields = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function glucoseError(value) {
  if (value === '' || value === undefined || value === null)
    return messages.missingValue;
  if (!Number.isInteger(value) || value < 40 || value > 600)
    return messages.invalidValue;
  return null;
}

export function reportRange(kind, date) {
  if (kind === 'daily') return { start: date, end: date };
  if (kind === 'month-to-date')
    return { start: `${date.slice(0, 7)}-01`, end: date };
  const end = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  end.setUTCDate(0);
  const last = end.toISOString().slice(0, 10);
  // January of year 0001 has no previous month in the supported calendar.
  if (last.startsWith('0000')) return null;
  return { start: `${last.slice(0, 7)}-01`, end: last };
}
