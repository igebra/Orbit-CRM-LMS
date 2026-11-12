import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PAYMENT_CURRENCIES,currencyOptionLabel,currencySymbol,formatPaymentAmount,sumPaymentsByCurrency}
  from "../app/lib/paymentCurrencies.mjs";
const codes=["USD","INR","AED","SGD","THB","AUD","NZD"];
test("All seven currencies and corresponding countries appear with correct symbols",()=>{
 assert.deepEqual(PAYMENT_CURRENCIES.map(x=>x.code),codes);
 assert.deepEqual(PAYMENT_CURRENCIES.map(x=>x.country),[
   "United States","India","United Arab Emirates (Dubai)","Singapore","Thailand","Australia","New Zealand"
 ]);
 assert.equal(currencySymbol("AED"),"د.إ");
 assert.equal(currencySymbol("SGD"),"S$");
 assert.equal(currencySymbol("THB"),"฿");
 assert.equal(currencySymbol("AUD"),"A$");
 assert.equal(currencySymbol("NZD"),"NZ$");
 assert.match(currencyOptionLabel(PAYMENT_CURRENCIES[2]),/UAE Dirham.*Dubai/);
});
test("Native currency formatting is unambiguous for international dollar receipts",()=>{
 for(const code of codes){
   assert.ok(formatPaymentAmount(1234.56,code).length>3);
 }
 assert.match(formatPaymentAmount(1234.56,"AUD"),/AUD/);
 assert.match(formatPaymentAmount(1234.56,"NZD"),/NZD/);
 assert.match(formatPaymentAmount(1234.56,"SGD"),/SGD/);
 assert.match(formatPaymentAmount(1234.56,"AED"),/AED/);
 assert.match(formatPaymentAmount(1234.56,"THB"),/THB/);
 assert.match(formatPaymentAmount(1234.56,"INR"),/₹/);
});
test("Collection totals never mix original currencies and exclude voided receipts",()=>{
 const sample=codes.map((currency,i)=>({currency,amount_received:(i+1)*100,voided_at:null}));
 sample.push({currency:"USD",amount_received:500,voided_at:"2026-10-01"});
 const totals=sumPaymentsByCurrency(sample);
 assert.deepEqual(codes.map(c=>totals[c]),[100,200,300,400,500,600,700]);
 assert.equal(sumPaymentsByCurrency([]).USD,0);
});
test("Payment UI preserves amount in selected currency and keeps legacy USD-only edit",()=>{
 const page=readFileSync(new URL("../app/payments/page.tsx",import.meta.url),"utf8");
 assert.match(page,/PAYMENT_CURRENCIES\.map\(option/);
 assert.match(page,/currencyOptionLabel\(option\)/);
 assert.match(page,/currencySymbol\(form.currency\)/);
 assert.match(page,/sumPaymentsByCurrency\(activePayments\)/);
 assert.match(page,/p_currency:form.currency/);
 assert.match(page,/currency:form.currency,amount_usd:form.currency==="USD"\?amount:null/);
 assert.match(page,/p_amount_usd:amount/);
 assert.match(page,/formatPaymentAmount\(value,currency\)/);
 assert.match(page,/visibleCurrencyMetrics\.map\(option/);
 assert.match(page,/\.map\(csvCell\)/);
});
test("Migration updates server-side check, insert trigger and edit RPC without removing RLS/audit",()=>{
 const sql=readFileSync(new URL("../sql/migrations/20261112_crm_payment_seven_currencies.sql",import.meta.url),"utf8");
 for(const code of codes)assert.ok(sql.includes("'"+code+"'"),code);
 assert.match(sql,/crm_manual_payments_native_amount_check/);
 assert.match(sql,/crm_manual_payment_validate/);
 assert.match(sql,/crm_edit_manual_payment_v2/);
 assert.match(sql,/currency <> 'USD' AND amount_usd IS NULL/);
 assert.match(sql,/Not authorized to record CRM payments/);
 assert.match(sql,/Not authorized to edit CRM payments/);
 assert.doesNotMatch(sql,/DROP TABLE|DELETE FROM|DISABLE ROW LEVEL SECURITY/i);
});
