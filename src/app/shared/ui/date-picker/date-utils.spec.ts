import {
  addDays,
  addMonths,
  clampIso,
  daysInMonth,
  formatDisplay,
  isLeapYear,
  isSameDay,
  monthEnd,
  monthGrid,
  mondayOffset,
  parseIso,
  parseTyped,
  toIso,
  todayIso,
} from './date-utils';

describe('date-utils', () => {
  it('knows leap years and month lengths', () => {
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2023, 4)).toBe(30);
    expect(daysInMonth(2023, 12)).toBe(31);
  });

  it('parses ISO strictly as local calendar dates', () => {
    expect(parseIso('1990-05-15')).toEqual({ y: 1990, m: 5, d: 15 });
    expect(parseIso('2023-02-29')).toBeNull();
    expect(parseIso('2024-02-29')).not.toBeNull();
    expect(parseIso('2024-13-01')).toBeNull();
    expect(parseIso('1990-5-15')).toBeNull();
    expect(parseIso('')).toBeNull();
    expect(toIso(990, 5, 1)).toBe('0990-05-01');
  });

  it('formats for display', () => {
    expect(formatDisplay('1990-05-15')).toBe('15 May 1990');
    expect(formatDisplay('2024-01-01')).toBe('1 Jan 2024');
    expect(formatDisplay('nope')).toBe('');
  });

  it('parses typed input', () => {
    expect(parseTyped('15/05/1990')).toBe('1990-05-15');
    expect(parseTyped(' 5/5/1990 ')).toBe('1990-05-05');
    expect(parseTyped('1990-05-15')).toBe('1990-05-15');
    expect(parseTyped('31/02/1990')).toBeNull();
    expect(parseTyped('15/05/90')).toBeNull();
    expect(parseTyped('abc')).toBeNull();
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2023-03-01', -1)).toBe('2023-02-28');
    expect(addDays('2024-01-01', 366)).toBe('2025-01-01');
  });

  it('adds months and clamps the day', () => {
    expect(addMonths('2023-01-31', 1)).toBe('2023-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2024-02-29', 12)).toBe('2025-02-28');
    expect(addMonths('2024-01-15', -1)).toBe('2023-12-15');
    expect(addMonths('2024-01-15', -13)).toBe('2022-12-15');
  });

  it('clamps to min and max', () => {
    expect(clampIso('1800-01-01', '1900-01-01', '2020-01-01')).toBe('1900-01-01');
    expect(clampIso('2030-01-01', '1900-01-01', '2020-01-01')).toBe('2020-01-01');
    expect(clampIso('2000-01-01', '1900-01-01', '2020-01-01')).toBe('2000-01-01');
  });

  it('compares days', () => {
    expect(isSameDay('2020-01-01', '2020-01-01')).toBe(true);
    expect(isSameDay('2020-01-01', '2020-01-02')).toBe(false);
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('computes Monday-first offsets', () => {
    expect(mondayOffset('2024-01-01')).toBe(0); // Monday
    expect(mondayOffset('2024-01-07')).toBe(6); // Sunday
    expect(mondayOffset('1990-05-15')).toBe(1); // Tuesday
    expect(monthEnd('2024-02-10')).toBe('2024-02-29');
  });

  it('builds a 42 day grid starting on Monday', () => {
    const grid = monthGrid('1990-05-15');
    expect(grid.length).toBe(42);
    expect(grid[0]).toBe('1990-04-30');
    expect(grid[1]).toBe('1990-05-01');
    expect(mondayOffset(grid[0])).toBe(0);
    const jan = monthGrid('2024-01-20');
    expect(jan[0]).toBe('2024-01-01');
  });
});
