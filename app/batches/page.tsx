"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const GRADES = Array.from({ length: 10 }, (_, i) => `Grade ${String(i + 1).padStart(2, "0")}`);
const TIMEZONES = [
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Denver", label: "US Mountain" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Asia/Kolkata", label: "India IST" },
];

const COURSES = [
  ...["Elementary", "Middle School", "High School"].flatMap((group) => ["01", "02", "03"].map((level) => `AiEdge ${group} - Level ${level}`)),
  ...["Elementary", "Middle School", "High School"].flatMap((group) => ["01", "02", "03"].map((level) => `Coding4AI ${group} - Level ${level}`)),
  ...GRADES.map((grade) => `Math - ${grade}`),
  "AP Pre-Calculus",
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Statistics",
  "SAT and PSAT",
  "Algebra 1",
  "Geometry",
  "Algebra 2",
];

type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  trainer_name: string | null;
  schedule_text: string | null;
  start_date: string | null;
  start_at: string | null;
  source_timezone: string | null;
  status: string;
  max_students: number;
  created_at: string;
};

type BatchStudent = { batch_id: string; student_id: string };

type FormState = {
  batch_name: string;
  course_name: string;
  trainer_name: string;
  local_datetime: string;
  source_timezone: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  batch_name: "",
  course_name: "",
  trainer_name: "",
  local_datetime: "",
  source_timezone: "America/New_York",
  status: "Active",
};

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );

  return asUtc - date.getTime();
}

function localDateTimeToUtc(localDateTime: string, timeZone: string) {
  if (!localDateTime) return null;

  const [datePart, timePart] = localDateTime.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const firstOffset = getTimeZoneOffsetMs(guess, timeZone);
  let result = new Date(guess.getTime() - firstOffset);

  const correctedOffset = getTimeZoneOffsetMs(result, timeZone);
  if (correctedOffset !== firstOffset) {
    result = new Date(guess.getTime() - correctedOffset);
  }

  return result.toISOString();
}

function formatInZone(iso: string | null, timeZone: string) {
  if (!iso) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function zoneLabel(value: string | null) {
  if (!value) return "US Eastern";
  return TIMEZONES.find((zone) => zone.value === value)?.label || value;
}

export default function BatchesPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rosterRows, setRosterRows] = useState<BatchStudent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    async function initialize() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/");
        return;
      }
      setEmail(data.user.email || "");
      setUserId(data.user.id);
      await loadBatches();
    }
    initialize();
  }, [router]);

  async function loadBatches() {
    setLoading(true);
    const [{ data: batchData, error: batchError }, { data: rosterData, error: rosterError }] = await Promise.all([
      supabase.from("batches").select("*").order("created_at", { ascending: false }),
      supabase.from("batch_students").select("batch_id,student_id"),
    ]);

    if (batchError || rosterError) {
      setMessage(batchError?.message || rosterError?.message || "Could not load batches.");
      setBatches([]);
      setRosterRows([]);
    } else {
      setBatches((batchData || []) as Batch[]);
      setRosterRows((rosterData || []) as BatchStudent[]);
    }
    setLoading(false);
  }

  const countByBatch = useMemo(() => {
    const map = new Map<string, number>();
    rosterRows.forEach((row) => map.set(row.batch_id, (map.get(row.batch_id) || 0) + 1));
    return map;
  }, [rosterRows]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches.filter((batch) => {
      if (statusFilter !== "All statuses" && batch.status !== statusFilter) return false;
      if (!q) return true;
      return [batch.batch_name, batch.course_name, batch.trainer_name, batch.source_timezone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [batches, search, statusFilter]);

  const previewIso = useMemo(
    () => localDateTimeToUtc(form.local_datetime, form.source_timezone),
    [form.local_datetime, form.source_timezone]
  );

  const stats = useMemo(() => ({
    total: batches.length,
    active: batches.filter((batch) => batch.status === "Active").length,
    students: rosterRows.length,
    capacity: batches.reduce((sum, batch) => sum + batch.max_students, 0),
  }), [batches, rosterRows]);

  async function saveBatch(event: FormEvent) {
    event.preventDefault();
    if (!form.batch_name.trim() || !form.course_name) {
      setMessage("Batch Name and Course are required.");
      return;
    }

    if (!form.local_datetime) {
      setMessage("Start Date & Time is required.");
      return;
    }

    const startAt = localDateTimeToUtc(form.local_datetime, form.source_timezone);
    if (!startAt) {
      setMessage("Please select a valid batch date and time.");
      return;
    }

    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("batches").insert({
      batch_name: form.batch_name.trim(),
      course_name: form.course_name,
      trainer_name: form.trainer_name.trim() || null,
      start_at: startAt,
      source_timezone: form.source_timezone,
      start_date: form.local_datetime.slice(0, 10),
      schedule_text: `${zoneLabel(form.source_timezone)} · ${formatInZone(startAt, form.source_timezone)}`,
      status: form.status,
      max_students: 8,
      created_by: userId || null,
      updated_by: userId || null,
    });

    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setModalOpen(false);
    setForm(EMPTY_FORM);
    await loadBatches();
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="batches" />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · BATCHES</p>
            <h1>Batches</h1>
            <p className={styles.subtitle}>Course groups, trainers, student rosters and class sessions.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.primary} onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}>+ Add Batch</button>
          </div>
        </header>

        <section className={styles.stats}>
          <div className={styles.stat}><span>Total Batches</span><strong>{stats.total}</strong></div>
          <div className={styles.stat}><span>Active Batches</span><strong>{stats.active}</strong></div>
          <div className={styles.stat}><span>Students Assigned</span><strong>{stats.students}</strong></div>
          <div className={styles.stat}><span>Total Capacity</span><strong>{stats.capacity}</strong></div>
        </section>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.card}>
          <div className={styles.toolbar}>
            <input type="search" placeholder="Search batch, course, trainer..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All statuses</option>
              <option>Active</option>
              <option>Upcoming</option>
              <option>Paused</option>
              <option>Completed</option>
            </select>
            <button className={styles.smallButton} onClick={loadBatches}>↻</button>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead><tr><th>Batch</th><th>Course</th><th>Trainer</th><th>Schedule</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className={styles.empty}>Loading batches...</td></tr>
                ) : filteredBatches.length === 0 ? (
                  <tr><td colSpan={7} className={styles.empty}>No batches found.</td></tr>
                ) : filteredBatches.map((batch) => {
                  const count = countByBatch.get(batch.id) || 0;
                  return (
                    <tr key={batch.id}>
                      <td>{batch.batch_name}<small>{batch.start_at ? `Starts ${formatInZone(batch.start_at, batch.source_timezone || "America/New_York")}` : batch.start_date ? `Starts ${new Date(`${batch.start_date}T00:00:00`).toLocaleDateString()}` : "No start date"}</small></td>
                      <td>{batch.course_name}</td>
                      <td>{batch.trainer_name || "—"}</td>
                      <td>
                        {batch.start_at ? (
                          <>
                            <span>{formatInZone(batch.start_at, batch.source_timezone || "America/New_York")}</span>
                            <small>{zoneLabel(batch.source_timezone)} · India: {formatInZone(batch.start_at, "Asia/Kolkata")}</small>
                          </>
                        ) : (batch.schedule_text || "—")}
                      </td>
                      <td>{count} / {batch.max_students}</td>
                      <td><span className={batch.status === "Active" ? `${styles.badge} ${styles.badgeGreen}` : styles.badge}>{batch.status}</span></td>
                      <td><div className={styles.rowActions}><button onClick={() => router.push(`/batches/${batch.id}`)}>Open</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div><h2>Add Batch</h2><p>Set the batch date and time in US or India time. India time is calculated automatically.</p></div>
              <button className={styles.close} onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={saveBatch}>
              <div className={styles.formGrid}>
                <label><span>Batch Name *</span><input value={form.batch_name} onChange={(event) => setForm({ ...form, batch_name: event.target.value })} placeholder="e.g. ALG1-MON-WED-01" /></label>
                <label><span>Course *</span><select value={form.course_name} onChange={(event) => setForm({ ...form, course_name: event.target.value })}><option value="">Select course</option>{COURSES.map((course) => <option key={course}>{course}</option>)}</select></label>
                <label><span>Trainer</span><input value={form.trainer_name} onChange={(event) => setForm({ ...form, trainer_name: event.target.value })} placeholder="Trainer name" /></label>
                <label><span>Start Date & Time *</span><input type="datetime-local" value={form.local_datetime} onChange={(event) => setForm({ ...form, local_datetime: event.target.value })} /></label>
                <label><span>Primary Time Zone</span><select value={form.source_timezone} onChange={(event) => setForm({ ...form, source_timezone: event.target.value })}>{TIMEZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}</select></label>
                <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Active</option><option>Upcoming</option><option>Paused</option><option>Completed</option></select></label>
                <div className={`${styles.timePreview} ${styles.full}`}>
                  <div>
                    <span>Selected Time</span>
                    <strong>{formatInZone(previewIso, form.source_timezone)}</strong>
                    <small>{zoneLabel(form.source_timezone)}</small>
                  </div>
                  <div className={styles.timeArrow}>→</div>
                  <div>
                    <span>India Time</span>
                    <strong>{formatInZone(previewIso, "Asia/Kolkata")}</strong>
                    <small>India IST</small>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondary} onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primary} disabled={saving}>{saving ? "Saving..." : "Add Batch"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
