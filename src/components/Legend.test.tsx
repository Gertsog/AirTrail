import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Legend } from './Legend';

describe('Legend', () => {
  it('renders 9 bands and 10 labels for PM2.5', () => {
    const { container } = render(<Legend pollutant="PM2.5" />);
    expect(container.querySelectorAll('.legend__cell')).toHaveLength(9);
    expect(container.querySelectorAll('.legend__labels span')).toHaveLength(10);
    expect(container.textContent).toContain('Взвешенные частицы PM2.5');
  });

  it('renders 6 bands and 7 labels for AQI', () => {
    const { container } = render(<Legend pollutant="AQI" />);
    expect(container.querySelectorAll('.legend__cell')).toHaveLength(6);
    expect(container.querySelectorAll('.legend__labels span')).toHaveLength(7);
    expect(container.textContent).toContain('Индекс качества воздуха');
  });
});
