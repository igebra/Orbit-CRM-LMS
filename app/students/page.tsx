"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "../lms.module.css";
import visual from "./students-visual.module.css";
import OrbitButton from "../components/ui/OrbitButton";
import OrbitNavIcon from "../components/OrbitNavIcon";

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

type BatchOption = { id:string; batch_name:string; course_name:string; status:string; };

const PLAN_TYPES = ["After Every 4 Classes","Monthly","Quarterly","Half-yearly","Yearly","Paid in Full","Custom"];
const FINANCE_MANAGERS = ["super_admin","admin","sales","sales_marketing","accounts_finance"];

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
  notes: string;
  create_plan: boolean;
  batch_id: string;
  total_fee_usd: string;
  installment_amount_usd: string;
  payment_plan: string;
  plan_start_date: string;
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
  notes: "",
  create_plan: false,
  batch_id: "",
  total_fee_usd: "",
  installment_amount_usd: "",
  payment_plan: "Monthly",
  plan_start_date: new Date().toISOString().slice(0, 10),
};

export default function StudentsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([]);
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const canDelete = ["super_admin", "admin", "sales", "sales_marketing"].includes(role);
  const canConfigurePlan = FINANCE_MANAGERS.includes(role);

  useEffect(() => {
    async function initialize() {
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

      setRole(profile?.role || "");
      await Promise.all([loadStudents(), loadLeads(), loadBatchOptions()]);
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

  async function loadBatchOptions() {
    const {data,error} = await supabase.from("batches")
      .select("id,batch_name,course_name,status").eq("status","Active")
      .order("batch_name",{ascending:true});
    if(error){ setMessage(error.message); return; }
    setBatchOptions((data || []) as BatchOption[]);
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

  // Count unique *active students* in each active course programme, rather
  // than enrolment records (a student may be enrolled in multiple levels).
  // School/advanced maths all belong to the Math programme.
  const programmeStats = useMemo(() => {
    const activeStudentIds = new Set(students.filter(
      student => student.status?.toLowerCase() === "active"
    ).map(student => student.id));
    const ids: Record<"math" | "aiedge" | "coding4ai", Set<string>> = {
      math: new Set<string>(), aiedge: new Set<string>(), coding4ai: new Set<string>(),
    };
    for (const row of enrollments) {
      if (row.status?.toLowerCase() !== "active" || !activeStudentIds.has(row.student_id)) continue;
      const course = row.course_name.trim().toLowerCase();
      if (/^ai\s*edge/.test(course)) ids.aiedge.add(row.student_id);
      else if (/^coding\s*4\s*ai|^c4ai|^coding/.test(course)) ids.coding4ai.add(row.student_id);
      else if (/^(math|ap\b|sat\b|psat\b|algebra|geometry|calculus|pre.?calculus|statistics)/.test(course)) ids.math.add(row.student_id);
    }
    return {math:ids.math.size,aiedge:ids.aiedge.size,coding4ai:ids.coding4ai.size};
  }, [students,enrollments]);

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
      notes:"",create_plan:false,batch_id:"",total_fee_usd:"",
      installment_amount_usd:"",payment_plan:"Monthly",
      plan_start_date:new Date().toISOString().slice(0,10),
    });
  }

  async function saveStudent(event: FormEvent) {
    event.preventDefault();
    if (!["super_admin","admin","sales","sales_marketing"].includes(role)) {
      setMessage("You do not have permission to create student profiles.");
      return;
    }
    if (!form.student_name.trim()) { setMessage("Student name is required."); return; }
    if (form.notes.trim() && !form.course_name && !form.create_plan) {
      setMessage("Select an initial course to save a note in the student profile.");
      return;
    }
    let selectedBatch:BatchOption|undefined;
    if (form.create_plan) {
      if(!canConfigurePlan){setMessage("Payment plan access is restricted.");return;}
      selectedBatch=batchOptions.find(row=>row.id===form.batch_id);
      const total=Number(form.total_fee_usd),instalment=Number(form.installment_amount_usd);
      if(!selectedBatch){setMessage("Select a running batch for the payment plan.");return;}
      if(!Number.isFinite(total)||total<=0||!Number.isFinite(instalment)||instalment<=0||instalment>total){
        setMessage("Total fee and installment must be positive, and installment cannot exceed total fee.");return;
      }
      if (!form.plan_start_date){setMessage("Enter the payment plan start date.");return;}
      if (form.course_name && form.course_name!==selectedBatch.course_name) {
        setMessage("The selected course must match the batch used for the fee plan.");return;
      }
    }
    setSaving(true);
    setMessage("");
    const {data:studentRow,error:studentError}=await supabase.from("students").insert({
      lead_id:form.lead_id||null,student_name:form.student_name.trim(),
      grade:form.grade||null,parent_first_name:form.parent_first_name.trim()||null,
      parent_last_name:form.parent_last_name.trim()||null,
      email:form.email.trim().toLowerCase()||null,phone:form.phone.trim()||null,
      created_by:userId||null,updated_by:userId||null,
    }).select("id").single();
    if(studentError||!studentRow){
      setSaving(false);setMessage(studentError?.message||"Could not create student.");return;
    }
    // Preserve saved student even when a follow-up finance step fails: never
    // silently retry the entire form and accidentally create another profile.
    const id=studentRow.id as string;
    async function partialFailure(step:string,reason:string){
      setSaving(false);setModalOpen(false);setForm(EMPTY_FORM);
      setMessage(`Student created, but ${step} could not be completed: ${reason}. Open the student profile to complete setup; do not add the student again.`);
      await loadStudents();
    }
    const course=form.course_name||selectedBatch?.course_name||"";
    if(course){
      const {error}=await supabase.from("student_enrollments").insert({
        student_id:id,course_name:course,notes:form.notes.trim()||null,
        created_by:userId||null,
      });
      if(error){await partialFailure("course enrollment / notes",error.message);return;}
    }
    if(form.create_plan&&selectedBatch){
      const {error:membershipError}=await supabase.from("batch_students").insert({
        batch_id:selectedBatch.id,student_id:id,
      });
      if(membershipError){await partialFailure("batch assignment",membershipError.message);return;}
      const {data:planId,error:planError}=await supabase.rpc("ensure_payment_plan_for_entry",{
        p_batch_id:selectedBatch.id,
        p_student_id:id,
        p_total_fee_usd:Number(form.total_fee_usd),
        p_payment_plan:form.payment_plan,
        p_installment_amount_usd:form.payment_plan==="Paid in Full"?
          Number(form.total_fee_usd):Number(form.installment_amount_usd),
        p_plan_start_date:form.plan_start_date,
      });
      if(planError){await partialFailure("payment plan",planError.message);return;}
      if(form.notes.trim()&&planId){
        const {error:noteError}=await supabase.from("batch_student_finance")
          .update({notes:form.notes.trim(),updated_by:userId||null})
          .eq("id",planId);
        if(noteError){
          // Note is already stored against the initial course; don't duplicate student.
          setMessage("Student and fee plan created; the fee-plan note could not be copied.");
        }
      }
    }
    if(form.lead_id){
      const {error}=await supabase.from("leads").update({
        lead_stage:"Enrolled",converted_student_id:id,
        converted_at:new Date().toISOString(),updated_by:userId||null,
      }).eq("id",form.lead_id);
      if(error){await partialFailure("lead conversion",error.message);return;}
    }
    setSaving(false);setModalOpen(false);setForm(EMPTY_FORM);
    await loadStudents();
    setMessage(`${form.student_name.trim()} created successfully${form.create_plan?" with a fee plan":""}.`);
  }

  async function deleteStudent(student: Student) {
    if (!canDelete) return;

    const confirmed = window.confirm(
      `Delete ${student.student_name} permanently?\n\nThis will also remove this student's enrollments, batch membership, attendance, homework and linked payment records.`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase.rpc("delete_student_record", {
      p_student_id: student.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`${student.student_name} was deleted.`);
    await loadStudents();
  }

  return (
    <div className={`${styles.shell} ${visual.shell}`}>
      <OrbitSidebar email={email} active="students" />

      <main className={`${styles.main} ${visual.main}`}>
        <header className={`${styles.header} ${visual.header}`}>
          <div>
            <p className={styles.kicker}>CRM · STUDENTS</p>
            <h1>Students</h1>
            <p className={styles.subtitle}>Student profiles, course enrollments and CRM conversions.</p>
          </div>
          <div className={styles.headerActions}>
            <img src="/orbit-mascot-approved.svg" alt="Orbit mascot" className={visual.headerMascot} width={54} height={72} />
            <OrbitButton variant="primary" icon={<OrbitNavIcon name="plus" />} onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}>
              Add Student
            </OrbitButton>
          </div>
        </header>

        <section className={visual.programmeStats} aria-label="Active students by programme">
          <div className={visual.mathStat}>
            <span>Math</span>
            <strong>{loading ? "—" : programmeStats.math}</strong>
            <small>Active students enrolled</small>
          </div>
          <div className={visual.aiedgeStat}>
            <span>AiEdge</span>
            <strong>{loading ? "—" : programmeStats.aiedge}</strong>
            <small>Active students enrolled</small>
          </div>
          <div className={visual.codingStat}>
            <span>Coding4AI</span>
            <strong>{loading ? "—" : programmeStats.coding4ai}</strong>
            <small>Active students enrolled</small>
          </div>
        </section>
        <p className={visual.statNote}>Each student is counted once per programme, even when enrolled in multiple levels. {loading ? "" : `${students.length} student profiles total · ${students.filter(s => s.status?.toLowerCase() === "active").length} active.`}</p>

        {message && <div className={styles.message} role="status">{message}</div>}

        <section className={`${styles.card} ${visual.card}`}>
          <div className={styles.toolbar}>
            <input
              aria-label="Search students"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, parent, course, email..."
            />
            <button type="button" className={visual.iconButton} onClick={loadStudents}
              aria-label="Refresh students" title="Refresh students" disabled={loading}>
              <OrbitNavIcon name="refresh" />
            </button>
          </div>

          <div className={`${styles.tableWrap} ${visual.tableWrap}`}>
            <table aria-label="Student directory">
              <thead>
                <tr>
                  <th data-sno>S.No</th>
                  <th>Student</th>
                  <th>Parent</th>
                  <th>Contact</th>
                  <th>Course(s)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className={styles.empty}>Loading students...</td></tr>
                ) : filteredStudents.length === 0 ? (
                  <tr><td colSpan={7} className={styles.empty}>No students found.</td></tr>
                ) : filteredStudents.map((student, index) => (
                  <tr key={student.id}>
                    <td data-sno>{index + 1}</td>
                    <td>{student.student_name}<small>{student.grade || "—"}</small></td>
                    <td>{[student.parent_first_name, student.parent_last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td>{student.email || "—"}<small>{student.phone || "—"}</small></td>
                    <td>{(coursesByStudent.get(student.id) || ["—"]).map((course) => <small key={course}>{course}</small>)}</td>
                    <td><span className={styles.badge}>{student.status}</span></td>
                    {canDelete && (
                      <td>
                        <div className={styles.rowActions}>
                          <OrbitButton size="sm" variant="secondary" onClick={() => router.push(`/students/${student.id}`)}>Open</OrbitButton>
                          <OrbitButton size="sm" variant="danger" onClick={() => deleteStudent(student)}>Delete</OrbitButton>
                        </div>
                      </td>
                    )}
                    {!canDelete && (
                      <td>
                        <OrbitButton size="sm" variant="secondary" onClick={() => router.push(`/students/${student.id}`)}>Open</OrbitButton>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modal} ${visual.modal}`} role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
            <div className={styles.modalHeader}>
              <div><h2 id="student-modal-title">Add Student</h2><p>Create a student directly or convert an existing CRM lead.</p></div>
              <button type="button" className={visual.iconButton} aria-label="Close Add Student" title="Close" onClick={() => setModalOpen(false)}>
                <OrbitNavIcon name="close" />
              </button>
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
                <label><span>Student Name *</span><input required autoFocus value={form.student_name} onChange={(event) => setForm({ ...form, student_name: event.target.value })} /></label>
                <label><span>Grade</span><select value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}><option value="">Select grade</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
                <label><span>Parent First Name</span><input value={form.parent_first_name} onChange={(event) => setForm({ ...form, parent_first_name: event.target.value })} /></label>
                <label><span>Parent Last Name</span><input value={form.parent_last_name} onChange={(event) => setForm({ ...form, parent_last_name: event.target.value })} /></label>
                <label><span>Email</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                <label><span>Phone</span><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                <label className={styles.full}>
                  <span>Initial Course Enrollment</span>
                  <select value={form.course_name} onChange={event=>setForm({...form,course_name:event.target.value})}>
                    <option value="">Select course</option>
                    {Array.from(new Set([...COURSES,...batchOptions.map(b=>b.course_name)])).map(course=>
                      <option key={course} value={course}>{course}</option>)}
                  </select>
                </label>
                <label className={styles.full}>
                  <span>Student Notes (Optional)</span>
                  <textarea className={visual.notesField} rows={3} maxLength={1500}
                    placeholder="Learning needs, parent instructions, follow-ups or other important notes…"
                    value={form.notes} onChange={event=>setForm({...form,notes:event.target.value})} />
                  <small className={visual.helperText}>Saved to the initial course enrolment, and shown on the student profile.</small>
                </label>
                {canConfigurePlan && (
                  <section className={`${styles.full} ${visual.financeSection}`} aria-label="Optional student fee plan">
                    <label className={visual.financeToggle}>
                      <input type="checkbox" checked={form.create_plan}
                        onChange={e=>setForm({...form,create_plan:e.target.checked,
                          batch_id:e.target.checked?form.batch_id:""})} />
                      <span>Add a Payment Plan (Optional)</span>
                    </label>
                    <p>Attach this student to a running batch and set the fee plan now, or do it later in Payments.</p>
                    {form.create_plan && (
                      <div className={visual.financeGrid}>
                        <label className={visual.financeFull}>
                          <span>Assign to Batch *</span>
                          <select required value={form.batch_id} onChange={e=>{
                            const nextBatch=batchOptions.find(b=>b.id===e.target.value);
                            setForm({...form,batch_id:e.target.value,
                              course_name:nextBatch?.course_name||form.course_name});
                          }}>
                            <option value="">Select running batch</option>
                            {batchOptions.map(batch=>
                              <option key={batch.id} value={batch.id}>{batch.batch_name} · {batch.course_name}</option>)}
                          </select>
                        </label>
                        <label><span>Total Fee (USD) *</span>
                          <input required type="number" min="0.01" step="0.01" placeholder="0.00"
                            value={form.total_fee_usd} onChange={e=>setForm({...form,total_fee_usd:e.target.value,
                              ...(form.payment_plan==="Paid in Full"?{installment_amount_usd:e.target.value}:{})})} />
                        </label>
                        <label><span>Payment Plan *</span>
                          <select required value={form.payment_plan} onChange={e=>setForm({...form,payment_plan:e.target.value,
                            ...(e.target.value==="Paid in Full"?{installment_amount_usd:form.total_fee_usd}:{})})}>
                            {PLAN_TYPES.map(plan=><option key={plan}>{plan}</option>)}
                          </select>
                        </label>
                        <label><span>Installment Amount (USD) *</span>
                          <input required type="number" min="0.01" step="0.01" placeholder="0.00"
                            value={form.installment_amount_usd} readOnly={form.payment_plan==="Paid in Full"}
                            onChange={e=>setForm({...form,installment_amount_usd:e.target.value})} />
                        </label>
                        <label><span>Plan Start Date *</span>
                          <input required type="date" value={form.plan_start_date}
                            onChange={e=>setForm({...form,plan_start_date:e.target.value})} />
                        </label>
                      </div>
                    )}
                  </section>
                )}
                {message && <div className={`${styles.full} ${visual.formMessage}`} role="alert">{message}</div>}
              </div>
              <div className={styles.modalFooter}>
                <OrbitButton variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</OrbitButton>
                <OrbitButton type="submit" variant="primary" loading={saving}>{saving ? "Saving..." : "Add Student"}</OrbitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
