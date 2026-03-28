import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Typography,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import { useJudgment } from "../../hooks/useJudgment";

export function JudgmentCard() {
  const { stats, scores, negatives, report, loading, latestScored, generateReport } =
    useJudgment();

  if (loading && !stats) {
    return (
      <Card>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Typography variant="body2" fontWeight={600}>
            Judgment Profiler
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    );
  }

  const skillEntries = Object.entries(scores)
    .filter(([, s]) => s.total >= 3)
    .sort(([, a], [, b]) => b.rate - a.rate);

  return (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <GavelIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="body2" fontWeight={600}>
            Judgment Profiler
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={() => generateReport()} sx={{ fontSize: "0.65rem" }}>
            Generate report
          </Button>
        </Box>

        {/* Stats row */}
        {stats && (
          <Box sx={{ display: "flex", gap: 2, mb: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">
              Total: {stats.total}
            </Typography>
            <Typography variant="caption" color="success.main">
              Advancing: {stats.advancing}
            </Typography>
            <Typography variant="caption" color="error.main">
              Non-advancing: {stats.non_advancing}
            </Typography>
            <Typography
              variant="caption"
              color={stats.negative_rate > 0.2 ? "error.main" : "text.secondary"}
            >
              Negative rate: {(stats.negative_rate * 100).toFixed(1)}%
            </Typography>
          </Box>
        )}

        {/* Latest scored */}
        {latestScored && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Latest:
            </Typography>
            <Chip
              label={latestScored.verdict.replace("_", " ")}
              size="small"
              color={latestScored.verdict === "advancing" ? "success" : latestScored.verdict === "non_advancing" ? "error" : "default"}
              sx={{ fontSize: "0.6rem", height: 18 }}
            />
            <Typography variant="caption" color="text.secondary">
              {latestScored.confidence.toFixed(2)}
            </Typography>
            {latestScored.signals.map((s) => (
              <Chip key={s} label={s} size="small" variant="outlined" sx={{ fontSize: "0.55rem", height: 16 }} />
            ))}
          </Box>
        )}

        {/* Top failing skills */}
        {stats && stats.top_failing_skills.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
              Top failing skills
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              {stats.top_failing_skills.map((s) => (
                <Chip
                  key={s.skill}
                  label={`${s.skill} (${(s.rate * 100).toFixed(0)}%)`}
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ fontSize: "0.55rem", height: 16 }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Skill score bars (top 5) */}
        {skillEntries.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
              Skill scores
            </Typography>
            {skillEntries.slice(0, 5).map(([skill, s]) => (
              <Box key={skill} sx={{ mb: 0.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="caption">{skill}</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: s.rate > 0.2 ? "error.main" : "text.secondary" }}
                  >
                    {s.negatives}/{s.total} ({(s.rate * 100).toFixed(0)}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(1 - s.rate) * 100}
                  color={s.rate > 0.2 ? "error" : "success"}
                  sx={{ height: 3, borderRadius: 2 }}
                />
              </Box>
            ))}
          </Box>
        )}

        {/* Recent negatives count */}
        {negatives.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {negatives.length} recent negative{negatives.length !== 1 ? "s" : ""}
          </Typography>
        )}

        {/* Report status */}
        {report && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Latest report: {report.path.split("/").pop()}
          </Typography>
        )}

        {!stats?.total && (
          <Typography variant="caption" color="text.secondary">
            No judgments yet. The profiler scores after a few chat turns.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
