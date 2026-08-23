import { describe, it, expect } from 'vitest';
import { LapTimer } from '../src/race/LapTimer';

describe('LapTimer', () => {
  it('does not advance until started', () => {
    const t = new LapTimer();
    t.update(1);
    expect(t.seconds).toBe(0);
  });

  it('accumulates time while running', () => {
    const t = new LapTimer();
    t.start();
    t.update(0.5);
    t.update(0.25);
    expect(t.seconds).toBeCloseTo(0.75, 6);
  });

  it('stops accumulating after stop()', () => {
    const t = new LapTimer();
    t.start();
    t.update(1);
    t.stop();
    t.update(5);
    expect(t.seconds).toBeCloseTo(1, 6);
  });

  it('formats as MM:SS.mmm', () => {
    expect(LapTimer.format(88.422)).toBe('01:28.422');
    expect(LapTimer.format(0)).toBe('00:00.000');
    expect(LapTimer.format(-3)).toBe('00:00.000');
    expect(LapTimer.format(3661.5)).toBe('61:01.500');
  });
});
