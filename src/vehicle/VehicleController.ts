import * as THREE from 'three';
import type { InputState } from '../core/InputManager';
import type { DriveCommand } from './VehiclePhysics';
import type { VehicleConfig } from './VehicleConfig';

/**
 * Turns raw input into a smoothed {@link DriveCommand}. Keeping this separate
 * means the physics never sees the keyboard, and steering easing lives in one
 * place. Steering is eased so taps feel analog rather than binary.
 */
export class VehicleController {
  private steer = 0;

  constructor(private readonly config: VehicleConfig) {}

  update(input: InputState, dt: number): DriveCommand {
    const target = input.steer;
    // Ease toward the target; snap back to centre faster than we push out.
    const rate = this.config.steeringSpeed * (target === 0 ? 1.6 : 1);
    this.steer = THREE.MathUtils.damp(this.steer, target, rate, dt);
    if (Math.abs(this.steer) < 0.001) this.steer = 0;

    return {
      throttle: input.throttle,
      brake: input.brake,
      steer: THREE.MathUtils.clamp(this.steer, -1, 1),
      handbrake: input.handbrake,
      nitro: input.nitro,
    };
  }

  reset(): void {
    this.steer = 0;
  }
}
