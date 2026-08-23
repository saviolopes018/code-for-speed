import * as THREE from 'three';
import type { GateTransform } from '../world/TrackBuilder';
import { CheckpointManager, type CheckpointEvent } from './CheckpointManager';
import { LapTimer } from './LapTimer';

export type RaceState = 'countdown' | 'racing' | 'finished';

export interface RaceUpdate {
  state: RaceState;
  /** Countdown text to show ('3','2','1','GO', '') or '' when not counting. */
  countdownLabel: string;
  /** True the moment GO fires (controls unlock, timer starts). */
  justStarted: boolean;
  checkpoint: CheckpointEvent | null;
  justFinished: boolean;
}

const COUNTDOWN_START = 3;

/**
 * Race state machine: LOAD -> 3-2-1-GO -> checkpoints -> finish.
 * Owns the {@link LapTimer} and {@link CheckpointManager}.
 */
export class RaceManager {
  readonly timer = new LapTimer();
  readonly checkpoints: CheckpointManager;

  private state: RaceState = 'countdown';
  private countdown = COUNTDOWN_START;
  private goHold = 0; // seconds to keep showing "GO"

  constructor(gates: GateTransform[], totalLaps = 1) {
    this.checkpoints = new CheckpointManager(gates, totalLaps);
  }

  get raceState(): RaceState {
    return this.state;
  }

  /** Controls are locked until GO. */
  get controlsLocked(): boolean {
    return this.state === 'countdown';
  }

  update(dt: number, carPos: THREE.Vector3): RaceUpdate {
    let justStarted = false;
    let checkpoint: CheckpointEvent | null = null;
    let justFinished = false;
    let countdownLabel = '';

    if (this.state === 'countdown') {
      const prev = Math.ceil(this.countdown);
      this.countdown -= dt;
      const now = Math.ceil(this.countdown);
      if (this.countdown <= 0) {
        this.state = 'racing';
        this.timer.start();
        this.goHold = 1.0;
        justStarted = true;
        countdownLabel = 'GO';
      } else {
        countdownLabel = String(Math.max(1, now));
        void prev;
      }
    } else if (this.state === 'racing') {
      this.timer.update(dt);
      if (this.goHold > 0) {
        this.goHold -= dt;
        if (this.goHold > 0) countdownLabel = 'GO';
      }
      checkpoint = this.checkpoints.update(carPos);
      if (checkpoint.finished) {
        this.timer.stop();
        this.state = 'finished';
        justFinished = true;
      }
    }

    return {
      state: this.state,
      countdownLabel,
      justStarted,
      checkpoint,
      justFinished,
    };
  }

  restart(): void {
    this.state = 'countdown';
    this.countdown = COUNTDOWN_START;
    this.goHold = 0;
    this.timer.reset();
    this.checkpoints.reset();
  }

  get finalTime(): number {
    return this.timer.seconds;
  }
}
