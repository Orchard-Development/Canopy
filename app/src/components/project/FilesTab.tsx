import { useEffect, useCallback, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useEditorTabs } from "@/hooks/useEditorTabs";
import { FileTree } from "@/components/filebrowser/FileTree";
import { EditorPanel } from "@/components/filebrowser/EditorPanel";

const MIN_SIDEBAR = 150;
const MAX_SIDEBAR = 600;
const DEFAULT_SIDEBAR = 220;

// 64px app bar + 49px tab bar
const HEIGHT = "calc(100vh - 113px)";

interface Props {
  rootPath: string | null;
}

export function FilesTab({ rootPath }: Props) {
  const editor = useEditorTabs(rootPath ?? undefined);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR);
  const dragging = useRef(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editor.tabs.some((t) => t.isDirty)) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editor.tabs]);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setSidebarWidth(Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, e.clientX)));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  if (!rootPath) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: HEIGHT }}>
        <Typography variant="body2" color="text.secondary">
          No project root path configured.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: HEIGHT, overflow: "hidden" }}>
      <Box sx={{ flex: `0 0 ${sidebarWidth}px`, minWidth: MIN_SIDEBAR, overflow: "hidden" }}>
        <FileTree rootPath={rootPath} onFileSelect={editor.openFile} activeFile={editor.activeTabPath ?? undefined} />
      </Box>
      <Box
        onMouseDown={onMouseDown}
        sx={{ flex: "0 0 4px", cursor: "col-resize", bgcolor: "divider", "&:hover": { bgcolor: "action.hover" } }}
      />
      <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <EditorPanel
          tabs={editor.tabs}
          activeTabPath={editor.activeTabPath}
          setActiveTab={editor.setActiveTab}
          closeTab={editor.closeTab}
          updateContent={editor.updateContent}
          saveFile={editor.saveFile}
          error={editor.error}
        />
      </Box>
    </Box>
  );
}
