import { useRef, useMemo } from "react";
import * as THREE from "three";
import type { OrchardSession } from "./types";
import { POSITION_SCALE } from "./constants";

interface NeuralMeshProps {
  sessions: OrchardSession[];
  palette: string[];
  isDark: boolean;
}

const K = 3;
const MAX_DIST = 28;
const GRID_SIZE = 10; // spatial hash cell size

/**
 * Spatial-hash accelerated KNN. O(n) average instead of O(n²).
 */
function buildEdges(sessions: OrchardSession[]): [number, number][] {
  if (!sessions || sessions.length < 2) return [];

  const positions = sessions.map((s) => [
    s.x * POSITION_SCALE,
    s.y * POSITION_SCALE,
    s.z * POSITION_SCALE,
  ]);

  // Build spatial hash
  const grid = new Map<string, number[]>();
  for (let i = 0; i < positions.length; i++) {
    const key = `${Math.floor(positions[i][0] / GRID_SIZE)},${Math.floor(positions[i][1] / GRID_SIZE)},${Math.floor(positions[i][2] / GRID_SIZE)}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  }

  const edges = new Set<string>();
  const result: [number, number][] = [];
  const radius = Math.ceil(MAX_DIST / GRID_SIZE);

  for (let i = 0; i < sessions.length; i++) {
    const cx = Math.floor(positions[i][0] / GRID_SIZE);
    const cy = Math.floor(positions[i][1] / GRID_SIZE);
    const cz = Math.floor(positions[i][2] / GRID_SIZE);

    const neighbors: { j: number; d: number }[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const bucket = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!bucket) continue;
          for (const j of bucket) {
            if (i === j) continue;
            const ddx = positions[i][0] - positions[j][0];
            const ddy = positions[i][1] - positions[j][1];
            const ddz = positions[i][2] - positions[j][2];
            const d = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d < MAX_DIST * MAX_DIST) neighbors.push({ j, d });
          }
        }
      }
    }

    neighbors.sort((a, b) => a.d - b.d);
    for (let n = 0; n < Math.min(K, neighbors.length); n++) {
      const j = neighbors[n].j;
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (!edges.has(key)) {
        edges.add(key);
        result.push([i, j]);
      }
    }
  }
  return result;
}

export default function NeuralMesh({ sessions, palette }: NeuralMeshProps) {
  const lineRef = useRef<THREE.LineSegments>(null);

  const { positions, colors, edgeCount } = useMemo(() => {
    const edgeList = buildEdges(sessions);
    const pos = new Float32Array(edgeList.length * 6);
    const col = new Float32Array(edgeList.length * 6);
    const tmpA = new THREE.Color();
    const tmpB = new THREE.Color();

    for (let e = 0; e < edgeList.length; e++) {
      const [i, j] = edgeList[e];
      const si = sessions[i];
      const sj = sessions[j];

      pos[e * 6] = si.x * POSITION_SCALE;
      pos[e * 6 + 1] = si.y * POSITION_SCALE;
      pos[e * 6 + 2] = si.z * POSITION_SCALE;
      pos[e * 6 + 3] = sj.x * POSITION_SCALE;
      pos[e * 6 + 4] = sj.y * POSITION_SCALE;
      pos[e * 6 + 5] = sj.z * POSITION_SCALE;

      const ci = typeof si.cluster === "number" ? si.cluster : 0;
      const cj = typeof sj.cluster === "number" ? sj.cluster : 0;
      tmpA.set(palette[ci % palette.length]);
      tmpB.set(palette[cj % palette.length]);

      col[e * 6] = tmpA.r;
      col[e * 6 + 1] = tmpA.g;
      col[e * 6 + 2] = tmpA.b;
      col[e * 6 + 3] = tmpB.r;
      col[e * 6 + 4] = tmpB.g;
      col[e * 6 + 5] = tmpB.b;
    }

    return { positions: pos, colors: col, edgeCount: edgeList.length };
  }, [sessions, palette]);

  if (edgeCount === 0) return null;

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.15}
        depthWrite={false}
      />
    </lineSegments>
  );
}
