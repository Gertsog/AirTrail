import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { buildForecast } from '../api/mockBackend';
import { DEFAULT_LAYERS } from '../lib/layers';
import { TopBar } from './TopBar';

const forecast = buildForecast(new Date(2026, 9, 31, 12));

function setup() {
  const handlers = {
    onPollutantChange: vi.fn(),
    onToggleLayer: vi.fn(),
    onNow: vi.fn(),
  };

  render(
    <TopBar
      forecast={forecast}
      hourIndex={12}
      nowIndex={12}
      pollutant="PM2.5"
      layers={DEFAULT_LAYERS}
      {...handlers}
    />,
  );

  return handlers;
}

describe('TopBar', () => {
  it('toggles map layers and returns to now', () => {
    const { onToggleLayer, onNow } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Трубы' }));
    expect(onToggleLayer).toHaveBeenCalledWith('sources');

    fireEvent.click(screen.getByRole('button', { name: /^Сейчас/ }));
    expect(onNow).toHaveBeenCalledTimes(1);
  });

  it('changes the pollutant through the custom list', () => {
    const { onPollutantChange } = setup();

    fireEvent.click(screen.getByRole('button', { name: /Вещество/ }));
    fireEvent.click(screen.getByRole('option', { name: /NO₂/ }));

    expect(onPollutantChange).toHaveBeenCalledWith('NO2');
  });

  it('shows the wind direction, speed and stability', () => {
    setup();

    expect(screen.getByTitle(/Ветер/)).toBeInTheDocument();
  });
});
