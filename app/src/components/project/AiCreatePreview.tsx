import {
  Box,
  Typography,
  Stack,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Fade,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SpaIcon from "@mui/icons-material/Spa";
import { PreviewPanel } from "../onboarding/PreviewPanel";
import { type BrandingConfig, DEFAULT_BRANDING } from "../../lib/branding";

export interface AiStep {
  event: string;
  data: Record<string, unknown>;
}

interface Props {
  steps: AiStep[];
  currentEvent: string | null;
}

const STEP_LABELS: Record<string, string> = {
  thinking: "Analyzing requirements",
  researching: "Researching brand",
  configured: "AI configuration ready",
  creating: "Creating project",
  seeding: "Applying seed packs",
  complete: "Project created",
};

export function AiCreatePreview({ steps, currentEvent }: Props) {
  const configStep = steps.find((s) => s.event === "configured");
  const seedStep = steps.find((s) => s.event === "seeding");
  const completeStep = steps.find((s) => s.event === "complete");
  const errorStep = steps.find((s) => s.event === "error");

  const aiConfig = configStep?.data?.config as Record<string, unknown> | undefined;
  const theme = aiConfig?.theme as Record<string, unknown> | undefined;
  const isMinimal = aiConfig?.minimal === true;
  const isDone = !!completeStep;
  const isError = !!errorStep;

  const previewConfig = theme
    ? ({ ...DEFAULT_BRANDING, ...theme } as BrandingConfig)
    : null;

  return (
    <Stack spacing={2}>
      <StepTimeline steps={steps} currentEvent={currentEvent} />

      {!isDone && !isError && (
        <LinearProgress
          variant="indeterminate"
          sx={{ borderRadius: 1, height: 3 }}
        />
      )}

      {aiConfig && (
        <Fade in timeout={400}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                {!!aiConfig.name && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Name</Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {String(aiConfig.name)}
                    </Typography>
                  </Box>
                )}

                {!!aiConfig.description && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">
                      {String(aiConfig.description)}
                    </Typography>
                  </Box>
                )}

                {!!aiConfig.projectType && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Type</Typography>
                    <Box>
                      <Chip
                        label={String(aiConfig.projectType)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                )}

                {!isMinimal && previewConfig && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                      Theme
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">Dark</Typography>
                        <PreviewPanel config={previewConfig} mode="dark" />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">Light</Typography>
                        <PreviewPanel config={previewConfig} mode="light" />
                      </Box>
                    </Stack>
                  </Box>
                )}

                {isMinimal && (
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Clean canvas -- no theme applied. You can add one later in Settings.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Fade>
      )}

      {seedStep && (
        <Fade in timeout={400}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SpaIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={700}>Seed Packs</Typography>
              </Stack>
              <SeedRecommendations
                seeds={(seedStep.data.seeds as string[]) || []}
                reasons={(seedStep.data.reasons as Record<string, string>) || {}}
              />
            </CardContent>
          </Card>
        </Fade>
      )}

      {isError && (
        <Typography variant="body2" color="error">
          {(errorStep.data.message as string) || "Something went wrong."}
        </Typography>
      )}
    </Stack>
  );
}

function StepTimeline({ steps, currentEvent }: { steps: AiStep[]; currentEvent: string | null }) {
  return (
    <Stack spacing={0.75}>
      {steps.map((step, i) => {
        const isActive = step.event === currentEvent;
        const label = (step.data.message as string) || STEP_LABELS[step.event] || step.event;

        return (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
            {step.event === "complete" ? (
              <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
            ) : step.event === "error" ? (
              <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: "error.main" }} />
            ) : isActive ? (
              <AutoAwesomeIcon sx={{ fontSize: 16, color: "primary.main" }} />
            ) : (
              <CheckCircleIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            )}
            <Typography
              variant="body2"
              color={isActive ? "text.primary" : "text.secondary"}
              fontWeight={isActive ? 600 : 400}
            >
              {label}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}

function SeedRecommendations({ seeds, reasons }: { seeds: string[]; reasons: Record<string, string> }) {
  if (seeds.length === 0) {
    return <Typography variant="body2" color="text.secondary">No seed packs recommended for this project.</Typography>;
  }

  return (
    <Stack spacing={0.5}>
      {seeds.map((slug) => (
        <Stack key={slug} direction="row" spacing={1} alignItems="center">
          <Chip label={slug} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.75rem" }} />
          {reasons[slug] && (
            <Typography variant="caption" color="text.secondary">{reasons[slug]}</Typography>
          )}
        </Stack>
      ))}
    </Stack>
  );
}
