export type {
  OrchardData,
  OrchardSession,
  OrchardSeed,
  OrchardConnection,
  OrchardStats,
  SeedGrowthPoint,
  SimilarResult,
} from "../../lib/api";

export type SelectedItem =
  | { kind: "session"; id: string }
  | { kind: "seed"; name: string }
  | null;
