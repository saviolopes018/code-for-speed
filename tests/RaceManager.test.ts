import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RaceManager } from '../src/race/RaceManager';
import type { GateTransform } from '../src/world/TrackBuilder';

function gates(): GateTransform[] {
  const pts: [number, number][] = [
    [0, 0],
    [100, 0],
    [100, 100],
    [0, 100],
  ];
  return pts.map(([x, z]) => ({
    position: new THREE.Vector3(x, 0, z),
    forward: new THREE.Vector3(1, 0, 0),
    width: 10,
  }));
}

const at = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const dt = 1 / 60;

describe('RaceManager', () => {
  it('locks controls during the countdown then starts', () => {
    const rm = new RaceManager(gates(), 1);
    expect(rm.controlsLocked).toBe(true);
    expect(rm.raceState).toBe('countdown');

    // Advance ~3s of countdown.
    let started = false;
    for (let i = 0; i < 60 * 4; i++) {
      const u = rm.update(dt, at(0, 0));
      if (u.justStarted) started = true;
    }
    expect(started).toBe(true);
    expect(rm.raceState).toBe('racing');
    expect(rm.controlsLocked).toBe(false);
  });

  it('does not accumulate time before GO', () => {
    const rm = new RaceManager(gates(), 1);
    rm.update(dt, at(0, 0)); // still counting down
    expect(rm.timer.seconds).toBe(0);
  });

  it('runs a full race to finish', () => {
    const rm = new RaceManager(gates(), 1);
    for (let i = 0; i < 60 * 4; i++) rm.update(dt, at(0, 0)); // finish countdown
    expect(rm.raceState).toBe('racing');

    rm.update(dt, at(100, 0));
    rm.update(dt, at(100, 100));
    rm.update(dt, at(0, 100));
    const finish = rm.update(dt, at(0, 0));

    expect(finish.justFinished).toBe(true);
    expect(rm.raceState).toBe('finished');
    expect(rm.finalTime).toBeGreaterThan(0);
  });

  it('restart returns to countdown with a fresh timer', () => {
    const rm = new RaceManager(gates(), 1);
    for (let i = 0; i < 60 * 4; i++) rm.update(dt, at(0, 0));
    rm.restart();
    expect(rm.raceState).toBe('countdown');
    expect(rm.timer.seconds).toBe(0);
    expect(rm.checkpoints.next).toBe(1);
  });
});
