import { describe, it, expect } from 'vitest';
import { GeoProjection } from '../src/world/geo/GeoProjection';

const origin = { lat: -3.7398314, lon: -38.4871768 };

describe('GeoProjection', () => {
  const proj = new GeoProjection(origin);

  it('maps the origin to approximately (0,0)', () => {
    const p = proj.toLocal(origin.lat, origin.lon);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('moving NORTH gives negative Z (convention: north = -Z)', () => {
    const p = proj.toLocal(origin.lat + 0.01, origin.lon);
    expect(p.z).toBeLessThan(0);
    expect(Math.abs(p.x)).toBeLessThan(1e-3);
  });

  it('moving EAST gives positive X (convention: east = +X)', () => {
    const p = proj.toLocal(origin.lat, origin.lon + 0.01);
    expect(p.x).toBeGreaterThan(0);
    expect(Math.abs(p.z)).toBeLessThan(1e-3);
  });

  it('has metric scale accurate to ~1% for a few km', () => {
    // 0.01 deg latitude ≈ 1113.2 m
    const p = proj.toLocal(origin.lat + 0.01, origin.lon);
    expect(Math.abs(p.z)).toBeGreaterThan(1090);
    expect(Math.abs(p.z)).toBeLessThan(1130);
  });

  it('round-trips local -> lat/lon', () => {
    const p = proj.toLocal(origin.lat + 0.005, origin.lon - 0.003);
    const back = proj.toLatLon(p.x, p.z);
    expect(back.lat).toBeCloseTo(origin.lat + 0.005, 6);
    expect(back.lon).toBeCloseTo(origin.lon - 0.003, 6);
  });
});
