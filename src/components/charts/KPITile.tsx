import React from 'react';
import { CardWithData } from '../../types/api';
import { C } from '../../lib/constants';
import { Card } from '../ui/Card';
import { InfoTooltipButton } from '../ui/Tooltip';
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

function getTrendPresentation(direction: CardWithData['trend_direction']) {
  if (direction === 'up') return { icon: '↑', color: C.green };
  if (direction === 'down') return { icon: '↓', color: C.red };
  return { icon: '—', color: C.textMuted };
}

export const KPITile = ({ card, onDrillDown }: { card: CardWithData, onDrillDown?: (card: CardWithData, row: any) => void }) => {
  const { measures } = card.cube_query || inferQueryFields(card.data);
  const rawValue = card.data[0]?.[measures[0]] || "0";
  const displayValue = formatKPI(rawValue, card.value_prefix, card.value_suffix);
  const showTrend = !!card.metadata?.show_trend && card.trend_pct !== null;
  const trend = getTrendPresentation(card.trend_direction);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <div style={{ fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: "0.04em", color: C.textMuted, textTransform: "uppercase" }}>
          {card.title}
        </div>
        {card.description ? <InfoTooltipButton tooltip={card.description} /> : null}
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, fontFamily: "'Outfit', sans-serif", color, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
        {displayValue}
      </div>
      {showTrend && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: trend.color }}>
          <span>{trend.icon} {Math.abs(card.trend_pct || 0).toFixed(1)}%</span>
          {card.trend_label ? <span style={{ color: C.textMuted, fontWeight: 500 }}>{card.trend_label}</span> : null}
        </div>
      )}
      {card.subtitle && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{card.subtitle}</div>}
    </Card>
  );
};
