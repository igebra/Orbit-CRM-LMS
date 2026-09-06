"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import styles from "./portal.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Mode = "student" | "parent";

type LinkedStudent = {
  student_id: string;
  student_name: string;
  grade: string | null;
  access_type: string;
  relationship: string | null;
};

type ProgressRow = {
  session_id: string;
  class_date: string;
  batch_name: string;
  course_name: string;
  session_number: number | null;
  topic_covered: string | null;
  class_status: string;
  attendance_status: string | null;
  homework_completed: boolean | null;
};

type ClassRow = {
  session_id: string;
  batch_id: string;
  batch_name: string;
  course_name: string;
  session_number: number | null;
  session_date: string;
  scheduled_at: string | null;
  topic_planned: string | null;
  topic_covered: string | null;
  status: string;
  trainer_name: string | null;
  zoom_meeting_url: string | null;
  zoom_recording_url: string | null;
};

type Enrollment = {
  id: string;
  course_name: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
};

type Payment = {
  batch_id: string;
  batch_name: string;
  course_name: string;
  total_fee_usd: number;
  total_paid_usd: number;
  pending_usd: number;
  payment_status: string;
  next_due_date: string | null;
};

type Resource = {
  resource_id: string;
  course_name: string;
  session_number: number;
  topic: string | null;
  resource_type: string;
  title: string;
  description: string | null;
  visibility: string;
  file_name: string | null;
  storage_path: string | null;
  version_number: number | null;
  external_url: string | null;
  class_date: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function when(iso: string | null, dateOnly: string) {
  const value = iso || `${dateOnly}T00:00:00`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return dateOnly;

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: iso ? "numeric" : undefined,
    minute: iso ? "2-digit" : undefined,
  });
}

export default function PortalDashboard({ mode }: { mode: Mode }) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [children, setChildren] = useState<LinkedStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

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

      if (profile.role !== mode) {
        if (profile.role === "student") router.replace("/student");
        else if (profile.role === "parent") router.replace("/parent");
        else router.replace("/dashboard");
        return;
      }

      const { data: linked, error } = await supabase.rpc("portal_my_students");

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const all = asArray<LinkedStudent>(linked);
      const allowed = all.filter((row) => row.access_type === mode);
      setChildren(allowed);

      if (!allowed.length) {
        setMessage(
          mode === "student"
            ? "This account is not linked to a student profile yet."
            : "This parent account is not linked to a student yet."
        );
        setLoading(false);
        return;
      }

      setStudentId(allowed[0].student_id);
      await loadStudent(allowed[0].student_id);
      setLoading(false);
    }

    init();
  }, [router, mode]);

  async function loadStudent(id: string) {
    setStudentId(id);
    setMessage("");

    const requests = [
      supabase.rpc("portal_student_progress", { p_student_id: id }),
      supabase.rpc("portal_student_classes", { p_student_id: id }),
      supabase.rpc("portal_student_enrollments", { p_student_id: id }),
      supabase.rpc("portal_student_resources", {
        p_student_id: id,
        p_for_parent: mode === "parent",
      }),
    ] as const;

    const [progressResult, classResult, enrollmentResult, resourceResult] =
      await Promise.all(requests);

    let paymentResult: any = null;

    if (mode === "parent") {
      paymentResult = await supabase.rpc("portal_parent_payments", {
        p_student_id: id,
      });
    }

    if (
      progressResult.error ||
      classResult.error ||
      enrollmentResult.error ||
      resourceResult.error ||
      paymentResult?.error
    ) {
      setMessage(
        progressResult.error?.message ||
          classResult.error?.message ||
          enrollmentResult.error?.message ||
          resourceResult.error?.message ||
          paymentResult?.error?.message ||
          "Could not load the portal."
      );
      return;
    }

    setProgress(asArray<ProgressRow>(progressResult.data));
    setClasses(asArray<ClassRow>(classResult.data));
    setEnrollments(asArray<Enrollment>(enrollmentResult.data));
    setResources(asArray<Resource>(resourceResult.data));
    setPayments(
      mode === "parent" && paymentResult
        ? asArray<Payment>(paymentResult.data)
        : []
    );
  }

  const selected = children.find((child) => child.student_id === studentId);

  const stats = useMemo(() => {
    const completed = progress.filter((row) => row.class_status === "Completed");
    const marked = progress.filter((row) => row.attendance_status);
    const attended = marked.filter((row) =>
      ["Present", "Late"].includes(row.attendance_status || "")
    ).length;

    const homeworkRows = progress.filter(
      (row) => row.homework_completed !== null
    );
    const homeworkDone = homeworkRows.filter(
      (row) => row.homework_completed
    ).length;

    return {
      completed: completed.length,
      attendance: marked.length
        ? Math.round((attended / marked.length) * 100)
        : null,
      homework: homeworkRows.length
        ? Math.round((homeworkDone / homeworkRows.length) * 100)
        : null,
    };
  }, [progress]);

  const nextClass = useMemo(() => {
    const now = Date.now();

    return [...classes]
      .filter((row) => ["Scheduled", "Rescheduled"].includes(row.status))
      .filter((row) => {
        const value = row.scheduled_at || `${row.session_date}T23:59:59`;
        return new Date(value).getTime() >= now;
      })
      .sort((a, b) => {
        const av = new Date(
          a.scheduled_at || `${a.session_date}T00:00:00`
        ).getTime();
        const bv = new Date(
          b.scheduled_at || `${b.session_date}T00:00:00`
        ).getTime();
        return av - bv;
      })[0];
  }, [classes]);

  const paymentTotals = useMemo(
    () =>
      payments.reduce(
        (acc, row) => ({
          fee: acc.fee + Number(row.total_fee_usd || 0),
          paid: acc.paid + Number(row.total_paid_usd || 0),
          pending: acc.pending + Number(row.pending_usd || 0),
        }),
        { fee: 0, paid: 0, pending: 0 }
      ),
    [payments]
  );

  async function openResource(resource: Resource) {
    if (resource.external_url) {
      window.open(resource.external_url, "_blank", "noopener,noreferrer");
      return;
    }

    if (!resource.storage_path) {
      setMessage("No file or link is available for this resource.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("lms-library")
      .createSignedUrl(resource.storage_path, 60 * 60);

    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Could not open this resource.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.empty}>Loading Orbit portal...</div>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <img src="/orbit-mascot.png" alt="Orbit" />
          <div>
            <strong>{mode === "student" ? "Orbit Learning" : "Orbit Parent"}</strong>
            <span>by igebra.ai</span>
          </div>
        </div>

        <div className={styles.topActions}>
          <span>{email}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p>{mode === "student" ? "STUDENT PORTAL" : "PARENT PORTAL"}</p>
            <h1>{selected?.student_name || "Orbit"}</h1>
            <span>
              {mode === "student"
                ? `${selected?.grade || "Student"} · Courses, classes and released learning materials`
                : "Progress, attendance, homework and fee summary"}
            </span>
          </div>

          {mode === "parent" && children.length > 1 && (
            <div className={styles.childSwitch}>
              {children.map((child) => (
                <button
                  key={child.student_id}
                  className={
                    child.student_id === studentId ? styles.activeChild : ""
                  }
                  onClick={() => loadStudent(child.student_id)}
                >
                  {child.student_name}
                </button>
              ))}
            </div>
          )}
        </section>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.stats}>
          <div className={styles.stat}>
            <span>Classes Completed</span>
            <strong>{stats.completed}</strong>
            <small>Across active batches</small>
          </div>

          <div className={styles.stat}>
            <span>Attendance</span>
            <strong>
              {stats.attendance === null ? "—" : `${stats.attendance}%`}
            </strong>
            <small>Present and Late count as attended</small>
          </div>

          <div className={styles.stat}>
            <span>Homework</span>
            <strong>
              {stats.homework === null ? "—" : `${stats.homework}%`}
            </strong>
            <small>Homework completion</small>
          </div>

          <div className={styles.stat}>
            <span>{mode === "parent" ? "Pending Fees" : "Active Courses"}</span>
            <strong>
              {mode === "parent"
                ? money(paymentTotals.pending)
                : enrollments.filter((row) => row.status === "Active").length}
            </strong>
            <small>
              {mode === "parent" ? "For this child only" : "Current enrollments"}
            </small>
          </div>
        </section>

        <section className={styles.grid2}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2>Next Class</h2>
                <p>Upcoming scheduled session</p>
              </div>
            </div>

            <div className={styles.cardBody}>
              {nextClass ? (
                <div className={styles.nextClass}>
                  <strong>
                    {nextClass.course_name} · Session{" "}
                    {nextClass.session_number || "—"}
                  </strong>
                  <span>
                    {nextClass.topic_planned ||
                      "Topic will be updated by the trainer"}
                  </span>
                  <small>
                    {when(nextClass.scheduled_at, nextClass.session_date)} ·{" "}
                    {nextClass.trainer_name || "Trainer"}
                  </small>

                  {mode === "student" && nextClass.zoom_meeting_url && (
                    <a
                      href={nextClass.zoom_meeting_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Join Class
                    </a>
                  )}
                </div>
              ) : (
                <div className={styles.empty}>No upcoming class is scheduled.</div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div>
                <h2>{mode === "parent" ? "Fee Summary" : "My Courses"}</h2>
                <p>
                  {mode === "parent"
                    ? "Only this child's payment information"
                    : "Current and previous enrollments"}
                </p>
              </div>
            </div>

            <div className={styles.cardBody}>
              {mode === "parent" ? (
                <div className={styles.feeGrid}>
                  <div>
                    <span>Total Fee</span>
                    <strong>{money(paymentTotals.fee)}</strong>
                  </div>
                  <div>
                    <span>Paid</span>
                    <strong>{money(paymentTotals.paid)}</strong>
                  </div>
                  <div>
                    <span>Pending</span>
                    <strong>{money(paymentTotals.pending)}</strong>
                  </div>
                </div>
              ) : (
                <div className={styles.list}>
                  {enrollments.length === 0 ? (
                    <div className={styles.empty}>No enrollments found.</div>
                  ) : (
                    enrollments.map((row) => (
                      <div className={styles.row} key={row.id}>
                        <div>
                          <strong>{row.course_name}</strong>
                          <span>Enrolled {row.enrolled_at}</span>
                        </div>
                        <span
                          className={`${styles.badge} ${
                            row.status === "Active" ? styles.good : ""
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {mode === "parent" && (
          <section className={styles.card} style={{ marginBottom: 13 }}>
            <div className={styles.cardHead}>
              <div>
                <h2>Courses</h2>
                <p>Current and previous enrollments</p>
              </div>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.list}>
                {enrollments.map((row) => (
                  <div className={styles.row} key={row.id}>
                    <div>
                      <strong>{row.course_name}</strong>
                      <span>Enrolled {row.enrolled_at}</span>
                    </div>
                    <span
                      className={`${styles.badge} ${
                        row.status === "Active" ? styles.good : ""
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className={styles.card} style={{ marginBottom: 13 }}>
          <div className={styles.cardHead}>
            <div>
              <h2>
                {mode === "student"
                  ? "Released Learning Materials"
                  : "Shared Resources"}
              </h2>
              <p>
                {mode === "student"
                  ? "Only material released for completed classes is shown."
                  : "Only resources marked Parent & Student are shown."}
              </p>
            </div>
          </div>

          {resources.length === 0 ? (
            <div className={styles.empty}>No resources have been released yet.</div>
          ) : (
            <div className={styles.materialGrid}>
              {resources.map((resource) => (
                <div
                  className={styles.material}
                  key={`${resource.resource_id}-${resource.version_number}`}
                >
                  <span>{resource.resource_type}</span>
                  <strong>{resource.title}</strong>
                  <small>
                    {resource.course_name} · Session {resource.session_number}
                    {resource.topic ? ` · ${resource.topic}` : ""}
                  </small>
                  <button onClick={() => openResource(resource)}>
                    Open Resource
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2>{mode === "student" ? "Class History" : "Recent Progress"}</h2>
              <p>Attendance, homework and topics covered</p>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Session</th>
                  <th>Topic</th>
                  <th>Attendance</th>
                  <th>Homework</th>
                  {mode === "student" && <th>Recording</th>}
                </tr>
              </thead>
              <tbody>
                {progress.length === 0 ? (
                  <tr>
                    <td
                      colSpan={mode === "student" ? 7 : 6}
                      className={styles.empty}
                    >
                      No class history yet.
                    </td>
                  </tr>
                ) : (
                  progress.slice(0, 30).map((row) => {
                    const classRow = classes.find(
                      (item) => item.session_id === row.session_id
                    );

                    return (
                      <tr key={row.session_id}>
                        <td>{row.class_date}</td>
                        <td>{row.course_name}</td>
                        <td>
                          {row.session_number
                            ? `Session ${row.session_number}`
                            : "—"}
                        </td>
                        <td>{row.topic_covered || "—"}</td>
                        <td>{row.attendance_status || "Not marked"}</td>
                        <td>
                          {row.homework_completed === null
                            ? "—"
                            : row.homework_completed
                            ? "Completed"
                            : "Pending"}
                        </td>

                        {mode === "student" && (
                          <td>
                            {row.class_status === "Completed" &&
                            classRow?.zoom_recording_url ? (
                              <a
                                href={classRow.zoom_recording_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
