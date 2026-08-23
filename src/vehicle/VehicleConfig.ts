/**
 * Single source of truth for the arcade car handling. Tune everything here.
 * Values are intentionally "gamey" — this is not a physical simulation.
 *
 * Units: forces/accel are in m/s^2 applied to velocity, speeds in m/s.
 * (1 m/s ~= 3.6 km/h — the HUD converts for display.)
 */
export interface VehicleConfig {
  mass: number;

  /** Forward acceleration (m/s^2) at full throttle. */
  acceleration: number;
  /** Deceleration from the brake / reverse input. */
  brakingForce: number;
  /** Hard cap on forward speed (m/s). */
  maxSpeed: number;
  /** Hard cap on reverse speed (m/s). */
  reverseMaxSpeed: number;

  /** Max steering rate (rad/s) of the car's heading at low speed. */
  steeringAngle: number;
  /** How fast the steering input eases in/out. */
  steeringSpeed: number;
  /** Steering authority multiplier at top speed (0..1). Lower = calmer. */
  highSpeedSteerFalloff: number;

  /** Longitudinal rolling resistance (fraction of speed shed per second). */
  drag: number;
  /** Engine-braking when coasting (no throttle, no brake). */
  engineBraking: number;

  /** Base lateral grip 0..1 — how much sideways slip is killed per step. */
  lateralGrip: number;
  /** Lateral grip while drifting (throttle + steer at speed). */
  driftGrip: number;
  /** Lateral grip multiplier while the handbrake is held. */
  handbrakeGripMultiplier: number;
  /** Speed (m/s) above which the car can start to drift. */
  driftMinSpeed: number;
  /** Slip angle (rad) above which telemetry reports a drift. */
  driftAngleThreshold: number;

  /** Extra forward acceleration while nitro is active. */
  nitroForce: number;
  /** Nitro tank size (arbitrary units, HUD shows 0..100). */
  nitroCapacity: number;
  /** Nitro drained per second while held. */
  nitroDrain: number;
  /** Nitro regained per second while not held. */
  nitroRegen: number;
  /** Top-speed bonus while nitro is active (m/s). */
  nitroMaxSpeedBonus: number;

  /** Chassis half-extents (m) for the collider and debug mesh. */
  halfExtents: { x: number; y: number; z: number };
}

export const DEFAULT_VEHICLE_CONFIG: VehicleConfig = {
  mass: 1200,

  acceleration: 26,
  brakingForce: 34,
  maxSpeed: 62, // ~223 km/h
  reverseMaxSpeed: 14,

  steeringAngle: 2.6,
  steeringSpeed: 7,
  highSpeedSteerFalloff: 0.42,

  drag: 0.35,
  engineBraking: 6,

  lateralGrip: 0.92,
  driftGrip: 0.28,
  handbrakeGripMultiplier: 0.22,
  driftMinSpeed: 12,
  driftAngleThreshold: 0.22,

  nitroForce: 34,
  nitroCapacity: 100,
  nitroDrain: 34,
  nitroRegen: 10,
  nitroMaxSpeedBonus: 22,

  halfExtents: { x: 0.9, y: 0.5, z: 2.1 },
};
