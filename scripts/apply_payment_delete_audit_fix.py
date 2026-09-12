from pathlib import Path

page_path = Path("app/payments/page.tsx")
css_path = Path("app/payments/payments.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

type_anchor = '''type PaymentEntryOption = {
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

type_new = type_anchor + '''
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
'''

if "type DeletedPayment =" not in page:
    if type_anchor not in page:
        raise SystemExit("Could not locate PaymentEntryOption type.")
    page = page.replace(type_anchor, type_new, 1)

old_state = '''  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
'''
new_state = '''  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false);
  const [deletedPaymentsOpen, setDeletedPaymentsOpen] = useState(false);
  const [deletedPayments, setDeletedPayments] = useState<DeletedPayment[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
'''

if "deletedPaymentsOpen" not in page:
    if old_state not in page:
        raise SystemExit("Could not locate payment correction state.")
    page = page.replace(old_state, new_state, 1)

page = page.replace('  const [deleteReason, setDeleteReason] = useState("");\n', '', 1)

old_delete_funcs = '''  function openDeletePayment(row: Transaction) {
    setSelectedTransaction(row);
    setDeleteReason("");
    setDeletePaymentOpen(true);
  }

  async function confirmDeletePayment(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedTransaction) return;

    if (!deleteReason.trim()) {
      setMessage("Enter a reason for deleting this payment.");
      return;
    }

    setSavingCorrection(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_payment_transaction", {
      p_transaction_id: selectedTransaction.transaction_id,
      p_reason: deleteReason.trim(),
    });

    setSavingCorrection(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDeletePaymentOpen(false);
    setSelectedTransaction(null);
    setDeleteReason("");
    setMessage("Payment deleted. The correction has been logged.");
    await loadReports(from, to);
  }
'''

new_delete_funcs = '''  function openDeletePayment(row: Transaction) {
    setSelectedTransaction(row);
    setDeletePaymentOpen(true);
  }

  async function confirmDeletePayment() {
    if (!selectedTransaction) return;

    setSavingCorrection(true);
    setMessage("");

    const { error } = await supabase.rpc("delete_payment_transaction", {
      p_transaction_id: selectedTransaction.transaction_id,
    });

    setSavingCorrection(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDeletePaymentOpen(false);
    setSelectedTransaction(null);
    setMessage("Payment deleted successfully.");
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
'''

if old_delete_funcs in page:
    page = page.replace(old_delete_funcs, new_delete_funcs, 1)
elif 'p_reason: deleteReason.trim()' in page:
    raise SystemExit("Could not replace delete function.")
elif "openDeletedPayments" not in page:
    raise SystemExit("Unexpected delete function shape.")

header_anchor = '''            {canManageFinance && (
              <button className={styles.primary} onClick={openManualPayment}>
                + Add Payment
              </button>
            )}

            <button
              className={styles.secondary}
              onClick={exportCsv}
'''

header_new = '''            {canManageFinance && (
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
'''

if "Deleted Payments" not in page:
    if header_anchor not in page:
        raise SystemExit("Could not locate Payments header actions.")
    page = page.replace(header_anchor, header_new, 1)

old_modal = '''      {deletePaymentOpen && selectedTransaction && (
        <div className={styles.backdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Delete Payment</h2>
                <p>
                  {selectedTransaction.student_name} · {money(selectedTransaction.amount_usd)}
                </p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setDeletePaymentOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={confirmDeletePayment}>
              <div className={styles.deleteWarning}>
                <strong>Delete this payment transaction?</strong>
                <span>
                  It will be removed from collection totals and pending balance will
                  recalculate. A correction record will be kept for audit purposes.
                </span>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.full}>
                  <span>Reason for deletion *</span>
                  <textarea
                    className={styles.correctionTextarea}
                    value={deleteReason}
                    onChange={(event) => setDeleteReason(event.target.value)}
                    placeholder="Example: Duplicate payment / wrong student / entered by mistake"
                  />
                </label>
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
                  type="submit"
                  className={styles.confirmDeleteButton}
                  disabled={savingCorrection}
                >
                  {savingCorrection ? "Deleting..." : "Delete Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
'''

new_modal = '''      {deletePaymentOpen && selectedTransaction && (
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
'''

if old_modal in page:
    page = page.replace(old_modal, new_modal, 1)
elif "Reason for deletion" in page:
    raise SystemExit("Could not replace delete modal.")
elif "deletedPaymentsModal" not in page:
    raise SystemExit("Unexpected delete modal shape.")

page_path.write_text(page, encoding="utf-8")

marker = "/* ORBIT SIMPLE DELETE + SUPERADMIN AUDIT */"
if marker not in css:
    css += r'''

/* ORBIT SIMPLE DELETE + SUPERADMIN AUDIT */
.confirmDeleteModal{
  width:min(470px,92vw);
}

.simpleConfirmBody{
  padding:28px 24px 12px;
  text-align:center;
}

.simpleConfirmBody h2{
  margin:0;
  color:#173637;
  font-size:20px;
  line-height:1.3;
}

.simpleConfirmBody p{
  margin:10px 0 0;
  color:#72817f;
  font-size:11px;
}

.deletedPaymentsModal{
  width:min(1280px,96vw);
  max-height:88vh;
}

.deletedPaymentsBody{
  padding:14px 18px;
  overflow:auto;
  min-height:180px;
}

.deletedPaymentsBody table{
  min-width:1050px;
}
'''

css_path.write_text(css, encoding="utf-8")

print("Payment delete confirmation + Super Admin deleted-payment audit applied.")
print("No CRM code or lead data changed.")
