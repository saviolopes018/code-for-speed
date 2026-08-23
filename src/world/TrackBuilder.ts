import * as THREE from 'three';
import { RAPIER, type Physics } from '../core/Physics';

export interface GateTransform {
  position: THREE.Vector3;
  /** Tangent (forward) direction of the track at this gate. */
  forward: THREE.Vector3;
  width: number;
}

export interface TrackDefinition {
  spawn: { position: THREE.Vector3; yaw: number };
  /** Ordered checkpoint gates around the loop. Index 0 is the start/finish. */
  gates: GateTransform[];
  curve: THREE.CatmullRomCurve3;
  roadWidth: number;
}

export interface TrackOptions {
  roadWidth?: number;
  /** Number of checkpoint gates (including start/finish at index 0). */
  gateCount?: number;
  addBarriers?: boolean;
}

/**
 * Builds a closed asphalt circuit from control points: a road ribbon mesh,
 * centre lane markings, edge barriers with colliders, and evenly spaced
 * checkpoint gates. This is the procedural Phase-4 test track.
 */
export function buildTrack(
  scene: THREE.Scene,
  physics: Physics,
  controlPoints: THREE.Vector3[],
  options: TrackOptions = {},
): TrackDefinition {
  const roadWidth = options.roadWidth ?? 16;
  const gateCount = options.gateCount ?? 8;
  const addBarriers = options.addBarriers ?? true;
  const half = roadWidth / 2;

  const curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.5);
  const length = curve.getLength();
  const segments = Math.max(60, Math.round(length / 4));

  // ---- Road ribbon ----
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent);
    side.crossVectors(tangent, up).normalize();

    const lx = point.x - side.x * half;
    const lz = point.z - side.z * half;
    const rx = point.x + side.x * half;
    const rz = point.z + side.z * half;
    positions.push(lx, 0.02, lz, rx, 0.02, rz);
    const v = t * length * 0.08;
    uvs.push(0, v, 1, v);

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  const asphalt = new THREE.MeshStandardMaterial({
    color: 0x1c1f26,
    roughness: 0.85,
    metalness: 0.0,
  });
  const road = new THREE.Mesh(roadGeo, asphalt);
  road.receiveShadow = true;
  road.name = 'road';
  scene.add(road);

  // ---- Centre lane markings (dashed) ----
  addLaneMarkings(scene, curve, segments);

  // ---- Barriers ----
  if (addBarriers) {
    buildBarriers(scene, physics, curve, segments, half + 0.6);
  }

  // ---- Checkpoint gates ----
  const gates: GateTransform[] = [];
  for (let i = 0; i < gateCount; i++) {
    const t = i / gateCount;
    const pos = curve.getPointAt(t).clone();
    pos.y = 0;
    const fwd = curve.getTangentAt(t).clone();
    fwd.y = 0;
    fwd.normalize();
    gates.push({ position: pos, forward: fwd, width: roadWidth });
  }

  // ---- Spawn: just behind the start gate, facing along the track ----
  const startFwd = gates[0].forward;
  const spawnPos = gates[0].position.clone().addScaledVector(startFwd, -6);
  spawnPos.y = 1.2;
  const yaw = Math.atan2(-startFwd.x, -startFwd.z);

  return {
    spawn: { position: spawnPos, yaw },
    gates,
    curve,
    roadWidth,
  };
}

function addLaneMarkings(
  scene: THREE.Scene,
  curve: THREE.CatmullRomCurve3,
  segments: number,
): void {
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xdedede });
  const dashGeo = new THREE.PlaneGeometry(0.25, 2.4);
  dashGeo.rotateX(-Math.PI / 2);
  const count = Math.floor(segments / 2);
  const mesh = new THREE.InstancedMesh(dashGeo, dashMat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    curve.getPointAt(t, p);
    curve.getTangentAt(t, tan);
    const yaw = Math.atan2(tan.x, tan.z);
    q.setFromAxisAngle(up, yaw);
    m.compose(new THREE.Vector3(p.x, 0.03, p.z), q, new THREE.Vector3(1, 1, 1));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'lane-markings';
  scene.add(mesh);
}

function buildBarriers(
  scene: THREE.Scene,
  physics: Physics,
  curve: THREE.CatmullRomCurve3,
  segments: number,
  offset: number,
): void {
  const wallH = 1.0;
  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f4b,
    roughness: 0.7,
    emissive: 0x101216,
  });
  const up = new THREE.Vector3(0, 1, 0);
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();

  // Merge wall segments into one instanced mesh; colliders are individual.
  const seg = new THREE.BoxGeometry(0.4, wallH, 1);
  const mesh = new THREE.InstancedMesh(seg, barrierMat, segments * 2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  let idx = 0;

  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    curve.getPointAt(t0, p0);
    curve.getPointAt(t1, p1);
    curve.getTangentAt(t0, tan);
    side.crossVectors(tan, up).normalize();
    const segLen = p0.distanceTo(p1) + 0.2;
    const yaw = Math.atan2(tan.x, tan.z);
    q.setFromAxisAngle(up, yaw);

    for (const sgn of [-1, 1]) {
      const cx = (p0.x + p1.x) / 2 + side.x * offset * sgn;
      const cz = (p0.z + p1.z) / 2 + side.z * offset * sgn;
      m.compose(
        new THREE.Vector3(cx, wallH / 2, cz),
        q,
        new THREE.Vector3(1, 1, segLen),
      );
      mesh.setMatrixAt(idx++, m);

      const body = physics.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(cx, wallH / 2, cz).setRotation({
          x: q.x,
          y: q.y,
          z: q.z,
          w: q.w,
        }),
      );
      physics.world.createCollider(
        RAPIER.ColliderDesc.cuboid(0.2, wallH / 2, segLen / 2)
          .setFriction(0.3)
          .setRestitution(0.2),
        body,
      );
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'barriers';
  scene.add(mesh);
}
