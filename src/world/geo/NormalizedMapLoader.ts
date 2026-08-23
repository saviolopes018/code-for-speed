import type { NormalizedMapData } from './GeoTypes';

/**
 * Runtime loader for a pre-generated normalized map (produced offline by the
 * map importer). This is the ONLY map entry point at runtime — the browser
 * never talks to Overpass/OSM. Raw geographic data has already been converted
 * to local metric coordinates before it reaches here.
 */
export class NormalizedMapLoader {
  constructor(private readonly url: string) {}

  async load(): Promise<NormalizedMapData> {
    const res = await fetch(this.url);
    if (!res.ok) {
      throw new Error(`Failed to load map ${this.url}: HTTP ${res.status}`);
    }
    const data = (await res.json()) as NormalizedMapData;
    if (!data?.metadata || !Array.isArray(data.roads)) {
      throw new Error(`Invalid normalized map file: ${this.url}`);
    }
    return data;
  }
}
