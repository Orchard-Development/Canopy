import { Box } from "@mui/material";

interface Props {
  url: string;
  title: string;
}

export default function IframeViewHost({ url, title }: Props) {
  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      <iframe
        src={url}
        title={title}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </Box>
  );
}
