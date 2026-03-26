import { Chip, Tooltip, alpha } from "@mui/material";
import type { SessionLogMeta } from "../../lib/api";

export function StatusChip({ s }: { s: SessionLogMeta }) {
  if (s.exitCode === undefined) {
    return <Chip label="running" size="small" color="info" variant="outlined" sx={{ height: 20, fontSize: 11 }} />;
  }
  return (
    <Chip
      label={`exit ${s.exitCode}`}
      size="small"
      sx={(t) => ({
        height: 20, fontSize: 11,
        bgcolor: alpha(s.exitCode === 0 ? t.palette.success.main : t.palette.error.main, 0.12),
        color: s.exitCode === 0 ? "success.main" : "error.main",
      })}
    />
  );
}

export function ProfileChip({ s }: { s: SessionLogMeta }) {
  const p = s.profile;
  if (!p?.category || p.category === "unknown") return null;
  return (
    <Tooltip title={p.oneLiner || p.doing || ""} placement="top">
      <Chip
        label={p.category}
        size="small"
        sx={{
          height: 20, fontSize: 11, fontWeight: 600,
          bgcolor: p.color ? alpha(p.color, 0.15) : undefined,
          color: p.color || "text.secondary",
          borderColor: p.color ? alpha(p.color, 0.3) : undefined,
        }}
        variant="outlined"
      />
    </Tooltip>
  );
}
