import * as THREE from 'three';
import type { LocalPoint, NormalizedRoad } from './geo/GeoTypes';
import { hashId } from './RoadSurfaceVariant';

/** Painted centre-line dashes sit just above the asphalt fill. */
const MARK_Y = 0.066; // road fill is at 0.06
const MARK_WIDTH = 0.18; // painted stripe width, metres
const DASH_LEN = 3.0;
const GAP_LEN = 4.5;

/** Only roads at least this wide (metres) get a painted centre line. Filters out
 * alleys/service roads that realistically have no lane markings. */
const MIN_MARKED_WIDTH = 8;

export interface RoadMarkingStats {
  markingMeshes: number;
  dashes: number;
  vertices: number;
  triangles: number;
}

export interface RoadMarkingResult {
  mesh: THREE.Mesh;
  stats: RoadMarkingStats;
}

export interface Dash {
  x: number;
  z: number;
  /** Unit direction along the road at the dash centre. */
  dirX: number;
  dirZ: number;
  length: number;
}

/**
 * Walk a polyline by arc length and emit centred dash segments (dash on, gap off).
 * Pure and deterministic — the returned dashes depend only on the input geometry,
 * so placement is testable and stable across runs.
 */
export function placeDashes(
  points: LocalPoint[],
  dashLen = DASH_LEN,
  gapLen = GAP_LEN,
): Dash[] {
  const dashes: Dash[] = [];
  if (points.length < 2) return dashes;
  const period = dashLen + gapLen;

  let carry = 0; // distance consumed since the start of the current period
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segX = b.x - a.x;
    const segZ = b.z - a.z;
    const segLen = Math.hypot(segX, segZ);
    if (segLen < 1e-4) continue;
    const dirX = segX / segLen;
    const dirZ = segZ / segLen;

    let s = 0; // position along this segment
    while (s < segLen) {
      const phase = carry % period;
      if (phase < dashLen) {
        // Inside a dash: emit from s up to the dash end or segment end.
        const remainingDash = dashLen - phase;
        const end = Math.min(s + remainingDash, segLen);
        const midS = (s + end) / 2;
        dashes.push({
          x: a.x + dirX * midS,
          z: a.z + dirZ * midS,
          dirX,
          dirZ,
          length: end - s,
        });
        const adv = end - s;
        carry += adv;
        s = end;
      } else {
        // Inside a gap: skip to the end of the gap or segment end.
        const remainingGap = period - phase;
        const adv = Math.min(remainingGap, segLen - s);
        carry += adv;
        s += adv;
      }
    }
  }
  return dashes;
}

/** True when a road should carry a painted centre line (deterministic). */
export function roadHasCentreLine(road: NormalizedRoad): boolean {
  return road.width >= MIN_MARKED_WIDTH;
}

/**
 * Build one merged mesh of painted centre-line dashes for the whole network.
 * Each dash is a thin quad oriented along the road; per-dash vertex colours add a
 * little paint wear. Kept to a single draw call.
 */
export function generateRoadMarkings(roads: NormalizedRoad[]): RoadMarkingResult {
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  let vertexCount = 0;
  let dashCount = 0;
  const half = MARK_WIDTH / 2;

  for (const road of roads) {
    if (!roadHasCentreLine(road)) continue;
    const dashes = placeDashes(road.points);
    // Deterministic paint-wear seed per road.
    const wearSeed = hashId(road.id);

    for (let d = 0; d < dashes.length; d++) {
      const dash = dashes[d];
      const halfLen = dash.length / 2;
      // Left-hand normal of the direction (dx,dz) is (-dz, dx).
      const nx = -dash.dirZ * half;
      const nz = dash.dirX * half;
      const fx = dash.dirX * halfLen;
      const fz = dash.dirZ * halfLen;

      // Four corners of the dash quad.
      const x0 = dash.x - fx - nx;
      const z0 = dash.z - fz - nz;
      const x1 = dash.x - fx + nx;
      const z1 = dash.z - fz + nz;
      const x2 = dash.x + fx - nx;
      const z2 = dash.z + fz - nz;
      const x3 = dash.x + fx + nx;
      const z3 = dash.z + fz + nz;

      positions.push(x0, MARK_Y, z0, x1, MARK_Y, z1, x2, MARK_Y, z2, x3, MARK_Y, z3);

      // Worn-paint tone: mostly bright, some dashes faded (deterministic).
      const w = ((wearSeed + d * 2654435761) >>> 0) % 100;
      const tone = w < 20 ? 0.72 : w < 55 ? 0.9 : 1.0;
      for (let k = 0; k < 4; k++) colors.push(tone, tone, tone);

      const a = vertexCount;
      // Winding chosen so the face normal points +Y (up) for FrontSide lighting.
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      vertexCount += 4;
      dashCount++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // Warm, slightly worn white paint. polygonOffset pulls it toward the camera in
  // depth so it never z-fights with the asphalt despite the tiny height gap.
  const material = new THREE.MeshStandardMaterial({
    color: 0xd8d3c2,
    roughness: 0.82,
    metalness: 0.0,
    vertexColors: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'road-markings';

  return {
    mesh,
    stats: {
      markingMeshes: 1,
      dashes: dashCount,
      vertices: vertexCount,
      triangles: indices.length / 3,
    },
  };
}
