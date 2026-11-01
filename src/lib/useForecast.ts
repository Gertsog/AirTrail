import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchForecast } from '../api/mockBackend';
import type { ForecastResponse } from '../types';

export type ForecastFetcher = (signal?: AbortSignal) => Promise<ForecastResponse>;

/** Загрузка прогноза с отменой устаревшего запроса и повтором. */
export function useForecast(fetcher: ForecastFetcher = fetchForecast) {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setForecast(null);

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setForecast(data);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'Не удалось загрузить прогноз');
      });

    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  return { forecast, error, reload };
}
