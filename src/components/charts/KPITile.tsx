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

const BUCKET_COLOR: Record<string, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
};

function formatTarget(value: number, unit: string): string {
  if (unit === 'currency') return formatKPI(String(value), '$', null);
  if (unit === 'percent')  return formatKPI(String(value), null, '%');
  return formatKPI(String(value), null, null);
}

export const KPITile = ({ card, onDrillDown }: { card: CardWithData, onDrillDown?: (card: CardWithData, row: any) => void }) => {
  const { measures } = card.cube_query || inferQueryFields(card.data);
  const rawValue = card.data[0]?.[measures[0]] || "0";
  const displayValue = formatKPI(rawValue, card.value_prefix, card.value_suffix);
  const showTrend = !!card.metadata?.show_trend && card.trend_pct !== null;
  const trend = getTrendPresentation(card.trend_direction);

  // kpi_color_bucket from API takes precedence; fall back to legacy alert thresholds, then color scheme.
  let color = getKpiColor(card.color_scheme);
  if (card.kpi_color_bucket) {
    color = BUCKET_COLOR[card.kpi_color_bucket] ?? color;
  } else {
    if (card.metadata.alert_threshold_below !== undefined && parseFloat(rawValue) < card.metadata.alert_threshold_below) color = C.red;
    if (card.metadata.alert_threshold_above !== undefined && parseFloat(rawValue) > card.metadata.alert_threshold_above) color = C.amber;
  }

  const showProgress = card.kpi_target_progress !== null && card.kpi_target_progress !== undefined;
  const progressPct  = showProgress ? Math.min(100, Math.max(0, card.kpi_target_progress!)) : 0;
  const progressColor = card.kpi_color_bucket ? (BUCKET_COLOR[card.kpi_color_bucket] ?? C.blue) : C.blue;
  const targetValue   = card.metadata?.target;
  const targetUnit    = card.metadata?.unit ?? 'number';

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

      {showProgress && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: C.border, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 999, background: progressColor, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'Inter', sans-serif", minWidth: 30, textAlign: 'right' }}>
              {progressPct.toFixed(0)}%
            </span>
          </div>
          {targetValue !== undefined && targetValue !== null && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, fontFamily: "'Inter', sans-serif" }}>
              of {formatTarget(Number(targetValue), targetUnit)} target
            </div>
          )}
        </div>
      )}

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
