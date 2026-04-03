import { useEffect, useCallback, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useActiveProject } from "@/hooks/useActiveProject";
import { useEditorTabs } from "@/hooks/useEditorTabs";
import { FileTree } from "@/components/filebrowser/FileTree";
import { EditorPanel } from "@/components/filebrowser/EditorPanel";

const MIN_SIDEBAR = 150;
const MAX_SIDEBAR = 600;
const DEFAULT_SIDEBAR = 250;

export default function FileBrowser() {
  const { project } = useActiveProject();
  const rootPath = project?.root_path ?? null;
  const editor = useEditorTabs(rootPath ?? undefined);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR);
  const dragging = useRef(false);

  // Warn on unsaved changes before page unload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editor.tabs.some((t) => t.isDirty)) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editor.tabs]);

  // Drag handle for resizing sidebar
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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)" }}>
        <Typography variant="body2" color="text.secondary">
          Select a project to browse files.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
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
