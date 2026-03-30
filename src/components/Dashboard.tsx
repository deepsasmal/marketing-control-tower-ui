import React, { useEffect, useState, useMemo } from 'react';
import { fetchDashboards, fetchDashboardData, fetchCubeMetadata, fetchDrilldowns, fetchAnalyticsQuery } from '../api';
import { DashboardListItem, DashboardDataResponse, CardWithData, CubeDetail } from '../types/api';
import { C } from '../lib/constants';
import { KPITile } from './charts/KPITile';
import { BarChartCard } from './charts/BarChartCard';
import { LineChartCard } from './charts/LineChartCard';
import { TableCard } from './charts/TableCard';
import { PieChartCard } from './charts/PieChartCard';
import { AreaChartCard } from './charts/AreaChartCard';
import { DrilldownView } from './charts/DrilldownView';
import { AgentPanel } from './AgentPanel';
import {
  Sparkles, LogOut, TrendingUp, Filter, Megaphone, Package,
  Building2, Activity, LayoutDashboard, PieChart, DollarSign, Users, BarChart3, PenSquare, RefreshCw,
} from 'lucide-react';
import { inferQueryFields } from '../lib/utils';
import { Skeleton } from './ui/Skeleton';
import { DashboardSkeleton } from './ui/DashboardSkeleton';
import { DashboardBuilderModal } from './DashboardBuilderModal';
import { Modal } from './ui/Modal';

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
  type DrillPayload = {
    row: any;
    activeDimension?: string;
    currentMeasures?: string[];
    sourceChartType?: string;
  };

  type CardDrillState = {
    open: boolean;
    loading: boolean;
    error: string;
    data: any[];
    query: any;
    sourceDimension?: string;
    targetDimension?: string;
    availableDimensions: string[];
    clickedValue?: string | null;
    measures: string[];
    lastPayload?: DrillPayload;
  };

  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAgent, setShowAgent] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const globalFilters: any[] = [];

  // Map of cube name → full CubeDetail (measures + dimensions), fetched per unique cube
  const [cubeMetaMap, setCubeMetaMap] = useState<Record<string, CubeDetail>>({});

  const [drillStates, setDrillStates] = useState<Record<string, CardDrillState>>({});
  const [kpiDrillModalCardKey, setKpiDrillModalCardKey] = useState<string | null>(null);

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
  const getCardKey = (card: CardWithData) => String(card.id ?? card.slug);

  const getCubeScopedGlobalFilters = (_cubeName: string) => [];

  const resolveDimensionKeyFromRow = (
    row: any,
    preferredDim: string | undefined,
    measures: string[],
  ) => {
    if (!row || typeof row !== 'object') return preferredDim || '';
    if (preferredDim && Object.prototype.hasOwnProperty.call(row, preferredDim)) return preferredDim;
    if (preferredDim) {
      const preferredShort = preferredDim.split('.').pop();
      const byShort = Object.keys(row).find(k => k.split('.').pop() === preferredShort);
      if (byShort) return byShort;
    }
    const nonMeasureKeys = Object.keys(row).filter(k => !measures.includes(k));
    return nonMeasureKeys[0] || preferredDim || '';
  };

  const rankDrillDimensions = (dims: string[]) => {
    const isIdentifierLike = (d: string) => {
      const k = d.toLowerCase();
      return (
        k.endsWith('.id') ||
        k.includes('_id') ||
        k.includes('uuid') ||
        k.includes('guid') ||
        k.includes('key')
      );
    };
    return [...dims].sort((a, b) => Number(isIdentifierLike(a)) - Number(isIdentifierLike(b)));
  };

  const runDrillQueryForCard = async (card: CardWithData, payload: DrillPayload, forcedTargetDimension?: string) => {
    const cardKey = getCardKey(card);
    const baseQuery = card.cube_query || inferQueryFields(card.data);
    const measures: string[] = payload.currentMeasures?.length
      ? payload.currentMeasures
      : (baseQuery.measures || []);
    const cubeName = measures[0]?.split('.')[0] || '';

    if (!measures.length || !cubeName) {
      setDrillStates(prev => ({
        ...prev,
        [cardKey]: {
          open: true,
          loading: false,
          error: 'Drilldown is not available for this card.',
          data: [],
          query: {},
          availableDimensions: [],
          measures: [],
        },
      }));
      return;
    }

    const sourceDimCandidate = payload.activeDimension || baseQuery.dimensions?.[0] || '';
    const sourceDimension = resolveDimensionKeyFromRow(payload.row, sourceDimCandidate, measures);
    const clickedValue = sourceDimension ? payload.row?.[sourceDimension] : null;

    setDrillStates(prev => ({
      ...prev,
      [cardKey]: {
        ...(prev[cardKey] || {
          open: true,
          loading: true,
          error: '',
          data: [],
          query: {},
          availableDimensions: [],
          measures,
        }),
        open: true,
        loading: true,
        error: '',
        measures,
      },
    }));

    try {
      const drilldownsData = await fetchDrilldowns(cubeName, token);
      const measureEntry = drilldownsData.drilldowns?.find((d: any) => d.measure === measures[0]);
      const validDimsRaw: string[] = (measureEntry?.valid_dimensions ?? []).map((d: any) => d.name);
      const validDims = rankDrillDimensions(validDimsRaw);
      const targetDimension =
        forcedTargetDimension ||
        validDims.find(d => d !== sourceDimension) ||
        (sourceDimension && validDims.includes(sourceDimension) ? sourceDimension : validDims[0] || '');

      const baseFilters = [...(baseQuery.filters || []), ...getCubeScopedGlobalFilters(cubeName)];
      const clickedFilter = sourceDimension
        ? (
          clickedValue !== null && clickedValue !== undefined
            ? { member: sourceDimension, operator: 'equals', values: [String(clickedValue)] }
            : { member: sourceDimension, operator: 'notSet' }
        )
        : null;

      const drillQuery: any = {
        measures,
        dimensions: targetDimension ? [targetDimension] : [],
        filters: clickedFilter ? [...baseFilters, clickedFilter] : baseFilters,
        time_dimensions: baseQuery.time_dimensions || [],
        order: { [measures[0]]: 'desc' },
        limit: 50,
        offset: 0,
      };

      const res = await fetchAnalyticsQuery(drillQuery, token);
      const rows = Array.isArray(res) ? res : res.data ?? res ?? [];

      setDrillStates(prev => ({
        ...prev,
        [cardKey]: {
          open: true,
          loading: false,
          error: '',
          data: rows,
          query: drillQuery,
          sourceDimension,
          targetDimension,
          availableDimensions: validDims,
          clickedValue: clickedValue === null || clickedValue === undefined ? null : String(clickedValue),
          measures,
          lastPayload: payload,
        },
      }));
    } catch (err: any) {
      setDrillStates(prev => ({
        ...prev,
        [cardKey]: {
          open: true,
          loading: false,
          error: err.message || 'Drilldown failed',
          data: [],
          query: prev[cardKey]?.query || {},
          sourceDimension,
          targetDimension: prev[cardKey]?.targetDimension,
          availableDimensions: prev[cardKey]?.availableDimensions || [],
          clickedValue: clickedValue === null || clickedValue === undefined ? null : String(clickedValue),
          measures,
          lastPayload: payload,
        },
      }));
    }
  };

  const handleDrillDown = async (card: CardWithData, payloadOrRow: DrillPayload | any) => {
    const payload: DrillPayload = payloadOrRow && payloadOrRow.row
      ? payloadOrRow
      : { row: payloadOrRow };
    if (card.chart_type === 'kpi') {
      setKpiDrillModalCardKey(getCardKey(card));
    }
    await runDrillQueryForCard(card, payload);
  };

  const handleBackFromDrill = (card: CardWithData) => {
    const cardKey = getCardKey(card);
    if (kpiDrillModalCardKey === cardKey) {
      setKpiDrillModalCardKey(null);
    }
    setDrillStates(prev => {
      const next = { ...prev };
      delete next[cardKey];
      return next;
    });
  };

  const handleRetryDrill = async (card: CardWithData) => {
    const cardKey = getCardKey(card);
    const state = drillStates[cardKey];
    if (!state?.query) return;
    setDrillStates(prev => ({
      ...prev,
      [cardKey]: { ...state, loading: true, error: '' },
    }));
    try {
      const res = await fetchAnalyticsQuery(state.query, token);
      const rows = Array.isArray(res) ? res : res.data ?? res ?? [];
      setDrillStates(prev => ({
        ...prev,
        [cardKey]: { ...state, loading: false, error: '', data: rows },
      }));
    } catch (err: any) {
      setDrillStates(prev => ({
        ...prev,
        [cardKey]: { ...state, loading: false, error: err.message || 'Retry failed' },
      }));
    }
  };

  const handleSelectDrillDimension = async (card: CardWithData, dimension: string) => {
    const state = drillStates[getCardKey(card)];
    if (!state?.lastPayload || !dimension) return;
    await runDrillQueryForCard(card, state.lastPayload, dimension);
  };

  // ── Card rendering ─────────────────────────────────────────────────────────

  const renderCard = (card: CardWithData) => {
    const cubeName = card.cube_query?.measures[0]?.split('.')[0] ?? '';
    const meta = cubeMetaMap[cubeName];
    const dimensionOptions = (meta?.dimensions ?? []).filter(d => d.type === 'string');
    const props = { card, onDrillDown: handleDrillDown, globalFilters, token, dimensionOptions };
    const drill = drillStates[getCardKey(card)];

    if (drill?.open && card.chart_type !== 'kpi') {
      return (
        <DrilldownView
          card={card}
          loading={drill.loading}
          error={drill.error}
          rows={drill.data}
          measures={drill.measures}
          sourceDimension={drill.sourceDimension}
          targetDimension={drill.targetDimension}
          availableDimensions={drill.availableDimensions}
          clickedValue={drill.clickedValue}
          onSelectDimension={(dimension) => handleSelectDrillDimension(card, dimension)}
          onBack={() => handleBackFromDrill(card)}
          onRetry={() => handleRetryDrill(card)}
        />
      );
    }

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
  const kpiDrillCard = useMemo(
    () => dashboardData?.cards.find(c => getCardKey(c) === kpiDrillModalCardKey && c.chart_type === 'kpi') ?? null,
    [dashboardData, kpiDrillModalCardKey],
  );

  const kpiDrillState = kpiDrillCard ? drillStates[getCardKey(kpiDrillCard)] : undefined;

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
            Settings
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

      <Modal
        open={!!kpiDrillCard && !!kpiDrillState?.open}
        onClose={() => {
          if (kpiDrillCard) handleBackFromDrill(kpiDrillCard);
        }}
        title="KPI Drilldown"
        subtitle="Detailed metric breakdown"
        width={920}
      >
        {kpiDrillCard && kpiDrillState ? (
          <div style={{ minHeight: 380 }}>
            <DrilldownView
              card={kpiDrillCard}
              loading={kpiDrillState.loading}
              error={kpiDrillState.error}
              rows={kpiDrillState.data}
              measures={kpiDrillState.measures}
              sourceDimension={kpiDrillState.sourceDimension}
              targetDimension={kpiDrillState.targetDimension}
              availableDimensions={kpiDrillState.availableDimensions}
              clickedValue={kpiDrillState.clickedValue}
              onSelectDimension={(dimension) => handleSelectDrillDimension(kpiDrillCard, dimension)}
              onBack={() => handleBackFromDrill(kpiDrillCard)}
              onRetry={() => handleRetryDrill(kpiDrillCard)}
              frameless
            />
          </div>
        ) : null}
      </Modal>

    </div>
  );
};
