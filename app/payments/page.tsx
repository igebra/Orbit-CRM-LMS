"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./payments.module.css";
import view from "./payments-workspace.module.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Transaction = {
  transaction_id: string;
  payment_date: string;
  student_name: string;
  batch_name: string;
  course_name: string;
  payment_plan: string;
  amount_usd: number;
  payment_mode: string;
  reference: string | null;
};

type Outstanding = {
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

type DeletedPayment = {
  correction_id: string;
  transaction_id: string;
  student_name: string;
  batch_name: string;
  course_name: string;
  payment_plan: string;
  amount_usd: number;
  payment_date: string;
  payment_mode: string;
  reference: string | null;
  deleted_by: string | null;
  deleted_by_email: string | null;
  deleted_at: string;
};

const PAYMENT_MODES = [
  "Zelle",
  "Stripe",
  "Razorpay",
  "UPI",
  "Bank Transfer",
  "Credit/Debit Card",
  "PayPal",
  "Cash",
  "Cheque",
  "Other",
];

type Preset =
  | "week"
  | "month"
  | "quarter"
  | "half"
  | "year"
  | "custom";

function localIso(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getPresetRange(preset: Preset) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (preset === "week") {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = new Date(today);
    from.setDate(today.getDate() + mondayOffset);
    return { from: localIso(from), to: localIso(today) };
  }

  if (preset === "month") {
    return {
      from: localIso(new Date(year, month, 1)),
      to: localIso(today),
    };
  }

  if (preset === "quarter") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      from: localIso(new Date(year, quarterStartMonth, 1)),
      to: localIso(today),
    };
  }

  if (preset === "half") {
    const halfStartMonth = month < 6 ? 0 : 6;
    return {
      from: localIso(new Date(year, halfStartMonth, 1)),
      to: localIso(today),
    };
  }

  return {
    from: `${year}-01-01`,
    to: localIso(today),
  };
}

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export default function PaymentsPage() {
  const router = useRouter();

  const defaultRange = getPresetRange("month");

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<PaymentEntryOption[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState("Overview");
  const [ledgerCourse, setLedgerCourse] = useState("All");
  const [ledgerStatus, setLedgerStatus] = useState("All");
  const [ledgerPage, setLedgerPage] = useState(0);
  const [savingPayment, setSavingPayment] = useState(false);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [selectedOutstanding, setSelectedOutstanding] = useState<Outstanding | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [deletedPaymentsOpen, setDeletedPaymentsOpen] = useState(false);
  const [deletedPayments, setDeletedPayments] = useState<DeletedPayment[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount_usd: "",
    payment_date: "",
    payment_mode: "Zelle",
    reference: "",
  });
  const [paymentForm, setPaymentForm] = useState({
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

  const allowedRoles = [
    "super_admin",
    "admin",
    "sales",
    "sales_marketing",
    "marketing",
    "viewer_management",
    "accounts_finance",
  ];

  const canManageFinance = [
    "super_admin",
    "admin",
    "sales",
    "sales_marketing",
    "accounts_finance",
  ].includes(role);

  const isMarketing = role === "marketing";

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

      if (!allowedRoles.includes(currentRole)) {
        setMessage("You do not have access to payment reports.");
        setLoading(false);
        return;
      }

      await loadReports(defaultRange.from, defaultRange.to, currentRole);
    }

    init();
  }, [router]);

  async function loadReports(dateFrom = from, dateTo = to, accessRole = role) {
    setLoading(true);
    setMessage("");

    const marketingRange = getPresetRange("month");
    const effectiveFrom = accessRole === "marketing" ? marketingRange.from : dateFrom;
    const effectiveTo = accessRole === "marketing" ? marketingRange.to : dateTo;

    if (accessRole === "marketing") {
      setPreset("month");
      setFrom(marketingRange.from);
      setTo(marketingRange.to);
    }

    const [transactionResult, outstandingResult, paymentOptionResult] = await Promise.all([
      supabase.rpc("payment_report_transactions", {
        p_from: effectiveFrom,
        p_to: effectiveTo,
      }),
      accessRole === "marketing" ? Promise.resolve({data: [],error: null}) : supabase.rpc("payment_outstanding_report"),
      accessRole === "marketing" ? Promise.resolve({data: [],error: null}) : supabase.rpc("payment_entry_options"),
    ]);

    if (paymentOptionResult.error) {
      setPaymentOptions([]);
    } else {
      setPaymentOptions((paymentOptionResult.data || []) as PaymentEntryOption[]);
    }

    if (transactionResult.error || outstandingResult.error) {
      setMessage(
        transactionResult.error?.message ||
          outstandingResult.error?.message ||
          "Could not load payment reports."
      );
      setTransactions([]);
      setOutstanding([]);
      setLoading(false);
      return;
    }

    setTransactions((transactionResult.data || []) as Transaction[]);
    setOutstanding((outstandingResult.data || []) as Outstanding[]);
    setLoading(false);
  }

  function applyPreset(nextPreset: Preset) {
    if (role === "marketing" && nextPreset !== "month") return;

    setPreset(nextPreset);

    if (nextPreset === "custom") return;

    const range = getPresetRange(nextPreset);
    setFrom(range.from);
    setTo(range.to);
    loadReports(range.from, range.to);
  }

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return transactions;

    return transactions.filter((row) =>
      [
        row.student_name,
        row.batch_name,
        row.course_name,
        row.payment_plan,
        row.payment_mode,
        row.reference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [transactions, search]);

  const collected = useMemo(
    () =>
      transactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount_usd || 0),
        0
      ),
    [transactions]
  );

  const pending = useMemo(
    () =>
      outstanding.reduce(
        (sum, row) => sum + Number(row.pending_usd || 0),
        0
      ),
    [outstanding]
  );

  const overdue = useMemo(
    () =>
      outstanding
        .filter((row) => row.payment_status === "Overdue")
        .reduce((sum, row) => sum + Number(row.pending_usd || 0), 0),
    [outstanding]
  );

  const modes = useMemo(() => {
    const map = new Map<string, number>();

    transactions.forEach((transaction) => {
      map.set(
        transaction.payment_mode,
        (map.get(transaction.payment_mode) || 0) +
          Number(transaction.amount_usd || 0)
      );
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const batches = useMemo(() => {
    const map = new Map<string, number>();

    transactions.forEach((transaction) => {
      map.set(
        transaction.batch_name,
        (map.get(transaction.batch_name) || 0) +
          Number(transaction.amount_usd || 0)
      );
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const plans = useMemo(() => {
    const map = new Map<string, number>();

    outstanding.forEach((row) => {
      map.set(row.payment_plan, (map.get(row.payment_plan) || 0) + 1);
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [outstanding]);


  const paymentBatchOptions = useMemo(() => {
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

  function openManualPayment() {
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
    setEntryError("");
    setPaymentOpen(true);
  }

  function openPlanSetup() {
    if (!canManageFinance) return;
    setEntryError("");
    setPaymentForm(current=>({
      ...current,
      batch_id: "", student_id:"", finance_id:"",
      setup_total_fee_usd:"", setup_payment_plan:"Monthly",
      setup_installment_amount_usd:"",
      setup_plan_start_date:localIso(new Date()),
    }));
    setPlanOpen(true);
  }

  function openPlanForSelectedStudent() {
    if (!canManageFinance) return;
    setEntryError("");
    setPaymentOpen(false);
    setWorkspaceTab("Fee Plans & Renewals");
    setPlanOpen(true);
  }

  async function saveFeePlan(event: React.FormEvent) {
    event.preventDefault();
    if (!canManageFinance) return;
    setEntryError("");
    const choice=paymentOptions.find(option =>
      option.batch_id === paymentForm.batch_id &&
      option.student_id === paymentForm.student_id
    );
    if (!choice || choice.finance_id) {
      setEntryError("Choose a student who does not already have a fee plan.");
      return;
    }
    const total=Number(paymentForm.setup_total_fee_usd);
    const installment=Number(paymentForm.setup_installment_amount_usd);
    if (!Number.isFinite(total) || total<=0 || !Number.isFinite(installment) || installment<=0) {
      setEntryError("Enter valid positive amounts for the total fee and installment.");
      return;
    }
    if (installment>total) {
      setEntryError("The installment amount cannot exceed the total fee.");
      return;
    }
    if (!paymentForm.setup_plan_start_date) {
      setEntryError("Select a plan start date.");
      return;
    }
    setSavingPlan(true);
    const {error}=await supabase.rpc("ensure_payment_plan_for_entry",{
      p_batch_id:choice.batch_id,
      p_student_id:choice.student_id,
      p_total_fee_usd:total,
      p_payment_plan:paymentForm.setup_payment_plan,
      p_installment_amount_usd:installment,
      p_plan_start_date:paymentForm.setup_plan_start_date,
    });
    setSavingPlan(false);
    if (error) {
      setEntryError(error.message);
      return;
    }
    setPlanOpen(false);
    await loadReports(from,to);
    setMessage("Fee plan created. You can now record payments for this student.");
  }

  async function saveManualPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!canManageFinance) return;
    setEntryError("");

    if (!paymentForm.batch_id || !paymentForm.student_id) {
      setEntryError("Select a batch and student.");
      return;
    }

    // Payment entry never creates a fee plan. Keep setup in Fee Plans & Renewals.
    const financeId = selectedPaymentOption?.finance_id;
    if (!financeId) {
      setEntryError("Set up a fee plan first under Fee Plans & Renewals.");
      return;
    }

    const amount = Number(paymentForm.amount_usd);

    if (!amount || amount <= 0) {
      setEntryError("Enter a valid payment amount.");
      return;
    }

    if (!paymentForm.payment_date) {
      setEntryError("Payment Date is required.");
      return;
    }

    setSavingPayment(true);
    setMessage("");

    const { error } = await supabase.from("payment_transactions").insert({
      finance_id: financeId,
      amount_usd: amount,
      payment_date: paymentForm.payment_date,
      payment_mode: paymentForm.payment_mode,
      reference: paymentForm.reference.trim() || null,
      created_by: userId || null,
    });

    setSavingPayment(false);

    if (error) {
      setEntryError(error.message);
      return;
    }

    setPaymentOpen(false);
    await loadReports(from, to);
    setMessage("Payment recorded successfully.");
  }

  function openEditPayment(row: Transaction) {
    setSelectedTransaction(row);
    setEditPaymentForm({
      amount_usd: String(row.amount_usd || ""),
      payment_date: row.payment_date,
      payment_mode: row.payment_mode || "Zelle",
      reference: row.reference || "",
    });
    setEditPaymentOpen(true);
  }

  async function savePaymentEdit(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedTransaction) return;

    const amount = Number(editPaymentForm.amount_usd);
    if (!amount || amount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    if (!editPaymentForm.payment_date) {
      setMessage("Payment Date is required.");
      return;
    }

    setSavingCorrection(true);
    setMessage("");

    const { error } = await supabase.rpc("update_payment_transaction", {
      p_transaction_id: selectedTransaction.transaction_id,
      p_amount_usd: amount,
      p_payment_date: editPaymentForm.payment_date,
      p_payment_mode: editPaymentForm.payment_mode,
      p_reference: editPaymentForm.reference.trim() || null,
    });

    setSavingCorrection(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditPaymentOpen(false);
    setSelectedTransaction(null);
    setMessage("Payment updated successfully.");
    await loadReports(from, to);
  }

  function openDeletePayment(row: Transaction) {
    setMessage("");
    setSelectedTransaction(row);
    setDeletePaymentOpen(true);
  }

  async function confirmDeletePayment() {
    if (!selectedTransaction) return;

    setSavingCorrection(true);
    setMessage("");

    let { error } = await supabase.rpc("delete_payment_transaction", {
      p_transaction_id: selectedTransaction.transaction_id,
    });

    if (
      error &&
      (
        error.message.toLowerCase().includes("schema cache") ||
        error.message.toLowerCase().includes("could not find the function")
      )
    ) {
      const fallback = await supabase.rpc("delete_payment_transaction", {
        p_transaction_id: selectedTransaction.transaction_id,
        p_reason: "Deleted from Orbit",
      });
      error = fallback.error;
    }

    setSavingCorrection(false);

    if (error) {
      setDeletePaymentOpen(false);
      setSelectedTransaction(null);
      setMessage(`Could not delete payment: ${error.message}`);
      return;
    }

    setDeletePaymentOpen(false);
    setSelectedTransaction(null);
    setMessage("Payment deleted successfully.");
    await loadReports(from, to);
  }

  function openDeletePlan(row: Outstanding) {
    setMessage("");
    setSelectedOutstanding(row);
    setDeletePlanOpen(true);
  }

  async function confirmDeletePlan() {
    if (!selectedOutstanding) return;

    setDeletingPlan(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_student_payment_plan", {
      p_finance_id: selectedOutstanding.finance_id,
    });

    setDeletingPlan(false);

    if (error) {
      setDeletePlanOpen(false);
      setSelectedOutstanding(null);
      setMessage(`Could not delete payment plan: ${error.message}`);
      return;
    }

    setDeletePlanOpen(false);
    setSelectedOutstanding(null);
    setMessage("Payment plan deleted successfully.");
    await loadReports(from, to);
  }

  async function openDeletedPayments() {
    if (role !== "super_admin") return;

    setDeletedPaymentsOpen(true);
    setDeletedLoading(true);

    const { data, error } = await supabase.rpc("deleted_payment_report");

    setDeletedLoading(false);

    if (error) {
      setMessage(error.message);
      setDeletedPayments([]);
      return;
    }

    setDeletedPayments((data || []) as DeletedPayment[]);
  }

  function exportCsv() {
    const headers = [
      "Date",
      "Student",
      "Batch",
      "Course",
      "Payment Plan",
      "Amount USD",
      "Payment Mode",
      "Reference",
    ];

    const lines = [
      headers.map(csvCell).join(","),
      ...filteredTransactions.map((row) =>
        [
          row.payment_date,
          row.student_name,
          row.batch_name,
          row.course_name,
          row.payment_plan,
          Number(row.amount_usd || 0).toFixed(2),
          row.payment_mode,
          row.reference || "",
        ]
          .map(csvCell)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orbit-payments-${from}-to-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }


  // Programme summary uses actual USD transaction amounts and actual enrolled
  // fee plans; it never invents an INR conversion or a monthly fee forecast.
  const programmeSummaries = useMemo(() => {
    const names = ["Math", "AiEdge", "Coding4AI", "Other"];
    const groups = names.map(name => ({
      name, collected: 0, committed: 0, lifetimePaid: 0,
      pending: 0, students: new Set<string>(), transactions: 0,
    }));
    function category(course: string) {
      const label=(course || "").toLowerCase().replace(/[^a-z0-9]/g,"");
      if (/coding4ai|c4ai|coding/.test(label)) return "Coding4AI";
      if (/aiedge/.test(label)) return "AiEdge";
      if (/math|geometry|algebra|calculus|statistics|precalculus|psat|sat/.test(label)) return "Math";
      return "Other";
    }
    for (const row of transactions) {
      const group=groups.find(g=>g.name===category(row.course_name));
      if(group){group.collected+=Number(row.amount_usd||0);group.transactions++;}
    }
    if (!isMarketing) for(const row of outstanding){
      const group=groups.find(g=>g.name===category(row.course_name));
      if(group){
        group.committed+=Number(row.total_fee_usd||0);
        group.lifetimePaid+=Number(row.total_paid_usd||0);
        group.pending+=Number(row.pending_usd||0);
        if(row.student_id)group.students.add(row.student_id);
      }
    }
    return groups.filter(g=>g.name!=="Other"||g.collected>0||g.committed>0||g.pending>0);
  },[transactions,outstanding,isMarketing]);

  const ledgerRows=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return outstanding.filter(row=>{
      if(ledgerCourse!=="All" && !(
         ledgerCourse==="Math" ? /math|algebra|geometry|calculus|statistics|psat|sat/i.test(row.course_name||"") :
         ledgerCourse==="AiEdge" ? /ai.?edge/i.test(row.course_name||"") :
         ledgerCourse==="Coding4AI" ? /coding.?4.?ai|coding/i.test(row.course_name||"") : true
       ))return false;
      if(ledgerStatus!=="All" && row.payment_status!==ledgerStatus)return false;
      if(q && ![row.student_name,row.batch_name,row.course_name,row.payment_plan]
        .some(v=>String(v||"").toLowerCase().includes(q)))return false;
      return true;
    }).sort((a,b)=>(a.student_name||"").localeCompare(b.student_name||""));
  },[outstanding,search,ledgerCourse,ledgerStatus]);
  const visibleLedger=ledgerRows.slice(ledgerPage*12,(ledgerPage+1)*12);
  const recentPayments=useMemo(()=>[...transactions].sort((a,b)=>
    b.payment_date.localeCompare(a.payment_date)).slice(0,5),[transactions]);
  const planValue=useMemo(()=>outstanding.reduce((sum,row)=>sum+Number(row.total_fee_usd||0),0),[outstanding]);
  const lifetimePaid=useMemo(()=>outstanding.reduce((sum,row)=>sum+Number(row.total_paid_usd||0),0),[outstanding]);
  const feePlanCount=outstanding.length;
  const overdueStudents=outstanding.filter(row=>row.payment_status==="Overdue").length;
  const monthlyLabel=new Date(from+"T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const periodLabel=preset==="month"?monthlyLabel:from+" – "+to;

  function chooseQuickStudent(key:string){
    const found=paymentOptions.find(row=>row.batch_id+"::"+row.student_id===key);
    if(!found){
      setPaymentForm(prev=>({...prev,batch_id:"",student_id:"",finance_id:"",amount_usd:""}));
      return;
    }
    setPaymentForm(prev=>({
      ...prev, batch_id:found.batch_id,student_id:found.student_id,
      finance_id:found.finance_id||"",
      amount_usd: found.installment_amount_usd
        ? String(Math.min(Number(found.installment_amount_usd),
          Number(found.pending_usd??found.total_fee_usd??0))) : "",
      setup_total_fee_usd:found.total_fee_usd?String(found.total_fee_usd):"",
      setup_installment_amount_usd:found.installment_amount_usd?String(found.installment_amount_usd):"",
      setup_payment_plan:found.payment_plan||"Monthly",
    }));
  }

  if (!allowedRoles.includes(role) && !loading) {
    return (
      <div className={styles.shell}>
        <OrbitSidebar email={email} active="payments" />
        <main className={styles.main}>
          <div className={styles.message}>
            You do not have access to payment reports.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <OrbitSidebar email={email} active="payments" />

      <main className={view.main}>
        <header className={view.header}>
          <div>
            <p className={view.eyebrow}>CRM · FINANCE</p>
            <h1>Payments</h1>
            <p>Track fees, record payments and review collections in one place.</p>
          </div>
          <div className={view.headerControls}>
            {!isMarketing && (
              <div className={view.dateControls}>
                <label>From <input aria-label="Payment report from date" type="date" value={from}
                  onChange={event=>{setPreset("custom");setFrom(event.target.value)}} /></label>
                <label>To <input aria-label="Payment report to date" type="date" value={to}
                  onChange={event=>{setPreset("custom");setTo(event.target.value)}} /></label>
                <button type="button" className={view.outlineButton} disabled={loading} onClick={()=>loadReports()}>
                  {loading?"Loading…":"Apply"}
                </button>
              </div>
            )}
            {isMarketing && <span className={view.dateReadOnly}>{monthlyLabel} · read only</span>}
            {canManageFinance && <button type="button" className={view.primaryButton} onClick={openManualPayment}>
              + Record Payment
            </button>}
          </div>
        </header>

        <nav className={view.tabs} aria-label="Payments sections">
          {["Overview","Monthly Ledger","Payment History","Fee Plans & Renewals","Outstanding","Reports"].filter(tab=>
            !isMarketing || ["Overview","Payment History","Reports"].includes(tab)
          ).map(tab=><button type="button" key={tab} onClick={()=>{setWorkspaceTab(tab);setLedgerPage(0)}}
            className={workspaceTab===tab?view.activeTab:""} aria-current={workspaceTab===tab?"page":undefined}>
            {tab}
          </button>)}
        </nav>

        {message && <div className={view.notice} role="status">{message}</div>}

        <div className={view.columns}>
          <div className={view.content}>
            {workspaceTab==="Overview" && (
              <>
                <div className={view.metrics}>
                  {(!isMarketing ? [
                    {label:"Expected · all fee plans",value:money(planValue),caption:"Total agreed fee value",tone:"blue"},
                    {label:"Collected · selected period",value:money(collected),caption:transactions.length+" recorded transactions",tone:"green"},
                    {label:"Outstanding · all plans",value:money(pending),caption:"Pending plan balances",tone:"yellow"},
                    {label:"Overdue · all plans",value:money(overdue),caption:overdueStudents+" students",tone:"pink"}
                  ] : [
                    {label:"Collected · current month",value:money(collected),caption:"Payments received",tone:"green"},
                    {label:"Transactions",value:String(transactions.length),caption:"Current month only",tone:"blue"}
                  ]).map(card=><section className={view.metric+" "+view[card.tone]} key={card.label}>
                    <span>{card.label}</span>
                    <strong>{loading?"—":card.value}</strong>
                    <small>{card.caption}</small>
                  </section>)}
                </div>
                <section className={view.programmes}>
                  <div className={view.sectionHeading}>
                    <div><h2>Collections by Programme</h2>
                      <p>{periodLabel} · payment transactions in selected period</p></div>
                    <span className={view.currencyTag}>USD · recorded values</span>
                  </div>
                  <div className={view.programmeGrid}>
                    {programmeSummaries.map((item,index)=>{
                      const rate=item.committed>0?
                        Math.min(100,Math.round(100*item.lifetimePaid/item.committed)):0;
                      return <div className={view.programmeCard} key={item.name}>
                        <div className={view.programmeName}>
                          <span className={view.programmeIcon+" "+view["colour"+index]}>
                            {item.name==="Math"?"∑":item.name==="AiEdge"?"AI":item.name==="Coding4AI"?"</>":"+"}
                          </span>
                          <h3>{item.name}</h3>
                        </div>
                        <div className={view.programmeValue}>
                          <span>Collected this period</span><strong>{loading?"—":money(item.collected)}</strong>
                        </div>
                        {!isMarketing && <>
                          <div className={view.programmeMeta}>
                            <span>Agreed fees: <strong>{money(item.committed)}</strong></span>
                            <span>Pending: <strong>{money(item.pending)}</strong></span>
                          </div>
                          <div className={view.progressTrack} role="meter" aria-label={item.name+" lifetime plan collection progress"}
                            aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate}>
                            <div style={{width:rate+"%"}} />
                          </div>
                          <small>{rate}% paid towards recorded plans · {item.students.size} enrolled students</small>
                        </>}
                        {isMarketing && <small>{item.transactions} payments in selected month</small>}
                      </div>
                    })}
                  </div>
                  {!isMarketing && <p className={view.dataNote}>
                    Plan value and pending are lifetime figures; collected is for the selected period.
                    These are different time ranges and are not a monthly forecast.
                  </p>}
                </section>
              </>
            )}

            {(workspaceTab==="Overview" || workspaceTab==="Monthly Ledger" ||
                workspaceTab==="Fee Plans & Renewals" || workspaceTab==="Outstanding") && !isMarketing && (
              <section className={view.ledger}>
                <div className={view.sectionHeading}>
                  <div>
                    <h2>{workspaceTab==="Outstanding"?"Outstanding Fee Balances":
                      workspaceTab==="Fee Plans & Renewals"?"Fee Plans & Renewals":"Student Fee Ledger"}</h2>
                    <p>Current payment plans, balances and renewal dates</p>
                  </div>
                  <div className={view.planHeaderActions}>
                    {workspaceTab==="Fee Plans & Renewals" && canManageFinance && (
                      <button type="button" className={view.primaryButton} onClick={openPlanSetup}>
                        + Set Up Fee Plan
                      </button>
                    )}
                    <button type="button" className={view.textLink} onClick={()=>setWorkspaceTab("Payment History")}>
                      Payment history →
                    </button>
                  </div>
                </div>
                <div className={view.filterBar}>
                  <input type="search" aria-label="Search student fee plans" placeholder="Search students, batches, courses…"
                    value={search} onChange={e=>{setSearch(e.target.value);setLedgerPage(0)}} />
                  <select value={ledgerCourse} aria-label="Filter by programme" onChange={e=>{setLedgerCourse(e.target.value);setLedgerPage(0)}}>
                    {["All","Math","AiEdge","Coding4AI"].map(name=><option key={name} value={name}>{name==="All"?"All programmes":name}</option>)}
                  </select>
                  <select value={ledgerStatus} aria-label="Filter by payment status" onChange={e=>{setLedgerStatus(e.target.value);setLedgerPage(0)}}>
                    <option value="All">All statuses</option>
                    {Array.from(new Set(outstanding.map(row=>row.payment_status))).filter(Boolean).sort().map(
                      status=><option key={status} value={status}>{status}</option>)}
                  </select>
                  <button type="button" className={view.outlineButton} onClick={exportCsv}
                    disabled={filteredTransactions.length===0} title="Export transaction history in selected period">
                    Export CSV
                  </button>
                </div>
                <div className={view.tableScroller}>
                  <table className={view.ledgerTable} aria-label="Student payment plan ledger">
                    <thead><tr>
                      <th data-sno>S.No</th><th>Student</th><th>Course / Batch</th><th>Fee Plan</th>
                      <th>Plan Total</th><th>Paid to Date</th><th>Balance</th>
                      <th>Next Due</th><th>Status</th><th>Action</th>
                    </tr></thead>
                    <tbody>
                      {loading?<tr><td colSpan={10} className={view.empty}>Loading payment plans…</td></tr>:
                      visibleLedger.length===0?<tr><td colSpan={10} className={view.empty}>No matching fee plans found.</td></tr>:
                      visibleLedger.map((row, index)=><tr key={row.finance_id}>
                        <td data-sno>{ledgerPage * 12 + index + 1}</td>
                        <td><strong>{row.student_name}</strong></td>
                        <td>{row.course_name}<small>{row.batch_name}</small></td>
                        <td>{row.payment_plan}</td>
                        <td>{money(row.total_fee_usd)}</td>
                        <td>{money(row.total_paid_usd)}</td>
                        <td><strong>{money(row.pending_usd)}</strong></td>
                        <td>{row.next_due_date||"—"}</td>
                        <td><span className={row.payment_status==="Overdue"?view.bad:row.payment_status==="Paid"?view.good:view.neutral}>
                          {row.payment_status}</span></td>
                        <td>{canManageFinance?<button className={view.rowAction} type="button" onClick={()=>{
                          chooseQuickStudent(row.batch_id+"::"+row.student_id);
                          setPaymentOpen(true);
                        }}>Record</button>:null}</td>
                      </tr>)}
                    </tbody>
                  </table>
                </div>
                <div className={view.tableFooter}>
                  <span>{ledgerRows.length===0?"0":ledgerPage*12+1}–{Math.min(ledgerRows.length,(ledgerPage+1)*12)} of {ledgerRows.length} fee plans</span>
                  <div>
                    <button type="button" disabled={ledgerPage===0} onClick={()=>setLedgerPage(n=>Math.max(0,n-1))} aria-label="Previous ledger page">‹</button>
                    <span>Page {ledgerPage+1}</span>
                    <button type="button" disabled={(ledgerPage+1)*12>=ledgerRows.length} onClick={()=>setLedgerPage(n=>n+1)} aria-label="Next ledger page">›</button>
                  </div>
                </div>
              </section>
            )}

            {workspaceTab==="Payment History" && (
              <section className={view.ledger}>
                <div className={view.sectionHeading}>
                  <div><h2>Payment History</h2><p>All recorded transactions in the selected period</p></div>
                  <button type="button" className={view.outlineButton} onClick={exportCsv}
                    disabled={filteredTransactions.length===0}>Export CSV</button>
                </div>
                <div className={view.filterBar}>
                  <input type="search" placeholder="Search student, batch, payment mode…" aria-label="Search payment history"
                    value={search} onChange={e=>setSearch(e.target.value)} />
                </div>
                <div className={view.tableScroller}>
                  <table aria-label="Payment transaction history" className={view.ledgerTable}>
                    <thead><tr><th data-sno>S.No</th><th>Date</th><th>Student</th><th>Course</th><th>Batch</th><th>Amount USD</th>
                      <th>Mode</th><th>Reference</th>{canManageFinance&&<th>Actions</th>}</tr></thead>
                    <tbody>{filteredTransactions.length===0?<tr>
                      <td colSpan={canManageFinance?9:8} className={view.empty}>No payments found for this period.</td>
                    </tr>:filteredTransactions.map((row, index)=><tr key={row.transaction_id}>
                      <td data-sno>{index + 1}</td>
                      <td>{row.payment_date}</td><td><strong>{row.student_name}</strong></td>
                      <td>{row.course_name}</td><td>{row.batch_name}</td><td><strong>{money(row.amount_usd)}</strong></td>
                      <td>{row.payment_mode}</td><td>{row.reference||"—"}</td>
                      {canManageFinance&&<td className={view.inlineActions}>
                        <button type="button" onClick={()=>openEditPayment(row)}>Edit</button>
                        <button type="button" onClick={()=>openDeletePayment(row)}>Delete</button>
                      </td>}</tr>)}</tbody>
                  </table>
                </div>
                {role==="super_admin"&&<button type="button" className={view.auditLink} onClick={openDeletedPayments}>
                  Review deleted payments (audit)
                </button>}
              </section>
            )}

            {workspaceTab==="Reports" && (
              <div className={view.reports}>
                <section className={view.reportCard}><h2>Payment modes</h2><p>Current period</p>
                  {modes.length===0?<small>No transactions recorded.</small>:
                    modes.map(([name,value])=><div key={name}><span>{name}</span><strong>{money(value)}</strong></div>)}
                </section>
                <section className={view.reportCard}><h2>Batch collections</h2><p>Current period</p>
                  {batches.length===0?<small>No collections recorded.</small>:
                    batches.slice(0,12).map(([name,value])=><div key={name}><span>{name}</span><strong>{money(value)}</strong></div>)}
                </section>
                {!isMarketing&&<section className={view.reportCard}><h2>Payment plans</h2><p>Current plan mix</p>
                  {plans.length===0?<small>No plans found.</small>:
                    plans.map(([name,count])=><div key={name}><span>{name}</span><strong>{count}</strong></div>)}
                </section>}
              </div>
            )}
          </div>

          <aside className={view.rightRail} aria-label="Payment actions and statistics">
            <section className={view.sideCard}>
              <div className={view.mascotHeading}><h2>Quick Stats</h2><img src="/orbit-mascot-approved.svg" className={view.mascot} alt="" width={43} height={58} /></div>
              <div className={view.statLine}><span>Payments in period</span><strong>{transactions.length}</strong></div>
              {!isMarketing&&<>
                <div className={view.statLine}><span>Recorded fee plans</span><strong>{feePlanCount}</strong></div>
                <div className={view.statLine}><span>Overdue students</span><strong>{overdueStudents}</strong></div>
                <div className={view.statLine}><span>Total plan payments</span><strong>{money(lifetimePaid)}</strong></div>
              </>}
            </section>
            <section className={view.sideCard}>
              <div className={view.sideHeading}><h2>Recent Payments</h2>
                <button type="button" onClick={()=>setWorkspaceTab("Payment History")}>View all</button></div>
              {recentPayments.length===0?<p>No recorded payments in selected period.</p>:
                recentPayments.map(row=><div className={view.recentLine} key={row.transaction_id}>
                  <div><strong>{row.student_name}</strong><small>{row.payment_date}</small></div>
                  <strong>{money(row.amount_usd)}</strong>
                </div>)}
            </section>
          </aside>
        </div>
      </main>

      {planOpen && canManageFinance && (
        <div className={styles.backdrop}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="fee-plan-title">
            <div className={styles.modalHeader}>
              <div>
                <h2 id="fee-plan-title">Set Up Fee Plan</h2>
                <p>Configure the student's fee schedule once. Payments are recorded separately.</p>
              </div>
              <button type="button" className={styles.close} aria-label="Close fee plan"
                onClick={()=>{setPlanOpen(false);setEntryError("");}}>×</button>
            </div>

            <form onSubmit={saveFeePlan}>
              <div className={styles.formGrid}>
                <label>
                  <span>Batch *</span>
                  <select required value={paymentForm.batch_id}
                    onChange={e=>setPaymentForm(prev=>({
                      ...prev,batch_id:e.target.value,student_id:"",finance_id:"",
                      setup_total_fee_usd:"",setup_installment_amount_usd:"",
                    }))}>
                    <option value="">Select batch</option>
                    {paymentBatchOptions.filter(batch=>paymentOptions.some(row=>
                      row.batch_id===batch.id && !row.finance_id)).map(batch=>
                      <option key={batch.id} value={batch.id}>{batch.name} — {batch.course}</option>)}
                  </select>
                </label>
                <label>
                  <span>Student *</span>
                  <select required value={paymentForm.student_id}
                    disabled={!paymentForm.batch_id}
                    onChange={e=>setPaymentForm(prev=>({...prev,student_id:e.target.value,finance_id:""}))}>
                    <option value="">Select student</option>
                    {paymentOptions.filter(row=>row.batch_id===paymentForm.batch_id &&
                      !row.finance_id).map(row=><option key={row.student_id} value={row.student_id}>
                        {row.student_name}
                      </option>)}
                  </select>
                </label>
                <label>
                  <span>Total Fee (USD) *</span>
                  <input required type="number" min="0.01" step="0.01"
                    value={paymentForm.setup_total_fee_usd} placeholder="0.00"
                    onChange={e=>setPaymentForm(prev=>({
                      ...prev,setup_total_fee_usd:e.target.value,
                      ...(prev.setup_payment_plan==="Paid in Full"?
                        {setup_installment_amount_usd:e.target.value}:{})
                    }))} />
                </label>
                <label>
                  <span>Plan Type *</span>
                  <select value={paymentForm.setup_payment_plan}
                    onChange={e=>setPaymentForm(prev=>({
                      ...prev,setup_payment_plan:e.target.value,
                      ...(e.target.value==="Paid in Full"?
                        {setup_installment_amount_usd:prev.setup_total_fee_usd}:{})
                    }))}>
                    {["After Every 4 Classes","Monthly","Quarterly","Half-yearly",
                      "Yearly","Paid in Full","Custom"].map(plan=>
                        <option key={plan} value={plan}>{plan}</option>)}
                  </select>
                </label>
                <label>
                  <span>Installment Amount (USD) *</span>
                  <input required type="number" min="0.01" step="0.01"
                    value={paymentForm.setup_installment_amount_usd} placeholder="0.00"
                    readOnly={paymentForm.setup_payment_plan==="Paid in Full"}
                    onChange={e=>setPaymentForm(prev=>({
                      ...prev,setup_installment_amount_usd:e.target.value
                    }))} />
                </label>
                <label>
                  <span>Plan Start Date *</span>
                  <input required type="date" value={paymentForm.setup_plan_start_date}
                    onChange={e=>setPaymentForm(prev=>({
                      ...prev,setup_plan_start_date:e.target.value
                    }))} />
                </label>
                {entryError && <p className={view.formError+" "+styles.full} role="alert">{entryError}</p>}
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.secondary}
                  onClick={()=>{setPlanOpen(false);setEntryError("");}} disabled={savingPlan}>Cancel</button>
                <button type="submit" className={styles.primary} disabled={savingPlan}>
                  {savingPlan?"Saving…":"Save Fee Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentOpen && (
        <div className={styles.backdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Record Payment</h2>
                <p>Select a student, enter the amount and save.</p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setPaymentOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveManualPayment}>
              <div className={styles.formGrid}>
                <label>
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
                  <div className={view.missingPlanNotice+" "+styles.full}>
                    <span>Fee plan required before recording payment.</span>
                    <button type="button" className={view.textLink} onClick={openPlanForSelectedStudent}>
                      Go to Fee Plans &amp; Renewals →
                    </button>
                  </div>
                )}

                {entryError && <p className={view.formError+" "+styles.full} role="alert">{entryError}</p>}

                <label>
                  <span>Amount USD *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={paymentForm.amount_usd}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount_usd: event.target.value,
                      })
                    }
                    placeholder="0.00"
                  />
                </label>

                <label>
                  <span>Payment Date *</span>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_date: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Payment Mode *</span>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_mode: event.target.value,
                      })
                    }
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Reference / Transaction ID</span>
                  <input
                    value={paymentForm.reference}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        reference: event.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setPaymentOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={styles.primary}
                  disabled={savingPayment || !selectedPaymentOption?.finance_id}
                >
                  {savingPayment ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editPaymentOpen && selectedTransaction && (
        <div className={styles.backdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Edit Payment</h2>
                <p>
                  {selectedTransaction.student_name} · {selectedTransaction.batch_name}
                </p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setEditPaymentOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={savePaymentEdit}>
              <div className={styles.formGrid}>
                <label>
                  <span>Amount USD *</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editPaymentForm.amount_usd}
                    onChange={(event) =>
                      setEditPaymentForm({
                        ...editPaymentForm,
                        amount_usd: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Payment Date *</span>
                  <input
                    type="date"
                    value={editPaymentForm.payment_date}
                    onChange={(event) =>
                      setEditPaymentForm({
                        ...editPaymentForm,
                        payment_date: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  <span>Payment Mode *</span>
                  <select
                    value={editPaymentForm.payment_mode}
                    onChange={(event) =>
                      setEditPaymentForm({
                        ...editPaymentForm,
                        payment_mode: event.target.value,
                      })
                    }
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Reference / Transaction ID</span>
                  <input
                    value={editPaymentForm.reference}
                    onChange={(event) =>
                      setEditPaymentForm({
                        ...editPaymentForm,
                        reference: event.target.value,
                      })
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className={styles.correctionNotice}>
                Orbit keeps the previous transaction values in the payment correction log.
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setEditPaymentOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={savingCorrection}
                >
                  {savingCorrection ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletePaymentOpen && selectedTransaction && (
        <div className={styles.backdrop}>
          <div className={`${styles.modal} ${styles.confirmDeleteModal}`}>
            <div className={styles.simpleConfirmBody}>
              <h2>Are you sure you want to delete this payment?</h2>
              <p>
                {selectedTransaction.student_name} · {money(selectedTransaction.amount_usd)} · {selectedTransaction.payment_date}
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setDeletePaymentOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                disabled={savingCorrection}
                onClick={confirmDeletePayment}
              >
                {savingCorrection ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePlanOpen && selectedOutstanding && (
        <div className={styles.backdrop}>
          <div className={`${styles.modal} ${styles.confirmDeleteModal}`}>
            <div className={styles.simpleConfirmBody}>
              <h2>Delete this payment plan?</h2>
              <p>
                {selectedOutstanding.student_name} · {selectedOutstanding.batch_name} · {money(selectedOutstanding.total_fee_usd)}
              </p>
              <span className={styles.planDeleteNote}>
                This removes the outstanding balance only. The student stays in the batch.
              </span>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setDeletePlanOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={confirmDeletePlan}
                disabled={deletingPlan}
              >
                {deletingPlan ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletedPaymentsOpen && role === "super_admin" && (
        <div className={styles.backdrop}>
          <div className={`${styles.modal} ${styles.deletedPaymentsModal}`}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Deleted Payments</h2>
                <p>Super Admin audit history · view only</p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setDeletedPaymentsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.deletedPaymentsBody}>
              {deletedLoading ? (
                <div className={styles.empty}>Loading deleted payments...</div>
              ) : deletedPayments.length === 0 ? (
                <div className={styles.empty}>No deleted payments found.</div>
              ) : (
                <div className={styles.tableWrap}>
                  <table aria-label="Deleted payments audit history">
                    <thead>
                      <tr>
                        <th data-sno>S.No</th>
                        <th>Deleted</th>
                        <th>Student</th>
                        <th>Batch</th>
                        <th>Payment Date</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Reference</th>
                        <th>Deleted By</th>
                        <th>Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedPayments.map((row, index) => (
                        <tr key={row.correction_id}>
                          <td data-sno>{index + 1}</td>
                          <td>{new Date(row.deleted_at).toLocaleString()}</td>
                          <td>
                            <strong>{row.student_name}</strong>
                            <small>{row.course_name}</small>
                          </td>
                          <td>{row.batch_name}</td>
                          <td>{row.payment_date}</td>
                          <td><strong>{money(row.amount_usd)}</strong></td>
                          <td>{row.payment_mode}</td>
                          <td>{row.reference || "—"}</td>
                          <td>{row.deleted_by_email || row.deleted_by || "Unknown"}</td>
                          <td><small>{row.transaction_id}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setDeletedPaymentsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
