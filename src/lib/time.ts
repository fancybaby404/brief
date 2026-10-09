export type TimeFormat = '12h' | '24h';

/** Format a date/time using the user's Brief preference and device locale. */
export function formatTime(value: string | number | Date, format: TimeFormat): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
  });
}

export function formatTimeInput(value: string, format: TimeFormat): string {
  return formatTime(`2000-01-01T${value}:00`, format);
}

/** Return the calendar's normalized HH:mm value, or null for incomplete/invalid input. */
export function parseTimeInput(value: string, format: TimeFormat): string | null {
  const match = format === '12h'
    ? value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    : value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (minutes > 59 || (format === '12h' ? hours < 1 || hours > 12 : hours > 23)) return null;
  if (format === '12h') {
    const meridiem = match[3].toUpperCase();
    hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0);
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
