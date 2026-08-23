import * as THREE from 'three';
import { Physics } from './Physics';
import { Time } from './Time';
import { GameLoop } from './GameLoop';
import { InputManager } from './InputManager';
import { Renderer } from '../rendering/Renderer';
import { WorldGenerator } from '../world/WorldGenerator';
import { Vehicle } from '../vehicle/Vehicle';
import { ChaseCamera } from '../camera/ChaseCamera';
import { HUD } from '../hud/HUD';
import { Overlay } from '../hud/Overlay';
import { DebugPanel } from '../debug/DebugPanel';

type GameState = 'title' | 'playing' | 'paused';

const MAP_URL = 'maps/fortaleza-papicu-001.json';
const OVERVIEW_FOV = 60;

/**
 * Top-level free-roam game: owns the fixed-step loop and wires physics, the
 * Fortaleza world, vehicle, camera and UI together. Also hosts the coexisting
 * map-validation mode (F4): a top-down overview camera + high-contrast debug
 * visuals used to verify the imported street network.
 */
export class Game {
  private readonly time = new Time();
  private readonly input = new InputManager();
  private readonly renderer: Renderer;
  private readonly overlay: Overlay;
  private readonly hud: HUD;
  private readonly debug: DebugPanel;

  private physics!: Physics;
  private world!: WorldGenerator;
  private vehicle!: Vehicle;
  private camera!: ChaseCamera;
  private overviewCam!: THREE.PerspectiveCamera;
  private loop!: GameLoop;

  private state: GameState = 'title';
  private fps = 60;
  private validationMode = false;
  private meshCount = 0;
  private worldLoadMs = 0;

  constructor(
    canvas: HTMLCanvasElement,
    hudEl: HTMLElement,
    overlayEl: HTMLElement,
    debugEl: HTMLElement,
  ) {
    this.renderer = new Renderer(canvas);
    this.hud = new HUD(hudEl);
    this.overlay = new Overlay(overlayEl);
    this.debug = new DebugPanel(debugEl);
  }

  async init(): Promise<void> {
    await Physics.init();
    this.physics = Physics.create(this.time.fixedDelta);

    this.world = new WorldGenerator(MAP_URL);
    const loadStart = performance.now();
    await this.world.build(this.renderer.scene, this.physics, {
      anisotropy: this.renderer.renderer.capabilities.getMaxAnisotropy(),
    });
    this.worldLoadMs = performance.now() - loadStart;

    const spawn = this.world.resolveSpawn(0, 0);
    this.vehicle = new Vehicle(
      this.physics,
      this.renderer.scene,
      spawn.position,
      spawn.yaw,
    );
    this.camera = new ChaseCamera(this.renderer.camera, this.vehicle);

    // Dedicated top-down camera for map validation. `up = -Z` puts north up.
    this.overviewCam = new THREE.PerspectiveCamera(OVERVIEW_FOV, 1, 1, 40000);
    this.overviewCam.up.set(0, 0, -1);

    this.meshCount = this.countMeshes();

    this.hud.setRegion(this.world.metadata.name);
    this.hud.setVisible(false);
    this.registerKeys();
    this.input.attach();
    window.addEventListener('blur', () => this.input.releaseAll());
    window.addEventListener('resize', () => {
      if (this.validationMode) this.frameOverview();
    });

    this.loop = new GameLoop((now) => this.tick(now));
    this.time.start(performance.now());
    this.loop.start();

    this.overlay.showTitle(() => this.beginDrive());
    this.exposeDebugHook();
  }

  private countMeshes(): number {
    let n = 0;
    this.renderer.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) n++;
    });
    return n;
  }

  private registerKeys(): void {
    this.input.onKey('KeyC', () => this.camera.cycleMode());
    this.input.onKey('F3', () => this.debug.toggle());
    this.input.onKey('F4', () => this.toggleValidation());
    this.input.onKey('KeyR', () => {
      if (this.state === 'playing') this.respawnNearRoad();
    });
    this.input.onKey('Escape', () => {
      if (this.state === 'playing') this.state = 'paused';
      else if (this.state === 'paused') this.state = 'playing';
    });
  }

  /** F4: switch between the chase camera and the top-down map overview. */
  private toggleValidation(): void {
    this.validationMode = !this.validationMode;
    this.world.setValidationMode(this.renderer.scene, this.validationMode);
    if (this.validationMode) this.frameOverview();
  }

  /** Position the overview camera so the whole imported region fits. */
  private frameOverview(): void {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const framing = this.world.overviewFraming(aspect, OVERVIEW_FOV);
    this.overviewCam.aspect = aspect;
    this.overviewCam.far = framing.far;
    this.overviewCam.position.copy(framing.position);
    this.overviewCam.lookAt(framing.lookAt);
    this.overviewCam.updateProjectionMatrix();
  }

  private beginDrive(): void {
    this.state = 'playing';
    this.hud.setVisible(true);
    const spawn = this.world.resolveSpawn(0, 0);
    this.vehicle.respawn(spawn.position, spawn.yaw);
    this.camera.snapBehind();
  }

  /** Snap the car back onto the nearest road (reset / recovery). */
  private respawnNearRoad(): void {
    const p = this.vehicle.position;
    const spawn = this.world.resolveSpawn(p.x, p.z);
    this.vehicle.respawn(spawn.position, spawn.yaw);
    this.camera.snapBehind();
  }

  private tick(now: number): void {
    const steps = this.time.tick(now);
    const dt = this.time.fixedDelta;
    this.fps = this.fps * 0.9 + (1 / Math.max(this.time.frameDelta, 1e-3)) * 0.1;

    if (this.state === 'playing') {
      const raw = this.input.getState();
      for (let i = 0; i < steps; i++) {
        this.vehicle.fixedUpdate(raw, dt);
        this.physics.step();
      }

      // Recovery: flipped or fell off the world -> back to the nearest road.
      if (this.vehicle.isFlipped || this.vehicle.position.y < -5) {
        this.respawnNearRoad();
      }
    }

    this.vehicle.syncVisual(this.time.elapsed);
    this.camera.update(this.time.frameDelta, this.time.elapsed);

    if (this.state === 'playing') {
      this.hud.update(this.vehicle.telemetry);
    }

    const pos = this.vehicle.position;
    if (this.validationMode) {
      this.world.updateVehicleMarker(pos.x, pos.z);
    }

    const b = this.world.stats.bounds;
    this.debug.update(
      {
        telemetry: this.vehicle.telemetry,
        fps: this.fps,
        position: pos,
        render: this.renderer.info,
        physicsBodies: this.physics.world.bodies.len(),
        map: {
          region: this.world.metadata.name,
          origin: this.world.metadata.origin,
          roads: this.world.stats.roads,
          points: this.world.stats.points,
          roadTriangles: this.world.stats.triangles,
          roadVertices: this.world.stats.vertices,
          roadMeshes: this.world.stats.roadMeshes,
          roadMaterials: this.world.stats.materials,
          roadTextures: this.world.stats.textures,
          roadVariants: (Object.entries(this.world.stats.variantCounts) as [string, number][])
            .filter(([, n]) => n > 0)
            .map(([v, n]) => `${v}:${n}`)
            .join(' '),
          markingMeshes: this.world.stats.marking.markingMeshes,
          markingDashes: this.world.stats.marking.dashes,
          manholes: this.world.stats.detail.manholes,
          bounds: { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ },
          width: b.width,
          height: b.height,
          meshes: this.meshCount,
          validationMode: this.validationMode,
          buildings: this.world.stats.buildings.buildings,
          buildingVertices: this.world.stats.buildings.vertices,
          buildingTriangles: this.world.stats.buildings.triangles,
          buildingMeshes: this.world.stats.buildings.meshes,
          heightSource: this.world.stats.buildings.heightSource,
        },
      },
      this.time.frameDelta,
    );

    this.renderer.render(this.validationMode ? this.overviewCam : this.renderer.camera);
  }

  private exposeDebugHook(): void {
    (window as any).__CFS__ = {
      isRunning: () => this.state === 'playing',
      getState: () => this.state,
      getSpeed: () => this.vehicle.telemetry.speedKmh,
      getFps: () => this.fps,
      hasVehicle: () => !!this.vehicle,
      roadCount: () => this.world.stats.roads,
      roadTriangles: () => this.world.stats.triangles,
      buildingCount: () => this.world.stats.buildings.buildings,
      buildingTriangles: () => this.world.stats.buildings.triangles,
      drawCalls: () => this.renderer.info.render.calls,
      worldLoadMs: () => this.worldLoadMs,
      mapBounds: () => this.world.stats.bounds,
      isValidationMode: () => this.validationMode,
      toggleValidation: () => this.toggleValidation(),
    };
  }
}
