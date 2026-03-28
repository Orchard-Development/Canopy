import { useState } from "react";
import { Box, Typography, Link } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  url: string;
  mimeType: string;
  title?: string;
  filename: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function ImageEmbed({ url, filename }: { url: string; filename: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Box
        component="img"
        src={url}
        alt={filename}
        sx={{
          maxWidth: "100%",
          maxHeight: 400,
          borderRadius: 1,
          cursor: "zoom-in",
          "&:hover": { opacity: 0.9 },
        }}
        onClick={() => setOpen(true)}
      />
      {open && <ImageLightbox src={url} alt={filename} onClose={() => setOpen(false)} />}
    </>
  );
}

function IframeEmbed({ url, height = 400 }: { url: string; height?: number }) {
  return (
    <Box
      component="iframe"
      src={url}
      sx={{
        width: "100%",
        height,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
      }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}

function DownloadFallback({ url, filename, size }: { url: string; filename: string; size: number }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <InsertDriveFileIcon sx={{ fontSize: 20, color: "text.secondary" }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap>{filename}</Typography>
        <Typography variant="caption" color="text.secondary">{formatSize(size)}</Typography>
      </Box>
      <Link href={url} download={filename} sx={{ display: "flex" }}>
        <DownloadIcon sx={{ fontSize: 20 }} />
      </Link>
    </Box>
  );
}

export function FileEmbed({ url, mimeType, title, filename, size }: Props) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <Box sx={{ mt: 1 }}>
        {title && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>{title}</Typography>}
        <DownloadFallback url={url} filename={filename} size={size} />
      </Box>
    );
  }

  let embed: React.ReactNode;

  if (mimeType.startsWith("image/")) {
    embed = <ImageEmbed url={url} filename={filename} />;
  } else if (mimeType === "application/pdf") {
    embed = <IframeEmbed url={url} height={500} />;
  } else if (mimeType === "text/html") {
    embed = <IframeEmbed url={url} height={400} />;
  } else if (mimeType === "text/csv" || mimeType === "text/tab-separated-values") {
    embed = <IframeEmbed url={`${url}?fmt=html`} height={400} />;
  } else if (mimeType === "application/json") {
    embed = <IframeEmbed url={`${url}?fmt=html`} height={300} />;
  } else if (mimeType === "text/markdown") {
    // Markdown could be rendered via MarkdownContent, but for simplicity
    // we display it as a code block in an iframe with the raw content
    embed = <IframeEmbed url={url} height={300} />;
  } else {
    embed = <DownloadFallback url={url} filename={filename} size={size} />;
  }

  return (
    <Box
      sx={{ mt: 1 }}
      onError={() => setErrored(true)}
    >
      {title && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
          {title}
        </Typography>
      )}
      {embed}
    </Box>
  );
}
