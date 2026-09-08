import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BuildingFamily, NormalizedBuilding } from './geo/GeoTypes';
import { FAMILY_COLOR, hash01, FLOOR_HEIGHT } from './geo/BuildingStyle';
import { createFacadeTexture } from './BuildingFacade';

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
 * draw calls, not thousands. Facade textures repeat in metric-sized bays; roofs
 * remain solid. Collision generation is owned by BuildingColliders.
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
    decorateBuilding(geo, b);

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
      map: createFacadeTexture(family),
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
      flatShading: true, // cheap, and reads massing clearly in daylight
    });
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `buildings-${family}`;
    // Avoid rendering the entire city into the shadow map.
    mesh.castShadow = false;
    mesh.receiveShadow = true;

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

/** Fit complete window bays to each wall and complete floors to the height. */
function decorateBuilding(geo: THREE.BufferGeometry, building: NormalizedBuilding): void {
  const positions = geo.getAttribute('position');
  const normals = geo.getAttribute('normal');
  const uv = geo.getAttribute('uv');
  const colors = new Float32Array(positions.count * 3);
  const tint = new THREE.Color(FAMILY_COLOR[building.family]);
  tint.offsetHSL((hash01(building.id) - 0.5) * 0.08, 0.02, (hash01(building.id + 'tone') - 0.5) * 0.16);
  const floors = Math.max(1, Math.round(building.height / FLOOR_HEIGHT));
  for (let i = 0; i < positions.count; i += 3) {
    const roof = Math.abs(normals.getY(i)) > 0.5;
    const nx = normals.getX(i), nz = normals.getZ(i);
    const along = [0, 1, 2].map(j => positions.getX(i + j) * nz - positions.getZ(i + j) * nx);
    const min = Math.min(...along), length = Math.max(...along) - min;
    const bays = Math.max(1, Math.round(length / (building.family === 'industrial' ? 5 : 3.2)));
    for (let j = 0; j < 3; j++) {
      const v = i + j;
      // Roof samples a solid plaster texel, never the windows.
      uv.setXY(v, roof ? 0.03 : (along[j] - min) / Math.max(length, 0.001) * bays,
        roof ? 0.5 : positions.getY(v) / building.height * floors);
      const shade = roof ? 0.66 : 1;
      colors[v * 3] = tint.r * shade;
      colors[v * 3 + 1] = tint.g * shade;
      colors[v * 3 + 2] = tint.b * shade;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
