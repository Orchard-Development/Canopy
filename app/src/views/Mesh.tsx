import { useState, useEffect } from "react";
import { Box, Typography, Stack } from "@mui/material";
import HubIcon from "@mui/icons-material/Hub";
import { TunnelCard } from "../components/settings/TunnelCard";
import { MeshCard } from "../components/settings/MeshCard";
import { MeshConnectCard } from "../components/settings/MeshConnectCard";
import { MeshNodesCard } from "../components/settings/MeshNodesCard";
import { MeshApprovalCard } from "../components/settings/MeshApprovalCard";
import { PageLayout } from "../components/PageLayout";
import { api, type TunnelStatus, type MeshNode } from "../lib/api";
import { useRefetchOnDashboardEvent } from "../hooks/useRefetchOnDashboardEvent";
import { EVENTS } from "../lib/events";
import { useSettingsContext } from "../contexts/SettingsContext";

export default function MeshView() {
  const { settings, setSetting } = useSettingsContext();
  const s = {
    settings,
    update: (key: string, value: string) => {
      setSetting(key, value);
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      }).catch(() => {});
    },
  };
  const [nodeName, setNodeName] = useState("");
  const [cookie, setCookie] = useState("");
  const [peers, setPeers] = useState<MeshNode[]>([]);
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus | null>(null);
  const [cfTunnelRunning, setCfTunnelRunning] = useState(false);
  const [pending, setPending] = useState<string[]>([]);

  // Live-update when peers connect/disconnect
  const { generation: g1 } = useRefetchOnDashboardEvent(EVENTS.mesh.nodeUp);
  const { generation: g2 } = useRefetchOnDashboardEvent(EVENTS.mesh.nodeDown);
  const { generation: g3 } = useRefetchOnDashboardEvent(EVENTS.mesh.remotePeerAdded);
  const { generation: g4 } = useRefetchOnDashboardEvent(EVENTS.mesh.remotePeerRemoved);
  const { generation: g5 } = useRefetchOnDashboardEvent(EVENTS.mesh.pendingApproval);

  const refreshPending = () => {
    api.meshPending().then((r) => setPending(r.nodes)).catch(() => {});
  };

  const refreshTunnel = () => {
    fetch("/api/tunnel/status").then(r => r.json()).then((t) => {
      setCfTunnelRunning(t.status === "running");
    }).catch(() => {});
  };

  useEffect(() => {
    api.meshStatus().then((st) => {
      setNodeName(st.node_name);
      setPeers(st.connected_nodes.map((n) => ({
        name: n.name,
        sessions: n.session_count ?? 0,
        type: (n.type ?? "beam") as MeshNode["type"],
        role: ((n.role ?? "operator") as string as MeshNode["role"]),
      })));
    }).catch(() => {});
    api.meshCookie().then((c) => setCookie(c.cookie)).catch(() => {});
    api.meshTunnel().then(setTunnelStatus).catch(() => {});
    refreshPending();
    refreshTunnel();
  }, [g1, g2, g3, g4, g5]);

  useEffect(() => {
    const interval = setInterval(() => {
      api.meshPending().then((r) => setPending(r.nodes)).catch(() => {});
      refreshTunnel();
      refreshStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const refreshStatus = () => {
    api.meshStatus().then((st) => {
      setNodeName(st.node_name);
      setPeers(st.connected_nodes.map((n) => ({
        name: n.name,
        sessions: n.session_count ?? 0,
        type: (n.type ?? "beam") as MeshNode["type"],
        role: ((n.role ?? "operator") as string as MeshNode["role"]),
      })));
    }).catch(() => {});
    refreshPending();
  };

  const handleDisconnect = (node: string) => {
    setPeers((prev) => prev.filter((p) => p.name !== node));
  };

  return (
    <PageLayout>
      <Box sx={{ maxWidth: 720, mx: "auto", py: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
          <HubIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>Mesh</Typography>
        </Stack>

        <TunnelCard
          tunnelName={s.settings.tunnel_name ?? ""}
          hostAuth={s.settings.tunnel_host_auth ?? "true"}
          tunnelEnabled={s.settings.tunnel_enabled ?? "false"}
          allowAnyUser={s.settings.tunnel_allow_any_user ?? "false"}
          onUpdate={s.update}
        />
        <MeshCard nodeName={nodeName} cookie={cookie} onCookieChange={setCookie} />
        <MeshApprovalCard pending={pending} onAction={refreshStatus} />
        <MeshConnectCard
          nodeName={nodeName}
          cookie={cookie}
          wgPublicKey={tunnelStatus?.public_key}
          wgListenPort={tunnelStatus?.listen_port}
          tunnelRunning={cfTunnelRunning}
          onConnected={refreshStatus}
        />
        <MeshNodesCard peers={peers} onDisconnect={handleDisconnect} />
      </Box>
    </PageLayout>
  );
}
