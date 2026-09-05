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

type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  trainer_name: string | null;
  schedule_text: string | null;
  start_date: string | null;
  status: string;
  max_students: number;
};

type Student = {
  id: string;
  student_name: string;
  grade: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

type BatchStudent = { id: string; batch_id: string; student_id: string };

type Session = {
  id: string;
  session_number: number | null;
  session_date: string;
  topic_covered: string | null;
  status: string;
};

type SessionForm = {
  session_number: string;
  session_date: string;
  topic_covered: string;
  status: string;
};

const EMPTY_SESSION: SessionForm = {
  session_number: "",
  session_date: "",
  topic_covered: "",
  status: "Scheduled",
};

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const batchId = params.id;

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [rosterRows, setRosterRows] = useState<BatchStudent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionForm>(EMPTY_SESSION);
  const [saving, setSaving] = useState(false);

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
  }, [router, batchId]);

  async function loadPage() {
    setLoading(true);
    const [batchResult, studentsResult, rosterResult, sessionsResult] = await Promise.all([
      supabase.from("batches").select("*").eq("id", batchId).single(),
      supabase.from("students").select("id,student_name,grade,email,phone,status").order("student_name"),
      supabase.from("batch_students").select("id,batch_id,student_id").eq("batch_id", batchId),
      supabase.from("class_sessions").select("id,session_number,session_date,topic_covered,status").eq("batch_id", batchId).order("session_date", { ascending: false }),
    ]);

    if (batchResult.error) {
      setMessage(batchResult.error.message);
      setBatch(null);
    } else {
      setBatch(batchResult.data as Batch);
    }
    setAllStudents((studentsResult.data || []) as Student[]);
    setRosterRows((rosterResult.data || []) as BatchStudent[]);
    setSessions((sessionsResult.data || []) as Session[]);
    setLoading(false);
  }

  const roster = useMemo(() => {
    const ids = new Set(rosterRows.map((row) => row.student_id));
    return allStudents.filter((student) => ids.has(student.id));
  }, [allStudents, rosterRows]);

  const availableStudents = useMemo(() => {
    const ids = new Set(rosterRows.map((row) => row.student_id));
    return allStudents.filter((student) => student.status === "Active" && !ids.has(student.id));
  }, [allStudents, rosterRows]);

  async function addStudent() {
    if (!selectedStudentId) return;
    setMessage("");
    const { error } = await supabase.from("batch_students").insert({
      batch_id: batchId,
      student_id: selectedStudentId,
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    setSelectedStudentId("");
    await loadPage();
  }

  async function removeStudent(studentId: string) {
    if (!window.confirm("Remove this student from the batch?")) return;
    const { error } = await supabase
      .from("batch_students")
      .delete()
      .eq("batch_id", batchId)
      .eq("student_id", studentId);
    if (error) setMessage(error.message);
    else await loadPage();
  }

  async function saveSession(event: FormEvent) {
    event.preventDefault();
    if (!sessionForm.session_date) {
      setMessage("Session Date is required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("class_sessions").insert({
      batch_id: batchId,
      session_number: sessionForm.session_number ? Number(sessionForm.session_number) : null,
      session_date: sessionForm.session_date,
      topic_covered: sessionForm.topic_covered.trim() || null,
      status: sessionForm.status,
      created_by: userId || null,
      updated_by: userId || null,
    });
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSessionModalOpen(false);
    setSessionForm(EMPTY_SESSION);
    await loadPage();
  }

  if (loading) {
    return (
      <div className={styles.shell}>
        <OrbitSidebar email={email} active="batches" />
        <main className={styles.main}><div className={styles.empty}>Loading batch...</div></main>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className={styles.shell}>
        <OrbitSidebar email={email} active="batches" />
        <main className={styles.main}><div className={styles.message}>{message || "Batch not found."}</div></main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="batches" />
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · BATCH DETAILS</p>
            <h1>{batch.batch_name}</h1>
            <p className={styles.subtitle}>{batch.course_name} · {batch.trainer_name || "Trainer not assigned"} · {batch.schedule_text || "Schedule not set"}</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.secondary} onClick={() => router.push("/batches")}>← Batches</button>
            <button className={styles.primary} onClick={() => { setSessionForm(EMPTY_SESSION); setSessionModalOpen(true); }}>+ Add Session</button>
          </div>
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.grid2}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><h2>Student Roster</h2><span>{roster.length} / {batch.max_students} students</span></div>
            </div>

            <div className={styles.toolbar} style={{ padding: 0, borderBottom: 0, marginBottom: 12 }}>
              <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} disabled={roster.length >= batch.max_students}>
                <option value="">Select student to add</option>
                {availableStudents.map((student) => <option key={student.id} value={student.id}>{student.student_name} — {student.grade || "No grade"}</option>)}
              </select>
              <button className={styles.smallButton} onClick={addStudent} disabled={!selectedStudentId || roster.length >= batch.max_students}>Add Student</button>
            </div>

            <div className={styles.roster}>
              {roster.length === 0 ? <div className={styles.empty}>No students assigned yet.</div> : roster.map((student) => (
                <div className={styles.rosterRow} key={student.id}>
                  <div><strong>{student.student_name}</strong><small>{student.grade || "—"} · {student.email || student.phone || "No contact"}</small></div>
                  <button className={styles.danger} onClick={() => removeStudent(student.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div><h2>Class Sessions</h2><span>{sessions.length} sessions</span></div>
            </div>
            <div className={styles.sessionList}>
              {sessions.length === 0 ? <div className={styles.empty}>No sessions created yet.</div> : sessions.map((session) => (
                <div className={styles.sessionItem} key={session.id}>
                  <div>
                    <h3>{session.session_number ? `Session ${session.session_number}` : "Class Session"} · {new Date(`${session.session_date}T00:00:00`).toLocaleDateString()}</h3>
                    <p>{session.topic_covered || "Topic not added"} · {session.status}</p>
                  </div>
                  <button className={styles.smallButton} onClick={() => router.push(`/sessions/${session.id}`)}>Open</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {sessionModalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div><h2>Add Class Session</h2><p>Create the class record now; resources and feedback can be added after class.</p></div>
              <button className={styles.close} onClick={() => setSessionModalOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={saveSession}>
              <div className={styles.formGrid}>
                <label><span>Session Number</span><input type="number" min="1" value={sessionForm.session_number} onChange={(event) => setSessionForm({ ...sessionForm, session_number: event.target.value })} /></label>
                <label><span>Session Date *</span><input type="date" value={sessionForm.session_date} onChange={(event) => setSessionForm({ ...sessionForm, session_date: event.target.value })} /></label>
                <label className={styles.full}><span>Topic Covered / Planned</span><input value={sessionForm.topic_covered} onChange={(event) => setSessionForm({ ...sessionForm, topic_covered: event.target.value })} placeholder="e.g. Solving Linear Equations" /></label>
                <label><span>Status</span><select value={sessionForm.status} onChange={(event) => setSessionForm({ ...sessionForm, status: event.target.value })}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select></label>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondary} onClick={() => setSessionModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primary} disabled={saving}>{saving ? "Saving..." : "Add Session"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
