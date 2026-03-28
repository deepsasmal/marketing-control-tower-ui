import React from 'react';
import { Skeleton } from './Skeleton';
import { C } from '../../lib/constants';

const cardBase: React.CSSProperties = {
    background: C.surface,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    padding: '18px 20px',
    overflow: 'hidden',
};

const KPISkeleton = ({ delay = 0 }: { delay?: number }) => (
    <div
        className="skeleton-card-in"
        style={{ ...cardBase, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12, minHeight: 120, animationDelay: `${delay}ms` }}
    >
        <Skeleton width="45%" height={10} borderRadius={4} />
        <Skeleton width="60%" height={32} borderRadius={6} />
        <Skeleton width="30%" height={9} borderRadius={4} />
    </div>
);

const ChartSkeleton = ({ delay = 0, showBars = true }: { delay?: number; showBars?: boolean }) => (
    <div
        className="skeleton-card-in"
        style={{ ...cardBase, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 360, animationDelay: `${delay}ms` }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width={140} height={13} borderRadius={4} />
                <Skeleton width={90} height={10} borderRadius={4} />
            </div>
            <Skeleton width={64} height={26} borderRadius={16} />
        </div>

        {showBars ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10, padding: '8px 0 0' }}>
                {[65, 80, 45, 90, 55, 72, 60, 85, 50, 78].map((h, i) => (
                    <Skeleton
                        key={i}
                        style={{ flex: 1, height: `${h}%`, animationDelay: `${i * 60}ms` }}
                        borderRadius={4}
                    />
                ))}
            </div>
        ) : (
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <svg
                    viewBox="0 0 400 200"
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}
                >
                    <polyline
                        points="0,150 40,110 80,130 120,70 160,100 200,50 240,80 280,40 320,65 360,30 400,55"
                        fill="none"
                        stroke={C.textMuted}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} width={32} height={9} borderRadius={4} />
                    ))}
                </div>
            </div>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Skeleton width={8} height={8} borderRadius={999} />
                    <Skeleton width={50} height={9} borderRadius={4} />
                </div>
            ))}
        </div>
    </div>
);

const TableSkeleton = ({ delay = 0 }: { delay?: number }) => (
    <div
        className="skeleton-card-in"
        style={{ ...cardBase, display: 'flex', flexDirection: 'column', gap: 0, minHeight: 400, animationDelay: `${delay}ms` }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton width={160} height={13} borderRadius={4} />
                <Skeleton width={100} height={10} borderRadius={4} />
            </div>
            <Skeleton width={80} height={28} borderRadius={8} />
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 16, padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
                {[120, 70, 80, 60, 70].map((w, i) => (
                    <Skeleton key={i} width={w} height={10} borderRadius={4} />
                ))}
            </div>
            {Array.from({ length: 6 }).map((_, row) => (
                <div
                    key={row}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                        gap: 16,
                        padding: '14px 12px',
                        borderBottom: `1px solid ${C.surfaceAlt}`,
                        animationDelay: `${row * 80}ms`,
                    }}
                >
                    {[160, 60, 80, 55, 65].map((w, col) => (
                        <Skeleton key={col} width={w} height={12} borderRadius={4} />
                    ))}
                </div>
            ))}
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
        <div style={{ gridColumn: 'span 3' }}><KPISkeleton delay={0} /></div>
        <div style={{ gridColumn: 'span 3' }}><KPISkeleton delay={60} /></div>
        <div style={{ gridColumn: 'span 3' }}><KPISkeleton delay={120} /></div>
        <div style={{ gridColumn: 'span 3' }}><KPISkeleton delay={180} /></div>

        <div style={{ gridColumn: 'span 6' }}><ChartSkeleton delay={240} showBars /></div>
        <div style={{ gridColumn: 'span 6' }}><ChartSkeleton delay={300} showBars={false} /></div>

        <div style={{ gridColumn: 'span 12' }}><TableSkeleton delay={360} /></div>
    </div>
);
