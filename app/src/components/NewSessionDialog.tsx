import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Typography,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { api } from "../lib/api";

export interface NewWebTab {
  type: "web";
  id: string;
  url: string;
  title: string;
}

export interface NewRdpTab {
  type: "rdp";
  id: string;
  hostname: string;
  username: string;
}

export type NewTab = NewWebTab | NewRdpTab;

interface Props {
  open: boolean;
  onClose: () => void;
  onConnect: (tab: NewTab) => void;
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function NewSessionDialog({ open, onClose, onConnect }: Props) {
  const [sessionType, setSessionType] = useState<"web" | "rdp">("web");
  const [url, setUrl] = useState("");
  const [config, setConfig] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setUrl(""); setConfig(""); setPassword(""); setError(""); setLoading(false);
    onClose();
  }

  function handleWebConnect() {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    onConnect({ type: "web", id: crypto.randomUUID(), url: normalized, title: normalized });
    handleClose();
  }

  async function handleRdpConnect() {
    setError(""); setLoading(true);
    try {
      const r = await api.createRdpSession(config, password);
      onConnect({ type: "rdp", id: r.id, hostname: r.hostname, username: r.username });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setConfig(await file.text());
    } catch {
      setError("Failed to read file");
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Session</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <ToggleButtonGroup
            value={sessionType}
            exclusive
            onChange={(_, v) => v && setSessionType(v)}
            fullWidth
            size="small"
          >
            <ToggleButton value="web">
              <LanguageIcon sx={{ mr: 1, fontSize: 18 }} />
              <Typography variant="body2">Web Browser</Typography>
            </ToggleButton>
            <ToggleButton value="rdp">
              <DesktopWindowsIcon sx={{ mr: 1, fontSize: 18 }} />
              <Typography variant="body2">Remote Desktop</Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          {sessionType === "web" ? (
            <>
              <TextField
                label="URL" value={url} onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleWebConnect()}
                placeholder="https://example.com" fullWidth autoFocus
              />
              <Button variant="contained" onClick={handleWebConnect} disabled={!url.trim()}>
                Open
              </Button>
            </>
          ) : (
            <>
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} fullWidth>
                Browse for .rdp file
                <input type="file" accept=".rdp,text/plain" hidden onChange={handleFile} />
              </Button>
              <TextField
                label="RDP Config" multiline minRows={4} maxRows={8}
                value={config} onChange={(e) => setConfig(e.target.value)}
                placeholder={"full address:s:host\nusername:s:Administrator"} fullWidth
              />
              <TextField
                label="Password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} fullWidth
              />
              <Button variant="contained" onClick={handleRdpConnect} disabled={!config.trim() || loading}>
                {loading ? "Connecting..." : "Connect"}
              </Button>
            </>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
