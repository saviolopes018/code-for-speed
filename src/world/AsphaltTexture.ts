import * as THREE from 'three';

/**
 * Procedural, seamless PBR asphalt — generated on canvases at load, no external
 * image assets (keeps the MVP self-contained and licence-free). Produces three
 * coherent maps from a single shared height field so light responds realistically
 * to the surface:
 *
 *   - albedo (map):        dark asphalt, aggregate stones, tar patches, faint stains
 *   - normal (normalMap):  per-pixel relief from the height field (real light response)
 *   - roughness:           polished aggregate tops vs. matte binder / worn patches
 *
 * One cached set is shared by the whole road network so we stay at one material
 * and three GPU uploads total.
 */

const SIZE = 1024;

/** Base asphalt binder colour. Deliberately a mid-dark neutral grey (a *clean*
 * road) so per-variant material tints can darken it multiplicatively for wear —
 * a MeshStandardMaterial `color` can only darken the albedo, never brighten it. */
const BASE = { r: 0x55, g: 0x56, b: 0x57 };

export interface AsphaltMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/** Deterministic PRNG (mulberry32) — stable grain, avoids Math.random. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

const idx = (x: number, y: number) => ((y & (SIZE - 1)) * SIZE + (x & (SIZE - 1))) | 0;

/**
 * Seamless value noise in [0,1]. A `cells`×`cells` random lattice (wrapped) is
 * smoothly interpolated up to SIZE, so opposite edges match exactly and the
 * texture tiles without a visible seam. `cells` must divide SIZE.
 */
function valueNoise(cells: number, rng: () => number): Float32Array {
  const lattice = new Float32Array(cells * cells);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng();

  const out = new Float32Array(SIZE * SIZE);
  const scale = cells / SIZE;
  const smooth = (t: number) => t * t * (3 - 2 * t); // smoothstep

  for (let y = 0; y < SIZE; y++) {
    const fy = y * scale;
    const y0 = Math.floor(fy);
    const ty = smooth(fy - y0);
    const y0w = y0 % cells;
    const y1w = (y0 + 1) % cells;
    for (let x = 0; x < SIZE; x++) {
      const fx = x * scale;
      const x0 = Math.floor(fx);
      const tx = smooth(fx - x0);
      const x0w = x0 % cells;
      const x1w = (x0 + 1) % cells;
      const a = lattice[y0w * cells + x0w];
      const b = lattice[y0w * cells + x1w];
      const c = lattice[y1w * cells + x0w];
      const d = lattice[y1w * cells + x1w];
      const top = a + (b - a) * tx;
      const bot = c + (d - c) * tx;
      out[y * SIZE + x] = top + (bot - top) * ty;
    }
  }
  return out;
}

/** Sum of octaves of value noise, normalized to [0,1]. */
function fbm(rng: () => number, octaves: Array<[number, number]>): Float32Array {
  const out = new Float32Array(SIZE * SIZE);
  let total = 0;
  for (const [cells, amp] of octaves) {
    const n = valueNoise(cells, rng);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/**
 * Build the shared height field: layered fine grain + scattered aggregate stones
 * (raised) + a few grooves/cracks (recessed). Values in [0,1], seamless.
 */
function buildHeight(rng: () => number): Float32Array {
  // Multi-octave grain gives the fine-grained binder texture.
  const h = fbm(rng, [
    [8, 0.06],
    [32, 0.12],
    [128, 0.32],
    [512, 0.5],
  ]);

  // Aggregate stones: circular bumps of varied radius scattered densely, drawn
  // with wrap so edges stay seamless. Raised above the binder.
  const stoneCount = 18000;
  for (let i = 0; i < stoneCount; i++) {
    const cx = rng() * SIZE;
    const cy = rng() * SIZE;
    const r = 0.6 + rng() * 1.8;
    const peak = 0.08 + rng() * 0.2;
    const r2 = r * r;
    const x0 = Math.floor(cx - r);
    const x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r);
    const y1 = Math.ceil(cy + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        // Smooth dome falloff.
        const f = 1 - d2 / r2;
        const add = peak * f * f;
        const j = idx(x, y);
        if (add > 0 && h[j] < h[j] + add) h[j] = Math.min(1, h[j] + add);
      }
    }
  }

  // Cracks: thin recessed grooves (jittered polylines), wrapped.
  const crackCount = 3;
  for (let i = 0; i < crackCount; i++) {
    let x = rng() * SIZE;
    let y = rng() * SIZE;
    let ang = rng() * Math.PI * 2;
    const steps = 40 + Math.floor(rng() * 60);
    for (let s = 0; s < steps; s++) {
      ang += (rng() - 0.5) * 0.7;
      x += Math.cos(ang) * 3;
      y += Math.sin(ang) * 3;
      const gr = 0.4 + rng() * 0.5; // groove radius
      const gr2 = gr * gr;
      const gx0 = Math.floor(x - gr);
      const gx1 = Math.ceil(x + gr);
      const gy0 = Math.floor(y - gr);
      const gy1 = Math.ceil(y + gr);
      for (let yy = gy0; yy <= gy1; yy++) {
        for (let xx = gx0; xx <= gx1; xx++) {
          const dx = xx + 0.5 - x;
          const dy = yy + 0.5 - y;
          const d2 = dx * dx + dy * dy;
          if (d2 > gr2) continue;
          const f = 1 - d2 / gr2;
          const j = idx(xx, yy);
          h[j] = Math.max(0, h[j] - 0.5 * f);
        }
      }
    }
  }

  return h;
}

function makeTexture(canvas: HTMLCanvasElement, srgb: boolean, anisotropy: number): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function newCanvas(): [HTMLCanvasElement, ImageData] {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  return [c, ctx.createImageData(SIZE, SIZE)];
}

let cached: AsphaltMaps | null = null;

/**
 * Build (or reuse) the shared realistic asphalt map set. `anisotropy` should come
 * from the renderer (`renderer.capabilities.getMaxAnisotropy()`) so detail holds
 * up at the grazing angles of a chase camera.
 */
export function getAsphaltMaps(anisotropy = 1): AsphaltMaps {
  if (cached) {
    for (const t of [cached.map, cached.normalMap, cached.roughnessMap]) {
      t.anisotropy = Math.max(t.anisotropy, anisotropy);
    }
    return cached;
  }

  const rng = makeRng(0x9e3779b9);
  const h = buildHeight(rng);

  // Large-scale patchiness: worn/repaired regions that shift tone & roughness.
  const patch = fbm(rng, [
    [3, 0.6],
    [6, 0.4],
  ]);
  // Sparse oil / stain blotches (darkening only).
  const stain = fbm(rng, [
    [5, 0.7],
    [16, 0.3],
  ]);

  const [albedoCanvas, albedoImg] = newCanvas();
  const [normalCanvas, normalImg] = newCanvas();
  const [roughCanvas, roughImg] = newCanvas();
  const A = albedoImg.data;
  const N = normalImg.data;
  const R = roughImg.data;

  const NORMAL_STRENGTH = 0.65;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const j = y * SIZE + x;
      const o = j * 4;
      const hv = h[j];

      // --- Albedo -------------------------------------------------------------
      // Aggregate tops read lighter; grooves darker. Patchiness tints regions;
      // stains darken sparsely.
      const aggregate = Math.max(0, hv - 0.55) * 1.6; // 0..~0.7
      const patchTone = (patch[j] - 0.5) * 6; // subtle regional lightness
      const stainDark = Math.max(0, stain[j] - 0.62) * 32; // darkening blotches
      const grain = (hv - 0.5) * 10;
      const light = grain + aggregate * 6 + patchTone - stainDark;
      // Aggregate stones pick up a faint warm/neutral cast vs. the cool binder.
      const warm = aggregate * 2;
      A[o] = clamp255(BASE.r + light + warm);
      A[o + 1] = clamp255(BASE.g + light + warm * 0.6);
      A[o + 2] = clamp255(BASE.b + light);
      A[o + 3] = 255;

      // --- Normal (from height gradient, wrapped) -----------------------------
      const hl = h[idx(x - 1, y)];
      const hr = h[idx(x + 1, y)];
      const hu = h[idx(x, y - 1)];
      const hd = h[idx(x, y + 1)];
      let nx = (hl - hr) * NORMAL_STRENGTH;
      let ny = (hu - hd) * NORMAL_STRENGTH;
      const nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      N[o] = clamp255((nx * 0.5 + 0.5) * 255);
      N[o + 1] = clamp255((ny * 0.5 + 0.5) * 255);
      N[o + 2] = clamp255((nz * inv * 0.5 + 0.5) * 255);
      N[o + 3] = 255;

      // --- Roughness ----------------------------------------------------------
      // Matte binder (~0.94); polished aggregate tops a touch smoother; worn
      // patches slightly glossier still. Kept high overall (dry road).
      let rough = 0.94 - aggregate * 0.18 - Math.max(0, patch[j] - 0.6) * 0.12;
      rough = rough < 0.55 ? 0.55 : rough > 0.99 ? 0.99 : rough;
      const rb = clamp255(rough * 255);
      R[o] = rb;
      R[o + 1] = rb;
      R[o + 2] = rb;
      R[o + 3] = 255;
    }
  }

  albedoCanvas.getContext('2d')!.putImageData(albedoImg, 0, 0);
  normalCanvas.getContext('2d')!.putImageData(normalImg, 0, 0);
  roughCanvas.getContext('2d')!.putImageData(roughImg, 0, 0);

  cached = {
    map: makeTexture(albedoCanvas, true, anisotropy),
    normalMap: makeTexture(normalCanvas, false, anisotropy),
    roughnessMap: makeTexture(roughCanvas, false, anisotropy),
  };
  return cached;
}
