/** requestAnimationFrame driver. Calls the tick with a high-res timestamp (ms). */
export class GameLoop {
  private running = false;
  private handle = 0;

  constructor(private readonly tick: (nowMs: number) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    const frame = (now: number) => {
      if (!this.running) return;
      this.tick(now);
      this.handle = requestAnimationFrame(frame);
    };
    this.handle = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.handle);
  }
}
