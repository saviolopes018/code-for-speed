import * as THREE from 'three';

/** Baked daylight reflection map: generated once, with no runtime cube capture. */
export function createEnvironmentReflection(renderer: THREE.WebGLRenderer): THREE.WebGLRenderTarget {
  const width = 512, height = 256;
  const data = new Uint8Array(width * height * 4);
  const sky = new THREE.Color(0x83b5ea);
  const horizon = new THREE.Color(0xe5e7e5);
  const ground = new THREE.Color(0x555853);
  const color = new THREE.Color();
  for (let y = 0; y < height; y++) {
    const elevation = -Math.cos(y / (height - 1) * Math.PI);
    for (let x = 0; x < width; x++) {
      color.copy(horizon).lerp(elevation > 0 ? sky : ground, Math.pow(Math.abs(elevation), 0.45));
      // Muted skyline interrupts the horizon so curved paint reflects its shape.
      const skyline = 0.025 + 0.045 * (0.5 + 0.5 * Math.sin(Math.floor(x / 9) * 17));
      if (elevation < skyline && elevation > -0.04) color.multiplyScalar(0.65);
      const light = Math.exp(-((x / width - 0.7) ** 2 / 0.003 + (y / height - 0.72) ** 2 / 0.009));
      color.lerp(horizon, light * 0.8);
      const i = (y * width + x) * 4;
      data[i] = color.r * 255; data[i + 1] = color.g * 255; data[i + 2] = color.b * 255; data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  const result = generator.fromEquirectangular(texture);
  texture.dispose();
  generator.dispose();
  return result;
}
