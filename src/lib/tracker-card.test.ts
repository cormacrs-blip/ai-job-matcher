import { describe, expect, it } from "vitest";
import type { TrackerJob } from "./tracker-import";
import { trackerCardDetails } from "./tracker-card";
const job: TrackerJob = {
  id: "1",
  title: "Analyst",
  company: "Example",
  location: "Canada remote",
  url: "",
  fetchStatus: "unknown",
  descriptions: [],
  references: [{ sheet: "BC", row: 1, salary: "Unknown; full-time" }],
};
describe("tracker card information", () => {
  it("separates location, arrangement, employment and missing pay", () => {
    expect(trackerCardDetails(job)).toEqual({
      location: "Canada",
      arrangement: "Remote",
      employment: "Full-time",
      pay: "Pay not listed",
      locationNeedsReview: false,
    });
  });
  it("keeps location caveats in the source and presents an abbreviated location", () => {
    expect(
      trackerCardDetails({
        ...job,
        location:
          "Canada remote-first; quarterly GTA attendance; eligibility unresolved",
        references: [
          {
            sheet: "BC",
            row: 1,
            salary: "CAD70,000–90,000; EST9–5; quarterlyGTA",
          },
        ],
      }),
    ).toMatchObject({
      location: "Canada",
      arrangement: "Remote",
      pay: "CAD 70,000–90,000",
      locationNeedsReview: true,
    });
  });
  it("does not assume unknown or conflicting employment and compensation", () => {
    expect(
      trackerCardDetails({
        ...job,
        references: [
          {
            sheet: "BC",
            row: 1,
            salary: "CAD 90,000; bonus; full-time or contract",
          },
        ],
      }),
    ).toMatchObject({
      employment: "Employment type unclear",
      pay: "Pay details in job",
    });
  });
  it("preserves ambiguous arrangements", () => {
    expect(
      trackerCardDetails({ ...job, location: "Remote / Hybrid / On-site" })
        .arrangement,
    ).toBe("Work arrangement unclear");
  });
});
