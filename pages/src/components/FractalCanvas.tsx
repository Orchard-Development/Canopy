import { useRef, useEffect, useCallback } from "react";

/**
 * Fixed background fractal for the full page.
 * Shows the fully-grown orchard at a low opacity,
 * providing subtle depth behind glass-morphism cards.
 */

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
  const sway = Math.sin(time * 0.4 + seed + depth * 0.9) * depth * 0.008;
  const a = angle + sway;

  const ex = x + Math.cos(a) * len;
  const ey = y + Math.sin(a) * len;
  const cpx = (x + ex) / 2 + Math.sin(seed + depth) * length * 0.1;
  const cpy = (y + ey) / 2 + Math.cos(seed + depth) * length * 0.05;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cpx, cpy, ex, ey);
  const lum = 55 + depth * 7;
  const alpha = (depth === 0 ? 0.5 : 0.25 + (1 - depth / maxDepth) * 0.2) * grow;
  ctx.strokeStyle = `hsla(200, 80%, ${lum}%, ${alpha})`;
  ctx.lineWidth = thickness * grow;
  ctx.lineCap = "round";
  ctx.stroke();

  if (depth >= 3 && grow > 0.5) {
    const na = (grow - 0.5) * 2;
    const r = 2 + Math.sin(seed) * 0.8;
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(125, 211, 252, ${na * 0.4})`;
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

export function FractalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, w, h);

    const p = progressRef.current;
    const t = time / 1000;
    const cx = w / 2;
    const baseY = h * 0.82;

    // Fully grown orchard, fading in based on global scroll
    const fadeIn = Math.min(p * 2, 1);
    if (fadeIn <= 0) { rafRef.current = requestAnimationFrame(render); return; }

    ctx.globalAlpha = fadeIn;

    drawBranch(ctx, cx, baseY, -Math.PI / 2, Math.min(h * 0.2, 150), Math.min(w * 0.006, 6), 0, 5, 1, t, 42);
    drawBranch(ctx, cx - w * 0.2, baseY + 10, -Math.PI / 2 - 0.06, Math.min(h * 0.13, 100), Math.min(w * 0.004, 4), 0, 4, 1, t, 17);
    drawBranch(ctx, cx + w * 0.2, baseY + 10, -Math.PI / 2 + 0.06, Math.min(h * 0.13, 100), Math.min(w * 0.004, 4), 0, 4, 1, t, 73);

    // Ground glow
    const grd = ctx.createRadialGradient(cx, baseY + 10, 0, cx, baseY + 10, w * 0.3);
    grd.addColorStop(0, "rgba(14, 165, 233, 0.1)");
    grd.addColorStop(0.6, "rgba(56, 189, 248, 0.03)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, baseY - 100, w, 220);

    ctx.globalAlpha = 1;

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressRef.current = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        filter: "blur(0.5px) brightness(1.1)",
      }}
    />
  );
}
