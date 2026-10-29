import type { Preferences, WorkArrangement } from "./jobs";
import type { TrackerJob } from "./tracker-import";
/** Read only explicit arrangement labels; no claim about eligibility or location. */
export function trackerArrangements(job: TrackerJob): WorkArrangement[] {
  const texts = [job.location, ...job.references.map((r) => r.location || "")];
  const result = new Set<WorkArrangement>();
  for (const raw of texts) {
    const text = raw.toLowerCase();
    const negatedRemote =
      /\b(?:no|not)\s+(?:fully\s+)?remote\b|\bremote\s+(?:is\s+)?(?:not|unavailable)\b/.test(
        text,
      );
    if (/\bremote\b/.test(text) && !negatedRemote) result.add("Remote");
    if (/\bhybrid\b/.test(text)) result.add("Hybrid");
    if (
      /\bon[ -]?site\b/.test(text) ||
      (/\bin[ -]office\b/.test(text) &&
        !/\bhybrid\b|\b\d+\s+days?\b/.test(text))
    )
      result.add("On-site");
  }
  return [...result];
}
/** Only interpret clearly labeled CAD annual pay in the tracker. Ambiguous or hourly values remain unknown. */
export function trackerAnnualSalaryMaximum(job: TrackerJob): number | null {
  const raw = [
    ...new Set(job.references.map((r) => r.salary || "").filter(Boolean)),
  ];
  if (raw.length !== 1) return null;
  const s = raw[0];
  if (
    !/\bCAD\b|C\$/i.test(s) ||
    !/\b(?:annually|annual|year|yearly|annum)\b|\/(?:yr|year)\b/i.test(s) ||
    /\b(?:hour|hourly)\b|\/(?:hr|hour)\b/i.test(s) ||
    /bonus|commission|equity|\bOTE\b|estimate|up to|\bfrom\b|starting|at least|above|over|under|below|less than|minimum|\+/i.test(
      s,
    )
  )
    return null;
  const matches = [
    ...s.matchAll(
      /(?:\$\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{2,3}(?:\.\d+)?\s*[kK])/g,
    ),
  ];
  const values = matches
    .map((m) => {
      const str = m[1].replaceAll(",", "").trim();
      return /k$/i.test(str) ? parseFloat(str) * 1000 : Number(str);
    })
    .filter((n) => Number.isFinite(n) && n >= 10000 && n <= 1000000);
  if (values.length === 1) return values[0];
  if (values.length === 2 && values[0] <= values[1]) return values[1];
  return null;
}
export function matchesTrackerPreferences(
  job: TrackerJob,
  preferences: Preferences,
  includeUnknown = true,
): boolean {
  const locations = [
    job.location,
    ...job.references.map((r) => r.location || ""),
  ];
  if (!job.title.toLowerCase().includes(preferences.role.trim().toLowerCase()))
    return false;
  if (
    !locations.some((value) =>
      value.toLowerCase().includes(preferences.location.trim().toLowerCase()),
    )
  )
    return false;
  const locationQuery = preferences.location.trim().toLowerCase();
  // Keep work-arrangement evidence tied to the same listed location when filtering by location.
  const scopedJob = locationQuery
    ? {
        ...job,
        location: job.location.toLowerCase().includes(locationQuery)
          ? job.location
          : "",
        references: job.references.filter((ref) =>
          (ref.location || "").toLowerCase().includes(locationQuery),
        ),
      }
    : job;
  const work = trackerArrangements(scopedJob);
  if (
    preferences.arrangements.length &&
    ((work.length === 0 && !includeUnknown) ||
      (work.length > 0 &&
        !work.some((item) => preferences.arrangements.includes(item))))
  )
    return false;
  const salary = trackerAnnualSalaryMaximum(job);
  if (
    preferences.salary &&
    ((salary === null && !includeUnknown) ||
      (salary !== null && salary < preferences.salary))
  )
    return false;
  return true;
}
export function recordedRatings(job: TrackerJob): string[] {
  return [
    ...new Set(
      job.references
        .map((r) => r.recordedFit?.trim())
        .filter((v): v is string => !!v),
    ),
  ];
}
