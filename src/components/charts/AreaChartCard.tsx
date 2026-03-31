import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { CardHeader } from '../ui/CardHeader';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { C } from '../../lib/constants';
import { CustomTooltip } from '../ui/CustomTooltip';
import { useChartData } from '../../hooks/useChartData';
import { formatValueWithAffixes } from '../../lib/numberFormat';

const PALETTE = [C.blue, C.green, C.purple, C.amber, C.black];

function buildDateFormatter(rawDates: string[]) {
  const parsed = rawDates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
  if (parsed.length === 0) return (v: string) => v;

  const years = new Set(parsed.map(d => d.getFullYear()));
  const spanDays = parsed.length > 1
    ? (parsed[parsed.length - 1].getTime() - parsed[0].getTime()) / 86_400_000
    : 0;

  return (raw: string): string => {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;

    // Daily granularity: "Jan 5"
    if (spanDays <= 90) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    // Same year across all ticks: "Jan", "Feb" — no redundant year
    if (years.size === 1) {
      return d.toLocaleDateString('en-US', { month: 'short' });
    }
    // Multi-year: "Jan '25"
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };
}

export const AreaChartCard = ({ card, onDrillDown, globalFilters = [], token = '', dimensionOptions = [] }: any) => {
  const { activeDimension, setActiveDimension, data, loading, currentMeasures } = useChartData(card, globalFilters, token);

  const chartData = useMemo(() => data.map((row: any) => {
    const timeKey =
      Object.keys(row).find(k => !currentMeasures.includes(k) && k !== 'date') ||
      Object.keys(row)[0];
    const rawDate = row[timeKey] ?? '';

    const point: any = { _rawDate: rawDate, originalRow: row };
    currentMeasures.forEach((m: string) => {
      point[m.split('.')[1] || m] = parseFloat(row[m]);
    });
    return point;
  }), [data, currentMeasures]);

  const formatDate = useMemo(
    () => buildDateFormatter(chartData.map((d: any) => d._rawDate).filter(Boolean)),
    [chartData],
  );

  // Show at most ~7 ticks; recharts interval is "show every Nth tick"
  const tickInterval = Math.max(0, Math.ceil(chartData.length / 7) - 1);

  const series = currentMeasures.map((m: string, i: number) => ({
    dataKey: m.split('.')[1] || m,
    name: (m.split('.')[1] || m).replace(/_/g, ' '),
    color: PALETTE[i % PALETTE.length],
    gradientId: `areaGrad-${card.id}-${i}`,
  }));
  const showLegend = !!card.show_legend && series.length > 1;

  const rightAction = dimensionOptions.length > 0 ? (
    <select
      value={activeDimension}
      onChange={e => setActiveDimension(e.target.value)}
      style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 4,
        border: `1px solid ${C.border}`, background: C.surface,
        color: C.textPrimary, outline: 'none', cursor: 'pointer',
      }}
    >
      {dimensionOptions.map((opt: any) => (
        <option key={opt.name} value={opt.name}>{opt.shortTitle}</option>
      ))}
    </select>
  ) : null;

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title={card.title} subtitle={card.subtitle} description={card.description} right={rightAction} />
      <div style={{ flex: 1, padding: '16px 18px', minHeight: 200, position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)',
            zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="animate-pulse" style={{ fontSize: 13, color: C.textMuted }}>Updating...</div>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: showLegend ? 58 : 26, left: 10 }}>
            <defs>
              {series.map(s => (
                <linearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />

            <XAxis
              dataKey="_rawDate"
              tickFormatter={formatDate}
              interval={tickInterval}
              minTickGap={48}
              tick={{
                fontSize: 11,
                fill: C.textMuted,
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
              }}
              axisLine={false}
              tickLine={false}
              dy={6}
              label={card.x_axis_label ? { value: card.x_axis_label, position: 'insideBottom', offset: -12, fill: C.textSecondary, fontSize: 11 } : undefined}
            />

            <YAxis
              tick={{
                fontSize: 10,
                fill: C.textMuted,
                fontFamily: "'Inter', sans-serif",
              }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => formatValueWithAffixes(v, card.value_prefix || '', card.value_suffix || '')}
              width={48}
              label={card.y_axis_label ? { value: card.y_axis_label, angle: -90, position: 'insideLeft', offset: -2, fill: C.textSecondary, fontSize: 11 } : undefined}
            />

            <Tooltip
              content={<CustomTooltip prefix={card.value_prefix || ''} suffix={card.value_suffix || ''} />}
            />

            {showLegend && (
              <Legend
                iconType="circle"
                iconSize={7}
                verticalAlign="bottom"
                height={28}
                wrapperStyle={{ fontSize: 11, fontFamily: "'Inter', sans-serif", paddingTop: 2 }}
              />
            )}

            {series.map(s => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#${s.gradientId})`}
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: C.surface,
                  fill: s.color,
                  cursor: onDrillDown ? 'pointer' : 'default',
                  onClick: (_: any, payload: any) =>
                    onDrillDown && onDrillDown(card, {
                      row: payload?.payload?.originalRow,
                      activeDimension,
                      currentMeasures,
                      sourceChartType: 'area',
                    }),
                }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
