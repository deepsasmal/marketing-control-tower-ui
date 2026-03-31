import React from 'react';
import { C } from '../../lib/constants';

export const Card = ({ children, style = {}, onClick, hover = false }: any) => {
  const interactive = Boolean(onClick || hover);
  return (
    <div
      onClick={onClick}
      className={`dashboard-card-shell${interactive ? ' dashboard-card-shell--interactive' : ''}`}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
