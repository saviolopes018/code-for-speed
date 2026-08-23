import * as THREE from 'three';

/** Owns the WebGL renderer, scene and camera, plus resize handling. */
export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Far plane must clear the sky dome + let distant city fade into fog.
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.1, 6000);
    this.camera.position.set(0, 6, 12);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(camera: THREE.Camera = this.camera): void {
    this.renderer.render(this.scene, camera);
  }

  get info(): THREE.WebGLInfo {
    return this.renderer.info;
  }
}
