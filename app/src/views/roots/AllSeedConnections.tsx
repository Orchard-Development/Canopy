import { useMemo } from "react";
import * as THREE from "three";
import type { OrchardData } from "./types";
import { seedColor, POSITION_SCALE } from "./constants";

interface AllSeedConnectionsProps {
  data: OrchardData;
  visibleSessionIds: Set<string>;
  activeSeed: string | null;
}

export default function AllSeedConnections({
  data, visibleSessionIds, activeSeed,
}: AllSeedConnectionsProps) {
  const { positions, colors, activePositions, activeColors } = useMemo(() => {
    const sessionMap = new Map(data.sessions.map((s) => [s.id, s]));
    const seedMap = new Map(data.seeds.map((s) => [s.name, s]));

    const pts: number[] = [];
    const cols: number[] = [];
    const aPts: number[] = [];
    const aCols: number[] = [];

    for (const c of data.connections) {
      if (!visibleSessionIds.has(c.session_id)) continue;
      const session = sessionMap.get(c.session_id);
      const seed = seedMap.get(c.seed_name);
      if (!session || !seed?.centroid) continue;

      const sx = seed.centroid.x * POSITION_SCALE;
      const sy = seed.centroid.y * POSITION_SCALE;
      const sz = seed.centroid.z * POSITION_SCALE;
      const col = new THREE.Color(seedColor(seed.name).emissive);

      const isActive = c.seed_name === activeSeed;
      const tgt = isActive ? aPts : pts;
      const tgtC = isActive ? aCols : cols;

      tgt.push(
        session.x * POSITION_SCALE, session.y * POSITION_SCALE, session.z * POSITION_SCALE,
        sx, sy, sz,
      );
      tgtC.push(col.r, col.g, col.b, col.r, col.g, col.b);
    }

    return {
      positions: new Float32Array(pts),
      colors: new Float32Array(cols),
      activePositions: new Float32Array(aPts),
      activeColors: new Float32Array(aCols),
    };
  }, [data, visibleSessionIds, activeSeed]);

  return (
    <>
      {positions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <lineBasicMaterial vertexColors transparent opacity={0.08} depthWrite={false} />
        </lineSegments>
      )}
      {activePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[activePositions, 3]} />
            <bufferAttribute attach="attributes-color" args={[activeColors, 3]} />
          </bufferGeometry>
          <lineBasicMaterial vertexColors transparent opacity={0.5} depthWrite={false} />
        </lineSegments>
      )}
    </>
  );
}
