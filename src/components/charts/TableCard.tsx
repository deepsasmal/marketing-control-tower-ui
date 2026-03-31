import React from 'react';
import { CardWithData } from '../../types/api';
import { Card } from '../ui/Card';
import { CardHeader } from '../ui/CardHeader';
import { C } from '../../lib/constants';
import { inferQueryFields } from '../../lib/utils';

export const TableCard = ({ card }: { card: CardWithData }) => {
  const { dimensions, measures } = card.cube_query || inferQueryFields(card.data);
  const columns = [...dimensions, ...measures];

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader title={card.title} subtitle={card.subtitle} description={card.description} />
      <div style={{ flex: 1, padding: '16px 18px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col.split('.')[1].replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {card.data.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.surfaceAlt}` }}>
                {columns.map(col => (
                  <td key={col} style={{ padding: '12px', color: C.textPrimary }}>
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
