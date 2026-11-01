import { useEffect, useMemo, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { EmissionSource, HourlyCalc, PollutantId } from '../types';
import {
  buildPlumeParticles,
  interpolatePlumeParticles,
  PLUME_HISTORY_MINUTES,
  plumeRetention,
  WAKE_FRACTIONS,
  type CloudParticle,
  type PlumeParticle,
} from '../lib/particlePlume';
import {
  blurDensity,
  colorizeDensity,
  DENSITY_BLUR_RADIUS,
  plumeKernelRadius,
  splatParticleDensity,
  type DensityKernel,
} from '../lib/plumeHeatmap';
import { POLLUTANTS } from '../lib/pollutants';

interface PlumeOverlayProps {
  map: MapLibreMap;
  sources: EmissionSource[];
  hours: HourlyCalc[];
  hourIndex: number;
  pollutant: PollutantId;
  enabled: boolean;
}

const FRAME_INTERVAL_MS = 1000 / 30;
const TRANSITION_MS = 520;
const DPR_CAP = 1.5;
const DENSITY_MAX_SIDE = 360;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

/**
 * Визуальный слой шлейфа. Частицы существуют как облако точек; между часами
 * сопоставленные по стабильному ID частицы интерполируются, а плотность
 * рисуется мягкими гауссовыми ядрами. Отдельные траектории и линии не видны.
 */
export function PlumeOverlay({
  map,
  sources,
  hours,
  hourIndex,
  pollutant,
  enabled,
}: PlumeOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const redrawRef = useRef(true);

  const particles = useMemo(() => {
    if (!enabled) return [];
    return buildPlumeParticles(sources, hours, hourIndex, pollutant);
  }, [enabled, sources, hours, hourIndex, pollutant]);

  const config = POLLUTANTS[pollutant];
  const particlesRef = useRef(particles);
  particlesRef.current = particles;
  const previousRef = useRef<PlumeParticle[]>([]);
  const currentRef = useRef(particles);
  const transitionRef = useRef(0);

  useEffect(() => {
    redrawRef.current = true;
    if (currentRef.current === particles) return;
    previousRef.current = currentRef.current;
    currentRef.current = particles;
    transitionRef.current = performance.now();
  }, [particles]);

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const colorCanvas = document.createElement('canvas');
    const colorContext = colorCanvas.getContext('2d');
    if (!colorContext) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    let width = 0;
    let height = 0;
    let densityWidth = 0;
    let densityHeight = 0;
    let densityValues = new Float32Array(0);
    let blurredValues = new Float32Array(0);
    let colorValues = new Uint8ClampedArray(0);
    let colorImage: ImageData | null = null;
    let raf = 0;
    let lastFrame = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const densityScale = Math.min(1 / 3, DENSITY_MAX_SIDE / Math.max(width, height, 1));
      densityWidth = Math.max(1, Math.round(width * densityScale));
      densityHeight = Math.max(1, Math.round(height * densityScale));
      colorCanvas.width = densityWidth;
      colorCanvas.height = densityHeight;

      const pixelCount = densityWidth * densityHeight;
      densityValues = new Float32Array(pixelCount);
      blurredValues = new Float32Array(pixelCount);
      colorValues = new Uint8ClampedArray(pixelCount * 4);
      colorImage = colorContext.createImageData(densityWidth, densityHeight);
      redrawRef.current = true;
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    const markDirty = () => {
      redrawRef.current = true;
    };
    map.on('move', markDirty);

    const transitionAt = (now: number) => {
      const linear = clamp01((now - transitionRef.current) / TRANSITION_MS);
      return smoothstep(linear);
    };

    const drawFrame = (transition: number) => {
      if (width <= 0 || height <= 0) return;

      const from = previousRef.current;
      const to = particlesRef.current;
      const cloud: Array<PlumeParticle | CloudParticle> =
        transition < 1 && from.length > 0 ? interpolatePlumeParticles(from, to, transition) : to;
      const scaleX = densityWidth / Math.max(1, width);
      const scaleY = densityHeight / Math.max(1, height);
      const densityScale = (scaleX + scaleY) / 2;
      const kernels: DensityKernel[] = [];

      for (const particle of cloud) {
        const opacity = 'opacity' in particle ? particle.opacity : 1;
        if (opacity <= 0.002) continue;

        const wake = particle.wake.length > 0 ? particle.wake : [particle.position];
        const fractions = particle.wake.length > 0 ? WAKE_FRACTIONS : [1];
        for (let index = 0; index < wake.length; index += 1) {
          const wakePoint = wake[index];
          if (!wakePoint) continue;

          const fraction = fractions[index] ?? 1;
          const wakeAge = particle.ageMinutes * fraction;
          const retention = plumeRetention(wakeAge);
          if (retention <= 0.002) continue;

          const point = map.project([wakePoint.lng, wakePoint.lat]);
          const radius = plumeKernelRadius(
            clamp01(wakeAge / PLUME_HISTORY_MINUTES),
            particle.weight,
          );
          if (
            point.x < -radius ||
            point.x > width + radius ||
            point.y < -radius ||
            point.y > height + radius
          ) {
            continue;
          }

          const wakeWeight = 0.12 + 0.88 * Math.pow(fraction, 6);
          kernels.push({
            x: point.x * scaleX,
            y: point.y * scaleY,
            radius: radius * densityScale,
            weight: particle.weight,
            opacity: opacity * retention * wakeWeight,
          });
        }
      }

      densityValues.fill(0);
      splatParticleDensity(densityValues, densityWidth, densityHeight, kernels);
      blurDensity(densityValues, densityWidth, densityHeight, DENSITY_BLUR_RADIUS, blurredValues);
      colorizeDensity(blurredValues, config, colorValues);

      if (!colorImage) return;
      colorImage.data.set(colorValues);
      colorContext.putImageData(colorImage, 0, 0);

      context.clearRect(0, 0, width, height);
      context.imageSmoothingEnabled = true;
      context.drawImage(colorCanvas, 0, 0, width, height);
      redrawRef.current = false;
    };

    const render = (now: number) => {
      raf = window.requestAnimationFrame(render);
      if (now - lastFrame < FRAME_INTERVAL_MS) return;
      lastFrame = now;

      const transition = transitionAt(now);
      if (transition >= 1 && !redrawRef.current) return;
      drawFrame(transition);
      if (transition < 1) redrawRef.current = true;
    };

    // Первый кадр рисуем сразу, не дожидаясь requestAnimationFrame.
    drawFrame(transitionAt(performance.now()));
    raf = window.requestAnimationFrame(render);

    return () => {
      map.off('move', markDirty);
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      context.clearRect(0, 0, width, height);
    };
  }, [enabled, map, config]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className="plume-canvas" aria-hidden="true" />;
}
