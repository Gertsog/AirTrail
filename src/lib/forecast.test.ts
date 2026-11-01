import { describe, expect, it } from 'vitest';
import type { HourlyCalc, PollutantValues } from '../types';
import { indexReadings, resolveNowIndex } from './forecast';
import { at } from './array';

function hour(iso: string, pointId = 'p1', value = 1): HourlyCalc {
  const values = {
    CO: value,
    NO2: value,
    SO2: value,
    O3: value,
    'PM2.5': value,
    PM10: value,
    AQI: value,
  } as PollutantValues;
  return {
    time: iso,
    wind: {
      time: iso,
      windSpeed: 3,
      windDirection: 0,
      temperature: 0,
      stability: 'D',
    },
    readings: [{ pointId, values }],
  };
}

const hourIso = (hourOfDay: number, minute = 0) =>
  new Date(2026, 9, 31, hourOfDay, minute).toISOString();

describe('indexReadings', () => {
  it('indexes readings by point id', () => {
    const h = hour(hourIso(10));
    h.readings.push({ pointId: 'p2', values: at(h.readings, 0).values });
    const map = indexReadings(h);
    expect(map.get('p1')).toBe(at(h.readings, 0).values);
    expect(map.get('p2')).toBe(at(h.readings, 1).values);
  });
});

describe('resolveNowIndex', () => {
  const hours = [hour(hourIso(10)), hour(hourIso(11)), hour(hourIso(12))];

  it('uses the current hourly slot, not the nearest one', () => {
    expect(resolveNowIndex(hours, new Date(2026, 9, 31, 11, 40).getTime())).toBe(1);
  });

  it('moves to the next slot exactly on the hour', () => {
    expect(resolveNowIndex(hours, new Date(2026, 9, 31, 12, 0).getTime())).toBe(2);
  });

  it('clamps to the first and last available hours', () => {
    expect(resolveNowIndex(hours, new Date(2026, 9, 31, 9, 0).getTime())).toBe(0);
    expect(resolveNowIndex(hours, new Date(2026, 9, 31, 20, 0).getTime())).toBe(2);
  });

  it('returns zero for an empty forecast', () => {
    expect(resolveNowIndex([], Date.now())).toBe(0);
  });
});
