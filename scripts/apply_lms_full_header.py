from pathlib import Path

page_path = Path("app/lms/page.tsx")
css_path = Path("app/lms/lms.module.css")

if not page_path.exists() or not css_path.exists():
    raise SystemExit("Could not find LMS files. Run from the Orbit-CRM-LMS root folder.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

if "function LmsHeaderIcon3D()" not in page:
    anchor = "function CurriculumIcon3D() {"
    if anchor not in page:
        anchor = "function CourseFamilyIcon({ family }: { family: CourseFamily }) {"

    component = r'''
function LmsHeaderIcon3D() {
  return (
    <span className={styles.lmsHeaderIcon3D} aria-hidden="true">
      <svg viewBox="0 0 72 72" className={styles.lmsHeaderIconSvg}>
        <defs>
          <linearGradient id="lmsBookTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9acbc6" />
            <stop offset="100%" stopColor="#558C89" />
          </linearGradient>
          <linearGradient id="lmsBookOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f1b276" />
            <stop offset="100%" stopColor="#D9853B" />
          </linearGradient>
          <linearGradient id="lmsScreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e7f2f0" />
          </linearGradient>
        </defs>

        <rect x="14" y="12" width="44" height="34" rx="10" fill="url(#lmsScreen)" />
        <rect x="19" y="17" width="34" height="22" rx="6" fill="#eef7f5" />
        <path d="M27 29h18" stroke="#558C89" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 21v16" stroke="#74AFAD" strokeWidth="3" strokeLinecap="round" opacity=".75" />

        <path d="M10 48c8-4 17-3 26 2v13c-9-5-18-6-26-2z" fill="url(#lmsBookTeal)" />
        <path d="M62 48c-8-4-17-3-26 2v13c9-5 18-6 26-2z" fill="url(#lmsBookOrange)" />
        <path d="M36 50v13" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity=".85" />

        <path d="M27 8l9-5 9 5-9 5z" fill="#D9853B" />
        <path d="M43 8v7" stroke="#D9853B" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="43" cy="17" r="2" fill="#D9853B" />
      </svg>
    </span>
  );
}

'''
    if anchor not in page:
        raise SystemExit("Could not find a safe icon insertion point.")
    page = page.replace(anchor, component + anchor, 1)

old = '''        <div className={styles.lmsHeaderTitle}>
          <h1>LMS</h1>
        </div>'''

new = '''        <div className={styles.lmsHeaderTitle}>
          <LmsHeaderIcon3D />
          <div className={styles.lmsHeaderText}>
            <h1>Learning Management System</h1>
          </div>
        </div>'''

if old in page:
    page = page.replace(old, new, 1)
elif "Learning Management System" not in page:
    raise SystemExit("Could not locate the current LMS title.")

marker = "/* ORBIT LMS FULL HEADER + 3D ICON */"
if marker not in css:
    css += r'''

/* ORBIT LMS FULL HEADER + 3D ICON */
.lmsHeaderTitle{
  display:flex;
  align-items:center;
  gap:14px;
  padding-top:2px;
}

.lmsHeaderText{
  display:flex;
  flex-direction:column;
  justify-content:center;
}

.lmsHeaderTitle h1{
  margin:0;
  color:#153536;
  font-size:29px;
  font-weight:700;
  line-height:1.08;
  letter-spacing:-.025em;
}

.lmsHeaderIcon3D{
  position:relative;
  flex:0 0 62px;
  width:62px;
  height:62px;
  display:grid;
  place-items:center;
  border:1px solid #d0e2de;
  border-radius:18px;
  background:linear-gradient(145deg,#ffffff 7%,#e7f2f0 100%);
  box-shadow:
    0 10px 20px rgba(38,84,81,.13),
    inset 0 1px 0 rgba(255,255,255,.98),
    inset 0 -4px 9px rgba(52,104,100,.07);
}

.lmsHeaderIcon3D::after{
  content:"";
  position:absolute;
  left:9px;
  right:9px;
  bottom:-7px;
  height:10px;
  border-radius:50%;
  background:rgba(37,76,73,.14);
  filter:blur(5px);
  z-index:-1;
}

.lmsHeaderIconSvg{
  width:52px;
  height:52px;
  filter:drop-shadow(0 4px 4px rgba(38,78,75,.12));
}

@media(max-width:900px){
  .lmsHeaderTitle{
    gap:11px;
  }

  .lmsHeaderTitle h1{
    font-size:25px;
  }

  .lmsHeaderIcon3D{
    flex-basis:54px;
    width:54px;
    height:54px;
    border-radius:16px;
  }

  .lmsHeaderIconSvg{
    width:45px;
    height:45px;
  }
}

@media(max-width:620px){
  .lmsHeaderTitle h1{
    font-size:22px;
  }
}
'''

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("LMS full header applied.")
