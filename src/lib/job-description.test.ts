import { describe, expect, it } from "vitest";
import { formatJobDescription } from "./job-description";
describe("job description presentation", () => {
  it("unwraps captured JSON and renders original headings and bullets", () => {
    const result = formatJobDescription(
      JSON.stringify({
        source: "https://example.org",
        completeJobBody: true,
        text: "Job Description:\nAnalyst\nJOB RESPONSIBILITIES:\n  * Lead discovery.\n  * Run workshops.\nJOB QUALIFICATIONS:\n  * Relevant experience.",
      }),
    );
    expect(result.unwrapped).toBe(true);
    expect(result.blocks).toEqual([
      { type: "heading", text: "Job Description" },
      { type: "paragraph", text: "Analyst" },
      { type: "heading", text: "JOB RESPONSIBILITIES" },
      { type: "list", items: ["Lead discovery.", "Run workshops."] },
      { type: "heading", text: "JOB QUALIFICATIONS" },
      { type: "list", items: ["Relevant experience."] },
    ]);
  });
  it("preserves plain text and doesn't blindly interpret JSON without text", () => {
    expect(formatJobDescription("Case notes: please review.").blocks).toEqual([
      { type: "paragraph", text: "Case notes: please review." },
    ]);
    expect(formatJobDescription('{"unknown":"value"}').unwrapped).toBe(false);
    expect(formatJobDescription('{"text":42}').blocks[0]).toEqual({
      type: "paragraph",
      text: '{"text":42}',
    });
  });
  it("keeps incomplete JSON visible and avoids treating sentence-like lines as headings", () => {
    expect(formatJobDescription('{"text":"unfinished').blocks[0]).toEqual({
      type: "paragraph",
      text: '{"text":"unfinished',
    });
    expect(formatJobDescription("Help customers succeed.").blocks[0].type).toBe(
      "paragraph",
    );
  });
});
