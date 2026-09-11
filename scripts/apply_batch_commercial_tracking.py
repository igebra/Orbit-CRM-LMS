from pathlib import Path
import re

batch_path = Path("app/batches/[id]/page.tsx")
payments_path = Path("app/payments/page.tsx")
css_path = Path("app/lms.module.css")
payments_css_path = Path("app/payments/payments.module.css")

for path in (batch_path, payments_path, css_path, payments_css_path):
    if not path.exists():
        raise SystemExit(f"Could not find {path}. Run from the Orbit repository root.")

batch = batch_path.read_text(encoding="utf-8")
payments = payments_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")
payments_css = payments_css_path.read_text(encoding="utf-8")

old = '''type Finance = {
  finance_id:string; student_id:string; student_name:string; grade:string|null;
  total_fee_usd:number; payment_plan:string; installment_amount_usd:number; plan_start_date:string;
  custom_next_due_date:string|null; total_paid_usd:number; pending_usd:number;
  next_due_date:string|null; next_due_label:string; payment_status:string;
};'''
new = '''type Finance = {
  finance_id:string; id?:string; student_id:string; student_name:string; grade:string|null;
  standard_fee_usd:number|null; total_fee_usd:number; payment_plan:string;
  installment_amount_usd:number; plan_start_date:string;
  custom_next_due_date:string|null; discount_reason:string|null; commercial_notes:string|null;
  total_paid_usd:number; pending_usd:number;
  next_due_date:string|null; next_due_label:string; payment_status:string;
};'''
if old in batch:
    batch = batch.replace(old, new, 1)

money_block = '''function money(n:number|undefined|null) {
  return `$${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
}
'''
helpers = money_block + '''
function defaultStandardFee(course:string) {
  if (course.startsWith("AiEdge ") || course.startsWith("Coding4AI ")) return "499";
  return "";
}

function discountAmount(standard:number|string|null|undefined, agreed:number|string|null|undefined) {
  return Math.max(Number(standard||0)-Number(agreed||0),0);
}

function discountPercent(standard:number|string|null|undefined, agreed:number|string|null|undefined) {
  const list = Number(standard||0);
  if (!list) return 0;
  return (discountAmount(standard,agreed)/list)*100;
}
'''
if "function defaultStandardFee(" not in batch:
    if money_block not in batch:
        raise SystemExit("Could not locate money helper.")
    batch = batch.replace(money_block, helpers, 1)

state_anchor = '''  const [financeOpen,setFinanceOpen] = useState(false);
  const [paymentOpen,setPaymentOpen] = useState(false);
'''
state_new = '''  const [financeOpen,setFinanceOpen] = useState(false);
  const [paymentOpen,setPaymentOpen] = useState(false);
  const [enrollmentOpen,setEnrollmentOpen] = useState(false);
  const [savingEnrollment,setSavingEnrollment] = useState(false);
'''
if "savingEnrollment" not in batch:
    if state_anchor not in batch:
        raise SystemExit("Could not locate modal state.")
    batch = batch.replace(state_anchor, state_new, 1)

old_forms = '''  const [financeForm,setFinanceForm] = useState({student_id:"",total_fee_usd:"",payment_plan:"Monthly",installment_amount_usd:"",plan_start_date:new Date().toISOString().slice(0,10),custom_next_due_date:""});
  const [paymentForm,setPaymentForm] = useState({finance_id:"",student_name:"",amount_usd:"",payment_date:new Date().toISOString().slice(0,10),payment_mode:"Zelle",reference:""});'''
new_forms = '''  const [financeForm,setFinanceForm] = useState({
    student_id:"",standard_fee_usd:"",total_fee_usd:"",payment_plan:"Monthly",
    installment_amount_usd:"",plan_start_date:new Date().toISOString().slice(0,10),
    custom_next_due_date:"",discount_reason:"",commercial_notes:""
  });
  const [enrollmentForm,setEnrollmentForm] = useState({
    student_id:"",student_name:"",standard_fee_usd:"",total_fee_usd:"",
    payment_plan:"Monthly",installment_amount_usd:"",
    plan_start_date:new Date().toISOString().slice(0,10),
    custom_next_due_date:"",discount_reason:"",commercial_notes:""
  });
  const [paymentForm,setPaymentForm] = useState({finance_id:"",student_name:"",amount_usd:"",payment_date:new Date().toISOString().slice(0,10),payment_mode:"Zelle",reference:""});'''
if "setEnrollmentForm" not in batch:
    if old_forms not in batch:
        raise SystemExit("Could not locate finance/payment form state.")
    batch = batch.replace(old_forms, new_forms, 1)

pattern = re.compile(r'''  async function loadFinance\(\) \{.*?\n  \}\n\n  const roster''', re.S)
replacement = '''  async function loadFinance() {
    const [f,t,m] = await Promise.all([
      supabase.from("batch_student_payment_summary").select("*").eq("batch_id",batchId).order("student_name"),
      supabase.from("payment_transactions").select("id,finance_id,amount_usd,payment_date,payment_mode,reference").order("payment_date",{ascending:false}),
      supabase.from("batch_student_finance")
        .select("id,student_id,standard_fee_usd,installment_amount_usd,discount_reason,commercial_notes,plan_start_date,custom_next_due_date")
        .eq("batch_id",batchId),
    ]);

    if (!f.error) {
      const meta = new Map<string,any>();
      (m.data||[]).forEach((row:any)=>meta.set(row.student_id,row));
      const merged = (f.data||[]).map((row:any)=>{
        const extra = meta.get(row.student_id) || {};
        return {
          ...row,
          finance_id: row.finance_id || row.id || extra.id,
          standard_fee_usd: extra.standard_fee_usd ?? row.total_fee_usd,
          installment_amount_usd: extra.installment_amount_usd ?? row.installment_amount_usd,
          discount_reason: extra.discount_reason ?? null,
          commercial_notes: extra.commercial_notes ?? null,
          plan_start_date: extra.plan_start_date ?? row.plan_start_date,
          custom_next_due_date: extra.custom_next_due_date ?? row.custom_next_due_date,
        };
      });
      setFinance(merged as Finance[]);
    }
    if (!t.error) setTxns((t.data||[]) as Txn[]);
  }

  const roster'''
batch, count = pattern.subn(replacement, batch, count=1)
if count == 0 and "standard_fee_usd: extra.standard_fee_usd" not in batch:
    raise SystemExit("Could not patch loadFinance.")

old_revenue = '''  const revenue = useMemo(() => finance.reduce((a,x)=>({
    billed:a.billed+Number(x.total_fee_usd||0),
    paid:a.paid+Number(x.total_paid_usd||0),
    pending:a.pending+Number(x.pending_usd||0),
  }),{billed:0,paid:0,pending:0}),[finance]);'''
new_revenue = '''  const revenue = useMemo(() => finance.reduce((a,x)=>({
    standard:a.standard+Number(x.standard_fee_usd ?? x.total_fee_usd ?? 0),
    discount:a.discount+discountAmount(x.standard_fee_usd ?? x.total_fee_usd,x.total_fee_usd),
    billed:a.billed+Number(x.total_fee_usd||0),
    paid:a.paid+Number(x.total_paid_usd||0),
    pending:a.pending+Number(x.pending_usd||0),
  }),{standard:0,discount:0,billed:0,paid:0,pending:0}),[finance]);'''
if old_revenue in batch:
    batch = batch.replace(old_revenue, new_revenue, 1)

pattern = re.compile(r'''  async function addStudent\(\) \{.*?\n  \}\n\n  async function removeStudent''', re.S)
replacement = '''  function addStudent() {
    if (!selectedStudent) return;
    const student = students.find(x=>x.id===selectedStudent);
    if (!student) return;

    const standard = defaultStandardFee(batch?.course_name||"");
    setEnrollmentForm({
      student_id:student.id,
      student_name:student.student_name,
      standard_fee_usd:standard,
      total_fee_usd:standard,
      payment_plan:"Monthly",
      installment_amount_usd:standard,
      plan_start_date:new Date().toISOString().slice(0,10),
      custom_next_due_date:"",
      discount_reason:"",
      commercial_notes:"",
    });
    setEnrollmentOpen(true);
  }

  async function saveEnrollment(e:FormEvent) {
    e.preventDefault();

    const standard = Number(enrollmentForm.standard_fee_usd);
    const agreed = Number(enrollmentForm.total_fee_usd);
    const installment = Number(enrollmentForm.installment_amount_usd);
    const discount = discountAmount(standard,agreed);

    if (Number.isNaN(standard) || standard < 0) return setMessage("Enter a valid standard course fee.");
    if (Number.isNaN(agreed) || agreed < 0) return setMessage("Enter a valid agreed / closed fee.");
    if (Number.isNaN(installment) || installment < 0) return setMessage("Enter a valid installment amount.");
    if (!enrollmentForm.plan_start_date) return setMessage("Payment plan start date is required.");
    if (discount > 0 && !enrollmentForm.discount_reason.trim()) {
      return setMessage("Please record the discount reason before adding the student.");
    }

    setSavingEnrollment(true);
    setMessage("");

    const {error} = await supabase.rpc("add_student_to_batch_with_finance",{
      p_batch_id:batchId,
      p_student_id:enrollmentForm.student_id,
      p_standard_fee_usd:standard,
      p_agreed_fee_usd:agreed,
      p_payment_plan:enrollmentForm.payment_plan,
      p_installment_amount_usd:installment,
      p_plan_start_date:enrollmentForm.plan_start_date,
      p_custom_next_due_date:enrollmentForm.payment_plan==="Custom"?(enrollmentForm.custom_next_due_date||null):null,
      p_discount_reason:enrollmentForm.discount_reason.trim()||null,
      p_commercial_notes:enrollmentForm.commercial_notes.trim()||null,
    });

    setSavingEnrollment(false);
    if (error) return setMessage(error.message);

    setEnrollmentOpen(false);
    setSelectedStudent("");
    setMessage(`${enrollmentForm.student_name} added with payment plan.`);
    await load();
  }

  async function removeStudent'''
batch, count = pattern.subn(replacement, batch, count=1)
if count == 0 and "add_student_to_batch_with_finance" not in batch:
    raise SystemExit("Could not patch addStudent.")

pattern = re.compile(r'''  function openFinance\(student:Student\) \{.*?\n  \}\n\n  async function saveFinance\(e:FormEvent\) \{.*?\n  \}\n\n  function openPayment''', re.S)
replacement = '''  function openFinance(student:Student) {
    const f=financeByStudent.get(student.id);
    const standardDefault = defaultStandardFee(batch?.course_name||"");
    setFinanceForm(f?{
      student_id:student.id,
      standard_fee_usd:String(f.standard_fee_usd ?? f.total_fee_usd ?? ""),
      total_fee_usd:String(f.total_fee_usd),
      payment_plan:f.payment_plan,
      installment_amount_usd:String(f.installment_amount_usd),
      plan_start_date:f.plan_start_date,
      custom_next_due_date:f.custom_next_due_date||"",
      discount_reason:f.discount_reason||"",
      commercial_notes:f.commercial_notes||""
    }:{
      student_id:student.id,
      standard_fee_usd:standardDefault,
      total_fee_usd:standardDefault,
      payment_plan:"Monthly",
      installment_amount_usd:standardDefault,
      plan_start_date:new Date().toISOString().slice(0,10),
      custom_next_due_date:"",
      discount_reason:"",
      commercial_notes:""
    });
    setFinanceOpen(true);
  }

  async function saveFinance(e:FormEvent) {
    e.preventDefault();

    const standard = Number(financeForm.standard_fee_usd);
    const agreed = Number(financeForm.total_fee_usd);
    const installment = Number(financeForm.installment_amount_usd);
    const discount = discountAmount(standard,agreed);

    if (discount > 0 && !financeForm.discount_reason.trim()) {
      return setMessage("Please record the discount reason.");
    }

    const {error} = await supabase.from("batch_student_finance").upsert({
      batch_id:batchId,
      student_id:financeForm.student_id,
      standard_fee_usd:standard,
      total_fee_usd:agreed,
      payment_plan:financeForm.payment_plan,
      installment_amount_usd:installment,
      plan_start_date:financeForm.plan_start_date,
      custom_next_due_date:financeForm.payment_plan==="Custom"?(financeForm.custom_next_due_date||null):null,
      discount_reason:financeForm.discount_reason.trim()||null,
      commercial_notes:financeForm.commercial_notes.trim()||null,
      created_by:userId||null,
      updated_by:userId||null,
    },{onConflict:"batch_id,student_id"});

    if (error) return setMessage(error.message);
    setFinanceOpen(false);
    await loadFinance();
  }

  function openPayment'''
batch, count = pattern.subn(replacement, batch, count=1)
if count == 0 and "standard_fee_usd:String(f.standard_fee_usd" not in batch:
    raise SystemExit("Could not patch finance editor.")

old = '''                    <button className={styles.rosterStudentButton} onClick={()=>router.push(`/students/${x.id}`)}><strong>{x.student_name}</strong><small>{x.grade||"—"} · {x.email||x.phone||"No contact"}</small></button>
                    {canAdmin && <button className={styles.danger} onClick={()=>removeStudent(x.id)}>Remove</button>}'''
new = '''                    <button className={styles.rosterStudentButton} onClick={()=>router.push(`/students/${x.id}`)}>
                      <strong>{x.student_name}</strong>
                      <small>{x.grade||"—"} · {x.email||x.phone||"No contact"}</small>
                      {canSeeFinance && (() => {
                        const f=financeByStudent.get(x.id);
                        if (!f) return <span className={styles.commercialMissing}>Payment plan not configured</span>;
                        const discount=discountAmount(f.standard_fee_usd ?? f.total_fee_usd,f.total_fee_usd);
                        return (
                          <span className={styles.rosterCommercial}>
                            <b>Agreed {money(f.total_fee_usd)}</b>
                            <em>{f.payment_plan}</em>
                            <em>Installment {money(f.installment_amount_usd)}</em>
                            <em>Next: {f.next_due_label}{f.next_due_date?` · ${f.next_due_date}`:""}</em>
                            {discount>0&&<i>Discount {money(discount)}</i>}
                          </span>
                        );
                      })()}
                    </button>
                    {canAdmin && <button className={styles.danger} onClick={()=>removeStudent(x.id)}>Remove</button>}'''
if old in batch:
    batch = batch.replace(old, new, 1)
elif "rosterCommercial" not in batch:
    raise SystemExit("Could not patch roster display.")

old = '''            <section className={styles.financeStats}>
              <div className={styles.stat}><span>Total Billed</span><strong>{money(revenue.billed)}</strong></div>
              <div className={styles.stat}><span>Collected</span><strong>{money(revenue.paid)}</strong></div>
              <div className={styles.stat}><span>Pending</span><strong>{money(revenue.pending)}</strong></div>
              <div className={styles.stat}><span>Students with Plan</span><strong>{finance.length} / {roster.length}</strong></div>
            </section>'''
new = '''            <section className={styles.financeStats}>
              <div className={styles.stat}><span>Standard Value</span><strong>{money(revenue.standard)}</strong></div>
              <div className={styles.stat}><span>Discounts</span><strong>{money(revenue.discount)}</strong></div>
              <div className={styles.stat}><span>Agreed Revenue</span><strong>{money(revenue.billed)}</strong></div>
              <div className={styles.stat}><span>Collected</span><strong>{money(revenue.paid)}</strong></div>
              <div className={styles.stat}><span>Pending</span><strong>{money(revenue.pending)}</strong></div>
              <div className={styles.stat}><span>Students with Plan</span><strong>{finance.length} / {roster.length}</strong></div>
            </section>'''
if old in batch:
    batch = batch.replace(old, new, 1)

old = '''                  <thead><tr><th>Student</th><th>Plan</th><th>Total Fee</th><th>Paid</th><th>Pending</th><th>Next Due</th><th>Status</th>{canManageFinance&&<th>Actions</th>}</tr></thead>'''
new = '''                  <thead><tr><th>Student</th><th>Standard Fee</th><th>Discount</th><th>Agreed Fee</th><th>Plan</th><th>Installment</th><th>Paid</th><th>Pending</th><th>Next Due</th><th>Status</th>{canManageFinance&&<th>Actions</th>}</tr></thead>'''
if old in batch:
    batch = batch.replace(old, new, 1)

old = '''                          <td>{student.student_name}</td><td colSpan={6}><span className={styles.muted}>Payment plan not configured</span></td>
                          {canManageFinance&&<td><button className={styles.smallButton} onClick={()=>openFinance(student)}>Set Plan</button></td>}'''
new = '''                          <td>{student.student_name}</td><td colSpan={9}><span className={styles.muted}>Payment plan not configured</span></td>
                          {canManageFinance&&<td><button className={styles.smallButton} onClick={()=>openFinance(student)}>Set Plan</button></td>}'''
if old in batch:
    batch = batch.replace(old, new, 1)

old = '''                          <td>{student.student_name}<small>{student.grade||"—"}</small></td>
                          <td>{f.payment_plan}</td><td>{money(f.total_fee_usd)}</td><td>{money(f.total_paid_usd)}</td><td>{money(f.pending_usd)}</td>
                          <td><strong>{f.next_due_label}</strong><small>{f.next_due_date||"Date pending"}</small></td>'''
new = '''                          <td>{student.student_name}<small>{student.grade||"—"}</small></td>
                          <td>{money(f.standard_fee_usd ?? f.total_fee_usd)}</td>
                          <td>
                            <strong>{money(discountAmount(f.standard_fee_usd ?? f.total_fee_usd,f.total_fee_usd))}</strong>
                            {discountAmount(f.standard_fee_usd ?? f.total_fee_usd,f.total_fee_usd)>0&&<small>{discountPercent(f.standard_fee_usd ?? f.total_fee_usd,f.total_fee_usd).toFixed(1)}% · {f.discount_reason||"Reason not recorded"}</small>}
                          </td>
                          <td><strong>{money(f.total_fee_usd)}</strong></td>
                          <td>{f.payment_plan}</td>
                          <td>{money(f.installment_amount_usd)}</td>
                          <td>{money(f.total_paid_usd)}</td>
                          <td><strong>{money(f.pending_usd)}</strong></td>
                          <td><strong>{f.next_due_label}</strong><small>{f.next_due_date||"Date / class milestone pending"}</small></td>'''
if old in batch:
    batch = batch.replace(old, new, 1)
elif "Date / class milestone pending" not in batch:
    raise SystemExit("Could not patch finance row.")

enrollment_modal = r'''
      {enrollmentOpen && (
        <div className={styles.modalBackdrop}><div className={`${styles.modal} ${styles.commercialModal}`}>
          <div className={styles.modalHeader}>
            <div><h2>Add Student & Payment Plan</h2><p>{enrollmentForm.student_name} · {batch.course_name}</p></div>
            <button className={styles.close} onClick={()=>setEnrollmentOpen(false)}>×</button>
          </div>
          <form className={styles.form} onSubmit={saveEnrollment}>
            <div className={styles.commercialIntro}>
              <strong>Commercial Agreement</strong>
              <span>Record the actual deal at the same time the student is placed into the batch.</span>
            </div>
            <div className={styles.formGrid}>
              <label><span>Standard Course Fee (USD) *</span><input type="number" min="0" step="0.01" value={enrollmentForm.standard_fee_usd} onChange={e=>setEnrollmentForm({...enrollmentForm,standard_fee_usd:e.target.value})}/></label>
              <label><span>Agreed / Closed Fee (USD) *</span><input type="number" min="0" step="0.01" value={enrollmentForm.total_fee_usd} onChange={e=>setEnrollmentForm({...enrollmentForm,total_fee_usd:e.target.value})}/></label>
              <div className={`${styles.commercialMath} ${styles.full}`}>
                <div><span>Standard</span><strong>{money(Number(enrollmentForm.standard_fee_usd||0))}</strong></div>
                <div><span>Discount</span><strong>{money(discountAmount(enrollmentForm.standard_fee_usd,enrollmentForm.total_fee_usd))}</strong></div>
                <div><span>Discount %</span><strong>{discountPercent(enrollmentForm.standard_fee_usd,enrollmentForm.total_fee_usd).toFixed(1)}%</strong></div>
                <div><span>Student Pays</span><strong>{money(Number(enrollmentForm.total_fee_usd||0))}</strong></div>
              </div>
              {discountAmount(enrollmentForm.standard_fee_usd,enrollmentForm.total_fee_usd)>0&&(
                <label className={styles.full}><span>Discount Reason *</span><input value={enrollmentForm.discount_reason} onChange={e=>setEnrollmentForm({...enrollmentForm,discount_reason:e.target.value})} placeholder="Sibling discount / Sales-approved offer"/></label>
              )}
              <label><span>Payment Plan *</span><select value={enrollmentForm.payment_plan} onChange={e=>setEnrollmentForm({...enrollmentForm,payment_plan:e.target.value})}>{PAYMENT_PLANS.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span>Installment Amount (USD) *</span><input type="number" min="0" step="0.01" value={enrollmentForm.installment_amount_usd} onChange={e=>setEnrollmentForm({...enrollmentForm,installment_amount_usd:e.target.value})}/></label>
              <label><span>Plan Start / First Due Date *</span><input type="date" value={enrollmentForm.plan_start_date} onChange={e=>setEnrollmentForm({...enrollmentForm,plan_start_date:e.target.value})}/></label>
              {enrollmentForm.payment_plan==="Custom"&&(
                <label><span>Next Custom Due Date</span><input type="date" value={enrollmentForm.custom_next_due_date} onChange={e=>setEnrollmentForm({...enrollmentForm,custom_next_due_date:e.target.value})}/></label>
              )}
              <label className={styles.full}><span>Commercial Notes</span><input value={enrollmentForm.commercial_notes} onChange={e=>setEnrollmentForm({...enrollmentForm,commercial_notes:e.target.value})} placeholder="Optional sales / payment note"/></label>
            </div>
            <div className={styles.commercialHint}><strong>Important:</strong> The agreed fee becomes the amount receivable. Collection reports count money only when a payment transaction is recorded.</div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondary} onClick={()=>setEnrollmentOpen(false)}>Cancel</button>
              <button className={styles.primary} disabled={savingEnrollment}>{savingEnrollment?"Adding...":"Add Student & Save Plan"}</button>
            </div>
          </form>
        </div></div>
      )}

'''
if "{enrollmentOpen && (" not in batch:
    anchor = "      {financeOpen && ("
    if anchor not in batch:
        raise SystemExit("Could not locate finance modal.")
    batch = batch.replace(anchor, enrollment_modal + anchor, 1)

pattern = re.compile(r'''      \{financeOpen && \(.*?      \)\}\n\n      \{paymentOpen && \(''', re.S)
finance_modal = r'''      {financeOpen && (
        <div className={styles.modalBackdrop}><div className={`${styles.modal} ${styles.commercialModal}`}>
          <div className={styles.modalHeader}><div><h2>Commercial & Payment Plan</h2><p>USD only · edit the student's agreed terms.</p></div><button className={styles.close} onClick={()=>setFinanceOpen(false)}>×</button></div>
          <form className={styles.form} onSubmit={saveFinance}>
            <div className={styles.formGrid}>
              <label><span>Standard Course Fee (USD)</span><input type="number" min="0" step="0.01" value={financeForm.standard_fee_usd} onChange={e=>setFinanceForm({...financeForm,standard_fee_usd:e.target.value})}/></label>
              <label><span>Agreed / Closed Fee (USD)</span><input type="number" min="0" step="0.01" value={financeForm.total_fee_usd} onChange={e=>setFinanceForm({...financeForm,total_fee_usd:e.target.value})}/></label>
              <div className={`${styles.commercialMath} ${styles.full}`}>
                <div><span>Discount</span><strong>{money(discountAmount(financeForm.standard_fee_usd,financeForm.total_fee_usd))}</strong></div>
                <div><span>Discount %</span><strong>{discountPercent(financeForm.standard_fee_usd,financeForm.total_fee_usd).toFixed(1)}%</strong></div>
                <div><span>Student Pays</span><strong>{money(Number(financeForm.total_fee_usd||0))}</strong></div>
              </div>
              {discountAmount(financeForm.standard_fee_usd,financeForm.total_fee_usd)>0&&<label className={styles.full}><span>Discount Reason *</span><input value={financeForm.discount_reason} onChange={e=>setFinanceForm({...financeForm,discount_reason:e.target.value})}/></label>}
              <label><span>Payment Plan</span><select value={financeForm.payment_plan} onChange={e=>setFinanceForm({...financeForm,payment_plan:e.target.value})}>{PAYMENT_PLANS.map(x=><option key={x}>{x}</option>)}</select></label>
              <label><span>Installment Amount (USD)</span><input type="number" min="0" step="0.01" value={financeForm.installment_amount_usd} onChange={e=>setFinanceForm({...financeForm,installment_amount_usd:e.target.value})}/></label>
              <label><span>Plan Start / First Due Date</span><input type="date" value={financeForm.plan_start_date} onChange={e=>setFinanceForm({...financeForm,plan_start_date:e.target.value})}/></label>
              {financeForm.payment_plan==="Custom"&&<label><span>Next Custom Due Date</span><input type="date" value={financeForm.custom_next_due_date} onChange={e=>setFinanceForm({...financeForm,custom_next_due_date:e.target.value})}/></label>}
              <label className={styles.full}><span>Commercial Notes</span><input value={financeForm.commercial_notes} onChange={e=>setFinanceForm({...financeForm,commercial_notes:e.target.value})}/></label>
            </div>
            <div className={styles.modalFooter}><button type="button" className={styles.secondary} onClick={()=>setFinanceOpen(false)}>Cancel</button><button className={styles.primary}>Save Commercial Plan</button></div>
          </form>
        </div></div>
      )}

      {paymentOpen && ('''
batch, count = pattern.subn(finance_modal, batch, count=1)
if count == 0 and "Save Commercial Plan" not in batch:
    raise SystemExit("Could not replace finance modal.")

batch_path.write_text(batch, encoding="utf-8")

outstanding_block = '''type Outstanding = {
  finance_id: string;
  student_id: string;
  student_name: string;
  batch_id: string;
  batch_name: string;
  course_name: string;
  payment_plan: string;
  total_fee_usd: number;
  total_paid_usd: number;
  pending_usd: number;
  next_due_date: string | null;
  next_due_label: string;
  payment_status: string;
};
'''
finance_meta = outstanding_block + '''
type FinanceMeta = {
  id:string;
  standard_fee_usd:number|null;
  installment_amount_usd:number|null;
  discount_reason:string|null;
  commercial_notes:string|null;
};
'''
if "type FinanceMeta =" not in payments:
    if outstanding_block not in payments:
        raise SystemExit("Could not locate Outstanding type.")
    payments = payments.replace(outstanding_block, finance_meta, 1)

state_anchor = '''  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [search, setSearch] = useState("");'''
state_new = '''  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [financeMeta, setFinanceMeta] = useState<FinanceMeta[]>([]);
  const [search, setSearch] = useState("");'''
if "financeMeta, setFinanceMeta" not in payments:
    payments = payments.replace(state_anchor, state_new, 1)

load_anchor = '''    setTransactions((transactionResult.data || []) as Transaction[]);
    setOutstanding((outstandingResult.data || []) as Outstanding[]);
    setLoading(false);
  }'''
load_new = '''    setTransactions((transactionResult.data || []) as Transaction[]);
    setOutstanding((outstandingResult.data || []) as Outstanding[]);

    const metaResult = await supabase
      .from("batch_student_finance")
      .select("id,standard_fee_usd,installment_amount_usd,discount_reason,commercial_notes");

    if (!metaResult.error) setFinanceMeta((metaResult.data || []) as FinanceMeta[]);
    else setFinanceMeta([]);

    setLoading(false);
  }'''
if load_anchor in payments:
    payments = payments.replace(load_anchor, load_new, 1)

plans_anchor = '''  const plans = useMemo(() => {
    const map = new Map<string, number>();

    outstanding.forEach((row) => {
      map.set(row.payment_plan, (map.get(row.payment_plan) || 0) + 1);
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [outstanding]);
'''
plans_new = plans_anchor + '''
  const financeMetaById = useMemo(() => {
    const map = new Map<string,FinanceMeta>();
    financeMeta.forEach((row)=>map.set(row.id,row));
    return map;
  },[financeMeta]);

'''
if "financeMetaById" not in payments:
    if plans_anchor not in payments:
        raise SystemExit("Could not locate plans memo.")
    payments = payments.replace(plans_anchor, plans_new, 1)

stats_anchor = '''        <section className={styles.stats}>'''
note = '''        {!isMarketing && (
          <div className={styles.commercialReportNote}>
            <strong>Collections vs agreed fees:</strong>
            Date-range reports count actual payment transactions received in that period.
            Agreed fees and discounts are tracked separately and are not counted as cash until a payment is recorded.
          </div>
        )}

'''
if "Collections vs agreed fees:" not in payments:
    payments = payments.replace(stats_anchor, note + stats_anchor, 1)

payments = payments.replace(
    '''              <h2>Current Outstanding</h2>
              <p>Pending fees and the next payment due</p>''',
    '''              <h2>Commercial Agreements & Outstanding</h2>
              <p>Standard fee, agreed deal, installments, collections and next payment due</p>''',
    1
)

old_header = '''                  <th>Student</th>
                  <th>Batch</th>
                  <th>Plan</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Next Due</th>
                  <th>Status</th>'''
new_header = '''                  <th>Student</th>
                  <th>Batch</th>
                  <th>Standard Fee</th>
                  <th>Discount</th>
                  <th>Agreed Fee</th>
                  <th>Plan</th>
                  <th>Installment</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Next Due</th>
                  <th>Status</th>'''
if old_header in payments:
    payments = payments.replace(old_header, new_header, 1)

target = '''                    <td colSpan={8} className={styles.empty}>
                      No payment plans configured.
                    </td>'''
replacement = '''                    <td colSpan={11} className={styles.empty}>
                      No payment plans configured.
                    </td>'''
if target in payments:
    payments = payments.replace(target, replacement, 1)

old_row = '''                      <td>{row.payment_plan}</td>
                      <td>{money(row.total_fee_usd)}</td>
                      <td>{money(row.total_paid_usd)}</td>
                      <td><strong>{money(row.pending_usd)}</strong></td>
                      <td>
                        <strong>{row.next_due_label}</strong>
                        <small>{row.next_due_date || "Date pending"}</small>
                      </td>'''
new_row = '''                      {(() => {
                        const meta=financeMetaById.get(row.finance_id);
                        const standard=Number(meta?.standard_fee_usd ?? row.total_fee_usd ?? 0);
                        const agreed=Number(row.total_fee_usd||0);
                        const discount=Math.max(standard-agreed,0);
                        return (
                          <>
                            <td>{money(standard)}</td>
                            <td>
                              <strong>{money(discount)}</strong>
                              {discount>0&&<small>{standard?((discount/standard)*100).toFixed(1):"0.0"}% · {meta?.discount_reason||"Reason not recorded"}</small>}
                            </td>
                            <td><strong>{money(agreed)}</strong></td>
                            <td>{row.payment_plan}</td>
                            <td>{money(meta?.installment_amount_usd||0)}</td>
                          </>
                        );
                      })()}
                      <td>{money(row.total_paid_usd)}</td>
                      <td><strong>{money(row.pending_usd)}</strong></td>
                      <td>
                        <strong>{row.next_due_label}</strong>
                        <small>{row.next_due_date || "Date / class milestone pending"}</small>
                      </td>'''
if old_row in payments:
    payments = payments.replace(old_row, new_row, 1)
elif "Date / class milestone pending" not in payments:
    raise SystemExit("Could not patch outstanding row.")

payments_path.write_text(payments, encoding="utf-8")

if "/* ORBIT COMMERCIAL ENROLLMENT TRACKING */" not in css:
    css += r'''

/* ORBIT COMMERCIAL ENROLLMENT TRACKING */
.commercialModal{width:min(820px,96vw)}
.commercialIntro{margin:14px 18px 0;padding:11px 13px;border:1px solid #d8e5e2;border-radius:10px;background:linear-gradient(145deg,#fbfdfc,#f3f9f7)}
.commercialIntro strong,.commercialIntro span{display:block}
.commercialIntro strong{color:#174f50;font-size:12px}
.commercialIntro span{margin-top:3px;color:#728381;font-size:10px}
.commercialMath{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:10px;border:1px solid #ead8c7;border-radius:10px;background:#fff8f1}
.commercialMath span,.commercialMath strong{display:block}
.commercialMath span{color:#86684f;font-size:9px;text-transform:uppercase;font-weight:800}
.commercialMath strong{margin-top:3px;color:#4c3a2b;font-size:13px}
.commercialHint{margin:0 18px 14px;padding:10px 12px;border-radius:9px;background:#eef7f5;color:#4f6967;font-size:10px;line-height:1.5}
.rosterCommercial{display:flex!important;flex-wrap:wrap;gap:5px;margin-top:7px!important;align-items:center}
.rosterCommercial b,.rosterCommercial em,.rosterCommercial i{display:inline-block;padding:4px 6px;border-radius:999px;font-style:normal;font-size:8.5px;line-height:1}
.rosterCommercial b{background:#e8f4f2;color:#185f60}
.rosterCommercial em{background:#f3f5f4;color:#647674}
.rosterCommercial i{background:#fff0e3;color:#a8642e}
.commercialMissing{display:block!important;margin-top:6px!important;color:#b46c32!important;font-size:9px!important;font-weight:700}
.financeStats{grid-template-columns:repeat(6,minmax(0,1fr))}
@media(max-width:1200px){.financeStats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.commercialMath{grid-template-columns:repeat(2,minmax(0,1fr))}.financeStats{grid-template-columns:1fr}}
'''

if "/* ORBIT COMMERCIAL REPORT CLARITY */" not in payments_css:
    payments_css += r'''

/* ORBIT COMMERCIAL REPORT CLARITY */
.commercialReportNote{margin-bottom:12px;padding:10px 12px;border:1px solid #cfe0dd;border-radius:10px;background:#f6fbfa;color:#607775;font-size:10.5px;line-height:1.5}
.commercialReportNote strong{color:#174f50}
'''

css_path.write_text(css, encoding="utf-8")
payments_css_path.write_text(payments_css, encoding="utf-8")

print("Orbit commercial tracking patch applied.")
