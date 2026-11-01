import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { buildForecast } from '../api/mockBackend';
import { useForecast } from './useForecast';

const forecast = buildForecast(new Date(2026, 9, 31, 12));

describe('useForecast', () => {
  it('loads a forecast', async () => {
    const fetcher = vi.fn(async () => forecast);
    const { result } = renderHook(() => useForecast(fetcher));

    expect(result.current.forecast).toBeNull();
    await waitFor(() => expect(result.current.forecast).toBe(forecast));
    expect(result.current.error).toBeNull();
  });

  it('reports an error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('Сеть недоступна');
    });
    const { result } = renderHook(() => useForecast(fetcher));

    await waitFor(() => expect(result.current.error).toBe('Сеть недоступна'));
    expect(result.current.forecast).toBeNull();
  });

  it('retries via reload', async () => {
    const second = buildForecast(new Date(2026, 9, 31, 13));
    const fetcher = vi.fn().mockResolvedValueOnce(forecast).mockResolvedValueOnce(second);
    const { result } = renderHook(() => useForecast(fetcher));
    await waitFor(() => expect(result.current.forecast).toBe(forecast));

    act(() => result.current.reload());
    await waitFor(() => expect(result.current.forecast).toBe(second));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not refetch when the fetcher identity changes', async () => {
    const firstFetcher = vi.fn(async () => forecast);
    const secondFetcher = vi.fn(async () => forecast);
    const { result, rerender } = renderHook(({ fetcher }) => useForecast(fetcher), {
      initialProps: { fetcher: firstFetcher },
    });
    await waitFor(() => expect(result.current.forecast).toBe(forecast));

    rerender({ fetcher: secondFetcher });
    expect(firstFetcher).toHaveBeenCalledTimes(1);
    expect(secondFetcher).not.toHaveBeenCalled();

    act(() => result.current.reload());
    await waitFor(() => expect(secondFetcher).toHaveBeenCalledTimes(1));
  });

  it('aborts the request on unmount', async () => {
    let signal: AbortSignal | undefined;
    const fetcher = vi.fn((nextSignal?: AbortSignal) => {
      signal = nextSignal;
      return new Promise<typeof forecast>(() => undefined);
    });
    const { unmount } = renderHook(() => useForecast(fetcher));

    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
