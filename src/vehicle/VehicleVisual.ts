import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { VehicleConfig } from './VehicleConfig';

/** Procedural Skyline GT-R R34 silhouette; all dimensions follow the existing collider. */
export class VehicleVisual {
  readonly root = new THREE.Group();
  private readonly wheels: THREE.Group[] = [];
  private readonly brakeMaterial = new THREE.MeshStandardMaterial({
    color: 0x940b13, emissive: 0xff1307, emissiveIntensity: 0.15, roughness: 0.23,
  });
  private readonly nitroFlames = new THREE.Group();

  constructor(config: VehicleConfig) {
    const he = config.halfExtents;
    const model = new THREE.Group();
    model.name = 'Nissan Skyline GT-R R34 — Bayside Blue';
    model.scale.set(he.x / 0.9, he.y / 0.5, he.z / 2.1);
    this.root.add(model);
    const blue = new THREE.MeshPhysicalMaterial({
      color: 0x126bc5, metalness: 0.72, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.7,
    });
    const black = new THREE.MeshStandardMaterial({ color: 0x10151c, roughness: 0.62 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x19303f, metalness: 0.35, roughness: 0.12, clearcoat: 1 });
    const alloy = new THREE.MeshStandardMaterial({ color: 0xa4adb8, metalness: 0.85, roughness: 0.23 });
    const tire = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: 0.94 });
    const lamps = new THREE.MeshStandardMaterial({ color: 0xd9edff, emissive: 0xbcdfff, emissiveIntensity: 0.7, roughness: 0.17 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xff951c, roughness: 0.3 });
    const red = new THREE.MeshStandardMaterial({ color: 0xbd1720, metalness: 0.25, roughness: 0.38 });
    const lensCenter = new THREE.MeshStandardMaterial({ color: 0x42050a, metalness: 0.2, roughness: 0.18 });
    const staticParts = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const add = (geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
      const transform = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
      geo.applyMatrix4(transform);
      geo.deleteAttribute('uv');
      const list = staticParts.get(material) ?? [];
      list.push(geo.index ? geo.toNonIndexed() : geo.clone());
      geo.dispose();
      staticParts.set(material, list);
    };
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz);
    // Cross sections soften the nose and shoulder instead of a rectangular debug chassis.
    const loft = (sections: number[][]) => {
      const positions: number[] = [];
      const rings = sections.map(([z, width, bottom, shoulder, crown]) => [
        [-width * 0.93, bottom, z], [-width, shoulder, z], [-width * 0.81, crown, z],
        [width * 0.81, crown, z], [width, shoulder, z], [width * 0.93, bottom, z],
      ]);
      const triangle = (a: number[], b: number[], c: number[]) => positions.push(...a, ...b, ...c);
      for (let j = 0; j < rings.length - 1; j++) for (let k = 0; k < 6; k++) {
        const n = (k + 1) % 6;
        triangle(rings[j][k], rings[j + 1][k], rings[j][n]);
        triangle(rings[j][n], rings[j + 1][k], rings[j + 1][n]);
      }
      for (let k = 1; k < 5; k++) {
        triangle(rings[0][0], rings[0][k], rings[0][k + 1]);
        const last = rings[rings.length - 1];
        triangle(last[0], last[k + 1], last[k]);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      return geo;
    };
    add(loft([[-2.1, 0.77, -0.27, 0.04, 0.12], [-1.94, 0.89, -0.3, 0.18, 0.26], [-1.3, 0.9, -0.3, 0.24, 0.34], [-0.68, 0.87, -0.3, 0.25, 0.36], [0.65, 0.89, -0.3, 0.25, 0.35], [1.45, 0.91, -0.3, 0.26, 0.36], [2.03, 0.87, -0.27, 0.21, 0.29], [2.1, 0.8, -0.2, 0.17, 0.23]]), blue);
    // Sloped windscreen, upright coupe roof and rear glass form a continuous greenhouse.
    add(loft([[-0.88, 0.72, 0.29, 0.31, 0.34], [-0.38, 0.67, 0.3, 0.73, 0.87], [0.52, 0.67, 0.3, 0.74, 0.89], [1.13, 0.73, 0.3, 0.32, 0.37]]), glass);
    add(loft([[-0.39, 0.675, 0.78, 0.82, 0.885], [0.45, 0.68, 0.8, 0.84, 0.91], [0.59, 0.67, 0.78, 0.82, 0.88]]), blue);
    for (const sx of [-1, 1]) {
      // Window pillars and door sill keep the glazing framed in bodywork.
      box(0.055, 0.69, 0.055, blue, sx * 0.67, 0.59, -0.63, 0.75);
      box(0.06, 0.66, 0.10, blue, sx * 0.69, 0.6, 0.84, -0.83);
      box(0.045, 0.49, 0.065, black, sx * 0.695, 0.56, 0.3);
      box(0.08, 0.065, 1.99, blue, sx * 0.74, 0.33, 0.13);
      box(0.11, 0.10, 2.56, blue, sx * 0.88, -0.27, 0);
      box(0.015, 0.018, 0.24, black, sx * 0.899, 0.2, 0.34);
      box(0.19, 0.06, 0.1, black, sx * 0.81, 0.4, -0.57);
      box(0.2, 0.12, 0.23, blue, sx * 0.94, 0.44, -0.57);
      box(0.16, 0.08, 0.015, alloy, sx * 0.945, 0.445, -0.448);
      // R34's horizontal front lamp housings and twin projector optics.
      box(0.55, 0.15, 0.06, black, sx * 0.55, 0.14, -1.995);
      for (const offset of [-0.12, 0.12]) add(new THREE.CylinderGeometry(0.055, 0.055, 0.022, 16), lamps, sx * 0.55 + offset, 0.145, -2.032, Math.PI / 2);
      box(0.065, 0.09, 0.025, amber, sx * 0.79, 0.14, -2.02);
      box(0.28, 0.15, 0.07, black, sx * 0.62, -0.14, -2.018);
      box(0.16, 0.045, 0.08, lamps, sx * 0.62, -0.12, -2.06);
      // Four circular rear lights, two sizes, are the Skyline's defining rear feature.
      for (const [offset, radius] of [[0.57, 0.12], [0.29, 0.087]]) {
        add(new THREE.CylinderGeometry(radius + 0.025, radius + 0.025, 0.045, 24), black, sx * offset, 0.14, 2.075, Math.PI / 2);
        add(new THREE.CylinderGeometry(radius, radius, 0.052, 24), this.brakeMaterial, sx * offset, 0.14, 2.095, Math.PI / 2);
        add(new THREE.TorusGeometry(radius * 0.77, radius * 0.10, 6, 24), this.brakeMaterial, sx * offset, 0.14, 2.125);
        add(new THREE.CylinderGeometry(radius * 0.49, radius * 0.49, 0.015, 24), lensCenter, sx * offset, 0.14, 2.13, Math.PI / 2);
      }
      box(0.045, 0.32, 0.16, blue, sx * 0.61, 0.53, 1.66);
      box(0.045, 0.16, 0.36, blue, sx * 0.88, 0.71, 1.65);
      // Fender lips hide the intersection of the tread and body shoulder.
      for (const sz of [-1, 1]) {
        add(new THREE.TorusGeometry(0.365, 0.038, 6, 24, Math.PI), blue, sx * 0.9, -0.08, sz * 1.35, 0, Math.PI / 2);
        const wheel = new THREE.Group();
        wheel.position.set(sx * 0.87, -0.08, sz * 1.35);
        wheel.name = 'wheel';
        const tireMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 10, 28), tire);
        tireMesh.rotation.y = Math.PI / 2;
        wheel.add(tireMesh);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.255, 0.24, 24), black);
        rim.rotation.z = Math.PI / 2;
        wheel.add(rim);
        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.246, 0.018, 6, 24), alloy);
        lip.rotation.y = Math.PI / 2;
        lip.position.x = sx * 0.135;
        wheel.add(lip);
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.21, 0.038), alloy);
          spoke.position.set(sx * 0.14, Math.cos(angle) * 0.116, Math.sin(angle) * 0.116);
          spoke.rotation.x = angle;
          wheel.add(spoke);
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.29, 12), alloy);
        hub.rotation.z = Math.PI / 2;
        wheel.add(hub);
        // Batch spokes and rim parts by material while keeping wheel animation independent.
        const wheelParts = new Map<THREE.Material, THREE.BufferGeometry[]>();
        for (const child of [...wheel.children]) {
          if (!(child instanceof THREE.Mesh)) continue;
          child.updateMatrix();
          const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
          geometry.applyMatrix4(child.matrix);
          const material = child.material as THREE.Material;
          const parts = wheelParts.get(material) ?? [];
          parts.push(geometry);
          wheelParts.set(material, parts);
          child.geometry.dispose();
          wheel.remove(child);
        }
        for (const [material, parts] of wheelParts) {
          const geometry = mergeGeometries(parts);
          if (geometry) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            wheel.add(mesh);
          }
          parts.forEach(part => part.dispose());
        }
        model.add(wheel);
        this.wheels.push(wheel);
      }
    }
    box(1.79, 0.075, 0.35, blue, 0, 0.72, 1.65, -0.08);
    box(0.48, 0.1, 0.045, black, 0, 0.13, -2.04);
    box(0.82, 0.17, 0.07, black, 0, -0.13, -2.075);
    box(1.7, 0.045, 0.22, black, 0, -0.3, -1.99);
    box(1.5, 0.055, 0.19, black, 0, -0.29, 1.99);
    box(0.31, 0.12, 0.03, alloy, 0, -0.07, 2.109);
    box(0.075, 0.055, 0.026, red, 0.08, 0.15, -2.07);
    box(0.06, 0.055, 0.026, red, 0.71, 0.11, 2.12);
    add(new THREE.CylinderGeometry(0.078, 0.078, 0.24, 20), alloy, -0.61, -0.24, 2.12, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.059, 0.059, 0.025, 20), black, -0.61, -0.24, 2.25, Math.PI / 2);
    for (const [material, geometries] of staticParts) {
      const merged = mergeGeometries(geometries);
      if (merged) {
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        model.add(mesh);
      }
      geometries.forEach(geometry => geometry.dispose());
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.8, 10), new THREE.MeshBasicMaterial({ color: 0x6cd9ff, transparent: true, opacity: 0.85 }));
    flame.rotation.x = Math.PI / 2;
    flame.position.z = 0.4;
    this.nitroFlames.position.set(-0.61, -0.24, 2.24);
    this.nitroFlames.name = 'nitro';
    this.nitroFlames.add(flame);
    this.nitroFlames.visible = false;
    model.add(this.nitroFlames);
  }

  sync(pos: THREE.Vector3Like, quat: THREE.QuaternionLike): void {
    this.root.position.set(pos.x, pos.y, pos.z);
    this.root.quaternion.set(quat.x, quat.y, quat.z, quat.w);
  }

  setBraking(braking: boolean): void {
    this.brakeMaterial.emissiveIntensity = braking ? 1.4 : 0.15;
  }

  setNitro(active: boolean, t: number): void {
    this.nitroFlames.visible = active;
    if (active) this.nitroFlames.scale.z = 0.75 + Math.sin(t * 40) * 0.25;
  }

  spinWheels(speed: number, dt: number): void {
    for (const wheel of this.wheels) wheel.rotation.x -= (speed / 0.42) * dt;
  }
}
