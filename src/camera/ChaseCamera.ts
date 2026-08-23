import * as THREE from 'three';
import type { Vehicle } from '../vehicle/Vehicle';

export type CameraMode = 'chase' | 'hood' | 'far';

interface CameraProfile {
  distance: number;
  height: number;
  fov: number;
}

const PROFILES: Record<CameraMode, CameraProfile> = {
  chase: { distance: 8.5, height: 3.6, fov: 70 },
  far: { distance: 13, height: 5.5, fov: 74 },
  hood: { distance: 0.2, height: 1.5, fov: 78 },
};

const MODE_ORDER: CameraMode[] = ['chase', 'far', 'hood'];

/**
 * Arcade third-person camera: smooth follow with velocity look-ahead, dynamic
 * FOV that grows with speed and nitro, lateral lag during drift, and a light
 * high-speed shake. Decoupled from physics — it only reads the Vehicle facade.
 */
export class ChaseCamera {
  private mode: CameraMode = 'chase';
  private modeIndex = 0;

  private readonly currentPos = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private currentFov: number;

  // scratch
  private readonly _forward = new THREE.Vector3();
  private readonly _desired = new THREE.Vector3();
  private readonly _look = new THREE.Vector3();
  private readonly _shake = new THREE.Vector3();

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly target: Vehicle,
  ) {
    this.currentFov = PROFILES[this.mode].fov;
    this.snapBehind();
  }

  cycleMode(): CameraMode {
    this.modeIndex = (this.modeIndex + 1) % MODE_ORDER.length;
    this.mode = MODE_ORDER[this.modeIndex];
    return this.mode;
  }

  /** Place the camera directly behind the car (used on reset). */
  snapBehind(): void {
    const p = this.target.position;
    this.target.getForward(this._forward);
    const prof = PROFILES[this.mode];
    this.currentPos
      .copy(p)
      .addScaledVector(this._forward, -prof.distance)
      .add(new THREE.Vector3(0, prof.height, 0));
    this.lookTarget.copy(p);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.lookTarget);
  }

  update(dt: number, elapsed: number): void {
    const prof = PROFILES[this.mode];
    const p = this.target.position;
    this.target.getForward(this._forward);
    const t = this.target.telemetry;
    const speed = Math.abs(t.speed);
    const speedRatio = THREE.MathUtils.clamp(speed / this.target.config.maxSpeed, 0, 1);

    // Desired position behind the car; pull back a touch more at high speed.
    const dist = prof.distance * (1 + speedRatio * 0.18);
    this._desired
      .copy(p)
      .addScaledVector(this._forward, -dist)
      .add(new THREE.Vector3(0, prof.height, 0));

    // Lateral lag during drift: bias camera toward the slide direction.
    if (this.mode !== 'hood') {
      const lag = THREE.MathUtils.clamp(t.lateralVelocity * 0.18, -3, 3);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        this.target.yaw,
      );
      this._desired.addScaledVector(right, lag);
    }

    // Smooth follow (position damping). Snappier at speed so it never lags far.
    const follow = this.mode === 'hood' ? 30 : 6 + speedRatio * 4;
    this.currentPos.x = THREE.MathUtils.damp(this.currentPos.x, this._desired.x, follow, dt);
    this.currentPos.y = THREE.MathUtils.damp(this.currentPos.y, this._desired.y, follow, dt);
    this.currentPos.z = THREE.MathUtils.damp(this.currentPos.z, this._desired.z, follow, dt);

    // Look-ahead: aim ahead of the car proportional to speed.
    this._look
      .copy(p)
      .addScaledVector(this._forward, 4 + speedRatio * 8)
      .add(new THREE.Vector3(0, 1.1, 0));
    this.lookTarget.x = THREE.MathUtils.damp(this.lookTarget.x, this._look.x, 8, dt);
    this.lookTarget.y = THREE.MathUtils.damp(this.lookTarget.y, this._look.y, 8, dt);
    this.lookTarget.z = THREE.MathUtils.damp(this.lookTarget.z, this._look.z, 8, dt);

    // High-speed / nitro shake.
    const shakeAmt = speedRatio * 0.06 + (t.nitroActive ? 0.08 : 0);
    this._shake.set(
      Math.sin(elapsed * 53) * shakeAmt,
      Math.cos(elapsed * 61) * shakeAmt,
      0,
    );

    this.camera.position.copy(this.currentPos).add(this._shake);
    this.camera.lookAt(this.lookTarget);

    // Dynamic FOV: base + speed + nitro kick.
    const targetFov = prof.fov + speedRatio * 12 + (t.nitroActive ? 8 : 0);
    this.currentFov = THREE.MathUtils.damp(this.currentFov, targetFov, 6, dt);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.01) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
