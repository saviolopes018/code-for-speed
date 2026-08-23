import * as THREE from 'three';
import type { GateTransform } from '../world/TrackBuilder';

/**
 * Visual gate markers: two glowing posts per checkpoint. The next required gate
 * glows accent-orange; the start/finish is white; others are dimmed. Purely
 * cosmetic feedback — the logic lives in CheckpointManager.
 */
export class CheckpointVisuals {
  readonly group = new THREE.Group();
  private readonly leftPosts: THREE.Mesh[] = [];
  private readonly rightPosts: THREE.Mesh[] = [];

  private readonly matNext = new THREE.MeshStandardMaterial({
    color: 0xff7a1a,
    emissive: 0xff7a1a,
    emissiveIntensity: 2.4,
  });
  private readonly matStart = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xbfe4ff,
    emissiveIntensity: 1.4,
  });
  private readonly matIdle = new THREE.MeshStandardMaterial({
    color: 0x35507a,
    emissive: 0x14314f,
    emissiveIntensity: 0.8,
  });

  constructor(gates: GateTransform[]) {
    const geo = new THREE.BoxGeometry(0.5, 5, 0.5);
    const up = new THREE.Vector3(0, 1, 0);
    for (const gate of gates) {
      const side = new THREE.Vector3().crossVectors(gate.forward, up).normalize();
      const half = gate.width / 2;
      const l = new THREE.Mesh(geo, this.matIdle);
      l.position.copy(gate.position).addScaledVector(side, -half);
      l.position.y = 2.5;
      const r = new THREE.Mesh(geo, this.matIdle);
      r.position.copy(gate.position).addScaledVector(side, half);
      r.position.y = 2.5;
      this.group.add(l, r);
      this.leftPosts.push(l);
      this.rightPosts.push(r);
    }
  }

  /** Highlight the currently required gate. */
  setActive(nextIndex: number): void {
    for (let i = 0; i < this.leftPosts.length; i++) {
      const mat = i === nextIndex ? this.matNext : i === 0 ? this.matStart : this.matIdle;
      this.leftPosts[i].material = mat;
      this.rightPosts[i].material = mat;
    }
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.group);
  }
}
