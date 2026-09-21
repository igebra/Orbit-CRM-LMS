### CRM Operational Visibility

Although academic delivery is managed in the LMS, the CRM must provide operational visibility into currently running learning activity.

The CRM should display:

- Number of active / running batches
- Number of active trainers
- Upcoming classes
- Trainer workload
- Trainer availability
- Batch capacity and student count

The CRM should include a **Batches** view showing:

- Batch name
- Course
- Assigned trainer
- Student count
- Class days
- Class time in the source US timezone
- Corresponding India IST time
- Start date
- End date
- Status

The CRM should include a **Trainers** view showing:

- Trainer name
- Courses they can teach
- Active batches
- Number of classes per week
- Number of classes per month
- Class days
- Class time in the applicable US timezone
- Corresponding India IST time
- Availability status

The LMS remains the source of truth for batch schedules, trainer assignments, and academic delivery.

The CRM must consume this information through a controlled integration or read model rather than maintaining a separate conflicting copy of LMS scheduling data.
