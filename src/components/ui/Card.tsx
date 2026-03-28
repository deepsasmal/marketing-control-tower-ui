import React from 'react';
import { C } from '../../lib/constants';

export const Card = ({ children, style = {}, onClick, hover = false }: any) => (
  <div
    onClick={onClick}
    style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, overflow: "hidden",
      transition: "box-shadow 0.2s, border-color 0.2s",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
    onMouseEnter={e => { if (onClick || hover) { e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.09)"; e.currentTarget.style.borderColor = "#c8c8d8"; } }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = C.border; }}
  >
    {children}
  </div>
);
