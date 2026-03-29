import { useEffect, useRef } from "react";

const PAL = ["#1a6aff", "#2a90ff", "#4aa0ff", "#0050e0", "#0a3a8a", "#80c0ff", "#1050cc"];
const LR = 26, LG = 106, LB = 255;
const SP = 1200, LD = 280;

function makeNode() {
  return {
    x: (Math.random() - 0.5) * SP,
    y: (Math.random() - 0.5) * SP,
    z: (Math.random() - 0.5) * SP,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    vz: (Math.random() - 0.5) * 0.2,
    r: 2.5 + Math.random() * 4,
    col: PAL[Math.floor(Math.random() * PAL.length)],
  };
}

function project(x: number, y: number, z: number, rY: number, rX: number, W: number, H: number) {
  const cY = Math.cos(rY), sY = Math.sin(rY);
  const xr = x * cY - z * sY, zr = x * sY + z * cY;
  const cX = Math.cos(rX), sX = Math.sin(rX);
  const yr = y * cX - zr * sX, zf = y * sX + zr * cX;
  const s = 800 / (800 + zf + 200);
  return { sx: W / 2 + xr * s, sy: H / 2 + yr * s, s, z: zf };
}

function drawEdges(g: CanvasRenderingContext2D, ns: ReturnType<typeof makeNode>[], rY: number, rX: number, W: number, H: number) {
  const LD2 = LD * LD;
  for (let a = 0; a < ns.length; a++) {
    for (let b = a + 1; b < ns.length; b++) {
      const dx = ns[a].x - ns[b].x, dy = ns[a].y - ns[b].y, dz = ns[a].z - ns[b].z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > LD2) continue;
      const pa = project(ns[a].x, ns[a].y, ns[a].z, rY, rX, W, H);
      const pb = project(ns[b].x, ns[b].y, ns[b].z, rY, rX, W, H);
      const fade = 1 - Math.sqrt(d2) / LD;
      const al = fade * Math.max(0, Math.min(0.25, 0.18 - (pa.z + pb.z) * 0.00012));
      g.beginPath(); g.moveTo(pa.sx, pa.sy); g.lineTo(pb.sx, pb.sy);
      g.strokeStyle = `rgba(${LR},${LG},${LB},${al.toFixed(3)})`; g.lineWidth = fade * 0.8; g.stroke();
    }
  }
}

function drawNodes(g: CanvasRenderingContext2D, ns: ReturnType<typeof makeNode>[], rY: number, rX: number, W: number, H: number) {
  const pr = ns.map((n) => ({ p: project(n.x, n.y, n.z, rY, rX, W, H), n }));
  pr.sort((a, b) => a.p.z - b.p.z);
  for (const { p, n } of pr) {
    const r = n.r * p.s, na = Math.max(0.15, Math.min(0.9, 0.65 + p.z * 0.001));
    const br = r * 5;
    const bl = g.createRadialGradient(p.sx, p.sy, r * 0.3, p.sx, p.sy, br);
    bl.addColorStop(0, n.col); bl.addColorStop(1, "transparent");
    g.beginPath(); g.arc(p.sx, p.sy, br, 0, Math.PI * 2);
    g.fillStyle = bl; g.globalAlpha = na * 0.2; g.fill();
    g.beginPath(); g.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    g.fillStyle = n.col; g.globalAlpha = na; g.fill();
    g.beginPath(); g.arc(p.sx, p.sy, r * 0.4, 0, Math.PI * 2);
    g.fillStyle = "#fff"; g.globalAlpha = na * 0.25; g.fill();
  }
  g.globalAlpha = 1;
}

export function LockBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    if (!g) return;

    let rY = 0;
    const rX = 0.25;
    let W = 0, H = 0;
    let animId: number;
    const ns = Array.from({ length: 140 }, makeNode);

    function resize() {
      if (!c) return;
      W = c.width = innerWidth;
      H = c.height = innerHeight;
    }
    window.addEventListener("resize", resize);
    resize();

    function tick() {
      g.clearRect(0, 0, W, H);
      rY += 0.0018;
      const bd = SP * 0.45;
      for (const n of ns) {
        n.x += n.vx; n.y += n.vy; n.z += n.vz;
        if (Math.abs(n.x) > bd) n.vx *= -0.9;
        if (Math.abs(n.y) > bd) n.vy *= -0.9;
        if (Math.abs(n.z) > bd) n.vz *= -0.9;
      }
      drawEdges(g, ns, rY, rX, W, H);
      drawNodes(g, ns, rY, rX, W, H);
      animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
    />
  );
}
