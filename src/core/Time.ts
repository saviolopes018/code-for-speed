/**
 * Fixed-timestep clock helper. Physics runs at a fixed dt for determinism;
 * rendering uses the leftover accumulator only for interpolation if needed.
 */
export class Time {
  /** Fixed physics step in seconds (60 Hz). */
  readonly fixedDelta = 1 / 60;
  /** Max frame delta to avoid the "spiral of death" after a tab stall. */
  readonly maxDelta = 0.1;

  private last = 0;
  private accumulator = 0;

  /** Wall-clock seconds since the loop started. */
  elapsed = 0;
  /** Last rendered frame delta (seconds), clamped. */
  frameDelta = 0;

  start(nowMs: number): void {
    this.last = nowMs;
  }

  /**
   * Advance the clock. Returns how many fixed steps should run this frame.
   */
  tick(nowMs: number): number {
    let delta = (nowMs - this.last) / 1000;
    this.last = nowMs;
    if (delta > this.maxDelta) delta = this.maxDelta;
    if (delta < 0) delta = 0;

    this.frameDelta = delta;
    this.elapsed += delta;
    this.accumulator += delta;

    let steps = 0;
    while (this.accumulator >= this.fixedDelta) {
      this.accumulator -= this.fixedDelta;
      steps++;
      if (steps > 5) {
        this.accumulator = 0;
        break;
      }
    }
    return steps;
  }
}
