import { describe, expect, it } from 'vitest';
import {
  blurDensity,
  colorizeDensity,
  plumeKernelRadius,
  splatParticleDensity,
} from './plumeHeatmap';
import { POLLUTANTS } from './pollutants';

describe('plume density processing', () => {
  it('spreads a density impulse into neighbouring pixels', () => {
    const source = new Float32Array(25);
    source[12] = 1;

    const blurred = blurDensity(source, 5, 5, 1);

    expect(blurred[12] ?? 0).toBeLessThan(1);
    expect(blurred[0] ?? 0).toBeGreaterThan(0);
    expect(blurred[12] ?? 0).toBeGreaterThan(blurred[0] ?? 0);
  });

  it('keeps empty density fully transparent', () => {
    const rgba = colorizeDensity(new Float32Array(4), POLLUTANTS['PM2.5']);
    expect(Array.from(rgba)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('renders the core denser and warmer than the edge', () => {
    const density = new Float32Array([0, 0.02, 0.3, 1]);
    const rgba = colorizeDensity(density, POLLUTANTS['PM2.5']);

    const edgeAlpha = rgba[7] ?? 0;
    const middleAlpha = rgba[11] ?? 0;
    const coreAlpha = rgba[15] ?? 0;

    expect(edgeAlpha).toBeGreaterThan(0);
    expect(middleAlpha).toBeGreaterThan(edgeAlpha);
    expect(coreAlpha).toBeGreaterThan(middleAlpha);
    expect(coreAlpha).toBeGreaterThan(200);

    const edge = [rgba[4], rgba[5], rgba[6]];
    const core = [rgba[12], rgba[13], rgba[14]];
    expect(core).not.toEqual(edge);
  });

  it('writes into a supplied buffer without reallocating', () => {
    const target = new Uint8ClampedArray(4 * 2);
    const result = colorizeDensity(new Float32Array([0, 1]), POLLUTANTS.AQI, target);

    expect(result).toBe(target);
    expect(target[7]).toBeGreaterThan(0);
  });

  it('widens the particle kernel gradually with age and clamps inputs', () => {
    const near = plumeKernelRadius(0.05, 0.8);
    const middle = plumeKernelRadius(0.45, 0.8);
    const far = plumeKernelRadius(0.95, 0.8);

    expect(middle).toBeGreaterThan(near);
    expect(far).toBeGreaterThan(middle);
    expect(far).toBeGreaterThan(near * 2);
    expect(far).toBeLessThan(20);
    expect(plumeKernelRadius(-1, 0.8)).toBe(plumeKernelRadius(0, 0.8));
    expect(plumeKernelRadius(2, 0.8)).toBe(plumeKernelRadius(1, 0.8));
    expect(plumeKernelRadius(0.6, 1)).toBeGreaterThan(plumeKernelRadius(0.6, 0.2));
  });

  it('splats larger kernels into a wider, lower peak instead of a dot', () => {
    const small = new Float32Array(25 * 25);
    const large = new Float32Array(25 * 25);
    splatParticleDensity(small, 25, 25, [{ x: 12, y: 12, radius: 1.5, weight: 1, opacity: 1 }]);
    splatParticleDensity(large, 25, 25, [{ x: 12, y: 12, radius: 6, weight: 1, opacity: 1 }]);

    let smallCoverage = 0;
    let largeCoverage = 0;
    for (let index = 0; index < small.length; index += 1) {
      if ((small[index] ?? 0) > 0.01) smallCoverage += 1;
      if ((large[index] ?? 0) > 0.01) largeCoverage += 1;
    }

    expect(largeCoverage).toBeGreaterThan(smallCoverage * 2);
  });
});
