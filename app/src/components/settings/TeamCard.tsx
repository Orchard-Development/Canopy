import { useState } from "react";
import {
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";

export function TeamCard() {
  const { teams, activeTeamId, selectTeam, loading, configured } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  if (!configured) return null;

  async function handleTeamSwitch(id: string) {
    setSaving(true);
    try {
      await selectTeam(id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Team</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select the team this machine syncs sessions to.
        </Typography>

        {loading ? (
          <CircularProgress size={20} />
        ) : teams.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No teams yet. Create or join a team from the Orchard site.
          </Typography>
        ) : (
          <FormControl fullWidth size="small">
            <InputLabel id="team-select-label">Active Team</InputLabel>
            <Select
              labelId="team-select-label"
              value={activeTeamId || ""}
              label="Active Team"
              onChange={(e) => handleTeamSwitch(e.target.value)}
              disabled={saving}
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {(saveStatus === "saved" || saveStatus === "error") && (
          <Stack direction="row" sx={{ mt: 1.5 }}>
            <Chip
              label={saveStatus === "saved" ? "Saved" : "Failed to save"}
              color={saveStatus === "saved" ? "success" : "error"}
              size="small"
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
