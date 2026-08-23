import * as THREE from 'three';

/**
 * Daylight rig (World v1.0): a bright hemisphere fill (sky/ground bounce) plus a
 * single "sun" directional light. Shadows are enabled cheaply and kept small —
 * the sun casts, the ground receives; buildings do NOT cast (perf). The shadow
 * camera follows near the origin; this is a development-clarity lighting setup.
 */
export function setupLighting(scene: THREE.Scene): void {
  const hemi = new THREE.HemisphereLight(0xbcd6ff, 0x9a8f7d, 0.9);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.35);
  sun.position.set(160, 220, 120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const d = 140;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
}
