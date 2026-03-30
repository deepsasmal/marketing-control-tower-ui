import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../ui/Card';
import { CardHeader } from '../ui/CardHeader';
import { Skeleton } from '../ui/Skeleton';
import { C } from '../../lib/constants';
import { CardWithData } from '../../types/api';

type DrilldownViewProps = {
  card: CardWithData;
  loading: boolean;
  error: string;
  rows: any[];
  measures: string[];
  sourceDimension?: string;
  targetDimension?: string;
  availableDimensions: string[];
  clickedValue?: string | null;
  onSelectDimension: (dimension: string) => void;
  onBack: () => void;
  onRetry: () => void;
  frameless?: boolean;
};

const SERIES_COLORS = [C.blue, C.green, C.purple, C.amber, C.black];

const shortKey = (member: string) => member.split('.').pop() || member;

function resolveMemberKey(row: any, member: string): string {
  if (!row) return member;
  if (Object.prototype.hasOwnProperty.call(row, member)) return member;
  const short = shortKey(member);
  const found = Object.keys(row).find(k => shortKey(k) === short);
  return found || member;
}

function isTimeLikeDimension(dim: string): boolean {
  const v = dim.toLowerCase();
  return ['date', 'time', 'month', 'year', 'week', 'quarter'].some(t => v.includes(t));
}

function shortLabel(v: string, max = 18): string {
  if (!v) return '';
  return v.length > max ? `${v.slice(0, max)}...` : v;
}

export const DrilldownView = ({
  card,
  loading,
  error,
  rows,
  measures,
  sourceDimension,
  targetDimension,
  availableDimensions,
  clickedValue,
  onSelectDimension,
  onBack,
  onRetry,
  frameless = false,
}: DrilldownViewProps) => {
  const preview = rows?.[0] || null;

  const resolvedMeasureKeys = useMemo(
    () => measures.map(m => resolveMemberKey(preview, m)),
    [measures, preview],
  );

  const inferredDimensionKeys = useMemo(() => {
    if (!preview) return [];
    return Object.keys(preview).filter(k => !resolvedMeasureKeys.includes(k));
  }, [preview, resolvedMeasureKeys]);

  const primaryDimension = useMemo(() => {
    if (!preview) return targetDimension || '';
    if (targetDimension) return resolveMemberKey(preview, targetDimension);
    return inferredDimensionKeys[0] || '';
  }, [preview, targetDimension, inferredDimensionKeys]);

  const chartData = useMemo(
    () => (rows || []).map((row: any, idx: number) => {
      const point: any = {
        name: primaryDimension ? String(row?.[primaryDimension] ?? 'Unassigned') : `Row ${idx + 1}`,
      };
      measures.forEach((m, i) => {
        const key = resolvedMeasureKeys[i] || m;
        point[m] = Number(row?.[key] ?? 0);
      });
      return point;
    }),
    [rows, primaryDimension, measures, resolvedMeasureKeys],
  );

  const showBar = primaryDimension && measures.length === 1 && !isTimeLikeDimension(primaryDimension);
  const showLine = primaryDimension && (measures.length > 1 || isTimeLikeDimension(primaryDimension));

  const header = (
    <CardHeader
      title={`${card.title} — Drilldown`}
      subtitle={
        sourceDimension
          ? `${shortKey(sourceDimension)}${clickedValue ? ` = ${shortLabel(String(clickedValue), 28)}` : ''}`
          : 'Detailed breakdown'
      }
      right={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {availableDimensions.length > 0 && (
            <select
              value={targetDimension || ''}
              onChange={e => onSelectDimension(e.target.value)}
              style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 8, padding: '4px 8px', fontSize: 11, color: C.textPrimary, maxWidth: 190 }}
              title="Choose drill-down dimension"
            >
              {availableDimensions.map(d => (
                <option key={d} value={d}>{shortKey(d).replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
          <button
            onClick={onBack}
            title="Back to original card"
            aria-label="Back to original card"
            style={{
              width: 30,
              height: 30,
              border: `1px solid ${C.border}`,
              background: C.surfaceAlt,
              borderRadius: 8,
              cursor: 'pointer',
              color: C.textPrimary,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
          </button>
        </div>
      )}
    />
  );

  const content = (
    <div style={{ flex: 1, padding: frameless ? '10px 2px 2px 2px' : '14px 16px', minHeight: 220 }}>
        {loading ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <Skeleton height={14} width="45%" />
            <Skeleton height={180} />
            <Skeleton height={12} width="30%" />
          </div>
        ) : error ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ color: C.red, background: C.redLight, border: `1px solid ${C.red}`, borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
              {error}
            </div>
            <div>
              <button
                onClick={onRetry}
                style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 12, paddingTop: 18 }}>
            No detailed rows available for this selection.
          </div>
        ) : showBar ? (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted }} tickFormatter={(v: any) => shortLabel(String(v), 12)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey={measures[0]} fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : showLine ? (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted }} tickFormatter={(v: any) => shortLabel(String(v), 12)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip />
                {measures.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
                {measures.map((m, i) => (
                  <Line key={m} type="monotone" dataKey={m} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 260 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
              <thead>
                <tr>
                  {Object.keys(rows[0]).slice(0, 7).map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: `1px solid ${C.border}`, color: C.textMuted }}>
                      {shortKey(col).replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.surfaceAlt}` }}>
                    {Object.keys(rows[0]).slice(0, 7).map(col => (
                      <td key={col} style={{ padding: '8px 10px', color: C.textPrimary }}>
                        {r[col] === null || r[col] === undefined ? '—' : String(r[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );

  return frameless ? (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {header}
      {content}
    </div>
  ) : (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {header}
      {content}
    </Card>
  );
};
