import React from 'react';
import { CardWithData } from '../../types/api';
import { Card } from '../ui/Card';
import { CardHeader } from '../ui/CardHeader';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { C } from '../../lib/constants';
import { CustomTooltip } from '../ui/CustomTooltip';
import { inferQueryFields } from '../../lib/utils';
import { useChartData } from '../../hooks/useChartData';

export const PieChartCard = ({ card, onDrillDown, globalFilters = [], token = '', dimensionOptions = [] }: any) => {
    const { activeDimension, setActiveDimension, data, loading, currentMeasures } = useChartData(card, globalFilters, token);
    const dimToUse = activeDimension || (card.cube_query || inferQueryFields(card.data)).dimensions[0];
    const measToUse = currentMeasures[0];

    const chartData = data.map((row: any) => ({
        name: row[dimToUse] === null ? "Unassigned" : String(row[dimToUse]),
        value: parseFloat(row[measToUse]) || 0,
        originalRow: row
    }));

    const COLORS = [C.blue, C.green, C.amber, C.purple, '#0ea5e9', '#f97316', '#ef4444', '#8b5cf6'];
    const isDonut = card.chart_type === 'donut';

    const rightAction = dimensionOptions.length > 0 ? (
        <select value={activeDimension} onChange={e => setActiveDimension(e.target.value)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, color: C.textPrimary, outline: 'none', cursor: 'pointer' }}>
            {dimensionOptions.map((opt: any) => <option key={opt.name} value={opt.name}>{opt.shortTitle}</option>)}
        </select>
    ) : null;

    return (
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardHeader title={card.title} subtitle={card.subtitle} right={rightAction} />
            <div style={{ flex: 1, padding: '16px 18px', minHeight: 250, position: 'relative' }}>
                {loading && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.5)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-pulse" style={{ fontSize: 13, color: C.textMuted }}>Updating...</div></div>}
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={isDonut ? 60 : 0}
                            outerRadius={80}
                            paddingAngle={isDonut ? 2 : 0}
                            dataKey="value"
                            stroke={C.surface}
                            strokeWidth={2}
                            onClick={(entry: any) => onDrillDown && onDrillDown(card, entry.payload.originalRow)}
                            style={{ cursor: onDrillDown ? 'pointer' : 'default', outline: 'none' }}
                        >
                            {chartData.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip prefix={card.value_prefix || ''} suffix={card.value_suffix || ''} />} />
                        {card.show_legend && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: "'Inter', sans-serif" }} />}
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};
