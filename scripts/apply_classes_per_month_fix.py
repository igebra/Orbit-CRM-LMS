from pathlib import Path

list_path = Path("app/batches/page.tsx")
detail_path = Path("app/batches/[id]/page.tsx")

for p in (list_path, detail_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = list_path.read_text(encoding="utf-8")
detail = detail_path.read_text(encoding="utf-8")

# ============================================================
# BATCHES LIST / ADD BATCH
# ============================================================

page = page.replace(
'''  planned_sessions: number | null;
  classes_per_week: number | null;
  default_duration_minutes: number | null;''',
'''  planned_sessions: number | null;
  classes_per_week: number | null;
  classes_per_month: number | null;
  default_duration_minutes: number | null;''',
1
)

page = page.replace(
'''  planned_sessions: string;
  classes_per_week: string;
  duration_minutes: string;''',
'''  planned_sessions: string;
  classes_per_month: string;
  duration_minutes: string;''',
1
)

page = page.replace(
'''  planned_sessions: "",
  classes_per_week: "1",
  duration_minutes: "90",''',
'''  planned_sessions: "",
  classes_per_month: "4",
  duration_minutes: "90",''',
1
)

page = page.replace(
'''      planned_sessions: form.planned_sessions ? Number(form.planned_sessions) : null,
      classes_per_week: Number(form.classes_per_week || 1),
      default_duration_minutes: Number(form.duration_minutes || 90),''',
'''      planned_sessions: form.planned_sessions ? Number(form.planned_sessions) : null,
      classes_per_month: Number(form.classes_per_month || 4),
      classes_per_week: Math.max(1, Math.ceil(Number(form.classes_per_month || 4) / 4)),
      default_duration_minutes: Number(form.duration_minutes || 90),''',
1
)

page = page.replace(
'''                    <td>{(b.classes_per_week || 1) * 4}</td>''',
'''                    <td>{b.classes_per_month || ((b.classes_per_week || 1) * 4)}</td>''',
1
)

old_add_frequency = '''                <label>
                  <span>Classes Per Week *</span>
                  <select value={form.classes_per_week} onChange={(e) => setForm({...form,classes_per_week:e.target.value})}>
                    <option value="1">1 class / week</option>
                    <option value="2">2 classes / week</option>
                    <option value="3">3 classes / week</option>
                    <option value="4">4 classes / week</option>
                    <option value="5">5 classes / week</option>
                    <option value="6">6 classes / week</option>
                    <option value="7">7 classes / week</option>
                  </select>
                  {form.course_name.startsWith("Math") && (
                    <small style={{marginTop:4,color:"#6B7280"}}>
                      Math batches can run multiple classes each week.
                    </small>
                  )}
                </label>'''

new_add_frequency = '''                <label>
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
                </label>'''

if old_add_frequency not in page:
    raise SystemExit("Could not locate Add Batch Classes Per Week field.")
page = page.replace(old_add_frequency, new_add_frequency, 1)

if "classes_per_month" not in page:
    raise SystemExit("Classes-per-month patch did not apply to Batches page.")

list_path.write_text(page, encoding="utf-8")

# ============================================================
# BATCH DETAIL / EDIT BATCH
# ============================================================

detail = detail.replace(
'''  planned_sessions:number|null; classes_per_week:number|null; default_duration_minutes:number|null; status:string; max_students:number;''',
'''  planned_sessions:number|null; classes_per_week:number|null; classes_per_month:number|null; default_duration_minutes:number|null; status:string; max_students:number;''',
1
)

detail = detail.replace(
'''  const [edit,setEdit] = useState({trainer_id:"",trainer_name:"",end_date:"",recurring_zoom_url:"",planned_sessions:"",classes_per_week:"1",duration_minutes:"90",status:"Active"});''',
'''  const [edit,setEdit] = useState({trainer_id:"",trainer_name:"",end_date:"",recurring_zoom_url:"",planned_sessions:"",classes_per_month:"4",duration_minutes:"90",status:"Active"});''',
1
)

detail = detail.replace(
'''      planned_sessions:batch.planned_sessions?String(batch.planned_sessions):"",
      classes_per_week:String(batch.classes_per_week||1),
      duration_minutes:String(batch.default_duration_minutes||90),''',
'''      planned_sessions:batch.planned_sessions?String(batch.planned_sessions):"",
      classes_per_month:String(batch.classes_per_month || ((batch.classes_per_week||1)*4)),
      duration_minutes:String(batch.default_duration_minutes||90),''',
1
)

detail = detail.replace(
'''      planned_sessions:edit.planned_sessions?Number(edit.planned_sessions):null,
      classes_per_week:Number(edit.classes_per_week||1),
      default_duration_minutes:Number(edit.duration_minutes||90),''',
'''      planned_sessions:edit.planned_sessions?Number(edit.planned_sessions):null,
      classes_per_month:Number(edit.classes_per_month||4),
      classes_per_week:Math.max(1,Math.ceil(Number(edit.classes_per_month||4)/4)),
      default_duration_minutes:Number(edit.duration_minutes||90),''',
1
)

detail = detail.replace(
'''    if ((batch?.classes_per_week||1) > 1) {
      setMessage("This batch has multiple classes per week. Use + Add Session to choose the exact class days/times; Orbit will not guess the weekly days.");
      return;
    }''',
'''    if ((batch?.classes_per_month || ((batch?.classes_per_week||1)*4)) > 4) {
      setMessage("This batch has multiple classes each month. Use + Add Session to choose the exact class days/times; Orbit will not guess the schedule.");
      return;
    }''',
1
)

detail = detail.replace(
'''              <span>{batch.classes_per_week||1} class{(batch.classes_per_week||1)===1?"":"es"} / week</span>''',
'''              <span>{batch.classes_per_month || ((batch.classes_per_week||1)*4)} classes / month</span>''',
1
)

detail = detail.replace(
'''                <div><span>Classes / Week</span><strong>{batch.classes_per_week||1}</strong></div>''',
'''                <div><span>Classes / Month</span><strong>{batch.classes_per_month || ((batch.classes_per_week||1)*4)}</strong></div>''',
1
)

old_edit_fields = '''              <label><span>Planned Sessions</span><input type="number" min="1" value={edit.planned_sessions} onChange={e=>setEdit({...edit,planned_sessions:e.target.value})}/></label><label><span>Class Duration</span><select value={edit.duration_minutes} onChange={e=>setEdit({...edit,duration_minutes:e.target.value})}><option value="60">60 Minutes</option><option value="90">90 Minutes</option><option value="120">120 Minutes</option></select></label>'''

new_edit_fields = '''              <label><span>Planned Sessions</span><input type="number" min="1" value={edit.planned_sessions} onChange={e=>setEdit({...edit,planned_sessions:e.target.value})}/></label>
              <label>
                <span>Classes Per Month</span>
                <input type="number" min="1" max="31" value={edit.classes_per_month} onChange={e=>setEdit({...edit,classes_per_month:e.target.value})}/>
                <small style={{marginTop:4,color:"#6B7280"}}>Example: 8 means eight classes in a month.</small>
              </label>
              <label><span>Class Duration</span><select value={edit.duration_minutes} onChange={e=>setEdit({...edit,duration_minutes:e.target.value})}><option value="60">60 Minutes</option><option value="90">90 Minutes</option><option value="120">120 Minutes</option></select></label>'''

if old_edit_fields not in detail:
    raise SystemExit("Could not locate Edit Batch Planned Sessions/Class Duration fields.")
detail = detail.replace(old_edit_fields, new_edit_fields, 1)

if "classes_per_month" not in detail:
    raise SystemExit("Classes-per-month patch did not apply to Batch Detail.")

detail_path.write_text(detail, encoding="utf-8")

print("Applied Classes Per Month fix.")
print("- Main Batches page reads a real classes_per_month value")
print("- Add Batch now asks for Classes Per Month")
print("- Edit Batch now asks for Classes Per Month")
print("- Batch detail header shows Classes / Month")
print("- Legacy classes_per_week kept synchronized only for old scheduling compatibility")
print("- CRM Leads untouched")
