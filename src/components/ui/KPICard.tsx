import React from 'react';
import { C } from '../../lib/constants';
import { Card } from './Card';
import { StatDelta } from './StatDelta';
import { Sparkline } from './Sparkline';
import { MetricLabel } from './Tooltip';

export const KPICard = ({ label, value, delta, deltaInverse = false, sub, sparkData, color, onClick, tooltip }: any) => (
  <Card onClick={onClick} style={{ 
    padding: "18px 20px", 
    cursor: "pointer", 
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
    border: `1px solid ${C.border}`,
    background: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)"
  }}
  onMouseEnter={(e: any) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
    e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)";
  }}
  onMouseLeave={(e: any) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
    e.currentTarget.style.borderColor = C.border;
  }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase", marginBottom: 10 }}>
        {tooltip ? <MetricLabel label={label} tooltip={tooltip} /> : label}
      </div>
      {delta !== undefined && <StatDelta val={delta} inverse={deltaInverse} />}
    </div>
    <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: color || C.textPrimary, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{sub}</div>}
    {sparkData && (
      <div style={{ marginTop: 14 }}>
        <Sparkline data={sparkData} color={color || C.black} />
      </div>
    )}
  </Card>
);
