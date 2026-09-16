from pathlib import Path

page_path = Path("app/batches/page.tsx")
css_path = Path("app/lms.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# ============================================================
# 1) Split Start Date & Time into Batch Start Date + Class Time
# ============================================================

page = page.replace(
'''  trainer_id: string;
  local_datetime: string;
  source_timezone: string;''',
'''  trainer_id: string;
  batch_start_date: string;
  class_time: string;
  source_timezone: string;''',
1
)

page = page.replace(
'''  trainer_id: "",
  local_datetime: "",
  source_timezone: "America/New_York",''',
'''  trainer_id: "",
  batch_start_date: "",
  class_time: "",
  source_timezone: "America/New_York",''',
1
)

old_preview = '''  const preview = useMemo(
    () => localToUtc(form.local_datetime, form.source_timezone),
    [form.local_datetime, form.source_timezone]
  );'''

new_preview = '''  const scheduleLocal = useMemo(
    () =>
      form.batch_start_date && form.class_time
        ? `${form.batch_start_date}T${form.class_time}`
        : "",
    [form.batch_start_date, form.class_time]
  );

  const preview = useMemo(
    () => localToUtc(scheduleLocal, form.source_timezone),
    [scheduleLocal, form.source_timezone]
  );'''

if old_preview not in page:
    raise SystemExit("Could not locate current preview memo.")
page = page.replace(old_preview, new_preview, 1)

page = page.replace(
'''    if (!form.batch_name.trim() || !form.course_name || !form.local_datetime) {
      setMessage("Batch Name, Course and Start Date & Time are required.");
      return;
    }

    const startAt = localToUtc(form.local_datetime, form.source_timezone);''',
'''    if (
      !form.batch_name.trim() ||
      !form.course_name ||
      !form.batch_start_date ||
      !form.class_time
    ) {
      setMessage("Batch Name, Course, Batch Start Date and Class Time are required.");
      return;
    }

    const startAt = localToUtc(scheduleLocal, form.source_timezone);''',
1
)

page = page.replace(
'''      start_date: form.local_datetime.slice(0,10),''',
'''      start_date: form.batch_start_date,''',
1
)

# ============================================================
# 2) Rebuild Add Batch form into clean sections
# ============================================================

old_form = '''              <div className={styles.formGrid}>
                <label>
                  <span>Batch Name *</span>
                  <input value={form.batch_name} onChange={(e) => setForm({...form,batch_name:e.target.value})}/>
                </label>

                <label>
                  <span>Course *</span>
                  <select value={form.course_name} onChange={(e) => chooseCourse(e.target.value)}>
                    <option value="">Select course</option>
                    {COURSE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>

                <label>
                  <span>Trainer</span>
                  <select value={form.trainer_id} onChange={(e) => chooseTrainer(e.target.value)}>
                    <option value="">Select trainer</option>
                    {trainers.map((x) => <option key={x.id} value={x.id}>{x.trainer_name}</option>)}
                  </select>
                </label>

                <label>
                  <span>Start Date & Time *</span>
                  <input type="datetime-local" value={form.local_datetime} onChange={(e) => setForm({...form,local_datetime:e.target.value})}/>
                </label>

                <label>
                  <span>Primary Time Zone</span>
                  <select value={form.source_timezone} onChange={(e) => setForm({...form,source_timezone:e.target.value})}>
                    {TIMEZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </label>

                <div className={`${styles.timePreview} ${styles.full}`}>
                  <div><span>Selected Time</span><strong>{preview ? fmt(preview,form.source_timezone) : "Select date & time"}</strong></div>
                  <div className={styles.timeArrow}>→</div>
                  <div><span>India Time</span><strong>{preview ? fmt(preview,"Asia/Kolkata") : "Select date & time"}</strong></div>
                </div>

                <label>
                  <span>Batch End Date</span>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({...form,end_date:e.target.value})}/>
                </label>

                <label>
                  <span>Planned Sessions</span>
                  <input type="number" min="1" value={form.planned_sessions} onChange={(e) => setForm({...form,planned_sessions:e.target.value})}/>
                </label>

                <label>
                  <span>Classes Per Month *</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.classes_per_month}
                    onChange={(e) => setForm({...form,classes_per_month:e.target.value})}
                  />
                  <small style={{marginTop:4,color:"#6B7280"}}>
                    Example: enter 8 for eight classes in a month.
                  </small>
                </label>

                <div className={`${styles.classDaysField} ${styles.full}`}>
                  <span className={styles.classDaysLabel}>Class Days</span>
                  <div className={styles.classDaysGrid}>
                    {CLASS_DAYS.map((day) => {
                      const selected = form.class_days.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={`${styles.classDayButton} ${selected ? styles.classDayButtonActive : ""}`}
                          onClick={() => toggleClassDay(day.value)}
                          aria-pressed={selected}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <small>Select all regular class days. Example: Mon + Wed for 8 classes/month.</small>
                </div>

                <label>
                  <span>Class Duration</span>
                  <select value={form.duration_minutes} onChange={(e) => setForm({...form,duration_minutes:e.target.value})}>
                    <option value="60">60 Minutes</option>
                    <option value="90">90 Minutes</option>
                    <option value="120">120 Minutes</option>
                  </select>
                </label>

                <label className={styles.full}>
                  <span>Recurring Zoom Link</span>
                  <input type="url" value={form.recurring_zoom_url} onChange={(e) => setForm({...form,recurring_zoom_url:e.target.value})} placeholder="https://zoom.us/j/..."/>
                </label>
              </div>'''

new_form = '''              <div className={styles.formGrid}>
                <div className={`${styles.formSectionTitle} ${styles.full}`}>
                  <strong>Batch Details</strong>
                  <span>Basic batch information</span>
                </div>

                <label>
                  <span>Batch Name *</span>
                  <input value={form.batch_name} onChange={(e) => setForm({...form,batch_name:e.target.value})}/>
                </label>

                <label>
                  <span>Course *</span>
                  <select value={form.course_name} onChange={(e) => chooseCourse(e.target.value)}>
                    <option value="">Select course</option>
                    {COURSE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>

                <label className={styles.full}>
                  <span>Trainer</span>
                  <select value={form.trainer_id} onChange={(e) => chooseTrainer(e.target.value)}>
                    <option value="">Select trainer</option>
                    {trainers.map((x) => <option key={x.id} value={x.id}>{x.trainer_name}</option>)}
                  </select>
                </label>

                <div className={`${styles.formSectionTitle} ${styles.full}`}>
                  <strong>Schedule</strong>
                  <span>Dates, class time and recurring days</span>
                </div>

                <label>
                  <span>Batch Start Date *</span>
                  <input
                    type="date"
                    value={form.batch_start_date}
                    onChange={(e) => setForm({...form,batch_start_date:e.target.value})}
                  />
                </label>

                <label>
                  <span>Batch End Date</span>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({...form,end_date:e.target.value})}/>
                </label>

                <label>
                  <span>Class Time *</span>
                  <input
                    type="time"
                    value={form.class_time}
                    onChange={(e) => setForm({...form,class_time:e.target.value})}
                  />
                </label>

                <label>
                  <span>Primary Time Zone</span>
                  <select value={form.source_timezone} onChange={(e) => setForm({...form,source_timezone:e.target.value})}>
                    {TIMEZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                  </select>
                </label>

                <div className={styles.classDaysField}>
                  <span className={styles.classDaysLabel}>Class Days</span>
                  <div className={styles.classDaysGrid}>
                    {CLASS_DAYS.map((day) => {
                      const selected = form.class_days.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={`${styles.classDayButton} ${selected ? styles.classDayButtonActive : ""}`}
                          onClick={() => toggleClassDay(day.value)}
                          aria-pressed={selected}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <small>Select regular class days.</small>
                </div>

                <label>
                  <span>Class Duration</span>
                  <select value={form.duration_minutes} onChange={(e) => setForm({...form,duration_minutes:e.target.value})}>
                    <option value="60">60 Minutes</option>
                    <option value="90">90 Minutes</option>
                    <option value="120">120 Minutes</option>
                  </select>
                </label>

                <label>
                  <span>Classes Per Month *</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.classes_per_month}
                    onChange={(e) => setForm({...form,classes_per_month:e.target.value})}
                  />
                  <small style={{marginTop:4,color:"#6B7280"}}>
                    Example: 8 classes per month.
                  </small>
                </label>

                <label>
                  <span>Recurring Zoom Link</span>
                  <input
                    type="url"
                    value={form.recurring_zoom_url}
                    onChange={(e) => setForm({...form,recurring_zoom_url:e.target.value})}
                    placeholder="https://zoom.us/j/..."
                  />
                </label>

                <div className={`${styles.timePreview} ${styles.full} ${styles.timePreviewEnd}`}>
                  <div>
                    <span>Selected Time</span>
                    <strong>{preview ? fmt(preview,form.source_timezone) : "Select start date & class time"}</strong>
                  </div>
                  <div className={styles.timeArrow}>→</div>
                  <div>
                    <span>India Time</span>
                    <strong>{preview ? fmt(preview,"Asia/Kolkata") : "Select start date & class time"}</strong>
                  </div>
                </div>
              </div>'''

if old_form not in page:
    raise SystemExit("Could not locate the current Add Batch form. The live code may have changed.")
page = page.replace(old_form, new_form, 1)

page_path.write_text(page, encoding="utf-8")

# ============================================================
# 3) Clean form section styling
# ============================================================

marker = "/* ORBIT ADD BATCH CLEAN SCHEDULE V3 */"
if marker not in css:
    css += r'''

/* ORBIT ADD BATCH CLEAN SCHEDULE V3 */
.formSectionTitle{
  margin-top:4px;
  padding:2px 0 8px;
  border-bottom:1px solid #edf1f0;
}

.formSectionTitle strong,
.formSectionTitle span{
  display:block;
}

.formSectionTitle strong{
  color:#173637;
  font-size:12px;
  font-weight:850;
}

.formSectionTitle span{
  margin-top:2px;
  color:#879493;
  font-size:9.5px;
}

.timePreviewEnd{
  margin-top:5px;
}

.classDaysField{
  align-self:start;
}

.classDaysField .classDaysGrid{
  gap:5px;
}

.classDaysField .classDayButton{
  min-width:43px;
  height:36px;
  padding:0 8px;
  border-radius:8px;
  font-size:9.5px;
}

@media(max-width:900px){
  .classDaysField .classDaysGrid{
    flex-wrap:wrap;
  }
}
'''

css_path.write_text(css, encoding="utf-8")

print("Applied Add Batch clean schedule layout.")
print("- Batch Start Date + Batch End Date side-by-side")
print("- Class Time + Primary Time Zone side-by-side")
print("- Class Days + Class Duration side-by-side")
print("- Classes Per Month + Zoom Link side-by-side")
print("- Planned Sessions removed from Add Batch UI")
print("- Time conversion preview moved to the bottom")
print("- No SQL / no database change / CRM data untouched")
