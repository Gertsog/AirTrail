import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLayers } from './useLayers';

describe('useLayers', () => {
  it('toggles a layer without mutating the rest', () => {
    const { result } = renderHook(() => useLayers());
    expect(result.current.layers.plume).toBe(true);
    expect(result.current.layers.points).toBe(true);

    act(() => result.current.toggleLayer('plume'));
    expect(result.current.layers.plume).toBe(false);
    expect(result.current.layers.points).toBe(true);

    act(() => result.current.toggleLayer('plume'));
    expect(result.current.layers.plume).toBe(true);
  });

  it('keeps wind enabled when reduced motion is off', () => {
    const { result } = renderHook(() => useLayers());
    expect(result.current.layers.wind).toBe(true);
  });
});
