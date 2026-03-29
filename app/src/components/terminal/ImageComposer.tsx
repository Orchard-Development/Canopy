import { useState, useCallback } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export interface PastedImage {
  dataUrl: string;
  file: File;
  /** Original URL if pasted from web, or file path if dropped */
  sourceUrl?: string;
}

function extractSourceUrl(transfer: DataTransfer): string | undefined {
  const uri = transfer.getData("text/uri-list");
  if (uri && /^https?:\/\//.test(uri.trim())) return uri.trim().split("\n")[0];

  const html = transfer.getData("text/html");
  if (html) {
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match?.[1] && /^https?:\/\//.test(match[1])) return match[1];
  }

  const text = transfer.getData("text/plain");
  if (text && /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)/i.test(text.trim())) {
    return text.trim();
  }

  return undefined;
}

export function useImageComposer() {
  const [images, setImages] = useState<PastedImage[]>([]);

  const addImageFile = useCallback((file: File, sourceUrl?: string) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        const src = sourceUrl || ((file as any).path ? `file://${(file as any).path}` : undefined);
        setImages((prev) => [...prev, { dataUrl, file, sourceUrl: src }]);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const sourceUrl = extractSourceUrl(e.clipboardData);
        addImageFile(file, sourceUrl);
        return;
      }
    }
  }, [addImageFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    const sourceUrl = extractSourceUrl(e.dataTransfer);
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith("image/")) {
        addImageFile(files[i], sourceUrl);
      }
    }
  }, [addImageFile]);

  const removeImage = useCallback((idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return { images, handlePaste, handleDrop, removeImage, clearImages };
}

interface ImagePreviewStripProps {
  images: PastedImage[];
  onRemove: (idx: number) => void;
}

export function ImagePreviewStrip({ images, onRemove }: ImagePreviewStripProps) {
  if (images.length === 0) return null;
  return (
    <Box sx={{
      display: "flex", gap: 1, px: 1.5, py: 0.5,
      borderTop: 1, borderColor: "divider", overflowX: "auto",
    }}>
      {images.map((img, i) => (
        <Box key={i} sx={{ position: "relative", flexShrink: 0, maxWidth: 140 }}>
          <Box
            component="img"
            src={img.dataUrl}
            sx={{
              height: 64, maxWidth: 140, borderRadius: 1,
              objectFit: "cover", border: 1, borderColor: "divider",
            }}
          />
          {img.sourceUrl && (
            <Typography
              variant="caption"
              color="text.disabled"
              noWrap
              sx={{ display: "block", fontSize: 9, mt: 0.25 }}
              title={img.sourceUrl}
            >
              {img.sourceUrl.replace(/^(file:\/\/|https?:\/\/)/, "").slice(0, 30)}
            </Typography>
          )}
          <IconButton
            size="small"
            onClick={() => onRemove(i)}
            sx={{
              position: "absolute", top: -6, right: -6,
              bgcolor: "background.paper", width: 18, height: 18,
              border: 1, borderColor: "divider",
              "&:hover": { bgcolor: "error.main", color: "white" },
            }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}
