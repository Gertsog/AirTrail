import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { PollutantId } from '../../types';
import { buildForecast } from '../../api/mockBackend';
import { at } from '../../lib/array';
import { DEFAULT_LAYERS } from '../../lib/layers';
import { useMapMarkers } from './useMapMarkers';

const markerInstances = vi.hoisted(
  () => [] as Array<{ element: HTMLButtonElement; remove: ReturnType<typeof vi.fn> }>,
);

vi.mock('maplibre-gl', () => {
  class Marker {
    element: HTMLButtonElement;
    remove = vi.fn();

    constructor(options: { element: HTMLButtonElement }) {
      this.element = options.element;
      markerInstances.push(this);
    }

    setLngLat() {
      return this;
    }

    addTo() {
      return this;
    }
  }

  class Popup {
    setLngLat() {
      return this;
    }

    setHTML() {
      return this;
    }

    addTo() {
      return this;
    }
  }

  return { Marker, Popup };
});

describe('useMapMarkers', () => {
  it('creates source and point markers, updates visibility and values', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    const hour = at(forecast.hours, 12);
    const base = {
      mapRef: { current: {} as MapLibreMap } as MutableRefObject<MapLibreMap | null>,
      loaded: true,
      forecast,
      hour,
      hourIndex: 12,
      pollutant: 'PM2.5' as PollutantId,
      layers: DEFAULT_LAYERS,
      activeSourceId: forecast.sources[0]?.id ?? null,
    };

    const { rerender, unmount } = renderHook((props) => useMapMarkers(props), {
      initialProps: base,
    });

    expect(markerInstances).toHaveLength(forecast.sources.length + forecast.controlPoints.length);
    const sources = markerInstances.filter((m) => m.element.className.includes('source-marker'));
    const points = markerInstances.filter((m) => m.element.className.includes('cp-marker'));
    expect(sources).toHaveLength(2);
    expect(points).toHaveLength(12);
    expect(sources[0]?.element.classList.contains('is-active')).toBe(true);

    const pmValues = points.map((m) => m.element.querySelector('.cp-marker__value')?.textContent);
    expect(pmValues.some((value) => value !== '0')).toBe(true);

    act(() =>
      rerender({
        ...base,
        pollutant: 'AQI',
      }),
    );
    const aqiValues = points.map((m) => m.element.querySelector('.cp-marker__value')?.textContent);
    expect(aqiValues).not.toEqual(pmValues);

    act(() =>
      rerender({
        ...base,
        pollutant: 'AQI',
        layers: { ...DEFAULT_LAYERS, sources: false },
      }),
    );
    expect(sources[0]?.element.style.display).toBe('none');

    unmount();
    for (const marker of markerInstances) {
      expect(marker.remove).toHaveBeenCalled();
    }
  });
});
