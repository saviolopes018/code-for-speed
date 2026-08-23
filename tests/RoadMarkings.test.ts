import { describe, it, expect } from 'vitest';
import { generateRoadMarkings, placeDashes, roadHasCentreLine } from '../src/world/RoadMarkings';
import type { NormalizedRoad } from '../src/world/geo/GeoTypes';

describe('placeDashes', () => {
  it('returns nothing for a degenerate line', () => {
    expect(placeDashes([{ x: 0, z: 0 }])).toHaveLength(0);
  });

  it('lays dashes along a straight line with the expected duty cycle', () => {
    const dashLen = 3;
    const gapLen = 4.5;
    const length = 75;
    const dashes = placeDashes(
      [
        { x: 0, z: 0 },
        { x: length, z: 0 },
      ],
      dashLen,
      gapLen,
    );
    expect(dashes.length).toBeGreaterThan(5);

    // Painted length ≈ length * dash/(dash+gap).
    const painted = dashes.reduce((s, d) => s + d.length, 0);
    const expected = (length * dashLen) / (dashLen + gapLen);
    expect(painted).toBeCloseTo(expected, 0);

    // All dashes lie on the line and point along +x.
    for (const d of dashes) {
      expect(d.z).toBeCloseTo(0, 6);
      expect(d.dirX).toBeCloseTo(1, 6);
      expect(d.dirZ).toBeCloseTo(0, 6);
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(length);
    }
  });

  it('is deterministic', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 20, z: 10 },
      { x: 40, z: 10 },
    ];
    expect(placeDashes(pts)).toEqual(placeDashes(pts));
  });

  it('carries the dash pattern across segment joins without resetting', () => {
    // One straight run split into two collinear segments must match one segment.
    const oneSeg = placeDashes([
      { x: 0, z: 0 },
      { x: 60, z: 0 },
    ]);
    const twoSeg = placeDashes([
      { x: 0, z: 0 },
      { x: 30, z: 0 },
      { x: 60, z: 0 },
    ]);
    const paintedOne = oneSeg.reduce((s, d) => s + d.length, 0);
    const paintedTwo = twoSeg.reduce((s, d) => s + d.length, 0);
    expect(paintedTwo).toBeCloseTo(paintedOne, 4);
  });
});

describe('roadHasCentreLine', () => {
  const road = (width: number): NormalizedRoad => ({
    id: 'way/1',
    highwayType: 'secondary',
    points: [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
    ],
    width,
  });

  it('marks wide roads and skips narrow ones', () => {
    expect(roadHasCentreLine(road(12))).toBe(true);
    expect(roadHasCentreLine(road(8))).toBe(true);
    expect(roadHasCentreLine(road(5))).toBe(false);
  });
});

describe('generateRoadMarkings geometry', () => {
  // Regression guard: markings must face +Y (up). Reversed winding gives a
  // downward normal and the FrontSide material back-face culls them from above,
  // making the whole surface invisible in gameplay.
  it('produces upward-facing (+Y) marking quads', () => {
    const roads: NormalizedRoad[] = [
      {
        id: 'way/1',
        highwayType: 'secondary',
        width: 10,
        points: [
          { x: 0, z: 0 },
          { x: 80, z: 0 },
        ],
      },
    ];
    const { mesh, stats } = generateRoadMarkings(roads);
    expect(stats.dashes).toBeGreaterThan(0);
    const n = mesh.geometry.getAttribute('normal');
    for (let i = 0; i < n.count; i++) {
      expect(n.getY(i)).toBeGreaterThan(0.9);
    }
  });
});
