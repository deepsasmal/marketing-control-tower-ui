import React from 'react';
import { CardWithData } from '../../types/api';
import { C } from '../../lib/constants';
import { Card } from '../ui/Card';
import { MetricLabel } from '../ui/Tooltip';
import { inferQueryFields } from '../../lib/utils';

function formatKPI(raw: string, prefix?: string | null, suffix?: string | null): string {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;

  let formatted: string;
  if (Math.abs(n) >= 1_000_000) {
    formatted = `${(n / 1_000_000).toFixed(1)}M`;
  } else if (Math.abs(n) >= 1_000) {
    formatted = `${(n / 1_000).toFixed(1)}K`;
  } else {
    formatted = n.toFixed(1);
  }

  return `${prefix ?? ''}${formatted}${suffix ?? ''}`;
}

function getKpiColor(colorScheme?: string): string {
  const map: Record<string, string> = {
    default: C.textPrimary,
    blue: C.blue,
    green: C.green,
    red: C.red,
    purple: C.purple,
    orange: C.amber,
    teal: '#0d9488',
  };
  return map[colorScheme || ''] || C.textPrimary;
}

export const KPITile = ({ card, onDrillDown }: { card: CardWithData, onDrillDown?: (card: CardWithData, row: any) => void }) => {
  const { measures } = card.cube_query || inferQueryFields(card.data);
  const rawValue = card.data[0]?.[measures[0]] || "0";
  const displayValue = formatKPI(rawValue, card.value_prefix, card.value_suffix);

  // Base KPI color follows selected color scheme in the builder.
  // Alert thresholds still override this to signal warning/error states.
  let color = getKpiColor(card.color_scheme);
  if (card.metadata.alert_threshold_below !== undefined && parseFloat(rawValue) < card.metadata.alert_threshold_below) color = C.red;
  if (card.metadata.alert_threshold_above !== undefined && parseFloat(rawValue) > card.metadata.alert_threshold_above) color = C.amber;

  return (
    <Card
      style={{ padding: "18px 20px", height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: onDrillDown ? 'pointer' : 'default' }}
      onClick={() => onDrillDown && onDrillDown(card, {
        row: card.data[0],
        activeDimension: (card.cube_query || inferQueryFields(card.data)).dimensions?.[0],
        currentMeasures: measures,
        sourceChartType: 'kpi',
      })}
    >
      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, textTransform: "uppercase", marginBottom: 10 }}>
        {card.description ? <MetricLabel label={card.title} tooltip={card.description} /> : card.title}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
        {displayValue}
      </div>
      {card.subtitle && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{card.subtitle}</div>}
    </Card>
  );
};
