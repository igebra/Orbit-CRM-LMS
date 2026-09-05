"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./reports.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Trainer = { id: string; trainer_name: string };
type Batch = { id: string; batch_name: string };

type TrainerRow = {
  session_id: string;
  class_date: string;
  batch_name: string;
  course_name: string;
  session_number: number | null;
  topic_covered: string | null;
  session_status: string;
  students_present: number;
  attendance_marked: number;
};

type AttendanceRow = {
  session_id: string;
  class_date: string;
  batch_name: string;
  course_name: string;
  session_number: number | null;
  student_name: string;
  attendance_status: string | null;
  trainer_name: string | null;
};

type ProgressRow = {
  batch_id: string;
  batch_name: string;
  course_name: string;
  trainer_name: string | null;
  batch_status: string;
  planned_sessions: number | null;
  total_sessions: number;
  completed_sessions: number;
  student_count: number;
  attendance_rate: number | null;
  homework_rate: number | null;
};

function monthRange(offset = 0) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);

  const iso = (d: Date) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  return { from: iso(first), to: iso(last) };
}

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export default function ReportsPage() {
  const router = useRouter();
  const initial = monthRange();

  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"trainer" | "attendance" | "progress">("trainer");
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [trainerId, setTrainerId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [trainerRows, setTrainerRows] = useState<TrainerRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");

      setEmail(data.user.email || "");

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const role = profile?.role || "";

      if (
        ![
          "super_admin",
          "admin",
          "sales",
          "sales_marketing",
          "marketing",
          "accounts_finance",
          "viewer_management",
        ].includes(role)
      ) {
        router.replace("/dashboard");
        return;
      }

      const [trainerResult, batchResult] = await Promise.all([
        supabase.rpc("active_trainer_options"),
        supabase.from("batches").select("id,batch_name").order("batch_name"),
      ]);

      setTrainers((trainerResult.data || []) as Trainer[]);
      setBatches((batchResult.data || []) as Batch[]);

      const requestedTrainer = new URLSearchParams(window.location.search).get("trainer");
      if (requestedTrainer) setTrainerId(requestedTrainer);
    }

    init();
  }, [router]);

  const trainerSummary = useMemo(
    () => ({
      completed: trainerRows.filter((row) => row.session_status === "Completed")
        .length,
      batches: new Set(trainerRows.map((row) => row.batch_name)).size,
      records: trainerRows.length,
    }),
    [trainerRows]
  );

  const attendanceSummary = useMemo(() => {
    const marked = attendanceRows.filter((row) => row.attendance_status);
    const present = marked.filter((row) =>
      ["Present", "Late"].includes(row.attendance_status || "")
    ).length;

    return {
      marked: marked.length,
      present,
      rate: marked.length ? Math.round((present / marked.length) * 100) : 0,
    };
  }, [attendanceRows]);

  function setPreset(offset: number) {
    const range = monthRange(offset);
    setFrom(range.from);
    setTo(range.to);
  }

  async function runTrainer() {
    if (!trainerId) {
      setMessage("Select a trainer.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("trainer_class_report", {
      p_trainer_id: trainerId,
      p_from: from,
      p_to: to,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      setTrainerRows([]);
      return;
    }

    setTrainerRows((data || []) as TrainerRow[]);
  }

  async function runAttendance() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("lms_attendance_report", {
      p_from: from,
      p_to: to,
      p_batch_id: batchId || null,
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      setAttendanceRows([]);
      return;
    }

    setAttendanceRows((data || []) as AttendanceRow[]);
  }

  async function runProgress() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.rpc("lms_batch_progress_report");

    setLoading(false);

    if (error) {
      setMessage(error.message);
      setProgressRows([]);
      return;
    }

    setProgressRows((data || []) as ProgressRow[]);
  }

  function exportCsv() {
    let headers: string[] = [];
    let rows: unknown[][] = [];
    let fileName = "orbit-lms-report.csv";

    if (tab === "trainer") {
      headers = ["Date","Batch","Course","Session","Topic","Status","Present","Attendance Marked"];
      rows = trainerRows.map((row) => [
        row.class_date,
        row.batch_name,
        row.course_name,
        row.session_number || "",
        row.topic_covered || "",
        row.session_status,
        row.students_present,
        row.attendance_marked,
      ]);
      fileName = "orbit-trainer-report.csv";
    } else if (tab === "attendance") {
      headers = ["Date","Batch","Course","Session","Student","Attendance","Trainer"];
      rows = attendanceRows.map((row) => [
        row.class_date,
        row.batch_name,
        row.course_name,
        row.session_number || "",
        row.student_name,
        row.attendance_status || "",
        row.trainer_name || "",
      ]);
      fileName = "orbit-attendance-report.csv";
    } else {
      headers = ["Batch","Course","Trainer","Status","Planned","Created","Completed","Students","Attendance %","Homework %"];
      rows = progressRows.map((row) => [
        row.batch_name,
        row.course_name,
        row.trainer_name || "",
        row.batch_status,
        row.planned_sessions || "",
        row.total_sessions,
        row.completed_sessions,
        row.student_count,
        row.attendance_rate ?? "",
        row.homework_rate ?? "",
      ]);
      fileName = "orbit-batch-progress-report.csv";
    }

    if (!rows.length) return;

    const csv = [
      headers.map(csvValue).join(","),
      ...rows.map((row) => row.map(csvValue).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasRows =
    tab === "trainer"
      ? trainerRows.length > 0
      : tab === "attendance"
      ? attendanceRows.length > 0
      : progressRows.length > 0;

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="reports" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · REPORTS</p>
            <h1>Delivery Reports</h1>
            <p>Trainer classes, attendance and batch progress.</p>
          </div>

          {hasRows && (
            <button className={styles.secondary} onClick={exportCsv}>
              Export CSV
            </button>
          )}
        </header>

        <div className={styles.tabs}>
          <button
            className={tab === "trainer" ? styles.activeTab : ""}
            onClick={() => setTab("trainer")}
          >
            Trainer
          </button>
          <button
            className={tab === "attendance" ? styles.activeTab : ""}
            onClick={() => setTab("attendance")}
          >
            Attendance
          </button>
          <button
            className={tab === "progress" ? styles.activeTab : ""}
            onClick={() => setTab("progress")}
          >
            Batch Progress
          </button>
        </div>

        {tab !== "progress" ? (
          <section className={styles.filters}>
            {tab === "trainer" ? (
              <label>
                <span>Trainer</span>
                <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
                  <option value="">Select trainer</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.trainer_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span>Batch</span>
                <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                  <option value="">All batches</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>

            <label>
              <span>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>

            <button className={styles.secondary} onClick={() => setPreset(0)}>
              This Month
            </button>
            <button className={styles.secondary} onClick={() => setPreset(-1)}>
              Last Month
            </button>
            <button
              className={styles.primary}
              onClick={tab === "trainer" ? runTrainer : runAttendance}
              disabled={loading}
            >
              {loading ? "Loading..." : "Run Report"}
            </button>
          </section>
        ) : (
          <section className={styles.filters}>
            <button className={styles.primary} onClick={runProgress} disabled={loading}>
              {loading ? "Loading..." : "Load Batch Progress"}
            </button>
          </section>
        )}

        {message && <div className={styles.message}>{message}</div>}

        {tab === "trainer" && (
          <>
            <section className={styles.summary}>
              <div><span>Classes Taken</span><strong>{trainerSummary.completed}</strong></div>
              <div><span>Batches Handled</span><strong>{trainerSummary.batches}</strong></div>
              <div><span>Records</span><strong>{trainerSummary.records}</strong></div>
            </section>

            <section className={styles.card}>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th><th>Batch</th><th>Course</th><th>Session</th>
                      <th>Topic Covered</th><th>Status</th><th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainerRows.length === 0 ? (
                      <tr><td colSpan={7} className={styles.empty}>Select a trainer and run the report.</td></tr>
                    ) : trainerRows.map((row) => (
                      <tr key={row.session_id}>
                        <td>{row.class_date}</td>
                        <td>{row.batch_name}</td>
                        <td>{row.course_name}</td>
                        <td>{row.session_number ? `Session ${row.session_number}` : "—"}</td>
                        <td>{row.topic_covered || "—"}</td>
                        <td>{row.session_status}</td>
                        <td>{row.attendance_marked ? `${row.students_present}/${row.attendance_marked} Present` : "Not marked"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "attendance" && (
          <>
            <section className={styles.summary}>
              <div><span>Attendance Records</span><strong>{attendanceSummary.marked}</strong></div>
              <div><span>Present / Late</span><strong>{attendanceSummary.present}</strong></div>
              <div><span>Attendance Rate</span><strong>{attendanceSummary.marked ? `${attendanceSummary.rate}%` : "—"}</strong></div>
            </section>

            <section className={styles.card}>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th><th>Batch</th><th>Course</th><th>Session</th>
                      <th>Student</th><th>Attendance</th><th>Trainer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.length === 0 ? (
                      <tr><td colSpan={7} className={styles.empty}>Run an attendance report.</td></tr>
                    ) : attendanceRows.map((row, index) => (
                      <tr key={`${row.session_id}-${row.student_name}-${index}`}>
                        <td>{row.class_date}</td>
                        <td>{row.batch_name}</td>
                        <td>{row.course_name}</td>
                        <td>{row.session_number ? `Session ${row.session_number}` : "—"}</td>
                        <td>{row.student_name}</td>
                        <td>{row.attendance_status || "Not marked"}</td>
                        <td>{row.trainer_name || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "progress" && (
          <section className={styles.card}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Batch</th><th>Course</th><th>Trainer</th><th>Status</th>
                    <th>Classes</th><th>Students</th><th>Attendance</th><th>Homework</th>
                  </tr>
                </thead>
                <tbody>
                  {progressRows.length === 0 ? (
                    <tr><td colSpan={8} className={styles.empty}>Load the Batch Progress report.</td></tr>
                  ) : progressRows.map((row) => (
                    <tr key={row.batch_id}>
                      <td><strong>{row.batch_name}</strong></td>
                      <td>{row.course_name}</td>
                      <td>{row.trainer_name || "—"}</td>
                      <td>{row.batch_status}</td>
                      <td>{row.completed_sessions} / {row.planned_sessions || row.total_sessions}</td>
                      <td>{row.student_count}</td>
                      <td>{row.attendance_rate === null ? "—" : `${row.attendance_rate}%`}</td>
                      <td>{row.homework_rate === null ? "—" : `${row.homework_rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
