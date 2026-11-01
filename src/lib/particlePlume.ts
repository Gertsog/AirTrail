import type { EmissionSource, HourlyCalc, LatLng, PollutantId, StabilityClass } from '../types';
import { EARTH_METERS_PER_DEG_LAT } from './dispersion';

const DEG = Math.PI / 180;

/**
 * Окно видимой истории — 4 часа. Этого достаточно, чтобы mock-ветер успел
 * заметно повернуть, а визуальное сжатие переноса помещает след в масштаб карты.
 * Частицы старше окна не рисуются, но гаснут плавно задолго до его конца.
 */
export const PLUME_HISTORY_MINUTES = 240;

const RELEASE_INTERVAL_MINUTES = 5;
const PARTICLES_PER_RELEASE = 10;
const INTEGRATION_STEP_SECONDS = 300;
const PATH_SAMPLE_MINUTES = 12;
/** Короткий хвост из реальных позиций частицы — заполняет облако без линий. */
export const WAKE_FRACTIONS = [0.68, 0.8, 0.92, 1] as const;
const RELEASE_RADIUS_METERS = 22;

/**
 * В mock-ветре направление меняется всего на несколько градусов за час.
 * Усиливаем реальное отклонение от направления выбранного часа, но делаем это
 * в непрерывном развёрнутом угле, чтобы не терять накопленные повороты.
 * Мягкое насыщение не даёт факелу закрутиться в петлю.
 */
const HISTORICAL_WIND_GAIN = 2.6;
const MAX_HISTORICAL_TURN = 120;

/**
 * Визуальное сжатие переноса: четырёхчасовой след должен уместиться в масштаб карты,
 * иначе изгиб истории оказывается за нижней границей экрана.
 */
const TRANSPORT_SCALE = 0.23;

/** Скорость крупных вихрей, м/с: чем неустойчивее атмосфера, тем сильнее болтанка. */
const TURBULENCE_SPEED: Record<StabilityClass, number> = {
  A: 0.3,
  B: 0.26,
  C: 0.21,
  D: 0.15,
  E: 0.1,
  F: 0.06,
};

/**
 * Поперечная турбулентная дисперсия, метров на корень из минуты.
 * Растёт с временем жизни частицы: у источника след узкий, дальше — расплывается.
 */
const CROSSWIND_WALK_METERS: Record<StabilityClass, number> = {
  A: 80,
  B: 70,
  C: 60,
  D: 50,
  E: 36,
  F: 24,
};

/** Продольная доля того же случайного блуждания — меньше, чтобы не рвать длину следа. */
const ALONG_WIND_WALK_FACTOR = 0.3;

/** Индивидуальный боковой снос частицы, м/с: разводит траектории вширь. */
const DRIFT_SPEED: Record<StabilityClass, number> = {
  A: 0.06,
  B: 0.052,
  C: 0.042,
  D: 0.032,
  E: 0.02,
  F: 0.012,
};

export interface WindVector {
  /** Составляющая скорости переноса на восток, м/с. */
  east: number;
  /** Составляющая скорости переноса на север, м/с. */
  north: number;
  stability: StabilityClass;
}

export interface PlumeParticle {
  /** Стабильный ID: источник + время выброса + индекс частицы. */
  id: string;
  sourceId: string;
  /** Положение частицы на выбранный час. */
  position: LatLng;
  /** История нужна для диагностики и тестов; в отрисовке используются position и wake. */
  path: LatLng[];
  /** Несколько последних реальных позиций — мягкий шлейф позади частицы. */
  wake: LatLng[];
  ageMinutes: number;
  /** Относительная мощность источника с учётом индивидуальной плотности частицы. */
  weight: number;
}

/** Частица облака после интерполяции между двумя часовыми снимками. */
export interface CloudParticle {
  id: string;
  sourceId: string;
  position: LatLng;
  wake: LatLng[];
  ageMinutes: number;
  weight: number;
  /** 1 — частица была в обоих снимках; меньше — появляется или исчезает. */
  opacity: number;
}

function lerpLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

/**
 * Сопоставляет частицы двух часовых снимков по стабильному ID и интерполирует
 * положение/возраст/wake. Новые частицы проявляются, старые плавно исчезают.
 * Возвращается одно облако, а не два наложенных набора следов.
 */
export function interpolatePlumeParticles(
  from: PlumeParticle[],
  to: PlumeParticle[],
  progress: number,
): CloudParticle[] {
  const t = Math.max(0, Math.min(1, progress));
  const fromById = new Map(from.map((particle) => [particle.id, particle]));
  const toIds = new Set(to.map((particle) => particle.id));
  const cloud: CloudParticle[] = [];

  for (const target of to) {
    const previous = fromById.get(target.id);
    if (previous) {
      const wakeCount = Math.max(previous.wake.length, target.wake.length, 1);
      cloud.push({
        id: target.id,
        sourceId: target.sourceId,
        position: lerpLatLng(previous.position, target.position, t),
        wake: Array.from({ length: wakeCount }, (_, index) =>
          lerpLatLng(
            previous.wake[index] ?? previous.position,
            target.wake[index] ?? target.position,
            t,
          ),
        ),
        ageMinutes: previous.ageMinutes + (target.ageMinutes - previous.ageMinutes) * t,
        weight: previous.weight + (target.weight - previous.weight) * t,
        opacity: 1,
      });
      continue;
    }

    const origin = target.path[0] ?? target.position;
    const wakeCount = Math.max(target.wake.length, 1);
    cloud.push({
      id: target.id,
      sourceId: target.sourceId,
      position: lerpLatLng(origin, target.position, t),
      wake: Array.from({ length: wakeCount }, (_, index) =>
        lerpLatLng(origin, target.wake[index] ?? target.position, t),
      ),
      ageMinutes: target.ageMinutes * t,
      weight: target.weight,
      opacity: t,
    });
  }

  for (const previous of from) {
    if (toIds.has(previous.id)) continue;
    cloud.push({
      id: previous.id,
      sourceId: previous.sourceId,
      position: previous.position,
      wake: previous.wake,
      ageMinutes: previous.ageMinutes,
      weight: previous.weight,
      opacity: 1 - t,
    });
  }

  return cloud;
}

export interface PlumeSimulationOptions {
  historyMinutes?: number;
  releaseIntervalMinutes?: number;
  particlesPerRelease?: number;
  stepSeconds?: number;
  sampleMinutes?: number;
}

/**
 * Плавное «выцветание» старых частиц. Начинается после 45% окна истории
 * и достигает нуля ровно к его концу, поэтому хвост не обрывается ступенькой.
 */
export function plumeRetention(ageMinutes: number): number {
  if (!Number.isFinite(ageMinutes) || ageMinutes <= 0) return 1;
  const ratio = Math.min(1, ageMinutes / PLUME_HISTORY_MINUTES);
  const t = Math.max(0, Math.min(1, (ratio - 0.45) / 0.55));
  const smooth = t * t * (3 - 2 * t);
  return 1 - smooth;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(random: () => number): number {
  const first = Math.max(Number.EPSILON, random());
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let hash = seed ^ Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 1440662683);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967295;
}

function smoothNoise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const sz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz, seed);
  const n100 = hash3(ix + 1, iy, iz, seed);
  const n010 = hash3(ix, iy + 1, iz, seed);
  const n110 = hash3(ix + 1, iy + 1, iz, seed);
  const n001 = hash3(ix, iy, iz + 1, seed);
  const n101 = hash3(ix + 1, iy, iz + 1, seed);
  const n011 = hash3(ix, iy + 1, iz + 1, seed);
  const n111 = hash3(ix + 1, iy + 1, iz + 1, seed);

  const x00 = n000 + (n100 - n000) * sx;
  const x10 = n010 + (n110 - n010) * sx;
  const x01 = n001 + (n101 - n001) * sx;
  const x11 = n011 + (n111 - n011) * sx;
  const y0 = x00 + (x10 - x00) * sy;
  const y1 = x01 + (x11 - x01) * sy;
  return y0 + (y1 - y0) * sz;
}

/**
 * Связное турбулентное поле: соседние частицы увлекаются одними и теми же вихрями,
 * поэтому шлейф выглядит как цельная струя, а не как набор независимых точек.
 */
function turbulenceAt(
  eastKm: number,
  northKm: number,
  minutesFromTarget: number,
  stability: StabilityClass,
  seed: number,
): { east: number; north: number } {
  const strength = TURBULENCE_SPEED[stability];
  const time = minutesFromTarget * 0.045;

  const largeEast = smoothNoise3(eastKm / 1.6, northKm / 1.6, time, seed) - 0.5;
  const largeNorth = smoothNoise3(eastKm / 1.6 + 19.7, northKm / 1.6 - 8.3, time, seed + 41) - 0.5;
  const smallEast =
    smoothNoise3(eastKm / 0.48 + 7.1, northKm / 0.48 - 3.4, time * 2.4, seed + 83) - 0.5;
  const smallNorth =
    smoothNoise3(eastKm / 0.48 - 5.7, northKm / 0.48 + 11.2, time * 2.4, seed + 127) - 0.5;

  return {
    east: strength * (largeEast * 2.1 + smallEast * 0.8),
    north: strength * (largeNorth * 2.1 + smallNorth * 0.8),
  };
}

function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/**
 * Разворачивает метеорологические направления «откуда дует» в непрерывную
 * последовательность. Каждый следующий час продолжает предыдущий по кратчайшему
 * шагу, поэтому 359°→1° — это +2°, а несколько накопленных оборотов не теряются.
 */
export function unwrapWindDirections(directions: number[]): number[] {
  const first = directions[0];
  if (first === undefined) return [];

  const unwrapped = [normalizeDegrees(first)];
  for (let index = 1; index < directions.length; index += 1) {
    const previous = unwrapped[index - 1] ?? 0;
    const raw = normalizeDegrees(directions[index] ?? 0);
    let step = raw - normalizeDegrees(previous);
    if (step > 180) step -= 360;
    if (step < -180) step += 360;
    unwrapped.push(previous + step);
  }
  return unwrapped;
}

interface WindTimeline {
  times: number[];
  directions: number[];
  speeds: number[];
  stabilities: StabilityClass[];
}

interface WindSample {
  /** Непрерывное метеорологическое направление «откуда дует», градусы. */
  direction: number;
  speed: number;
  stability: StabilityClass;
}

function buildWindTimeline(hours: HourlyCalc[]): WindTimeline {
  return {
    times: hours.map((hour) => Date.parse(hour.time)),
    directions: unwrapWindDirections(hours.map((hour) => hour.wind.windDirection)),
    speeds: hours.map((hour) => hour.wind.windSpeed),
    stabilities: hours.map((hour) => hour.wind.stability),
  };
}

function windAt(timeline: WindTimeline, time: number): WindSample {
  const count = timeline.directions.length;
  if (count === 0) return { direction: 0, speed: 0, stability: 'D' };

  const firstTime = timeline.times[0] ?? Number.NaN;
  const lastTime = timeline.times[count - 1] ?? Number.NaN;
  if (!Number.isFinite(firstTime) || time <= firstTime) {
    return {
      direction: timeline.directions[0] ?? 0,
      speed: timeline.speeds[0] ?? 0,
      stability: timeline.stabilities[0] ?? 'D',
    };
  }
  if (!Number.isFinite(lastTime) || time >= lastTime) {
    return {
      direction: timeline.directions[count - 1] ?? 0,
      speed: timeline.speeds[count - 1] ?? 0,
      stability: timeline.stabilities[count - 1] ?? 'D',
    };
  }

  let low = 0;
  let high = count - 1;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if ((timeline.times[middle] ?? Number.POSITIVE_INFINITY) <= time) low = middle;
    else high = middle;
  }

  const leftTime = timeline.times[low] ?? time;
  const rightTime = timeline.times[low + 1] ?? time;
  const ratio = rightTime > leftTime ? (time - leftTime) / (rightTime - leftTime) : 0;
  const leftDirection = timeline.directions[low] ?? 0;
  const rightDirection = timeline.directions[low + 1] ?? leftDirection;
  const leftSpeed = timeline.speeds[low] ?? 0;
  const rightSpeed = timeline.speeds[low + 1] ?? leftSpeed;

  return {
    direction: leftDirection + (rightDirection - leftDirection) * ratio,
    speed: leftSpeed + (rightSpeed - leftSpeed) * ratio,
    stability:
      ratio < 0.5 ? (timeline.stabilities[low] ?? 'D') : (timeline.stabilities[low + 1] ?? 'D'),
  };
}

function directionToVector(
  direction: number,
  speed: number,
  stability: StabilityClass,
): WindVector {
  const bearing = (direction + 180) * DEG;
  return {
    east: Math.sin(bearing) * speed,
    north: Math.cos(bearing) * speed,
    stability,
  };
}

function visualWindAt(
  timeline: WindTimeline,
  time: number,
  referenceDirection: number,
): WindVector {
  const sample = windAt(timeline, time);
  const delta = sample.direction - referenceDirection;
  const amplified =
    MAX_HISTORICAL_TURN * Math.tanh((delta * HISTORICAL_WIND_GAIN) / MAX_HISTORICAL_TURN);
  return directionToVector(referenceDirection + amplified, sample.speed, sample.stability);
}

/** Интерполирует часовой ветер в произвольный момент времени. */
export function interpolateWind(hours: HourlyCalc[], time: number): WindVector {
  const timeline = buildWindTimeline(hours);
  const sample = windAt(timeline, time);
  return directionToVector(sample.direction, sample.speed, sample.stability);
}

function toLatLng(position: LatLng, east: number, north: number): LatLng {
  const metersPerDegLng = EARTH_METERS_PER_DEG_LAT * Math.max(0.2, Math.cos(position.lat * DEG));
  return {
    lat: position.lat + north / EARTH_METERS_PER_DEG_LAT,
    lng: position.lng + east / metersPerDegLng,
  };
}

function samplePath(path: LatLng[], fraction: number): LatLng {
  if (path.length <= 1) return path[0] ?? { lat: 0, lng: 0 };
  const position = Math.max(0, Math.min(1, fraction)) * (path.length - 1);
  const leftIndex = Math.floor(position);
  const rightIndex = Math.min(path.length - 1, leftIndex + 1);
  const local = position - leftIndex;
  const left = path[leftIndex] ?? path[0];
  const right = path[rightIndex] ?? left;
  return left && right ? lerpLatLng(left, right, local) : { lat: 0, lng: 0 };
}

/**
 * Детерминированная визуальная симуляция шлейфа за несколько часов до выбранного момента.
 * Частицы выпускаются сериями, переносятся интерполированным ветром, связной турбулентностью
 * и небольшим случайным блужданием. Один и тот же час всегда даёт один и тот же набор следов.
 */
export function simulatePlumeParticles(
  source: EmissionSource,
  hours: HourlyCalc[],
  hourIndex: number,
  pollutant: PollutantId,
  maxEmission: number,
  options: PlumeSimulationOptions = {},
): PlumeParticle[] {
  const selected = hours[hourIndex];
  if (!selected || hours.length === 0) return [];

  const targetTime = Date.parse(selected.time);
  if (!Number.isFinite(targetTime)) return [];

  const emissionKey = pollutant === 'AQI' ? 'PM2.5' : pollutant;
  const emission = source.emissions[emissionKey];
  if (emission <= 0 || maxEmission <= 0) return [];

  const historyMinutes = options.historyMinutes ?? PLUME_HISTORY_MINUTES;
  const releaseIntervalMinutes = options.releaseIntervalMinutes ?? RELEASE_INTERVAL_MINUTES;
  const particlesPerRelease = options.particlesPerRelease ?? PARTICLES_PER_RELEASE;
  const stepSeconds = options.stepSeconds ?? INTEGRATION_STEP_SECONDS;
  const sampleMinutes = options.sampleMinutes ?? PATH_SAMPLE_MINUTES;
  if (historyMinutes <= 0 || particlesPerRelease <= 0 || stepSeconds <= 0) return [];

  const timeline = buildWindTimeline(hours);
  const sourceSeed = hashSeed(source.id);
  const referenceDirection = windAt(timeline, targetTime).direction;
  const baseWeight = Math.sqrt(Math.min(1, emission / maxEmission));
  const particles: PlumeParticle[] = [];
  const releaseStep = Math.max(1, releaseIntervalMinutes) * 60_000;
  const sampleStep = Math.max(1, sampleMinutes) * 60_000;
  const startTime = targetTime - historyMinutes * 60_000;

  for (let releaseTime = startTime; releaseTime < targetTime; releaseTime += releaseStep) {
    const ageMinutes = (targetTime - releaseTime) / 60_000;

    for (let particleIndex = 0; particleIndex < particlesPerRelease; particleIndex += 1) {
      const particleId = `${source.id}|${releaseTime}|${particleIndex}`;
      const random = randomGenerator(hashSeed(particleId));
      const start = toLatLng(
        source.position,
        gaussianRandom(random) * RELEASE_RADIUS_METERS,
        gaussianRandom(random) * RELEASE_RADIUS_METERS,
      );
      const driftSpeed = DRIFT_SPEED[selected.wind.stability];
      const driftEast = gaussianRandom(random) * driftSpeed;
      const driftNorth = gaussianRandom(random) * driftSpeed;
      const path: LatLng[] = [start];
      let position = start;
      let time = releaseTime;
      let nextSample = releaseTime + sampleStep;

      while (time < targetTime) {
        const seconds = Math.min(stepSeconds, (targetTime - time) / 1000);
        const wind = visualWindAt(timeline, time + (seconds * 1000) / 2, referenceDirection);
        const metersPerDegLng =
          EARTH_METERS_PER_DEG_LAT * Math.max(0.2, Math.cos(position.lat * DEG));
        const eastKm = ((position.lng - source.position.lng) * metersPerDegLng) / 1000;
        const northKm = ((position.lat - source.position.lat) * EARTH_METERS_PER_DEG_LAT) / 1000;
        const turbulence = turbulenceAt(
          eastKm,
          northKm,
          (time - targetTime) / 60_000,
          wind.stability,
          sourceSeed,
        );
        const windSpeed = Math.hypot(wind.east, wind.north);
        const motionEast = windSpeed > 0.001 ? wind.east / windSpeed : 0;
        const motionNorth = windSpeed > 0.001 ? wind.north / windSpeed : 0;
        const crossEast = motionNorth;
        const crossNorth = -motionEast;
        const walk = CROSSWIND_WALK_METERS[wind.stability] * Math.sqrt(seconds / 60);
        const lateralWalk = gaussianRandom(random) * walk;
        const alongWalk = gaussianRandom(random) * walk * ALONG_WIND_WALK_FACTOR;

        // Средний перенос сжимается визуально, а поперечная дисперсия остаётся
        // в метрах карты, поэтому шлейф расширяется вниз по потоку.
        const east =
          (wind.east + turbulence.east + driftEast) * seconds * TRANSPORT_SCALE +
          crossEast * lateralWalk +
          motionEast * alongWalk;
        const north =
          (wind.north + turbulence.north + driftNorth) * seconds * TRANSPORT_SCALE +
          crossNorth * lateralWalk +
          motionNorth * alongWalk;

        position = toLatLng(position, east, north);
        time += seconds * 1000;

        if (time >= nextSample || time >= targetTime) {
          path.push(position);
          while (nextSample <= time) nextSample += sampleStep;
        }
      }

      particles.push({
        id: particleId,
        sourceId: source.id,
        position,
        path,
        wake: WAKE_FRACTIONS.map((fraction) => samplePath(path, fraction)),
        ageMinutes,
        weight: Math.min(1.35, baseWeight * (0.7 + random() * 0.6)),
      });
    }
  }

  return particles;
}

/** Строит воспроизводимое состояние шлейфов всех источников для выбранного часа. */
export function buildPlumeParticles(
  sources: EmissionSource[],
  hours: HourlyCalc[],
  hourIndex: number,
  pollutant: PollutantId,
): PlumeParticle[] {
  const emissionKey = pollutant === 'AQI' ? 'PM2.5' : pollutant;
  const maxEmission = Math.max(0, ...sources.map((source) => source.emissions[emissionKey]));
  if (maxEmission <= 0) return [];

  return sources.flatMap((source) =>
    simulatePlumeParticles(source, hours, hourIndex, pollutant, maxEmission),
  );
}
