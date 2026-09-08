import * as THREE from 'three';
import type { LocalPoint, NormalizedRoad } from './geo/GeoTypes';
import {
  ASPHALT_VARIANTS,
  resolveSurfaceVariant,
  type AsphaltVariant,
} from './RoadSurfaceVariant';
import { createAsphaltMaterials } from './RoadMaterialFactory';
import { generateRoadMarkings, type RoadMarkingStats } from './RoadMarkings';
import { generateRoadDetails, type RoadDetailStats } from './RoadDetails';

export interface RoadRenderStats {
  roads: number;
  points: number;
  /** Total road-fill vertices across all variant meshes. */
  vertices: number;
  /** Total road-fill triangles across all variant meshes. */
  triangles: number;
  /** Number of variant fill meshes actually created (one draw call each). */
  roadMeshes: number;
  /** Distinct road materials (asphalt variants in use). */
  materials: number;
  /** Shared asphalt textures (albedo + normal + roughness). */
  textures: number;
  variantCounts: Record<AsphaltVariant, number>;
  marking: RoadMarkingStats;
  detail: RoadDetailStats;
}

export interface RoadNetwork {
  /** Group named 'roads' holding the per-variant fill meshes, markings and details. */
  group: THREE.Group;
  /** Class-coloured centrelines — shown in map-validation mode (F4). Always crisp
   * from the overview camera regardless of zoom. */
  debugLines: THREE.LineSegments;
  stats: RoadRenderStats;
}

const ROAD_Y = 0.06; // sit just above the ground plane to avoid z-fighting

/** World-space size of one asphalt texture tile, in metres. UVs are authored in
 * metres and the texture repeat is 1/TILE_METERS, so texel density is uniform
 * regardless of road width. */
const TILE_METERS = 3;

/** Number of shared asphalt textures (albedo, normal, roughness). */
const ASPHALT_TEXTURE_COUNT = 3;

export interface RoadRenderOptions {
  /** Max anisotropy from the renderer, for crisp grain at grazing angles. */
  anisotropy?: number;
}

/**
 * Debug colour per OSM highway class — lets us eyeball, from the overview camera,
 * whether a "primary" road is suspiciously alley-width, etc. Purely a validation
 * aid (F4); the driving view uses the textured asphalt materials.
 */
export const ROAD_CLASS_COLORS: Record<string, number> = {
  motorway: 0xff2d2d,
  motorway_link: 0xff2d2d,
  trunk: 0xff6a00,
  trunk_link: 0xff6a00,
  primary: 0xffa51e,
  primary_link: 0xffa51e,
  secondary: 0xffe14a,
  secondary_link: 0xffe14a,
  tertiary: 0x76e35b,
  tertiary_link: 0x76e35b,
  residential: 0x36c5ff,
  living_street: 0xb07cff,
  unclassified: 0xbfc6d0,
  service: 0x9aa3ad,
  road: 0xffffff,
};

function classColor(highwayType: string): THREE.Color {
  return new THREE.Color(ROAD_CLASS_COLORS[highwayType] ?? 0xffffff);
}

/**
 * Cumulative arc length (metres) at each polyline point. Pure — this is the
 * longitudinal texture coordinate, so the asphalt repeats by real distance along
 * the road and never stretches or compresses regardless of segment spacing.
 */
export function cumulativeLengths(points: LocalPoint[]): number[] {
  const out = new Array<number>(points.length);
  let acc = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) acc += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
    out[i] = acc;
  }
  return out;
}

/**
 * Low-frequency, deterministic tonal multiplier over world position. Layered on
 * the road as a per-vertex colour so large-scale (tens of metres) lightness drifts
 * break the "same tile forever" look that pure texture tiling produces. Cheap and
 * allocation-free. Returns roughly [0.91, 1.09].
 */
export function macroTone(x: number, z: number): number {
  const a = Math.sin(x * 0.05 + z * 0.03);
  const b = Math.sin(x * -0.023 + z * 0.041 + 2.0);
  const c = Math.sin((x + z) * 0.017 + 1.0);
  const n = a * 0.5 + b * 0.3 + c * 0.2; // ~[-1, 1]
  return 1.0 + n * 0.09;
}

/** Per-variant accumulating geometry buffers. */
interface VariantBuffers {
  positions: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
  vertexCount: number;
}

function emptyBuffers(): VariantBuffers {
  return { positions: [], uvs: [], colors: [], indices: [], vertexCount: 0 };
}

/**
 * Turns normalized road polylines into textured asphalt geometry.
 *
 * Each polyline becomes a flat ribbon of its road width, mitred at corners so
 * segments join without gaps. Roads are bucketed by a deterministic surface
 * variant and merged into ONE mesh per variant (a handful of draw calls total).
 * UVs are authored in metres — longitudinal V from accumulated length, lateral U
 * across the width — so the texture never stretches. Per-vertex colours add macro
 * tonal variation. Painted centre-line markings and manhole details are generated
 * alongside and returned in the same group.
 */
export function generateRoads(
  roads: NormalizedRoad[],
  opts: RoadRenderOptions = {},
): RoadNetwork {
  const linePositions: number[] = [];
  const lineColors: number[] = [];
  let pointCount = 0;

  const variantCounts: Record<AsphaltVariant, number> = {
    clean: 0,
    used: 0,
    worn: 0,
    patched: 0,
  };
  const buffers = new Map<AsphaltVariant, VariantBuffers>();
  for (const v of ASPHALT_VARIANTS) buffers.set(v, emptyBuffers());

  const dirIn = new THREE.Vector2();
  const dirOut = new THREE.Vector2();
  const normIn = new THREE.Vector2();
  const normOut = new THREE.Vector2();
  const miter = new THREE.Vector2();

  for (const road of roads) {
    const pts = road.points;
    if (pts.length < 2) continue;
    const half = road.width / 2;
    pointCount += pts.length;
    const col = classColor(road.highwayType);

    // Centreline segments for the F4 overview (drawn above everything).
    for (let i = 0; i < pts.length - 1; i++) {
      linePositions.push(pts[i].x, 0.5, pts[i].z, pts[i + 1].x, 0.5, pts[i + 1].z);
      lineColors.push(col.r, col.g, col.b, col.r, col.g, col.b);
    }

    const variant = resolveSurfaceVariant(road);
    variantCounts[variant]++;
    const buf = buffers.get(variant)!;
    const lengths = cumulativeLengths(pts);
    const startVertex = buf.vertexCount;

    for (let i = 0; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const next = pts[i + 1];

      // Incoming / outgoing segment directions (fall back to the single one).
      if (prev) dirIn.set(cur.x - prev.x, cur.z - prev.z).normalize();
      if (next) dirOut.set(next.x - cur.x, next.z - cur.z).normalize();
      if (!prev) dirIn.copy(dirOut);
      if (!next) dirOut.copy(dirIn);

      // Left-hand normal of a direction (dx,dz) is (-dz, dx).
      normIn.set(-dirIn.y, dirIn.x);
      normOut.set(-dirOut.y, dirOut.x);
      miter.copy(normIn).add(normOut);
      if (miter.lengthSq() < 1e-6) {
        miter.copy(normIn); // 180° reversal guard
      } else {
        miter.normalize();
      }
      // Mitre length: extend width around corners, clamped to avoid spikes.
      const cos = Math.max(0.35, miter.dot(normIn));
      const scale = half / cos;

      const lx = cur.x + miter.x * scale;
      const lz = cur.z + miter.y * scale;
      const rx = cur.x - miter.x * scale;
      const rz = cur.z - miter.y * scale;

      buf.positions.push(lx, ROAD_Y, lz, rx, ROAD_Y, rz);
      // UVs in metres: U across width (±half), V along accumulated road length.
      const v = lengths[i];
      buf.uvs.push(half, v, -half, v);
      // Macro tonal variation, sampled at each edge for a smooth cross-road drift.
      const tl = macroTone(lx, lz);
      const tr = macroTone(rx, rz);
      buf.colors.push(tl, tl, tl, tr, tr, tr);
      buf.vertexCount += 2;

      if (i < pts.length - 1) {
        const a = startVertex + i * 2;
        // Winding chosen so the face normal points +Y (up); with FrontSide
        // materials the asphalt is visible from the chase and overview cameras.
        buf.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }

  // Build one mesh per non-empty variant, sharing the asphalt texture set.
  const rep = 1 / TILE_METERS;
  const materials = createAsphaltMaterials(opts.anisotropy ?? 1, rep);
  const group = new THREE.Group();
  group.name = 'roads';

  let totalVertices = 0;
  let totalTriangles = 0;
  let roadMeshes = 0;
  const materialsUsed = new Set<AsphaltVariant>();

  for (const variant of ASPHALT_VARIANTS) {
    const buf = buffers.get(variant)!;
    if (buf.vertexCount === 0) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(buf.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(buf.colors, 3));
    geometry.setIndex(buf.indices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, materials[variant]);
    mesh.receiveShadow = true;
    mesh.name = `roads-${variant}`;
    group.add(mesh);

    totalVertices += buf.vertexCount;
    totalTriangles += buf.indices.length / 3;
    roadMeshes++;
    materialsUsed.add(variant);
  }

  // Painted centre-line markings and manhole details (each one merged mesh).
  const markings = generateRoadMarkings(roads);
  const details = generateRoadDetails(roads);
  group.add(markings.mesh, details.mesh);

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
  const debugLines = new THREE.LineSegments(
    lineGeometry,
    new THREE.LineBasicMaterial({ vertexColors: true }),
  );
  debugLines.name = 'roads-debug-lines';
  debugLines.visible = false;

  return {
    group,
    debugLines,
    stats: {
      roads: roads.length,
      points: pointCount,
      vertices: totalVertices,
      triangles: totalTriangles,
      roadMeshes,
      materials: materialsUsed.size,
      textures: ASPHALT_TEXTURE_COUNT,
      variantCounts,
      marking: markings.stats,
      detail: details.stats,
    },
  };
}
