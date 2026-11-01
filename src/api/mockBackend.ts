import type { ForecastResponse, HourlyCalc } from '../types';
import { clamp } from '../lib/math';
import { parseForecast } from '../lib/validateForecast';
import { CONTROL_POINTS, HOURS, PAST_HOURS, REGION, SOURCES } from './fixtures';
import { makeReadings } from './readings';
import { makeWind, mulberry32 } from './wind';

/**
 * Мок-бэкенд. Чтобы подключить реальный сервер, замените fetchForecast()
 * на fetch('/api/forecast') и пропустите ответ через parseForecast().
 */
export function buildForecast(now = new Date()): ForecastResponse {
  const rng = mulberry32(20261030);
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() - PAST_HOURS);

  const hours: HourlyCalc[] = [];
  for (let i = 0; i < HOURS; i += 1) {
    const date = new Date(start.getTime() + i * 3_600_000);
    const wind = makeWind(date, i, rng);
    hours.push({
      time: date.toISOString(),
      wind,
      readings: makeReadings(wind, rng),
    });
  }

  const nowIndex = Math.floor((now.getTime() - start.getTime()) / 3_600_000);
  return {
    generatedAt: now.toISOString(),
    region: REGION,
    sources: SOURCES,
    controlPoints: CONTROL_POINTS,
    hours,
    nowIndex: clamp(nowIndex, 0, HOURS - 1),
  };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Запрос отменён', 'AbortError'));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Запрос отменён', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function fetchForecast(signal?: AbortSignal): Promise<ForecastResponse> {
  // Имитация сетевой задержки, чтобы были видны состояния загрузки.
  await delay(420 + Math.random() * 280, signal);
  if (signal?.aborted) throw new DOMException('Запрос отменён', 'AbortError');
  return parseForecast(buildForecast());
}
