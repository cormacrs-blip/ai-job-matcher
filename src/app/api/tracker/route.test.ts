import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("tracker request origin", () => {
  it("accepts a same-origin browser request when a proxy changes the host", async () => {
    const request = new Request("http://localhost/api/tracker", {
      method: "POST",
      headers: { origin: "https://example.github.dev", "sec-fetch-site": "same-origin", "x-forwarded-host": "localhost" },
      body: "invalid",
    });
    expect((await POST(request)).status).toBe(400);
  });
  it("rejects cross-site browser requests", async () => {
    const request = new Request("http://localhost/api/tracker", {
      method: "POST",
      headers: { origin: "https://unrelated.example", "sec-fetch-site": "cross-site" },
      body: "invalid",
    });
    expect((await POST(request)).status).toBe(403);
  });
});
