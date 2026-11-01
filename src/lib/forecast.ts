import type { HourlyCalc, PollutantValues } from '../types';

/** Индексирует показания контрольных точек по id точки. */
export function indexReadings(hour: HourlyCalc): Map<string, PollutantValues> {
  const result = new Map<string, PollutantValues>();
  for (const reading of hour.readings) result.set(reading.pointId, reading.values);
  return result;
}

/**
 * Индекс часового слота, в который попадает текущее время.
 * В отличие от округления, после :30 не уводит «Сейчас» на следующий час.
 */
export function resolveNowIndex(hours: HourlyCalc[], now = Date.now()): number {
  if (hours.length === 0) return 0;
  let index = 0;
  for (let i = 0; i < hours.length; i += 1) {
    const hour = hours[i];
    if (!hour) break;
    if (new Date(hour.time).getTime() <= now) index = i;
    else break;
  }
  return index;
}
