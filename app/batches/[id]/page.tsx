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

const PAYMENT_PLANS = [
  "After Every 4 Classes","Monthly","Quarterly","Half-yearly","Yearly","Custom"
];

const PAYMENT_MODES = [
  "Zelle","Stripe","Razorpay","UPI","Bank Transfer","Credit/Debit Card","PayPal","Cash","Cheque","Other"
];

type Batch = {
  id:string; batch_name:string; course_name:string; trainer_name:string|null; trainer_user_id:string|null; trainer_id:string|null;
  start_at:string|null; source_timezone:string|null; end_date:string|null; recurring_zoom_url:string|null;
  planned_sessions:number|null; status:string; max_students:number;
};

type Student = { id:string; student_name:string; grade:string|null; email:string|null; phone:string|null; status:string };
type Roster = { id:string; batch_id:string; student_id:string };
type Session = { id:string; session_number:number|null; session_date:string; topic_planned:string|null; topic_covered:string|null; status:string; trainer_name:string|null };
type Trainer = { id:string; trainer_name:string };
type History = { id:string; trainer_name:string|null; assigned_from:string; assigned_to:string|null; is_active:boolean };

type Finance = {
  finance_id:string; student_id:string; student_name:string; grade:string|null;
  total_fee_usd:number; payment_plan:string; installment_amount_usd:number; plan_start_date:string;
  custom_next_due_date:string|null; total_paid_usd:number; pending_usd:number;
  next_due_date:string|null; next_due_label:string; payment_status:string;
};

type Txn = { id:string; finance_id:string; amount_usd:number; payment_date:string; payment_mode:string; reference:string|null };

function money(n:number|undefined|null) {
  return `$${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}

function fmt(iso:string|null, zone:string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone:zone, day:"2-digit", month:"short", year:"numeric",
    hour:"numeric", minute:"2-digit", hour12:true, timeZoneName:"short"
  }).format(new Date(iso));
}

export default function BatchDetailPage() {
  const { id: batchId } = useParams<{id:string}>();
  const router = useRouter();

  const [email,setEmail] = useState("");
  const [userId,setUserId] = useState("");
  const [role,setRole] = useState("");
  const [batch,setBatch] = useState<Batch|null>(null);
  const [students,setStudents] = useState<Student[]>([]);
  const [rosterRows,setRosterRows] = useState<Roster[]>([]);
  const [sessions,setSessions] = useState<Session[]>([]);
  const [trainers,setTrainers] = useState<Trainer[]>([]);
  const [history,setHistory] = useState<History[]>([]);
  const [finance,setFinance] = useState<Finance[]>([]);
  const [txns,setTxns] = useState<Txn[]>([]);
  const [tab,setTab] = useState<"overview"|"classes"|"payments">("overview");
  const [message,setMessage] = useState("");
  const [selectedStudent,setSelectedStudent] = useState("");
  const [loading,setLoading] = useState(true);

  const [editOpen,setEditOpen] = useState(false);
  const [sessionOpen,setSessionOpen] = useState(false);
  const [financeOpen,setFinanceOpen] = useState(false);
  const [paymentOpen,setPaymentOpen] = useState(false);

  const [edit,setEdit] = useState({trainer_id:"",trainer_name:"",end_date:"",recurring_zoom_url:"",planned_sessions:"",status:"Active"});
  const [sessionForm,setSessionForm] = useState({session_number:"",session_date:"",topic_planned:"",status:"Scheduled"});
  const [attendanceRows,setAttendanceRows] = useState<{session_id:string;attendance_status:string}[]>([]);
  const [financeForm,setFinanceForm] = useState({student_id:"",total_fee_usd:"",payment_plan:"Monthly",installment_amount_usd:"",plan_start_date:new Date().toISOString().slice(0,10),custom_next_due_date:""});
  const [paymentForm,setPaymentForm] = useState({finance_id:"",student_name:"",amount_usd:"",payment_date:new Date().toISOString().slice(0,10),payment_mode:"Zelle",reference:""});

  const canAdmin = ["super_admin","admin","sales","sales_marketing"].includes(role);
  const canSeeFinance = ["super_admin","admin","sales","viewer_management","accounts_finance"].includes(role);
  const canManageFinance = ["super_admin","admin","sales","sales_marketing","accounts_finance"].includes(role);
  const canTeach = canAdmin || role==="trainer";

  useEffect(() => {
    async function init() {
      const {data} = await supabase.auth.getUser();
      if (!data.user) return router.replace("/");
      setEmail(data.user.email||"");
      setUserId(data.user.id);

      const {data:profile} = await supabase.from("user_profiles").select("role").eq("id",data.user.id).single();
      const r = profile?.role || "";
      setRole(r);
      await load(r);
    }
    init();
  },[router,batchId]);

  async function load(r?:string) {
    setLoading(true);

    const [b,s,rr,cs,tr,h] = await Promise.all([
      supabase.from("batches").select("*").eq("id",batchId).single(),
      supabase.from("students").select("id,student_name,grade,email,phone,status").order("student_name"),
      supabase.from("batch_students").select("id,batch_id,student_id").eq("batch_id",batchId),
      supabase.from("class_sessions").select("id,session_number,session_date,topic_planned,topic_covered,status,trainer_name").eq("batch_id",batchId).order("session_date",{ascending:false}),
      supabase.rpc("active_trainer_options"),
      supabase.from("batch_trainer_assignments").select("id,trainer_name,assigned_from,assigned_to,is_active").eq("batch_id",batchId).order("assigned_from",{ascending:false}),
    ]);

    if (b.error) {
      setMessage(b.error.message);
      setLoading(false);
      return;
    }

    setBatch(b.data as Batch);
    setStudents((s.data||[]) as Student[]);
    setRosterRows((rr.data||[]) as Roster[]);
    setSessions((cs.data||[]) as Session[]);
    setTrainers((tr.data||[]) as Trainer[]);
    setHistory((h.data||[]) as History[]);

    const sessionIds = ((cs.data || []) as Session[]).map((x) => x.id);
    if (sessionIds.length) {
      const { data: attendanceData } = await supabase
        .from("session_attendance")
        .select("session_id,attendance_status")
        .in("session_id", sessionIds);
      setAttendanceRows((attendanceData || []) as {session_id:string;attendance_status:string}[]);
    } else {
      setAttendanceRows([]);
    }

    const effectiveRole = r ?? role;
    if (["super_admin","admin","sales","viewer_management","accounts_finance"].includes(effectiveRole)) {
      await loadFinance();
    } else {
      setFinance([]); setTxns([]);
    }

    setLoading(false);
  }

  async function loadFinance() {
    const [f,t] = await Promise.all([
      supabase.from("batch_student_payment_summary").select("*").eq("batch_id",batchId).order("student_name"),
      supabase.from("payment_transactions").select("id,finance_id,amount_usd,payment_date,payment_mode,reference").order("payment_date",{ascending:false}),
    ]);
    if (!f.error) setFinance((f.data||[]) as Finance[]);
    if (!t.error) setTxns((t.data||[]) as Txn[]);
  }

  const roster = useMemo(() => {
    const ids = new Set(rosterRows.map(x=>x.student_id));
    return students.filter(x=>ids.has(x.id));
  },[students,rosterRows]);

  const available = useMemo(() => {
    const ids = new Set(rosterRows.map(x=>x.student_id));
    return students.filter(x=>x.status==="Active"&&!ids.has(x.id));
  },[students,rosterRows]);

  const financeByStudent = useMemo(() => {
    const m = new Map<string,Finance>();
    finance.forEach(x=>m.set(x.student_id,x));
    return m;
  },[finance]);

  const revenue = useMemo(() => finance.reduce((a,x)=>({
    billed:a.billed+Number(x.total_fee_usd||0),
    paid:a.paid+Number(x.total_paid_usd||0),
    pending:a.pending+Number(x.pending_usd||0),
  }),{billed:0,paid:0,pending:0}),[finance]);

  const modes = useMemo(() => {
    const ids = new Set(finance.map(x=>x.finance_id));
    const m = new Map<string,number>();
    txns.filter(x=>ids.has(x.finance_id)).forEach(x=>m.set(x.payment_mode,(m.get(x.payment_mode)||0)+Number(x.amount_usd||0)));
    return [...m.entries()].sort((a,b)=>b[1]-a[1]);
  },[txns,finance]);

  async function addStudent() {
    if (!selectedStudent) return;
    const {error} = await supabase.from("batch_students").insert({batch_id:batchId,student_id:selectedStudent});
    if (error) return setMessage(error.message);
    setSelectedStudent("");
    await load();
  }

  async function removeStudent(id:string) {
    if (!confirm("Remove this student from the batch?")) return;
    const {error} = await supabase.from("batch_students").delete().eq("batch_id",batchId).eq("student_id",id);
    if (error) return setMessage(error.message);
    await load();
  }

  function openEdit() {
    if (!batch) return;
    setEdit({
      trainer_id:batch.trainer_id||"",
      trainer_name:batch.trainer_name||"",
      end_date:batch.end_date||"",
      recurring_zoom_url:batch.recurring_zoom_url||"",
      planned_sessions:batch.planned_sessions?String(batch.planned_sessions):"",
      status:batch.status,
    });
    setEditOpen(true);
  }

  function chooseTrainer(id:string) {
    const t = trainers.find(x=>x.id===id);
    setEdit(e=>({...e,trainer_id:id,trainer_name:t?.trainer_name||""}));
  }

  async function saveEdit(e:FormEvent) {
    e.preventDefault();
    const {error} = await supabase.from("batches").update({
      trainer_id:edit.trainer_id||null,
      trainer_name:edit.trainer_name.trim()||null,
      end_date:edit.end_date||null,
      recurring_zoom_url:edit.recurring_zoom_url.trim()||null,
      planned_sessions:edit.planned_sessions?Number(edit.planned_sessions):null,
      status:edit.status,
      updated_by:userId||null,
    }).eq("id",batchId);

    if (error) return setMessage(error.message);
    setEditOpen(false);
    await load();
  }

  async function saveSession(e:FormEvent) {
    e.preventDefault();
    if (!sessionForm.session_date) return setMessage("Session Date is required.");

    const {error} = await supabase.from("class_sessions").insert({
      batch_id:batchId,
      session_number:sessionForm.session_number?Number(sessionForm.session_number):null,
      session_date:sessionForm.session_date,
      topic_planned:sessionForm.topic_planned.trim()||null,
      trainer_id:batch?.trainer_id||null,
      trainer_name:batch?.trainer_name||null,
      status:sessionForm.status,
      created_by:userId||null,
      updated_by:userId||null,
    });

    if (error) return setMessage(error.message);
    setSessionOpen(false);
    setSessionForm({session_number:"",session_date:"",topic_planned:"",status:"Scheduled"});
    await load();
  }

  function openFinance(student:Student) {
    const f=financeByStudent.get(student.id);
    setFinanceForm(f?{
      student_id:student.id,total_fee_usd:String(f.total_fee_usd),payment_plan:f.payment_plan,
      installment_amount_usd:String(f.installment_amount_usd),plan_start_date:f.plan_start_date,
      custom_next_due_date:f.custom_next_due_date||""
    }:{student_id:student.id,total_fee_usd:"",payment_plan:"Monthly",installment_amount_usd:"",plan_start_date:new Date().toISOString().slice(0,10),custom_next_due_date:""});
    setFinanceOpen(true);
  }

  async function saveFinance(e:FormEvent) {
    e.preventDefault();
    const {error} = await supabase.from("batch_student_finance").upsert({
      batch_id:batchId,
      student_id:financeForm.student_id,
      total_fee_usd:Number(financeForm.total_fee_usd),
      payment_plan:financeForm.payment_plan,
      installment_amount_usd:Number(financeForm.installment_amount_usd),
      plan_start_date:financeForm.plan_start_date,
      custom_next_due_date:financeForm.payment_plan==="Custom"?(financeForm.custom_next_due_date||null):null,
      created_by:userId||null,
      updated_by:userId||null,
    },{onConflict:"batch_id,student_id"});

    if (error) return setMessage(error.message);
    setFinanceOpen(false);
    await loadFinance();
  }

  function openPayment(f:Finance) {
    setPaymentForm({
      finance_id:f.finance_id,student_name:f.student_name,
      amount_usd:String(Math.min(Number(f.installment_amount_usd||0),Number(f.pending_usd||0))||""),
      payment_date:new Date().toISOString().slice(0,10),payment_mode:"Zelle",reference:""
    });
    setPaymentOpen(true);
  }

  async function savePayment(e:FormEvent) {
    e.preventDefault();
    const {error}=await supabase.from("payment_transactions").insert({
      finance_id:paymentForm.finance_id,
      amount_usd:Number(paymentForm.amount_usd),
      payment_date:paymentForm.payment_date,
      payment_mode:paymentForm.payment_mode,
      reference:paymentForm.reference.trim()||null,
      created_by:userId||null,
    });
    if (error) return setMessage(error.message);
    setPaymentOpen(false);
    await loadFinance();
  }


  function attendanceSummary(sessionId:string) {
    const rows = attendanceRows.filter((row) => row.session_id === sessionId);
    if (!rows.length) return "Not marked";
    const present = rows.filter((row) => row.attendance_status === "Present").length;
    return `${present}/${rows.length} Present`;
  }

  if (loading || !batch) {
    return <div className={styles.shell}><OrbitSidebar email={email} active="batches"/><main className={styles.main}><div className={styles.empty}>{loading?"Loading batch...":message||"Batch not found."}</div></main></div>;
  }

  const completed = sessions.filter(x=>x.status==="Completed").length;

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="batches"/>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>LMS · BATCH OPERATIONS</p>
            <h1>{batch.batch_name}</h1>
            <p className={styles.subtitle}>{batch.course_name} · {batch.trainer_name||"Trainer not assigned"}</p>
            <div className={styles.batchScheduleSummary}>
              <span>{fmt(batch.start_at,batch.source_timezone||"America/New_York")}</span>
              <span>India: {fmt(batch.start_at,"Asia/Kolkata")}</span>
              {batch.end_date && <span>Ends: {batch.end_date}</span>}
            </div>
          </div>

          <div className={styles.headerActions}>
            <button className={styles.secondary} onClick={()=>router.push("/batches")}>← Batches</button>
            {canAdmin && <button className={styles.secondary} onClick={openEdit}>Edit Batch</button>}
            {canTeach && <button className={styles.primary} onClick={()=>setSessionOpen(true)}>+ Add Session</button>}
          </div>
        </header>

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.batchOpsStats}>
          <div className={styles.stat}><span>Students</span><strong>{roster.length} / {batch.max_students}</strong></div>
          <div className={styles.stat}><span>Classes Completed</span><strong>{completed}{batch.planned_sessions?` / ${batch.planned_sessions}`:""}</strong></div>
          <div className={styles.stat}><span>Trainer</span><strong className={styles.statText}>{batch.trainer_name||"Not assigned"}</strong></div>
          <div className={styles.stat}><span>Zoom</span>{batch.recurring_zoom_url?<a className={styles.statLink} href={batch.recurring_zoom_url} target="_blank" rel="noreferrer">Open Meeting</a>:<strong className={styles.statText}>Not added</strong>}</div>
        </section>

        <div className={styles.tabBar}>
          <button className={tab==="overview"?styles.tabActive:""} onClick={()=>setTab("overview")}>Overview</button>
          <button className={tab==="classes"?styles.tabActive:""} onClick={()=>setTab("classes")}>Classes</button>
          {canSeeFinance && <button className={tab==="payments"?styles.tabActive:""} onClick={()=>setTab("payments")}>Payments</button>}
        </div>

        {tab==="overview" && (
          <section className={styles.grid2}>
            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Student Roster</h2><span>{roster.length} / {batch.max_students} students</span></div></div>

              {canAdmin && (
                <div className={styles.toolbar} style={{padding:0,borderBottom:0,marginBottom:12}}>
                  <select value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)} disabled={roster.length>=batch.max_students}>
                    <option value="">Select student to add</option>
                    {available.map(x=><option key={x.id} value={x.id}>{x.student_name} — {x.grade||"No grade"}</option>)}
                  </select>
                  <button className={styles.smallButton} onClick={addStudent} disabled={!selectedStudent}>Add Student</button>
                </div>
              )}

              <div className={styles.roster}>
                {roster.length===0?<div className={styles.empty}>No students assigned.</div>:roster.map(x=>(
                  <div className={styles.rosterRow} key={x.id}>
                    <div><strong>{x.student_name}</strong><small>{x.grade||"—"} · {x.email||x.phone||"No contact"}</small></div>
                    {canAdmin && <button className={styles.danger} onClick={()=>removeStudent(x.id)}>Remove</button>}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Batch Information</h2><span>Operational summary</span></div></div>
              <div className={styles.infoList}>
                <div><span>End Date</span><strong>{batch.end_date||"—"}</strong></div>
                <div><span>Planned Sessions</span><strong>{batch.planned_sessions||"—"}</strong></div>
                <div><span>Status</span><strong>{batch.status}</strong></div>
                <div><span>Recurring Zoom</span><strong>{batch.recurring_zoom_url?"Added":"Not added"}</strong></div>
              </div>

              <h3 className={styles.sectionTitle}>Trainer History</h3>
              <div className={styles.compactList}>
                {history.length===0?<div className={styles.empty}>No trainer history.</div>:history.map(x=>(
                  <div className={styles.compactRow} key={x.id}>
                    <div><strong>{x.trainer_name||"Trainer"}</strong><small>{x.assigned_from}{x.assigned_to?` → ${x.assigned_to}`:" → Current"}</small></div>
                    {x.is_active && <span className={styles.badgeGreen}>Current</span>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab==="classes" && (
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><h2>Class Sessions</h2><span>{sessions.length} sessions</span></div></div>
            <div className={styles.sessionList}>
              {sessions.length===0?<div className={styles.empty}>No sessions created.</div>:sessions.map(x=>(
                <div className={styles.sessionItem} key={x.id}>
                  <div>
                    <h3>{x.session_number?`Session ${x.session_number}`:"Class Session"} · {x.session_date}</h3>
                    <p>{x.trainer_name||"Trainer not assigned"} · {x.topic_covered||x.topic_planned||"Topic not added"} · {x.status}</p>
                    <span className={styles.badge}>{attendanceSummary(x.id)}</span>
                  </div>
                  <button className={styles.smallButton} onClick={()=>router.push(`/sessions/${x.id}`)}>
                    {attendanceSummary(x.id)==="Not marked" ? "Mark Attendance" : "Open / Edit"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab==="payments" && canSeeFinance && (
          <>
            <section className={styles.financeStats}>
              <div className={styles.stat}><span>Total Billed</span><strong>{money(revenue.billed)}</strong></div>
              <div className={styles.stat}><span>Collected</span><strong>{money(revenue.paid)}</strong></div>
              <div className={styles.stat}><span>Pending</span><strong>{money(revenue.pending)}</strong></div>
              <div className={styles.stat}><span>Students with Plan</span><strong>{finance.length} / {roster.length}</strong></div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><h2>Student Payments</h2><span>USD only</span></div></div>
              <div className={styles.tableWrap}>
                <table className={styles.financeTable}>
                  <thead><tr><th>Student</th><th>Plan</th><th>Total Fee</th><th>Paid</th><th>Pending</th><th>Next Due</th><th>Status</th>{canManageFinance&&<th>Actions</th>}</tr></thead>
                  <tbody>
                    {roster.map(student=>{
                      const f=financeByStudent.get(student.id);
                      if (!f) return (
                        <tr key={student.id}>
                          <td>{student.student_name}</td><td colSpan={6}><span className={styles.muted}>Payment plan not configured</span></td>
                          {canManageFinance&&<td><button className={styles.smallButton} onClick={()=>openFinance(student)}>Set Plan</button></td>}
                        </tr>
                      );

                      return (
                        <tr key={student.id}>
                          <td>{student.student_name}<small>{student.grade||"—"}</small></td>
                          <td>{f.payment_plan}</td><td>{money(f.total_fee_usd)}</td><td>{money(f.total_paid_usd)}</td><td>{money(f.pending_usd)}</td>
                          <td><strong>{f.next_due_label}</strong><small>{f.next_due_date||"Date pending"}</small></td>
                          <td><span className={`${styles.paymentBadge} ${f.payment_status==="Paid"?styles.paymentPaid:f.payment_status==="Overdue"?styles.paymentOverdue:f.payment_status==="Due Soon"?styles.paymentDue:""}`}>{f.payment_status}</span></td>
                          {canManageFinance&&<td><div className={styles.rowActions}><button onClick={()=>openFinance(student)}>Edit Plan</button>{f.pending_usd>0&&<button onClick={()=>openPayment(f)}>Record Payment</button>}</div></td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.grid2} style={{marginTop:16}}>
              <div className={styles.panel}>
                <div className={styles.panelHeader}><div><h2>Payment Modes</h2><span>Collected by mode</span></div></div>
                <div className={styles.infoList}>{modes.length===0?<div className={styles.empty}>No payments recorded.</div>:modes.map(([mode,amount])=><div key={mode}><span>{mode}</span><strong>{money(amount)}</strong></div>)}</div>
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHeader}><div><h2>Recent Payments</h2><span>Latest transactions</span></div></div>
                <div className={styles.compactList}>
                  {txns.filter(t=>finance.some(f=>f.finance_id===t.finance_id)).slice(0,8).map(t=>{
                    const f=finance.find(x=>x.finance_id===t.finance_id);
                    return <div className={styles.compactRow} key={t.id}><div><strong>{f?.student_name||"Student"}</strong><small>{t.payment_date} · {t.payment_mode}</small></div><strong>{money(t.amount_usd)}</strong></div>
                  })}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {sessionOpen && (
        <div className={styles.modalBackdrop}><div className={styles.modal}>
          <div className={styles.modalHeader}><div><h2>Add Class Session</h2><p>Create the class and planned topic.</p></div><button className={styles.close} onClick={()=>setSessionOpen(false)}>×</button></div>
          <form className={styles.form} onSubmit={saveSession}>
            <div className={styles.formGrid}>
              <label><span>Session Number</span><input type="number" min="1" value={sessionForm.session_number} onChange={e=>setSessionForm({...sessionForm,session_number:e.target.value})}/></label>
              <label><span>Session Date *</span><input type="date" value={sessionForm.session_date} onChange={e=>setSessionForm({...sessionForm,session_date:e.target.value})}/></label>
              <label className={styles.full}><span>Topic Planned</span><input value={sessionForm.topic_planned} onChange={e=>setSessionForm({...sessionForm,topic_planned:e.target.value})}/></label>
              <label><span>Status</span><select value={sessionForm.status} onChange={e=>setSessionForm({...sessionForm,status:e.target.value})}><option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>Rescheduled</option></select></label>
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setSessionOpen(false)}>Cancel</button><button className={styles.primary}>Add Session</button></div>
          </form>
        </div></div>
      )}

      {editOpen && (
        <div className={styles.modalBackdrop}><div className={styles.modal}>
          <div className={styles.modalHeader}><div><h2>Edit Batch</h2><p>Replace trainer, extend batch, update Zoom.</p></div><button className={styles.close} onClick={()=>setEditOpen(false)}>×</button></div>
          <form className={styles.form} onSubmit={saveEdit}>
            <div className={styles.formGrid}>
              <label>
                <span>Trainer</span>
                <select value={edit.trainer_id} onChange={e=>chooseTrainer(e.target.value)}>
                  <option value="">Select trainer</option>
                  {trainers.map(x=><option key={x.id} value={x.id}>{x.trainer_name}</option>)}
                </select>
              </label>
              <label><span>Batch End Date</span><input type="date" value={edit.end_date} onChange={e=>setEdit({...edit,end_date:e.target.value})}/></label>
              <label><span>Planned Sessions</span><input type="number" min="1" value={edit.planned_sessions} onChange={e=>setEdit({...edit,planned_sessions:e.target.value})}/></label>
              <label className={styles.full}><span>Recurring Zoom Link</span><input type="url" value={edit.recurring_zoom_url} onChange={e=>setEdit({...edit,recurring_zoom_url:e.target.value})}/></label>
              <label><span>Status</span><select value={edit.status} onChange={e=>setEdit({...edit,status:e.target.value})}><option>Active</option><option>Upcoming</option><option>Paused</option><option>Completed</option></select></label>
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setEditOpen(false)}>Cancel</button><button className={styles.primary}>Save Batch</button></div>
          </form>
        </div></div>
      )}

      {financeOpen && (
        <div className={styles.modalBackdrop}><div className={styles.modal}>
          <div className={styles.modalHeader}><div><h2>Payment Plan</h2><p>USD only.</p></div><button className={styles.close} onClick={()=>setFinanceOpen(false)}>×</button></div>
          <form className={styles.form} onSubmit={saveFinance}>
            <div className={styles.formGrid}>
              <label><span>Total Course Fee (USD)</span><input type="number" min="0" step="0.01" value={financeForm.total_fee_usd} onChange={e=>setFinanceForm({...financeForm,total_fee_usd:e.target.value})}/></label>
              <label><span>Installment Amount (USD)</span><input type="number" min="0" step="0.01" value={financeForm.installment_amount_usd} onChange={e=>setFinanceForm({...financeForm,installment_amount_usd:e.target.value})}/></label>
              <label><span>Payment Plan</span><select value={financeForm.payment_plan} onChange={e=>setFinanceForm({...financeForm,payment_plan:e.target.value})}>{PAYMENT_PLANS.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span>Plan Start Date</span><input type="date" value={financeForm.plan_start_date} onChange={e=>setFinanceForm({...financeForm,plan_start_date:e.target.value})}/></label>
              {financeForm.payment_plan==="Custom"&&<label><span>Next Custom Due Date</span><input type="date" value={financeForm.custom_next_due_date} onChange={e=>setFinanceForm({...financeForm,custom_next_due_date:e.target.value})}/></label>}
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setFinanceOpen(false)}>Cancel</button><button className={styles.primary}>Save Plan</button></div>
          </form>
        </div></div>
      )}

      {paymentOpen && (
        <div className={styles.modalBackdrop}><div className={styles.modal}>
          <div className={styles.modalHeader}><div><h2>Record Payment</h2><p>{paymentForm.student_name}</p></div><button className={styles.close} onClick={()=>setPaymentOpen(false)}>×</button></div>
          <form className={styles.form} onSubmit={savePayment}>
            <div className={styles.formGrid}>
              <label><span>Amount (USD)</span><input type="number" min="0.01" step="0.01" value={paymentForm.amount_usd} onChange={e=>setPaymentForm({...paymentForm,amount_usd:e.target.value})}/></label>
              <label><span>Payment Date</span><input type="date" value={paymentForm.payment_date} onChange={e=>setPaymentForm({...paymentForm,payment_date:e.target.value})}/></label>
              <label><span>Payment Mode</span><select value={paymentForm.payment_mode} onChange={e=>setPaymentForm({...paymentForm,payment_mode:e.target.value})}>{PAYMENT_MODES.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span>Reference / Transaction ID</span><input value={paymentForm.reference} onChange={e=>setPaymentForm({...paymentForm,reference:e.target.value})}/></label>
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setPaymentOpen(false)}>Cancel</button><button className={styles.primary}>Record Payment</button></div>
          </form>
        </div></div>
      )}
    </div>
  );
}
