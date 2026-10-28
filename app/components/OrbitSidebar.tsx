"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "../lms.module.css";
import OrbitNavIcon from "./OrbitNavIcon";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// Cache the sidebar identity between App Router page changes.
// Each Orbit page currently remounts the Sidebar. Without this cache,
// role-based menu items briefly disappear while Supabase is queried again.
let cachedRole = "";
let cachedUserId = "";
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

export default function OrbitSidebar({ email, active }: Props) {
  const router = useRouter();

  const [crmOpen, setCrmOpen] = useState(
    active === "crm-leads" || active === "crm-demos"
  );

  const [role, setRole] = useState(() =>
    cachedEmail && email && cachedEmail.toLowerCase() === email.toLowerCase()
      ? cachedRole : ""
  );
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

      if (cancelled) return;
      if (!user) {
        cachedRole = ""; cachedUserId = ""; cachedEmail = "";
        setRole(""); setPendingAccess(0);
        return;
      }
      if (cachedUserId && cachedUserId !== user.id) {
        cachedRole = ""; cachedPendingAccess = 0;
        setRole(""); setPendingAccess(0);
      }
      cachedUserId = user.id;

      if (!cachedEmail && user.email) {
        cachedEmail = user.email;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      const currentRole = profile?.role || "";

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
    cachedUserId = "";
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

  const canSeeAccess = isSuperAdmin;

  return (
    <aside className={styles.sidebar}>
      <div>
        <button
          type="button"
          className={styles.brand}
          onClick={() => navigate("/dashboard")}
          aria-label="Orbit CRM home"
        >
          <img src="/orbit-logo.svg" alt="Orbit" className={styles.brandMascot} />
          <span className={styles.brandCopy}>
            <small>CRM · by igebra.ai</small>
          </span>
        </button>

        <nav className={styles.nav} aria-label="CRM navigation">
          <button
            className={active === "overview" ? styles.navActive : ""}
            onClick={() => navigate("/dashboard")}
          >
            <span className={styles.navIcon}><OrbitNavIcon name="home" /></span> Overview
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
                <span className={styles.navIcon}><OrbitNavIcon name="crm" /></span> CRM
                <span className={styles.chevron}>
                  {crmOpen ? "▾" : "▸"}
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
              <span className={styles.navIcon}><OrbitNavIcon name="students" /></span> Students
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
              <span className={styles.navIcon}><OrbitNavIcon name="batches" /></span> Batches
            </button>
          )}

          {canSeeTrainers && (
            <button
              className={active === "trainers" ? styles.navActive : ""}
              onClick={() => navigate("/trainers")}
            >
              <span className={styles.navIcon}><OrbitNavIcon name="trainers" /></span> Trainers
            </button>
          )}

          {canSeePayments && (
            <button
              className={active === "payments" ? styles.navActive : ""}
              onClick={() => navigate("/payments")}
            >
              <span className={styles.navIcon}><OrbitNavIcon name="payments" /></span> Payments
            </button>
          )}

          {canSeeCourses && (
            <button
              className={active === "courses" ? styles.navActive : ""}
              onClick={() => navigate("/courses")}
            >
              <span className={styles.navIcon}><OrbitNavIcon name="courses" /></span> Courses
            </button>
          )}

          {canSeeReports && (
            <button
              className={active === "reports" ? styles.navActive : ""}
              onClick={() => navigate("/reports")}
            >
              <span className={styles.navIcon}><OrbitNavIcon name="reports" /></span> Reports
            </button>
          )}

          <div aria-disabled="true" className={styles.comingSoon}>
            <span className={styles.navIcon}><OrbitNavIcon name="aqmatics" /></span> AQMATICS
            <small className={styles.soon}>Soon</small>
          </div>

          {canSeeAccess && (
            <div className={styles.adminGroup} aria-label="Administration">
              <div className={styles.adminLabel}>Administration</div>
              {canSeeAccess && (
                <button
                  className={active === "access" ? styles.navActive : ""}
                  onClick={() => navigate("/access")}
                >
                  <span className={styles.navIcon}><OrbitNavIcon name="access" /></span> Access
    
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
    
            </div>
          )}
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
