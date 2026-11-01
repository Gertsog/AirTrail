import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchForecast } from './mockBackend';

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchForecast', () => {
  it('returns a valid forecast after the simulated delay', async () => {
    vi.useFakeTimers();
    const promise = fetchForecast();
    await vi.advanceTimersByTimeAsync(1000);
    const forecast = await promise;
    expect(forecast.hours).toHaveLength(48);
    expect(forecast.sources.length).toBeGreaterThan(0);
  });

  it('rejects immediately when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(fetchForecast(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('rejects when aborted during the delay', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = fetchForecast(controller.signal);
    const expectation = expect(promise).rejects.toThrow('отменён');
    controller.abort();
    await expectation;
  });
});
