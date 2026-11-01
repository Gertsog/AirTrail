import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { buildForecast } from '../api/mockBackend';
import { DEFAULT_LAYERS } from '../lib/layers';
import { MapView } from './MapView';

const mocks = vi.hoisted(() => ({
  useMapInstance: vi.fn(() => ({
    mapRef: { current: null },
    mapInstance: { project: vi.fn() },
    loaded: false,
    styleOffset: 0,
    beforeSymbolRef: { current: undefined },
  })),
  useMapMarkers: vi.fn(),
  PlumeOverlay: vi.fn((_props: Record<string, unknown>) => null),
  WindOverlay: vi.fn((_props: Record<string, unknown>) => null),
}));

vi.mock('./map/useMapInstance', () => ({ useMapInstance: mocks.useMapInstance }));
vi.mock('./map/useMapMarkers', () => ({ useMapMarkers: mocks.useMapMarkers }));
vi.mock('./PlumeOverlay', () => ({ PlumeOverlay: mocks.PlumeOverlay }));
vi.mock('./WindOverlay', () => ({ WindOverlay: mocks.WindOverlay }));

describe('MapView', () => {
  it('composes map hooks and passes the region to the map instance', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    const onMapReady = vi.fn();
    const { container } = render(
      <MapView
        forecast={forecast}
        hourIndex={12}
        pollutant="PM2.5"
        layers={DEFAULT_LAYERS}
        activeSourceId={forecast.sources[0]?.id ?? null}
        onMapReady={onMapReady}
      />,
    );

    expect(container.querySelector('.map-wrap')).toBeInTheDocument();
    expect(container.querySelector('.map')).toBeInTheDocument();
    expect(mocks.useMapInstance).toHaveBeenCalledWith(
      expect.any(Object),
      onMapReady,
      forecast.region,
    );
    expect(mocks.useMapMarkers).toHaveBeenCalledWith(
      expect.objectContaining({
        loaded: false,
        forecast,
        hourIndex: 12,
        pollutant: 'PM2.5',
        layers: DEFAULT_LAYERS,
      }),
    );
    expect(mocks.PlumeOverlay.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        sources: forecast.sources,
        hours: forecast.hours,
        hourIndex: 12,
        pollutant: 'PM2.5',
        enabled: true,
      }),
    );
    expect(mocks.WindOverlay.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        wind: forecast.hours[12]?.wind,
        enabled: true,
      }),
    );
  });

  it('hides only the plume when its layer is disabled', () => {
    const forecast = buildForecast(new Date(2026, 9, 31, 12));
    render(
      <MapView
        forecast={forecast}
        hourIndex={12}
        pollutant="PM2.5"
        layers={{ ...DEFAULT_LAYERS, plume: false }}
        activeSourceId={forecast.sources[0]?.id ?? null}
        onMapReady={vi.fn()}
      />,
    );

    expect(mocks.PlumeOverlay.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ enabled: false }),
    );
    expect(mocks.WindOverlay.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ enabled: true }),
    );
  });
});
