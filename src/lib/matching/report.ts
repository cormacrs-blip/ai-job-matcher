import type { Job } from "../jobs";
import { evaluateRole, type Assessment, type Profile } from "./evaluator";
export function nextAction(result: Assessment) {
  if (result.status === "Investigate")
    return (
      result.question ||
      "Clarify the unresolved requirement before deciding whether to apply."
    );
  if (result.status === "Weak Fit")
    return "Deprioritize this example unless new evidence or a changed requirement addresses the stated gap.";
  if (result.status === "Consider")
    return "Consider applying; address the stated transfer or competition factor with specific evidence.";
  return "Prioritize this example for application preparation, subject to confirming the real vacancy and remaining eligibility requirements.";
}
export function createEvaluationReport(job: Job, profile: Profile) {
  const result = evaluateRole(job, profile);
  return [
    "ALIGN — REVIEWED EVIDENCE SUMMARY",
    "Fictional job. Rules-based prototype using user-reviewed evidence; no AI or independent fact verification.",
    "",
    `${job.title} — ${job.company}`,
    `${job.location} | ${job.remote}`,
    "",
    `Verdict: ${result.status}`,
    result.reason,
    ...(result.compensationNote ? [result.compensationNote] : []),
    "",
    "Role purpose",
    job.description,
    "",
    "Defining work and evidence",
    ...result.rows.flatMap((row) => [
      `${row.label}: ${row.level}`,
      row.quote || "Unknown — no evidence supplied.",
      "",
    ]),
    "Essential requirements",
    ...job.essentials.map((item) => `- ${item}`),
    "",
    "Preferred qualifications",
    ...job.preferred.map((item) => `- ${item}`),
    "",
    "Next action",
    nextAction(result),
    "",
    "Limits",
    "The rules assess reviewed central-work evidence, the sample language gate, and stated compensation. They do not independently validate career claims, vacancy availability, authorization or every preferred qualification. Review the complete description before applying.",
  ].join("\n");
}
