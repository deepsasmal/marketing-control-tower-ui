import React from 'react';
import { CardWithData } from '../../types/api';
import { Card } from '../ui/Card';
import { CardHeader } from '../ui/CardHeader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { C } from '../../lib/constants';
import { CustomTooltip } from '../ui/CustomTooltip';
import { useChartData } from '../../hooks/useChartData';

export const LineChartCard = ({ card, onDrillDown, globalFilters = [], token = '', dimensionOptions = [] }: any) => {
  const { activeDimension, setActiveDimension, data, loading, currentMeasures } = useChartData(card, globalFilters, token);

  const chartData = data.map((row: any) => {
    const timeKey = Object.keys(row).find(k => !currentMeasures.includes(k) && k !== 'date') || Object.keys(row)[0];
    const dateVal = row[timeKey];
    const dateStr = dateVal ? new Date(dateVal).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '';

    const dataPoint: any = { date: dateStr, originalRow: row };
    currentMeasures.forEach((m: string) => {
      dataPoint[m.split('.')[1] || m] = parseFloat(row[m]);
    });
    return dataPoint;
  });

  const lines = currentMeasures.map((m: string, i: number) => ({
    dataKey: m.split('.')[1] || m,
    name: m.split('.')[1]?.replace(/_/g, ' ') || m,
    color: [C.black, C.blue, C.green, C.purple, C.amber][i % 5]
  }));

  const rightAction = dimensionOptions.length > 0 ? (
    <select value={activeDimension} onChange={e => setActiveDimension(e.target.value)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, color: C.textPrimary, outline: 'none', cursor: 'pointer' }}>
      {dimensionOptions.map((opt: any) => <option key={opt.name} value={opt.name}>{opt.shortTitle}</option>)}
    </select>
  ) : null;

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title={card.title} subtitle={card.subtitle} right={rightAction} />
      <div style={{ flex: 1, padding: '16px 18px', minHeight: 200, position: 'relative' }}>
        {loading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-pulse" style={{ fontSize: 13, color: C.textMuted }}>Updating...</div></div>}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `${card.value_prefix || ''}${v}${card.value_suffix || ''}`} />
            <Tooltip content={<CustomTooltip prefix={card.value_prefix || ''} suffix={card.value_suffix || ''} />} />
            {card.show_legend && <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} />}
            {lines.map((l: any) => (
              <Line
                key={l.dataKey} type="monotone" dataKey={l.dataKey} name={l.name} stroke={l.color} strokeWidth={2}
                dot={{ r: 3, fill: l.color }}
                activeDot={{ r: 6, cursor: onDrillDown ? 'pointer' : 'default', onClick: (e: any) => onDrillDown && onDrillDown(card, e.payload.originalRow) }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
