import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Paper, Stack } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

interface TourStep {
  target: string;
  title: string;
  what: string;
  why: string;
  /** Route to navigate to before showing this step. */
  navigateTo?: string;
  /** Called when transitioning TO this step (e.g. close/open drawers). */
  onEnter?: string;
}

const STEPS: TourStep[] = [
  {
    target: "tour-terminal",
    title: "Terminal Drawer",
    what: "Agent sessions, shells, and CLI tools all live here. The proposal you just kicked off is running in this drawer right now.",
    why: "One place for every terminal session -- they persist across refreshes and can be opened from anywhere in the app.",
    onEnter: "openTerminal",
  },
  {
    target: "tour-terminal-add",
    title: "Spawn Sessions",
    what: "Launch Claude Code, Codex, or a plain shell. Each one gets its own tab and persists across refreshes.",
    why: "Run as many agents in parallel as you want -- this is how you multiply throughput.",
  },
  {
    target: "tour-terminal-grid",
    title: "Grid vs Tabs",
    what: "Toggle between grid and tab view. Grid shows all sessions at once so you can watch multiple agents work side by side.",
    why: "Parallel agents are only useful if you can see what they're all doing.",
    onEnter: "enableGrid",
  },
  {
    target: "tour-terminal-freeform",
    title: "Freeform Layout",
    what: "Switch between structured grid and freeform layout. Freeform lets you drag and resize terminal cards however you like.",
    why: "Some sessions need more screen real estate than others -- freeform lets you decide.",
  },
  {
    target: "tour-terminal-expand",
    title: "Expand",
    what: "Go full-screen to give your terminals all the space. Hit it again to collapse back to the side drawer.",
    why: "When you're deep in a session, the drawer gets out of the way.",
  },
  {
    target: "tour-orchard",
    title: "Orchard",
    what: "Your workspace home -- projects, activity, and everything you're building at a glance.",
    why: "This is ground zero. Everything you cultivate grows from here.",
    navigateTo: "/workspace",
    onEnter: "closeTerminal",
  },
  {
    target: "tour-chat",
    title: "Chat",
    what: "Talk to your AI copilot directly. Ask questions, kick off tasks, or brainstorm ideas without leaving the app.",
    why: "The fastest path from thought to action -- no context switching, no copy-pasting between tools.",
  },
  {
    target: "tour-settings-providers",
    title: "AI Providers",
    what: "Connect your AI providers here -- Anthropic, OpenAI, local models. Add API keys and test connections.",
    why: "Your agents need brains. This is where you plug them in.",
    navigateTo: "/settings?tab=providers",
  },
  {
    target: "tour-settings-appearance",
    title: "Appearance",
    what: "Change your theme, colors, and branding. Everything you picked during onboarding lives here.",
    why: "Your workspace, your look. Tweak it anytime.",
    navigateTo: "/settings?tab=appearance",
  },
  {
    target: "tour-settings-views",
    title: "Views",
    what: "Add, remove, and reorder sidebar views. Your orchard automatically creates new views as your project grows.",
    why: "Your sidebar grows with your project -- you start lean and it fills in as you ship.",
    navigateTo: "/settings?tab=views",
  },
];

const SPOTLIGHT_PAD = 6;
const CARD_W = 340;
const CARD_GAP = 20;
const VIEWPORT_PAD = 12;

type Placement = "right" | "left" | "top" | "bottom";

function computePlacement(
  r: DOMRect,
  cardH: number,
): { placement: Placement; top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceRight = vw - r.right - SPOTLIGHT_PAD;
  const spaceLeft = r.left - SPOTLIGHT_PAD;
  const spaceTop = r.top - SPOTLIGHT_PAD;
  const neededH = CARD_W + CARD_GAP + VIEWPORT_PAD;
  const neededV = cardH + CARD_GAP + VIEWPORT_PAD;

  let placement: Placement = "right";
  if (spaceRight >= neededH) {
    placement = "right";
  } else if (spaceLeft >= neededH) {
    placement = "left";
  } else if (spaceTop >= neededV) {
    placement = "top";
  } else {
    placement = "bottom";
  }

  let top: number;
  let left: number;

  if (placement === "right") {
    left = r.right + SPOTLIGHT_PAD + CARD_GAP;
    top = r.top - SPOTLIGHT_PAD;
  } else if (placement === "left") {
    left = r.left - SPOTLIGHT_PAD - CARD_GAP - CARD_W;
    top = r.top - SPOTLIGHT_PAD;
  } else if (placement === "top") {
    left = r.left + r.width / 2 - CARD_W / 2;
    top = r.top - SPOTLIGHT_PAD - CARD_GAP - cardH;
  } else {
    left = r.left + r.width / 2 - CARD_W / 2;
    top = r.bottom + SPOTLIGHT_PAD + CARD_GAP;
  }

  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - CARD_W - VIEWPORT_PAD));
  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - VIEWPORT_PAD - cardH));

  return { placement, top, left };
}

function arrowSx(placement: Placement) {
  const base = {
    position: "absolute" as const,
    width: 0,
    height: 0,
  };
  const transparent = "8px solid transparent";
  if (placement === "right") {
    return { ...base, left: -8, top: 22, borderTop: transparent, borderBottom: transparent, borderRight: "8px solid", borderRightColor: "background.paper" };
  }
  if (placement === "left") {
    return { ...base, right: -8, top: 22, borderTop: transparent, borderBottom: transparent, borderLeft: "8px solid", borderLeftColor: "background.paper" };
  }
  if (placement === "top") {
    return { ...base, bottom: -8, left: "calc(50% - 8px)", borderLeft: transparent, borderRight: transparent, borderTop: "8px solid", borderTopColor: "background.paper" };
  }
  return { ...base, top: -8, left: "calc(50% - 8px)", borderLeft: transparent, borderRight: transparent, borderBottom: "8px solid", borderBottomColor: "background.paper" };
}

interface Props {
  active: boolean;
  onComplete: () => void;
  onOpenTerminal?: () => void;
  onCloseTerminal?: () => void;
  onEnableGrid?: () => void;
}

export function GuidedTour({ active, onComplete, onOpenTerminal, onCloseTerminal, onEnableGrid }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardH, setCardH] = useState(280);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const current = STEPS[step];

  // Reset step when tour restarts
  useEffect(() => {
    if (active) { setStep(0); setRect(null); }
  }, [active]);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      onComplete();
    } else {
      setRect(null);
      setStep((s) => s + 1);
    }
  }, [step, onComplete]);

  // Navigate and fire onEnter when step changes
  useEffect(() => {
    if (!active || !current) return;
    if (current.onEnter === "openTerminal") {
      onOpenTerminal?.();
    } else if (current.onEnter === "closeTerminal") {
      onCloseTerminal?.();
    } else if (current.onEnter === "enableGrid") {
      onEnableGrid?.();
    }
    if (current.navigateTo) {
      navigate(current.navigateTo);
    }
  }, [step, active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Measure target element position
  useEffect(() => {
    if (!active || !current) return;
    const delay = current.navigateTo ? 300 : 0;
    let cancelled = false;
    let resizeHandler: (() => void) | null = null;
    const timeout = setTimeout(() => {
      const startTime = Date.now();
      function measure() {
        if (cancelled) return;
        const el = document.querySelector(`[data-tour="${current.target}"]`);
        if (el) {
          setRect(el.getBoundingClientRect());
        } else if (Date.now() - startTime > 3000) {
          next();
        } else {
          requestAnimationFrame(measure);
        }
      }
      measure();
      resizeHandler = measure;
      window.addEventListener("resize", measure);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    };
  }, [active, step, current, next]);

  useEffect(() => {
    if (cardRef.current) {
      setCardH(cardRef.current.getBoundingClientRect().height);
    }
  });

  if (!active || !current || !rect) return null;

  const { placement, top: cardTop, left: cardLeft } = computePlacement(rect, cardH);

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 1500 }}>
      {/* Click-away backdrop */}
      <Box sx={{ position: "absolute", inset: 0 }} />

      {/* Spotlight cutout */}
      <Box
        sx={{
          position: "absolute",
          top: rect.top - SPOTLIGHT_PAD,
          left: rect.left - SPOTLIGHT_PAD,
          width: rect.width + SPOTLIGHT_PAD * 2,
          height: rect.height + SPOTLIGHT_PAD * 2,
          borderRadius: 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          pointerEvents: "none",
          transition: "all 0.3s ease",
        }}
      />

      {/* Popover card */}
      <Paper
        ref={cardRef}
        elevation={8}
        sx={{
          position: "absolute",
          top: cardTop,
          left: cardLeft,
          width: CARD_W,
          p: 3,
          transition: "top 0.3s ease, left 0.3s ease",
        }}
      >
        {/* Arrow */}
        <Box sx={arrowSx(placement)} />

        <Typography variant="overline" color="text.secondary">
          {step + 1} of {STEPS.length}
        </Typography>

        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          {current.title}
        </Typography>

        <Typography variant="body2" sx={{ mb: 0.5 }}>
          {current.what}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2.5, fontStyle: "italic" }}
        >
          {current.why}
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button
            size="small"
            onClick={onComplete}
            sx={{ textTransform: "none", opacity: 0.7 }}
          >
            Skip tour
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={next}
            endIcon={step < STEPS.length - 1 ? <ArrowForwardIcon /> : undefined}
            disableElevation
            sx={{ textTransform: "none" }}
          >
            {step < STEPS.length - 1 ? "Next" : "Get started"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
