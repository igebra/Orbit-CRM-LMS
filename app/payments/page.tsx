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
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    finance_id: "",
    amount_usd: "",
    payment_date: localIso(new Date()),
    payment_mode: "Zelle",
    reference: "",
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

    const [transactionResult, outstandingResult] = await Promise.all([
      supabase.rpc("payment_report_transactions", {
        p_from: effectiveFrom,
        p_to: effectiveTo,
      }),
      supabase.rpc("payment_outstanding_report"),
    ]);

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


  function openManualPayment() {
    const firstOutstanding = outstanding.find((row) => Number(row.pending_usd || 0) > 0);

    setPaymentForm({
      finance_id: firstOutstanding?.finance_id || "",
      amount_usd: "",
      payment_date: localIso(new Date()),
      payment_mode: "Zelle",
      reference: "",
    });

    setPaymentOpen(true);
  }

  async function saveManualPayment(event: React.FormEvent) {
    event.preventDefault();

    if (!paymentForm.finance_id) {
      setMessage("Select a student / batch.");
      return;
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
      finance_id: paymentForm.finance_id,
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
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
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
                </tr>
              </thead>
              <tbody>
                {outstanding.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
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
                <label className={styles.full}>
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
                </label>

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
    </div>
  );
}
