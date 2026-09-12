"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import OrbitSidebar from "../components/OrbitSidebar";
import styles from "./payments.module.css";

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

      await loadReports(defaultRange.from, defaultRange.to);
    }

    init();
  }, [router]);

  async function loadReports(dateFrom = from, dateTo = to) {
    setLoading(true);
    setMessage("");

    const marketingRange = getPresetRange("month");
    const effectiveFrom = role === "marketing" ? marketingRange.from : dateFrom;
    const effectiveTo = role === "marketing" ? marketingRange.to : dateTo;

    if (role === "marketing") {
      setPreset("month");
      setFrom(marketingRange.from);
      setTo(marketingRange.to);
    }

    const [transactionResult, outstandingResult, paymentOptionResult] = await Promise.all([
      supabase.rpc("payment_report_transactions", {
        p_from: effectiveFrom,
        p_to: effectiveTo,
      }),
      supabase.rpc("payment_outstanding_report"),
      supabase.rpc("payment_entry_options"),
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
    setPaymentOpen(true);
  }

  async function saveManualPayment(event: React.FormEvent) {
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

    const amount = Number(paymentForm.amount_usd);

    if (!amount || amount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    if (!paymentForm.payment_date) {
      setMessage("Payment Date is required.");
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
      setMessage(error.message);
      return;
    }

    setPaymentOpen(false);
    setMessage("Payment recorded successfully.");
    await loadReports(from, to);
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

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>FINANCE · PAYMENTS</p>
            <h1>Payments</h1>
            <p>
              Collections, payment modes, pending fees and transaction history.
            </p>
          </div>

          <div className={styles.headerActions}>
            {canManageFinance && (
              <button className={styles.primary} onClick={openManualPayment}>
                + Add Payment
              </button>
            )}

            {role === "super_admin" && (
              <button
                type="button"
                className={styles.secondary}
                onClick={openDeletedPayments}
              >
                Deleted Payments
              </button>
            )}

            <button
              className={styles.secondary}
              onClick={exportCsv}
              disabled={filteredTransactions.length === 0}
            >
              Export CSV
            </button>
          </div>
        </header>

        {isMarketing ? (
          <section className={styles.periodCard}>
            <div>
              <strong>Marketing Payment View</strong>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280" }}>
                Current month payments only. Historical periods, outstanding balances
                and payment editing are restricted.
              </p>
            </div>
            <div className={styles.dateRange}>
              <span style={{ fontSize: 11, fontWeight: 800 }}>
                {from} → {to}
              </span>
            </div>
          </section>
        ) : (
        <section className={styles.periodCard}>
          <div className={styles.presetButtons}>
            <button
              className={preset === "week" ? styles.activePreset : ""}
              onClick={() => applyPreset("week")}
            >
              This Week
            </button>
            <button
              className={preset === "month" ? styles.activePreset : ""}
              onClick={() => applyPreset("month")}
            >
              This Month
            </button>
            <button
              className={preset === "quarter" ? styles.activePreset : ""}
              onClick={() => applyPreset("quarter")}
            >
              This Quarter
            </button>
            <button
              className={preset === "half" ? styles.activePreset : ""}
              onClick={() => applyPreset("half")}
            >
              Half-Year
            </button>
            <button
              className={preset === "year" ? styles.activePreset : ""}
              onClick={() => applyPreset("year")}
            >
              This Year
            </button>
            <button
              className={preset === "custom" ? styles.activePreset : ""}
              onClick={() => applyPreset("custom")}
            >
              Custom
            </button>
          </div>

          <div className={styles.dateRange}>
            <label>
              <span>From</span>
              <input
                type="date"
                value={from}
                onChange={(event) => {
                  setPreset("custom");
                  setFrom(event.target.value);
                }}
              />
            </label>

            <label>
              <span>To</span>
              <input
                type="date"
                value={to}
                onChange={(event) => {
                  setPreset("custom");
                  setTo(event.target.value);
                }}
              />
            </label>

            <button
              className={styles.primary}
              onClick={() => loadReports()}
              disabled={loading}
            >
              {loading ? "Loading..." : "Apply"}
            </button>
          </div>
        </section>

        )}

        {message && <div className={styles.message}>{message}</div>}

        <section className={styles.stats}>
          <div>
            <span>Collected in Period</span>
            <strong>{money(collected)}</strong>
            <small>{from} → {to}</small>
          </div>
          <div>
            <span>Transactions</span>
            <strong>{transactions.length}</strong>
            <small>Selected period</small>
          </div>
          {!isMarketing && (
            <>
              <div>
                <span>Current Pending</span>
                <strong>{money(pending)}</strong>
                <small>All active payment plans</small>
              </div>
              <div>
                <span>Current Overdue</span>
                <strong>{money(overdue)}</strong>
                <small>{outstanding.filter((row) => row.payment_status === "Overdue").length} students</small>
              </div>
            </>
          )}
        </section>

        <section className={styles.breakdownGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Payment Modes</h2>
                <p>Collections in selected period</p>
              </div>
            </div>

            <div className={styles.breakdownList}>
              {modes.length === 0 ? (
                <div className={styles.empty}>No payments in this period.</div>
              ) : (
                modes.map(([mode, amount]) => (
                  <div key={mode}>
                    <span>{mode}</span>
                    <strong>{money(amount)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Batch Collections</h2>
                <p>Which batches generated collections</p>
              </div>
            </div>

            <div className={styles.breakdownList}>
              {batches.length === 0 ? (
                <div className={styles.empty}>No collections in this period.</div>
              ) : (
                batches.slice(0, 10).map(([batch, amount]) => (
                  <div key={batch}>
                    <span>{batch}</span>
                    <strong>{money(amount)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {!isMarketing && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Payment Plans</h2>
                <p>Current student plan mix</p>
              </div>
            </div>

            <div className={styles.breakdownList}>
              {plans.length === 0 ? (
                <div className={styles.empty}>No payment plans configured.</div>
              ) : (
                plans.map(([plan, count]) => (
                  <div key={plan}>
                    <span>{plan}</span>
                    <strong>{count}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Transactions</h2>
              <p>Detailed payment report for the selected period</p>
            </div>

            <input
              className={styles.search}
              type="search"
              placeholder="Search student, batch, mode..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Course</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  {canManageFinance && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={canManageFinance ? 9 : 8} className={styles.empty}>
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((row) => (
                    <tr key={row.transaction_id}>
                      <td>
                        {new Date(
                          `${row.payment_date}T00:00:00`
                        ).toLocaleDateString()}
                      </td>
                      <td><strong>{row.student_name}</strong></td>
                      <td>{row.batch_name}</td>
                      <td>{row.course_name}</td>
                      <td>{row.payment_plan}</td>
                      <td><strong>{money(row.amount_usd)}</strong></td>
                      <td>{row.payment_mode}</td>
                      <td>{row.reference || "—"}</td>
                      {canManageFinance && (
                        <td>
                          <div className={styles.transactionActions}>
                            <button
                              type="button"
                              className={styles.editPaymentButton}
                              onClick={() => openEditPayment(row)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.deletePaymentButton}
                              onClick={() => openDeletePayment(row)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {!isMarketing && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Current Outstanding</h2>
              <p>Pending fees and the next payment due</p>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Plan</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Next Due</th>
                  <th>Status</th>
                  {canManageFinance && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {outstanding.length === 0 ? (
                  <tr>
                    <td colSpan={canManageFinance ? 9 : 8} className={styles.empty}>
                      No payment plans configured.
                    </td>
                  </tr>
                ) : (
                  outstanding.map((row) => (
                    <tr key={row.finance_id}>
                      <td><strong>{row.student_name}</strong></td>
                      <td>
                        {row.batch_name}
                        <small>{row.course_name}</small>
                      </td>
                      <td>{row.payment_plan}</td>
                      <td>{money(row.total_fee_usd)}</td>
                      <td>{money(row.total_paid_usd)}</td>
                      <td><strong>{money(row.pending_usd)}</strong></td>
                      <td>
                        <strong>{row.next_due_label}</strong>
                        <small>{row.next_due_date || "Date pending"}</small>
                      </td>
                      <td>
                        <span
                          className={`${styles.status} ${
                            row.payment_status === "Overdue"
                              ? styles.overdue
                              : row.payment_status === "Due Soon"
                              ? styles.dueSoon
                              : row.payment_status === "Paid"
                              ? styles.paid
                              : ""
                          }`}
                        >
                          {row.payment_status}
                        </span>
                      </td>
                      {canManageFinance && (
                        <td>
                          <button
                            type="button"
                            className={styles.deletePlanButton}
                            onClick={() => openDeletePlan(row)}
                          >
                            Delete Plan
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}
      </main>

      {paymentOpen && (
        <div className={styles.backdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Add Payment</h2>
                <p>Record a payment received manually.</p>
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
                          onChange={(event)=>{
                            const value=event.target.value;
                            setPaymentForm({
                              ...paymentForm,
                              setup_total_fee_usd:value,
                              ...(paymentForm.setup_payment_plan==="Paid in Full"
                                ? {
                                    setup_installment_amount_usd:value,
                                    amount_usd:value,
                                  }
                                : {})
                            });
                          }}
                          placeholder="0.00"
                        />
                      </label>

                      <label>
                        <span>Payment Plan *</span>
                        <select
                          value={paymentForm.setup_payment_plan}
                          onChange={(event)=>{
                            const plan=event.target.value;
                            setPaymentForm({
                              ...paymentForm,
                              setup_payment_plan:plan,
                              ...(plan==="Paid in Full"
                                ? {
                                    setup_installment_amount_usd:paymentForm.setup_total_fee_usd,
                                    amount_usd:paymentForm.setup_total_fee_usd,
                                  }
                                : {})
                            });
                          }}
                        >
                          <option>After Every 4 Classes</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Half-yearly</option>
                          <option>Yearly</option>
                          <option>Paid in Full</option>
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
                          readOnly={paymentForm.setup_payment_plan==="Paid in Full"}
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
                )}

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
                  disabled={savingPayment}
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
                  <table>
                    <thead>
                      <tr>
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
                      {deletedPayments.map((row) => (
                        <tr key={row.correction_id}>
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
