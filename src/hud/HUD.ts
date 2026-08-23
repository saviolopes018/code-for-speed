import type { VehicleTelemetry } from '../vehicle/VehicleTelemetry';

/** Minimal free-roam HUD: region label, speed, nitro bar. Plain DOM. */
export class HUD {
  private readonly root: HTMLElement;
  private readonly regionEl: HTMLElement;
  private readonly speedEl: HTMLElement;
  private readonly nitroWrap: HTMLElement;
  private readonly nitroFill: HTMLElement;

  constructor(container: HTMLElement) {
    this.root = container;
    container.innerHTML = `
      <div class="hud-top">
        <div class="hud-region" data-region>FREE ROAM</div>
      </div>
      <div class="hud-speed">
        <div class="value" data-speed>0</div>
        <div class="unit">KM/H</div>
      </div>
      <div class="hud-nitro">
        <div class="label">NITRO</div>
        <div class="bar"><div class="fill" data-nitro></div></div>
      </div>
      <div class="hud-hint">W/S drive · A/D steer · SPACE handbrake · SHIFT nitro · R reset · C camera · F3 debug</div>
      <div class="hud-attribution">© OpenStreetMap contributors</div>
    `;
    this.regionEl = container.querySelector('[data-region]')!;
    this.speedEl = container.querySelector('[data-speed]')!;
    this.nitroWrap = container.querySelector('.hud-nitro')!;
    this.nitroFill = container.querySelector('[data-nitro]')!;
  }

  setRegion(name: string): void {
    this.regionEl.textContent = name;
  }

  update(t: VehicleTelemetry): void {
    this.speedEl.textContent = String(Math.round(t.speedKmh));
    this.nitroFill.style.width = `${Math.max(0, Math.min(1, t.nitro / 100)) * 100}%`;
    this.nitroWrap.classList.toggle('active', t.nitroActive);
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'block' : 'none';
  }
}
