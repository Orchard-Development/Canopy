import { useCallback } from "react";
import { Box, Typography } from "@mui/material";
import Alert from "@mui/material/Alert";
import { useTheme } from "@mui/material/styles";
import Editor, { type OnMount } from "@monaco-editor/react";
import { EditorTab as EditorTabComponent } from "./EditorTab";
import { getLanguageForFile } from "../../lib/languageMap";
import type { EditorTab } from "../../hooks/useEditorTabs";

export interface EditorPanelProps {
  tabs: EditorTab[];
  activeTabPath: string | null;
  setActiveTab: (path: string) => void;
  closeTab: (path: string) => boolean;
  updateContent: (path: string, content: string) => void;
  saveFile: (path: string) => void;
  error: string | null;
}

export function EditorPanel({
  tabs,
  activeTabPath,
  setActiveTab,
  closeTab,
  updateContent,
  saveFile,
  error,
}: EditorPanelProps) {
  const theme = useTheme();
  const monacoTheme = theme.palette.mode === "dark" ? "vs-dark" : "vs-light";
  const activeTab = tabs.find((t) => t.path === activeTabPath) ?? null;

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editor.addCommand(
        // eslint-disable-next-line no-bitwise
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          if (activeTabPath) saveFile(activeTabPath);
        },
      );
    },
    [activeTabPath, saveFile],
  );

  if (tabs.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Select a file to open
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          overflowX: "auto",
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => (
          <EditorTabComponent
            key={tab.path}
            filename={tab.name}
            isActive={tab.path === activeTabPath}
            isDirty={tab.isDirty}
            onActivate={() => setActiveTab(tab.path)}
            onClose={() => closeTab(tab.path)}
          />
        ))}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {activeTab && (
          <Editor
            value={activeTab.content}
            language={getLanguageForFile(activeTab.name)}
            theme={monacoTheme}
            onChange={(value) =>
              updateContent(activeTab.path, value ?? "")
            }
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}
      </Box>
    </Box>
  );
}
