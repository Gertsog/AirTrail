import { useEffect, useMemo, useState } from 'react';
import type { HourlyCalc } from '../types';
import { resolveNowIndex } from './forecast';

/**
 * Текущий часовой слот. Обновляется раз в минуту, чтобы «Сейчас»
 * не оставалось привязанным к моменту загрузки страницы.
 */
export function useCurrentHourIndex(hours: HourlyCalc[], fallback = 0): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(
    () => (hours.length > 0 ? resolveNowIndex(hours, now) : fallback),
    [hours, now, fallback],
  );
}
