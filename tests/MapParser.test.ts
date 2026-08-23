import { describe, it, expect } from 'vitest';
import { parseGeoJSON } from '../src/world/MapParser';

const sample = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { building: 'yes', levels: 4, category: 'commercial' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 20],
            [0, 20],
            [0, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { building: 'yes', height: 15 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [30, 0],
            [40, 0],
            [40, 10],
            [30, 0],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { highway: 'residential', width: 8 },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [50, 50],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [1, 1] },
    },
  ],
};

describe('parseGeoJSON', () => {
  it('extracts buildings, roads and ignores unsupported geometry', () => {
    const map = parseGeoJSON(sample);
    expect(map.buildings).toHaveLength(2);
    expect(map.roads).toHaveLength(1);
  });

  it('derives height from levels or explicit height', () => {
    const map = parseGeoJSON(sample);
    expect(map.buildings[0].height).toBeCloseTo(4 * 3.2, 5);
    expect(map.buildings[1].height).toBe(15);
  });

  it('classifies categories, defaulting to generic', () => {
    const map = parseGeoJSON(sample);
    expect(map.buildings[0].category).toBe('commercial');
    expect(map.buildings[1].category).toBe('generic');
  });

  it('maps lon/lat to x/-z and computes bounds', () => {
    const map = parseGeoJSON(sample);
    expect(map.bounds.minX).toBe(0);
    expect(map.bounds.maxX).toBe(50);
    // lat 20 -> z -20, lat 50 -> z -50
    expect(map.bounds.minZ).toBe(-50);
    expect(map.bounds.maxZ).toBeCloseTo(0, 10);
  });

  it('is resilient to empty / malformed input', () => {
    expect(parseGeoJSON(null).buildings).toHaveLength(0);
    expect(parseGeoJSON({}).roads).toHaveLength(0);
  });
});
