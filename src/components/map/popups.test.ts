import { describe, expect, it } from 'vitest';
import { buildForecast } from '../../api/mockBackend';
import { at } from '../../lib/array';
import { pointPopupHtml, sourcePopupHtml } from './popups';

const forecast = buildForecast(new Date(2026, 9, 31, 12));
const source = at(forecast.sources, 0);
const point = at(forecast.controlPoints, 0);

describe('popups', () => {
  it('renders source emissions without an AQI row', () => {
    const html = sourcePopupHtml(source);
    expect(html).toContain(source.name);
    expect(html).toContain('PM2.5');
    expect(html).toContain('г/с');
    expect(html).not.toContain('AQI');
  });

  it('escapes HTML in names', () => {
    const html = sourcePopupHtml({ ...source, name: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders all pollutant values for a point', () => {
    const html = pointPopupHtml(point, forecast, 12, 'PM2.5');
    expect(html).toContain(point.name);
    expect(html).toContain('AQI');
    expect(html).toContain('мкг/м³');
  });
});
