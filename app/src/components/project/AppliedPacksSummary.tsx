import { useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Box,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import LockIcon from "@mui/icons-material/Lock";
import SpaIcon from "@mui/icons-material/Spa";
import { useProjectData } from "../../hooks/useProjectData";

/**
 * Compact seed pack summary for the project dashboard.
 * Shows each public pack with applied/not-applied status and required badge.
 */
export function AppliedPacksSummary() {
  const { seedStatus, packList } = useProjectData();

  const appliedSlugs = useMemo(() => {
    const packs = (seedStatus as { packs?: Record<string, unknown> })?.packs || {};
    return new Set(Object.keys(packs).filter((k) => packs[k]));
  }, [seedStatus]);

  const publicPacks = useMemo(
    () => packList.filter((p) => p.source === "public"),
    [packList],
  );

  if (publicPacks.length === 0) return null;

  const appliedCount = publicPacks.filter((p) => appliedSlugs.has(p.slug)).length;

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <SpaIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>Seed Packs</Typography>
          <Chip
            label={`${appliedCount}/${publicPacks.length}`}
            size="small"
            color={appliedCount === publicPacks.length ? "success" : "warning"}
            variant="outlined"
            sx={{ height: 20, fontSize: "0.7rem" }}
          />
        </Stack>

        <Stack spacing={0.5}>
          {publicPacks.map((pack) => {
            const applied = appliedSlugs.has(pack.slug);
            return (
              <Stack key={pack.slug} direction="row" spacing={0.75} alignItems="center">
                {applied ? (
                  <CheckCircleOutlineIcon sx={{ fontSize: 14, color: "success.main" }} />
                ) : (
                  <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                )}
                <Typography
                  variant="caption"
                  color={applied ? "text.primary" : "text.disabled"}
                  sx={{ flex: 1 }}
                >
                  {pack.name}
                </Typography>
                {pack.auto_apply && (
                  <LockIcon sx={{ fontSize: 11, color: "success.main", opacity: 0.7 }} />
                )}
                {!pack.auto_apply && (
                  <Box
                    component="span"
                    sx={{ fontSize: "0.6rem", color: "text.disabled", lineHeight: 1 }}
                  >
                    opt-in
                  </Box>
                )}
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
