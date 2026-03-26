import { useState, useEffect, useCallback } from "react";
import { Box, Button, LinearProgress } from "@mui/material";
import { useToast } from "../hooks/useToast";
import type { BrandingConfig } from "../lib/branding";
import { STEPS, type OnboardingState } from "../components/onboarding/registry";
import { ProposingStep } from "../components/onboarding/ProposingStep";

export interface PendingSession {
  id: string;
  label: string;
}

const TOOL_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

const INITIAL_STATE: OnboardingState = {
  persona: null,
  intents: [],
  intentFreeform: "",
  branding: null,
  cliTools: { claude: false, codex: false, opencode: false },
  selectedTool: "claude",
  project: null,
  problem: null,
};

export default function Onboarding({
  onComplete,
  onBrandingChange,
}: {
  onComplete: (session?: PendingSession) => void;
  onBrandingChange: (cfg: BrandingConfig) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"steps" | "proposing">("steps");
  const toast = useToast();

  const advance = useCallback(() => setStepIndex((i) => i + 1), []);
  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  const patchState = useCallback((patch: Partial<OnboardingState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  // Propagate branding changes to the live theme
  useEffect(() => {
    if (state.branding) onBrandingChange(state.branding);
  }, [state.branding, onBrandingChange]);

  // Handle last step completing -> trigger propose phase
  useEffect(() => {
    if (stepIndex < STEPS.length || !state.problem) return;
    triggerPropose();
  }, [stepIndex]);

  async function triggerPropose() {
    const { problem, selectedTool } = state;
    if (!problem) return;
    setPhase("proposing");
    try {
      const res = await fetch("/api/onboarding/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem: problem.text,
          name: problem.name,
          tool: selectedTool,
          projectId: state.project?.id ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Propose failed: ${res.status}`);
      setSessionId(data.sessionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start proposal";
      toast.error(msg);
      setPhase("steps");
      setStepIndex(STEPS.length - 1);
    }
  }

  function handleTransitionToDrawer() {
    completeOnboarding();
    const label = TOOL_LABELS[state.selectedTool] ?? "Claude Code";
    onComplete(sessionId ? { id: sessionId, label } : undefined);
  }

  function skipOnboarding() {
    completeOnboarding();
    onComplete();
  }

  function completeOnboarding() {
    fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        persona: state.persona,
        intents: state.intents,
        intentFreeform: state.intentFreeform,
      }),
    }).catch(() => { /* best-effort */ });
  }

  if (phase === "proposing" && sessionId) {
    return (
      <ProposingStep
        sessionId={sessionId}
        tool={state.selectedTool}
        onTransition={handleTransitionToDrawer}
      />
    );
  }

  const currentStep = STEPS[stepIndex];
  if (!currentStep) return null;
  const StepComponent = currentStep.component;
  const progress = stepIndex > 0 ? (stepIndex / STEPS.length) * 100 : 0;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Button
        size="small"
        onClick={skipOnboarding}
        sx={{
          position: "fixed",
          top: 12,
          right: 16,
          zIndex: 1400,
          textTransform: "none",
          opacity: 0.6,
          "&:hover": { opacity: 1 },
        }}
      >
        Skip
      </Button>
      {stepIndex > 0 && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            height: 3,
            "& .MuiLinearProgress-bar": {
              transition: "transform 0.4s ease",
            },
          }}
        />
      )}

      <Box
        key={stepIndex}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          animation: "story-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <StepComponent
          onComplete={advance}
          onBack={back}
          onSkip={currentStep.skippable ? advance : undefined}
          state={state}
          setState={patchState}
        />
      </Box>

    </Box>
  );
}
