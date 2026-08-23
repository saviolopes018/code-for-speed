import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RAPIER, type Physics } from '../core/Physics';
import type { BuildingCategory, MapData } from './MapData';
import { hashString } from './MapParser';

const CATEGORY_COLORS: Record<BuildingCategory, number> = {
  commercial: 0x2b3348,
  residential: 0x3a3340,
  industrial: 0x2e3130,
  generic: 0x30343d,
};

const CATEGORY_EMISSIVE: Record<BuildingCategory, number> = {
  commercial: 0x1a2740,
  residential: 0x2a1e1a,
  industrial: 0x141a14,
  generic: 0x181c22,
};

/**
 * Extrudes building footprints into 3D meshes, merged per category for few
 * draw calls, and adds a bounding-box static collider per building.
 * 2D footprint -> extrusion -> 3D building.
 */
export function generateBuildings(
  scene: THREE.Scene,
  physics: Physics,
  map: MapData,
  addColliders = true,
): void {
  const byCategory = new Map<BuildingCategory, THREE.BufferGeometry[]>();

  for (let b = 0; b < map.buildings.length; b++) {
    const building = map.buildings[b];
    const ring = building.ring;

    const shape = new THREE.Shape();
    shape.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length; i++) shape.lineTo(ring[i][0], ring[i][1]);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: building.height,
      bevelEnabled: false,
    });
    // Shape lives in XY; rotate so extrusion goes up (+Y) and footprint maps XZ.
    geo.rotateX(-Math.PI / 2);

    const list = byCategory.get(building.category) ?? [];
    list.push(geo);
    byCategory.set(building.category, list);

    if (addColliders) addBuildingCollider(physics, ring, building.height);
  }

  for (const [category, geos] of byCategory) {
    if (geos.length === 0) continue;
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const color = CATEGORY_COLORS[category];
    const shade = 1 + ((hashString(category) % 5) - 2) * 0.03;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(shade),
      emissive: CATEGORY_EMISSIVE[category],
      emissiveIntensity: 0.6,
      roughness: 0.85,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `buildings-${category}`;
    scene.add(mesh);
  }
}

function addBuildingCollider(
  physics: Physics,
  ring: [number, number][],
  height: number,
): void {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (z > maxZ) maxZ = z;
  }
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const hx = Math.max(0.5, (maxX - minX) / 2);
  const hz = Math.max(0.5, (maxZ - minZ) / 2);

  const body = physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(cx, height / 2, cz),
  );
  physics.world.createCollider(
    RAPIER.ColliderDesc.cuboid(hx, height / 2, hz).setFriction(0.4),
    body,
  );
}
