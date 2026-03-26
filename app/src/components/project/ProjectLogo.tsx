import { useState } from "react";
import { Avatar, type SxProps, type Theme } from "@mui/material";

interface ProjectLogoProps {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  size?: number;
  sx?: SxProps<Theme>;
}

function initialColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function ProjectLogo({ name, logoUrl, faviconUrl, size = 36, sx }: ProjectLogoProps) {
  const [imgError, setImgError] = useState(false);
  const src = imgError ? faviconUrl : (logoUrl || faviconUrl);
  const showImg = src && !(imgError && !faviconUrl);
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <Avatar
      src={showImg ? src : undefined}
      onError={() => {
        if (!imgError) {
          setImgError(true);
        }
      }}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        fontWeight: 700,
        bgcolor: showImg ? "transparent" : initialColor(name),
        color: "#fff",
        borderRadius: 1.5,
        ...sx,
      }}
    >
      {showImg ? null : initial}
    </Avatar>
  );
}
