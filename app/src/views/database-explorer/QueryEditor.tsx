import { useState, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Collapse,
} from "@mui/material";
import PlayArrow from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";

export interface QueryEditorHandle {
  insertText: (text: string) => void;
}

interface QueryEditorProps {
  onExecute: (sql: string) => void;
  loading: boolean;
}

const MAX_HISTORY = 20;

const QueryEditor = forwardRef<QueryEditorHandle, QueryEditorProps>(
  function QueryEditor({ onExecute, loading }, ref) {
    const [sql, setSql] = useState("SELECT * FROM projects LIMIT 10");
    const [history, setHistory] = useState<string[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        const ta = textareaRef.current;
        if (!ta) {
          setSql((prev) => prev + text);
          return;
        }
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = sql.slice(0, start) + text + sql.slice(end);
        setSql(next);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + text.length;
          ta.focus();
        });
      },
    }));

    const execute = useCallback(() => {
      const trimmed = sql.trim();
      if (!trimmed || loading) return;
      setHistory((prev) => {
        const filtered = prev.filter((q) => q !== trimmed);
        return [trimmed, ...filtered].slice(0, MAX_HISTORY);
      });
      onExecute(trimmed);
    }, [sql, loading, onExecute]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        execute();
      }
    };

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box
          component="textarea"
          ref={textareaRef}
          value={sql}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter SQL query..."
          spellCheck={false}
          sx={{
            width: "100%",
            minHeight: 120,
            p: 1.5,
            fontFamily: "monospace",
            fontSize: "0.875rem",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
            color: "text.primary",
            resize: "vertical",
            outline: "none",
            "&:focus": { borderColor: "primary.main" },
          }}
        />
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
            onClick={execute}
            disabled={loading || !sql.trim()}
          >
            {loading ? "Running..." : "Execute"}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter
          </Typography>
          {history.length > 0 && (
            <Button
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => setShowHistory((v) => !v)}
              sx={{ ml: "auto" }}
            >
              History ({history.length})
            </Button>
          )}
        </Box>
        <Collapse in={showHistory}>
          <List dense sx={{ maxHeight: 160, overflow: "auto", bgcolor: "action.hover", borderRadius: 1 }}>
            {history.map((q, i) => (
              <ListItemButton key={i} onClick={() => { setSql(q); setShowHistory(false); }}>
                <ListItemText
                  primary={q}
                  primaryTypographyProps={{
                    variant: "caption",
                    fontFamily: "monospace",
                    noWrap: true,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Collapse>
      </Box>
    );
  },
);

export default QueryEditor;
