/**
 * Centralized road classification: which OSM highways we keep, and how wide each
 * class is by default. Width constants live ONLY here — never scatter them
 * through rendering code.
 */

/** Highway types we explicitly drop (non-drivable for a car). */
const EXCLUDED_HIGHWAYS = new Set<string>([
  'footway',
  'path',
  'steps',
  'cycleway',
  'pedestrian',
  'bridleway',
  'corridor',
  'track', // agricultural/dirt; noisy for an urban prototype
  'proposed',
  'construction',
  'raceway',
  'elevator',
]);

/** Default carriageway width in metres per highway class. */
const WIDTH_BY_CLASS: Record<string, number> = {
  motorway: 16,
  motorway_link: 9,
  trunk: 14,
  trunk_link: 8,
  primary: 12,
  primary_link: 7,
  secondary: 10,
  secondary_link: 6.5,
  tertiary: 8.5,
  tertiary_link: 6,
  residential: 7,
  living_street: 6,
  unclassified: 7,
  service: 5,
  road: 7, // unknown classification
};

const DEFAULT_WIDTH = 7;
const LANE_WIDTH = 3.2;

/** True when a highway class should be imported as a drivable road. */
export function isDrivableHighway(highwayType: string | undefined): boolean {
  if (!highwayType) return false;
  return !EXCLUDED_HIGHWAYS.has(highwayType);
}

/**
 * Resolve a road width. Explicit OSM `width` wins. Otherwise the per-class
 * default acts as a FLOOR and lane count can only widen it — this prevents a
 * one-way arterial tagged `lanes=1` from rendering narrower than a side street
 * (an arterial with alley width is a classic OSM-import artefact). Always
 * returns a sane positive number.
 */
export function resolveRoadWidth(
  highwayType: string,
  opts: { width?: number; lanes?: number } = {},
): number {
  if (opts.width != null && isFinite(opts.width) && opts.width > 0) {
    return clampWidth(opts.width);
  }
  const classWidth = WIDTH_BY_CLASS[highwayType] ?? DEFAULT_WIDTH;
  if (opts.lanes != null && isFinite(opts.lanes) && opts.lanes > 0) {
    return clampWidth(Math.max(opts.lanes * LANE_WIDTH, classWidth));
  }
  return classWidth;
}

function clampWidth(w: number): number {
  return Math.max(3, Math.min(30, w));
}
