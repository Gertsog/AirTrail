import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { NavigationControl, ScaleControl } from 'maplibre-gl';
import { REGION } from '../../api/fixtures';
import { useMapInstance } from './useMapInstance';

const mock = vi.hoisted(() => {
  const styleLoad: { current: (() => void) | null } = { current: null };
  const map = {
    on: vi.fn((event: string, callback: () => void) => {
      if (event === 'style.load') styleLoad.current = callback;
    }),
    isStyleLoaded: vi.fn(() => false),
    getStyle: vi.fn(() => ({ layers: [{ id: 'labels', type: 'symbol' }] })),
    addControl: vi.fn(),
    setStyle: vi.fn(),
    remove: vi.fn(),
    flyTo: vi.fn(),
    jumpTo: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn(() => 10.6),
  };
  return { map, styleLoad, MapCtor: vi.fn(() => map) };
});

vi.mock('maplibre-gl', () => ({
  Map: mock.MapCtor,
  NavigationControl: vi.fn(),
  ScaleControl: vi.fn(),
  AttributionControl: vi.fn(),
  setWorkerUrl: vi.fn(),
}));

describe('useMapInstance', () => {
  it('creates a map, exposes MapApi and reacts to style load', () => {
    const container = { current: document.createElement('div') } as RefObject<HTMLDivElement>;
    const onReady = vi.fn();
    const { result, rerender, unmount } = renderHook(
      ({ region }) => useMapInstance(container, onReady, region),
      { initialProps: { region: REGION } },
    );

    expect(mock.MapCtor).toHaveBeenCalledTimes(1);
    expect(mock.MapCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [REGION.center?.lng, REGION.center?.lat],
        zoom: REGION.zoom,
      }),
    );
    expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ flyTo: expect.any(Function) }));
    expect(result.current.loaded).toBe(false);

    act(() => mock.styleLoad.current?.());
    expect(result.current.loaded).toBe(true);
    expect(result.current.styleOffset).toBe(1);
    expect(result.current.beforeSymbolRef.current).toBe('labels');
    expect(mock.map.jumpTo).toHaveBeenCalledWith({
      center: [REGION.center?.lng, REGION.center?.lat],
      zoom: REGION.zoom,
    });

    const nextRegion = {
      ...REGION,
      id: 'next',
      center: { lat: 50, lng: 70 },
      zoom: 9,
    };
    rerender({ region: nextRegion });
    expect(mock.MapCtor).toHaveBeenCalledTimes(1);
    expect(mock.map.jumpTo).toHaveBeenLastCalledWith({ center: [70, 50], zoom: 9 });

    const api = onReady.mock.calls[0]?.[0] as {
      flyTo: (p: { lat: number; lng: number }, zoom?: number) => void;
    };
    api.flyTo({ lat: 52.3, lng: 76.9 }, 11);
    expect(mock.map.flyTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [76.9, 52.3], zoom: 11 }),
    );

    unmount();
    expect(mock.map.remove).toHaveBeenCalled();
    expect(onReady).toHaveBeenLastCalledWith(null);
  });

  it('adds zoom controls only for fine pointers', () => {
    const original = window.matchMedia;
    try {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn(() => ({ matches: true })),
      });
      mock.map.addControl.mockClear();
      vi.mocked(NavigationControl).mockClear();
      vi.mocked(ScaleControl).mockClear();
      const container = { current: document.createElement('div') } as RefObject<HTMLDivElement>;
      const { unmount } = renderHook(() => useMapInstance(container, vi.fn(), REGION));

      expect(NavigationControl).not.toHaveBeenCalled();
      expect(ScaleControl).toHaveBeenCalled();
      expect(mock.map.addControl).toHaveBeenCalledTimes(2);
      unmount();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  });
});
