import * as THREE from 'three';
import type { Physics } from '../core/Physics';
import { setupEnvironment } from '../rendering/Environment';
import { setupLighting } from '../rendering/Lighting';
import { createGround } from './Ground';
import { generateRoads, type RoadRenderStats } from './RoadGenerator';
import { generateBuildings, type BuildingStats } from './BuildingMassing';
import { NormalizedMapLoader } from './geo/NormalizedMapLoader';
import { computeMapBounds, computeOverviewHeight, type MapBounds } from './geo/MapBounds';
import type { MapMetadata, NormalizedMapData, NormalizedRoad } from './geo/GeoTypes';

export interface SpawnPose {
  position: THREE.Vector3;
  yaw: number;
}

export interface WorldStats extends RoadRenderStats {
  bounds: MapBounds;
  buildings: BuildingStats;
}

export interface OverviewFraming {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  /** Suggested far plane so the whole map stays visible. */
  far: number;
}

/**
 * Free-roam world built from a pre-generated, normalized Fortaleza map:
 *
 *   MapLoader -> NormalizedMapData -> ground + RoadGenerator -> Three.js scene
 *
 * The flat ground provides driving collision (roads are visual for World v0), so
 * the existing vehicle physics is untouched. Spawn/reset snap to the nearest
 * real road. Also owns a coexisting "map validation" debug mode (bright bg,
 * high-contrast class-coloured roads, bounds + origin + vehicle markers).
 */
export class WorldGenerator {
  metadata!: MapMetadata;
  stats!: WorldStats;
  bounds!: MapBounds;

  private roads: NormalizedRoad[] = [];
  private roadGroup!: THREE.Group;
  private debugLines!: THREE.LineSegments;
  private debugHelpers = new THREE.Group();
  private vehicleMarker!: THREE.Object3D;
  private ground?: THREE.Mesh;
  private validation = false;
  private savedBackground: THREE.Scene['background'] = null;
  private savedFog: THREE.Scene['fog'] = null;

  constructor(private readonly mapUrl: string) {}

  async build(
    scene: THREE.Scene,
    physics: Physics,
    opts: { anisotropy?: number } = {},
  ): Promise<void> {
    const map: NormalizedMapData = await new NormalizedMapLoader(this.mapUrl).load();
    this.metadata = map.metadata;
    this.roads = map.roads;
    this.bounds = computeMapBounds(map.roads);

    setupEnvironment(scene);
    setupLighting(scene);

    // Ground large enough to cover the imported extent (centred on origin 0,0).
    const reach = Math.max(
      Math.abs(this.bounds.minX),
      Math.abs(this.bounds.maxX),
      Math.abs(this.bounds.minZ),
      Math.abs(this.bounds.maxZ),
      200,
    );
    this.ground = createGround(scene, physics, Math.ceil(reach * 2 + 400));
    // Daytime ground tone so dark asphalt roads read clearly against it.
    (this.ground.material as THREE.MeshStandardMaterial).color.setHex(0x8a8f80);

    const network = generateRoads(map.roads, { anisotropy: opts.anisotropy });
    this.roadGroup = network.group;
    this.debugLines = network.debugLines;
    scene.add(this.roadGroup, this.debugLines);

    // Urban massing: extruded OSM building footprints (merged per family).
    const massing = generateBuildings(map.buildings ?? []);
    for (const mesh of massing.meshes) scene.add(mesh);

    this.buildDebugHelpers();
    scene.add(this.debugHelpers);

    this.stats = { ...network.stats, bounds: this.bounds, buildings: massing.stats };
  }

  /** Bounds rectangle, world origin axes/pillar and a vehicle locator. */
  private buildDebugHelpers(): void {
    const b = this.bounds;
    const y = 0.5;

    // Map bounds rectangle.
    const corners = [
      new THREE.Vector3(b.minX, y, b.minZ),
      new THREE.Vector3(b.maxX, y, b.minZ),
      new THREE.Vector3(b.maxX, y, b.maxZ),
      new THREE.Vector3(b.minX, y, b.maxZ),
    ];
    const rect = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(corners),
      new THREE.LineBasicMaterial({ color: 0xff2ecc }),
    );
    rect.name = 'map-bounds';

    // World origin: axes (X red / Z blue confirm the axis convention) + pillar.
    const axes = new THREE.AxesHelper(80);
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 120, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    pillar.position.set(0, 60, 0);
    const originDot = new THREE.Mesh(
      new THREE.SphereGeometry(6, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff2ecc }),
    );

    // Vehicle locator: a tall bright pillar that follows the car from above.
    this.vehicleMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 160, 8),
      new THREE.MeshBasicMaterial({ color: 0x39ff88 }),
    );
    this.vehicleMarker.position.set(0, 80, 0);

    this.debugHelpers.add(rect, axes, pillar, originDot, this.vehicleMarker);
    this.debugHelpers.visible = false;
  }

  /**
   * Toggle the coexisting map-validation overlay (bounds/origin/vehicle markers
   * + class-coloured road centrelines). The daylight scene stays as-is so the
   * overview shows the real roads + buildings. Returns the new state.
   */
  setValidationMode(scene: THREE.Scene, on: boolean): boolean {
    this.validation = on;
    this.debugLines.visible = on;
    this.debugHelpers.visible = on;

    // Hide the sky dome + fog so the top-down overview can never be occluded by
    // the sky (the overview camera can sit above the dome). Restore on exit.
    const sky = scene.getObjectByName('sky');
    if (on) {
      this.savedBackground = scene.background;
      this.savedFog = scene.fog;
      scene.background = new THREE.Color(0xdfe6ec);
      scene.fog = null;
      if (sky) sky.visible = false;
    } else {
      scene.background = this.savedBackground;
      scene.fog = this.savedFog;
      if (sky) sky.visible = true;
    }
    return this.validation;
  }

  /** Move the overview vehicle locator (call each frame while validating). */
  updateVehicleMarker(x: number, z: number): void {
    if (this.vehicleMarker) this.vehicleMarker.position.set(x, 80, z);
  }

  /** Top-down camera framing that fits the whole imported region. */
  overviewFraming(aspect: number, fovDeg: number): OverviewFraming {
    const h = computeOverviewHeight(this.bounds.width, this.bounds.height, aspect, fovDeg);
    return {
      position: new THREE.Vector3(this.bounds.centerX, h, this.bounds.centerZ),
      lookAt: new THREE.Vector3(this.bounds.centerX, 0, this.bounds.centerZ),
      far: h * 2 + 2000,
    };
  }

  /** Nearest road vertex to (x,z), with a heading along that road. */
  resolveSpawn(x = 0, z = 0): SpawnPose {
    let best: { p: { x: number; z: number }; road: NormalizedRoad; i: number } | null = null;
    let bestDist = Infinity;
    for (const road of this.roads) {
      for (let i = 0; i < road.points.length; i++) {
        const p = road.points[i];
        const dx = p.x - x;
        const dz = p.z - z;
        const d = dx * dx + dz * dz;
        if (d < bestDist) {
          bestDist = d;
          best = { p, road, i };
        }
      }
    }

    if (!best) {
      return { position: new THREE.Vector3(0, 1.2, 0), yaw: 0 };
    }

    // Heading along the road segment at the chosen vertex.
    const pts = best.road.points;
    const a = pts[best.i];
    const b = pts[best.i + 1] ?? pts[best.i - 1] ?? a;
    const dirX = (pts[best.i + 1] ? b.x - a.x : a.x - b.x) || 0;
    const dirZ = (pts[best.i + 1] ? b.z - a.z : a.z - b.z) || -1;
    // Car forward is -Z rotated by yaw: yaw = atan2(-forwardX, -forwardZ).
    const yaw = Math.atan2(-dirX, -dirZ);

    return { position: new THREE.Vector3(best.p.x, 1.2, best.p.z), yaw };
  }
}
