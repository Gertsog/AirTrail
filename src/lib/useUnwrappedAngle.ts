import { useEffect, useRef, useState } from 'react';

/** Кратчайшая разница углов в диапазоне (−180, 180]. */
export function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * Держит угол непрерывным при переходе через 360°.
 * Без этого стрелка ветра при смене направления, например, с 359° на 1°
 * делает полный оборот вместо короткого поворота на 2°.
 */
export function useUnwrappedAngle(target: number): number {
  const [angle, setAngle] = useState(target);
  const previousTarget = useRef(target);

  useEffect(() => {
    if (target === previousTarget.current) return;
    const delta = shortestAngleDelta(previousTarget.current, target);
    previousTarget.current = target;
    setAngle((current) => current + delta);
  }, [target]);

  return angle;
}
