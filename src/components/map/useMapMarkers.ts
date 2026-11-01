import type { MutableRefObject } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { ForecastResponse, HourlyCalc, LayerState, PollutantId } from '../../types';
import { useSourceMarkers } from './useSourceMarkers';
import { usePointMarkers } from './usePointMarkers';

interface UseMapMarkersParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  loaded: boolean;
  forecast: ForecastResponse;
  hour: HourlyCalc;
  hourIndex: number;
  pollutant: PollutantId;
  layers: LayerState;
  activeSourceId: string | null;
}

/** Композиция маркеров источников и контрольных постов. */
export function useMapMarkers({
  mapRef,
  loaded,
  forecast,
  hour,
  hourIndex,
  pollutant,
  layers,
  activeSourceId,
}: UseMapMarkersParams) {
  useSourceMarkers({
    mapRef,
    loaded,
    forecast,
    visible: layers.sources,
    activeSourceId,
  });

  usePointMarkers({
    mapRef,
    loaded,
    forecast,
    hour,
    hourIndex,
    pollutant,
    visible: layers.points,
  });
}
