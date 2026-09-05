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
type Row = {
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

function monthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  return { from: iso(first), to: iso(last) };
}

export default function ReportsPage() {
  const router = useRouter();
  const defaults = monthRange();

  const [email, setEmail] = useState("");
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerId, setTrainerId] = useState("");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");

      setEmail(data.user.email || "");

      const { data: options, error } = await supabase.rpc("active_trainer_options");
      if (error) {
        setMessage(error.message);
        return;
      }

      setTrainers((options || []) as Trainer[]);
    }

    init();
  }, [router]);

  const completed = useMemo(
    () => rows.filter((row) => row.session_status === "Completed").length,
    [rows]
  );

  const batches = useMemo(
    () => new Set(rows.map((row) => row.batch_name)).size,
    [rows]
  );

  async function runReport() {
    if (!trainerId || !from || !to) {
      setMessage("Select a trainer and date range.");
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
      setRows([]);
      return;
    }

    setRows((data || []) as Row[]);
  }

  function setThisMonth() {
    const range = monthRange();
    setFrom(range.from);
    setTo(range.to);
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="reports" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>REPORTS · TRAINERS</p>
            <h1>Trainer Report</h1>
            <p>See the classes a trainer actually handled for any date range.</p>
          </div>
        </header>

        <section className={styles.filters}>
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

          <label>
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>

          <label>
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>

          <button className={styles.secondary} onClick={setThisMonth}>This Month</button>
          <button className={styles.primary} onClick={runReport} disabled={loading}>
            {loading ? "Loading..." : "Run Report"}
          </button>
        </section>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.summary}>
          <div><span>Classes Taken</span><strong>{completed}</strong></div>
          <div><span>Batches Handled</span><strong>{batches}</strong></div>
          <div><span>Records in Range</span><strong>{rows.length}</strong></div>
        </section>

        <section className={styles.card}>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Batch</th>
                  <th>Course</th>
                  <th>Session</th>
                  <th>Topic Covered</th>
                  <th>Status</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      Select a trainer and run the report.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.session_id}>
                      <td>{new Date(`${row.class_date}T00:00:00`).toLocaleDateString()}</td>
                      <td><strong>{row.batch_name}</strong></td>
                      <td>{row.course_name}</td>
                      <td>{row.session_number ? `Session ${row.session_number}` : "—"}</td>
                      <td>{row.topic_covered || "—"}</td>
                      <td><span className={styles.status}>{row.session_status}</span></td>
                      <td>
                        {row.attendance_marked > 0
                          ? `${row.students_present}/${row.attendance_marked} Present`
                          : "Not marked"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
