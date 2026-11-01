import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Marker, Map as MapLibreMap } from 'maplibre-gl';
import type { ForecastResponse } from '../../types';
import { escapeHtml, sourcePopupHtml } from './popups';
import {
  createMapMarker,
  createMarkerElement,
  openMapPopup,
  setMarkersVisibility,
  type MarkerEntry,
} from './markerUtils';

const FACTORY_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V9.5l6 3.5V9.5l6 3.5V7h6v14H3Z"/><path d="M6 21v-3M11 21v-3M16.5 21v-3M17 7V3h2v4"/></svg>';

interface UseSourceMarkersParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  loaded: boolean;
  forecast: ForecastResponse;
  visible: boolean;
  activeSourceId: string | null;
}

/** Маркеры источников и их видимость. */
export function useSourceMarkers({
  mapRef,
  loaded,
  forecast,
  visible,
  activeSourceId,
}: UseSourceMarkersParams) {
  const markersRef = useRef(new Map<string, MarkerEntry>());

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return undefined;
    const created: Marker[] = [];
    const markers = markersRef.current;

    for (const source of forecast.sources) {
      const el = createMarkerElement(
        'source-marker',
        `<span class="source-marker__icon">${FACTORY_SVG}</span><span class="source-marker__label">${escapeHtml(source.name)}</span>`,
      );
      el.title = source.name;
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        openMapPopup(map, source.position, sourcePopupHtml(source), {
          offset: 26,
          maxWidth: '280px',
        });
      });

      const marker = createMapMarker(map, el, source.position);
      markers.set(source.id, { marker, el });
      created.push(marker);
    }

    return () => {
      for (const marker of created) marker.remove();
      markers.clear();
    };
  }, [forecast, loaded, mapRef]);

  useEffect(() => {
    for (const source of forecast.sources) {
      markersRef.current
        .get(source.id)
        ?.el.classList.toggle('is-active', source.id === activeSourceId);
    }
  }, [activeSourceId, forecast, loaded]);

  useEffect(() => {
    setMarkersVisibility(markersRef.current.values(), visible);
  }, [visible, loaded, forecast]);
}
