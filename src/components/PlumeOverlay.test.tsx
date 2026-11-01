import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { EmissionSource, HourlyCalc } from '../types';
import { PlumeOverlay } from './PlumeOverlay';

const source: EmissionSource = {
  id: 'src-test',
  name: 'Тестовая ТЭЦ',
  position: { lat: 52.37, lng: 76.98 },
  stackHeight: 150,
  stackDiameter: 6,
  exitVelocity: 12,
  temperature: 140,
  emissions: { CO: 100, NO2: 30, SO2: 40, O3: 5, 'PM2.5': 20, PM10: 30 },
};

const hours: HourlyCalc[] = [0, 1, 2].map((index) => ({
  time: new Date(Date.UTC(2026, 9, 31, 10 + index)).toISOString(),
  wind: {
    time: new Date(Date.UTC(2026, 9, 31, 10 + index)).toISOString(),
    windSpeed: 4,
    windDirection: 280,
    temperature: 0,
    stability: 'D',
  },
  readings: [],
}));

let rafCallback: ((time: number) => void) | null = null;
const cancelAnimationFrameMock = vi.fn();
const context = {
  globalAlpha: 1,
  lineWidth: 1,
  lineCap: 'round',
  lineJoin: 'round',
  strokeStyle: '#000',
  imageSmoothingEnabled: false,
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  drawImage: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn((width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
  })),
  getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4),
    width,
    height,
  })),
};

const map = {
  project: () => ({ x: 100, y: 100 }),
  on: vi.fn(),
  off: vi.fn(),
} as unknown as MapLibreMap;

beforeEach(() => {
  rafCallback = null;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  vi.stubGlobal('requestAnimationFrame', (callback: (time: number) => void) => {
    rafCallback = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('PlumeOverlay', () => {
  it('rasterizes a soft particle cloud without line strokes', () => {
    const { container, unmount } = render(
      <PlumeOverlay
        map={map}
        sources={[source]}
        hours={hours}
        hourIndex={2}
        pollutant="PM2.5"
        enabled
      />,
    );
    expect(container.querySelector('.plume-canvas')).toBeInTheDocument();

    act(() => rafCallback?.(64));
    expect(context.stroke).not.toHaveBeenCalled();
    expect(context.getImageData).not.toHaveBeenCalled();
    expect(context.putImageData).toHaveBeenCalled();
    expect(context.drawImage).toHaveBeenCalled();

    unmount();
    expect(cancelAnimationFrameMock).toHaveBeenCalled();
  });

  it('renders nothing when the plume layer is disabled', () => {
    const { container } = render(
      <PlumeOverlay
        map={map}
        sources={[source]}
        hours={hours}
        hourIndex={2}
        pollutant="PM2.5"
        enabled={false}
      />,
    );
    expect(container.querySelector('.plume-canvas')).not.toBeInTheDocument();
  });
});
