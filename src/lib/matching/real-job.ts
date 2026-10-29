import {
  evaluateRole,
  evidenceLabels,
  type Assessment,
  type EvidenceKey,
  type Profile,
} from "./evaluator";
export type RealJobReview = {
  central: EvidenceKey[];
  descriptionComplete: boolean;
  vacancyVerified: boolean;
  otherGates: "unknown" | "met" | "not-met";
  gateReason: string;
  frenchRequirement: "unknown" | "required" | "not-required";
};
export function evaluateRealJob(
  review: RealJobReview,
  profile: Profile,
): Assessment {
  const base = {
    central: review.central,
    salaryMin: 0,
    salaryMax: 0,
    compensation: {
      country: "Other",
      currency: "Other",
      period: "annual",
      source: "unknown",
    } as const,
  };
  const rows = review.central.map((key) => ({
    key,
    label: evidenceLabels[key],
    ...profile.evidence[key],
  }));
  const investigation = (reason: string, question: string): Assessment => ({
    status: "Investigate",
    reason,
    question,
    rows,
  });
  if (review.otherGates === "not-met") {
    if (!review.gateReason.trim())
      return investigation("A mandatory requirement may not be met.", "Which specific requirement is not met?");
    return { status: "Weak Fit", reason: `A mandatory requirement was confirmed unmet: ${review.gateReason.trim()}`, rows };
  }
  if (!review.descriptionComplete)
    return investigation(
      "The complete job description has not been reviewed.",
      "Can you obtain and review the full responsibilities and essential requirements?",
    );
  if (!review.vacancyVerified)
    return investigation(
      "The vacancy has not been confirmed open.",
      "Is the original job posting currently open and accepting applications?",
    );
  if (review.otherGates === "unknown")
    return investigation(
      "Other mandatory eligibility requirements have not been confirmed.",
      "Are the stated work location, authorization, credentials and other mandatory requirements met?",
    );
  if (review.frenchRequirement === "unknown")
    return investigation(
      "The job’s French-language requirement is not known.",
      "Does this posting require professional French?",
    );
  if (review.central.length < 3 || review.central.length > 4)
    return investigation(
      "The defining responsibilities have not been fully identified.",
      "Which three or four responsibilities define this particular role?",
    );
  return evaluateRole(
    {
      ...base,
      descriptionComplete: true,
      requiresFrench: review.frenchRequirement === "required",
    },
    profile,
  );
}
