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

const GRADES = Array.from({ length: 10 }, (_, i) =>
  `Grade ${String(i + 1).padStart(2, "0")}`
);

const COURSES = [
  ...["Elementary", "Middle School", "High School"].flatMap((group) =>
    ["01", "02", "03"].map((level) => `AiEdge ${group} - Level ${level}`)
  ),
  ...["Elementary", "Middle School", "High School"].flatMap((group) =>
    ["01", "02", "03"].map((level) => `Coding4AI ${group} - Level ${level}`)
  ),
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

type Student = {
  id: string;
  lead_id: string | null;
  student_name: string;
  grade: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

type Enrollment = {
  id: string;
  student_id: string;
  course_name: string;
  status: string;
};

type LeadOption = {
  id: string;
  parent_first_name: string;
  parent_last_name: string | null;
  child_name: string;
  grade: string | null;
  email: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  course_interested: string | null;
};

type FormState = {
  lead_id: string;
  student_name: string;
  grade: string;
  parent_first_name: string;
  parent_last_name: string;
  email: string;
  phone: string;
  course_name: string;
};

const EMPTY_FORM: FormState = {
  lead_id: "",
  student_name: "",
  grade: "",
  parent_first_name: "",
  parent_last_name: "",
  email: "",
  phone: "",
  course_name: "",
};

export default function StudentsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [search, setSearch] = useState("");
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
      await Promise.all([loadStudents(), loadLeads()]);
    }
    initialize();
  }, [router]);

  async function loadStudents() {
    setLoading(true);
    const [{ data: studentRows, error: studentError }, { data: enrollmentRows, error: enrollmentError }] =
      await Promise.all([
        supabase.from("students").select("*").order("created_at", { ascending: false }),
        supabase.from("student_enrollments").select("*").order("created_at", { ascending: false }),
      ]);

    if (studentError || enrollmentError) {
      setMessage(studentError?.message || enrollmentError?.message || "Could not load students.");
      setStudents([]);
      setEnrollments([]);
    } else {
      setStudents((studentRows || []) as Student[]);
      setEnrollments((enrollmentRows || []) as Enrollment[]);
    }
    setLoading(false);
  }

  async function loadLeads() {
    const { data, error } = await supabase
      .from("leads")
      .select("id,parent_first_name,parent_last_name,child_name,grade,email,phone_country_code,phone_number,course_interested")
      .neq("lead_stage", "Lost")
      .order("created_at", { ascending: false });

    if (!error) setLeadOptions((data || []) as LeadOption[]);
  }

  const coursesByStudent = useMemo(() => {
    const map = new Map<string, string[]>();
    enrollments.forEach((row) => {
      const list = map.get(row.student_id) || [];
      list.push(row.course_name);
      map.set(row.student_id, list);
    });
    return map;
  }, [enrollments]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) =>
      [
        student.student_name,
        student.grade,
        student.parent_first_name,
        student.parent_last_name,
        student.email,
        student.phone,
        ...(coursesByStudent.get(student.id) || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [students, search, coursesByStudent]);

  const stats = useMemo(() => ({
    total: students.length,
    active: students.filter((student) => student.status === "Active").length,
    enrollments: enrollments.filter((row) => row.status === "Active").length,
    math: enrollments.filter((row) =>
      ["Math", "AP ", "SAT", "Algebra", "Geometry", "Calculus", "Statistics"].some((term) => row.course_name.includes(term))
    ).length,
  }), [students, enrollments]);

  function selectLead(leadId: string) {
    if (!leadId) {
      setForm(EMPTY_FORM);
      return;
    }
    const lead = leadOptions.find((item) => item.id === leadId);
    if (!lead) return;
    setForm({
      lead_id: lead.id,
      student_name: lead.child_name || "",
      grade: lead.grade || "",
      parent_first_name: lead.parent_first_name || "",
      parent_last_name: lead.parent_last_name || "",
      email: lead.email || "",
      phone: lead.phone_number ? `${lead.phone_country_code || ""} ${lead.phone_number}`.trim() : "",
      course_name: lead.course_interested || "",
    });
  }

  async function saveStudent(event: FormEvent) {
    event.preventDefault();
    if (!form.student_name.trim()) {
      setMessage("Student Name is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: studentRow, error: studentError } = await supabase
      .from("students")
      .insert({
        lead_id: form.lead_id || null,
        student_name: form.student_name.trim(),
        grade: form.grade || null,
        parent_first_name: form.parent_first_name.trim() || null,
        parent_last_name: form.parent_last_name.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        phone: form.phone.trim() || null,
        created_by: userId || null,
        updated_by: userId || null,
      })
      .select("id")
      .single();

    if (studentError || !studentRow) {
      setMessage(studentError?.message || "Could not create student.");
      setSaving(false);
      return;
    }

    if (form.course_name) {
      const { error: enrollmentError } = await supabase.from("student_enrollments").insert({
        student_id: studentRow.id,
        course_name: form.course_name,
        created_by: userId || null,
      });
      if (enrollmentError) setMessage(enrollmentError.message);
    }

    if (form.lead_id) {
      await supabase
        .from("leads")
        .update({
          lead_stage: "Enrolled",
          converted_student_id: studentRow.id,
          converted_at: new Date().toISOString(),
          updated_by: userId || null,
        })
        .eq("id", form.lead_id);
    }

    setSaving(false);
    setModalOpen(false);
    setForm(EMPTY_FORM);
    await loadStudents();
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="students" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · STUDENTS</p>
            <h1>Students</h1>
            <p className={styles.subtitle}>Student profiles, course enrollments and CRM conversions.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.primary} onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}>
              + Add Student
            </button>
          </div>
        </header>

        <section className={styles.stats}>
          <div className={styles.stat}><span>Total Students</span><strong>{stats.total}</strong></div>
          <div className={styles.stat}><span>Active Students</span><strong>{stats.active}</strong></div>
          <div className={styles.stat}><span>Active Enrollments</span><strong>{stats.enrollments}</strong></div>
          <div className={styles.stat}><span>Math Enrollments</span><strong>{stats.math}</strong></div>
        </section>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.card}>
          <div className={styles.toolbar}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, parent, course, email..."
            />
            <button className={styles.smallButton} onClick={loadStudents}>↻</button>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Contact</th>
                  <th>Course(s)</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className={styles.empty}>Loading students...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={6} className={styles.empty}>No students found.</td></tr>
                ) : filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>{student.student_name}<small>{student.grade || "—"}</small></td>
                    <td>{[student.parent_first_name, student.parent_last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td>{student.email || "—"}<small>{student.phone || "—"}</small></td>
                    <td>{(coursesByStudent.get(student.id) || ["—"]).map((course) => <small key={course}>{course}</small>)}</td>
                    <td><span className={styles.badge}>{student.status}</span></td>
                    <td>{new Date(student.created_at).toLocaleDateString()}</td>
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
              <div><h2>Add Student</h2><p>Create a student directly or convert an existing CRM lead.</p></div>
              <button className={styles.close} onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form className={styles.form} onSubmit={saveStudent}>
              <div className={styles.formGrid}>
                <label className={styles.full}>
                  <span>Link Existing Lead (Optional)</span>
                  <select value={form.lead_id} onChange={(event) => selectLead(event.target.value)}>
                    <option value="">Create student manually</option>
                    {leadOptions.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.child_name} — {lead.parent_first_name} {lead.parent_last_name || ""}</option>
                    ))}
                  </select>
                </label>
                <label><span>Student Name *</span><input value={form.student_name} onChange={(event) => setForm({ ...form, student_name: event.target.value })} /></label>
                <label><span>Grade</span><select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}><option value="">Select grade</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
                <label><span>Parent First Name</span><input value={form.parent_first_name} onChange={(event) => setForm({ ...form, parent_first_name: event.target.value })} /></label>
                <label><span>Parent Last Name</span><input value={form.parent_last_name} onChange={(event) => setForm({ ...form, parent_last_name: event.target.value })} /></label>
                <label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label className={styles.full}><span>Initial Course Enrollment</span><select value={form.course_name} onChange={(event) => setForm({ ...form, course_name: event.target.value })}><option value="">Select course</option>{COURSES.map((course) => <option key={course}>{course}</option>)}</select></label>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondary} onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.primary} disabled={saving}>{saving ? "Saving..." : "Add Student"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
