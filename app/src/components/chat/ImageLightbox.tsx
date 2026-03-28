import { useCallback, useEffect } from "react";
import { Box, IconButton, Link } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = "Image", onClose }: Props) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        bgcolor: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          gap: 1,
        }}
      >
        <Link
          href={src}
          download
          onClick={(e) => e.stopPropagation()}
          sx={{ display: "flex" }}
        >
          <IconButton size="small" sx={{ color: "white" }}>
            <DownloadIcon />
          </IconButton>
        </Link>
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box
        component="img"
        src={src}
        alt={alt}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        sx={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          objectFit: "contain",
          borderRadius: 1,
          cursor: "default",
        }}
      />
    </Box>
  );
}
