import { describe, expect, it } from 'vitest';
import type { EmissionSource, HourlyCalc, LatLng, WindHour } from '../types';
import {
  buildPlumeParticles,
  interpolatePlumeParticles,
  interpolateWind,
  plumeRetention,
  simulatePlumeParticles,
  unwrapWindDirections,
  type PlumeParticle,
} from './particlePlume';

function bearing(from: LatLng, to: LatLng): number {
  const metersPerDegLng = 111_320 * Math.cos((from.lat * Math.PI) / 180);
  const east = (to.lng - from.lng) * metersPerDegLng;
  const north = (to.lat - from.lat) * 111_320;
  return (Math.atan2(east, north) * 180) / Math.PI;
}

function angleDifference(first: number, second: number): number {
  let difference = second - first;
  while (difference > 180) difference -= 360;
  while (difference < -180) difference += 360;
  return difference;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

const source: EmissionSource = {
  id: 's1',
  name: 'Тестовая ТЭЦ',
  position: { lat: 52.37, lng: 76.98 },
  stackHeight: 150,
  stackDiameter: 6,
  exitVelocity: 12,
  temperature: 140,
  emissions: { CO: 100, NO2: 30, SO2: 40, O3: 5, 'PM2.5': 20, PM10: 30 },
};

function windAt(time: string, windDirection: number, windSpeed = 4): WindHour {
  return {
    time,
    windSpeed,
    windDirection,
    temperature: 0,
    stability: 'D',
  };
}

function hour(time: string, wind: WindHour): HourlyCalc {
  return { time, wind, readings: [] };
}

function makeParticle(
  id: string,
  position: LatLng,
  ageMinutes: number,
  origin: LatLng = position,
): PlumeParticle {
  return {
    id,
    sourceId: 's1',
    position,
    path: [origin, position],
    wake: [origin, position],
    ageMinutes,
    weight: 1,
  };
}

const hours: HourlyCalc[] = [
  hour('2026-10-31T12:00:00.000Z', windAt('2026-10-31T12:00:00.000Z', 0)),
  hour('2026-10-31T13:00:00.000Z', windAt('2026-10-31T13:00:00.000Z', 90)),
  hour('2026-10-31T14:00:00.000Z', windAt('2026-10-31T14:00:00.000Z', 180)),
  hour('2026-10-31T15:00:00.000Z', windAt('2026-10-31T15:00:00.000Z', 270)),
];

const smallOptions = {
  historyMinutes: 60,
  releaseIntervalMinutes: 10,
  particlesPerRelease: 3,
  stepSeconds: 180,
  sampleMinutes: 15,
};

describe('interpolateWind', () => {
  it('interpolates direction through the shortest arc', () => {
    const first = hour('2026-10-31T12:00:00.000Z', windAt('2026-10-31T12:00:00.000Z', 350));
    const second = hour('2026-10-31T13:00:00.000Z', windAt('2026-10-31T13:00:00.000Z', 10));
    const wind = interpolateWind([first, second], Date.parse('2026-10-31T12:30:00.000Z'));

    expect(wind.east).toBeCloseTo(0, 6);
    expect(wind.north).toBeCloseTo(-4, 6);
  });

  it('clamps to the first and last hour outside the range', () => {
    const before = interpolateWind(hours, Date.parse('2026-10-31T08:00:00.000Z'));
    const after = interpolateWind(hours, Date.parse('2026-10-31T20:00:00.000Z'));

    expect(before.north).toBeCloseTo(-4, 6);
    expect(after.east).toBeCloseTo(4, 6);
  });
});

describe('chronological wind directions', () => {
  it('turns across 0/360 by the shortest step', () => {
    expect(unwrapWindDirections([359, 1, 20])).toEqual([359, 361, 380]);
  });

  it('keeps cumulative rotation across repeated wrap crossings', () => {
    const unwrapped = unwrapWindDirections([300, 345, 30, 75, 120, 165, 210, 255]);

    expect(unwrapped).toEqual([300, 345, 390, 435, 480, 525, 570, 615]);
    expect(unwrapped.at(-1) ?? 0).toBeGreaterThan(540);
  });

  it('retains chronology when a particle follows a multi-hour turn', () => {
    const turningHours = [300, 345, 30, 75, 120, 165, 210, 255].map((direction, index) => {
      const time = new Date(Date.UTC(2026, 9, 31, 12 + index)).toISOString();
      return hour(time, windAt(time, direction, 4.5));
    });
    const options = {
      historyMinutes: 420,
      releaseIntervalMinutes: 420,
      particlesPerRelease: 1,
      stepSeconds: 240,
      sampleMinutes: 30,
    };

    const turning = simulatePlumeParticles(source, turningHours, 7, 'PM2.5', 20, options);
    const straightHours = turningHours.map((item) => hour(item.time, windAt(item.time, 255, 4.5)));
    const straight = simulatePlumeParticles(source, straightHours, 7, 'PM2.5', 20, options);

    const path = turning[0]?.path ?? [];
    const quarter = Math.floor(path.length / 4);
    const startBearing = bearing(path[0] ?? source.position, path[quarter] ?? source.position);
    const endBearing = bearing(
      path.at(-quarter - 1) ?? source.position,
      path.at(-1) ?? source.position,
    );

    expect(path.length).toBeGreaterThan(8);
    expect(Math.abs(angleDifference(startBearing, endBearing))).toBeGreaterThan(30);
    expect(turning[0]?.path.at(-1)).not.toEqual(straight[0]?.path.at(-1));
  });

  it('increases transverse particle spread along the path', () => {
    const steadyHours = [0, 1, 2, 3, 4].map((index) => {
      const time = new Date(Date.UTC(2026, 9, 31, 12 + index)).toISOString();
      return hour(time, windAt(time, 0, 4.5));
    });
    const particles = simulatePlumeParticles(source, steadyHours, 4, 'PM2.5', 20, {
      historyMinutes: 240,
      releaseIntervalMinutes: 240,
      particlesPerRelease: 80,
      stepSeconds: 240,
      sampleMinutes: 12,
    });
    const metersPerDegLng = 111_320 * Math.cos((source.position.lat * Math.PI) / 180);
    const earlyOffsets: number[] = [];
    const lateOffsets: number[] = [];

    for (const particle of particles) {
      const early = particle.path[Math.floor((particle.path.length - 1) * 0.2)];
      const late = particle.path[Math.floor((particle.path.length - 1) * 0.8)];
      if (!early || !late) continue;
      earlyOffsets.push((early.lng - source.position.lng) * metersPerDegLng);
      lateOffsets.push((late.lng - source.position.lng) * metersPerDegLng);
    }

    expect(particles).toHaveLength(80);
    expect(lateOffsets.length).toBeGreaterThan(0);
    expect(standardDeviation(lateOffsets)).toBeGreaterThan(standardDeviation(earlyOffsets) * 1.5);
  });
});

describe('particle retention', () => {
  it('fades old particles smoothly to zero at the end of the history window', () => {
    expect(plumeRetention(0)).toBe(1);
    expect(plumeRetention(120)).toBeGreaterThan(0.9);
    expect(plumeRetention(210)).toBeLessThan(0.4);
    expect(plumeRetention(240)).toBe(0);

    expect(plumeRetention(180)).toBeGreaterThan(plumeRetention(210));
    expect(plumeRetention(210)).toBeGreaterThan(plumeRetention(235));
  });
});

describe('particle snapshot interpolation', () => {
  it('matches stable IDs and renders one cloud instead of two full sets', () => {
    const from = [
      makeParticle('a', { lat: 52.3, lng: 76.9 }, 100),
      makeParticle('b', { lat: 52.31, lng: 76.91 }, 60),
    ];
    const to = [
      makeParticle('b', { lat: 52.29, lng: 76.93 }, 120),
      makeParticle('c', { lat: 52.28, lng: 76.94 }, 10, { lat: 52.3, lng: 76.9 }),
    ];

    const cloud = interpolatePlumeParticles(from, to, 0.5);

    expect(cloud).toHaveLength(3);
    const matched = cloud.find((particle) => particle.id === 'b');
    expect(matched?.position.lat).toBeCloseTo(52.3, 6);
    expect(matched?.position.lng).toBeCloseTo(76.92, 6);
    expect(matched?.ageMinutes).toBeCloseTo(90, 6);
    expect(matched?.opacity).toBe(1);

    expect(cloud.find((particle) => particle.id === 'a')?.opacity).toBeCloseTo(0.5, 6);
    const newborn = cloud.find((particle) => particle.id === 'c');
    expect(newborn?.opacity).toBeCloseTo(0.5, 6);
    expect(newborn?.position.lat).toBeCloseTo(52.29, 6);
    expect(newborn?.position.lng).toBeCloseTo(76.92, 6);
  });

  it('moves a matched particle continuously across the transition', () => {
    const from = [makeParticle('b', { lat: 0, lng: 0 }, 60)];
    const to = [makeParticle('b', { lat: 10, lng: 20 }, 120)];

    const start = interpolatePlumeParticles(from, to, 0)[0];
    const middle = interpolatePlumeParticles(from, to, 0.5)[0];
    const end = interpolatePlumeParticles(from, to, 1)[0];

    expect(start?.position).toEqual({ lat: 0, lng: 0 });
    expect(middle?.position).toEqual({ lat: 5, lng: 10 });
    expect(end?.position).toEqual({ lat: 10, lng: 20 });
  });

  it('assigns unique deterministic IDs to simulated particles', () => {
    const first = buildPlumeParticles([source], hours, 1, 'PM2.5');
    const second = buildPlumeParticles([source], hours, 1, 'PM2.5');
    const ids = first.map((particle) => particle.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(second.map((particle) => particle.id)).toEqual(ids);
    expect(ids[0]).toContain(`${source.id}|`);
  });
});

describe('plume particle simulation', () => {
  it('is deterministic for the same hour and pollutant', () => {
    const first = buildPlumeParticles([source], hours, 1, 'PM2.5');
    const second = buildPlumeParticles([source], hours, 1, 'PM2.5');

    expect(first.length).toBeGreaterThan(0);
    expect(second).toEqual(first);
  });

  it('carries every trail downwind and keeps its source in the history', () => {
    const northWindHours = hours.map((item) => hour(item.time, windAt(item.time, 0, 4)));
    const particles = simulatePlumeParticles(source, northWindHours, 2, 'PM2.5', 20, smallOptions);

    expect(particles.length).toBeGreaterThan(0);
    for (const particle of particles) {
      const start = particle.path[0];
      const end = particle.path.at(-1);
      expect(start).toBeDefined();
      expect(end).toBeDefined();
      expect(Math.abs((start?.lat ?? 0) - source.position.lat)).toBeLessThan(0.001);
      expect(Math.abs((start?.lng ?? 0) - source.position.lng)).toBeLessThan(0.001);
      expect(end?.lat ?? 0).toBeLessThan(source.position.lat);
    }
  });

  it('changes the plume when the selected hour changes', () => {
    const first = buildPlumeParticles([source], hours, 1, 'PM2.5');
    const second = buildPlumeParticles([source], hours, 2, 'PM2.5');
    const firstEnd = first[0]?.path.at(-1);
    const secondEnd = second[0]?.path.at(-1);

    expect(firstEnd).toBeDefined();
    expect(secondEnd).toBeDefined();
    expect(secondEnd).not.toEqual(firstEnd);
  });

  it('returns no particles for a pollutant with no emission', () => {
    const clean = { ...source, emissions: { ...source.emissions, 'PM2.5': 0 } };
    expect(buildPlumeParticles([clean], hours, 1, 'PM2.5')).toEqual([]);
    expect(buildPlumeParticles([clean], hours, 1, 'AQI')).toEqual([]);
  });

  it('uses PM2.5 as the emission source for AQI', () => {
    const particles = simulatePlumeParticles(source, hours, 1, 'AQI', 20, smallOptions);
    expect(particles.length).toBeGreaterThan(0);
    expect(particles[0]?.weight).toBeGreaterThan(0);
  });

  it('bends a long trail when the historical wind direction turns', () => {
    const turningHours = [0, 1, 2, 3, 4].map((index) => {
      const time = new Date(Date.UTC(2026, 9, 31, 12 + index)).toISOString();
      return hour(time, windAt(time, 340 + index * 10, 4.5));
    });
    const options = {
      historyMinutes: 240,
      releaseIntervalMinutes: 240,
      particlesPerRelease: 1,
      stepSeconds: 240,
      sampleMinutes: 24,
    };

    const turning = simulatePlumeParticles(source, turningHours, 4, 'PM2.5', 20, options);
    const straightHours = turningHours.map((item) => hour(item.time, windAt(item.time, 20, 4.5)));
    const straight = simulatePlumeParticles(source, straightHours, 4, 'PM2.5', 20, options);

    const path = turning[0]?.path ?? [];
    const midpoint = Math.floor(path.length / 2);
    const startBearing = bearing(path[0] ?? source.position, path[midpoint] ?? source.position);
    const endBearing = bearing(path[midpoint] ?? source.position, path.at(-1) ?? source.position);

    expect(path.length).toBeGreaterThan(6);
    expect(Math.abs(angleDifference(startBearing, endBearing))).toBeGreaterThan(15);
    expect(turning[0]?.path.at(-1)).not.toEqual(straight[0]?.path.at(-1));
  });
});
