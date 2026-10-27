import { describe, expect, it } from "vitest";
import { defaultPreferences, filterJobs, jobs, validateResume } from "./jobs";
describe("sample opportunity filters", () => {
  it("returns all sample jobs in descending fixed score order", () => {
    const result = filterJobs(jobs, defaultPreferences);
    expect(result).toHaveLength(5);
    expect(result.map((job) => job.score)).toEqual([94, 89, 87, 82, 78]);
  });
  it("combines role, location, work arrangement and salary filters", () => {
    expect(
      filterJobs(jobs, {
        role: " product ",
        location: "VANCOUVER",
        remote: "Remote",
        salary: 140000,
      }).map((job) => job.id),
    ).toEqual([1]);
  });
  it("returns an empty result when salary is out of range", () => {
    expect(filterJobs(jobs, { ...defaultPreferences, salary: 150000 })).toEqual(
      [],
    );
  });
  it("does not mutate sample data or scores", () => {
    const before = JSON.stringify(jobs);
    filterJobs(jobs, { ...defaultPreferences, role: "designer" });
    expect(JSON.stringify(jobs)).toBe(before);
  });
});
describe("local resume selection", () => {
  it("accepts PDF and DOCX extensions case-insensitively", () => {
    expect(validateResume({ name: "Resume.PDF", size: 100 })).toBeNull();
    expect(validateResume({ name: "resume.docx", size: 100 })).toBeNull();
  });
  it("rejects unsupported, oversized and empty files", () => {
    expect(validateResume({ name: "resume.exe", size: 100 })).toContain(
      "PDF or DOCX",
    );
    expect(
      validateResume({ name: "resume.pdf", size: 11 * 1024 * 1024 }),
    ).toContain("10 MB");
    expect(validateResume({ name: "resume.docx", size: 0 })).toContain("empty");
  });
});
