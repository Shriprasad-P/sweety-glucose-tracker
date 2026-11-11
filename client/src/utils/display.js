export function displayDate(value, options = { dateStyle: 'long' }) {
  return new Intl.DateTimeFormat('en', { timeZone: 'UTC', ...options }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
