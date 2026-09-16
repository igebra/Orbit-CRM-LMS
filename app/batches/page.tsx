"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import { COURSE_OPTIONS, courseDefaults } from "../lib/orbitCourses";
import styles from "../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const CLASS_DAYS = [
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
  { value: "Sun", label: "Sun" },
];

const TIMEZONES = [
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Denver", label: "US Mountain" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Asia/Kolkata", label: "India IST" },
];


type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  trainer_name: string | null;
  trainer_user_id: string | null;
  trainer_id: string | null;
  start_at: string | null;
  source_timezone: string | null;
  end_date: string | null;
  planned_sessions: number | null;
  classes_per_week: number | null;
  classes_per_month: number | null;
  class_days: string[] | null;
  default_duration_minutes: number | null;
  recurring_zoom_url: string | null;
  status: string;
  max_students: number;
};

type Roster = { batch_id: string; student_id: string };
type StudentOption = { id: string; student_name: string };

type Trainer = {
  id: string;
  trainer_name: string;
};

type FormState = {
  batch_name: string;
  course_name: string;
  trainer_id: string;
  batch_start_date: string;
  class_time: string;
  source_timezone: string;
  end_date: string;
  planned_sessions: string;
  classes_per_month: string;
  class_days: string[];
  duration_minutes: string;
  recurring_zoom_url: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  batch_name: "",
  course_name: "",
  trainer_id: "",
  batch_start_date: "",
  class_time: "",
  source_timezone: "America/New_York",
  end_date: "",
  planned_sessions: "",
  classes_per_month: "",
  class_days: [],
  duration_minutes: "90",
  recurring_zoom_url: "",
  status: "Active",
};

function offsetMs(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;

  return Date.UTC(
    Number(map.year), Number(map.month) - 1, Number(map.day),
    Number(map.hour), Number(map.minute), Number(map.second)
  ) - date.getTime();
}

function localToUtc(value: string, zone: string) {
  if (!value) return null;
  const [d, t] = value.split("T");
  if (!d || !t) return null;
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);

  const guess = new Date(Date.UTC(y, m - 1, day, h, min));
  const first = offsetMs(guess, zone);
  let result = new Date(guess.getTime() - first);
  const second = offsetMs(result, zone);
  if (second !== first) result = new Date(guess.getTime() - second);
  return result.toISOString();
}

function fmt(iso: string | null, zone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

function fmtClassTime(iso: string | null, zone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function fmtClassDays(days: string[] | null) {
  if (!days || days.length === 0) return "—";
  const order = CLASS_DAYS.map((day) => day.value);
  return [...days]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .join(", ");
}

export default function BatchesPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canAdmin = ["super_admin","admin","sales","sales_marketing"].includes(role);
  const canDelete = ["super_admin", "admin", "sales", "sales_marketing"].includes(role);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");
      setEmail(data.user.email || "");
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("user_profiles").select("role").eq("id", data.user.id).single();

      setRole(profile?.role || "");
      await load();
    }
    init();
  }, [router]);

  async function load() {
    setLoading(true);

    const [b, r, s, t] = await Promise.all([
      supabase.from("batches").select("*").order("created_at", { ascending: false }),
      supabase.from("batch_students").select("batch_id,student_id"),
      supabase.from("students").select("id,student_name").order("student_name"),
      supabase.rpc("active_trainer_options"),
    ]);

    if (b.error) setMessage(b.error.message);
    setBatches((b.data || []) as Batch[]);
    setRoster((r.data || []) as Roster[]);
    setStudents((s.data || []) as StudentOption[]);
    setTrainers((t.data || []) as Trainer[]);
    setLoading(false);
  }

  const studentNamesByBatch = useMemo(() => {
    const studentMap = new Map(students.map((student) => [student.id, student.student_name]));
    const batchMap = new Map<string, string[]>();

    roster.forEach((item) => {
      const name = studentMap.get(item.student_id);
      if (!name) return;

      const current = batchMap.get(item.batch_id) || [];
      current.push(name);
      batchMap.set(item.batch_id, current);
    });

    batchMap.forEach((names, batchId) => {
      batchMap.set(batchId, [...names].sort((a, b) => a.localeCompare(b)));
    });

    return batchMap;
  }, [roster, students]);

  const scheduleLocal = useMemo(
    () =>
      form.batch_start_date && form.class_time
        ? `${form.batch_start_date}T${form.class_time}`
        : "",
    [form.batch_start_date, form.class_time]
  );

  const preview = useMemo(
    () => localToUtc(scheduleLocal, form.source_timezone),
    [scheduleLocal, form.source_timezone]
  );

  function chooseCourse(course: string) {
    const defaults = courseDefaults(course);
    setForm((current) => ({
      ...current,
      course_name: course,
      planned_sessions:
        defaults.plannedSessions === null
          ? current.planned_sessions
          : String(defaults.plannedSessions),
      duration_minutes: String(defaults.durationMinutes),
    }));
  }

  function chooseTrainer(id: string) {
    setForm((f) => ({ ...f, trainer_id: id }));
  }

  function toggleClassDay(day: string) {
    setForm((current) => {
      const nextDays = current.class_days.includes(day)
        ? current.class_days.filter((item) => item !== day)
        : [...current.class_days, day];

      return {
        ...current,
        class_days: nextDays,
        classes_per_month: nextDays.length ? String(nextDays.length * 4) : "",
      };
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      !form.batch_name.trim() ||
      !form.course_name ||
      !form.batch_start_date ||
      !form.class_time
    ) {
      setMessage("Batch Name, Course, Batch Start Date and Class Time are required.");
      return;
    }

    if (form.class_days.length === 0) {
      setMessage("Select at least one Class Day.");
      return;
    }

    const startAt = localToUtc(scheduleLocal, form.source_timezone);
    if (!startAt) {
      setMessage("Please select a valid date and time.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("batches").insert({
      batch_name: form.batch_name.trim(),
      course_name: form.course_name,
      trainer_id: form.trainer_id || null,
      trainer_name: trainers.find((x) => x.id === form.trainer_id)?.trainer_name || null,
      start_at: startAt,
      source_timezone: form.source_timezone,
      start_date: form.batch_start_date,
      end_date: form.end_date || null,
      planned_sessions: form.planned_sessions ? Number(form.planned_sessions) : null,
      classes_per_month: Number(form.classes_per_month || 4),
      classes_per_week: Math.max(1, Math.ceil(Number(form.classes_per_month || 4) / 4)),
      class_days: form.class_days,
      default_duration_minutes: Number(form.duration_minutes || 90),
      recurring_zoom_url: form.recurring_zoom_url.trim() || null,
      status: form.status,
      max_students: 8,
      created_by: userId || null,
      updated_by: userId || null,
    });

    setSaving(false);
    if (error) return setMessage(error.message);

    setModalOpen(false);
    setForm(EMPTY_FORM);
    await load();
  }


  async function deleteBatch(batch: Batch) {
    if (!canDelete) return;

    const confirmed = window.confirm(
      `Delete ${batch.batch_name} permanently?\n\nThis will also remove its student assignments, sessions, attendance, homework, trainer history and linked batch payment records.`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase.rpc("delete_batch_record", {
      p_batch_id: batch.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${batch.batch_name} was deleted.`);
    await load();
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="batches" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · BATCHES</p>
            <h1>Batches</h1>
            <p className={styles.subtitle}>Manage trainers, schedules, students and class operations.</p>
          </div>

          {canAdmin && (
            <div className={styles.headerActions}>
              <button className={styles.primary} onClick={() => setModalOpen(true)}>
                + Add Batch
              </button>
            </div>
          )}
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.card}>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Course</th>
                  <th>Trainer</th>
                  <th>Class Time</th>
                  <th>Class Days</th>
                  <th className={styles.batchClassesMonth}>Classes / Month</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className={styles.empty}>Loading batches...</td></tr>
                ) : batches.length === 0 ? (
                  <tr><td colSpan={9} className={styles.empty}>No batches found.</td></tr>
                ) : batches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.batch_name}</td>
                    <td>{b.course_name}</td>
                    <td>{b.trainer_name || "—"}</td>
                    <td className={styles.batchClassTime}>{fmtClassTime(b.start_at, b.source_timezone || "America/New_York")}</td>
                    <td className={styles.batchClassDaysText}>{fmtClassDays(b.class_days)}</td>
                    <td className={styles.batchClassesMonth}>{b.classes_per_month || ((b.classes_per_week || 1) * 4)}</td>
                    <td>
                      <div className={styles.batchStudentList}>
                        {(studentNamesByBatch.get(b.id) || []).length === 0 ? (
                          <span className={styles.batchStudentEmpty}>—</span>
                        ) : (
                          (studentNamesByBatch.get(b.id) || []).map((name) => (
                            <span key={name} className={styles.batchStudentName}>{name}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td><span className={styles.batchStatusNeutral}>{b.status}</span></td>
                    <td>
                      <div className={styles.compactTableActions}>
                        <button
                          className={styles.compactOpenButton}
                          onClick={() => router.push(`/batches/${b.id}`)}
                          title={`Open ${b.batch_name}`}
                        >
                          Open
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            className={styles.iconDeleteButton}
                            onClick={() => deleteBatch(b)}
                            title={`Delete ${b.batch_name}`}
                            aria-label={`Delete ${b.batch_name}`}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M8 8v9m4-9v9m4-9v9M5 6h14M9 6V4h6v2m3 0-1 14H7L6 6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div><h2>Add Batch</h2><p>Create the batch and operational schedule.</p></div>
              <button className={styles.close} onClick={() => setModalOpen(false)}>×</button>
            </div>

            <form className={styles.form} onSubmit={save}>
              <div className={styles.formGrid}>
                <div className={`${styles.batchTopRow} ${styles.full}`}>
                  <label>
                    <span>Batch Name *</span>
                    <input value={form.batch_name} onChange={(e) => setForm({...form,batch_name:e.target.value})}/>
                  </label>

                  <label>
                    <span>Course *</span>
                    <select value={form.course_name} onChange={(e) => chooseCourse(e.target.value)}>
                      <option value="">Select course</option>
                      {COURSE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>Trainer</span>
                    <select value={form.trainer_id} onChange={(e) => chooseTrainer(e.target.value)}>
                      <option value="">Select trainer</option>
                      {trainers.map((x) => <option key={x.id} value={x.id}>{x.trainer_name}</option>)}
                    </select>
                  </label>
                </div>

                <div className={`${styles.batchScheduleTopRow} ${styles.full}`}>
                  <label>
                    <span>Batch Start Date *</span>
                    <input
                      type="date"
                      value={form.batch_start_date}
                      onChange={(e) => setForm({...form,batch_start_date:e.target.value})}
                    />
                  </label>

                  <label>
                    <span>Batch End Date</span>
                    <input type="date" value={form.end_date} onChange={(e) => setForm({...form,end_date:e.target.value})}/>
                  </label>

                  <label>
                    <span>Class Time *</span>
                    <input
                      type="time"
                      value={form.class_time}
                      onChange={(e) => setForm({...form,class_time:e.target.value})}
                    />
                  </label>

                  <label>
                    <span>Primary Time Zone</span>
                    <select value={form.source_timezone} onChange={(e) => setForm({...form,source_timezone:e.target.value})}>
                      {TIMEZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className={`${styles.batchClassSetupRow} ${styles.full}`}>
                  <div className={styles.classDaysField}>
                    <span className={styles.classDaysLabel}>Class Days</span>
                    <div className={styles.classDaysGrid}>
                      {CLASS_DAYS.map((day) => {
                        const selected = form.class_days.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            className={`${styles.classDayButton} ${selected ? styles.classDayButtonActive : ""}`}
                            onClick={() => toggleClassDay(day.value)}
                            aria-pressed={selected}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <label>
                    <span>Class Duration</span>
                    <select value={form.duration_minutes} onChange={(e) => setForm({...form,duration_minutes:e.target.value})}>
                      <option value="60">60 Minutes</option>
                      <option value="90">90 Minutes</option>
                      <option value="120">120 Minutes</option>
                    </select>
                  </label>

                  <label>
                    <span>Classes Per Month</span>
                    <input
                      type="text"
                      value={form.classes_per_month || "—"}
                      readOnly
                      className={styles.autoCalculatedInput}
                    />
                  </label>
                </div>

                <label>
                  <span>Recurring Zoom Link</span>
                  <input
                    type="url"
                    value={form.recurring_zoom_url}
                    onChange={(e) => setForm({...form,recurring_zoom_url:e.target.value})}
                    placeholder="https://zoom.us/j/..."
                  />
                </label>

                <div className={`${styles.timePreview} ${styles.full} ${styles.timePreviewEnd}`}>
                  <div>
                    <span>Selected Time</span>
                    <strong>{preview ? fmt(preview,form.source_timezone) : "Select start date & class time"}</strong>
                  </div>
                  <div className={styles.timeArrow}>→</div>
                  <div>
                    <span>India Time</span>
                    <strong>{preview ? fmt(preview,"Asia/Kolkata") : "Select start date & class time"}</strong>
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
