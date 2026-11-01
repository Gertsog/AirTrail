import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Rail } from './Rail';
import { DEFAULT_LAYERS } from '../lib/layers';

function renderRail() {
  const props = {
    layers: DEFAULT_LAYERS,
    regionName: 'Тестовый регион',
    onToggleLayer: vi.fn(),
    onRefresh: vi.fn(),
  };
  render(<Rail {...props} />);
  return props;
}

describe('Rail settings', () => {
  it('opens and closes the settings dialog', () => {
    renderRail();
    const gear = screen.getByRole('button', { name: 'Настройки' });
    fireEvent.click(gear);
    expect(screen.getByRole('dialog', { name: 'Настройки карты' })).toBeInTheDocument();
    expect(gear).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть окно настроек' }));
    expect(screen.queryByRole('dialog', { name: 'Настройки карты' })).not.toBeInTheDocument();
    expect(gear).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps focus inside the dialog', () => {
    renderRail();
    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    const dialog = screen.getByRole('dialog', { name: 'Настройки карты' });
    const close = screen.getByRole('button', { name: 'Закрыть окно настроек' });
    const refresh = screen.getByRole('button', { name: /Обновить прогноз/ });

    expect(close).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(refresh).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('toggles layers and refreshes the forecast', () => {
    const props = renderRail();
    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    fireEvent.click(screen.getByLabelText('Тепловая карта шлейфа'));
    expect(props.onToggleLayer).toHaveBeenCalledWith('plume');

    fireEvent.click(screen.getByRole('button', { name: /Обновить прогноз/ }));
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Настройки карты' })).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderRail();
    fireEvent.click(screen.getByRole('button', { name: 'Настройки' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Настройки карты' })).not.toBeInTheDocument();
  });
});
