import { useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  InputAdornment,
  IconButton,
  Alert,
  Collapse,
  Link,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import AddIcon from "@mui/icons-material/Add";
import { AiCreatePreview, type AiStep } from "./AiCreatePreview";
import { DirectoryPicker } from "../DirectoryPicker";
import type { ProjectRecord } from "../../lib/api";

interface Props {
  onCreated?: (project: ProjectRecord) => void;
  prefillUrl?: string;
}

type Phase = "input" | "building" | "done" | "error";

function toKebab(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isElectron(): boolean {
  const w = window as unknown as Record<string, unknown>;
  return typeof w.ctx === "object" &&
    typeof (w.ctx as Record<string, unknown>)?.pickDirectory === "function";
}

export function AiCreateFlow({ onCreated, prefillUrl }: Props) {
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [url, setUrl] = useState(prefillUrl || "");
  const [rootPath, setRootPath] = useState("");
  const [pathManual, setPathManual] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [phase, setPhase] = useState<Phase>("input");
  const [steps, setSteps] = useState<AiStep[]>([]);
  const [currentEvent, setCurrentEvent] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createdProject, setCreatedProject] = useState<ProjectRecord | null>(null);

  const abortRef = useRef<AbortController | null>(null);

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

  const handleAiCreate = useCallback(async () => {
    if (!name.trim()) return;

    setPhase("building");
    setSteps([]);
    setCurrentEvent(null);
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const body = {
        name: name.trim(),
        hint: hint.trim(),
        url: url.trim(),
        root_path: rootPath.trim(),
      };

      const response = await fetch("/api/projects/ai-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setError("Failed to start AI creation");
        setPhase("error");
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

        let currentEventName: string | null = null;

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventName = line.slice(7).trim();
          } else if (line.startsWith("data: ") && currentEventName) {
            try {
              const data = JSON.parse(line.slice(6));
              const step: AiStep = { event: currentEventName, data };
              setSteps((prev) => [...prev, step]);
              setCurrentEvent(currentEventName);

              if (currentEventName === "complete" && data.project) {
                setCreatedProject(data.project as ProjectRecord);
                setPhase("done");
              } else if (currentEventName === "error") {
                setError(data.message || "AI creation failed");
                setPhase("error");
              }
            } catch {
              // ignore malformed JSON
            }
            currentEventName = null;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Connection failed");
        setPhase("error");
      }
    }
  }, [name, hint, url, rootPath]);

  const handleBlankCreate = useCallback(async () => {
    if (!name.trim()) return;

    setPhase("building");
    setSteps([{ event: "creating", data: { message: "Creating blank project..." } }]);
    setCurrentEvent("creating");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: hint.trim(),
          rootPath: rootPath.trim() || `~/orchard-projects/${toKebab(name)}`,
          projectType: "software",
        }),
      });

      if (!response.ok) {
        setError("Failed to create project");
        setPhase("error");
        return;
      }

      const project = await response.json();
      setCreatedProject(project as ProjectRecord);
      setSteps((prev) => [...prev, { event: "complete", data: { project } }]);
      setPhase("done");
    } catch (err) {
      setError((err as Error).message || "Creation failed");
      setPhase("error");
    }
  }, [name, hint, rootPath]);

  // Phase: done
  if (phase === "done" && createdProject) {
    return (
      <Stack spacing={2}>
        <AiCreatePreview steps={steps} currentEvent={currentEvent} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={() => onCreated?.(createdProject)}
          >
            Open Project
          </Button>
        </Stack>
      </Stack>
    );
  }

  // Phase: building or error (show preview with progress)
  if (phase === "building" || phase === "error") {
    return (
      <Stack spacing={2}>
        <AiCreatePreview steps={steps} currentEvent={currentEvent} />
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
            <Button size="small" onClick={() => { setPhase("input"); setError(""); }} sx={{ ml: 1 }}>
              Try again
            </Button>
          </Alert>
        )}
      </Stack>
    );
  }

  // Phase: input
  const valid = name.trim().length > 0;

  return (
    <Stack spacing={2.5}>
      <TextField
        label="Project name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        fullWidth
        required
        autoFocus
        placeholder="e.g. Acme Payments, My Blog, Research Notes"
      />

      <TextField
        label="What is this project? (optional)"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        fullWidth
        multiline
        rows={2}
        placeholder="e.g. Fintech API for payment processing, Personal blog about cooking, ML research on transformers"
        helperText="The more you tell the AI, the more personalized your project will be. Leave blank for a clean canvas."
      />

      <TextField
        label="Website URL (optional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        fullWidth
        placeholder="https://example.com"
        helperText="AI will research the brand's colors, logo, and identity to theme your project."
      />

      <Collapse in={showAdvanced}>
        <Stack spacing={2}>
          <TextField
            label="Root path"
            helperText="Directory where the project will live"
            value={rootPath}
            onChange={(e) => { setPathManual(true); setRootPath(e.target.value); }}
            fullWidth
            slotProps={{ input: { endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleBrowse} edge="end"><FolderOpenIcon /></IconButton>
              </InputAdornment>
            ) } }}
          />
        </Stack>
      </Collapse>

      {!showAdvanced && (
        <Link
          component="button"
          variant="caption"
          color="text.secondary"
          onClick={() => setShowAdvanced(true)}
          sx={{ alignSelf: "flex-start" }}
        >
          Advanced options
        </Link>
      )}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button
          variant="text"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleBlankCreate}
          disabled={!valid}
          sx={{ textTransform: "none", color: "text.secondary" }}
        >
          Skip AI, create blank
        </Button>
        <Button
          variant="contained"
          onClick={handleAiCreate}
          disabled={!valid}
          startIcon={<AutoAwesomeIcon />}
        >
          Create with AI
        </Button>
      </Stack>

      <DirectoryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => { setRootPath(p); setPathManual(true); }}
        title="Choose project location"
      />
    </Stack>
  );
}
