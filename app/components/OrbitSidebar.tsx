"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// Cache the sidebar identity between App Router page changes.
// Each Orbit page currently remounts the Sidebar. Without this cache,
// role-based menu items briefly disappear while Supabase is queried again.
let cachedRole = "";
let cachedPendingAccess = 0;
let cachedEmail = "";

type Props = {
  email: string;
  active:
    | "overview"
    | "crm-leads"
    | "crm-demos"
    | "students"
    | "batches"
    | "sessions"
    | "courses"
    | "lms"
    | "trainers"
    | "reports"
    | "payments"
    | "access"
    | "portal-access";
};

const PREFETCH_ROUTES = [
  "/dashboard",
  "/crm/leads",
  "/crm/demos",
  "/students",
  "/batches",
  "/trainers",
  "/payments",
  "/courses",
  "/reports",
  "/access",
];

function OrbitNavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    overview: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7",
    crm: "M4 3h16v18H4zM8 8h8M8 12h8M8 16h5",
    students: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    batches: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
    trainers: "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10M4 22a8 8 0 0 1 16 0",
    payments: "M12 2v20M17 6H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H7",
    courses: "M4 5h16v15H7a3 3 0 0 0-3 2V8a3 3 0 0 1 3-3M8 9h8M8 13h8",
    lms: "M4 3h16v18H4zM8 8h8M8 12h8M8 16h6",
    reports: "M4 20v-7M9 20V8M14 20V4M19 20v-10",
    access: "M4 11h16v11H4zM8 11V7a4 4 0 0 1 8 0v4",
    portal: "M3 12l9-9 9 9-9 9z",
    aqmatics: "M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.overview} />
    </svg>
  );
}
export default function OrbitSidebar({ email, active }: Props) {
  const router = useRouter();

  const [crmOpen, setCrmOpen] = useState(
    active === "crm-leads" || active === "crm-demos"
  );

  const [role, setRole] = useState(cachedRole);
  const [pendingAccess, setPendingAccess] = useState(cachedPendingAccess);

  const displayEmail = email || cachedEmail;

  useEffect(() => {
    if (email) cachedEmail = email;
  }, [email]);

  useEffect(() => {
    PREFETCH_ROUTES.forEach((route) => router.prefetch(route));
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function refreshSidebarIdentity() {
      // getSession uses the browser's restored session, so the Sidebar
      // does not wait on another auth validation call during every route change.
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user || cancelled) return;

      if (!cachedEmail && user.email) {
        cachedEmail = user.email;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      const currentRole = profile?.role || cachedRole || "";

      if (currentRole) {
        cachedRole = currentRole;
        setRole(currentRole);
      }

      if (currentRole === "super_admin" || currentRole === "admin") {
        const { data: count } = await supabase.rpc(
          "pending_access_request_count"
        );

        if (cancelled) return;

        cachedPendingAccess = Number(count || 0);
        setPendingAccess(cachedPendingAccess);
      } else {
        cachedPendingAccess = 0;
        setPendingAccess(0);
      }
    }

    refreshSidebarIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    cachedRole = "";
    cachedPendingAccess = 0;
    cachedEmail = "";

    await supabase.auth.signOut();
    router.replace("/");
  }

  function navigate(path: string) {
    router.push(path);
  }

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";
  const isSales = role === "sales" || role === "sales_marketing";
  const isMarketing = role === "marketing";
  const isFinance = role === "accounts_finance";
  const isManagement = role === "viewer_management";
  const isTrainer = role === "trainer";

  const canSeeCrm =
    isSuperAdmin || isAdmin || isSales || isMarketing || isManagement;

  const canSeeStudents =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isFinance ||
    isManagement;

  const canSeeBatches =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isFinance ||
    isManagement ||
    isTrainer;

  const canSeeTrainers =
    isSuperAdmin || isAdmin || isSales || isMarketing || isManagement;

  const canSeePayments =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isFinance ||
    isManagement;

  const canSeeCourses =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isFinance ||
    isManagement;

  const canSeeReports =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isFinance ||
    isManagement;

  const canSeeLms =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isManagement ||
    isTrainer;

  const canSeeAccess = isSuperAdmin || isAdmin;

  return (
    <aside className={styles.sidebar}>
      <div>
        <button
          className={styles.brand}
          onClick={() => navigate("/dashboard")}
        >
          <img
            src="/orbit-mascot.png"
            alt="Orbit mascot"
            className={styles.brandMascot}
          />

          <span className={styles.brandCopy}>
            <strong>Orbit CRM</strong>
            <small>by igebra.ai</small>
          </span>
        </button>

        <nav className={styles.nav}>
          <button
            className={active === "overview" ? styles.navActive : ""}
            onClick={() => navigate("/dashboard")}
          >
            <span><OrbitNavIcon name="overview" /></span> Overview
          </button>

          {canSeeCrm && (
            <div className={styles.crmGroup}>
              <button
                className={
                  active === "crm-leads" || active === "crm-demos"
                    ? styles.navActive
                    : ""
                }
                onClick={() => setCrmOpen((value) => !value)}
              >
                <span><OrbitNavIcon name="crm" /></span> CRM
                <span className={styles.chevron} aria-hidden="true">
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round"
    strokeLinejoin="round">
    <path d={crmOpen ? "M6 9l6 6 6-6" : "M9 6l6 6-6 6"} />
  </svg>
</span>
              </button>

              {crmOpen && (
                <div className={styles.subNav}>
                  <button
                    className={
                      active === "crm-leads" ? styles.navActive : ""
                    }
                    onClick={() => navigate("/crm/leads")}
                  >
                    Leads
                  </button>

                  <button
                    className={
                      active === "crm-demos" ? styles.navActive : ""
                    }
                    onClick={() => navigate("/crm/demos")}
                  >
                    Demo Schedule
                  </button>
                </div>
              )}
            </div>
          )}

          {canSeeStudents && (
            <button
              className={active === "students" ? styles.navActive : ""}
              onClick={() => navigate("/students")}
            >
              <span><OrbitNavIcon name="students" /></span> Students
            </button>
          )}

          {canSeeBatches && (
            <button
              className={
                active === "batches" || active === "sessions"
                  ? styles.navActive
                  : ""
              }
              onClick={() => navigate("/batches")}
            >
              <span><OrbitNavIcon name="batches" /></span> Batches
            </button>
          )}

          {canSeeTrainers && (
            <button
              className={active === "trainers" ? styles.navActive : ""}
              onClick={() => navigate("/trainers")}
            >
              <span><OrbitNavIcon name="trainers" /></span> Trainers
            </button>
          )}

          {canSeePayments && (
            <button
              className={active === "payments" ? styles.navActive : ""}
              onClick={() => navigate("/payments")}
            >
              <span><OrbitNavIcon name="payments" /></span> Payments
            </button>
          )}

          {canSeeCourses && (
            <button
              className={active === "courses" ? styles.navActive : ""}
              onClick={() => navigate("/courses")}
            >
              <span><OrbitNavIcon name="courses" /></span> Courses
            </button>
          )}

          {canSeeLms && (
            <button
              className={active === "lms" ? styles.navActive : ""}
              onClick={() => {
                const lmsUrl = process.env.NEXT_PUBLIC_ORBIT_LMS_URL?.trim();

                if (!lmsUrl) {
                  window.alert(
                    "Standalone LMS URL is not configured. Add NEXT_PUBLIC_ORBIT_LMS_URL to the CRM .env.local file."
                  );
                  return;
                }

                window.location.assign(lmsUrl);
              }}
            >
              <span><OrbitNavIcon name="lms" /></span> LMS
            </button>
          )}

          {canSeeReports && (
            <button
              className={active === "reports" ? styles.navActive : ""}
              onClick={() => navigate("/reports")}
            >
              <span><OrbitNavIcon name="reports" /></span> Reports
            </button>
          )}

          {canSeeAccess && (
            <button
              className={active === "access" ? styles.navActive : ""}
              onClick={() => navigate("/access")}
            >
              <span><OrbitNavIcon name="access" /></span> Access

              {pendingAccess > 0 && (
                <span
                  title={`${pendingAccess} pending access request${
                    pendingAccess === 1 ? "" : "s"
                  }`}
                  style={{
                    marginLeft: "auto",
                    minWidth: 20,
                    height: 20,
                    padding: "0 6px",
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#D9853B",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {pendingAccess}
                </span>
              )}
            </button>
          )}
<button type="button">
            <span><OrbitNavIcon name="aqmatics" /></span> AQMATICS
            <small className={styles.soon}>Soon</small>
          </button>
        </nav>
      </div>

      <div className={styles.sidebarBottom}>
        <div className={styles.userBox}>
          <span className={styles.avatar}>
            {displayEmail
              ? displayEmail.charAt(0).toUpperCase()
              : "A"}
          </span>

          <span>
            <strong>Orbit User</strong>
            <small>{displayEmail}</small>
          </span>
        </div>

        <button className={styles.signOut} onClick={signOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
