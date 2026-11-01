import type { PollutantId } from '../types';

/** AQI по концентрации PM2.5 (упрощённые breakpoints US EPA). */
export function aqiFromPm25(pm25: number): number {
  const c = Math.max(0, pm25);
  const breakpoints: Array<[number, number, number, number]> = [
    [0, 12.1, 0, 50],
    [12.1, 35.5, 51, 100],
    [35.5, 55.5, 101, 150],
    [55.5, 150.5, 151, 200],
    [150.5, 250.5, 201, 300],
    [250.5, 350.5, 301, 400],
    [350.5, 500.5, 401, 500],
  ];
  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      const value = iLow + ((iHigh - iLow) / (cHigh - cLow)) * (c - cLow);
      return Math.round(value);
    }
  }
  return 500;
}

/**
 * Переводит «физическую» концентрацию (мкг/м³), которую считает модель,
 * в единицы отображения выбранного вещества.
 */
export function displayValueFromConcentration(id: PollutantId, ugPerM3: number): number {
  if (id === 'AQI') return aqiFromPm25(ugPerM3);
  if (id === 'CO') return ugPerM3 / 1000;
  return ugPerM3;
}
