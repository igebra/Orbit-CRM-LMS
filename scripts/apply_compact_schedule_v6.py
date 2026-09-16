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
        raise SystemExit("Could not locate Batch Start/End/Class Time/Time Zone block.")
    page = page.replace(old_schedule, new_schedule, 1)

# ============================================================
# 3) AUTO CLASSES / MONTH FROM SELECTED DAYS
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
        raise SystemExit("Could not locate Add Batch validation.")
    page = page.replace(old_validation, new_validation, 1)

old_month = '''                <label>
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

new_month = '''                <label>
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

if "autoCalculatedInput" not in page:
    if old_month not in page:
        raise SystemExit("Could not locate Add Batch Classes Per Month field.")
    page = page.replace(old_month, new_month, 1)

list_path.write_text(page, encoding="utf-8")

# ============================================================
# 4) EDIT BATCH - SAME AUTO RULE
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
                  type="number"
                  value={edit.classes_per_month}
                  readOnly
                  className={styles.autoCalculatedInput}
                  placeholder="Select class days"
                />
                <small style={{marginTop:4,color:"#6B7280"}}>Auto-calculated from selected class days × 4 weeks.</small>
              </label>'''

if "autoCalculatedInput" not in detail:
    if old_edit_month not in detail:
        raise SystemExit("Could not locate Edit Batch Classes Per Month field.")
    detail = detail.replace(old_edit_month, new_edit_month, 1)

detail_path.write_text(detail, encoding="utf-8")

# ============================================================
# 5) CSS
# ============================================================

marker = "/* ORBIT COMPACT SCHEDULE V6 */"
if marker not in css:
    css += r'''

/* ORBIT COMPACT SCHEDULE V6 */
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

.batchTopRow label,
.batchScheduleTopRow label{
  min-width:0;
}

.batchTopRow label>span,
.batchScheduleTopRow label>span{
  display:block;
  margin-bottom:7px;
  color:#263f40;
  font-size:12px;
  font-weight:800;
}

.batchTopRow input,
.batchTopRow select,
.batchScheduleTopRow input,
.batchScheduleTopRow select{
  width:100%;
  height:44px;
  border:1px solid #d4dfdc;
  border-radius:10px;
  background:#fff;
  color:#183032;
  padding:0 10px;
  outline:none;
}

.batchTopRow input:focus,
.batchTopRow select:focus,
.batchScheduleTopRow input:focus,
.batchScheduleTopRow select:focus{
  border-color:#74afad;
  box-shadow:0 0 0 3px rgba(116,175,173,.12);
}

.autoCalculatedInput{
  background:#f6f9f8!important;
  color:#315b5a!important;
  font-weight:800;
  cursor:default;
}

@media(max-width:1050px){
  .batchScheduleTopRow{
    grid-template-columns:1fr 1fr;
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

print("Applied V6:")
print("- Batch Name / Course / Trainer in one row")
print("- Start Date / End Date / Class Time / Time Zone in one row")
print("- Class Days auto-calculate Classes Per Month")
print("- Classes Per Month is read-only")
print("- Edit Batch uses same auto-calculation")
print("- No SQL / no database changes")
