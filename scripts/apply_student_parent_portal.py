from pathlib import Path

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Could not patch {label}. No files were changed.")
    return text.replace(old, new, 1)

# ============================================================
# SIDEBAR
# ============================================================
sidebar_path = Path("app/components/OrbitSidebar.tsx")
sidebar = sidebar_path.read_text(encoding="utf-8")

if '| "portal-access";' not in sidebar:
    sidebar = replace_once(
        sidebar,
        '    | "payments"\n    | "access";',
        '    | "payments"\n    | "access"\n    | "portal-access";',
        "Sidebar active type",
    )

if '"/portal-access"' not in sidebar:
    sidebar = replace_once(
        sidebar,
        '  "/access",\n];',
        '  "/access",\n  "/portal-access",\n];',
        "Sidebar prefetch",
    )

portal_button = '''          {canSeeAccess && (
            <button
              className={active === "portal-access" ? styles.navActive : ""}
              onClick={() => navigate("/portal-access")}
            >
              <span>◇</span> Portal Access
            </button>
          )}

'''

if 'navigate("/portal-access")' not in sidebar:
    marker = '''          <button type="button">
            <span>◌</span> AQMATICS'''
    sidebar = replace_once(
        sidebar,
        marker,
        portal_button + marker,
        "Portal Access sidebar button",
    )

sidebar_path.write_text(sidebar, encoding="utf-8")

# ============================================================
# LOGIN / ACTIVATION
# ============================================================
login_path = Path("app/page.tsx")
login = login_path.read_text(encoding="utf-8")

old_check_session = '''    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/dashboard");
    }'''

new_check_session = '''    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      await supabase.rpc("activate_portal_access");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role,is_active")
        .eq("id", data.session.user.id)
        .single();

      if (!profile?.is_active) return;

      if (profile.role === "student") router.replace("/student");
      else if (profile.role === "parent") router.replace("/parent");
      else router.replace("/dashboard");
    }'''

if old_check_session in login:
    login = login.replace(old_check_session, new_check_session, 1)
elif 'profile.role === "student") router.replace("/student")' not in login:
    raise SystemExit("Could not patch login session routing.")

old_profile_lookup = '''    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active")
      .eq("id", userId)
      .single();'''

new_profile_lookup = '''    await supabase.rpc("activate_portal_access");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role,is_active")
      .eq("id", userId)
      .single();'''

if old_profile_lookup in login:
    login = login.replace(old_profile_lookup, new_profile_lookup, 1)
elif '.select("role,is_active")' not in login:
    raise SystemExit("Could not patch login profile lookup.")

old_signin_redirect = '''    router.replace("/dashboard");
  }

  async function forgotPassword() {'''

new_signin_redirect = '''    if (profile.role === "student") router.replace("/student");
    else if (profile.role === "parent") router.replace("/parent");
    else router.replace("/dashboard");
  }

  async function forgotPassword() {'''

if old_signin_redirect in login:
    login = login.replace(old_signin_redirect, new_signin_redirect, 1)
elif 'else if (profile.role === "parent") router.replace("/parent")' not in login:
    raise SystemExit("Could not patch sign-in portal redirect.")

old_approval_check = '''    if (!approved) {
      setActivateLoading(false);
      setActivateMessage("Your access request has not been approved yet.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({'''

new_approval_check = '''    const { data: portalApproved, error: portalApprovalError } =
      await supabase.rpc("portal_access_grant_exists", {
        p_email: cleanEmail,
      });

    if (portalApprovalError) {
      setActivateLoading(false);
      setActivateMessage(portalApprovalError.message);
      return;
    }

    if (!approved && !portalApproved) {
      setActivateLoading(false);
      setActivateMessage("Your access has not been approved yet.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({'''

if old_approval_check in login:
    login = login.replace(old_approval_check, new_approval_check, 1)
elif 'portal_access_grant_exists' not in login:
    raise SystemExit("Could not patch portal activation approval check.")

old_activate_redirect = '''    if (data.session) {
      router.replace("/dashboard");
      return;
    }'''

new_activate_redirect = '''    if (data.session) {
      const { data: portalRole } = await supabase.rpc(
        "activate_portal_access"
      );

      if (portalRole === "student") router.replace("/student");
      else if (portalRole === "parent") router.replace("/parent");
      else router.replace("/dashboard");
      return;
    }'''

if old_activate_redirect in login:
    login = login.replace(old_activate_redirect, new_activate_redirect, 1)
elif 'portalRole === "student"' not in login:
    raise SystemExit("Could not patch approved-access redirect.")

login_path.write_text(login, encoding="utf-8")

# ============================================================
# DASHBOARD SAFETY REDIRECT
# ============================================================
dashboard_path = Path("app/dashboard/page.tsx")
dashboard = dashboard_path.read_text(encoding="utf-8")

dashboard_old = '''      const currentRole = profile?.role || "";
      setRole(currentRole);

      await loadDashboard(currentRole);'''

dashboard_new = '''      const currentRole = profile?.role || "";

      if (currentRole === "student") {
        router.replace("/student");
        return;
      }

      if (currentRole === "parent") {
        router.replace("/parent");
        return;
      }

      setRole(currentRole);

      await loadDashboard(currentRole);'''

if dashboard_old in dashboard:
    dashboard = dashboard.replace(dashboard_old, dashboard_new, 1)
elif 'if (currentRole === "student")' not in dashboard:
    raise SystemExit("Could not patch Dashboard portal protection.")

dashboard_path.write_text(dashboard, encoding="utf-8")

print("Student + Parent portal patches applied.")
