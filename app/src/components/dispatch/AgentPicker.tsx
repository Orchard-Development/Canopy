import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { AgentType } from "../../types/dispatch";

interface Props {
  value: AgentType;
  onChange: (agent: AgentType) => void;
}

export function AgentPicker({ value, onChange }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_, v: AgentType | null) => {
        if (v) onChange(v);
      }}
    >
      <ToggleButton value="auto">Auto</ToggleButton>
      <ToggleButton value="claude">Claude</ToggleButton>
      <ToggleButton value="codex">Codex</ToggleButton>
      <ToggleButton value="opencode">OpenCode</ToggleButton>
    </ToggleButtonGroup>
  );
}
