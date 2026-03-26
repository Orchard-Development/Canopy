import { Box } from "@mui/material";

interface Props {
  capName: string;
  chunk: string;
}

export default function CapabilityViewHost({ capName, chunk }: Props) {
  const src = `/_capabilities/${capName}/ui/dist/${chunk}`;

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      <iframe
        src={src}
        title={`${capName} view`}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </Box>
  );
}
