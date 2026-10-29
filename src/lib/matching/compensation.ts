export type Compensation = {
  country: "Canada" | "Ireland" | "United Kingdom" | "Other";
  currency: "CAD" | "EUR" | "GBP" | "Other";
  period: "annual" | "hourly";
  minimum?: number;
  maximum?: number;
  source: "employer-base" | "estimate" | "total-compensation" | "unknown";
};
export function assessCompensation(pay: Compensation) {
  if (pay.source !== "employer-base")
    return { failure: null, competition: false, note: null };
  const valid = (value: number | undefined) =>
    value !== undefined && Number.isFinite(value) && value >= 0;
  if (!valid(pay.minimum) && !valid(pay.maximum))
    return { failure: null, competition: false, note: null };
  if (valid(pay.minimum) && valid(pay.maximum) && pay.minimum! > pay.maximum!)
    return { failure: null, competition: false, note: null };
  const minimum = valid(pay.minimum) ? pay.minimum : undefined;
  const maximum = valid(pay.maximum) ? pay.maximum : undefined;
  const threshold =
    pay.country === "Canada" && pay.currency === "CAD"
      ? pay.period === "annual"
        ? 60000
        : 50
      : pay.country === "Ireland" &&
          pay.currency === "EUR" &&
          pay.period === "annual"
        ? 50000
        : null;
  // A minimum alone does not establish an upper limit. A fixed rate must provide both bounds.
  const failure =
    threshold !== null && maximum !== undefined && maximum < threshold
      ? `Confirmed compensation gate: the employer-stated maximum ${pay.currency} ${maximum.toLocaleString("en-CA")} per ${pay.period === "annual" ? "year" : "hour"} is below the ${threshold.toLocaleString("en-CA")} minimum.`
      : null;
  const note =
    threshold !== null &&
    minimum !== undefined &&
    maximum !== undefined &&
    minimum < threshold &&
    maximum >= threshold
      ? `The range remains viable only if base pay reaches ${pay.currency} ${threshold.toLocaleString("en-CA")} per ${pay.period === "annual" ? "year" : "hour"}.`
      : null;
  const competition =
    pay.country === "Canada" &&
    pay.currency === "CAD" &&
    pay.period === "annual" &&
    minimum !== undefined &&
    minimum > 100000;
  return { failure, competition, note };
}
