import type { ReactNode } from 'react';
import type { ForecastResponse, LayerId, LayerState, PollutantId } from '../types';
import { windDirectionLabel } from '../lib/pollutants';
import { formatDayShort, formatHourRange, formatTime } from '../lib/format';
import { useUnwrappedAngle } from '../lib/useUnwrappedAngle';
import { at } from '../lib/array';
import {
  CrosshairIcon,
  FactoryIcon,
  LayersIcon,
  TargetIcon,
  WindArrowIcon,
  WindIcon,
} from './icons';
import { PollutantSelect } from './PollutantSelect';
import { LAYERS } from '../lib/layers';

interface TopBarProps {
  forecast: ForecastResponse;
  hourIndex: number;
  nowIndex: number;
  pollutant: PollutantId;
  layers: LayerState;
  onPollutantChange: (value: PollutantId) => void;
  onToggleLayer: (id: LayerId) => void;
  onNow: () => void;
}

const LAYER_ICONS: Record<LayerId, ReactNode> = {
  plume: <LayersIcon size={17} />,
  points: <TargetIcon size={17} />,
  sources: <FactoryIcon size={17} />,
  wind: <WindIcon size={17} />,
};

export function TopBar({
  forecast,
  hourIndex,
  nowIndex,
  pollutant,
  layers,
  onPollutantChange,
  onToggleLayer,
  onNow,
}: TopBarProps) {
  const hour = at(forecast.hours, hourIndex, 'часы прогноза');
  const arrowAngle = useUnwrappedAngle(hour.wind.windDirection + 180);
  const speed = hour.wind.windSpeed.toLocaleString('ru-RU', {
    maximumFractionDigits: 1,
  });

  return (
    <div className="topbar">
      <div className="topbar__card topbar__forecast">
        <span className="topbar__label">Прогноз на</span>
        <div className="topbar__forecast-value">
          <strong>{formatHourRange(hour.time)}</strong>
          <span>{formatDayShort(hour.time)}</span>
        </div>
      </div>

      <PollutantSelect value={pollutant} onChange={onPollutantChange} />

      <div className="topbar__group" role="group" aria-label="Слои карты">
        {LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={`chip${layers[layer.id] ? ' chip--active' : ''}`}
            onClick={() => onToggleLayer(layer.id)}
            aria-pressed={layers[layer.id]}
            title={layer.description}
          >
            {LAYER_ICONS[layer.id]}
            <span className="chip__text">{layer.label}</span>
          </button>
        ))}
      </div>

      <div
        className="topbar__wind"
        title={`Ветер ${windDirectionLabel(hour.wind.windDirection)} · ${speed} м/с`}
      >
        <span className="topbar__wind-arrow" style={{ transform: `rotate(${arrowAngle}deg)` }}>
          <WindArrowIcon size={18} />
        </span>
        <div>
          <strong>
            {windDirectionLabel(hour.wind.windDirection)} · {speed} м/с
          </strong>
          <span>
            {hour.wind.temperature.toLocaleString('ru-RU', {
              maximumFractionDigits: 1,
            })}{' '}
            °C · класс {hour.wind.stability}
          </span>
        </div>
      </div>

      <button type="button" className="topbar__now" onClick={onNow}>
        <CrosshairIcon size={17} />
        Сейчас
        <span className="topbar__now-time">
          {formatTime(at(forecast.hours, nowIndex, 'текущий час').time)}
        </span>
      </button>
    </div>
  );
}
