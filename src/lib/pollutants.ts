import type { EmissionId, PollutantId } from '../types';

export interface PollutantConfig {
  id: PollutantId;
  /** Подпись на кнопках и в легенде. */
  label: string;
  /** Единица измерения концентрации. */
  unit: string;
  title: string;
  /** Границы цветовых диапазонов. */
  thresholds: number[];
  /** Цвета диапазонов: на один меньше, чем границ. */
  colors: string[];
  /** Сколько знаков после запятой показывать в интерфейсе. */
  decimals: number;
}

/**
 * Палитра повторяет логику референса: зелёный — чистый воздух,
 * жёлтый/оранжевый — повышенные значения, красный/фиолетовый — опасные.
 */
const GRADIENT_9 = [
  '#7dc86f',
  '#b9d84e',
  '#e9e151',
  '#f6d24b',
  '#f4b64a',
  '#ed8b4d',
  '#e76652',
  '#d74c68',
  '#a4468b',
];

export const POLLUTANTS: Record<PollutantId, PollutantConfig> = {
  'PM2.5': {
    id: 'PM2.5',
    label: 'PM2.5',
    unit: 'мкг/м³',
    title: 'Взвешенные частицы PM2.5',
    thresholds: [1, 11, 23, 35, 46, 97, 126, 160, 285, 410],
    colors: GRADIENT_9,
    decimals: 1,
  },
  PM10: {
    id: 'PM10',
    label: 'PM10',
    unit: 'мкг/м³',
    title: 'Взвешенные частицы PM10',
    thresholds: [1, 20, 40, 60, 80, 120, 200, 300, 400, 600],
    colors: GRADIENT_9,
    decimals: 1,
  },
  NO2: {
    id: 'NO2',
    label: 'NO₂',
    unit: 'мкг/м³',
    title: 'Диоксид азота',
    thresholds: [1, 40, 80, 120, 160, 200, 300, 400, 600, 800],
    colors: GRADIENT_9,
    decimals: 0,
  },
  SO2: {
    id: 'SO2',
    label: 'SO₂',
    unit: 'мкг/м³',
    title: 'Диоксид серы',
    thresholds: [1, 20, 50, 100, 150, 200, 350, 500, 750, 1000],
    colors: GRADIENT_9,
    decimals: 0,
  },
  CO: {
    id: 'CO',
    label: 'CO',
    unit: 'мг/м³',
    title: 'Оксид углерода',
    thresholds: [0.1, 1, 2, 3, 5, 7, 10, 15, 20, 30],
    colors: GRADIENT_9,
    decimals: 2,
  },
  O3: {
    id: 'O3',
    label: 'O₃',
    unit: 'мкг/м³',
    title: 'Озон',
    thresholds: [1, 50, 100, 130, 160, 200, 240, 300, 400, 500],
    colors: GRADIENT_9,
    decimals: 0,
  },
  AQI: {
    id: 'AQI',
    label: 'AQI',
    unit: 'индекс',
    title: 'Индекс качества воздуха',
    thresholds: [0, 50, 100, 150, 200, 300, 500],
    colors: ['#65b85d', '#e3d24b', '#f0a04b', '#e26352', '#a5468c', '#7d2b3e'],
    decimals: 0,
  },
};

export const POLLUTANT_ORDER: PollutantId[] = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'AQI'];

export const EMISSION_IDS: EmissionId[] = ['CO', 'NO2', 'SO2', 'O3', 'PM2.5', 'PM10'];

export { hexToRgb, scaleColor, plumeColor, valueColor } from './colors';
export { aqiFromPm25, displayValueFromConcentration } from './aqi';
export { formatValue, formatBadgeValue } from './pollutantFormat';
export { windDirectionLabel } from './windDirection';
