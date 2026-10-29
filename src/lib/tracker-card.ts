import type { TrackerJob } from "./tracker-import";
import { trackerArrangements } from "./tracker-filters";

/** Compact display only: the complete original fields remain in the job details. */
export function trackerCardDetails(job: TrackerJob) {
  const rawLocation = job.location.trim();
  const firstLocation = rawLocation.split(";")[0].trim();
  // Only remove an arrangement when it is an unambiguous trailing qualifier.
  const compactLocation = firstLocation
    .replace(/(?:,?\s+)(?:remote(?:-first)?|hybrid|on[ -]?site)$/i, "")
    .trim();
  const location =
    compactLocation &&
    !/^(?:(?:remote(?:-first)?|hybrid|on[ -]?site)\s*(?:\/\s*|$))+$/i.test(
      compactLocation,
    )
      ? compactLocation
      : "Location not specified";
  const locationNeedsReview =
    /\b(?:unverified|unresolved|unclear|eligibility|restricted|attendance|relocat\w*|residency|requires?)\b/i.test(
      rawLocation,
    );
  const arrangements = trackerArrangements(job);
  const arrangement =
    arrangements.length > 1
      ? "Work arrangement unclear"
      : arrangements[0] || "Work arrangement not specified";
  const sourceValues = [
    ...new Set(
      job.references
        .map((ref) => ref.salary?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const types = new Set<string>();
  for (const value of sourceValues) {
    const text = value.toLowerCase();
    if (/\bfull[ -]time\b/.test(text) && !/\bnot\s+full[ -]time\b/.test(text))
      types.add("Full-time");
    if (/\bpart[ -]time\b/.test(text) && !/\bnot\s+part[ -]time\b/.test(text))
      types.add("Part-time");
    if (/\bcontract\b/.test(text) && !/\bnot\s+(?:a\s+)?contract\b/.test(text))
      types.add("Contract");
  }
  const employment =
    types.size > 1
      ? "Employment type unclear"
      : [...types][0] || "Employment type not specified";
  let pay = "Pay not listed";
  if (sourceValues.length > 1) pay = "Pay details in job";
  else if (sourceValues.length === 1) {
    const raw = sourceValues[0];
    const first = raw.split(";")[0].trim();
    if (/\b(?:unknown|not (?:listed|specified|disclosed)|n\/?a)\b/i.test(first))
      pay = "Pay not listed";
    else if (
      /(?:\b(?:CAD|USD|GBP|EUR)\s*\d|[$£€]\s*\d|\b\d{1,3}(?:,\d{3})+\b|\b\d{4,}\b|\b\d+(?:\.\d+)?\s*k\b)/i.test(
        first,
      ) &&
      !/\b(?:estimate|estimated|bonus|commission|equity|ote|on.target|total compensation)\b/i.test(
        raw,
      )
    )
      pay = first.replace(/^(CAD|USD|GBP|EUR)(?=\d)/i, "$1 ");
    else if (!/^(?:full[ -]time|part[ -]time|contract)$/i.test(first))
      pay = "Pay details in job";
  }
  return { location, arrangement, employment, pay, locationNeedsReview };
}
