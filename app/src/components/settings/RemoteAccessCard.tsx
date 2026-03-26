import {
  Card, CardContent, Typography, Stack, Switch,
} from "@mui/material";

interface Props {
  remoteEnabled: string;
  onUpdate: (key: string, value: string) => void;
}

export function RemoteAccessCard({ remoteEnabled, onUpdate }: Props) {
  const isOn = remoteEnabled !== "false";

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Remote Commands</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Accept remote commands from your phone or other devices via Supabase.
        </Typography>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2">Accept remote commands</Typography>
          <Switch
            checked={isOn}
            onChange={(_, checked) => onUpdate("remote_access_enabled", String(checked))}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
