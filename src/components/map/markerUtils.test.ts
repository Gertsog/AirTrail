import { describe, expect, it, vi } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  createMapMarker,
  createMarkerElement,
  openMapPopup,
  setMarkersVisibility,
} from './markerUtils';

const mocks = vi.hoisted(() => ({
  markers: [] as Array<{
    position: unknown;
    element: HTMLElement;
    addTo: ReturnType<typeof vi.fn>;
  }>,
  popups: [] as Array<{
    position: unknown;
    html: string;
    addTo: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock('maplibre-gl', () => {
  class Marker {
    position: unknown;
    element: HTMLElement;
    addTo = vi.fn();

    constructor(options: { element: HTMLElement }) {
      this.element = options.element;
      mocks.markers.push(this);
    }

    setLngLat(position: unknown) {
      this.position = position;
      return this;
    }
  }

  class Popup {
    position: unknown;
    html = '';
    addTo = vi.fn();

    constructor() {
      mocks.popups.push(this);
    }

    setLngLat(position: unknown) {
      this.position = position;
      return this;
    }

    setHTML(html: string) {
      this.html = html;
      return this;
    }
  }

  return { Marker, Popup };
});

describe('markerUtils', () => {
  it('creates a button element with class and markup', () => {
    const el = createMarkerElement('test-marker', '<span>42</span>');
    expect(el).toBeInstanceOf(HTMLButtonElement);
    expect(el.className).toBe('test-marker');
    expect(el.innerHTML).toBe('<span>42</span>');
  });

  it('creates and adds a marker at a position', () => {
    const map = {} as MapLibreMap;
    const el = createMarkerElement('test-marker', '');
    createMapMarker(map, el, { lat: 52.3, lng: 76.9 });
    const marker = mocks.markers[0];
    expect(marker?.position).toEqual([76.9, 52.3]);
    expect(marker?.addTo).toHaveBeenCalledWith(map);
  });

  it('opens a popup with HTML and options', () => {
    const map = {} as MapLibreMap;
    openMapPopup(map, { lat: 52.3, lng: 76.9 }, '<b>42</b>', {
      offset: 20,
      maxWidth: '300px',
    });
    const popup = mocks.popups[0];
    expect(popup?.position).toEqual([76.9, 52.3]);
    expect(popup?.html).toBe('<b>42</b>');
    expect(popup?.addTo).toHaveBeenCalledWith(map);
  });

  it('toggles marker visibility', () => {
    const visible = createMarkerElement('a', '');
    const hidden = createMarkerElement('b', '');
    const entries = [
      { marker: {} as never, el: visible },
      { marker: {} as never, el: hidden },
    ];
    setMarkersVisibility(entries, false);
    expect(visible.style.display).toBe('none');
    expect(hidden.style.display).toBe('none');

    setMarkersVisibility(entries, true);
    expect(visible.style.display).toBe('');
  });
});
