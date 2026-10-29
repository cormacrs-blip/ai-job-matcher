import { describe, expect, it } from "vitest";
import { jobs } from "../jobs";
import { evaluateRole, parseProfile } from "./evaluator";
const text =
  "Evidence [requirements]: Demonstrated | Led discovery at Fictional Retail.\nEvidence [process]: Demonstrated | Mapped operations processes.\nEvidence [uat]: Demonstrated | Owned UAT with business users.\nFrench eligibility: Unknown";
describe("explicit evidence extraction and prototype verdicts", () => {
  it("extracts exact evidence and does not guess unknowns from keywords", () => {
    const profile = parseProfile(text);
    expect(profile.evidence.requirements.level).toBe("Demonstrated");
    expect(profile.evidence.requirements.quote).toBe(
      "Led discovery at Fictional Retail.",
    );
    expect(profile.evidence.sql.level).toBe("Unknown");
    expect(evaluateRole(jobs[0], profile).status).toBe("Fit");
    expect(evaluateRole(jobs[2], profile).status).toBe("Consider");
  });
  it("uses Consider for an explicit transfer instead of a percentage", () => {
    expect(
      evaluateRole(
        jobs[0],
        parseProfile(text.replace("Demonstrated", "Adjacent")),
      ).status,
    ).toBe("Consider");
  });
  it("does not interpret an ordinary resume or negated skill as demonstrated", () => {
    const result = evaluateRole(
      jobs[0],
      parseProfile("No experience in requirements, process mapping or UAT."),
    );
    expect(result.status).toBe("Investigate");
    expect(result.question).toContain("Requirements");
  });
  it("does not accept conflicting duplicate annotations", () => {
    expect(
      parseProfile(text + "\nEvidence [requirements]: Limited | Observed only.")
        .evidence.requirements.level,
    ).toBe("Unknown");
  });
  it("does not let supporting evidence override central gaps", () => {
    expect(
      evaluateRole(
        jobs[0],
        parseProfile(text.replaceAll("Demonstrated", "Limited")),
      ).status,
    ).toBe("Weak Fit");
  });
  it("asks a specific question when a required language is unknown", () => {
    expect(evaluateRole(jobs[3], parseProfile("")).question).toContain(
      "French",
    );
  });
  it("distinguishes confirmed failed gates from missing information", () => {
    expect(
      evaluateRole(jobs[3], parseProfile("French eligibility: No")).status,
    ).toBe("Weak Fit");
    expect(
      evaluateRole(
        { ...jobs[0], salaryMin: 59000, salaryMax: 59000 },
        parseProfile(text),
      ).status,
    ).toBe("Weak Fit");
  });
  it("does not lower a verdict for the Senior title alone or salary minimum exactly 100000", () => {
    expect(
      evaluateRole({ ...jobs[2], salaryMin: 100000 }, parseProfile(text))
        .status,
    ).toBe("Fit");
  });
});

it("withholds a positive verdict when the description is incomplete", () => {
  expect(
    evaluateRole({ ...jobs[0], descriptionComplete: false }, parseProfile(text))
      .status,
  ).toBe("Investigate");
});
