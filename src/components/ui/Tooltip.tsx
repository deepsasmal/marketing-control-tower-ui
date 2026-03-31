import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { C } from '../../lib/constants';

export const Tooltip = ({ content, children }: { content: React.ReactNode, children: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top - 10,
      left: rect.left + rect.width / 2,
    });
  };

  useEffect(() => {
    if (!show) return;
    updatePosition();
    const onChange = () => updatePosition();
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
  }, [show]);

  const tooltipNode = useMemo(() => {
    if (!show) return null;
    return (
      <div style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: 'translate(-50%, -100%)',
        background: C.surface,
        backdropFilter: 'blur(8px)',
        color: C.textPrimary,
        padding: '10px 12px',
        borderRadius: '10px',
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'normal',
        maxWidth: 320,
        minWidth: 180,
        zIndex: 2000,
        boxShadow: '0 14px 32px rgba(0,0,0,0.14)',
        pointerEvents: 'none',
        border: `1px solid ${C.border}`,
      }}>
        {content}
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '6px',
          borderStyle: 'solid',
          borderColor: `${C.surface} transparent transparent transparent`,
        }} />
      </div>
    );
  }, [show, coords, content]);

  return (
    <div
      ref={anchorRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && typeof document !== 'undefined' ? createPortal(tooltipNode, document.body) : null}
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

export const InfoTooltipButton = ({ tooltip }: { tooltip: string }) => (
  <Tooltip content={tooltip}>
    <button
      type="button"
      aria-label="More information"
      style={{
        width: 20,
        height: 20,
        borderRadius: 999,
        border: `1px solid ${C.border}`,
        background: C.surfaceAlt,
        color: C.textMuted,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help',
        padding: 0,
      }}
    >
      <Info size={12} />
    </button>
  </Tooltip>
);
