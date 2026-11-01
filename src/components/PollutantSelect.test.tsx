import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { PollutantId } from '../types';
import { PollutantSelect } from './PollutantSelect';

function setup(value: PollutantId = 'PM2.5') {
  const onChange = vi.fn();
  const utils = render(<PollutantSelect value={value} onChange={onChange} />);
  const trigger = screen.getByRole('button', { name: /Вещество/ });
  return { onChange, trigger, ...utils };
}

describe('PollutantSelect', () => {
  it('opens a DOM listbox and selects a pollutant', () => {
    const { onChange, trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('listbox');
    const options = within(list).getAllByRole('option');
    expect(options).toHaveLength(7);
    expect(within(list).getByRole('option', { name: /PM2\.5/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(list).toHaveAttribute('aria-activedescendant', options[0]?.id);

    fireEvent.click(within(list).getByRole('option', { name: /NO₂/ }));

    expect(onChange).toHaveBeenCalledWith('NO2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates with the keyboard and confirms with Enter', () => {
    const { onChange, trigger } = setup();
    trigger.focus();

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const list = screen.getByRole('listbox');
    expect(list).toHaveFocus();

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    const activeId = list.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId ?? '')?.textContent).toContain('PM10');

    fireEvent.keyDown(list, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('PM10');
    expect(trigger).toHaveFocus();
  });

  it('jumps to the last option with End', () => {
    const { onChange, trigger } = setup('CO');
    fireEvent.click(trigger);
    const list = screen.getByRole('listbox');

    fireEvent.keyDown(list, { key: 'End' });
    const activeId = list.getAttribute('aria-activedescendant');
    expect(document.getElementById(activeId ?? '')?.textContent).toContain('индекс');

    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('AQI');
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    const list = screen.getByRole('listbox');

    fireEvent.keyDown(list, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when clicking outside', () => {
    const { trigger } = setup();
    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
