## CRM Operational Visibility Rule

The CRM may display selected LMS operational data required for internal planning, including:

- Active batches
- Batch capacity
- Active trainers
- Trainer workload
- Trainer availability
- Upcoming classes
- Class days
- US source timezone and class time
- Corresponding India IST time

The LMS remains the source of truth for:

- Batch schedules
- Trainer assignments
- Class schedules
- Student-to-batch assignments

Do not create a second independently editable CRM copy of LMS scheduling data.

Any CRM display of LMS operational information must use a controlled read model, API, synchronized view, or approved integration.

Timezone conversion must use timezone-aware timestamps and proper timezone rules. Do not hard-code US-to-India time offsets because daylight saving time can change the difference.
