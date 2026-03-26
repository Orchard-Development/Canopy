import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Stack, Skeleton, Alert, Link,
} from "@mui/material";
import ExtensionIcon from "@mui/icons-material/Extension";
import { CardGrid } from "../components/CardGrid";

interface CapAction { name: string; description: string; risk: string }

interface CapSummary {
  name: string; description: string; version: string;
  actions: CapAction[];
  hasRoutes: boolean; hasViews: boolean; hasMcp: boolean; hasEvents: boolean;
}

interface SecretConsumer {
  owner: string; bucket: string; alias: string;
  required: boolean; resolved: boolean; source: string;
}

interface SecretKindStatus { kind: string; consumers: SecretConsumer[] }

const RISK_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  "read-only": "success", write: "warning", destructive: "error",
};

function secretsFor(name: string, all: SecretKindStatus[]): SecretConsumer[] {
  const out: SecretConsumer[] = [];
  for (const k of all) {
    for (const c of k.consumers) {
      if (c.owner === name && c.bucket === "capability") out.push(c);
    }
  }
  return out;
}

function secretChipSx(s: SecretConsumer) {
  if (s.resolved) return { bgcolor: "success.main", color: "common.white" };
  if (s.required) return { bgcolor: "error.main", color: "common.white" };
  return { bgcolor: "action.disabledBackground", color: "text.secondary" };
}

const SectionLabel = ({ children }: { children: string }) => (
  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
    {children}
  </Typography>
);

// -- Card --

function CapabilityCard({ cap, secrets }: { cap: CapSummary; secrets: SecretConsumer[] }) {
  const missingRequired = secrets.filter((s) => s.required && !s.resolved);
  const badges = [
    cap.hasRoutes && "Routes", cap.hasViews && "Views",
    cap.hasMcp && "MCP", cap.hasEvents && "Events",
  ].filter(Boolean) as string[];

  return (
    <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="subtitle1" fontWeight={700}>{cap.name}</Typography>
          <Typography variant="caption" color="text.secondary">v{cap.version}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>
          {cap.description}
        </Typography>

        {cap.actions.length > 0 && (
          <Box>
            <SectionLabel>Actions</SectionLabel>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {cap.actions.map((a) => (
                <Chip key={a.name} label={a.name} size="small"
                  color={RISK_COLOR[a.risk] ?? "default"} variant="outlined" />
              ))}
            </Stack>
          </Box>
        )}

        {secrets.length > 0 && (
          <Box>
            <SectionLabel>Secrets</SectionLabel>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {secrets.map((s) => (
                <Chip key={s.alias} label={s.alias} size="small" sx={secretChipSx(s)} />
              ))}
            </Stack>
          </Box>
        )}

        {missingRequired.length > 0 && (
          <Link href="/settings?tab=secrets" variant="body2" underline="hover">
            Configure secrets
          </Link>
        )}

        {badges.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.5} mt="auto">
            {badges.map((b) => <Chip key={b} label={b} size="small" variant="outlined" />)}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

// -- Main View --

export default function Capabilities() {
  const [caps, setCaps] = useState<CapSummary[]>([]);
  const [secrets, setSecrets] = useState<SecretKindStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/capabilities").then((r) => {
        if (!r.ok) throw new Error(`GET /api/capabilities: ${r.status}`);
        return r.json() as Promise<CapSummary[]>;
      }),
      fetch("/api/secrets/status").then((r) => {
        if (!r.ok) throw new Error(`GET /api/secrets/status: ${r.status}`);
        return r.json() as Promise<{ secrets: SecretKindStatus[] }>;
      }),
    ])
      .then(([capData, secretData]) => { setCaps(capData); setSecrets(secretData.secrets); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ pt: 1 }}>
        <Skeleton variant="rounded" height={60} sx={{ mb: 3 }} />
        <CardGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={180} />
          ))}
        </CardGrid>
      </Box>
    );
  }

  if (error) return <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>;

  if (caps.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8, maxWidth: 480, mx: "auto" }}>
        <ExtensionIcon sx={{ fontSize: 56, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          No capabilities discovered
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Capabilities are loaded from manifest.yaml files in the capabilities/ directory.
          Add a capability there to see it here.
        </Typography>
      </Box>
    );
  }

  const totalActions = caps.reduce((n, c) => n + c.actions.length, 0);

  return (
    <Box sx={{ pt: 1 }}>
      <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={{ xs: 2, sm: 4 }} alignItems="center">
          <Box>
            <Typography variant="h5" fontWeight={700}>{caps.length}</Typography>
            <Typography variant="body2" color="text.secondary">Capabilities</Typography>
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>{totalActions}</Typography>
            <Typography variant="body2" color="text.secondary">Actions</Typography>
          </Box>
        </Stack>
      </Card>
      <CardGrid minWidth={320}>
        {caps.map((cap) => (
          <CapabilityCard key={cap.name} cap={cap}
            secrets={secretsFor(cap.name, secrets)} />
        ))}
      </CardGrid>
    </Box>
  );
}
