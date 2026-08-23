import { describe, it, expect } from 'vitest';
import { parseOSMRoads, type OverpassResponse } from '../src/world/geo/OSMParser';
import { GeoProjection } from '../src/world/geo/GeoProjection';

const origin = { lat: -3.7398314, lon: -38.4871768 };
const proj = new GeoProjection(origin);

function resp(elements: any[]): OverpassResponse {
  return { elements };
}

describe('parseOSMRoads', () => {
  it('converts ways into normalized, projected roads', () => {
    const raw = resp([
      { type: 'node', id: 1, lat: origin.lat, lon: origin.lon },
      { type: 'node', id: 2, lat: origin.lat + 0.001, lon: origin.lon },
      {
        type: 'way',
        id: 100,
        nodes: [1, 2],
        tags: { highway: 'primary', lanes: '2', oneway: 'yes', maxspeed: '60' },
      },
    ]);
    const { roads, stats } = parseOSMRoads(raw, proj);
    expect(roads).toHaveLength(1);
    const r = roads[0];
    expect(r.id).toBe('100');
    expect(r.highwayType).toBe('primary');
    expect(r.points).toHaveLength(2);
    expect(r.lanes).toBe(2);
    expect(r.oneway).toBe(true);
    expect(r.maxSpeed).toBe(60);
    expect(r.points[0].x).toBeCloseTo(0, 5);
    expect(r.points[0].z).toBeCloseTo(0, 5);
    expect(stats.normalizedRoads).toBe(1);
    expect(stats.roadPoints).toBe(2);
  });

  it('filters excluded highway types', () => {
    const raw = resp([
      { type: 'node', id: 1, lat: origin.lat, lon: origin.lon },
      { type: 'node', id: 2, lat: origin.lat + 0.001, lon: origin.lon },
      { type: 'way', id: 1, nodes: [1, 2], tags: { highway: 'footway' } },
      { type: 'way', id: 2, nodes: [1, 2], tags: { highway: 'cycleway' } },
    ]);
    const { roads, stats } = parseOSMRoads(raw, proj);
    expect(roads).toHaveLength(0);
    expect(stats.skipped.excludedType).toBe(2);
  });

  it('skips ways with no highway tag', () => {
    const raw = resp([
      { type: 'node', id: 1, lat: origin.lat, lon: origin.lon },
      { type: 'node', id: 2, lat: origin.lat + 0.001, lon: origin.lon },
      { type: 'way', id: 5, nodes: [1, 2], tags: { building: 'yes' } },
    ]);
    const { roads, stats } = parseOSMRoads(raw, proj);
    expect(roads).toHaveLength(0);
    expect(stats.skipped.notHighway).toBe(1);
  });

  it('tolerates missing nodes without crashing', () => {
    const raw = resp([
      { type: 'node', id: 1, lat: origin.lat, lon: origin.lon },
      // node 2 and 3 are missing
      { type: 'way', id: 7, nodes: [1, 2, 3], tags: { highway: 'residential' } },
    ]);
    const { roads, stats } = parseOSMRoads(raw, proj);
    // Only one valid point remains -> road skipped, counted as missing nodes.
    expect(roads).toHaveLength(0);
    expect(stats.skipped.missingNodes).toBe(1);
  });

  it('keeps the valid part of a partially broken way', () => {
    const raw = resp([
      { type: 'node', id: 1, lat: origin.lat, lon: origin.lon },
      { type: 'node', id: 2, lat: origin.lat + 0.001, lon: origin.lon },
      // node 3 missing but two good points remain
      { type: 'way', id: 8, nodes: [1, 2, 3], tags: { highway: 'residential' } },
    ]);
    const { roads } = parseOSMRoads(raw, proj);
    expect(roads).toHaveLength(1);
    expect(roads[0].points).toHaveLength(2);
  });

  it('is resilient to malformed / empty input', () => {
    expect(parseOSMRoads({} as any, proj).roads).toHaveLength(0);
    expect(parseOSMRoads({ elements: null } as any, proj).roads).toHaveLength(0);
    expect(parseOSMRoads(null as any, proj).roads).toHaveLength(0);
  });
});
