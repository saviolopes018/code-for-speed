import type { MapData, MapDataSource } from './MapData';
import { parseGeoJSON } from './MapParser';

/** Loads GeoJSON from a URL (fetch) and parses it into {@link MapData}. */
export class GeoJSONSource implements MapDataSource {
  constructor(private readonly url: string) {}

  async load(): Promise<MapData> {
    const res = await fetch(this.url);
    if (!res.ok) {
      throw new Error(`Failed to load map ${this.url}: ${res.status}`);
    }
    const json = await res.json();
    return parseGeoJSON(json);
  }
}

/** Wraps an already-parsed GeoJSON object (useful for tests / inline data). */
export class InlineGeoJSONSource implements MapDataSource {
  constructor(private readonly geojson: unknown) {}
  async load(): Promise<MapData> {
    return parseGeoJSON(this.geojson);
  }
}
