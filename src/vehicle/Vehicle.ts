import * as THREE from 'three';
import type { Physics } from '../core/Physics';
import type { InputState } from '../core/InputManager';
import { DEFAULT_VEHICLE_CONFIG, type VehicleConfig } from './VehicleConfig';
import { VehiclePhysics } from './VehiclePhysics';
import { VehicleController } from './VehicleController';
import { VehicleVisual } from './VehicleVisual';
import type { VehicleTelemetry } from './VehicleTelemetry';

/**
 * Facade combining arcade physics, input smoothing and the visual mesh.
 * The game/camera talk to this and never reach into Rapier directly.
 */
export class Vehicle {
  readonly physics: VehiclePhysics;
  readonly visual: VehicleVisual;
  private readonly controller: VehicleController;
  private readonly _pos = new THREE.Vector3();
  private readonly _quat = new THREE.Quaternion();

  constructor(
    physics: Physics,
    scene: THREE.Scene,
    spawnPos: THREE.Vector3,
    spawnYaw = 0,
    readonly config: VehicleConfig = DEFAULT_VEHICLE_CONFIG,
  ) {
    this.physics = new VehiclePhysics(physics, config, spawnPos, spawnYaw);
    this.controller = new VehicleController(config);
    this.visual = new VehicleVisual(config);
    scene.add(this.visual.root);
    this.syncVisual(0);
  }

  /** One fixed physics step. */
  fixedUpdate(input: InputState, dt: number): void {
    const cmd = this.controller.update(input, dt);
    this.physics.step(cmd, dt);
  }

  /** Per-frame visual sync (runs at render rate). */
  syncVisual(elapsed: number, frameDelta = 0): void {
    const p = this.physics.position;
    const r = this.physics.rotation;
    this._pos.set(p.x, p.y, p.z);
    this._quat.set(r.x, r.y, r.z, r.w);
    this.visual.sync(this._pos, this._quat);

    const t = this.telemetry;
    this.visual.setBraking(t.brake > 0 && t.speed > 0.5);
    this.visual.setNitro(t.nitroActive, elapsed);
    this.visual.spinWheels(t.speed, frameDelta);
  }

  get telemetry(): VehicleTelemetry {
    return this.physics.telemetry;
  }

  get position(): THREE.Vector3 {
    const p = this.physics.position;
    return this._pos.set(p.x, p.y, p.z);
  }

  /** Forward heading (unit vector on the XZ plane). */
  getForward(out = new THREE.Vector3()): THREE.Vector3 {
    const r = this.physics.rotation;
    this._quat.set(r.x, r.y, r.z, r.w);
    return out.set(0, 0, -1).applyQuaternion(this._quat);
  }

  get yaw(): number {
    const r = this.physics.rotation;
    this._quat.set(r.x, r.y, r.z, r.w);
    return new THREE.Euler().setFromQuaternion(this._quat, 'YXZ').y;
  }

  /** True if the car has flipped and should auto-reset. */
  get isFlipped(): boolean {
    return this.physics.upDot < 0.3;
  }

  respawn(pos: THREE.Vector3, yaw: number): void {
    this.physics.respawn(pos, yaw);
    this.controller.reset();
    this.syncVisual(0);
  }

  resetToSpawn(): void {
    this.physics.resetToSpawn();
    this.controller.reset();
    this.syncVisual(0);
  }

  setSpawn(pos: THREE.Vector3, yaw: number): void {
    this.physics.setSpawn(pos, yaw);
  }
}
