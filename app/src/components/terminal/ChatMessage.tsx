import { useState } from "react";
import { Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { MarkdownContent } from "../MarkdownContent";
import { ImageLightbox } from "../chat/ImageLightbox";

interface Props {
  role: "user" | "assistant";
  text?: string;
  images?: string[];
  variant?: "notification";
}

function SessionImageGallery({ images, hasText }: { images: string[]; hasText: boolean }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: hasText ? 1 : 0 }}>
        {images.map((src, i) => (
          <Box
            key={i}
            component="img"
            src={src}
            sx={{
              maxWidth: "100%",
              maxHeight: 300,
              borderRadius: 1,
              objectFit: "contain",
              cursor: "zoom-in",
            }}
            onClick={() => setLightbox(src)}
          />
        ))}
      </Box>
      {lightbox && (
        <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

export function ChatMessage({ role, text, images, variant }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isUser = role === "user";

  const userBg = isDark
    ? alpha(theme.palette.primary.main, 0.12)
    : alpha(theme.palette.primary.main, 0.08);

  const assistantBg = isDark
    ? alpha(theme.palette.background.paper, 0.6)
    : theme.palette.background.default;

  const bg = isUser ? userBg : assistantBg;

  return (
    <Box sx={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", mb: 1.5 }}>
      <Box
        sx={{
          maxWidth: isUser ? "75%" : "90%",
          bgcolor: bg,
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          px: 2,
          py: 1,
          border: 1,
          borderColor: isUser
            ? alpha(bg, 0.4)
            : `rgba(255,255,255,${isDark ? 0.06 : 0.15})`,
          boxShadow: `0 1px 2px rgba(0,0,0,${isDark ? 0.2 : 0.06})`,
        }}
      >
        {images && images.length > 0 && (
          <SessionImageGallery images={images} hasText={!!text} />
        )}
        {isUser ? (
          text ? (
            <Box sx={{ fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {text}
            </Box>
          ) : null
        ) : (
          text ? (
            variant === "notification" ? (
              <Box sx={{
                fontFamily: "monospace",
                fontSize: 13,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "text.secondary",
                fontStyle: "italic",
              }}>
                {text}
              </Box>
            ) : (
              <MarkdownContent content={text} />
            )
          ) : null
        )}
      </Box>
    </Box>
  );
}
