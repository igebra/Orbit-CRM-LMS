from pathlib import Path

page_path = Path("app/lms/page.tsx")
css_path = Path("app/lms/lms.module.css")

if not page_path.exists() or not css_path.exists():
    raise SystemExit("Could not find app/lms/page.tsx and app/lms/lms.module.css. Run from Orbit-CRM-LMS root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Could not patch {label}. No files were changed.")
    return text.replace(old, new, 1)

helper_anchor = '''function shortCourseLabel(courseName: string) {
  if (courseName.startsWith("AiEdge ")) return courseName.replace("AiEdge ", "");
  if (courseName.startsWith("Coding4AI ")) return courseName.replace("Coding4AI ", "");
  if (courseName.startsWith("Math - ")) return courseName.replace("Math - ", "");
  return courseName;
}
'''

icon_components = r'''
function LibraryIcon3D() {
  return (
    <span className={styles.libraryIconShell} aria-hidden="true">
      <svg viewBox="0 0 64 64" className={styles.libraryIconSvg}>
        <defs>
          <linearGradient id="orbitLibraryTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fc6c1" />
            <stop offset="100%" stopColor="#558C89" />
          </linearGradient>
          <linearGradient id="orbitLibraryOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4b06f" />
            <stop offset="100%" stopColor="#D9853B" />
          </linearGradient>
        </defs>
        <rect x="9" y="13" width="13" height="38" rx="4" fill="url(#orbitLibraryTeal)" />
        <rect x="24" y="9" width="14" height="42" rx="4" fill="#74AFAD" />
        <rect x="40" y="16" width="13" height="35" rx="4" fill="url(#orbitLibraryOrange)" />
        <path d="M11 20h9M26 18h10M42 24h9" stroke="rgba(255,255,255,.72)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M8 52h47" stroke="#355f5d" strokeWidth="3.5" strokeLinecap="round" opacity=".45" />
      </svg>
    </span>
  );
}

function CourseFamilyIcon({ family }: { family: CourseFamily }) {
  if (family === "math") {
    return (
      <span className={`${styles.courseIconShell} ${styles.mathIconShell}`} aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <rect x="8" y="7" width="32" height="34" rx="9" fill="#fff7ef" />
          <rect x="12" y="11" width="24" height="8" rx="3" fill="#D9853B" opacity=".92" />
          <path d="M16 26h8M20 22v8M29 23h7M29 29h7" stroke="#a65e27" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (family === "coding4ai") {
    return (
      <span className={`${styles.courseIconShell} ${styles.tealIconShell}`} aria-hidden="true">
        <svg viewBox="0 0 48 48">
          <rect x="6" y="8" width="36" height="30" rx="8" fill="#eef8f6" />
          <path d="M18 18l-6 6 6 6M30 18l6 6-6 6M27 15l-6 18" fill="none" stroke="#558C89" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="35.5" cy="11.5" r="3" fill="#74AFAD" />
        </svg>
      </span>
    );
  }

  return (
    <span className={`${styles.courseIconShell} ${styles.tealIconShell}`} aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="15" fill="#eef8f6" />
        <circle cx="18" cy="22" r="4" fill="#558C89" />
        <circle cx="29" cy="17" r="3.5" fill="#74AFAD" />
        <circle cx="30" cy="30" r="4" fill="#558C89" opacity=".88" />
        <path d="M21 20l5-2M21 24l6 4M29 21v5" stroke="#356f6c" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M36 9l1.4 3.4L41 14l-3.6 1.4L36 19l-1.4-3.6L31 14l3.6-1.6L36 9z" fill="#D9853B" />
      </svg>
    </span>
  );
}
'''

if "function LibraryIcon3D()" not in page:
    page = replace_once(page, helper_anchor, helper_anchor + icon_components, "3D icon components")

old_header = '''      <header className={styles.header}>
        <div><p className={styles.kicker}>LMS · CONTENT & CURRICULUM</p><h1>Learning Management</h1><p>Official curriculum, teaching files and missing-resource tracking in one place.</p></div>
        <div className={styles.tabs}><button className={tab==="library"?styles.activeTab:""} onClick={()=>setTab("library")}>Content Library</button><button className={tab==="curriculum"?styles.activeTab:""} onClick={()=>setTab("curriculum")}>Curriculum</button></div>
      </header>'''

new_header = '''      <header className={styles.header}>
        <div className={styles.headerIdentity}>
          <LibraryIcon3D />
          <span className={styles.headerIdentityLabel}>
            {tab === "library" ? "Content Library" : "Curriculum"}
          </span>
        </div>

        <div className={styles.tabs}>
          <button
            className={tab==="library"?styles.activeTab:""}
            onClick={()=>setTab("library")}
          >
            Content Library
          </button>
          <button
            className={tab==="curriculum"?styles.activeTab:""}
            onClick={()=>setTab("curriculum")}
          >
            Curriculum
          </button>
        </div>
      </header>'''

if old_header in page:
    page = page.replace(old_header, new_header, 1)
elif "className={styles.headerIdentity}" not in page:
    raise SystemExit("Could not locate the current LMS header.")

old_family = '''        <div className={styles.familyButtons} role="group" aria-label="Course family">
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
        </div>'''

new_family = '''        <div className={styles.familyButtons} role="group" aria-label="Course family">
          <button
            type="button"
            className={`${styles.courseFamilyCard} ${styles.tealCourseCard} ${
              activeFamily === "aiedge" ? styles.courseFamilyCardActive : ""
            }`}
            onClick={() => selectFamily("aiedge")}
          >
            <CourseFamilyIcon family="aiedge" />
            <span>AiEdge</span>
          </button>

          <button
            type="button"
            className={`${styles.courseFamilyCard} ${styles.orangeCourseCard} ${
              activeFamily === "math" ? styles.courseFamilyCardActive : ""
            }`}
            onClick={() => selectFamily("math")}
          >
            <CourseFamilyIcon family="math" />
            <span>Math</span>
          </button>

          <button
            type="button"
            className={`${styles.courseFamilyCard} ${styles.tealCourseCard} ${
              activeFamily === "coding4ai" ? styles.courseFamilyCardActive : ""
            }`}
            onClick={() => selectFamily("coding4ai")}
          >
            <CourseFamilyIcon family="coding4ai" />
            <span>Coding4AI</span>
          </button>
        </div>'''

if old_family in page:
    page = page.replace(old_family, new_family, 1)
elif "styles.courseFamilyCard" not in page:
    raise SystemExit("Could not locate the current course family buttons.")

old_main_close = '''      </>}
    </main>'''

new_main_close = '''      </>}

      <img
        src="/orbit-mascot.png"
        alt=""
        aria-hidden="true"
        className={styles.pageMascot}
      />
    </main>'''

if 'className={styles.pageMascot}' not in page:
    page = replace_once(page, old_main_close, new_main_close, "bottom-right Orbit mascot")

marker = "/* ORBIT LMS FINAL SLEEK UI */"
sleek_css = r'''
/* ORBIT LMS FINAL SLEEK UI */
.main{
  position:relative;
  padding-bottom:145px;
}
.header{
  min-height:82px;
  align-items:center;
  margin-bottom:12px;
}
.headerIdentity{
  width:90px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;
}
.headerIdentityLabel{
  color:#4f6664;
  font-size:11px;
  font-weight:500;
  letter-spacing:.01em;
  white-space:nowrap;
}
.libraryIconShell{
  position:relative;
  width:55px;
  height:55px;
  display:grid;
  place-items:center;
  border:1px solid #d2e3df;
  border-radius:17px;
  background:linear-gradient(145deg,#ffffff 8%,#e9f3f1 100%);
  box-shadow:0 9px 18px rgba(33,91,87,.12),inset 0 1px 0 rgba(255,255,255,.95);
}
.libraryIconShell::after{
  content:"";
  position:absolute;
  width:42px;
  height:9px;
  left:7px;
  bottom:-6px;
  border-radius:50%;
  background:rgba(49,93,90,.13);
  filter:blur(5px);
  z-index:-1;
}
.libraryIconSvg{
  width:42px;
  height:42px;
  filter:drop-shadow(0 4px 4px rgba(30,77,74,.16));
}
.familyButtons{
  display:flex;
  align-items:flex-start;
  justify-content:flex-start;
  gap:12px;
  flex-wrap:wrap;
}
.courseFamilyCard{
  width:auto;
  min-width:96px;
  min-height:78px;
  padding:8px 13px 9px;
  border-radius:13px;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:5px;
  cursor:pointer;
  background:#fff;
  transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease,background .14s ease;
}
.courseFamilyCard>span:last-child{
  font-size:10.5px;
  font-weight:750;
  line-height:1;
  white-space:nowrap;
}
.tealCourseCard{
  border:1px solid #bdd8d4;
  color:#356c69;
  background:linear-gradient(145deg,#ffffff,#edf6f4);
}
.orangeCourseCard{
  border:1px solid #efcba7;
  color:#a65e27;
  background:linear-gradient(145deg,#ffffff,#fff3e7);
}
.courseFamilyCard:hover{
  transform:translateY(-2px);
  box-shadow:0 7px 16px rgba(32,78,76,.11);
}
.tealCourseCard.courseFamilyCardActive{
  border-color:#558C89;
  background:#f1f8f7;
  box-shadow:0 0 0 2px rgba(85,140,137,.12),0 8px 17px rgba(85,140,137,.13);
}
.orangeCourseCard.courseFamilyCardActive{
  border-color:#D9853B;
  background:#fff7ef;
  box-shadow:0 0 0 2px rgba(217,133,59,.12),0 8px 17px rgba(217,133,59,.13);
}
.courseIconShell{
  width:37px;
  height:37px;
  position:relative;
  display:grid;
  place-items:center;
  border-radius:11px;
  box-shadow:0 6px 10px rgba(33,77,75,.13),inset 0 1px 0 rgba(255,255,255,.9);
}
.courseIconShell::after{
  content:"";
  position:absolute;
  left:6px;
  right:6px;
  bottom:-4px;
  height:6px;
  border-radius:50%;
  background:rgba(37,74,72,.12);
  filter:blur(3px);
  z-index:-1;
}
.courseIconShell svg{
  width:31px;
  height:31px;
}
.tealIconShell{
  border:1px solid #c7dfdb;
  background:linear-gradient(145deg,#ffffff,#dceeea);
}
.mathIconShell{
  border:1px solid #efd0b1;
  background:linear-gradient(145deg,#ffffff,#ffe8d1);
}
.courseChoices{padding-top:2px}
.courseChoiceLabel{margin-bottom:8px!important}
.courseChips{gap:5px}
.courseChip{padding:6px 9px;font-size:9px}
.courseMeta{padding-top:9px}
.pageMascot{
  position:absolute;
  right:24px;
  bottom:14px;
  width:112px;
  height:auto;
  object-fit:contain;
  pointer-events:none;
  user-select:none;
  opacity:.92;
  filter:drop-shadow(0 10px 13px rgba(38,84,81,.13));
}
@media(max-width:900px){
  .header{min-height:auto;align-items:center;flex-direction:row}
  .headerIdentity{width:76px}
  .familyButtons{justify-content:flex-start}
  .courseFamilyCard{min-width:90px}
  .pageMascot{width:88px;right:12px}
}
@media(max-width:620px){
  .header{align-items:flex-start;flex-direction:column}
  .headerIdentity{align-items:flex-start}
  .tabs{width:100%}
  .tabs button{flex:1}
  .courseFamilyCard{min-width:86px;min-height:72px;padding:7px 11px 8px}
  .pageMascot{width:76px;opacity:.78}
}
'''

if marker not in css:
    css = css.rstrip() + sleek_css + "\n"

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("Final sleek LMS UI applied.")
print("Math - Grade 01 remains default.")
