import './style.css';
import { Game } from './core/Game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const hudEl = document.getElementById('hud') as HTMLElement;
const overlayEl = document.getElementById('overlay') as HTMLElement;
const debugEl = document.getElementById('debug-panel') as HTMLElement;

const game = new Game(canvas, hudEl, overlayEl, debugEl);
game.init().catch((err) => {
  console.error('[CODE FOR SPEED] failed to start:', err);
  overlayEl.innerHTML = `
    <div class="overlay-center">
      <div class="results">
        <h1>ERROR</h1>
        <div class="sub">${String(err)}</div>
      </div>
    </div>`;
});
