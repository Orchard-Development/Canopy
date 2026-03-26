import { useState } from "react";
import {
  Card, CardContent, Typography, Stack, Box, Button, Select, MenuItem,
  ToggleButtonGroup, ToggleButton, Slider, Chip, Alert, FormControl,
  InputLabel,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import DesktopWindowsIcon from "@mui/icons-material/DesktopWindows";
import MergeIcon from "@mui/icons-material/MergeType";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { AudioSource, AudioDevice } from "../../hooks/useAudioCapture";

interface Props {
  source: AudioSource;
  micDeviceId: string;
  availableMics: AudioDevice[];
  autoSend: boolean;
  chunkDuration: number;
  onSourceChange: (s: AudioSource) => void;
  onMicDeviceChange: (id: string) => void;
  onRefreshMics: () => void;
  onAutoSendChange: (v: boolean) => void;
  onChunkDurationChange: (ms: number) => void;
}

const SOURCE_OPTIONS: { value: AudioSource; label: string; icon: JSX.Element }[] = [
  { value: "mic", label: "Microphone", icon: <MicIcon sx={{ fontSize: 18 }} /> },
  { value: "desktop", label: "Desktop", icon: <DesktopWindowsIcon sx={{ fontSize: 18 }} /> },
  { value: "both", label: "Both", icon: <MergeIcon sx={{ fontSize: 18 }} /> },
];

function TranscriptionHealth() {
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [reason, setReason] = useState<string>("");

  async function check() {
    setStatus("checking");
    setReason("");
    try {
      const res = await fetch("/api/ai/transcribe/health");
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setStatus("ok");
      } else {
        setStatus("error");
        setReason(data.reason ?? "Unavailable");
      }
    } catch {
      setStatus("error");
      setReason("Cannot reach server");
    }
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button variant="outlined" size="small" onClick={check} disabled={status === "checking"}>
        {status === "checking" ? "Checking..." : "Test Connection"}
      </Button>
      {status === "ok" && (
        <Chip icon={<CheckCircleIcon />} label="OpenAI Whisper ready" color="success" size="small" />
      )}
      {status === "error" && (
        <Chip icon={<ErrorIcon />} label={reason || "Unavailable"} color="error" size="small" />
      )}
    </Stack>
  );
}

function DesktopPermission() {
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");

  async function requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: { width: 1, height: 1 },
      });
      stream.getTracks().forEach((t) => t.stop());
      setStatus("granted");
    } catch {
      setStatus("denied");
    }
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Desktop audio requires screen recording permission from macOS.
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="outlined"
          size="small"
          startIcon={<DesktopWindowsIcon />}
          onClick={requestPermission}
        >
          Grant Screen Share Permission
        </Button>
        {status === "granted" && (
          <Chip icon={<CheckCircleIcon />} label="Granted" color="success" size="small" />
        )}
        {status === "denied" && (
          <Chip icon={<ErrorIcon />} label="Denied" color="error" size="small" />
        )}
      </Stack>
      {status === "denied" && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          Permission denied. Open System Settings &gt; Privacy &amp; Security &gt;
          Screen Recording, enable Orchard, then restart the app.
        </Alert>
      )}
    </Box>
  );
}

export function AudioCard({
  source, micDeviceId, availableMics, autoSend, chunkDuration,
  onSourceChange, onMicDeviceChange, onRefreshMics,
  onAutoSendChange, onChunkDurationChange,
}: Props) {
  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Audio Source</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which audio to capture and transcribe into chat.
            Desktop audio captures system output (meetings, media).
            &quot;Both&quot; merges mic and desktop into a single stream.
          </Typography>
          <ToggleButtonGroup
            value={source}
            exclusive
            onChange={(_, val) => val && onSourceChange(val)}
            size="small"
            fullWidth
          >
            {SOURCE_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value} sx={{ gap: 0.75 }}>
                {opt.icon} {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {source !== "desktop" && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1} alignItems="flex-end">
                <FormControl size="small" fullWidth>
                  <InputLabel id="mic-select-label">Microphone</InputLabel>
                  <Select
                    labelId="mic-select-label"
                    label="Microphone"
                    value={micDeviceId || (availableMics[0]?.deviceId ?? "")}
                    onChange={(e) => onMicDeviceChange(e.target.value)}
                  >
                    {availableMics.map((d) => (
                      <MenuItem key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </MenuItem>
                    ))}
                    {availableMics.length === 0 && (
                      <MenuItem disabled value="">No microphones found</MenuItem>
                    )}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onRefreshMics}
                  sx={{ minWidth: 40, px: 1 }}
                >
                  <RefreshIcon fontSize="small" />
                </Button>
              </Stack>
            </Box>
          )}
          {source !== "mic" && (
            <DesktopPermission />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Transcription</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Audio is transcribed via the OpenAI Whisper API. Requires an OpenAI
            API key in AI Providers settings.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <TranscriptionHealth />
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Chunk duration: {(chunkDuration / 1000).toFixed(1)}s
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              Shorter chunks give faster feedback. Longer chunks give better accuracy.
            </Typography>
            <Slider
              value={chunkDuration}
              onChange={(_, val) => onChunkDurationChange(val as number)}
              min={2000}
              max={15000}
              step={1000}
              marks={[
                { value: 2000, label: "2s" },
                { value: 5000, label: "5s" },
                { value: 10000, label: "10s" },
                { value: 15000, label: "15s" },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${(v / 1000).toFixed(0)}s`}
            />
          </Box>

          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
              Auto-send mode
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
              Automatically send each transcribed chunk as a chat message.
              When off, transcriptions are appended to the input field for review.
            </Typography>
            <ToggleButtonGroup
              value={autoSend ? "on" : "off"}
              exclusive
              onChange={(_, val) => val && onAutoSendChange(val === "on")}
              size="small"
            >
              <ToggleButton value="on">Auto-send</ToggleButton>
              <ToggleButton value="off">Manual review</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
