import type { BrandingConfig } from "../../../lib/branding";

export interface MoodPreset {
  id: string;
  label: string;
  description: string;
  config: BrandingConfig;
}

import { mono, sage, obsidian, ivory } from "./neutral";
import { midnight, ocean, arctic } from "./cool";
import { rose, copper, ember, terra } from "./warm";
import { aurora, amethyst, neon, highcon } from "./vibrant";
import { crimson, scarlet } from "./red";

export const MOOD_PRESETS: MoodPreset[] = [
  mono,
  midnight,
  ocean,
  aurora,
  rose,
  crimson,
  scarlet,
  copper,
  arctic,
  sage,
  obsidian,
  ember,
  amethyst,
  terra,
  neon,
  ivory,
  highcon,
];
