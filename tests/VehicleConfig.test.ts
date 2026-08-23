import { describe, it, expect } from 'vitest';
import { DEFAULT_VEHICLE_CONFIG } from '../src/vehicle/VehicleConfig';

describe('DEFAULT_VEHICLE_CONFIG', () => {
  const c = DEFAULT_VEHICLE_CONFIG;

  it('has sane, arcade-tuned values', () => {
    expect(c.maxSpeed).toBeGreaterThan(c.reverseMaxSpeed);
    expect(c.acceleration).toBeGreaterThan(0);
    expect(c.brakingForce).toBeGreaterThan(0);
    expect(c.nitroCapacity).toBe(100);
  });

  it('keeps grip factors in a valid 0..1 range', () => {
    expect(c.lateralGrip).toBeGreaterThan(0);
    expect(c.lateralGrip).toBeLessThanOrEqual(1);
    expect(c.driftGrip).toBeLessThan(c.lateralGrip);
    expect(c.handbrakeGripMultiplier).toBeGreaterThan(0);
    expect(c.handbrakeGripMultiplier).toBeLessThan(1);
  });

  it('drift is easier than full grip', () => {
    // Handbrake should reduce effective grip below the drift threshold.
    expect(c.lateralGrip * c.handbrakeGripMultiplier).toBeLessThan(c.driftGrip);
  });
});
