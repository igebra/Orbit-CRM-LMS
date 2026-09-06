from pathlib import Path

page_path = Path("app/courses/page.tsx")
css_path = Path("app/courses/courses.module.css")

if not page_path.exists() or not css_path.exists():
    raise SystemExit("Could not find the Courses files. Run this from the Orbit-CRM-LMS root folder.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

icon_component = r"""
function CourseIcon3D({ courseId }: { courseId: string }) {
  if (courseId === "math") {
    return (
      <span className={`${styles.courseNameIcon} ${styles.mathCourseIcon}`} aria-hidden="true">
        <svg viewBox="0 0 56 56">
          <defs>
            <linearGradient id="mathIconFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fffaf4" />
              <stop offset="100%" stopColor="#ffe3c7" />
            </linearGradient>
          </defs>
          <rect x="8" y="6" width="40" height="44" rx="11" fill="url(#mathIconFace)" />
          <rect x="13" y="11" width="30" height="10" rx="4" fill="#D9853B" />
          <path d="M17 31h10M22 26v10M33 27h8M33 35h8" stroke="#a65322" strokeWidth="3" strokeLinecap="round" />
          <circle cx="39" cy="18" r="2" fill="#fff" opacity=".85" />
        </svg>
      </span>
    );
  }

  if (courseId === "coding4ai") {
    return (
      <span className={`${styles.courseNameIcon} ${styles.codingCourseIcon}`} aria-hidden="true">
        <svg viewBox="0 0 56 56">
          <defs>
            <linearGradient id="codeIconFace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5fbff" />
              <stop offset="100%" stopColor="#d9edf6" />
            </linearGradient>
          </defs>
          <rect x="6" y="9" width="44" height="37" rx="11" fill="url(#codeIconFace)" />
          <path d="M21 20l-8 8 8 8M35 20l8 8-8 8M32 16l-8 24" fill="none" stroke="#246f8f" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="44" cy="12" r="4" fill="#74AFAD" />
          <path d="M44 9.8v4.4M41.8 12h4.4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${styles.courseNameIcon} ${styles.aiCourseIcon}`} aria-hidden="true">
      <svg viewBox="0 0 56 56">
        <defs>
          <linearGradient id="aiIconFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6fffd" />
            <stop offset="100%" stopColor="#d8efeb" />
          </linearGradient>
        </defs>
        <circle cx="27" cy="29" r="18" fill="url(#aiIconFace)" />
        <circle cx="20" cy="28" r="5" fill="#558C89" />
        <circle cx="33" cy="20" r="4" fill="#74AFAD" />
        <circle cx="35" cy="35" r="5" fill="#3f817d" />
        <path d="M24 26l6-4M24 31l7 3M33 24l1 6" stroke="#356f6c" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M43 8l1.8 4.2L49 14l-4.2 1.8L43 20l-1.8-4.2L37 14l4.2-1.8L43 8z" fill="#D9853B" />
      </svg>
    </span>
  );
}
"""

if "function CourseIcon3D(" not in page:
    anchor = "export default function CoursesPage()"
    if anchor not in page:
        raise SystemExit("Could not find CoursesPage. No files were changed.")
    page = page.replace(anchor, icon_component + "\n" + anchor, 1)

old_title = """                <h2>{course.name}</h2>
                <p>{course.tagline}</p>"""
new_title = """                <div className={styles.courseTitleRow}>
                  <CourseIcon3D courseId={course.id} />
                  <h2>{course.name}</h2>
                </div>
                <p>{course.tagline}</p>"""

if old_title in page:
    page = page.replace(old_title, new_title, 1)
elif "className={styles.courseTitleRow}" not in page:
    raise SystemExit("Could not locate the course title block. No files were changed.")

marker = "/* ORBIT COURSES CARD ALIGNMENT + 3D ICON POLISH */"
styles = r"""

/* ORBIT COURSES CARD ALIGNMENT + 3D ICON POLISH */
.courseGrid{
  align-items:stretch;
}

.courseCard{
  display:flex;
  flex-direction:column;
  height:100%;
}

.courseBody{
  display:flex;
  flex:1;
  flex-direction:column;
}

.metrics{
  margin-bottom:15px;
}

.price{
  margin-top:auto;
}

.courseTitleRow{
  display:flex;
  align-items:center;
  gap:12px;
  margin:7px 0 5px;
  min-width:0;
}

.courseTitleRow h2{
  margin:0;
  line-height:1.05;
}

.courseNameIcon{
  position:relative;
  flex:0 0 52px;
  width:52px;
  height:52px;
  display:grid;
  place-items:center;
  border-radius:15px;
  background:rgba(255,255,255,.95);
  border:1px solid rgba(255,255,255,.72);
  box-shadow:
    0 10px 18px rgba(0,0,0,.16),
    inset 0 1px 0 rgba(255,255,255,1),
    inset 0 -3px 7px rgba(15,69,66,.08);
}

.courseNameIcon::after{
  content:"";
  position:absolute;
  left:8px;
  right:8px;
  bottom:-5px;
  height:8px;
  border-radius:50%;
  background:rgba(0,0,0,.15);
  filter:blur(4px);
  z-index:-1;
}

.courseNameIcon svg{
  width:43px;
  height:43px;
  filter:drop-shadow(0 4px 4px rgba(0,0,0,.10));
}

.aiCourseIcon{
  background:linear-gradient(145deg,#ffffff,#dcefeb);
}

.codingCourseIcon{
  background:linear-gradient(145deg,#ffffff,#dceef6);
}

.mathCourseIcon{
  background:linear-gradient(145deg,#ffffff,#ffe6cf);
}

.actions{
  align-items:stretch;
}

.actions>.primary,
.actions>.secondary{
  flex:1 1 0;
  min-width:0;
  min-height:48px;
  text-align:center;
  line-height:1.2;
}

@media(max-width:1150px){
  .courseCard{
    height:auto;
  }

  .price{
    margin-top:15px;
  }
}

@media(max-width:520px){
  .courseTitleRow{
    gap:9px;
  }

  .courseNameIcon{
    flex-basis:45px;
    width:45px;
    height:45px;
    border-radius:13px;
  }

  .courseNameIcon svg{
    width:37px;
    height:37px;
  }

  .actions{
    flex-wrap:wrap;
  }

  .actions>.primary,
  .actions>.secondary{
    flex:1 1 130px;
  }
}
"""

if marker not in css:
    css = css.rstrip() + styles + "\n"

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("Courses page polished.")
print("- All three cards align at the bottom.")
print("- Added individual 3D icons beside AiEdge, Coding4AI and Math.")
