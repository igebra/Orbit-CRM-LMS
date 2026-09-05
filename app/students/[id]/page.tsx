"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import OrbitSidebar from "../../components/OrbitSidebar";
import { COURSE_OPTIONS, GRADES } from "../../lib/orbitCourses";
import styles from "../../lms.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Student = {
  id: string;
  student_name: string;
  grade: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

type Enrollment = {
  id: string;
  course_name: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  notes: string | null;
};

type Batch = {
  id: string;
  batch_name: string;
  course_name: string;
  trainer_name: string | null;
  status: string;
};

type Progress = {
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

const OPS = ["super_admin", "admin", "sales", "sales_marketing"];
const FINANCE = [
  "super_admin",
  "admin",
  "sales",
  "sales_marketing",
  "accounts_finance",
  "viewer_management",
];

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function StudentDetailPage() {
  const { id: studentId } = useParams<{ id: string }>();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const [edit, setEdit] = useState({
    student_name: "",
    grade: "",
    parent_first_name: "",
    parent_last_name: "",
    email: "",
    phone: "",
    status: "Active",
  });

  const [enroll, setEnroll] = useState({
    course_name: "",
    enrolled_at: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const canManage = OPS.includes(role);
  const canSeeFinance = FINANCE.includes(role);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/");
        return;
      }

      setEmail(data.user.email || "");
      setUserId(data.user.id);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const currentRole = profile?.role || "";
      setRole(currentRole);
      await load(currentRole);
    }

    init();
  }, [router, studentId]);

  async function load(currentRole = role) {
    setLoading(true);
    setMessage("");

    const [studentResult, enrollmentResult, membershipResult, batchResult, progressResult] =
      await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).single(),
        supabase
          .from("student_enrollments")
          .select("id,course_name,status,enrolled_at,completed_at,notes")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false }),
        supabase
          .from("batch_students")
          .select("batch_id")
          .eq("student_id", studentId),
        supabase
          .from("batches")
          .select("id,batch_name,course_name,trainer_name,status")
          .order("created_at", { ascending: false }),
        supabase.rpc("student_progress_report", {
          p_student_id: studentId,
        }),
      ]);

    if (studentResult.error || !studentResult.data) {
      setMessage(studentResult.error?.message || "Student not found.");
      setLoading(false);
      return;
    }

    setStudent(studentResult.data as Student);
    setEnrollments((enrollmentResult.data || []) as Enrollment[]);
    setBatchIds((membershipResult.data || []).map((x) => x.batch_id));
    setBatches((batchResult.data || []) as Batch[]);
    setProgress((progressResult.data || []) as Progress[]);

    if (FINANCE.includes(currentRole)) {
      const { data } = await supabase
        .from("batch_student_payment_summary")
        .select(
          "batch_id,total_fee_usd,total_paid_usd,pending_usd,payment_status,next_due_date"
        )
        .eq("student_id", studentId);

      const batchRows = (batchResult.data || []) as Batch[];
      const batchMap = new Map(batchRows.map((row) => [row.id, row]));

      setPayments(
        (data || []).map((row) => ({
          ...row,
          batch_name: batchMap.get(row.batch_id)?.batch_name || "Batch",
          course_name: batchMap.get(row.batch_id)?.course_name || "Course",
        })) as Payment[]
      );
    } else {
      setPayments([]);
    }

    setLoading(false);
  }

  const studentBatches = useMemo(() => {
    const ids = new Set(batchIds);
    return batches.filter((batch) => ids.has(batch.id));
  }, [batchIds, batches]);

  const attendance = useMemo(() => {
    const marked = progress.filter((row) => row.attendance_status);
    const present = marked.filter((row) =>
      ["Present", "Late"].includes(row.attendance_status || "")
    ).length;

    return {
      marked: marked.length,
      present,
      rate: marked.length ? Math.round((present / marked.length) * 100) : 0,
    };
  }, [progress]);

  const homework = useMemo(() => {
    const rows = progress.filter((row) => row.homework_completed !== null);
    const completed = rows.filter((row) => row.homework_completed).length;

    return {
      total: rows.length,
      completed,
      rate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
    };
  }, [progress]);

  function openEdit() {
    if (!student) return;

    setEdit({
      student_name: student.student_name,
      grade: student.grade || "",
      parent_first_name: student.parent_first_name || "",
      parent_last_name: student.parent_last_name || "",
      email: student.email || "",
      phone: student.phone || "",
      status: student.status,
    });

    setEditOpen(true);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();

    const { error } = await supabase
      .from("students")
      .update({
        student_name: edit.student_name.trim(),
        grade: edit.grade || null,
        parent_first_name: edit.parent_first_name.trim() || null,
        parent_last_name: edit.parent_last_name.trim() || null,
        email: edit.email.trim().toLowerCase() || null,
        phone: edit.phone.trim() || null,
        status: edit.status,
        updated_by: userId || null,
      })
      .eq("id", studentId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditOpen(false);
    await load();
  }

  async function addEnrollment(event: FormEvent) {
    event.preventDefault();

    if (!enroll.course_name) {
      setMessage("Select a course.");
      return;
    }

    const { error } = await supabase.from("student_enrollments").insert({
      student_id: studentId,
      course_name: enroll.course_name,
      enrolled_at: enroll.enrolled_at,
      notes: enroll.notes.trim() || null,
      created_by: userId || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setEnrollOpen(false);
    setEnroll({
      course_name: "",
      enrolled_at: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    await load();
  }

  async function updateEnrollmentStatus(row: Enrollment, status: string) {
    const { error } = await supabase
      .from("student_enrollments")
      .update({
        status,
        completed_at:
          status === "Completed"
            ? new Date().toISOString().slice(0, 10)
            : null,
        updated_by: userId || null,
      })
      .eq("id", row.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await load();
  }

  if (loading || !student) {
    return (
      <div className={styles.shell}>
        <OrbitSidebar email={email} active="students" />
        <main className={styles.main}>
          <div className={styles.empty}>
            {loading ? "Loading student..." : message || "Student not found."}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="students" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · STUDENT PROFILE</p>
            <h1>{student.student_name}</h1>
            <p className={styles.subtitle}>
              {student.grade || "No grade"} · {student.status}
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              className={styles.secondary}
              onClick={() => router.push("/students")}
            >
              ← Students
            </button>

            {canManage && (
              <>
                <button className={styles.secondary} onClick={openEdit}>
                  Edit Profile
                </button>
                <button
                  className={styles.primary}
                  onClick={() => setEnrollOpen(true)}
                >
                  + Enrollment
                </button>
              </>
            )}
          </div>
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.batchOpsStats}>
          <div className={styles.stat}>
            <span>Active Enrollments</span>
            <strong>
              {enrollments.filter((row) => row.status === "Active").length}
            </strong>
          </div>

          <div className={styles.stat}>
            <span>Batches</span>
            <strong>{studentBatches.length}</strong>
          </div>

          <div className={styles.stat}>
            <span>Attendance</span>
            <strong>{attendance.marked ? `${attendance.rate}%` : "—"}</strong>
          </div>

          <div className={styles.stat}>
            <span>Homework</span>
            <strong>{homework.total ? `${homework.rate}%` : "—"}</strong>
          </div>
        </section>

        <section className={styles.grid2}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Profile</h2>
                <span>Parent and contact details</span>
              </div>
            </div>

            <div className={styles.infoList}>
              <div>
                <span>Parent</span>
                <strong>
                  {[student.parent_first_name, student.parent_last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{student.email || "—"}</strong>
              </div>
              <div>
                <span>Phone</span>
                <strong>{student.phone || "—"}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{student.status}</strong>
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Batch Membership</h2>
                <span>Current assigned batches</span>
              </div>
            </div>

            <div className={styles.compactList}>
              {studentBatches.length === 0 ? (
                <div className={styles.empty}>Not assigned to a batch.</div>
              ) : (
                studentBatches.map((batch) => (
                  <button
                    className={styles.compactRowButton}
                    key={batch.id}
                    onClick={() => router.push(`/batches/${batch.id}`)}
                  >
                    <div>
                      <strong>{batch.batch_name}</strong>
                      <small>
                        {batch.course_name} ·{" "}
                        {batch.trainer_name || "Trainer not assigned"}
                      </small>
                    </div>
                    <span className={styles.badge}>{batch.status}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className={styles.panel} style={{ marginTop: 16 }}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Course Enrollments</h2>
              <span>One student can have multiple simultaneous courses</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Enrolled</th>
                  <th>Status</th>
                  <th>Completed</th>
                  <th>Notes</th>
                  {canManage && <th>Action</th>}
                </tr>
              </thead>

              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className={styles.empty}>
                      No enrollments yet.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.course_name}</strong>
                      </td>
                      <td>{row.enrolled_at}</td>
                      <td>{row.status}</td>
                      <td>{row.completed_at || "—"}</td>
                      <td>{row.notes || "—"}</td>
                      {canManage && (
                        <td>
                          <select
                            value={row.status}
                            onChange={(e) =>
                              updateEnrollmentStatus(row, e.target.value)
                            }
                          >
                            <option>Active</option>
                            <option>Paused</option>
                            <option>Completed</option>
                            <option>Cancelled</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.panel} style={{ marginTop: 16 }}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Learning Progress</h2>
              <span>Attendance, homework and class history</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Batch</th>
                  <th>Session</th>
                  <th>Topic</th>
                  <th>Attendance</th>
                  <th>Homework</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {progress.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      No class history yet.
                    </td>
                  </tr>
                ) : (
                  progress.map((row) => (
                    <tr key={row.session_id}>
                      <td>{row.class_date}</td>
                      <td>
                        <strong>{row.batch_name}</strong>
                        <small>{row.course_name}</small>
                      </td>
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
                      <td>{row.class_status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {canSeeFinance && (
          <section className={styles.panel} style={{ marginTop: 16 }}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Payment Summary</h2>
                <span>Finance-authorized roles only</span>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Course</th>
                    <th>Total Fee</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Next Due</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        No payment plan set.
                      </td>
                    </tr>
                  ) : (
                    payments.map((row) => (
                      <tr key={row.batch_id}>
                        <td>{row.batch_name}</td>
                        <td>{row.course_name}</td>
                        <td>{money(row.total_fee_usd)}</td>
                        <td>{money(row.total_paid_usd)}</td>
                        <td>{money(row.pending_usd)}</td>
                        <td>{row.next_due_date || "—"}</td>
                        <td>{row.payment_status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {editOpen && canManage && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Edit Student</h2>
                <p>Update profile and status.</p>
              </div>
              <button className={styles.close} onClick={() => setEditOpen(false)}>
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={saveProfile}>
              <div className={styles.formGrid}>
                <label>
                  <span>Student Name</span>
                  <input
                    value={edit.student_name}
                    onChange={(e) =>
                      setEdit({ ...edit, student_name: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Grade</span>
                  <select
                    value={edit.grade}
                    onChange={(e) => setEdit({ ...edit, grade: e.target.value })}
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((grade) => (
                      <option key={grade}>{grade}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Parent First Name</span>
                  <input
                    value={edit.parent_first_name}
                    onChange={(e) =>
                      setEdit({ ...edit, parent_first_name: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Parent Last Name</span>
                  <input
                    value={edit.parent_last_name}
                    onChange={(e) =>
                      setEdit({ ...edit, parent_last_name: e.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={edit.email}
                    onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                  />
                </label>

                <label>
                  <span>Phone</span>
                  <input
                    value={edit.phone}
                    onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={edit.status}
                    onChange={(e) =>
                      setEdit({ ...edit, status: e.target.value })
                    }
                  >
                    <option>Active</option>
                    <option>Paused</option>
                    <option>Completed</option>
                    <option>Inactive</option>
                  </select>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </button>
                <button className={styles.primary}>Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {enrollOpen && canManage && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Add Enrollment</h2>
                <p>Add another course for this student.</p>
              </div>
              <button
                className={styles.close}
                onClick={() => setEnrollOpen(false)}
              >
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={addEnrollment}>
              <div className={styles.formGrid}>
                <label className={styles.full}>
                  <span>Course *</span>
                  <select
                    value={enroll.course_name}
                    onChange={(e) =>
                      setEnroll({ ...enroll, course_name: e.target.value })
                    }
                  >
                    <option value="">Select course</option>
                    {COURSE_OPTIONS.map((course) => (
                      <option key={course}>{course}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Enrollment Date</span>
                  <input
                    type="date"
                    value={enroll.enrolled_at}
                    onChange={(e) =>
                      setEnroll({ ...enroll, enrolled_at: e.target.value })
                    }
                  />
                </label>

                <label className={styles.full}>
                  <span>Notes</span>
                  <textarea
                    rows={3}
                    value={enroll.notes}
                    onChange={(e) =>
                      setEnroll({ ...enroll, notes: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setEnrollOpen(false)}
                >
                  Cancel
                </button>
                <button className={styles.primary}>Add Enrollment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
