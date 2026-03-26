import { Box } from "@mui/material";
import { alpha, useTheme, keyframes } from "@mui/material/styles";

const pulse = keyframes`
  0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
  30% { opacity: 1; transform: scale(1); }
`;

interface Props {
  visible: boolean;
}

export function TypingIndicator({ visible }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (!visible) return null;

  const dotColor = isDark
    ? alpha(theme.palette.text.secondary, 0.5)
    : alpha(theme.palette.text.secondary, 0.4);

  return (
    <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.6,
          bgcolor: isDark
            ? alpha(theme.palette.background.paper, 0.6)
            : theme.palette.background.default,
          borderRadius: "16px 16px 16px 4px",
          px: 2,
          py: 1.2,
          border: 1,
          borderColor: `rgba(255,255,255,${isDark ? 0.06 : 0.15})`,
          boxShadow: `0 1px 2px rgba(0,0,0,${isDark ? 0.2 : 0.06})`,
          minWidth: 56,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              bgcolor: dotColor,
              animation: `${pulse} 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
