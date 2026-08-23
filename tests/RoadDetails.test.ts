import { describe, it, expect } from 'vitest';
import { generateRoadDetails } from '../src/world/RoadDetails';
import type { NormalizedRoad } from '../src/world/geo/GeoTypes';

/** A long road so the sparse deterministic placement yields several manholes. */
function longRoad(id: string): NormalizedRoad {
  return {
    id,
    highwayType: 'secondary',
    width: 10,
    points: Array.from({ length: 200 }, (_, i) => ({ x: i * 5, z: 0 })),
  };
}

describe('generateRoadDetails', () => {
  it('is deterministic in count', () => {
    const a = generateRoadDetails([longRoad('way/7')]);
    const b = generateRoadDetails([longRoad('way/7')]);
    expect(a.stats.manholes).toBe(b.stats.manholes);
  });

  it('places at least one manhole on a long wide road', () => {
    const { stats } = generateRoadDetails([longRoad('way/7')]);
    expect(stats.manholes).toBeGreaterThan(0);
  });

  it('skips roads narrower than the minimum width', () => {
    const narrow: NormalizedRoad = {
      id: 'way/9',
      highwayType: 'service',
      width: 4,
      points: Array.from({ length: 200 }, (_, i) => ({ x: i * 5, z: 0 })),
    };
    expect(generateRoadDetails([narrow]).stats.manholes).toBe(0);
  });

  it('respects the hard manhole cap', () => {
    const many = Array.from({ length: 40 }, (_, k) => longRoad(`way/${k}`));
    const { stats } = generateRoadDetails(many);
    expect(stats.manholes).toBeLessThanOrEqual(600);
  });

  // Regression guard: manhole discs must face +Y (up), or FrontSide culling hides
  // them from the top-down and chase cameras.
  it('produces upward-facing (+Y) discs', () => {
    const { mesh, stats } = generateRoadDetails([longRoad('way/7')]);
    expect(stats.manholes).toBeGreaterThan(0);
    const n = mesh.geometry.getAttribute('normal');
    for (let i = 0; i < n.count; i++) {
      expect(n.getY(i)).toBeGreaterThan(0.9);
    }
  });
});
