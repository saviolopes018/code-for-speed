import { LapTimer } from '../race/LapTimer';

/** Full-screen overlays: title screen, countdown, and results. */
export class Overlay {
  constructor(private readonly root: HTMLElement) {}

  private clear(): void {
    this.root.innerHTML = '';
  }

  showTitle(onStart: () => void): void {
    this.clear();
    this.root.innerHTML = `
      <div class="overlay-center title-screen">
        <div class="brand">CODE FOR SPEED</div>
        <div class="tagline">STREET RACING · ZERO INSTALL</div>
        <div class="start">PRESS ENTER TO RACE</div>
      </div>`;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        window.removeEventListener('keydown', handler);
        this.clear();
        onStart();
      }
    };
    window.addEventListener('keydown', handler);
  }

  showCountdown(label: string): void {
    if (!label) {
      this.clear();
      return;
    }
    const go = label === 'GO';
    this.root.innerHTML = `
      <div class="overlay-center">
        <div class="countdown ${go ? 'go' : ''}">${label}</div>
      </div>`;
  }

  showResults(timeSeconds: number, onRestart: () => void): void {
    this.clear();
    this.root.innerHTML = `
      <div class="overlay-center">
        <div class="results">
          <h1>FINISH</h1>
          <div class="final-time">${LapTimer.format(timeSeconds)}</div>
          <div class="sub">PRESS R TO RACE AGAIN</div>
        </div>
      </div>`;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' || e.code === 'Enter') {
        window.removeEventListener('keydown', handler);
        this.clear();
        onRestart();
      }
    };
    window.addEventListener('keydown', handler);
  }

  clearAll(): void {
    this.clear();
  }
}
