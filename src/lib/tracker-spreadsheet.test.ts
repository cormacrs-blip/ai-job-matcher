import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readTrackerSpreadsheet } from "./tracker-spreadsheet";
function workbook() {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [
      "Company",
      "Job Title",
      "Location",
      "Fit Rating",
      "Tracker Status",
      "Posting URL",
      "Notes",
    ],
    [
      "Example",
      "Analyst",
      "Vancouver",
      "Fit",
      "Applied",
      "https://example.com/jobs/1",
      "",
    ],
    ["Other", "Owner", "Toronto", "Consider", "To apply", "", ""],
  ]);
  sheet.G2 = {
    t: "s",
    v: "",
    c: [
      {
        a: "Tracker",
        t:
          "Discovery copy: " +
          "Responsibilities: support product work. ".repeat(7) +
          " Incomplete description.",
      },
    ],
  };
  XLSX.utils.book_append_sheet(book, sheet, "BC");
  const second = XLSX.utils.aoa_to_sheet([
    [
      "Company",
      "Job Title",
      "Location",
      "Fit Rating",
      "Tracker Status",
      "Posting URL",
    ],
    [
      "Example",
      "Analyst",
      "Vancouver",
      "Fit",
      "Dismissed",
      "https://example.com/jobs/1",
    ],
  ]);
  XLSX.utils.book_append_sheet(book, second, "Ontario");
  return XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
describe("direct spreadsheet import", () => {
  it("groups exact links, preserves conflicting status history and extracts cached excerpts as partial", async () => {
    const result = await readTrackerSpreadsheet(workbook());
    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[0].references.map((r) => r.trackerStatus)).toEqual([
      "Applied",
      "Dismissed",
    ]);
    expect(result.jobs[0].descriptions[0].text).toContain("Responsibilities");
    expect(result.jobs[0].descriptions[0].truncated).toBe(true);
    expect(result.jobs[1].fetchStatus).toBe("no_url");
  });
  it("rejects a workbook without tracker headings", async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([["Unrelated"]]),
      "Other",
    );
    const bytes = XLSX.write(book, {
      type: "array",
      bookType: "xlsx",
    }) as ArrayBuffer;
    await expect(readTrackerSpreadsheet(bytes)).rejects.toThrow(
      "No tracker sheets",
    );
  });
});
