import { useEffect, useState, useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { api } from "../../../lib/api";
import { PackCard, type PackCardData } from "../../seedpacks/PackCard";
import type { FieldRendererProps } from "../../../types/forms";

/**
 * Seed pack multi-select with card-based UI in a collapsible accordion.
 * Groups packs by category. Value is a JSON array of selected slugs.
 */
export function SeedPackField({ value, onChange, disabled }: FieldRendererProps) {
  const [packs, setPacks] = useState<PackCardData[]>([]);
  const [expanded, setExpanded] = useState(false);

  const selected = useMemo<Set<string>>(() => {
    try { return new Set(JSON.parse(value) as string[]); }
    catch { return new Set(); }
  }, [value]);

  useEffect(() => {
    api.listSeedPacks().then((list) => {
      const publicPacks = list.filter((p) => p.source === "public");
      setPacks(publicPacks.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        source: p.source,
        fileCount: p.fileCount,
        version: p.version,
        category: p.category,
        techStack: p.techStack,
      })));
      if (!value || value === "[]") {
        onChange(JSON.stringify(publicPacks.map((p) => p.slug)));
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = useMemo(() => {
    const map: Record<string, PackCardData[]> = {};
    for (const p of packs) (map[p.category || "Other"] ??= []).push(p);
    return Object.entries(map);
  }, [packs]);

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    onChange(JSON.stringify(Array.from(next)));
  }

  function toggleAll() {
    if (selected.size === packs.length) onChange("[]");
    else onChange(JSON.stringify(packs.map((p) => p.slug)));
  }

  if (packs.length === 0) return null;

  const summary = `${selected.size} of ${packs.length} seed packs selected`;

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded((v) => !v)}
      variant="outlined"
      disableGutters
      sx={{ "&::before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%" }}>
          <Typography variant="subtitle2">Seed Packs</Typography>
          <Chip label={summary} size="small" variant="outlined" />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button size="small" onClick={toggleAll} disabled={disabled}>
            {selected.size === packs.length ? "Deselect all" : "Select all"}
          </Button>
        </Stack>
        {groups.map(([category, categoryPacks]) => (
          <Box key={category} sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: "block" }}>
              {category}
            </Typography>
            <Stack spacing={0.75}>
              {categoryPacks.map((pack) => (
                <PackCard
                  key={pack.slug}
                  pack={pack}
                  selected={selected.has(pack.slug)}
                  onToggle={() => !disabled && toggle(pack.slug)}
                  compact
                />
              ))}
            </Stack>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
