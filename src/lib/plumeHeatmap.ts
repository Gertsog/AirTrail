import type { PollutantConfig } from './pollutants';
import { scaleColor } from './colors';
import { clamp } from './math';

/** Радиус размытия плотности в пикселях низкого разрешения. */
export const DENSITY_BLUR_RADIUS = 4;

/**
 * Радиус мягкого ядра частицы в CSS-пикселях. Растёт с возрастом/расстоянием
 * вниз по потоку, но остаётся умеренным: облако расширяется, а не превращается
 * в широкую полосу.
 */
export function plumeKernelRadius(ageRatio: number, weight: number): number {
  const age = clamp(ageRatio, 0, 1);
  const strength = clamp(weight, 0, 1.45);
  const base = 2.5 + 2 * Math.min(1, strength);
  const spread = 7 + 5 * Math.min(1, strength);
  return base + spread * Math.pow(age, 0.85);
}

/** Частица/ядро для накопления плотности в координатах низкого разрешения. */
export interface DensityKernel {
  x: number;
  y: number;
  radius: number;
  weight: number;
  opacity: number;
}

/**
 * Добавляет в поле плотности мягкие гауссовы ядра частиц.
 * Никаких линий и отдельных точек: только непрерывное облако плотности.
 */
export function splatParticleDensity(
  density: Float32Array,
  width: number,
  height: number,
  kernels: DensityKernel[],
): void {
  for (const kernel of kernels) {
    if (kernel.radius <= 0 || kernel.weight <= 0 || kernel.opacity <= 0) continue;
    if (!Number.isFinite(kernel.x) || !Number.isFinite(kernel.y)) continue;

    const sigma = Math.max(0.55, kernel.radius / 2);
    const extent = Math.max(1, Math.ceil(sigma * 2.5));
    const sigmaSquared2 = 2 * sigma * sigma;
    const left = Math.max(0, Math.floor(kernel.x - extent));
    const right = Math.min(width - 1, Math.ceil(kernel.x + extent));
    const top = Math.max(0, Math.floor(kernel.y - extent));
    const bottom = Math.min(height - 1, Math.ceil(kernel.y + extent));
    const amplitude = kernel.weight * kernel.opacity;

    for (let y = top; y <= bottom; y += 1) {
      const dy = y + 0.5 - kernel.y;
      const row = y * width;
      for (let x = left; x <= right; x += 1) {
        const dx = x + 0.5 - kernel.x;
        const gaussian = Math.exp(-(dx * dx + dy * dy) / sigmaSquared2);
        if (gaussian < 0.015) continue;
        density[row + x] = (density[row + x] ?? 0) + gaussian * amplitude;
      }
    }
  }
}

const LUT_SIZE = 96;
const lutCache = new WeakMap<PollutantConfig, Uint8ClampedArray>();

function boxBlurHorizontal(
  source: Float32Array,
  target: Float32Array,
  width: number,
  height: number,
  radius: number,
): void {
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleX = Math.max(0, Math.min(width - 1, x + offset));
        sum += source[row + sampleX] ?? 0;
        count += 1;
      }
      target[row + x] = sum / count;
    }
  }
}

function boxBlurVertical(
  source: Float32Array,
  target: Float32Array,
  width: number,
  height: number,
  radius: number,
): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleY = Math.max(0, Math.min(height - 1, y + offset));
        sum += source[sampleY * width + x] ?? 0;
        count += 1;
      }
      target[y * width + x] = sum / count;
    }
  }
}

/** Двухпроходное размытие плотности: убирает отдельные штрихи и даёт дымчатую пелену. */
export function blurDensity(
  source: Float32Array,
  width: number,
  height: number,
  radius = DENSITY_BLUR_RADIUS,
  target = new Float32Array(source.length),
): Float32Array {
  const safeRadius = Math.max(0, Math.min(8, Math.floor(radius)));
  if (safeRadius === 0 || width <= 0 || height <= 0) {
    target.set(source);
    return target;
  }

  const temp = new Float32Array(source.length);
  boxBlurHorizontal(source, temp, width, height, safeRadius);
  boxBlurVertical(temp, target, width, height, safeRadius);

  // Второй проход сглаживает «ступеньки» низкого разрешения.
  boxBlurHorizontal(target, temp, width, height, safeRadius);
  boxBlurVertical(temp, target, width, height, safeRadius);
  return target;
}

function colorLut(config: PollutantConfig): Uint8ClampedArray {
  const cached = lutCache.get(config);
  if (cached) return cached;

  const lut = new Uint8ClampedArray(LUT_SIZE * 3);
  for (let index = 0; index < LUT_SIZE; index += 1) {
    const [r, g, b] = scaleColor(config, index / (LUT_SIZE - 1));
    lut[index * 3] = r;
    lut[index * 3 + 1] = g;
    lut[index * 3 + 2] = b;
  }
  lutCache.set(config, lut);
  return lut;
}

/**
 * Превращает поле плотности частиц в RGBA-слой тепловой карты.
 * Ядро получает насыщенный цвет палитры, края плавно растворяются.
 */
export function colorizeDensity(
  density: Float32Array,
  config: PollutantConfig,
  target = new Uint8ClampedArray(density.length * 4),
): Uint8ClampedArray {
  let maxDensity = 0;
  for (let index = 0; index < density.length; index += 1) {
    maxDensity = Math.max(maxDensity, density[index] ?? 0);
  }

  if (maxDensity <= 1e-6) {
    target.fill(0);
    return target;
  }

  const lut = colorLut(config);
  for (let index = 0; index < density.length; index += 1) {
    const norm = clamp((density[index] ?? 0) / maxDensity, 0, 1);
    const outputIndex = index * 4;

    if (norm < 0.008) {
      target[outputIndex] = 0;
      target[outputIndex + 1] = 0;
      target[outputIndex + 2] = 0;
      target[outputIndex + 3] = 0;
      continue;
    }

    const colorT = clamp(0.3 + 0.64 * Math.pow(norm, 0.95), 0, 1);
    const lutIndex = Math.min(LUT_SIZE - 1, Math.round(colorT * (LUT_SIZE - 1)));
    const alpha = Math.pow(clamp((norm - 0.006) / 0.994, 0, 1), 0.6);

    target[outputIndex] = lut[lutIndex * 3] ?? 0;
    target[outputIndex + 1] = lut[lutIndex * 3 + 1] ?? 0;
    target[outputIndex + 2] = lut[lutIndex * 3 + 2] ?? 0;
    target[outputIndex + 3] = Math.round(alpha * 235);
  }

  return target;
}
