import { at } from './array';

/** Название румба направления ветра. */
export function windDirectionLabel(degrees: number): string {
  const names = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
  return at(names, index, 'румбы');
}
