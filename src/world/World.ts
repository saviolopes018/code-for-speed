import * as THREE from 'three';
import type { Physics } from '../core/Physics';
import { setupEnvironment } from '../rendering/Environment';
import { setupLighting } from '../rendering/Lighting';
import { createGround } from './Ground';
import { buildTrack, type TrackDefinition } from './TrackBuilder';
import { addStreetLights } from './StreetLights';
import { generateBuildings } from './BuildingGenerator';
import { generateCityGeoJSON } from './ProceduralCity';
import { parseGeoJSON } from './MapParser';

/** Control points (x, z) of the test circuit: long straight, open + tight
 * curves, an S-chicane and a wide drift zone. y is forced to 0. */
const TRACK_POINTS: [number, number][] = [
  [0, 0],
  [0, 120],
  [34, 182],
  [104, 196],
  [156, 150],
  [138, 92],
  [176, 58],
  [150, 4],
  [92, 18],
  [70, -34],
  [10, -44],
  [-46, -18],
  [-58, 44],
  [-30, 92],
];

/**
 * Assembles the playable world: night sky, lighting, ground, the procedural
 * test circuit with barriers and street lights, plus GeoJSON-derived buildings
 * for the urban vertical slice.
 */
export class World {
  track!: TrackDefinition;

  async build(scene: THREE.Scene, physics: Physics): Promise<void> {
    setupEnvironment(scene);
    setupLighting(scene);
    createGround(scene, physics);

    const points = TRACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.track = buildTrack(scene, physics, points, {
      roadWidth: 18,
      gateCount: 8,
      addBarriers: true,
    });

    addStreetLights(scene, this.track.curve, this.track.roadWidth / 2 + 2);

    // --- GeoJSON building pipeline (Phase 6) ---
    // The city is emitted as a GeoJSON FeatureCollection (track-aware, dense)
    // and run through the SAME parser that reads real OSM/Overture exports and
    // the shipped fixture at public/maps/urban.geojson (see MapParser test).
    const cityGeoJSON = generateCityGeoJSON(this.track.curve);
    const mapData = parseGeoJSON(cityGeoJSON);
    generateBuildings(scene, physics, mapData, true);
  }
}
