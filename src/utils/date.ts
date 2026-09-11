/** Small date helpers. Dates are stored as "YYYY-MM-DD" strings in Firestore. */

/** Today in local time as "YYYY-MM-DD". */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Converts a Date into a local "YYYY-MM-DD" string (no timezone surprises). */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses "YYYY-MM-DD" into a local Date at midnight. */
export function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** "2026-09-10" -> "September 10, 2026" */
export function formatLongDate(value: string): string {
  if (!value) return '';
  return fromIsoDate(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** "2026-09-10" -> "September 10" */
export function formatShortDate(value: string): string {
  if (!value) return '';
  return fromIsoDate(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/** "2026-09-10" -> "Thursday" */
export function formatWeekday(value: string): string {
  if (!value) return '';
  return fromIsoDate(value).toLocaleDateString(undefined, { weekday: 'long' });
}
