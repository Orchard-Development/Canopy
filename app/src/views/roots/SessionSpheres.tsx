import { useMemo, useCallback, useRef, useEffect } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { OrchardSession, SelectedItem } from "./types";
import { sessionSize, POSITION_SCALE, type SceneColors } from "./constants";

interface SessionSpheresProps {
  sessions: OrchardSession[];
  connectedIds: Set<string> | null;
  selected: SelectedItem;
  hoveredSession: string | null;
  onHover: (id: string | null) => void;
  onSelect: (item: SelectedItem) => void;
  palette: string[];
  isDark: boolean;
  sceneColors: SceneColors;
}

const SPHERE_GEO = new THREE.IcosahedronGeometry(1, 1);

export default function SessionSpheres({
  sessions, connectedIds, selected, hoveredSession, onHover, onSelect, palette, sceneColors,
}: SessionSpheresProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || sessions.length === 0) return;

    const tmpColor = new THREE.Color();
    const colors = new Float32Array(sessions.length * 3);

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      dummy.position.set(
        s.x * POSITION_SCALE,
        s.y * POSITION_SCALE,
        s.z * POSITION_SCALE,
      );
      dummy.scale.setScalar(sessionSize(s.total_tool_calls));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const dimmed = connectedIds !== null && !connectedIds.has(s.id);
      const clusterIdx = typeof s.cluster === "number" ? s.cluster : 0;
      tmpColor.set(palette[clusterIdx % palette.length]);
      if (dimmed) tmpColor.multiplyScalar(0.2);

      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    mesh.instanceColor.needsUpdate = true;
  }, [sessions, connectedIds, dummy, palette]);

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.instanceId !== undefined && e.instanceId < sessions.length) {
        onHover(sessions[e.instanceId].id);
      }
    },
    [sessions, onHover],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (e.instanceId !== undefined && e.instanceId < sessions.length) {
        const id = sessions[e.instanceId].id;
        const already = selected?.kind === "session" && selected.id === id;
        onSelect(already ? null : { kind: "session", id });
      }
    },
    [sessions, selected, onSelect],
  );

  if (!sessions || sessions.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[SPHERE_GEO, undefined, sessions.length]}
        onPointerOver={handlePointerOver}
        onPointerOut={() => onHover(null)}
        onClick={handleClick}
      >
        <meshStandardMaterial
          transparent
          opacity={0.9}
          depthWrite={false}
          emissive={sceneColors.fillLight}
          emissiveIntensity={0.3}
          roughness={0.4}
          metalness={0.1}
        />
      </instancedMesh>

      {hoveredSession && (
        <SessionTooltip sessions={sessions} id={hoveredSession} sceneColors={sceneColors} />
      )}
    </group>
  );
}

function SessionTooltip({
  sessions, id, sceneColors,
}: {
  sessions: OrchardSession[];
  id: string;
  sceneColors: SceneColors;
}) {
  const s = sessions.find((s) => s.id === id);
  if (!s) return null;
  const topTools = Object.entries(s.tools)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name}(${count})`)
    .join(", ");

  return (
    <group position={[s.x * POSITION_SCALE, s.y * POSITION_SCALE + sessionSize(s.total_tool_calls) + 0.8, s.z * POSITION_SCALE]}>
      <Html center style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
        <div style={{
          background: sceneColors.tooltipBg,
          color: sceneColors.tooltipText,
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 11,
          maxWidth: 260,
          lineHeight: 1.5,
          border: `1px solid ${sceneColors.tooltipBorder}`,
        }}>
          <div style={{ fontWeight: 600, color: sceneColors.tooltipAccent, fontSize: 12 }}>
            {s.date ? new Date(s.date).toLocaleDateString() : "Unknown"}
          </div>
          {s.label && (
            <div style={{ opacity: 0.85, marginTop: 3 }}>{s.label.slice(0, 80)}</div>
          )}
          {topTools && (
            <div style={{ opacity: 0.5, fontSize: 10, marginTop: 3 }}>{topTools}</div>
          )}
        </div>
      </Html>
    </group>
  );
}
