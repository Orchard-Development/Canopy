import type { LucideIcon } from "lucide-react";
import {
  Zap,
  Brain,
  ShieldCheck,
  Layout,
  MonitorSmartphone,
  Radio,
  UserPlus,
  Layers,
  TrendingUp,
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

  problemPoints: string[];

  features: Feature[];
  steps: Step[];

  download: {
    heading: string;
    subheading: string;
    stableVersion?: string;
    options: DownloadOption[];
    betaVersion?: string;
    beta?: DownloadOption[];
  };

  links: {
    github: string;
    docs: string;
    license?: string;
  };
}

// -- Config -----------------------------------------------------------------

export const siteConfig: SiteConfig = {
  name: "Orchard",
  tagline: "Grow your AI",
  description:
    "Orchard makes AI exponentially more useful over time. Persistent memory, compounding skills, and your personal context -- every session multiplies the last.",
  url: "https://orchard.dev",

  hero: {
    heading: "AI that grows exponentially with you",
    subheading:
      "Most AI is linear -- same blank slate, every time. Orchard makes it exponential. Every conversation teaches it more about you, every workflow becomes a reusable skill, every decision compounds. Session 100 is unrecognizably better than session 1.",
    cta: { label: "Download", href: "#download" },
  },

  problemPoints: [
    "Session 1 and session 1,000 are identical -- AI never learns",
    "You repeat the same context, preferences, and instructions every time",
    "What you build in one tool vanishes when you switch to another",
    "AI gets more powerful every month, but your experience of it stays flat",
  ],

  features: [
    {
      title: "Onboard AI to you",
      description:
        "Orchard learns how you think, what you're working on, and how you like things done. Every new session starts where the last one left off.",
      icon: UserPlus,
    },
    {
      title: "Memory that compounds",
      description:
        "Decisions, preferences, and lessons accumulate across sessions and tools. Your AI doesn't just remember -- it builds on what it knows.",
      icon: Brain,
    },
    {
      title: "Skills that multiply",
      description:
        "Turn any workflow into a reusable skill -- research, writing, analysis, planning, coding, anything. Each use refines the skill. What took an hour becomes minutes.",
      icon: Zap,
    },
    {
      title: "Your rules, everywhere",
      description:
        "Define how you want AI to behave once. Tone, format, process, guardrails -- enforced across every tool, every session. Set it and forget it.",
      icon: ShieldCheck,
    },
    {
      title: "Every AI tool, one brain",
      description:
        "Cursor, Claude Code, Windsurf, Codex -- they all share the same memory, skills, and rules. Switch freely. Nothing is lost.",
      icon: MonitorSmartphone,
    },
    {
      title: "Command Center",
      description:
        "A desktop app to see your AI's accumulated knowledge -- memory, skills, active work, agent coordination -- all in one place.",
      icon: Layout,
    },
    {
      title: "Not just code",
      description:
        "Research, writing, planning, ops, design, analysis -- Orchard makes AI exponentially better at anything you do repeatedly.",
      icon: Layers,
    },
    {
      title: "Exponential returns",
      description:
        "Linear tools give you the same value on day 1 and day 100. Orchard compounds. The more you use it, the more it multiplies your output.",
      icon: TrendingUp,
    },
    {
      title: "Real-time coordination",
      description:
        "Agents and services communicate in real time via a built-in event bus. Orchestrate complex workflows that span tools and projects.",
      icon: Radio,
    },
  ],

  steps: [
    {
      number: 1,
      title: "Install Orchard",
      description:
        "Download the desktop app. It connects to your AI tools and starts learning immediately.",
    },
    {
      number: 2,
      title: "Work like normal",
      description:
        "Use any AI tool. Orchard captures context, decisions, and workflows in the background -- no extra effort.",
    },
    {
      number: 3,
      title: "Watch it go exponential",
      description:
        "Session by session, your AI gets dramatically better. Skills compound, memory deepens, and what used to take hours takes seconds.",
    },
  ],

  download: {
    heading: "Download Orchard",
    subheading: "Available for macOS and Windows.",
    stableVersion: "0.1.69",
    options: [
      {
        platform: "macos",
        label: "Download for macOS",
        href: "https://pub-8ded0a2cb4124fdf871305165509c89f.r2.dev/0.1.66/Orchard-0.1.66-arm64-mac.zip",
        note: "Apple Silicon (0.1.66)",
      },
      {
        platform: "windows",
        label: "Download for Windows",
        href: "https://pub-8ded0a2cb4124fdf871305165509c89f.r2.dev/0.1.69/Orchard%20Setup%200.1.69.exe",
        note: "Windows 10+ (x64)",
      },
    ],
    betaVersion: "0.1.81",
    beta: [
      {
        platform: "windows",
        label: "Windows",
        href: "https://pub-8ded0a2cb4124fdf871305165509c89f.r2.dev/beta/0.1.81/Orchard-Setup-0.1.81.exe",
        note: "Windows 10+ (x64)",
      },
    ],
  },

  links: {
    github: "https://github.com/context-dev/context",
    docs: "/docs",
    license: "",
  },
};
