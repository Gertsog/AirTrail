import { describe, expect, it } from 'vitest';
import type { EmissionSource, WindHour } from '../types';
import { concentrationAtPoint, effectiveHeight, sigmaY, sigmaZ } from './dispersion';

const source: EmissionSource = {
  id: 's1',
  name: 'Тестовая ТЭЦ',
  position: { lat: 52.37, lng: 76.98 },
  stackHeight: 150,
  stackDiameter: 6,
  exitVelocity: 12,
  temperature: 140,
  emissions: {
    CO: 100,
    NO2: 30,
    SO2: 40,
    O3: 5,
    'PM2.5': 20,
    PM10: 30,
  },
};

const northWind: WindHour = {
  time: new Date(2026, 9, 31, 12).toISOString(),
  windSpeed: 4,
  windDirection: 0,
  temperature: 0,
  stability: 'D',
};

const south = { lat: 52.32, lng: 76.98 };
const north = { lat: 52.42, lng: 76.98 };

describe('dispersion geometry', () => {
  it('grows with distance', () => {
    expect(sigmaY(2000, 'D')).toBeGreaterThan(sigmaY(1000, 'D'));
    expect(sigmaZ(2000, 'D')).toBeGreaterThan(sigmaZ(1000, 'D'));
  });

  it('clamps effective stack height', () => {
    expect(effectiveHeight({ ...source, stackHeight: 10 })).toBe(12);
    expect(effectiveHeight({ ...source, stackHeight: 400 })).toBe(60);
  });

  it('puts more pollution downwind than upwind', () => {
    const downwind = concentrationAtPoint(source, south, northWind, 'PM2.5');
    const upwind = concentrationAtPoint(source, north, northWind, 'PM2.5');
    expect(downwind).toBeGreaterThan(upwind);
    expect(downwind).toBeGreaterThan(0);
  });

  it('returns zero for a zero-emission source', () => {
    const clean = {
      ...source,
      emissions: { ...source.emissions, 'PM2.5': 0 },
    };
    expect(concentrationAtPoint(clean, south, northWind, 'PM2.5')).toBe(0);
  });

  it('derives AQI from the PM2.5 emission', () => {
    expect(concentrationAtPoint(source, south, northWind, 'AQI')).toBeGreaterThan(0);
  });
});
