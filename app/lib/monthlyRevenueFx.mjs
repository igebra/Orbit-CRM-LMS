/** Indicative monthly totals using a SINGLE dated USD-base reference-rate snapshot.
 * Never writes to CRM data and never claims FX settlement/accounting accuracy.
 */
export const CONVERTIBLE_CURRENCIES = Object.freeze(["USD","INR","AED","SGD","THB","AUD","NZD"]);

export function validateUsdFxRates(rates) {
  if(!rates || typeof rates!=="object") return false;
  return CONVERTIBLE_CURRENCIES.every(currency => Number.isFinite(rates[currency]) && rates[currency] > 0)
    && Math.abs(rates.USD - 1) < 0.000001;
}

/** Returns null when a rate is missing, to avoid misleading partial revenue. */
export function monthlyRevenueEquivalent(payments, usdBaseRates) {
  const active=payments.filter(p=>!p.voided_at);
  if (active.length===0) return {usd:0,inr:0,receipts:0};
  if(!validateUsdFxRates(usdBaseRates))return null;
  let usd=0;
  for(const payment of active){
    const currency=String(payment.currency || "");
    const amount=Number(payment.amount_received);
    if(!CONVERTIBLE_CURRENCIES.includes(currency) || !Number.isFinite(amount) || amount < 0) return null;
    usd+=amount/usdBaseRates[currency];
  }
  return {usd,inr:usd*usdBaseRates.INR,receipts:active.length};
}
