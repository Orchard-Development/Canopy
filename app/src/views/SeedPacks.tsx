import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Stack, Typography, Chip,
  CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Tabs, Tab,
} from "@mui/material";
import GrassIcon from "@mui/icons-material/Grass";
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

  const filteredPacks = useMemo(() => {
    let result = packs;
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
  }, [packs, categoryTab, search]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, SeedPack[]> = {};
    for (const p of filteredPacks) {
      const cat = p.category || "Uncategorized";
      (groups[cat] ??= []).push(p);
    }
    return groups;
  }, [filteredPacks]);

  return (
    <PageLayout
      title="Seed Packs"
      icon={<GrassIcon color="primary" />}
      badge={<Chip label={`${packs.length}`} size="small" variant="outlined" />}
      actions={
        <Stack direction="row" spacing={1}>
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
      <Tabs
        value={categoryTab}
        onChange={(_e, val) => setCategoryTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        {CATEGORY_TABS.map((tab) => (
          <Tab key={tab} label={tab} value={tab} sx={{ textTransform: "none" }} />
        ))}
      </Tabs>

      <TextField
        size="small"
        placeholder="Search by name, description, or tags..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      {loading && <CircularProgress size={24} />}

      {!loading && (
        <Stack spacing={3}>
          {Object.entries(groupedByCategory).map(([category, categoryPacks]) => (
            <Box key={category}>
              <Typography variant="h6" sx={{ mb: 1 }}>{category}</Typography>
              <Stack spacing={1}>
                {categoryPacks.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    onClick={() => navigate(`/seed-packs/${pack.id}`)}
                    onDelete={pack.source !== "shipped" ? handleDelete : undefined}
                  />
                ))}
              </Stack>
            </Box>
          ))}
          {filteredPacks.length === 0 && (
            <Typography variant="body2" color="text.secondary">No seed packs found.</Typography>
          )}
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
              Describe the seed pack you want. The AI will study all shipped core and orchard packs
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
