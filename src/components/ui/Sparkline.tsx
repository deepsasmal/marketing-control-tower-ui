import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { C } from '../../lib/constants';

export const Sparkline = ({ data, color = C.black, height = 32 }: { data: any[], color?: string, height?: number }) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);
