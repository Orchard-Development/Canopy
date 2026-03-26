import { Box, Typography } from "@mui/material";
import { useEffect, useId, useState } from "react";

export function MermaidDiagram({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "neutral",
        });
        const { svg: nextSvg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!active) return;
        setSvg(nextSvg);
        setError(null);
      } catch (err) {
        if (!active) return;
        setSvg("");
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    }

    render();
    return () => {
      active = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <Box sx={{ my: 1.5 }}>
        <Typography variant="caption" color="error.main" sx={{ display: "block", mb: 1 }}>
          Mermaid render failed: {error}
        </Typography>
        <Box
          component="pre"
          sx={{
            bgcolor: "action.hover",
            borderRadius: 1,
            p: 1.5,
            m: 0,
            overflow: "auto",
            fontSize: "0.8rem",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <code>{chart}</code>
        </Box>
      </Box>
    );
  }

  if (!svg) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ my: 1.5 }}>
        Rendering diagram...
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        my: 1.5,
        overflowX: "auto",
        "& svg": {
          display: "block",
          maxWidth: "100%",
          height: "auto",
          mx: "auto",
        },
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
