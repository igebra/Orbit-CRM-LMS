from pathlib import Path
import re

page_path = Path("app/lms/page.tsx")
css_path = Path("app/lms/lms.module.css")

if not page_path.exists() or not css_path.exists():
    raise SystemExit("Could not find LMS files. Run from Orbit-CRM-LMS root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

old_state = '  const [course,setCourse] = useState(COURSE_OPTIONS[0] || "");'
new_state = '  const [course,setCourse] = useState("Math - Grade 01");'
if old_state in page:
    page = page.replace(old_state, new_state, 1)
elif new_state not in page:
    raise SystemExit("Could not find LMS course state.")

helper_anchor = '''function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
}
'''

helpers = r'''
type CourseFamily = "aiedge" | "math" | "coding4ai";

const COURSE_FAMILY_DEFAULTS: Record<CourseFamily, string> = {
  aiedge: "AiEdge Elementary - Level 01",
  math: "Math - Grade 01",
  coding4ai: "Coding4AI Elementary - Level 01",
};

function courseFamilyOf(courseName: string): CourseFamily {
  if (courseName.startsWith("AiEdge ")) return "aiedge";
  if (courseName.startsWith("Coding4AI ")) return "coding4ai";
  return "math";
}

function shortCourseLabel(courseName: string) {
  if (courseName.startsWith("AiEdge ")) return courseName.replace("AiEdge ", "");
  if (courseName.startsWith("Coding4AI ")) return courseName.replace("Coding4AI ", "");
  if (courseName.startsWith("Math - ")) return courseName.replace("Math - ", "");
  return courseName;
}
'''

if "type CourseFamily" not in page:
    if helper_anchor not in page:
        raise SystemExit("Could not find safeName helper.")
    page = page.replace(helper_anchor, helper_anchor + helpers, 1)

can_manage_anchor = '  const canManage = MANAGE_ROLES.includes(role);\n'
family_logic = r'''
  const activeFamily = useMemo(() => courseFamilyOf(course), [course]);

  const familyCourses = useMemo(
    () =>
      COURSE_OPTIONS.filter((courseName) => {
        if (activeFamily === "aiedge") return courseName.startsWith("AiEdge ");
        if (activeFamily === "coding4ai") return courseName.startsWith("Coding4AI ");
        return !courseName.startsWith("AiEdge ") && !courseName.startsWith("Coding4AI ");
      }),
    [activeFamily]
  );

  function selectCourseName(courseName: string) {
    setCourse(courseName);
    setSessionFilter("All");
    const defaults = courseDefaults(courseName);
    setSessionCount(String(defaults.plannedSessions || 20));
  }

  function selectFamily(family: CourseFamily) {
    selectCourseName(COURSE_FAMILY_DEFAULTS[family]);
  }

'''
if "const activeFamily = useMemo" not in page:
    if can_manage_anchor not in page:
        raise SystemExit("Could not find canManage line.")
    page = page.replace(can_manage_anchor, can_manage_anchor + family_logic, 1)

pattern = re.compile(r'\n\s*<section className=\{styles\.courseBar\}>.*?</section>', re.S)

replacement = r'''
      <section className={styles.courseBar}>
        <div className={styles.familyButtons} role="group" aria-label="Course family">
          <button
            type="button"
            className={`${styles.familyButton} ${styles.greenFamily} ${
              activeFamily === "aiedge" ? styles.familyActive : ""
            }`}
            onClick={() => selectFamily("aiedge")}
          >
            AiEdge
          </button>

          <button
            type="button"
            className={`${styles.familyButton} ${styles.mathFamily} ${
              activeFamily === "math" ? styles.familyActive : ""
            }`}
            onClick={() => selectFamily("math")}
          >
            Math
          </button>

          <button
            type="button"
            className={`${styles.familyButton} ${styles.greenFamily} ${
              activeFamily === "coding4ai" ? styles.familyActive : ""
            }`}
            onClick={() => selectFamily("coding4ai")}
          >
            Coding4AI
          </button>
        </div>

        <div className={styles.courseChoices}>
          <span className={styles.courseChoiceLabel}>
            {activeFamily === "math" ? "Grade / Course" : "Level"}
          </span>

          <div className={styles.courseChips}>
            {familyCourses.map((courseName) => (
              <button
                type="button"
                key={courseName}
                className={`${styles.courseChip} ${
                  courseName === course ? styles.courseChipActive : ""
                }`}
                onClick={() => selectCourseName(courseName)}
              >
                {shortCourseLabel(courseName)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.courseMeta}>
          <strong>{course}</strong>
          <span>
            {courseDefaults(course).plannedSessions
              ? `${courseDefaults(course).plannedSessions} planned sessions`
              : "Session count configurable"}
          </span>
        </div>
      </section>'''

page, count = pattern.subn("\n" + replacement, page, count=1)
if count != 1:
    raise SystemExit("Could not find old Course selector section.")

marker = "/* ORBIT LMS COURSE FAMILY BUTTONS */"
styles = r'''

/* ORBIT LMS COURSE FAMILY BUTTONS */
.courseBar{
  margin-bottom:12px;
  padding:14px;
  border:1px solid #d9e5e3;
  border-radius:13px;
  background:#fff;
  display:grid;
  gap:12px;
  align-items:stretch;
}
.familyButtons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.familyButton{min-height:48px;border-radius:11px;padding:10px 14px;font-size:14px;font-weight:900;letter-spacing:.01em;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease,background .12s ease}
.greenFamily{border:1px solid #a9cbc7;background:#e7f1f0;color:#356c69}
.mathFamily{border:1px solid #efc79f;background:#fff0e3;color:#a65e27}
.greenFamily.familyActive{border-color:#467d79;background:#558c89;color:#fff;box-shadow:0 5px 14px rgba(85,140,137,.22);transform:translateY(-1px)}
.mathFamily.familyActive{border-color:#bd6f2c;background:#d9853b;color:#fff;box-shadow:0 5px 14px rgba(217,133,59,.22);transform:translateY(-1px)}
.courseChoices{min-width:0}
.courseChoiceLabel{display:block!important;margin-bottom:7px!important;color:#58706f!important;font-size:9px!important;font-weight:850!important;text-transform:uppercase;text-align:left!important}
.courseChips{display:flex;flex-wrap:wrap;gap:6px}
.courseChip{border:1px solid #d3dfdc;border-radius:999px;padding:7px 10px;background:#fff;color:#536967;font-size:9.5px;font-weight:750;cursor:pointer}
.courseChip:hover{border-color:#9ebdb9;background:#f4f8f7}
.courseChipActive{border-color:#7ba39f;background:#edf5f4;color:#0f5e61;font-weight:900}
.courseMeta{padding-top:10px;border-top:1px solid #edf1f0;display:flex;align-items:center;justify-content:space-between;gap:10px}
.courseMeta strong,.courseMeta span{display:block;text-align:left!important}
.courseMeta strong{color:#183032;font-size:10.5px}
.courseMeta span{margin-top:0!important;color:#7a8988!important;font-size:9.5px!important}
@media(max-width:900px){
  .familyButtons{grid-template-columns:1fr}
  .courseMeta{align-items:flex-start;flex-direction:column}
}
'''
if marker not in css:
    css = css.rstrip() + styles + "\n"

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("LMS course selector updated.")
print("Default: Math - Grade 01")
print("Buttons: AiEdge | Math | Coding4AI")
