import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { buildForecast } from '../api/mockBackend';
import { Sidebar } from './Sidebar';

const forecast = buildForecast(new Date(2026, 9, 31, 12));

function renderSidebar(tab: 'results' | 'calc' | 'points' = 'results') {
  const onTabChange = vi.fn();
  const view = render(
    <Sidebar
      forecast={forecast}
      hourIndex={12}
      pollutant="PM2.5"
      tab={tab}
      activeSourceId={forecast.sources[0]?.id ?? null}
      nowIndex={12}
      open={false}
      onClose={vi.fn()}
      onTabChange={onTabChange}
      onSelectHour={vi.fn()}
      onSelectSource={vi.fn()}
      onFocusPoint={vi.fn()}
      onFocusSource={vi.fn()}
    />,
  );
  return { onTabChange, ...view };
}

describe('Sidebar', () => {
  it('exposes accessible tabs', () => {
    const { onTabChange } = renderSidebar();
    expect(screen.getByRole('tab', { name: 'Результаты расчёта' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Расчёт' }));
    expect(onTabChange).toHaveBeenCalledWith('calc');
  });

  it('renders the results list', () => {
    const { container } = renderSidebar('results');
    expect(container.querySelectorAll('.calc-card')).toHaveLength(48);
    expect(screen.getByText('Сейчас на карте')).toBeInTheDocument();
  });

  it('renders sources and calculation parameters', () => {
    renderSidebar('calc');
    expect(screen.getByText('Павлодарская ТЭЦ-2')).toBeInTheDocument();
    expect(screen.getByText('Павлодарская ТЭЦ-3')).toBeInTheDocument();
    expect(screen.getByText('Параметры расчёта')).toBeInTheDocument();
  });

  it('renders all control points', () => {
    renderSidebar('points');
    expect(document.querySelectorAll('.point-row')).toHaveLength(forecast.controlPoints.length);
    expect(screen.getByText('Химгородок')).toBeInTheDocument();
  });
});
