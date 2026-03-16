import { useRef, useEffect, useCallback, useState } from "react";
import { siteConfig } from "../../site.config";

// -- Story stages (stage 0 = hero) --------------------------------------------

const STAGES = [
  {
    label: null,
    heading: null,
    body: null,
  },
  {
    label: "The problem",
    heading: "Every session starts from zero",
    body: "Your AI forgets everything. Context, preferences, lessons -- gone. Session 1,000 is the same as session 1.",
  },
  {
    label: "Plant the seed",
    heading: "Orchard remembers",
    body: "Install once. Orchard starts capturing decisions, preferences, and patterns in the background. No extra work.",
  },
  {
    label: "Watch it grow",
    heading: "Skills compound over time",
    body: "Workflows become reusable skills. Each session refines them. What took an hour becomes minutes.",
  },
  {
    label: "Harvest",
    heading: "Your AI grows with you",
    body: "Memory deepens, skills multiply, tools stay in sync. Session 100 is unrecognizably better than session 1.",
  },
];

const SCROLL_HEIGHT_VH = 500;

// -- Fractal ------------------------------------------------------------------

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function drawBranch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number, length: number, thickness: number,
  depth: number, maxDepth: number,
  progress: number, time: number, seed: number,
) {
  if (depth > maxDepth || length < 1.5) return;

  const delay = depth * 0.12;
  const local = Math.max(0, Math.min((progress - delay) / 0.18, 1));
  if (local <= 0) return;

  const grow = easeOutCubic(local);
  const len = length * grow;
  const sway = Math.sin(time * 0.5 + seed + depth * 0.9) * depth * 0.012;
  const a = angle + sway;

  const ex = x + Math.cos(a) * len;
  const ey = y + Math.sin(a) * len;
  const cpx = (x + ex) / 2 + Math.sin(seed + depth) * length * 0.1;
  const cpy = (y + ey) / 2 + Math.cos(seed + depth) * length * 0.05;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cpx, cpy, ex, ey);
  const lum = 58 + depth * 7;
  const sat = 85 - depth * 5;
  const alpha = (depth === 0 ? 0.85 : 0.5 + (1 - depth / maxDepth) * 0.35) * grow;
  ctx.strokeStyle = `hsla(200, ${sat}%, ${lum}%, ${alpha})`;
  ctx.lineWidth = thickness * grow;
  ctx.lineCap = "round";
  ctx.stroke();

  if (depth >= 3 && grow > 0.5) {
    const na = (grow - 0.5) * 2;
    const r = 2.5 + Math.sin(seed) * 1;
    const pulse = 0.8 + Math.sin(time * 1.5 + seed) * 0.2;
    ctx.beginPath();
    ctx.arc(ex, ey, r * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(125, 211, 252, ${na * 0.7})`;
    ctx.fill();
  }

  const children = depth === 0 ? 3 : 2;
  const spread = 0.45 + depth * 0.04;
  for (let i = 0; i < children; i++) {
    const ratio = (i / (children - 1)) * 2 - 1;
    drawBranch(
      ctx, ex, ey,
      a + ratio * spread + Math.sin(seed + i) * 0.12,
      len * (0.62 + Math.sin(seed * 1.7 + i * 3.14) * 0.08),
      thickness * 0.58,
      depth + 1, maxDepth, progress, time,
      seed * 1.7 + i * 3.14,
    );
  }
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  progress: number, time: number,
) {
  ctx.clearRect(0, 0, w, h);

  // Tree only starts growing after hero fades (progress > 0.2)
  const treeProgress = Math.max(0, (progress - 0.2) / 0.8);
  if (treeProgress <= 0) return;

  const cx = w / 2;
  const baseY = h * 0.78;

  // Seed
  if (treeProgress < 0.3) {
    const sp = Math.min(treeProgress / 0.15, 1);
    const pulse = 0.7 + Math.sin(time * 2) * 0.3;
    const r = 3 + sp * 4;
    ctx.beginPath();
    ctx.arc(cx, baseY, r + 10 * sp, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(56, 189, 248, ${sp * 0.3 * pulse})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, baseY, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(125, 211, 252, ${sp * 0.8 * pulse})`;
    ctx.fill();
  }

  // Roots
  if (treeProgress > 0.08) {
    const rp = easeOutCubic(Math.min((treeProgress - 0.08) / 0.2, 1));
    for (let i = 0; i < 5; i++) {
      const spread = ((i / 4) * 2 - 1) * 0.6;
      const angle = Math.PI / 2 + spread + Math.sin(time * 0.3 + i) * 0.03;
      const len = 35 * rp * (0.6 + Math.sin(i * 1.8) * 0.4);
      const ex = cx + Math.cos(angle) * len;
      const ey = baseY + Math.sin(angle) * len;
      ctx.beginPath();
      ctx.moveTo(cx, baseY);
      ctx.quadraticCurveTo((cx + ex) / 2 + Math.sin(i * 2.1) * 8, (baseY + ey) / 2, ex, ey);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.15 * rp})`;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }

  // Main tree
  if (treeProgress > 0.15) {
    const tp = (treeProgress - 0.15) / 0.55;
    const maxDepth = Math.min(Math.floor(tp * 6) + 1, 5);
    drawBranch(ctx, cx, baseY, -Math.PI / 2, Math.min(h * 0.22, 170), Math.min(w * 0.008, 8), 0, maxDepth, tp, time, 42);
  }

  // Side trees
  if (treeProgress > 0.65) {
    const op = (treeProgress - 0.65) / 0.35;
    const oDepth = Math.min(Math.floor(op * 5) + 1, 4);
    const oLen = Math.min(h * 0.14, 110);
    const oThick = Math.min(w * 0.005, 5);
    drawBranch(ctx, cx - w * 0.18, baseY + 8, -Math.PI / 2 - 0.06, oLen, oThick, 0, oDepth, op, time, 17);
    drawBranch(ctx, cx + w * 0.18, baseY + 8, -Math.PI / 2 + 0.06, oLen, oThick, 0, oDepth, op, time, 73);
  }

  // Ground glow
  if (treeProgress > 0.1) {
    const ga = Math.min(treeProgress, 1) * 0.15;
    const grd = ctx.createRadialGradient(cx, baseY + 10, 0, cx, baseY + 10, w * 0.3);
    grd.addColorStop(0, `rgba(14, 165, 233, ${ga})`);
    grd.addColorStop(0.6, `rgba(56, 189, 248, ${ga * 0.3})`);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, baseY - 100, w, 220);
  }
}

// -- Component ----------------------------------------------------------------

export function Onboarding() {
  const { hero, problemPoints } = siteConfig;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const [stageIdx, setStageIdx] = useState(0);

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    renderFrame(ctx, w, h, progressRef.current, time / 1000);
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    function onScroll() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.scrollHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = scrollable > 0 ? Math.max(0, Math.min(scrolled / scrollable, 1)) : 0;
      progressRef.current = p;
      setStageIdx(Math.min(Math.floor(p * STAGES.length), STAGES.length - 1));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  function skip() {
    const el = containerRef.current;
    if (!el) return;
    window.scrollTo({ top: el.offsetTop + el.offsetHeight, behavior: "smooth" });
  }

  const stage = STAGES[stageIdx]!;
  const isHero = stageIdx === 0;
  // Hero fades out, story fades in
  const heroOpacity = Math.max(0, 1 - progressRef.current * 5);

  return (
    <div
      ref={containerRef}
      style={{ height: `${SCROLL_HEIGHT_VH}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ filter: "blur(0.6px) brightness(1.15)" }}
        />

        {/* Hero content (fades out) */}
        {isHero && (
          <div
            className="relative z-10 max-w-4xl mx-auto px-6 text-center"
            style={{ opacity: heroOpacity }}
          >
            <div className="mb-8 flex justify-center">
              <img
                src="/logo.png"
                alt={`${siteConfig.name} logo`}
                className="w-40 h-40 sm:w-52 sm:h-52"
              />
            </div>
            <p className="text-[var(--muted-foreground)] text-sm font-medium tracking-wide uppercase mb-6">
              {siteConfig.tagline}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              {hero.heading}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto leading-relaxed">
              {hero.subheading}
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <a href="#download">
                <button className="inline-flex items-center justify-center rounded-lg font-semibold text-base h-12 px-8 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-colors cursor-pointer">
                  Download
                </button>
              </a>
            </div>
            <div className="mt-12 max-w-xl mx-auto">
              <ul className="space-y-3 text-left">
                {problemPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[var(--muted-foreground)] text-sm">
                    <span className="text-red-400 mt-0.5 shrink-0">x</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Story stages (fade in) */}
        {!isHero && (
          <div
            className="relative z-10 text-center px-8 py-10 max-w-xl mx-auto rounded-2xl border border-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]"
            style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            <p className="text-sky-400/70 text-xs font-medium tracking-widest uppercase mb-4">
              {stage.label}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              {stage.heading}
            </h2>
            <p className="text-[var(--muted-foreground)] text-lg leading-relaxed max-w-lg mx-auto">
              {stage.body}
            </p>
          </div>
        )}

        {/* Progress dots */}
        <div className="relative z-10 flex gap-2 mt-8">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i <= stageIdx ? "rgba(56,189,248,0.8)" : "rgba(56,189,248,0.15)",
                transform: i === stageIdx ? "scale(1.4)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={skip}
          className="relative z-10 mt-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          Skip to download
        </button>

        {/* Scroll hint */}
        {isHero && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
            <div className="w-5 h-8 rounded-full border-2 border-sky-400/30 flex items-start justify-center pt-1.5">
              <div className="w-1 h-2 rounded-full bg-sky-400/50" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
