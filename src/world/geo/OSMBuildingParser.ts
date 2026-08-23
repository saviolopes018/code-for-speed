import type { LocalPoint, NormalizedBuilding } from './GeoTypes';
import { GeoProjection } from './GeoProjection';
import { classifyBuilding, resolveBuildingHeight } from './BuildingStyle';
import type { OverpassResponse } from './OSMParser';

export interface BuildingParseStats {
  osmBuildingWays: number;
  buildings: number;
  footprintPoints: number;
  heightSource: { height: number; levels: number; fallback: number };
  skipped: {
    missingNodes: number;
    tooFewPoints: number;
    degenerate: number;
    complexRelation: number;
  };
}

export interface BuildingParseResult {
  buildings: NormalizedBuilding[];
  stats: BuildingParseStats;
}

/** Minimum footprint area (m²) to keep — filters junk/point buildings. */
const MIN_AREA = 6;

/**
 * Convert raw OSM building ways into normalized, projected footprints.
 * Robust: one bad building is skipped and counted, never fatal. Multipolygon
 * relations are skipped for this milestone (counted separately).
 */
export function parseOSMBuildings(
  raw: OverpassResponse,
  projection: GeoProjection,
): BuildingParseResult {
  const stats: BuildingParseStats = {
    osmBuildingWays: 0,
    buildings: 0,
    footprintPoints: 0,
    heightSource: { height: 0, levels: 0, fallback: 0 },
    skipped: { missingNodes: 0, tooFewPoints: 0, degenerate: 0, complexRelation: 0 },
  };

  const elements = Array.isArray(raw?.elements) ? raw.elements : [];

  const nodes = new Map<number, { lat: number; lon: number }>();
  for (const el of elements) {
    if (el?.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  const buildings: NormalizedBuilding[] = [];
  for (const el of elements) {
    const tags = el?.tags ?? {};
    const isBuilding = tags.building && tags.building.toLowerCase() !== 'no';
    if (!isBuilding) continue;

    if (el.type === 'relation') {
      stats.skipped.complexRelation++;
      continue;
    }
    if (el.type !== 'way') continue;
    stats.osmBuildingWays++;

    if (!Array.isArray(el.nodes) || el.nodes.length < 4) {
      stats.skipped.tooFewPoints++;
      continue;
    }

    // Resolve nodes -> local points, tolerating (but noting) missing nodes.
    let missing = false;
    const ring: LocalPoint[] = [];
    for (const nodeId of el.nodes) {
      const n = nodes.get(nodeId);
      if (!n) {
        missing = true;
        continue;
      }
      const p = projection.toLocal(n.lat, n.lon);
      if (isFinite(p.x) && isFinite(p.z)) ring.push(p);
    }

    const cleaned = dropClosingDuplicate(dedupeConsecutive(ring));
    if (cleaned.length < 3) {
      if (missing) stats.skipped.missingNodes++;
      else stats.skipped.tooFewPoints++;
      continue;
    }
    if (Math.abs(polygonArea(cleaned)) < MIN_AREA) {
      stats.skipped.degenerate++;
      continue;
    }

    const type = tags.building;
    const family = classifyBuilding(type);
    const resolved = resolveBuildingHeight(
      { height: tags.height, levels: tags['building:levels'] },
      String(el.id),
      family,
    );

    const building: NormalizedBuilding = {
      id: String(el.id),
      footprint: cleaned,
      height: resolved.height,
      type,
      family,
      heightSource: resolved.source,
      source: { osmId: String(el.id) },
    };
    if (resolved.levels != null) building.levels = resolved.levels;

    buildings.push(building);
    stats.footprintPoints += cleaned.length;
    stats.heightSource[resolved.source]++;
  }

  stats.buildings = buildings.length;
  return { buildings, stats };
}

function dedupeConsecutive(ring: LocalPoint[]): LocalPoint[] {
  const out: LocalPoint[] = [];
  for (const p of ring) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 1e-6 || Math.abs(last.z - p.z) > 1e-6) {
      out.push(p);
    }
  }
  return out;
}

function dropClosingDuplicate(ring: LocalPoint[]): LocalPoint[] {
  if (ring.length < 2) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.z - b.z) < 1e-6) {
    return ring.slice(0, -1);
  }
  return ring;
}

/** Shoelace signed area on the XZ plane. */
export function polygonArea(ring: LocalPoint[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}
