import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import SyncIcon from "@mui/icons-material/Sync";
import StarIcon from "@mui/icons-material/Star";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VerifiedIcon from "@mui/icons-material/Verified";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

// -- Types --

interface InstalledServer {
  id: string;
  name: string;
  namespace: string;
  version: string;
  command: string;
  args: string;
  env: string;
  enabled: number;
  targets: string;
  config_schema: string;
  repo_url: string | null;
  stars: number;
  avatar_url: string | null;
}

interface RegistryServer {
  name: string;
  fullName: string;
  description?: string;
  stars: number;
  avatarUrl?: string;
  ownerLogin?: string;
  repoUrl?: string;
  topics?: string[];
  source?: "github" | "official";
}

interface ConfigField {
  key: string;
  label: string;
  required?: boolean;
  secret?: boolean;
  placeholder?: string;
  description?: string;
}

// -- Install Dialog --

function InstallDialog({
  open,
  server,
  configSchema,
  onClose,
  onInstall,
}: {
  open: boolean;
  server: RegistryServer | null;
  configSchema?: ConfigField[];
  onClose: () => void;
  onInstall: (data: {
    id: string;
    name: string;
    namespace: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  }) => void;
}) {
  const [command, setCommand] = useState("npx");
  const [args, setArgs] = useState("");
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [freeformEnv, setFreeformEnv] = useState("");
  const hasSchema = configSchema && configSchema.length > 0;

  useEffect(() => {
    if (server) {
      setCommand("npx");
      setArgs(`-y ${server.fullName ?? server.name}`);
      setEnvValues({});
      setFreeformEnv("");
    }
  }, [server]);

  function handleSubmit() {
    if (!server) return;
    let env: Record<string, string>;
    if (hasSchema) {
      env = { ...envValues };
    } else {
      env = {};
      for (const line of freeformEnv.split("\n").filter((l) => l.includes("="))) {
        const idx = line.indexOf("=");
        env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    onInstall({
      id: server.fullName ?? server.name,
      name: server.name,
      namespace: server.ownerLogin ?? "unknown",
      command,
      args: args.split(/\s+/).filter(Boolean),
      env,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {server?.avatarUrl && <Avatar src={server.avatarUrl} sx={{ width: 28, height: 28 }} />}
        Install {server?.name}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Arguments"
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            size="small"
            fullWidth
            helperText="Space-separated"
          />
          {hasSchema ? (
            configSchema.map((field) => (
              <TextField
                key={field.key}
                label={field.label}
                required={field.required}
                type={field.secret ? "password" : "text"}
                placeholder={field.placeholder}
                helperText={field.description}
                value={envValues[field.key] ?? ""}
                onChange={(e) =>
                  setEnvValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                size="small"
                fullWidth
              />
            ))
          ) : (
            <TextField
              label="Environment Variables"
              value={freeformEnv}
              onChange={(e) => setFreeformEnv(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={4}
              helperText="One per line: KEY=VALUE"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Install
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// -- Stars display --

function Stars({ count }: { count: number }) {
  if (!count) return null;
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mr: 1 }}>
      <StarIcon sx={{ fontSize: 14, color: "warning.main" }} />
      <Typography variant="caption" fontWeight={600}>
        {display}
      </Typography>
    </Stack>
  );
}

// -- Registry Tab --

function RegistryTab({
  installed,
  onInstalled,
}: {
  installed: Set<string>;
  onInstalled: () => void;
}) {
  const [servers, setServers] = useState<RegistryServer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | undefined>();
  const [installTarget, setInstallTarget] = useState<RegistryServer | null>(null);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      const isFirst = pageNum === 1;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(pageNum));

      try {
        const res = await fetch(`/api/mcp/registry?${params}`);
        const data = await res.json();
        const results: RegistryServer[] = data.servers ?? [];
        if (isFirst) {
          setServers(results);
        } else {
          setServers((prev) => [...prev, ...results]);
        }
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
        if (data.total !== undefined) setTotal(data.total);
        if (data.error) setError(data.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search],
  );

  useEffect(() => {
    setServers([]);
    setPage(1);
    setHasMore(false);
    const t = setTimeout(() => fetchPage(1), 300);
    return () => clearTimeout(t);
  }, [fetchPage]);

  async function handleInstall(data: {
    id: string;
    name: string;
    namespace: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  }) {
    await fetch("/api/mcp/installed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setInstallTarget(null);
    onInstalled();
  }

  return (
    <Box>
      <TextField
        placeholder="Search MCP servers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}
      {!loading && (
        <>
          {total !== undefined && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              {total.toLocaleString()} server{total !== 1 ? "s" : ""} found
            </Typography>
          )}
          <Stack spacing={1}>
            {servers.map((s) => (
              <Card key={s.fullName} variant="outlined">
                <CardContent sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1, "&:last-child": { pb: 1 }, flexWrap: "wrap" }}>
                  {s.avatarUrl && (
                    <Avatar src={s.avatarUrl} sx={{ width: 32, height: 32, flexShrink: 0 }} />
                  )}
                  <Box sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden" }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
                      <Typography variant="subtitle2" noWrap>
                        {s.fullName}
                      </Typography>
                      {s.source === "official" && (
                        <Tooltip title="Official MCP Registry">
                          <VerifiedIcon sx={{ fontSize: 14, color: "primary.main", flexShrink: 0 }} />
                        </Tooltip>
                      )}
                      {s.repoUrl && (
                        <Tooltip title="Open on GitHub">
                          <IconButton
                            size="small"
                            href={s.repoUrl}
                            target="_blank"
                            rel="noopener"
                            sx={{ p: 0.25, flexShrink: 0 }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Stars count={s.stars} />
                      {installed.has(s.fullName) || installed.has(s.name) ? (
                        <Tooltip title="Installed">
                          <CheckCircleIcon color="success" sx={{ fontSize: 22 }} />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Install">
                          <IconButton
                            size="small"
                            onClick={() => setInstallTarget(s)}
                            color="primary"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                      {s.description ?? ""}
                    </Typography>
                    {s.topics && s.topics.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap" }} useFlexGap>
                        {s.topics.slice(0, 5).map((t) => (
                          <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                        ))}
                      </Stack>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
          {hasMore && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <Button
                onClick={() => fetchPage(page + 1)}
                disabled={loadingMore}
                startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </Box>
          )}
          {!loading && servers.length === 0 && !error && (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No servers found.
            </Typography>
          )}
        </>
      )}
      <InstallDialog
        open={!!installTarget}
        server={installTarget}
        onClose={() => setInstallTarget(null)}
        onInstall={handleInstall}
      />
    </Box>
  );
}

// -- Installed Tab --

function InstalledTab({
  servers,
  onChanged,
}: {
  servers: InstalledServer[];
  onChanged: () => void;
}) {
  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/mcp/installed/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    onChanged();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/mcp/installed/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    onChanged();
  }

  return (
    <Stack spacing={1}>
      {servers.length === 0 && (
        <Typography color="text.secondary">No servers installed.</Typography>
      )}
      {servers.map((s) => {
        const env = JSON.parse(s.env) as Record<string, string>;
        const envKeys = Object.keys(env);
        return (
          <Card key={s.id} variant="outlined">
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                py: 1,
                "&:last-child": { pb: 1 },
              }}
            >
              <Switch
                checked={!!s.enabled}
                onChange={(_, checked) => handleToggle(s.id, checked)}
                size="small"
              />
              {s.avatar_url && (
                <Avatar src={s.avatar_url} sx={{ width: 24, height: 24, ml: 0.5 }} />
              )}
              <Box sx={{ flexGrow: 1, ml: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="subtitle2" noWrap>
                    {s.name}
                  </Typography>
                  {s.repo_url && (
                    <IconButton
                      size="small"
                      href={s.repo_url}
                      target="_blank"
                      rel="noopener"
                      sx={{ p: 0.25 }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {s.command} {JSON.parse(s.args).join(" ")}
                  {envKeys.length > 0 && ` | ${envKeys.join(", ")}`}
                </Typography>
              </Box>
              {s.stars > 0 && <Stars count={s.stars} />}
              <Chip label={s.namespace} size="small" sx={{ mr: 1 }} />
              <IconButton
                size="small"
                onClick={() => handleDelete(s.id)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

// -- Main --

export default function McpRegistry() {
  const [tab, setTab] = useState(0);
  const [installed, setInstalled] = useState<InstalledServer[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadInstalled = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp/installed");
      const data = await res.json();
      setInstalled(Array.isArray(data) ? data : []);
    } catch {
      setInstalled([]);
    }
  }, []);

  useEffect(() => {
    loadInstalled();
  }, [loadInstalled]);

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/mcp/sync", { method: "POST" });
    await loadInstalled();
    setSyncing(false);
  }

  const installedIds = new Set(installed.map((s) => s.id));

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          MCP Servers
        </Typography>
        <Button
          startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
          onClick={handleSync}
          disabled={syncing}
          size="small"
        >
          Sync Now
        </Button>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Installed (${installed.length})`} />
        <Tab label="Registry" />
      </Tabs>
      {tab === 0 && (
        <InstalledTab servers={installed} onChanged={loadInstalled} />
      )}
      {tab === 1 && (
        <RegistryTab installed={installedIds} onInstalled={loadInstalled} />
      )}
    </Box>
  );
}
