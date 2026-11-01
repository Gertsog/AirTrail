import { describe, expect, it } from 'vitest';
import {
  aqiFromPm25,
  displayValueFromConcentration,
  formatValue,
  POLLUTANTS,
  POLLUTANT_ORDER,
  plumeColor,
  valueColor,
  windDirectionLabel,
} from './pollutants';

describe('pollutant configuration', () => {
  it('has a config for every pollutant in order', () => {
    for (const id of POLLUTANT_ORDER) {
      expect(POLLUTANTS[id].id).toBe(id);
    }
  });

  it('has exactly one more threshold than color bands', () => {
    for (const id of POLLUTANT_ORDER) {
      expect(POLLUTANTS[id].colors).toHaveLength(POLLUTANTS[id].thresholds.length - 1);
    }
  });

  it('keeps the six EPA AQI categories', () => {
    expect(POLLUTANTS.AQI.colors).toHaveLength(6);
    expect(POLLUTANTS.AQI.thresholds).toEqual([0, 50, 100, 150, 200, 300, 500]);
  });
});

describe('aqiFromPm25', () => {
  it.each([
    [0, 0],
    [12.1, 50],
    [35.5, 100],
    [55.5, 150],
    [150.5, 200],
    [250.5, 300],
    [350.5, 400],
    [500.5, 500],
    [900, 500],
  ])('maps %s µg/m³ to AQI %s', (pm25, expected) => {
    expect(aqiFromPm25(pm25)).toBe(expected);
  });

  it('never returns a negative AQI', () => {
    expect(aqiFromPm25(-10)).toBe(0);
  });
});

describe('display units', () => {
  it('converts CO from µg/m³ to mg/m³', () => {
    expect(displayValueFromConcentration('CO', 1500)).toBe(1.5);
  });

  it('keeps PM concentrations in µg/m³', () => {
    expect(displayValueFromConcentration('PM2.5', 12.5)).toBe(12.5);
  });

  it('calculates AQI from PM2.5', () => {
    expect(displayValueFromConcentration('AQI', 4)).toBe(17);
  });

  it('formats PM2.5 with one decimal', () => {
    expect(formatValue(POLLUTANTS['PM2.5'], 7.56)).toBe('7,6');
  });
});

describe('colors', () => {
  it('picks the band for a value', () => {
    expect(valueColor(POLLUTANTS['PM2.5'], 0.5)).toBe(POLLUTANTS['PM2.5'].colors[0]);
    expect(valueColor(POLLUTANTS['PM2.5'], 12)).toBe(POLLUTANTS['PM2.5'].colors[1]);
    expect(valueColor(POLLUTANTS['PM2.5'], 1000)).toBe(
      POLLUTANTS['PM2.5'].colors[POLLUTANTS['PM2.5'].colors.length - 1],
    );
  });

  it('does not paint zero or near-zero values', () => {
    expect(plumeColor(POLLUTANTS.AQI, 0)[3]).toBe(0);
    expect(plumeColor(POLLUTANTS['PM2.5'], 0.2)[3]).toBe(0);
  });

  it('paints positive values', () => {
    expect(plumeColor(POLLUTANTS.AQI, 1)[3]).toBeGreaterThan(0);
    expect(plumeColor(POLLUTANTS['PM2.5'], 2)[3]).toBeGreaterThan(0);
  });
});

describe('windDirectionLabel', () => {
  it.each([
    [0, 'С'],
    [45, 'СВ'],
    [90, 'В'],
    [180, 'Ю'],
    [270, 'З'],
    [359, 'С'],
  ])('labels %s° as %s', (degrees, expected) => {
    expect(windDirectionLabel(degrees)).toBe(expected);
  });
});
