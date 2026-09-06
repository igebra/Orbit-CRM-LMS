from pathlib import Path

page_path = Path("app/lms/page.tsx")
css_path = Path("app/lms/lms.module.css")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

if "function CurriculumIcon3D()" not in page:
    anchor = "function CourseFamilyIcon({ family }: { family: CourseFamily }) {"
    component = """
function CurriculumIcon3D() {
  return (
    <span className={styles.curriculumIconShell} aria-hidden="true">
      <svg viewBox="0 0 64 64" className={styles.curriculumIconSvg}>
        <defs>
          <linearGradient id="currPaper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e3f0ee" />
          </linearGradient>
        </defs>
        <rect x="12" y="9" width="40" height="46" rx="10" fill="url(#currPaper)" />
        <rect x="18" y="16" width="18" height="5" rx="2.5" fill="#558C89" />
        <circle cx="21" cy="31" r="3" fill="#D9853B" />
        <circle cx="21" cy="41" r="3" fill="#74AFAD" />
        <path d="M28 31h15M28 41h12" stroke="#558C89" strokeWidth="3" strokeLinecap="round" />
        <path d="M42 11l6 6h-6z" fill="#b9d6d2" />
      </svg>
    </span>
  );
}

"""
    if anchor not in page:
        raise SystemExit("Could not find icon anchor.")
    page = page.replace(anchor, component + anchor, 1)

old_header = """      <header className={styles.header}>
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
      </header>"""

new_header = """      <header className={styles.header}>
        <div className={styles.lmsHeaderTitle}>
          <h1>LMS</h1>
        </div>

        <div className={styles.lmsViewTabs} role="tablist" aria-label="LMS sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab==="library"}
            className={`${styles.lmsViewTab} ${tab==="library"?styles.lmsViewTabActive:""}`}
            onClick={()=>setTab("library")}
          >
            <LibraryIcon3D />
            <span>Content Library</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab==="curriculum"}
            className={`${styles.lmsViewTab} ${tab==="curriculum"?styles.lmsViewTabActive:""}`}
            onClick={()=>setTab("curriculum")}
          >
            <CurriculumIcon3D />
            <span>Curriculum</span>
          </button>
        </div>
      </header>"""

if old_header in page:
    page = page.replace(old_header, new_header, 1)
elif "styles.lmsHeaderTitle" not in page:
    raise SystemExit("Could not locate current LMS header.")

marker = "/* ORBIT LMS HEADER FIX FINAL */"
if marker not in css:
    css += r"""

/* ORBIT LMS HEADER FIX FINAL */
.header{
  min-height:92px;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:20px;
  margin-bottom:14px;
}
.lmsHeaderTitle{
  padding-top:8px;
}
.lmsHeaderTitle h1{
  margin:0;
  color:#153536;
  font-size:32px;
  font-weight:700;
  line-height:1;
}
.lmsViewTabs{
  display:flex;
  gap:10px;
}
.lmsViewTab{
  min-width:104px;
  min-height:80px;
  padding:8px 10px;
  border:1px solid #d3e0dd;
  border-radius:14px;
  background:#fff;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:5px;
  color:#566b69;
  cursor:pointer;
}
.lmsViewTab>span:last-child{
  font-size:10px;
  font-weight:650;
  white-space:nowrap;
}
.lmsViewTabActive{
  border-color:#6faaa5;
  background:#f3f8f7;
  color:#0f5e61;
  box-shadow:0 0 0 2px rgba(85,140,137,.08),0 8px 16px rgba(33,77,75,.09);
}
.lmsViewTab .libraryIconShell,
.curriculumIconShell{
  width:42px;
  height:42px;
  border-radius:12px;
}
.lmsViewTab .libraryIconSvg,
.curriculumIconSvg{
  width:31px;
  height:31px;
}
.curriculumIconShell{
  display:grid;
  place-items:center;
  border:1px solid #d2e3df;
  background:linear-gradient(145deg,#ffffff,#e9f3f1);
  box-shadow:0 6px 12px rgba(33,91,87,.11);
}
.curriculumIconSvg{
  filter:drop-shadow(0 3px 3px rgba(30,77,74,.12));
}
.pageMascot{
  right:28px;
  bottom:30px;
  width:72px;
  opacity:.9;
  animation:orbitMascotFloat 4.2s ease-in-out infinite;
}
@keyframes orbitMascotFloat{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-7px)}
}
@media(prefers-reduced-motion:reduce){
  .pageMascot{animation:none}
}
@media(max-width:620px){
  .header{flex-direction:column}
  .lmsViewTabs{width:100%}
  .lmsViewTab{flex:1}
  .pageMascot{width:56px}
}
"""

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("LMS header fix applied.")
