import * as THREE from 'three';
import { RAPIER, type Physics } from '../core/Physics';
import type { VehicleConfig } from './VehicleConfig';
import { NitroSystem } from './NitroSystem';
import { type VehicleTelemetry, createEmptyTelemetry } from './VehicleTelemetry';

export interface DriveCommand {
  throttle: number;
  brake: number;
  steer: number; // -1..1 (already smoothed by controller)
  handbrake: boolean;
  nitro: boolean;
}

/**
 * Velocity-based arcade car model living on a Rapier rigid body.
 *
 * We do NOT simulate tyres/suspension. Each fixed step we decompose the body's
 * planar velocity into forward/lateral components, drive the forward component
 * with the engine and shed the lateral component according to a "grip" factor.
 * Steering directly targets a yaw angular velocity. This gives a predictable,
 * tunable, arcade feel while Rapier still handles collisions and gravity.
 */
export class VehiclePhysics {
  readonly body: RAPIER.RigidBody;
  private readonly collider: RAPIER.Collider;
  private readonly nitro: NitroSystem;
  readonly telemetry: VehicleTelemetry;

  private spawn: { pos: THREE.Vector3; yaw: number };

  // scratch objects reused every step to avoid per-frame allocations
  private readonly _q = new THREE.Quaternion();
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _vel = new THREE.Vector3();

  constructor(
    physics: Physics,
    private readonly config: VehicleConfig,
    spawnPos: THREE.Vector3,
    spawnYaw = 0,
  ) {
    this.spawn = { pos: spawnPos.clone(), yaw: spawnYaw };
    this.nitro = new NitroSystem(config);
    this.telemetry = createEmptyTelemetry(config.nitroCapacity);

    const he = config.halfExtents;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z)
      .setLinearDamping(0)
      .setAngularDamping(1.2)
      // Only yaw is free; locking pitch/roll keeps the arcade car upright.
      .enabledRotations(false, true, false)
      .setCcdEnabled(true);
    this.body = physics.world.createRigidBody(bodyDesc);
    this.setYaw(spawnYaw);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z)
      .setDensity(config.mass / (8 * he.x * he.y * he.z))
      .setFriction(0.2)
      .setRestitution(0.1);
    this.collider = physics.world.createCollider(colliderDesc, this.body);
  }

  private setYaw(yaw: number): void {
    this._q.setFromEuler(new THREE.Euler(0, yaw, 0));
    this.body.setRotation(
      { x: this._q.x, y: this._q.y, z: this._q.z, w: this._q.w },
      true,
    );
  }

  /** Advance the arcade model by one fixed step. */
  step(cmd: DriveCommand, dt: number): void {
    const cfg = this.config;
    this.nitro.update(cmd.nitro, dt);

    // Basis vectors from the current heading.
    const r = this.body.rotation();
    this._q.set(r.x, r.y, r.z, r.w);
    this._forward.set(0, 0, -1).applyQuaternion(this._q);
    this._right.set(1, 0, 0).applyQuaternion(this._q);

    const lv = this.body.linvel();
    this._vel.set(lv.x, lv.y, lv.z);
    const vy = this._vel.y;
    let forwardSpeed = this._vel.dot(this._forward);
    const lateralSpeed = this._vel.dot(this._right);

    // ---- Longitudinal (engine / brake / drag) ----
    let accel = 0;
    if (cmd.throttle > 0) accel += cmd.throttle * cfg.acceleration;
    accel += this.nitro.force; // 0 when inactive

    if (cmd.brake > 0) {
      if (forwardSpeed > 0.5) {
        accel -= cmd.brake * cfg.brakingForce; // braking
      } else {
        accel -= cmd.brake * cfg.acceleration * 0.55; // reverse
      }
    }
    if (cmd.throttle === 0 && cmd.brake === 0) {
      accel -= Math.sign(forwardSpeed) * cfg.engineBraking;
    }

    forwardSpeed += accel * dt;
    forwardSpeed *= 1 - cfg.drag * dt; // rolling resistance

    const maxForward = cfg.maxSpeed + (this.nitro.isActive ? cfg.nitroMaxSpeedBonus : 0);
    forwardSpeed = THREE.MathUtils.clamp(forwardSpeed, -cfg.reverseMaxSpeed, maxForward);

    // ---- Lateral grip (this is what makes drift happen) ----
    let grip = cfg.lateralGrip;
    const fast = Math.abs(forwardSpeed) > cfg.driftMinSpeed;
    if (cmd.handbrake) {
      grip = cfg.lateralGrip * cfg.handbrakeGripMultiplier;
    } else if (fast && Math.abs(cmd.steer) > 0.5 && cmd.throttle > 0.1) {
      grip = cfg.driftGrip;
    }
    const newLateral = lateralSpeed * (1 - grip);

    // Recompose world velocity, keeping vertical component (gravity).
    this._vel
      .copy(this._forward)
      .multiplyScalar(forwardSpeed)
      .addScaledVector(this._right, newLateral);
    this.body.setLinvel({ x: this._vel.x, y: vy, z: this._vel.z }, true);

    // ---- Steering (target a yaw rate; scale down with speed) ----
    const speedRatio = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / cfg.maxSpeed, 0, 1);
    const authority = THREE.MathUtils.lerp(1, cfg.highSpeedSteerFalloff, speedRatio);
    const dir = forwardSpeed >= 0 ? 1 : -1;
    // No turning in place: fade steering in over the first few m/s.
    const rollFactor = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 4, 0, 1);
    const targetYaw = -cmd.steer * cfg.steeringAngle * authority * dir * rollFactor;
    const av = this.body.angvel();
    const newYaw = THREE.MathUtils.lerp(
      av.y,
      targetYaw,
      THREE.MathUtils.clamp(cfg.steeringSpeed * dt, 0, 1),
    );
    this.body.setAngvel({ x: 0, y: newYaw, z: 0 }, true);

    this.updateTelemetry(cmd, forwardSpeed, newLateral, grip, dt);
  }

  private updateTelemetry(
    cmd: DriveCommand,
    forwardSpeed: number,
    lateralSpeed: number,
    grip: number,
    dt: number,
  ): void {
    const t = this.telemetry;
    t.speed = forwardSpeed;
    t.speedKmh = Math.abs(forwardSpeed) * 3.6;
    t.throttle = cmd.throttle;
    t.brake = cmd.brake;
    t.steer = cmd.steer;
    t.lateralVelocity = lateralSpeed;
    t.currentGrip = grip;
    t.handbrake = cmd.handbrake;
    t.nitro = this.nitro.value;
    t.nitroActive = this.nitro.isActive;

    t.driftAngle = Math.atan2(Math.abs(lateralSpeed), Math.max(Math.abs(forwardSpeed), 0.001));
    t.isDrifting =
      Math.abs(forwardSpeed) > this.config.driftMinSpeed &&
      t.driftAngle > this.config.driftAngleThreshold;
    t.driftDuration = t.isDrifting ? t.driftDuration + dt : 0;
  }

  get position(): RAPIER.Vector {
    return this.body.translation();
  }

  get rotation(): RAPIER.Rotation {
    return this.body.rotation();
  }

  /** Up-axis Y of the chassis; used to detect a rollover for auto-reset. */
  get upDot(): number {
    const r = this.body.rotation();
    this._q.set(r.x, r.y, r.z, r.w);
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this._q).y;
  }

  /** Reposition at a given place (checkpoint reset). */
  respawn(pos: THREE.Vector3, yaw: number): void {
    this.body.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    this.setYaw(yaw);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.nitro.reset();
    this.telemetry.driftDuration = 0;
  }

  /** Reset to the original spawn (full race restart). */
  resetToSpawn(): void {
    this.respawn(this.spawn.pos, this.spawn.yaw);
  }

  /** Update where a fresh spawn/reset should place the car. */
  setSpawn(pos: THREE.Vector3, yaw: number): void {
    this.spawn = { pos: pos.clone(), yaw };
  }

  dispose(physics: Physics): void {
    physics.world.removeCollider(this.collider, false);
    physics.world.removeRigidBody(this.body);
  }
}
