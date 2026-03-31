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
    background: "linear-gradient(180deg, #ffffff 0%, #fcfcfe 100%)"
  }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: "0.05em", color: C.textMuted, textTransform: "uppercase", marginBottom: 10 }}>
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
