import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchDashboards, fetchDashboardData, fetchCubeMetadata, fetchDrilldowns, fetchAnalyticsQuery } from '../api';
import { DashboardListItem, DashboardDataResponse, CardWithData, CubeDetail } from '../types/api';
import { C } from '../lib/constants';
import { KPITile } from './charts/KPITile';
import { BarChartCard } from './charts/BarChartCard';
import { LineChartCard } from './charts/LineChartCard';
import { TableCard } from './charts/TableCard';
import { PieChartCard } from './charts/PieChartCard';
import { AreaChartCard } from './charts/AreaChartCard';
import { AgentPanel } from './AgentPanel';
import {
  Sparkles, LogOut, X, TrendingUp, Filter, Megaphone, Package,
  Building2, Activity, LayoutDashboard, PieChart, DollarSign, Users, BarChart3, PenSquare, RefreshCw,
} from 'lucide-react';
import { inferQueryFields } from '../lib/utils';
import { Modal } from './ui/Modal';
import { Skeleton } from './ui/Skeleton';
import { DashboardSkeleton } from './ui/DashboardSkeleton';
import { DashboardBuilderModal } from './DashboardBuilderModal';

// ── Icon mapping for dashboard tabs ───────────────────────────────────────
function getTabIcon(d: DashboardListItem): React.ElementType {
  const name = d.name.toLowerCase();
  const icon = (d.icon ?? '').toLowerCase();

  const ICON_MAP: Record<string, React.ElementType> = {
    'bar-chart': BarChart3, 'bar_chart': BarChart3,
    'trending-up': TrendingUp, 'trending_up': TrendingUp,
    'funnel': Filter, 'filter': Filter,
    'megaphone': Megaphone, 'campaign': Megaphone,
    'package': Package, 'product': Package,
    'building': Building2, 'building2': Building2,
    'activity': Activity, 'pie-chart': PieChart,
    'dollar': DollarSign, 'users': Users,
  };
  if (ICON_MAP[icon]) return ICON_MAP[icon];

  if (name.includes('sales') || name.includes('pipeline') || name.includes('revenue')) return TrendingUp;
  if (name.includes('marketing') || name.includes('funnel')) return Filter;
  if (name.includes('campaign') || name.includes('performance')) return Megaphone;
  if (name.includes('product')) return Package;
  if (name.includes('account') || name.includes('intelligence')) return Building2;
  if (name.includes('customer') || name.includes('churn')) return Users;
  if (name.includes('revenue') || name.includes('dollar')) return DollarSign;
  return LayoutDashboard;
}

export const Dashboard = ({ token, onLogout }: { token: string; onLogout: () => void }) => {
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAgent, setShowAgent] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [globalFilters, setGlobalFilters] = useState<any[]>([]);

  // Map of cube name → full CubeDetail (measures + dimensions), fetched per unique cube
  const [cubeMetaMap, setCubeMetaMap] = useState<Record<string, CubeDetail>>({});

  // Filter builder state
  const [filterMember, setFilterMember] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const filterValueRef = useRef<HTMLInputElement>(null);

  const [drillState, setDrillState] = useState<{
    open: boolean; card: CardWithData | null; row: any | null;
    data: any[] | null; loading: boolean; error: string;
  }>({ open: false, card: null, row: null, data: null, loading: false, error: '' });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const refreshDashboardList = async (preferredSlug: string | null = activeSlug) => {
    const data = await fetchDashboards(token);
    setDashboards(data);
    if (data.length === 0) {
      setActiveSlug(null);
      return;
    }
    if (preferredSlug && data.some(d => d.slug === preferredSlug)) {
      setActiveSlug(preferredSlug);
      return;
    }
    setActiveSlug(data[0].slug);
  };

  useEffect(() => {
    setLoading(true);
    refreshDashboardList(activeSlug)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!activeSlug) return;
    setLoading(true);
    fetchDashboardData(activeSlug, token)
      .then(setDashboardData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [activeSlug, token]);

  const handleRefreshData = async () => {
    if (!activeSlug) return;
    setRefreshing(true);
    setError('');
    try {
      const data = await fetchDashboardData(activeSlug, token);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  // When dashboard data loads, fetch cube metadata for every unique cube used by cards.
  // This replaces the old single-`primary_cube` approach and supports multi-cube dashboards.
  useEffect(() => {
    if (!dashboardData) return;

    const uniqueCubes = new Set<string>();
    dashboardData.cards.forEach(card => {
      const measures = card.cube_query?.measures ?? [];
      measures.forEach(m => {
        const cube = m.split('.')[0];
        if (cube) uniqueCubes.add(cube);
      });
    });
    if (dashboardData.metadata?.primary_cube) {
      uniqueCubes.add(dashboardData.metadata.primary_cube);
    }

    uniqueCubes.forEach(cube => {
      // Skip cubes we've already fetched
      if (cubeMetaMap[cube]) return;
      fetchCubeMetadata(cube, token)
        .then(meta => setCubeMetaMap(prev => ({ ...prev, [cube]: meta })))
        .catch(err => console.warn(`Cube metadata unavailable for ${cube}:`, err.message));
    });
  }, [dashboardData, token]);

  // ── Drill-down ─────────────────────────────────────────────────────────────

  const handleDrillDown = async (card: CardWithData, clickedRow: any) => {
    setDrillState({ open: true, card, row: clickedRow, data: null, loading: true, error: '' });

    try {
      const { dimensions, measures } = card.cube_query || inferQueryFields(card.data);
      const cubeName = measures[0]?.split('.')[0];

      // Fetch valid drilldown dimensions from the API — no more hardcoded maps
      const drilldownsData = await fetchDrilldowns(cubeName, token);
      const measureEntry = drilldownsData.drilldowns?.find((d: any) => d.measure === measures[0]);
      const validDims: string[] = (measureEntry?.valid_dimensions ?? []).map((d: any) => d.name);

      let drillQuery: any;

      if (card.chart_type === 'kpi' || dimensions.length === 0) {
        // KPI: break out by first two valid dimensions from the drilldowns endpoint
        const drillDims = validDims.slice(0, 2);
        drillQuery = {
          measures,
          dimensions: drillDims.length > 0 ? drillDims : [],
          order: { [measures[0]]: 'desc' },
          limit: 50,
        };
      } else {
        const dimensionKey = dimensions[0];
        const clickedValue = clickedRow?.[dimensionKey] ?? null;

        // Pick the next dimension from the valid list (one step deeper in the hierarchy)
        const currentIdx = validDims.indexOf(dimensionKey);
        const nextDim = validDims.find((_, i) => i !== currentIdx) ?? null;

        drillQuery = {
          measures,
          dimensions: nextDim && nextDim !== dimensionKey
            ? [dimensionKey, nextDim]
            : [dimensionKey],
          filters: [
            ...(card.cube_query?.filters ?? []),
            clickedValue !== null && clickedValue !== undefined
              ? { member: dimensionKey, operator: 'equals', values: [String(clickedValue)] }
              : { member: dimensionKey, operator: 'notSet' },
          ],
          order: { [measures[0]]: 'desc' },
          limit: 50,
        };
      }

      const res = await fetchAnalyticsQuery(drillQuery, token);
      setDrillState(prev => ({
        ...prev,
        data: Array.isArray(res) ? res : res.data ?? res,
        loading: false,
      }));
    } catch (err: any) {
      setDrillState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  // ── Global filter helpers ──────────────────────────────────────────────────

  // Collect all string-type dimensions across every fetched cube for the filter picker
  const allStringDimensions = useMemo(
    () => Object.values(cubeMetaMap).flatMap(meta =>
      (meta.dimensions ?? []).filter(d => d.type === 'string')
    ),
    [cubeMetaMap],
  );

  const applyPendingFilter = () => {
    const val = filterValue.trim();
    if (!filterMember || !val) return;
    setGlobalFilters(prev => [
      ...prev.filter(f => f.member !== filterMember),
      { member: filterMember, operator: 'equals', values: [val] },
    ]);
    setFilterMember('');
    setFilterValue('');
  };

  // ── Card rendering ─────────────────────────────────────────────────────────

  const renderCard = (card: CardWithData) => {
    const cubeName = card.cube_query?.measures[0]?.split('.')[0] ?? '';
    const meta = cubeMetaMap[cubeName];
    const dimensionOptions = (meta?.dimensions ?? []).filter(d => d.type === 'string');
    const props = { card, onDrillDown: handleDrillDown, globalFilters, token, dimensionOptions };

    switch (card.chart_type) {
      case 'kpi':   return <KPITile {...props} />;
      case 'bar':   return <BarChartCard {...props} />;
      case 'line':  return <LineChartCard {...props} />;
      case 'area':  return <AreaChartCard {...props} />;
      case 'table': return <TableCard card={card} />;
      case 'donut':
      case 'pie':   return <PieChartCard {...props} />;
      default:
        return (
          <div style={{ padding: 20, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
            Unsupported chart type: <strong>{card.chart_type}</strong>
          </div>
        );
    }
  };

  // Decode user initial from JWT payload for the avatar
  const userInitial = useMemo(() => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const sub: string = payload.sub ?? payload.email ?? payload.name ?? '';
      return sub.charAt(0).toUpperCase() || 'U';
    } catch { return 'U'; }
  }, [token]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.surfaceAlt, overflow: 'hidden' }}>

      {/* ── Top bar: Brand + Actions ── */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        height: 52,
        flexShrink: 0,
        zIndex: 20,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: C.black, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={15} color="#fff" strokeWidth={2.2} />
          </div>
          <span style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700,
            letterSpacing: '-0.02em', color: C.textPrimary,
          }}>
            Control Tower
          </span>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleRefreshData}
            disabled={refreshing || loading}
            className="topbar-btn"
            style={{
              color: C.textPrimary,
              background: C.surfaceAlt,
              borderColor: C.border,
              opacity: refreshing || loading ? 0.65 : 1,
              cursor: refreshing || loading ? 'not-allowed' : 'pointer',
            }}
            title="Refresh dashboard data"
          >
            <RefreshCw size={14} strokeWidth={2} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={() => setShowBuilder(true)}
            className="topbar-btn"
            style={{
              color: C.textPrimary,
              background: C.surfaceAlt,
              borderColor: C.border,
            }}
          >
            <PenSquare size={14} strokeWidth={2} />
            Edit
          </button>

          <button
            onClick={() => setShowAgent(!showAgent)}
            className={`topbar-btn${showAgent ? ' topbar-btn--active' : ''}`}
            style={{
              color: showAgent ? '#fff' : C.textPrimary,
              background: showAgent ? C.black : 'transparent',
              borderColor: showAgent ? C.black : C.border,
            }}
          >
            <Sparkles size={14} strokeWidth={2} />
            {showAgent ? 'Hide AI' : 'Ask AI'}
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: C.border, margin: '0 4px' }} />

          {/* User avatar + logout */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: C.surfaceAlt, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
            color: C.textSecondary, letterSpacing: 0,
          }}>
            {userInitial}
          </div>

          <button
            onClick={onLogout}
            className="topbar-btn"
            style={{ color: C.textMuted, padding: '6px 8px' }}
            title="Sign out"
          >
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* ── Tab bar: Dashboard navigation ── */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: '0 12px',
        height: 44,
        flexShrink: 0,
        overflowX: 'auto',
        zIndex: 10,
      }} className="nav-tab-bar">
        {loading && !dashboards.length ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 6px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width={110} height={16} borderRadius={4} style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : (
          dashboards.map(d => {
            const Icon = getTabIcon(d);
            const isActive = activeSlug === d.slug;
            return (
              <button
                key={d.slug}
                onClick={() => setActiveSlug(d.slug)}
                className={`nav-tab${isActive ? ' nav-tab--active' : ''}`}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 450,
                  color: isActive ? C.textPrimary : C.textMuted,
                  letterSpacing: isActive ? '-0.01em' : '0',
                }}
              >
                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
                {d.name}
              </button>
            );
          })
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Scrollable Dashboard View */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Dashboard Header & Filters */}
          <div style={{ padding: '28px 32px 0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
                {loading && (!dashboardData || activeSlug !== dashboardData.slug)
                  ? <Skeleton width={200} height={26} />
                  : dashboardData?.name || 'Dashboard Error'}
              </h2>
              {dashboardData?.description && !loading && (
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.textMuted, fontWeight: 400 }}>
                  {dashboardData.description}
                </span>
              )}
            </div>

            {/* Global Filter Pills + Builder */}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Active filter pills */}
              {globalFilters.map((f, i) => (
                <span
                  key={i}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.border}`, padding: '4px 10px', borderRadius: 16, fontSize: 12, fontFamily: "'Inter', sans-serif", color: C.textPrimary, fontWeight: 500 }}
                >
                  <span style={{ color: C.textMuted }}>{f.member.split('.').pop()}:</span>
                  <strong style={{ color: C.blue }}>{f.values[0]}</strong>
                  <button
                    onClick={() => setGlobalFilters(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, marginLeft: 2, display: 'flex', alignItems: 'center' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}

              {/* Filter builder — dimension picker */}
              {allStringDimensions.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <select
                    value={filterMember}
                    onChange={e => {
                      setFilterMember(e.target.value);
                      setFilterValue('');
                      setTimeout(() => filterValueRef.current?.focus(), 0);
                    }}
                    style={{ background: 'transparent', border: `1px dashed ${C.textMuted}`, color: C.textMuted, padding: '4px 10px', borderRadius: 16, fontSize: 12, fontFamily: "'Inter', sans-serif", outline: 'none', cursor: 'pointer', height: 26 }}
                  >
                    <option value="">+ Add Filter</option>
                    {allStringDimensions.map(d => (
                      <option key={d.name} value={d.name}>
                        {d.shortTitle || d.name.split('.').pop()}
                      </option>
                    ))}
                  </select>

                  {/* Value input — appears once a dimension is chosen */}
                  {filterMember && (
                    <>
                      <input
                        ref={filterValueRef}
                        value={filterValue}
                        onChange={e => setFilterValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') applyPendingFilter(); if (e.key === 'Escape') { setFilterMember(''); setFilterValue(''); } }}
                        placeholder="Value…"
                        style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: '3px 10px', fontSize: 12, fontFamily: "'Inter', sans-serif", outline: 'none', height: 26, width: 120, color: C.textPrimary, background: C.surface }}
                      />
                      <button
                        onClick={applyPendingFilter}
                        disabled={!filterValue.trim()}
                        style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 12, padding: '3px 12px', fontSize: 12, fontFamily: "'Inter', sans-serif", cursor: filterValue.trim() ? 'pointer' : 'not-allowed', height: 26, opacity: filterValue.trim() ? 1 : 0.5 }}
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => { setFilterMember(''); setFilterValue(''); }}
                        style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '0 4px', fontSize: 16, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dashboard Content grid */}
          <div style={{ padding: 32 }}>
            {error ? (
              <div style={{ background: C.redLight, color: C.red, padding: '24px', borderRadius: 12, border: `1px solid ${C.red}`, fontFamily: "'Inter', sans-serif" }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Failed to load dashboard data</div>
                <div style={{ fontSize: 14 }}>{error}. Please verify your connection or refresh the page.</div>
              </div>
            ) : loading && (!dashboardData || activeSlug !== dashboardData.slug) ? (
              <DashboardSkeleton />
            ) : dashboardData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: 'minmax(120px, auto)', gap: 24 }}>
                {dashboardData.cards.map(card => (
                  <div
                    key={card.id}
                    style={{
                      gridColumn: `${card.grid_col_start} / span ${card.grid_col_span}`,
                      gridRow: card.grid_row ? card.grid_row : 'auto',
                      minHeight: card.chart_type === 'kpi' ? 120 : 360,
                    }}
                  >
                    {renderCard(card)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Agent Panel Overlay */}
        {showAgent && (
          <div style={{ width: 400, background: C.surface, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', zIndex: 10, flexShrink: 0 }}>
            <AgentPanel onClose={() => setShowAgent(false)} />
          </div>
        )}
      </div>

      <DashboardBuilderModal
        open={showBuilder}
        token={token}
        currentSlug={activeSlug}
        onClose={() => setShowBuilder(false)}
        onNavigate={(slug) => {
          setActiveSlug(slug);
          setShowBuilder(false);
        }}
        onRefreshDashboards={async () => {
          await refreshDashboardList(activeSlug);
        }}
      />

      {/* Drill Down Modal */}
      <Modal
        open={drillState.open}
        onClose={() => setDrillState(prev => ({ ...prev, open: false }))}
        title={`Drill Down: ${drillState.card?.title || 'Details'}`}
        subtitle={drillState.row ? 'Filtered by segment' : undefined}
      >
        {drillState.loading ? (
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[60, 40, 80].map((w, i) => (
                    <th key={i} style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
                      <Skeleton width={`${w}%`} height={14} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.surfaceAlt}` }}>
                    {[80, 100, 60].map((w, j) => (
                      <td key={j} style={{ padding: '12px' }}><Skeleton width={`${w}%`} height={16} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : drillState.error ? (
          <div style={{ background: C.redLight, color: C.red, padding: '20px', borderRadius: 8, margin: '20px 0', fontSize: 14, fontFamily: "'Inter', sans-serif", border: `1px solid ${C.red}` }}>
            <strong style={{ display: 'block', marginBottom: 4 }}>Drill-down Failed</strong>
            {drillState.error}
          </div>
        ) : drillState.data && drillState.data.length > 0 ? (
          <div style={{ overflowX: 'auto', maxHeight: 400 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
              <thead>
                <tr>
                  {Object.keys(drillState.data[0]).map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: `1px solid ${C.border}`, color: C.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col.split('.').pop()?.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drillState.data.map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.surfaceAlt}` }}>
                    {Object.keys(drillState.data![0]).map(col => (
                      <td key={col} style={{ padding: '8px 12px', color: C.textPrimary }}>
                        {r[col] === null
                          ? <span style={{ color: C.amber, fontWeight: 500 }}>Unassigned</span>
                          : String(r[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>
            No data found for this segment.
          </div>
        )}
      </Modal>
    </div>
  );
};
