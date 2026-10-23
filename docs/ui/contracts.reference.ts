// Orbit UI reference types — documentation only; not imported by application code.
// Approved component API proposal (v1) for CRM/LMS/ByteXL consistency.
export type OrbitProduct = "crm" | "lms";
export type OrbitRole = "super_admin" | "admin" | "sales" | "marketing" | "trainer" |
  "team_member" | "viewer_management" | "parent" | "student" | "other";
export type DataState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; retry?: () => void }
  | { status: "empty"; message: string }
  | { status: "ready"; data: T };

export type OrbitNavItem = {
  id: string;
  label: string;
  icon: string; // agreed icon-library name
  href?: string;
  children?: OrbitNavItem[];
  badge?: { count: number; ariaLabel: string };
  capability?: string; // resolved on trusted side before passing here
  status?: "active" | "planned";
};
export type OrbitSidebarProps = {
  product: OrbitProduct;
  items: OrbitNavItem[]; // already filtered against authorised capabilities
  pathname: string;
  account: { displayName: string; roleLabel: string; email?: string };
  onSignOut: () => Promise<void>;
};
export type OrbitKpiCardProps = {
  label: string;
  value: number | null;
  tone: "cyan" | "blush" | "lavender" | "mint" | "neutral";
  icon: string;
  trend?: { deltaPct: number | null; comparisonLabel: string };
  href?: string; // only when a real destination exists
};
export type OrbitPanelProps = {
  title: string;
  helperText?: string;
  action?: { label: string; href: string };
};
export type OrbitDashboardModel = {
  period: { from: string; to: string; timezone: string };
  kpis: DataState<OrbitKpiCardProps[]>;
  leadChart: DataState<Array<{ key: string; label: string; count: number; pctOfBase: number | null }>>;
  sources: DataState<Array<{ source: string; count: number; fraction: number }>>;
  recentLeads: DataState<Array<{ id: string; student: string; parent: string; course?: string; stage: string; nextFollowUp?: string | null }>>;
  followUps: DataState<Array<{ leadId: string; studentLabel: string; dueDate: string; state: "overdue" | "today" | "upcoming" }>>;
  activity: DataState<Array<{ id: string; actionLabel: string; createdAt: string; actorLabel?: string; leadId?: string }>>;
};
