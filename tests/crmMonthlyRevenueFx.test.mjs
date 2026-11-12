import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CONVERTIBLE_CURRENCIES,validateUsdFxRates,monthlyRevenueEquivalent}
  from "../app/lib/monthlyRevenueFx.mjs";

const snapshot={USD:1,INR:83,AED:3.67,SGD:1.35,THB:36,AUD:1.5,NZD:1.65};

test("Seven native currency receipts convert to one USD total and one INR total",()=>{
 const receipts=CONVERTIBLE_CURRENCIES.map(currency=>({
   currency, amount_received:snapshot[currency]*100,voided_at:null
 }));
 receipts.push({currency:"USD",amount_received:10000,voided_at:"2026-11-12T00:00:00Z"});
 const summary=monthlyRevenueEquivalent(receipts,snapshot);
 assert.ok(summary);
 assert.ok(Math.abs(summary.usd-700)<1e-8);
 assert.ok(Math.abs(summary.inr-58100)<1e-5);
 assert.equal(summary.receipts,7);
});

test("No rates, missing currency or invalid amounts never generate misleading partial totals",()=>{
 const payments=[{currency:"SGD",amount_received:135,voided_at:null}];
 assert.equal(validateUsdFxRates(snapshot),true);
 assert.equal(validateUsdFxRates({...snapshot,SGD:0}),false);
 assert.equal(monthlyRevenueEquivalent(payments,null),null);
 assert.equal(monthlyRevenueEquivalent(payments,{...snapshot,INR:0}),null);
 assert.equal(monthlyRevenueEquivalent([{currency:"ZZZ",amount_received:100,voided_at:null}],snapshot),null);
 assert.equal(monthlyRevenueEquivalent([{currency:"USD",amount_received:-5,voided_at:null}],snapshot),null);
 assert.deepEqual(monthlyRevenueEquivalent([],null),{usd:0,inr:0,receipts:0});
});

test("Fx route pulls validated dated USD base rates, caches once a day and fails closed",()=>{
 const route=readFileSync(new URL("../app/api/fx/latest/route.ts",import.meta.url),"utf8");
 assert.match(route,/open\.er-api\.com\/v6\/latest\/USD/);
 assert.match(route,/revalidate: 86400/);
 assert.match(route,/validateUsdFxRates/);
 assert.match(route,/time_last_update_unix/);
 assert.match(route,/status:503/);
 assert.doesNotMatch(route,/supabase|student_enrollments|crm_received_payment_report_v2/);
});

test("CRM payments panel independently requests month-to-date receipts and shows dated attribution",()=>{
 const page=readFileSync(new URL("../app/payments/page.tsx",import.meta.url),"utf8");
 assert.match(page,/sameAsThisMonth\?Promise\.resolve\(null\)/);
 assert.match(page,/supabase\.rpc\("crm_received_payment_report_v2", \{p_from:firstOfMonth,p_to:today\}\)/);
 assert.match(page,/monthlyRevenueEquivalent\(monthlyPayments,usdRates\?\.rates\)/);
 assert.match(page,/!monthlyReady\|\|fxLoading/);
 assert.match(page,/Rates By Exchange Rate API/);
 assert.match(page,/usdRates/);
});
