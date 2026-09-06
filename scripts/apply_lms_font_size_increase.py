from pathlib import Path

css_path = Path("app/lms/lms.module.css")

if not css_path.exists():
    raise SystemExit("Could not find app/lms/lms.module.css. Run from the Orbit-CRM-LMS root folder.")

css = css_path.read_text(encoding="utf-8")

marker = "ORBIT LMS FONT SIZE +2PX"

font_css = """
/* ORBIT LMS FONT SIZE +2PX */

.courseChoiceLabel{
  font-size:11px!important;
}

.courseChip{
  font-size:11px;
}

.courseMeta strong{
  font-size:12.5px;
}

.courseMeta span{
  font-size:11.5px!important;
}

.tableWrap th{
  font-size:10.5px;
}

.tableWrap td{
  font-size:12px;
}

.tableWrap td small{
  font-size:11px;
}

.badge,
.status,
.ready{
  font-size:10.5px;
}

.actions button{
  font-size:11px;
}

.missingText{
  font-size:11px;
}

.toolbar input,
.toolbar select{
  font-size:12px;
}

.stats span{
  font-size:11px;
}
"""

if marker not in css:
    css = css.rstrip() + "\n\n" + font_css + "\n"

css_path.write_text(css, encoding="utf-8")

print("LMS font sizes increased by approximately 2px.")
