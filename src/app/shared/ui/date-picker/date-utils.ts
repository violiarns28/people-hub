/** Pure date helpers. Dates are `yyyy-MM-dd` strings handled as local calendar dates (never via UTC parsing). */

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

const pad = (n: number, w = 2): string => String(n).padStart(w, '0');

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** `m` is 1-12. */
export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function toIso(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/** Strict `yyyy-MM-dd` parse; null when malformed or not a real calendar date. */
export function parseIso(s: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) {
    return null;
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 100 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
    return null;
  }
  return { y, m, d };
}

export function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** `15 May 1990`, or '' when not a valid date. */
export function formatDisplay(iso: string): string {
  const p = parseIso(iso);
  return p ? `${p.d} ${MONTHS_SHORT[p.m - 1]} ${p.y}` : '';
}

/** Accepts `dd/mm/yyyy` (also `.` or `-` separators, single digit day/month) or ISO `yyyy-MM-dd`. */
export function parseTyped(text: string): string | null {
  const t = text.trim();
  if (parseIso(t)) {
    return t;
  }
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (!match) {
    return null;
  }
  const iso = toIso(Number(match[3]), Number(match[2]), Number(match[1]));
  return parseIso(iso) ? iso : null;
}

function fromUtc(date: Date): string {
  return toIso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(iso: string, n: number): string {
  const p = parseIso(iso);
  if (!p) {
    return iso;
  }
  return fromUtc(new Date(Date.UTC(p.y, p.m - 1, p.d + n)));
}

/** Adds months, clamping the day to the target month length (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: string, n: number): string {
  const p = parseIso(iso);
  if (!p) {
    return iso;
  }
  const total = p.y * 12 + (p.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return toIso(y, m, Math.min(p.d, daysInMonth(y, m)));
}

export function clampIso(iso: string, min: string, max: string): string {
  if (iso < min) {
    return min;
  }
  if (iso > max) {
    return max;
  }
  return iso;
}

export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

export function isInRange(iso: string, min: string, max: string): boolean {
  return iso >= min && iso <= max;
}

/** 0 = Monday ... 6 = Sunday. */
export function mondayOffset(iso: string): number {
  const p = parseIso(iso);
  if (!p) {
    return 0;
  }
  return (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7;
}

export function monthStart(iso: string): string {
  const p = parseIso(iso);
  return p ? toIso(p.y, p.m, 1) : iso;
}

export function monthEnd(iso: string): string {
  const p = parseIso(iso);
  return p ? toIso(p.y, p.m, daysInMonth(p.y, p.m)) : iso;
}

/** 42 consecutive days (6 weeks, Monday first) covering the month of `iso`. */
export function monthGrid(iso: string): string[] {
  const first = monthStart(iso);
  const start = addDays(first, -mondayOffset(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
