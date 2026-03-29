import { useState } from "react";
import { Stack, TextField, Button } from "@mui/material";

interface Props {
  channel: string;
  onSave: (creds: Record<string, unknown>) => void;
}

export function CredentialInput({ channel, onSave }: Props) {
  const [token, setToken] = useState("");

  const isWhatsApp = channel.toLowerCase() === "whatsapp";

  if (isWhatsApp) {
    return (
      <Stack sx={{ mt: 1 }}>
        <Button size="small" variant="outlined" disabled>
          QR Pairing (Phase 2)
        </Button>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="Bot token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <Button
        size="small"
        variant="contained"
        disabled={!token.trim()}
        onClick={() => {
          onSave({ bot_token: token.trim() });
          setToken("");
        }}
      >
        Save
      </Button>
    </Stack>
  );
}
