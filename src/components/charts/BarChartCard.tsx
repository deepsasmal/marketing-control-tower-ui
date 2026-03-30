import React from 'react';
import { CardWithData } from '../../types/api';
import { Card } from '../ui/Card';
import { CardHeader } from '../ui/CardHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { inferQueryFields } from '../../lib/utils';
import { useChartData } from '../../hooks/useChartData';
import { C } from '../../lib/constants';
import { CustomTooltip } from '../ui/CustomTooltip';

export const BarChartCard = ({ card, onDrillDown, globalFilters = [], token = '', dimensionOptions = [] }: any) => {
  const { activeDimension, setActiveDimension, data, loading, currentMeasures } = useChartData(card, globalFilters, token);

  const dimToUse = activeDimension || (card.cube_query || inferQueryFields(card.data)).dimensions[0];
  const measToUse = currentMeasures[0];

  const chartData = data.map((row: any) => ({
    name: row[dimToUse] === null ? "Unassigned" : row[dimToUse],
    value: parseFloat(row[measToUse]),
    originalRow: row
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
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted, fontFamily: "'Inter', sans-serif", fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: C.textMuted, fontFamily: "'Inter', sans-serif", fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={v => `${card.value_prefix || ''}${v}${card.value_suffix || ''}`} />
            <Tooltip content={<CustomTooltip prefix={card.value_prefix || ''} suffix={card.value_suffix || ''} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar
              dataKey="value"
              fill={(C as any)[card.color_scheme] || C.blue}
              radius={[4, 4, 0, 0]}
              onClick={(entry) => onDrillDown && onDrillDown(card, {
                row: entry.originalRow,
                activeDimension: dimToUse,
                currentMeasures,
                sourceChartType: 'bar',
              })}
              style={{ cursor: onDrillDown ? 'pointer' : 'default' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
