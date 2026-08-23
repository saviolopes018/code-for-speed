import { describe, it, expect } from 'vitest';
import { NitroSystem } from '../src/vehicle/NitroSystem';
import { DEFAULT_VEHICLE_CONFIG } from '../src/vehicle/VehicleConfig';

const cfg = DEFAULT_VEHICLE_CONFIG;

describe('NitroSystem', () => {
  it('starts full and inactive', () => {
    const n = new NitroSystem(cfg);
    expect(n.value).toBe(cfg.nitroCapacity);
    expect(n.isActive).toBe(false);
    expect(n.force).toBe(0);
  });

  it('drains and provides force while held', () => {
    const n = new NitroSystem(cfg);
    n.update(true, 1);
    expect(n.value).toBeCloseTo(cfg.nitroCapacity - cfg.nitroDrain, 5);
    expect(n.isActive).toBe(true);
    expect(n.force).toBe(cfg.nitroForce);
  });

  it('regenerates when released but never past capacity', () => {
    const n = new NitroSystem(cfg);
    n.update(true, 1);
    const drained = n.value;
    n.update(false, 0.5);
    expect(n.value).toBeGreaterThan(drained);
    n.update(false, 100);
    expect(n.value).toBe(cfg.nitroCapacity);
  });

  it('cannot go negative and deactivates when empty', () => {
    const n = new NitroSystem(cfg);
    n.update(true, 100);
    expect(n.value).toBe(0);
    n.update(true, 1);
    expect(n.isActive).toBe(false);
    expect(n.force).toBe(0);
  });
});
