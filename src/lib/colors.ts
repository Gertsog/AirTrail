import type { PollutantConfig } from './pollutants';
import { at } from './array';

/** Разбивает hex-цвет на компоненты. */
export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** Цвет точки шкалы (0..1) с плавной интерполяцией между порогами. */
export function scaleColor(config: PollutantConfig, t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const stops = config.colors;
  const pos = clamped * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(pos));
  const local = pos - index;
  const a = hexToRgb(at(stops, index, 'цвета шкалы'));
  const b = hexToRgb(at(stops, index + 1, 'цвета шкалы'));
  return [
    Math.round(a[0] + (b[0] - a[0]) * local),
    Math.round(a[1] + (b[1] - a[1]) * local),
    Math.round(a[2] + (b[2] - a[2]) * local),
  ];
}

/**
 * Цвет и прозрачность для «пятна» на карте.
 * Шкала логарифмическая, чтобы шлейф оставался читаемым на больших расстояниях.
 */
export function plumeColor(
  config: PollutantConfig,
  value: number,
): [number, number, number, number] {
  const thresholds = config.thresholds;
  const first = at(thresholds, 0, 'пороги');
  const last = at(thresholds, thresholds.length - 1, 'пороги');
  // Для AQI нижняя граница равна нулю: без этой проверки весь прямоугольник
  // поля заливался бы полупрозрачным цветом «AQI 0».
  if (!Number.isFinite(value) || value <= 0 || value < first * 0.45) {
    return [0, 0, 0, 0];
  }

  const norm = Math.log1p(Math.max(0, value)) / Math.log1p(last);
  const [r, g, b] = scaleColor(config, norm);
  const alpha = Math.min(0.94, 0.08 + 0.86 * Math.pow(norm, 0.7));
  return [r, g, b, Math.round(alpha * 255)];
}

/** Цвет бейджа контрольной точки для абсолютного значения. */
export function valueColor(config: PollutantConfig, value: number): string {
  const thresholds = config.thresholds;
  const colors = config.colors;
  if (value <= at(thresholds, 0, 'пороги')) return at(colors, 0, 'цвета');
  for (let i = 1; i < thresholds.length; i += 1) {
    const threshold = thresholds[i];
    if (threshold === undefined) break;
    if (value < threshold) {
      return at(colors, Math.min(i - 1, colors.length - 1), 'цвета');
    }
  }
  return at(colors, colors.length - 1, 'цвета');
}
