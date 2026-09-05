"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import OrbitSidebar from "../../components/OrbitSidebar";
import styles from "../../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Session = {
  id: string;
  batch_id: string;
  session_number: number | null;
  session_date: string;
  topic_covered: string | null;
  status: string;
  zoom_recording_url: string | null;
  deck_url: string | null;
  homework_url: string | null;
  assessment_url: string | null;
  trainer_feedback: string | null;
  parent_feedback: string | null;
};

type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  trainer_name: string | null;
};

type Student = {
  id: string;
  student_name: string;
  grade: string | null;
};

type AttendanceRow = {
  student_id: string;
  attendance_status: string;
};

type FormState = {
  topic_covered: string;
  status: string;
  zoom_recording_url: string;
  deck_url: string;
  homework_url: string;
  assessment_url: string;
  trainer_feedback: string;
  parent_feedback: string;
};

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params.id;

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    topic_covered: "",
    status: "Scheduled",
    zoom_recording_url: "",
    deck_url: "",
    homework_url: "",
    assessment_url: "",
    trainer_feedback: "",
    parent_feedback: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function initialize() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/");
        return;
      }
      setEmail(data.user.email || "");
      setUserId(data.user.id);
      await loadPage();
    }
    initialize();
  }, [router, sessionId]);

  async function loadPage() {
    setLoading(true);
    const sessionResult = await supabase.from("class_sessions").select("*").eq("id", sessionId).single();

    if (sessionResult.error || !sessionResult.data) {
      setMessage(sessionResult.error?.message || "Session not found.");
      setLoading(false);
      return;
    }

    const loadedSession = sessionResult.data as Session;
    setSession(loadedSession);
    setForm({
      topic_covered: loadedSession.topic_covered || "",
      status: loadedSession.status,
      zoom_recording_url: loadedSession.zoom_recording_url || "",
      deck_url: loadedSession.deck_url || "",
      homework_url: loadedSession.homework_url || "",
      assessment_url: loadedSession.assessment_url || "",
      trainer_feedback: loadedSession.trainer_feedback || "",
      parent_feedback: loadedSession.parent_feedback || "",
    });

    const [batchResult, rosterResult, attendanceResult] = await Promise.all([
      supabase.from("batches").select("id,batch_name,course_name,trainer_name").eq("id", loadedSession.batch_id).single(),
      supabase.from("batch_students").select("student_id").eq("batch_id", loadedSession.batch_id),
      supabase.from("session_attendance").select("student_id,attendance_status").eq("session_id", sessionId),
    ]);

    if (!batchResult.error) setBatch(batchResult.data as Batch);

    const studentIds = (rosterResult.data || []).map((row) => row.student_id as string);
    let rosterStudents: Student[] = [];
    if (studentIds.length > 0) {
      const studentResult = await supabase.from("students").select("id,student_name,grade").in("id", studentIds).order("student_name");
      rosterStudents = (studentResult.data || []) as Student[];
    }
    setStudents(rosterStudents);

    const existing = new Map<string, string>();
    ((attendanceResult.data || []) as AttendanceRow[]).forEach((row) => existing.set(row.student_id, row.attendance_status));
    const map: Record<string, string> = {};
    rosterStudents.forEach((student) => {
      map[student.id] = existing.get(student.id) || "Present";
    });
    setAttendance(map);
    setLoading(false);
  }

  const attendanceSummary = useMemo(() => {
    const values = Object.values(attendance);
    return {
      present: values.filter((value) => value === "Present").length,
      absent: values.filter((value) => value === "Absent").length,
      excused: values.filter((value) => value === "Excused").length,
    };
  }, [attendance]);

  async function saveSession(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setMessage("");

    const { error: sessionError } = await supabase
      .from("class_sessions")
      .update({
        topic_covered: form.topic_covered.trim() || null,
        status: form.status,
        zoom_recording_url: form.zoom_recording_url.trim() || null,
        deck_url: form.deck_url.trim() || null,
        homework_url: form.homework_url.trim() || null,
        assessment_url: form.assessment_url.trim() || null,
        trainer_feedback: form.trainer_feedback.trim() || null,
        parent_feedback: form.parent_feedback.trim() || null,
        updated_by: userId || null,
      })
      .eq("id", sessionId);

    if (sessionError) {
      setMessage(sessionError.message);
      setSaving(false);
      return;
    }

    if (students.length > 0) {
      const rows = students.map((student) => ({
        session_id: sessionId,
        student_id: student.id,
        attendance_status: attendance[student.id] || "Present",
        updated_by: userId || null,
        updated_at: new Date().toISOString(),
      }));
      const { error: attendanceError } = await supabase
        .from("session_attendance")
        .upsert(rows, { onConflict: "session_id,student_id" });
      if (attendanceError) {
        setMessage(attendanceError.message);
        setSaving(false);
        return;
      }
    }

    setMessage("Session updated successfully.");
    setSaving(false);
    await loadPage();
  }

  if (loading) {
    return (
      <div className={styles.shell}>
        <OrbitSidebar email={email} active="sessions" />
        <main className={styles.main}><div className={styles.empty}>Loading session...</div></main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.shell}>
        <OrbitSidebar email={email} active="sessions" />
        <main className={styles.main}><div className={styles.message}>{message || "Session not found."}</div></main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="sessions" />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · CLASS SESSION</p>
            <h1>{session.session_number ? `Session ${session.session_number}` : "Class Session"}</h1>
            <p className={styles.subtitle}>
              {batch?.batch_name || "Batch"} · {batch?.course_name || "Course"} · {new Date(`${session.session_date}T00:00:00`).toLocaleDateString()}
            </p>
          </div>
          <div className={styles.headerActions}>
            {batch && <button className={styles.secondary} onClick={() => router.push(`/batches/${batch.id}`)}>← Batch</button>}
          </div>
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <form onSubmit={saveSession}>
          <section className={styles.grid2}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Class Details</h2><span>{batch?.trainer_name || "Trainer not assigned"}</span></div></div>
              <div className={styles.formGrid}>
                <label className={styles.full}><span>Topic Covered</span><input value={form.topic_covered} onChange={(event) => setForm({ ...form, topic_covered: event.target.value })} placeholder="What was taught in this class?" /></label>
                <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>
              </div>

              <h3 className={styles.sectionTitle}>Attendance</h3>
              <div className={styles.attendanceGrid}>
                {students.length === 0 ? <div className={styles.empty}>No students in this batch.</div> : students.map((student) => (
                  <div className={styles.attendanceRow} key={student.id}>
                    <div><strong>{student.student_name}</strong><small>{student.grade || "—"}</small></div>
                    <select value={attendance[student.id] || "Present"} onChange={(event) => setAttendance({ ...attendance, [student.id]: event.target.value })}>
                      <option>Present</option><option>Absent</option><option>Excused</option>
                    </select>
                  </div>
                ))}
              </div>
              {students.length > 0 && <p className={styles.subtitle}>Present {attendanceSummary.present} · Absent {attendanceSummary.absent} · Excused {attendanceSummary.excused}</p>}
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Class Materials</h2><span>Paste Drive, Zoom or document links</span></div></div>
              <div className={styles.formGrid}>
                <label className={styles.full}><span>Zoom Recording</span><input type="url" value={form.zoom_recording_url} onChange={(event) => setForm({ ...form, zoom_recording_url: event.target.value })} placeholder="https://..." /></label>
                <label className={styles.full}><span>PPT / Deck</span><input type="url" value={form.deck_url} onChange={(event) => setForm({ ...form, deck_url: event.target.value })} placeholder="https://..." /></label>
                <label className={styles.full}><span>Homework / Worksheet</span><input type="url" value={form.homework_url} onChange={(event) => setForm({ ...form, homework_url: event.target.value })} placeholder="https://..." /></label>
                <label className={styles.full}><span>Assessment Sheet</span><input type="url" value={form.assessment_url} onChange={(event) => setForm({ ...form, assessment_url: event.target.value })} placeholder="https://..." /></label>
              </div>
            </div>
          </section>

          <section className={styles.grid2} style={{ marginTop: 16 }}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Trainer Feedback</h2><span>Academic observation after class</span></div></div>
              <div className={styles.formGrid}><label className={styles.full}><span>Trainer Notes</span><textarea rows={6} value={form.trainer_feedback} onChange={(event) => setForm({ ...form, trainer_feedback: event.target.value })} placeholder="Progress, strengths, areas to practice..." /></label></div>
            </div>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Parent Feedback</h2><span>Update prepared for parent</span></div></div>
              <div className={styles.formGrid}><label className={styles.full}><span>Parent Update</span><textarea rows={6} value={form.parent_feedback} onChange={(event) => setForm({ ...form, parent_feedback: event.target.value })} placeholder="Short parent-facing progress update..." /></label></div>
            </div>
          </section>

          <div className={styles.modalFooter} style={{ marginTop: 18 }}>
            <button type="submit" className={styles.primary} disabled={saving}>{saving ? "Saving..." : "Save Session"}</button>
          </div>
        </form>
      </main>
    </div>
  );
}
