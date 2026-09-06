from pathlib import Path
import re

page_path = Path("app/lms/page.tsx")
css_path = Path("app/lms/lms.module.css")

if not page_path.exists() or not css_path.exists():
    raise SystemExit("Could not find LMS files. Run from the Orbit-CRM-LMS root folder.")

page = page_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8")

new_icon = r'''
function LmsHeaderIcon3D() {
  return (
    <span className={styles.lmsHeaderIcon3D} aria-hidden="true">
      <svg viewBox="0 0 80 80" className={styles.lmsHeaderIconSvg}>
        <defs>
          <linearGradient id="lmsLaptopFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dff2f1" />
          </linearGradient>
          <linearGradient id="lmsTeal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fd0c9" />
            <stop offset="100%" stopColor="#558C89" />
          </linearGradient>
          <linearGradient id="lmsBlue" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#77bdf4" />
            <stop offset="100%" stopColor="#2F80ED" />
          </linearGradient>
          <linearGradient id="lmsOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4b36f" />
            <stop offset="100%" stopColor="#D9853B" />
          </linearGradient>
          <linearGradient id="lmsGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffd889" />
            <stop offset="100%" stopColor="#F5B041" />
          </linearGradient>
        </defs>

        <!-- Laptop / digital learning -->
        <rect x="17" y="13" width="46" height="34" rx="9" fill="url(#lmsLaptopFace)" />
        <rect x="22" y="18" width="36" height="24" rx="6" fill="#eff9f8" />
        <path d="M31 25l-6 5 6 5M49 25l6 5-6 5M44 22l-8 16"
              fill="none"
              stroke="#2F80ED"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round" />
        <rect x="12" y="46" width="56" height="7" rx="3.5" fill="#b9d8d4" />

        <!-- Stacked learning content -->
        <rect x="15" y="56" width="28" height="8" rx="4" fill="url(#lmsTeal)" />
        <rect x="22" y="64" width="31" height="8" rx="4" fill="url(#lmsOrange)" />
        <rect x="39" y="55" width="25" height="8" rx="4" fill="url(#lmsGold)" />

        <!-- AI / learning nodes -->
        <circle cx="66" cy="18" r="6" fill="url(#lmsBlue)" />
        <circle cx="70" cy="33" r="4.5" fill="url(#lmsOrange)" />
        <circle cx="60" cy="34" r="4" fill="url(#lmsTeal)" />
        <path d="M64 23l-3 7M67 24l2 5M63 34h3"
              stroke="#7aa9a5"
              strokeWidth="2"
              strokeLinecap="round" />

        <!-- Small sparkle -->
        <path d="M11 18l1.8 4.2L17 24l-4.2 1.8L11 30l-1.8-4.2L5 24l4.2-1.8L11 18z"
              fill="#F5B041" />
      </svg>
    </span>
  );
}
'''

pattern = re.compile(
    r'function LmsHeaderIcon3D\(\)\s*\{.*?\n\}\n',
    re.S,
)

if not pattern.search(page):
    raise SystemExit("Could not find the current LMS header icon function.")

page = pattern.sub(new_icon.strip() + "\n", page, count=1)

marker = "/* ORBIT LMS COLORFUL ICON FIX */"
if marker not in css:
    css += r'''

/* ORBIT LMS COLORFUL ICON FIX */
.lmsHeaderIcon3D{
  background:linear-gradient(145deg,#ffffff 5%,#eef7f5 100%);
  border-color:#c9dfdb;
  box-shadow:
    0 11px 22px rgba(38,84,81,.14),
    inset 0 1px 0 rgba(255,255,255,.98),
    inset 0 -4px 10px rgba(52,104,100,.06);
}

.lmsHeaderIconSvg{
  width:56px;
  height:56px;
}
'''

page_path.write_text(page, encoding="utf-8")
css_path.write_text(css, encoding="utf-8")

print("LMS icon replaced with a colorful digital-learning icon.")
