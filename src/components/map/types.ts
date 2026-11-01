import type { LatLng } from '../../types';

export interface MapApi {
  flyTo: (position: LatLng, zoom?: number) => void;
}
