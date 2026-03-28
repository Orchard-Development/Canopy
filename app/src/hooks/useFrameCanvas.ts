import { useRef, useCallback } from "react";

/**
 * Shared frame rendering and coordinate mapping for canvas-based
 * streaming views (browser sessions and desktop mirrors).
 *
 * Handles base64 JPEG frame drawing with requestAnimationFrame
 * batching, blob URL lifecycle, and CSS-to-native coordinate mapping.
 */
export function useFrameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const pendingFrameRef = useRef<string | null>(null);
  const nativeSizeRef = useRef<{ w: number; h: number }>({ w: 800, h: 500 });

  const drawFrame = useCallback((base64Data: string) => {
    pendingFrameRef.current = base64Data;

    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const data = pendingFrameRef.current;
      if (!data || !canvasRef.current) return;
      pendingFrameRef.current = null;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
          nativeSizeRef.current = { w: img.width, h: img.height };
        }
        ctx.drawImage(img, 0, 0);
      };
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      img.src = url;
      img.addEventListener("load", () => URL.revokeObjectURL(url), {
        once: true,
      });
    });
  }, []);

  const mapCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = nativeSizeRef.current.w / rect.width;
      const scaleY = nativeSizeRef.current.h / rect.height;
      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY),
      };
    },
    [],
  );

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  return { canvasRef, drawFrame, mapCoords, nativeSizeRef, cleanup };
}
