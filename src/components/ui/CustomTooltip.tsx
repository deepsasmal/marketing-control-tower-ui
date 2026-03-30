import React from 'react';
import { C } from '../../lib/constants';

export const ChartTooltipStyle = {
  background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 8, padding: "8px 12px",
  fontSize: 11, fontFamily: "'Inter', sans-serif",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
};

export const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "" }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={ChartTooltipStyle}>
      <div style={{ color: C.textMuted, marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: C.textPrimary, display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: p.color || C.textSecondary }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{prefix}{typeof p.value === "number" ? p.value.toLocaleString() : p.value}{suffix}</span>
        </div>
      ))}
    </div>
  );
};
