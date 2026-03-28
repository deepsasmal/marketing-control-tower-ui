// ── Cube schema types ──────────────────────────────────────────────────────

export interface CubeMember {
  name: string;
  title: string;
  shortTitle: string;
  type: string;
}

export interface CubeDetail {
  name: string;
  title: string;
  measures: CubeMember[];
  dimensions: CubeMember[];
}

export interface DrilldownDimension {
  name: string;
  title: string;
  type: string;
}

export interface DrilldownEntry {
  measure: string;
  measure_title: string;
  valid_dimensions: DrilldownDimension[];
}

export interface DrilldownsResponse {
  cube: string;
  drilldowns: DrilldownEntry[];
}

// ── Dashboard types ────────────────────────────────────────────────────────

export interface DashboardListItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  audience: string;
  display_order: number;
  refresh_interval_seconds: number;
  tags: string[];
  card_count: number;
}

export interface CardWithData {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string | null;
  chart_type: string;
  grid_col_start: number;
  grid_col_span: number;
  grid_row: number;
  display_order: number;
  value_prefix: string | null;
  value_suffix: string | null;
  color_scheme: string;
  x_axis_label: string | null;
  y_axis_label: string | null;
  show_legend: boolean;
  show_data_labels: boolean;
  metadata: Record<string, any>;
  cube_query: {
    measures: string[];
    dimensions: string[];
    limit?: number;
    time_dimensions?: any[];
  };
  data: any[];
  row_count: number;
  error: string | null;
}

export interface DashboardDataResponse {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  audience: string;
  refresh_interval_seconds: number;
  tags: string[];
  metadata: Record<string, any>;
  total_cards: number;
  failed_cards: number;
  cards: CardWithData[];
}
