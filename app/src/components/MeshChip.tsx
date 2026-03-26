import { useState, useRef, useEffect } from "react";
import {
  Chip,
  Popover,
  Box,
  Typography,
  Divider,
  Button,
} from "@mui/material";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { useNavigate } from "react-router-dom";
import { api, type MeshStatus, type MeshNode } from "../lib/api";

function NodeRow({ peer }: { peer: MeshNode }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        py: 0.75,
        px: 2,
      }}
    >
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {peer.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {peer.sessions} session{peer.sessions === 1 ? "" : "s"}
      </Typography>
    </Box>
  );
}

export function MeshChip() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MeshStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.meshStatus()
        .then((s) => {
          if (!cancelled) setStatus(s);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const peerCount = status?.peers?.length ?? 0;
  const hasPeers = peerCount > 0;

  const chipColor: "success" | "default" = hasPeers ? "success" : "default";
  const chipLabel = hasPeers ? `${peerCount} node${peerCount === 1 ? "" : "s"}` : "Solo";

  return (
    <>
      <Chip
        ref={anchorRef}
        size="small"
        variant="outlined"
        color={chipColor}
        onClick={() => setOpen((prev) => !prev)}
        icon={
          <FiberManualRecordIcon
            sx={{
              fontSize: "10px !important",
              color: hasPeers ? "success.main" : "text.disabled",
            }}
          />
        }
        label={chipLabel}
        sx={{ height: 22, fontSize: 11, cursor: "pointer" }}
      />

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 260, mt: 0.5 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle2" fontWeight={600}>Mesh</Typography>
          {status?.node && (
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">
              {status.node}
            </Typography>
          )}
        </Box>
        <Divider />

        {peerCount === 0 ? (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              No connected nodes.
            </Typography>
          </Box>
        ) : (
          status?.peers.map((peer) => (
            <NodeRow key={peer.name} peer={peer} />
          ))
        )}

        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Button
            size="small"
            fullWidth
            onClick={() => {
              setOpen(false);
              navigate("/settings?tab=mesh");
            }}
            sx={{ textTransform: "none", fontSize: 12 }}
          >
            Mesh Settings
          </Button>
        </Box>
      </Popover>
    </>
  );
}
