import { describe, expect, it } from "vitest";
import { suggestEvidence } from "./suggestions";
import { parseProfile } from "./evaluator";
describe("ordinary resume evidence retrieval", () => {
  it("returns exact passages including negation and attribution without assigning levels", () => {
    const text =
      "Analyst | Fictional Retail | 2022-2025\n\nSupported roadmap research; the product manager owned final decisions.\n\nUsed basic SQL queries. No production pipeline experience.";
    const suggestions = suggestEvidence(text);
    expect(suggestions.roadmap[0].quote).toBe(
      "Supported roadmap research; the product manager owned final decisions.",
    );
    expect(suggestions.roadmap[0].caution).toBeTruthy();
    expect(suggestions.sql[0].quote).toContain("No production");
    expect(parseProfile(text).evidence.roadmap.level).toBe("Unknown");
  });
  it("handles PDF line wraps without splitting qualifiers off", () => {
    const text =
      "Led discovery workshops and wrote requirements for a retail\nordering platform.\nUsed basic SQL queries. No production SQL\nexperience.";
    expect(suggestEvidence(text).requirements[0].quote).toBe(
      "Led discovery workshops and wrote requirements for a retail\nordering platform.",
    );
    expect(suggestEvidence(text).sql[0].quote).toContain(
      "No production SQL\nexperience.",
    );
  });
  it("does not manufacture evidence from a bare title or a missing skill", () => {
    expect(suggestEvidence("Product Owner").roadmap).toEqual([]);
    expect(
      suggestEvidence("Worked in retail customer service for five years.")
        .pipelines,
    ).toEqual([]);
  });
});
