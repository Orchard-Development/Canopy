import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Tooltip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  useTheme,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DifferenceIcon from "@mui/icons-material/Difference";
import Editor, { DiffEditor } from "@monaco-editor/react";

interface Props {
  path: string;
  initialPreview?: string;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  ex: "elixir",
  exs: "elixir",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  swift: "swift",
  c: "c",
  cpp: "cpp",
  h: "c",
  cs: "csharp",
  css: "css",
  scss: "scss",
  html: "html",
  xml: "xml",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  toml: "ini",
  cfg: "ini",
  dockerfile: "dockerfile",
  graphql: "graphql",
  lua: "lua",
  r: "r",
  php: "php",
};

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "plaintext";
}

export function LiveFilePreview({ path, initialPreview }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const monacoTheme = isDark ? "vs-dark" : "vs-light";

  const [content, setContent] = useState(initialPreview ?? "");
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filename = path.split("/").pop() ?? path;
  const ext = filename.split(".").pop() ?? "";
  const language = detectLanguage(filename);
  const lineCount = (editing ? draft : content).split("\n").length;

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(path)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.content != null) {
        setContent(data.content);
      }
    } catch {
      // silent
    }
  }, [path]);

  // Initial load
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Auto-refresh every 3s when not editing
  useEffect(() => {
    if (editing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchContent, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [editing, fetchContent]);

  const startEditing = () => {
    setOriginalContent(content);
    setDraft(content);
    setEditing(true);
    setShowDiff(false);
    setError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setShowDiff(false);
    setDraft("");
    setOriginalContent(null);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/fs/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, content: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Save failed (${res.status})`);
      } else {
        setContent(draft);
        setEditing(false);
        setShowDiff(false);
        setOriginalContent(null);
      }
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copyPath = () => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box
      sx={{
        mt: 1,
        border: "1px solid",
        borderColor: editing ? "primary.main" : "divider",
        borderRadius: 1,
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{
          px: 1.5,
          py: 0.5,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Tooltip title={copied ? "Copied!" : path}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: "monospace",
              fontWeight: 600,
              flex: 1,
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" },
            }}
            onClick={copyPath}
          >
            {filename}
          </Typography>
        </Tooltip>
        <Chip
          label={ext}
          size="small"
          sx={{ height: 18, fontSize: 10, fontFamily: "monospace" }}
        />
        <Typography variant="caption" color="text.secondary">
          {lineCount} lines
        </Typography>

        {editing ? (
          <>
            <ToggleButtonGroup
              size="small"
              value={showDiff ? "diff" : "edit"}
              exclusive
              onChange={(_, v) => { if (v) setShowDiff(v === "diff"); }}
              sx={{ height: 24 }}
            >
              <ToggleButton value="edit" sx={{ px: 1, py: 0, fontSize: 11 }}>
                Edit
              </ToggleButton>
              <ToggleButton value="diff" sx={{ px: 1, py: 0, fontSize: 11 }}>
                <DifferenceIcon sx={{ fontSize: 14, mr: 0.5 }} />
                Diff
              </ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="Save (Cmd+S)">
              <IconButton size="small" onClick={save} disabled={saving} color="primary">
                {saving ? <CircularProgress size={16} /> : <SaveIcon sx={{ fontSize: 16 }} />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel (Esc)">
              <IconButton size="small" onClick={cancelEditing}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Copy path">
              <IconButton size="small" onClick={copyPath}>
                <ContentCopyIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchContent}>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={startEditing}>
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>

      {/* Error */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ px: 1.5, py: 0.5, display: "block" }}
        >
          {error}
        </Typography>
      )}

      {/* Editor */}
      <Box sx={{ height: Math.min(Math.max(lineCount * 19 + 20, 100), 400) }}>
        {editing && showDiff ? (
          <DiffEditor
            original={originalContent ?? ""}
            modified={draft}
            language={language}
            theme={monacoTheme}
            options={{
              readOnly: false,
              renderSideBySide: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              folding: false,
              wordWrap: "on",
            }}
            onMount={(editor) => {
              const modifiedEditor = editor.getModifiedEditor();
              modifiedEditor.onDidChangeModelContent(() => {
                setDraft(modifiedEditor.getValue());
              });
            }}
          />
        ) : editing ? (
          <Editor
            value={draft}
            language={language}
            theme={monacoTheme}
            onChange={(value) => setDraft(value ?? "")}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              folding: true,
              wordWrap: "on",
              tabSize: 2,
            }}
            onMount={(editor, monacoInstance) => {
              editor.addCommand(
                // eslint-disable-next-line no-bitwise
                monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
                () => save()
              );
              editor.addCommand(monacoInstance.KeyCode.Escape, () => cancelEditing());
            }}
          />
        ) : (
          <Editor
            value={content}
            language={language}
            theme={monacoTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: "on",
              folding: true,
              wordWrap: "on",
              renderLineHighlight: "none",
              contextmenu: false,
            }}
          />
        )}
      </Box>
    </Box>
  );
}

