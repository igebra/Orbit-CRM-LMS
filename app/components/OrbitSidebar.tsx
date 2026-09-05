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
    | "reports";
};

export default function OrbitSidebar({ email, active }: Props) {
  const router = useRouter();
  const [crmOpen, setCrmOpen] = useState(false);
  const [role, setRole] = useState("");

  useEffect(() => {
    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      setRole(profile?.role || "");
    }

    loadRole();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const canSeeCrm = [
    "super_admin","admin","sales","marketing","sales_marketing","viewer_management"
  ].includes(role);

  const canSeeTrainers = [
    "super_admin","admin","sales","sales_marketing","viewer_management"
  ].includes(role);

  const canSeeReports = [
    "super_admin","admin","viewer_management"
  ].includes(role);

  const canSeePayments = [
    "super_admin","admin","sales","viewer_management","accounts_finance"
  ].includes(role);

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

          <button
            className={active === "students" ? styles.navActive : ""}
            onClick={() => router.push("/students")}
          >
            <span>◉</span> Students
          </button>

          <button
            className={active === "batches" || active === "sessions" ? styles.navActive : ""}
            onClick={() => router.push("/batches")}
          >
            <span>▣</span> Batches
          </button>

          {canSeeTrainers && (
            <button
              className={active === "trainers" ? styles.navActive : ""}
              onClick={() => router.push("/trainers")}
            >
              <span>♙</span> Trainers
            </button>
          )}

          {canSeePayments && <button><span>$</span> Payments</button>}

          <button
            className={active === "courses" ? styles.navActive : ""}
            onClick={() => router.push("/courses")}
          >
            <span>✦</span> Courses
          </button>

          {canSeeReports && (
            <button
              className={active === "reports" ? styles.navActive : ""}
              onClick={() => router.push("/reports")}
            >
              <span>▤</span> Reports
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
