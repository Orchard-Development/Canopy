import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Stack, Typography, Chip, Divider,
  CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tabs, Tab,
} from "@mui/material";
import GrassIcon from "@mui/icons-material/Grass";
import CloudIcon from "@mui/icons-material/Cloud";
import StoreIcon from "@mui/icons-material/Store";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/Add";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import GitHubIcon from "@mui/icons-material/GitHub";
import { PageLayout } from "../components/PageLayout";
import { api } from "../lib/api";
import { GitHubHarvestDialog } from "../components/settings/GitHubHarvestDialog";
import { PackCard, type PackCardData } from "../components/seedpacks/PackCard";

interface SeedPack extends PackCardData {
  created_at: string;
  updated_at: string;
  tags?: string[];
  requires?: string[];
  auto_apply?: boolean;
}

const CATEGORY_TABS = ["All", "Discipline", "Workflow", "Tools", "Scaffold", "Platform", "Agents"];

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
  const [categoryTab, setCategoryTab] = useState("All");
  const [search, setSearch] = useState("");

  function load() {
    setLoading(true);
    api.listSeedPacks().then(setPacks).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

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

  const corePacks = useMemo(() => packs.filter((p) => p.source === "public" && p.auto_apply), [packs]);
  const optionalPacks = useMemo(() => packs.filter((p) => p.source === "public" && !p.auto_apply), [packs]);
  const publicPacks = useMemo(() => packs.filter((p) => p.source === "public"), [packs]);
  const userPacks = useMemo(() => packs.filter((p) => p.source !== "public"), [packs]);

  const filteredPublic = useMemo(() => {
    let result = publicPacks;
    if (categoryTab !== "All") {
      const cat = categoryTab.toLowerCase();
      result = result.filter((p) => (p.category || "").toLowerCase() === cat);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [publicPacks, categoryTab, search]);

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
    <PageLayout
      title="Seed Packs"
      icon={<GrassIcon color="primary" />}
      badge={<Chip label={`${packs.length}`} size="small" variant="outlined" />}
      actions={
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<StoreIcon />} onClick={() => navigate("/pack-store")}>
            Pack Store
          </Button>
          <Button size="small" variant="outlined" startIcon={<GitHubIcon />} onClick={() => setGithubOpen(true)}>
            From GitHub
          </Button>
          <Button size="small" variant="contained" color="secondary" startIcon={<AutoFixHighIcon />} onClick={() => setGenerateOpen(true)}>
            Generate with AI
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Pack
          </Button>
        </Stack>
      }
    >
      <TextField
        size="small"
        placeholder="Search by name, description, or tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      {loading && <CircularProgress size={24} />}

      {!loading && (
        <Stack spacing={4}>
          {/* Core packs (auto_apply) */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <LockIcon fontSize="small" color="success" />
              <Typography variant="subtitle1" fontWeight={700}>Core Packs</Typography>
              <Chip label={corePacks.length} size="small" color="success" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Always applied to new projects. These provide the foundational rules, skills, and workflows.
            </Typography>

            <Stack spacing={1}>
              {corePacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onClick={() => navigate(`/seed-packs/${pack.id}`)}
                />
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Optional public packs */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <CloudIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight={700}>Optional Packs</Typography>
              <Chip label={optionalPacks.length} size="small" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Public packs you can install per-project. Not applied automatically.
            </Typography>

            <Tabs
              value={categoryTab}
              onChange={(_e, val) => setCategoryTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 2, minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}
            >
              {CATEGORY_TABS.map((tab) => (
                <Tab key={tab} label={tab} value={tab} sx={{ textTransform: "none", py: 0.5 }} />
              ))}
            </Tabs>

            {filteredPublic.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {optionalPacks.length === 0 ? "No optional packs available." : "No packs match this filter."}
              </Typography>
            )}

            <Stack spacing={1}>
              {filteredPublic.filter((p) => !p.auto_apply).map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onClick={() => navigate(`/seed-packs/${pack.id}`)}
                />
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* User packs */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <GrassIcon fontSize="small" color="action" />
              <Typography variant="subtitle1" fontWeight={700}>Your Packs</Typography>
              <Chip label={userPacks.length} size="small" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Harvested from your projects or created manually. Plant on any orchard.
            </Typography>

            {filteredUser.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {userPacks.length === 0
                  ? "No custom packs yet. Use New Pack, Generate with AI, or harvest from a project."
                  : "No packs match this search."}
              </Typography>
            )}

            <Stack spacing={1}>
              {filteredUser.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  onClick={() => navigate(`/seed-packs/${pack.id}`)}
                  onDelete={handleDelete}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
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
