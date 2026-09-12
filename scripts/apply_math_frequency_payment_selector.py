from pathlib import Path
import re

batches_path = Path("app/batches/page.tsx")
detail_path = Path("app/batches/[id]/page.tsx")
payments_path = Path("app/payments/page.tsx")
payments_css_path = Path("app/payments/payments.module.css")

for p in (batches_path, detail_path, payments_path, payments_css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run from Orbit repository root.")

batches = batches_path.read_text(encoding="utf-8")
detail = detail_path.read_text(encoding="utf-8")
payments = payments_path.read_text(encoding="utf-8")
payments_css = payments_css_path.read_text(encoding="utf-8")

# ---------- BATCHES: classes per week ----------
pairs = [
(
'''  planned_sessions: number | null;
  default_duration_minutes: number | null;''',
'''  planned_sessions: number | null;
  classes_per_week: number | null;
  default_duration_minutes: number | null;'''
),
(
'''  planned_sessions: string;
  duration_minutes: string;''',
'''  planned_sessions: string;
  classes_per_week: string;
  duration_minutes: string;'''
),
(
'''  planned_sessions: "",
  duration_minutes: "90",''',
'''  planned_sessions: "",
  classes_per_week: "1",
  duration_minutes: "90",'''
),
(
'''      planned_sessions: form.planned_sessions ? Number(form.planned_sessions) : null,
      default_duration_minutes: Number(form.duration_minutes || 90),''',
'''      planned_sessions: form.planned_sessions ? Number(form.planned_sessions) : null,
      classes_per_week: Number(form.classes_per_week || 1),
      default_duration_minutes: Number(form.duration_minutes || 90),'''
),
(
'''                  <th>End Date</th>
                  <th>Students</th>''',
'''                  <th>End Date</th>
                  <th>Classes / Week</th>
                  <th>Students</th>'''
),
(
'''                    <td>{b.end_date || "—"}</td>
                    <td>{counts.get(b.id) || 0} / {b.max_students}</td>''',
'''                    <td>{b.end_date || "—"}</td>
                    <td>{b.classes_per_week || 1}×</td>
                    <td>{counts.get(b.id) || 0} / {b.max_students}</td>'''
),
]
for old,new in pairs:
    if old in batches:
        batches = batches.replace(old,new,1)

batches = batches.replace(
    '<tr><td colSpan={9} className={styles.empty}>Loading batches...</td></tr>',
    '<tr><td colSpan={10} className={styles.empty}>Loading batches...</td></tr>',
    1
)
batches = batches.replace(
    '<tr><td colSpan={9} className={styles.empty}>No batches found.</td></tr>',
    '<tr><td colSpan={10} className={styles.empty}>No batches found.</td></tr>',
    1
)

old_block = '''                <label>
                  <span>Planned Sessions</span>
                  <input type="number" min="1" value={form.planned_sessions} onChange={(e) => setForm({...form,planned_sessions:e.target.value})}/>
                </label>
                <label>
                  <span>Class Duration</span>'''
new_block = '''                <label>
                  <span>Planned Sessions</span>
                  <input type="number" min="1" value={form.planned_sessions} onChange={(e) => setForm({...form,planned_sessions:e.target.value})}/>
                </label>

                <label>
                  <span>Classes Per Week *</span>
                  <select value={form.classes_per_week} onChange={(e) => setForm({...form,classes_per_week:e.target.value})}>
                    <option value="1">1 class / week</option>
                    <option value="2">2 classes / week</option>
                    <option value="3">3 classes / week</option>
                    <option value="4">4 classes / week</option>
                    <option value="5">5 classes / week</option>
                    <option value="6">6 classes / week</option>
                    <option value="7">7 classes / week</option>
                  </select>
                  {form.course_name.startsWith("Math") && (
                    <small style={{marginTop:4,color:"#6B7280"}}>
                      Math batches can run multiple classes each week.
                    </small>
                  )}
                </label>

                <label>
                  <span>Class Duration</span>'''
if old_block in batches:
    batches = batches.replace(old_block,new_block,1)

if "Classes Per Week *" not in batches:
    raise SystemExit("Could not patch Batches classes-per-week UI.")

batches_path.write_text(batches, encoding="utf-8")

# ---------- BATCH DETAIL ----------
pairs = [
(
'''  planned_sessions:number|null; default_duration_minutes:number|null; status:string; max_students:number;''',
'''  planned_sessions:number|null; classes_per_week:number|null; default_duration_minutes:number|null; status:string; max_students:number;'''
),
(
'''  const [edit,setEdit] = useState({trainer_id:"",trainer_name:"",end_date:"",recurring_zoom_url:"",planned_sessions:"",duration_minutes:"90",status:"Active"});''',
'''  const [edit,setEdit] = useState({trainer_id:"",trainer_name:"",end_date:"",recurring_zoom_url:"",planned_sessions:"",classes_per_week:"1",duration_minutes:"90",status:"Active"});'''
),
(
'''      planned_sessions:batch.planned_sessions?String(batch.planned_sessions):"",
      duration_minutes:String(batch.default_duration_minutes||90),''',
'''      planned_sessions:batch.planned_sessions?String(batch.planned_sessions):"",
      classes_per_week:String(batch.classes_per_week||1),
      duration_minutes:String(batch.default_duration_minutes||90),'''
),
(
'''      planned_sessions:edit.planned_sessions?Number(edit.planned_sessions):null,
      default_duration_minutes:Number(edit.duration_minutes||90),''',
'''      planned_sessions:edit.planned_sessions?Number(edit.planned_sessions):null,
      classes_per_week:Number(edit.classes_per_week||1),
      default_duration_minutes:Number(edit.duration_minutes||90),'''
),
(
'''              {batch.end_date && <span>Ends: {batch.end_date}</span>}''',
'''              {batch.end_date && <span>Ends: {batch.end_date}</span>}
              <span>{batch.classes_per_week||1} class{(batch.classes_per_week||1)===1?"":"es"} / week</span>'''
),
(
'''                <div><span>Planned Sessions</span><strong>{batch.planned_sessions||"—"}</strong></div>
                <div><span>Status</span><strong>{batch.status}</strong></div>''',
'''                <div><span>Planned Sessions</span><strong>{batch.planned_sessions||"—"}</strong></div>
                <div><span>Classes / Week</span><strong>{batch.classes_per_week||1}</strong></div>
                <div><span>Status</span><strong>{batch.status}</strong></div>'''
),
]
for old,new in pairs:
    if old in detail:
        detail = detail.replace(old,new,1)

old_edit = '''              <label><span>Planned Sessions</span><input type="number" min="1" value={edit.planned_sessions} onChange={e=>setEdit({...edit,planned_sessions:e.target.value})}/></label>
              <label><span>Class Duration</span><select value={edit.duration_minutes} onChange={e=>setEdit({...edit,duration_minutes:e.target.value})}><option value="60">60 Minutes</option><option value="90">90 Minutes</option><option value="120">120 Minutes</option></select></label>'''
new_edit = '''              <label><span>Planned Sessions</span><input type="number" min="1" value={edit.planned_sessions} onChange={e=>setEdit({...edit,planned_sessions:e.target.value})}/></label>
              <label><span>Classes Per Week</span><select value={edit.classes_per_week} onChange={e=>setEdit({...edit,classes_per_week:e.target.value})}><option value="1">1 class / week</option><option value="2">2 classes / week</option><option value="3">3 classes / week</option><option value="4">4 classes / week</option><option value="5">5 classes / week</option><option value="6">6 classes / week</option><option value="7">7 classes / week</option></select></label>
              <label><span>Class Duration</span><select value={edit.duration_minutes} onChange={e=>setEdit({...edit,duration_minutes:e.target.value})}><option value="60">60 Minutes</option><option value="90">90 Minutes</option><option value="120">120 Minutes</option></select></label>'''
if old_edit in detail:
    detail = detail.replace(old_edit,new_edit,1)

old_gen = '''  async function generateSchedule() {
    if (!batch?.planned_sessions) {'''
new_gen = '''  async function generateSchedule() {
    if ((batch?.classes_per_week||1) > 1) {
      setMessage("This batch has multiple classes per week. Use + Add Session to choose the exact class days/times; Orbit will not guess the weekly days.");
      return;
    }

    if (!batch?.planned_sessions) {'''
if old_gen in detail:
    detail = detail.replace(old_gen,new_gen,1)

if "Orbit will not guess the weekly days" not in detail:
    raise SystemExit("Could not patch batch detail frequency behavior.")

detail_path.write_text(detail, encoding="utf-8")

# ---------- PAYMENTS ----------
outstanding_type = '''type Outstanding = {
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
entry_type = outstanding_type + '''
type PaymentEntryOption = {
  batch_id: string;
  batch_name: string;
  course_name: string;
  student_id: string;
  student_name: string;
  finance_id: string | null;
  total_fee_usd: number | null;
  payment_plan: string | null;
  installment_amount_usd: number | null;
  total_paid_usd: number;
  pending_usd: number | null;
};
'''
if "type PaymentEntryOption" not in payments:
    if outstanding_type not in payments:
        raise SystemExit("Outstanding type not found.")
    payments = payments.replace(outstanding_type,entry_type,1)

payments = payments.replace(
'''  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [search, setSearch] = useState("");''',
'''  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<PaymentEntryOption[]>([]);
  const [search, setSearch] = useState("");''',
1
)

payments = payments.replace(
'''  const [paymentForm, setPaymentForm] = useState({
    finance_id: "",
    amount_usd: "",
    payment_date: localIso(new Date()),
    payment_mode: "Zelle",
    reference: "",
  });''',
'''  const [paymentForm, setPaymentForm] = useState({
    batch_id: "",
    student_id: "",
    finance_id: "",
    amount_usd: "",
    payment_date: localIso(new Date()),
    payment_mode: "Zelle",
    reference: "",
    setup_total_fee_usd: "",
    setup_payment_plan: "Monthly",
    setup_installment_amount_usd: "",
    setup_plan_start_date: localIso(new Date()),
  });''',
1
)

payments = payments.replace(
'''    const [transactionResult, outstandingResult] = await Promise.all([
      supabase.rpc("payment_report_transactions", {
        p_from: effectiveFrom,
        p_to: effectiveTo,
      }),
      supabase.rpc("payment_outstanding_report"),
    ]);''',
'''    const [transactionResult, outstandingResult, paymentOptionResult] = await Promise.all([
      supabase.rpc("payment_report_transactions", {
        p_from: effectiveFrom,
        p_to: effectiveTo,
      }),
      supabase.rpc("payment_outstanding_report"),
      supabase.rpc("payment_entry_options"),
    ]);''',
1
)

payments = payments.replace(
'''    if (transactionResult.error || outstandingResult.error) {''',
'''    if (paymentOptionResult.error) {
      setPaymentOptions([]);
    } else {
      setPaymentOptions((paymentOptionResult.data || []) as PaymentEntryOption[]);
    }

    if (transactionResult.error || outstandingResult.error) {''',
1
)

memo_anchor = "  function openManualPayment() {"
if "paymentBatchOptions" not in payments:
    memo = '''  const paymentBatchOptions = useMemo(() => {
    const map = new Map<string,{id:string;name:string;course:string}>();
    paymentOptions.forEach((row) => {
      if (!map.has(row.batch_id)) {
        map.set(row.batch_id,{id:row.batch_id,name:row.batch_name,course:row.course_name});
      }
    });
    return Array.from(map.values()).sort((a,b)=>a.name.localeCompare(b.name));
  },[paymentOptions]);

  const paymentStudentOptions = useMemo(
    () => paymentOptions
      .filter((row)=>row.batch_id===paymentForm.batch_id)
      .sort((a,b)=>a.student_name.localeCompare(b.student_name)),
    [paymentOptions,paymentForm.batch_id]
  );

  const selectedPaymentOption = useMemo(
    () => paymentOptions.find(
      (row)=>row.batch_id===paymentForm.batch_id && row.student_id===paymentForm.student_id
    ) || null,
    [paymentOptions,paymentForm.batch_id,paymentForm.student_id]
  );

'''
    payments = payments.replace(memo_anchor,memo+memo_anchor,1)

open_pat = re.compile(r'  function openManualPayment\(\) \{.*?\n  \}\n\n  async function saveManualPayment',re.S)
open_new = '''  function openManualPayment() {
    setPaymentForm({
      batch_id: "",
      student_id: "",
      finance_id: "",
      amount_usd: "",
      payment_date: localIso(new Date()),
      payment_mode: "Zelle",
      reference: "",
      setup_total_fee_usd: "",
      setup_payment_plan: "Monthly",
      setup_installment_amount_usd: "",
      setup_plan_start_date: localIso(new Date()),
    });
    setPaymentOpen(true);
  }

  async function saveManualPayment'''
payments, n = open_pat.subn(open_new,payments,count=1)
if n == 0:
    raise SystemExit("Could not patch openManualPayment.")

save_old = '''  async function saveManualPayment(event: React.FormEvent) {
    event.preventDefault();

    if (!paymentForm.finance_id) {
      setMessage("Select a student / batch.");
      return;
    }

    const amount = Number(paymentForm.amount_usd);'''
save_new = '''  async function saveManualPayment(event: React.FormEvent) {
    event.preventDefault();

    if (!paymentForm.batch_id || !paymentForm.student_id) {
      setMessage("Select a batch and student.");
      return;
    }

    let financeId = paymentForm.finance_id;

    if (!financeId) {
      const totalFee = Number(paymentForm.setup_total_fee_usd);
      const installment = Number(paymentForm.setup_installment_amount_usd);

      if (!totalFee || totalFee <= 0) {
        setMessage("This student has no payment plan yet. Enter the total fee.");
        return;
      }

      if (!installment || installment <= 0) {
        setMessage("Enter a valid installment amount.");
        return;
      }

      const { data: createdFinanceId, error: setupError } = await supabase.rpc(
        "ensure_payment_plan_for_entry",
        {
          p_batch_id: paymentForm.batch_id,
          p_student_id: paymentForm.student_id,
          p_total_fee_usd: totalFee,
          p_payment_plan: paymentForm.setup_payment_plan,
          p_installment_amount_usd: installment,
          p_plan_start_date: paymentForm.setup_plan_start_date,
        }
      );

      if (setupError || !createdFinanceId) {
        setMessage(setupError?.message || "Could not create the payment plan.");
        return;
      }

      financeId = String(createdFinanceId);
    }

    const amount = Number(paymentForm.amount_usd);'''
if save_old not in payments:
    raise SystemExit("saveManualPayment start not found.")
payments = payments.replace(save_old,save_new,1)
payments = payments.replace("finance_id: paymentForm.finance_id,","finance_id: financeId,",1)

select_old = '''                <label className={styles.full}>
                  <span>Student / Batch *</span>
                  <select
                    value={paymentForm.finance_id}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        finance_id: event.target.value,
                      })
                    }
                  >
                    <option value="">Select student / batch</option>
                    {outstanding.map((row) => (
                      <option key={row.finance_id} value={row.finance_id}>
                        {row.student_name} — {row.batch_name} — Pending {money(row.pending_usd)}
                      </option>
                    ))}
                  </select>
                </label>'''

select_new = '''                <label>
                  <span>Batch *</span>
                  <select
                    value={paymentForm.batch_id}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        batch_id: event.target.value,
                        student_id: "",
                        finance_id: "",
                        amount_usd: "",
                        setup_total_fee_usd: "",
                        setup_installment_amount_usd: "",
                      })
                    }
                  >
                    <option value="">Select batch</option>
                    {paymentBatchOptions.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} — {batch.course}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Student *</span>
                  <select
                    value={paymentForm.student_id}
                    disabled={!paymentForm.batch_id}
                    onChange={(event) => {
                      const studentId = event.target.value;
                      const option = paymentOptions.find(
                        (row) =>
                          row.batch_id === paymentForm.batch_id &&
                          row.student_id === studentId
                      );

                      setPaymentForm({
                        ...paymentForm,
                        student_id: studentId,
                        finance_id: option?.finance_id || "",
                        amount_usd: option?.installment_amount_usd
                          ? String(
                              Math.min(
                                Number(option.installment_amount_usd || 0),
                                Number(option.pending_usd || option.total_fee_usd || 0)
                              ) || ""
                            )
                          : "",
                        setup_total_fee_usd: option?.total_fee_usd
                          ? String(option.total_fee_usd)
                          : "",
                        setup_payment_plan: option?.payment_plan || "Monthly",
                        setup_installment_amount_usd: option?.installment_amount_usd
                          ? String(option.installment_amount_usd)
                          : "",
                      });
                    }}
                  >
                    <option value="">
                      {paymentForm.batch_id ? "Select student" : "Select batch first"}
                    </option>
                    {paymentStudentOptions.map((row) => (
                      <option
                        key={`${row.batch_id}-${row.student_id}`}
                        value={row.student_id}
                      >
                        {row.student_name}
                        {row.finance_id
                          ? ` — ${row.payment_plan || "Plan"} — Pending ${money(row.pending_usd)}`
                          : " — Payment plan not set"}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPaymentOption && !selectedPaymentOption.finance_id && (
                  <div className={`${styles.quickPlan} ${styles.full}`}>
                    <div className={styles.quickPlanHead}>
                      <strong>Payment plan not configured</strong>
                      <span>Set it here once, then record this payment.</span>
                    </div>

                    <div className={styles.quickPlanGrid}>
                      <label>
                        <span>Total Fee USD *</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={paymentForm.setup_total_fee_usd}
                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_total_fee_usd:event.target.value
                          })}
                          placeholder="0.00"
                        />
                      </label>

                      <label>
                        <span>Payment Plan *</span>
                        <select
                          value={paymentForm.setup_payment_plan}
                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_payment_plan:event.target.value
                          })}
                        >
                          <option>After Every 4 Classes</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Half-yearly</option>
                          <option>Yearly</option>
                          <option>Custom</option>
                        </select>
                      </label>

                      <label>
                        <span>Installment Amount USD *</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={paymentForm.setup_installment_amount_usd}
                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_installment_amount_usd:event.target.value
                          })}
                          placeholder="0.00"
                        />
                      </label>

                      <label>
                        <span>Plan Start Date *</span>
                        <input
                          type="date"
                          value={paymentForm.setup_plan_start_date}
                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_plan_start_date:event.target.value
                          })}
                        />
                      </label>
                    </div>
                  </div>
                )}'''

if select_old not in payments:
    raise SystemExit("Payment selector block not found.")
payments = payments.replace(select_old,select_new,1)
payments_path.write_text(payments, encoding="utf-8")

# CSS
if "/* ORBIT PAYMENT SELECTOR FIX */" not in payments_css:
    payments_css += r'''

/* ORBIT PAYMENT SELECTOR FIX */
.quickPlan{
  padding:12px;
  border:1px solid #efcfaa;
  border-radius:10px;
  background:#fff8ef;
}
.quickPlanHead{margin-bottom:10px}
.quickPlanHead strong,.quickPlanHead span{display:block}
.quickPlanHead strong{color:#8e572a;font-size:11px}
.quickPlanHead span{margin-top:3px;color:#7d7065;font-size:9.5px}
.quickPlanGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.quickPlanGrid label{display:grid;gap:5px}
.quickPlanGrid label span{font-size:9px;font-weight:800}
.quickPlanGrid input,.quickPlanGrid select{
  height:38px;border:1px solid #d8deda;border-radius:8px;background:#fff;padding:0 9px
}
@media(max-width:700px){.quickPlanGrid{grid-template-columns:1fr}}
'''
payments_css_path.write_text(payments_css, encoding="utf-8")

print("Applied. CRM leads untouched.")
