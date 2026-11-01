import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { HourlyCalc } from '../types';
import { Timeline } from './Timeline';

const hours: HourlyCalc[] = Array.from({ length: 4 }, (_, index) => {
  const time = new Date(2026, 9, 31, 10 + index, 0).toISOString();
  return {
    time,
    wind: {
      time,
      windSpeed: 3,
      windDirection: 0,
      temperature: 0,
      stability: 'D',
    },
    readings: [],
  };
});

function renderTimeline(overrides: Partial<Parameters<typeof Timeline>[0]> = {}) {
  const onIndexChange = vi.fn();
  const onTogglePlay = vi.fn();
  render(
    <Timeline
      hours={hours}
      index={1}
      nowIndex={1}
      playing={false}
      onIndexChange={onIndexChange}
      onTogglePlay={onTogglePlay}
      {...overrides}
    />,
  );
  return { onIndexChange, onTogglePlay };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Timeline', () => {
  it('scrubs by pointer drag', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 400,
      top: 0,
      right: 500,
      bottom: 40,
      height: 40,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });
    const { onIndexChange } = renderTimeline();
    const slider = screen.getByRole('slider', { name: 'Время прогноза' });
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    slider.setPointerCapture = setPointerCapture;
    slider.hasPointerCapture = vi.fn(() => true);
    slider.releasePointerCapture = releasePointerCapture;

    fireEvent.pointerDown(slider, { clientX: 100, button: 0, pointerId: 1 });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    expect(setPointerCapture).toHaveBeenCalledWith(1);

    fireEvent.pointerMove(slider, { clientX: 300, pointerId: 1 });
    expect(onIndexChange).toHaveBeenLastCalledWith(2);

    fireEvent.pointerUp(slider, { clientX: 300, pointerId: 1 });
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('supports keyboard navigation', () => {
    const { onIndexChange } = renderTimeline();
    const slider = screen.getByRole('slider', { name: 'Время прогноза' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onIndexChange).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onIndexChange).toHaveBeenLastCalledWith(0);

    fireEvent.keyDown(slider, { key: 'End' });
    expect(onIndexChange).toHaveBeenLastCalledWith(3);
  });

  it('exposes the selected time as aria-valuetext', () => {
    renderTimeline();
    const slider = screen.getByRole('slider', { name: 'Время прогноза' });
    expect(slider).toHaveAttribute('aria-valuetext');
    expect(slider.getAttribute('aria-valuetext')).not.toBe('');
  });

  it('toggles playback', () => {
    const { onTogglePlay } = renderTimeline();
    fireEvent.click(screen.getByRole('button', { name: 'Проиграть прогноз' }));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });
});
