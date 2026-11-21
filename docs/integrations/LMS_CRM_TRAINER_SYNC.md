# LMS → CRM trainer assignment synchronization

The authoritative trainer assignment lives in **Orbit LMS**. The CRM keeps the matching batch's trainer in sync.

## Delivery and identity

- LMS Supabase captures every batch primary trainer assignment or removal in a private outbox. pg_net sends immediately; pg_cron retries each minute and records failures.
- CRM Supabase Edge Function `sync-lms-batch-trainer` validates a one-purpose secret against CRM Vault before invoking restricted service-role database RPCs.
- CRM matches batches by shared UUID and trainer by email, NOT by trainer UUID or display name. For legacy trainer records with no email, a unique exact trainer-name match is permitted.
- CRM applies a monotonic event version so retries and out-of-order events cannot revert newer trainer changes.
- Existing CRM history triggers update only future unfinished class sessions; no attendance, finance, enrollment, or completed class data is touched.
- If a CRM batch does not exist or the trainer cannot be matched uniquely, the LMS retry queue retains the change for investigation. Never create a CRM batch automatically based on a duplicate name.

## Administrative rule

Trainer assignments for existing shared batches are changed in LMS. CRM batch editing must not overwrite `trainer_id` or `trainer_name`. Other CRM batch editing (Zoom, dates, payments) is unchanged.

## Monitoring

LMS: `SELECT batch_id,state,attempts,last_error,delivered_at FROM orbit_integration.lms_trainer_sync_outbox ORDER BY modified_at DESC;`

CRM: `SELECT batch_name,trainer_name,lms_trainer_sync_version FROM public.batches WHERE id=:batch_uuid;`

The secret is generated and stored inside the two Supabase Vaults, never in this repository or a public environment variable.