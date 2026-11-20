import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {monthlyRevenueEquivalent,validateUsdFxRates} from "../app/lib/monthlyRevenueFx.mjs";

const page=readFileSync(new URL("../app/dashboard/page.tsx",import.meta.url),"utf8");
const payments=readFileSync(new URL("../app/payments/page.tsx",import.meta.url),"utf8");
const rateRoute=readFileSync(new URL("../app/api/fx/latest/route.ts",import.meta.url),"utf8");
const fx={USD:1,INR:93.372746,AED:3.6725,SGD:1.290845,THB:33.94469,AUD:1.498714,NZD:1.820727};

test("Overview and Payments use the same received-payment RPC, period and FX path",()=>{
 assert.match(page,/supabase\.rpc\(\s*"crm_received_payment_report_v2"/);
 assert.match(page,/p_from: monthStart, p_to: todayIso/);
 assert.match(payments,/supabase\.rpc\("crm_received_payment_report_v2"/);
 assert.doesNotMatch(page,/supabase\.rpc\(\s*"payment_report_transactions"/);
 assert.match(page,/fetch\("\/api\/fx\/latest", \{cache:"no-store"\}\)/);
 assert.match(payments,/fetch\("\/api\/fx\/latest",\{cache:"no-store"\}\)/);
 assert.match(page,/monthlyRevenueEquivalent\(records, snapshot\.rates\)/);
 assert.match(payments,/monthlyRevenueEquivalent\(monthlyPayments,usdRates\?\.rates\)/);
 assert.match(rateRoute,/https:\/\/open\.er-api\.com\/v6\/latest\/USD/);
});

test("November's verified sample receipts convert once using the dated USD-base FX snapshot",()=>{
 assert.equal(validateUsdFxRates(fx),true);
 const receipts=[
  {currency:"USD",amount_received:400,voided_at:null},
  {currency:"USD",amount_received:776,voided_at:null},
  {currency:"INR",amount_received:5500,voided_at:null},
  {currency:"USD",amount_received:900,voided_at:"2026-11-19T00:00:00Z"}
 ];
 const result=monthlyRevenueEquivalent(receipts,fx);
 assert.ok(result);
 assert.equal(result.receipts,3);
 assert.ok(Math.abs(result.usd-(1176+5500/fx.INR))<0.000001);
 assert.ok(Math.abs(result.inr-result.usd*fx.INR)<0.000001);
});

test("No payment receipts is genuine zero; FX failure is not presented as zero",()=>{
 assert.deepEqual(monthlyRevenueEquivalent([],null),{usd:0,inr:0,receipts:0});
 assert.equal(monthlyRevenueEquivalent([{currency:"INR",amount_received:500,voided_at:null}],null),null);
 assert.equal(monthlyRevenueEquivalent([{currency:"XYZ",amount_received:500,voided_at:null}],fx),null);
 assert.match(page,/if \(receiptError \|\| !Array\.isArray\(receipts\)\)/);
 assert.match(page,/const active = records\.filter\(p => !p\.voided_at\)/);
 assert.match(page,/if \(active\.length === 0\)/);
 assert.match(page,/setMonthCollections\("unavailable"\)/);
 assert.match(page,/FX unavailable · see original amounts in Payments/);
 assert.match(page,/typeof monthCollections === "number" \? money\(monthCollections\) : "—"/);
});

test("Currency conversion is display-only and no payment records are mutated",()=>{
 assert.doesNotMatch(page,/\.from\("crm_manual_payments"\)\.(update|insert|delete)/);
 assert.doesNotMatch(page,/\.from\("payment_transactions"\)\.(update|insert|delete)/);
 assert.match(page,/Collections/);
 assert.match(page,/This month · \$\{equivalent\.receipts\} receipts · indicative USD/);
});
