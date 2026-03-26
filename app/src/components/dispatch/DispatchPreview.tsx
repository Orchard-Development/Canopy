import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DescriptionIcon from "@mui/icons-material/Description";
import CloseIcon from "@mui/icons-material/Close";
import type { DispatchPayload } from "../../lib/api";
import {
  DispatchSettings,
  type DispatchSettingsState,
} from "./DispatchSettings";

interface Props {
  payload: DispatchPayload;
  onDispatch: (payload: DispatchPayload, settings: DispatchSettingsState) => void;
  onProposal: (payload: DispatchPayload, settings: DispatchSettingsState) => void;
  onCancel: () => void;
}

export function DispatchPreview({
  payload,
  onDispatch,
  onProposal,
  onCancel,
}: Props) {
  const [editedPrompt, setEditedPrompt] = useState(payload.prompt);
  const [settings, setSettings] = useState<DispatchSettingsState>({
    mode: "dispatch",
    agent: "auto",
    autonomy: 1, // default to autonomous
    autoCommit: false,
  });

  const handlePrimary = () => {
    const final = applySettings(payload, editedPrompt, settings);
    if (settings.mode === "proposal") onProposal(final, settings);
    else onDispatch(final, settings);
  };

  const primaryLabel =
    settings.mode === "dispatch" ? "Dispatch" : "Create Proposal";

  const PrimaryIcon =
    settings.mode === "dispatch" ? PlayArrowIcon : DescriptionIcon;

  return (
    <Box sx={{ width: "100%", maxWidth: 640 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle1" fontWeight={600}>
          Agent Prompt
        </Typography>
        <IconButton size="small" onClick={onCancel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 0.5, display: "block" }}
      >
        This prompt will be sent to the agent in a terminal session. Edit it
        until it captures exactly what you want.
      </Typography>

      <TextField
        multiline
        minRows={6}
        maxRows={20}
        fullWidth
        value={editedPrompt}
        onChange={(e) => setEditedPrompt(e.target.value)}
        sx={{
          mb: 2,
          "& textarea": {
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.6,
          },
        }}
      />

      <Divider sx={{ mb: 2 }} />

      <DispatchSettings
        value={settings}
        onChange={setSettings}
        detectedAgent={payload.analysis.agent}
      />

      <Stack
        direction="row"
        spacing={1}
        justifyContent="flex-end"
        sx={{ mt: 2, mb: 2 }}
      >
        <Button variant="outlined" onClick={onCancel}>
          Back to chat
        </Button>
        <Button
          variant="contained"
          startIcon={<PrimaryIcon />}
          onClick={handlePrimary}
          size="large"
        >
          {primaryLabel}
        </Button>
      </Stack>

      <Accordion
        disableGutters
        elevation={0}
        sx={{ bgcolor: "transparent" }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="caption" color="text.secondary">
            Details
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            sx={{
              bgcolor: "action.hover",
              borderRadius: 1,
              p: 1,
              fontFamily: "monospace",
              fontSize: 12,
              mb: 1,
            }}
          >
            <code>{[payload.command, ...payload.args].join(" ")}</code>
          </Box>
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            <Chip
              label={payload.analysis.agent}
              size="small"
              color="primary"
              variant="outlined"
            />
            {payload.repo && (
              <Chip label={payload.repo} size="small" variant="outlined" />
            )}
            {payload.skills.map((s) => (
              <Chip key={s} label={s} size="small" />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

/** Apply user settings to the payload before dispatch. */
function applySettings(
  payload: DispatchPayload,
  prompt: string,
  settings: DispatchSettingsState,
): DispatchPayload {
  const args = [...payload.args];
  let command = payload.command;

  // Agent override
  if (settings.agent !== "auto") {
    command = settings.agent === "codex" ? "codex" : "claude";
  }

  // Autonomy: interactive removes --dangerously-skip-permissions
  if (settings.autonomy === 0) {
    const idx = args.indexOf("--dangerously-skip-permissions");
    if (idx >= 0) args.splice(idx, 1);
  } else if (
    command === "claude" &&
    !args.includes("--dangerously-skip-permissions")
  ) {
    args.push("--dangerously-skip-permissions");
  }

  return { ...payload, command, args, prompt };
}
