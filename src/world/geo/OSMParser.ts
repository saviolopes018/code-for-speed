import type { NormalizedRoad } from './GeoTypes';
import { GeoProjection } from './GeoProjection';
import { isDrivableHighway, resolveRoadWidth } from './RoadStyle';

/** Minimal shape of an Overpass `out:json` response. */
export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  nodes?: number[];
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements?: OverpassElement[];
}

export interface ParseStats {
  osmElements: number;
  osmNodes: number;
  osmWays: number;
  normalizedRoads: number;
  roadPoints: number;
  skipped: {
    notHighway: number;
    excludedType: number;
    missingNodes: number;
    tooFewPoints: number;
    invalidCoords: number;
  };
}

export interface ParseResult {
  roads: NormalizedRoad[];
  stats: ParseStats;
}

/**
 * Convert a raw Overpass/OSM JSON response into normalized, projected roads.
 * Robust to malformed input: a single bad way is skipped (and counted), never
 * fatal. Raw OSM never leaves this module.
 */
export function parseOSMRoads(
  raw: OverpassResponse,
  projection: GeoProjection,
): ParseResult {
  const stats: ParseStats = {
    osmElements: 0,
    osmNodes: 0,
    osmWays: 0,
    normalizedRoads: 0,
    roadPoints: 0,
    skipped: {
      notHighway: 0,
      excludedType: 0,
      missingNodes: 0,
      tooFewPoints: 0,
      invalidCoords: 0,
    },
  };

  const elements = Array.isArray(raw?.elements) ? raw.elements : [];
  stats.osmElements = elements.length;

  // 1. Index nodes by id.
  const nodes = new Map<number, { lat: number; lon: number }>();
  for (const el of elements) {
    if (el?.type === 'node' && typeof el.lat === 'number' && typeof el.lon === 'number') {
      nodes.set(el.id, { lat: el.lat, lon: el.lon });
      stats.osmNodes++;
    }
  }

  // 2. Build roads from ways.
  const roads: NormalizedRoad[] = [];
  for (const el of elements) {
    if (el?.type !== 'way') continue;
    stats.osmWays++;

    const tags = el.tags ?? {};
    const highwayType = tags.highway;
    if (!highwayType) {
      stats.skipped.notHighway++;
      continue;
    }
    if (!isDrivableHighway(highwayType)) {
      stats.skipped.excludedType++;
      continue;
    }
    if (!Array.isArray(el.nodes) || el.nodes.length < 2) {
      stats.skipped.missingNodes++;
      continue;
    }

    const points: { x: number; z: number }[] = [];
    let missing = false;
    for (const nodeId of el.nodes) {
      const n = nodes.get(nodeId);
      if (!n) {
        missing = true;
        continue; // tolerate a missing node, keep the rest of the polyline
      }
      const local = projection.toLocal(n.lat, n.lon);
      if (!isFinite(local.x) || !isFinite(local.z)) {
        stats.skipped.invalidCoords++;
        continue;
      }
      points.push(local);
    }

    if (points.length < 2) {
      if (missing) stats.skipped.missingNodes++;
      else stats.skipped.tooFewPoints++;
      continue;
    }

    const lanes = parseIntTag(tags.lanes);
    const road: NormalizedRoad = {
      id: String(el.id),
      highwayType,
      points,
      width: resolveRoadWidth(highwayType, {
        width: parseFloatTag(tags.width),
        lanes,
      }),
    };
    if (lanes != null) road.lanes = lanes;
    const oneway = parseOneway(tags.oneway);
    if (oneway != null) road.oneway = oneway;
    const maxSpeed = parseMaxSpeed(tags.maxspeed);
    if (maxSpeed != null) road.maxSpeed = maxSpeed;

    roads.push(road);
    stats.roadPoints += points.length;
  }

  stats.normalizedRoads = roads.length;
  return { roads, stats };
}

function parseIntTag(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const n = parseInt(v, 10);
  return isFinite(n) && n > 0 ? n : undefined;
}

function parseFloatTag(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const n = parseFloat(v); // tolerates "7.5 m"
  return isFinite(n) && n > 0 ? n : undefined;
}

function parseOneway(v: string | undefined): boolean | undefined {
  if (v == null) return undefined;
  const s = v.toLowerCase();
  if (s === 'yes' || s === 'true' || s === '1' || s === '-1') return true;
  if (s === 'no' || s === 'false' || s === '0') return false;
  return undefined;
}

function parseMaxSpeed(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const s = v.trim().toLowerCase();
  const num = parseFloat(s);
  if (!isFinite(num) || num <= 0) return undefined;
  if (s.includes('mph')) return Math.round(num * 1.609344);
  return Math.round(num);
}
