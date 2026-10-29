import { describe, expect, it } from "vitest";
import { defaultPreferences } from "./jobs";
import type { TrackerJob } from "./tracker-import";
import {
  matchesTrackerPreferences,
  trackerArrangements,
  trackerAnnualSalaryMaximum,
  recordedRatings,
} from "./tracker-filters";
const job: TrackerJob = {
  id: "1",
  company: "Example",
  title: "Digital Business Analyst",
  location: "Vancouver, BC",
  url: "",
  fetchStatus: "not_checked",
  descriptions: [],
  references: [
    {
      sheet: "BC",
      row: 2,
      location: "Vancouver, hybrid",
      salary: "CAD $80,000–$100,000 per year",
      recordedFit: "Fit",
    },
    {
      sheet: "Ontario",
      row: 3,
      location: "Toronto, remote",
      recordedFit: "Consider",
    },
  ],
};
describe("tracker filters and source boundaries", () => {
  it("uses role and all original locations, and supports multiple work arrangements", () => {
    expect(
      matchesTrackerPreferences(job, {
        ...defaultPreferences,
        role: "BUSINESS",
        location: "toronto",
        arrangements: ["Remote", "On-site"],
      }),
    ).toBe(true);
    expect(
      matchesTrackerPreferences(job, {
        ...defaultPreferences,
        arrangements: ["On-site"],
      }),
    ).toBe(false);
    expect(trackerArrangements(job)).toEqual(["Hybrid", "Remote"]);
  });
  it("does not combine a work arrangement with a different listed location", () => {
    expect(
      matchesTrackerPreferences(job, {
        ...defaultPreferences,
        location: "Vancouver",
        arrangements: ["Remote"],
      }),
    ).toBe(false);
    expect(
      matchesTrackerPreferences(job, {
        ...defaultPreferences,
        location: "Toronto",
        arrangements: ["Remote"],
      }),
    ).toBe(true);
  });
  it("treats unclear work arrangement and salary as unknown, never as an automatic mismatch", () => {
    const unknown = {
      ...job,
      location: "Canada",
      references: [{ sheet: "Canada", row: 2, salary: "Unknown" }],
    };
    const p = {
      ...defaultPreferences,
      arrangements: ["Remote"] as const as ["Remote"],
      salary: 90000,
    };
    expect(matchesTrackerPreferences(unknown, p)).toBe(true);
    expect(matchesTrackerPreferences(unknown, p, false)).toBe(false);
  });
  it("filters only clear CAD annual salaries by the maximum range", () => {
    expect(trackerAnnualSalaryMaximum(job)).toBe(100000);
    expect(
      matchesTrackerPreferences(job, { ...defaultPreferences, salary: 105000 }),
    ).toBe(false);
    expect(
      matchesTrackerPreferences(job, { ...defaultPreferences, salary: 100000 }),
    ).toBe(true);
  });
  it("does not interpret hourly, missing currency, variable pay, open-ended or conflicting amounts as annual salary", () => {
    for (const salary of [
      "CAD $45/hour",
      "CAD $95,000–$120,000",
      "USD $85,000 per year",
      "CAD $80,000 per year + bonus",
      "CAD from $80,000 per year",
      "CAD $80k+ per year",
    ])
      expect(
        trackerAnnualSalaryMaximum({
          ...job,
          references: [{ sheet: "BC", row: 2, salary }],
        }),
      ).toBeNull();
    expect(
      trackerAnnualSalaryMaximum({
        ...job,
        references: [
          { sheet: "A", row: 1, salary: "CAD $80,000 per year" },
          { sheet: "B", row: 2, salary: "CAD $100,000 per year" },
        ],
      }),
    ).toBeNull();
  });
  it("preserves contradictory historical ratings rather than guessing a current verdict", () => {
    expect(recordedRatings(job)).toEqual(["Fit", "Consider"]);
  });
  it("does not infer remote from a negation or on-site from hybrid office days", () => {
    expect(
      trackerArrangements({
        ...job,
        location: "",
        references: [
          {
            sheet: "A",
            row: 1,
            location: "Hybrid; not remote; 3 days in office",
          },
        ],
      }),
    ).toEqual(["Hybrid"]);
  });
});
