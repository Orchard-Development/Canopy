import { useMemo, useState, useEffect } from "react";
import { Box, Typography, Chip, LinearProgress, Button, alpha } from "@mui/material";
import ArticleIcon from "@mui/icons-material/Article";
import { api } from "../../lib/api";
import type { SessionLogMeta } from "../../lib/api";
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
  const [meta, setMeta] = useState<SessionLogMeta | null>(null);
  const [hasTranscript, setHasTranscript] = useState(false);

  const realId = session?.id ?? sessionId;
  const sourceType = session?.source_type ?? "session";

  useEffect(() => {
    setMeta(null);
    setHasTranscript(false);

    if (sourceType === "session") {
      api.listSessionLogs()
        .then((logs) => {
          const found = logs.find((l) => l.id === realId);
          if (found) setMeta(found);
        })
        .catch(() => {});

      api.getSessionMessages(realId)
        .then((msgs) => setHasTranscript(msgs.length > 0))
        .catch(() => setHasTranscript(false));
    }
  }, [realId, sourceType]);

  if (!session) return <Typography color="text.disabled">Session not found</Typography>;

  const connectedSeeds = useMemo(
    () => data.connections.filter((c) => c.session_id === sessionId).map((c) => c.seed_name),
    [data.connections, sessionId],
  );

  const label = meta?.label || meta?.summary || cleanSummary(session.label);
  const profile = meta?.profile;

  return (
    <>
      <Chip
        label={sourceType}
        size="small"
        sx={(t) => ({
          bgcolor: alpha(typeColor(sourceType, t), 0.12),
          color: typeColor(sourceType, t),
          mb: 1,
          textTransform: "capitalize",
        })}
      />

      {meta?.startedAt && (
        <InfoRow label="Started" value={new Date(meta.startedAt).toLocaleString()} />
      )}
      {!meta?.startedAt && session.date && (
        <InfoRow label="Date" value={new Date(session.date).toLocaleDateString()} />
      )}
      {meta?.cwd && (
        <InfoRow label="Project" value={meta.cwd.split("/").slice(-2).join("/")} />
      )}
      {meta?.exitCode !== undefined && (
        <InfoRow label="Exit" value={meta.exitCode === 0 ? "Clean" : `Code ${meta.exitCode}`} />
      )}
      {meta && (
        <InfoRow label="Size" value={`${meta.lineCount} lines`} />
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, mt: 1, fontSize: 13, lineHeight: 1.5 }}>
        {label || "No summary available"}
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

      {profile && <ProfileSection profile={profile} />}
      {connectedSeeds.length > 0 && <SeedChips seeds={connectedSeeds} />}
    </>
  );
}

function ProfileSection({ profile }: { profile: NonNullable<SessionLogMeta["profile"]> }) {
  const topTools = useMemo(
    () => Object.entries(profile.tools || {}).sort((a, b) => b[1] - a[1]).slice(0, 6),
    [profile.tools],
  );
  const maxCount = topTools.length > 0 ? topTools[0][1] : 1;

  return (
    <>
      {profile.skills && profile.skills.length > 0 && (
        <SeedChips seeds={profile.skills.map((s: { name: string }) => s.name)} />
      )}
      {topTools.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <ToolBars entries={topTools} maxCount={maxCount} />
        </Box>
      )}
    </>
  );
}

function typeColor(type: string, theme: { palette: Record<string, any> }): string {
  const p = theme.palette;
  const map: Record<string, string> = {
    session: p.primary.main,
    memory: p.error.main,
    proposal: p.success.main,
    skill: p.warning.main,
    rule: p.secondary.main,
  };
  return map[type] ?? p.text.secondary;
}

function cleanSummary(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/^##\s*(User|Assistant)\s*/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, 300);
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
