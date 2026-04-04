import { useRef, useState } from "react";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useBranding } from "../../lib/branding";
import { useColorMode } from "../../hooks/useColorMode";

const AVATAR_MAX_PX = 256;
const AVATAR_TARGET_BYTES = 100 * 1024;

interface Props {
  displayName: string;
  avatarBase64: string;
  machineName?: string;
  onUpdate: (key: string, value: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, AVATAR_MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.9;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      while (dataUrl.length > AVATAR_TARGET_BYTES * 1.37 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(dataUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

export function IdentityCard({ displayName, avatarBase64, machineName, onUpdate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const branding = useBranding();
  const { mode } = useColorMode();
  const primaryColor = branding[mode].primary;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }

    try {
      setCompressing(true);
      const dataUrl = await compressImage(file);
      onUpdate("avatar_base64", dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setCompressing(false);
    }
  }

  const initials = getInitials(displayName);
  const avatarSrc = avatarBase64 || undefined;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Identity</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set your display name and avatar. These are shown across your orchard.
        </Typography>

        <Stack direction="row" spacing={3} alignItems="center">
          <Box>
            <Avatar
              src={avatarSrc}
              sx={{
                width: 64,
                height: 64,
                bgcolor: avatarSrc ? "transparent" : primaryColor,
                fontSize: 24,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => !compressing && fileRef.current?.click()}
              aria-label="Upload avatar"
            >
              {compressing ? <CircularProgress size={24} /> : !avatarSrc && initials}
            </Avatar>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              label="Display name"
              size="small"
              value={displayName}
              onChange={(e) => onUpdate("display_name", e.target.value)}
              placeholder="Your name"
              sx={{ mb: 1.5 }}
            />
            <TextField
              fullWidth
              label="Machine name"
              size="small"
              value={machineName ?? ""}
              onChange={(e) => onUpdate("machine.nickname", e.target.value)}
              placeholder="e.g. Work Laptop, Home Desktop"
              helperText="Identifies this machine in Roots and team views"
            />
          </Box>
        </Stack>

        {avatarBase64 && (
          <Button
            size="small"
            color="error"
            sx={{ mt: 1.5, textTransform: "none" }}
            onClick={() => onUpdate("avatar_base64", "")}
          >
            Remove avatar
          </Button>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </CardContent>
    </Card>
  );
}
