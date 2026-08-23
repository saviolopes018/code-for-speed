import * as THREE from 'three';
import type { GateTransform } from '../world/TrackBuilder';
import { Checkpoint } from './Checkpoint';

export interface CheckpointEvent {
  passed: boolean;
  checkpointIndex: number;
  lapCompleted: boolean;
  finished: boolean;
}

const NO_EVENT: CheckpointEvent = {
  passed: false,
  checkpointIndex: -1,
  lapCompleted: false,
  finished: false,
};

/**
 * Enforces that the player passes every checkpoint IN ORDER before a lap counts.
 * Gate 0 is the start/finish line. A lap requires gates 1..N-1 then gate 0 again,
 * so you cannot finish by only crossing the finish line — anti-shortcut by design.
 */
export class CheckpointManager {
  readonly checkpoints: Checkpoint[];
  readonly totalCheckpoints: number;
  readonly totalLaps: number;

  /** Index of the next gate the player must reach. */
  next = 1;
  lap = 1;
  raceFinished = false;

  constructor(gates: GateTransform[], totalLaps = 1) {
    this.checkpoints = gates.map(
      (g, i) => new Checkpoint(i, g, i === 0),
    );
    this.totalCheckpoints = this.checkpoints.length;
    this.totalLaps = totalLaps;
  }

  /** Last valid respawn transform (the gate most recently passed). */
  get lastCheckpoint(): Checkpoint {
    const idx = (this.next - 1 + this.totalCheckpoints) % this.totalCheckpoints;
    return this.checkpoints[idx];
  }

  /** Feed the car position each step; returns what happened this step. */
  update(pos: THREE.Vector3): CheckpointEvent {
    if (this.raceFinished) return NO_EVENT;
    const gate = this.checkpoints[this.next];
    if (!gate.contains(pos)) return NO_EVENT;

    const passedIndex = this.next;
    let lapCompleted = false;
    let finished = false;

    if (passedIndex === 0) {
      // Crossed the start/finish after completing the loop.
      lapCompleted = true;
      if (this.lap >= this.totalLaps) {
        finished = true;
        this.raceFinished = true;
      } else {
        this.lap += 1;
      }
    }

    if (!finished) {
      this.next = (this.next + 1) % this.totalCheckpoints;
    }

    return { passed: true, checkpointIndex: passedIndex, lapCompleted, finished };
  }

  reset(): void {
    this.next = 1;
    this.lap = 1;
    this.raceFinished = false;
  }
}
