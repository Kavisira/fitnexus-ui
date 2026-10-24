/** Formats a Date as a local-calendar "YYYY-MM-DD" string, using the
 * Date object's own local year/month/day — NOT `toISOString()`, which
 * converts to UTC first and silently shifts the date backward by one
 * day for any timezone ahead of UTC (e.g. IST, UTC+5:30): picking
 * Oct 4 at local midnight becomes "Oct 3 18:30 UTC", so
 * `.toISOString().slice(0, 10)` reports "Oct 3". Use this instead
 * anywhere a p-datepicker's Date value needs to become a plain
 * "YYYY-MM-DD" to send to the backend. */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
