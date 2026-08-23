import type { NormalizedRoad } from './GeoTypes';

export interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number; // X extent in metres
  height: number; // Z extent in metres
  centerX: number;
  centerZ: number;
}

/** Compute the real local-space bounds of the normalized road geometry. */
export function computeMapBounds(roads: NormalizedRoad[]): MapBounds {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const road of roads) {
    for (const p of road.points) {
      if (p.x < minX) minX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.x > maxX) maxX = p.x;
      if (p.z > maxZ) maxZ = p.z;
    }
  }

  if (!isFinite(minX)) {
    minX = maxX = minZ = maxZ = 0;
  }

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    height: maxZ - minZ,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

/**
 * Height for a top-down perspective camera so the whole map fits on screen.
 * Considers BOTH the horizontal and vertical field of view (via aspect) and the
 * map's own extent, so it works for any region size — never a hardcoded height.
 */
export function computeOverviewHeight(
  width: number,
  height: number,
  aspect: number,
  fovDeg: number,
  margin = 1.12,
): number {
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const forVertical = height / 2 / Math.tan(vFov / 2);
  const forHorizontal = width / 2 / Math.tan(hFov / 2);
  return Math.max(forVertical, forHorizontal, 50) * margin;
}
