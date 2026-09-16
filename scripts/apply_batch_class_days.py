from pathlib import Path

list_path = Path('app/batches/page.tsx')
detail_path = Path('app/batches/[id]/page.tsx')
css_path = Path('app/lms.module.css')

for p in (list_path, detail_path, css_path):
    if not p.exists():
        raise SystemExit(f'Missing {p}. Run this from the Orbit repository root.')

page = list_path.read_text(encoding='utf-8')
detail = detail_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')

days_const = '''const CLASS_DAYS = [
  { value: "Mon", label: "Mon" },
  { value: "Tue", label: "Tue" },
  { value: "Wed", label: "Wed" },
  { value: "Thu", label: "Thu" },
  { value: "Fri", label: "Fri" },
  { value: "Sat", label: "Sat" },
  { value: "Sun", label: "Sun" },
];

'''

if 'const CLASS_DAYS' not in page:
    page = page.replace('const TIMEZONES = [', days_const + 'const TIMEZONES = [', 1)
if 'const CLASS_DAYS' not in detail:
    detail = detail.replace('const PAYMENT_MODES = [', days_const + 'const PAYMENT_MODES = [', 1)

page = page.replace(
'''  classes_per_month: number | null;
  default_duration_minutes: number | null;''',
'''  classes_per_month: number | null;
  class_days: string[] | null;
  default_duration_minutes: number | null;''',1)
page = page.replace(
'''  classes_per_month: string;
  duration_minutes: string;''',
'''  classes_per_month: string;
  class_days: string[];
  duration_minutes: string;''',1)
page = page.replace(
'''  classes_per_month: "4",
  duration_minutes: "90",''',
'''  classes_per_month: "4",
  class_days: [],
  duration_minutes: "90",''',1)

if 'function toggleClassDay' not in page:
    page = page.replace(
'''  function chooseTrainer(id: string) {
    setForm((f) => ({ ...f, trainer_id: id }));
  }''',
'''  function chooseTrainer(id: string) {
    setForm((f) => ({ ...f, trainer_id: id }));
  }

  function toggleClassDay(day: string) {
    setForm((current) => ({
      ...current,
      class_days: current.class_days.includes(day)
        ? current.class_days.filter((item) => item !== day)
        : [...current.class_days, day],
    }));
  }''',1)

page = page.replace(
'''      classes_per_month: Number(form.classes_per_month || 4),
      classes_per_week: Math.max(1, Math.ceil(Number(form.classes_per_month || 4) / 4)),
      default_duration_minutes: Number(form.duration_minutes || 90),''',
'''      classes_per_month: Number(form.classes_per_month || 4),
      classes_per_week: Math.max(1, Math.ceil(Number(form.classes_per_month || 4) / 4)),
      class_days: form.class_days,
      default_duration_minutes: Number(form.duration_minutes || 90),''',1)

old_add = '''                <label>
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
new_add = '''                <label>
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
                </div>'''
if old_add not in page:
    raise SystemExit('Could not locate Add Batch Classes Per Month field.')
page = page.replace(old_add, new_add, 1)
list_path.write_text(page, encoding='utf-8')

detail = detail.replace(
'''  planned_sessions:number|null; classes_per_week:number|null; classes_per_month:number|null; default_duration_minutes:number|null; status:string; max_students:number;''',
'''  planned_sessions:number|null; classes_per_week:number|null; classes_per_month:number|null; class_days:string[]|null; default_duration_minutes:number|null; status:string; max_students:number;''',1)
detail = detail.replace(
'''  const [edit,setEdit] = useState({trainer_id:"",trainer_name:"",end_date:"",recurring_zoom_url:"",planned_sessions:"",classes_per_month:"4",duration_minutes:"90",status:"Active"});''',
'''  const [edit,setEdit] = useState({trainer_id:"",trainer_name:"",end_date:"",recurring_zoom_url:"",planned_sessions:"",classes_per_month:"4",class_days:[] as string[],duration_minutes:"90",status:"Active"});''',1)
detail = detail.replace(
'''      classes_per_month:String(batch.classes_per_month || ((batch.classes_per_week||1)*4)),
      duration_minutes:String(batch.default_duration_minutes||90),''',
'''      classes_per_month:String(batch.classes_per_month || ((batch.classes_per_week||1)*4)),
      class_days:batch.class_days || [],
      duration_minutes:String(batch.default_duration_minutes||90),''',1)
detail = detail.replace(
'''      classes_per_month:Number(edit.classes_per_month||4),
      classes_per_week:Math.max(1,Math.ceil(Number(edit.classes_per_month||4)/4)),
      default_duration_minutes:Number(edit.duration_minutes||90),''',
'''      classes_per_month:Number(edit.classes_per_month||4),
      classes_per_week:Math.max(1,Math.ceil(Number(edit.classes_per_month||4)/4)),
      class_days:edit.class_days,
      default_duration_minutes:Number(edit.duration_minutes||90),''',1)

if 'function toggleEditClassDay' not in detail:
    detail = detail.replace(
'''  function chooseTrainer(id:string) {
    const t = trainers.find(x=>x.id===id);
    setEdit(e=>({...e,trainer_id:id,trainer_name:t?.trainer_name||""}));
  }''',
'''  function chooseTrainer(id:string) {
    const t = trainers.find(x=>x.id===id);
    setEdit(e=>({...e,trainer_id:id,trainer_name:t?.trainer_name||""}));
  }

  function toggleEditClassDay(day:string) {
    setEdit(current=>({
      ...current,
      class_days:current.class_days.includes(day)
        ? current.class_days.filter(item=>item!==day)
        : [...current.class_days,day]
    }));
  }''',1)

detail = detail.replace(
'''              <span>{batch.classes_per_month || ((batch.classes_per_week||1)*4)} classes / month</span>''',
'''              <span>{batch.classes_per_month || ((batch.classes_per_week||1)*4)} classes / month</span>
              {batch.class_days && batch.class_days.length > 0 && <span>{batch.class_days.join(" · ")}</span>}''',1)
detail = detail.replace(
'''                <div><span>Classes / Month</span><strong>{batch.classes_per_month || ((batch.classes_per_week||1)*4)}</strong></div>''',
'''                <div><span>Classes / Month</span><strong>{batch.classes_per_month || ((batch.classes_per_week||1)*4)}</strong></div>
                <div><span>Class Days</span><strong>{batch.class_days && batch.class_days.length > 0 ? batch.class_days.join(", ") : "—"}</strong></div>''',1)

old_edit = '''              <label>
                <span>Classes Per Month</span>
                <input type="number" min="1" max="31" value={edit.classes_per_month} onChange={e=>setEdit({...edit,classes_per_month:e.target.value})}/>
                <small style={{marginTop:4,color:"#6B7280"}}>Example: 8 means eight classes in a month.</small>
              </label>'''
new_edit = '''              <label>
                <span>Classes Per Month</span>
                <input type="number" min="1" max="31" value={edit.classes_per_month} onChange={e=>setEdit({...edit,classes_per_month:e.target.value})}/>
                <small style={{marginTop:4,color:"#6B7280"}}>Example: 8 means eight classes in a month.</small>
              </label>

              <div className={`${styles.classDaysField} ${styles.full}`}>
                <span className={styles.classDaysLabel}>Class Days</span>
                <div className={styles.classDaysGrid}>
                  {CLASS_DAYS.map(day=>{
                    const selected=edit.class_days.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`${styles.classDayButton} ${selected?styles.classDayButtonActive:""}`}
                        onClick={()=>toggleEditClassDay(day.value)}
                        aria-pressed={selected}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                <small>Select all regular class days.</small>
              </div>'''
if old_edit not in detail:
    raise SystemExit('Could not locate Edit Batch Classes Per Month field.')
detail = detail.replace(old_edit, new_edit, 1)
detail_path.write_text(detail, encoding='utf-8')

marker = '/* ORBIT CLASS DAYS SELECTOR */'
if marker not in css:
    css += '''

/* ORBIT CLASS DAYS SELECTOR */
.classDaysField{display:grid;gap:7px}
.classDaysLabel{color:#183536;font-size:11px;font-weight:800}
.classDaysGrid{display:flex;flex-wrap:wrap;gap:7px}
.classDayButton{min-width:52px;height:36px;padding:0 12px;border:1px solid #d4e0dd;border-radius:9px;background:#fff;color:#345654;font-size:10.5px;font-weight:800;cursor:pointer;box-shadow:none}
.classDayButton:hover{border-color:#9bbfba;background:#f5faf9}
.classDayButtonActive{border-color:#558C89;background:#e7f3f1;color:#0e6264;box-shadow:0 0 0 2px rgba(85,140,137,.08)}
.classDaysField small{color:#6B7280;font-size:9.5px}
'''
css_path.write_text(css, encoding='utf-8')
print('Applied Class Days selector.')
