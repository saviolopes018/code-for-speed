import * as THREE from 'three';
import type { GateTransform } from '../world/TrackBuilder';

/**
 * A single checkpoint gate. Passing is detected by planar proximity to the gate
 * centre — simple, robust, and independent of frame rate / tunnelling.
 */
export class Checkpoint {
  readonly position: THREE.Vector3;
  readonly forward: THREE.Vector3;
  readonly radius: number;

  constructor(
    readonly index: number,
    gate: GateTransform,
    readonly isStartFinish: boolean,
  ) {
    this.position = gate.position.clone();
    this.forward = gate.forward.clone();
    // A generous radius (~70% of road width) so it is comfortably hittable.
    this.radius = Math.max(6, gate.width * 0.7);
  }

  /** True when a world position is within the gate's trigger radius (XZ). */
  contains(pos: THREE.Vector3Like): boolean {
    const dx = pos.x - this.position.x;
    const dz = pos.z - this.position.z;
    return dx * dx + dz * dz <= this.radius * this.radius;
  }
}
