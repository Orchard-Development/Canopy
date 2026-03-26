import { useState } from "react";
import { Stack, Typography, Divider, Button } from "@mui/material";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { IntelligenceCard } from "./IntelligenceCard";
import { SeedStatusCard } from "./SeedStatusCard";
import { AvailablePacksCard } from "./AvailablePacksCard";
import { HarvestDialog } from "./HarvestDialog";
import { AiHarvestDialog } from "./AiHarvestDialog";

interface Props {
  projectId: string;
  projectName?: string;
}

export function IntelligenceTab({ projectId, projectName }: Props) {
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [aiHarvestOpen, setAiHarvestOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Stack spacing={2.5}>
      <IntelligenceCard projectId={projectId} />

      <Divider>
        <Typography variant="caption" color="text.secondary">Seed Packs</Typography>
      </Divider>

      <SeedStatusCard projectId={projectId} />

      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AgricultureIcon />}
          onClick={() => setHarvestOpen(true)}
        >
          Harvest from project
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => setAiHarvestOpen(true)}
        >
          AI Harvest
        </Button>
      </Stack>

      <AvailablePacksCard projectId={projectId} refreshKey={refreshKey} />

      <HarvestDialog
        projectId={projectId}
        open={harvestOpen}
        onClose={() => setHarvestOpen(false)}
        onHarvested={() => setRefreshKey((k) => k + 1)}
      />

      <AiHarvestDialog
        projectId={projectId}
        projectName={projectName ?? "this project"}
        open={aiHarvestOpen}
        onClose={() => setAiHarvestOpen(false)}
        onHarvested={() => setRefreshKey((k) => k + 1)}
      />
    </Stack>
  );
}
