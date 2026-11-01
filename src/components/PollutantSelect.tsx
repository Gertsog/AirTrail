import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { PollutantId } from '../types';
import { POLLUTANTS, POLLUTANT_ORDER } from '../lib/pollutants';
import { ChevronDownIcon } from './icons';

interface PollutantSelectProps {
  value: PollutantId;
  onChange: (value: PollutantId) => void;
}

/** Выпадающий список веществ: обычный DOM-список вместо нативного select. */
export function PollutantSelect({ value, onChange }: PollutantSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, POLLUTANT_ORDER.indexOf(value)));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const current = POLLUTANTS[value];

  const openList = () => {
    setActiveIndex(Math.max(0, POLLUTANT_ORDER.indexOf(value)));
    setOpen(true);
  };

  const close = (focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const select = (id: PollutantId) => {
    onChange(id);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = document.getElementById(optionId(activeIndex));
    if (option && typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
    // optionId зависит только от baseId и индекса
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, baseId]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openList();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) close(true);
      else openList();
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((index) => Math.min(POLLUTANT_ORDER.length - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(POLLUTANT_ORDER.length - 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const next = POLLUTANT_ORDER[activeIndex];
        if (next) select(next);
        break;
      }
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="topbar__select" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="topbar__card topbar__select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${valueId}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="topbar__label" id={labelId}>
          Вещество
        </span>
        <span className="topbar__select-value" id={valueId}>
          <span>{current.label}</span>
          <ChevronDownIcon size={15} />
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          className="pollutant-menu"
          role="listbox"
          aria-labelledby={labelId}
          aria-activedescendant={optionId(activeIndex)}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
        >
          {POLLUTANT_ORDER.map((id, index) => {
            const config = POLLUTANTS[id];
            const selected = id === value;
            const classes = [
              'pollutant-menu__option',
              index === activeIndex ? 'is-active' : '',
              selected ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={id}
                id={optionId(index)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={selected}
                className={classes}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => select(id)}
              >
                <span>{config.label}</span>
                <span className="pollutant-menu__unit">{config.unit}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
