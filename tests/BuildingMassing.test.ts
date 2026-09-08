import { describe, expect, it } from 'vitest';
import { generateBuildings } from '../src/world/BuildingMassing';
import type { NormalizedBuilding } from '../src/world/geo/GeoTypes';

const building: NormalizedBuilding = {
  id: 'test', family: 'residential', height: 9.3, heightSource: 'height',
  footprint: [{ x: 10, z: 10 }, { x: 20, z: 10 }, { x: 20, z: 20 }, { x: 10, z: 20 }],
};

describe('building facades', () => {
  it('preserves the footprint and height while keeping roofs free of window repeats', () => {
    const { meshes } = generateBuildings([building]);
    const geo = meshes[0].geometry;
    geo.computeBoundingBox();
    expect(geo.boundingBox!.min.x).toBeCloseTo(10);
    expect(geo.boundingBox!.min.y).toBeCloseTo(0);
    expect(geo.boundingBox!.min.z).toBeCloseTo(10);
    expect(geo.boundingBox!.max.y).toBeCloseTo(9.3);
    const normal = geo.getAttribute('normal');
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < normal.count; i++) {
      expect(Number.isFinite(uv.getX(i))).toBe(true);
      if (normal.getY(i) > 0.5) {
        expect(uv.getX(i)).toBeCloseTo(0.03);
        expect(uv.getY(i)).toBeCloseTo(0.5);
      }
    }
  });

  it('shares the family mesh and generates stable per-building colors', () => {
    const buildings = [building, { ...building, id: 'another' }];
    const first = generateBuildings(buildings);
    const second = generateBuildings(buildings);
    expect(first.stats.buildings).toBe(2);
    expect(first.meshes).toHaveLength(1);
    expect(first.meshes[0].geometry.getAttribute('color').array)
      .toEqual(second.meshes[0].geometry.getAttribute('color').array);
  });
});
