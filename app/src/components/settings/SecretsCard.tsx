import { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  IconButton, Chip, Stack, Collapse, Alert, CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import DeleteIcon from "@mui/icons-material/Delete";
import { useActiveProject } from "../../hooks/useActiveProject";

interface ConsumerStatus {
  owner: string; bucket: string; alias: string; kind: string;
  required: boolean; resolved: boolean; source: string | null; has_override: boolean;
}
interface KindStatus {
  kind: string; display_name: string; workspace_resolved: boolean; consumers: ConsumerStatus[];
}

type Scope = { owner?: string; alias: string; kind: string; project_id?: string };
const CF_KINDS = new Set(["cloudflare_api_token", "cloudflare_account_id"]);

function consumerLabel(c: ConsumerStatus): string {
  if (c.resolved && c.has_override) return " -- using own override";
  if (c.resolved) return ` -- using ${c.source ?? "workspace"} default`;
  if (c.required) return " -- required, not configured";
  return " -- optional";
}

function InlineEditor({ value, onChange, onSave, onCancel, placeholder }: {
  value: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; placeholder: string;
}) {
  return (
    <Stack direction="row" spacing={1}>
      <TextField size="small" type="password" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)} sx={{ flex: 1 }} />
      <Button size="small" variant="contained" onClick={onSave} disableElevation>Save</Button>
      <Button size="small" onClick={onCancel}>Cancel</Button>
    </Stack>
  );
}

export function SecretsCard() {
  const [registry, setRegistry] = useState<KindStatus[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editScope, setEditScope] = useState<Scope | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const { project } = useActiveProject();

  const fetchStatus = useCallback(() => {
    const url = project?.id
      ? `/api/secrets/status?project_id=${project.id}`
      : "/api/secrets/status";
    fetch(url).then((r) => r.json())
      .then((data) => setRegistry(data.secrets ?? [])).catch(() => {});
  }, [project?.id]);
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const post = (url: string, body: object, method = "POST") =>
    fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const handleSave = async () => {
    if (!editScope || !editValue) return;
    await post("/api/secrets/set", { ...editScope, value: editValue });
    setEditing(null); setEditValue(""); setEditScope(null); fetchStatus();
  };
  const handleDelete = async (scope: Scope) => {
    await post("/api/secrets/delete", scope, "DELETE"); fetchStatus();
  };
  const startEdit = (kind: string, alias: string, owner?: string, projectScoped?: boolean) => {
    setEditing(owner ? `${owner}.${alias}` : (projectScoped ? `project:${kind}` : kind));
    setEditValue("");
    setEditScope(projectScoped && project?.id
      ? { owner, alias, kind, project_id: project.id } as Scope
      : { owner, alias, kind });
  };
  const cancelEdit = () => setEditing(null);

  const syncToGitHub = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await post("/api/deploy/sync-secrets", { repo: "ekrenzin/context-web" });
      setSyncResult(await res.json());
    } catch (err) {
      setSyncResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    setSyncing(false);
  };

  const allCfResolved = registry.filter((k) => CF_KINDS.has(k.kind)).every((k) => k.workspace_resolved);
  const hasCfKinds = registry.some((k) => CF_KINDS.has(k.kind));

  const filteredRegistry = registry;

  if (filteredRegistry.length === 0) {
    return (
      <Card sx={{ mb: 3 }}><CardContent>
        <Typography variant="h6" gutterBottom>Secrets & API Keys</Typography>
        <Typography variant="body2" color="text.secondary">
          No secrets have been declared yet. When capabilities or engine modules add a secrets block to their manifest, they will appear here for configuration.
        </Typography>
      </CardContent></Card>
    );
  }

  return (
    <Box>
      {filteredRegistry.map((ks) => (
        <Card key={ks.kind} sx={{ mb: 2 }}><CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="h6">{ks.display_name}</Typography>
            <Chip size="small" variant="outlined"
              icon={ks.workspace_resolved ? <CheckCircleIcon /> : <ErrorIcon />}
              label={ks.workspace_resolved ? "configured" : "not set"}
              color={ks.workspace_resolved ? "success" : "warning"} />
          </Stack>

          {editing === ks.kind ? (
            <Box sx={{ mb: 2 }}>
              <InlineEditor value={editValue} onChange={setEditValue}
                onSave={handleSave} onCancel={cancelEdit} placeholder="Enter workspace value" />
            </Box>
          ) : editing === `project:${ks.kind}` ? (
            <Box sx={{ mb: 2 }}>
              <InlineEditor value={editValue} onChange={setEditValue}
                onSave={handleSave} onCancel={cancelEdit}
                placeholder={`Enter value for ${project?.name ?? "project"}`} />
            </Box>
          ) : (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined"
                onClick={() => startEdit(ks.kind, ks.kind)}>
                {ks.workspace_resolved ? "Update" : "Set"} workspace default
              </Button>
              {ks.workspace_resolved && (
                <IconButton size="small" title="Remove workspace default"
                  onClick={() => handleDelete({ alias: ks.kind, kind: ks.kind })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
              {project && (
                <Button size="small" variant="outlined" color="secondary"
                  onClick={() => startEdit(ks.kind, ks.kind, undefined, true)}>
                  Set project override
                </Button>
              )}
            </Stack>
          )}

          <Box sx={{ pl: 2, borderLeft: 2, borderColor: "divider" }}>
            {ks.consumers.map((c) => {
              const ek = `${c.owner}.${c.alias}`;
              return (
                <Box key={ek} sx={{ mb: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {c.resolved ? <CheckCircleIcon fontSize="small" color="success" />
                      : c.required ? <ErrorIcon fontSize="small" color="error" />
                      : <RemoveCircleOutlineIcon fontSize="small" color="disabled" />}
                    <Typography variant="body2">
                      <strong>{c.owner}</strong>
                      <Chip label={c.bucket} size="small" variant="outlined"
                        color="default"
                        sx={{ ml: 0.5, height: 18, fontSize: "0.7rem" }} />
                      {consumerLabel(c)}
                    </Typography>
                  </Stack>
                  {editing === ek && (
                    <Box sx={{ mt: 1, ml: 4 }}>
                      <InlineEditor value={editValue} onChange={setEditValue}
                        onSave={handleSave} onCancel={cancelEdit} placeholder={`Override for ${c.owner}`} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>

          <Button size="small" sx={{ mt: 1 }}
            startIcon={expanded[ks.kind] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setExpanded((p) => ({ ...p, [ks.kind]: !p[ks.kind] }))}>
            {expanded[ks.kind] ? "Hide" : "Add"} overrides
          </Button>
          <Collapse in={expanded[ks.kind]}>
            <Stack spacing={1} sx={{ mt: 1, pl: 2 }}>
              {ks.consumers.map((c) => (
                <Stack key={`ov.${c.owner}.${c.alias}`} direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>{c.owner}</Typography>
                  <Button size="small" variant="outlined" onClick={() => startEdit(c.kind, c.alias, c.owner)}>
                    {c.has_override ? "Update" : "Set"} override</Button>
                  {c.has_override && <IconButton size="small" title="Remove override"
                    onClick={() => handleDelete({ owner: c.owner, alias: c.alias, kind: c.kind })}>
                    <DeleteIcon fontSize="small" /></IconButton>}
                </Stack>))}
            </Stack>
          </Collapse>
        </CardContent></Card>
      ))}

      {hasCfKinds && (
        <Card sx={{ mb: 2 }}><CardContent>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button variant="outlined" disabled={!allCfResolved || syncing} onClick={syncToGitHub}
              startIcon={syncing ? <CircularProgress size={16} /> : undefined}>
              {syncing ? "Syncing..." : "Sync Cloudflare secrets to GitHub Actions"}</Button>
            {!allCfResolved && <Typography variant="caption" color="text.secondary">
              Configure all Cloudflare secrets above first</Typography>}
          </Stack>
          {syncResult && <Alert severity={syncResult.ok ? "success" : "error"} sx={{ mt: 1 }}>
            {syncResult.ok ? "Secrets synced to ekrenzin/context-web" : syncResult.error}</Alert>}
        </CardContent></Card>
      )}
    </Box>
  );
}
