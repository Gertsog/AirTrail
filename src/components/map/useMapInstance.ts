import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import {
  AttributionControl,
  Map as MapLibreMapCtor,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
} from 'maplibre-gl';
import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';

// MapLibre 6 поставляет worker отдельным файлом. Кладём его в public,
// чтобы одинаково работать и в dev, и в production-сборке.
setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);
import type { LatLng, RegionInfo } from '../../types';
import type { MapApi } from './types';

const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#dfe9d3' },
    },
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        'raster-saturation': -0.35,
        'raster-brightness-min': 0.15,
        'raster-brightness-max': 0.95,
      },
    },
  ],
};

interface MapInstanceResult {
  mapRef: MutableRefObject<MapLibreMap | null>;
  mapInstance: MapLibreMap | null;
  loaded: boolean;
  styleOffset: number;
  beforeSymbolRef: MutableRefObject<string | undefined>;
}

/** Создаёт MapLibre, подключает fallback-стиль и сообщает наружу готовый MapApi. */
export function useMapInstance(
  containerRef: RefObject<HTMLDivElement | null>,
  onMapReady: (api: MapApi | null) => void,
  region: RegionInfo,
): MapInstanceResult {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [styleOffset, setStyleOffset] = useState(0);
  const loadedRef = useRef(false);
  const beforeSymbolRef = useRef<string | undefined>(undefined);
  const regionRef = useRef(region);
  regionRef.current = region;

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const [[west, south], [east, north]] = regionRef.current.bounds;
    const center = regionRef.current.center ?? {
      lat: (south + north) / 2,
      lng: (west + east) / 2,
    };
    const map = new MapLibreMapCtor({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [center.lng, center.lat],
      zoom: regionRef.current.zoom ?? 10.6,
      minZoom: 7,
      maxZoom: 17,
      attributionControl: false,
      dragRotate: false,
    });

    mapRef.current = map;
    if (import.meta.env.DEV) {
      (window as unknown as { __airMap?: MapLibreMap }).__airMap = map;
    }
    map.addControl(new ScaleControl({ maxWidth: 90, unit: 'metric' }), 'top-right');

    // На тач-устройствах кнопки зума не нужны (есть пинч) и перекрывают верхнюю панель.
    const coarsePointer =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (!coarsePointer) {
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    }
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

    const fallbackTimer = window.setTimeout(() => {
      if (!loadedRef.current) map.setStyle(FALLBACK_STYLE);
    }, 7000);

    const markReady = () => {
      loadedRef.current = true;
      window.clearTimeout(fallbackTimer);
      const layers = map.getStyle().layers ?? [];
      beforeSymbolRef.current = layers.find(
        (layer: { type?: string; id: string }) => layer.type === 'symbol',
      )?.id;
      setStyleOffset((value) => value + 1);
      setLoaded(true);
      setMapInstance(map);
    };

    map.on('style.load', markReady);
    if (map.isStyleLoaded()) markReady();

    const api: MapApi = {
      flyTo: (position: LatLng, zoom = 12.6) => {
        map.flyTo({
          center: [position.lng, position.lat],
          zoom,
          duration: 900,
          essential: true,
        });
      },
    };
    onMapReady(api);

    return () => {
      window.clearTimeout(fallbackTimer);
      onMapReady(null);
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      setLoaded(false);
      loadedRef.current = false;
    };
  }, [containerRef, onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (region.center) {
      map.jumpTo({
        center: [region.center.lng, region.center.lat],
        zoom: region.zoom ?? map.getZoom(),
      });
    } else {
      map.fitBounds(region.bounds, { padding: 40, duration: 0 });
    }
  }, [region, loaded, mapRef]);

  return { mapRef, mapInstance, loaded, styleOffset, beforeSymbolRef };
}
