/**
 * Deterministic accumulating race timer. Advanced explicitly with `dt` (seconds)
 * so it stays in lockstep with the fixed physics step and is easy to unit test.
 */
export class LapTimer {
  private elapsed = 0;
  private running = false;

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.elapsed = 0;
    this.running = false;
  }

  update(dt: number): void {
    if (this.running) this.elapsed += dt;
  }

  get seconds(): number {
    return this.elapsed;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Format as MM:SS.mmm (e.g. 01:28.422). */
  static format(totalSeconds: number): string {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const millis = Math.floor((totalSeconds * 1000) % 1000);
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    const ms = String(millis).padStart(3, '0');
    return `${mm}:${ss}.${ms}`;
  }

  get formatted(): string {
    return LapTimer.format(this.elapsed);
  }
}
