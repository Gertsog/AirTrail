import type { ForecastResponse, LatLng, PollutantId } from '../types';
import { at } from '../lib/array';
import { formatTime } from '../lib/format';
import { CloseIcon } from './icons';
import { ResultsTab } from './sidebar/ResultsTab';
import { CalcTab } from './sidebar/CalcTab';
import { PointsTab } from './sidebar/PointsTab';

export type SidebarTab = 'results' | 'calc' | 'points';

interface SidebarProps {
  forecast: ForecastResponse;
  hourIndex: number;
  pollutant: PollutantId;
  tab: SidebarTab;
  activeSourceId: string | null;
  nowIndex: number;
  open: boolean;
  onClose: () => void;
  onTabChange: (tab: SidebarTab) => void;
  onSelectHour: (index: number) => void;
  onSelectSource: (id: string) => void;
  onFocusPoint: (position: LatLng) => void;
  onFocusSource: (position: LatLng) => void;
}

const TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: 'results', label: 'Результаты расчёта' },
  { id: 'calc', label: 'Расчёт' },
  { id: 'points', label: 'Контрольные точки' },
];

export function Sidebar({
  forecast,
  hourIndex,
  pollutant,
  tab,
  activeSourceId,
  nowIndex,
  open,
  onClose,
  onTabChange,
  onSelectHour,
  onSelectSource,
  onFocusPoint,
  onFocusSource,
}: SidebarProps) {
  const hour = at(forecast.hours, hourIndex, 'часы прогноза');

  return (
    <aside className={`sidebar${open ? ' is-open' : ''}`}>
      <header className="sidebar__head">
        <div className="sidebar__brandline">
          <span className="sidebar__status" />
          <span>Мониторинг атмосферы</span>
          <button
            type="button"
            className="sidebar__close"
            onClick={onClose}
            aria-label="Закрыть панель"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <h1>Шлейфы</h1>
        <p>{forecast.region.name} · рассеивание выбросов</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Разделы">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-controls={`panel-${item.id}`}
            aria-selected={tab === item.id}
            className={`tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="sidebar__tabpanel"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'results' && (
          <ResultsTab
            forecast={forecast}
            hourIndex={hourIndex}
            nowIndex={nowIndex}
            onSelectHour={onSelectHour}
          />
        )}
        {tab === 'calc' && (
          <CalcTab
            forecast={forecast}
            hour={hour}
            pollutant={pollutant}
            activeSourceId={activeSourceId}
            onSelectSource={onSelectSource}
            onFocusSource={onFocusSource}
          />
        )}
        {tab === 'points' && (
          <PointsTab
            forecast={forecast}
            hour={hour}
            pollutant={pollutant}
            onFocusPoint={onFocusPoint}
          />
        )}
      </div>

      <footer className="sidebar__foot">
        <span className="sidebar__foot-dot" />
        Мок-данные · обновлено {formatTime(forecast.generatedAt)}
      </footer>
    </aside>
  );
}
