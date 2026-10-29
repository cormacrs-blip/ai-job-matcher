import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ evaluate: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/matching/codex", () => ({
  evaluateWithCodex: mocks.evaluate,
  EvaluationFailure: class extends Error {},
}));
vi.mock("@/lib/tracker-store/store", () => ({
  getTrackerStore: () => ({ list: mocks.list }),
}));
import { POST } from "./route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockReturnValue({ jobs: [{ id: "fictional", descriptions: [] }] });
});
function request(data: unknown, origin = "http://localhost") {
  return new Request("http://localhost/api/evaluate", {
    method: "POST",
    headers: { origin, host: "localhost" },
    body: JSON.stringify(data),
  });
}
it("requires same-origin requests", async () => {
  expect(
    (
      await POST(
        request(
          { id: "fictional", resume: "Fictional" },
          "https://other.example",
        ),
      )
    ).status,
  ).toBe(403);
  expect(mocks.evaluate).not.toHaveBeenCalled();
});
it("only evaluates stored job IDs", async () => {
  expect(
    (await POST(request({ id: "unknown", resume: "Fictional" }))).status,
  ).toBe(404);
  expect(mocks.evaluate).not.toHaveBeenCalled();
});
it("returns uncached evaluations", async () => {
  mocks.evaluate.mockResolvedValue({
    status: "Investigate",
    reason: "Missing text",
    rows: [],
  });
  const response = await POST(
    request({ id: "fictional", resume: "Fictional" }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await response.json()).assessment.status).toBe("Investigate");
});
it("passes the selected faster model to Codex and rejects unrecognised models", async () => {
  mocks.evaluate.mockResolvedValue({
    status: "Investigate",
    reason: "Missing text",
    rows: [],
  });
  expect(
    (
      await POST(
        request({ id: "fictional", resume: "Fictional", model: "fast" }),
      )
    ).status,
  ).toBe(200);
  expect(mocks.evaluate).toHaveBeenCalledWith(
    "Fictional",
    expect.any(Object),
    expect.any(AbortSignal),
    "fast",
  );
  expect(
    (
      await POST(
        request({ id: "fictional", resume: "Fictional", model: "other" }),
      )
    ).status,
  ).toBe(400);
});
it("never fabricates a verdict on Codex failure or logs provider details", async () => {
  mocks.evaluate.mockRejectedValue(new Error("secret provider detail"));
  const response = await POST(
    request({ id: "fictional", resume: "Fictional" }),
  );
  expect(response.status).toBe(503);
  const data = await response.json();
  expect(data.assessment).toBeUndefined();
  expect(data.error).not.toContain("secret");
});
it("rejects oversized input before model invocation", async () => {
  expect(
    (await POST(request({ id: "fictional", resume: "x".repeat(450001) })))
      .status,
  ).toBe(400);
  expect(mocks.evaluate).not.toHaveBeenCalled();
});
