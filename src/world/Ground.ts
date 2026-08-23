import * as THREE from 'three';
import { RAPIER, type Physics } from '../core/Physics';

/** Large flat ground: a visual plane plus a single static collider. */
export function createGround(scene: THREE.Scene, physics: Physics, size = 1200): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x141821,
    roughness: 0.95,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  scene.add(mesh);

  // One thin static cuboid as the collision floor (top at y = 0).
  const body = physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0),
  );
  physics.world.createCollider(
    RAPIER.ColliderDesc.cuboid(size / 2, 0.5, size / 2).setFriction(0.9),
    body,
  );

  return mesh;
}
