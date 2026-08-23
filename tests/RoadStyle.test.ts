import { describe, it, expect } from 'vitest';
import { isDrivableHighway, resolveRoadWidth } from '../src/world/geo/RoadStyle';

describe('isDrivableHighway', () => {
  it('keeps drivable road classes', () => {
    for (const t of ['motorway', 'primary', 'secondary', 'residential', 'service', 'unclassified']) {
      expect(isDrivableHighway(t)).toBe(true);
    }
  });

  it('excludes non-car paths', () => {
    for (const t of ['footway', 'path', 'steps', 'cycleway', 'pedestrian']) {
      expect(isDrivableHighway(t)).toBe(false);
    }
  });

  it('rejects missing/empty type', () => {
    expect(isDrivableHighway(undefined)).toBe(false);
    expect(isDrivableHighway('')).toBe(false);
  });
});

describe('resolveRoadWidth', () => {
  it('gives wider roads to higher classes', () => {
    expect(resolveRoadWidth('primary')).toBeGreaterThan(resolveRoadWidth('residential'));
    expect(resolveRoadWidth('residential')).toBeGreaterThan(resolveRoadWidth('service'));
  });

  it('prefers explicit OSM width', () => {
    expect(resolveRoadWidth('residential', { width: 11 })).toBe(11);
  });

  it('uses lane count when it widens beyond the class default', () => {
    // 4 lanes * 3.2 = 12.8 > secondary default (10)
    expect(resolveRoadWidth('secondary', { lanes: 4 })).toBeCloseTo(12.8, 5);
  });

  it('keeps the class default as a floor for skinny lane tags', () => {
    // primary default (12) must win over a one-way lanes=1 (3.2)
    expect(resolveRoadWidth('primary', { lanes: 1 })).toBe(12);
    // an arterial is never narrower than a residential street
    expect(resolveRoadWidth('primary', { lanes: 1 })).toBeGreaterThan(
      resolveRoadWidth('residential'),
    );
  });

  it('falls back to a per-class default and stays in a sane range', () => {
    const w = resolveRoadWidth('tertiary');
    expect(w).toBeGreaterThan(0);
    expect(resolveRoadWidth('residential', { width: 999 })).toBeLessThanOrEqual(30);
    expect(resolveRoadWidth('residential', { width: -5 })).toBeGreaterThan(0);
  });

  it('handles an unknown class', () => {
    expect(resolveRoadWidth('someNewThing')).toBeGreaterThan(0);
  });
});
