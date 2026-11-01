import { useCallback, useEffect, useRef, useState } from 'react';
import type { HourlyCalc } from '../types';

export const PLAYBACK_INTERVAL = 1100;

function hoursSignature(hours: HourlyCalc[]): string {
  if (hours.length === 0) return 'empty';
  const first = hours[0]?.time ?? '';
  const last = hours[hours.length - 1]?.time ?? '';
  return `${hours.length}|${first}|${last}`;
}

/** Выбранный час, воспроизведение и переходы по таймлайну. */
export function usePlayback(
  hours: HourlyCalc[],
  initialIndex: number,
  resetKey: string = hoursSignature(hours),
) {
  const [hourIndex, setHourIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const initialRef = useRef(initialIndex);
  initialRef.current = initialIndex;

  useEffect(() => {
    setPlaying(false);
    setHourIndex(initialRef.current);
  }, [resetKey]);

  useEffect(() => {
    if (!playing || hours.length === 0) return undefined;
    const timer = window.setInterval(() => {
      setHourIndex((current) => Math.min(current + 1, hours.length - 1));
    }, PLAYBACK_INTERVAL);
    return () => window.clearInterval(timer);
  }, [playing, hours.length]);

  useEffect(() => {
    if (playing && hours.length > 0 && hourIndex >= hours.length - 1) {
      setPlaying(false);
    }
  }, [playing, hourIndex, hours.length]);

  const selectHour = useCallback((index: number) => {
    setPlaying(false);
    setHourIndex(index);
  }, []);

  const scrub = useCallback((index: number) => {
    setPlaying(false);
    setHourIndex(index);
  }, []);

  const togglePlay = useCallback(() => {
    if (hours.length === 0) return;
    if (playing) {
      setPlaying(false);
      return;
    }
    if (hourIndex >= hours.length - 1) setHourIndex(0);
    setPlaying(true);
  }, [hours.length, playing, hourIndex]);

  const goToNow = useCallback((index: number) => {
    setPlaying(false);
    setHourIndex(index);
  }, []);

  return { hourIndex, playing, selectHour, scrub, togglePlay, goToNow };
}
