import RAPIER from '@dimforge/rapier3d-compat';

/**
 * Thin wrapper around a Rapier world. Rapier's WASM must be initialised once
 * before any world is created; call `Physics.init()` and await it at bootstrap.
 */
export class Physics {
  readonly world: RAPIER.World;
  /** Fixed step used by the world; kept in sync with Time.fixedDelta. */
  readonly fixedDelta: number;

  private static ready = false;

  private constructor(fixedDelta: number) {
    this.fixedDelta = fixedDelta;
    this.world = new RAPIER.World({ x: 0, y: -9.81 * 2.2, z: 0 });
    // Slightly stronger-than-earth gravity gives the car a planted, arcade feel.
    this.world.timestep = fixedDelta;
  }

  static async init(): Promise<void> {
    if (!Physics.ready) {
      await RAPIER.init();
      Physics.ready = true;
    }
  }

  static create(fixedDelta: number): Physics {
    if (!Physics.ready) {
      throw new Error('Physics.init() must be awaited before create()');
    }
    return new Physics(fixedDelta);
  }

  step(): void {
    this.world.step();
  }
}

export { RAPIER };
