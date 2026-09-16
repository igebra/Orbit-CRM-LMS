from pathlib import Path
import re

page_path = Path("app/batches/page.tsx")
css_path = Path("app/lms.module.css")

for path in (page_path, css_path):
    if not path.exists():
        raise SystemExit(f"Missing {path}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

changed = []

# ------------------------------------------------------------
# 1) Center Classes / Month header
# ------------------------------------------------------------
if 'className={styles.batchClassesMonth}' not in page:
    old_header = '<th>Classes / Month</th>'
    new_header = '<th className={styles.batchClassesMonth}>Classes / Month</th>'
    if old_header not in page:
        raise SystemExit("Could not locate the Classes / Month table header.")
    page = page.replace(old_header, new_header, 1)
    changed.append("Classes / Month header centered")

# ------------------------------------------------------------
# 2) Center Classes / Month values
# Supports both the new real monthly field and the older fallback display.
# ------------------------------------------------------------
monthly_cell_variants = [
    '<td>{b.classes_per_month || ((b.classes_per_week || 1) * 4)}</td>',
    '<td>{(b.classes_per_week || 1) * 4}</td>',
]

if not re.search(r'<td\s+className=\{styles\.batchClassesMonth\}>\s*\{', page):
    replaced = False
    for old_cell in monthly_cell_variants:
        if old_cell in page:
            new_cell = old_cell.replace('<td>', '<td className={styles.batchClassesMonth}>', 1)
            page = page.replace(old_cell, new_cell, 1)
            replaced = True
            break
    if not replaced:
        raise SystemExit("Could not locate the Classes / Month value cell.")
    changed.append("Classes / Month values centered")

# ------------------------------------------------------------
# 3) Make batch status neutral like the Open button
# ------------------------------------------------------------
old_status = '<td><span className={styles.badge}>{b.status}</span></td>'
new_status = '<td><span className={styles.batchStatusNeutral}>{b.status}</span></td>'

if 'className={styles.batchStatusNeutral}' not in page:
    if old_status not in page:
        raise SystemExit("Could not locate the current batch status badge.")
    page = page.replace(old_status, new_status, 1)
    changed.append("Status changed to neutral Open-style control")

page_path.write_text(page, encoding="utf-8")

# ------------------------------------------------------------
# 4) Cosmetic CSS only
# ------------------------------------------------------------
marker = "/* ORBIT BATCHES COSMETIC ALIGNMENT + NEUTRAL STATUS */"
if marker not in css:
    css += r'''

/* ORBIT BATCHES COSMETIC ALIGNMENT + NEUTRAL STATUS */
.batchClassesMonth{
  text-align:center!important;
  vertical-align:middle!important;
}

.batchStatusNeutral{
  min-height:31px;
  padding:0 10px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:1px solid #cfddda;
  border-radius:8px;
  background:#ffffff;
  color:#0f5e61;
  font-size:10.5px;
  font-weight:800;
  line-height:1;
  white-space:nowrap;
  box-shadow:none;
}
'''
    changed.append("Cosmetic CSS added")

css_path.write_text(css, encoding="utf-8")

print("Applied Orbit Batches cosmetic update:")
for item in changed:
    print(f"- {item}")
print("- No SQL / no database changes")
print("- No CRM, student, payment, or batch data changed")
