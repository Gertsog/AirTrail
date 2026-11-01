import { Marker, Popup } from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LatLng } from '../../types';

export interface MarkerEntry {
  marker: Marker;
  el: HTMLButtonElement;
}

export function createMarkerElement(className: string, innerHTML: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.innerHTML = innerHTML;
  return el;
}

export function createMapMarker(
  map: MapLibreMap,
  element: HTMLButtonElement,
  position: LatLng,
): Marker {
  return new Marker({ element, anchor: 'center' })
    .setLngLat([position.lng, position.lat])
    .addTo(map);
}

export function openMapPopup(
  map: MapLibreMap,
  position: LatLng,
  html: string,
  options: { offset: number; maxWidth: string },
): void {
  new Popup({
    offset: options.offset,
    closeButton: true,
    className: 'air-popup',
    maxWidth: options.maxWidth,
  })
    .setLngLat([position.lng, position.lat])
    .setHTML(html)
    .addTo(map);
}

export function setMarkersVisibility(entries: Iterable<MarkerEntry>, visible: boolean): void {
  for (const entry of entries) {
    entry.el.style.display = visible ? '' : 'none';
  }
}
