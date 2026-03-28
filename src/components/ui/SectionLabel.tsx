import React from 'react';
import { C } from '../../lib/constants';

export const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700, letterSpacing: "0.12em",
    color: C.textMuted, textTransform: "uppercase",
    marginBottom: 10,
    display: "flex", alignItems: "center", gap: 8,
  }}>
    <div style={{ width: 3, height: 12, background: C.black, borderRadius: 2 }} />
    {children}
  </div>
);
