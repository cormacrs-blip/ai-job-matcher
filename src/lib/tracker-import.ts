export type TrackerReference = {
  sheet: string;
  row: number;
  trackerStatus?: string;
  recordedFit?: string;
  location?: string;
  salary?: string;
  notes?: string;
};
export type TrackerDescription = {
  text: string;
  source: string;
  retrievedAt?: string;
  truncated: boolean;
};
export type TrackerJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  references: TrackerReference[];
  descriptions: TrackerDescription[];
  fetchStatus: string;
};
export type TrackerDataset = {
  format: "align-tracker-v1";
  generatedAt: string;
  jobs: TrackerJob[];
};
export function readTrackerDataset(text: string): TrackerDataset {
  const data: unknown = JSON.parse(text);
  if (!data || typeof data !== "object")
    throw new Error("This is not an Align tracker file.");
  const root = data as Record<string, unknown>;
  if (
    root.format !== "align-tracker-v1" ||
    !Array.isArray(root.jobs) ||
    typeof root.generatedAt !== "string" ||
    root.jobs.length > 20000
  )
    throw new Error("This is not a supported Align tracker file.");
  for (const job of root.jobs) {
    if (
      !job ||
      typeof job !== "object" ||
      typeof job.id !== "string" ||
      typeof job.title !== "string" ||
      typeof job.company !== "string" ||
      typeof job.location !== "string" ||
      typeof job.url !== "string" ||
      typeof job.fetchStatus !== "string" ||
      !Array.isArray(job.references) ||
      !Array.isArray(job.descriptions)
    )
      throw new Error("The tracker file contains an invalid job record.");
    if (
      job.references.some(
        (r: unknown) =>
          !r ||
          typeof r !== "object" ||
          typeof (r as TrackerReference).sheet !== "string" ||
          typeof (r as TrackerReference).row !== "number" ||
          ((r as TrackerReference).location !== undefined &&
            typeof (r as TrackerReference).location !== "string") ||
          ((r as TrackerReference).salary !== undefined &&
            typeof (r as TrackerReference).salary !== "string") ||
          ((r as TrackerReference).notes !== undefined &&
            typeof (r as TrackerReference).notes !== "string") ||
          ((r as TrackerReference).trackerStatus !== undefined &&
            typeof (r as TrackerReference).trackerStatus !== "string") ||
          ((r as TrackerReference).recordedFit !== undefined &&
            typeof (r as TrackerReference).recordedFit !== "string"),
      )
    )
      throw new Error("The tracker file contains an invalid source reference.");
    if (
      job.descriptions.some(
        (d: unknown) =>
          !d ||
          typeof d !== "object" ||
          typeof (d as TrackerDescription).text !== "string" ||
          typeof (d as TrackerDescription).source !== "string" ||
          typeof (d as TrackerDescription).truncated !== "boolean" ||
          ((d as TrackerDescription).retrievedAt !== undefined &&
            typeof (d as TrackerDescription).retrievedAt !== "string"),
      )
    )
      throw new Error("The tracker file contains an invalid description.");
  }
  return root as TrackerDataset;
}
export function safePostingLink(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
