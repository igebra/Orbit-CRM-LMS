/** Supported native receipt currencies. This module NEVER converts amounts. */
export const PAYMENT_CURRENCIES = Object.freeze([
  {code:"USD",symbol:"$",country:"United States",name:"US Dollar",locale:"en-US"},
  {code:"INR",symbol:"₹",country:"India",name:"Indian Rupee",locale:"en-IN"},
  {code:"AED",symbol:"د.إ",country:"United Arab Emirates (Dubai)",name:"UAE Dirham",locale:"en-AE"},
  {code:"SGD",symbol:"S$",country:"Singapore",name:"Singapore Dollar",locale:"en-SG"},
  {code:"THB",symbol:"฿",country:"Thailand",name:"Thai Baht",locale:"th-TH"},
  {code:"AUD",symbol:"A$",country:"Australia",name:"Australian Dollar",locale:"en-AU"},
  {code:"NZD",symbol:"NZ$",country:"New Zealand",name:"New Zealand Dollar",locale:"en-NZ"},
]);

const byCode = new Map(PAYMENT_CURRENCIES.map(item=>[item.code,item]));

export function currencySymbol(currency){
  return byCode.get(currency)?.symbol || String(currency ?? "");
}
export function currencyOptionLabel(item){
  return `${item.code} (${item.symbol}) — ${item.name} · ${item.country}`;
}

/** Always identify foreign-dollar currencies unambiguously in reports. */
export function formatPaymentAmount(value,currency) {
  const code = String(currency || "USD").toUpperCase();
  const option=byCode.get(code);
  const amount=Number(value||0);
  if (!Number.isFinite(amount)) return `${code} —`;
  try{
    return new Intl.NumberFormat(option?.locale||"en-US",{
      style:"currency",currency:code,
      currencyDisplay:["INR","USD"].includes(code)?"symbol":"code",
      minimumFractionDigits:2,maximumFractionDigits:2,
    }).format(amount);
  }catch{
    return `${code} ${amount.toFixed(2)}`;
  }
}

/** Never add payments denominated in different currencies to one numeric total. */
export function sumPaymentsByCurrency(payments) {
  const totals=Object.fromEntries(PAYMENT_CURRENCIES.map(item=>[item.code,0]));
  for(const item of payments){
    if(item.voided_at)continue;
    const currency=String(item.currency||"");
    const value=Number(item.amount_received);
    if (!currency || !Number.isFinite(value))continue;
    totals[currency]=(totals[currency]||0)+value;
  }
  return totals;
}
