import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const screenshots = [
  {
    src: "/screenshots/workspace.png",
    label: "Workspace",
    description:
      "Manage all your projects in one place. Open any repo in Cursor, Claude Code, Windsurf, or Codex with one click.",
  },
  {
    src: "/screenshots/overview.png",
    label: "Dashboard",
    description:
      "Track active proposals, tasks, and agent work across your workspace. Propose features in natural language.",
  },
  {
    src: "/screenshots/skill-graph.png",
    label: "Skill Graph",
    description:
      "Visualize how your skills connect and depend on each other. See your workspace's capabilities at a glance.",
  },
];

export function Screenshots() {
  const [active, setActive] = useState(0);

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
          See it in action
        </h2>
        <p className="text-[var(--muted-foreground)] text-center mb-12 max-w-2xl mx-auto">
          A desktop app and command center that puts your entire AI workflow in one place.
        </p>

        <div className="flex justify-center gap-2 mb-8">
          {screenshots.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setActive(i)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                i === active
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--card)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {screenshots[active] && (
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="rounded-xl border border-[var(--border)] overflow-hidden shadow-2xl">
                <img
                  src={screenshots[active].src}
                  alt={screenshots[active].label}
                  className="w-full"
                />
              </div>
              <p className="text-center text-[var(--muted-foreground)] mt-4 max-w-lg mx-auto text-sm">
                {screenshots[active].description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
