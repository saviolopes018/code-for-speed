import type { BuildingFamily, HeightSource } from './GeoTypes';

/**
 * Centralized building height + visual-family rules. All the "gamey" defaults
 * live here so they can be tuned in one place. Heights are approximate visual
 * defaults, NOT geographic truth.
 */

/** Metres per floor, used to turn `building:levels` into a height. */
export const FLOOR_HEIGHT = 3.1;

/** Fallback height range (metres) per family: [min, max]. */
const FAMILY_HEIGHT_RANGE: Record<BuildingFamily, [number, number]> = {
  house: [3, 6],
  residential: [6, 18],
  apartments: [15, 45],
  commercial: [6, 30],
  industrial: [5, 15],
  generic: [5, 20],
};

/** Shared material colour per family (neutral urban tones — no neon). */
export const FAMILY_COLOR: Record<BuildingFamily, number> = {
  house: 0xcdbfa6, // sand
  residential: 0xc9c9c4, // light grey
  apartments: 0xb8bcc4, // muted blue-grey
  commercial: 0xd8d4cc, // off-white
  industrial: 0xb0a99c, // warm grey
  generic: 0xc2c2bd, // concrete
};

/** Map a raw OSM `building=*` value to a coarse visual family. */
export function classifyBuilding(type: string | undefined): BuildingFamily {
  const t = (type ?? '').toLowerCase();
  switch (t) {
    case 'house':
    case 'detached':
    case 'bungalow':
    case 'hut':
    case 'cabin':
    case 'semidetached_house':
      return 'house';
    case 'apartments':
    case 'residential':
      return t === 'apartments' ? 'apartments' : 'residential';
    case 'commercial':
    case 'retail':
    case 'office':
    case 'supermarket':
    case 'hotel':
      return 'commercial';
    case 'industrial':
    case 'warehouse':
    case 'factory':
    case 'manufacture':
      return 'industrial';
    default:
      return 'generic';
  }
}

/** Deterministic 0..1 hash of a string (FNV-1a). Same id -> same value. */
export function hash01(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export interface ResolvedHeight {
  height: number;
  levels?: number;
  source: HeightSource;
}

function parseNumeric(v: string | undefined): number | undefined {
  if (v == null) return undefined;
  const n = parseFloat(v); // tolerates "12 m"
  return isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Resolve a building height. Priority: explicit `height` -> `building:levels`
 * -> deterministic per-family fallback (seeded by id, so a building always
 * looks the same across reloads).
 */
export function resolveBuildingHeight(
  tags: { height?: string; levels?: string },
  id: string,
  family: BuildingFamily,
): ResolvedHeight {
  const explicit = parseNumeric(tags.height);
  if (explicit != null) {
    return { height: clampHeight(explicit), source: 'height' };
  }

  const levels = parseNumeric(tags.levels);
  if (levels != null) {
    return {
      height: clampHeight(levels * FLOOR_HEIGHT),
      levels: Math.round(levels),
      source: 'levels',
    };
  }

  const [min, max] = FAMILY_HEIGHT_RANGE[family];
  const height = min + hash01(id) * (max - min);
  return { height: clampHeight(height), source: 'fallback' };
}

function clampHeight(h: number): number {
  return Math.max(2.5, Math.min(180, h));
}
