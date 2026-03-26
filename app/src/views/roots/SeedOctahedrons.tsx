import { type ThreeEvent } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";
import type { OrchardSeed, SelectedItem } from "./types";
import { seedSize, seedColor, POSITION_SCALE } from "./constants";

interface SeedOctahedronsProps {
  seeds: OrchardSeed[];
  selected: SelectedItem;
  hoveredSeed: string | null;
  onHoverSeed: (name: string | null) => void;
  onSelect: (item: SelectedItem) => void;
}

export default function SeedOctahedrons({
  seeds, selected, hoveredSeed, onHoverSeed, onSelect,
}: SeedOctahedronsProps) {
  return (
    <group>
      {seeds.map((seed) => {
        if (!seed.centroid) return null;
        const isHovered = hoveredSeed === seed.name;
        const isSelected = selected?.kind === "seed" && selected.name === seed.name;
        const sz = seedSize(seed.usage_count);
        const scale = isHovered || isSelected ? 1.4 : 1.0;
        const cx = seed.centroid.x * POSITION_SCALE;
        const cy = seed.centroid.y * POSITION_SCALE;
        const cz = seed.centroid.z * POSITION_SCALE;
        const colors = seedColor(seed.name);

        return (
          <group key={seed.name}>
            <mesh
              position={[cx, cy, cz]}
              scale={sz * scale}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                onHoverSeed(seed.name);
              }}
              onPointerOut={() => onHoverSeed(null)}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onSelect(isSelected ? null : { kind: "seed", name: seed.name });
              }}
            >
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color={colors.color}
                emissive={colors.emissive}
                emissiveIntensity={1.5}
                transparent
                opacity={0.9}
                roughness={0.2}
                metalness={0.1}
              />
            </mesh>

            <Billboard position={[cx, cy + sz + 0.2, cz]}>
              <Text
                fontSize={0.18}
                color={colors.color}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
              >
                {seed.name}
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}
