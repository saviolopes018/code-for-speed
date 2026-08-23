/** Snapshot of the vehicle state for HUD, camera and the debug panel. */
export interface VehicleTelemetry {
  /** Forward speed in m/s (can be negative in reverse). */
  speed: number;
  /** Absolute speed magnitude in km/h for display. */
  speedKmh: number;
  throttle: number;
  brake: number;
  steer: number;
  lateralVelocity: number;
  isDrifting: boolean;
  driftAngle: number;
  driftDuration: number;
  currentGrip: number;
  nitro: number; // 0..capacity
  nitroActive: boolean;
  handbrake: boolean;
}

export function createEmptyTelemetry(nitroCapacity: number): VehicleTelemetry {
  return {
    speed: 0,
    speedKmh: 0,
    throttle: 0,
    brake: 0,
    steer: 0,
    lateralVelocity: 0,
    isDrifting: false,
    driftAngle: 0,
    driftDuration: 0,
    currentGrip: 1,
    nitro: nitroCapacity,
    nitroActive: false,
    handbrake: false,
  };
}
