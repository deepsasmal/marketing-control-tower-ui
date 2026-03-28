import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchDashboards,
  fetchDashboardDefinition,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  fetchCubes,
  fetchCubeMetadata,
  fetchDrilldowns,
  fetchAnalyticsQuery,
  validateCubeQuery,
  createDashboardCard,
  updateDashboardCard,
  deleteDashboardCard,
  reorderDashboardCards,
} from '../api';
import { C } from '../lib/constants';
import { Modal } from './ui/Modal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

type BuilderProps = {
  open: boolean;
  token: string;
  currentSlug: string | null;
  onClose: () => void;
  onNavigate: (slug: string) => void;
  onRefreshDashboards: () => Promise<void> | void;
};

const AUDIENCE_OPTIONS = ['executive', 'sales', 'marketing', 'ops'];
const CHART_TYPES = ['kpi', 'bar', 'line', 'pie', 'donut', 'area', 'table', 'scatter'];
const COLOR_SCHEMES = ['default', 'blue', 'green', 'red', 'purple', 'orange', 'teal'];
const SLUG_REGEX = /^[a-z0-9-]{3,100}$/;

const emptyDashboard = {
  name: '',
  slug: '',
  description: '',
  icon: 'chart-bar',
  audience: 'executive',
  display_order: 0,
  refresh_interval_seconds: 300,
  tags: [] as string[],
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

function parseTags(v: string): string[] {
  return v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function jsonSafeParse(input: string, fallback: any): any {
  try {
    return input.trim() ? JSON.parse(input) : fallback;
  } catch {
    return fallback;
  }
}

function getSchemeColor(scheme?: string): string {
  const map: Record<string, string> = {
    default: C.textPrimary,
    blue: C.blue,
    green: C.green,
    red: C.red,
    purple: C.purple,
    orange: C.amber,
    teal: '#0d9488',
  };
  return map[scheme || 'blue'] || C.blue;
}

function readValue(row: any, member: string): number {
  const short = member.split('.').pop() || member;
  return Number(row?.[member] ?? row?.[short] ?? 0);
}

function readDimension(row: any, member: string): string {
  const short = member.split('.').pop() || member;
  const val = row?.[member] ?? row?.[short];
  return val === null || val === undefined || val === '' ? 'Unassigned' : String(val);
}

function formatNumber(value: number, prefix = '', suffix = ''): string {
  if (!Number.isFinite(value)) return `${prefix}0${suffix}`;
  if (Math.abs(value) >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(1)}M${suffix}`;
  if (Math.abs(value) >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K${suffix}`;
  return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
}

export const DashboardBuilderModal = ({
  open,
  token,
  currentSlug,
  onClose,
  onNavigate,
  onRefreshDashboards,
}: BuilderProps) => {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState('');

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [dashboardDef, setDashboardDef] = useState<any | null>(null);
  const [loadingDef, setLoadingDef] = useState(false);

  const [isCreateMode, setIsCreateMode] = useState(false);
  const [form, setForm] = useState({ ...emptyDashboard });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [savingDashboard, setSavingDashboard] = useState(false);
  const [dashboardMessage, setDashboardMessage] = useState('');

  const [cardBuilderOpen, setCardBuilderOpen] = useState(false);
  const [cardEditing, setCardEditing] = useState<any | null>(null);
  const [cardSaving, setCardSaving] = useState(false);
  const [cardError, setCardError] = useState('');

  const [cubes, setCubes] = useState<any[]>([]);
  const [cubeMeta, setCubeMeta] = useState<any | null>(null);
  const [drilldowns, setDrilldowns] = useState<any[]>([]);
  const [cardDraft, setCardDraft] = useState<any>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [queryValidationError, setQueryValidationError] = useState('');

  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, { display_order: number; grid_col_start: number; grid_col_span: number; grid_row: number }>>({});
  const [reorderSaving, setReorderSaving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [autoPreview, setAutoPreview] = useState(true);

  const loadDashboards = async () => {
    setLoadingList(true);
    setListError('');
    try {
      const res = await fetchDashboards(token);
      setDashboards(res);
      const initial = selectedSlug ?? currentSlug ?? res[0]?.slug ?? null;
      setSelectedSlug(initial);
    } catch (err: any) {
      setListError(err.message || 'Failed to load dashboards');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadDashboards();
  }, [open]);

  useEffect(() => {
    if (!open || !selectedSlug || isCreateMode) return;
    setLoadingDef(true);
    setDashboardMessage('');
    fetchDashboardDefinition(selectedSlug, token)
      .then((data) => {
        setDashboardDef(data);
        setForm({
          name: data.name ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          icon: data.icon ?? 'chart-bar',
          audience: data.audience ?? 'executive',
          display_order: Number(data.display_order ?? 0),
          refresh_interval_seconds: Number(data.refresh_interval_seconds ?? 300),
          tags: Array.isArray(data.tags) ? data.tags : [],
        });
        const initialLayouts: Record<string, any> = {};
        (data.cards || []).forEach((c: any, i: number) => {
          initialLayouts[c.slug] = {
            display_order: Number(c.display_order ?? i),
            grid_col_start: Number(c.grid_col_start ?? 1),
            grid_col_span: Number(c.grid_col_span ?? 3),
            grid_row: Number(c.grid_row ?? 1),
          };
        });
        setLayoutDrafts(initialLayouts);
      })
      .catch((err: any) => setDashboardMessage(err.message || 'Failed to load dashboard definition'))
      .finally(() => setLoadingDef(false));
  }, [open, selectedSlug, isCreateMode, token]);

  useEffect(() => {
    if (!open) return;
    fetchCubes(token).then(setCubes).catch(() => setCubes([]));
  }, [open, token]);

  const startCreateDashboard = () => {
    setIsCreateMode(true);
    setSelectedSlug(null);
    setDashboardDef(null);
    setForm({ ...emptyDashboard });
    setFormErrors({});
    setDashboardMessage('');
  };

  const stopCreateMode = () => {
    setIsCreateMode(false);
    if (dashboards.length > 0) setSelectedSlug(dashboards[0].slug);
  };

  const saveDashboardMeta = async () => {
    const errors: Record<string, string> = {};
    const finalSlug = form.slug.trim();
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!finalSlug) errors.slug = 'Slug is required';
    if (finalSlug && !SLUG_REGEX.test(finalSlug)) errors.slug = 'Slug must match ^[a-z0-9-]{3,100}$';
    if (form.display_order < 0) errors.display_order = 'Display order must be >= 0';
    if (form.refresh_interval_seconds < 10) errors.refresh_interval_seconds = 'Refresh should be >= 10s';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      slug: finalSlug,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      icon: form.icon?.trim() || null,
      audience: form.audience || null,
      display_order: Number(form.display_order || 0),
      refresh_interval_seconds: Number(form.refresh_interval_seconds || 300),
      tags: form.tags,
    };

    setSavingDashboard(true);
    setDashboardMessage('');
    try {
      if (isCreateMode) {
        await createDashboard(payload, token);
        await loadDashboards();
        await onRefreshDashboards();
        setIsCreateMode(false);
        setSelectedSlug(finalSlug);
        onNavigate(finalSlug);
        setDashboardMessage('Dashboard created.');
      } else if (dashboardDef?.slug) {
        const changedFields: Record<string, any> = {};
        (Object.keys(payload) as Array<keyof typeof payload>).forEach((k) => {
          const before = JSON.stringify((dashboardDef as any)[k] ?? (k === 'tags' ? [] : null));
          const after = JSON.stringify(payload[k]);
          if (before !== after) changedFields[k] = payload[k];
        });
        if (Object.keys(changedFields).length === 0) {
          setDashboardMessage('No changes to save.');
          return;
        }
        await updateDashboard(dashboardDef.slug, changedFields, token);
        await loadDashboards();
        await onRefreshDashboards();
        const targetSlug = changedFields.slug || dashboardDef.slug;
        setSelectedSlug(targetSlug);
        onNavigate(targetSlug);
        setDashboardMessage('Dashboard updated.');
      }
    } catch (err: any) {
      setDashboardMessage(err.message || 'Failed to save dashboard');
    } finally {
      setSavingDashboard(false);
    }
  };

  const handleDeleteDashboard = async () => {
    if (!dashboardDef?.slug) return;
    const ok = window.confirm(`Delete dashboard "${dashboardDef.name}"?`);
    if (!ok) return;
    try {
      await deleteDashboard(dashboardDef.slug, token);
      await loadDashboards();
      await onRefreshDashboards();
      const next = dashboards.find(d => d.slug !== dashboardDef.slug)?.slug ?? null;
      if (next) onNavigate(next);
      setSelectedSlug(next);
      setDashboardDef(null);
      setDashboardMessage('Dashboard deleted.');
    } catch (err: any) {
      setDashboardMessage(err.message || 'Failed to delete dashboard');
    }
  };

  const openCardBuilder = (card?: any) => {
    const initialQuery = card?.cube_query || {
      measures: [],
      dimensions: [],
      filters: [],
      time_dimensions: [],
      order: {},
      limit: 1000,
      offset: 0,
    };
    const cubeName = (initialQuery.measures?.[0] || '').split('.')[0] || '';
    setCardEditing(card ?? null);
    setCardDraft({
      slug: card?.slug || '',
      title: card?.title || '',
      subtitle: card?.subtitle || '',
      description: card?.description || '',
      chart_type: card?.chart_type || 'bar',
      color_scheme: card?.color_scheme || 'default',
      value_prefix: card?.value_prefix || '',
      value_suffix: card?.value_suffix || '',
      x_axis_label: card?.x_axis_label || '',
      y_axis_label: card?.y_axis_label || '',
      show_legend: card?.show_legend ?? true,
      show_data_labels: card?.show_data_labels ?? false,
      grid_col_start: Number(card?.grid_col_start ?? 1),
      grid_col_span: Number(card?.grid_col_span ?? 6),
      grid_row: Number(card?.grid_row ?? 1),
      display_order: Number(card?.display_order ?? (dashboardDef?.cards?.length ?? 0)),
      cube_name: cubeName,
      measures: initialQuery.measures || [],
      dimensions: initialQuery.dimensions || [],
      filters_json: JSON.stringify(initialQuery.filters || [], null, 2),
      time_dimensions_json: JSON.stringify(initialQuery.time_dimensions || [], null, 2),
      limit: Number(initialQuery.limit ?? 1000),
      offset: Number(initialQuery.offset ?? 0),
      order_json: JSON.stringify(initialQuery.order || {}, null, 2),
    });
    setCardError('');
    setQueryValidationError('');
    setPreviewRows([]);
    setCardBuilderOpen(true);
  };

  useEffect(() => {
    if (!cardBuilderOpen || !cardDraft?.cube_name) return;
    fetchCubeMetadata(cardDraft.cube_name, token).then(setCubeMeta).catch(() => setCubeMeta(null));
    fetchDrilldowns(cardDraft.cube_name, token)
      .then((d) => setDrilldowns(d?.drilldowns || []))
      .catch(() => setDrilldowns([]));
  }, [cardBuilderOpen, cardDraft?.cube_name, token]);

  const validDimensions = useMemo(() => {
    if (!cardDraft?.measures?.length || !drilldowns?.length) return [];
    const sets = cardDraft.measures
      .map((m: string) => drilldowns.find((d: any) => d.measure === m)?.valid_dimensions?.map((v: any) => v.name) || [])
      .filter((a: string[]) => a.length > 0);
    if (sets.length === 0) return [];
    return sets.reduce((acc: string[], cur: string[]) => acc.filter(v => cur.includes(v)));
  }, [cardDraft?.measures, drilldowns]);

  const runPreview = async () => {
    if (!cardDraft?.measures?.length) {
      setCardError('Pick at least one measure first.');
      return;
    }
    setCardError('');
    setPreviewLoading(true);
    try {
      const previewQuery = {
        measures: cardDraft.measures,
        dimensions: cardDraft.dimensions || [],
        filters: jsonSafeParse(cardDraft.filters_json, []),
        time_dimensions: jsonSafeParse(cardDraft.time_dimensions_json, []),
        order: jsonSafeParse(cardDraft.order_json, {}),
        limit: 50,
        offset: 0,
      };
      const data = await fetchAnalyticsQuery(previewQuery, token);
      setPreviewRows(Array.isArray(data) ? data : data?.data || []);
    } catch (err: any) {
      setCardError(err.message || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveCard = async () => {
    if (!dashboardDef?.slug) return;
    if (!cardDraft?.title?.trim()) return setCardError('Card title is required');
    if (!cardDraft?.slug?.trim()) return setCardError('Card slug is required');
    if (!SLUG_REGEX.test(cardDraft.slug.trim())) return setCardError('Card slug must match ^[a-z0-9-]{3,100}$');
    if (!cardDraft?.cube_name) return setCardError('Pick a cube/view');
    if (!cardDraft?.measures?.length) return setCardError('Pick at least one measure');

    const queryPayload = {
      measures: cardDraft.measures,
      dimensions: cardDraft.dimensions || [],
      filters: jsonSafeParse(cardDraft.filters_json, []),
      time_dimensions: jsonSafeParse(cardDraft.time_dimensions_json, []),
      order: jsonSafeParse(cardDraft.order_json, {}),
      limit: Number(cardDraft.limit || 1000),
      offset: Number(cardDraft.offset || 0),
    };

    setCardSaving(true);
    setCardError('');
    setQueryValidationError('');
    try {
      const validateRes = await validateCubeQuery(
        { measures: queryPayload.measures, dimensions: queryPayload.dimensions },
        token,
      );
      if (!validateRes?.valid) {
        setQueryValidationError((validateRes?.errors || []).join(', ') || 'Invalid cube query');
        return;
      }

      const payload = {
        slug: cardDraft.slug.trim(),
        title: cardDraft.title.trim(),
        subtitle: cardDraft.subtitle?.trim() || null,
        description: cardDraft.description?.trim() || null,
        chart_type: cardDraft.chart_type,
        cube_query: queryPayload,
        grid_col_start: Number(cardDraft.grid_col_start || 1),
        grid_col_span: Number(cardDraft.grid_col_span || 6),
        grid_row: Number(cardDraft.grid_row || 1),
        display_order: Number(cardDraft.display_order || 0),
        value_prefix: cardDraft.value_prefix || null,
        value_suffix: cardDraft.value_suffix || null,
        x_axis_label: cardDraft.x_axis_label || null,
        y_axis_label: cardDraft.y_axis_label || null,
        show_legend: !!cardDraft.show_legend,
        show_data_labels: !!cardDraft.show_data_labels,
        ...(cardDraft.color_scheme && cardDraft.color_scheme !== 'default'
          ? { color_scheme: cardDraft.color_scheme }
          : {}),
      };

      if (cardEditing) {
        const changed: Record<string, any> = {};
        Object.keys(payload).forEach((k) => {
          const before = JSON.stringify((cardEditing as any)[k] ?? null);
          const after = JSON.stringify((payload as any)[k]);
          if (before !== after) changed[k] = (payload as any)[k];
        });
        await updateDashboardCard(dashboardDef.slug, cardEditing.slug, changed, token);
      } else {
        await createDashboardCard(dashboardDef.slug, payload, token);
      }

      const updated = await fetchDashboardDefinition(dashboardDef.slug, token);
      setDashboardDef(updated);
      setCardBuilderOpen(false);
    } catch (err: any) {
      setCardError(err.message || 'Failed to save card');
    } finally {
      setCardSaving(false);
    }
  };

  const removeCard = async (card: any) => {
    if (!dashboardDef?.slug) return;
    const ok = window.confirm(`Delete card "${card.title}"?`);
    if (!ok) return;
    try {
      await deleteDashboardCard(dashboardDef.slug, card.slug, token);
      const updated = await fetchDashboardDefinition(dashboardDef.slug, token);
      setDashboardDef(updated);
    } catch (err: any) {
      setDashboardMessage(err.message || 'Failed to delete card');
    }
  };

  const saveLayout = async () => {
    if (!dashboardDef?.slug || !dashboardDef?.cards?.length) return;
    setReorderSaving(true);
    try {
      const cards = dashboardDef.cards.map((card: any, idx: number) => {
        const d = layoutDrafts[card.slug] || {};
        return {
          card_slug: card.slug,
          display_order: Number(d.display_order ?? card.display_order ?? idx),
          grid_col_start: Number(d.grid_col_start ?? card.grid_col_start ?? 1),
          grid_col_span: Number(d.grid_col_span ?? card.grid_col_span ?? 3),
          grid_row: Number(d.grid_row ?? card.grid_row ?? 1),
        };
      });
      const updated = await reorderDashboardCards(dashboardDef.slug, cards, token);
      setDashboardDef(updated);
      setDashboardMessage('Layout updated.');
    } catch (err: any) {
      setDashboardMessage(err.message || 'Failed to save layout');
    } finally {
      setReorderSaving(false);
    }
  };

  const selectedCubeDimensions = useMemo(() => {
    return (cubeMeta?.dimensions || []) as Array<{ name: string; title: string; type: string; shortTitle?: string }>;
  }, [cubeMeta]);

  const timeDimensions = useMemo(
    () => selectedCubeDimensions.filter(d => ['time', 'date', 'datetime', 'timestamp'].includes((d.type || '').toLowerCase())),
    [selectedCubeDimensions],
  );

  const filteredDashboards = useMemo(() => {
    const q = dashboardSearch.trim().toLowerCase();
    if (!q) return dashboards;
    return dashboards.filter((d: any) =>
      String(d.name || '').toLowerCase().includes(q) ||
      String(d.slug || '').toLowerCase().includes(q) ||
      String(d.audience || '').toLowerCase().includes(q),
    );
  }, [dashboards, dashboardSearch]);

  const filteredCards = useMemo(() => {
    const q = cardSearch.trim().toLowerCase();
    const cards = dashboardDef?.cards || [];
    if (!q) return cards;
    return cards.filter((c: any) =>
      String(c.title || '').toLowerCase().includes(q) ||
      String(c.slug || '').toLowerCase().includes(q) ||
      String(c.chart_type || '').toLowerCase().includes(q),
    );
  }, [dashboardDef, cardSearch]);

  const previewConfig = useMemo(() => {
    const measures: string[] = cardDraft?.measures || [];
    const dimensions: string[] = cardDraft?.dimensions || [];
    const dimKey = dimensions[0] || '';
    const color = getSchemeColor(cardDraft?.color_scheme);

    const chartData = (previewRows || []).slice(0, 50).map((row: any, idx: number) => {
      const point: any = {
        name: dimKey ? readDimension(row, dimKey) : `Row ${idx + 1}`,
      };
      measures.forEach((m) => {
        point[m] = readValue(row, m);
        point[m.split('.').pop() || m] = readValue(row, m);
      });
      point.__raw = row;
      return point;
    });

    return { measures, dimKey, chartData, color };
  }, [previewRows, cardDraft]);

  const xAxisLabel = (cardDraft?.x_axis_label || '').trim();
  const yAxisLabel = (cardDraft?.y_axis_label || '').trim();

  // Optional auto-preview for smoother editing flow.
  useEffect(() => {
    if (!cardBuilderOpen || !autoPreview || !cardDraft?.measures?.length) return;
    const timer = setTimeout(async () => {
      try {
        const previewQuery = {
          measures: cardDraft.measures,
          dimensions: cardDraft.dimensions || [],
          filters: jsonSafeParse(cardDraft.filters_json, []),
          time_dimensions: jsonSafeParse(cardDraft.time_dimensions_json, []),
          order: jsonSafeParse(cardDraft.order_json, {}),
          limit: 50,
          offset: 0,
        };
        const data = await fetchAnalyticsQuery(previewQuery, token);
        setPreviewRows(Array.isArray(data) ? data : data?.data || []);
      } catch {
        // Keep manual preview UX unaffected when draft JSON is invalid.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    cardBuilderOpen,
    autoPreview,
    token,
    cardDraft?.measures,
    cardDraft?.dimensions,
    cardDraft?.filters_json,
    cardDraft?.time_dimensions_json,
    cardDraft?.order_json,
  ]);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Dashboard Builder"
        subtitle="Create, edit, and manage dashboards/cards"
        nearlyFullscreen
      >
        <div style={{ display: 'grid', gridTemplateColumns: sidebarCollapsed ? '44px 1fr' : '300px 1fr', gap: 16, minHeight: 560 }}>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', background: C.surface }}>
            {sidebarCollapsed ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 10 }}>
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  title="Expand dashboard list"
                  style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: C.textSecondary }}
                >
                  »
                </button>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 11, color: C.textMuted, letterSpacing: '0.08em' }}>
                  DASHBOARDS
                </div>
              </div>
            ) : (
              <>
                <div style={{ padding: 12, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Dashboards</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={startCreateDashboard} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>+ New</button>
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      title="Collapse dashboard list"
                      style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: C.textSecondary }}
                    >
                      «
                    </button>
                  </div>
                </div>
                <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
                  <input
                    value={dashboardSearch}
                    onChange={e => setDashboardSearch(e.target.value)}
                    placeholder="Search dashboards..."
                    style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 9px', fontSize: 12, outline: 'none' }}
                  />
                </div>
                <div style={{ maxHeight: 510, overflow: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {loadingList ? (
                    <div style={{ color: C.textMuted, fontSize: 12, padding: 8 }}>Loading...</div>
                  ) : listError ? (
                    <div style={{ color: C.red, fontSize: 12, padding: 8 }}>{listError}</div>
                  ) : filteredDashboards.map(d => (
                    <button
                      key={d.slug}
                      onClick={() => { setIsCreateMode(false); setSelectedSlug(d.slug); }}
                      style={{
                        textAlign: 'left',
                        border: `1px solid ${(selectedSlug === d.slug && !isCreateMode) ? C.black : C.border}`,
                        borderRadius: 10,
                        background: (selectedSlug === d.slug && !isCreateMode) ? C.surfaceAlt : C.surface,
                        padding: 10,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{d.audience || 'general'} • {d.card_count ?? 0} cards</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, overflow: 'hidden' }}>
            <div style={{ padding: 14, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{isCreateMode ? 'Create Dashboard' : 'Dashboard Editor'}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{isCreateMode ? 'Define metadata and save' : (dashboardDef?.slug || selectedSlug || '')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {sidebarCollapsed && (
                  <button
                    onClick={() => setSidebarCollapsed(false)}
                    style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}
                  >
                    Show Dashboards
                  </button>
                )}
                {!isCreateMode && (
                  <button onClick={() => dashboardDef?.slug && onNavigate(dashboardDef.slug)} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                    Open
                  </button>
                )}
                {isCreateMode && <button onClick={stopCreateMode} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Cancel</button>}
              </div>
            </div>

            <div style={{ padding: 14, display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Name *</span>
                  <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value, slug: prev.slug || slugify(e.target.value) }))} style={{ border: `1px solid ${formErrors.name ? C.red : C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Slug *</span>
                  <input value={form.slug} onChange={e => setForm(prev => ({ ...prev, slug: slugify(e.target.value) }))} style={{ border: `1px solid ${formErrors.slug ? C.red : C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Audience</span>
                  <select value={form.audience} onChange={e => setForm(prev => ({ ...prev, audience: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}>
                    {AUDIENCE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: 10 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Description</span>
                  <input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Icon</span>
                  <input value={form.icon} onChange={e => setForm(prev => ({ ...prev, icon: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Display order</span>
                  <input type="number" value={form.display_order} onChange={e => setForm(prev => ({ ...prev, display_order: Number(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Refresh seconds</span>
                  <input type="number" value={form.refresh_interval_seconds} onChange={e => setForm(prev => ({ ...prev, refresh_interval_seconds: Number(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                </label>
              </div>

              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 11, color: C.textMuted }}>Tags (comma separated)</span>
                <input value={form.tags.join(', ')} onChange={e => setForm(prev => ({ ...prev, tags: parseTags(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
              </label>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button onClick={saveDashboardMeta} disabled={savingDashboard} style={{ border: 'none', background: C.black, color: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', opacity: savingDashboard ? 0.65 : 1 }}>
                  {savingDashboard ? 'Saving...' : isCreateMode ? 'Create dashboard' : 'Save metadata'}
                </button>
                {!isCreateMode && (
                  <button onClick={handleDeleteDashboard} style={{ border: `1px solid ${C.red}`, background: C.redLight, color: C.red, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
                    Delete dashboard
                  </button>
                )}
                {dashboardMessage && <span style={{ fontSize: 12, color: dashboardMessage.toLowerCase().includes('failed') ? C.red : C.textMuted }}>{dashboardMessage}</span>}
              </div>

              {!isCreateMode && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Card Canvas</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <input
                        value={cardSearch}
                        onChange={e => setCardSearch(e.target.value)}
                        placeholder="Search cards..."
                        style={{ border: `1px solid ${C.border}`, background: C.surface, borderRadius: 8, padding: '6px 10px', fontSize: 12, minWidth: 180, outline: 'none' }}
                      />
                      <button onClick={() => openCardBuilder()} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>+ Add Card</button>
                      <button onClick={saveLayout} disabled={reorderSaving} style={{ border: 'none', background: C.black, color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', opacity: reorderSaving ? 0.65 : 1 }}>
                        {reorderSaving ? 'Saving...' : 'Save Layout'}
                      </button>
                    </div>
                  </div>
                  {loadingDef ? (
                    <div style={{ color: C.textMuted, fontSize: 12 }}>Loading cards...</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflow: 'auto' }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        Layout fields: <strong>Order</strong>, <strong>Col Start</strong>, <strong>Col Span</strong>, <strong>Row</strong>. Use horizontal scroll if needed.
                      </div>
                      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 10 }}>
                        <div style={{ width: '100%' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(220px, 1fr) 56px 72px 72px 56px 120px',
                              gap: 8,
                              alignItems: 'center',
                              padding: '8px 10px',
                              background: C.surfaceAlt,
                              borderBottom: `1px solid ${C.border}`,
                              fontSize: 11,
                              color: C.textMuted,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <div>Card</div>
                            <div>Order</div>
                            <div>Col Start</div>
                            <div>Col Span</div>
                            <div>Row</div>
                            <div>Actions</div>
                          </div>

                          {filteredCards.map((card: any) => {
                            const layout = layoutDrafts[card.slug] || {};
                            return (
                              <div
                                key={card.slug}
                                style={{
                                  borderBottom: `1px solid ${C.border}`,
                                  padding: 10,
                                  display: 'grid',
                                  gridTemplateColumns: 'minmax(220px, 1fr) 56px 72px 72px 56px 120px',
                                  gap: 8,
                                  alignItems: 'center',
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{card.title}</div>
                                  <div style={{ fontSize: 11, color: C.textMuted }}>{card.chart_type} • {card.slug}</div>
                                </div>

                                <input
                                  type="number"
                                  aria-label="Display order"
                                  title="Display order: lower number appears earlier."
                                  value={layout.display_order ?? card.display_order}
                                  onChange={e => setLayoutDrafts(prev => ({ ...prev, [card.slug]: { ...prev[card.slug], display_order: Number(e.target.value) } }))}
                                  style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px' }}
                                />
                                <input
                                  type="number"
                                  aria-label="Grid column start"
                                  title="Grid column start (1-12): where the card begins."
                                  value={layout.grid_col_start ?? card.grid_col_start}
                                  onChange={e => setLayoutDrafts(prev => ({ ...prev, [card.slug]: { ...prev[card.slug], grid_col_start: Number(e.target.value) } }))}
                                  style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px' }}
                                />
                                <input
                                  type="number"
                                  aria-label="Grid column span"
                                  title="Grid column span (1-12): card width in columns."
                                  value={layout.grid_col_span ?? card.grid_col_span}
                                  onChange={e => setLayoutDrafts(prev => ({ ...prev, [card.slug]: { ...prev[card.slug], grid_col_span: Number(e.target.value) } }))}
                                  style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px' }}
                                />
                                <input
                                  type="number"
                                  aria-label="Grid row"
                                  title="Grid row: vertical position of the card."
                                  value={layout.grid_row ?? card.grid_row}
                                  onChange={e => setLayoutDrafts(prev => ({ ...prev, [card.slug]: { ...prev[card.slug], grid_row: Number(e.target.value) } }))}
                                  style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 6, padding: '5px 6px' }}
                                />
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => openCardBuilder(card)} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 6, padding: '5px 7px', cursor: 'pointer', fontSize: 11 }}>Edit</button>
                                  <button onClick={() => removeCard(card)} style={{ border: `1px solid ${C.red}`, background: C.redLight, color: C.red, borderRadius: 6, padding: '5px 7px', cursor: 'pointer', fontSize: 11 }}>Delete</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={cardBuilderOpen}
        onClose={() => setCardBuilderOpen(false)}
        title={cardEditing ? `Edit Card: ${cardEditing.title}` : 'Create Card'}
        subtitle="Pick cube, measures, valid drilldown dimensions, then configure chart"
        nearlyFullscreen
      >
        {cardDraft && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: '1. Cube', done: !!cardDraft.cube_name },
                { label: '2. Measures', done: (cardDraft.measures || []).length > 0 },
                { label: '3. Dimensions', done: true },
                { label: '4. Display', done: !!cardDraft.title && !!cardDraft.chart_type },
              ].map((s) => (
                <span
                  key={s.label}
                  style={{
                    border: `1px solid ${s.done ? C.black : C.border}`,
                    color: s.done ? C.black : C.textMuted,
                    background: s.done ? C.surfaceAlt : C.surface,
                    borderRadius: 999,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {s.label}
                </span>
              ))}
              <span style={{ border: `1px solid ${C.border}`, borderRadius: 999, padding: '4px 10px', fontSize: 11, color: C.textMuted }}>
                Selected: {(cardDraft.measures || []).length} measure(s), {(cardDraft.dimensions || []).length} dimension(s)
              </span>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 999, padding: '2px 8px', color: C.textMuted }}>Step 1</span>
                Choose Cube / View
              </div>
              <select
                value={cardDraft.cube_name}
                onChange={e => setCardDraft((p: any) => ({ ...p, cube_name: e.target.value, measures: [], dimensions: [], filters_json: '[]', time_dimensions_json: '[]', order_json: '{}' }))}
                style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}
              >
                <option value="">Select cube or view</option>
                {cubes.map((c: any) => <option key={c.name} value={c.name}>{c.title || c.name}</option>)}
              </select>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 999, padding: '2px 8px', color: C.textMuted }}>Step 2</span>
                Select Measures
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: 130, overflow: 'auto' }}>
                {(cubeMeta?.measures || []).map((m: any) => {
                  const checked = cardDraft.measures.includes(m.name);
                  return (
                    <label key={m.name} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setCardDraft((p: any) => ({
                          ...p,
                          measures: checked ? p.measures.filter((x: string) => x !== m.name) : [...p.measures, m.name],
                        }))}
                      />
                      <span>{m.shortTitle || m.title || m.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 999, padding: '2px 8px', color: C.textMuted }}>Step 3</span>
                Select Dimensions (Drill-down Safe)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, maxHeight: 130, overflow: 'auto' }}>
                {validDimensions.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.textMuted }}>No shared drilldown dimensions for selected measure(s). Leave empty for KPI/single value.</div>
                ) : validDimensions.map((d: string) => {
                  const dimMeta = selectedCubeDimensions.find(x => x.name === d);
                  const checked = cardDraft.dimensions.includes(d);
                  return (
                    <label key={d} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setCardDraft((p: any) => ({
                          ...p,
                          dimensions: checked ? p.dimensions.filter((x: string) => x !== d) : [...p.dimensions, d],
                        }))}
                      />
                      <span>{dimMeta?.shortTitle || dimMeta?.title || d}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 999, padding: '2px 8px', color: C.textMuted }}>Step 4</span>
                Configure Display & Query
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <input placeholder="Card title" value={cardDraft.title} onChange={e => setCardDraft((p: any) => ({ ...p, title: e.target.value, slug: p.slug || slugify(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <input placeholder="Card slug" value={cardDraft.slug} onChange={e => setCardDraft((p: any) => ({ ...p, slug: slugify(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <select value={cardDraft.chart_type} onChange={e => setCardDraft((p: any) => ({ ...p, chart_type: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}>
                  {CHART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={cardDraft.color_scheme} onChange={e => setCardDraft((p: any) => ({ ...p, color_scheme: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }}>
                  {COLOR_SCHEMES.map(c => (
                    <option key={c} value={c}>
                      {c === 'default' ? 'default (original)' : c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <input placeholder="Subtitle" value={cardDraft.subtitle} onChange={e => setCardDraft((p: any) => ({ ...p, subtitle: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <input placeholder="Value prefix" value={cardDraft.value_prefix} onChange={e => setCardDraft((p: any) => ({ ...p, value_prefix: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <input placeholder="Value suffix" value={cardDraft.value_suffix} onChange={e => setCardDraft((p: any) => ({ ...p, value_suffix: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <input placeholder="X axis label" value={cardDraft.x_axis_label} onChange={e => setCardDraft((p: any) => ({ ...p, x_axis_label: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <input placeholder="Y axis label" value={cardDraft.y_axis_label} onChange={e => setCardDraft((p: any) => ({ ...p, y_axis_label: e.target.value }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <input type="number" placeholder="Col start" title="Grid column start (1-12): where this card starts." value={cardDraft.grid_col_start} onChange={e => setCardDraft((p: any) => ({ ...p, grid_col_start: Number(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <input type="number" placeholder="Col span" title="Grid column span (1-12): width of this card." value={cardDraft.grid_col_span} onChange={e => setCardDraft((p: any) => ({ ...p, grid_col_span: Number(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
                <input type="number" placeholder="Row" title="Grid row: vertical placement in the dashboard." value={cardDraft.grid_row} onChange={e => setCardDraft((p: any) => ({ ...p, grid_row: Number(e.target.value) }))} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Filters (JSON array)</div>
                  <textarea rows={4} value={cardDraft.filters_json} onChange={e => setCardDraft((p: any) => ({ ...p, filters_json: e.target.value }))} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Time dimensions (JSON array)</div>
                  <textarea rows={4} value={cardDraft.time_dimensions_json} onChange={e => setCardDraft((p: any) => ({ ...p, time_dimensions_json: e.target.value }))} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }} />
                </div>
              </div>

              {timeDimensions.length > 0 && (
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  Available time dimensions: {timeDimensions.map(t => t.name).join(', ')}
                </div>
              )}

              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Order (JSON object)</div>
                <textarea rows={2} value={cardDraft.order_json} onChange={e => setCardDraft((p: any) => ({ ...p, order_json: e.target.value }))} style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace', fontSize: 11 }} />
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={cardDraft.show_legend} onChange={e => setCardDraft((p: any) => ({ ...p, show_legend: e.target.checked }))} /> Show legend</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}><input type="checkbox" checked={cardDraft.show_data_labels} onChange={e => setCardDraft((p: any) => ({ ...p, show_data_labels: e.target.checked }))} /> Show data labels</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'sticky', bottom: 0, background: C.surface, borderTop: `1px solid ${C.border}`, paddingTop: 10, paddingBottom: 2, zIndex: 2 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMuted }}>
                <input type="checkbox" checked={autoPreview} onChange={e => setAutoPreview(e.target.checked)} />
                Auto-preview (500ms debounce)
              </label>
              <button onClick={runPreview} disabled={previewLoading} style={{ border: `1px solid ${C.border}`, background: C.surfaceAlt, borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>
                {previewLoading ? 'Previewing...' : 'Live Preview'}
              </button>
              <button onClick={saveCard} disabled={cardSaving} style={{ border: 'none', background: C.black, color: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', opacity: cardSaving ? 0.65 : 1 }}>
                {cardSaving ? 'Saving...' : cardEditing ? 'Save Card' : 'Create Card'}
              </button>
              {(cardError || queryValidationError) && (
                <span style={{ fontSize: 12, color: C.red }}>{queryValidationError || cardError}</span>
              )}
            </div>

            <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Live Card Preview</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  {previewRows.length} row(s) returned • Chart type: {cardDraft.chart_type}
                </div>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{cardDraft.title || 'Untitled Card'}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{cardDraft.subtitle || 'Card subtitle preview'}</div>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cardDraft.chart_type}</div>
                </div>

                <div style={{ padding: 12, minHeight: 240 }}>
                  {previewConfig.chartData.length === 0 ? (
                    <div style={{ color: C.textMuted, fontSize: 12 }}>Run Live Preview to render chart visualization.</div>
                  ) : cardDraft.chart_type === 'kpi' ? (
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>Primary metric</div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: previewConfig.color, lineHeight: 1.1 }}>
                        {formatNumber(
                          readValue(previewConfig.chartData[0], previewConfig.measures[0] || ''),
                          cardDraft.value_prefix || '',
                          cardDraft.value_suffix || '',
                        )}
                      </div>
                    </div>
                  ) : ['bar', 'line', 'area'].includes(cardDraft.chart_type) ? (
                    <div style={{ width: '100%', height: 230 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        {cardDraft.chart_type === 'bar' ? (
                          <BarChart data={previewConfig.chartData} margin={{ top: 8, right: 8, left: 16, bottom: 26 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: C.textMuted }}
                              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -12, fill: C.textSecondary, fontSize: 11 } : undefined}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: C.textMuted }}
                              width={56}
                              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -6, fill: C.textSecondary, fontSize: 11 } : undefined}
                            />
                            <Tooltip />
                            <Bar dataKey={previewConfig.measures[0]} fill={previewConfig.color} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : cardDraft.chart_type === 'line' ? (
                          <LineChart data={previewConfig.chartData} margin={{ top: 8, right: 8, left: 16, bottom: 26 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: C.textMuted }}
                              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -12, fill: C.textSecondary, fontSize: 11 } : undefined}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: C.textMuted }}
                              width={56}
                              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -6, fill: C.textSecondary, fontSize: 11 } : undefined}
                            />
                            <Tooltip />
                            {previewConfig.measures.map((m, i) => (
                              <Line key={m} type="monotone" dataKey={m} stroke={[previewConfig.color, C.green, C.purple, C.amber][i % 4]} strokeWidth={2} dot={false} />
                            ))}
                          </LineChart>
                        ) : (
                          <AreaChart data={previewConfig.chartData} margin={{ top: 8, right: 8, left: 16, bottom: 26 }}>
                            <defs>
                              <linearGradient id="builderAreaFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={previewConfig.color} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={previewConfig.color} stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: C.textMuted }}
                              label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -12, fill: C.textSecondary, fontSize: 11 } : undefined}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: C.textMuted }}
                              width={56}
                              label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -6, fill: C.textSecondary, fontSize: 11 } : undefined}
                            />
                            <Tooltip />
                            <Area type="monotone" dataKey={previewConfig.measures[0]} stroke={previewConfig.color} fill="url(#builderAreaFill)" strokeWidth={2} />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : ['pie', 'donut'].includes(cardDraft.chart_type) ? (
                    <div style={{ width: '100%', height: 230 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={previewConfig.chartData}
                            dataKey={previewConfig.measures[0]}
                            nameKey="name"
                            innerRadius={cardDraft.chart_type === 'donut' ? 60 : 0}
                            outerRadius={88}
                            paddingAngle={2}
                          >
                            {previewConfig.chartData.map((_, i) => (
                              <Cell key={i} fill={[previewConfig.color, C.green, C.purple, C.amber, C.red, '#64748b'][i % 6]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : cardDraft.chart_type === 'scatter' ? (
                    previewConfig.measures.length < 2 ? (
                      <div style={{ color: C.textMuted, fontSize: 12 }}>Scatter preview needs 2 measures (X and Y).</div>
                    ) : (
                      <div style={{ width: '100%', height: 230 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 8, right: 8, left: 24, bottom: 26 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                            <XAxis
                              dataKey={previewConfig.measures[0]}
                              name={previewConfig.measures[0]}
                              label={{
                                value: xAxisLabel || previewConfig.measures[0].split('.').pop(),
                                position: 'insideBottom',
                                offset: -12,
                                fill: C.textSecondary,
                                fontSize: 11,
                              }}
                            />
                            <YAxis
                              dataKey={previewConfig.measures[1]}
                              name={previewConfig.measures[1]}
                              width={56}
                              label={{
                                value: yAxisLabel || previewConfig.measures[1].split('.').pop(),
                                angle: -90,
                                position: 'insideLeft',
                                offset: -6,
                                fill: C.textSecondary,
                                fontSize: 11,
                              }}
                            />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter data={previewConfig.chartData} fill={previewConfig.color} />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            {Object.keys(previewRows[0] || {}).slice(0, 5).map((k) => (
                              <th key={k} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: `1px solid ${C.border}`, color: C.textMuted }}>{k.split('.').pop()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.slice(0, 5).map((r, i) => (
                            <tr key={i}>
                              {Object.keys(previewRows[0] || {}).slice(0, 5).map((k) => (
                                <td key={k} style={{ padding: '6px 8px', borderBottom: `1px solid ${C.surfaceAlt}` }}>{String(r[k] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, background: C.surfaceAlt }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Raw preview rows (first 10)</div>
                <div style={{ maxHeight: 150, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
                  {previewRows.length === 0 ? 'No preview data yet.' : JSON.stringify(previewRows.slice(0, 10), null, 2)}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

