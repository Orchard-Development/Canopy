import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { Box, IconButton, Typography, Stack } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LanguageIcon from "@mui/icons-material/Language";
import { api } from "../lib/api";
import {
  NewSessionDialog,
  type NewTab,
  type NewWebTab,
  type NewRdpTab,
} from "../components/NewSessionDialog";
import { SessionTabBar } from "../components/terminal/SessionTabBar";

const RdpCanvas = lazy(() =>
  import("../components/RdpCanvas").then((m) => ({ default: m.RdpCanvas })),
);
const BrowserFrame = lazy(() =>
  import("../components/BrowserFrame").then((m) => ({ default: m.BrowserFrame })),
);

export type SessionTab = NewWebTab | NewRdpTab;

export default function Sessions() {
  const [tabs, setTabs] = useState<SessionTab[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    api.listRdpSessions().then((sessions) => {
      const alive = sessions.filter((s) => s.bridgeAlive);
      if (alive.length === 0) return;
      setTabs(alive.map((s): NewRdpTab => ({
        type: "rdp", id: s.id, hostname: s.hostname, username: s.username,
      })));
    }).catch(() => {});
  }, []);

  const handleConnect = useCallback((tab: NewTab) => {
    setDialogOpen(false);
    setTabs((prev) => {
      setActiveTab(prev.length);
      return [...prev, tab];
    });
  }, []);

  const handleClose = useCallback((index: number) => {
    const tab = tabs[index];
    if (tab?.type === "rdp") api.deleteRdpSession(tab.id).catch(() => {});
    setTabs((prev) => prev.filter((_, i) => i !== index));
    setActiveTab((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
  }, [tabs]);

  const handleWebUrlChange = useCallback((id: string, url: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id && t.type === "web" ? { ...t, url } : t)),
    );
  }, []);

  const handleWebTitleChange = useCallback((id: string, title: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id && t.type === "web" ? { ...t, title } : t)),
    );
  }, []);

  if (tabs.length === 0 && !dialogOpen) {
    return <EmptyState onNew={() => setDialogOpen(true)} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 88px)" }}>
      <SessionTabBar
        tabs={tabs}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onCloseTab={handleClose}
        onNew={() => setDialogOpen(true)}
      />
      <Box sx={{ flex: 1, position: "relative", bgcolor: "black" }}>
        <Suspense fallback={null}>
          {tabs.map((tab, i) => (
            <Box
              key={tab.id}
              sx={{ position: "absolute", inset: 0, display: i === activeTab ? "flex" : "none" }}
            >
              {tab.type === "web" ? (
                <BrowserFrame
                  url={tab.url}
                  onUrlChange={(u) => handleWebUrlChange(tab.id, u)}
                  onTitleChange={(t) => handleWebTitleChange(tab.id, t)}
                />
              ) : (
                <RdpCanvas
                  sessionId={tab.id}
                  onDisconnect={() => handleClose(tabs.findIndex((t) => t.id === tab.id))}
                />
              )}
            </Box>
          ))}
        </Suspense>
      </Box>
      <NewSessionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onConnect={handleConnect} />
    </Box>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Box sx={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "calc(100vh - 120px)", gap: 3,
    }}>
      <LanguageIcon sx={{ fontSize: 64, color: "text.secondary" }} />
      <Typography variant="h5" fontWeight={600}>Sessions</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 480, textAlign: "center" }}>
        Browse the web or connect to remote desktops without leaving the app.
        Sessions persist across page navigations.
      </Typography>
      <Stack direction="row" spacing={2}>
        <IconButton onClick={onNew} color="primary" sx={{ border: 1, borderColor: "divider", borderRadius: 2, px: 3, py: 1 }}>
          <AddIcon sx={{ mr: 1 }} />
          <Typography variant="button">New Session</Typography>
        </IconButton>
      </Stack>
    </Box>
  );
}
