import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { HourlyCalc } from '../types';
import { formatDayKey, formatDayShort, formatTime, formatTimelineDay } from '../lib/format';
import { ChevronRightIcon, PauseIcon, PlayIcon } from './icons';
import { clamp } from '../lib/math';
import { at } from '../lib/array';

interface TimelineProps {
  hours: HourlyCalc[];
  index: number;
  nowIndex: number;
  playing: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlay: () => void;
}

export function Timeline({
  hours,
  index,
  nowIndex,
  playing,
  onIndexChange,
  onTogglePlay,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const lastIndex = hours.length - 1;
  const percent = lastIndex > 0 ? (index / lastIndex) * 100 : 0;
  const nowPercent = lastIndex > 0 ? (nowIndex / lastIndex) * 100 : 0;
  const current = at(hours, index, 'часы прогноза');

  const days = useMemo(() => {
    const result: Array<{ index: number; label: string }> = [];
    hours.forEach((hour, hourIndex) => {
      const previous = hourIndex > 0 ? hours[hourIndex - 1] : null;
      if (!previous || formatDayKey(previous.time) !== formatDayKey(hour.time)) {
        result.push({ index: hourIndex, label: formatTimelineDay(hour.time) });
      }
    });
    return result;
  }, [hours]);

  const setFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    onIndexChange(Math.round(ratio * lastIndex));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setDragging(true);
    setFromClientX(event.clientX);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setFromClientX(event.clientX);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggingRef.current = false;
    setDragging(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    let next = index;
    if (event.key === 'ArrowLeft') next = index - 1;
    else if (event.key === 'ArrowRight') next = index + 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = lastIndex;
    else return;
    event.preventDefault();
    onIndexChange(clamp(next, 0, lastIndex));
  };

  const bubbleTransform =
    percent < 7 ? 'translateX(0)' : percent > 93 ? 'translateX(-100%)' : 'translateX(-50%)';

  return (
    <div className="timeline">
      <button
        type="button"
        className="timeline__play"
        onClick={onTogglePlay}
        aria-label={playing ? 'Остановить анимацию' : 'Проиграть прогноз'}
      >
        {playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
      </button>

      <div className="timeline__body">
        <div className="timeline__days">
          {days.map((day) => (
            <span
              key={day.index}
              className="timeline__day"
              style={{
                left: `${(day.index / lastIndex) * 100}%`,
                transform:
                  day.index === 0
                    ? 'none'
                    : day.index === lastIndex
                      ? 'translateX(-100%)'
                      : 'translateX(-50%)',
              }}
            >
              {day.label}
            </span>
          ))}
        </div>

        <div
          className={`timeline__track${dragging ? ' is-dragging' : ''}`}
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
          role="slider"
          tabIndex={0}
          aria-valuemin={0}
          aria-valuemax={lastIndex}
          aria-valuenow={index}
          aria-valuetext={`${formatDayShort(current.time)}, ${formatTime(current.time)}`}
          aria-label="Время прогноза"
          title={`${formatDayShort(current.time)}, ${formatTime(current.time)}`}
        >
          <div className="timeline__rail" />
          <div className="timeline__progress" style={{ width: `${percent}%` }} />

          {hours.map((hour, hourIndex) =>
            hourIndex % 3 === 0 ? (
              <span
                key={hour.time}
                className="timeline__tick"
                style={{ left: `${(hourIndex / lastIndex) * 100}%` }}
              />
            ) : (
              <span
                key={hour.time}
                className="timeline__tick timeline__tick--minor"
                style={{ left: `${(hourIndex / lastIndex) * 100}%` }}
              />
            ),
          )}

          <span
            className="timeline__now-line"
            style={{ left: `${nowPercent}%` }}
            title="Текущее время"
          />
          <span className="timeline__now-dot" style={{ left: `${nowPercent}%` }} />

          <span className="timeline__thumb" style={{ left: `${percent}%` }}>
            <span className="timeline__bubble" style={{ transform: bubbleTransform }}>
              {formatDayShort(current.time)}, {formatTime(current.time)}
              <ChevronRightIcon size={13} />
            </span>
            <span className="timeline__dot" />
          </span>
        </div>

        <div className="timeline__labels">
          {hours.map((hour, hourIndex) =>
            hourIndex % 3 === 0 ? (
              <span
                key={hour.time}
                className="timeline__label"
                style={{
                  left: `${(hourIndex / lastIndex) * 100}%`,
                  transform:
                    hourIndex === 0
                      ? 'none'
                      : hourIndex === lastIndex
                        ? 'translateX(-100%)'
                        : 'translateX(-50%)',
                }}
              >
                {formatTime(hour.time)}
              </span>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
