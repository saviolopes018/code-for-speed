import * as THREE from 'three';
import type { VehicleConfig } from './VehicleConfig';

/**
 * Original low-poly "debug" car built from primitives. Kept deliberately simple
 * so physics can be developed without waiting on an art asset. Swappable later:
 * the rest of the game only touches {@link VehicleVisual.root}.
 */
export class VehicleVisual {
  readonly root = new THREE.Group();
  private readonly wheels: THREE.Mesh[] = [];
  private readonly brakeLights: THREE.Mesh[] = [];
  private readonly nitroFlames: THREE.Group;

  constructor(config: VehicleConfig) {
    const he = config.halfExtents;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xd23b2f,
      metalness: 0.4,
      roughness: 0.45,
    });
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1b1e26,
      metalness: 0.2,
      roughness: 0.3,
    });

    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(he.x * 2, he.y * 1.1, he.z * 2),
      bodyMat,
    );
    chassis.position.y = 0.05;
    chassis.castShadow = true;
    this.root.add(chassis);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(he.x * 1.7, he.y * 0.9, he.z * 1.0),
      cabinMat,
    );
    cabin.position.set(0, he.y * 0.9, -he.z * 0.1);
    cabin.castShadow = true;
    this.root.add(cabin);

    // Headlights
    const hlMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff3c0,
      emissiveIntensity: 1.4,
    });
    for (const sx of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.1), hlMat);
      hl.position.set(sx * he.x * 0.6, 0.1, -he.z);
      this.root.add(hl);
    }

    // Brake lights (dim until braking)
    const blMat = new THREE.MeshStandardMaterial({
      color: 0x330000,
      emissive: 0xff1500,
      emissiveIntensity: 0.4,
    });
    for (const sx of [-1, 1]) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.08), blMat.clone());
      bl.position.set(sx * he.x * 0.6, 0.12, he.z);
      this.root.add(bl);
      this.brakeLights.push(bl);
    }

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.9 });
    const wx = he.x * 0.95;
    const wz = he.z * 0.68;
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(sx * wx, -he.y * 0.5, sz * wz);
      w.castShadow = true;
      this.root.add(w);
      this.wheels.push(w);
    }

    // Nitro flame (hidden unless active)
    this.nitroFlames = new THREE.Group();
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x59c6ff,
      transparent: true,
      opacity: 0.9,
    });
    for (const sx of [-0.4, 0.4]) {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 8), flameMat.clone());
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(sx, -0.05, he.z + 0.5);
      this.nitroFlames.add(flame);
    }
    this.nitroFlames.visible = false;
    this.root.add(this.nitroFlames);
  }

  /** Sync visual root to a physics transform. */
  sync(pos: THREE.Vector3Like, quat: THREE.QuaternionLike): void {
    this.root.position.set(pos.x, pos.y, pos.z);
    this.root.quaternion.set(quat.x, quat.y, quat.z, quat.w);
  }

  setBraking(braking: boolean): void {
    for (const bl of this.brakeLights) {
      const mat = bl.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = braking ? 2.2 : 0.4;
    }
  }

  setNitro(active: boolean, t: number): void {
    this.nitroFlames.visible = active;
    if (active) {
      const flicker = 0.75 + Math.sin(t * 40) * 0.25;
      this.nitroFlames.scale.z = flicker;
    }
  }

  /** Spin wheels roughly with speed for a bit of life. */
  spinWheels(speed: number, dt: number): void {
    const spin = (speed / 0.42) * dt;
    for (const w of this.wheels) w.rotation.x += spin;
  }
}
