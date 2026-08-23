import * as THREE from 'three';
import type { BuildingCategory } from './MapData';

/**
 * Builds a deterministic GeoJSON FeatureCollection of building footprints on a
 * grid, skipping cells that overlap the race track. This proves out the GeoJSON
 * pipeline without an external data source; the same parser also reads real
 * OSM/Overture exports (see public/maps/urban.geojson).
 */
export function generateCityGeoJSON(
  curve: THREE.CatmullRomCurve3,
  opts: {
    area?: number; // half-size of the grid in metres
    cell?: number;
    roadClearance?: number;
  } = {},
): unknown {
  const area = opts.area ?? 320;
  const cell = opts.cell ?? 44;
  const clearance = opts.roadClearance ?? 22;

  // Precompute track samples for clearance testing.
  const samples: THREE.Vector3[] = [];
  const N = 200;
  for (let i = 0; i < N; i++) samples.push(curve.getPointAt(i / N));

  const categories: BuildingCategory[] = [
    'commercial',
    'residential',
    'industrial',
    'generic',
  ];
  const features: any[] = [];
  let seed = 1337;
  const rand = () => {
    // Mulberry32 — deterministic PRNG so the city is stable across reloads.
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let gx = -area; gx <= area; gx += cell) {
    for (let gz = -area; gz <= area; gz += cell) {
      const cx = gx + (rand() - 0.5) * 6;
      const cz = gz + (rand() - 0.5) * 6;

      let tooClose = false;
      for (const s of samples) {
        const dx = s.x - cx;
        const dz = s.z - cz;
        if (dx * dx + dz * dz < clearance * clearance) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      if (rand() < 0.18) continue; // leave some gaps / plazas

      const w = 12 + rand() * 16;
      const d = 12 + rand() * 16;
      const levels = 2 + Math.floor(rand() * 12);
      const category = categories[Math.floor(rand() * categories.length)];

      // GeoJSON uses [lon, lat]; our parser maps lon->x, lat->-z.
      const ring = [
        [cx - w / 2, -(cz - d / 2)],
        [cx + w / 2, -(cz - d / 2)],
        [cx + w / 2, -(cz + d / 2)],
        [cx - w / 2, -(cz + d / 2)],
        [cx - w / 2, -(cz - d / 2)],
      ];

      features.push({
        type: 'Feature',
        properties: { building: 'yes', levels, category },
        geometry: { type: 'Polygon', coordinates: [ring] },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}
