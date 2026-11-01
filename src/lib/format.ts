const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
});

const dayShortFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
});

const dateKeyFormatter = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const clean = (value: string): string => value.replace(/\.$/, '').replace(/\s+/g, ' ').trim();

/** Русская форма множественного числа: 1 час, 2 часа, 5 часов. */
export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatDayShort(iso: string): string {
  return clean(dayShortFormatter.format(new Date(iso)));
}

export function formatDayKey(iso: string): string {
  return dateKeyFormatter.format(new Date(iso));
}

export function formatNumber(value: number, decimals = 0): string {
  return value
    .toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    .replace(/\u00a0/g, ' ');
}

/** Прогнозный интервал: один час, как и шаг данных. */
export function formatHourRange(iso: string): string {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return `${formatTime(start.toISOString())} – ${formatTime(end.toISOString())}`;
}

/** Время «расчёта» — за 4 ч 30 мин до прогнозного часа, как в референсе. */
export function calculationTime(iso: string): string {
  const date = new Date(new Date(iso).getTime() - 4.5 * 3_600_000);
  return `от ${formatTime(date.toISOString())} ${formatDayShort(date.toISOString())}`;
}

export function forecastTime(iso: string): string {
  return `${formatHourRange(iso)} ${formatDayShort(iso)}`;
}

export function formatTimelineDay(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${clean(
    new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date),
  )}`;
}

export function formatDateRange(fromIso: string, toIso: string): string {
  const fromYear = new Date(fromIso).getFullYear();
  const toYear = new Date(toIso).getFullYear();
  if (fromYear !== toYear) {
    return `${formatDayShort(fromIso)} ${fromYear} – ${formatDayShort(toIso)} ${toYear}`;
  }
  return `${formatDayShort(fromIso)} – ${formatDayShort(toIso)} ${toYear}`;
}
