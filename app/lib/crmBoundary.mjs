/** CRM membership boundary only. Final module and row permissions belong in backend RLS/API. */
const STAFF_ROLES = new Set([
  "super_admin", "admin", "sales", "sales_marketing", "marketing",
  "accounts_finance", "viewer_management"
]);
export function isCrmStaffRole(role) {
  return typeof role === "string" && STAFF_ROLES.has(role);
}
export function isAllowedCrmRoute(path, role) {
  if (!isCrmStaffRole(role) || typeof path !== "string") return false;
  // Student and parent portals, and the legacy LMS content-administration page,
  // are not part of the CRM boundary after the split.
  if (path === "/student" || path === "/parent" || path === "/portal-access") return false;
  if (path === "/lms" || path.startsWith("/lms/")) return false;
  return path === "/dashboard" || path === "/access" ||
    path === "/students" || path.startsWith("/students/") ||
    path === "/batches" || path.startsWith("/batches/") ||
    path === "/trainers" || path === "/courses" ||
    path === "/reports" || path === "/payments" ||
    path === "/crm/leads" || path === "/crm/demos" ||
    path.startsWith("/sessions/");
}
