import * as THREE from 'three';
import { getAsphaltMaps } from './AsphaltTexture';
import {
  ASPHALT_VARIANTS,
  VARIANT_MATERIAL,
  type AsphaltVariant,
} from './RoadSurfaceVariant';

/**
 * Builds the small set of shared asphalt materials (one per variant). All
 * variants reference the SAME three textures (albedo / normal / roughness) — only
 * their tint, roughness and normal strength differ — so texture count stays at 3
 * regardless of how many variants render. `vertexColors` is enabled so the road
 * geometry can layer macro tonal variation on top per vertex.
 */
export function createAsphaltMaterials(
  anisotropy: number,
  repeat: number,
): Record<AsphaltVariant, THREE.MeshStandardMaterial> {
  const maps = getAsphaltMaps(anisotropy);
  for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) t.repeat.set(repeat, repeat);

  const out = {} as Record<AsphaltVariant, THREE.MeshStandardMaterial>;
  for (const v of ASPHALT_VARIANTS) {
    const p = VARIANT_MATERIAL[v];
    out[v] = new THREE.MeshStandardMaterial({
      map: maps.map,
      normalMap: maps.normalMap,
      normalScale: new THREE.Vector2(p.normalScale, p.normalScale),
      roughnessMap: maps.roughnessMap,
      color: p.color,
      roughness: p.roughness,
      metalness: 0.0,
      envMapIntensity: 0.2,
      vertexColors: true,
    });
  }
  return out;
}
