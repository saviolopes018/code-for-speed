/** Normalized, engine-agnostic map geometry produced by the GeoJSON pipeline. */

export type BuildingCategory = 'commercial' | 'residential' | 'industrial' | 'generic';

export interface BuildingFootprint {
  /** Outer ring as [x, z] pairs in metres (local, y-up world). */
  ring: [number, number][];
  height: number;
  category: BuildingCategory;
}

export interface RoadPolyline {
  points: [number, number][];
  width: number;
}

export interface MapData {
  buildings: BuildingFootprint[];
  roads: RoadPolyline[];
  /** Bounds in metres for placement/centering. */
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
}

/** Abstraction so map data can come from a file, a generator, or an API later. */
export interface MapDataSource {
  load(): Promise<MapData>;
}
