import { assessCompensation, type Compensation } from "./compensation";
export const evidenceLabels = {
  requirements: "Requirements discovery",
  process: "Process improvement",
  uat: "User acceptance testing",
  roadmap: "Roadmap ownership",
  discovery: "Product discovery",
  backlog: "Backlog prioritization",
  planning: "Project planning",
  stakeholders: "Stakeholder delivery",
  delivery: "Delivery accountability",
  sql: "Advanced SQL",
  pipelines: "Data pipelines",
  warehouse: "Warehouse architecture",
} as const;
export type EvidenceKey = keyof typeof evidenceLabels;
export const levels = [
  "Demonstrated",
  "Adjacent",
  "Limited",
  "No evidence",
  "Unknown",
] as const;
export type EvidenceLevel = (typeof levels)[number];
export type Evidence = { level: EvidenceLevel; quote: string };
export type Profile = {
  evidence: Record<EvidenceKey, Evidence>;
  french: "Yes" | "No" | "Unknown";
  text: string;
};
export type FitStatus = "Fit" | "Consider" | "Investigate" | "Weak Fit";
export type RoleCriteria = {
  central: EvidenceKey[];
  requiresFrench?: boolean;
  compensation?: Compensation;
  descriptionComplete?: boolean;
};
export type Assessment = {
  status: FitStatus;
  reason: string;
  question?: string;
  compensationNote?: string;
  rows: {
    key: EvidenceKey;
    label: string;
    level: EvidenceLevel;
    quote: string;
  }[];
};
export function parseProfile(text: string): Profile {
  const evidence = {} as Profile["evidence"];
  for (const key of Object.keys(evidenceLabels) as EvidenceKey[]) {
    // Explicit prototype evidence annotations; never infer capability from a keyword or filename.
    const entries = [
      ...text.matchAll(
        new RegExp(
          String.raw`Evidence \[${key}\]:\s*(Demonstrated|Adjacent|Limited|No evidence|Unknown)\s*\|\s*([\s\S]*?)(?=Evidence \[|French eligibility:|$)`,
          "gi",
        ),
      ),
    ];
    const item = entries.length === 1 ? entries[0] : null;
    const level = item
      ? levels.find((value) => value.toLowerCase() === item[1].toLowerCase())
      : undefined;
    const quote = item?.[2].replace(/\s+/g, " ").trim() || "";
    evidence[key] = { level: quote && level ? level : "Unknown", quote };
  }
  const frenchValues = [
    ...text.matchAll(/French eligibility:\s*(Yes|No|Unknown)\b/gi),
  ];
  const french =
    frenchValues.length === 1 ? frenchValues[0][1].toLowerCase() : "unknown";
  return {
    evidence,
    french: french === "yes" ? "Yes" : french === "no" ? "No" : "Unknown",
    text,
  };
}
export function evaluateRole(
  job: RoleCriteria & { salaryMin: number; salaryMax: number },
  profile: Profile,
): Assessment {
  const rows = job.central.map((key) => ({
    key,
    label: evidenceLabels[key],
    ...profile.evidence[key],
  }));
  const pay = assessCompensation(
    job.compensation ?? {
      country: "Canada",
      currency: "CAD",
      period: "annual",
      minimum: job.salaryMin,
      maximum: job.salaryMax,
      source: "employer-base",
    },
  );
  const result = (
    status: FitStatus,
    reason: string,
    question?: string,
  ): Assessment => ({
    status,
    reason,
    question,
    rows,
    compensationNote: pay.note ?? undefined,
  });
  if (pay.failure) return result("Weak Fit", pay.failure);
  if (job.descriptionComplete === false)
    return result(
      "Investigate",
      "The job description is incomplete; the defining work cannot yet be established.",
      "Can you obtain the full responsibilities and essential requirements?",
    );
  if (job.requiresFrench && profile.french === "No")
    return result(
      "Weak Fit",
      "Confirmed gate: this role requires professional French and the reviewed profile explicitly states this is not met.",
    );
  const substantialGaps = rows.filter(
    (row) => row.level === "Limited" || row.level === "No evidence",
  );
  if (substantialGaps.length >= 2)
    return result(
      "Weak Fit",
      `Several defining responsibilities have limited or no supporting evidence: ${substantialGaps.map((row) => row.label).join(", ")}. This is an evidence gap, not proof of inability.`,
    );
  if (job.requiresFrench && profile.french === "Unknown")
    return result(
      "Investigate",
      "A mandatory language requirement is unresolved.",
      "Can the candidate work professionally in French?",
    );
  const unknown = rows.filter((row) => row.level === "Unknown");
  if (unknown.length)
    return result(
      "Investigate",
      "Material evidence for the defining work is incomplete.",
      `What comparable work supports ${unknown.map((row) => row.label).join(", ")}?`,
    );
  if (substantialGaps.length)
    return result(
      "Investigate",
      "One significant central responsibility needs clarification before a positive decision.",
      `Would the employer accept the candidate’s background for ${substantialGaps[0].label}, or is additional direct evidence available?`,
    );
  if (rows.some((row) => row.level === "Adjacent"))
    return result(
      "Consider",
      "Relevant transferable evidence exists, but part of the defining work is adjacent rather than directly demonstrated. Verify the bridge in scope and responsibility.",
    );
  if (pay.competition)
    return result(
      "Consider",
      "The defining work has direct evidence. The employer-stated minimum annual CAD base salary above $100,000 triggers the rubric’s competition cue; this is not a missing skill.",
    );
  return result(
    "Fit",
    "Direct evidence supports every defining responsibility in this simplified prototype, with no unresolved modeled gate.",
  );
}
