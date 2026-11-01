import type {
  ControlPoint,
  ControlPointReading,
  EmissionSource,
  ForecastResponse,
  HourlyCalc,
  PollutantValues,
  RegionBounds,
  RegionInfo,
  WindHour,
} from '../types';
import { EMISSION_IDS, POLLUTANT_ORDER } from './pollutants';

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Некорректный ответ API: ${message}`);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parsePosition(value: unknown, label: string): { lat: number; lng: number } {
  assert(isRecord(value), `${label}.position`);
  assert(isFiniteNumber(value.lat), `${label}.position.lat`);
  assert(isFiniteNumber(value.lng), `${label}.position.lng`);
  return { lat: value.lat, lng: value.lng };
}

function parseRegion(value: unknown): RegionInfo {
  assert(isRecord(value), 'region');
  assert(typeof value.id === 'string' && value.id.length > 0, 'region.id');
  assert(typeof value.name === 'string' && value.name.length > 0, 'region.name');
  assert(Array.isArray(value.bounds) && value.bounds.length === 2, 'region.bounds');

  const [southWest, northEast] = value.bounds;
  assert(Array.isArray(southWest) && southWest.length === 2, 'region.bounds[0]');
  assert(Array.isArray(northEast) && northEast.length === 2, 'region.bounds[1]');
  assert(
    isFiniteNumber(southWest[0]) &&
      isFiniteNumber(southWest[1]) &&
      isFiniteNumber(northEast[0]) &&
      isFiniteNumber(northEast[1]),
    'region.bounds coordinates',
  );
  assert(southWest[0] < northEast[0] && southWest[1] < northEast[1], 'region.bounds order');

  const bounds: RegionBounds = [
    [southWest[0], southWest[1]],
    [northEast[0], northEast[1]],
  ];

  if (value.center !== undefined) {
    parsePosition(value.center, 'region');
  }
  if (value.zoom !== undefined) {
    assert(isFiniteNumber(value.zoom) && value.zoom > 0, 'region.zoom');
  }
  if (value.timeZone !== undefined) {
    assert(typeof value.timeZone === 'string', 'region.timeZone');
  }

  return {
    id: value.id,
    name: value.name,
    bounds,
    ...(value.center !== undefined ? { center: parsePosition(value.center, 'region') } : {}),
    ...(value.zoom !== undefined ? { zoom: value.zoom } : {}),
    ...(value.timeZone !== undefined ? { timeZone: value.timeZone } : {}),
  };
}

function parseSource(value: unknown, index: number): EmissionSource {
  const label = `sources[${index}]`;
  assert(isRecord(value), label);
  assert(typeof value.id === 'string' && value.id.length > 0, `${label}.id`);
  assert(typeof value.name === 'string' && value.name.length > 0, `${label}.name`);
  assert(isRecord(value.emissions), `${label}.emissions`);

  const emissions = {} as EmissionSource['emissions'];
  for (const id of EMISSION_IDS) {
    assert(isFiniteNumber(value.emissions[id]), `${label}.emissions.${id}`);
    emissions[id] = value.emissions[id];
  }

  const stackHeight = value.stackHeight;
  const stackDiameter = value.stackDiameter;
  const exitVelocity = value.exitVelocity;
  const temperature = value.temperature;
  assert(isFiniteNumber(stackHeight), `${label}.stackHeight`);
  assert(isFiniteNumber(stackDiameter), `${label}.stackDiameter`);
  assert(isFiniteNumber(exitVelocity), `${label}.exitVelocity`);
  assert(isFiniteNumber(temperature), `${label}.temperature`);

  return {
    id: value.id,
    name: value.name,
    position: parsePosition(value.position, label),
    stackHeight,
    stackDiameter,
    exitVelocity,
    temperature,
    emissions,
  };
}

function parsePoint(value: unknown, index: number): ControlPoint {
  const label = `controlPoints[${index}]`;
  assert(isRecord(value), label);
  assert(typeof value.id === 'string' && value.id.length > 0, `${label}.id`);
  assert(typeof value.name === 'string' && value.name.length > 0, `${label}.name`);
  return {
    id: value.id,
    name: value.name,
    position: parsePosition(value.position, label),
  };
}

function parseWind(value: unknown, label: string): WindHour {
  assert(isRecord(value), `${label}.wind`);
  const stability = value.stability;
  assert(
    typeof stability === 'string' && ['A', 'B', 'C', 'D', 'E', 'F'].includes(stability),
    `${label}.wind.stability`,
  );
  assert(isFiniteNumber(value.windSpeed), `${label}.wind.windSpeed`);
  assert(isFiniteNumber(value.windDirection), `${label}.wind.windDirection`);
  assert(isFiniteNumber(value.temperature), `${label}.wind.temperature`);
  return {
    time: String(value.time),
    windSpeed: value.windSpeed,
    windDirection: value.windDirection,
    temperature: value.temperature,
    stability: stability as WindHour['stability'],
  };
}

function parseReadings(value: unknown, label: string): ControlPointReading[] {
  assert(Array.isArray(value), `${label}.readings`);
  return value.map((item, index) => {
    const itemLabel = `${label}.readings[${index}]`;
    assert(isRecord(item), itemLabel);
    assert(typeof item.pointId === 'string', `${itemLabel}.pointId`);
    assert(isRecord(item.values), `${itemLabel}.values`);
    const values = {} as PollutantValues;
    for (const id of POLLUTANT_ORDER) {
      assert(isFiniteNumber(item.values[id]), `${itemLabel}.values.${id}`);
      values[id] = item.values[id];
    }
    return { pointId: item.pointId, values };
  });
}

function parseHour(value: unknown, index: number): HourlyCalc {
  const label = `hours[${index}]`;
  assert(isRecord(value), label);
  assert(typeof value.time === 'string', `${label}.time`);
  return {
    time: value.time,
    wind: parseWind(value.wind, label),
    readings: parseReadings(value.readings, label),
  };
}

/**
 * Проверяет ответ бэкенда до того, как он попадёт в UI.
 * Заменяет mock на реальный API: `return parseForecast(await response.json())`.
 */
export function parseForecast(value: unknown): ForecastResponse {
  assert(isRecord(value), 'корень ответа');
  assert(value.region !== undefined, 'region');
  assert(Array.isArray(value.sources) && value.sources.length > 0, 'sources');
  assert(Array.isArray(value.controlPoints), 'controlPoints');
  assert(Array.isArray(value.hours) && value.hours.length > 0, 'hours');
  assert(typeof value.generatedAt === 'string', 'generatedAt');

  const hours = value.hours.map(parseHour);
  const nowIndex = value.nowIndex;
  assert(
    typeof nowIndex === 'number' &&
      Number.isInteger(nowIndex) &&
      nowIndex >= 0 &&
      nowIndex < hours.length,
    'nowIndex',
  );

  return {
    generatedAt: value.generatedAt,
    region: parseRegion(value.region),
    sources: value.sources.map(parseSource),
    controlPoints: value.controlPoints.map(parsePoint),
    hours,
    nowIndex,
  };
}
