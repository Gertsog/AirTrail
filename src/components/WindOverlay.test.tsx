import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { WindOverlay } from './WindOverlay';

const wind = {
  time: '2026-10-31T12:00:00.000Z',
  windSpeed: 4,
  windDirection: 0,
  temperature: 0,
  stability: 'D' as const,
};

let rafCallback: ((time: number) => void) | null = null;
const cancelAnimationFrameMock = vi.fn();
const context = {
  filter: 'none',
  globalAlpha: 1,
  lineWidth: 1,
  lineCap: 'round',
  strokeStyle: '#000',
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
};

const map = {
  getBounds: () => ({
    getSouthWest: () => ({ lng: 76.8, lat: 52.2 }),
    getNorthEast: () => ({ lng: 77.1, lat: 52.4 }),
  }),
  project: () => ({ x: 100, y: 100 }),
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

describe('WindOverlay', () => {
  it('draws particles and cancels animation on unmount', () => {
    const { container, unmount } = render(<WindOverlay map={map} wind={wind} enabled />);
    expect(container.querySelector('canvas')).toBeInTheDocument();

    act(() => rafCallback?.(16));
    act(() => rafCallback?.(32));
    expect(context.stroke).toHaveBeenCalled();

    unmount();
    expect(cancelAnimationFrameMock).toHaveBeenCalled();
  });

  it('renders nothing when disabled', () => {
    const { container } = render(<WindOverlay map={map} wind={wind} enabled={false} />);
    expect(container.querySelector('canvas')).not.toBeInTheDocument();
  });
});
