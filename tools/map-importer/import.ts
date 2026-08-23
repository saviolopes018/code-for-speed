/**
 * Code for Speed — Map Importer
 *
 * Offline development tool. Reads a region config, fetches OSM road data from
 * the Overpass API (cached), normalizes it into local game coordinates, and
 * writes a static runtime JSON the browser loads. The GAME never calls Overpass.
 *
 * Usage:
 *   npm run map:import -- fortaleza-papicu-001          (use cached raw if present)
 *   npm run map:import -- fortaleza-papicu-001 --refresh (force re-download)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeoProjection } from '../../src/world/geo/GeoProjection.ts';
import { parseOSMRoads, type OverpassResponse } from '../../src/world/geo/OSMParser.ts';
import { parseOSMBuildings } from '../../src/world/geo/OSMBuildingParser.ts';
import {
  OSM_ATTRIBUTION,
  type NormalizedMapData,
  type RegionConfig,
} from '../../src/world/geo/GeoTypes.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

function log(msg = ''): void {
  process.stdout.write(msg + '\n');
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function buildQuery(bbox: RegionConfig['bbox']): string {
  const { south, west, north, east } = bbox;
  const b = `(${south},${west},${north},${east})`;
  return `[out:json][timeout:180];
(
  way["highway"]${b};
  way["building"]${b};
);
(._;>;);
out body;`;
}

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      log(`Querying Overpass: ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'code-for-speed-map-importer/0.1 (dev tool)',
        },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const json = (await res.json()) as OverpassResponse;
      if (!json || !Array.isArray(json.elements)) {
        throw new Error('Malformed Overpass response (no elements array)');
      }
      return json;
    } catch (err) {
      lastError = err;
      log(`  failed: ${String(err)}`);
    }
  }
  throw new Error(`All Overpass endpoints failed. Last error: ${String(lastError)}`);
}

function loadRegion(regionId: string): RegionConfig {
  const path = resolve(__dirname, 'regions', `${regionId}.json`);
  if (!existsSync(path)) {
    throw new Error(`Region config not found: ${path}`);
  }
  const cfg = JSON.parse(readFileSync(path, 'utf-8')) as RegionConfig;
  if (!cfg.origin || !cfg.bbox) {
    throw new Error(`Region ${regionId} is missing origin or bbox`);
  }
  return cfg;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const refresh = args.includes('--refresh');
  const regionId = args.find((a) => !a.startsWith('--')) ?? 'fortaleza-papicu-001';

  log('Code for Speed Map Importer');
  log('');

  const region = loadRegion(regionId);
  log(`Region: ${region.name} (${region.id})`);
  log('');

  const rawPath = resolve(ROOT, 'data', 'raw', `${region.id}.osm.json`);
  const outPath = resolve(ROOT, 'public', 'maps', `${region.id}.json`);

  // 1-2. Get raw OSM (cache unless --refresh or missing).
  let raw: OverpassResponse;
  if (!refresh && existsSync(rawPath)) {
    log(`Using cached raw OSM: ${rawPath}`);
    raw = JSON.parse(readFileSync(rawPath, 'utf-8')) as OverpassResponse;
  } else {
    raw = await fetchOverpass(buildQuery(region.bbox));
    mkdirSync(dirname(rawPath), { recursive: true });
    writeFileSync(rawPath, JSON.stringify(raw));
    log(`Cached raw OSM: ${rawPath}`);
  }
  log('');

  // 3-5. Project + normalize (roads + buildings).
  const projection = new GeoProjection(region.origin);
  const { roads, stats } = parseOSMRoads(raw, projection);
  const { buildings, stats: bStats } = parseOSMBuildings(raw, projection);

  if (roads.length === 0) {
    log('WARNING: no drivable roads produced for this region.');
  }

  // Local-space bounds for spawn/ground sizing (roads + buildings).
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
  for (const road of roads) for (const p of road.points) track(p.x, p.z);
  for (const b of buildings) for (const p of b.footprint) track(p.x, p.z);
  if (!isFinite(minX)) {
    minX = minZ = maxX = maxZ = 0;
  }

  const mapData: NormalizedMapData = {
    metadata: {
      id: region.id,
      name: region.name,
      origin: region.origin,
      source: 'openstreetmap',
      attribution: OSM_ATTRIBUTION,
      bounds: { minX, minZ, maxX, maxZ },
      generatedAt: new Date().toISOString(),
    },
    roads,
    buildings,
  };

  // 6. Write runtime JSON.
  mkdirSync(dirname(outPath), { recursive: true });
  const serialized = JSON.stringify(mapData);
  writeFileSync(outPath, serialized);

  // 7. Stats.
  const totalSkipped =
    stats.skipped.notHighway +
    stats.skipped.excludedType +
    stats.skipped.missingNodes +
    stats.skipped.tooFewPoints +
    stats.skipped.invalidCoords;

  log(`OSM elements:     ${fmt(stats.osmElements)}`);
  log(`OSM nodes:        ${fmt(stats.osmNodes)}`);
  log(`OSM ways:         ${fmt(stats.osmWays)}`);
  log(`Normalized roads: ${fmt(stats.normalizedRoads)}`);
  log(`Road points:      ${fmt(stats.roadPoints)}`);
  log('');
  log(`Road skipped ways:${fmt(totalSkipped)}`);
  log(`  excluded type:  ${fmt(stats.skipped.excludedType)}`);
  log(`  missing nodes:  ${fmt(stats.skipped.missingNodes)}`);
  log(`  too few points: ${fmt(stats.skipped.tooFewPoints)}`);
  log(`  invalid coords: ${fmt(stats.skipped.invalidCoords)}`);
  log('');
  const bSkipped =
    bStats.skipped.missingNodes +
    bStats.skipped.tooFewPoints +
    bStats.skipped.degenerate +
    bStats.skipped.complexRelation;
  log(`Building ways:    ${fmt(bStats.osmBuildingWays)}`);
  log(`Buildings:        ${fmt(bStats.buildings)}`);
  log(`Footprint points: ${fmt(bStats.footprintPoints)}`);
  log(`Height source:`);
  log(`  explicit height:${fmt(bStats.heightSource.height)}`);
  log(`  levels:         ${fmt(bStats.heightSource.levels)}`);
  log(`  fallback:       ${fmt(bStats.heightSource.fallback)}`);
  log(`Building skipped: ${fmt(bSkipped)}`);
  log(`  missing nodes:  ${fmt(bStats.skipped.missingNodes)}`);
  log(`  too few points: ${fmt(bStats.skipped.tooFewPoints)}`);
  log(`  degenerate:     ${fmt(bStats.skipped.degenerate)}`);
  log(`  relations:      ${fmt(bStats.skipped.complexRelation)}`);
  log('');
  log('Bounds (local metres):');
  log(`  x: ${minX.toFixed(1)} .. ${maxX.toFixed(1)}  (${(maxX - minX).toFixed(0)} m)`);
  log(`  z: ${minZ.toFixed(1)} .. ${maxZ.toFixed(1)}  (${(maxZ - minZ).toFixed(0)} m)`);
  log('Origin (lat, lon):');
  log(`  ${region.origin.lat}, ${region.origin.lon}  ->  (0, 0)`);
  log('');
  log(`Generated:`);
  log(`  ${outPath}`);
  log(`  ${(serialized.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  process.stderr.write(`\nMap import failed: ${String(err?.stack ?? err)}\n`);
  process.exit(1);
});
