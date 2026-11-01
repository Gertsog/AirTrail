import type { StabilityClass, WindHour } from '../types';
import { clamp } from '../lib/math';

/** Детерминированный генератор случайных чисел. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Детерминированная погода для мока: ветер, температура, класс устойчивости. */
export function makeWind(hour: Date, index: number, rng: () => number): WindHour {
  const hourOfDay = hour.getHours() + hour.getMinutes() / 60;
  const direction =
    (336 +
      28 * Math.sin(index / 9.2) +
      14 * Math.sin(index / 3.7 + 0.8) +
      (rng() - 0.5) * 10 +
      360) %
    360;
  const speed = clamp(3.8 + 1.3 * Math.sin(index / 6.5 + 1.1) + (rng() - 0.5) * 0.8, 1.3, 7.2);
  const temperature =
    -1.5 + 5 * Math.sin(((hourOfDay - 9) / 24) * Math.PI * 2) + (rng() - 0.5) * 0.8;

  const isNight = hourOfDay < 7 || hourOfDay > 21;
  let stability: StabilityClass = 'D';
  if (isNight && speed < 2.8) stability = 'F';
  else if (isNight && speed < 4) stability = 'E';
  else if (!isNight && speed < 3) stability = 'B';
  else if (!isNight && speed < 5.5) stability = 'C';

  return {
    time: hour.toISOString(),
    windSpeed: roundTo(speed, 1),
    windDirection: Math.round(direction),
    temperature: roundTo(temperature, 1),
    stability,
  };
}

export { mulberry32 };
