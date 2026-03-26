import { useMemo, useState, useEffect } from "react";
import { Box, Typography, Chip, LinearProgress, Button, alpha } from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import { api } from "../../lib/api";
import type { OrchardData, OrchardSeed, OrchardSession } from "./types";

export function SeedDetail({ data, seedName }: { data: OrchardData; seedName: string }) {
  const seed = data.seeds.find((s) => s.name === seedName);
  if (!seed) return <Typography color="text.disabled">Seed not found</Typography>;

  const connectedSessions = useMemo(() => {
    const ids = new Set(
      data.connections.filter((c) => c.seed_name === seedName).map((c) => c.session_id),
    );
    return data.sessions
      .filter((s) => ids.has(s.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [data, seedName]);

  return (
    <>
      <Typography variant="h6" color="warning.main" sx={{ fontSize: 16, mb: 0.5 }}>
        {seed.name}
      </Typography>
      <Chip
        label={seed.type}
        size="small"
        sx={(t) => ({ bgcolor: alpha(t.palette.warning.main, 0.15), color: "warning.main", mb: 1 })}
      />
      <InfoRow label="Usage count" value={String(seed.usage_count)} />
      <InfoRow
        label="Created"
        value={seed.created_at ? new Date(seed.created_at).toLocaleDateString() : "Unknown"}
      />
      <GrowthChart growth={seed.growth} />
      <Typography variant="caption" color="text.disabled" sx={{ mt: 2, mb: 0.5 }}>
        Connected Sessions ({connectedSessions.length})
      </Typography>
      {connectedSessions.map((s) => (
        <SessionRow key={s.id} session={s} />
      ))}
    </>
  );
}

interface SessionDetailProps {
  data: OrchardData;
  sessionId: string;
  onViewTranscript?: () => void;
}

export function SessionDetail({ data, sessionId, onViewTranscript }: SessionDetailProps) {
  const session = data.sessions.find((s) => s.id === sessionId);
  const [hasTranscript, setHasTranscript] = useState(false);

  useEffect(() => {
    setHasTranscript(false);
    api.getSessionMessages(sessionId)
      .then((msgs) => setHasTranscript(msgs.length > 0))
      .catch(() => setHasTranscript(false));
  }, [sessionId]);

  if (!session) return <Typography color="text.disabled">Session not found</Typography>;

  const toolEntries = useMemo(
    () => Object.entries(session.tools).sort((a, b) => b[1] - a[1]).slice(0, 8),
    [session.tools],
  );
  const maxCount = toolEntries.length > 0 ? toolEntries[0][1] : 1;

  const connectedSeeds = useMemo(
    () => data.connections.filter((c) => c.session_id === sessionId).map((c) => c.seed_name),
    [data.connections, sessionId],
  );

  return (
    <>
      <InfoRow label="Date" value={new Date(session.date).toLocaleDateString()} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: 12 }}>
        {session.label?.slice(0, 200) || "No query preview"}
      </Typography>
      {onViewTranscript && hasTranscript && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArticleIcon />}
          onClick={onViewTranscript}
          sx={{ mb: 1.5 }}
          fullWidth
        >
          View Transcript
        </Button>
      )}
      <PositionExplanation session={session} connectedSeeds={connectedSeeds} />
      {toolEntries.length > 0 && <ToolBars entries={toolEntries} maxCount={maxCount} />}
      {connectedSeeds.length > 0 && <SeedChips seeds={connectedSeeds} />}
    </>
  );
}

function PositionExplanation({
  session,
  connectedSeeds,
}: {
  session: OrchardSession;
  connectedSeeds: string[];
}) {
  const topTools = Object.entries(session.tools)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const drivers: string[] = [];
  if (topTools.length > 0) drivers.push(`tools: ${topTools.join(", ")}`);
  if (connectedSeeds.length > 0) drivers.push(`skills: ${connectedSeeds.slice(0, 3).join(", ")}`);
  if (session.total_tool_calls > 50) drivers.push("high activity");
  else if (session.total_tool_calls === 0) drivers.push("no tool usage");

  if (drivers.length === 0) return null;

  return (
    <Box sx={(t) => ({
      mb: 1.5, p: 1, borderRadius: 1,
      bgcolor: alpha(t.palette.info.main, 0.08),
      border: `1px solid ${alpha(t.palette.info.main, 0.15)}`,
    })}>
      <Typography sx={{ fontSize: 10, color: "info.main", fontWeight: 600, mb: 0.3 }}>
        Position driven by
      </Typography>
      <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
        {drivers.join(" · ")}
      </Typography>
      <Typography sx={{ fontSize: 10, color: "text.disabled", mt: 0.3 }}>
        Sessions with similar tool/skill profiles cluster together via PCA
      </Typography>
    </Box>
  );
}

function ToolBars({ entries, maxCount }: { entries: [string, number][]; maxCount: number }) {
  return (
    <>
      <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5 }}>
        Tools
      </Typography>
      {entries.map(([name, count]) => (
        <Box key={name} sx={{ mb: 0.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
            <Typography color="text.primary" sx={{ fontSize: 11 }}>{name}</Typography>
            <Typography color="text.disabled" sx={{ fontSize: 11 }}>{count}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(count / maxCount) * 100}
            sx={(t) => ({
              height: 3, borderRadius: 1,
              bgcolor: alpha(t.palette.text.primary, 0.06),
            })}
          />
        </Box>
      ))}
    </>
  );
}

function SeedChips({ seeds }: { seeds: string[] }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="caption" color="text.disabled" sx={{ mb: 0.5 }}>
        Skills Used
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
        {seeds.map((name) => (
          <Chip
            key={name}
            label={name}
            size="small"
            sx={(t) => ({ bgcolor: alpha(t.palette.primary.main, 0.15), color: "primary.main", fontSize: 11 })}
          />
        ))}
      </Box>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
      <Typography color="text.disabled" sx={{ fontSize: 12 }}>{label}</Typography>
      <Typography color="text.primary" sx={{ fontSize: 12 }}>{value}</Typography>
    </Box>
  );
}

function GrowthChart({ growth }: { growth: OrchardSeed["growth"] }) {
  if (!growth || growth.length === 0) return null;
  const maxCount = Math.max(...growth.map((g) => g.count), 1);
  const w = 280;
  const h = 50;
  const stepX = growth.length > 1 ? w / (growth.length - 1) : w;
  const points = growth
    .map((g, i) => `${i * stepX},${h - (g.count / maxCount) * h}`)
    .join(" ");

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Typography variant="caption" color="text.disabled">
        Weekly usage
      </Typography>
      <svg width={w} height={h} style={{ display: "block" }}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      </svg>
    </Box>
  );
}

function SessionRow({ session }: { session: OrchardSession }) {
  return (
    <Box sx={{ py: 0.5, borderBottom: 1, borderColor: "divider" }}>
      <Typography color="text.disabled" sx={{ fontSize: 10 }}>
        {new Date(session.date).toLocaleDateString()}
      </Typography>
      <Typography color="text.secondary" sx={{
        fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {session.label?.slice(0, 80) || "No preview"}
      </Typography>
    </Box>
  );
}
