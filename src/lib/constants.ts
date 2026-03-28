export const C = {
  black: "#0a0a0a",
  ink: "#111118",
  charcoal: "#1c1c24",
  border: "#e4e4ec",
  borderDark: "#2a2a36",
  surface: "#ffffff",
  surfaceAlt: "#f8f8fb",
  muted: "#f3f3f7",
  textPrimary: "#0a0a0a",
  textSecondary: "#5a5a72",
  textMuted: "#9898b0",
  accent: "#0a0a0a",
  accentSoft: "#f0f0f5",
  blue: "#2563eb",
  blueLight: "#eff4ff",
  green: "#16a34a",
  greenLight: "#f0fdf4",
  amber: "#d97706",
  amberLight: "#fffbeb",
  red: "#dc2626",
  redLight: "#fef2f2",
  purple: "#7c3aed",
  purpleLight: "#f5f3ff",
  chart1: "#0a0a0a",
  chart2: "#2563eb",
  chart3: "#16a34a",
  chart4: "#d97706",
  chart5: "#dc2626",
  chart6: "#7c3aed",
};

export const revenueData = [
  { d: "May 1", cur: 62, prev: 51 }, { d: "May 3", cur: 71, prev: 54 },
  { d: "May 5", cur: 68, prev: 57 }, { d: "May 7", cur: 84, prev: 60 },
  { d: "May 9", cur: 79, prev: 58 }, { d: "May 11", cur: 91, prev: 63 },
  { d: "May 13", cur: 88, prev: 65 }, { d: "May 15", cur: 102, prev: 68 },
  { d: "May 17", cur: 97, prev: 70 }, { d: "May 19", cur: 121, prev: 72 },
  { d: "May 21", cur: 108, prev: 74 }, { d: "May 23", cur: 115, prev: 76 },
  { d: "May 25", cur: 119, prev: 78 }, { d: "May 27", cur: 128, prev: 80 },
  { d: "May 29", cur: 134, prev: 82 },
];

export const channelROAS = [
  { channel: "Email/CRM", roas: 8.1, spend: 4.2, revenue: 34.0, color: C.green },
  { channel: "Paid Search", roas: 6.2, spend: 48.0, revenue: 297.6, color: C.blue },
  { channel: "LinkedIn ABM", roas: 3.4, spend: 22.0, revenue: 74.8, color: C.purple },
  { channel: "Meta Social", roas: 2.8, spend: 32.0, revenue: 89.6, color: C.amber },
  { channel: "Display RTG", roas: 1.6, spend: 8.8, revenue: 14.1, color: C.textMuted },
  { channel: "TikTok UGC", roas: 1.1, spend: 0, revenue: 0, color: C.red },
];

export const funnelData = [
  { stage: "Visitors", count: 148200, rate: null, color: C.blue },
  { stage: "Leads", count: 18400, rate: 12.4, color: "#3b82f6" },
  { stage: "MQL", count: 5240, rate: 28.5, color: C.amber },
  { stage: "SQL", count: 820, rate: 15.6, color: "#f59e0b" },
  { stage: "Opportunities", count: 312, rate: 38.0, color: C.textSecondary },
  { stage: "Closed Won", count: 98, rate: 31.4, color: C.green },
];

export const attributionData = [
  { name: "Paid Search", value: 38, revenue: 912000, color: C.chart1 },
  { name: "Paid Social", value: 24, revenue: 576000, color: C.blue },
  { name: "Organic SEO", value: 18, revenue: 432000, color: C.green },
  { name: "Email/CRM", value: 12, revenue: 288000, color: C.purple },
  { name: "Affiliate", value: 6, revenue: 144000, color: C.amber },
  { name: "Direct", value: 2, revenue: 48000, color: "#d4d4e0" },
];

export const campaigns = [
  { id: 1, name: "Google Brand PMax", type: "Search · PMax", status: "live", roas: 6.2, spend: 48000, revenue: 297600, ctr: 4.8, cpc: 1.2, impressions: 1240000, clicks: 59520, conversions: 1240, cpa: 38.7, budget: 60000, pacing: 80 },
  { id: 2, name: "Meta Prospecting Q2", type: "Social · Lookalike", status: "warning", roas: 2.8, spend: 32000, revenue: 89600, ctr: 1.2, cpc: 4.8, impressions: 2800000, clicks: 33600, conversions: 320, cpa: 100.0, budget: 35000, pacing: 91 },
  { id: 3, name: "Email Nurture Series", type: "Email · 5-Stage", status: "live", roas: 8.1, spend: 4200, revenue: 34020, ctr: 28.4, cpc: 0.2, impressions: 84000, clicks: 23856, conversions: 420, cpa: 10.0, budget: 5000, pacing: 84 },
  { id: 4, name: "LinkedIn ABM Tier-1", type: "Social · ABM", status: "live", roas: 3.4, spend: 22000, revenue: 74800, ctr: 0.8, cpc: 12.4, impressions: 620000, clicks: 4960, conversions: 88, cpa: 250.0, budget: 25000, pacing: 88 },
  { id: 5, name: "Display Retargeting", type: "Display · RTG", status: "warning", roas: 1.6, spend: 8800, revenue: 14080, ctr: 0.3, cpc: 2.1, impressions: 4200000, clicks: 12600, conversions: 56, cpa: 157.1, budget: 8800, pacing: 100 },
  { id: 6, name: "TikTok UGC Awareness", type: "Social · UGC", status: "paused", roas: 1.1, spend: 0, revenue: 0, ctr: 0.6, cpc: 3.2, impressions: 0, clicks: 0, conversions: 0, cpa: 0, budget: 12000, pacing: 0 },
  { id: 7, name: "YouTube Brand Story", type: "Video · Brand", status: "live", roas: 2.1, spend: 18000, revenue: 37800, ctr: 0.9, cpc: 3.8, impressions: 3200000, clicks: 28800, conversions: 180, cpa: 100.0, budget: 20000, pacing: 90 },
];

export const audienceSegments = [
  { segment: "Enterprise (500+)", size: 2840, ltv: 42000, cac: 1240, health: 94, churnRisk: "low" },
  { segment: "Mid-Market (50-499)", size: 8420, ltv: 18000, cac: 640, health: 78, churnRisk: "medium" },
  { segment: "SMB (<50)", size: 24100, ltv: 4200, cac: 180, health: 62, churnRisk: "high" },
  { segment: "Startup (Funded)", size: 3200, ltv: 9800, cac: 420, health: 71, churnRisk: "medium" },
];

export const channelTrend = [
  { month: "Jan", search: 380, social: 210, email: 28, seo: 160, display: 45 },
  { month: "Feb", search: 410, social: 195, email: 32, seo: 172, display: 48 },
  { month: "Mar", search: 445, social: 240, email: 38, seo: 185, display: 42 },
  { month: "Apr", search: 420, social: 220, email: 42, seo: 198, display: 38 },
  { month: "May", search: 480, social: 180, email: 52, seo: 210, display: 34 },
];

export const forecastData = [
  { m: "Apr", actual: 1820, forecast: null, lower: null, upper: null },
  { m: "May", actual: 2140, forecast: null, lower: null, upper: null },
  { m: "Jun", actual: null, forecast: 2380, lower: 2100, upper: 2660 },
  { m: "Jul", actual: null, forecast: 2640, lower: 2280, upper: 3000 },
  { m: "Aug", actual: null, forecast: 2890, lower: 2440, upper: 3340 },
  { m: "Sep", actual: null, forecast: 3120, lower: 2580, upper: 3660 },
];

export const mlChurnSegments = [
  { name: "Critical (>80%)", value: 312, color: C.red },
  { name: "High (60-80%)", value: 928, color: C.amber },
  { name: "Medium (40-60%)", value: 1840, color: "#fbbf24" },
  { name: "Low (<40%)", value: 4200, color: C.green },
];

export const agentLogs = [
  { time: "09:42", type: "AUTO", color: C.textMuted, msg: "Paused TikTok UGC — ROAS below 1.2× threshold for 48h consecutive" },
  { time: "08:15", type: "AUTO", color: C.textMuted, msg: "Sent churn-risk digest to Customer Success (312 critical accounts)" },
  { time: "07:30", type: "AGENT", color: C.blue, msg: "Refreshed LinkedIn LAL seed audience from last 90d Closed Won list" },
  { time: "Yesterday", type: "AUTO", color: C.textMuted, msg: "Bid cap adjusted on Google Brand — CPCs trending +18% vs benchmark" },
];
