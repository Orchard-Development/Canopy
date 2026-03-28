import { Box, Typography, Paper, Chip, LinearProgress, Button, Divider } from "@mui/material";
import { useJudgment } from "../hooks/useJudgment";

export default function Judgment() {
  const { stats, scores, negatives, report, loading, latestScored, generateReport } =
    useJudgment();

  if (loading && !stats) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        Judgment Profiler
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Scores agent output quality by analyzing whether your next message
        advances or retreats. No explicit ratings -- your next message IS the
        rating.
      </Typography>

      {/* Live indicator */}
      {latestScored && (
        <Paper sx={{ p: 2, mb: 3, border: 1, borderColor: "divider" }}>
          <Typography variant="overline" color="text.secondary">
            Latest scored
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <VerdictChip verdict={latestScored.verdict} />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {latestScored.confidence.toFixed(2)} confidence
            </Typography>
            {latestScored.signals.map((s) => (
              <Chip key={s} label={s} size="small" variant="outlined" />
            ))}
          </Box>
        </Paper>
      )}

      {/* Stats overview */}
      {stats && <StatsCard stats={stats} />}

      {/* Skill scores */}
      <SkillScores scores={scores} />

      {/* Recent negatives */}
      <NegativesList negatives={negatives} />

      {/* Report */}
      <ReportSection report={report} onGenerate={generateReport} />
    </Box>
  );
}

function VerdictChip({ verdict }: { verdict: string }) {
  const color =
    verdict === "advancing"
      ? "success"
      : verdict === "non_advancing"
        ? "error"
        : "default";
  return <Chip label={verdict.replace("_", " ")} size="small" color={color as "success" | "error" | "default"} />;
}

function StatsCard({ stats }: { stats: NonNullable<ReturnType<typeof useJudgment>["stats"]> }) {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Overview
      </Typography>
      <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <Stat label="Total scored" value={stats.total} />
        <Stat label="Advancing" value={stats.advancing} color="success.main" />
        <Stat label="Non-advancing" value={stats.non_advancing} color="error.main" />
        <Stat label="Ambiguous" value={stats.ambiguous} color="text.secondary" />
        <Stat
          label="Negative rate"
          value={`${(stats.negative_rate * 100).toFixed(1)}%`}
          color={stats.negative_rate > 0.2 ? "error.main" : "text.primary"}
        />
      </Box>
      {stats.top_failing_skills.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Top failing skills
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
            {stats.top_failing_skills.map((s) => (
              <Chip
                key={s.skill}
                label={`${s.skill} (${(s.rate * 100).toFixed(0)}%)`}
                size="small"
                color="error"
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color: color || "text.primary" }}>
        {value}
      </Typography>
    </Box>
  );
}

function SkillScores({
  scores,
}: {
  scores: Record<string, { total: number; negatives: number; rate: number; top_failure_modes: string[] }>;
}) {
  const entries = Object.entries(scores)
    .filter(([, s]) => s.total >= 3)
    .sort(([, a], [, b]) => b.rate - a.rate);

  if (entries.length === 0) return null;

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Skill scores
      </Typography>
      {entries.map(([skill, s]) => (
        <Box key={skill} sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2">{skill}</Typography>
            <Typography
              variant="body2"
              sx={{ color: s.rate > 0.2 ? "error.main" : "text.secondary" }}
            >
              {s.negatives}/{s.total} ({(s.rate * 100).toFixed(0)}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(1 - s.rate) * 100}
            color={s.rate > 0.2 ? "error" : "success"}
            sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
          />
          {s.top_failure_modes.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
              {s.top_failure_modes.map((m) => (
                <Chip key={m} label={m} size="small" variant="outlined" sx={{ fontSize: 10 }} />
              ))}
            </Box>
          )}
        </Box>
      ))}
    </Paper>
  );
}

function NegativesList({ negatives }: { negatives: Array<{ id: string; prompt_a: string; prompt_b: string; signals: string[]; confidence: number; timestamp: string }> }) {
  if (negatives.length === 0) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Recent negatives
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No negative judgments yet. Keep chatting -- the profiler will start
          scoring after a few turns.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Recent negatives ({negatives.length})
      </Typography>
      {negatives.slice(0, 20).map((n, i) => (
        <Box key={n.id}>
          {i > 0 && <Divider sx={{ my: 1 }} />}
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                &ldquo;{n.prompt_a}&rdquo;
              </Typography>
              <Typography variant="body2" color="error.main" noWrap>
                &rarr; &ldquo;{n.prompt_b}&rdquo;
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
              {n.signals.map((s) => (
                <Chip key={s} label={s} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        </Box>
      ))}
    </Paper>
  );
}

function ReportSection({
  report,
  onGenerate,
}: {
  report: { path: string; content: string } | null;
  onGenerate: () => Promise<unknown>;
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2">Latest report</Typography>
        <Button size="small" variant="outlined" onClick={() => onGenerate()}>
          Generate report
        </Button>
      </Box>
      {report ? (
        <Box
          sx={{
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: 12,
            maxHeight: 400,
            overflow: "auto",
            p: 1,
            bgcolor: "action.hover",
            borderRadius: 1,
          }}
        >
          {report.content}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No reports generated yet. Reports auto-generate after 10 negative
          judgments, or click the button above.
        </Typography>
      )}
    </Paper>
  );
}
