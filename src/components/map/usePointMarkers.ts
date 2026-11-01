import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Marker, Map as MapLibreMap } from 'maplibre-gl';
import type { ForecastResponse, HourlyCalc, PollutantId } from '../../types';
import { indexReadings } from '../../lib/forecast';
import { formatBadgeValue, formatValue, POLLUTANTS, valueColor } from '../../lib/pollutants';
import { at } from '../../lib/array';
import { pointPopupHtml } from './popups';
import {
  createMapMarker,
  createMarkerElement,
  openMapPopup,
  setMarkersVisibility,
  type MarkerEntry,
} from './markerUtils';

interface UsePointMarkersParams {
  mapRef: MutableRefObject<MapLibreMap | null>;
  loaded: boolean;
  forecast: ForecastResponse;
  hour: HourlyCalc;
  hourIndex: number;
  pollutant: PollutantId;
  visible: boolean;
}

/** Маркеры контрольных постов, их значения и попапы. */
export function usePointMarkers({
  mapRef,
  loaded,
  forecast,
  hour,
  hourIndex,
  pollutant,
  visible,
}: UsePointMarkersParams) {
  const markersRef = useRef(new Map<string, MarkerEntry>());
  const latestRef = useRef({ forecast, hourIndex, pollutant });
  latestRef.current = { forecast, hourIndex, pollutant };

  const readingsByPoint = useMemo(() => indexReadings(hour), [hour]);
  const config = POLLUTANTS[pollutant];

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return undefined;
    const created: Marker[] = [];
    const markers = markersRef.current;

    for (const point of forecast.controlPoints) {
      const el = createMarkerElement('cp-marker', '<span class="cp-marker__value">0</span>');
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        const current = latestRef.current;
        openMapPopup(
          map,
          point.position,
          pointPopupHtml(point, current.forecast, current.hourIndex, current.pollutant),
          { offset: 22, maxWidth: '300px' },
        );
      });

      const marker = createMapMarker(map, el, point.position);
      markers.set(point.id, { marker, el });
      created.push(marker);
    }

    return () => {
      for (const marker of created) marker.remove();
      markers.clear();
    };
  }, [forecast, loaded, mapRef]);

  useEffect(() => {
    for (const point of forecast.controlPoints) {
      const entry = markersRef.current.get(point.id);
      if (!entry) continue;
      const value = readingsByPoint.get(point.id)?.[pollutant] ?? 0;
      const color = valueColor(config, value);
      entry.el.style.setProperty('--cp-color', color);
      entry.el.classList.toggle('cp-marker--clean', value <= at(config.thresholds, 0, 'пороги'));
      const valueNode = entry.el.querySelector('.cp-marker__value');
      if (valueNode) valueNode.textContent = formatBadgeValue(value);
      entry.el.title = `${point.name}: ${formatValue(config, value)} ${config.unit}`;
    }
  }, [readingsByPoint, pollutant, config, forecast, loaded]);

  useEffect(() => {
    setMarkersVisibility(markersRef.current.values(), visible);
  }, [visible, loaded, forecast]);
}
