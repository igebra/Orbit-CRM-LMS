## CRM Operational Read Data

The CRM needs selected operational information from the LMS for internal planning and trainer availability.

The CRM may display:

- Active batch count
- Batch name
- Course
- Assigned trainer
- Student count
- Class days
- Class schedule
- Source timezone
- India IST converted time
- Upcoming classes
- Trainer active batch count
- Trainer classes per week
- Trainer classes per month
- Trainer availability status

This information must originate from LMS-owned scheduling data.

The CRM must not create an independent editable copy of LMS batches, trainer assignments, or class schedules.

Recommended pattern:

`LMS source data → controlled API/read model → CRM operational view`

The integration may cache or materialize data for performance, but any cached data must retain a reference to its LMS source record and must not become a second source of truth.
