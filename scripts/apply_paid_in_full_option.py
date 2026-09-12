from pathlib import Path

payments_path = Path("app/payments/page.tsx")
batch_path = Path("app/batches/[id]/page.tsx")

for p in (payments_path, batch_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

payments = payments_path.read_text(encoding="utf-8")
batch = batch_path.read_text(encoding="utf-8")

old = '''                          <option>After Every 4 Classes</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Half-yearly</option>
                          <option>Yearly</option>
                          <option>Custom</option>'''

new = '''                          <option>After Every 4 Classes</option>
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Half-yearly</option>
                          <option>Yearly</option>
                          <option>Paid in Full</option>
                          <option>Custom</option>'''

if old in payments:
    payments = payments.replace(old, new, 1)
elif "<option>Paid in Full</option>" not in payments:
    raise SystemExit("Could not locate payment plan dropdown in Payments page.")

old_total_change = '''                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_total_fee_usd:event.target.value
                          })}'''

new_total_change = '''                          onChange={(event)=>{
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
                          }}'''

if old_total_change in payments:
    payments = payments.replace(old_total_change, new_total_change, 1)

old_plan_change = '''                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_payment_plan:event.target.value
                          })}'''

new_plan_change = '''                          onChange={(event)=>{
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
                          }}'''

if old_plan_change in payments:
    payments = payments.replace(old_plan_change, new_plan_change, 1)

old_installment = '''                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_installment_amount_usd:event.target.value
                          })}
                          placeholder="0.00"'''

new_installment = '''                          onChange={(event)=>setPaymentForm({
                            ...paymentForm,
                            setup_installment_amount_usd:event.target.value
                          })}
                          readOnly={paymentForm.setup_payment_plan==="Paid in Full"}
                          placeholder="0.00"'''

if old_installment in payments:
    payments = payments.replace(old_installment, new_installment, 1)

payments_path.write_text(payments, encoding="utf-8")

old_const = '''const PAYMENT_PLANS = [
  "After Every 4 Classes","Monthly","Quarterly","Half-yearly","Yearly","Custom"
];'''

new_const = '''const PAYMENT_PLANS = [
  "After Every 4 Classes","Monthly","Quarterly","Half-yearly","Yearly","Paid in Full","Custom"
];'''

if old_const in batch:
    batch = batch.replace(old_const, new_const, 1)
elif '"Paid in Full"' not in batch:
    raise SystemExit("Could not locate PAYMENT_PLANS in batch detail.")

old_select = '''<label><span>Payment Plan</span><select value={financeForm.payment_plan} onChange={e=>setFinanceForm({...financeForm,payment_plan:e.target.value})}>{PAYMENT_PLANS.map(x=><option key={x}>{x}</option>)}</select></label>'''
new_select = '''<label><span>Payment Plan</span><select value={financeForm.payment_plan} onChange={e=>{
              const plan=e.target.value;
              setFinanceForm({
                ...financeForm,
                payment_plan:plan,
                installment_amount_usd:plan==="Paid in Full"?financeForm.total_fee_usd:financeForm.installment_amount_usd
              });
            }}>{PAYMENT_PLANS.map(x=><option key={x}>{x}</option>)}</select></label>'''

if old_select in batch:
    batch = batch.replace(old_select, new_select, 1)

old_fee_input = '''<label><span>Total Fee (USD)</span><input type="number" min="0" step="0.01" value={financeForm.total_fee_usd} onChange={e=>setFinanceForm({...financeForm,total_fee_usd:e.target.value})}/></label>'''
new_fee_input = '''<label><span>Total Fee (USD)</span><input type="number" min="0" step="0.01" value={financeForm.total_fee_usd} onChange={e=>{
              const value=e.target.value;
              setFinanceForm({
                ...financeForm,
                total_fee_usd:value,
                ...(financeForm.payment_plan==="Paid in Full"?{installment_amount_usd:value}:{})
              });
            }}/></label>'''

if old_fee_input in batch:
    batch = batch.replace(old_fee_input, new_fee_input, 1)

old_install = '''<label><span>Installment Amount (USD)</span><input type="number" min="0" step="0.01" value={financeForm.installment_amount_usd} onChange={e=>setFinanceForm({...financeForm,installment_amount_usd:e.target.value})}/></label>'''
new_install = '''<label><span>{financeForm.payment_plan==="Paid in Full"?"Full Payment Amount (USD)":"Installment Amount (USD)"}</span><input type="number" min="0" step="0.01" value={financeForm.installment_amount_usd} readOnly={financeForm.payment_plan==="Paid in Full"} onChange={e=>setFinanceForm({...financeForm,installment_amount_usd:e.target.value})}/></label>'''

if old_install in batch:
    batch = batch.replace(old_install, new_install, 1)

batch_path.write_text(batch, encoding="utf-8")

print("Paid in Full option added.")
print("No CRM code/data changed.")
