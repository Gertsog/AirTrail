import { useEffect, useMemo, useRef } from 'react';
import type { ForecastResponse } from '../../types';
import {
  calculationTime,
  forecastTime,
  formatDateRange,
  formatDayKey,
  formatDayShort,
  plural,
} from '../../lib/format';
import { at } from '../../lib/array';

interface ResultsTabProps {
  forecast: ForecastResponse;
  hourIndex: number;
  nowIndex: number;
  onSelectHour: (index: number) => void;
}

export function ResultsTab({ forecast, hourIndex, nowIndex, onSelectHour }: ResultsTabProps) {
  const activeCardRef = useRef<HTMLButtonElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const groups = useMemo(() => {
    const result: Array<{
      key: string;
      label: string;
      year: number;
      items: Array<{ hour: ForecastResponse['hours'][number]; index: number }>;
    }> = [];

    forecast.hours.forEach((item, index) => {
      const key = formatDayKey(item.time);
      let group = result[result.length - 1];
      if (!group || group.key !== key) {
        group = {
          key,
          label: formatDayShort(item.time),
          year: new Date(item.time).getFullYear(),
          items: [],
        };
        result.push(group);
      }
      group.items.push({ hour: item, index });
    });
    return result;
  }, [forecast.hours]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const scroller = scrollRef.current;
      const card = activeCardRef.current;
      if (!scroller || !card) return;
      const scrollerRect = scroller.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const delta = cardRect.top - scrollerRect.top - (scroller.clientHeight - cardRect.height) / 2;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      scroller.scrollTo({
        top: Math.max(0, scroller.scrollTop + delta),
        behavior: reduced ? 'auto' : 'smooth',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [hourIndex]);

  const firstHour = at(forecast.hours, 0, 'часы прогноза');
  const lastHour = at(forecast.hours, forecast.hours.length - 1, 'часы прогноза');

  return (
    <div className="sidebar__body">
      <div className="sidebar__range">
        <div className="range-chip" title="Период прогноза">
          {formatDateRange(firstHour.time, lastHour.time)}
        </div>
        <span className="sidebar__range-note">
          {forecast.hours.length} {plural(forecast.hours.length, 'час', 'часа', 'часов')} · шаг 1
          час
        </span>
      </div>

      <div className="sidebar__scroll" ref={scrollRef}>
        {groups.map((group) => (
          <section key={group.key} className="day-group">
            <div className="day-group__label">
              {group.label} {group.year}
            </div>

            {group.items.map(({ hour: item, index }) => {
              const active = index === hourIndex;
              const isNow = index === nowIndex;
              return (
                <div key={item.time} className="calc-card-wrap">
                  {isNow && <span className="calc-card__now">Сейчас на карте</span>}
                  <button
                    type="button"
                    ref={active ? activeCardRef : null}
                    className={`calc-card${active ? ' is-active' : ''}${index < nowIndex ? ' is-past' : ''}`}
                    onClick={() => onSelectHour(index)}
                  >
                    <span className="calc-card__col">
                      <span className="calc-card__caption">Результаты расчёта</span>
                      <strong>{calculationTime(item.time)}</strong>
                    </span>
                    <span className="calc-card__col calc-card__col--right">
                      <span className="calc-card__caption">Прогноз на</span>
                      <strong>{forecastTime(item.time)}</strong>
                    </span>
                  </button>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
