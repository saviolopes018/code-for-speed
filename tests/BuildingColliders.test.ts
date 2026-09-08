import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { Physics, RAPIER } from '../src/core/Physics';
import { DEFAULT_VEHICLE_CONFIG } from '../src/vehicle/VehicleConfig';
import { VehiclePhysics } from '../src/vehicle/VehiclePhysics';
import { generateBuildingColliders } from '../src/world/BuildingColliders';
import type { NormalizedBuilding } from '../src/world/geo/GeoTypes';

const building: NormalizedBuilding = {
  id: 'concave',
  footprint: [
    { x: 0, z: 0 }, { x: 6, z: 0 }, { x: 6, z: 2 },
    { x: 2, z: 2 }, { x: 2, z: 6 }, { x: 0, z: 6 },
  ],
  height: 8,
  family: 'residential',
  heightSource: 'height',
};

describe('generateBuildingColliders', () => {
  let physics: Physics;
  beforeAll(async () => { await Physics.init(); });
  beforeEach(() => { physics = Physics.create(1 / 60); });
  afterEach(() => { physics.world.free(); });

  it.each([false, true])('matches walls, roof and concave setbacks (reversed=%s)', (reversed) => {
    const footprint = reversed ? [...building.footprint].reverse() : building.footprint;
    expect(generateBuildingColliders(physics, [{ ...building, footprint }])).toBe(1);
    expect(physics.world.bodies.len()).toBe(0);
    physics.step();
    const wall = physics.world.castRay(
      new RAPIER.Ray({ x: -3, y: 1, z: 1 }, { x: 1, y: 0, z: 0 }), 20, true,
    );
    expect(wall?.timeOfImpact).toBeCloseTo(3);
    const roof = physics.world.castRay(
      new RAPIER.Ray({ x: 1, y: 10, z: 1 }, { x: 0, y: -1, z: 0 }), 20, true,
    );
    expect(roof?.timeOfImpact).toBeCloseTo(2);
    const setback = physics.world.castRay(
      new RAPIER.Ray({ x: 4, y: 10, z: 4 }, { x: 0, y: -1, z: 0 }), 20, true,
    );
    expect(setback).toBeNull();
  });

  it('stops a moving dynamic body at the facade', () => {
    generateBuildingColliders(physics, [building]);
    const body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(-3, 1, 1)
        .setGravityScale(0).setLinvel(10, 0, 0).setCcdEnabled(true),
    );
    physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), body);
    for (let i = 0; i < 60; i++) physics.step();
    expect(body.translation().x).toBeLessThan(-0.45);
    expect(Math.abs(body.linvel().x)).toBeLessThan(0.1);
  });

  it.each([false, true])('keeps the actual vehicle outside under sustained throttle (nitro=%s)', (nitro) => {
    generateBuildingColliders(physics, [{
      ...building,
      footprint: [
        { x: -10, z: -10 }, { x: 10, z: -10 },
        { x: 10, z: 0 }, { x: -10, z: 0 },
      ],
    }]);
    physics.world.createCollider(
      RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, -0.5, 0),
    );
    const config = DEFAULT_VEHICLE_CONFIG;
    const vehicle = new VehiclePhysics(physics, config, new Vector3(0, 0.6, 30));
    // Exercise CCD at the configured nitro speed limit as well as acceleration
    // from rest. Keep the engine running against the wall for ten seconds.
    if (nitro) {
      vehicle.body.setLinvel({ x: 0, y: 0, z: -(config.maxSpeed + config.nitroMaxSpeedBonus) }, true);
    }
    let maxSpeed = 0;
    let reachedFacade = false;
    for (let i = 0; i < 600; i++) {
      vehicle.step({ throttle: 1, brake: 0, steer: 0, handbrake: false, nitro }, physics.fixedDelta);
      maxSpeed = Math.max(maxSpeed, Math.abs(vehicle.body.linvel().z));
      physics.step();
      const { x, y, z } = vehicle.position;
      expect([x, y, z].every(Number.isFinite)).toBe(true);
      // Rapier resolves a small transient overlap on the first impact step.
      expect(z).toBeGreaterThanOrEqual(config.halfExtents.z - 0.2);
      expect(Math.abs(x)).toBeLessThan(1);
      expect(y).toBeGreaterThan(0.4);
      reachedFacade ||= z < config.halfExtents.z + 0.2;
    }
    expect(reachedFacade).toBe(true);
    expect(maxSpeed).toBeGreaterThan(nitro ? config.maxSpeed : 20);
    expect(vehicle.position.z).toBeGreaterThan(config.halfExtents.z - 0.02);
    expect(vehicle.position.z).toBeLessThan(config.halfExtents.z + 0.2);
    vehicle.dispose(physics);
  });

  it('skips invalid footprints and heights', () => {
    expect(generateBuildingColliders(physics, [
      { ...building, footprint: [] },
      { ...building, height: 0 },
      { ...building, height: NaN },
      { ...building, footprint: [{ x: 0, z: 0 }, { x: 1, z: 1 }, { x: 2, z: 2 }] },
      { ...building, footprint: [{ x: NaN, z: 0 }, ...building.footprint] },
    ])).toBe(0);
    expect(physics.world.colliders.len()).toBe(0);
  });
});
