import * as THREE from 'three';

/**
 * Warm street lamps along the track edges. Poles + emissive heads are instanced;
 * only a limited number of real PointLights are added (perf), the rest rely on
 * emissive materials + the ambient/hemisphere fill.
 */
export function addStreetLights(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  edgeOffset: number,
  spacing = 42,
  maxRealLights = 10,
): void {
  const length = curve.getLength();
  const count = Math.max(2, Math.floor(length / spacing));

  const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 6, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.8 });
  const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffcf87,
    emissive: 0xffb14a,
    emissiveIntensity: 2.2,
  });

  const poles = new THREE.InstancedMesh(poleGeo, poleMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);

  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const lightEvery = Math.max(1, Math.floor(count / maxRealLights));

  for (let i = 0; i < count; i++) {
    const t = i / count;
    curve.getPointAt(t, p);
    curve.getTangentAt(t, tan);
    side.crossVectors(tan, up).normalize();
    const sgn = i % 2 === 0 ? 1 : -1;
    const bx = p.x + side.x * edgeOffset * sgn;
    const bz = p.z + side.z * edgeOffset * sgn;

    m.compose(new THREE.Vector3(bx, 3, bz), q, one);
    poles.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(bx, 6, bz), q, new THREE.Vector3(1, 1, 1));
    heads.setMatrixAt(i, m);

    if (i % lightEvery === 0) {
      const light = new THREE.PointLight(0xffb14a, 12, 34, 2);
      light.position.set(bx, 6, bz);
      scene.add(light);
    }
  }
  poles.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  poles.name = 'lamp-poles';
  heads.name = 'lamp-heads';
  scene.add(poles);
  scene.add(heads);
}
