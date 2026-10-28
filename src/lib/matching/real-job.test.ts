import { describe, expect, it } from "vitest";
import { parseProfile } from "./evaluator";
import { evaluateRealJob, type RealJobReview } from "./real-job";
const resume =
  "Evidence [requirements]: Demonstrated | Led discovery workshops.\nEvidence [process]: Demonstrated | Mapped operations.\nEvidence [uat]: Demonstrated | Coordinated acceptance testing.";
const review: RealJobReview = {
  central: ["requirements", "process", "uat"],
  descriptionComplete: true,
  vacancyVerified: true,
  otherGates: "met",
  gateReason: "",
  frenchRequirement: "not-required",
};
describe("real-job review", () => {
  it("compares the selected defining work with reviewed resume evidence", () => {
    expect(evaluateRealJob(review, parseProfile(resume)).status).toBe("Fit");
    expect(
      evaluateRealJob(
        review,
        parseProfile(resume.replace("Demonstrated", "Adjacent")),
      ).status,
    ).toBe("Consider");
    expect(
      evaluateRealJob(
        review,
        parseProfile(resume.replaceAll("Demonstrated", "Limited")),
      ).status,
    ).toBe("Weak Fit");
  });
  it("requires investigation when description, vacancy, eligibility or language is unresolved", () => {
    for (const missing of [
      { descriptionComplete: false },
      { vacancyVerified: false },
      { otherGates: "unknown" as const },
      { frenchRequirement: "unknown" as const },
    ])
      expect(
        evaluateRealJob({ ...review, ...missing }, parseProfile(resume)).status,
      ).toBe("Investigate");
  });
  it("does not infer capability from a missing or unclear resume", () => {
    expect(
      evaluateRealJob(review, parseProfile("No relevant experience.")).status,
    ).toBe("Investigate");
  });
  it("does not produce a positive category with fewer than three defining responsibilities", () => {
    expect(
      evaluateRealJob(
        { ...review, central: ["requirements"] },
        parseProfile(resume),
      ).status,
    ).toBe("Investigate");
  });
  it("keeps unknown salary neutral rather than assuming a failed gate", () => {
    expect(evaluateRealJob(review, parseProfile(resume)).status).toBe("Fit");
  });
  it("treats a confirmed unmet mandatory requirement as a weak fit", () => {
    expect(evaluateRealJob({ ...review, otherGates: "not-met", gateReason: "Work authorization" }, parseProfile(resume)).status).toBe("Weak Fit");
    expect(evaluateRealJob({ ...review, otherGates: "not-met", gateReason: "" }, parseProfile(resume)).status).toBe("Investigate");
  });
});
