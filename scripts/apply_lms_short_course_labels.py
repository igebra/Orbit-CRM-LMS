from pathlib import Path

page_path = Path("app/lms/page.tsx")

if not page_path.exists():
    raise SystemExit("Could not find app/lms/page.tsx. Run this from the Orbit repository root.")

page = page_path.read_text(encoding="utf-8")

old = '''function shortCourseLabel(courseName: string) {
  if (courseName.startsWith("AiEdge ")) return courseName.replace("AiEdge ", "");
  if (courseName.startsWith("Coding4AI ")) return courseName.replace("Coding4AI ", "");
  if (courseName.startsWith("Math - ")) return courseName.replace("Math - ", "");
  return courseName;
}'''

new = '''function shortCourseLabel(courseName: string) {
  if (courseName.startsWith("AiEdge ")) {
    return courseName.replace("AiEdge ", "");
  }

  if (courseName.startsWith("Coding4AI ")) {
    return courseName.replace("Coding4AI ", "");
  }

  const mathLabels: Record<string, string> = {
    "Math - Grade 01": "G01",
    "Math - Grade 02": "G02",
    "Math - Grade 03": "G03",
    "Math - Grade 04": "G04",
    "Math - Grade 05": "G05",
    "Math - Grade 06": "G06",
    "Math - Grade 07": "G07",
    "Math - Grade 08": "G08",
    "Math - Grade 09": "G09",
    "Math - Grade 10": "G10",
    "AP Pre-Calculus": "AP PreCalc",
    "AP Calculus AB": "AP Calc AB",
    "AP Calculus BC": "AP Calc BC",
    "AP Statistics": "AP Stats",
    "SAT and PSAT": "SAT/PSAT",
    "Algebra 1": "Alg 1",
    "Geometry": "Geo",
    "Algebra 2": "Alg 2",
  };

  return mathLabels[courseName] || courseName;
}'''

if old in page:
    page = page.replace(old, new, 1)
elif '"Math - Grade 01": "G01"' not in page:
    raise SystemExit("Could not locate shortCourseLabel().")

page_path.write_text(page, encoding="utf-8")

print("LMS short course labels applied.")
print("UI only: no database changes.")
