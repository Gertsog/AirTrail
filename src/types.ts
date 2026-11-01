/** Общие типы данных приложения. */

export type PollutantId = 'CO' | 'NO2' | 'SO2' | 'O3' | 'PM2.5' | 'PM10' | 'AQI';

export type LayerId = 'plume' | 'points' | 'sources' | 'wind';

export type LayerState = Record<LayerId, boolean>;

export type PollutantValues = Record<PollutantId, number>;

/** Вещества, которые могут быть выброшены источником (AQI — расчётный индекс). */
export type EmissionId = Exclude<PollutantId, 'AQI'>;

export type EmissionValues = Record<EmissionId, number>;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Границы региона в формате MapLibre: [[запад, юг], [восток, север]]. */
export type RegionBounds = [[west: number, south: number], [east: number, north: number]];

/**
 * Регион, для которого бэкенд отдаёт источники, точки и прогноз.
 * Карта центрируется по этим данным, а не по координатам, зашитым во фронтенд.
 */
export interface RegionInfo {
  id: string;
  name: string;
  timeZone?: string;
  center?: LatLng;
  zoom?: number;
  bounds: RegionBounds;
}

export interface EmissionSource {
  id: string;
  name: string;
  position: LatLng;
  /** Высота трубы, м. */
  stackHeight: number;
  /** Диаметр устья, м. */
  stackDiameter: number;
  /** Скорость выхода газов, м/с. */
  exitVelocity: number;
  /** Температура газов, °C. */
  temperature: number;
  /** Интенсивность выброса по веществам, г/с. */
  emissions: EmissionValues;
}

export interface ControlPoint {
  id: string;
  name: string;
  position: LatLng;
}

/** Класс устойчивости атмосферы по Пасквиллу (A — очень неустойчивый, F — инверсия). */
export type StabilityClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface WindHour {
  /** ISO-время часа прогноза. */
  time: string;
  /** Скорость ветра на высоте 10 м, м/с. */
  windSpeed: number;
  /** Метеорологическое направление «откуда дует», градусы. */
  windDirection: number;
  /** Температура воздуха, °C. */
  temperature: number;
  stability: StabilityClass;
}

export interface ControlPointReading {
  pointId: string;
  /** Концентрации в единицах отображения (мг/м³ для CO, мкг/м³ для остальных, AQI — индекс). */
  values: PollutantValues;
}

export interface HourlyCalc {
  time: string;
  wind: WindHour;
  readings: ControlPointReading[];
}

export interface ForecastResponse {
  generatedAt: string;
  region: RegionInfo;
  sources: EmissionSource[];
  controlPoints: ControlPoint[];
  hours: HourlyCalc[];
  /** Индекс часа, соответствующего текущему времени. */
  nowIndex: number;
}
