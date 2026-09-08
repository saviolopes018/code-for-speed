import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { VehicleVisual } from '../src/vehicle/VehicleVisual';
import { DEFAULT_VEHICLE_CONFIG } from '../src/vehicle/VehicleConfig';

describe('VehicleVisual', () => {
  it('builds finite geometry within a bounded draw-call budget', () => {
    const visual = new VehicleVisual(DEFAULT_VEHICLE_CONFIG);
    let meshes = 0;
    let hasBlueBody = false;
    visual.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      meshes++;
      if (object.material instanceof THREE.MeshPhysicalMaterial && object.material.color.getHex() === 0x126bc5) hasBlueBody = true;
      const positions = object.geometry.getAttribute('position');
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
    });
    expect(meshes).toBeLessThanOrEqual(24);
    expect(hasBlueBody).toBe(true);
    const bounds = new THREE.Box3().setFromObject(visual.root);
    expect(bounds.max.z).toBeGreaterThan(2);
    expect(bounds.min.z).toBeLessThan(-2);
    expect(bounds.min.y).toBeCloseTo(-0.5, 2);
  });

  it('updates brake illumination and exhaust effects independently', () => {
    const visual = new VehicleVisual(DEFAULT_VEHICLE_CONFIG);
    let brakeMaterial: THREE.MeshStandardMaterial | undefined;
    visual.root.traverse(object => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && object.material.emissive.getHex() === 0xff1307) brakeMaterial = object.material;
    });
    expect(brakeMaterial).toBeDefined();
    visual.setBraking(true);
    expect(brakeMaterial?.emissiveIntensity).toBe(1.4);
    visual.setBraking(false);
    expect(brakeMaterial?.emissiveIntensity).toBe(0.15);
    const nitro = visual.root.getObjectByName('nitro')!;
    expect(nitro.visible).toBe(false);
    visual.setNitro(true, 1);
    expect(nitro.visible).toBe(true);
    expect(nitro.scale.z).toBeGreaterThanOrEqual(0.5);
    visual.setNitro(false, 2);
    expect(nitro.visible).toBe(false);
  });

  it('syncs the physics transform and spins all four wheels', () => {
    const visual = new VehicleVisual(DEFAULT_VEHICLE_CONFIG);
    visual.sync({ x: 2, y: 3, z: 4 }, { x: 0, y: 0, z: 0, w: 1 });
    expect(visual.root.position.toArray()).toEqual([2, 3, 4]);
    visual.spinWheels(10, 0.1);
    const wheels: THREE.Object3D[] = [];
    visual.root.traverse(object => { if (object.name === 'wheel') wheels.push(object); });
    expect(wheels).toHaveLength(4);
    for (const wheel of wheels) expect(wheel.rotation.x).toBeCloseTo(-10 / 0.42 * 0.1);
  });
});
