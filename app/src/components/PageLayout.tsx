import type { ReactNode } from "react";
import { Box, Typography, Stack, useMediaQuery, useTheme } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface PageLayoutProps {
  children: ReactNode;
  /** Constrain content width. false = full width (default). */
  maxWidth?: number | false;
  title?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  /** When true, the layout stretches to fill remaining viewport height. */
  fill?: boolean;
  sx?: SxProps<Theme>;
}

export function PageLayout({
  children,
  maxWidth = false,
  title,
  icon,
  badge,
  actions,
  fill = false,
  sx,
}: PageLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        pt: 2,
        ...(maxWidth && { maxWidth, mx: "auto", width: "100%" }),
        ...(fill && {
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }),
        ...sx,
      }}
    >
      {title && (
        <Stack
          direction={isMobile ? "column" : "row"}
          alignItems={isMobile ? "flex-start" : "center"}
          spacing={1}
          sx={{ mb: 2, flexShrink: 0 }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            {icon}
            <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700} noWrap>
              {title}
            </Typography>
            {badge}
          </Stack>
          {!isMobile && <Box sx={{ flex: 1 }} />}
          {actions}
        </Stack>
      )}
      {fill ? (
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          {children}
        </Box>
      ) : (
        children
      )}
    </Box>
  );
}
