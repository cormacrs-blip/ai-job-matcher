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
  await page.getByLabel("Choose resume PDF or DOCX").setInputFiles({
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

test("removing a resume cancels an in-flight read and prevents stale evidence", async ({
  page,
}) => {
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/resume", async (route) => {
    await delayed;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ profile: { text: "stale upload" } }),
    });
  });
  await page.goto("/dashboard");
  await page
    .getByLabel("Choose resume PDF or DOCX")
    .setInputFiles(path.resolve("public/sample-resumes/business-analyst.pdf"));
  const started = page.waitForRequest("**/api/resume");
  const cancelled = page.waitForEvent("requestfailed", {
    predicate: (request) => request.url().endsWith("/api/resume"),
  });
  await page.getByRole("button", { name: "Read resume", exact: true }).click();
  await started;
  await page.getByRole("button", { name: "Remove selected resume" }).click();
  release();
  await cancelled;
  await expect(
    page.getByRole("button", { name: "Evaluate sample jobs" }),
  ).toHaveCount(0);
  await expect(page.locator(".status-pending")).toHaveCount(5);
  await expect(page.getByText("Drop your resume here")).toBeVisible();
});

for (const extension of ["pdf", "docx"])
  test(`ordinary ${extension} needs reviewed evidence and produces an exportable decision`, async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page
      .getByLabel("Choose resume PDF or DOCX")
      .setInputFiles(
        path.resolve(
          `public/sample-resumes/ordinary-business-analyst.${extension}`,
        ),
      );
    await page
      .getByRole("button", { name: "Read resume", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Evaluate sample jobs" }),
    ).toBeVisible({ timeout: 30000 });
    await page.getByRole("button", { name: "Evaluate sample jobs" }).click();
    await expect(page.locator(".status-investigate")).toHaveCount(5);
    for (const [key, label] of [
      ["requirements", "Requirements discovery"],
      ["process", "Process improvement"],
      ["uat", "User acceptance testing"],
    ]) {
      const field = page
        .locator(".evidence-field")
        .filter({ has: page.locator(`#evidence-${key}`) });
      await field.getByText(/Possible passages/).click();
      await field
        .getByRole("button", { name: `Use passage for ${label}`, exact: true })
        .first()
        .click();
      await expect(page.locator(`#evidence-${key}`)).toHaveValue("Unknown");
      await page.locator(`#evidence-${key}`).selectOption("Demonstrated");
    }
    await page.getByRole("button", { name: "Evaluate sample jobs" }).click();
    await expect(page.locator(".status-fit")).toHaveCount(1);
    await page.getByLabel("Show category").selectOption("Fit");
    await expect(page.locator(".job-card")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Explore role", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Led discovery workshops",
    );
    const downloaded = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download evaluation summary" })
      .click();
    expect((await downloaded).suggestedFilename()).toBe(
      "align-evaluation-1.txt",
    );
    await page.keyboard.press("Escape");
    await page.locator("#quote-uat").fill("");
    await expect(
      page.getByRole("button", { name: "Evaluate sample jobs" }),
    ).toBeDisabled();
    await expect(page.locator(".status-pending")).toHaveCount(5);
  });

test("pasted resume stays local and quoted limitations remain visible", async ({
  page,
}) => {
  let uploads = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/resume")) uploads++;
  });
  await page.goto("/dashboard");
  await page.getByText("Or paste resume text", { exact: true }).click();
  await page
    .getByLabel("Resume text (processed in this browser)")
    .fill(
      "Supported roadmap research; the product manager owned final decisions.\n\nUsed basic SQL queries. No production pipeline experience.",
    );
  await page.getByRole("button", { name: "Review pasted resume" }).click();
  await page.getByLabel("Focus your review").selectOption("Product ownership");
  await page
    .locator(".evidence-field")
    .filter({ has: page.locator("#evidence-roadmap") })
    .getByText(/Possible passages/)
    .click();
  await expect(page.locator(".passage-caution")).toContainText(
    "qualifying language",
  );
  await page
    .getByRole("button", {
      name: "Use passage for Roadmap ownership",
      exact: true,
    })
    .click();
  await expect(page.locator("#quote-roadmap")).toHaveValue(
    "Supported roadmap research; the product manager owned final decisions.",
  );
  await expect(page.locator("#evidence-roadmap")).toHaveValue("Unknown");
  await page.getByRole("button", { name: "Evaluate sample jobs" }).click();
  await expect(page.locator(".status-investigate")).toHaveCount(5);
  expect(uploads).toBe(0);
  await page.getByRole("button", { name: "Clear resume and results" }).click();
  await expect(page.locator(".status-pending")).toHaveCount(5);
  await expect(
    page.getByLabel("Resume text (processed in this browser)"),
  ).toBeEmpty();
});

test("imports real-job tracker data locally and keeps historical statuses and sources clear", async ({
  page,
}) => {
  const fake = {
    format: "align-tracker-v1",
    generatedAt: "2026-10-27T00:00:00Z",
    jobs: [
      {
        id: "1",
        title: "Business Analyst",
        company: "Example Corp",
        location: "Vancouver",
        url: "https://example.org/jobs/1",
        references: [
          { sheet: "BC", row: 2, trackerStatus: "Applied", recordedFit: "Fit" },
        ],
        fetchStatus: "html",
        descriptions: [
          {
            text: "Requirements: review customer journeys. <script>window.injection=true</script>",
            source: "Archived page text",
            retrievedAt: "2026-10-27T00:00:00Z",
            truncated: false,
          },
        ],
      },
      {
        id: "2",
        title: "Product Owner",
        company: "Other Co",
        location: "Toronto",
        url: "",
        references: [{ sheet: "Ontario", row: 8 }],
        fetchStatus: "robots_disallowed_or_unavailable",
        descriptions: [],
      },
    ],
  };
  let trackerPosts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST") trackerPosts++;
  });
  await page.goto("/dashboard");
  await page
    .getByRole("link", { name: "Explore imported tracker jobs" })
    .click();
  await page
    .getByLabel("Choose your recovered Align tracker file")
    .setInputFiles({
      name: "tracker.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fake)),
    });
  await expect(page.getByRole("status")).toContainText("2 entries");
  await page.getByLabel("Only jobs with recovered text").check();
  await expect(page.locator(".tracker-card")).toHaveCount(1);
  await page.getByRole("button", { name: "View job and sources" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Status: Applied");
  await expect(dialog).toContainText("Archived page text");
  await expect(dialog).toContainText(
    "Completeness and current vacancy status are unverified",
  );
  expect(await page.evaluate(() => "injection" in window)).toBe(false);
  await page.keyboard.press("Escape");
  await page.getByLabel("Search company, title or location").fill("Other");
  await expect(page.getByText("No jobs match these filters.")).toBeVisible();
  await page.getByLabel("Only jobs with recovered text").uncheck();
  await expect(page.locator(".tracker-card")).toHaveCount(1);
  expect(trackerPosts).toBe(0);
  await page.getByRole("button", { name: "Clear imported data" }).click();
  await expect(page.locator(".tracker-card")).toHaveCount(0);
});

test("imports a compressed tracker file without sending its contents to the server", async ({
  page,
}) => {
  const { gzipSync } = await import("node:zlib");
  const data = {
    format: "align-tracker-v1",
    generatedAt: "2026-10-27T00:00:00Z",
    jobs: [
      {
        id: "1",
        title: "Analyst",
        company: "Example",
        location: "Canada",
        url: "",
        references: [{ sheet: "BC", row: 2 }],
        fetchStatus: "not_yet_checked",
        descriptions: [],
      },
    ],
  };
  let posts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST") posts++;
  });
  await page.goto("/tracker");
  await page
    .getByLabel("Choose your recovered Align tracker file")
    .setInputFiles({
      name: "tracker.json.gz",
      mimeType: "application/gzip",
      buffer: gzipSync(JSON.stringify(data)),
    });
  await expect(page.getByRole("status")).toContainText("1 entries");
  expect(posts).toBe(0);
});
