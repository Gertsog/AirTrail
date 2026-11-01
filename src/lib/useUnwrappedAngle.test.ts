import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { shortestAngleDelta, useUnwrappedAngle } from './useUnwrappedAngle';

describe('shortestAngleDelta', () => {
  it('takes the short path across 360°', () => {
    expect(shortestAngleDelta(538, 183)).toBe(5);
    expect(shortestAngleDelta(183, 538)).toBe(-5);
    expect(shortestAngleDelta(359, 1)).toBe(2);
    expect(shortestAngleDelta(1, 359)).toBe(-2);
  });

  it('does not rotate for equal angles', () => {
    expect(shortestAngleDelta(360, 0)).toBe(0);
  });
});

describe('useUnwrappedAngle', () => {
  it('keeps the angle continuous across a wrap', () => {
    const { result, rerender } = renderHook(({ target }) => useUnwrappedAngle(target), {
      initialProps: { target: 538 },
    });
    expect(result.current).toBe(538);

    rerender({ target: 183 });
    expect(result.current).toBe(543);

    rerender({ target: 538 });
    expect(result.current).toBe(538);
  });
});
