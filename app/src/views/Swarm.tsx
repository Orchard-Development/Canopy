import { useState, useEffect, useCallback } from "react";
import { fetchSettings } from "../lib/settingsCache";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import { useDashboardChannel } from "../hooks/useDashboardChannel";
import { useChannelEventBuffer } from "../hooks/useChannelEvent";
import { EVENTS } from "../lib/events";

interface Mission {
  id: string;
  objective: string;
  status: string;
  drones_spawned: number;
  drones_died: number;
  nectar_count: number;
  budget_spent_usd: number;
  max_budget_usd: number;
  max_drones: number;
  max_generations: number;
  generation_stats: Record<string, { spawned?: number; success?: number; survived?: number; died?: number }>;
  started_at: string | null;
  completed_at: string | null;
}

interface SwarmEvent {
  data: Record<string, unknown>;
  _event: string;
  _ts: number;
}

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  running: "info",
  completed: "success",
  budget_exhausted: "warning",
  timed_out: "error",
  cancelled: "default",
  collapsed: "error",
  pending: "default",
};

export default function Swarm() {
  const { channel } = useDashboardChannel();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objective, setObjective] = useState("");
  const [launching, setLaunching] = useState(false);
  const [swarmEnabled, setSwarmEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        const val = data["swarm.enabled"];
        setSwarmEnabled(val === "true");
      })
      .catch(() => setSwarmEnabled(false));
  }, []);

  const toggleSwarm = (checked: boolean) => {
    setSwarmEnabled(checked);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "swarm.enabled": String(checked) }),
    }).catch(() => setSwarmEnabled(!checked));
  };

  // Buffer real-time swarm events for the activity feed
  const spawned = useChannelEventBuffer<SwarmEvent>(channel, EVENTS.swarm.droneSpawned, 100);
  const dances = useChannelEventBuffer<SwarmEvent>(channel, EVENTS.swarm.waggleDance, 100);
  const died = useChannelEventBuffer<SwarmEvent>(channel, EVENTS.swarm.droneDied, 100);
  const completed = useChannelEventBuffer<SwarmEvent>(channel, EVENTS.swarm.missionCompleted, 20);
  const started = useChannelEventBuffer<SwarmEvent>(channel, EVENTS.swarm.missionStarted, 20);

  const fetchMissions = useCallback(() => {
    fetch("/api/swarm/missions")
      .then((r) => r.json())
      .then((data) => {
        setMissions(data.missions ?? []);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMissions();
    const interval = setInterval(fetchMissions, 5000);
    return () => clearInterval(interval);
  }, [fetchMissions]);

  // Re-fetch when we get real-time events
  useEffect(() => {
    if (completed.length > 0 || started.length > 0) fetchMissions();
  }, [completed.length, started.length, fetchMissions]);

  const launchMission = () => {
    if (!objective.trim()) return;
    setLaunching(true);
    fetch("/api/swarm/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objective: objective.trim() }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setObjective("");
          fetchMissions();
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLaunching(false));
  };

  const stopMission = (id: string) => {
    fetch(`/api/swarm/missions/${id}`, { method: "DELETE" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else fetchMissions();
      })
      .catch((e) => setError(e.message));
  };

  const allEvents = [
    ...spawned.map((e) => ({ ...e, _event: "spawned", _ts: Date.now() })),
    ...dances.map((e) => ({ ...e, _event: "waggle_dance", _ts: Date.now() })),
    ...died.map((e) => ({ ...e, _event: "died", _ts: Date.now() })),
  ].slice(-50);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, maxWidth: 1200 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
        <Box>
          <Typography variant="h5" sx={{ mb: 0.5 }}>Drone Swarm</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Evolutionary data foragers. Launch a mission and drones will search, score,
            reproduce, and evolve toward the best data-gathering strategy.
          </Typography>
        </Box>
        {swarmEnabled !== null && (
          <FormControlLabel
            control={
              <Switch checked={swarmEnabled} onChange={(_, checked) => toggleSwarm(checked)} />
            }
            label={swarmEnabled ? "Enabled" : "Disabled"}
            labelPlacement="start"
            sx={{ ml: 2, mt: 0.5 }}
          />
        )}
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {swarmEnabled === false && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Swarm is disabled. Toggle the switch above to enable drone missions.
        </Alert>
      )}

      {/* Launch card */}
      <Card variant="outlined" sx={{ mb: 2, opacity: swarmEnabled ? 1 : 0.5, pointerEvents: swarmEnabled ? "auto" : "none" }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Launch Mission</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. Find Series A investors in climate tech"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && launchMission()}
              disabled={launching || !swarmEnabled}
            />
            <Button
              variant="contained"
              size="small"
              onClick={launchMission}
              disabled={launching || !objective.trim() || !swarmEnabled}
              sx={{ whiteSpace: "nowrap" }}
            >
              {launching ? "Launching..." : "Launch"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Active missions */}
      {missions.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No missions yet. Launch one above to get started.
        </Alert>
      )}

      {missions.map((m) => (
        <MissionCard key={m.id} mission={m} onStop={() => stopMission(m.id)} />
      ))}

      {/* Live activity feed */}
      {allEvents.length > 0 && (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Live Activity</Typography>
            <Box sx={{ maxHeight: 300, overflow: "auto", fontFamily: "monospace", fontSize: 12 }}>
              {allEvents.map((evt, i) => (
                <EventLine key={i} event={evt} />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function MissionCard({ mission: m, onStop }: { mission: Mission; onStop: () => void }) {
  const progress = m.max_drones > 0 ? (m.drones_spawned / m.max_drones) * 100 : 0;
  const budgetProgress = m.max_budget_usd > 0 ? (m.budget_spent_usd / m.max_budget_usd) * 100 : 0;
  const isRunning = m.status === "running";
  const genCount = Object.keys(m.generation_stats).length;

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: "12px !important" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{m.objective}</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {isRunning && (
              <Button size="small" color="error" variant="outlined" onClick={onStop} sx={{ minWidth: 0, px: 1 }}>
                Stop
              </Button>
            )}
            <Chip
              label={m.status.replace("_", " ")}
              size="small"
              color={STATUS_COLOR[m.status] ?? "default"}
              variant={isRunning ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
          {m.id}
        </Typography>

        {isRunning && <LinearProgress variant="determinate" value={Math.min(progress, 100)} sx={{ mb: 1 }} />}

        <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 0.5 }}>
          <StatChip label="Drones" value={`${m.drones_spawned} / ${m.max_drones}`} />
          <StatChip label="Died" value={m.drones_died} />
          <StatChip label="Nectar" value={m.nectar_count} />
          <StatChip label="Generations" value={genCount} />
          <StatChip label="Budget" value={`$${(m.budget_spent_usd ?? 0).toFixed(3)} / $${(m.max_budget_usd ?? 0).toFixed(2)}`} />
        </Stack>

        {genCount > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
              Generation Breakdown
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {Object.entries(m.generation_stats).map(([gen, stats]) => (
                <Chip
                  key={gen}
                  size="small"
                  variant="outlined"
                  label={`Gen ${gen}: ${stats.success ?? 0} ok / ${stats.died ?? 0} dead`}
                />
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <Typography variant="caption" color="text.secondary">
      <strong>{label}:</strong> {value}
    </Typography>
  );
}

function EventLine({ event }: { event: SwarmEvent }) {
  const d = event.data ?? {};
  const droneId = (d.drone_id as string) ?? "";
  const short = droneId.slice(0, 12);

  switch (event._event) {
    case "spawned":
      return <Box sx={{ color: "info.main" }}>+ drone {short} spawned (gen {String(d.generation ?? "?")})</Box>;
    case "waggle_dance":
      return (
        <Box sx={{ color: "success.main" }}>
          ~ drone {short} returned with nectar (score: {String(d.nectar_score ?? "?")}) -- {String(d.nectar_summary ?? "")}
        </Box>
      );
    case "died":
      return <Box sx={{ color: "error.main" }}>x drone {short} died (gen {String(d.generation ?? "?")})</Box>;
    default:
      return <Box>{JSON.stringify(d)}</Box>;
  }
}
