import { describe, it, expect } from 'vitest';
import { computeMapBounds, computeOverviewHeight } from '../src/world/geo/MapBounds';
import type { NormalizedRoad } from '../src/world/geo/GeoTypes';

function road(points: [number, number][]): NormalizedRoad {
  return {
    id: 'r',
    highwayType: 'residential',
    width: 7,
    points: points.map(([x, z]) => ({ x, z })),
  };
}

describe('computeMapBounds', () => {
  it('computes min/max, size and centre', () => {
    const b = computeMapBounds([
      road([
        [-100, -50],
        [100, 50],
      ]),
      road([
        [0, 200],
        [50, -200],
      ]),
    ]);
    expect(b.minX).toBe(-100);
    expect(b.maxX).toBe(100);
    expect(b.minZ).toBe(-200);
    expect(b.maxZ).toBe(200);
    expect(b.width).toBe(200);
    expect(b.height).toBe(400);
    expect(b.centerX).toBe(0);
    expect(b.centerZ).toBe(0);
  });

  it('is safe for empty input', () => {
    const b = computeMapBounds([]);
    expect(b.width).toBe(0);
    expect(b.height).toBe(0);
  });

  it('produces plausible ~km-scale dimensions for the Papicu extent', () => {
    // Sanity guard against unit/scale regressions (not 20m, not 200km).
    const b = computeMapBounds([
      road([
        [-1518, -1726],
        [2365, 1224],
      ]),
    ]);
    expect(b.width).toBeGreaterThan(500);
    expect(b.width).toBeLessThan(10000);
    expect(b.height).toBeGreaterThan(500);
    expect(b.height).toBeLessThan(10000);
  });
});

describe('computeOverviewHeight', () => {
  it('scales with map size (bigger map -> higher camera)', () => {
    const small = computeOverviewHeight(1000, 1000, 1.6, 60);
    const big = computeOverviewHeight(4000, 3000, 1.6, 60);
    expect(big).toBeGreaterThan(small);
  });

  it('fits the whole extent (height covers the larger dimension)', () => {
    const h = computeOverviewHeight(4000, 3000, 16 / 9, 60);
    // At this height the visible half-height must exceed half the map height.
    const visibleHalfHeight = h * Math.tan((60 * Math.PI) / 180 / 2);
    expect(visibleHalfHeight).toBeGreaterThan(3000 / 2);
  });

  it('never returns a degenerate/zero height', () => {
    expect(computeOverviewHeight(0, 0, 1.6, 60)).toBeGreaterThan(0);
  });
});
