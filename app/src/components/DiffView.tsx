import { Box } from "@mui/material";

function DiffLine({ line }: { line: string }) {
  let bgcolor = "transparent";
  let color = "text.primary";
  if (line.startsWith("+") && !line.startsWith("+++")) {
    bgcolor = "success.main";
    color = "success.contrastText";
  } else if (line.startsWith("-") && !line.startsWith("---")) {
    bgcolor = "error.main";
    color = "error.contrastText";
  } else if (line.startsWith("@@")) {
    bgcolor = "info.main";
    color = "info.contrastText";
  }
  return (
    <Box
      component="span"
      sx={{
        display: "block",
        px: 1,
        bgcolor,
        color,
        opacity: bgcolor === "transparent" ? 1 : 0.85,
        fontFamily: "monospace",
        fontSize: "0.75rem",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {line}
    </Box>
  );
}

export function DiffView({ diff }: { diff: string }) {
  if (!diff) return null;

  const lines = diff.split("\n");
  const looksLikeDiff = lines.some(
    (l) => l.startsWith("@@") || l.startsWith("---") || l.startsWith("+++"),
  );

  if (looksLikeDiff) {
    return (
      <Box sx={{ mt: 1.5, borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider" }}>
        {lines.map((line, i) => (
          <DiffLine key={i} line={line} />
        ))}
      </Box>
    );
  }

  // Fallback: pretty-print JSON or show raw text
  let formatted = diff;
  try {
    const parsed = JSON.parse(diff);
    formatted = JSON.stringify(parsed, null, 2);
  } catch { /* keep raw */ }

  return (
    <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.75rem" }}>
        {formatted}
      </pre>
    </Box>
  );
}
