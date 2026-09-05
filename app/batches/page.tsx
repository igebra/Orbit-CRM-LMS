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

const TIMEZONES = [
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Denver", label: "US Mountain" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "Asia/Kolkata", label: "India IST" },
];

const COURSES = [
  "AiEdge Elementary - Level 01","AiEdge Elementary - Level 02","AiEdge Elementary - Level 03",
  "AiEdge Middle School - Level 01","AiEdge Middle School - Level 02","AiEdge Middle School - Level 03",
  "AiEdge High School - Level 01","AiEdge High School - Level 02","AiEdge High School - Level 03",
  "Coding4AI Elementary - Level 01","Coding4AI Elementary - Level 02","Coding4AI Elementary - Level 03",
  "Coding4AI Middle School - Level 01","Coding4AI Middle School - Level 02","Coding4AI Middle School - Level 03",
  "Coding4AI High School - Level 01","Coding4AI High School - Level 02","Coding4AI High School - Level 03",
  "Math - Grade 01","Math - Grade 02","Math - Grade 03","Math - Grade 04","Math - Grade 05",
  "Math - Grade 06","Math - Grade 07","Math - Grade 08","Math - Grade 09","Math - Grade 10",
  "AP Pre-Calculus","AP Calculus AB","AP Calculus BC","AP Statistics","SAT and PSAT",
  "Algebra 1","Geometry","Algebra 2",
];

type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  trainer_name: string | null;
  trainer_user_id: string | null;
  start_at: string | null;
  source_timezone: string | null;
  end_date: string | null;
  planned_sessions: number | null;
  recurring_zoom_url: string | null;
  status: string;
  max_students: number;
};

type Roster = { batch_id: string; student_id: string };

type Trainer = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type FormState = {
  batch_name: string;
  course_name: string;
  trainer_user_id: string;
  trainer_name: string;
  local_datetime: string;
  source_timezone: string;
  end_date: string;
  planned_sessions: string;
  recurring_zoom_url: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  batch_name: "",
  course_name: "",
  trainer_user_id: "",
  trainer_name: "",
  local_datetime: "",
  source_timezone: "America/New_York",
  end_date: "",
  planned_sessions: "",
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
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  }).format(new Date(iso));
}

export default function BatchesPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canAdmin = role === "super_admin" || role === "admin";

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

    const [b, r, t] = await Promise.all([
      supabase.from("batches").select("*").order("created_at", { ascending: false }),
      supabase.from("batch_students").select("batch_id,student_id"),
      supabase.from("user_profiles").select("id,full_name,email").eq("role","trainer").eq("is_active",true).order("full_name"),
    ]);

    if (b.error) setMessage(b.error.message);
    setBatches((b.data || []) as Batch[]);
    setRoster((r.data || []) as Roster[]);
    setTrainers((t.data || []) as Trainer[]);
    setLoading(false);
  }

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    roster.forEach((x) => m.set(x.batch_id, (m.get(x.batch_id) || 0) + 1));
    return m;
  }, [roster]);

  const preview = useMemo(
    () => localToUtc(form.local_datetime, form.source_timezone),
    [form.local_datetime, form.source_timezone]
  );

  function chooseTrainer(id: string) {
    const trainer = trainers.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      trainer_user_id: id,
      trainer_name: trainer?.full_name || trainer?.email || f.trainer_name,
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.batch_name.trim() || !form.course_name || !form.local_datetime) {
      setMessage("Batch Name, Course and Start Date & Time are required.");
      return;
    }

    const startAt = localToUtc(form.local_datetime, form.source_timezone);
    if (!startAt) {
      setMessage("Please select a valid date and time.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("batches").insert({
      batch_name: form.batch_name.trim(),
      course_name: form.course_name,
      trainer_user_id: form.trainer_user_id || null,
      trainer_name: form.trainer_name.trim() || null,
      start_at: startAt,
      source_timezone: form.source_timezone,
      start_date: form.local_datetime.slice(0,10),
      end_date: form.end_date || null,
      planned_sessions: form.planned_sessions ? Number(form.planned_sessions) : null,
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
            <button className={styles.primary} onClick={() => setModalOpen(true)}>
              + Add Batch
            </button>
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
                  <th>Selected Time</th>
                  <th>India Time</th>
                  <th>End Date</th>
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
                    <td>{fmt(b.start_at, b.source_timezone || "America/New_York")}</td>
                    <td>{fmt(b.start_at, "Asia/Kolkata")}</td>
                    <td>{b.end_date || "—"}</td>
                    <td>{counts.get(b.id) || 0} / {b.max_students}</td>
                    <td><span className={styles.badge}>{b.status}</span></td>
                    <td>
                      <button className={styles.smallButton} onClick={() => router.push(`/batches/${b.id}`)}>
                        Open
                      </button>
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
                <label>
                  <span>Batch Name *</span>
                  <input value={form.batch_name} onChange={(e) => setForm({...form,batch_name:e.target.value})}/>
                </label>

                <label>
                  <span>Course *</span>
                  <select value={form.course_name} onChange={(e) => setForm({...form,course_name:e.target.value})}>
                    <option value="">Select course</option>
                    {COURSES.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>

                <label>
                  <span>Trainer Account</span>
                  <select value={form.trainer_user_id} onChange={(e) => chooseTrainer(e.target.value)}>
                    <option value="">Select trainer account</option>
                    {trainers.map((x) => <option key={x.id} value={x.id}>{x.full_name || x.email || "Trainer"}</option>)}
                  </select>
                </label>

                <label>
                  <span>Trainer Display Name</span>
                  <input value={form.trainer_name} onChange={(e) => setForm({...form,trainer_name:e.target.value})}/>
                </label>

                <label>
                  <span>Start Date & Time *</span>
                  <input type="datetime-local" value={form.local_datetime} onChange={(e) => setForm({...form,local_datetime:e.target.value})}/>
                </label>

                <label>
                  <span>Primary Time Zone</span>
                  <select value={form.source_timezone} onChange={(e) => setForm({...form,source_timezone:e.target.value})}>
                    {TIMEZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </label>

                <div className={`${styles.timePreview} ${styles.full}`}>
                  <div><span>Selected Time</span><strong>{preview ? fmt(preview,form.source_timezone) : "Select date & time"}</strong></div>
                  <div className={styles.timeArrow}>→</div>
                  <div><span>India Time</span><strong>{preview ? fmt(preview,"Asia/Kolkata") : "Select date & time"}</strong></div>
                </div>

                <label>
                  <span>Batch End Date</span>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({...form,end_date:e.target.value})}/>
                </label>

                <label>
                  <span>Planned Sessions</span>
                  <input type="number" min="1" value={form.planned_sessions} onChange={(e) => setForm({...form,planned_sessions:e.target.value})}/>
                </label>

                <label className={styles.full}>
                  <span>Recurring Zoom Link</span>
                  <input type="url" value={form.recurring_zoom_url} onChange={(e) => setForm({...form,recurring_zoom_url:e.target.value})} placeholder="https://zoom.us/j/..."/>
                </label>
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
