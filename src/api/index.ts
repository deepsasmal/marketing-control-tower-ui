import { API_BASE_URL } from './config';
import { DashboardListItem, DashboardDataResponse } from '../types/api';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function parseError(res: Response): Promise<Error> {
  const payload = await res.json().catch(() => ({}));
  const message =
    payload?.detail ||
    payload?.message ||
    (Array.isArray(payload?.errors) && payload.errors.join(', ')) ||
    `Request failed (${res.status})`;
  return new Error(message);
}

async function request<T>(
  path: string,
  token: string,
  method: HttpMethod = 'GET',
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export const login = async (username: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return res.json();
};

export const fetchDashboards = async (token: string): Promise<DashboardListItem[]> => {
  return request<DashboardListItem[]>('/dashboards', token);
};

export const fetchDashboardData = async (slug: string, token: string): Promise<DashboardDataResponse> => {
  return request<DashboardDataResponse>(`/dashboards/${slug}/data`, token);
};

export const fetchDashboardDefinition = async (slug: string, token: string) => {
  return request<any>(`/dashboards/${slug}`, token);
};

export const fetchAnalyticsQuery = async (query: any, token: string) => {
  return request<any>('/analytics/query', token, 'POST', query);
};

export const fetchCubes = async (token: string) => {
  return request<any[]>('/analytics/cubes', token);
};

export const fetchCubeMetadata = async (cubeName: string, token: string) => {
  return request<any>(`/analytics/cubes/${cubeName}`, token);
};

export const fetchDrilldowns = async (cubeName: string, token: string) => {
  return request<any>(`/analytics/cubes/${cubeName}/drilldowns`, token);
};

export const validateCubeQuery = async (payload: { measures: string[]; dimensions?: string[] }, token: string) => {
  return request<any>('/admin/validate/cube-query', token, 'POST', payload);
};

export const createDashboard = async (payload: any, token: string) => {
  return request<any>('/admin/dashboards', token, 'POST', payload);
};

export const updateDashboard = async (slug: string, payload: any, token: string) => {
  return request<any>(`/admin/dashboards/${slug}`, token, 'PUT', payload);
};

export const deleteDashboard = async (slug: string, token: string) => {
  return request<void>(`/admin/dashboards/${slug}`, token, 'DELETE');
};

export const createDashboardCard = async (dashboardSlug: string, payload: any, token: string) => {
  return request<any>(`/admin/dashboards/${dashboardSlug}/cards`, token, 'POST', payload);
};

export const updateDashboardCard = async (dashboardSlug: string, cardSlug: string, payload: any, token: string) => {
  return request<any>(`/admin/dashboards/${dashboardSlug}/cards/${cardSlug}`, token, 'PUT', payload);
};

export const deleteDashboardCard = async (dashboardSlug: string, cardSlug: string, token: string) => {
  return request<void>(`/admin/dashboards/${dashboardSlug}/cards/${cardSlug}`, token, 'DELETE');
};

export const reorderDashboardCards = async (
  dashboardSlug: string,
  cards: Array<{ card_slug: string; display_order: number; grid_col_start: number; grid_col_span: number; grid_row: number }>,
  token: string,
) => {
  return request<any>(`/admin/dashboards/${dashboardSlug}/cards/reorder`, token, 'PUT', { cards });
};
