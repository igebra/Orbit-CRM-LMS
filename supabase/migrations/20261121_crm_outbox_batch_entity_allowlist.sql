-- Extend the existing private CRM outbox allowlist without changing prior states or records.
ALTER TABLE orbit_integration.crm_sync_outbox
 DROP CONSTRAINT crm_sync_outbox_entity_check;
ALTER TABLE orbit_integration.crm_sync_outbox
 ADD CONSTRAINT crm_sync_outbox_entity_check
 CHECK (entity IN ('students','student_enrollments','batches','batch_students'));