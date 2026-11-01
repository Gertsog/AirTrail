import type { PollutantId } from '../types';
import { POLLUTANTS } from '../lib/pollutants';

interface LegendProps {
  pollutant: PollutantId;
}

function legendLabel(value: number): string {
  if (value === 0) return '0';
  if (value < 1) {
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  }
  if (value < 10) {
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  }
  return Math.round(value).toString();
}

export function Legend({ pollutant }: LegendProps) {
  const config = POLLUTANTS[pollutant];

  return (
    <div className="legend">
      <div className="legend__head">
        <div>
          <div className="legend__eyebrow">Концентрация</div>
          <div className="legend__title">{config.title}</div>
        </div>
        <div className="legend__unit">
          {config.label}, {config.unit}
        </div>
      </div>
      <div className="legend__bar" role="img" aria-label={`Шкала ${config.title}`}>
        {config.colors.map((color, index) => (
          <span key={color + index} className="legend__cell" style={{ background: color }} />
        ))}
      </div>
      <div className="legend__labels">
        {config.thresholds.map((value) => (
          <span key={value}>{legendLabel(value)}</span>
        ))}
      </div>
      <div className="legend__footnote">Данные модели рассеивания · {config.unit}</div>
    </div>
  );
}
