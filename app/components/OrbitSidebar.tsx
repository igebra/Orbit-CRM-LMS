"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Props = {
  email: string;
  active:
    | "students"
    | "batches"
    | "sessions"
    | "courses"
    | "trainers"
    | "reports"
    | "payments"
    | "access";
};

export default function OrbitSidebar({ email, active }: Props) {
  const router = useRouter();
  const [crmOpen, setCrmOpen] = useState(false);
  const [role, setRole] = useState("");
  const [pendingAccess, setPendingAccess] = useState(0);

  useEffect(() => {
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const currentRole = profile?.role || "";
      setRole(currentRole);

      if (currentRole === "super_admin" || currentRole === "admin") {
        const { data: count } = await supabase.rpc(
          "pending_access_request_count"
        );
        setPendingAccess(Number(count || 0));
      }
    }

    loadRole();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
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
    isSuperAdmin || isAdmin || isSales || isMarketing || isFinance || isManagement;

  const canSeeBatches =
    isSuperAdmin || isAdmin || isSales || isMarketing || isFinance || isManagement || isTrainer;

  const canSeeTrainers =
    isSuperAdmin || isAdmin || isSales || isMarketing || isManagement;

  const canSeePayments =
    isSuperAdmin || isAdmin || isSales || isMarketing || isFinance || isManagement;

  const canSeeCourses =
    isSuperAdmin || isAdmin || isSales || isMarketing || isFinance || isManagement;

  const canSeeReports =
    isSuperAdmin || isAdmin || isSales || isMarketing || isFinance || isManagement;

  const canSeeAccess = isSuperAdmin || isAdmin;

  return (
    <aside className={styles.sidebar}>
      <div>
        <button className={styles.brand} onClick={() => router.push("/dashboard")}>
          <img src="/orbit-mascot.png" alt="Orbit mascot" className={styles.brandMascot} />
          <span className={styles.brandCopy}>
            <strong>Orbit</strong>
            <small>by igebra.ai</small>
          </span>
        </button>

        <nav className={styles.nav}>
          <button onClick={() => router.push("/dashboard")}>
            <span>⌂</span> Overview
          </button>

          {canSeeCrm && (
            <div className={styles.crmGroup}>
              <button onClick={() => setCrmOpen((value) => !value)}>
                <span>◎</span> CRM
                <span className={styles.chevron}>{crmOpen ? "▾" : "▸"}</span>
              </button>
              {crmOpen && (
                <div className={styles.subNav}>
                  <button onClick={() => router.push("/crm/leads")}>Leads</button>
                  <button onClick={() => router.push("/crm/demos")}>Demo Schedule</button>
                </div>
              )}
            </div>
          )}

          {canSeeStudents && (
            <button
              className={active === "students" ? styles.navActive : ""}
              onClick={() => router.push("/students")}
            >
              <span>◉</span> Students
            </button>
          )}

          {canSeeBatches && (
            <button
              className={active === "batches" || active === "sessions" ? styles.navActive : ""}
              onClick={() => router.push("/batches")}
            >
              <span>▣</span> Batches
            </button>
          )}

          {canSeeTrainers && (
            <button
              className={active === "trainers" ? styles.navActive : ""}
              onClick={() => router.push("/trainers")}
            >
              <span>♙</span> Trainers
            </button>
          )}

          {canSeePayments && (
            <button
              className={active === "payments" ? styles.navActive : ""}
              onClick={() => router.push("/payments")}
            >
              <span>$</span> Payments
            </button>
          )}

          {canSeeCourses && (
            <button
              className={active === "courses" ? styles.navActive : ""}
              onClick={() => router.push("/courses")}
            >
              <span>✦</span> Courses
            </button>
          )}

          {canSeeReports && (
            <button
              className={active === "reports" ? styles.navActive : ""}
              onClick={() => router.push("/reports")}
            >
              <span>▤</span> Reports
            </button>
          )}

          {canSeeAccess && (
            <button
              className={active === "access" ? styles.navActive : ""}
              onClick={() => router.push("/access")}
            >
              <span>⚙</span> Access
              {pendingAccess > 0 && (
                <span
                  title={`${pendingAccess} pending access request${pendingAccess === 1 ? "" : "s"}`}
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

          <button>
            <span>◌</span> AQMATICS
            <small className={styles.soon}>Soon</small>
          </button>
        </nav>
      </div>

      <div className={styles.sidebarBottom}>
        <div className={styles.userBox}>
          <span className={styles.avatar}>{email ? email.charAt(0).toUpperCase() : "A"}</span>
          <span>
            <strong>Orbit User</strong>
            <small>{email}</small>
          </span>
        </div>
        <button className={styles.signOut} onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}
