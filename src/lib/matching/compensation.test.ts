import { describe, expect, it } from "vitest";
import { assessCompensation, type Compensation } from "./compensation";
const base: Compensation = {
  country: "Canada",
  currency: "CAD",
  period: "annual",
  minimum: 85000,
  maximum: 105000,
  source: "employer-base",
};
describe("compensation rules from the uploaded evaluator", () => {
  it("uses the upper bound for eligibility and the lower bound for competition", () => {
    expect(assessCompensation(base).competition).toBe(false);
    expect(
      assessCompensation({ ...base, minimum: 110000, maximum: 140000 })
        .competition,
    ).toBe(true);
    expect(
      assessCompensation({ ...base, minimum: 55000, maximum: 60000 }),
    ).toMatchObject({ failure: null, competition: false });
    expect(
      assessCompensation({ ...base, minimum: 55000, maximum: 60000 }).note,
    ).toContain("60,000");
  });
  it("keeps missing, estimated and total pay neutral", () => {
    for (const source of ["estimate", "total-compensation", "unknown"] as const)
      expect(
        assessCompensation({
          ...base,
          minimum: 200000,
          maximum: 220000,
          source,
        }),
      ).toEqual({ failure: null, competition: false, note: null });
    expect(
      assessCompensation({ ...base, minimum: undefined, maximum: undefined }),
    ).toEqual({ failure: null, competition: false, note: null });
  });
  it("does not annualize hourly pay or invent a UK minimum", () => {
    expect(
      assessCompensation({
        ...base,
        period: "hourly",
        minimum: 40,
        maximum: 49,
      }).failure,
    ).toContain("per hour");
    expect(
      assessCompensation({
        ...base,
        period: "hourly",
        minimum: 50,
        maximum: 150,
      }).competition,
    ).toBe(false);
    expect(
      assessCompensation({
        ...base,
        country: "United Kingdom",
        currency: "GBP",
        minimum: 25000,
        maximum: 30000,
      }).failure,
    ).toBeNull();
  });
  it("uses the Irish annual minimum only for EUR base salaries in Ireland", () => {
    expect(
      assessCompensation({
        ...base,
        country: "Ireland",
        currency: "EUR",
        minimum: 40000,
        maximum: 49000,
      }).failure,
    ).toBeTruthy();
    expect(
      assessCompensation({
        ...base,
        country: "Ireland",
        currency: "EUR",
        minimum: 120000,
        maximum: 140000,
      }).competition,
    ).toBe(false);
  });
  it("does not mistake a minimum-only offer or malformed range for a failed gate", () => {
    expect(
      assessCompensation({ ...base, minimum: 50000, maximum: undefined })
        .failure,
    ).toBeNull();
    expect(
      assessCompensation({ ...base, minimum: 90000, maximum: 50000 }).failure,
    ).toBeNull();
  });
});
