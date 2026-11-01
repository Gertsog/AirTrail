import { useCallback, useState } from 'react';
import type { LayerId, LayerState } from '../types';
import { DEFAULT_LAYERS } from './layers';
import { prefersReducedMotion } from './motion';

/** Состояние слоёв карты. */
export function useLayers() {
  const [layers, setLayers] = useState<LayerState>(() => ({
    ...DEFAULT_LAYERS,
    wind: !prefersReducedMotion(),
  }));

  const toggleLayer = useCallback((id: LayerId) => {
    setLayers((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  return { layers, toggleLayer };
}
