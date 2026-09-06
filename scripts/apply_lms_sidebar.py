from pathlib import Path

path = Path("app/components/OrbitSidebar.tsx")
if not path.exists():
    raise SystemExit("Could not find app/components/OrbitSidebar.tsx")

text = path.read_text(encoding="utf-8")

# Add LMS to the active route type.
needle = '    | "courses"\n    | "trainers"'
if needle in text and '| "lms"' not in text:
    text = text.replace(
        needle,
        '    | "courses"\n    | "lms"\n    | "trainers"',
        1,
    )

# Prefetch LMS.
needle = '  "/courses",\n  "/reports",'
if needle in text and '  "/lms",' not in text:
    text = text.replace(
        needle,
        '  "/courses",\n  "/lms",\n  "/reports",',
        1,
    )

# Add LMS visibility rule.
needle = '''  const canSeeReports =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isFinance ||
    isManagement;

  const canSeeAccess = isSuperAdmin || isAdmin;
'''
if needle in text and 'const canSeeLms' not in text:
    text = text.replace(
        needle,
        '''  const canSeeReports =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isFinance ||
    isManagement;

  const canSeeLms =
    isSuperAdmin ||
    isAdmin ||
    isSales ||
    isMarketing ||
    isManagement ||
    isTrainer;

  const canSeeAccess = isSuperAdmin || isAdmin;
''',
        1,
    )

# Insert LMS between Courses and Reports.
marker = '''          {canSeeReports && (
            <button
              className={active === "reports" ? styles.navActive : ""}
'''
if marker in text and 'navigate("/lms")' not in text:
    block = '''          {canSeeLms && (
            <button
              className={active === "lms" ? styles.navActive : ""}
              onClick={() => navigate("/lms")}
            >
              <span>▦</span> LMS
            </button>
          )}

'''
    text = text.replace(marker, block + marker, 1)

if '| "lms"' not in text or 'navigate("/lms")' not in text:
    raise SystemExit("Sidebar patch did not apply cleanly. No file was written.")

path.write_text(text, encoding="utf-8")
print("LMS sidebar section added.")
