"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./received-payments.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const MANAGE_ROLES = ["super_admin", "admin", "sales", "sales_marketing", "accounts_finance"];
const VIEW_ROLES = [...MANAGE_ROLES, "marketing", "viewer_management"];
const MODES = ["Zelle", "Stripe", "Razorpay", "UPI", "Bank Transfer", "Credit/Debit Card", "PayPal", "Cash", "Cheque", "Other"];
const PURPOSES = ["Course Fee", "Installment", "Renewal", "Other"];

type Payment = {
  source: "existing" | "manual";
  transaction_id: string;
  payment_date: string;
  student_name: string;
  batch_name: string;
  course_name: string;
  amount_usd: number;
  payment_mode: string;
  purpose: string;
  reference: string | null;
  notes: string | null;
  voided_at: string | null;
};
type StudentOption = {
  batch_id: string; student_id: string; batch_name: string;
  student_name: string; course_name: string;
};
type EntryForm = {
  student_id: string; batch_id: string; amount_usd: string;
  payment_date: string; payment_mode: string; purpose: string;
  reference: string; notes: string;
};
type Dialog = "new" | "edit" | "void" | null;

function localDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return [y, m, d].join("-");
}
function monthStart() {
  const now = new Date(); return localDate(new Date(now.getFullYear(), now.getMonth(), 1));
}
function emptyForm(): EntryForm {
  return { student_id: "", batch_id: "", amount_usd: "", payment_date: localDate(new Date()),
    payment_mode: "Zelle", purpose: "Course Fee", reference: "", notes: "" };
}
function usd(value: number) {
  return new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(Number(value || 0));
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export default function PaymentsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(() => localDate(new Date()));
  const [payments, setPayments] = useState<Payment[]>([]);
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<"history" | "reports">("history");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [voidReason, setVoidReason] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const canManage = MANAGE_ROLES.includes(role);
  const isMarketing = role === "marketing";

  async function load(dateFrom: string, dateTo: string, accessRole: string) {
    if (!VIEW_ROLES.includes(accessRole)) return;
    if (dateFrom > dateTo) {setNotice("From date cannot be after To date."); return;}
    setLoading(true); setNotice("");
    const [result, choices] = await Promise.all([
      supabase.rpc("crm_received_payment_report", {p_from: dateFrom, p_to: dateTo}),
      MANAGE_ROLES.includes(accessRole)
        ? supabase.rpc("crm_payment_entry_options")
        : Promise.resolve({data: [] as StudentOption[], error: null}),
    ]);
    setLoading(false);
    if (result.error) {
      setNotice("Could not load payments: " + result.error.message);
      setPayments([]); return;
    }
    setPayments((result.data || []) as Payment[]);
    if (choices.error) setNotice("Payment history loaded, but student list could not load: " + choices.error.message);
    setOptions((choices.data || []) as StudentOption[]);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      const {data, error} = await supabase.auth.getUser();
      if (!active) return;
      if (error || !data.user) {router.replace("/"); return;}
      setEmail(data.user.email || "");
      const profile = await supabase.from("user_profiles")
        .select("role, is_active").eq("id", data.user.id).single();
      if (!active) return;
      const currentRole = profile.data?.is_active ? profile.data.role : "";
      setRole(currentRole);
      setChecking(false);
      if (!VIEW_ROLES.includes(currentRole)) {
        setNotice("You do not have access to CRM payments."); return;
      }
      await load(monthStart(), localDate(new Date()), currentRole);
    }
    void init();
    return () => {active = false;};
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(p =>
      [p.student_name, p.batch_name, p.course_name, p.payment_mode, p.purpose, p.reference, p.payment_date]
        .some(value => String(value || "").toLowerCase().includes(q))
    );
  }, [payments, search]);
  const activePayments = useMemo(() => payments.filter(p => !p.voided_at), [payments]);
  const totalReceived = useMemo(() =>
    activePayments.reduce((sum, p) => sum + Number(p.amount_usd || 0), 0), [activePayments]);

  const studentOptions = useMemo(() => {
    const unique = new Map<string, string>();
    options.forEach(o => unique.set(o.student_id, o.student_name));
    return [...unique].sort((a,b) => a[1].localeCompare(b[1]));
  }, [options]);
  const relevantBatches = useMemo(() => options.filter(o => o.student_id === form.student_id), [options, form.student_id]);
  const chosen = options.find(o => o.student_id === form.student_id && o.batch_id === form.batch_id);
  const byMode = useMemo(() => {
    const map = new Map<string, number>();
    activePayments.forEach(p => map.set(p.payment_mode, (map.get(p.payment_mode) || 0) + Number(p.amount_usd || 0)));
    return [...map].sort((a,b) => b[1]-a[1]);
  }, [activePayments]);
  const byCourse = useMemo(() => {
    const map = new Map<string, number>();
    activePayments.forEach(p => map.set(p.course_name, (map.get(p.course_name) || 0) + Number(p.amount_usd || 0)));
    return [...map].sort((a,b) => b[1]-a[1]);
  }, [activePayments]);

  function closeDialog() {if (!saving) {setDialog(null);setSelected(null);setFormError("");setVoidReason("");}}
  function openNew() {setForm(emptyForm());setSelected(null);setFormError("");setDialog("new");}
  function openEdit(p: Payment) {
    setSelected(p);
    setForm({student_id:"",batch_id:"",amount_usd:String(p.amount_usd),
      payment_date:p.payment_date,payment_mode:p.payment_mode,purpose:p.purpose||"Course Fee",
      reference:p.reference||"",notes:p.notes||""});
    setFormError("");setDialog("edit");
  }
  function openVoid(p: Payment) {setSelected(p);setVoidReason("");setFormError("");setDialog("void");}

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (!canManage || !dialog || dialog === "void") return;
    setFormError("");
    const amount = Number(form.amount_usd);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999) {
      setFormError("Enter a valid positive USD payment amount.");return;
    }
    if (!form.payment_date || !form.payment_mode.trim()) {
      setFormError("Payment date and method are required.");return;
    }
    if (dialog === "new" && (!chosen || !form.student_id || !form.batch_id)) {
      setFormError("Select a student and one of their assigned batches.");return;
    }
    setSaving(true);
    let error: {message:string}|null = null;
    if (dialog === "new") {
      const response = await supabase.from("crm_manual_payments").insert({
        student_id:form.student_id,batch_id:form.batch_id,amount_usd:amount,
        payment_date:form.payment_date,payment_mode:form.payment_mode,
        purpose:form.purpose,reference:form.reference.trim()||null,notes:form.notes.trim()||null,
      });
      error = response.error;
    } else if (selected?.source === "manual") {
      const response = await supabase.rpc("crm_edit_manual_payment", {
        p_id:selected.transaction_id,p_amount_usd:amount,p_payment_date:form.payment_date,
        p_payment_mode:form.payment_mode,p_purpose:form.purpose,
        p_reference:form.reference.trim()||null,p_notes:form.notes.trim()||null,
      });
      error = response.error;
    } else if (selected?.source === "existing") {
      const response = await supabase.rpc("update_payment_transaction", {
        p_transaction_id:selected.transaction_id,p_amount_usd:amount,
        p_payment_date:form.payment_date,p_payment_mode:form.payment_mode,
        p_reference:form.reference.trim()||null,
      });
      error = response.error;
    }
    setSaving(false);
    if (error) {setFormError(error.message);return;}
    setDialog(null);setSelected(null);
    await load(from, to, role);
    setNotice(dialog === "new" ? "Payment recorded successfully." : "Payment updated; correction recorded.");
  }
  async function voidEntry() {
    if (!canManage || !selected) return;
    setFormError("");
    if (selected.source === "manual" && voidReason.trim().length < 5) {
      setFormError("Enter a reason of at least five characters.");return;
    }
    setSaving(true);
    let error: {message:string}|null = null;
    if (selected.source === "manual") {
      const response = await supabase.rpc("crm_void_manual_payment", {
        p_id:selected.transaction_id,p_reason:voidReason.trim(),
      });
      error = response.error;
    } else {
      const response = await supabase.rpc("delete_payment_transaction", {
        p_transaction_id:selected.transaction_id,
      });
      error = response.error;
    }
    setSaving(false);
    if (error) {setFormError(error.message);return;}
    setDialog(null);setSelected(null);
    await load(from,to,role);
    setNotice("Payment correction saved. Audit history has been retained.");
  }

  function exportCsv() {
    const header = ["Date","Student","Course","Batch","Amount USD","Method","Payment for","Reference","Notes","Status","Source"];
    const rows = filtered.map(p => [p.payment_date,p.student_name,p.course_name,p.batch_name,
      Number(p.amount_usd).toFixed(2),p.payment_mode,p.purpose,p.reference||"",p.notes||"",
      p.voided_at?"Voided":"Recorded",p.source]);
    const contents = [header,...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF"+contents],{type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url;a.download="orbit-payments-"+from+"-to-"+to+".csv";
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }

  if (checking) return <main className={styles.main}>Checking payment access…</main>;
  if (!VIEW_ROLES.includes(role)) return (
    <div className={styles.shell}><OrbitSidebar email={email} active="payments"/>
      <main className={styles.main}><h1>Payments</h1><p>You do not have access to CRM payments.</p></main>
    </div>
  );
  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="payments"/>
      <main className={styles.main}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>CRM · FINANCE</p><h1>Payments</h1>
            <p>Record money received. Every amount is taken from a saved payment entry.</p></div>
          {canManage && <button type="button" className={styles.primary} onClick={openNew}>+ Record Payment</button>}
        </header>

        <div className={styles.summary} aria-label="Recorded payments summary">
          <section className={styles.metric}><span>Collected in selected period</span>
            <strong>{loading?"—":usd(totalReceived)}</strong><small>From recorded payments only</small>
          </section>
          <section className={styles.metric}><span>Payments recorded</span>
            <strong>{loading?"—":activePayments.length}</strong><small>Current selected period</small>
          </section>
        </div>
        {notice && <div className={styles.notice} role="status">{notice}</div>}
        <section className={styles.panel}>
          <div className={styles.panelTop}>
            <div><h2>Payment Records</h2><p>Every recorded payment, including earlier transactions.</p></div>
            <button className={styles.secondary} type="button" disabled={filtered.length===0} onClick={exportCsv}>Export CSV</button>
          </div>
          <div className={styles.tabRow} role="tablist" aria-label="Payment views">
            <button className={[styles.tab,section==="history"?styles.activeTab:""].join(" ")}
              type="button" onClick={()=>setSection("history")}>Payment History</button>
            <button className={[styles.tab,section==="reports"?styles.activeTab:""].join(" ")}
              type="button" onClick={()=>setSection("reports")}>Reports</button>
          </div>
          <div className={styles.filters}>
            <label className={styles.search}>Search records
              <input type="search" value={search} placeholder="Student, batch, transaction reference…"
                onChange={e=>setSearch(e.target.value)}/></label>
            {!isMarketing ? <>
              <label>From <input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
              <label>To <input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
              <button className={styles.secondary} type="button" disabled={loading} onClick={()=>void load(from,to,role)}>
                {loading?"Loading…":"Apply"}</button>
            </> : <span className={styles.hint}>Marketing view: current month only · read-only</span>}
          </div>
          {section==="history" ? <>
            <div className={styles.tableScroller}>
              <table aria-label="CRM recorded payments">
                <thead><tr><th>S.No</th><th>Payment Date</th><th>Student</th><th>Course / Batch</th>
                  <th>Amount Received</th><th>Method</th><th>Payment For</th><th>Reference</th>
                  {canManage&&<th>Actions</th>}</tr></thead>
                <tbody>{loading?<tr><td colSpan={canManage?9:8} className={styles.empty}>Loading payment records…</td></tr>:
                  filtered.length===0?<tr><td colSpan={canManage?9:8} className={styles.empty}>No recorded payments found for this period.</td></tr>:
                  filtered.map((p,index)=><tr key={p.source+p.transaction_id}>
                    <td>{index+1}</td><td>{p.payment_date}</td>
                    <td>{p.student_name}{p.voided_at&&<span className={styles.pill}>Voided</span>}</td>
                    <td>{p.course_name}<small>{p.batch_name}</small></td>
                    <td className={[styles.amount,p.voided_at?styles.voided:""].join(" ")}>{usd(p.amount_usd)}</td>
                    <td>{p.payment_mode}</td><td>{p.purpose||"Course Fee"}</td><td>{p.reference||"—"}</td>
                    {canManage&&<td><div className={styles.actions}>
                      <button type="button" className={styles.action} disabled={!!p.voided_at}
                        onClick={()=>openEdit(p)}>Edit</button>
                      <button type="button" className={[styles.action,styles.actionDanger].join(" ")}
                        disabled={!!p.voided_at} onClick={()=>openVoid(p)}>
                        {p.source==="manual"?"Void":"Remove"}
                      </button>
                    </div></td>}
                  </tr>)}</tbody>
              </table>
            </div>
            <div className={styles.footer}><span>{filtered.length} record(s) shown</span>
              <span>Amounts are in USD. Voided records are excluded from collections.</span></div>
          </> : <>
            <p className={styles.hint}>Reports use only payments actually recorded. No fee schedules, projected revenue, balances or overdue calculations.</p>
            <div className={styles.reportGrid}>
              <div className={styles.reportCard}><h3>Collections by payment method</h3><p>Selected period</p>
                {byMode.length===0?<p>No recorded payments.</p>:byMode.map(([name,amount])=>
                  <div key={name} className={styles.reportLine}><span>{name}</span><strong>{usd(amount)}</strong></div>)}
              </div>
              <div className={styles.reportCard}><h3>Collections by course</h3><p>Selected period</p>
                {byCourse.length===0?<p>No recorded payments.</p>:byCourse.map(([name,amount])=>
                  <div key={name} className={styles.reportLine}><span>{name}</span><strong>{usd(amount)}</strong></div>)}
              </div>
            </div>
          </>}
        </section>
        <p className={styles.note}>Payments are saved only when a team member records them. Older fee-plan history is retained, but the CRM no longer forecasts or calculates amounts owed on this page.</p>
      </main>

      {dialog && canManage && <div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)closeDialog();}}>
        <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="payment-dialog-heading">
          <div className={styles.modalHead}>
            <div><h2 id="payment-dialog-heading">{dialog==="new"?"Record Payment":dialog==="edit"?"Edit Payment":"Correct Payment"}</h2>
              <p>{dialog==="new"?"Enter the payment actually received.":dialog==="edit"?
                "Correct a recorded payment. Changes are audited.":"Remove an incorrect payment from collection totals."}</p></div>
            <button className={styles.close} aria-label="Close dialog" type="button" disabled={saving} onClick={closeDialog}>×</button>
          </div>
          {dialog!=="void" ? <form onSubmit={saveEntry}>
            <div className={styles.formGrid}>
              {dialog==="new"?<>
                <label>Student *<select required value={form.student_id} onChange={e=>
                  setForm(prev=>({...prev,student_id:e.target.value,batch_id:""}))}>
                  <option value="">Select student</option>
                  {studentOptions.map(([id,name])=><option key={id} value={id}>{name}</option>)}
                </select></label>
                <label>Course / Batch *<select required value={form.batch_id} disabled={!form.student_id}
                  onChange={e=>setForm(prev=>({...prev,batch_id:e.target.value}))}>
                  <option value="">Select batch</option>
                  {relevantBatches.map(b=><option key={b.batch_id} value={b.batch_id}>
                    {b.course_name} — {b.batch_name}</option>)}
                </select></label>
              </>:<div className={styles.span2}><strong>{selected?.student_name}</strong>
                  <p className={styles.note}>{selected?.course_name} · {selected?.batch_name}</p>
                </div>}
              <label>Amount received (USD) *<input type="number" min="0.01" max="9999999999" step="0.01" required
                value={form.amount_usd} onChange={e=>setForm(prev=>({...prev,amount_usd:e.target.value}))}/></label>
              <label>Payment date *<input type="date" required value={form.payment_date}
                onChange={e=>setForm(prev=>({...prev,payment_date:e.target.value}))}/></label>
              <label>Payment method *<select required value={form.payment_mode}
                onChange={e=>setForm(prev=>({...prev,payment_mode:e.target.value}))}>
                {MODES.map(mode=><option key={mode}>{mode}</option>)}</select></label>
              {(dialog==="new"||selected?.source==="manual")&&<label>Payment for
                <select value={form.purpose} onChange={e=>setForm(prev=>({...prev,purpose:e.target.value}))}>
                  {PURPOSES.map(x=><option key={x}>{x}</option>)}
                </select></label>}
              <label className={styles.span2}>Transaction reference (optional)
                <input value={form.reference} maxLength={160}
                  onChange={e=>setForm(prev=>({...prev,reference:e.target.value}))}
                  placeholder="Bank confirmation, Stripe ID or receipt reference"/></label>
              {(dialog==="new"||selected?.source==="manual")&&<label className={styles.span2}>Notes (optional)
                <textarea maxLength={500} value={form.notes}
                  onChange={e=>setForm(prev=>({...prev,notes:e.target.value}))}/></label>}
            </div>
            {formError&&<p className={styles.modalMessage} role="alert">{formError}</p>}
            <div className={styles.modalFooter}><button type="button" className={styles.secondary}
              disabled={saving} onClick={closeDialog}>Cancel</button>
              <button type="submit" className={styles.primary} disabled={saving}>{saving?"Saving…":dialog==="new"?"Save Payment":"Save Correction"}</button>
            </div>
          </form> : <>
            <div className={styles.formGrid}><div className={styles.span2}>
              <p>Payment for <strong>{selected?.student_name}</strong> — {usd(selected?.amount_usd||0)}.</p>
              <p className={styles.note}>{selected?.source==="manual"
                ?"This receipt will remain in the audit trail as voided. It will no longer count toward collections."
                :"This older payment will be removed through the existing audited correction process."}</p>
              {selected?.source==="manual"&&<label>Reason *<textarea className={styles.reason}
                value={voidReason} onChange={e=>setVoidReason(e.target.value)}
                placeholder="Explain why this entry is being voided" required/></label>}
            </div></div>
            {formError&&<p className={styles.modalMessage} role="alert">{formError}</p>}
            <div className={styles.modalFooter}><button className={styles.secondary} type="button"
              disabled={saving} onClick={closeDialog}>Cancel</button>
              <button className={styles.primary} type="button" disabled={saving} onClick={()=>void voidEntry()}>
                {saving?"Saving…":"Confirm Correction"}</button></div>
          </>}
        </div>
      </div>}
    </div>
  );
}
