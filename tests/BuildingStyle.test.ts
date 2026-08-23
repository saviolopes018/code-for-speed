import { describe, it, expect } from 'vitest';
import {
  FLOOR_HEIGHT,
  classifyBuilding,
  hash01,
  resolveBuildingHeight,
} from '../src/world/geo/BuildingStyle';

describe('classifyBuilding', () => {
  it('maps OSM building values to families', () => {
    expect(classifyBuilding('house')).toBe('house');
    expect(classifyBuilding('detached')).toBe('house');
    expect(classifyBuilding('apartments')).toBe('apartments');
    expect(classifyBuilding('residential')).toBe('residential');
    expect(classifyBuilding('retail')).toBe('commercial');
    expect(classifyBuilding('warehouse')).toBe('industrial');
    expect(classifyBuilding('yes')).toBe('generic');
    expect(classifyBuilding(undefined)).toBe('generic');
  });
});

describe('hash01', () => {
  it('is deterministic and in [0,1)', () => {
    const a = hash01('123');
    const b = hash01('123');
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(hash01('123')).not.toBe(hash01('124'));
  });
});

describe('resolveBuildingHeight', () => {
  it('uses explicit height when present', () => {
    const r = resolveBuildingHeight({ height: '24' }, '1', 'apartments');
    expect(r.source).toBe('height');
    expect(r.height).toBe(24);
  });

  it('tolerates "12 m" style height strings', () => {
    const r = resolveBuildingHeight({ height: '12 m' }, '1', 'generic');
    expect(r.source).toBe('height');
    expect(r.height).toBe(12);
  });

  it('derives height from building:levels', () => {
    const r = resolveBuildingHeight({ levels: '5' }, '1', 'apartments');
    expect(r.source).toBe('levels');
    expect(r.levels).toBe(5);
    expect(r.height).toBeCloseTo(5 * FLOOR_HEIGHT, 5);
  });

  it('falls back deterministically per building id', () => {
    const a = resolveBuildingHeight({}, 'way/42', 'residential');
    const b = resolveBuildingHeight({}, 'way/42', 'residential');
    expect(a.source).toBe('fallback');
    expect(a.height).toBe(b.height); // same id -> same height, always
  });

  it('keeps fallback heights within the family range', () => {
    for (let i = 0; i < 50; i++) {
      const h = resolveBuildingHeight({}, `id-${i}`, 'house').height;
      expect(h).toBeGreaterThanOrEqual(3);
      expect(h).toBeLessThanOrEqual(6);
    }
  });

  it('different families use different ranges', () => {
    // apartments (15..45) should generally tower over houses (3..6)
    const house = resolveBuildingHeight({}, 'x', 'house').height;
    const apt = resolveBuildingHeight({}, 'x', 'apartments').height;
    expect(apt).toBeGreaterThan(house);
  });
});
