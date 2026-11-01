/** Возвращает элемент массива или падает с понятной ошибкой. */
export function at<T>(items: readonly T[], index: number, label = 'массив'): T {
  const value = items[index];
  if (value === undefined) {
    throw new Error(`${label}: нет элемента с индексом ${index}`);
  }
  return value;
}
