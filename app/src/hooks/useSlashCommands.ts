import { useState, useEffect, useMemo } from "react";
import { api } from "../lib/api";
import type { SlashItem } from "../components/chat/SlashCommandMenu";

/** Built-in tool commands that are always available. */
const TOOL_COMMANDS: SlashItem[] = [
  { name: "generate-image", description: "Generate an image from a text prompt", type: "tool" },
  { name: "generate-video", description: "Generate a video from a text prompt", type: "tool" },
  { name: "create-proposal", description: "Create a design proposal for a feature", type: "tool" },
  { name: "build-proposal", description: "Build/implement an existing proposal", type: "tool" },
  { name: "dispatch", description: "Spawn an agent to handle a task", type: "tool" },
  { name: "browse", description: "Browse a directory in the workspace", type: "tool" },
  { name: "read-file", description: "Read a file's contents", type: "tool" },
  { name: "web-fetch", description: "Fetch a URL and return its content", type: "tool" },
  { name: "search-sessions", description: "Search past agent session logs", type: "tool" },
];

/**
 * Fetches workspace skills and rules, merges with built-in tool commands,
 * and returns a sorted list of SlashItems for the autocomplete menu.
 */
export function useSlashCommands(projectId?: string | null) {
  const [skills, setSkills] = useState<SlashItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const graph = await api.skillGraph(projectId ?? undefined);
        if (cancelled) return;

        const items: SlashItem[] = graph.nodes.map((node) => ({
          name: node.id,
          description: node.description,
          type: "skill" as const,
          category: node.category,
        }));

        setSkills(items);
      } catch {
        // Skills endpoint might not be available; keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [projectId]);

  const all = useMemo(() => {
    // Skills first, then tools, alphabetical within each group
    const sorted = [
      ...skills.sort((a, b) => a.name.localeCompare(b.name)),
      ...TOOL_COMMANDS.sort((a, b) => a.name.localeCompare(b.name)),
    ];
    return sorted;
  }, [skills]);

  return { items: all, loading };
}
