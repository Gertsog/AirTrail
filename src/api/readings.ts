import type { ControlPointReading, PollutantId, PollutantValues, WindHour } from '../types';
import { aqiFromPm25 } from '../lib/pollutants';
import { concentrationAtPoint } from '../lib/dispersion';
import { BACKGROUND, CONTROL_POINTS, SOURCES } from './fixtures';

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Концентрации во всех контрольных точках для одного часа. */
export function makeReadings(wind: WindHour, rng: () => number): ControlPointReading[] {
  return CONTROL_POINTS.map((point) => {
    const values = {} as PollutantValues;
    const pollutants: PollutantId[] = ['CO', 'NO2', 'SO2', 'O3', 'PM2.5', 'PM10', 'AQI'];
    const noise = 0.92 + rng() * 0.16;

    for (const pollutant of pollutants) {
      if (pollutant === 'AQI') continue;
      let total = BACKGROUND[pollutant];
      for (const source of SOURCES) {
        total += concentrationAtPoint(source, point.position, wind, pollutant);
      }
      total *= noise;
      values[pollutant] = pollutant === 'CO' ? roundTo(total, 2) : roundTo(total, 1);
    }

    values.AQI = aqiFromPm25(values['PM2.5']);
    return { pointId: point.id, values };
  });
}
