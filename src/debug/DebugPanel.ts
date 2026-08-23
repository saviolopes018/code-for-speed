import type { VehicleTelemetry } from '../vehicle/VehicleTelemetry';
import type { WebGLInfo } from 'three';

export interface DebugMapInfo {
  region: string;
  origin: { lat: number; lon: number };
  roads: number;
  points: number;
  roadTriangles: number;
  roadVertices: number;
  roadMeshes: number;
  roadMaterials: number;
  roadTextures: number;
  roadVariants: string;
  markingMeshes: number;
  markingDashes: number;
  manholes: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  width: number;
  height: number;
  meshes: number;
  validationMode: boolean;
  buildings: number;
  buildingVertices: number;
  buildingTriangles: number;
  buildingMeshes: number;
  heightSource: { height: number; levels: number; fallback: number };
}

export interface DebugInfo {
  telemetry: VehicleTelemetry;
  fps: number;
  position: { x: number; y: number; z: number };
  render: WebGLInfo;
  physicsBodies: number;
  map: DebugMapInfo;
}

/** F3 telemetry overlay. Text-only, updated a few times per second. */
export class DebugPanel {
  private visible = false;
  private accum = 0;

  constructor(private readonly root: HTMLElement) {}

  toggle(): void {
    this.visible = !this.visible;
    this.root.hidden = !this.visible;
  }

  update(info: DebugInfo, dt: number): void {
    if (!this.visible) return;
    this.accum += dt;
    if (this.accum < 0.1) return;
    this.accum = 0;

    const t = info.telemetry;
    const r = info.render;
    const m = info.map;
    this.root.textContent = [
      `CODE FOR SPEED — MAP DEBUG (F3)`,
      m.validationMode ? `View           MAP VALIDATION (F4)` : `View           chase (F4=overview)`,
      ``,
      `Region         ${m.region}`,
      `Map origin     ${m.origin.lat.toFixed(6)}, ${m.origin.lon.toFixed(6)}`,
      `Roads          ${m.roads}`,
      `Road points    ${m.points}`,
      ``,
      `Bounds X       ${m.bounds.minX.toFixed(0)} -> ${m.bounds.maxX.toFixed(0)}`,
      `Bounds Z       ${m.bounds.minZ.toFixed(0)} -> ${m.bounds.maxZ.toFixed(0)}`,
      `Map size       ${m.width.toFixed(0)}m x ${m.height.toFixed(0)}m`,
      ``,
      `Buildings      ${m.buildings}`,
      `  height tag   ${m.heightSource.height}`,
      `  levels tag   ${m.heightSource.levels}`,
      `  fallback     ${m.heightSource.fallback}`,
      `Bld vertices   ${m.buildingVertices}`,
      `Bld triangles  ${m.buildingTriangles}`,
      `Bld meshes     ${m.buildingMeshes}`,
      ``,
      `FPS            ${info.fps.toFixed(0)}`,
      `Speed          ${t.speedKmh.toFixed(1)} km/h`,
      `Steer          ${t.steer.toFixed(2)}`,
      `Drift          ${t.isDrifting ? 'YES' : 'no'}  ang ${t.driftAngle.toFixed(2)}`,
      `Nitro          ${t.nitro.toFixed(0)}${t.nitroActive ? ' (ACTIVE)' : ''}`,
      `Position (x,z) ${info.position.x.toFixed(1)}, ${info.position.z.toFixed(1)}`,
      ``,
      `Meshes         ${m.meshes}`,
      `Road meshes    ${m.roadMeshes}`,
      `Road materials ${m.roadMaterials}  textures ${m.roadTextures}`,
      `Road variants  ${m.roadVariants}`,
      `Road vertices  ${m.roadVertices}`,
      `Road triangles ${m.roadTriangles}`,
      `Marking meshes ${m.markingMeshes}  dashes ${m.markingDashes}`,
      `Manholes       ${m.manholes}`,
      `Draw calls     ${r.render.calls}`,
      `Triangles      ${r.render.triangles}`,
      `Geometries     ${r.memory.geometries}`,
      `Physics bodies ${info.physicsBodies}`,
    ].join('\n');
  }
}
