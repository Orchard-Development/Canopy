import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Collapse,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ApiKeyForm } from "./ApiKeyForm";

export type ProviderId = "anthropic" | "openai" | "xai";

interface Props {
  id: ProviderId;
  label: string;
  placeholder: string;
  connected: boolean;
  onConnected: () => void;
}

function buildSaveSettings(id: ProviderId, apiKey: string): Record<string, string> {
  if (id === "anthropic") {
    return { claude_auth_mode: "api_key", anthropic_api_key: apiKey };
  }
  if (id === "xai") {
    return { xai_api_key: apiKey };
  }
  return { codex_auth_mode: "api_key", openai_api_key: apiKey };
}

export function ProviderCard({ id, label, placeholder, connected, onConnected }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: connected ? "success.main" : "divider",
        borderWidth: connected ? 2 : 1,
        transition: "border-color 0.2s",
      }}
    >
      <CardContent
        sx={{ cursor: connected ? "default" : "pointer", "&:last-child": { pb: 2 } }}
        onClick={() => !connected && setExpanded((v) => !v)}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" fontWeight={600}>{label}</Typography>
          {connected ? (
            <Chip icon={<CheckCircleIcon />} label="Connected" color="success" size="small" />
          ) : (
            <ExpandMoreIcon
              sx={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          )}
        </Stack>
      </CardContent>

      <Collapse in={expanded && !connected}>
        <CardContent sx={{ pt: 0 }}>
          <ApiKeyForm
            testProvider={id}
            placeholder={placeholder}
            saveSettings={(apiKey) => buildSaveSettings(id, apiKey)}
            onConnected={onConnected}
          />
        </CardContent>
      </Collapse>
    </Card>
  );
}
