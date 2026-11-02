# Orbit LMS — Classroom-style Content Admin (review candidate, 2026-11-02)

## Decision
Use a Google Classroom-inspired **Classwork** interface for LMS admins and the Content Team, as well as trainers and students. The existing Content Library and Curriculum views remain available during migration.

## User pain resolved
The former library page placed uploaded files in a long table below course selectors, summary cards and missing-resource alerts. Upload was a separate, scrolling modal.

## Approved UI behavior
- Classwork is the default LMS screen for the current authorized LMS roles.
- Course family and grade/level selectors stay available at the top.
- The left column selects a Class; the right column shows that Class's editor.
- The right column displays a compact type/title/file-or-link form and the current attachments immediately below, within the same panel.
- Class selections are independent of batches; uploads are stored in the existing master curriculum.
- Files under 100 MB use the existing `lms-library` storage bucket and `lms_resource_versions` metadata; external URLs use the existing resource record.
- On successful save, refresh lesson/resource lists without navigating away; on failed save, preserve the editor fields and report the error.
- Existing open, replace-file/version history, edit-link, archive, session edit, and generation controls remain functional.
- The advanced library and curriculum tabs are preserved until user acceptance and regression testing.

## Scope and exclusions
- This is a frontend restructuring using existing Supabase tables and authorization. No database migrations, new role, RLS change, CRM permissions, or batch-publishing workflow is introduced.
- The Content Team must be assigned an existing authorized LMS administration role/permission before they can upload. Role separation and self-service publishing are separate review items.
- The review branch is not approved for production until functional testing confirms upload, refresh, versioning, links, archive, courses, role gating and mobile layout.
- Do not merge the review PR or deploy the main branch without explicit approval.

## Acceptance checklist
1. Select a course and class with no page-scroll required to reach the upload form on desktop.
2. Add a small PDF; the file is visible in the selected class immediately after successful upload.
3. Attach an HTTPS Google Forms / Drive link and open it.
4. Replace a file and confirm a new version while preserving the previous one.
5. Archive a resource; it disappears from active attachments without deleting history.
6. Navigate between 20 AI Edge classes and across course levels; no cross-course data leakage.
7. Verify view-only roles cannot see edit controls; verify actual Supabase policies before granting Content Team roles.
8. Check responsive mobile layout and keyboard navigation.
9. Confirm legacy Content Library and Curriculum tabs work unchanged.
10. Run `npm run lint` and `npm run build` before production approval.
