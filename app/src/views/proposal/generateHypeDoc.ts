import type { PaletteConfig } from "../../lib/branding";
import type { Proposal } from "./types";

/**
 * Investor-pitch hype card -- 1200x630 Discord-optimized PNG.
 * Sells the vision, not the implementation status.
 */

const W = 1200;
const H = 630;
const PAD = 48;
const F = "system-ui, -apple-system, sans-serif";

interface HypeCopy {
  headline: string;
  hook: string;
  opportunity: string;
  valueProps: string[];
  metrics: Array<{ value: string; label: string }>;
  closingLine: string;
}

// --------------- helpers ---------------

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
  const summary = excerpt(proposal.proposal, 8);
  const impact = proposal.impact ? excerpt(proposal.impact, 4) : "";

  const prompt = `You are writing investor-pitch copy for a 1200x630 card image. This is NOT a community update or changelog. This is pitching the VISION and OPPORTUNITY to someone who might fund or partner with us.

Return ONLY valid JSON (no markdown fences):
{
  "headline": "max 5 words. Big, bold, visionary. Think 'The Future of X' energy.",
  "hook": "one sentence, max 20 words. The elevator pitch -- what is this and why should an investor care?",
  "opportunity": "2-3 sentences, ~50 words. Paint the market opportunity. Why is this a big deal? What problem does it solve at scale? Why now?",
  "valueProps": ["3 strategic advantages, each 5-8 words. Not features -- competitive moats and outcomes. Think 'First-mover in $XB market' not 'Deploys automatically'."],
  "metrics": [{"value": "a bold number", "label": "2-3 word label"}, {"value": "another", "label": "label"}, {"value": "third", "label": "label"}],
  "closingLine": "one powerful sentence. The line that makes someone say 'tell me more'. Max 12 words."
}

For metrics: invent plausible, impressive market/impact numbers that an investor would find compelling. TAM, efficiency gains, cost reduction, speed multipliers, etc. Make them feel real and specific.

Company: ${brandName}
Project: ${projectName}
What we're building: ${proposal.title}
Details: ${summary}
${impact ? `Strategic impact: ${impact}` : ""}`;

  const system = "You write like the best pitch deck copywriter in Silicon Valley. Visionary but grounded. Bold numbers. No fluff. Investor language, not engineer language.";

  const res = await fetch("/api/ai/prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system, maxTokens: 600 }),
  });
  if (!res.ok) throw new Error(`AI prompt failed: ${res.status}`);
  const data = await res.json();
  const text: string = data.result ?? data.content ?? data.text ?? "";
  return JSON.parse(text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()) as HypeCopy;
}

// --------------- render ---------------

function renderCard(
  copy: HypeCopy,
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
  const textSec = palette.textSecondary;

  // == BACKGROUND ==
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent glow top-left
  const g1 = ctx.createRadialGradient(0, 0, 0, 0, 0, 600);
  g1.addColorStop(0, rgba(accent, 0.14));
  g1.addColorStop(0.5, rgba(accent, 0.03));
  g1.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  // Secondary glow bottom-right
  const g2 = ctx.createRadialGradient(W, H, 0, W, H, 400);
  g2.addColorStop(0, rgba(accent, 0.07));
  g2.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const tg = ctx.createLinearGradient(0, 0, W, 0);
  tg.addColorStop(0, accent);
  tg.addColorStop(0.6, rgba(accent, 0.3));
  tg.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, 4);

  // Left accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, PAD, 3, H - PAD * 2 - 30);

  const leftX = PAD + 20;
  const fullW = W - leftX - PAD;

  // == TOP: BRAND + HEADLINE + HOOK ==
  let y = PAD;

  // Brand
  ctx.fillStyle = accent;
  ctx.font = `700 11px ${F}`;
  ctx.letterSpacing = "3px";
  ctx.fillText(brandName.toUpperCase(), leftX, y + 11);
  const bnW = ctx.measureText(brandName.toUpperCase()).width;
  ctx.fillStyle = rgba(muted, 0.5);
  ctx.fillText("  /  ", leftX + bnW, y + 11);
  const sepW = ctx.measureText("  /  ").width;
  ctx.fillText(projectName.toUpperCase(), leftX + bnW + sepW, y + 11);
  ctx.letterSpacing = "0px";
  y += 28;

  // Headline
  ctx.fillStyle = txt;
  ctx.font = `800 40px ${F}`;
  const headLines = wrap(ctx, copy.headline, fullW);
  for (const line of headLines) {
    ctx.fillText(line, leftX, y + 36);
    y += 46;
  }
  y += 2;

  // Hook
  ctx.fillStyle = textSec;
  ctx.font = `400 17px ${F}`;
  const hookLines = wrap(ctx, copy.hook, fullW);
  for (const line of hookLines) {
    ctx.fillText(line, leftX, y + 17);
    y += 24;
  }
  y += 14;

  // == MIDDLE: TWO-COLUMN -- opportunity left, metrics right ==
  const metricsW = 280;
  const metricsX = W - PAD - metricsW;
  const oppW = metricsX - 28 - leftX;
  const midY = y;

  // Opportunity text (left)
  ctx.fillStyle = rgba(muted, 0.8);
  ctx.font = `400 13px ${F}`;
  const oppLines = wrap(ctx, copy.opportunity, oppW);
  for (const line of oppLines.slice(0, 4)) {
    ctx.fillText(line, leftX, y + 14);
    y += 18;
  }
  y += 12;

  // Value props (left, below opportunity)
  for (const vp of copy.valueProps.slice(0, 3)) {
    // Arrow accent
    ctx.fillStyle = accent;
    ctx.font = `700 13px ${F}`;
    ctx.fillText("\u2192", leftX, y + 12);
    // Text
    ctx.fillStyle = txt;
    ctx.font = `600 13px ${F}`;
    const vpLines = wrap(ctx, vp, oppW - 22);
    for (const vl of vpLines) {
      ctx.fillText(vl, leftX + 20, y + 12);
      y += 18;
    }
    y += 4;
  }

  // Metrics column (right, stacked vertically from midY)
  let my = midY;
  const metrics = (copy.metrics ?? []).slice(0, 3);
  if (metrics.length > 0) {
    // Subtle divider
    ctx.strokeStyle = rgba(muted, 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(metricsX - 14, midY);
    ctx.lineTo(metricsX - 14, midY + metrics.length * 64 + 8);
    ctx.stroke();

    for (const m of metrics) {
      // Value
      ctx.fillStyle = accent;
      ctx.font = `800 28px ${F}`;
      ctx.fillText(m.value, metricsX, my + 26);
      // Label
      ctx.fillStyle = muted;
      ctx.font = `400 11px ${F}`;
      ctx.letterSpacing = "1px";
      ctx.fillText(m.label.toUpperCase(), metricsX, my + 44);
      ctx.letterSpacing = "0px";
      // Subtle underline
      ctx.fillStyle = rgba(accent, 0.15);
      ctx.fillRect(metricsX, my + 52, metricsW, 1);
      my += 60;
    }
  }

  // == BOTTOM: CLOSING LINE ==
  const closeY = H - 30 - 44;
  // Background strip
  roundRect(ctx, PAD, closeY, W - PAD * 2, 38, 6);
  ctx.fillStyle = rgba(surface, 0.5);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, closeY, 4, 38);

  ctx.fillStyle = txt;
  ctx.font = `600 15px ${F}`;
  ctx.fillText(copy.closingLine, PAD + 20, closeY + 24);

  // == FOOTER ==
  const fy = H - 26;
  ctx.fillStyle = rgba(muted, 0.3);
  ctx.fillRect(PAD, fy - 4, W - PAD * 2, 1);

  ctx.fillStyle = rgba(muted, 0.5);
  ctx.font = `400 10px ${F}`;
  ctx.fillText(
    new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    PAD,
    fy + 10,
  );

  ctx.textAlign = "right";
  ctx.fillStyle = accent;
  ctx.font = `700 10px ${F}`;
  ctx.fillText(brandName, W - PAD, fy + 10);
  ctx.beginPath();
  ctx.arc(W - PAD - ctx.measureText(brandName).width - 10, fy + 7, 3, 0, Math.PI * 2);
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
  const canvas = renderCard(copy, palette, brandName, projectName);

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
