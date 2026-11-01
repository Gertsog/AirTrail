import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CloseIcon, MapIcon, PlumeIcon, RefreshIcon, SettingsIcon } from './icons';
import { at } from '../lib/array';
import { LAYERS } from '../lib/layers';
import type { LayerId, LayerState } from '../types';

interface RailProps {
  layers: LayerState;
  regionName: string;
  onToggleLayer: (id: LayerId) => void;
  onRefresh: () => void;
}

export function Rail({ layers, regionName, onToggleLayer, onRefresh }: RailProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const gearRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const gear = gearRef.current;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      gear?.focus();
    };
  }, [settingsOpen]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = at(focusable, 0, 'фокус');
    const last = at(focusable, focusable.length - 1, 'фокус');
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <aside className="rail" aria-label="Основная навигация">
      <div className="rail__brand" title="АэроШлейф">
        <PlumeIcon size={24} />
      </div>

      <nav className="rail__nav" aria-label="Текущий раздел">
        <div
          className="rail__btn is-active"
          title="Карта шлейфов"
          aria-label="Карта шлейфов"
          role="img"
        >
          <MapIcon size={21} />
        </div>
      </nav>

      <button
        ref={gearRef}
        type="button"
        className={`rail__btn rail__settings${settingsOpen ? ' is-open' : ''}`}
        title="Настройки"
        aria-label="Настройки"
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        onClick={() => setSettingsOpen((value) => !value)}
      >
        <SettingsIcon size={21} />
      </button>

      {settingsOpen && (
        <>
          <button
            type="button"
            className="rail__settings-scrim"
            aria-label="Закрыть настройки"
            onClick={() => setSettingsOpen(false)}
          />
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- focus trap внутри диалога */}
          <div
            ref={panelRef}
            className="rail__settings-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Настройки карты"
            onKeyDown={trapFocus}
          >
            <div className="rail__settings-head">
              <strong>Настройки</strong>
              <button
                ref={closeRef}
                type="button"
                className="rail__settings-close"
                aria-label="Закрыть окно настроек"
                onClick={() => setSettingsOpen(false)}
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {LAYERS.map((layer) => (
              <label key={layer.id} className="rail__settings-row">
                <span>{layer.description}</span>
                <input
                  type="checkbox"
                  checked={layers[layer.id]}
                  onChange={() => onToggleLayer(layer.id)}
                />
              </label>
            ))}

            <button
              type="button"
              className="rail__settings-refresh"
              onClick={() => {
                onRefresh();
                setSettingsOpen(false);
              }}
            >
              <RefreshIcon size={16} />
              Обновить прогноз
            </button>
            <p className="rail__settings-note">Демо-данные · {regionName}</p>
          </div>
        </>
      )}
    </aside>
  );
}
