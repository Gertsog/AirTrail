import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { fetchForecast } from './api/mockBackend';

vi.mock('./api/mockBackend', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/mockBackend')>();
  return {
    ...actual,
    fetchForecast: vi.fn(async () => actual.buildForecast(new Date(2026, 9, 31, 12, 20))),
  };
});

const mapMocks = vi.hoisted(() => ({ flyTo: vi.fn() }));

vi.mock('./components/MapView', () => ({
  MapView: ({
    onMapReady,
  }: {
    onMapReady: (api: { flyTo: (position: unknown, zoom?: number) => void } | null) => void;
  }) => {
    onMapReady({ flyTo: mapMocks.flyTo });
    return <div data-testid="map-view" />;
  },
}));

beforeEach(() => {
  vi.mocked(fetchForecast).mockClear();
  mapMocks.flyTo.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('loads the forecast and switches sidebar tabs', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Шлейфы' })).toBeInTheDocument();
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Результаты расчёта' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Расчёт' }));
    expect(await screen.findByText('Павлодарская ТЭЦ-2')).toBeInTheDocument();
  });

  it('returns to now and opens the mobile sidebar', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 9, 31, 12, 20).getTime());
    render(<App />);
    await screen.findByRole('heading', { name: 'Шлейфы' });

    const cards = document.querySelectorAll<HTMLButtonElement>('.calc-card');
    fireEvent.click(cards[3] as HTMLButtonElement);
    await waitFor(() =>
      expect(document.querySelector('.timeline__track')).toHaveAttribute('aria-valuenow', '3'),
    );

    fireEvent.click(screen.getByRole('button', { name: /^Сейчас/ }));
    await waitFor(() =>
      expect(document.querySelector('.timeline__track')).toHaveAttribute('aria-valuenow', '12'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Открыть панель' }));
    expect(document.querySelector('.sidebar')?.classList.contains('is-open')).toBe(true);
    expect(document.querySelector('.sidebar-scrim')).toBeInTheDocument();

    fireEvent.click(document.querySelector('.sidebar-scrim') as HTMLButtonElement);
    expect(document.querySelector('.sidebar')?.classList.contains('is-open')).toBe(false);
  });

  it('focuses sources and control points on the map', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Шлейфы' });

    fireEvent.click(screen.getByRole('tab', { name: 'Расчёт' }));
    const source = await screen.findByRole('button', { name: /Павлодарская ТЭЦ-2/ });
    fireEvent.click(source);
    expect(mapMocks.flyTo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Контрольные точки' }));
    const point = document.querySelector<HTMLButtonElement>('.point-row');
    fireEvent.click(point as HTMLButtonElement);
    expect(mapMocks.flyTo).toHaveBeenCalledTimes(2);
  });

  it('refreshes the forecast from settings', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Шлейфы' });

    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    fireEvent.click(screen.getByRole('button', { name: /Обновить прогноз/ }));

    expect(fetchForecast).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('heading', { name: 'Шлейфы' })).toBeInTheDocument();
  });

  it('shows the error screen and retries', async () => {
    vi.mocked(fetchForecast).mockRejectedValueOnce(new Error('Сеть недоступна'));

    render(<App />);
    expect(await screen.findByText('Не удалось загрузить данные')).toBeInTheDocument();
    expect(screen.getByText('Сеть недоступна')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Повторить/ }));
    expect(await screen.findByRole('heading', { name: 'Шлейфы' })).toBeInTheDocument();
  });
});
