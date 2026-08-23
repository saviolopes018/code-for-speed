import type { VehicleConfig } from './VehicleConfig';

/**
 * Deterministic nitro tank. Drains while active (and there is fuel), regens
 * slowly otherwise. Pure logic, no rendering — covered by unit tests.
 */
export class NitroSystem {
  private level: number;
  private active = false;

  constructor(private readonly config: VehicleConfig) {
    this.level = config.nitroCapacity;
  }

  /** Advance one step. `requested` is the player holding the nitro key. */
  update(requested: boolean, dt: number): void {
    this.active = requested && this.level > 0;
    if (this.active) {
      this.level = Math.max(0, this.level - this.config.nitroDrain * dt);
    } else {
      this.level = Math.min(
        this.config.nitroCapacity,
        this.level + this.config.nitroRegen * dt,
      );
    }
  }

  /** Extra forward acceleration contributed this step. */
  get force(): number {
    return this.active ? this.config.nitroForce : 0;
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Current fuel, 0..capacity. */
  get value(): number {
    return this.level;
  }

  /** Normalised 0..1 for the HUD bar. */
  get ratio(): number {
    return this.level / this.config.nitroCapacity;
  }

  reset(): void {
    this.level = this.config.nitroCapacity;
    this.active = false;
  }
}
