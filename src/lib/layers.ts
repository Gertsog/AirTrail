import type { LayerId, LayerState } from '../types';

export interface LayerDefinition {
  id: LayerId;
  label: string;
  description: string;
}

export const LAYERS: LayerDefinition[] = [
  { id: 'plume', label: 'Шлейф', description: 'Тепловая карта шлейфа' },
  { id: 'points', label: 'Посты', description: 'Контрольные посты' },
  { id: 'sources', label: 'Трубы', description: 'Источники выбросов' },
  { id: 'wind', label: 'Ветер', description: 'Анимация ветра' },
];

export const DEFAULT_LAYERS: LayerState = {
  plume: true,
  points: true,
  sources: true,
  wind: true,
};
