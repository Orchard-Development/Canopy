import type { ComponentType } from "react";
import type { BrandingConfig } from "../../lib/branding";
import type { ProjectRecord } from "../../lib/api";
import { WelcomeStep } from "./WelcomeStep";
import { AiProviderStep } from "./AiProviderStep";

import { CliToolsStep } from "./CliToolsStep";
import { RemoteAccessStep } from "./RemoteAccessStep";
import { ProblemStep } from "./ProblemStep";
import { UIPreferencesStep } from "./UIPreferencesStep";
import { CreateProjectStep } from "./CreateProjectStep";
import { SetDefaultStep } from "./SetDefaultStep";

export type Intent = "build" | "design" | "plan" | "research" | "learn";

export interface OnboardingState {
  persona: "non-technical" | "power-user" | null;
  intents: Intent[];
  intentFreeform: string;
  branding: BrandingConfig | null;
  cliTools: { claude: boolean; codex: boolean; opencode: boolean };
  selectedTool: "claude" | "codex";
  project: ProjectRecord | null;
  problem: { text: string; name: string } | null;
}

export interface StepProps {
  onComplete: () => void;
  onBack: () => void;
  onSkip?: () => void;
  state: OnboardingState;
  setState: (patch: Partial<OnboardingState>) => void;
}

export interface StepDef {
  id: string;
  component: ComponentType<StepProps>;
  skippable: boolean;
}

export const STEPS: StepDef[] = [
  { id: "welcome",        component: WelcomeStep,        skippable: false },
  { id: "ai_provider",    component: AiProviderStep,     skippable: true  },

  { id: "cli_tools",      component: CliToolsStep,       skippable: true  },
  { id: "remote_access",  component: RemoteAccessStep,   skippable: true  },
  { id: "ui_preferences", component: UIPreferencesStep,  skippable: true  },
  { id: "create_project", component: CreateProjectStep,  skippable: true  },
  { id: "set_default",    component: SetDefaultStep,     skippable: true  },
  { id: "problem",        component: ProblemStep,        skippable: false },
];
