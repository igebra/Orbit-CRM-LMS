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

type CourseFamily = "AiEdge" | "Coding4AI" | "Math";
function courseFamily(name: string): CourseFamily | null {
  const value = (name || "").toLowerCase();
  if (value.includes("aiedge") || value.includes("ai edge")) return "AiEdge";
  if (value.includes("coding4ai") || value.includes("coding 4 ai")) return "Coding4AI";
  if (/math|algebra|geometry|calculus|statistics|sat|psat/.test(value)) return "Math";
  return null;
}

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

  const [programmeEnrollment, setProgrammeEnrollment] = useState<Record<CourseFamily, number> | null>(null);
  const [programmeError, setProgrammeError] = useState(false);
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [batchCount, setBatchCount] = useState<number | null>(null);
  const [trainerCount, setTrainerCount] = useState<number | null>(null);
  const [monthCollections, setMonthCollections] = useState<number | null>(null);
  const [upcomingClasses, setUpcomingClasses] = useState<number | null>(null);
  const [leadStages, setLeadStages] = useState<{ stage: string; count: number }[] | null>(null);
  const [leadStageError, setLeadStageError] = useState(false);

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
          // Stage summary is calculated from records visible to the signed-in role (RLS).
          const { data: stageRows, error: stageError } = await supabase
            .from("leads")
            .select("lead_stage");
          if (stageError) {
            setLeadStageError(true);
            setLeadStages(null);
          } else {
            const stages = new Map<string, number>();
            for (const lead of stageRows || []) {
              const stage = String(lead.lead_stage || "Unspecified");
              stages.set(stage, (stages.get(stage) || 0) + 1);
            }
            setLeadStages([...stages].map(([stage, count]) => ({ stage, count }))
              .sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage)));
            setLeadStageError(false);
          }


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

    // Authenticated CRM view of ACTIVE student enrollments by programme family.
    // The LMS has a separate database; no cross-project counts are implied.
    if (canSeeStudents) {
      tasks.push((async () => {
        const { data, error } = await supabase.from("student_enrollments")
          .select("student_id,course_name,status");
        if (error) { setProgrammeError(true); setProgrammeEnrollment(null); return; }
        const ids: Record<CourseFamily, Set<string>> = {
          AiEdge: new Set<string>(), Coding4AI: new Set<string>(), Math: new Set<string>()
        };
        (data || []).forEach(row => {
          const family = courseFamily(String(row.course_name || ""));
          if (family && String(row.status || "").toLowerCase() === "active") {
            ids[family].add(String(row.student_id));
          }
        });
        setProgrammeEnrollment({
          AiEdge: ids.AiEdge.size, Coding4AI: ids.Coding4AI.size, Math: ids.Math.size
        });
        setProgrammeError(false);
      })());
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

  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  }).format(new Date());
  const dashboardName = role === "super_admin" ? "Super Admin" : displayRole(role);
  const kpiCards = [
    { label: "Total Leads", value: leadCount, note: "CRM lead records", icon: "▤", path: "/crm/leads", tone: "mint" },
    { label: "Student Profiles", value: studentCount, note: "Registered in CRM", icon: "♧", path: "/students", tone: "blue" },
    { label: "Active Batches", value: batchCount, note: "Currently active", icon: "▦", path: "/batches", tone: "amber" },
    { label: "Trainer Directory", value: trainerCount, note: "Active trainers", icon: "♙", path: "/trainers", tone: "purple" },
  ].filter((item) => item.value !== null);
  const canViewPipeline = leadCount !== null;
  const actionable = [
    ...(followUpsDue !== null ? [{ label: "Lead follow-ups", info: "Follow-ups due or overdue", value: followUpsDue, path: "/crm/leads" }] : []),
    ...(pendingAccess !== null ? [{ label: "Pending access requests", info: "Superadmin review queue", value: pendingAccess, path: "/access" }] : []),
    ...(overduePayments !== null ? [{ label: "Overdue payments", info: "Outstanding finance items", value: overduePayments, path: "/payments" }] : []),
    ...(upcomingClasses !== null ? [{ label: "Upcoming classes", info: "Scheduled in the next seven days", value: upcomingClasses, path: "/batches" }] : []),
  ];

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="overview" />
      <main className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarLabel}>ORBIT CRM <span>·</span> OPERATIONS</div>
          <div className={styles.topbarRight}>
            <span className={styles.dateTag}>{todayLabel}</span>
            <span className={styles.profileInitial} aria-hidden="true">{email.charAt(0).toUpperCase() || "O"}</span>
            <div className={styles.profileInfo}><strong>{displayRole(role)}</strong><small>{email}</small></div>
          </div>
        </div>
        <header className={styles.presentationHeader}>
          <div>
            <p className={styles.kicker}>ORBIT CRM · OPERATIONS</p>
            <h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {dashboardName}</h1>
            <p>Your leads, students, and academic operations at a glance.</p>
          </div>
          {canViewPipeline && <button type="button" onClick={() => router.push("/crm/leads")}
            className={styles.primaryAction}>＋ Add new lead <span>→</span></button>}
        </header>

        {loading ? <div className={styles.loading}>Loading your CRM dashboard...</div> : <>
          <section className={styles.kpisNew} aria-label="CRM key figures">
            {kpiCards.map((item) => <button type="button" key={item.label}
              onClick={() => router.push(item.path)} className={styles.kpiNew}>
              <span className={styles.kpiCopy}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></span>
              <span className={`${styles.kpiIcon} ${styles[item.tone]}`} aria-hidden="true">{item.icon}</span>
            </button>)}
          </section>

          {studentCount !== null && <section className={styles.widePanel} aria-label="Active enrollments">
            <div className={styles.sectionHeading}>
              <div><h2>Active enrollments by programme</h2><p>Distinct students per programme · CRM records only</p></div>
              <span className={styles.dataTag}>{programmeError ? "Data unavailable" : "Live CRM records"}</span>
            </div>
            <div className={styles.enrollmentGrid}>
              {(["AiEdge", "Coding4AI", "Math"] as CourseFamily[]).map((name, i) => (
                <div key={name} className={`${styles.enrollmentCard} ${i === 1 ? styles.enrollPurple : i === 2 ? styles.enrollAmber : styles.enrollTeal}`}>
                  <span>{name}</span><strong>{programmeEnrollment ? programmeEnrollment[name] : "—"}</strong>
                  <small>Active enrollments</small>
                </div>
              ))}
            </div>
          </section>}

          <div className={styles.panelPair}>
            {canViewPipeline && <section className={styles.newPanel}>
              <div className={styles.sectionHeading}>
                <div><h2>Lead pipeline</h2><p>Stage distribution across accessible leads</p></div>
                <button type="button" className={styles.textAction} onClick={() => router.push("/crm/leads")}>Open Leads →</button>
              </div>
              {leadStages === null ? <p className={styles.emptyText}>{leadStageError ? "Stage information unavailable." : "Loading lead stages…"}</p>
                : leadStages.length === 0 ? <p className={styles.emptyText}>No leads to display yet.</p>
                : <div className={styles.pipeline}>
                  {leadStages.slice(0, 8).map((stage, i) => (
                    <div key={stage.stage} className={styles.pipelineRow}>
                      <span title={stage.stage}>{stage.stage}</span>
                      <div className={styles.track}><div className={`${styles.bar} ${i === 1 ? styles.barAmber : i > 1 ? styles.barLavender : ""}`}
                        style={{width: `${Math.max(2, (stage.count / Math.max(leadCount || 1, 1)) * 100)}%`}}/></div>
                      <b>{stage.count}</b>
                    </div>
                  ))}
                  {leadStages.length > 8 && <p className={styles.helperText}>+ {leadStages.length - 8} other stages shown in Leads</p>}
                </div>}
            </section>}
            <section className={styles.newPanel}>
              <div className={styles.sectionHeading}>
                <div><h2>Needs attention</h2><p>Daily operational action queue</p></div>
                <span className={styles.priorityTag}>Action centre</span>
              </div>
              <div className={styles.actionList}>
                {actionable.length ? actionable.map((item) => (
                  <button type="button" key={item.label} onClick={() => router.push(item.path)}>
                    <span className={styles.actionIcon} aria-hidden="true">!</span>
                    <span className={styles.actionCopy}><strong>{item.label}</strong><small>{item.info}</small></span>
                    <span className={styles.actionValue}>{item.value}</span>
                    <span aria-hidden="true">›</span>
                  </button>
                )) : <p className={styles.emptyText}>No action items available for your access level.</p>}
              </div>
            </section>
          </div>

          <div className={styles.panelPairBottom}>
            <section className={styles.newPanel}>
              <div className={styles.sectionHeading}><div><h2>Quick actions</h2><p>One click to everyday tools</p></div></div>
              <div className={styles.actionTiles}>
                {quickLinks.slice(0, 4).map((item, index) => <button type="button" key={item.href}
                  onClick={() => router.push(item.href)}>
                  <span className={styles.quickIcon}>{["＋","♧","▦","$"][index]}</span>
                  <strong>{item.label}</strong><small>{item.note}</small>
                </button>)}
                {!quickLinks.length && <p className={styles.emptyText}>No shortcuts assigned.</p>}
              </div>
            </section>
            <section className={styles.newPanel}>
              <div className={styles.sectionHeading}>
                <div><h2>Collections &amp; delivery</h2><p>CRM finance and upcoming classes</p></div>
                {monthCollections !== null && <button type="button" className={styles.textAction}
                  onClick={() => router.push("/payments")}>View reports →</button>}
              </div>
              <div className={styles.financeGrid}>
                {monthCollections !== null && <div><span>Collections this month</span><strong>{money(monthCollections)}</strong><small>Recorded CRM payments</small></div>}
                {upcomingClasses !== null && <div><span>Upcoming classes</span><strong>{upcomingClasses}</strong><small>Next 7 days · CRM</small></div>}
                {monthCollections === null && upcomingClasses === null && <p className={styles.emptyText}>Finance and delivery summary is not available for this role.</p>}
              </div>
            </section>
          </div>
        </>}
      </main>
    </div>
  );
}
