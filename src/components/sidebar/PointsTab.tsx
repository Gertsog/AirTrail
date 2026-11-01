import { useMemo } from 'react';
import type { ControlPoint, ForecastResponse, HourlyCalc, LatLng, PollutantId } from '../../types';
import { formatBadgeValue, POLLUTANTS, valueColor, windDirectionLabel } from '../../lib/pollutants';
import { formatDayShort, formatNumber, formatTime, plural } from '../../lib/format';
import { indexReadings } from '../../lib/forecast';
import { useUnwrappedAngle } from '../../lib/useUnwrappedAngle';
import { TargetIcon } from '../icons';

interface PointsTabProps {
  forecast: ForecastResponse;
  hour: HourlyCalc;
  pollutant: PollutantId;
  onFocusPoint: (position: LatLng) => void;
}

export function PointsTab({ forecast, hour, pollutant, onFocusPoint }: PointsTabProps) {
  const config = POLLUTANTS[pollutant];
  const arrowAngle = useUnwrappedAngle(hour.wind.windDirection + 180);

  const points = useMemo(
    () => [...forecast.controlPoints].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    [forecast.controlPoints],
  );
  const readings = useMemo(() => indexReadings(hour), [hour]);

  return (
    <div className="sidebar__scroll">
      <div className="points-head">
        <div>
          <div className="points-head__value">
            {points.length}
            <span>{plural(points.length, 'точка', 'точки', 'точек')}</span>
          </div>
          <div className="points-head__caption">
            {config.label} · {formatTime(hour.time)}, {formatDayShort(hour.time)}
          </div>
        </div>
        <div className="points-head__wind">
          <span className="points-head__arrow" style={{ transform: `rotate(${arrowAngle}deg)` }}>
            ↑
          </span>
          {windDirectionLabel(hour.wind.windDirection)} · {formatNumber(hour.wind.windSpeed, 1)} м/с
        </div>
      </div>

      <div className="point-list">
        {points.map((point: ControlPoint) => {
          const values = readings.get(point.id);
          const value = values?.[pollutant] ?? 0;
          const color = valueColor(config, value);
          return (
            <button
              key={point.id}
              type="button"
              className="point-row"
              onClick={() => onFocusPoint(point.position)}
            >
              <span className="point-row__dot" style={{ background: color }} />
              <span className="point-row__name">{point.name}</span>
              <span className="point-row__badge" style={{ background: color }}>
                {formatBadgeValue(value)}
              </span>
              <span className="point-row__unit">{config.unit}</span>
              <TargetIcon size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
