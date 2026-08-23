import type { LatLon, LocalPoint } from './GeoTypes';

/**
 * Local metric projection around an explicit origin.
 *
 * We use a simple equirectangular (equal-rectangular) projection: for a region
 * only a few kilometres across, treating a small patch of the Earth as flat is
 * more than accurate enough for driving and keeps the maths trivial. We do NOT
 * need global, Earth-scale precision.
 *
 * AXIS CONVENTION (documented, consistent across the whole game):
 *   - The configured origin maps to (x=0, z=0).
 *   - EAST  (increasing longitude) -> +X
 *   - NORTH (increasing latitude)  -> -Z   (so +Z points SOUTH)
 *
 * This matches Three.js's default forward (-Z) and the existing GeoJSON parser,
 * which also mapped latitude to -z. Rendering/physics only ever see local metres.
 */
const EARTH_RADIUS_M = 6378137; // WGS84 equatorial radius
const DEG2RAD = Math.PI / 180;

export class GeoProjection {
  private readonly lat0Rad: number;
  private readonly lon0Rad: number;
  private readonly cosLat0: number;

  constructor(origin: LatLon) {
    this.lat0Rad = origin.lat * DEG2RAD;
    this.lon0Rad = origin.lon * DEG2RAD;
    this.cosLat0 = Math.cos(this.lat0Rad);
  }

  /** Convert geographic lat/lon into local game-space metres. */
  toLocal(lat: number, lon: number): LocalPoint {
    const x = EARTH_RADIUS_M * (lon * DEG2RAD - this.lon0Rad) * this.cosLat0;
    const z = -EARTH_RADIUS_M * (lat * DEG2RAD - this.lat0Rad);
    return { x, z };
  }

  /** Inverse — mostly for debugging / round-trip tests. */
  toLatLon(x: number, z: number): LatLon {
    const lon = (x / (EARTH_RADIUS_M * this.cosLat0) + this.lon0Rad) / DEG2RAD;
    const lat = (-z / EARTH_RADIUS_M + this.lat0Rad) / DEG2RAD;
    return { lat, lon };
  }
}
