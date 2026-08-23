/**
 * Shared, engine-agnostic types for the geographic pipeline.
 *
 * These are consumed by BOTH the offline importer (tools/map-importer) and the
 * runtime world generation. Raw OSM structures must never reach rendering code —
 * they are converted into this normalized form first.
 */

export interface LatLon {
  lat: number;
  lon: number;
}

/** Bounding box in geographic degrees. */
export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Region configuration file (tools/map-importer/regions/*.json). */
export interface RegionConfig {
  id: string;
  name: string;
  origin: LatLon;
  bbox: BBox;
  notes?: string;
}

/** A point in local game-space metres (y-up world; this is the XZ plane). */
export interface LocalPoint {
  x: number;
  z: number;
}

export interface MapMetadata {
  id: string;
  name: string;
  origin: LatLon;
  source: 'openstreetmap';
  attribution: string;
  /** Local-space bounds of the generated geometry, for spawn/ground sizing. */
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  generatedAt?: string;
}

export interface NormalizedRoad {
  /** Stable id, e.g. the OSM way id as a string. */
  id: string;
  /** OSM highway classification (motorway, primary, residential, ...). */
  highwayType: string;
  /** Polyline in local metres. */
  points: LocalPoint[];
  /** Resolved road width in metres (from OSM or classification default). */
  width: number;
  lanes?: number;
  oneway?: boolean;
  maxSpeed?: number;
}

/** Coarse building family used to pick a shared material + height range. */
export type BuildingFamily =
  | 'house'
  | 'residential'
  | 'apartments'
  | 'commercial'
  | 'industrial'
  | 'generic';

/** How a building's height was decided (for debug/QA transparency). */
export type HeightSource = 'height' | 'levels' | 'fallback';

export interface NormalizedBuilding {
  id: string;
  /** Outer ring in local metres (open ring — no duplicated closing point). */
  footprint: LocalPoint[];
  height: number;
  levels?: number;
  /** Raw OSM `building=*` value when present. */
  type?: string;
  family: BuildingFamily;
  heightSource: HeightSource;
  source?: { osmId?: string };
}

export interface NormalizedMapData {
  metadata: MapMetadata;
  roads: NormalizedRoad[];
  buildings: NormalizedBuilding[];
}

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
