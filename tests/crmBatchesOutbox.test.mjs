import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../supabase/migrations/20261121_crm_batches_outbox.sql",import.meta.url),"utf8");
test("CRM sync is scoped to administrative metadata, not trainer edits",()=>{
 assert.match(source,/AFTER INSERT OR UPDATE OF/);
 assert.match(source,/recurring_zoom_url/);
 assert.match(source,/source_timezone/);
 assert.match(source,/class_days/);
 assert.doesNotMatch(source,/UPDATE OF trainer_id/);
});
test("roster delete emits tombstone with OLD record and existing retry queue",()=>{
 assert.match(source,/TG_OP='DELETE' THEN OLD ELSE NEW/);
 assert.match(source,/AFTER INSERT OR DELETE ON public\.batch_students/);
 assert.match(source,/orbit_integration\.dispatch_event\('batch_students'/);
});
test("manual backfill does not change source batch data",()=>{
 assert.match(source,/enqueue_existing_crm_batches/);
 assert.doesNotMatch(source,/UPDATE public\.batches SET/);
 assert.match(source,/REVOKE ALL ON FUNCTION orbit_integration\.enqueue_existing_crm_batches/);
});