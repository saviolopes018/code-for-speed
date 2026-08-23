import { describe, it, expect } from 'vitest';
import { cumulativeLengths, macroTone } from '../src/world/RoadGenerator';

describe('cumulativeLengths (longitudinal UV)', () => {
  it('starts at zero and is non-decreasing', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 10, z: 0 },
      { x: 10, z: 5 },
      { x: 10, z: 5 }, // duplicate point → no advance
    ];
    const l = cumulativeLengths(pts);
    expect(l[0]).toBe(0);
    for (let i = 1; i < l.length; i++) expect(l[i]).toBeGreaterThanOrEqual(l[i - 1]);
  });

  it('accumulates real distance so the texture repeats by metres', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 3, z: 4 }, // 5m
      { x: 3, z: 14 }, // +10m = 15m
    ];
    const l = cumulativeLengths(pts);
    expect(l[1]).toBeCloseTo(5, 6);
    expect(l[2]).toBeCloseTo(15, 6);
  });

  it('total equals the summed segment lengths', () => {
    const pts = [
      { x: 0, z: 0 },
      { x: 8, z: 0 },
      { x: 8, z: 6 },
      { x: 0, z: 6 },
    ];
    const l = cumulativeLengths(pts);
    expect(l[l.length - 1]).toBeCloseTo(8 + 6 + 8, 6);
  });

  it('is dense-sampling invariant (subdividing a straight line keeps the length)', () => {
    const coarse = cumulativeLengths([
      { x: 0, z: 0 },
      { x: 100, z: 0 },
    ]);
    const fine = cumulativeLengths(
      Array.from({ length: 11 }, (_, i) => ({ x: i * 10, z: 0 })),
    );
    expect(fine[fine.length - 1]).toBeCloseTo(coarse[coarse.length - 1], 6);
  });
});

describe('macroTone (macro variation)', () => {
  it('is deterministic', () => {
    expect(macroTone(12.5, -30)).toBe(macroTone(12.5, -30));
  });

  it('stays within a subtle bound around 1', () => {
    for (let x = -500; x <= 500; x += 37) {
      for (let z = -500; z <= 500; z += 41) {
        const t = macroTone(x, z);
        expect(t).toBeGreaterThan(0.9);
        expect(t).toBeLessThan(1.1);
      }
    }
  });

  it('actually varies across the map', () => {
    const values = new Set<number>();
    for (let i = 0; i < 50; i++) values.add(Number(macroTone(i * 17, i * -23).toFixed(4)));
    expect(values.size).toBeGreaterThan(10);
  });
});
