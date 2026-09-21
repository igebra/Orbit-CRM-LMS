## CRM Operational Read Model

The CRM must display selected LMS operational data so internal teams can understand delivery capacity without logging into the LMS.

The CRM should be able to display:

- Active / running batches
- Active trainers
- Upcoming classes
- Trainer workload
- Trainer availability
- Batch capacity and student count
- Class day and time
- US source timezone
- Corresponding India IST time

The LMS remains the source of truth for:

- Batch schedule
- Trainer assignment
- Class schedule
- Student-to-batch assignment
- Academic delivery

The CRM must not maintain a separate editable copy of the same scheduling data.

Recommended architecture:

```text
ORBIT LMS
   |
   | Source of Truth
   |
   |-- Batches
   |-- Trainers
   |-- Class Schedule
   |-- Student Count
   |
   v
Controlled API / Read Model
   |
   v
ORBIT CRM
   |
   |-- Active Batches
   |-- Trainer Schedule
   |-- Trainer Availability
   |-- Upcoming Classes

```markdown
- CRM access to LMS operational schedules should be read-only by default.
- LMS scheduling data must not be duplicated as a second independent source of truth inside CRM.
- Timezone conversions must be calculated from stored timezone-aware timestamps rather than hard-coded offsets.
