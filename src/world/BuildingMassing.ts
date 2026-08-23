import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BuildingFamily, NormalizedBuilding } from './geo/GeoTypes';
import { FAMILY_COLOR } from './geo/BuildingStyle';

export interface BuildingStats {
  buildings: number;
  vertices: number;
  triangles: number;
  meshes: number;
  heightSource: { height: number; levels: number; fallback: number };
  byFamily: Record<string, number>;
}

export interface BuildingMassing {
  /** One merged mesh per visual family (few draw calls for the whole city). */
  meshes: THREE.Mesh[];
  stats: BuildingStats;
}

/**
 * Extrude normalized building footprints into 3D urban massing.
 *
 *   NormalizedBuilding -> THREE.Shape -> ExtrudeGeometry -> merged Mesh (per family)
 *
 * Geometry is merged per material family so a whole district is a handful of
 * draw calls, not thousands. No interiors/roofs/details — just footprint+height,
 * which is enough to read the city. No colliders (World v1.0, Option A).
 */
export function generateBuildings(buildings: NormalizedBuilding[]): BuildingMassing {
  const byFamilyGeo = new Map<BuildingFamily, THREE.BufferGeometry[]>();
  const stats: BuildingStats = {
    buildings: 0,
    vertices: 0,
    triangles: 0,
    meshes: 0,
    heightSource: { height: 0, levels: 0, fallback: 0 },
    byFamily: {},
  };

  for (const b of buildings) {
    const geo = extrudeFootprint(b.footprint, b.height);
    if (!geo) continue;

    const list = byFamilyGeo.get(b.family) ?? [];
    list.push(geo);
    byFamilyGeo.set(b.family, list);

    stats.buildings++;
    stats.heightSource[b.heightSource]++;
    stats.byFamily[b.family] = (stats.byFamily[b.family] ?? 0) + 1;
  }

  const meshes: THREE.Mesh[] = [];
  for (const [family, geos] of byFamilyGeo) {
    if (geos.length === 0) continue;
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;

    const material = new THREE.MeshStandardMaterial({
      color: FAMILY_COLOR[family],
      roughness: 0.92,
      metalness: 0.0,
      flatShading: true, // cheap, and reads massing clearly in daylight
    });
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `buildings-${family}`;
    // Shadows disabled on buildings for perf (World v1.0). Sun still shades faces.
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const pos = merged.getAttribute('position');
    stats.vertices += pos ? pos.count : 0;
    stats.triangles += merged.index ? merged.index.count / 3 : (pos ? pos.count / 3 : 0);
    meshes.push(mesh);
  }
  stats.meshes = meshes.length;

  return { meshes, stats };
}

/**
 * Build an extruded prism from a footprint. Shape is authored in (x, -z) so the
 * post-rotation world footprint matches (x, z); extrusion becomes +Y (up), base
 * sits at y = 0 (ground).
 */
function extrudeFootprint(
  footprint: { x: number; z: number }[],
  height: number,
): THREE.BufferGeometry | null {
  if (footprint.length < 3) return null;

  const shape = new THREE.Shape();
  shape.moveTo(footprint[0].x, -footprint[0].z);
  for (let i = 1; i < footprint.length; i++) {
    shape.lineTo(footprint[i].x, -footprint[i].z);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
    steps: 1,
  });
  geo.rotateX(-Math.PI / 2); // shape XY plane -> world XZ, depth -> +Y
  return geo;
}
