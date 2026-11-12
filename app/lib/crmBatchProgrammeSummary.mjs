/** Read-only CRM batch summaries for the current operational batch read model.
 * No LMS writes, migrations, or changes to the existing batch records.
 */
export const CRM_BATCH_PROGRAMMES = ["Math", "AiEdge", "Coding4AI"];

export function crmBatchProgramme(courseName) {
  const course = String(courseName ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (/^ai\s*edge(?:\b|[-–—])/.test(course)) return "AiEdge";
  if (/^coding\s*4\s*ai(?:\b|[-–—])/.test(course)) return "Coding4AI";
  if (/^math(?:\b|[-–—])/.test(course)) return "Math";
  if (/^(?:ap\s+(?:pre[- ]?calculus|calculus\s+(?:ab|bc)|statistics)|pre[- ]?calculus|calculus|trigonometry|statistics|algebra\s*[12i]|geometry|sat(?:\s*(?:and|\/)\s*psat)?|psat|act\s*math)(?:\b|$)/.test(course)) return "Math";
  return "Other";
}

export function crmBatchProgrammeSummary(batches) {
  const counts = Object.fromEntries(CRM_BATCH_PROGRAMMES.map(name => [name, 0]));
  let other = 0;
  let active = 0;
  for (const batch of batches) {
    if (String(batch.status ?? "").trim().toLowerCase() !== "active") continue;
    active += 1;
    const name = crmBatchProgramme(batch.course_name);
    if (Object.hasOwn(counts, name)) counts[name] += 1;
    else other += 1;
  }
  return { counts, other, active };
}

export function crmFilteredBatches(batches, selectedProgramme) {
  if (!selectedProgramme || selectedProgramme === "All") return batches;
  return batches.filter(batch => crmBatchProgramme(batch.course_name) === selectedProgramme);
}
