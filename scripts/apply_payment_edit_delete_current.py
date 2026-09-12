from pathlib import Path

page_path = Path("app/payments/page.tsx")
css_path = Path("app/payments/payments.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# State for edit/delete
# ------------------------------------------------------------
state_anchor = '''  const [paymentOpen, setPaymentOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);'''

state_new = '''  const [paymentOpen, setPaymentOpen] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [deletePaymentOpen, setDeletePaymentOpen] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount_usd: "",
    payment_date: "",
    payment_mode: "Zelle",
    reference: "",
  });
  const [deleteReason, setDeleteReason] = useState("");'''

if "editPaymentOpen" not in page:
    if state_anchor not in page:
        raise SystemExit("Could not locate payment state block.")
    page = page.replace(state_anchor, state_new, 1)

# ------------------------------------------------------------
# Functions
# ------------------------------------------------------------
func_anchor = '''  function exportCsv() {'''

funcs = r'''  function openEditPayment(row: Transaction) {
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

if "function openEditPayment(" not in page:
    if func_anchor not in page:
        raise SystemExit("Could not locate exportCsv function.")
    page = page.replace(func_anchor, funcs + func_anchor, 1)

# ------------------------------------------------------------
# Transactions table Actions column
# ------------------------------------------------------------
header_old = '''                  <th>Mode</th>
                  <th>Reference</th>
                </tr>'''

header_new = '''                  <th>Mode</th>
                  <th>Reference</th>
                  {canManageFinance && <th>Actions</th>}
                </tr>'''

if header_old in page:
    page = page.replace(header_old, header_new, 1)
elif "canManageFinance && <th>Actions</th>" not in page:
    raise SystemExit("Could not patch Transactions header.")

page = page.replace(
'''                    <td colSpan={8} className={styles.empty}>
                      No transactions found.
                    </td>''',
'''                    <td colSpan={canManageFinance ? 9 : 8} className={styles.empty}>
                      No transactions found.
                    </td>''',
1
)

row_old = '''                      <td>{row.payment_mode}</td>
                      <td>{row.reference || "—"}</td>
                    </tr>'''

row_new = '''                      <td>{row.payment_mode}</td>
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
                    </tr>'''

if row_old in page:
    page = page.replace(row_old, row_new, 1)
elif "openDeletePayment(row)" not in page:
    raise SystemExit("Could not patch Transactions row.")

# ------------------------------------------------------------
# Modals: insert after Add Payment modal, before final root close
# ------------------------------------------------------------
modal_anchor = '''      )}
    </div>
  );
}'''

modals = r'''      )}

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
    </div>
  );
}'''

if "editPaymentOpen && selectedTransaction" not in page:
    if modal_anchor not in page:
        raise SystemExit("Could not locate final modal anchor.")
    page = page.replace(modal_anchor, modals, 1)

page_path.write_text(page, encoding="utf-8")

# ------------------------------------------------------------
# Styling
# ------------------------------------------------------------
marker = "/* ORBIT PAYMENT EDIT DELETE */"
if marker not in css:
    css += r'''

/* ORBIT PAYMENT EDIT DELETE */
.transactionActions{
  display:flex;
  gap:6px;
  align-items:center;
  white-space:nowrap;
}

.editPaymentButton,
.deletePaymentButton{
  height:29px;
  padding:0 9px;
  border-radius:7px;
  font-size:9.5px;
  font-weight:850;
  cursor:pointer;
}

.editPaymentButton{
  border:1px solid #b8d3cf;
  background:#eef8f6;
  color:#176466;
}

.editPaymentButton:hover{
  border-color:#74AFAD;
  background:#e5f4f2;
}

.deletePaymentButton{
  border:1px solid #efc3bd;
  background:#fff4f2;
  color:#a74b42;
}

.deletePaymentButton:hover{
  border-color:#df948b;
  background:#ffeae7;
}

.correctionNotice{
  margin:0 20px 14px;
  padding:9px 11px;
  border:1px solid #cfe0dd;
  border-radius:9px;
  background:#f4faf9;
  color:#607775;
  font-size:10px;
}

.deleteWarning{
  margin:18px 20px 0;
  padding:12px;
  border:1px solid #efc3bd;
  border-radius:10px;
  background:#fff5f3;
}

.deleteWarning strong,
.deleteWarning span{
  display:block;
}

.deleteWarning strong{
  color:#97443c;
  font-size:12px;
}

.deleteWarning span{
  margin-top:5px;
  color:#766662;
  font-size:10px;
  line-height:1.5;
}

.correctionTextarea{
  width:100%;
  min-height:92px;
  resize:vertical;
  border:1px solid #ccd9d6;
  border-radius:9px;
  padding:10px;
  background:#fff;
  color:#173637;
  font:inherit;
}

.confirmDeleteButton{
  border:1px solid #b74c43;
  border-radius:9px;
  padding:10px 13px;
  background:#c9584e;
  color:#fff;
  font-weight:850;
  cursor:pointer;
}

.confirmDeleteButton:disabled{
  opacity:.55;
  cursor:not-allowed;
}
'''

css_path.write_text(css, encoding="utf-8")

print("Orbit Payment Edit/Delete UI applied.")
print("Current Batch/Student selector and Paid in Full logic preserved.")
print("CRM Leads untouched.")
