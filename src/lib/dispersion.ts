import type { EmissionSource, LatLng, PollutantId, StabilityClass, WindHour } from '../types';
import { displayValueFromConcentration } from './pollutants';
import { clamp } from './math';

export const EARTH_METERS_PER_DEG_LAT = 111_320;

/** Коэффициенты Бриггса для открытой местности: σ = a·x·(1 + b·x)^c. */
const DISPERSION: Record<
  StabilityClass,
  { y: [number, number, number]; z: [number, number, number] }
> = {
  A: { y: [0.22, 0.0001, -0.5], z: [0.2, 0, 0] },
  B: { y: [0.16, 0.0001, -0.5], z: [0.12, 0, 0] },
  C: { y: [0.11, 0.0001, -0.5], z: [0.08, 0.0002, -0.5] },
  D: { y: [0.08, 0.0001, -0.5], z: [0.06, 0.0015, -0.5] },
  E: { y: [0.06, 0.0001, -0.5], z: [0.03, 0.0003, -1] },
  F: { y: [0.04, 0.0001, -0.5], z: [0.016, 0.0003, -1] },
};

/** Дополнительное расширение факела относительно классических кривых Бриггса. */
const SPREAD_Y = 1.55;
const SPREAD_Z = 1.3;

export function sigmaY(downwind: number, stability: StabilityClass): number {
  const [a, b, c] = DISPERSION[stability].y;
  const x = Math.max(30, downwind);
  return Math.max(12, SPREAD_Y * a * x * Math.pow(1 + b * x, c));
}

export function sigmaZ(downwind: number, stability: StabilityClass): number {
  const [a, b, c] = DISPERSION[stability].z;
  const x = Math.max(30, downwind);
  if (c === 0) return Math.max(12, SPREAD_Z * a * x);
  return Math.max(12, SPREAD_Z * a * x * Math.pow(1 + b * x, c));
}

/**
 * Эффективная высота источника для демонстрационной модели.
 * Настоящий подъём факела зависит от скорости выхода газов и температуры;
 * здесь оставляем от трубы часть высоты, чтобы шлейф был виден у земли.
 */
export function effectiveHeight(source: EmissionSource): number {
  return clamp(source.stackHeight * 0.26, 12, 60);
}

/**
 * Упрощённая гауссова модель факела у земли.
 * Возвращает концентрацию в мкг/м³ (для CO потом переводим в мг/м³).
 */
export function groundConcentration(params: {
  downwind: number;
  crosswind: number;
  emission: number;
  windSpeed: number;
  stability: StabilityClass;
  stackHeight: number;
}): number {
  const { downwind, crosswind, emission, windSpeed, stability, stackHeight } = params;
  if (emission <= 0) return 0;
  const x = Math.max(60, downwind);
  const u = Math.max(0.8, windSpeed);
  const sy = sigmaY(x, stability);
  const sz = sigmaZ(x, stability);
  const height = clamp(stackHeight * 0.26, 12, 60);

  const lateral = Math.exp(-(crosswind * crosswind) / (2 * sy * sy));
  const vertical = Math.exp(-(height * height) / (2 * sz * sz));
  const core = (emission * 1e6) / (Math.PI * u * sy * sz);
  return core * lateral * vertical;
}

/** Концентрация в точке от одного источника в единицах отображения. */
export function concentrationAtPoint(
  source: EmissionSource,
  point: LatLng,
  wind: WindHour,
  pollutant: PollutantId,
): number {
  const bearing = ((wind.windDirection + 180) % 360) * (Math.PI / 180);
  const metersPerDegLng =
    EARTH_METERS_PER_DEG_LAT * Math.cos((source.position.lat * Math.PI) / 180);
  const dx = (point.lng - source.position.lng) * metersPerDegLng;
  const dy = (point.lat - source.position.lat) * EARTH_METERS_PER_DEG_LAT;
  const emission = source.emissions[pollutant === 'AQI' ? 'PM2.5' : pollutant];

  const downwind = dx * Math.sin(bearing) + dy * Math.cos(bearing);
  const crosswind = dx * Math.cos(bearing) - dy * Math.sin(bearing);

  if (downwind <= 0) {
    // Небольшое «размытие» вокруг источника, чтобы точка рядом с трубой не была нулевой.
    const distance = Math.hypot(dx, dy);
    const near = Math.exp(-(distance * distance) / (2 * 120 * 120)) * 0.18;
    if (near < 0.02) return 0;
    const value = groundConcentration({
      downwind: 60,
      crosswind: distance * 0.35,
      emission,
      windSpeed: wind.windSpeed,
      stability: wind.stability,
      stackHeight: source.stackHeight,
    });
    return displayValueFromConcentration(pollutant, value * near);
  }

  const value = groundConcentration({
    downwind,
    crosswind,
    emission,
    windSpeed: wind.windSpeed,
    stability: wind.stability,
    stackHeight: source.stackHeight,
  });
  return displayValueFromConcentration(pollutant, value);
}
