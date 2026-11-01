import type { PollutantConfig } from './pollutants';

/** Форматирует значение для интерфейса: 7,6 / 124. */
export function formatValue(config: PollutantConfig, value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const decimals = config.decimals;
  return safe
    .toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/\u00a0/g, ' ');
}

/** Компактное значение для бейджа на карте: 0 / 7,6 / 124. */
export function formatBadgeValue(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value < 10) {
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 }).replace('.', ',');
  }
  return Math.round(value).toString();
}
