import React from 'react';
import { C } from '../../lib/constants';

export const Modal = ({ open, onClose, title, subtitle, children, width = 700, fullscreen = false, nearlyFullscreen = false }: any) => {
  if (!open) return null;
  const expanded = fullscreen || nearlyFullscreen;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: C.surface,
        borderRadius: fullscreen ? 0 : (nearlyFullscreen ? 14 : 16),
        width: fullscreen ? "100vw" : (nearlyFullscreen ? "96vw" : width),
        height: fullscreen ? "100vh" : (nearlyFullscreen ? "94vh" : "auto"),
        maxWidth: fullscreen ? "100vw" : (nearlyFullscreen ? "96vw" : "95vw"),
        maxHeight: fullscreen ? "100vh" : (nearlyFullscreen ? "94vh" : "85vh"),
        overflow: "auto",
        boxShadow: fullscreen ? "none" : (nearlyFullscreen ? "0 28px 88px rgba(0,0,0,0.24)" : "0 24px 80px rgba(0,0,0,0.2)"),
        border: fullscreen ? "none" : `1px solid ${C.border}`,
        animation: "fadeUp 0.2s ease",
      }}>
        <div style={{ padding: expanded ? "18px 24px" : "22px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.textPrimary }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: C.muted, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: C.textSecondary, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px" }}>{children}</div>
      </div>
    </div>
  );
};
