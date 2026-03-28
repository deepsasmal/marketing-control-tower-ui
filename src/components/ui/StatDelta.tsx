import React from 'react';
import { C } from '../../lib/constants';

export const StatDelta = ({ val, inverse = false }: { val: number, inverse?: boolean }) => {
  const positive = val > 0;
  const good = inverse ? !positive : positive;
  return (
    <span style={{
      fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
      color: good ? C.green : C.red,
      display: "inline-flex", alignItems: "center", gap: 2,
    }}>
      {positive ? "▲" : "▼"} {Math.abs(val)}%
    </span>
  );
};
