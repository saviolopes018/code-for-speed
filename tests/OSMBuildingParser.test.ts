import { describe, it, expect } from 'vitest';
import { parseOSMBuildings, polygonArea } from '../src/world/geo/OSMBuildingParser';
import { GeoProjection } from '../src/world/geo/GeoProjection';
import type { OverpassResponse } from '../src/world/geo/OSMParser';

const origin = { lat: -3.7398314, lon: -38.4871768 };
const proj = new GeoProjection(origin);

// A ~30m square building near the origin (lat/lon offsets ~ a few 1e-4 deg).
function squareBuildingWay(id: number, tags: Record<string, string>) {
  const d = 0.00015; // ~16m
  const nodes = [
    { id: id * 10 + 1, lat: origin.lat + d, lon: origin.lon - d },
    { id: id * 10 + 2, lat: origin.lat + d, lon: origin.lon + d },
    { id: id * 10 + 3, lat: origin.lat - d, lon: origin.lon + d },
    { id: id * 10 + 4, lat: origin.lat - d, lon: origin.lon - d },
  ];
  const wayNodes = [...nodes.map((n) => n.id), nodes[0].id]; // closed ring
  return {
    nodes: nodes.map((n) => ({ type: 'node' as const, id: n.id, lat: n.lat, lon: n.lon })),
    way: { type: 'way' as const, id, nodes: wayNodes, tags },
  };
}

function resp(elements: any[]): OverpassResponse {
  return { elements };
}

describe('parseOSMBuildings', () => {
  it('converts a building way into a normalized, projected footprint', () => {
    const b = squareBuildingWay(1, { building: 'apartments', height: '30' });
    const { buildings, stats } = parseOSMBuildings(resp([...b.nodes, b.way]), proj);
    expect(buildings).toHaveLength(1);
    const built = buildings[0];
    expect(built.id).toBe('1');
    expect(built.family).toBe('apartments');
    expect(built.height).toBe(30);
    expect(built.heightSource).toBe('height');
    // closing duplicate dropped -> 4 unique corners
    expect(built.footprint).toHaveLength(4);
    // footprint is roughly centred on origin (0,0)
    const cx = built.footprint.reduce((s, p) => s + p.x, 0) / 4;
    const cz = built.footprint.reduce((s, p) => s + p.z, 0) / 4;
    expect(Math.abs(cx)).toBeLessThan(1);
    expect(Math.abs(cz)).toBeLessThan(1);
    expect(stats.buildings).toBe(1);
    expect(stats.heightSource.height).toBe(1);
  });

  it('uses building:levels when height is absent', () => {
    const b = squareBuildingWay(2, { building: 'residential', 'building:levels': '4' });
    const { buildings, stats } = parseOSMBuildings(resp([...b.nodes, b.way]), proj);
    expect(buildings[0].heightSource).toBe('levels');
    expect(buildings[0].levels).toBe(4);
    expect(stats.heightSource.levels).toBe(1);
  });

  it('falls back deterministically when no height data exists', () => {
    const b = squareBuildingWay(3, { building: 'house' });
    const r1 = parseOSMBuildings(resp([...b.nodes, b.way]), proj).buildings[0];
    const r2 = parseOSMBuildings(resp([...b.nodes, b.way]), proj).buildings[0];
    expect(r1.heightSource).toBe('fallback');
    expect(r1.height).toBe(r2.height);
  });

  it('skips ways with too few nodes', () => {
    const way = { type: 'way' as const, id: 9, nodes: [1, 2], tags: { building: 'yes' } };
    const { buildings, stats } = parseOSMBuildings(resp([way]), proj);
    expect(buildings).toHaveLength(0);
    expect(stats.skipped.tooFewPoints).toBe(1);
  });

  it('skips degenerate (near-zero area) footprints', () => {
    // A thin sliver: ~11m wide but ~0.02m deep -> area well under MIN_AREA,
    // yet four DISTINCT corners (so it is not a "too few points" skip).
    const dLon = 0.00005; // ~5.5 m
    const dLat = 0.0000002; // ~0.02 m
    const corners = [
      { lon: origin.lon - dLon, lat: origin.lat + dLat },
      { lon: origin.lon + dLon, lat: origin.lat + dLat },
      { lon: origin.lon + dLon, lat: origin.lat - dLat },
      { lon: origin.lon - dLon, lat: origin.lat - dLat },
    ];
    const nodes = corners.map((c, i) => ({
      type: 'node' as const,
      id: 100 + i,
      lat: c.lat,
      lon: c.lon,
    }));
    const way = {
      type: 'way' as const,
      id: 11,
      nodes: [100, 101, 102, 103, 100],
      tags: { building: 'yes' },
    };
    const { buildings, stats } = parseOSMBuildings(resp([...nodes, way]), proj);
    expect(buildings).toHaveLength(0);
    expect(stats.skipped.degenerate).toBe(1);
  });

  it('skips building relations (multipolygon) for this milestone', () => {
    const rel = { type: 'relation' as const, id: 20, tags: { building: 'yes' } };
    const { buildings, stats } = parseOSMBuildings(resp([rel]), proj);
    expect(buildings).toHaveLength(0);
    expect(stats.skipped.complexRelation).toBe(1);
  });

  it('ignores building=no and non-building ways', () => {
    const b = squareBuildingWay(5, { building: 'no' });
    const { buildings } = parseOSMBuildings(resp([...b.nodes, b.way]), proj);
    expect(buildings).toHaveLength(0);
  });

  it('is resilient to empty / malformed input', () => {
    expect(parseOSMBuildings({} as any, proj).buildings).toHaveLength(0);
    expect(parseOSMBuildings(null as any, proj).buildings).toHaveLength(0);
  });
});

describe('polygonArea', () => {
  it('computes area of a 10x10 square', () => {
    const area = Math.abs(
      polygonArea([
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 10, z: 10 },
        { x: 0, z: 10 },
      ]),
    );
    expect(area).toBeCloseTo(100, 5);
  });
});
