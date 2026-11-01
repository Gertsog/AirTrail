import { useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { WindHour } from '../types';

interface WindOverlayProps {
  map: MapLibreMap;
  wind: WindHour;
  enabled: boolean;
}

interface Particle {
  lat: number;
  lng: number;
  age: number;
  maxAge: number;
}

const MAX_PARTICLES = 520;
const MIN_PARTICLES = 240;
const DEG = Math.PI / 180;
const METERS_PER_DEG_LAT = 111_320;

/** Анимированные частицы ветра поверх карты. */
export function WindOverlay({ map, wind, enabled }: WindOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const windRef = useRef(wind);
  windRef.current = wind;

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    const particles: Particle[] = [];
    let bounds = map.getBounds();
    let frame = 0;
    let raf = 0;
    let last = performance.now();

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
    };

    const spawn = (): Particle => {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const lngSpan = ne.lng - sw.lng;
      const latSpan = ne.lat - sw.lat;
      return {
        lng: sw.lng + Math.random() * lngSpan,
        lat: sw.lat + Math.random() * latSpan,
        age: Math.random() * 4,
        maxAge: 3 + Math.random() * 4,
      };
    };

    resize();
    const particleCount = Math.round(
      Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, (width * height) / 2200)),
    );
    for (let i = 0; i < particleCount; i += 1) particles.push(spawn());

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame += 1;
      if (frame % 40 === 0) bounds = map.getBounds();

      const current = windRef.current;
      const bearing = (current.windDirection + 180) * DEG;
      const speedFactor = 120;
      const distance = current.windSpeed * speedFactor * dt;
      const dLat = (Math.cos(bearing) * distance) / METERS_PER_DEG_LAT;
      const baseLng = Math.sin(bearing) * distance;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      context.clearRect(0, 0, width, height);
      context.lineWidth = 1.1;
      context.lineCap = 'round';
      context.strokeStyle = '#34506b';

      for (const particle of particles) {
        const from = map.project([particle.lng, particle.lat]);
        const cosLat = Math.cos(particle.lat * DEG) || 0.2;
        const dLng = baseLng / (METERS_PER_DEG_LAT * cosLat);

        particle.lng += dLng + (Math.random() - 0.5) * 0.00004;
        particle.lat += dLat + (Math.random() - 0.5) * 0.00003;
        particle.age += dt;

        const outside =
          particle.lng < sw.lng ||
          particle.lng > ne.lng ||
          particle.lat < sw.lat ||
          particle.lat > ne.lat;

        if (particle.age > particle.maxAge || outside) {
          Object.assign(particle, spawn());
          continue;
        }

        const to = map.project([particle.lng, particle.lat]);
        const life = particle.age / particle.maxAge;
        const alpha = 0.32 * Math.sin(Math.PI * Math.max(0.001, Math.min(0.999, life)));

        context.globalAlpha = alpha;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.stroke();
      }

      context.globalAlpha = 1;
      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      context.clearRect(0, 0, width, height);
    };
  }, [enabled, map]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className="wind-canvas" aria-hidden="true" />;
}
