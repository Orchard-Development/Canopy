/**
 * Shared project creation form. Rendered identically in:
 * - CreateNewTab (full page)
 * - Chat inline form (via FormDef.component)
 *
 * Single source of truth -- edit here, both surfaces update.
 *
 * Two creation paths:
 * - "Create with AI" (primary): streams via /api/projects/ai-create,
 *   using form state as hints. AI fills gaps intelligently.
 * - "Create" (secondary): manual create, uses form values as-is.
 */
import { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Button, TextField, Stack, Chip,
  CircularProgress, Alert, InputAdornment, IconButton,
  Card, CardActionArea, ToggleButtonGroup, ToggleButton,
  Accordion, AccordionSummary, AccordionDetails,
  LinearProgress, Fade,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LanguageIcon from "@mui/icons-material/Language";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { api, type ProjectRecord } from "../../lib/api";
import { createProjectFull, type ThemeSelection } from "../../lib/projectActions";
import { DirectoryPicker } from "../DirectoryPicker";
import { PreviewPanel } from "../onboarding/PreviewPanel";
import { MOOD_PRESETS, type MoodPreset } from "../onboarding/presets";
import { PackCard, type PackCardData } from "../seedpacks/PackCard";
import { type BrandingConfig, DEFAULT_BRANDING } from "../../lib/branding";
import type { FormComponentProps, FormSubmitResult } from "../../types/forms";

interface AiStreamStep {
  event: string;
  data: Record<string, unknown>;
}

type ThemeSource = "none" | "preset" | "ai" | "url";
const PROJECT_TYPES = ["software", "operations", "research", "mixed"];

function toKebab(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isElectron(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return typeof w.ctx === "object" &&
    typeof (w.ctx as Record<string, unknown>)?.pickDirectory === "function";
}

export function ProjectCreateForm({ prefill, onSubmitted, embedded }: FormComponentProps) {
  // Core fields
  const [name, setName] = useState(prefill?.name || "");
  const [description, setDescription] = useState(prefill?.description || "");
  const [rootPath, setRootPath] = useState(prefill?.rootPath || "");
  const [pathManual, setPathManual] = useState(!!prefill?.rootPath);
  const [projectType, setProjectType] = useState(prefill?.projectType || "software");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  // Seed packs
  const [packs, setPacks] = useState<PackCardData[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [packsExpanded, setPacksExpanded] = useState(false);

  // Theme
  const [themeSource, setThemeSource] = useState<ThemeSource>("ai");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [themeDescription, setThemeDescription] = useState("");
  const [brandUrl, setBrandUrl] = useState(prefill?.quickStartUrl || "");
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [urlThemePreview, setUrlThemePreview] = useState<BrandingConfig | null>(null);
  const [generatingUrlTheme, setGeneratingUrlTheme] = useState(false);
  const [urlThemeError, setUrlThemeError] = useState("");

  // Quick start
  const [quickStartUrl, setQuickStartUrl] = useState(prefill?.quickStartUrl || "");
  const [quickStartLoading, setQuickStartLoading] = useState(false);
  const [quickStartError, setQuickStartError] = useState("");
  const [branding, setBranding] = useState<Record<string, string> | null>(null);

  // AI creation stream
  const [aiCreating, setAiCreating] = useState(false);
  const [aiSteps, setAiSteps] = useState<AiStreamStep[]>([]);
  const [aiCurrentEvent, setAiCurrentEvent] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    api.listSeedPacks().then((list) => {
      const shipped = list.filter((p) => p.source === "shipped");
      setPacks(shipped.map((p) => ({
        id: p.id, name: p.name, slug: p.slug, description: p.description,
        source: p.source, fileCount: p.fileCount, version: p.version,
        category: p.category, techStack: p.techStack,
      })));
      setSelectedSlugs(new Set(shipped.map((p) => p.slug)));
    }).catch(() => {});
  }, []);

  // Auto-trigger quick start if prefilled
  useEffect(() => {
    if (prefill?.quickStartUrl && quickStartUrl && !quickStartLoading && !name) {
      handleQuickStart();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleNameChange(value: string) {
    setName(value);
    if (!pathManual) {
      const slug = toKebab(value);
      setRootPath(slug ? `~/orchard-projects/${slug}` : "");
    }
  }

  async function handleBrowse() {
    if (isElectron()) {
      const ctx = (window as unknown as Record<string, unknown>).ctx as { pickDirectory: () => Promise<string | null> };
      const dir = await ctx.pickDirectory();
      if (dir) { setRootPath(dir); setPathManual(true); }
    } else {
      setPickerOpen(true);
    }
  }

  async function handleQuickStart() {
    const url = quickStartUrl.trim();
    if (!url) return;
    setQuickStartLoading(true);
    setQuickStartError("");
    try {
      const res = await api.projectFromUrl(url);
      const d = res.data;
      handleNameChange(d.name);
      setDescription(d.description);
      if (PROJECT_TYPES.includes(d.projectType)) setProjectType(d.projectType);
      if (d.branding) setBranding(d.branding as Record<string, string>);
      if (d.theme) {
        setThemeSource("url");
        setBrandUrl(url);
        const theme = { ...DEFAULT_BRANDING, ...d.theme } as BrandingConfig;
        if (d.theme.dark) theme.dark = { ...DEFAULT_BRANDING.dark, ...(d.theme.dark as Record<string, string>) };
        if (d.theme.light) theme.light = { ...DEFAULT_BRANDING.light, ...(d.theme.light as Record<string, string>) };
        setUrlThemePreview(theme);
      }
    } catch (err) {
      setQuickStartError(err instanceof Error ? err.message : "Failed to fetch project info");
    } finally {
      setQuickStartLoading(false);
    }
  }

  async function handleGenerateUrlTheme() {
    const url = brandUrl.trim();
    if (!url) return;
    setGeneratingUrlTheme(true);
    setUrlThemeError("");
    setUrlThemePreview(null);
    try {
      const res = await api.previewThemeFromUrl(url);
      const theme = { ...DEFAULT_BRANDING, ...res.theme } as BrandingConfig;
      if (res.theme.dark) theme.dark = { ...DEFAULT_BRANDING.dark, ...(res.theme.dark as Record<string, string>) };
      if (res.theme.light) theme.light = { ...DEFAULT_BRANDING.light, ...(res.theme.light as Record<string, string>) };
      setUrlThemePreview(theme);
    } catch (err) {
      setUrlThemeError(err instanceof Error ? err.message : "Failed to generate theme");
    } finally {
      setGeneratingUrlTheme(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      let theme: ThemeSelection = { source: "none" };
      if (themeSource === "preset" && selectedPreset) {
        theme = { source: "preset", preset: selectedPreset };
      } else if (themeSource === "ai") {
        theme = { source: "ai", description: themeDescription || undefined };
      } else if (themeSource === "url" && urlThemePreview) {
        theme = { source: "url", brandUrl: brandUrl.trim(), resolvedTheme: urlThemePreview as unknown as Record<string, unknown> };
      } else if (themeSource === "url" && brandUrl.trim()) {
        theme = { source: "url", brandUrl: brandUrl.trim() };
      }

      const project = await createProjectFull({
        name, description, rootPath, projectType,
        seedPackSlugs: Array.from(selectedSlugs),
        theme,
        branding: branding || undefined,
      });

      const result: FormSubmitResult = {
        success: true,
        message: `Project "${name}" created successfully`,
        data: project as unknown as Record<string, unknown>,
      };
      setSuccess(result.message);
      onSubmitted?.(result);
      return project;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      return null;
    } finally {
      setCreating(false);
    }
  }

  async function handleAiCreate() {
    if (!name.trim()) return;
    setAiCreating(true);
    setAiSteps([]);
    setAiCurrentEvent(null);
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Resolve theme from current form state if available
      let resolvedTheme: Record<string, unknown> | null = null;
      if (themeSource === "url" && urlThemePreview) {
        resolvedTheme = urlThemePreview as unknown as Record<string, unknown>;
      } else if (themeSource === "preset" && selectedPreset) {
        const preset = MOOD_PRESETS.find((p) => p.id === selectedPreset);
        if (preset) {
          const { name: _n, subtitle: _s, ...themeFields } = preset.config;
          resolvedTheme = themeFields as unknown as Record<string, unknown>;
        }
      }

      const body = {
        name: name.trim(),
        hint: description.trim(),
        url: quickStartUrl.trim() || (themeSource === "url" ? brandUrl.trim() : ""),
        root_path: rootPath.trim(),
        seed_slugs: Array.from(selectedSlugs),
        resolved_theme: resolvedTheme,
        resolved_branding: branding,
        project_type: projectType,
      };

      const response = await fetch("/api/projects/ai-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setError("Failed to start AI creation");
        setAiCreating(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventName: string | null = null;

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventName = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventName) {
            try {
              const data = JSON.parse(line.slice(6));
              const step: AiStreamStep = { event: eventName, data };
              setAiSteps((prev) => [...prev, step]);
              setAiCurrentEvent(eventName);

              if (eventName === "complete" && data.project) {
                const project = data.project as ProjectRecord;
                const result: FormSubmitResult = {
                  success: true,
                  message: `Project "${project.name}" created`,
                  data: project as unknown as Record<string, unknown>,
                };
                setSuccess(result.message);
                onSubmitted?.(result);
              } else if (eventName === "error") {
                setError(String(data.message || "AI creation failed"));
                setAiCreating(false);
              }
            } catch {
              // ignore malformed JSON
            }
            eventName = null;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Connection failed");
      }
    }
    setAiCreating(false);
  }

  const valid = name.trim() && rootPath.trim();

  if (success) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 2 }}>
        <CheckCircleIcon color="success" />
        <Typography variant="body2" color="success.main">{success}</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} sx={embedded ? { p: 0 } : undefined}>
      <TextField label="Project name" value={name}
        onChange={(e) => handleNameChange(e.target.value)} fullWidth required autoFocus={!embedded} />

      <TextField label="Root path" helperText="Directory where the project will live"
        value={rootPath} onChange={(e) => { setPathManual(true); setRootPath(e.target.value); }}
        fullWidth required
        slotProps={{ input: { endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={handleBrowse} edge="end"><FolderOpenIcon /></IconButton>
          </InputAdornment>
        ) } }}
      />

      <QuickStartSection url={quickStartUrl} setUrl={setQuickStartUrl}
        loading={quickStartLoading} error={quickStartError}
        clearError={() => setQuickStartError("")} onGo={handleQuickStart}
        logoUrl={branding?.logoUrl} projectName={name} />

      <TextField label="Description (optional)" value={description}
        onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={2} />

      <ProjectTypeChips value={projectType} onChange={setProjectType} />

      <ThemeSection source={themeSource} setSource={setThemeSource}
        selectedPreset={selectedPreset} setPreset={setSelectedPreset}
        showAll={showAllPresets} setShowAll={setShowAllPresets}
        aiDescription={themeDescription} setAiDescription={setThemeDescription}
        brandUrl={brandUrl} setBrandUrl={setBrandUrl}
        urlPreview={urlThemePreview} urlError={urlThemeError}
        setUrlError={setUrlThemeError}
        generating={generatingUrlTheme} onGenerateUrl={handleGenerateUrlTheme} />

      <SeedPackAccordion packs={packs} selected={selectedSlugs}
        setSelected={setSelectedSlugs} expanded={packsExpanded}
        setExpanded={setPacksExpanded} />

      {error && <Alert severity="error">{error}</Alert>}

      {aiCreating && (
        <Fade in timeout={300}>
          <Box>
            <AiProgressStrip steps={aiSteps} currentEvent={aiCurrentEvent} />
          </Box>
        </Fade>
      )}

      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
        <Button variant="outlined" size="small" onClick={handleCreate}
          disabled={creating || aiCreating || !valid}
          color="inherit"
          sx={{ textTransform: "none", fontSize: "0.8rem" }}>
          {creating ? "Creating..." : "Skip AI"}
        </Button>
        <Button variant="contained" onClick={handleAiCreate}
          disabled={creating || aiCreating || !name.trim()}
          startIcon={aiCreating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          sx={{ textTransform: "none" }}>
          {aiCreating ? "Building..." : "Create"}
        </Button>
      </Stack>

      <DirectoryPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        onSelect={(p) => { setRootPath(p); setPathManual(true); }} title="Choose project location" />
    </Stack>
  );
}

/* ---- Sub-sections extracted for readability ---- */

function QuickStartSection({ url, setUrl, loading, error, clearError, onGo, logoUrl, projectName }: {
  url: string; setUrl: (v: string) => void;
  loading: boolean; error: string; clearError: () => void;
  onGo: () => void;
  logoUrl?: string; projectName?: string;
}) {
  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
        {logoUrl && projectName && (
          <Box component="img" src={logoUrl} alt={`${projectName} logo`}
            sx={{ width: 28, height: 28, borderRadius: 1, objectFit: "contain" }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; }} />
        )}
        <Box>
          <Typography variant="subtitle2">Quick start from URL</Typography>
          <Typography variant="caption" color="text.secondary">
            Auto-fill project name, description, logo, and theme from a website
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField value={url} onChange={(e) => { setUrl(e.target.value); clearError(); }}
          placeholder="https://example.com" fullWidth size="small" disabled={loading}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onGo(); } }} />
        <Button variant="outlined" size="small" onClick={onGo}
          disabled={loading || !url.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          sx={{ textTransform: "none", whiteSpace: "nowrap", mt: "1px", minWidth: 130 }}>
          {loading ? "Researching..." : "Quick start"}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={clearError}>{error}</Alert>}
    </Box>
  );
}

function ProjectTypeChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Project type</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {PROJECT_TYPES.map((t) => (
          <Chip key={t} label={t} onClick={() => onChange(t)}
            color={value === t ? "primary" : "default"}
            variant={value === t ? "filled" : "outlined"} />
        ))}
      </Stack>
    </Box>
  );
}

function MoodSwatch({ preset, active, onSelect }: {
  preset: MoodPreset; active: boolean; onSelect: () => void;
}) {
  const p = preset.config.dark;
  return (
    <Card variant="outlined" sx={{
      borderColor: active ? p.primary : "divider",
      borderWidth: active ? 2 : 1, transition: "all 0.25s ease",
    }}>
      <CardActionArea onClick={onSelect} sx={{ p: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[p.primary, p.secondary, p.background].map((c) => (
              <Box key={c} sx={{ width: 20, height: 20, borderRadius: "5px",
                bgcolor: c, border: "1px solid rgba(255,255,255,0.1)" }} />
            ))}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600}>{preset.label}</Typography>
            <Typography variant="caption" color="text.secondary">{preset.description}</Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

function ThemeSection({ source, setSource, selectedPreset, setPreset,
  showAll, setShowAll, aiDescription, setAiDescription,
  brandUrl, setBrandUrl, urlPreview, urlError, setUrlError,
  generating, onGenerateUrl,
}: {
  source: ThemeSource; setSource: (v: ThemeSource) => void;
  selectedPreset: string | null; setPreset: (v: string) => void;
  showAll: boolean; setShowAll: (v: boolean) => void;
  aiDescription: string; setAiDescription: (v: string) => void;
  brandUrl: string; setBrandUrl: (v: string) => void;
  urlPreview: BrandingConfig | null; urlError: string; setUrlError: (v: string) => void;
  generating: boolean; onGenerateUrl: () => void;
}) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Theme</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
        Choose how to theme this project. You can always change it later.
      </Typography>
      <ToggleButtonGroup value={source} exclusive
        onChange={(_e, val) => { if (val) setSource(val); }} size="small" sx={{ mb: 2 }}>
        <ToggleButton value="none" sx={{ textTransform: "none" }}>None</ToggleButton>
        <ToggleButton value="preset" sx={{ textTransform: "none" }}>Preset</ToggleButton>
        <ToggleButton value="ai" sx={{ textTransform: "none", gap: 0.5 }}>
          <AutoFixHighIcon sx={{ fontSize: 16 }} /> AI generate
        </ToggleButton>
        <ToggleButton value="url" sx={{ textTransform: "none", gap: 0.5 }}>
          <LanguageIcon sx={{ fontSize: 16 }} /> From URL
        </ToggleButton>
      </ToggleButtonGroup>

      {source === "preset" && (
        <Stack spacing={1}>
          {(showAll ? MOOD_PRESETS : MOOD_PRESETS.slice(0, 5)).map((p) => (
            <MoodSwatch key={p.id} preset={p} active={selectedPreset === p.id}
              onSelect={() => setPreset(p.id)} />
          ))}
          {MOOD_PRESETS.length > 5 && (
            <Button size="small" onClick={() => setShowAll(!showAll)}
              endIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{ textTransform: "none", alignSelf: "flex-start" }}>
              {showAll ? "Show less" : `View all ${MOOD_PRESETS.length} presets`}
            </Button>
          )}
        </Stack>
      )}
      {source === "ai" && (
        <TextField value={aiDescription} onChange={(e) => setAiDescription(e.target.value)}
          placeholder='Describe the vibe' multiline rows={2} fullWidth size="small"
          helperText="Leave blank to auto-generate from the project name and description" />
      )}
      {source === "url" && (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField value={brandUrl}
              onChange={(e) => { setBrandUrl(e.target.value); setUrlError(""); }}
              placeholder="https://example.com" fullWidth size="small"
              helperText="AI will research the brand's official colors"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onGenerateUrl(); } }}
              disabled={generating} />
            <Button variant="contained" size="small" onClick={onGenerateUrl}
              disabled={generating || !brandUrl.trim()}
              startIcon={generating ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              sx={{ textTransform: "none", whiteSpace: "nowrap", mt: "1px", minWidth: 120 }}>
              {generating ? "Researching..." : "Generate"}
            </Button>
          </Stack>
          {urlError && <Alert severity="error" onClose={() => setUrlError("")}>{urlError}</Alert>}
          {urlPreview && (
            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Dark</Typography>
                <PreviewPanel config={urlPreview} mode="dark" />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>Light</Typography>
                <PreviewPanel config={urlPreview} mode="light" />
              </Box>
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}

const AI_STEP_LABELS: Record<string, string> = {
  thinking: "Analyzing project requirements...",
  researching: "Researching brand identity...",
  configured: "AI configuration ready",
  creating: "Creating project files...",
  seeding: "Applying seed packs...",
  complete: "Done!",
};

function AiProgressStrip({ steps, currentEvent }: { steps: AiStreamStep[]; currentEvent: string | null }) {
  const isDone = steps.some((s) => s.event === "complete");
  const seedStep = steps.find((s) => s.event === "seeding");

  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Stack spacing={1}>
        {!isDone && <LinearProgress variant="indeterminate" sx={{ borderRadius: 1, height: 3 }} />}
        {steps.map((step, i) => {
          const isActive = step.event === currentEvent;
          const label = String(step.data.message || AI_STEP_LABELS[step.event] || step.event);
          return (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              {step.event === "complete" ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: "success.main" }} />
              ) : isActive ? (
                <AutoAwesomeIcon sx={{ fontSize: 16, color: "primary.main" }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              )}
              <Typography
                variant="body2"
                color={isActive ? "text.primary" : "text.secondary"}
                fontWeight={isActive ? 600 : 400}
              >
                {label}
              </Typography>
            </Stack>
          );
        })}
        {seedStep && (seedStep.data.seeds as string[])?.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ pl: 3 }}>
            {(seedStep.data.seeds as string[]).map((slug) => (
              <Chip key={slug} label={slug} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function SeedPackAccordion({ packs, selected, setSelected, expanded, setExpanded }: {
  packs: PackCardData[]; selected: Set<string>;
  setSelected: (v: Set<string>) => void;
  expanded: boolean; setExpanded: (v: boolean) => void;
}) {
  if (packs.length === 0) return null;
  const groups = Object.entries(
    packs.reduce<Record<string, PackCardData[]>>((g, p) => {
      (g[p.category || "Other"] ??= []).push(p); return g;
    }, {}),
  );
  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    setSelected(next);
  }
  function toggleAll() {
    setSelected(selected.size === packs.length ? new Set() : new Set(packs.map((p) => p.slug)));
  }
  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}
      variant="outlined" disableGutters sx={{ "&::before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2">Seed Packs</Typography>
          <Chip label={`${selected.size} of ${packs.length} selected`} size="small" variant="outlined" />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <Button size="small" onClick={toggleAll}>
            {selected.size === packs.length ? "Deselect all" : "Select all"}
          </Button>
        </Stack>
        {groups.map(([cat, catPacks]) => (
          <Box key={cat} sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}
              sx={{ mb: 0.5, display: "block" }}>{cat}</Typography>
            <Stack spacing={0.75}>
              {catPacks.map((p) => (
                <PackCard key={p.slug} pack={p} selected={selected.has(p.slug)}
                  onToggle={() => toggle(p.slug)} compact />
              ))}
            </Stack>
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
