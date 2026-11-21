import test from "node:test"; import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/migrations/20261121_lms_trainer_receiver.sql",import.meta.url),"utf8");
const source=readFileSync(new URL("../supabase/functions/sync-lms-batch-trainer/index.ts",import.meta.url),"utf8");
test("CRM apply and auth RPCs are service-role only",()=>{
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.verify_orbit_lms_batch_token/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.apply_orbit_lms_trainer_change/);
 assert.match(sql,/TO service_role/);
});
test("trainer mapping uses email and event versions, not cross-project trainer IDs",()=>{
 assert.match(sql,/lower\(btrim\(email\)\)=lower\(btrim\(p_trainer_email\)\)/);
 assert.match(sql,/lms_trainer_sync_version/);
 assert.match(sql,/FOR UPDATE/);
 assert.doesNotMatch(sql,/UPDATE public\.class_sessions/);
});
test("webhook verifies secret before event parsing",()=>{
 assert.ok(source.indexOf("verify_orbit_lms_batch_token")<source.indexOf("request.json()"));
 assert.match(source,/apply_orbit_lms_trainer_change/);
 assert.match(source,/x-orbit-lms-batch-secret/);
});