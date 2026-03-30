import React from 'react';
import { C } from '../../lib/constants';

export const CardHeader = ({ title, subtitle, right, noBorder = false }: { title: string, subtitle?: string, right?: React.ReactNode, noBorder?: boolean }) => (
  <div style={{
    padding: "14px 18px", display: "flex", alignItems: "center",
    justifyContent: "space-between",
    borderBottom: noBorder ? "none" : `1px solid ${C.border}`,
  }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, fontFamily: "'Outfit', sans-serif" }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
  </div>
);
