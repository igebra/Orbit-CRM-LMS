from pathlib import Path

page_path = Path("app/lms/page.tsx")
css_path = Path("app/lms/lms.module.css")

for path in (page_path, css_path):
    if not path.exists():
        raise SystemExit(f"Could not find {path}. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

component = r'''
function UploadResourceIcon3D() {
  return (
    <span className={styles.uploadResourceIconShell} aria-hidden="true">
      <svg viewBox="0 0 56 56" className={styles.uploadResourceIconSvg}>
        <defs>
          <linearGradient id="uploadFolderFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff8f1" />
            <stop offset="100%" stopColor="#f6d7b8" />
          </linearGradient>
          <linearGradient id="uploadOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5b578" />
            <stop offset="100%" stopColor="#D9853B" />
          </linearGradient>
          <linearGradient id="uploadTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fc9c4" />
            <stop offset="100%" stopColor="#558C89" />
          </linearGradient>
        </defs>

        <path
          d="M8 18c0-3 2.4-5.5 5.5-5.5h10l4.2 4.2H43c3 0 5.5 2.4 5.5 5.5v18.3c0 3-2.4 5.5-5.5 5.5H13.5C10.4 46 8 43.6 8 40.5V18z"
          fill="url(#uploadFolderFace)"
        />
        <path
          d="M8 24h40.5v16.5c0 3-2.4 5.5-5.5 5.5H13.5C10.4 46 8 43.6 8 40.5V24z"
          fill="url(#uploadOrange)"
          opacity=".92"
        />
        <circle cx="28" cy="29" r="10.5" fill="#ffffff" />
        <path
          d="M28 35V22M23 27l5-5 5 5"
          fill="none"
          stroke="url(#uploadTeal)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M43 9l1.4 3.5L48 14l-3.6 1.5L43 19l-1.4-3.5L38 14l3.6-1.5L43 9z"
          fill="#F5B041"
        />
      </svg>
    </span>
  );
}

'''

if "function UploadResourceIcon3D()" not in page:
    export_anchor = "export default function LmsPage()"
    if export_anchor not in page:
        raise SystemExit("Could not find LmsPage export.")
    page = page.replace(export_anchor, component + export_anchor, 1)

old_button = '{canManage && <button className={styles.primary} onClick={openUpload}>+ Upload Resource</button>}'

new_button = '''{canManage && (
  <button
    type="button"
    className={styles.uploadResourceCard}
    onClick={openUpload}
    title="Upload Course Resource"
  >
    <UploadResourceIcon3D />
    <span>Upload Resource</span>
  </button>
)}'''

if old_button in page:
    page = page.replace(old_button, new_button, 1)
elif "className={styles.uploadResourceCard}" not in page:
    raise SystemExit("Could not locate Upload Resource button.")

marker = "ORBIT LMS VISUAL POLISH - UPLOAD RESOURCE CARD"

if marker not in css:
    css += r'''

/* ORBIT LMS VISUAL POLISH - UPLOAD RESOURCE CARD */

.courseBar{
  border-color:#d7e3e0;
  box-shadow:0 8px 24px rgba(31,78,75,.055);
}

.card{
  border-color:#d7e3e0;
  box-shadow:0 10px 28px rgba(31,78,75,.06);
}

.stats{
  gap:12px;
  margin-bottom:14px;
}

.stats>div{
  position:relative;
  overflow:hidden;
  min-height:82px;
  padding:15px 17px;
  border-color:#d7e3e0;
  box-shadow:0 7px 20px rgba(31,78,75,.05);
  transition:transform .14s ease,box-shadow .14s ease;
}

.stats>div:hover{
  transform:translateY(-1px);
  box-shadow:0 10px 24px rgba(31,78,75,.075);
}

.stats>div::after{
  content:"";
  position:absolute;
  width:54px;
  height:54px;
  right:-18px;
  top:-18px;
  border-radius:50%;
  background:rgba(116,175,173,.08);
}

.stats>div:nth-child(2)::after{
  background:rgba(47,128,237,.065);
}

.stats>div:nth-child(3)::after{
  background:rgba(245,176,65,.075);
}

.stats>div:nth-child(4)::after{
  background:rgba(217,133,59,.09);
}

.stats strong{
  margin-top:7px;
  font-size:27px;
  line-height:1;
}

.toolbar{
  min-height:86px;
  padding:10px 12px;
  grid-template-columns:minmax(260px,1fr) 210px 190px 108px;
  align-items:center;
  gap:10px;
  background:linear-gradient(180deg,#ffffff,#fbfdfc);
}

.toolbar input,
.toolbar select{
  height:44px;
  border-color:#cedbd8;
  border-radius:10px;
  box-shadow:inset 0 1px 1px rgba(25,64,62,.025);
}

.toolbar input:focus,
.toolbar select:focus{
  outline:none;
  border-color:#8db5b1;
  box-shadow:0 0 0 3px rgba(85,140,137,.09);
}

.uploadResourceCard{
  width:108px;
  height:74px;
  padding:7px 8px 8px;
  border:1px solid #efb87f;
  border-radius:14px;
  background:linear-gradient(145deg,#ffffff 5%,#fff4e9 100%);
  color:#9d5c26;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:4px;
  cursor:pointer;
  box-shadow:0 7px 16px rgba(217,133,59,.11),inset 0 1px 0 rgba(255,255,255,.95);
  transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;
}

.uploadResourceCard:hover{
  transform:translateY(-2px);
  border-color:#D9853B;
  box-shadow:0 10px 20px rgba(217,133,59,.17),inset 0 1px 0 rgba(255,255,255,.95);
}

.uploadResourceCard:active{
  transform:translateY(0);
}

.uploadResourceCard>span:last-child{
  font-size:10px;
  line-height:1.05;
  font-weight:850;
  white-space:nowrap;
}

.uploadResourceIconShell{
  width:39px;
  height:39px;
  display:grid;
  place-items:center;
  border:1px solid #f0ccb0;
  border-radius:11px;
  background:linear-gradient(145deg,#ffffff,#fff7ef);
  box-shadow:0 5px 10px rgba(151,83,33,.11),inset 0 1px 0 rgba(255,255,255,.95);
}

.uploadResourceIconSvg{
  width:34px;
  height:34px;
  filter:drop-shadow(0 3px 3px rgba(128,76,34,.12));
}

.tableWrap th{
  background:#f4f8f7;
  border-bottom:1px solid #dce7e4;
}

.tableWrap tbody tr{
  transition:background .12s ease;
}

.tableWrap tbody tr:hover{
  background:#fbfdfc;
}

.empty{
  padding:42px!important;
  color:#78908d!important;
}

@media(max-width:900px){
  .toolbar{
    grid-template-columns:1fr;
    min-height:auto;
  }

  .uploadResourceCard{
    width:100%;
    height:60px;
    flex-direction:row;
  }

  .uploadResourceCard>span:last-child{
    font-size:11px;
  }
}
'''

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("LMS visual polish applied.")
print("- Upload Resource is now a square 3D icon card.")
print("- Stats, toolbar, table and surfaces refined.")
print("- UI only: no database changes.")
