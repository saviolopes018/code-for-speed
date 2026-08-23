/**
 * Keyboard input abstraction. Exposes a normalized snapshot the vehicle and
 * game consume, decoupled from raw key codes.
 */
export interface InputState {
  throttle: number; // 0..1
  brake: number; // 0..1  (reverse / brake)
  steer: number; // -1 (left) .. 1 (right)
  handbrake: boolean;
  nitro: boolean;
}

type Action = 'up' | 'down' | 'left' | 'right' | 'handbrake' | 'nitro';

const KEY_MAP: Record<string, Action> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'handbrake',
  ShiftLeft: 'nitro',
  ShiftRight: 'nitro',
};

export class InputManager {
  private pressed = new Set<Action>();
  private onceHandlers = new Map<string, Array<() => void>>();
  private keydown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private keyup = (e: KeyboardEvent) => this.handleKeyUp(e);

  attach(target: Window = window): void {
    target.addEventListener('keydown', this.keydown);
    target.addEventListener('keyup', this.keyup);
  }

  detach(target: Window = window): void {
    target.removeEventListener('keydown', this.keydown);
    target.removeEventListener('keyup', this.keyup);
    this.pressed.clear();
  }

  /** Register a one-shot handler for a raw key code (e.g. 'KeyR', 'Escape'). */
  onKey(code: string, handler: () => void): void {
    const list = this.onceHandlers.get(code) ?? [];
    list.push(handler);
    this.onceHandlers.set(code, list);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const handlers = this.onceHandlers.get(e.code);
    if (handlers) {
      // Fire discrete actions only on the initial press, not on auto-repeat.
      if (!e.repeat) handlers.forEach((h) => h());
    }
    const action = KEY_MAP[e.code];
    if (action) {
      this.pressed.add(action);
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const action = KEY_MAP[e.code];
    if (action) {
      this.pressed.delete(action);
      e.preventDefault();
    }
  }

  /** Clear held state (used on pause / focus loss). */
  releaseAll(): void {
    this.pressed.clear();
  }

  getState(): InputState {
    const up = this.pressed.has('up');
    const down = this.pressed.has('down');
    const left = this.pressed.has('left');
    const right = this.pressed.has('right');
    return {
      throttle: up ? 1 : 0,
      brake: down ? 1 : 0,
      steer: (right ? 1 : 0) - (left ? 1 : 0),
      handbrake: this.pressed.has('handbrake'),
      nitro: this.pressed.has('nitro'),
    };
  }
}
