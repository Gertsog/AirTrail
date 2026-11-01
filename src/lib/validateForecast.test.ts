import { describe, expect, it } from 'vitest';
import { buildForecast } from '../api/mockBackend';
import { parseForecast } from './validateForecast';
import { at } from './array';

describe('parseForecast', () => {
  it('accepts a valid forecast', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12, 40));
    const parsed = parseForecast(forecast);
    expect(parsed.sources).toHaveLength(forecast.sources.length);
    expect(parsed.hours).toHaveLength(forecast.hours.length);
    expect(parsed.controlPoints).toHaveLength(forecast.controlPoints.length);
    expect(parsed.nowIndex).toBe(12);
  });

  it('rejects an empty forecast', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    expect(() => parseForecast({ ...forecast, hours: [] })).toThrow(/hours/);
  });

  it('rejects an invalid nowIndex', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    expect(() => parseForecast({ ...forecast, nowIndex: 999 })).toThrow(/nowIndex/);
  });

  it('requires region metadata', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    expect(() => parseForecast({ ...forecast, region: undefined })).toThrow(/region/);
  });

  it('rejects invalid region bounds', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    expect(() =>
      parseForecast({
        ...forecast,
        region: {
          ...forecast.region,
          bounds: [
            [77, 52],
            [76, 51],
          ],
        },
      }),
    ).toThrow(/region.bounds order/);
  });

  it('rejects missing emissions', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    const broken = {
      ...forecast,
      sources: [{ ...at(forecast.sources, 0), emissions: {} }],
    };
    expect(() => parseForecast(broken)).toThrow(/emissions/);
  });

  it('uses the current hourly slot after :30', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12, 40));
    expect(at(forecast.hours, forecast.nowIndex).time).toBe(
      new Date(2026, 9, 31, 12, 0).toISOString(),
    );
  });
});
