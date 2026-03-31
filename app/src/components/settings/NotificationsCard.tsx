import { Card, CardContent, Typography, FormGroup, FormControlLabel, Switch, Button, Stack, Divider, Box } from "@mui/material";
import { useSettingsContext } from "../../contexts/SettingsContext";

const DEFAULT_ENABLED = new Set([
  "engine", "session", "prompt", "subagent", "proposal", "autocommit", "autopush",
]);

const CATEGORY_GROUPS = [
  {
    label: "Agent Lifecycle",
    categories: [
      { key: "session", label: "Session start/stop" },
      { key: "subagent", label: "Subagent dispatched" },
      { key: "agent", label: "Agent events" },
      { key: "prompt", label: "Prompt submitted" },
      { key: "permission", label: "Permission requests" },
      { key: "elicitation", label: "Elicitations" },
      { key: "notification", label: "Notifications" },
    ],
  },
  {
    label: "Code Operations",
    categories: [
      { key: "autocommit", label: "Auto-commit results" },
      { key: "autopush", label: "Auto-push results" },
      { key: "autopull", label: "Auto-pull results" },
      { key: "worktree", label: "Worktree changes" },
    ],
  },
  {
    label: "Workspace",
    categories: [
      { key: "engine", label: "Engine events" },
      { key: "task", label: "Task completed" },
      { key: "proposal", label: "Proposal created" },
      { key: "project", label: "Project events" },
      { key: "analysis", label: "Analysis events" },
      { key: "config", label: "Config changes" },
    ],
  },
  {
    label: "Low-level",
    categories: [
      { key: "tool", label: "Tool calls" },
      { key: "context", label: "Context events" },
    ],
  },
];

function isEnabled(settings: Record<string, string>, cat: string): boolean {
  const val = settings[`notifications.toast.${cat}`];
  if (val === undefined) return DEFAULT_ENABLED.has(cat);
  return val === "true";
}

function persistSettings(updates: Record<string, string>): void {
  fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).catch(() => {});
}

export function NotificationsCard() {
  const { settings, setSetting } = useSettingsContext();

  function handleToggle(cat: string, checked: boolean) {
    const key = `notifications.toast.${cat}`;
    const val = checked ? "true" : "false";
    setSetting(key, val);
    persistSettings({ [key]: val });
  }

  function handleReset() {
    const updates: Record<string, string> = {};
    for (const group of CATEGORY_GROUPS) {
      for (const { key } of group.categories) {
        updates[`notifications.toast.${key}`] = DEFAULT_ENABLED.has(key) ? "true" : "false";
      }
    }
    for (const [k, v] of Object.entries(updates)) {
      setSetting(k, v);
    }
    persistSettings(updates);
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6">Toast Notifications</Typography>
          <Button size="small" variant="outlined" onClick={handleReset}>Reset to defaults</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose which event categories appear as toast popups. All events still appear in the notification bell. Errors always show regardless.
        </Typography>
        <Stack spacing={2} divider={<Divider />}>
          {CATEGORY_GROUPS.map((group) => (
            <Box key={group.label}>
              <Typography variant="overline" color="text.secondary">{group.label}</Typography>
              <FormGroup>
                {group.categories.map(({ key, label }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        size="small"
                        checked={isEnabled(settings, key)}
                        onChange={(e) => handleToggle(key, e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">{label}</Typography>}
                  />
                ))}
              </FormGroup>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
