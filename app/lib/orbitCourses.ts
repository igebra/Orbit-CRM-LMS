export const GRADES = Array.from({ length: 10 }, (_, i) =>
  `Grade ${String(i + 1).padStart(2, "0")}`
);

export const COURSE_OPTIONS = [
  ...["Elementary", "Middle School", "High School"].flatMap((group) =>
    ["01", "02", "03"].map((level) => `AiEdge ${group} - Level ${level}`)
  ),
  ...["Elementary", "Middle School", "High School"].flatMap((group) =>
    ["01", "02", "03"].map((level) => `Coding4AI ${group} - Level ${level}`)
  ),
  ...GRADES.map((grade) => `Math - ${grade}`),
  "AP Pre-Calculus",
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Statistics",
  "SAT and PSAT",
  "Algebra 1",
  "Geometry",
  "Algebra 2",
];

export function courseDefaults(courseName: string) {
  const lower = courseName.toLowerCase();

  if (lower.startsWith("aiedge") || lower.startsWith("coding4ai")) {
    return { plannedSessions: 20, durationMinutes: 90 };
  }

  return { plannedSessions: null as number | null, durationMinutes: 60 };
}
