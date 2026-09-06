"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./dashboard.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Metric = {
  label: string;
  value: string;
  note: string;
  href?: string;
};

type FocusItem = {
  label: string;
  value: string;
  href?: string;
};

function localIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function displayRole(role: string) {
  const map: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    sales: "Sales Admin",
    sales_marketing: "Sales Admin",
    marketing: "Marketing",
    trainer: "Trainer",
    accounts_finance: "Finance Admin",
    viewer_management: "Management",
    parent: "Parent",
    student: "Student",
  };

  return map[role] || "Orbit User";
}

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [batchCount, setBatchCount] = useState<number | null>(null);
  const [trainerCount, setTrainerCount] = useState<number | null>(null);
  const [monthCollections, setMonthCollections] = useState<number | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<number | null>(null);

  const [followUpsDue, setFollowUpsDue] = useState<number | null>(null);
  const [overduePayments, setOverduePayments] = useState<number | null>(null);
  const [pendingAccess, setPendingAccess] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/");
        return;
      }

      setEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role,is_active")
        .eq("id", data.user.id)
        .single();

      if (!profile?.is_active) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      const currentRole = profile?.role || "";

      if (currentRole === "student") {
        router.replace("/student");
        return;
      }

      if (currentRole === "parent") {
        router.replace("/parent");
        return;
      }

      setRole(currentRole);

      await loadDashboard(currentRole);
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadDashboard(currentRole: string) {
    const isSuperAdmin = currentRole === "super_admin";
    const isAdmin = currentRole === "admin";
    const isSales =
      currentRole === "sales" || currentRole === "sales_marketing";
    const isMarketing = currentRole === "marketing";
    const isFinance = currentRole === "accounts_finance";
    const isManagement = currentRole === "viewer_management";
    const isTrainer = currentRole === "trainer";

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

    const canSeeAccess = isSuperAdmin || isAdmin;

    const today = new Date();
    const todayIso = localIso(today);
    const sevenDays = new Date(today);
    sevenDays.setDate(today.getDate() + 7);
    const sevenDaysIso = localIso(sevenDays);

    const monthStart = localIso(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    const tasks: Promise<void>[] = [];

    if (canSeeCrm) {
      tasks.push(
        (async () => {
          const { count } = await supabase
            .from("leads")
            .select("id", { count: "exact", head: true });
          setLeadCount(count ?? 0);

          const { count: dueCount } = await supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .not("next_follow_up_date", "is", null)
            .lte("next_follow_up_date", todayIso)
            .not("lead_stage", "in", '("Enrolled","Lost")');

          setFollowUpsDue(dueCount ?? 0);
        })()
      );
    }

    if (canSeeStudents) {
      tasks.push(
        (async () => {
          const { count } = await supabase
            .from("students")
            .select("id", { count: "exact", head: true });
          setStudentCount(count ?? 0);
        })()
      );
    }

    if (canSeeBatches) {
      tasks.push(
        (async () => {
          const { count: activeBatches } = await supabase
            .from("batches")
            .select("id", { count: "exact", head: true })
            .eq("status", "Active");

          setBatchCount(activeBatches ?? 0);

          const { count: classCount } = await supabase
            .from("class_sessions")
            .select("id", { count: "exact", head: true })
            .gte("session_date", todayIso)
            .lte("session_date", sevenDaysIso)
            .in("status", ["Scheduled", "Rescheduled"]);

          setUpcomingClasses(classCount ?? 0);
        })()
      );
    }

    if (canSeeTrainers) {
      tasks.push(
        (async () => {
          const { count } = await supabase
            .from("trainers")
            .select("id", { count: "exact", head: true })
            .eq("status", "Active");
          setTrainerCount(count ?? 0);
        })()
      );
    }

    if (canSeePayments) {
      tasks.push(
        (async () => {
          const { data: transactions } = await supabase.rpc(
            "payment_report_transactions",
            {
              p_from: monthStart,
              p_to: todayIso,
            }
          );

          const collected = (transactions || []).reduce(
            (sum: number, row: { amount_usd?: number }) =>
              sum + Number(row.amount_usd || 0),
            0
          );

          setMonthCollections(collected);

          if (!isMarketing) {
            const { data: outstanding } = await supabase.rpc(
              "payment_outstanding_report"
            );

            const overdue = (outstanding || []).filter(
              (row: { payment_status?: string }) =>
                row.payment_status === "Overdue"
            ).length;

            setOverduePayments(overdue);
          }
        })()
      );
    }

    if (canSeeAccess) {
      tasks.push(
        (async () => {
          const { data } = await supabase.rpc(
            "pending_access_request_count"
          );
          setPendingAccess(Number(data || 0));
        })()
      );
    }

    await Promise.all(tasks);
  }

  const metrics = useMemo<Metric[]>(() => {
    const items: Metric[] = [];

    if (leadCount !== null) {
      items.push({
        label: "Leads",
        value: String(leadCount),
        note: "CRM leads",
        href: "/crm/leads",
      });
    }

    if (studentCount !== null) {
      items.push({
        label: "Students",
        value: String(studentCount),
        note: "Student profiles",
        href: "/students",
      });
    }

    if (batchCount !== null) {
      items.push({
        label: "Active Batches",
        value: String(batchCount),
        note: "Currently active",
        href: "/batches",
      });
    }

    if (trainerCount !== null) {
      items.push({
        label: "Active Trainers",
        value: String(trainerCount),
        note: "Trainer directory",
        href: "/trainers",
      });
    }

    if (monthCollections !== null) {
      items.push({
        label: "This Month Collections",
        value: money(monthCollections),
        note: "Payments received",
        href: "/payments",
      });
    }

    if (upcomingClasses !== null) {
      items.push({
        label: "Upcoming Classes",
        value: String(upcomingClasses),
        note: "Next 7 days",
        href: "/batches",
      });
    }

    return items.slice(0, 6);
  }, [
    leadCount,
    studentCount,
    batchCount,
    trainerCount,
    monthCollections,
    upcomingClasses,
  ]);

  const focusItems = useMemo<FocusItem[]>(() => {
    const items: FocusItem[] = [];

    if (pendingAccess !== null && pendingAccess > 0) {
      items.push({
        label: "Pending access requests",
        value: String(pendingAccess),
        href: "/access",
      });
    }

    if (followUpsDue !== null && followUpsDue > 0) {
      items.push({
        label: "Lead follow-ups due",
        value: String(followUpsDue),
        href: "/crm/leads",
      });
    }

    if (overduePayments !== null && overduePayments > 0) {
      items.push({
        label: "Overdue payment accounts",
        value: String(overduePayments),
        href: "/payments",
      });
    }

    if (upcomingClasses !== null) {
      items.push({
        label: "Classes in next 7 days",
        value: String(upcomingClasses),
        href: "/batches",
      });
    }

    if (items.length === 0) {
      items.push({
        label: "No urgent items right now",
        value: "✓",
      });
    }

    return items;
  }, [pendingAccess, followUpsDue, overduePayments, upcomingClasses]);

  const quickLinks = useMemo(() => {
    const links: { label: string; note: string; href: string }[] = [];

    if (leadCount !== null) {
      links.push({
        label: "CRM",
        note: "Leads, demos and follow-ups",
        href: "/crm/leads",
      });
    }

    if (studentCount !== null) {
      links.push({
        label: "Students",
        note: "Profiles and enrollments",
        href: "/students",
      });
    }

    if (batchCount !== null) {
      links.push({
        label: "Batches",
        note: "Classes, trainers and attendance",
        href: "/batches",
      });
    }

    if (monthCollections !== null) {
      links.push({
        label: "Payments",
        note: "Collections and payment reports",
        href: "/payments",
      });
    }

    if (trainerCount !== null) {
      links.push({
        label: "Trainers",
        note: "Trainer directory",
        href: "/trainers",
      });
    }

    return links.slice(0, 5);
  }, [leadCount, studentCount, batchCount, monthCollections, trainerCount]);

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="overview" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>CRM · LMS · OPERATIONS</p>
            <h1>Orbit Overview</h1>
            <p>
              A quick view of what is happening across your Orbit workspace.
            </p>
          </div>

          <div className={styles.userPill}>
            <strong>{displayRole(role)}</strong>
            <span>{email}</span>
          </div>
        </header>

        {loading ? (
          <div className={styles.loading}>Loading Orbit overview...</div>
        ) : (
          <>
            <section className={styles.metrics}>
              {metrics.map((metric) => (
                <button
                  key={metric.label}
                  className={styles.metricCard}
                  onClick={() => metric.href && router.push(metric.href)}
                >
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </button>
              ))}
            </section>

            <section className={styles.contentGrid}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2>Today's Focus</h2>
                    <p>Items that may need attention</p>
                  </div>
                </div>

                <div className={styles.focusList}>
                  {focusItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => item.href && router.push(item.href)}
                      disabled={!item.href}
                    >
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2>Quick Access</h2>
                    <p>Open the modules you use most</p>
                  </div>
                </div>

                <div className={styles.quickGrid}>
                  {quickLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => router.push(link.href)}
                    >
                      <strong>{link.label}</strong>
                      <span>{link.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.footerNote}>
              <div>
                <strong>igebra.ai operations</strong>
                <span>
                  CRM, Students, Batches, Trainers, Payments, Courses and Reports.
                </span>
              </div>
              <div>
                <strong>AQMATICS</strong>
                <span>Coming in a later phase.</span>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
