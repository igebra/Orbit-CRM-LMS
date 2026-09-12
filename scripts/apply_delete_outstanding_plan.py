from pathlib import Path

page_path = Path("app/payments/page.tsx")
css_path = Path("app/payments/payments.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# 1) State
# ------------------------------------------------------------
state_anchor = '''  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false);
  const [deletedPaymentsOpen, setDeletedPaymentsOpen] = useState(false);'''

state_new = '''  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [selectedOutstanding, setSelectedOutstanding] = useState<Outstanding | null>(null);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [deletedPaymentsOpen, setDeletedPaymentsOpen] = useState(false);'''

if "deletePlanOpen" not in page:
    if state_anchor not in page:
        raise SystemExit("Could not locate payment modal state.")
    page = page.replace(state_anchor, state_new, 1)

# ------------------------------------------------------------
# 2) Functions
# ------------------------------------------------------------
func_anchor = '''  async function openDeletedPayments() {'''

funcs = r'''  function openDeletePlan(row: Outstanding) {
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

'''

if "function openDeletePlan(" not in page:
    if func_anchor not in page:
        raise SystemExit("Could not locate deleted payment function anchor.")
    page = page.replace(func_anchor, funcs + func_anchor, 1)

# ------------------------------------------------------------
# 3) Current Outstanding table actions
# ------------------------------------------------------------
header_old = '''                  <th>Next Due</th>
                  <th>Status</th>
                </tr>'''

header_new = '''                  <th>Next Due</th>
                  <th>Status</th>
                  {canManageFinance && <th>Actions</th>}
                </tr>'''

if header_old in page:
    page = page.replace(header_old, header_new, 1)
elif "{canManageFinance && <th>Actions</th>}" not in page:
    raise SystemExit("Could not patch Current Outstanding header.")

page = page.replace(
'''                    <td colSpan={8} className={styles.empty}>
                      No payment plans configured.
                    </td>''',
'''                    <td colSpan={canManageFinance ? 9 : 8} className={styles.empty}>
                      No payment plans configured.
                    </td>''',
1
)

row_old = '''                      <td>
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
                    </tr>'''

row_new = '''                      <td>
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
                    </tr>'''

if row_old in page:
    page = page.replace(row_old, row_new, 1)
elif "openDeletePlan(row)" not in page:
    raise SystemExit("Could not patch Current Outstanding row.")

# ------------------------------------------------------------
# 4) Delete plan confirmation modal
# ------------------------------------------------------------
modal_anchor = '''      {deletedPaymentsOpen && role === "super_admin" && ('''

plan_modal = r'''      {deletePlanOpen && selectedOutstanding && (
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

'''

if "deletePlanOpen && selectedOutstanding" not in page:
    if modal_anchor not in page:
        raise SystemExit("Could not locate Super Admin deleted-payments modal.")
    page = page.replace(modal_anchor, plan_modal + modal_anchor, 1)

page_path.write_text(page, encoding="utf-8")

# ------------------------------------------------------------
# 5) Styling
# ------------------------------------------------------------
marker = "/* ORBIT DELETE OUTSTANDING PLAN */"
if marker not in css:
    css += r'''

/* ORBIT DELETE OUTSTANDING PLAN */
.deletePlanButton{
  height:29px;
  padding:0 9px;
  border:1px solid #efc3bd;
  border-radius:7px;
  background:#fff4f2;
  color:#a74b42;
  font-size:9.5px;
  font-weight:850;
  cursor:pointer;
  white-space:nowrap;
}

.deletePlanButton:hover{
  border-color:#df948b;
  background:#ffeae7;
}

.planDeleteNote{
  display:block;
  max-width:320px;
  margin:8px auto 0;
  color:#8a9695;
  font-size:9px;
  line-height:1.4;
}
'''

css_path.write_text(css, encoding="utf-8")

print("Outstanding payment-plan delete option applied.")
print("CRM leads untouched.")
