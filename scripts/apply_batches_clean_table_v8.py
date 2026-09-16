from pathlib import Path

page_path = Path("app/batches/page.tsx")
css_path = Path("app/lms.module.css")

for p in (page_path, css_path):
    if not p.exists():
        raise SystemExit(f"Missing {p}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

# ============================================================
# 1) Cleaner date/time helpers
# ============================================================

old_fmt = '''function fmt(iso: string | null, zone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
  }).format(new Date(iso));
}'''

new_fmt = '''function fmt(iso: string | null, zone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso));
}

function fmtClassTime(iso: string | null, zone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function fmtClassDays(days: string[] | null) {
  if (!days || days.length === 0) return "—";
  const order = CLASS_DAYS.map((day) => day.value);
  return [...days]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .join(", ");
}'''

if "function fmtClassTime(" not in page:
    if old_fmt not in page:
        raise SystemExit("Could not locate fmt() helper.")
    page = page.replace(old_fmt, new_fmt, 1)

# ============================================================
# 2) Main Batches table:
#    remove Selected Time + India Time
#    add Class Time + Class Days
# ============================================================

old_header = '''                  <th>Batch</th>
                  <th>Course</th>
                  <th>Trainer</th>
                  <th>Selected Time</th>
                  <th>India Time</th>
                  <th className={styles.batchClassesMonth}>Classes / Month</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th></th>'''

new_header = '''                  <th>Batch</th>
                  <th>Course</th>
                  <th>Trainer</th>
                  <th>Class Time</th>
                  <th>Class Days</th>
                  <th className={styles.batchClassesMonth}>Classes / Month</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th></th>'''

if old_header not in page:
    raise SystemExit("Could not locate current Batches table header.")
page = page.replace(old_header, new_header, 1)

old_cells = '''                    <td>{b.batch_name}</td>
                    <td>{b.course_name}</td>
                    <td>{b.trainer_name || "—"}</td>
                    <td>{fmt(b.start_at, b.source_timezone || "America/New_York")}</td>
                    <td>{fmt(b.start_at, "Asia/Kolkata")}</td>
                    <td className={styles.batchClassesMonth}>{b.classes_per_month || ((b.classes_per_week || 1) * 4)}</td>'''

new_cells = '''                    <td>{b.batch_name}</td>
                    <td>{b.course_name}</td>
                    <td>{b.trainer_name || "—"}</td>
                    <td className={styles.batchClassTime}>{fmtClassTime(b.start_at, b.source_timezone || "America/New_York")}</td>
                    <td className={styles.batchClassDaysText}>{fmtClassDays(b.class_days)}</td>
                    <td className={styles.batchClassesMonth}>{b.classes_per_month || ((b.classes_per_week || 1) * 4)}</td>'''

if old_cells not in page:
    raise SystemExit("Could not locate current Batches table time cells.")
page = page.replace(old_cells, new_cells, 1)

# ============================================================
# 3) Remove section headings from Add Batch modal
# ============================================================

batch_details_heading = '''                <div className={`${styles.formSectionTitle} ${styles.full}`}>
                  <strong>Batch Details</strong>
                  <span>Basic batch information</span>
                </div>

'''

schedule_heading = '''                <div className={`${styles.formSectionTitle} ${styles.full}`}>
                  <strong>Schedule</strong>
                  <span>Dates, class time and recurring days</span>
                </div>

'''

page = page.replace(batch_details_heading, "", 1)
page = page.replace(schedule_heading, "", 1)

page_path.write_text(page, encoding="utf-8")

# ============================================================
# 4) Styling
# ============================================================

marker = "/* ORBIT BATCHES CLEAN TABLE V8 */"
if marker not in css:
    css += r'''

/* ORBIT BATCHES CLEAN TABLE V8 */
.batchClassTime{
  white-space:nowrap;
  font-weight:650;
}

.batchClassDaysText{
  white-space:nowrap;
  color:#315b5a;
  font-weight:650;
}
'''

css_path.write_text(css, encoding="utf-8")

print("Applied V8:")
print("- Removed Selected Time from main Batches table")
print("- Removed India Time from main Batches table")
print("- Added Class Time only")
print("- Added Class Days")
print("- No GMT +5:30 on Batches page formatting")
print("- Removed Batch Details heading")
print("- Removed Schedule heading")
print("- Start date remains inside the batch / Add Batch form")
print("- No SQL / no database changes")
