import { useMemo } from "react";
import type { OrchardData } from "./types";
import { seedColor, POSITION_SCALE } from "./constants";

interface ConnectionLinesProps {
  data: OrchardData;
  seedName: string;
  visibleSessionIds: Set<string>;
  seedTypeColors?: [RegExp, { color: string; emissive: string }][];
}

export default function ConnectionLines({
  data, seedName, visibleSessionIds, seedTypeColors,
}: ConnectionLinesProps) {
  const seed = data.seeds.find((s) => s.name === seedName);
  if (!seed?.centroid) return null;

  const colors = seedColor(seedName, seedTypeColors);

  const positions = useMemo(() => {
    const pts: number[] = [];
    for (const c of data.connections) {
      if (c.seed_name !== seedName) continue;
      if (!visibleSessionIds.has(c.session_id)) continue;
      const session = data.sessions.find((s) => s.id === c.session_id);
      if (!session) continue;
      pts.push(session.x * POSITION_SCALE, session.y * POSITION_SCALE, session.z * POSITION_SCALE);
      pts.push(seed.centroid!.x * POSITION_SCALE, seed.centroid!.y * POSITION_SCALE, seed.centroid!.z * POSITION_SCALE);
    }
    return new Float32Array(pts);
  }, [data, seedName, visibleSessionIds, seed.centroid]);

  if (positions.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={colors.emissive} transparent opacity={0.35} />
    </lineSegments>
  );
}
