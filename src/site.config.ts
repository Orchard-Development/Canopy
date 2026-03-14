import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Brain,
  ShieldCheck,
  Layout,
  MonitorSmartphone,
  Radio,
} from "lucide-react";

// -- Types ------------------------------------------------------------------

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface DownloadOption {
  platform: string;
  label: string;
  href: string;
  note?: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;

  hero: {
    heading: string;
    subheading: string;
    cta: { label: string; href: string };
  };

  features: Feature[];
  steps: Step[];

  download: {
    heading: string;
    subheading: string;
    options: DownloadOption[];
  };

  links: {
    github: string;
    docs: string;
    license?: string;
  };
}

// -- Config -----------------------------------------------------------------

export const siteConfig: SiteConfig = {
  name: "Context",
  tagline: "AI workspaces that learn and improve",
  description:
    "A poly-repo coordination layer with persistent memory, reusable skills, and real-time orchestration for AI agents.",
  url: "https://context.dev",

  hero: {
    heading: "Your AI workspace, compounding",
    subheading:
      "Context gives your AI agents persistent memory, reusable skills, and behavioral guardrails -- so every session builds on the last.",
    cta: { label: "Download", href: "#download" },
  },

  features: [
    {
      title: "Skills",
      description:
        "Reusable agent workflows that encode best practices and evolve from real usage across your team.",
      icon: Zap,
    },
    {
      title: "Memory",
      description:
        "Persistent project knowledge that survives across sessions -- decisions, progress, and lessons learned.",
      icon: Brain,
    },
    {
      title: "Rules",
      description:
        "Behavioral guardrails shared across every AI tool. Define standards once, enforce everywhere.",
      icon: ShieldCheck,
    },
    {
      title: "Command Center",
      description:
        "A web UI for managing skills, rules, memory, and deployments in one place.",
      icon: Layout,
    },
    {
      title: "Multi-IDE Sync",
      description:
        "Works with Cursor, Claude Code, Windsurf, and Codex. Same rules and skills everywhere.",
      icon: MonitorSmartphone,
    },
    {
      title: "MQTT Event Bus",
      description:
        "Real-time coordination between agents, repos, and services via a lightweight message bus.",
      icon: Radio,
    },
  ],

  steps: [
    {
      number: 1,
      title: "Download",
      description: "Grab the desktop app for your platform.",
    },
    {
      number: 2,
      title: "Configure",
      description:
        "Define your rules, skills, and memory structure to match your workflow.",
    },
    {
      number: 3,
      title: "Compound",
      description:
        "Every AI session contributes knowledge back. Your workspace gets smarter over time.",
    },
  ],

  download: {
    heading: "Download Context",
    subheading: "Available for macOS, Windows, and Linux.",
    options: [
      {
        platform: "macos",
        label: "Download for macOS",
        href: "#",
        note: "Apple Silicon & Intel",
      },
      {
        platform: "windows",
        label: "Download for Windows",
        href: "#",
        note: "Windows 10+",
      },
      {
        platform: "linux",
        label: "Download for Linux",
        href: "#",
        note: ".deb and .AppImage",
      },
    ],
  },

  links: {
    github: "https://github.com/context-dev/context",
    docs: "/docs",
    license: "MIT",
  },
};
