from pathlib import Path

page_path = Path("app/payments/page.tsx")
css_path = Path("app/payments/payments.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

old_open = '''  function openDeletePayment(row: Transaction) {
    setSelectedTransaction(row);
    setDeletePaymentOpen(true);
  }'''
new_open = '''  function openDeletePayment(row: Transaction) {
    setMessage("");
    setSelectedTransaction(row);
    setDeletePaymentOpen(true);
  }'''
if old_open in page:
    page = page.replace(old_open, new_open, 1)

old_delete = '''  async function confirmDeletePayment() {
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
  }'''

new_delete = '''  async function confirmDeletePayment() {
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
  }'''

if old_delete in page:
    page = page.replace(old_delete, new_delete, 1)
elif 'p_reason: "Deleted from Orbit"' not in page:
    raise SystemExit("Could not patch confirmDeletePayment().")

page_path.write_text(page, encoding="utf-8")

marker = "/* ORBIT PAYMENT DELETE REPAIR - SLEEK CONFIRM */"
if marker not in css:
    css += r'''

/* ORBIT PAYMENT DELETE REPAIR - SLEEK CONFIRM */
.confirmDeleteModal{
  width:min(390px,90vw);
  border-radius:14px;
}

.simpleConfirmBody{
  padding:22px 22px 16px;
  text-align:center;
}

.simpleConfirmBody h2{
  margin:0;
  color:#173637;
  font-size:15px;
  font-weight:800;
  line-height:1.35;
}

.simpleConfirmBody p{
  margin:8px 0 0;
  color:#7b8988;
  font-size:9.5px;
  line-height:1.35;
}

.confirmDeleteModal .modalFooter{
  padding:10px 14px 14px;
  border-top:0;
  justify-content:center;
  gap:8px;
}

.confirmDeleteModal .secondary,
.confirmDeleteModal .confirmDeleteButton{
  min-width:92px;
  height:36px;
  padding:0 14px;
  border-radius:8px;
  font-size:10.5px;
  font-weight:800;
}

.confirmDeleteModal .confirmDeleteButton{
  background:#c9574e;
  border-color:#c9574e;
}

.confirmDeleteModal .secondary{
  background:#fff;
}
'''

css_path.write_text(css, encoding="utf-8")

print("Applied payment delete repair.")
print("- robust RPC fallback")
print("- compact confirmation popup")
print("- no CRM data/code changes")
