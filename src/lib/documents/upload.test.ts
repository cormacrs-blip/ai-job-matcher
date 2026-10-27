import { describe, expect, it } from "vitest";
import { readResumeForm, UploadTooLarge } from "./upload";
describe("bounded resume request reader", () => {
  it("rejects a declared oversized body without reading it", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      headers: { "content-length": "101" },
      body: "x",
    });
    await expect(readResumeForm(request, 100)).rejects.toBeInstanceOf(
      UploadTooLarge,
    );
    expect(request.bodyUsed).toBe(false);
  });
  it("stops an oversized stream even when its size header is absent or understates it", async () => {
    for (const length of [undefined, "1"]) {
      let cancelled = false;
      const stream = new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array(10));
        },
        cancel() {
          cancelled = true;
        },
      });
      const request = new Request("http://localhost", {
        method: "POST",
        body: stream,
        duplex: "half",
        headers: length ? { "content-length": length } : {},
      } as RequestInit);
      await expect(readResumeForm(request, 20)).rejects.toBeInstanceOf(
        UploadTooLarge,
      );
      expect(cancelled).toBe(true);
    }
  });
  it("preserves a valid multipart file and its contents", async () => {
    const form = new FormData();
    form.set(
      "resume",
      new File(["%PDF-demo"], "resume.pdf", { type: "application/pdf" }),
    );
    const result = await readResumeForm(
      new Request("http://localhost", { method: "POST", body: form }),
      1000,
    );
    const file = result.get("resume") as File;
    expect(file.name).toBe("resume.pdf");
    expect(await file.text()).toBe("%PDF-demo");
  });
});
