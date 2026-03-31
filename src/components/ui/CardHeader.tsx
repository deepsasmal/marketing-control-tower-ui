import React from 'react';
import { C } from '../../lib/constants';
import { InfoTooltipButton } from './Tooltip';

export const CardHeader = ({ title, subtitle, right, noBorder = false, description }: { title: string, subtitle?: string, right?: React.ReactNode, noBorder?: boolean, description?: string | null }) => (
  <div style={{
    padding: "14px 18px", display: "flex", alignItems: "center",
    justifyContent: "space-between",
    borderBottom: noBorder ? "none" : `1px solid ${C.border}`,
    background: noBorder ? 'transparent' : 'linear-gradient(180deg, rgba(250,251,255,0.95) 0%, rgba(255,255,255,0.75) 100%)',
  }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 650, color: C.textPrimary, fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{subtitle}</div>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {description ? <InfoTooltipButton tooltip={description} /> : null}
      {right}
    </div>
  </div>
);
