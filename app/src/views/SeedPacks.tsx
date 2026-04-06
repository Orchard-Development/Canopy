import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stack, Typography, Chip,
  CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tabs, Tab, Tooltip, IconButton,
} from "@mui/material";
import GrassIcon from "@mui/icons-material/Grass";
import StoreIcon from "@mui/icons-material/Store";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import AddIcon from "@mui/icons-material/Add";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import GitHubIcon from "@mui/icons-material/GitHub";
import DownloadDoneIcon from "@mui/icons-material/DownloadDone";
import { PageLayout } from "../components/PageLayout";
import { api } from "../lib/api";
import { GitHubHarvestDialog } from "../components/settings/GitHubHarvestDialog";
import { PackCard, type PackCardData } from "../components/seedpacks/PackCard";
import { PackStoreTab } from "../components/seedpacks/PackStoreTab";
import { OrchardSettingsTab } from "../components/seedpacks/OrchardSettingsTab";
import { InstalledTab } from "../components/seedpacks/InstalledTab";
import { useEntitlements } from "../hooks/useEntitlements";

interface SeedPack extends PackCardData {
  created_at: string;
  updated_at: string;
  tags?: string[];
  requires?: string[];
  auto_apply?: boolean;
  pack_type?: "orchard" | "community";
}

export default function SeedPacks() {
  const navigate = useNavigate();
  const [packs, setPacks] = useState<SeedPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [genPrompt, setGenPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"installed" | "orchard" | "store" | "custom">("installed");
  const [search, setSearch] = useState("");
  const { entitlements, remove: removeEntitlement, loading: entsLoading } = useEntitlements();
  const [installedPacks, setInstalledPacks] = useState<import("../lib/api").DiscoverPack[]>([]);

  function load() {
    setLoading(true);
    api.listSeedPacks().then(setPacks).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (mainTab === "installed") {
      api.discoverPacks().then((all) => {
        setInstalledPacks(all.filter((p) => p.entitled));
      }).catch(() => {});
    }
  }, [mainTab, entitlements]);

  async function handleCreate() {
    setCreating(true);
    try {
      const result = await api.createSeedPack({ name: newName, description: newDesc });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      navigate(`/seed-packs/${result.id}`);
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await api.generateSeedPack({ prompt: genPrompt });
      setGenerateOpen(false);
      setGenPrompt("");
      navigate(`/seed-packs/${result.id}`);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed");
    }
    setGenerating(false);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await api.deleteSeedPack(id);
      setPacks((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  }

  const orchardPacks = useMemo(() => packs.filter((p) => p.source === "public" && p.pack_type === "orchard"), [packs]);
  const userPacks = useMemo(() => packs.filter((p) => p.source !== "public"), [packs]);

  const filteredOrchard = useMemo(() => {
    if (!search.trim()) return orchardPacks;
    const q = search.toLowerCase();
    return orchardPacks.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [orchardPacks, search]);

  const filteredUser = useMemo(() => {
    if (!search.trim()) return userPacks;
    const q = search.toLowerCase();
    return userPacks.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [userPacks, search]);

  return (
    <PageLayout>
      <Stack direction="row" alignItems="center" sx={{ borderBottom: 1, borderColor: "divider", mb: 1.5 }}>
        <Tabs
          value={mainTab}
          onChange={(_, v) => setMainTab(v)}
          sx={{ flex: 1 }}
        >
          <Tab label="Installed" value="installed" icon={<DownloadDoneIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Orchard" value="orchard" icon={<AccountTreeIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Store" value="store" icon={<StoreIcon fontSize="small" />} iconPosition="start" />
          <Tab label="Custom Packs" value="custom" icon={<GrassIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
        {mainTab === "custom" && (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="From GitHub">
              <IconButton size="small" onClick={() => setGithubOpen(true)}><GitHubIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Generate with AI">
              <IconButton size="small" color="secondary" onClick={() => setGenerateOpen(true)}><AutoFixHighIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="New Pack">
              <IconButton size="small" color="primary" onClick={() => setCreateOpen(true)}><AddIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      {mainTab === "store" && <PackStoreTab />}

      {mainTab === "custom" && (
        <>
          <TextField
            size="small"
            placeholder="Search by name, description, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          {loading && <CircularProgress size={24} />}
          {!loading && (
            <>
              {filteredUser.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {userPacks.length === 0
                    ? "No custom packs yet."
                    : "No packs match this search."}
                </Typography>
              )}
              <Stack spacing={1}>
                {filteredUser.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    compact
                    onClick={() => navigate(`/seed-packs/${pack.id}`)}
                    onDelete={handleDelete}
                  />
                ))}
              </Stack>
            </>
          )}
        </>
      )}

      {mainTab === "installed" && (
        <InstalledTab
          packs={installedPacks}
          loading={entsLoading}
          onRemove={async (packId) => {
            await removeEntitlement(packId);
            setInstalledPacks((prev) => prev.filter((p) => p.id !== packId));
          }}
          onPackClick={(id) => navigate(`/seed-packs/${id}`)}
        />
      )}

      {mainTab === "orchard" && (
        <OrchardSettingsTab
          packs={filteredOrchard}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          onPackClick={(id) => navigate(`/seed-packs/${id}`)}
        />
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New Seed Pack</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" size="small" fullWidth value={newName} onChange={(e) => setNewName(e.target.value)} />
            <TextField label="Description" size="small" fullWidth multiline minRows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={generateOpen} onClose={() => setGenerateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Seed Pack with AI</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Describe the seed pack you want. The AI will study all public packs
              to match their format and quality, then generate a complete pack with rules and skills.
            </Typography>
            <TextField
              label="What should this pack do?"
              fullWidth
              multiline
              minRows={4}
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              placeholder={"e.g., A pack for Python data science projects that enforces type hints,\ndoctest coverage, notebook hygiene, and has skills for pandas optimization\nand matplotlib chart review."}
              disabled={generating}
            />
            {genError && <Typography variant="body2" color="error">{genError}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
            onClick={handleGenerate}
            disabled={generating || !genPrompt.trim()}
          >
            {generating ? "Generating..." : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>

      <GitHubHarvestDialog open={githubOpen} onClose={() => setGithubOpen(false)} onHarvested={load} />
    </PageLayout>
  );
}
