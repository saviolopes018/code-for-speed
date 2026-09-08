import * as THREE from 'three';
import type { BuildingFamily } from './geo/GeoTypes';

/** One small, shared facade tile per family; no assets or per-window meshes. */
export function createFacadeTexture(family: BuildingFamily): THREE.DataTexture {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  const commercial = family === 'commercial';
  const industrial = family === 'industrial';
  const left = commercial ? 13 : 29;
  const right = commercial ? 115 : 99;
  const bottom = industrial ? 72 : 35;
  const top = 103;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = ((Math.imul(x + y * size, 1597334677) >>> 16) % 5) - 2;
      let rgb = [238 + grain, 237 + grain, 230 + grain];
      // Subtle floor joint and projecting sill with a painted shadow below.
      if (y < 5) rgb = [178, 180, 177];
      if (y >= 5 && y < 9) rgb = [250, 248, 240];
      if (x >= left - 4 && x <= right + 4 && y >= bottom - 5 && y <= top + 4) {
        rgb = [115, 122, 122];
      }
      if (x >= left - 2 && x <= right + 2 && y >= bottom - 2 && y <= top + 2) {
        rgb = [219, 222, 216];
      }
      if (x >= left && x <= right && y >= bottom && y <= top) {
        const reflection = (y - bottom) / (top - bottom);
        rgb = [40 + reflection * 18, 64 + reflection * 24, 77 + reflection * 30];
        if (Math.abs(x - 64) < 2 || (commercial && Math.abs(y - 68) < 2)) {
          rgb = [174, 187, 186];
        }
      }
      const i = (y * size + x) * 4;
      pixels.set([...rgb, 255], i);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.name = `facade-${family}`;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
