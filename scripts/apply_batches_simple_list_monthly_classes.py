from pathlib import Path

page_path = Path("app/batches/page.tsx")
css_path = Path("app/lms.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# 1) Simplify Batches table columns
# Remove End Date + Classes / Week
# Add Classes / Month
# ------------------------------------------------------------
old_header = '''                  <th>Selected Time</th>
                  <th>India Time</th>
                  <th>End Date</th>
                  <th>Classes / Week</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th></th>'''

new_header = '''                  <th>Selected Time</th>
                  <th>India Time</th>
                  <th>Classes / Month</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th></th>'''

if old_header not in page:
    raise SystemExit("Could not locate current Batches table header.")
page = page.replace(old_header, new_header, 1)

page = page.replace(
    '<tr><td colSpan={10} className={styles.empty}>Loading batches...</td></tr>',
    '<tr><td colSpan={9} className={styles.empty}>Loading batches...</td></tr>',
    1,
)
page = page.replace(
    '<tr><td colSpan={10} className={styles.empty}>No batches found.</td></tr>',
    '<tr><td colSpan={9} className={styles.empty}>No batches found.</td></tr>',
    1,
)

old_cells = '''                    <td>{fmt(b.start_at, b.source_timezone || "America/New_York")}</td>
                    <td>{fmt(b.start_at, "Asia/Kolkata")}</td>
                    <td>{b.end_date || "—"}</td>
                    <td>{b.classes_per_week || 1}×</td>
                    <td>'''

new_cells = '''                    <td>{fmt(b.start_at, b.source_timezone || "America/New_York")}</td>
                    <td>{fmt(b.start_at, "Asia/Kolkata")}</td>
                    <td>{(b.classes_per_week || 1) * 4}</td>
                    <td>'''

if old_cells not in page:
    raise SystemExit("Could not locate current Batches table cells.")
page = page.replace(old_cells, new_cells, 1)

# ------------------------------------------------------------
# 2) Student names as plain list - no chips / pills
# ------------------------------------------------------------
old_students = '''                      <div className={styles.batchStudentList}>
                        {(studentNamesByBatch.get(b.id) || []).length === 0 ? (
                          <span className={styles.batchStudentEmpty}>—</span>
                        ) : (
                          (studentNamesByBatch.get(b.id) || []).map((name) => (
                            <span key={name} className={styles.batchStudentChip}>{name}</span>
                          ))
                        )}
                      </div>'''

new_students = '''                      <div className={styles.batchStudentList}>
                        {(studentNamesByBatch.get(b.id) || []).length === 0 ? (
                          <span className={styles.batchStudentEmpty}>—</span>
                        ) : (
                          (studentNamesByBatch.get(b.id) || []).map((name) => (
                            <span key={name} className={styles.batchStudentName}>{name}</span>
                          ))
                        )}
                      </div>'''

if old_students not in page:
    raise SystemExit("Could not locate current student-name chips.")
page = page.replace(old_students, new_students, 1)

page_path.write_text(page, encoding="utf-8")

# ------------------------------------------------------------
# 3) Plain student-list styling
# ------------------------------------------------------------
marker = "/* ORBIT BATCHES SIMPLE STUDENT LIST + MONTHLY CLASSES */"
if marker not in css:
    css += r'''

/* ORBIT BATCHES SIMPLE STUDENT LIST + MONTHLY CLASSES */
.batchStudentList{
  display:grid;
  gap:3px;
  max-width:220px;
}

.batchStudentName{
  display:block;
  padding:0;
  margin:0;
  border:0;
  border-radius:0;
  background:transparent;
  color:#183032;
  font-size:11px;
  font-weight:600;
  line-height:1.35;
}

.batchStudentEmpty{
  color:#93a09f;
  font-size:11px;
}
'''

css_path.write_text(css, encoding="utf-8")

print("Applied:")
print("- Student names are now plain text list")
print("- End Date removed from Batches table")
print("- Classes / Week removed from Batches table")
print("- Classes / Month added (weekly frequency × 4)")
print("- No SQL / no database changes")
