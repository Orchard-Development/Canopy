import { useMemo } from "react";
import type { OrchardData } from "./types";

// -- Tree envelope parameters ------------------------------------------------
/** Normalized Y (0=bottom, 1=top) where the trunk is narrowest. */
const TRUNK_HEIGHT = 0.25;
/** Radius scale at the trunk center (fraction of original). Smaller = tighter. */
const TRUNK_RADIUS = 0.04;
/** Radius scale at the canopy top. */
const CANOPY_RADIUS = 1.0;
/** Radius scale at the root bottom. */
const ROOT_RADIUS = 0.18;
/** Canopy spread curve. <1 = opens fast then flattens. */
const CANOPY_POWER = 0.55;
/** Root spread curve. >1 = stays tight then opens near bottom. */
const ROOT_POWER = 1.6;

// -- Per-node modifiers ------------------------------------------------------
/** Extra radial tightening for highly-connected nodes. */
const CONN_TIGHTEN = 0.35;
/** Power curve on connection ratio. <1 = softer falloff. */
const CONN_CURVE = 0.5;
/** Vertical compression toward center. Low = long trunk. */
const AXIAL_STRENGTH = 0.04;
/** Angular jitter (radians) to break grid regularity. */
const JITTER = 0.18;

function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return (h & 0x7fffffff) / 0x7fffffff;
}

/**
 * Parabolic tree envelope: returns the allowed radius fraction at a given
 * normalized height. Tight at TRUNK_HEIGHT, widens into canopy above and
 * roots below.
 */
function treeEnvelope(yNorm: number): number {
  const dy = yNorm - TRUNK_HEIGHT;
  if (dy >= 0) {
    // Canopy: opens from trunk toward top
    const t = dy / (1 - TRUNK_HEIGHT); // 0 at trunk, 1 at top
    return TRUNK_RADIUS + (CANOPY_RADIUS - TRUNK_RADIUS) * Math.pow(t, CANOPY_POWER);
  }
  // Roots: opens from trunk toward bottom
  const t = -dy / TRUNK_HEIGHT; // 0 at trunk, 1 at bottom
  return TRUNK_RADIUS + (ROOT_RADIUS - TRUNK_RADIUS) * Math.pow(t, ROOT_POWER);
}

/**
 * Applies a tree-shaped radial envelope to all node positions.
 *
 * The envelope maps height -> allowed radial spread, producing a shape
 * with a narrow trunk, spreading canopy above, and slight root flare below.
 * Connected nodes are pulled even tighter toward the trunk axis.
 */
export function useGravityLayout(data: OrchardData): OrchardData {
  return useMemo(() => {
    const { sessions, seeds, connections } = data;
    if (!sessions.length) return data;

    // -- count connections ------------------------------------------------
    const sessionConns = new Map<string, number>();
    const seedConns = new Map<string, number>();
    for (const c of connections) {
      sessionConns.set(c.session_id, (sessionConns.get(c.session_id) ?? 0) + 1);
      seedConns.set(c.seed_name, (seedConns.get(c.seed_name) ?? 0) + 1);
    }
    const maxSC = Math.max(1, ...sessionConns.values());
    const maxSeedC = Math.max(1, ...seedConns.values());

    // -- center of mass & Y bounds ----------------------------------------
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const s of sessions) {
      cx += s.x;
      cy += s.y;
      cz += s.z;
      if (s.y < yMin) yMin = s.y;
      if (s.y > yMax) yMax = s.y;
    }
    cx /= sessions.length;
    cy /= sessions.length;
    cz /= sessions.length;
    const ySpan = yMax - yMin || 1;

    // -- warp a single point into tree shape ------------------------------
    function warp(
      x: number,
      y: number,
      z: number,
      rawRatio: number,
      hash01: number,
    ): [number, number, number] {
      const dx = x - cx;
      const dz = z - cz;
      const radius = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const yNorm = (y - yMin) / ySpan; // 0 = bottom, 1 = top

      // Tree envelope gives base radius scale at this height
      const envScale = treeEnvelope(yNorm);

      // Connected nodes get pulled tighter
      const ratio = Math.pow(rawRatio, CONN_CURVE);
      const connScale = 1 - ratio * CONN_TIGHTEN;

      const newRadius = radius * envScale * connScale;

      // Angular jitter
      const newAngle = angle + (hash01 - 0.5) * JITTER * (1 + ratio * 0.3);

      const nx = cx + newRadius * Math.cos(newAngle);
      const nz = cz + newRadius * Math.sin(newAngle);

      // Gentle vertical compression
      const axial = ratio * AXIAL_STRENGTH;
      const ny = cy + (y - cy) * (1 - axial);

      return [nx, ny, nz];
    }

    // -- sessions ---------------------------------------------------------
    const gravSessions = sessions.map((s) => {
      const raw = (sessionConns.get(s.id) ?? 0) / maxSC;
      const [x, y, z] = warp(s.x, s.y, s.z, raw, idHash(s.id));
      return { ...s, x, y, z };
    });

    // -- seed centroids ---------------------------------------------------
    const gravSeeds = seeds.map((seed) => {
      if (!seed.centroid) return seed;
      const raw = (seedConns.get(seed.name) ?? 0) / maxSeedC;
      const [x, y, z] = warp(
        seed.centroid.x, seed.centroid.y, seed.centroid.z,
        raw, idHash(seed.name),
      );
      return { ...seed, centroid: { x, y, z } };
    });

    return { ...data, sessions: gravSessions, seeds: gravSeeds };
  }, [data]);
}
