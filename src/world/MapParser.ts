import type {
  BuildingCategory,
  BuildingFootprint,
  MapData,
  RoadPolyline,
} from './MapData';

/**
 * Minimal GeoJSON -> {@link MapData} parser.
 *
 * Coordinates are treated as LOCAL planar metres (x = lon slot, z = -lat slot)
 * — the project fixture is authored pre-projected, so we avoid pulling in a
 * mercator dependency for the MVP. If coordinates look like lat/lon degrees we
 * still accept them but they should be small local offsets.
 *
 * Feature conventions (properties):
 *   - Polygon  + properties.building     -> extruded building
 *       properties.height     (metres, optional)
 *       properties.levels     (floors, optional; height = levels * 3)
 *       properties.category   ('commercial' | 'residential' | 'industrial')
 *   - LineString + properties.highway    -> road polyline
 *       properties.width      (metres, optional)
 */
export function parseGeoJSON(geojson: any): MapData {
  const buildings: BuildingFootprint[] = [];
  const roads: RoadPolyline[] = [];
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  const track = (x: number, z: number) => {
    if (x < minX) minX = x;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (z > maxZ) maxZ = z;
  };

  const features: any[] =
    geojson?.type === 'FeatureCollection' ? geojson.features ?? [] : [geojson];

  for (const f of features) {
    if (!f || !f.geometry) continue;
    const props = f.properties ?? {};
    const geom = f.geometry;

    if (geom.type === 'Polygon' && (props.building || props.category)) {
      const ring = toRing(geom.coordinates?.[0] ?? []);
      if (ring.length < 3) continue;
      ring.forEach(([x, z]) => track(x, z));
      buildings.push({
        ring,
        height: resolveHeight(props),
        category: resolveCategory(props.category),
      });
    } else if (geom.type === 'LineString' && (props.highway || props.road)) {
      const points = toRing(geom.coordinates ?? []);
      if (points.length < 2) continue;
      points.forEach(([x, z]) => track(x, z));
      roads.push({ points, width: Number(props.width) || 12 });
    }
  }

  if (!isFinite(minX)) {
    minX = minZ = maxX = maxZ = 0;
  }

  return { buildings, roads, bounds: { minX, minZ, maxX, maxZ } };
}

function toRing(coords: any[]): [number, number][] {
  const out: [number, number][] = [];
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) continue;
    // GeoJSON is [lon, lat]; map lon->x, lat->-z so +z points "south".
    out.push([Number(c[0]), -Number(c[1])]);
  }
  return out;
}

function resolveHeight(props: any): number {
  if (props.height != null) return Math.max(3, Number(props.height));
  if (props.levels != null) return Math.max(3, Number(props.levels) * 3.2);
  return 9 + (hashString(JSON.stringify(props)) % 5) * 3;
}

function resolveCategory(raw: any): BuildingCategory {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'commercial' || v === 'residential' || v === 'industrial') return v;
  return 'generic';
}

/** Deterministic small hash for repeatable procedural variation. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
