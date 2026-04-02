import type { PaletteConfig } from "../../lib/branding";
import type { Proposal } from "./types";

/** Discord-optimized 1200x630 hype card with data viz. */

const W = 1200;
const H = 630;
const PAD = 44;
const FONT = "system-ui, -apple-system, sans-serif";

interface HypeCopy {
  headline: string;
  tagline: string;
  description: string;
  bullets: string[];
  stat: string;
  statLabel: string;
}

// --------------- text helpers ---------------

function stripMd(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, " ")
    .trim();
}

function excerpt(md: string, n: number): string {
  return stripMd(md).split(/(?<=[.!?])\s+/).slice(0, n).join(" ");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// --------------- color helpers ---------------

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// --------------- AI copy ---------------

async function generateHypeCopy(
  proposal: Proposal,
  brandName: string,
  projectName: string,
): Promise<HypeCopy> {
  const summary = excerpt(proposal.proposal, 6);
  const impact = proposal.impact ? excerpt(proposal.impact, 3) : "";
  const completed = proposal.tasksByStatus?.completed ?? 0;
  const total = proposal.taskCount;

  const prompt = `Write hype copy for a Discord announcement card about this feature.

Return ONLY valid JSON (no markdown fences):
{
  "headline": "max 6 words, bold product-launch energy",
  "tagline": "one punchy sentence, max 15 words",
  "description": "2-3 exciting sentences explaining what this unlocks and why it matters. ~40 words.",
  "bullets": ["4 benefit statements, each 6-10 words, start with action verbs"],
  "stat": "one impressive number or metric from the data (e.g. '22' or '4x' or '100%')",
  "statLabel": "what the stat means in 2-4 words"
}

Project: ${projectName} by ${brandName}
Feature: ${proposal.title}
Context: ${summary}
${impact ? `Impact: ${impact}` : ""}
Tasks: ${completed}/${total} completed`;

  const system = "Elite brand copywriter. Bold, punchy, inspiring. No jargon. Every word earns its place.";

  const res = await fetch("/api/ai/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system, maxTokens: 500 }),
  });
  if (!res.ok) throw new Error(`AI prompt failed: ${res.status}`);
  const data = await res.json();
  const text: string = data.result ?? data.content ?? data.text ?? "";
  return JSON.parse(text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()) as HypeCopy;
}

// --------------- data viz drawing ---------------

function drawProgressRing(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  pct: number, accent: string, muted: string, txt: string,
) {
  const lw = 10;
  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(muted, 0.2);
  ctx.lineWidth = lw;
  ctx.stroke();
  // Fill arc
  if (pct > 0) {
    const start = -Math.PI / 2;
    const end = start + (Math.PI * 2 * pct) / 100;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.strokeStyle = accent;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
  }
  // Center text
  ctx.fillStyle = txt;
  ctx.font = `700 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`${pct}%`, cx, cy + 10);
  ctx.fillStyle = muted;
  ctx.font = `400 11px ${FONT}`;
  ctx.fillText("COMPLETE", cx, cy + 28);
  ctx.textAlign = "left";
}

function drawBarChart(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  statuses: Record<string, number>,
  accent: string, muted: string, txt: string, surface: string,
) {
  const entries = Object.entries(statuses).filter(([, v]) => v > 0);
  if (entries.length === 0) return 0;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const barH = 18;
  const gap = 8;
  const labelW = 90;

  const statusColors: Record<string, string> = {
    completed: accent,
    "in-progress": rgba(accent, 0.6),
    pending: rgba(muted, 0.4),
    skipped: rgba(muted, 0.2),
  };

  let cy = y;
  for (const [status, count] of entries) {
    const pct = count / total;
    const color = statusColors[status] ?? rgba(muted, 0.3);

    // Label
    ctx.fillStyle = muted;
    ctx.font = `500 11px ${FONT}`;
    ctx.letterSpacing = "1px";
    ctx.fillText(status.toUpperCase(), x, cy + 13);
    ctx.letterSpacing = "0px";

    // Bar track
    const barX = x + labelW;
    const barW = w - labelW - 36;
    roundRect(ctx, barX, cy + 2, barW, barH, 4);
    ctx.fillStyle = rgba(surface, 0.6);
    ctx.fill();

    // Bar fill
    const fillW = Math.max(barH, barW * pct);
    roundRect(ctx, barX, cy + 2, fillW, barH, 4);
    ctx.fillStyle = color;
    ctx.fill();

    // Count
    ctx.fillStyle = txt;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(String(count), x + w - 4, cy + 15);
    ctx.textAlign = "left";

    cy += barH + gap;
  }
  return cy - y;
}

function drawStatCallout(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  stat: string, label: string,
  accent: string, muted: string, surface: string,
) {
  const h = 72;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = rgba(surface, 0.6);
  ctx.fill();
  ctx.strokeStyle = rgba(accent, 0.3);
  ctx.lineWidth = 1;
  ctx.stroke();

  // Accent top edge
  ctx.fillStyle = accent;
  ctx.fillRect(x + 12, y, w - 24, 3);

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = `800 32px ${FONT}`;
  ctx.fillText(stat, x + w / 2, y + 38);
  ctx.fillStyle = muted;
  ctx.font = `500 11px ${FONT}`;
  ctx.letterSpacing = "1px";
  ctx.fillText(label.toUpperCase(), x + w / 2, y + 58);
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";
}

// --------------- main render ---------------

function renderCard(
  copy: HypeCopy,
  proposal: Proposal,
  palette: PaletteConfig,
  brandName: string,
  projectName: string,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const accent = palette.accent;
  const bg = palette.background;
  const txt = palette.text;
  const muted = palette.textMuted;
  const surface = palette.surfaceAlt;

  const completed = proposal.tasksByStatus?.completed ?? 0;
  const total = proposal.taskCount;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hasData = total > 0;

  // Layout: left text column ~62%, right data column ~38% (when data exists)
  const rightW = hasData ? 320 : 0;
  const leftW = W - PAD * 2 - (hasData ? rightW + 24 : 0);
  const leftX = PAD + 24; // after accent bar
  const rightX = W - PAD - rightW;

  // == BACKGROUND ==
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Dual radial glows
  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
  g1.addColorStop(0, rgba(accent, 0.15));
  g1.addColorStop(0.6, rgba(accent, 0.03));
  g1.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W, H, 0, W, H, 500);
  g2.addColorStop(0, rgba(accent, 0.08));
  g2.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const tg = ctx.createLinearGradient(0, 0, W, 0);
  tg.addColorStop(0, accent);
  tg.addColorStop(0.7, rgba(accent, 0.3));
  tg.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, 4);

  // Left accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, PAD, 4, H - PAD * 2 - 36);

  // == LEFT COLUMN: TEXT ==
  let y = PAD;

  // Brand tag
  ctx.fillStyle = accent;
  ctx.font = `700 11px ${FONT}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(brandName.toUpperCase(), leftX, y + 12);
  const bnW = ctx.measureText(brandName.toUpperCase()).width;
  ctx.fillStyle = rgba(muted, 0.5);
  ctx.fillText("  /  ", leftX + bnW, y + 12);
  const sepW = ctx.measureText("  /  ").width;
  ctx.fillText(projectName.toUpperCase(), leftX + bnW + sepW, y + 12);
  ctx.letterSpacing = "0px";
  y += 32;

  // Headline
  ctx.fillStyle = txt;
  ctx.font = `800 44px ${FONT}`;
  const headLines = wrap(ctx, copy.headline, leftW);
  for (const line of headLines) {
    ctx.fillText(line, leftX, y + 40);
    y += 52;
  }
  y += 6;

  // Tagline
  ctx.fillStyle = palette.textSecondary;
  ctx.font = `400 18px ${FONT}`;
  const tagLines = wrap(ctx, copy.tagline, leftW);
  for (const line of tagLines) {
    ctx.fillText(line, leftX, y + 18);
    y += 26;
  }
  y += 10;

  // Description
  ctx.fillStyle = rgba(muted, 0.9);
  ctx.font = `400 14px ${FONT}`;
  const descLines = wrap(ctx, copy.description, leftW);
  for (const line of descLines.slice(0, 3)) {
    ctx.fillText(line, leftX, y + 16);
    y += 20;
  }
  y += 16;

  // Bullet list (vertical, compact, with accent dots)
  ctx.font = `500 14px ${FONT}`;
  for (const bullet of copy.bullets.slice(0, 4)) {
    // dot
    ctx.beginPath();
    ctx.arc(leftX + 5, y + 8, 3, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    // text
    ctx.fillStyle = txt;
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText(bullet, leftX + 18, y + 12);
    y += 24;
  }

  // == RIGHT COLUMN: DATA VIZ (only when there's task data) ==
  if (hasData) {
    // Subtle divider line
    ctx.strokeStyle = rgba(muted, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightX - 16, PAD + 20);
    ctx.lineTo(rightX - 16, H - PAD - 36);
    ctx.stroke();

    let ry = PAD + 12;

    // Progress ring
    const ringR = 52;
    drawProgressRing(ctx, rightX + rightW / 2, ry + ringR + 4, ringR, pct, accent, muted, txt);
    ry += ringR * 2 + 28;

    // Task status bar chart
    const statuses = proposal.tasksByStatus ?? {};
    if (Object.keys(statuses).length > 0) {
      ctx.fillStyle = rgba(muted, 0.5);
      ctx.font = `600 10px ${FONT}`;
      ctx.letterSpacing = "2px";
      ctx.fillText("TASK BREAKDOWN", rightX, ry + 10);
      ctx.letterSpacing = "0px";
      ry += 22;
      const chartH = drawBarChart(ctx, rightX, ry, rightW, statuses, accent, muted, txt, surface);
      ry += chartH + 12;
    }

    // AI stat callout
    if (copy.stat && copy.statLabel) {
      drawStatCallout(ctx, rightX, ry, rightW, copy.stat, copy.statLabel, accent, muted, surface);
    }
  }

  // == FOOTER ==
  const fy = H - 32;
  const footGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
  footGrad.addColorStop(0, rgba(accent, 0.35));
  footGrad.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = footGrad;
  ctx.fillRect(PAD, fy - 6, W - PAD * 2, 1);

  ctx.fillStyle = rgba(muted, 0.5);
  ctx.font = `400 11px ${FONT}`;
  ctx.fillText(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    PAD,
    fy + 12,
  );

  ctx.textAlign = "right";
  ctx.fillStyle = accent;
  ctx.font = `700 11px ${FONT}`;
  ctx.fillText(brandName, W - PAD, fy + 12);
  ctx.beginPath();
  ctx.arc(W - PAD - ctx.measureText(brandName).width - 10, fy + 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "left";

  return canvas;
}

// --------------- export ---------------

export async function downloadHypeDoc(
  proposal: Proposal,
  palette: PaletteConfig,
  brandName: string,
  projectName: string,
): Promise<void> {
  const copy = await generateHypeCopy(proposal, brandName, projectName);
  const canvas = renderCard(copy, proposal, palette, brandName, projectName);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proposal.slug}-hype.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, "image/png");
}
