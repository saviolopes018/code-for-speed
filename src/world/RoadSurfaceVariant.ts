/**
 * Deterministic asphalt surface variants. A handful of *shared* looks — never one
 * material per road — assigned by highway class plus a stable per-road hash, so
 * the same map always produces the same distribution. Variants differ only by a
 * tint/roughness/normal-strength multiplier over ONE shared texture set, keeping
 * texture count fixed and draw calls to one merged mesh per variant.
 */

export type AsphaltVariant = 'clean' | 'used' | 'worn' | 'patched';

/** Ordered from freshest to most degraded (used for deterministic ± shifting). */
export const ASPHALT_VARIANTS: readonly AsphaltVariant[] = ['clean', 'used', 'worn', 'patched'];

/** Base variant per OSM highway class — a visual wear heuristic, not fidelity:
 * arterials read uniform/clean, side streets more worn, service roads patched. */
const BASE_BY_CLASS: Record<string, AsphaltVariant> = {
  motorway: 'clean',
  motorway_link: 'clean',
  trunk: 'clean',
  trunk_link: 'used',
  primary: 'clean',
  primary_link: 'used',
  secondary: 'used',
  secondary_link: 'used',
  tertiary: 'used',
  tertiary_link: 'worn',
  residential: 'worn',
  living_street: 'worn',
  unclassified: 'worn',
  service: 'patched',
  road: 'used',
};

const DEFAULT_VARIANT: AsphaltVariant = 'used';

/** FNV-1a hash of a stable id string → uint32. Stable across runs and machines. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Resolve the shared variant for a road. The class picks a base look; a stable
 * hash of the road id nudges ~30% of roads one step fresher or more worn so the
 * result isn't perfectly class-correlated. Fully deterministic.
 */
export function resolveSurfaceVariant(road: { id: string; highwayType: string }): AsphaltVariant {
  const base = BASE_BY_CLASS[road.highwayType] ?? DEFAULT_VARIANT;
  let i = ASPHALT_VARIANTS.indexOf(base);
  const bucket = hashId(road.id) % 100;
  if (bucket < 15) i = Math.max(0, i - 1); // fresher
  else if (bucket >= 85) i = Math.min(ASPHALT_VARIANTS.length - 1, i + 1); // more worn
  return ASPHALT_VARIANTS[i];
}

export interface VariantMaterialParams {
  /** Multiplicative tint over the (clean) albedo — only darkens/greys. */
  color: number;
  roughness: number;
  /** Normal-map strength; more wear = more relief. */
  normalScale: number;
}

/** Per-variant material multipliers over the single shared asphalt texture set. */
export const VARIANT_MATERIAL: Record<AsphaltVariant, VariantMaterialParams> = {
  clean: { color: 0xe9e9e8, roughness: 0.96, normalScale: 0.3 },
  used: { color: 0xefefed, roughness: 0.98, normalScale: 0.4 },
  worn: { color: 0xf4f3f1, roughness: 1, normalScale: 0.5 },
  patched: { color: 0xecebe9, roughness: 0.99, normalScale: 0.45 },
};
