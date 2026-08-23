import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CheckpointManager } from '../src/race/CheckpointManager';
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

describe('CheckpointManager', () => {
  it('starts requiring gate 1, lap 1', () => {
    const cm = new CheckpointManager(gates(), 1);
    expect(cm.next).toBe(1);
    expect(cm.lap).toBe(1);
    expect(cm.totalCheckpoints).toBe(4);
  });

  it('cannot finish by only crossing the start line (anti-shortcut)', () => {
    const cm = new CheckpointManager(gates(), 1);
    const ev = cm.update(at(0, 0)); // sitting on gate 0
    expect(ev.passed).toBe(false);
    expect(cm.raceFinished).toBe(false);
  });

  it('advances only through gates in order', () => {
    const cm = new CheckpointManager(gates(), 1);
    expect(cm.update(at(100, 100)).passed).toBe(false); // gate 2 too early
    expect(cm.update(at(100, 0)).passed).toBe(true); // gate 1
    expect(cm.next).toBe(2);
  });

  it('completes a full lap and finishes', () => {
    const cm = new CheckpointManager(gates(), 1);
    cm.update(at(100, 0));
    cm.update(at(100, 100));
    cm.update(at(0, 100));
    const finish = cm.update(at(0, 0));
    expect(finish.passed).toBe(true);
    expect(finish.lapCompleted).toBe(true);
    expect(finish.finished).toBe(true);
    expect(cm.raceFinished).toBe(true);
  });

  it('supports multiple laps', () => {
    const cm = new CheckpointManager(gates(), 2);
    // lap 1
    cm.update(at(100, 0));
    cm.update(at(100, 100));
    cm.update(at(0, 100));
    const lap1 = cm.update(at(0, 0));
    expect(lap1.lapCompleted).toBe(true);
    expect(lap1.finished).toBe(false);
    expect(cm.lap).toBe(2);
    expect(cm.next).toBe(1);
  });
});
