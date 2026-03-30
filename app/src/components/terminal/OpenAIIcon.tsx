import { Box, type SxProps, type Theme } from "@mui/material";

interface Props { sx?: SxProps<Theme> }

export function OpenAIIcon({ sx }: Props) {
  return (
    <Box
      component="img"
      src="https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1/f_auto/v1/icons/logos/openai-wx0xqojo8lrv572wcvlcb.png/openai-twkvg10vdyltj9fklcgusg.png?_a=DATAiZAAZAA0"
      alt="OpenAI"
      sx={{
        width: 22, height: 22, objectFit: "contain", borderRadius: 0.5,
        display: "inline-block", verticalAlign: "middle",
        ...((sx ?? {}) as Record<string, unknown>),
      }}
    />
  );
}
