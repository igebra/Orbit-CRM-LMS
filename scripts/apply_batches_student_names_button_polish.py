from pathlib import Path

page_path = Path("app/batches/page.tsx")
css_path = Path("app/lms.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

type_anchor = 'type Roster = { batch_id: string; student_id: string };\n'
type_new = '''type Roster = { batch_id: string; student_id: string };
type StudentOption = { id: string; student_name: string };
'''
if "type StudentOption" not in page:
    if type_anchor not in page:
        raise SystemExit("Could not locate Roster type.")
    page = page.replace(type_anchor, type_new, 1)

state_anchor = '''  const [batches, setBatches] = useState<Batch[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);'''
state_new = '''  const [batches, setBatches] = useState<Batch[]>([]);
  const [roster, setRoster] = useState<Roster[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);'''
if "setStudents" not in page:
    if state_anchor not in page:
        raise SystemExit("Could not locate batch state block.")
    page = page.replace(state_anchor, state_new, 1)

old_load = '''    const [b, r, t] = await Promise.all([
      supabase.from("batches").select("*").order("created_at", { ascending: false }),
      supabase.from("batch_students").select("batch_id,student_id"),
      supabase.rpc("active_trainer_options"),
    ]);

    if (b.error) setMessage(b.error.message);
    setBatches((b.data || []) as Batch[]);
    setRoster((r.data || []) as Roster[]);
    setTrainers((t.data || []) as Trainer[]);
    setLoading(false);'''
new_load = '''    const [b, r, s, t] = await Promise.all([
      supabase.from("batches").select("*").order("created_at", { ascending: false }),
      supabase.from("batch_students").select("batch_id,student_id"),
      supabase.from("students").select("id,student_name").order("student_name"),
      supabase.rpc("active_trainer_options"),
    ]);

    if (b.error) setMessage(b.error.message);
    setBatches((b.data || []) as Batch[]);
    setRoster((r.data || []) as Roster[]);
    setStudents((s.data || []) as StudentOption[]);
    setTrainers((t.data || []) as Trainer[]);
    setLoading(false);'''
if old_load not in page:
    raise SystemExit("Could not locate current Batches load() block.")
page = page.replace(old_load, new_load, 1)

old_counts = '''  const counts = useMemo(() => {
    const m = new Map<string, number>();
    roster.forEach((x) => m.set(x.batch_id, (m.get(x.batch_id) || 0) + 1));
    return m;
  }, [roster]);'''
new_counts = '''  const studentNamesByBatch = useMemo(() => {
    const studentMap = new Map(students.map((student) => [student.id, student.student_name]));
    const batchMap = new Map<string, string[]>();

    roster.forEach((item) => {
      const name = studentMap.get(item.student_id);
      if (!name) return;

      const current = batchMap.get(item.batch_id) || [];
      current.push(name);
      batchMap.set(item.batch_id, current);
    });

    batchMap.forEach((names, batchId) => {
      batchMap.set(batchId, [...names].sort((a, b) => a.localeCompare(b)));
    });

    return batchMap;
  }, [roster, students]);'''
if old_counts not in page:
    raise SystemExit("Could not locate batch count memo.")
page = page.replace(old_counts, new_counts, 1)

old_student_cell = '''                    <td>{counts.get(b.id) || 0} / {b.max_students}</td>'''
new_student_cell = '''                    <td>
                      <div className={styles.batchStudentList}>
                        {(studentNamesByBatch.get(b.id) || []).length === 0 ? (
                          <span className={styles.batchStudentEmpty}>—</span>
                        ) : (
                          (studentNamesByBatch.get(b.id) || []).map((name) => (
                            <span key={name} className={styles.batchStudentChip}>{name}</span>
                          ))
                        )}
                      </div>
                    </td>'''
if old_student_cell not in page:
    raise SystemExit("Could not locate Students count cell.")
page = page.replace(old_student_cell, new_student_cell, 1)

old_actions = '''                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button
                          className={styles.smallButton}
                          onClick={() => router.push(`/batches/${b.id}`)}
                        >
                          Open
                        </button>
                        {canDelete && (
                          <button
                            className={styles.danger}
                            onClick={() => deleteBatch(b)}
                          >
                            Delete
                          </button>
                        )}
                      </div>'''
new_actions = '''                      <div className={styles.compactTableActions}>
                        <button
                          className={styles.compactOpenButton}
                          onClick={() => router.push(`/batches/${b.id}`)}
                          title={`Open ${b.batch_name}`}
                        >
                          Open
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            className={styles.iconDeleteButton}
                            onClick={() => deleteBatch(b)}
                            title={`Delete ${b.batch_name}`}
                            aria-label={`Delete ${b.batch_name}`}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M8 8v9m4-9v9m4-9v9M5 6h14M9 6V4h6v2m3 0-1 14H7L6 6" />
                            </svg>
                          </button>
                        )}
                      </div>'''
if old_actions not in page:
    raise SystemExit("Could not locate Batches action buttons.")
page = page.replace(old_actions, new_actions, 1)

page_path.write_text(page, encoding="utf-8")

marker = "/* ORBIT COMPACT BUTTONS + BATCH STUDENT NAMES */"
if marker not in css:
    css += r'''

/* ORBIT COMPACT BUTTONS + BATCH STUDENT NAMES */

/* Shared internal Orbit button polish */
.primary,
.secondary,
.danger,
.smallButton{
  min-height:32px;
  padding:6px 10px;
  border-radius:8px;
  font-size:11px;
  line-height:1.1;
  box-shadow:none;
}

.primary{
  border:1px solid #cf7c34;
  background:#df8a3c;
}

.primary:hover{
  background:#d98032;
}

.secondary,
.smallButton{
  background:#fff;
  border-color:#d2dfdc;
}

.danger{
  background:#fff;
  border-color:#eccbc7;
  color:#a44a43;
}

/* Batches student-name column */
.batchStudentList{
  display:flex;
  flex-wrap:wrap;
  gap:4px;
  max-width:260px;
}

.batchStudentChip{
  display:inline-flex;
  align-items:center;
  min-height:23px;
  padding:3px 7px;
  border:1px solid #d6e4e1;
  border-radius:999px;
  background:#f5faf9;
  color:#315b5a;
  font-size:10px;
  font-weight:700;
  line-height:1.15;
  white-space:normal;
}

.batchStudentEmpty{
  color:#93a09f;
}

/* Compact table actions */
.compactTableActions{
  display:flex;
  align-items:center;
  gap:6px;
  flex-wrap:nowrap;
}

.compactOpenButton{
  min-height:31px;
  padding:0 10px;
  border:1px solid #cfddda;
  border-radius:8px;
  background:#fff;
  color:#0f5e61;
  font-size:10.5px;
  font-weight:800;
  cursor:pointer;
}

.compactOpenButton:hover{
  background:#f4f9f8;
  border-color:#a8c7c3;
}

.iconDeleteButton{
  width:31px;
  height:31px;
  padding:0;
  display:grid;
  place-items:center;
  border:1px solid transparent;
  border-radius:8px;
  background:transparent;
  color:#a65a53;
  cursor:pointer;
}

.iconDeleteButton:hover{
  border-color:#efd2ce;
  background:#fff4f2;
  color:#9b4039;
}

.iconDeleteButton svg{
  width:16px;
  height:16px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.7;
  stroke-linecap:round;
  stroke-linejoin:round;
}
'''
css_path.write_text(css, encoding="utf-8")

print("Applied:")
print("- Batch list now shows student names")
print("- Delete is icon-only bin button")
print("- Open button is compact")
print("- Shared lms.module.css buttons are slimmer")
print("- No SQL / no database changes")
