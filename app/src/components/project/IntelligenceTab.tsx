import { Stack } from "@mui/material";
import { IntelligenceCard } from "./IntelligenceCard";

interface Props {
  projectId: string;
}

export function IntelligenceTab({ projectId }: Props) {
  return (
    <Stack spacing={2.5}>
      <IntelligenceCard projectId={projectId} />
    </Stack>
  );
}
