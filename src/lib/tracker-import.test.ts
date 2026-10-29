import { describe, expect, it } from "vitest";
import { readTrackerDataset, safePostingLink } from "./tracker-import";
const valid = {
  format: "align-tracker-v1",
  generatedAt: "2026-10-27T00:00:00Z",
  jobs: [
    {
      id: "1",
      title: "Analyst",
      company: "Example",
      location: "Canada",
      url: "https://example.org/jobs/1",
      references: [{ sheet: "BC", row: 2, trackerStatus: "Applied" }],
      fetchStatus: "html",
      descriptions: [
        {
          text: "Responsibilities: Gather requirements.",
          source: "Employer page",
          truncated: false,
        },
      ],
    },
  ],
};
describe("private tracker import", () => {
  it("preserves the recorded status and unverified source text", () => {
    const data = readTrackerDataset(JSON.stringify(valid));
    expect(data.jobs[0].references[0].trackerStatus).toBe("Applied");
    expect(data.jobs[0].descriptions[0].text).toContain("Gather requirements");
  });
  it("rejects malformed or unexpected tracker data instead of crashing later", () => {
    expect(() => readTrackerDataset('{"format":"bad","jobs":[]}')).toThrow();
    expect(() =>
      readTrackerDataset(
        JSON.stringify({
          ...valid,
          jobs: [{ ...valid.jobs[0], descriptions: [{ text: null }] }],
        }),
      ),
    ).toThrow();
  });
  it("only opens safe HTTP(S) links without embedded credentials", () => {
    expect(safePostingLink("javascript:alert(1)")).toBeNull();
    expect(safePostingLink("https://user:pass@example.org")).toBeNull();
    expect(safePostingLink("https://example.org/jobs")).toBe(
      "https://example.org/jobs",
    );
  });
});
