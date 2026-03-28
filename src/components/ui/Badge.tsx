import React from 'react';
import { C } from '../../lib/constants';

export const Badge = ({ label, variant = "default", dot = false }: { label: string, variant?: string, dot?: boolean }) => {
  const styles: Record<string, any> = {
    default: { bg: C.muted, color: C.textSecondary, border: C.border },
    live: { bg: C.greenLight, color: C.green, border: "#bbf7d0" },
    warning: { bg: C.amberLight, color: C.amber, border: "#fde68a" },
    paused: { bg: C.muted, color: C.textMuted, border: C.border },
    error: { bg: C.redLight, color: C.red, border: "#fecaca" },
    info: { bg: C.blueLight, color: C.blue, border: "#bfdbfe" },
    ml: { bg: C.purpleLight, color: C.purple, border: "#ddd6fe" },
    success: { bg: C.greenLight, color: C.green, border: "#bbf7d0" },
  };
  const s = styles[variant] || styles.default;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 6,
      fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 600, letterSpacing: "0.04em",
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block" }} />}
      {label}
    </span>
  );
};
