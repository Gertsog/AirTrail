import { useCallback, useEffect, useRef, useState } from 'react';
import type { HourlyCalc, LatLng, PollutantId } from './types';
import type { MapApi } from './components/MapView';
import { MapView } from './components/MapView';
import { Rail } from './components/Rail';
import { Sidebar, type SidebarTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Legend } from './components/Legend';
import { Timeline } from './components/Timeline';
import { MenuIcon, PlumeIcon, RefreshIcon } from './components/icons';
import { useCurrentHourIndex } from './lib/useCurrentHourIndex';
import { useForecast } from './lib/useForecast';
import { useLayers } from './lib/useLayers';
import { usePlayback } from './lib/usePlayback';

const EMPTY_HOURS: HourlyCalc[] = [];

export default function App() {
  const { forecast, error, reload } = useForecast();
  const { layers, toggleLayer } = useLayers();
  const { hourIndex, playing, selectHour, scrub, togglePlay, goToNow } = usePlayback(
    forecast?.hours ?? EMPTY_HOURS,
    forecast?.nowIndex ?? 0,
    forecast?.generatedAt ?? 'empty',
  );
  const nowIndex = useCurrentHourIndex(forecast?.hours ?? EMPTY_HOURS, forecast?.nowIndex ?? 0);

  const [pollutant, setPollutant] = useState<PollutantId>('PM2.5');
  const [tab, setTab] = useState<SidebarTab>('results');
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!forecast) {
      document.title = 'АэроШлейф — карта рассеивания выбросов';
      return;
    }
    setActiveSourceId(forecast.sources[0]?.id ?? null);
    document.title = `АэроШлейф — ${forecast.region.name}`;
  }, [forecast]);

  const mapApiRef = useRef<MapApi | null>(null);
  const handleMapReady = useCallback((api: MapApi | null) => {
    mapApiRef.current = api;
  }, []);

  const handleSelectHour = (index: number) => {
    selectHour(index);
    setSidebarOpen(false);
  };

  const handleNow = () => {
    if (!forecast) return;
    goToNow(nowIndex);
  };

  const focusSource = (position: LatLng) => {
    mapApiRef.current?.flyTo(position, 12.4);
    setSidebarOpen(false);
  };

  const focusPoint = (position: LatLng) => {
    mapApiRef.current?.flyTo(position, 13.2);
    setSidebarOpen(false);
  };

  if (error) {
    return (
      <div className="boot boot--error">
        <div className="boot__logo boot__logo--error">
          <PlumeIcon size={34} />
        </div>
        <h1>Не удалось загрузить данные</h1>
        <p>{error}</p>
        <button type="button" className="boot__retry" onClick={reload}>
          <RefreshIcon size={17} />
          Повторить
        </button>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="boot">
        <div className="boot__logo">
          <PlumeIcon size={34} />
        </div>
        <h1>АэроШлейф</h1>
        <p>Строим прогноз рассеивания выбросов…</p>
        <div className="boot__spinner" />
        <div className="boot__hint">Демо-данные · Гауссова модель · MapLibre</div>
      </div>
    );
  }

  return (
    <div className="app">
      <Rail
        layers={layers}
        regionName={forecast.region.name}
        onToggleLayer={toggleLayer}
        onRefresh={reload}
      />
      <Sidebar
        forecast={forecast}
        hourIndex={hourIndex}
        pollutant={pollutant}
        tab={tab}
        activeSourceId={activeSourceId}
        nowIndex={nowIndex}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onTabChange={setTab}
        onSelectHour={handleSelectHour}
        onSelectSource={setActiveSourceId}
        onFocusPoint={focusPoint}
        onFocusSource={focusSource}
      />

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Закрыть панель"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="map-shell">
        <button
          type="button"
          className="map-menu"
          aria-label="Открыть панель"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon size={20} />
        </button>

        <MapView
          forecast={forecast}
          hourIndex={hourIndex}
          pollutant={pollutant}
          layers={layers}
          activeSourceId={activeSourceId}
          onMapReady={handleMapReady}
        />

        <TopBar
          forecast={forecast}
          hourIndex={hourIndex}
          nowIndex={nowIndex}
          pollutant={pollutant}
          layers={layers}
          onPollutantChange={setPollutant}
          onToggleLayer={toggleLayer}
          onNow={handleNow}
        />

        <Legend pollutant={pollutant} />

        <Timeline
          hours={forecast.hours}
          index={hourIndex}
          nowIndex={nowIndex}
          playing={playing}
          onIndexChange={scrub}
          onTogglePlay={togglePlay}
        />
      </main>
    </div>
  );
}
