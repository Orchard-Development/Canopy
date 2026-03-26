import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import BloomEffect from "./BloomEffect";
import { useTheme } from "@mui/material";
import * as THREE from "three";
import type { OrchardData, SelectedItem } from "./types";
import { buildPalette } from "./constants";
import SessionSpheres from "./SessionSpheres";
import SeedOctahedrons from "./SeedOctahedrons";
import AllSeedConnections from "./AllSeedConnections";
import NeuralMesh from "./NeuralMesh";

interface RootsCanvasProps {
  data: OrchardData;
  timePosition: number;
  selected: SelectedItem;
  onSelect: (item: SelectedItem) => void;
  hoveredSeed: string | null;
  onHoverSeed: (name: string | null) => void;
  isDark: boolean;
}

interface SceneProps extends RootsCanvasProps {
  palette: string[];
  pointerOver: boolean;
}

export default function RootsCanvas({
  data, timePosition, selected, onSelect, hoveredSeed, onHoverSeed, isDark,
}: RootsCanvasProps) {
  const bg = "#050510";
  const theme = useTheme();
  const palette = useMemo(() => buildPalette(theme), [theme]);

  const sessions = data?.sessions ?? [];
  const seeds = data?.seeds ?? [];
  const connections = data?.connections ?? [];

  const [pointerOver, setPointerOver] = useState(false);

  if (!sessions.length && !seeds.length) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 55 }}
      style={{ background: bg }}
      onPointerMissed={() => onSelect(null)}
      onPointerEnter={() => setPointerOver(true)}
      onPointerLeave={() => setPointerOver(false)}
      gl={{ antialias: true, toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.5 }}
    >
      <color attach="background" args={[bg]} />
      <SceneContents
        data={{ ...data, sessions, seeds, connections }}
        timePosition={timePosition}
        selected={selected}
        onSelect={onSelect}
        hoveredSeed={hoveredSeed}
        onHoverSeed={onHoverSeed}
        isDark={isDark}
        palette={palette}
        pointerOver={pointerOver}
      />
    </Canvas>
  );
}

function SceneContents(props: SceneProps) {
  const { data, timePosition, selected, onSelect, hoveredSeed, onHoverSeed, isDark, palette, pointerOver } = props;
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  const sessions = data?.sessions ?? [];
  const seeds = data?.seeds ?? [];
  const connections = data?.connections ?? [];

  const visibleSessions = useMemo(
    () => sessions.filter((s) => {
      const t = new Date(s.date).getTime();
      return !isNaN(t) && t <= timePosition;
    }),
    [sessions, timePosition],
  );

  const visibleSessionIds = useMemo(
    () => new Set(visibleSessions.map((s) => s.id)),
    [visibleSessions],
  );

  const visibleSeeds = useMemo(
    () => {
      // Only show seeds that have at least one visible connection
      const seedsWithVisibleEdge = new Set<string>();
      for (const c of connections) {
        if (visibleSessionIds.has(c.session_id)) {
          seedsWithVisibleEdge.add(c.seed_name);
        }
      }
      return seeds.filter(
        (s) => s.centroid && seedsWithVisibleEdge.has(s.name),
      );
    },
    [seeds, connections, visibleSessionIds],
  );

  const activeSeed = selected?.kind === "seed" ? selected.name : hoveredSeed;

  const connectedSessionIds = useMemo(() => {
    if (!activeSeed) return null;
    const ids = new Set<string>();
    for (const c of connections) {
      if (c.seed_name === activeSeed) ids.add(c.session_id);
    }
    return ids;
  }, [activeSeed, connections]);

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight position={[15, 20, 25]} intensity={1.5} color="#c7d2fe" />
      <pointLight position={[12, 10, 10]} intensity={1.5} color="#818cf8" distance={40} />
      <pointLight position={[-10, -8, 8]} intensity={1.2} color="#f59e0b" distance={35} />
      <pointLight position={[0, -12, -8]} intensity={1.0} color="#ec4899" distance={30} />
      <directionalLight position={[-10, -15, -20]} intensity={0.4} color="#a78bfa" />
<fog attach="fog" args={["#050510", 120, 300]} />

      <NeuralMesh sessions={visibleSessions} palette={palette} isDark={isDark} />
      <SessionSpheres
        sessions={visibleSessions}
        connectedIds={connectedSessionIds}
        selected={selected}
        hoveredSession={hoveredSession}
        onHover={setHoveredSession}
        onSelect={onSelect}
        palette={palette}
        isDark={isDark}
      />
      <SeedOctahedrons
        seeds={visibleSeeds}
        selected={selected}
        hoveredSeed={hoveredSeed}
        onHoverSeed={onHoverSeed}
        onSelect={onSelect}
      />
      <AllSeedConnections
        data={data}
        visibleSessionIds={visibleSessionIds}
        activeSeed={activeSeed}
      />

      <BloomEffect threshold={0.3} strength={0.6} radius={0.45} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={280}
        rotateSpeed={0.5}
        autoRotate={!pointerOver}
        autoRotateSpeed={0.15}
      />
    </>
  );
}
