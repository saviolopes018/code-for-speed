import * as THREE from 'three';

/**
 * Daytime urban atmosphere (World v1.0): a light blue vertical-gradient sky and
 * a light, distant fog for depth. Cheap — no HDR/atmosphere/post-processing.
 * Night can return later as an art direction; during city construction we
 * prioritise clarity over mood.
 */
export function setupEnvironment(scene: THREE.Scene): void {
  const top = new THREE.Color(0x5aa2e6); // blue sky
  const bottom = new THREE.Color(0xd8e6f0); // pale horizon

  // Vertical gradient sky via a large inverted sphere.
  const skyGeo = new THREE.SphereGeometry(4000, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: top },
      bottom: { value: bottom },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      uniform vec3 top;
      uniform vec3 bottom;
      void main() {
        float h = normalize(vPos).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottom, top, clamp(h, 0.0, 1.0)), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky';
  scene.add(sky);

  // Fallback background colour behind the dome (so nothing ever reads as black).
  scene.background = new THREE.Color(0x9fc4e8);

  // Light, far fog so distant city fades gently without hiding nearby geometry.
  scene.fog = new THREE.Fog(0xc4d8e8, 700, 3200);
}
