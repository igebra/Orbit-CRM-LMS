from pathlib import Path

list_path = Path("app/batches/page.tsx")
detail_path = Path("app/batches/[id]/page.tsx")
css_path = Path("app/lms.module.css")

for p in (list_path, detail_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = list_path.read_text(encoding="utf-8")
detail = detail_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# ============================================================
# 1) TOP ROW: Batch Name | Course | Trainer
# ============================================================

old_top = '''                <label>
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
                </label>'''

new_top = '''                <div className={`${styles.batchTopRow} ${styles.full}`}>
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
                </div>'''

if "batchTopRow" not in page:
    if old_top not in page:
        raise SystemExit("Could not locate Batch Name / Course / Trainer block.")
    page = page.replace(old_top, new_top, 1)

# ============================================================
# 2) SCHEDULE ROW: Start Date | End Date | Class Time | Time Zone
# ============================================================

old_schedule = '''                <label>
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
                </label>'''

new_schedule = '''                <div className={`${styles.batchScheduleTopRow} ${styles.full}`}>
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
                </div>'''

if "batchScheduleTopRow" not in page:
    if old_schedule not in page:
        raise SystemExit("Could not locate schedule fields.")
    page = page.replace(old_schedule, new_schedule, 1)

# ============================================================
# 3) AUTO CLASSES / MONTH
# ============================================================

old_toggle = '''  function toggleClassDay(day: string) {
    setForm((current) => ({
      ...current,
      class_days: current.class_days.includes(day)
        ? current.class_days.filter((item) => item !== day)
        : [...current.class_days, day],
    }));
  }'''

new_toggle = '''  function toggleClassDay(day: string) {
    setForm((current) => {
      const nextDays = current.class_days.includes(day)
        ? current.class_days.filter((item) => item !== day)
        : [...current.class_days, day];

      return {
        ...current,
        class_days: nextDays,
        classes_per_month: nextDays.length ? String(nextDays.length * 4) : "",
      };
    });
  }'''

if 'classes_per_month: nextDays.length ? String(nextDays.length * 4) : ""' not in page:
    if old_toggle not in page:
        raise SystemExit("Could not locate toggleClassDay().")
    page = page.replace(old_toggle, new_toggle, 1)

page = page.replace(
'''  classes_per_month: "4",
  class_days: [],''',
'''  classes_per_month: "",
  class_days: [],''',
1
)

old_validation = '''    if (
      !form.batch_name.trim() ||
      !form.course_name ||
      !form.batch_start_date ||
      !form.class_time
    ) {
      setMessage("Batch Name, Course, Batch Start Date and Class Time are required.");
      return;
    }'''

new_validation = '''    if (
      !form.batch_name.trim() ||
      !form.course_name ||
      !form.batch_start_date ||
      !form.class_time
    ) {
      setMessage("Batch Name, Course, Batch Start Date and Class Time are required.");
      return;
    }

    if (form.class_days.length === 0) {
      setMessage("Select at least one Class Day.");
      return;
    }'''

if 'setMessage("Select at least one Class Day.")' not in page:
    if old_validation not in page:
        raise SystemExit("Could not locate validation.")
    page = page.replace(old_validation, new_validation, 1)

# ============================================================
# 4) ONE ROW: Class Days | Class Duration | Classes Per Month
# ============================================================

old_class_setup = '''                <div className={styles.classDaysField}>
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
                </label>'''

new_class_setup = '''                <div className={`${styles.batchClassSetupRow} ${styles.full}`}>
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
                    <span>Classes Per Month</span>
                    <input
                      type="text"
                      value={form.classes_per_month || "—"}
                      readOnly
                      className={styles.autoCalculatedInput}
                    />
                  </label>
                </div>'''

if old_class_setup not in page:
    # Handle case where v5/v6 had already made month read-only
    alt_old = '''                <div className={styles.classDaysField}>
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
                  <span>Classes Per Month</span>
                  <input
                    type="number"
                    value={form.classes_per_month}
                    readOnly
                    className={styles.autoCalculatedInput}
                    placeholder="Select class days"
                  />
                  <small style={{marginTop:4,color:"#6B7280"}}>
                    Auto-calculated from selected class days × 4 weeks.
                  </small>
                </label>'''
    if alt_old not in page:
        raise SystemExit("Could not locate Class Days / Duration / Classes Per Month block.")
    page = page.replace(alt_old, new_class_setup, 1)
else:
    page = page.replace(old_class_setup, new_class_setup, 1)

list_path.write_text(page, encoding="utf-8")

# ============================================================
# 5) EDIT BATCH: same automatic rule and dash when empty
# ============================================================

old_edit_toggle = '''  function toggleEditClassDay(day:string) {
    setEdit(current=>({
      ...current,
      class_days:current.class_days.includes(day)
        ? current.class_days.filter(item=>item!==day)
        : [...current.class_days,day]
    }));
  }'''

new_edit_toggle = '''  function toggleEditClassDay(day:string) {
    setEdit(current=>{
      const nextDays=current.class_days.includes(day)
        ? current.class_days.filter(item=>item!==day)
        : [...current.class_days,day];

      return {
        ...current,
        class_days:nextDays,
        classes_per_month:nextDays.length ? String(nextDays.length*4) : ""
      };
    });
  }'''

if 'classes_per_month:nextDays.length ? String(nextDays.length*4) : ""' not in detail:
    if old_edit_toggle not in detail:
        raise SystemExit("Could not locate toggleEditClassDay().")
    detail = detail.replace(old_edit_toggle, new_edit_toggle, 1)

old_save_edit = '''  async function saveEdit(e:FormEvent) {
    e.preventDefault();
    const {error} = await supabase.from("batches").update({'''

new_save_edit = '''  async function saveEdit(e:FormEvent) {
    e.preventDefault();

    if (edit.class_days.length === 0) {
      setMessage("Select at least one Class Day.");
      return;
    }

    const {error} = await supabase.from("batches").update({'''

if 'if (edit.class_days.length === 0)' not in detail:
    if old_save_edit not in detail:
        raise SystemExit("Could not locate saveEdit().")
    detail = detail.replace(old_save_edit, new_save_edit, 1)

old_edit_month = '''              <label>
                <span>Classes Per Month</span>
                <input type="number" min="1" max="31" value={edit.classes_per_month} onChange={e=>setEdit({...edit,classes_per_month:e.target.value})}/>
                <small style={{marginTop:4,color:"#6B7280"}}>Example: 8 means eight classes in a month.</small>
              </label>'''

new_edit_month = '''              <label>
                <span>Classes Per Month</span>
                <input
                  type="text"
                  value={edit.classes_per_month || "—"}
                  readOnly
                  className={styles.autoCalculatedInput}
                />
              </label>'''

if old_edit_month in detail:
    detail = detail.replace(old_edit_month, new_edit_month, 1)
else:
    alt_edit = '''              <label>
                <span>Classes Per Month</span>
                <input
                  type="number"
                  value={edit.classes_per_month}
                  readOnly
                  className={styles.autoCalculatedInput}
                  placeholder="Select class days"
                />
                <small style={{marginTop:4,color:"#6B7280"}}>Auto-calculated from selected class days × 4 weeks.</small>
              </label>'''
    if alt_edit in detail:
        detail = detail.replace(alt_edit, new_edit_month, 1)

detail_path.write_text(detail, encoding="utf-8")

# ============================================================
# 6) CSS
# ============================================================

marker = "/* ORBIT COMPACT FORM V7 */"
if marker not in css:
    css += r'''

/* ORBIT COMPACT FORM V7 */
.batchTopRow{
  display:grid;
  grid-template-columns:1fr 1fr 1fr;
  gap:14px;
  align-items:end;
}

.batchScheduleTopRow{
  display:grid;
  grid-template-columns:1fr 1fr 1fr 1.15fr;
  gap:12px;
  align-items:end;
}

.batchClassSetupRow{
  display:grid;
  grid-template-columns:2.2fr 1fr .8fr;
  gap:14px;
  align-items:end;
}

.batchTopRow label,
.batchScheduleTopRow label,
.batchClassSetupRow label{
  min-width:0;
}

.batchTopRow label>span,
.batchScheduleTopRow label>span,
.batchClassSetupRow label>span{
  display:block;
  margin-bottom:7px;
  color:#263f40;
  font-size:12px;
  font-weight:800;
}

.batchTopRow input,
.batchTopRow select,
.batchScheduleTopRow input,
.batchScheduleTopRow select,
.batchClassSetupRow input,
.batchClassSetupRow select{
  width:100%;
  height:44px;
  border:1px solid #d4dfdc;
  border-radius:10px;
  background:#fff;
  color:#183032;
  padding:0 10px;
  outline:none;
}

.autoCalculatedInput{
  background:#f6f9f8!important;
  color:#315b5a!important;
  font-weight:800;
  cursor:default;
}

.batchClassSetupRow .classDaysField{
  min-width:0;
}

.batchClassSetupRow .classDaysGrid{
  display:flex;
  flex-wrap:nowrap;
  gap:5px;
}

.batchClassSetupRow .classDayButton{
  min-width:42px;
  height:44px;
  padding:0 7px;
}

@media(max-width:1100px){
  .batchScheduleTopRow{
    grid-template-columns:1fr 1fr;
  }

  .batchClassSetupRow{
    grid-template-columns:1fr;
  }

  .batchClassSetupRow .classDaysGrid{
    flex-wrap:wrap;
  }
}

@media(max-width:900px){
  .batchTopRow{
    grid-template-columns:1fr;
  }
}

@media(max-width:650px){
  .batchScheduleTopRow{
    grid-template-columns:1fr;
  }
}
'''

css_path.write_text(css, encoding="utf-8")

print("Applied V7:")
print("- Batch Name / Course / Trainer in one row")
print("- Start Date / End Date / Class Time / Time Zone in one row")
print("- Class Days / Class Duration / Classes Per Month in one row")
print("- Classes Per Month auto-calculates from selected days")
print("- No 'Select class days' text")
print("- Empty monthly value displays as —")
print("- No SQL / no database changes")
