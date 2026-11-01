import { useRef } from 'react';
import type { ForecastResponse, LayerState, PollutantId } from '../types';
import { at } from '../lib/array';
import { useMapMarkers } from './map/useMapMarkers';
import { useMapInstance } from './map/useMapInstance';
import type { MapApi } from './map/types';
import { PlumeOverlay } from './PlumeOverlay';
import { WindOverlay } from './WindOverlay';

export type { MapApi } from './map/types';

interface MapViewProps {
  forecast: ForecastResponse;
  hourIndex: number;
  pollutant: PollutantId;
  layers: LayerState;
  activeSourceId: string | null;
  onMapReady: (api: MapApi | null) => void;
}

export function MapView({
  forecast,
  hourIndex,
  pollutant,
  layers,
  activeSourceId,
  onMapReady,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { mapRef, mapInstance, loaded } = useMapInstance(containerRef, onMapReady, forecast.region);

  const hour = at(forecast.hours, hourIndex, 'часы прогноза');

  useMapMarkers({
    mapRef,
    loaded,
    forecast,
    hour,
    hourIndex,
    pollutant,
    layers,
    activeSourceId,
  });

  return (
    <div className="map-wrap">
      <div className="map" ref={containerRef} />
      {mapInstance && (
        <>
          <PlumeOverlay
            map={mapInstance}
            sources={forecast.sources}
            hours={forecast.hours}
            hourIndex={hourIndex}
            pollutant={pollutant}
            enabled={layers.plume}
          />
          <WindOverlay map={mapInstance} wind={hour.wind} enabled={layers.wind} />
        </>
      )}
    </div>
  );
}
