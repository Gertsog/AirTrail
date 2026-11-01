import type {
  ForecastResponse,
  HourlyCalc,
  LatLng,
  PollutantId,
  StabilityClass,
} from '../../types';
import { formatValue, POLLUTANTS, windDirectionLabel } from '../../lib/pollutants';
import { formatDayShort, formatNumber } from '../../lib/format';
import { at } from '../../lib/array';
import { FactoryIcon, InfoIcon } from '../icons';

interface CalcTabProps {
  forecast: ForecastResponse;
  hour: HourlyCalc;
  pollutant: PollutantId;
  activeSourceId: string | null;
  onSelectSource: (id: string) => void;
  onFocusSource: (position: LatLng) => void;
}

const STABILITY_TITLE: Record<StabilityClass, string> = {
  A: 'очень неустойчивая',
  B: 'неустойчивая',
  C: 'слабо неустойчивая',
  D: 'нейтральная',
  E: 'слабо устойчивая',
  F: 'инверсия',
};

export function CalcTab({
  forecast,
  hour,
  pollutant,
  activeSourceId,
  onSelectSource,
  onFocusSource,
}: CalcTabProps) {
  const config = POLLUTANTS[pollutant];
  const firstHour = at(forecast.hours, 0, 'часы прогноза');
  const lastHour = at(forecast.hours, forecast.hours.length - 1, 'часы прогноза');

  return (
    <div className="sidebar__scroll">
      <section className="panel-section">
        <div className="panel-section__head">
          <h2>Источники выбросов</h2>
          <span className="count-badge">{forecast.sources.length}</span>
        </div>
        <p className="muted">
          Выберите источник, чтобы показать его на карте. Шлейфы всех источников суммируются в
          тепловой карте.
        </p>

        <div className="source-list">
          {forecast.sources.map((source) => {
            const active = source.id === activeSourceId;
            return (
              <button
                key={source.id}
                type="button"
                className={`source-card${active ? ' is-active' : ''}`}
                onClick={() => {
                  onSelectSource(source.id);
                  onFocusSource(source.position);
                }}
              >
                <span className="source-card__icon">
                  <FactoryIcon size={21} />
                </span>
                <span className="source-card__body">
                  <span className="source-card__title">{source.name}</span>
                  <span className="source-card__meta">
                    Труба · {source.position.lat.toFixed(3)}, {source.position.lng.toFixed(3)}
                  </span>
                  <span className="source-card__chips">
                    <span>H {source.stackHeight} м</span>
                    <span>Ø {source.stackDiameter} м</span>
                    <span>{source.exitVelocity} м/с</span>
                    <span>{source.temperature} °C</span>
                  </span>
                  <span className="source-card__emission">
                    {pollutant === 'AQI'
                      ? 'AQI рассчитывается по PM2.5'
                      : `Выброс ${config.label} · ${formatValue(config, source.emissions[pollutant])} г/с`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-section">
        <div className="panel-section__head">
          <h2>Параметры расчёта</h2>
        </div>
        <dl className="kv">
          <div>
            <dt>Модель</dt>
            <dd>Гауссова, приземный слой</dd>
          </div>
          <div>
            <dt>Ветер</dt>
            <dd>
              {windDirectionLabel(hour.wind.windDirection)}, {formatNumber(hour.wind.windSpeed, 1)}{' '}
              м/с
            </dd>
          </div>
          <div>
            <dt>Устойчивость</dt>
            <dd>
              Класс {hour.wind.stability} ({STABILITY_TITLE[hour.wind.stability]})
            </dd>
          </div>
          <div>
            <dt>Температура</dt>
            <dd>{formatNumber(hour.wind.temperature, 1)} °C</dd>
          </div>
          <div>
            <dt>Шаг</dt>
            <dd>1 час</dd>
          </div>
          <div>
            <dt>Период</dt>
            <dd>
              {formatDayShort(firstHour.time)} — {formatDayShort(lastHour.time)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="notice">
        <InfoIcon size={18} />
        <span>
          Расчёт упрощённый: без учёта рельефа, застройки и химических превращений. Для прототипа
          этого достаточно.
        </span>
      </div>
    </div>
  );
}
