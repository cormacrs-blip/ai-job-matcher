import { expect, test } from "@playwright/test";
import path from "node:path";
test("responsive navigation, multi-select filters, saved jobs and role details", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Find your next opportunity" }).click();
  await expect(page.locator(".job-card")).toHaveCount(5);
  await page.getByLabel("Role or job title").fill("digital business");
  await expect(page.locator(".job-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Save Digital Business Analyst", exact: true })
    .click();
  await page.getByRole("button", { name: "Saved 1", exact: true }).click();
  await expect(page.locator(".job-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Explore role", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Defining responsibilities",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset preferences" }).click();
  await page.getByRole("button", { name: "All opportunities 5" }).click();
  await page.getByRole("checkbox", { name: "Hybrid", exact: true }).check();
  await expect(page.locator(".job-card")).toHaveCount(1);
  await page.getByRole("checkbox", { name: "On-site", exact: true }).check();
  await expect(page.locator(".job-card")).toHaveCount(2);
  await page.getByLabel("Location", { exact: true }).fill("nowhere");
  await expect(page.getByText("No opportunities here yet.")).toBeVisible();
  await page.getByRole("button", { name: "Show all opportunities" }).click();
  await expect(page.locator(".job-card")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
for (const extension of ["pdf", "docx"])
  test(`real ${extension} text extraction, review and four rubric statuses`, async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const input = page.getByLabel("Choose resume PDF or DOCX");
    await expect(page.locator(".status-pending")).toHaveCount(5);
    await input.setInputFiles(
      path.resolve(`public/sample-resumes/business-analyst.${extension}`),
    );
    await page
      .getByRole("button", { name: "Read resume", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Evaluate sample jobs" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(page.locator(".status-pending")).toHaveCount(5);
    await page.getByRole("button", { name: "Evaluate sample jobs" }).click();
    await expect(page.locator(".status-fit")).toHaveCount(1);
    await expect(page.locator(".status-consider")).toHaveCount(2);
    await expect(page.locator(".status-investigate")).toHaveCount(1);
    await expect(page.locator(".status-weak-fit")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Explore role", exact: true })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Led discovery workshops",
    );
    await page.keyboard.press("Escape");
    await input.setInputFiles(
      path.resolve(`public/sample-resumes/data-engineer.${extension}`),
    );
    await expect(page.locator(".status-pending")).toHaveCount(5);
    await page
      .getByRole("button", { name: "Read resume", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Evaluate sample jobs" }),
    ).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Evaluate sample jobs" }).click();
    await expect(
      page.locator(".job-card").last().locator(".fit-status"),
    ).toHaveText("Fit");
    await page.getByRole("button", { name: "Remove selected resume" }).click();
    await expect(page.locator(".status-pending")).toHaveCount(5);
  });
test("rejects invalid content and ordinary resume evidence stays unknown", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/resume", {
    multipart: {
      resume: {
        name: "bad.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("not a PDF"),
      },
    },
  });
  expect(response.status()).toBe(400);
  await page.goto("/dashboard");
  await page
    .getByLabel("Choose resume PDF or DOCX")
    .setInputFiles({
      name: "bad.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("invalid"),
    });
  await expect(page.locator(".error")).toContainText("PDF or DOCX");
  await page
    .getByLabel("Choose resume PDF or DOCX")
    .setInputFiles(
      path.resolve("public/sample-resumes/incomplete-profile.docx"),
    );
  await page.getByRole("button", { name: "Read resume", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Evaluate sample jobs" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Evaluate sample jobs" }).click();
  await expect(page.locator(".status-investigate")).toHaveCount(5);
});
