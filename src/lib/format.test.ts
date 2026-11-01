import { describe, expect, it } from 'vitest';
import { formatDateRange, formatHourRange, formatNumber, formatTime, plural } from './format';

function at(year: number, month: number, day: number, hour = 0) {
  return new Date(year, month, day, hour, 0, 0).toISOString();
}

describe('format', () => {
  it('uses correct Russian plural forms', () => {
    const cases: Array<[number, string]> = [
      [1, 'час'],
      [2, 'часа'],
      [4, 'часа'],
      [5, 'часов'],
      [11, 'часов'],
      [21, 'час'],
      [22, 'часа'],
      [25, 'часов'],
    ];
    for (const [count, expected] of cases) {
      expect(plural(count, 'час', 'часа', 'часов')).toBe(expected);
    }
  });

  it('formats numbers with Russian separators', () => {
    expect(formatNumber(3.14, 1)).toBe('3,1');
    expect(formatNumber(1000, 0)).toBe('1 000');
    expect(formatNumber(-4.8, 1)).toBe('-4,8');
  });

  it('shows a one-hour forecast interval', () => {
    const start = at(2026, 9, 31, 0);
    const end = new Date(new Date(start).getTime() + 3_600_000).toISOString();
    expect(formatHourRange(start)).toBe(`${formatTime(start)} – ${formatTime(end)}`);
  });

  it('includes years only when the range crosses a year boundary', () => {
    const sameYear = formatDateRange(at(2026, 9, 30), at(2026, 10, 1));
    expect(sameYear).toContain('2026');
    expect(sameYear.match(/2026/g)).toHaveLength(1);

    const crossYear = formatDateRange(at(2026, 11, 31), at(2027, 0, 1));
    expect(crossYear).toContain('2026');
    expect(crossYear).toContain('2027');
  });
});
