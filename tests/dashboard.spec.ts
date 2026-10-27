import { expect, test } from "@playwright/test";
test("landing links to a responsive dashboard with working filters and saved roles", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A better fit.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Find your next opportunity" }).click();
  await expect(page.locator(".job-card")).toHaveCount(5);
  await page.getByLabel("Role or job title").fill("designer");
  await expect(page.locator(".job-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Save Senior Product Designer", exact: true })
    .click();
  await page.getByRole("button", { name: "Saved 1", exact: true }).click();
  await expect(page.locator(".job-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Explore role", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText(
    "It has not been matched to your resume",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset preferences" }).click();
  await page.getByRole("button", { name: "All opportunities 5" }).click();
  await page.getByLabel("Work arrangement").selectOption("Hybrid");
  await expect(page.locator(".job-card")).toHaveCount(1);
  await expect(page.locator(".job-card")).toContainText("Northstar");
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
test("resume selection validates locally and can be removed", async ({
  page,
}) => {
  await page.goto("/dashboard");
  const input = page.getByLabel("Choose resume PDF or DOCX");
  await input.setInputFiles({
    name: "resume.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Please choose a PDF or DOCX file." }),
  ).toContainText("PDF or DOCX");
  await input.setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 sample"),
  });
  await expect(page.getByText("resume.pdf", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Selected locally · No analysis performed"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove selected resume" }).click();
  await expect(page.getByText("Drop your resume here")).toBeVisible();
});
