import type { CSSProperties } from "react";

export const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#050510",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  color: "#e0e0e0",
};

export const card: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "48px 56px",
  borderRadius: 24,
  background: "color-mix(in srgb, #0a1228 45%, transparent)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid color-mix(in srgb, #1a6aff 12%, transparent)",
  boxShadow: "0 0 60px color-mix(in srgb, #1a6aff 8%, transparent), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 color-mix(in srgb, #4aa0ff 8%, transparent)",
  width: 360,
  maxWidth: "90vw",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  fontSize: 15,
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, #1a6aff 20%, transparent)",
  background: "rgba(10,18,40,0.8)",
  color: "#e0e0e0",
  marginBottom: 10,
  outline: "none",
};

export const btnPrimary: CSSProperties = {
  width: "100%",
  padding: "10px 0",
  borderRadius: 8,
  background: "#1a6aff",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 500,
  marginBottom: 8,
};

export const btnSecondary: CSSProperties = {
  width: "100%",
  padding: "10px 0",
  borderRadius: 8,
  background: "rgba(255,255,255,0.07)",
  color: "#e0e0e0",
  border: "1px solid color-mix(in srgb, #1a6aff 20%, transparent)",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 500,
  marginBottom: 8,
};

export const errBox: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  background: "rgba(244,67,54,0.12)",
  border: "1px solid rgba(244,67,54,0.3)",
  color: "#ff8888",
  fontSize: 13,
  marginBottom: 10,
};

export const successBox: CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  background: "rgba(76,175,80,0.12)",
  border: "1px solid rgba(76,175,80,0.3)",
  color: "#81c784",
  fontSize: 13,
  marginBottom: 10,
};

export const dividerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  margin: "12px 0",
  gap: 8,
  color: "rgba(224,224,224,0.35)",
  fontSize: 12,
};

export const linkBtn: CSSProperties = {
  background: "none",
  border: "none",
  color: "#4aa0ff",
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
};
