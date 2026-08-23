import { describe, it, expect } from 'vitest';
import {
  ASPHALT_VARIANTS,
  hashId,
  resolveSurfaceVariant,
  VARIANT_MATERIAL,
} from '../src/world/RoadSurfaceVariant';

describe('hashId', () => {
  it('is deterministic and stable', () => {
    expect(hashId('123')).toBe(hashId('123'));
    expect(hashId('way/456')).toBe(hashId('way/456'));
  });

  it('returns a uint32', () => {
    for (const id of ['a', 'way/1', 'way/9999999', '']) {
      const h = hashId(id);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('separates different ids', () => {
    expect(hashId('way/1')).not.toBe(hashId('way/2'));
  });
});

describe('resolveSurfaceVariant', () => {
  it('always returns a known variant', () => {
    for (let i = 0; i < 200; i++) {
      const v = resolveSurfaceVariant({ id: `way/${i}`, highwayType: 'residential' });
      expect(ASPHALT_VARIANTS).toContain(v);
    }
  });

  it('is deterministic for the same road', () => {
    const road = { id: 'way/42', highwayType: 'secondary' };
    expect(resolveSurfaceVariant(road)).toBe(resolveSurfaceVariant(road));
  });

  it('biases arterials cleaner than service roads across a population', () => {
    const rank = (v: string) => ASPHALT_VARIANTS.indexOf(v as never);
    let primarySum = 0;
    let serviceSum = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      primarySum += rank(resolveSurfaceVariant({ id: `way/${i}`, highwayType: 'primary' }));
      serviceSum += rank(resolveSurfaceVariant({ id: `way/${i}`, highwayType: 'service' }));
    }
    // Higher rank index = more worn; service should average more worn than primary.
    expect(serviceSum).toBeGreaterThan(primarySum);
  });

  it('falls back to a valid variant for unknown classes', () => {
    const v = resolveSurfaceVariant({ id: 'way/1', highwayType: 'nonsense' });
    expect(ASPHALT_VARIANTS).toContain(v);
  });

  it('has material params for every variant', () => {
    for (const v of ASPHALT_VARIANTS) {
      const p = VARIANT_MATERIAL[v];
      expect(p.roughness).toBeGreaterThan(0);
      expect(p.roughness).toBeLessThanOrEqual(1);
      expect(p.normalScale).toBeGreaterThan(0);
    }
  });
});
