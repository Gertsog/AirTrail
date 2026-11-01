import type { ControlPoint, EmissionSource, ForecastResponse, PollutantId } from '../../types';
import { EMISSION_IDS, formatValue, POLLUTANT_ORDER, POLLUTANTS } from '../../lib/pollutants';
import { formatDayShort, formatTime } from '../../lib/format';
import { at } from '../../lib/array';

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export function sourcePopupHtml(source: EmissionSource): string {
  const rows = EMISSION_IDS.map(
    (id) =>
      `<div class="popup__row"><span>${POLLUTANTS[id].label}</span><b>${formatValue(
        POLLUTANTS[id],
        source.emissions[id],
      )} г/с</b></div>`,
  ).join('');

  return `
    <div class="popup">
      <div class="popup__eyebrow">Источник выбросов</div>
      <div class="popup__title">${escapeHtml(source.name)}</div>
      <div class="popup__meta">Труба ${source.stackHeight} м · Ø ${source.stackDiameter} м · ${source.exitVelocity} м/с · ${source.temperature} °C</div>
      <div class="popup__grid">${rows}</div>
    </div>`;
}

export function pointPopupHtml(
  point: ControlPoint,
  forecast: ForecastResponse,
  hourIndex: number,
  pollutant: PollutantId,
): string {
  const hour = at(forecast.hours, hourIndex, 'часы прогноза');
  const reading = hour.readings.find((item) => item.pointId === point.id);
  const rows = POLLUTANT_ORDER.map((id) => {
    const config = POLLUTANTS[id];
    const value = reading?.values[id] ?? 0;
    const active = id === pollutant ? ' popup__row--active' : '';
    return `<div class="popup__row${active}"><span>${config.label}</span><b>${formatValue(
      config,
      value,
    )} ${config.unit}</b></div>`;
  }).join('');

  return `
    <div class="popup">
      <div class="popup__eyebrow">Контрольная точка</div>
      <div class="popup__title">${escapeHtml(point.name)}</div>
      <div class="popup__meta">${formatTime(hour.time)} · ${formatDayShort(hour.time)} · ветер ${hour.wind.windSpeed.toFixed(1)} м/с</div>
      <div class="popup__grid">${rows}</div>
    </div>`;
}
