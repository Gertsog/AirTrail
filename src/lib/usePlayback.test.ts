import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { HourlyCalc } from '../types';
import { PLAYBACK_INTERVAL, usePlayback } from './usePlayback';

const hours: HourlyCalc[] = Array.from({ length: 4 }, (_, index) => {
  const time = new Date(2026, 9, 31, 10 + index).toISOString();
  return {
    time,
    wind: { time, windSpeed: 3, windDirection: 0, temperature: 0, stability: 'D' },
    readings: [],
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlayback', () => {
  it('starts at the provided index', () => {
    const { result } = renderHook(() => usePlayback(hours, 2));
    expect(result.current.hourIndex).toBe(2);
    expect(result.current.playing).toBe(false);
  });

  it('advances and stops at the last hour', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePlayback(hours, 1));

    act(() => result.current.togglePlay());
    expect(result.current.playing).toBe(true);

    act(() => vi.advanceTimersByTime(PLAYBACK_INTERVAL));
    expect(result.current.hourIndex).toBe(2);

    act(() => vi.advanceTimersByTime(PLAYBACK_INTERVAL * 2));
    expect(result.current.hourIndex).toBe(3);
    expect(result.current.playing).toBe(false);
  });

  it('stops on manual selection and scrubbing', () => {
    const { result } = renderHook(() => usePlayback(hours, 1));
    act(() => result.current.togglePlay());
    act(() => result.current.selectHour(2));
    expect(result.current.playing).toBe(false);
    expect(result.current.hourIndex).toBe(2);

    act(() => result.current.togglePlay());
    act(() => result.current.scrub(0));
    expect(result.current.playing).toBe(false);
    expect(result.current.hourIndex).toBe(0);
  });

  it('does not reset on a new array with the same content', () => {
    const { result, rerender } = renderHook(({ value }) => usePlayback(value, 1), {
      initialProps: { value: hours },
    });
    act(() => result.current.selectHour(3));
    rerender({ value: hours.map((hour) => ({ ...hour })) });
    expect(result.current.hourIndex).toBe(3);
  });

  it('resets for a new forecast reset key', () => {
    const { result, rerender } = renderHook(
      ({ value, resetKey }) => usePlayback(value, 1, resetKey),
      { initialProps: { value: hours, resetKey: 'first' } },
    );
    act(() => result.current.selectHour(3));
    rerender({ value: hours, resetKey: 'second' });
    expect(result.current.hourIndex).toBe(1);
  });

  it('returns to now and restarts from zero at the end', () => {
    const { result } = renderHook(() => usePlayback(hours, 3));
    act(() => result.current.goToNow(1));
    expect(result.current.hourIndex).toBe(1);

    act(() => result.current.selectHour(3));
    act(() => result.current.togglePlay());
    expect(result.current.hourIndex).toBe(0);
    expect(result.current.playing).toBe(true);
  });
});
