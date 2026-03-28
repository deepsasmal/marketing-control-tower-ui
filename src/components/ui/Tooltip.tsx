import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { C } from '../../lib/constants';

export const Tooltip = ({ content, children }: { content: React.ReactNode, children: React.ReactNode }) => {
  const [show, setShow] = useState(false);

  return (
    <div 
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%) translateY(-8px)',
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {content}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderWidth: '5px',
            borderStyle: 'solid',
            borderColor: 'rgba(10, 10, 10, 0.95) transparent transparent transparent'
          }} />
        </div>
      )}
    </div>
  );
};

export const MetricLabel = ({ label, tooltip }: { label: string, tooltip: string }) => (
  <Tooltip content={tooltip}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
      <span>{label}</span>
      <Info size={12} color={C.textMuted} />
    </div>
  </Tooltip>
);
