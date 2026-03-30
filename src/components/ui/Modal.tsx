import React from 'react';
import { C } from '../../lib/constants';

export const Modal = ({ open, onClose, title, subtitle, children, width = 700, fullscreen = false, nearlyFullscreen = false }: any) => {
  if (!open) return null;
  const expanded = fullscreen || nearlyFullscreen;
  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)", padding: fullscreen ? 0 : 12 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-shell" style={{
        background: C.surface,
        borderRadius: fullscreen ? 0 : (nearlyFullscreen ? 14 : 16),
        width: fullscreen ? "100vw" : (nearlyFullscreen ? "min(1440px, calc(100vw - 24px))" : width),
        height: fullscreen ? "100vh" : (nearlyFullscreen ? "min(960px, calc(100vh - 24px))" : "auto"),
        maxWidth: fullscreen ? "100vw" : (nearlyFullscreen ? "min(1440px, calc(100vw - 24px))" : "95vw"),
        maxHeight: fullscreen ? "100vh" : (nearlyFullscreen ? "min(960px, calc(100vh - 24px))" : "85vh"),
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: fullscreen ? "none" : (nearlyFullscreen ? "0 28px 88px rgba(0,0,0,0.24)" : "0 24px 80px rgba(0,0,0,0.2)"),
        border: fullscreen ? "none" : `1px solid ${C.border}`,
      }}>
        <div style={{ padding: expanded ? "18px 24px" : "22px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: C.surface, zIndex: 1, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: C.textPrimary }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: C.muted, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: C.textSecondary, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px", overflow: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
};
