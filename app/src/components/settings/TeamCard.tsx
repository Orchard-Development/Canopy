import { useEffect, useState } from "react";
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
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { fetchSettings } from "../../lib/settingsCache";
import { PROXY_BASE } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

interface Team {
  id: string;
  name: string;
}

export function TeamCard() {
  const { session } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (!supabaseConfigured || !session?.user) {
      setLoading(false);
      return;
    }
    loadTeams(session.user.id);
  }, [session?.user?.id]);

  if (!supabaseConfigured) return null;

  async function loadTeams(userId: string) {
    setLoading(true);
    try {
      const [memberResult, settings] = await Promise.all([
        supabase
          .from("team_members")
          .select("teams(id, name)")
          .eq("user_id", userId),
        fetchSettings(),
      ]);

      const currentTeamId = settings["auth.team_id"] || null;
      setActiveTeamId(currentTeamId);

      if (!memberResult.error && memberResult.data) {
        // Supabase returns teams as object (many-to-one) or array depending on inferred types
        const loaded: Team[] = (memberResult.data as unknown as { teams: Team | Team[] | null }[])
          .flatMap((row) => {
            const t = row.teams;
            if (!t) return [];
            return Array.isArray(t) ? t : [t];
          })
          .filter((t): t is Team => !!t && typeof t.id === "string");
        setTeams(loaded);

        // Auto-select if exactly one team and none is set
        if (loaded.length === 1 && !currentTeamId) {
          await applyTeamSelect(loaded[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function applyTeamSelect(teamId: string) {
    setSaving(true);
    try {
      const res = await fetch(`${PROXY_BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "auth.team_id": teamId }),
      });
      if (res.ok) {
        setActiveTeamId(teamId);
        setSaveStatus("success");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
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
              onChange={(e) => applyTeamSelect(e.target.value)}
              disabled={saving}
            >
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {(saveStatus === "success" || saveStatus === "error") && (
          <Stack direction="row" sx={{ mt: 1.5 }}>
            <Chip
              label={saveStatus === "success" ? "Saved" : "Failed to save"}
              color={saveStatus === "success" ? "success" : "error"}
              size="small"
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
